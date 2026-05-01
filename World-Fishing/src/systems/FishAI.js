import { LEGENDARIES } from "../data.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function waterBounds(bounds = { width: 1280, height: 720 }) {
  return {
    left: 50,
    right: bounds.width - 50,
    top: bounds.height * 0.35,
    bottom: bounds.height * 0.84,
  };
}

function pickWeighted(list, weightFn) {
  const weights = list.map((item) => Math.max(0.01, weightFn(item)));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < list.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return list[i];
  }
  return list[list.length - 1];
}

function lureMatchScore(fish, lure, style) {
  let score = 0;
  if (fish.preferredLures.includes(lure.type)) score += 0.34;
  if (fish.preferredColors.includes(lure.color)) score += 0.2;
  if (style === "jerk" && fish.aggression > 0.58) score += 0.22;
  if (style === "pause" && fish.caution > 0.55) score += 0.16;
  if (style === "pull" && lure.type !== "natural") score += 0.12;
  if (style === "steady" && fish.intelligence < 0.55) score += 0.08;
  return score;
}

function rollWeight(species, playerLuck, forceMedal = false, forceUnique = false) {
  if (forceUnique) return rand(species.maxWeight * 0.95, species.maxWeight);
  if (forceMedal) return rand(species.maxWeight * 0.9, species.maxWeight * 0.985);
  const lowBias = Math.pow(Math.random(), 1.82 - clamp(playerLuck * 0.012, 0, 0.48));
  const rareLift = Math.random() < species.medalChance + playerLuck * 0.002 ? rand(0.68, 0.93) : 0;
  const factor = clamp(Math.max(lowBias * 0.86 + 0.05, rareLift), 0.03, 0.985);
  return Math.max(0.03, species.maxWeight * factor);
}

export class FishAI {
  constructor(location, playerState) {
    this.location = location;
    this.playerState = playerState;
    this.fishes = [];
    this.currentBite = null;
    this.biteCooldown = 0;
    this.spawn();
  }

  spawn() {
    this.fishes = Array.from({ length: 24 }, () => this.createFish());
  }

  createFish() {
    const area = waterBounds();
    const species = pickWeighted(this.location.fish, (fish) => {
      const smallBoost = fish.maxWeight < 4 ? 1.25 : 1;
      const rarePenalty = fish.name.includes("rare") ? 0.28 : 1;
      return (1.2 / Math.sqrt(fish.maxWeight + 1)) * smallBoost * rarePenalty;
    });
    const angle = rand(-Math.PI, Math.PI);
    return {
      species,
      x: rand(area.left + 90, area.right - 90),
      y: rand(area.top + 18, area.bottom - 28),
      depth: rand(0.05, 0.98),
      vx: Math.cos(angle) * rand(8, 24),
      vy: Math.sin(angle) * rand(8, 24),
      angle,
      state: "idle",
      interest: 0,
      followTime: 0,
      biteTimer: 0,
      viewRange: clamp(120 + species.aggression * 90 - species.caution * 35, 80, 230),
      viewAngle: clamp(Math.PI * (0.35 + species.intelligence * 0.34), Math.PI * 0.32, Math.PI * 0.75),
      personality: {
        aggression: species.aggression,
        caution: species.caution,
        intelligence: species.intelligence,
        fearThreshold: species.fearThreshold,
      },
      legendary: false,
    };
  }

  update(dt, lureTelemetry, input, weather, playerState) {
    this.playerState = playerState;
    this.biteCooldown = Math.max(0, this.biteCooldown - dt);

    if (this.currentBite) {
      this.currentBite.timer -= dt;
      if (this.currentBite.timer <= 0) {
        const expired = this.currentBite;
        expired.fish.state = "idle";
        expired.fish.interest = 0;
        this.currentBite = null;
        this.biteCooldown = 1.2;
        return { type: "biteExpired", fish: expired.fish };
      }
      return { type: "bite", bite: this.currentBite };
    }

    let biteCandidate = null;
    for (const fish of this.fishes) {
      this.updateFish(dt, fish, lureTelemetry, input, weather);
      if (fish.state === "biting" && !biteCandidate) biteCandidate = fish;
    }

    if (biteCandidate && this.biteCooldown <= 0) {
      const duration = rand(0.75, 1.65) * (1 + (playerState.skills.detection.level - 1) * 0.04);
      this.currentBite = {
        fish: biteCandidate,
        timer: duration,
        duration,
        startStyle: lureTelemetry.style,
      };
      biteCandidate.state = "biteWindow";
      return { type: "bite", bite: this.currentBite };
    }

    this.maybeSpawnLegendary(lureTelemetry, weather, playerState);
    return { type: "none" };
  }

  updateFish(dt, fish, lure, input, weather) {
    const area = waterBounds(input.bounds);
    const target = {
      x: clamp(lure.x, area.left, area.right),
      y: clamp(lure.y, area.top, area.bottom),
    };
    const dx = target.x - fish.x;
    const dy = target.y - fish.y;
    const dist = Math.hypot(dx, dy) || 1;
    const angleToLure = Math.atan2(dy, dx);
    const angleDelta = Math.abs(Math.atan2(Math.sin(angleToLure - fish.angle), Math.cos(angleToLure - fish.angle)));
    const seesLure = dist < fish.viewRange && angleDelta < fish.viewAngle;
    const depthScore = 1 - Math.min(1, Math.abs(lure.depth - fish.depth) * 1.8);
    const weatherScore = weather.getBiteModifier(fish.species, lure.lure, this.location);
    const activeHour = weather.isActiveHour(fish.species) ? 1.14 : 0.82;
    const skillDetection = 1 + (this.playerState.skills.detection.level - 1) * 0.035;
    const styleScore = lureMatchScore(fish.species, lure.lure, lure.style);
    const speedScore = clamp(1 - Math.abs(lure.speed - (60 + fish.species.aggression * 210)) / 320, 0, 1);
    const noiseFear = lure.noise > fish.personality.fearThreshold + 0.45 ? -0.22 : 0;
    const reaction =
      (0.16 + styleScore + speedScore * 0.26 + depthScore * 0.24 + noiseFear) *
      weatherScore *
      activeHour *
      skillDetection;

    if (seesLure && reaction > 0.3) {
      fish.state = fish.interest > 0.46 ? "following" : "interested";
      fish.interest = clamp(fish.interest + dt * reaction * (0.6 + fish.personality.aggression), 0, 1.4);
    } else {
      fish.interest = Math.max(0, fish.interest - dt * (0.18 + fish.personality.caution * 0.08));
      if (fish.interest <= 0.03) fish.state = "idle";
    }

    if (fish.state === "following" || fish.state === "interested") {
      const followSpeed = 44 + fish.personality.aggression * 68 + (fish.legendary ? 22 : 0);
      fish.vx += (dx / dist) * followSpeed * dt;
      fish.vy += (dy / dist) * followSpeed * dt;
      fish.followTime += dt;

      const bitePressure =
        fish.interest *
        (dist < 24 ? 1.4 : dist < 48 ? 0.74 : 0.1) *
        (0.7 + styleScore) *
        weatherScore;
      if (bitePressure > 0.66 && Math.random() < dt * bitePressure * (0.7 + fish.personality.aggression)) {
        fish.state = "biting";
      }
    } else {
      fish.followTime = Math.max(0, fish.followTime - dt);
      fish.vx += Math.cos(fish.angle) * 8 * dt;
      fish.vy += Math.sin(fish.angle) * 8 * dt;
      if (Math.random() < dt * 0.18) fish.angle += rand(-0.7, 0.7);
    }

    const drag = 0.96 - fish.personality.intelligence * 0.025;
    fish.vx *= drag;
    fish.vy *= drag;
    fish.x += fish.vx * dt;
    fish.y += fish.vy * dt;

    if (fish.x < area.left || fish.x > area.right) {
      fish.angle = Math.PI - fish.angle;
      fish.vx *= -0.5;
    }
    if (fish.y < area.top || fish.y > area.bottom) {
      fish.angle *= -1;
      fish.vy *= -0.5;
    }
    fish.x = clamp(fish.x, area.left, area.right);
    fish.y = clamp(fish.y, area.top, area.bottom);
  }

  maybeSpawnLegendary(lure, weather, playerState) {
    const legendary = LEGENDARIES[this.location.id];
    if (!legendary || playerState.level < legendary.minLevel) return;
    if (this.fishes.some((fish) => fish.legendary)) return;
    const luck = playerState.skills.luck.level;
    const styleBonus = lure.style === "jerk" || lure.style === "pause" ? 1.3 : 1;
    const chance = (0.00009 + luck * 0.000025) * styleBonus * weather.weather.bite;
    if (Math.random() > chance) return;
    const species = this.location.fish.find((fish) => fish.name === legendary.species);
    if (!species) return;
    const area = waterBounds({ width: 1280, height: 720 });
    const fish = this.createFish();
    fish.species = species;
    fish.legendary = true;
    fish.x = clamp(lure.x + rand(-180, 180), area.left, area.right);
    fish.y = clamp(lure.y + rand(-140, 140), area.top, area.bottom);
    fish.viewRange *= 1.45;
    fish.personality.aggression = clamp(fish.personality.aggression + 0.22, 0, 1);
    fish.personality.intelligence = clamp(fish.personality.intelligence + 0.25, 0, 1);
    fish.personality.caution = clamp(fish.personality.caution + 0.15, 0, 1);
    this.fishes.push(fish);
  }

  hookAttempt(force) {
    if (!this.currentBite) return { success: false };
    const bite = this.currentBite;
    const elapsed = bite.duration - bite.timer;
    const center = bite.duration * 0.45;
    const timingQuality = clamp(1 - Math.abs(elapsed - center) / (bite.duration * 0.55), 0, 1);
    const forceQuality = clamp(force / 820, 0, 1.25);
    const skill = this.playerState.skills.control.level;
    const hookQuality = clamp(timingQuality * 0.64 + forceQuality * 0.28 + skill * 0.018, 0, 1.25);
    const successChance = clamp(0.26 + hookQuality * 0.72 - bite.fish.personality.caution * 0.12, 0.08, 0.97);
    const success = Math.random() < successChance;
    const fish = bite.fish;
    this.currentBite = null;
    this.biteCooldown = success ? 2 : 1.6;
    fish.state = success ? "hooked" : "idle";
    fish.interest = 0;
    return {
      success,
      hookQuality,
      timingQuality,
      forceQuality,
      fish,
      catchProfile: success ? this.createCatchProfile(fish, hookQuality) : null,
    };
  }

  createCatchProfile(fish, hookQuality) {
    const species = fish.species;
    const luck = this.playerState.skills.luck.level;
    const legendaryData = LEGENDARIES[this.location.id];
    const isLegendary = fish.legendary && legendaryData?.species === species.name;
    const uniqueRoll =
      species.canBeUnique && !isLegendary && Math.random() < species.uniqueChance * (1 + luck * 0.035 + hookQuality * 0.35);
    const medalRoll = !uniqueRoll && Math.random() < species.medalChance * (1 + luck * 0.03 + hookQuality * 0.4);
    const weight = isLegendary
      ? rand(species.maxWeight * 0.97, species.maxWeight * 1.06)
      : rollWeight(species, luck, medalRoll, uniqueRoll);
    const isMedalByWeight = weight >= species.maxWeight * 0.9;
    const rarity = isLegendary ? "legendary" : uniqueRoll ? "unique" : isMedalByWeight ? "medal" : "common";
    const medalBonus = rarity === "medal" ? rand(1.5, 3) : 1;
    const uniqueBonus = rarity === "unique" ? rand(4, 8) : 1;
    const legendaryBonus = rarity === "legendary" ? rand(10, 16) : 1;
    const baseValue = isLegendary ? legendaryData.value : species.baseValue + weight * species.valuePerKg;
    const value = Math.round(baseValue * medalBonus * uniqueBonus * legendaryBonus);
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      speciesName: species.name,
      locationId: this.location.id,
      locationName: `${this.location.country} - ${this.location.name}`,
      weight,
      maxWeight: species.maxWeight,
      value,
      rarity,
      hookQuality,
      behavior: fish.legendary ? legendaryData.behavior : species.behavior,
      personality: fish.personality,
      visualHue: isLegendary ? null : species.visualHue,
      legendaryName: isLegendary ? legendaryData.name : null,
      uniqueEffect: rarity === "unique" ? "opal" : rarity === "legendary" ? "legendary" : null,
      caughtAt: Date.now(),
    };
  }
}
