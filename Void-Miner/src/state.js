(() => {
const { SAVE_KEY, RESOURCES, UPGRADE_DEFS, POTION_DEFS, PRESTIGE_DEFS, PICKAXE_DEFS } = window.VoidMinerData;

function makeDefaultState() {
  const resources = {};
  for (const id of Object.keys(RESOURCES)) {
    resources[id] = 0;
  }

  const upgrades = {};
  for (const upgrade of UPGRADE_DEFS) {
    upgrades[upgrade.id] = 0;
  }

  const potions = {};
  for (const potion of POTION_DEFS) {
    potions[potion.id] = {
      owned: 0,
      remaining: 0,
      cooldown: 0
    };
  }

  const prestige = {};
  for (const upgrade of PRESTIGE_DEFS) {
    prestige[upgrade.id] = 0;
  }

  return {
    version: 2,
    createdAt: Date.now(),
    lastSaved: Date.now(),
    totalPlayTime: 0,
    money: 0,
    depth: 1,
    deepestDepth: 1,
    blocksMined: 0,
    currentBlock: null,
    defeatedBossDepths: [],
    resources,
    upgrades,
    player: {
      hp: 100,
      shield: 0
    },
    refinery: {
      queue: [],
      surge: 0
    },
    forge: {
      queue: []
    },
    pickaxes: {
      owned: ["starter"],
      equipped: "starter"
    },
    potions,
    relics: {
      owned: [],
      equipped: []
    },
    combat: {
      enemy: null
    },
    events: {
      timer: 55,
      collapse: 0
    },
    rebirth: {
      count: 0,
      voidCores: 0,
      totalVoidCores: 0,
      prestige
    },
    log: []
  };
}

function loadState() {
  const fallback = makeDefaultState();
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw);
    return migrateState(parsed, fallback);
  } catch (error) {
    console.warn("Failed to load save", error);
    return fallback;
  }
}

function saveState(state) {
  state.lastSaved = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

function migrateState(parsed, fallback) {
  const state = deepMerge(fallback, parsed);

  for (const id of Object.keys(RESOURCES)) {
    state.resources[id] = Number(state.resources[id] || 0);
  }

  for (const upgrade of UPGRADE_DEFS) {
    state.upgrades[upgrade.id] = Number(state.upgrades[upgrade.id] || 0);
  }

  for (const potion of POTION_DEFS) {
    state.potions[potion.id] = {
      owned: Number(state.potions[potion.id]?.owned || 0),
      remaining: Number(state.potions[potion.id]?.remaining || 0),
      cooldown: Number(state.potions[potion.id]?.cooldown || 0)
    };
  }

  for (const upgrade of PRESTIGE_DEFS) {
    state.rebirth.prestige[upgrade.id] = Number(state.rebirth.prestige[upgrade.id] || 0);
  }

  const validPickaxes = new Set(PICKAXE_DEFS.map((pickaxe) => pickaxe.id));
  state.money = Number(state.money || 0);
  state.pickaxes.owned = Array.isArray(state.pickaxes.owned) ? state.pickaxes.owned.filter((id) => validPickaxes.has(id)) : [];
  if (!state.pickaxes.owned.includes("starter")) {
    state.pickaxes.owned.unshift("starter");
  }
  state.pickaxes.equipped = validPickaxes.has(state.pickaxes.equipped) ? state.pickaxes.equipped : "starter";
  if (!state.pickaxes.owned.includes(state.pickaxes.equipped)) {
    state.pickaxes.equipped = "starter";
  }

  state.defeatedBossDepths = Array.isArray(state.defeatedBossDepths)
    ? state.defeatedBossDepths.map(Number)
    : [];
  state.relics.owned = Array.isArray(state.relics.owned) ? state.relics.owned : [];
  state.relics.equipped = Array.isArray(state.relics.equipped) ? state.relics.equipped : [];
  state.refinery.queue = Array.isArray(state.refinery.queue) ? state.refinery.queue : [];
  state.forge.queue = Array.isArray(state.forge.queue) ? state.forge.queue : [];
  state.log = Array.isArray(state.log) ? state.log.slice(0, 80) : [];

  return state;
}

function deepMerge(base, patch) {
  if (Array.isArray(base)) {
    return Array.isArray(patch) ? patch : base.slice();
  }

  if (!base || typeof base !== "object") {
    return patch ?? base;
  }

  const result = { ...base };
  if (!patch || typeof patch !== "object") {
    return result;
  }

  for (const [key, value] of Object.entries(patch)) {
    if (key in base) {
      result[key] = deepMerge(base[key], value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

window.VoidMinerState = {
  makeDefaultState,
  loadState,
  saveState,
  clearSave
};
})();
