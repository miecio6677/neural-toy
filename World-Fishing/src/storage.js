import { BACKPACKS, LOCATIONS } from "./data.js";

const SAVE_KEY = "worldFishing2D.save.v1";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function defaultQuests() {
  const day = todayKey();
  return {
    day,
    daily: [
      {
        id: `daily_catches_${day}`,
        title: "Daily: 5 ryb",
        type: "catch_count",
        progress: 0,
        target: 5,
        reward: 180,
        claimed: false,
      },
      {
        id: `daily_value_${day}`,
        title: "Daily: $650 z ryb",
        type: "earn_fish",
        progress: 0,
        target: 650,
        reward: 260,
        claimed: false,
      },
      {
        id: `daily_control_${day}`,
        title: "Daily: 3 celne zacięcia",
        type: "good_hook",
        progress: 0,
        target: 3,
        reward: 220,
        claimed: false,
      },
    ],
    milestones: [
      {
        id: "first_medal",
        title: "Pierwsza medalowa ryba",
        type: "medal_count",
        progress: 0,
        target: 1,
        reward: 700,
        claimed: false,
      },
      {
        id: "first_unique",
        title: "Pierwszy unikat",
        type: "unique_count",
        progress: 0,
        target: 1,
        reward: 1500,
        claimed: false,
      },
      {
        id: "legendary_hunter",
        title: "Legendary hunter",
        type: "legendary_count",
        progress: 0,
        target: 1,
        reward: 3000,
        claimed: false,
      },
      {
        id: "world_tour",
        title: "Odblokuj wszystkie łowiska",
        type: "unlock_locations",
        progress: 1,
        target: LOCATIONS.length,
        reward: 5000,
        claimed: false,
      },
    ],
  };
}

export function createDefaultState() {
  return {
    version: 1,
    money: 500,
    totalEarned: 0,
    xp: 0,
    level: 1,
    currentLocationId: null,
    unlockedLocations: ["poland_small_lake"],
    owned: {
      rods: ["willow"],
      reels: ["starter_reel"],
      lines: ["nylon_3"],
      lures: ["bread", "red_worm", "silver_spinner"],
      backpacks: ["basic"],
      addons: [],
    },
    equipped: {
      rod: "willow",
      reel: "starter_reel",
      line: "nylon_3",
      lure: "silver_spinner",
      backpack: "basic",
    },
    skills: {
      casting: { level: 1, xp: 0 },
      control: { level: 1, xp: 0 },
      luck: { level: 1, xp: 0 },
      detection: { level: 1, xp: 0 },
    },
    inventory: [],
    journal: {
      caught: {},
      medals: [],
      uniques: [],
      legendaries: [],
      bestBySpecies: {},
    },
    quests: defaultQuests(),
    stats: {
      catches: 0,
      goodHooks: 0,
      brokenLines: 0,
      escaped: 0,
      travels: 0,
    },
  };
}

function mergeDefaults(defaultValue, loadedValue) {
  if (Array.isArray(defaultValue)) {
    return Array.isArray(loadedValue) ? loadedValue : clone(defaultValue);
  }
  if (defaultValue && typeof defaultValue === "object") {
    const output = {};
    for (const key of Object.keys(defaultValue)) {
      output[key] = mergeDefaults(defaultValue[key], loadedValue?.[key]);
    }
    for (const key of Object.keys(loadedValue ?? {})) {
      if (!(key in output)) output[key] = loadedValue[key];
    }
    return output;
  }
  return loadedValue ?? defaultValue;
}

function refreshDailyQuests(state) {
  if (!state.quests || state.quests.day !== todayKey()) {
    const milestones = state.quests?.milestones ?? defaultQuests().milestones;
    state.quests = defaultQuests();
    state.quests.milestones = milestones;
  }
}

export function loadState() {
  const defaults = createDefaultState();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    const state = mergeDefaults(defaults, parsed);
    refreshDailyQuests(state);
    ensureProgressUnlocks(state);
    return state;
  } catch (error) {
    console.warn("Save load failed, using defaults", error);
    return defaults;
  }
}

export function saveState(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function resetState() {
  localStorage.removeItem(SAVE_KEY);
  return createDefaultState();
}

export function xpForLevel(level) {
  return Math.round(160 * Math.pow(level, 1.72));
}

export function levelFromXp(xp) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level += 1;
  return level;
}

export function addXp(state, amount) {
  state.xp += Math.max(0, Math.round(amount));
  state.level = levelFromXp(state.xp);
  ensureProgressUnlocks(state);
}

export function skillXpForLevel(level) {
  return Math.round(80 * Math.pow(level, 1.55));
}

export function addSkillXp(state, skill, amount) {
  const entry = state.skills[skill];
  if (!entry) return;
  entry.xp += Math.max(0, Math.round(amount));
  while (entry.xp >= skillXpForLevel(entry.level + 1)) {
    entry.level += 1;
  }
}

export function getKeepnetCapacity(state) {
  const backpack = BACKPACKS.find((item) => item.id === state.equipped.backpack) ?? BACKPACKS[0];
  return backpack.keepnetKg;
}

export function getInventoryWeight(state) {
  return state.inventory.reduce((sum, fish) => sum + fish.weight, 0);
}

export function ensureProgressUnlocks(state) {
  for (const location of LOCATIONS) {
    if (state.level >= location.unlockLevel && !state.unlockedLocations.includes(location.id)) {
      state.unlockedLocations.push(location.id);
    }
  }
  const milestone = state.quests?.milestones?.find((quest) => quest.type === "unlock_locations");
  if (milestone) {
    milestone.progress = Math.max(milestone.progress, state.unlockedLocations.length);
  }
}

export function formatMoney(value) {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export function formatWeight(value) {
  if (value < 1) return `${Math.round(value * 1000)} g`;
  return `${value.toFixed(2)} kg`;
}

export function recordQuestProgress(state, type, amount) {
  const quests = [...(state.quests?.daily ?? []), ...(state.quests?.milestones ?? [])];
  for (const quest of quests) {
    if (quest.type === type && !quest.claimed) {
      quest.progress = Math.min(quest.target, quest.progress + amount);
    }
  }
}

export function claimQuest(state, questId) {
  const quests = [...(state.quests?.daily ?? []), ...(state.quests?.milestones ?? [])];
  const quest = quests.find((item) => item.id === questId);
  if (!quest || quest.claimed || quest.progress < quest.target) return false;
  quest.claimed = true;
  state.money += quest.reward;
  state.totalEarned += quest.reward;
  addXp(state, Math.round(quest.reward * 0.35));
  return true;
}

export function registerCatchInJournal(state, fish) {
  const key = `${fish.locationId}:${fish.speciesName}`;
  const caught = state.journal.caught[key] ?? {
    speciesName: fish.speciesName,
    locationName: fish.locationName,
    count: 0,
    bestWeight: 0,
    bestValue: 0,
  };
  caught.count += 1;
  caught.bestWeight = Math.max(caught.bestWeight, fish.weight);
  caught.bestValue = Math.max(caught.bestValue, fish.value);
  state.journal.caught[key] = caught;

  const bestSpecies = state.journal.bestBySpecies[fish.speciesName] ?? { weight: 0, locationName: fish.locationName };
  if (fish.weight > bestSpecies.weight) {
    state.journal.bestBySpecies[fish.speciesName] = {
      weight: fish.weight,
      locationName: fish.locationName,
      rarity: fish.rarity,
    };
  }

  if (fish.rarity === "medal") {
    state.journal.medals.unshift(fish);
    state.journal.medals = state.journal.medals.slice(0, 40);
  }
  if (fish.rarity === "unique") {
    state.journal.uniques.unshift(fish);
    state.journal.uniques = state.journal.uniques.slice(0, 40);
  }
  if (fish.rarity === "legendary") {
    state.journal.legendaries.unshift(fish);
    state.journal.legendaries = state.journal.legendaries.slice(0, 20);
  }
}
