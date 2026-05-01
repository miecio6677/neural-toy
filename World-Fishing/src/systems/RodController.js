import { getEquipmentById } from "../data.js";
import { LurePhysics } from "./LurePhysics.js";
import { FishAI } from "./FishAI.js";
import { TensionSystem } from "./TensionSystem.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function linePointDistance(point, a, b) {
  const px = point.x;
  const py = point.y;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = dx * dx + dy * dy || 1;
  const t = clamp(((px - a.x) * dx + (py - a.y) * dy) / len, 0, 1);
  const x = a.x + dx * t;
  const y = a.y + dy * t;
  return Math.hypot(px - x, py - y);
}

function waterBounds(bounds) {
  return {
    left: 50,
    right: bounds.width - 50,
    top: bounds.height * 0.35,
    bottom: bounds.height * 0.84,
  };
}

function clampToWater(point, bounds) {
  const area = waterBounds(bounds);
  return {
    ...point,
    x: clamp(point.x, area.left, area.right),
    y: clamp(point.y, area.top, area.bottom),
    inside: true,
  };
}

export class RodController {
  constructor(index, stateProvider) {
    this.index = index;
    this.stateProvider = stateProvider;
    this.status = "idle";
    this.charge = 0;
    this.lurePhysics = null;
    this.fishAI = null;
    this.tensionSystem = null;
    this.catchProfile = null;
    this.message = "Idle";
    this.isPassive = false;
    this.lastEvent = null;
    this.castOrigin = { x: 118, y: 560 };
    this.passiveTimer = 0;
  }

  getEquipment() {
    const state = this.stateProvider();
    const player = state.player;
    return {
      rod: getEquipmentById("rod", player.equipped.rod),
      reel: getEquipmentById("reel", player.equipped.reel),
      line: getEquipmentById("line", player.equipped.line),
      lure: getEquipmentById("lure", player.equipped.lure),
      backpack: getEquipmentById("backpack", player.equipped.backpack),
    };
  }

  beginCast() {
    if (this.status !== "idle") return false;
    this.status = "charging";
    this.charge = 0.08;
    this.isPassive = false;
    this.message = "Casting";
    return true;
  }

  releaseCast(pointer, bounds) {
    if (this.status !== "charging") return false;
    const state = this.stateProvider();
    const equipment = this.getEquipment();
    this.lurePhysics = new LurePhysics(equipment.lure, state.currentLocation);
    this.fishAI = new FishAI(state.currentLocation, state.player);
    const target = clampToWater(pointer?.inside ? pointer : { x: bounds.width * 0.62, y: bounds.height * 0.48 }, bounds);
    this.lurePhysics.cast(this.castOrigin, target, this.charge, state.player.skills.casting.level);
    this.status = "retrieving";
    this.message = "Retrieve";
    this.charge = 0;
    return true;
  }

  deployPassive(bounds) {
    if (this.status !== "idle") return false;
    const state = this.stateProvider();
    const equipment = this.getEquipment();
    this.lurePhysics = new LurePhysics(equipment.lure, state.currentLocation);
    this.fishAI = new FishAI(state.currentLocation, state.player);
    const target = {
      x: bounds.width * (0.45 + Math.random() * 0.38),
      y: bounds.height * (0.3 + Math.random() * 0.48),
      inside: true,
    };
    this.lurePhysics.cast(this.castOrigin, clampToWater(target, bounds), 0.55 + Math.random() * 0.35, state.player.skills.casting.level);
    this.status = "retrieving";
    this.message = "Set rod";
    this.isPassive = true;
    this.passiveTimer = 0;
    return true;
  }

  cancelToIdle(message = "Idle") {
    this.status = "idle";
    this.charge = 0;
    this.lurePhysics = null;
    this.fishAI = null;
    this.tensionSystem = null;
    this.catchProfile = null;
    this.isPassive = false;
    this.message = message;
  }

  update(dt, input, weather, active) {
    this.lastEvent = null;
    const state = this.stateProvider();
    if (!state.currentLocation) return null;

    if (this.status === "charging") {
      this.charge = clamp(this.charge + dt * 0.55, 0.08, 1);
      this.message = `Power ${Math.round(this.charge * 100)}%`;
      return null;
    }

    if (this.status === "retrieving" || this.status === "bite") {
      const rodInput = this.makeRodInput(input, active);
      this.lurePhysics?.update(dt, rodInput, weather, state.player.skills.control.level);
      const event = this.fishAI?.update(dt, this.lurePhysics.telemetry, rodInput, weather, state.player);
      if (event?.type === "bite") {
        this.status = "bite";
        this.message = `Bite ${event.bite.timer.toFixed(1)}s`;
      } else if (event?.type === "biteExpired") {
        this.status = "retrieving";
        this.message = "Missed bite";
        this.lastEvent = { type: "biteExpired", rod: this };
      } else if (this.status !== "bite") {
        this.message = this.isPassive ? "Waiting" : this.lurePhysics?.style ?? "Retrieve";
      }

      if (this.isPassive) {
        this.passiveTimer += dt;
        if (this.passiveTimer > 34 + Math.random() * 16) {
          this.cancelToIdle("Recast");
        }
      }
      return this.lastEvent;
    }

    if (this.status === "fighting") {
      const controls = this.makeFightControls(input, active);
      const result = this.tensionSystem.update(dt, controls);
      const direction = this.tensionSystem.getDirectionVector();
      this.message = `Fight ${Math.round(this.tensionSystem.tension)}%`;
      if (result.type === "caught") {
        this.status = "caught";
        this.catchProfile = result.fish;
        this.lastEvent = { type: "caught", fish: result.fish, rod: this };
      } else if (result.type === "lineBreak" || result.type === "escaped") {
        this.status = "lost";
        this.lastEvent = { type: result.type, fish: this.catchProfile, rod: this };
        setTimeout(() => this.cancelToIdle(result.type === "lineBreak" ? "Line broke" : "Escaped"), 600);
      }
      this.fishDirection = direction;
      return this.lastEvent;
    }

    return null;
  }

  tryHook(force) {
    if (this.status !== "bite" || !this.fishAI) return { success: false, reason: "no_bite" };
    const result = this.fishAI.hookAttempt(force);
    if (!result.success) {
      this.status = "retrieving";
      this.message = "Bad hook";
      return result;
    }
    this.catchProfile = result.catchProfile;
    this.tensionSystem = new TensionSystem(result.catchProfile, this.getEquipment(), {
      origin: this.castOrigin,
      fishPosition: this.lurePhysics ? { x: this.lurePhysics.x, y: this.lurePhysics.y } : null,
    });
    this.status = "fighting";
    this.message = "Hooked";
    return result;
  }

  makeRodInput(input, active) {
    const passivePointer = {
      x: (this.lurePhysics?.x ?? input.bounds.width * 0.55) - 90 + Math.sin(performance.now() / 700 + this.index) * 120,
      y: (this.lurePhysics?.y ?? input.bounds.height * 0.5) + Math.cos(performance.now() / 900 + this.index) * 72,
      inside: true,
    };
    return {
      ...input,
      pointer: active && !this.isPassive ? input.pointer : passivePointer,
      pointerSpeed: active && !this.isPassive ? input.pointerSpeed : 55,
      reeling: active && !this.isPassive ? input.reeling : Math.random() < 0.64,
      loosen: active && !this.isPassive ? input.loosen : false,
    };
  }

  makeFightControls(input, active) {
    const direction = this.tensionSystem.getDirectionVector();
    const rodBase = this.castOrigin;
    const defaultPointer = { x: rodBase.x - direction.x * 260, y: rodBase.y - direction.y * 220 };
    const pointer = active && input.pointer?.inside ? input.pointer : defaultPointer;
    const rodVector = { x: pointer.x - rodBase.x, y: pointer.y - rodBase.y };
    const rodLength = Math.hypot(rodVector.x, rodVector.y) || 1;
    const rodNorm = { x: rodVector.x / rodLength, y: rodVector.y / rodLength };
    const fishLength = Math.hypot(direction.x, direction.y) || 1;
    const fishNorm = { x: direction.x / fishLength, y: direction.y / fishLength };
    const opposition = clamp((-(rodNorm.x * fishNorm.x + rodNorm.y * fishNorm.y) + 1) / 2, 0, 1);
    return {
      reeling: active ? input.reeling : false,
      loosen: active ? input.loosen : false,
      rodOpposition: opposition,
      origin: rodBase,
      waterBounds: waterBounds(input.bounds),
    };
  }

  isLineNearPointer(pointer) {
    if (!this.lurePhysics || !pointer?.inside) return false;
    return linePointDistance(pointer, this.castOrigin, this.lurePhysics) < 18;
  }
}
