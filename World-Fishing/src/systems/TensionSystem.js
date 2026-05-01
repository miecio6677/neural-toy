function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function shortestAngleDelta(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function directionFromAngle(angle, depthIntent) {
  const x = Math.cos(angle);
  const y = Math.sin(angle) + depthIntent * 0.28;
  const length = Math.hypot(x, y) || 1;
  return {
    x: x / length,
    y: y / length,
  };
}

function getGearKg(equipment) {
  const rod = equipment.rod;
  const reel = equipment.reel;
  const line = equipment.line;
  return Math.max(1, line.strength / 10 + rod.maxTension / 14 + reel.drag / 16);
}

function getFishPowerKg(catchProfile) {
  const aggression = catchProfile.personality?.aggression ?? 0.5;
  const rarityBonus =
    catchProfile.rarity === "legendary" ? 1.4 : catchProfile.rarity === "unique" ? 1.18 : catchProfile.rarity === "medal" ? 1.08 : 1;
  return Math.max(0.05, catchProfile.weight * (0.82 + aggression * 0.72) * rarityBonus);
}

function defaultWaterBounds(origin) {
  return {
    left: 44,
    right: Math.max(760, origin.x + 720),
    top: Math.max(160, origin.y - 120),
    bottom: Math.max(440, origin.y + 280),
  };
}

export class TensionSystem {
  constructor(catchProfile, equipment, initial = {}) {
    this.catchProfile = catchProfile;
    this.equipment = equipment;
    this.gearKg = getGearKg(equipment);
    this.fishPowerKg = getFishPowerKg(catchProfile);
    this.powerRatio = this.fishPowerKg / this.gearKg;
    this.tension = clamp(6 + Math.max(0, this.powerRatio - 0.45) * 22, 2, 42);
    this.stamina = 100;
    this.distance = clamp(220 + catchProfile.weight * 5.4, 150, 640);
    this.slackTime = 0;
    this.overloadTime = 0;
    this.fishAngle = rand(-0.6, 0.6);
    this.fishForce = this.fishPowerKg;
    this.burstTimer = rand(0.8, 2.4);
    this.burstPower = 0;
    this.depthIntent = rand(-0.4, 0.4);
    this.visualAngle = this.fishAngle;
    this.visualDepthIntent = this.depthIntent;
    this.origin = initial.origin ?? { x: 0, y: 0 };
    this.waterBounds = initial.waterBounds ?? defaultWaterBounds(this.origin);
    this.fishPosition = initial.fishPosition
      ? { x: initial.fishPosition.x, y: initial.fishPosition.y }
      : {
          x: this.origin.x + Math.cos(this.fishAngle) * this.distance,
          y: this.origin.y + Math.sin(this.fishAngle) * this.distance * 0.35,
        };
    this.visualPosition = { ...this.fishPosition };
    this.fishVelocity = { x: 0, y: 0 };
    this.result = null;

    if (initial.origin && initial.fishPosition) {
      const dx = initial.fishPosition.x - initial.origin.x;
      const dy = initial.fishPosition.y - initial.origin.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 24) {
        this.distance = clamp(distance, 90, 700);
        this.fishAngle = Math.atan2(dy, dx);
        this.visualAngle = this.fishAngle;
        this.depthIntent = clamp(dy / Math.max(distance, 1), -0.7, 0.7) * 0.35;
        this.visualDepthIntent = this.depthIntent;
      }
    }

    this.keepFishInWater();
  }

  update(dt, controls) {
    if (this.result) return this.result;
    this.waterBounds = controls.waterBounds ?? this.waterBounds;
    this.origin = controls.origin ?? this.origin;
    this.gearKg = getGearKg(this.equipment);
    this.fishPowerKg = getFishPowerKg(this.catchProfile);
    this.powerRatio = this.fishPowerKg / this.gearKg;

    const weightFactor = clamp(this.catchProfile.weight / 35, 0.02, 3.4);
    const aggression = this.catchProfile.personality?.aggression ?? 0.5;
    const intelligence = this.catchProfile.personality?.intelligence ?? 0.45;
    const rod = this.equipment.rod;
    const reel = this.equipment.reel;
    const line = this.equipment.line;
    const lineCapacity = (rod.maxTension + reel.drag + line.strength) / 3;

    this.burstTimer -= dt;
    if (this.burstTimer <= 0) {
      this.burstPower = rand(0.3, 1.15) * clamp(this.powerRatio, 0.22, 3.4) * (0.8 + aggression);
      this.fishAngle += rand(-0.7, 0.7) * (0.65 + intelligence * 0.6);
      this.depthIntent = rand(-1, 1);
      this.burstTimer = rand(1.15, 3.4) * (this.stamina > 38 ? 1 : 1.7);
    }
    this.burstPower = Math.max(0, this.burstPower - dt * 0.85);

    const angleDelta = shortestAngleDelta(this.visualAngle, this.fishAngle);
    const maxTurn = dt * (0.72 + intelligence * 0.65);
    this.visualAngle += clamp(angleDelta, -maxTurn, maxTurn);
    this.visualDepthIntent += (this.depthIntent - this.visualDepthIntent) * clamp(dt * 2.4, 0, 1);

    const staminaFactor = 0.22 + this.stamina / 128;
    const fishDrive = (this.fishPowerKg * 4.6 + this.burstPower * 16) * staminaFactor;
    const angleOpposition = clamp(controls.rodOpposition ?? 0.4, 0, 1);
    const overloadPressure = Math.max(0, this.powerRatio - 0.72) * (30 + weightFactor * 9);
    const burstPressure = this.burstPower * (8 + this.powerRatio * 5);
    const reelPressure = controls.reeling ? (4 + reel.speed * 7) * clamp(this.powerRatio, 0.15, 2.8) : 0;
    const smallFishCalm = this.powerRatio < 0.55 ? (0.55 - this.powerRatio) * 22 : 0;
    const loosenRelief = controls.loosen ? 42 : controls.reeling ? 0 : 13;
    const angleRelief = angleOpposition * (7 + rod.control * 14);
    const gearAbsorb = 5 + this.gearKg * 0.95 + line.friction * 2;

    this.tension += (overloadPressure + burstPressure + reelPressure - loosenRelief - angleRelief - gearAbsorb - smallFishCalm) * dt;
    if (!controls.reeling && !controls.loosen && this.tension > 8) this.tension -= (6 + Math.max(0, 1 - this.powerRatio) * 8) * dt;
    this.tension += rand(-0.55, 0.55) * dt * clamp(this.powerRatio, 0.15, 2.8);
    this.tension = clamp(this.tension, 0, 112);

    const safeReel = clamp((94 - this.tension) / 58, 0, 1);
    const tiredBonus = clamp(1.18 - this.stamina / 145, 0.42, 1.14);
    const direction = directionFromAngle(this.visualAngle, this.visualDepthIntent);
    const swimPower = (14 + Math.sqrt(this.catchProfile.weight) * 8 + aggression * 24 + this.burstPower * 18) * staminaFactor;
    this.fishVelocity.x += direction.x * swimPower * dt;
    this.fishVelocity.y += direction.y * swimPower * dt;

    const toOrigin = {
      x: this.origin.x - this.fishPosition.x,
      y: this.origin.y - this.fishPosition.y,
    };
    const toOriginLength = Math.hypot(toOrigin.x, toOrigin.y) || 1;
    const pullScale = clamp(1.28 - this.powerRatio * 0.18, 0.28, 1.18);
    if (controls.reeling && !controls.loosen) {
      const pull = (34 + reel.speed * 62 + this.gearKg * 3.1) * safeReel * tiredBonus * pullScale;
      const directPull = (7 + reel.speed * 11 + this.gearKg * 0.65) * safeReel * tiredBonus * pullScale;
      this.fishVelocity.x += (toOrigin.x / toOriginLength) * pull * dt;
      this.fishVelocity.y += (toOrigin.y / toOriginLength) * pull * dt;
      this.fishPosition.x += (toOrigin.x / toOriginLength) * directPull * dt;
      this.fishPosition.y += (toOrigin.y / toOriginLength) * directPull * dt;
    }
    if (controls.loosen) {
      this.fishVelocity.x -= (toOrigin.x / toOriginLength) * (7 + fishDrive * 0.05) * dt;
      this.fishVelocity.y -= (toOrigin.y / toOriginLength) * (7 + fishDrive * 0.05) * dt;
    }

    this.fishVelocity.x *= Math.pow(0.13, dt);
    this.fishVelocity.y *= Math.pow(0.13, dt);
    this.fishPosition.x += this.fishVelocity.x * dt;
    this.fishPosition.y += this.fishVelocity.y * dt;
    this.keepFishInWater();
    this.visualPosition.x += (this.fishPosition.x - this.visualPosition.x) * clamp(dt * 7.5, 0, 1);
    this.visualPosition.y += (this.fishPosition.y - this.visualPosition.y) * clamp(dt * 7.5, 0, 1);
    this.distance = Math.hypot(this.fishPosition.x - this.origin.x, this.fishPosition.y - this.origin.y);

    const balanced = this.tension > 28 && this.tension < 82;
    const gearAdvantage = clamp((this.gearKg - this.fishPowerKg) / this.gearKg, 0, 1);
    const controlDrain = balanced ? 3.4 + angleOpposition * (4 + gearAdvantage * 5.6) : 0.9 + angleOpposition * 1.6;
    const reelDrain = controls.reeling && balanced ? 2.2 + gearAdvantage * 3.2 : controls.reeling ? 0.9 + safeReel * 0.8 : 0;
    const burstDrain = this.burstPower > 0.25 ? 0.7 : 0;
    this.stamina -= (controlDrain + reelDrain + burstDrain) * dt * clamp(1.18 - this.powerRatio * 0.13, 0.42, 1.35);
    this.stamina = clamp(this.stamina, 0, 100);

    if (this.tension >= 100) this.overloadTime += dt * (this.tension >= 106 ? 1.7 : 1);
    else this.overloadTime = Math.max(0, this.overloadTime - dt * 2.25);
    if (this.tension <= 5 && !controls.reeling) this.slackTime += dt;
    else this.slackTime = Math.max(0, this.slackTime - dt * 1.7);

    if (this.overloadTime > 0.95 + line.snagResist * 0.75 - this.catchProfile.weight / Math.max(95, lineCapacity * 2.8)) {
      this.result = { type: "lineBreak" };
    } else if (this.slackTime > 2.1 + (this.catchProfile.hookQuality ?? 0.5)) {
      this.result = { type: "escaped" };
    } else if ((this.stamina <= 14 && this.distance <= 64) || this.distance <= 32) {
      this.result = { type: "caught", fish: this.catchProfile };
    }
    return this.result ?? { type: "fighting" };
  }

  keepFishInWater() {
    const bounds = this.waterBounds;
    if (this.fishPosition.x < bounds.left || this.fishPosition.x > bounds.right) {
      this.fishVelocity.x *= -0.48;
      this.fishAngle = Math.PI - this.fishAngle + rand(-0.18, 0.18);
    }
    if (this.fishPosition.y < bounds.top || this.fishPosition.y > bounds.bottom) {
      this.fishVelocity.y *= -0.48;
      this.fishAngle *= -1;
      this.depthIntent *= -0.55;
    }
    this.fishPosition.x = clamp(this.fishPosition.x, bounds.left, bounds.right);
    this.fishPosition.y = clamp(this.fishPosition.y, bounds.top, bounds.bottom);
    this.visualPosition.x = clamp(this.visualPosition.x, bounds.left, bounds.right);
    this.visualPosition.y = clamp(this.visualPosition.y, bounds.top, bounds.bottom);
  }

  getDirectionVector() {
    if (this.origin && this.visualPosition) {
      const dx = this.visualPosition.x - this.origin.x;
      const dy = this.visualPosition.y - this.origin.y;
      const length = Math.hypot(dx, dy) || 1;
      return { x: dx / length, y: dy / length };
    }
    return directionFromAngle(this.visualAngle, this.visualDepthIntent);
  }

  getFishPosition() {
    return { ...this.visualPosition };
  }
}
