import {
  BACKPACKS,
  LOCATIONS,
  SHOP_CATEGORIES,
  getEquipmentById,
  getLocation,
} from "./data.js";
import { MultiRodManager } from "./systems/MultiRodManager.js";
import { WeatherSystem } from "./systems/WeatherSystem.js";
import {
  addSkillXp,
  addXp,
  claimQuest,
  ensureProgressUnlocks,
  formatMoney,
  formatWeight,
  getInventoryWeight,
  getKeepnetCapacity,
  loadState,
  recordQuestProgress,
  registerCatchInJournal,
  resetState,
  saveState,
} from "./storage.js";
import {
  renderActionBar,
  renderCatchModal,
  renderFishingPanel,
  renderHeader,
  renderHud,
  renderInventoryPanel,
  renderJournalPanel,
  renderMapPanel,
  renderRodDock,
  renderShopPanel,
  renderWikiPanel,
  setActiveNav,
} from "./ui.js";

const TAU = Math.PI * 2;

const MAP_LANDMASSES = [
  {
    fill: "#5f9a56",
    points: [
      [0.04, 0.3],
      [0.08, 0.2],
      [0.16, 0.13],
      [0.28, 0.14],
      [0.35, 0.24],
      [0.33, 0.36],
      [0.28, 0.43],
      [0.2, 0.48],
      [0.13, 0.42],
      [0.07, 0.38],
    ],
  },
  {
    fill: "#77a857",
    points: [
      [0.23, 0.46],
      [0.3, 0.48],
      [0.35, 0.55],
      [0.32, 0.6],
      [0.24, 0.54],
    ],
  },
  {
    fill: "#6ea05c",
    points: [
      [0.31, 0.55],
      [0.39, 0.62],
      [0.38, 0.76],
      [0.32, 0.92],
      [0.27, 0.78],
      [0.25, 0.63],
    ],
  },
  {
    fill: "#9bb3a7",
    points: [
      [0.32, 0.15],
      [0.39, 0.09],
      [0.47, 0.14],
      [0.44, 0.23],
      [0.36, 0.24],
    ],
  },
  {
    fill: "#d2b85f",
    points: [
      [0.44, 0.28],
      [0.51, 0.22],
      [0.58, 0.26],
      [0.57, 0.35],
      [0.51, 0.4],
      [0.44, 0.36],
    ],
  },
  {
    fill: "#7ea07c",
    points: [
      [0.49, 0.16],
      [0.55, 0.11],
      [0.6, 0.16],
      [0.57, 0.25],
      [0.51, 0.24],
    ],
  },
  {
    fill: "#c28f4f",
    points: [
      [0.5, 0.39],
      [0.59, 0.43],
      [0.63, 0.58],
      [0.57, 0.82],
      [0.49, 0.72],
      [0.45, 0.53],
    ],
  },
  {
    fill: "#caa05c",
    points: [
      [0.58, 0.39],
      [0.64, 0.42],
      [0.66, 0.53],
      [0.61, 0.53],
    ],
  },
  {
    fill: "#8cae55",
    points: [
      [0.56, 0.21],
      [0.68, 0.17],
      [0.83, 0.2],
      [0.93, 0.32],
      [0.88, 0.48],
      [0.75, 0.56],
      [0.62, 0.49],
      [0.56, 0.36],
    ],
  },
  {
    fill: "#a8b554",
    points: [
      [0.66, 0.47],
      [0.73, 0.53],
      [0.74, 0.68],
      [0.68, 0.63],
      [0.64, 0.52],
    ],
  },
  {
    fill: "#6ca06e",
    points: [
      [0.78, 0.49],
      [0.86, 0.52],
      [0.89, 0.63],
      [0.81, 0.6],
    ],
  },
  {
    fill: "#d09a59",
    points: [
      [0.75, 0.68],
      [0.88, 0.64],
      [0.95, 0.76],
      [0.87, 0.85],
      [0.75, 0.8],
    ],
  },
  {
    fill: "#7aa36b",
    points: [
      [0.83, 0.39],
      [0.86, 0.36],
      [0.89, 0.43],
      [0.85, 0.48],
    ],
  },
  {
    fill: "#bd8c55",
    points: [
      [0.58, 0.8],
      [0.62, 0.82],
      [0.61, 0.91],
      [0.56, 0.89],
    ],
  },
  {
    fill: "#8aa86b",
    points: [
      [0.88, 0.82],
      [0.93, 0.86],
      [0.9, 0.91],
      [0.85, 0.87],
    ],
  },
];

const MAP_BORDER_LINES = [
  [
    [0.17, 0.16],
    [0.2, 0.29],
    [0.18, 0.43],
  ],
  [
    [0.27, 0.18],
    [0.26, 0.34],
    [0.3, 0.44],
  ],
  [
    [0.34, 0.61],
    [0.31, 0.73],
    [0.34, 0.87],
  ],
  [
    [0.5, 0.24],
    [0.52, 0.38],
    [0.47, 0.53],
  ],
  [
    [0.56, 0.43],
    [0.55, 0.59],
    [0.52, 0.73],
  ],
  [
    [0.62, 0.25],
    [0.72, 0.35],
    [0.84, 0.33],
  ],
  [
    [0.7, 0.2],
    [0.69, 0.42],
    [0.76, 0.55],
  ],
  [
    [0.8, 0.24],
    [0.78, 0.42],
    [0.84, 0.54],
  ],
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const int = parseInt(clean, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function mixColor(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return `rgb(${Math.round(lerp(ca.r, cb.r, t))}, ${Math.round(lerp(ca.g, cb.g, t))}, ${Math.round(lerp(ca.b, cb.b, t))})`;
}

class WorldFishing2D {
  constructor() {
    this.canvas = document.querySelector("#gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.elements = {
      sidePanel: document.querySelector("#sidePanel"),
      hudOverlay: document.querySelector("#hudOverlay"),
      multiRodPanel: document.querySelector("#multiRodPanel"),
      actionBar: document.querySelector("#actionBar"),
      modalBackdrop: document.querySelector("#modalBackdrop"),
      modalCard: document.querySelector("#modalCard"),
      moneyStat: document.querySelector("#moneyStat"),
      levelStat: document.querySelector("#levelStat"),
      xpStat: document.querySelector("#xpStat"),
      subStatus: document.querySelector("#subStatus"),
    };

    this.player = loadState();
    this.weather = new WeatherSystem();
    this.view = "map";
    this.shopCategory = "rods";
    this.selectedLocation = getLocation(this.player.currentLocationId) ?? LOCATIONS[0];
    this.wikiLocationId = this.player.currentLocationId ?? LOCATIONS[0].id;
    this.wikiFishName = getLocation(this.wikiLocationId)?.fish[0]?.name ?? LOCATIONS[0].fish[0]?.name;
    this.pendingCatch = null;
    this.pendingCatchRod = null;
    this.lastTime = performance.now();
    this.sideRefresh = 0;
    this.toastTimer = 0;
    this.toastText = "Mapa świata";
    this.mapHover = null;

    this.input = {
      bounds: { width: this.canvas.width, height: this.canvas.height },
      pointer: { x: 0, y: 0, inside: false },
      pointerSpeed: 0,
      upwardVelocity: 0,
      reeling: false,
      loosen: false,
      mouseDown: false,
      rightMouseDown: false,
      keyReeling: false,
      keyLoosen: false,
      buttonReeling: false,
      buttonLoosen: false,
      lastPointerTime: performance.now(),
    };

    this.manager = new MultiRodManager(() => this.systemState());
    this.resize();
    this.bindEvents();
    this.renderStatic();
    requestAnimationFrame((time) => this.loop(time));
  }

  get currentLocation() {
    return getLocation(this.player.currentLocationId);
  }

  get equipment() {
    return {
      rod: getEquipmentById("rod", this.player.equipped.rod),
      reel: getEquipmentById("reel", this.player.equipped.reel),
      line: getEquipmentById("line", this.player.equipped.line),
      lure: getEquipmentById("lure", this.player.equipped.lure),
      backpack: getEquipmentById("backpack", this.player.equipped.backpack),
    };
  }

  viewState() {
    return {
      ...this.player,
      player: this.player,
      view: this.view,
      selectedLocation: this.selectedLocation,
      currentLocation: this.currentLocation,
      equipment: this.equipment,
    };
  }

  systemState() {
    return {
      player: this.player,
      currentLocation: this.currentLocation,
    };
  }

  bindEvents() {
    window.addEventListener("resize", () => this.resize());
    this.canvas.addEventListener("pointermove", (event) => this.onPointerMove(event));
    this.canvas.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    window.addEventListener("pointerup", (event) => this.onPointerUp(event));
    window.addEventListener("pointercancel", (event) => this.onPointerUp(event));
    this.canvas.addEventListener("pointerleave", () => {
      this.input.pointer.inside = false;
      this.mapHover = null;
      this.syncInputControls();
    });
    this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());

    document.querySelector(".main-nav").addEventListener("click", (event) => {
      const button = event.target.closest("[data-view]");
      if (!button) return;
      this.setView(button.dataset.view);
    });

    this.elements.sidePanel.addEventListener("click", (event) => this.onUiClick(event));
    this.elements.actionBar.addEventListener("pointerdown", (event) => this.onControlPointerDown(event));
    this.elements.actionBar.addEventListener("click", (event) => this.onUiClick(event));
    this.elements.multiRodPanel.addEventListener("click", (event) => this.onUiClick(event));
    this.elements.modalBackdrop.addEventListener("click", (event) => this.onModalClick(event));

    window.addEventListener("keydown", (event) => {
      if (event.code === "Space") {
        event.preventDefault();
        this.input.keyReeling = true;
      }
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") this.input.keyLoosen = true;
      if (event.code === "Escape") this.setView("map");
      this.syncInputControls();
    });
    window.addEventListener("keyup", (event) => {
      if (event.code === "Space") this.input.keyReeling = false;
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") this.input.keyLoosen = false;
      this.syncInputControls();
    });
    window.addEventListener("blur", () => {
      this.input.mouseDown = false;
      this.input.rightMouseDown = false;
      this.input.keyReeling = false;
      this.input.keyLoosen = false;
      this.input.buttonReeling = false;
      this.input.buttonLoosen = false;
      this.syncInputControls();
    });
  }

  resize() {
    const frame = this.canvas.parentElement;
    const rect = frame.getBoundingClientRect();
    this.canvas.width = Math.max(720, Math.floor(rect.width));
    this.canvas.height = Math.max(420, Math.floor(rect.height));
    this.input.bounds.width = this.canvas.width;
    this.input.bounds.height = this.canvas.height;
  }

  canvasPoint(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * this.canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * this.canvas.height,
      inside:
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom,
    };
  }

  mouseCanReel() {
    const status = this.manager.activeRod?.status;
    return this.view === "fishing" && this.input.mouseDown && (status === "retrieving" || status === "fighting");
  }

  syncInputControls() {
    this.input.reeling = this.input.keyReeling || this.input.buttonReeling || this.mouseCanReel();
    this.input.loosen = this.input.keyLoosen || this.input.buttonLoosen || this.input.rightMouseDown;
  }

  onPointerMove(event) {
    const now = performance.now();
    const point = this.canvasPoint(event);
    const dt = Math.max(0.008, (now - this.input.lastPointerTime) / 1000);
    const dx = point.x - this.input.pointer.x;
    const dy = point.y - this.input.pointer.y;
    this.input.pointerSpeed = Math.hypot(dx, dy) / dt;
    this.input.upwardVelocity = Math.max(0, -dy / dt);
    this.input.pointer = point;
    this.input.lastPointerTime = now;

    if (this.view === "map") {
      this.mapHover = this.hitTestLocation(point.x, point.y);
      this.canvas.style.cursor = this.mapHover ? "pointer" : "crosshair";
    } else {
      this.canvas.style.cursor = "crosshair";
    }

    this.syncInputControls();
  }

  onPointerDown(event) {
    this.onPointerMove(event);

    if (event.button === 2) {
      this.input.rightMouseDown = true;
      this.syncInputControls();
      return;
    }
    this.input.mouseDown = true;

    if (this.view === "map") {
      const location = this.hitTestLocation(this.input.pointer.x, this.input.pointer.y);
      if (location) {
        this.selectedLocation = location;
        this.renderStatic();
      }
      return;
    }

    if (this.view !== "fishing" || !this.currentLocation || this.pendingCatch) return;
    const rod = this.manager.activeRod;
    if (!rod) return;
    if (rod.status === "bite") {
      this.attemptHook(this.input.upwardVelocity + 520);
      this.syncInputControls();
    } else if (rod.status === "idle") {
      rod.castOrigin = this.rodGeometry().tip;
      rod.beginCast();
      addSkillXp(this.player, "casting", 1);
      this.showStatus("Ładowanie rzutu");
      this.syncInputControls();
    } else if (rod.status === "fighting" || rod.status === "retrieving") {
      this.syncInputControls();
    }
  }

  onPointerUp(event) {
    this.onPointerMove(event);
    if (event.button === 2) this.input.rightMouseDown = false;
    else this.input.mouseDown = false;
    this.input.buttonReeling = false;
    this.input.buttonLoosen = false;

    if (this.view === "fishing") {
      const rod = this.manager.activeRod;
      if (rod?.status === "charging") {
        rod.castOrigin = this.rodGeometry().tip;
        rod.releaseCast(this.input.pointer, this.input.bounds);
        addSkillXp(this.player, "casting", Math.round(4 + rod.charge * 10));
        this.showStatus("Rzut wykonany");
      }
    }
    this.syncInputControls();
  }

  onControlPointerDown(event) {
    const button = event.target.closest("[data-hold-control]");
    if (!button) return;
    event.preventDefault();
    if (button.dataset.holdControl === "reel") {
      this.input.buttonReeling = true;
      this.input.buttonLoosen = false;
    }
    if (button.dataset.holdControl === "loosen") {
      this.input.buttonLoosen = true;
      this.input.buttonReeling = false;
    }
    this.syncInputControls();
  }

  onUiClick(event) {
    const viewJump = event.target.closest("[data-view-jump]");
    if (viewJump) {
      this.setView(viewJump.dataset.viewJump);
      return;
    }

    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;

    if (action === "travel") this.travel(button.dataset.location);
    if (action === "shop-category") {
      this.shopCategory = button.dataset.category;
      this.renderStatic();
    }
    if (action === "wiki-location") {
      const location = getLocation(button.dataset.location) ?? LOCATIONS[0];
      this.wikiLocationId = location.id;
      this.wikiFishName = location.fish[0]?.name ?? this.wikiFishName;
      this.renderStatic();
    }
    if (action === "wiki-fish") {
      const location = getLocation(button.dataset.location) ?? getLocation(this.wikiLocationId) ?? LOCATIONS[0];
      this.wikiLocationId = location.id;
      this.wikiFishName = button.dataset.fish;
      this.renderStatic();
    }
    if (action === "buy") this.buyItem(button.dataset.category, button.dataset.item);
    if (action === "equip") this.equipItem(button.dataset.category, button.dataset.item);
    if (action === "sell-all") this.sellAll();
    if (action === "claim-quest") this.claimQuest(button.dataset.quest);
    if (action === "reset-save") this.resetSave();
    if (action === "select-rod") {
      this.manager.select(Number(button.dataset.rod));
      this.renderDynamic();
    }
    if (action === "passive-rod") {
      const index = Number(button.dataset.rod);
      const rod = this.manager.rods[index];
      if (rod) rod.castOrigin = this.rodGeometry().tip;
      this.manager.deployPassive(index, this.input.bounds);
      this.renderDynamic();
    }
    if (action === "cast-active") this.quickCast();
    if (action === "hook-active") this.attemptHook(900);
    if (action === "cancel-active") {
      this.manager.activeRod?.cancelToIdle();
      this.renderDynamic();
    }
  }

  onModalClick(event) {
    const button = event.target.closest("[data-modal-action]");
    if (!button || !this.pendingCatch) return;
    this.finishCatch(button.dataset.modalAction);
  }

  setView(view) {
    if (view === "map" && this.view === "fishing" && !this.pendingCatch) {
      this.manager.resetAll();
      this.input.mouseDown = false;
      this.input.rightMouseDown = false;
      this.input.buttonReeling = false;
      this.input.buttonLoosen = false;
      this.syncInputControls();
      this.showStatus("Mapa świata");
    }
    this.view = view;
    if (view === "fishing" && !this.currentLocation) {
      this.showStatus("Wybierz łowisko na mapie");
    }
    if (view === "wiki") {
      const location = getLocation(this.wikiLocationId) ?? this.currentLocation ?? LOCATIONS[0];
      this.wikiLocationId = location.id;
      this.wikiFishName = location.fish.find((fish) => fish.name === this.wikiFishName)?.name ?? location.fish[0]?.name;
    }
    this.renderStatic();
  }

  showStatus(text) {
    this.toastText = text;
    this.toastTimer = 2.4;
    this.elements.subStatus.textContent = text;
  }

  travel(locationId) {
    const location = getLocation(locationId);
    if (!location) return;
    if (!this.player.unlockedLocations.includes(location.id)) return;
    const alreadyThere = this.player.currentLocationId === location.id;
    if (!alreadyThere && this.player.money < location.travelCost) return;
    if (!alreadyThere) {
      this.player.money -= location.travelCost;
      this.player.stats.travels += 1;
      recordQuestProgress(this.player, "unlock_locations", 0);
    }
    this.player.currentLocationId = location.id;
    this.selectedLocation = location;
    this.wikiLocationId = location.id;
    this.wikiFishName = location.fish[0]?.name ?? this.wikiFishName;
    this.manager.resetAll();
    saveState(this.player);
    this.view = "fishing";
    this.showStatus(`${location.country} - ${location.name}`);
    this.renderStatic();
  }

  quickCast() {
    if (!this.currentLocation) return;
    const rod = this.manager.activeRod;
    if (!rod || rod.status !== "idle") return;
    rod.castOrigin = this.rodGeometry().tip;
    rod.beginCast();
    rod.charge = 0.72;
    const target = {
      x: this.canvas.width * (0.48 + Math.random() * 0.28),
      y: this.canvas.height * (0.28 + Math.random() * 0.38),
      inside: true,
    };
    rod.releaseCast(target, this.input.bounds);
    addSkillXp(this.player, "casting", 5);
    this.renderDynamic();
  }

  attemptHook(force) {
    const rod = this.manager.activeRod;
    if (!rod || rod.status !== "bite") return;
    const result = rod.tryHook(force);
    if (result.success) {
      const quality = result.hookQuality ?? 0;
      addSkillXp(this.player, "control", Math.round(6 + quality * 12));
      addSkillXp(this.player, "detection", 3);
      if (quality > 0.68) {
        this.player.stats.goodHooks += 1;
        recordQuestProgress(this.player, "good_hook", 1);
      }
      this.showStatus(`Zacięcie ${Math.round(quality * 100)}%`);
    } else {
      addSkillXp(this.player, "detection", 1);
      this.showStatus("Puste zacięcie");
    }
    saveState(this.player);
    this.renderDynamic();
  }

  buyItem(categoryId, itemId) {
    const category = SHOP_CATEGORIES.find((item) => item.id === categoryId);
    const item = category?.items.find((entry) => entry.id === itemId);
    if (!category || !item) return;
    const owned = this.player.owned[category.ownedKey].includes(item.id);
    if (owned || this.player.level < item.unlockLevel || this.player.money < item.price) return;
    this.player.money -= item.price;
    this.player.owned[category.ownedKey].push(item.id);
    if (category.equippedKey && !this.player.equipped[category.equippedKey]) {
      this.player.equipped[category.equippedKey] = item.id;
    }
    saveState(this.player);
    this.showStatus(`Kupiono: ${item.name}`);
    this.renderStatic();
  }

  equipItem(categoryId, itemId) {
    const category = SHOP_CATEGORIES.find((item) => item.id === categoryId);
    if (!category?.equippedKey) return;
    if (!this.player.owned[category.ownedKey].includes(itemId)) return;
    this.player.equipped[category.equippedKey] = itemId;
    if (categoryId === "backpacks") this.manager.syncSlots();
    saveState(this.player);
    this.showStatus("Zmieniono sprzęt");
    this.renderStatic();
  }

  sellAll() {
    const total = this.player.inventory.reduce((sum, fish) => sum + fish.value, 0);
    if (!total) return;
    this.player.money += total;
    this.player.totalEarned += total;
    recordQuestProgress(this.player, "earn_fish", total);
    addXp(this.player, total * 0.12);
    this.player.inventory = [];
    saveState(this.player);
    this.showStatus(`Sprzedano ryby za ${formatMoney(total)}`);
    this.renderStatic();
  }

  claimQuest(questId) {
    if (claimQuest(this.player, questId)) {
      saveState(this.player);
      this.showStatus("Nagroda odebrana");
      this.renderStatic();
    }
  }

  resetSave() {
    if (!window.confirm("Reset save?")) return;
    this.player = resetState();
    this.manager = new MultiRodManager(() => this.systemState());
    this.selectedLocation = LOCATIONS[0];
    this.wikiLocationId = LOCATIONS[0].id;
    this.wikiFishName = LOCATIONS[0].fish[0]?.name;
    this.view = "map";
    this.showStatus("Save zresetowany");
    this.renderStatic();
  }

  handleRodEvent(event) {
    if (!event) return;
    if (event.type === "caught") {
      this.pendingCatch = event.fish;
      this.pendingCatchRod = event.rod;
      this.showCatchModal(event.fish);
    }
    if (event.type === "lineBreak") {
      this.player.stats.brokenLines += 1;
      addSkillXp(this.player, "control", 2);
      saveState(this.player);
      this.showStatus("Żyłka pękła");
    }
    if (event.type === "escaped") {
      this.player.stats.escaped += 1;
      addSkillXp(this.player, "detection", 1);
      saveState(this.player);
      this.showStatus("Ryba uciekła");
    }
    if (event.type === "biteExpired") {
      addSkillXp(this.player, "detection", 1);
      this.showStatus("Branie minęło");
    }
  }

  showCatchModal(fish) {
    const capacityOk = getInventoryWeight(this.player) + fish.weight <= getKeepnetCapacity(this.player);
    this.elements.modalCard.innerHTML = renderCatchModal(fish, capacityOk);
    this.elements.modalBackdrop.classList.remove("hidden");
  }

  finishCatch(mode) {
    const fish = this.pendingCatch;
    if (!fish) return;
    const capacityOk = getInventoryWeight(this.player) + fish.weight <= getKeepnetCapacity(this.player);
    if (mode === "keep" && !capacityOk) return;

    this.player.stats.catches += 1;
    recordQuestProgress(this.player, "catch_count", 1);
    if (fish.rarity === "medal") recordQuestProgress(this.player, "medal_count", 1);
    if (fish.rarity === "unique") recordQuestProgress(this.player, "unique_count", 1);
    if (fish.rarity === "legendary") recordQuestProgress(this.player, "legendary_count", 1);
    registerCatchInJournal(this.player, fish);

    const xpScale = mode === "release" ? 0.11 : 0.2;
    addXp(this.player, Math.max(8, fish.value * xpScale));
    addSkillXp(this.player, "luck", fish.rarity === "common" ? 2 : fish.rarity === "medal" ? 8 : 18);
    addSkillXp(this.player, "control", Math.round(3 + fish.weight * 0.25));
    addSkillXp(this.player, "detection", 2);

    if (mode === "keep") {
      this.player.inventory.unshift(fish);
      this.showStatus(`${fish.speciesName} w keepnecie`);
    }
    if (mode === "sell") {
      this.player.money += fish.value;
      this.player.totalEarned += fish.value;
      recordQuestProgress(this.player, "earn_fish", fish.value);
      this.showStatus(`Sprzedano za ${formatMoney(fish.value)}`);
    }
    if (mode === "release") {
      addSkillXp(this.player, "luck", 3);
      this.showStatus("Ryba wypuszczona");
    }

    ensureProgressUnlocks(this.player);
    saveState(this.player);
    this.pendingCatchRod?.cancelToIdle("Caught");
    this.pendingCatch = null;
    this.pendingCatchRod = null;
    this.elements.modalBackdrop.classList.add("hidden");
    this.renderStatic();
  }

  renderStatic() {
    const state = this.viewState();
    renderHeader(this.player, this.elements);
    setActiveNav(this.view);
    this.manager.syncSlots();

    if (this.view === "map") this.elements.sidePanel.innerHTML = renderMapPanel(this.selectedLocation, state);
    if (this.view === "fishing") this.elements.sidePanel.innerHTML = renderFishingPanel(state, this.weather);
    if (this.view === "shop") this.elements.sidePanel.innerHTML = renderShopPanel(this.player, this.shopCategory);
    if (this.view === "inventory") this.elements.sidePanel.innerHTML = renderInventoryPanel(this.player);
    if (this.view === "journal") this.elements.sidePanel.innerHTML = renderJournalPanel(this.player);
    if (this.view === "wiki") this.elements.sidePanel.innerHTML = renderWikiPanel(this.player, this.wikiLocationId, this.wikiFishName);

    this.renderDynamic();
  }

  renderDynamic() {
    const state = this.viewState();
    renderHeader(this.player, this.elements);
    this.elements.multiRodPanel.innerHTML = renderRodDock(this.manager);
    this.elements.actionBar.innerHTML = renderActionBar(state, this.manager);
    this.elements.hudOverlay.innerHTML = renderHud(state, this.weather, this.manager);
    if (this.toastTimer <= 0) {
      this.elements.subStatus.textContent =
        this.view === "fishing" && this.currentLocation
          ? `${this.currentLocation.country} - ${this.currentLocation.name}`
          : this.view === "map"
            ? "Mapa świata"
            : this.view === "wiki"
              ? "Wiki ryb"
            : this.view[0].toUpperCase() + this.view.slice(1);
    }
  }

  renderHudOnly() {
    this.elements.hudOverlay.innerHTML = renderHud(this.viewState(), this.weather, this.manager);
  }

  loop(time) {
    const dt = Math.min(0.05, (time - this.lastTime) / 1000 || 0.016);
    this.lastTime = time;

    if (this.currentLocation && this.view === "fishing") {
      this.weather.update(dt, this.currentLocation);
      const events = this.manager.update(dt, this.input, this.weather);
      events.forEach((event) => this.handleRodEvent(event));
    }

    this.toastTimer = Math.max(0, this.toastTimer - dt);
    this.sideRefresh += dt;
    if (this.sideRefresh > 0.35) {
      this.renderDynamic();
      this.sideRefresh = 0;
    } else if (this.manager.activeRod?.status === "fighting") {
      this.renderHudOnly();
    }

    this.draw();
    requestAnimationFrame((nextTime) => this.loop(nextTime));
  }

  mapBounds() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const padding = 26;
    const maxW = Math.max(320, w - padding * 2);
    const maxH = Math.max(180, h - padding * 2);
    const mapW = Math.min(maxW, maxH * 2);
    const mapH = mapW / 2;
    return {
      x: (w - mapW) / 2,
      y: (h - mapH) / 2,
      width: mapW,
      height: mapH,
    };
  }

  mapPoint(world, rect = this.mapBounds()) {
    return {
      x: rect.x + world.x * rect.width,
      y: rect.y + world.y * rect.height,
    };
  }

  hitTestLocation(x, y) {
    const rect = this.mapBounds();
    return (
      LOCATIONS.find((location) => {
        const { x: px, y: py } = this.mapPoint(location.world, rect);
        return Math.hypot(x - px, y - py) < 22;
      }) ?? null
    );
  }

  draw() {
    if (this.view === "fishing" && this.currentLocation) this.drawFishing();
    else this.drawMap();
  }

  drawMap() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const rect = this.mapBounds();
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, "#12334a");
    gradient.addColorStop(0.48, "#1f6473");
    gradient.addColorStop(1, "#142a34");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.fillStyle = "rgba(5,18,24,0.18)";
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.strokeStyle = "rgba(218,244,241,0.18)";
    ctx.lineWidth = 1;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.restore();

    this.drawMapGrid(ctx, rect);
    this.drawContinents(ctx, rect);
    this.drawMapRoutes(ctx, rect);
    this.drawLocationPins(ctx, rect);
  }

  drawMapGrid(ctx, rect) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 12; i += 1) {
      const x = rect.x + (i / 12) * rect.width;
      ctx.beginPath();
      ctx.moveTo(x, rect.y);
      ctx.lineTo(x, rect.y + rect.height);
      ctx.stroke();
    }
    for (let i = 0; i <= 6; i += 1) {
      const y = rect.y + (i / 6) * rect.height;
      ctx.beginPath();
      ctx.moveTo(rect.x, y);
      ctx.lineTo(rect.x + rect.width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawBlob(ctx, rect, points, fill, stroke = "rgba(255,255,255,0.08)") {
    ctx.beginPath();
    points.forEach((point, index) => {
      const x = rect.x + point[0] * rect.width;
      const y = rect.y + point[1] * rect.height;
      if (index === 0) ctx.moveTo(x, y);
      else {
        const previous = points[index - 1];
        const cx = rect.x + ((previous[0] + point[0]) / 2) * rect.width;
        const cy = rect.y + ((previous[1] + point[1]) / 2) * rect.height;
        ctx.quadraticCurveTo(rect.x + previous[0] * rect.width, rect.y + previous[1] * rect.height, cx, cy);
      }
    });
    const last = points[points.length - 1];
    const first = points[0];
    ctx.quadraticCurveTo(
      rect.x + last[0] * rect.width,
      rect.y + last[1] * rect.height,
      rect.x + first[0] * rect.width,
      rect.y + first[1] * rect.height,
    );
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  drawContinents(ctx, rect) {
    MAP_LANDMASSES.forEach((land) => {
      this.drawBlob(ctx, rect, land.points, land.fill, "rgba(244,248,232,0.22)");
    });
    this.drawMapBorderLines(ctx, rect);
  }

  drawMapBorderLines(ctx, rect) {
    ctx.save();
    ctx.strokeStyle = "rgba(8,16,21,0.24)";
    ctx.lineWidth = Math.max(1, rect.width / 900);
    MAP_BORDER_LINES.forEach((line) => {
      ctx.beginPath();
      line.forEach((point, index) => {
        const x = rect.x + point[0] * rect.width;
        const y = rect.y + point[1] * rect.height;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
    ctx.restore();
  }

  drawMapRoutes(ctx, rect) {
    const current = this.currentLocation ?? LOCATIONS[0];
    const from = this.mapPoint(current.world, rect);
    ctx.save();
    ctx.setLineDash([8, 10]);
    ctx.strokeStyle = "rgba(245,184,75,0.28)";
    ctx.lineWidth = 1.4;
    for (const location of LOCATIONS) {
      if (location.id === current.id) continue;
      const to = this.mapPoint(location.world, rect);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo((from.x + to.x) / 2, Math.min(from.y, to.y) - rect.height * 0.12, to.x, to.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawLocationPins(ctx, rect) {
    const labelOffsets = {
      iceland_ice_river: { x: -26, y: -34 },
      norway_ocean_coast: { x: 26, y: -34 },
      france_carp_lake: { x: -32, y: 8 },
      poland_small_lake: { x: 28, y: 6 },
      egypt_nile_river: { x: 10, y: 8 },
    };
    ctx.save();
    ctx.font = "700 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (const location of LOCATIONS) {
      const { x, y } = this.mapPoint(location.world, rect);
      const unlocked = this.player.unlockedLocations.includes(location.id);
      const selected = this.selectedLocation?.id === location.id;
      const hover = this.mapHover?.id === location.id;
      const radius = selected || hover ? 13 : 10;

      ctx.beginPath();
      ctx.arc(x, y, radius + 8, 0, TAU);
      ctx.fillStyle = unlocked ? "rgba(84,209,157,0.16)" : "rgba(255,255,255,0.08)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      ctx.fillStyle = unlocked ? (location.travelCost ? "#f5b84b" : "#54d19d") : "#6e7676";
      ctx.fill();
      ctx.strokeStyle = selected ? "#ffffff" : "rgba(8,16,21,0.8)";
      ctx.lineWidth = selected ? 3 : 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, y + radius - 1);
      ctx.lineTo(x - 5, y + radius + 13);
      ctx.lineTo(x + 5, y + radius + 13);
      ctx.closePath();
      ctx.fillStyle = unlocked ? "#dff8ef" : "#9ca5a4";
      ctx.fill();

      const label = `${location.country}`;
      const offset = labelOffsets[location.id] ?? { x: 0, y: 0 };
      const labelX = x + offset.x;
      const labelY = y + radius + 17 + offset.y;
      const textWidth = ctx.measureText(label).width + 12;
      if (offset.x || offset.y) {
        ctx.strokeStyle = "rgba(225,242,235,0.28)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + radius + 9);
        ctx.lineTo(labelX, labelY + 10);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(6,14,16,0.76)";
      ctx.fillRect(labelX - textWidth / 2, labelY, textWidth, 20);
      ctx.fillStyle = unlocked ? "#eef8f5" : "#b9c2c0";
      ctx.fillText(label, labelX, labelY + 4);
    }
    ctx.restore();
  }

  drawFishing() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const location = this.currentLocation;
    const light = this.weather.light;
    const skyTop = mixColor("#0a1522", "#78b7d8", light);
    const skyBottom = mixColor("#1a2630", "#f2b36d", clamp(light * 0.7 + 0.18, 0, 1));
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.42);
    sky.addColorStop(0, skyTop);
    sky.addColorStop(1, skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    this.drawCelestial(ctx, w, h, light);
    this.drawWeather(ctx, w, h);

    const horizon = h * 0.32;
    const waterColor = location.palette.water;
    const deep = mixColor(waterColor, "#071216", 0.58 + location.depth * 0.2);
    const water = ctx.createLinearGradient(0, horizon, 0, h);
    water.addColorStop(0, mixColor(waterColor, "#c3f2e7", 0.18 * light));
    water.addColorStop(0.55, waterColor);
    water.addColorStop(1, deep);
    ctx.fillStyle = water;
    ctx.fillRect(0, horizon, w, h - horizon);

    this.drawWaterBands(ctx, w, h, horizon, location);
    this.drawShore(ctx, w, h, location);
    this.drawFishShadows(ctx, w, h);
    this.drawRodsAndLures(ctx, w, h);
    this.drawBiteFlash(ctx, w, h);
  }

  drawCelestial(ctx, w, h, light) {
    ctx.save();
    const isDay = light > 0.42;
    ctx.globalAlpha = isDay ? light : 0.85;
    ctx.fillStyle = isDay ? "#ffe49b" : "#d9f0ff";
    ctx.beginPath();
    ctx.arc(w * 0.82, h * 0.13, isDay ? 24 : 18, 0, TAU);
    ctx.fill();
    if (!isDay) {
      ctx.fillStyle = "rgba(10,21,34,0.9)";
      ctx.beginPath();
      ctx.arc(w * 0.83, h * 0.12, 18, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      for (let i = 0; i < 38; i += 1) {
        const x = ((i * 73) % 1000) / 1000 * w;
        const y = (0.03 + (((i * 31) % 220) / 1000)) * h;
        ctx.fillRect(x, y, 1.6, 1.6);
      }
    }
    ctx.restore();
  }

  drawWeather(ctx, w, h) {
    const weather = this.weather.weather.id;
    ctx.save();
    if (weather === "cloudy" || weather === "rain" || weather === "wind") {
      ctx.fillStyle = "rgba(234,244,240,0.32)";
      for (let i = 0; i < 5; i += 1) {
        const x = ((performance.now() * 0.008 + i * 230) % (w + 260)) - 160;
        const y = h * (0.07 + i * 0.035);
        ctx.beginPath();
        ctx.ellipse(x, y, 80, 22, 0, 0, TAU);
        ctx.ellipse(x + 52, y + 4, 64, 20, 0, 0, TAU);
        ctx.ellipse(x - 48, y + 8, 52, 18, 0, 0, TAU);
        ctx.fill();
      }
    }
    if (weather === "rain") {
      ctx.strokeStyle = "rgba(195,226,240,0.38)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 90; i += 1) {
        const x = ((i * 47 + performance.now() * 0.18) % (w + 40)) - 20;
        const y = ((i * 71 + performance.now() * 0.32) % h);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 7, y + 19);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawWaterBands(ctx, w, h, horizon, location) {
    ctx.save();
    const time = performance.now() / 1000;
    for (let i = 0; i < 8; i += 1) {
      const y = horizon + (i / 8) * (h - horizon);
      ctx.strokeStyle = `rgba(255,255,255,${0.06 + i * 0.006})`;
      ctx.lineWidth = 1 + i * 0.25;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 28) {
        const wave = Math.sin(x * 0.018 + time * (1.2 + location.current) + i) * (4 + i * 0.6);
        if (x === 0) ctx.moveTo(x, y + wave);
        else ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(245,184,75,0.28)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      const x = ((time * 35 * (0.3 + location.current) + i * 240) % (w + 80)) - 40;
      const y = horizon + h * (0.15 + i * 0.085);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 36, y);
      ctx.lineTo(x + 25, y - 7);
      ctx.moveTo(x + 36, y);
      ctx.lineTo(x + 25, y + 7);
      ctx.stroke();
    }
    ctx.restore();
  }

  rodGeometry() {
    const h = this.canvas.height;
    return {
      base: { x: 116, y: h * 0.79 },
      mid: { x: 156, y: h * 0.56 },
      tip: { x: 232, y: h * 0.43 },
    };
  }

  drawShore(ctx, w, h, location) {
    ctx.save();
    ctx.fillStyle = location.palette.shore;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.88);
    ctx.quadraticCurveTo(w * 0.24, h * 0.8, w * 0.46, h * 0.91);
    ctx.quadraticCurveTo(w * 0.65, h * 1.02, w, h * 0.9);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#3f2f24";
    ctx.fillRect(w * 0.06, h * 0.76, w * 0.17, 12);
    for (let i = 0; i < 5; i += 1) {
      ctx.fillRect(w * 0.075 + i * w * 0.032, h * 0.76, 8, h * 0.16);
    }

    const rod = this.rodGeometry();
    ctx.strokeStyle = "#352216";
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(rod.base.x - 10, rod.base.y + 18);
    ctx.lineTo(rod.base.x + 14, rod.base.y - 20);
    ctx.stroke();

    ctx.strokeStyle = "#1d1510";
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(rod.base.x, rod.base.y);
    ctx.quadraticCurveTo(rod.mid.x, rod.mid.y, rod.tip.x, rod.tip.y);
    ctx.stroke();

    ctx.strokeStyle = "rgba(238,248,245,0.5)";
    ctx.lineWidth = 1.5;
    [0.35, 0.62, 0.84].forEach((t) => {
      const x = (1 - t) * (1 - t) * rod.base.x + 2 * (1 - t) * t * rod.mid.x + t * t * rod.tip.x;
      const y = (1 - t) * (1 - t) * rod.base.y + 2 * (1 - t) * t * rod.mid.y + t * t * rod.tip.y;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, TAU);
      ctx.stroke();
    });
    ctx.restore();
  }

  drawFishShadows(ctx, w, h) {
    const active = this.manager.activeRod;
    const fishes = active?.fishAI?.fishes ?? [];
    const detection = this.player.skills.detection.level;
    ctx.save();
    fishes
      .filter((fish) => fish.state !== "hooked")
      .slice(0, 18 + detection)
      .forEach((fish) => {
        const alpha = clamp((0.08 + detection * 0.012) * (1 - fish.depth * 0.45), 0.04, 0.32);
        this.drawFishShape(ctx, fish.x, fish.y, clamp(8 + Math.sqrt(fish.species.maxWeight) * 2.2, 8, 34), fish.species.visualHue, alpha, fish.legendary);
      });
    ctx.restore();
  }

  drawFishShape(ctx, x, y, size, hue, alpha, legendary = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(performance.now() / 900 + x) * 0.22);
    ctx.fillStyle = legendary ? `rgba(255,207,92,${alpha + 0.12})` : `hsla(${hue}, 55%, 58%, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 1.45, size * 0.54, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-size * 1.35, 0);
    ctx.lineTo(-size * 2.05, -size * 0.55);
    ctx.lineTo(-size * 1.86, size * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawRodsAndLures(ctx, w, h) {
    ctx.save();
    const geometry = this.rodGeometry();
    this.manager.rods.forEach((rod, index) => {
      const active = index === this.manager.activeIndex;
      const origin = { ...geometry.tip };
      rod.castOrigin = origin;
      ctx.globalAlpha = active ? 1 : 0.45;
      const showLure = rod.lurePhysics && !["fighting", "caught", "lost"].includes(rod.status);
      if (showLure) {
        const lure = rod.lurePhysics;
        ctx.strokeStyle = active ? "rgba(236,250,244,0.88)" : "rgba(236,250,244,0.38)";
        ctx.lineWidth = active ? 1.8 : 1.2;
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(lure.x, lure.y);
        ctx.stroke();

        ctx.strokeStyle = active ? "rgba(89,242,222,0.42)" : "rgba(89,242,222,0.18)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        lure.trail.forEach((point, trailIndex) => {
          if (trailIndex === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();

        ctx.fillStyle = this.lureColor(lure.lure.color);
        ctx.beginPath();
        ctx.arc(lure.x, lure.y, active ? 6 : 4.5, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "#eef8f5";
        ctx.stroke();
      }

      if (rod.status === "charging" && active) {
        const power = rod.charge;
        ctx.fillStyle = "rgba(7,17,20,0.78)";
        ctx.fillRect(geometry.base.x - 44, geometry.base.y - 78, 112, 14);
        ctx.fillStyle = "#54d19d";
        ctx.fillRect(geometry.base.x - 44, geometry.base.y - 78, 112 * power, 14);
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.strokeRect(geometry.base.x - 44, geometry.base.y - 78, 112, 14);
      }

      if (rod.status === "fighting" && active && rod.tensionSystem) {
        const fishPosition = rod.tensionSystem.getFishPosition();
        const end = {
          x: clamp(fishPosition.x, 42, w - 42),
          y: clamp(fishPosition.y, h * 0.35, h * 0.84),
        };
        const directionLength = Math.hypot(end.x - origin.x, end.y - origin.y) || 1;
        const direction = {
          x: (end.x - origin.x) / directionLength,
          y: (end.y - origin.y) / directionLength,
        };
        ctx.strokeStyle = "rgba(255,207,92,0.76)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        this.drawFishShape(ctx, end.x, end.y, clamp(18 + Math.sqrt(rod.catchProfile.weight) * 4, 18, 62), rod.catchProfile.visualHue ?? 43, 0.84, rod.catchProfile.rarity === "legendary");
        ctx.strokeStyle = "rgba(255,103,103,0.74)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x + direction.x * 48, end.y + direction.y * 48);
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  lureColor(color) {
    return {
      natural: "#d1aa70",
      silver: "#dce7ef",
      gold: "#f5c75b",
      red: "#ff6767",
      green: "#54d19d",
      black: "#161b1d",
      blue: "#62b7ff",
      chartreuse: "#caff6a",
    }[color] ?? "#eef8f5";
  }

  drawBiteFlash(ctx, w, h) {
    const biting = this.manager.rods.find((rod) => rod.status === "bite");
    if (!biting?.lurePhysics) return;
    const pulse = 0.5 + Math.sin(performance.now() / 90) * 0.5;
    ctx.save();
    ctx.globalAlpha = 0.35 + pulse * 0.28;
    ctx.strokeStyle = "#f5b84b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(biting.lurePhysics.x, biting.lurePhysics.y, 22 + pulse * 16, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = "rgba(7,17,20,0.82)";
    ctx.fillRect(w * 0.5 - 62, h * 0.16, 124, 38);
    ctx.fillStyle = "#ffdf91";
    ctx.font = "800 22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("BITE", w * 0.5, h * 0.16 + 19);
    ctx.restore();
  }
}

new WorldFishing2D();
