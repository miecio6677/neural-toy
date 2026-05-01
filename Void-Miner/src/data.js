(() => {
const SAVE_KEY = "void-miner-save-v1";

const RARITIES = {
  common: {
    name: "Common",
    weight: 800,
    hp: 1,
    loot: 1,
    color: "#8792a6",
    glow: "rgba(135, 146, 166, 0.28)"
  },
  uncommon: {
    name: "Uncommon",
    weight: 220,
    hp: 1.35,
    loot: 1.55,
    color: "#61d68b",
    glow: "rgba(97, 214, 139, 0.34)"
  },
  rare: {
    name: "Rare",
    weight: 80,
    hp: 1.9,
    loot: 2.35,
    color: "#55b7ff",
    glow: "rgba(85, 183, 255, 0.42)"
  },
  epic: {
    name: "Epic",
    weight: 26,
    hp: 2.75,
    loot: 3.8,
    color: "#b783ff",
    glow: "rgba(183, 131, 255, 0.5)"
  },
  legendary: {
    name: "Legendary",
    weight: 7,
    hp: 4.1,
    loot: 6.3,
    color: "#ffd15f",
    glow: "rgba(255, 209, 95, 0.55)"
  },
  mythic: {
    name: "Mythic",
    weight: 2,
    hp: 6.3,
    loot: 10.5,
    color: "#ff6f99",
    glow: "rgba(255, 111, 153, 0.62)"
  },
  void: {
    name: "Void",
    weight: 0.6,
    hp: 9.2,
    loot: 18,
    color: "#d5a6ff",
    glow: "rgba(213, 166, 255, 0.72)"
  }
};

const RESOURCES = {
  stone: { name: "Stone", rarity: "common", color: "#9aa0a8", kind: "raw" },
  coal: { name: "Coal", rarity: "common", color: "#353c45", kind: "raw" },
  ironOre: { name: "Iron Ore", rarity: "common", color: "#b36d54", kind: "raw" },
  copperOre: { name: "Copper Ore", rarity: "common", color: "#cf7a42", kind: "raw" },
  quartz: { name: "Quartz", rarity: "uncommon", color: "#d8f0ff", kind: "raw" },
  nickelOre: { name: "Nickel Ore", rarity: "uncommon", color: "#b7c3a7", kind: "raw" },
  silverOre: { name: "Silver Ore", rarity: "uncommon", color: "#d5dced", kind: "raw" },
  goldOre: { name: "Gold Ore", rarity: "rare", color: "#ffc857", kind: "raw" },
  sapphire: { name: "Sapphire", rarity: "rare", color: "#3b8cff", kind: "raw" },
  ruby: { name: "Ruby", rarity: "rare", color: "#ff4e6a", kind: "raw" },
  titaniumOre: { name: "Titanium Ore", rarity: "epic", color: "#acbdd6", kind: "raw" },
  uraniumOre: { name: "Uranium Ore", rarity: "epic", color: "#9bff61", kind: "raw" },
  obsidianShard: { name: "Obsidian Shard", rarity: "epic", color: "#4d4264", kind: "raw" },
  luminite: { name: "Luminite", rarity: "legendary", color: "#7efcff", kind: "raw" },
  nebulaDust: { name: "Nebula Dust", rarity: "legendary", color: "#e88dff", kind: "raw" },
  voidShard: { name: "Void Shard", rarity: "mythic", color: "#b27cff", kind: "raw" },
  aetherCrystal: { name: "Aether Crystal", rarity: "mythic", color: "#8affd2", kind: "raw" },
  chronoOre: { name: "Chrono Ore", rarity: "mythic", color: "#ffe187", kind: "raw" },
  darkMatter: { name: "Dark Matter", rarity: "void", color: "#201331", kind: "raw" },
  singularityFragment: { name: "Singularity Fragment", rarity: "void", color: "#f5d5ff", kind: "raw" },
  echoPlasm: { name: "Echo Plasm", rarity: "void", color: "#a3ffea", kind: "raw" },
  quantumSalt: { name: "Quantum Salt", rarity: "legendary", color: "#e7fff7", kind: "raw" },

  ironIngot: { name: "Iron Ingot", rarity: "common", color: "#c1846c", kind: "refined" },
  copperIngot: { name: "Copper Ingot", rarity: "common", color: "#f09b61", kind: "refined" },
  copperWire: { name: "Copper Wire", rarity: "common", color: "#f09b61", kind: "refined" },
  glass: { name: "Glass", rarity: "uncommon", color: "#c8f5ff", kind: "refined" },
  steelIngot: { name: "Steel Ingot", rarity: "uncommon", color: "#a7b2c0", kind: "refined" },
  steelPlate: { name: "Steel Plate", rarity: "uncommon", color: "#9facbd", kind: "refined" },
  silverIngot: { name: "Silver Ingot", rarity: "rare", color: "#edf2ff", kind: "refined" },
  silverPlate: { name: "Silver Plate", rarity: "rare", color: "#edf2ff", kind: "refined" },
  goldIngot: { name: "Gold Ingot", rarity: "rare", color: "#ffe08a", kind: "refined" },
  goldCircuit: { name: "Gold Circuit", rarity: "rare", color: "#ffe08a", kind: "refined" },
  titaniumIngot: { name: "Titanium Ingot", rarity: "epic", color: "#d2e0f2", kind: "refined" },
  titaniumBar: { name: "Titanium Bar", rarity: "epic", color: "#d2e0f2", kind: "refined" },
  fuelRod: { name: "Fuel Rod", rarity: "epic", color: "#b9ff77", kind: "refined" },
  obsidianIngot: { name: "Obsidian Ingot", rarity: "epic", color: "#70638a", kind: "refined" },
  obsidianPlate: { name: "Obsidian Plate", rarity: "epic", color: "#70638a", kind: "refined" },
  luminiteLens: { name: "Luminite Lens", rarity: "legendary", color: "#a8ffff", kind: "refined" },
  voidIngot: { name: "Void Ingot", rarity: "mythic", color: "#d0a7ff", kind: "refined" },
  voidAlloy: { name: "Void Alloy", rarity: "mythic", color: "#d0a7ff", kind: "refined" },
  aetherPrism: { name: "Aether Prism", rarity: "mythic", color: "#a2ffdf", kind: "refined" },
  chronoGear: { name: "Chrono Gear", rarity: "mythic", color: "#ffe7a3", kind: "refined" },
  darkMatterCell: { name: "Dark Matter Cell", rarity: "void", color: "#5d3b87", kind: "refined" },
  singularityCore: { name: "Singularity Core", rarity: "void", color: "#ffffff", kind: "boss" },

  sentinelEye: { name: "Sentinel Eye", rarity: "rare", color: "#ff8aa5", kind: "boss" },
  magmaHeart: { name: "Magma Heart", rarity: "epic", color: "#ff7b45", kind: "boss" },
  abyssKey: { name: "Abyss Key", rarity: "legendary", color: "#76b8ff", kind: "boss" },
  riftCrown: { name: "Rift Crown", rarity: "mythic", color: "#e09bff", kind: "boss" },
  voidMandate: { name: "Void Mandate", rarity: "void", color: "#f5d5ff", kind: "boss" }
};

const RARITY_SELL_VALUES = {
  common: 2,
  uncommon: 7,
  rare: 22,
  epic: 70,
  legendary: 210,
  mythic: 650,
  void: 1900
};

const KIND_SELL_MULTIPLIERS = {
  raw: 1,
  refined: 2.8,
  part: 4.4,
  boss: 7.5
};

const PICKAXE_PART_TYPES = [
  { id: "head", name: "Head", moldName: "Head Mold", ingotCost: 4, timeMult: 1.25 },
  { id: "shaft", name: "Shaft", moldName: "Shaft Mold", ingotCost: 2, timeMult: 0.95 },
  { id: "binding", name: "Binding", moldName: "Binding Mold", ingotCost: 1, timeMult: 0.7 }
];

const PICKAXE_MATERIALS = [
  {
    id: "copper",
    name: "Copper",
    ingot: "copperIngot",
    rarity: "common",
    color: "#f09b61",
    level: 1,
    castTime: 9,
    damageMult: 1.22,
    speedMult: 1.06,
    critChance: 0.01,
    luck: 0
  },
  {
    id: "iron",
    name: "Iron",
    ingot: "ironIngot",
    rarity: "common",
    color: "#c1846c",
    level: 1,
    castTime: 11,
    damageMult: 1.52,
    speedMult: 1,
    critChance: 0.015,
    luck: 0
  },
  {
    id: "steel",
    name: "Steel",
    ingot: "steelIngot",
    rarity: "uncommon",
    color: "#a7b2c0",
    level: 2,
    castTime: 16,
    damageMult: 1.95,
    speedMult: 1.04,
    critChance: 0.025,
    luck: 0.02
  },
  {
    id: "silver",
    name: "Silver",
    ingot: "silverIngot",
    rarity: "rare",
    color: "#edf2ff",
    level: 3,
    castTime: 22,
    damageMult: 2.35,
    speedMult: 1.08,
    critChance: 0.03,
    luck: 0.08
  },
  {
    id: "gold",
    name: "Gold",
    ingot: "goldIngot",
    rarity: "rare",
    color: "#ffe08a",
    level: 3,
    castTime: 25,
    damageMult: 2.55,
    speedMult: 1.16,
    critChance: 0.02,
    luck: 0.12
  },
  {
    id: "titanium",
    name: "Titanium",
    ingot: "titaniumIngot",
    rarity: "epic",
    color: "#d2e0f2",
    level: 4,
    castTime: 34,
    damageMult: 3.2,
    speedMult: 1.1,
    critChance: 0.045,
    luck: 0.05
  },
  {
    id: "obsidian",
    name: "Obsidian",
    ingot: "obsidianIngot",
    rarity: "epic",
    color: "#70638a",
    level: 5,
    castTime: 43,
    damageMult: 3.85,
    speedMult: 1.03,
    critChance: 0.065,
    critDamage: 0.25,
    luck: 0.06
  },
  {
    id: "void",
    name: "Void",
    ingot: "voidIngot",
    rarity: "mythic",
    color: "#d0a7ff",
    level: 6,
    castTime: 58,
    damageMult: 4.75,
    speedMult: 1.14,
    critChance: 0.08,
    critDamage: 0.38,
    luck: 0.18,
    stressResist: 0.08
  }
];

function upperFirst(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function pickaxePartResourceId(materialId, partId) {
  return `${materialId}${upperFirst(partId)}`;
}

for (const material of PICKAXE_MATERIALS) {
  for (const part of PICKAXE_PART_TYPES) {
    RESOURCES[pickaxePartResourceId(material.id, part.id)] = {
      name: `${material.name} ${part.name}`,
      rarity: material.rarity,
      color: material.color,
      kind: "part"
    };
  }
}

const CASTING_RECIPES = PICKAXE_MATERIALS.flatMap((material) =>
  PICKAXE_PART_TYPES.map((part) => ({
    id: `${material.id}-${part.id}`,
    name: `Cast ${material.name} ${part.name}`,
    materialId: material.id,
    partId: part.id,
    moldName: part.moldName,
    level: material.level,
    time: Math.ceil(material.castTime * part.timeMult),
    input: { [material.ingot]: part.ingotCost },
    output: { [pickaxePartResourceId(material.id, part.id)]: 1 }
  }))
);

const PICKAXE_DEFS = [
  {
    id: "starter",
    name: "Starter Pickaxe",
    rarity: "common",
    color: "#9aa0a8",
    description: "A battered starter tool. It works, but the forge can do better.",
    damageMult: 1,
    speedMult: 1,
    critChance: 0,
    critDamage: 0,
    luck: 0,
    stressResist: 0
  },
  ...PICKAXE_MATERIALS.map((material) => ({
    id: `${material.id}Pickaxe`,
    materialId: material.id,
    name: `${material.name} Pickaxe`,
    rarity: material.rarity,
    color: material.color,
    description: `${material.name} head, shaft, and binding assembled into a mining pickaxe.`,
    damageMult: material.damageMult,
    speedMult: material.speedMult,
    critChance: material.critChance || 0,
    critDamage: material.critDamage || 0,
    luck: material.luck || 0,
    stressResist: material.stressResist || 0
  }))
];

for (const resource of Object.values(RESOURCES)) {
  const rarityValue = RARITY_SELL_VALUES[resource.rarity] || 1;
  const kindMult = KIND_SELL_MULTIPLIERS[resource.kind] || 1;
  resource.sellValue = Math.max(1, Math.ceil(rarityValue * kindMult));
}

const BIOMES = [
  {
    id: "crust",
    name: "Shallow Crust",
    start: 1,
    color: "#607089",
    glow: "rgba(96, 112, 137, 0.32)",
    stress: 0,
    blockNames: ["Basalt Block", "Slate Wall", "Iron-Flecked Stone"],
    resources: [
      ["stone", 58],
      ["coal", 22],
      ["ironOre", 18],
      ["copperOre", 14],
      ["quartz", 5]
    ]
  },
  {
    id: "crystal",
    name: "Crystal Cavern",
    start: 25,
    color: "#4f8bba",
    glow: "rgba(75, 170, 235, 0.4)",
    stress: 0.05,
    blockNames: ["Crystal Matrix", "Blue Geode", "Prism Shale"],
    resources: [
      ["stone", 18],
      ["quartz", 30],
      ["silverOre", 18],
      ["sapphire", 12],
      ["ruby", 9],
      ["goldOre", 8],
      ["nickelOre", 12]
    ]
  },
  {
    id: "magma",
    name: "Molten Veins",
    start: 50,
    color: "#9e5239",
    glow: "rgba(255, 115, 65, 0.43)",
    stress: 0.11,
    blockNames: ["Magma Plate", "Burning Ore", "Furnace Rock"],
    resources: [
      ["coal", 16],
      ["ironOre", 14],
      ["goldOre", 14],
      ["titaniumOre", 14],
      ["uraniumOre", 11],
      ["obsidianShard", 16],
      ["ruby", 9]
    ]
  },
  {
    id: "abyss",
    name: "Abyssal Ruins",
    start: 75,
    color: "#3c557b",
    glow: "rgba(86, 142, 255, 0.42)",
    stress: 0.18,
    blockNames: ["Sunken Pillar", "Ancient Seal", "Abyssal Masonry"],
    resources: [
      ["silverOre", 15],
      ["titaniumOre", 13],
      ["obsidianShard", 17],
      ["luminite", 12],
      ["nebulaDust", 10],
      ["quantumSalt", 7],
      ["voidShard", 5]
    ]
  },
  {
    id: "rift",
    name: "Neon Rift",
    start: 110,
    color: "#6650a8",
    glow: "rgba(184, 107, 255, 0.48)",
    stress: 0.28,
    blockNames: ["Rift Glass", "Pulse Ore", "Neon Fault"],
    resources: [
      ["luminite", 15],
      ["nebulaDust", 18],
      ["voidShard", 13],
      ["aetherCrystal", 10],
      ["chronoOre", 7],
      ["quantumSalt", 12],
      ["darkMatter", 4]
    ]
  },
  {
    id: "horizon",
    name: "Event Horizon",
    start: 155,
    color: "#3c2453",
    glow: "rgba(213, 122, 255, 0.56)",
    stress: 0.42,
    blockNames: ["Gravity Knot", "Inverted Strata", "Horizon Ore"],
    resources: [
      ["voidShard", 18],
      ["aetherCrystal", 15],
      ["chronoOre", 12],
      ["darkMatter", 11],
      ["singularityFragment", 7],
      ["echoPlasm", 9],
      ["nebulaDust", 10]
    ]
  },
  {
    id: "void",
    name: "Void Core",
    start: 210,
    color: "#17101f",
    glow: "rgba(245, 213, 255, 0.72)",
    stress: 0.58,
    blockNames: ["Nullstone", "Core Membrane", "Silent Matter"],
    resources: [
      ["darkMatter", 17],
      ["singularityFragment", 13],
      ["echoPlasm", 14],
      ["chronoOre", 10],
      ["aetherCrystal", 10],
      ["voidShard", 14],
      ["quantumSalt", 8]
    ]
  }
];

const REFINERY_RECIPES = [
  {
    id: "ironIngot",
    name: "Smelt Iron",
    level: 1,
    time: 12,
    input: { ironOre: 5, coal: 2 },
    output: { ironIngot: 2 }
  },
  {
    id: "copperIngot",
    name: "Smelt Copper",
    level: 1,
    time: 10,
    input: { copperOre: 5, coal: 2 },
    output: { copperIngot: 2 }
  },
  {
    id: "copperWire",
    name: "Draw Copper Wire",
    level: 2,
    time: 10,
    input: { copperIngot: 2, coal: 1 },
    output: { copperWire: 3 }
  },
  {
    id: "glass",
    name: "Fuse Glass",
    level: 2,
    time: 16,
    input: { quartz: 5, coal: 3 },
    output: { glass: 2 }
  },
  {
    id: "steelIngot",
    name: "Forge Steel Ingot",
    level: 2,
    time: 24,
    input: { ironIngot: 3, nickelOre: 3, coal: 4 },
    output: { steelIngot: 2 }
  },
  {
    id: "steelPlate",
    name: "Press Steel Plate",
    level: 2,
    time: 22,
    input: { steelIngot: 2, coal: 2 },
    output: { steelPlate: 1 }
  },
  {
    id: "silverIngot",
    name: "Smelt Silver",
    level: 3,
    time: 26,
    input: { silverOre: 6, coal: 3 },
    output: { silverIngot: 2 }
  },
  {
    id: "silverPlate",
    name: "Polish Silver Plate",
    level: 3,
    time: 28,
    input: { silverIngot: 2, quartz: 2 },
    output: { silverPlate: 2 }
  },
  {
    id: "goldIngot",
    name: "Smelt Gold",
    level: 3,
    time: 32,
    input: { goldOre: 5, coal: 4 },
    output: { goldIngot: 2 }
  },
  {
    id: "goldCircuit",
    name: "Etch Gold Circuit",
    level: 3,
    time: 35,
    input: { goldIngot: 2, copperWire: 4, glass: 1 },
    output: { goldCircuit: 1 }
  },
  {
    id: "titaniumIngot",
    name: "Smelt Titanium",
    level: 4,
    time: 40,
    input: { titaniumOre: 6, coal: 6 },
    output: { titaniumIngot: 2 }
  },
  {
    id: "titaniumBar",
    name: "Cast Titanium Bar",
    level: 4,
    time: 42,
    input: { titaniumIngot: 2, coal: 2 },
    output: { titaniumBar: 2 }
  },
  {
    id: "fuelRod",
    name: "Stabilize Fuel Rod",
    level: 4,
    time: 48,
    input: { uraniumOre: 5, titaniumBar: 1, glass: 2 },
    output: { fuelRod: 1 }
  },
  {
    id: "obsidianIngot",
    name: "Cast Obsidian Ingot",
    level: 5,
    time: 54,
    input: { obsidianShard: 8, steelIngot: 2, coal: 6 },
    output: { obsidianIngot: 1 }
  },
  {
    id: "obsidianPlate",
    name: "Laminate Obsidian",
    level: 5,
    time: 55,
    input: { obsidianIngot: 1, steelPlate: 2 },
    output: { obsidianPlate: 1 }
  },
  {
    id: "luminiteLens",
    name: "Cut Luminite Lens",
    level: 5,
    time: 65,
    input: { luminite: 6, glass: 4, silverPlate: 2 },
    output: { luminiteLens: 1 }
  },
  {
    id: "voidIngot",
    name: "Condense Void Ingot",
    level: 6,
    time: 78,
    input: { voidShard: 7, obsidianIngot: 1, titaniumIngot: 2 },
    output: { voidIngot: 1 }
  },
  {
    id: "voidAlloy",
    name: "Forge Void Alloy",
    level: 6,
    time: 82,
    input: { voidIngot: 1, obsidianPlate: 2, titaniumBar: 2 },
    output: { voidAlloy: 1 }
  },
  {
    id: "aetherPrism",
    name: "Align Aether Prism",
    level: 6,
    time: 92,
    input: { aetherCrystal: 6, luminiteLens: 1, quantumSalt: 4 },
    output: { aetherPrism: 1 }
  },
  {
    id: "chronoGear",
    name: "Machine Chrono Gear",
    level: 7,
    time: 110,
    input: { chronoOre: 6, goldCircuit: 2, titaniumBar: 2 },
    output: { chronoGear: 1 }
  },
  {
    id: "darkMatterCell",
    name: "Contain Dark Matter",
    level: 8,
    time: 140,
    input: { darkMatter: 6, voidAlloy: 2, aetherPrism: 1 },
    output: { darkMatterCell: 1 }
  },
  {
    id: "singularityCore",
    name: "Condense Singularity Core",
    level: 9,
    time: 180,
    input: { singularityFragment: 6, darkMatterCell: 2, chronoGear: 1, echoPlasm: 4 },
    output: { singularityCore: 1 }
  }
];

const UPGRADE_DEFS = [
  {
    id: "pickDamage",
    category: "Mining",
    name: "Resonant Pick",
    description: "Increases manual and automatic mining damage.",
    max: 80,
    base: { stone: 18 },
    scale: 1.18,
    milestones: [
      { level: 8, extra: { ironIngot: 4 } },
      { level: 18, extra: { steelPlate: 3 } },
      { level: 35, extra: { voidAlloy: 1 } }
    ]
  },
  {
    id: "miningSpeed",
    category: "Mining",
    name: "Pulse Actuator",
    description: "Reduces the delay between manual mining hits.",
    max: 45,
    base: { copperOre: 12, stone: 25 },
    scale: 1.2,
    milestones: [
      { level: 10, extra: { copperWire: 5 } },
      { level: 24, extra: { goldCircuit: 2 } }
    ]
  },
  {
    id: "critChance",
    category: "Mining",
    name: "Fracture Optics",
    description: "Raises critical hit chance and critical loot bursts.",
    max: 35,
    base: { quartz: 8, copperOre: 12 },
    scale: 1.22,
    milestones: [
      { level: 7, extra: { glass: 3 } },
      { level: 20, extra: { luminiteLens: 1 } }
    ]
  },
  {
    id: "critDamage",
    category: "Mining",
    name: "Impact Harmonics",
    description: "Critical hits deal more damage.",
    max: 30,
    base: { ironOre: 18, coal: 10 },
    scale: 1.23,
    milestones: [
      { level: 12, extra: { steelPlate: 3 } },
      { level: 22, extra: { obsidianPlate: 1 } }
    ]
  },
  {
    id: "maxHp",
    category: "Player",
    name: "Pressure Suit",
    description: "Increases maximum HP.",
    max: 45,
    base: { ironOre: 12, quartz: 4 },
    scale: 1.2,
    milestones: [
      { level: 10, extra: { steelPlate: 4 } },
      { level: 26, extra: { titaniumBar: 3 } }
    ]
  },
  {
    id: "shield",
    category: "Player",
    name: "Kinetic Shield",
    description: "Adds a regenerating shield buffer.",
    max: 45,
    base: { copperOre: 16, quartz: 4 },
    scale: 1.21,
    milestones: [
      { level: 9, extra: { silverPlate: 4 } },
      { level: 24, extra: { aetherPrism: 1 } }
    ]
  },
  {
    id: "shieldRegen",
    category: "Player",
    name: "Shield Capacitor",
    description: "Regenerates shield faster during deep runs.",
    max: 30,
    base: { silverOre: 10, quartz: 8 },
    scale: 1.24,
    milestones: [
      { level: 8, extra: { silverPlate: 3 } },
      { level: 19, extra: { fuelRod: 1 } }
    ]
  },
  {
    id: "droneCount",
    category: "Automation",
    name: "Drone Bay",
    description: "Adds mining drones that gather resources passively.",
    max: 18,
    base: { ironIngot: 3, copperWire: 4 },
    scale: 1.32,
    milestones: [
      { level: 5, extra: { goldCircuit: 2 } },
      { level: 12, extra: { voidAlloy: 1 } }
    ]
  },
  {
    id: "droneYield",
    category: "Automation",
    name: "Survey Algorithms",
    description: "Drones return more resources per trip.",
    max: 35,
    base: { copperWire: 3, glass: 2 },
    scale: 1.25,
    milestones: [
      { level: 8, extra: { luminiteLens: 1 } },
      { level: 20, extra: { chronoGear: 1 } }
    ]
  },
  {
    id: "autoMining",
    category: "Automation",
    name: "Auto Hammer Rig",
    description: "Drones deal automatic damage to enemies and blocks.",
    max: 35,
    base: { steelPlate: 2, copperWire: 8 },
    scale: 1.26,
    milestones: [
      { level: 9, extra: { fuelRod: 1 } },
      { level: 22, extra: { darkMatterCell: 1 } }
    ]
  },
  {
    id: "refinerySpeed",
    category: "Refinery",
    name: "Thermal Overdrive",
    description: "Increases refinery production speed.",
    max: 35,
    base: { coal: 30, ironIngot: 3 },
    scale: 1.24,
    milestones: [
      { level: 10, extra: { fuelRod: 1 } },
      { level: 23, extra: { chronoGear: 1 } }
    ]
  },
  {
    id: "refineryEfficiency",
    category: "Refinery",
    name: "Material Recovery",
    description: "Adds a chance for bonus refinery output.",
    max: 30,
    base: { quartz: 14, copperWire: 3 },
    scale: 1.26,
    milestones: [
      { level: 10, extra: { goldCircuit: 2 } },
      { level: 20, extra: { aetherPrism: 1 } }
    ]
  },
  {
    id: "refineryLevel",
    category: "Refinery",
    name: "Recipe Matrix",
    description: "Unlocks advanced refinery recipes.",
    max: 9,
    base: { ironIngot: 8, copperWire: 8, quartz: 8 },
    scale: 1.65,
    milestones: [
      { level: 3, extra: { goldCircuit: 2 } },
      { level: 5, extra: { voidAlloy: 1 } },
      { level: 7, extra: { darkMatterCell: 1 } }
    ]
  },
  {
    id: "refinerySlots",
    category: "Refinery",
    name: "Queue Manifold",
    description: "Adds more refinery queue slots.",
    max: 5,
    base: { steelPlate: 4, copperWire: 10 },
    scale: 2,
    milestones: [
      { level: 2, extra: { goldCircuit: 3 } },
      { level: 4, extra: { singularityCore: 1 } }
    ]
  }
];

const POTION_DEFS = [
  {
    id: "haste",
    name: "Haste Tonic",
    description: "Mining speed +35%.",
    duration: 180,
    cooldown: 240,
    recipe: { quartz: 6, copperWire: 2, nebulaDust: 1 },
    effect: { miningSpeedMult: 1.35 }
  },
  {
    id: "fortune",
    name: "Fortune Draught",
    description: "Luck +45% and rarer blocks appear more often.",
    duration: 210,
    cooldown: 300,
    recipe: { goldOre: 4, sapphire: 2, quantumSalt: 1 },
    effect: { luck: 0.45 }
  },
  {
    id: "bulwark",
    name: "Bulwark Serum",
    description: "Shield capacity +60% and shield regen +80%.",
    duration: 240,
    cooldown: 330,
    recipe: { silverPlate: 2, obsidianShard: 4, aetherCrystal: 1 },
    effect: { shieldMult: 1.6, shieldRegenMult: 1.8 }
  },
  {
    id: "fury",
    name: "Void Fury",
    description: "Damage +55% and crit damage +40%.",
    duration: 150,
    cooldown: 300,
    recipe: { ruby: 3, voidShard: 2, fuelRod: 1 },
    effect: { damageMult: 1.55, critDamage: 0.4 }
  },
  {
    id: "stability",
    name: "Stability Elixir",
    description: "Stress penalties reduced by 45%.",
    duration: 260,
    cooldown: 360,
    recipe: { luminite: 2, glass: 3, echoPlasm: 1 },
    effect: { stressResist: 0.45 }
  }
];

const RELIC_DEFS = [
  {
    id: "echoPick",
    name: "Echo Pick",
    rarity: "rare",
    description: "Every critical hit echoes for 35% extra damage.",
    effectText: "Critical echo damage",
    effects: { critEcho: 0.35 }
  },
  {
    id: "glassHeart",
    name: "Glass Heart",
    rarity: "epic",
    description: "Shield capacity +25%, but enemy attacks are 8% stronger.",
    effectText: "More shield, harsher hits",
    effects: { shieldMult: 1.25, enemyDamageTaken: 1.08 }
  },
  {
    id: "droneCrown",
    name: "Drone Crown",
    rarity: "legendary",
    description: "Adds one temporary drone and boosts drone yield by 20%.",
    effectText: "Drone swarm boost",
    effects: { flatDrones: 1, droneYieldMult: 1.2 }
  },
  {
    id: "voidCompass",
    name: "Void Compass",
    rarity: "mythic",
    description: "Luck +18% and boss drops +1 raw rare material.",
    effectText: "Luck and boss loot",
    effects: { luck: 0.18, bossBonus: 1 }
  },
  {
    id: "chronoCrucible",
    name: "Chrono Crucible",
    rarity: "mythic",
    description: "Refinery speed +22% and potion cooldowns tick faster.",
    effectText: "Faster production",
    effects: { refinerySpeedMult: 1.22, cooldownMult: 1.18 }
  },
  {
    id: "singularityHalo",
    name: "Singularity Halo",
    rarity: "void",
    description: "Auto mining damage +40% and stress penalty reduced by 18%.",
    effectText: "Auto rig ascension",
    effects: { autoDamageMult: 1.4, stressResist: 0.18 }
  },
  {
    id: "abyssLedger",
    name: "Abyss Ledger",
    rarity: "legendary",
    description: "Refinery bonus output chance +12%.",
    effectText: "More refined output",
    effects: { refineryEfficiency: 0.12 }
  },
  {
    id: "menderSigil",
    name: "Mender Sigil",
    rarity: "rare",
    description: "Regenerates HP slowly while no boss is alive.",
    effectText: "HP recovery",
    effects: { hpRegen: 0.35 }
  }
];

const ENEMY_DEFS = [
  {
    id: "caveCrawler",
    name: "Cave Crawler",
    minDepth: 8,
    hp: 0.7,
    damage: 0.75,
    reward: { stone: 8, coal: 4 }
  },
  {
    id: "oreWraith",
    name: "Ore Wraith",
    minDepth: 25,
    hp: 1,
    damage: 1,
    reward: { silverOre: 3, quartz: 5 }
  },
  {
    id: "magmaSentinel",
    name: "Magma Sentinel",
    minDepth: 50,
    hp: 1.25,
    damage: 1.15,
    reward: { obsidianShard: 3, uraniumOre: 2 }
  },
  {
    id: "riftHunter",
    name: "Rift Hunter",
    minDepth: 100,
    hp: 1.55,
    damage: 1.35,
    reward: { voidShard: 2, nebulaDust: 5 }
  },
  {
    id: "nullKnight",
    name: "Null Knight",
    minDepth: 150,
    hp: 2,
    damage: 1.65,
    reward: { darkMatter: 2, echoPlasm: 3 }
  }
];

const BOSS_DEFS = [
  {
    depth: 25,
    name: "Crystal Sentinel",
    hp: 9,
    damage: 1.5,
    uniqueDrop: "sentinelEye",
    relicChance: 0.22,
    resourceDrop: { sapphire: 8, ruby: 5, silverOre: 16 }
  },
  {
    depth: 50,
    name: "Magma Colossus",
    hp: 14,
    damage: 2,
    uniqueDrop: "magmaHeart",
    relicChance: 0.28,
    resourceDrop: { obsidianShard: 12, uraniumOre: 8, titaniumOre: 14 }
  },
  {
    depth: 75,
    name: "Drowned Archivist",
    hp: 20,
    damage: 2.55,
    uniqueDrop: "abyssKey",
    relicChance: 0.34,
    resourceDrop: { luminite: 8, nebulaDust: 12, quantumSalt: 6 }
  },
  {
    depth: 100,
    name: "Rift Monarch",
    hp: 28,
    damage: 3.15,
    uniqueDrop: "riftCrown",
    relicChance: 0.42,
    resourceDrop: { voidShard: 10, aetherCrystal: 8, chronoOre: 5 }
  },
  {
    depth: 125,
    name: "Chrono Tyrant",
    hp: 38,
    damage: 3.8,
    uniqueDrop: "chronoGear",
    relicChance: 0.48,
    resourceDrop: { chronoOre: 10, quantumSalt: 9, aetherCrystal: 8 }
  },
  {
    depth: 150,
    name: "Horizon Eater",
    hp: 52,
    damage: 4.6,
    uniqueDrop: "voidMandate",
    relicChance: 0.56,
    resourceDrop: { darkMatter: 8, singularityFragment: 5, echoPlasm: 9 }
  },
  {
    depth: 180,
    name: "The First Silence",
    hp: 76,
    damage: 5.7,
    uniqueDrop: "singularityFragment",
    relicChance: 0.68,
    resourceDrop: { darkMatter: 12, singularityFragment: 9, echoPlasm: 12 }
  },
  {
    depth: 210,
    name: "Void Regent",
    hp: 105,
    damage: 7.2,
    uniqueDrop: "singularityCore",
    relicChance: 0.8,
    resourceDrop: { darkMatter: 18, singularityFragment: 14, echoPlasm: 18 }
  }
];

const EVENT_DEFS = [
  {
    id: "enemy",
    name: "Hostile Contact",
    weight: 26,
    minDepth: 8
  },
  {
    id: "collapse",
    name: "Tunnel Collapse",
    weight: 18,
    minDepth: 15
  },
  {
    id: "bonusLoot",
    name: "Exposed Seam",
    weight: 25,
    minDepth: 1
  },
  {
    id: "refinerySurge",
    name: "Thermal Surge",
    weight: 14,
    minDepth: 35
  },
  {
    id: "droneCache",
    name: "Drone Cache",
    weight: 12,
    minDepth: 45
  },
  {
    id: "relicSignal",
    name: "Relic Signal",
    weight: 5,
    minDepth: 70
  }
];

const PRESTIGE_DEFS = [
  {
    id: "coreDamage",
    name: "Core-Forged Pick",
    description: "Permanent damage +12% per level.",
    max: 20,
    baseCost: 1
  },
  {
    id: "coreLuck",
    name: "Void Cartography",
    description: "Permanent luck +5% per level.",
    max: 16,
    baseCost: 1
  },
  {
    id: "coreRefinery",
    name: "Timeless Refinery",
    description: "Permanent refinery speed +8% per level.",
    max: 15,
    baseCost: 2
  },
  {
    id: "coreDrones",
    name: "Autonomous Swarm",
    description: "Permanent drone yield +10% per level.",
    max: 15,
    baseCost: 2
  },
  {
    id: "coreRelicSlot",
    name: "Relic Harness",
    description: "Adds one relic slot every level.",
    max: 3,
    baseCost: 6
  },
  {
    id: "coreStart",
    name: "Recovered Kit",
    description: "Start each run with basic ore and coal.",
    max: 10,
    baseCost: 1
  }
];

window.VoidMinerData = {
  SAVE_KEY,
  RARITIES,
  RESOURCES,
  BIOMES,
  CASTING_RECIPES,
  REFINERY_RECIPES,
  UPGRADE_DEFS,
  POTION_DEFS,
  PICKAXE_DEFS,
  PICKAXE_MATERIALS,
  PICKAXE_PART_TYPES,
  pickaxePartResourceId,
  RELIC_DEFS,
  ENEMY_DEFS,
  BOSS_DEFS,
  EVENT_DEFS,
  PRESTIGE_DEFS
};
})();
