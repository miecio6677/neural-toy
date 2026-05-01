import { BACKPACKS } from "../data.js";
import { RodController } from "./RodController.js";

export class MultiRodManager {
  constructor(stateProvider) {
    this.stateProvider = stateProvider;
    this.rods = [];
    this.activeIndex = 0;
    this.syncSlots();
  }

  syncSlots() {
    const state = this.stateProvider();
    const backpack = BACKPACKS.find((item) => item.id === state.player.equipped.backpack) ?? BACKPACKS[0];
    while (this.rods.length < backpack.rodSlots) {
      this.rods.push(new RodController(this.rods.length, this.stateProvider));
    }
    while (this.rods.length > backpack.rodSlots) {
      const removed = this.rods.pop();
      removed?.cancelToIdle();
    }
    this.activeIndex = Math.min(this.activeIndex, this.rods.length - 1);
  }

  get activeRod() {
    return this.rods[this.activeIndex];
  }

  select(index) {
    if (index >= 0 && index < this.rods.length) {
      this.activeIndex = index;
    }
  }

  update(dt, input, weather) {
    this.syncSlots();
    const events = [];
    this.rods.forEach((rod, index) => {
      const event = rod.update(dt, input, weather, index === this.activeIndex);
      if (event) events.push(event);
    });
    return events;
  }

  deployPassive(index, bounds) {
    const rod = this.rods[index];
    return rod?.deployPassive(bounds) ?? false;
  }

  resetAll() {
    this.rods.forEach((rod) => rod.cancelToIdle());
  }
}
