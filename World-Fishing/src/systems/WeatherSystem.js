const weatherTypes = [
  { id: "clear", label: "Bezchmurnie", bite: 0.96, visibility: 1.12, wind: 0.08, temp: 19 },
  { id: "cloudy", label: "Zachmurzenie", bite: 1.08, visibility: 0.98, wind: 0.16, temp: 16 },
  { id: "rain", label: "Deszcz", bite: 1.16, visibility: 0.78, wind: 0.22, temp: 13 },
  { id: "wind", label: "Wiatr", bite: 1.02, visibility: 0.9, wind: 0.36, temp: 17 },
  { id: "cold", label: "Chłodno", bite: 0.92, visibility: 1.02, wind: 0.18, temp: 7 },
  { id: "warm", label: "Ciepło", bite: 1.05, visibility: 1.0, wind: 0.1, temp: 25 },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class WeatherSystem {
  constructor() {
    this.time = 6.4;
    this.day = 1;
    this.weather = weatherTypes[1];
    this.nextChange = 150 + Math.random() * 160;
    this.temperature = this.weather.temp;
    this.windPhase = Math.random() * Math.PI * 2;
  }

  update(dt, location) {
    this.time += dt * 0.035;
    if (this.time >= 24) {
      this.time -= 24;
      this.day += 1;
    }

    this.nextChange -= dt;
    if (this.nextChange <= 0) {
      this.rollWeather(location);
    }

    this.windPhase += dt * 0.8;
    const targetTemp = this.weather.temp + (location?.difficulty ?? 1) * 0.2;
    this.temperature += (targetTemp - this.temperature) * dt * 0.06;
  }

  rollWeather(location) {
    const difficulty = location?.difficulty ?? 1;
    const index = Math.floor(Math.random() * weatherTypes.length);
    this.weather = weatherTypes[(index + Math.floor(difficulty / 3)) % weatherTypes.length];
    this.nextChange = 130 + Math.random() * 220;
  }

  get light() {
    const morning = clamp((this.time - 4.5) / 2.2, 0, 1);
    const evening = clamp((21.2 - this.time) / 2.2, 0, 1);
    return clamp(Math.min(morning, evening), 0.18, 1);
  }

  get currentLabel() {
    return this.weather.label;
  }

  getClockLabel() {
    const hour = Math.floor(this.time);
    const minute = Math.floor((this.time - hour) * 60);
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  getWind(location) {
    const base = this.weather.wind + (location?.current ?? 0) * 0.1;
    return {
      x: Math.cos(this.windPhase) * base,
      y: Math.sin(this.windPhase * 0.7) * base * 0.45,
      strength: base,
    };
  }

  getBiteModifier(fish, lure, location) {
    let modifier = this.weather.bite;
    if (fish?.weatherPreference === this.weather.id) modifier += 0.18;
    if (this.weather.id === "rain" && lure?.type === "popper") modifier += 0.12;
    if (this.weather.id === "clear" && fish?.caution > 0.65) modifier -= 0.12;
    const currentDelta = Math.abs((fish?.currentPreference ?? 0.4) - (location?.current ?? 0.2));
    modifier -= currentDelta * 0.16;
    return clamp(modifier, 0.55, 1.45);
  }

  isActiveHour(fish) {
    if (!fish?.activeHours) return true;
    const [a, b] = fish.activeHours;
    const distanceA = Math.min(Math.abs(this.time - a), 24 - Math.abs(this.time - a));
    const distanceB = Math.min(Math.abs(this.time - b), 24 - Math.abs(this.time - b));
    return Math.min(distanceA, distanceB) < 3.2;
  }
}
