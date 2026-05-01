function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function length(x, y) {
  return Math.hypot(x, y) || 1;
}

function waterBounds(bounds) {
  return {
    left: 50,
    right: bounds.width - 50,
    top: bounds.height * 0.35,
    bottom: bounds.height * 0.84,
  };
}

export class LurePhysics {
  constructor(lure, location) {
    this.lure = lure;
    this.location = location;
    this.reset();
  }

  reset() {
    this.x = 110;
    this.y = 540;
    this.vx = 0;
    this.vy = 0;
    this.depth = 0;
    this.castProgress = 0;
    this.inWater = false;
    this.trail = [];
    this.style = "idle";
    this.noise = 0;
    this.speed = 0;
    this.lastControl = { x: 0, y: 0 };
    this.turbulence = Math.random() * 10;
  }

  cast(origin, target, power, skillLevel) {
    this.x = origin.x;
    this.y = origin.y;
    this.depth = 0.04;
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const dist = length(dx, dy);
    const castSkill = 1 + skillLevel * 0.035;
    const launch = clamp(power, 0.1, 1) * 920 * castSkill;
    this.vx = (dx / dist) * launch;
    this.vy = (dy / dist) * launch - 130 * clamp(power, 0.1, 1);
    this.inWater = true;
    this.style = "cast";
    this.trail = [{ x: this.x, y: this.y, depth: this.depth }];
  }

  update(dt, input, weather, playerSkill = 1) {
    if (!this.inWater) return;
    const lure = this.lure;
    const wind = weather.getWind(this.location);
    const waterDrag = lure.drag * (0.82 + this.depth * 0.72);
    const speed = length(this.vx, this.vy);
    const dragForce = waterDrag * speed * 0.92;

    this.turbulence += dt * (2.2 + this.location.current * 3);
    const turbulenceX = Math.sin(this.turbulence * 1.7) * (8 + this.location.current * 22);
    const turbulenceY = Math.cos(this.turbulence * 1.3) * (5 + weather.weather.wind * 22);
    const currentPush = this.location.current * 95 + wind.x * 46;

    let controlX = 0;
    let controlY = 0;
    const pointer = input.pointer;
    if (pointer?.inside) {
      const dx = pointer.x - this.x;
      const dy = pointer.y - this.y;
      const dist = length(dx, dy);
      const controlPower = (input.reeling ? 265 : 95) * (1 + playerSkill * 0.035);
      controlX = (dx / dist) * controlPower;
      controlY = (dy / dist) * controlPower;
    }

    if (input.loosen) {
      controlX *= 0.28;
      controlY *= 0.28;
    }

    this.vx += (controlX + currentPush + turbulenceX - this.vx * dragForce * 0.012) * dt / Math.max(0.32, lure.mass);
    this.vy += (controlY + turbulenceY + lure.sinkRate * 130 - this.vy * dragForce * 0.012) * dt / Math.max(0.32, lure.mass);

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const area = waterBounds(input.bounds);
    this.x = clamp(this.x, area.left, area.right);
    this.y = clamp(this.y, area.top, area.bottom);
    this.depth = clamp(this.depth + (lure.sinkRate * 0.12 + Math.abs(this.vy) * 0.00042 - (input.reeling ? 0.05 : 0)) * dt, 0, 1);
    this.speed = length(this.vx, this.vy);
    this.noise = clamp(lure.noise + this.speed / 850 + (input.pointerSpeed ?? 0) / 1700, 0, 1.4);

    const controlDelta = length(controlX - this.lastControl.x, controlY - this.lastControl.y);
    if (input.reeling && controlDelta > 420) this.style = "jerk";
    else if (input.reeling && this.speed > 175) this.style = "pull";
    else if (this.speed < 38 && !input.reeling) this.style = "pause";
    else this.style = "steady";

    this.lastControl = { x: controlX, y: controlY };
    this.trail.push({ x: this.x, y: this.y, depth: this.depth });
    if (this.trail.length > 42) this.trail.shift();
  }

  get telemetry() {
    return {
      x: this.x,
      y: this.y,
      depth: this.depth,
      speed: this.speed,
      style: this.style,
      noise: this.noise,
      lure: this.lure,
    };
  }
}
