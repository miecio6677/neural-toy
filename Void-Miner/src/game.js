(() => {
const {
  BIOMES,
  BOSS_DEFS,
  CASTING_RECIPES,
  ENEMY_DEFS,
  EVENT_DEFS,
  PICKAXE_DEFS,
  POTION_DEFS,
  PRESTIGE_DEFS,
  RARITIES,
  REFINERY_RECIPES,
  RELIC_DEFS,
  RESOURCES,
  UPGRADE_DEFS,
  pickaxePartResourceId
} = window.VoidMinerData;
const { clearSave, makeDefaultState, saveState } = window.VoidMinerState;
const { clamp, cloneCost, randomRange, weightedPick } = window.VoidMinerUtils;

const BLOCK_HP_BASE = 18;
const REBIRTH_DEPTH = 180;

class VoidMinerGame extends EventTarget {
  constructor(state) {
    super();
    this.state = state;
    this.manualCooldown = 0;
    this.autosaveTimer = 4;
    this.uiRefreshTimer = 0.25;
    this.droneTimer = 0;
    this.uiDirty = true;
    this.lastOfflineApplied = false;

    if (!this.state.currentBlock) {
      this.state.currentBlock = this.createBlock();
    }

    this.applyStarterKit();
    this.refreshPlayerCaps(true);
    this.applyOfflineProgress();
    this.log("Systems online. The mine is waiting.", "good");
  }

  tick(dt) {
    const state = this.state;
    state.totalPlayTime += dt;
    this.manualCooldown = Math.max(0, this.manualCooldown - dt);
    this.autosaveTimer -= dt;
    this.droneTimer += dt;

    this.tickPotions(dt);
    this.tickRefinery(dt);
    this.tickForge(dt);
    this.tickPlayerRegen(dt);
    this.tickEnemy(dt);
    this.tickAutomation(dt);
    this.tickEvents(dt);

    if (state.events.collapse > 0) {
      state.events.collapse = Math.max(0, state.events.collapse - dt);
    }

    this.uiRefreshTimer -= dt;
    if (this.uiRefreshTimer <= 0) {
      this.uiRefreshTimer = 0.25;
      this.uiDirty = true;
    }

    if (this.autosaveTimer <= 0) {
      this.autosaveTimer = 5;
      saveState(this.state);
    }

    this.dispatchUpdate(false);
  }

  mineManual() {
    const stats = this.getStats();
    this.dealMiningDamage(stats.damage, true);
  }

  descend() {
    if (this.state.combat.enemy?.boss) {
      this.log("The boss is anchoring this depth. Defeat it first.", "warning");
      return;
    }

    const cost = Math.max(2, Math.floor(this.state.depth * 0.08));
    if ((this.state.resources.stone || 0) < cost && this.state.depth > 8) {
      this.log(`Stabilizing the descent needs ${cost} Stone.`, "warning");
      return;
    }

    if (this.state.depth > 8) {
      this.spendResources({ stone: cost });
    }

    this.advanceDepth(1, true);
  }

  getBiome(depth = this.state.depth) {
    let current = BIOMES[0];
    for (const biome of BIOMES) {
      if (depth >= biome.start) {
        current = biome;
      }
    }
    return current;
  }

  getEquippedPickaxe() {
    return PICKAXE_DEFS.find((pickaxe) => pickaxe.id === this.state.pickaxes.equipped) || PICKAXE_DEFS[0];
  }

  getStats() {
    const state = this.state;
    const upgrades = state.upgrades;
    const relicEffects = this.getRelicEffects();
    const potionEffects = this.getActivePotionEffects();
    const prestige = state.rebirth.prestige;
    const pickaxe = this.getEquippedPickaxe();
    const rawStress = this.getRawStress();
    const stressResist = clamp(
      (potionEffects.stressResist || 0) + (relicEffects.stressResist || 0) + (pickaxe.stressResist || 0),
      0,
      0.85
    );
    const stress = rawStress * (1 - stressResist);

    const coreDamage = 1 + prestige.coreDamage * 0.12;
    const damagePotion = potionEffects.damageMult || 1;
    const damage =
      (7 + upgrades.pickDamage * 2.8 + Math.pow(upgrades.pickDamage, 1.23) * 0.85) *
      coreDamage *
      damagePotion *
      pickaxe.damageMult;

    const miningSpeedBase = (1.25 + upgrades.miningSpeed * 0.055) * pickaxe.speedMult;
    const miningSpeed = clamp(
      miningSpeedBase * (potionEffects.miningSpeedMult || 1) * (1 - stress * 0.16),
      0.35,
      5.2
    );

    const critChance = clamp(
      0.05 + upgrades.critChance * 0.012 + (relicEffects.luck || 0) * 0.05 + (pickaxe.critChance || 0),
      0,
      0.72
    );
    const critDamage = 1.75 + upgrades.critDamage * 0.065 + (potionEffects.critDamage || 0) + (pickaxe.critDamage || 0);
    const luck = clamp(
      0.02 + prestige.coreLuck * 0.05 + (potionEffects.luck || 0) + (relicEffects.luck || 0) + (pickaxe.luck || 0),
      0,
      2.2
    );

    const maxHp = 100 + upgrades.maxHp * 18 + Math.floor(Math.pow(upgrades.maxHp, 1.18) * 4);
    const shieldMult = (potionEffects.shieldMult || 1) * (relicEffects.shieldMult || 1);
    const maxShield = Math.floor((upgrades.shield * 13 + Math.pow(upgrades.shield, 1.15) * 3) * shieldMult);
    const shieldRegen = (0.8 + upgrades.shieldRegen * 0.28) * (potionEffects.shieldRegenMult || 1) * (1 - stress * 0.22);
    const hpRegen = (relicEffects.hpRegen || 0) + (state.combat.enemy ? 0 : 0.08);

    const flatDrones = relicEffects.flatDrones || 0;
    const droneCount = upgrades.droneCount + flatDrones;
    const droneYieldMult = (1 + upgrades.droneYield * 0.08) * (relicEffects.droneYieldMult || 1) * (1 + prestige.coreDrones * 0.1);
    const autoDamageMult = (1 + upgrades.autoMining * 0.09) * (relicEffects.autoDamageMult || 1);
    const autoDps = droneCount * damage * 0.06 * autoDamageMult + upgrades.autoMining * damage * 0.012;

    const refinerySpeed =
      (1 + upgrades.refinerySpeed * 0.075) *
      (relicEffects.refinerySpeedMult || 1) *
      (1 + prestige.coreRefinery * 0.08) *
      (state.refinery.surge > 0 ? 1.7 : 1);
    const refineryEfficiency = clamp(upgrades.refineryEfficiency * 0.025 + (relicEffects.refineryEfficiency || 0), 0, 0.82);
    const refineryLevel = 1 + upgrades.refineryLevel;
    const refinerySlots = 1 + upgrades.refinerySlots;
    const forgeSpeed = 0.65 + refinerySpeed * 0.45;
    const forgeSlots = 1 + Math.floor(upgrades.refinerySlots / 2);
    const relicSlots = 3 + prestige.coreRelicSlot;

    return {
      pickaxe,
      damage,
      miningSpeed,
      critChance,
      critDamage,
      luck,
      maxHp,
      maxShield,
      shieldRegen,
      hpRegen,
      droneCount,
      droneYieldMult,
      autoDps,
      refinerySpeed,
      refineryEfficiency,
      refineryLevel,
      refinerySlots,
      forgeSpeed,
      forgeSlots,
      relicSlots,
      stress,
      rawStress,
      enemyDamageTaken: relicEffects.enemyDamageTaken || 1,
      bossBonus: relicEffects.bossBonus || 0,
      critEcho: relicEffects.critEcho || 0,
      cooldownMult: relicEffects.cooldownMult || 1
    };
  }

  refreshPlayerCaps(keepRatio = false) {
    const stats = this.getStats();
    const hpRatio = keepRatio ? this.state.player.hp / Math.max(1, stats.maxHp) : 1;
    const shieldRatio = keepRatio ? this.state.player.shield / Math.max(1, stats.maxShield || 1) : 1;
    this.state.player.hp = clamp(keepRatio ? stats.maxHp * hpRatio : this.state.player.hp, 1, stats.maxHp);
    this.state.player.shield = clamp(keepRatio ? stats.maxShield * shieldRatio : this.state.player.shield, 0, stats.maxShield);
  }

  createBlock() {
    const depth = this.state.depth;
    const biome = this.getBiome(depth);
    const stats = this.getStats();
    const rarity = this.rollRarity(stats.luck);
    const resourceId = this.rollResourceForBiome(biome, rarity);
    const depthHp = BLOCK_HP_BASE + depth * 5.5 + Math.pow(depth, 1.35) * 1.9;
    const collapseMod = this.state.events.collapse > 0 ? 1.35 : 1;
    const hp = Math.ceil(depthHp * RARITIES[rarity].hp * (1 + stats.rawStress * 0.22) * collapseMod);
    const blockName = biome.blockNames[Math.floor(Math.random() * biome.blockNames.length)];

    return {
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      name: blockName,
      resourceId,
      rarity,
      hp,
      maxHp: hp,
      biomeId: biome.id
    };
  }

  rollRarity(luck = 0) {
    const entries = Object.entries(RARITIES).map(([id, rarity], index) => {
      const rarityBoost = Math.pow(1 + luck, index * 0.72);
      const depthBoost = Math.pow(1 + this.state.depth / 260, index * 0.65);
      return {
        value: id,
        weight: rarity.weight * rarityBoost * depthBoost
      };
    });

    return weightedPick(entries);
  }

  rollResourceForBiome(biome, rarity) {
    const rarityIndex = Object.keys(RARITIES).indexOf(rarity);
    const entries = biome.resources.map(([id, weight]) => {
      const resourceRarityIndex = Object.keys(RARITIES).indexOf(RESOURCES[id].rarity);
      const affinity = 1 + Math.max(0, rarityIndex - resourceRarityIndex) * 0.28;
      return { value: id, weight: weight * affinity };
    });

    return weightedPick(entries);
  }

  dealMiningDamage(baseDamage, manual) {
    const stats = this.getStats();
    let damage = baseDamage;
    let crit = false;

    if (Math.random() < stats.critChance) {
      crit = true;
      damage *= stats.critDamage;
      if (stats.critEcho) {
        damage *= 1 + stats.critEcho;
      }
    }

    if (this.state.combat.enemy) {
      this.damageEnemy(damage, crit, manual);
    } else {
      this.damageBlock(damage, crit, manual);
    }
  }

  damageBlock(amount, crit = false, manual = false) {
    const block = this.state.currentBlock;
    block.hp = Math.max(0, block.hp - amount);

    if (manual) {
      this.dispatchEvent(new CustomEvent("block-hit", { detail: { crit } }));
    }

    if (block.hp <= 0) {
      this.breakBlock(crit);
    }

    this.dispatchUpdate(true);
  }

  breakBlock(crit = false) {
    const state = this.state;
    const block = state.currentBlock;
    const stats = this.getStats();
    const rarity = RARITIES[block.rarity];
    const resourceRarityIndex = Object.keys(RARITIES).indexOf(RESOURCES[block.resourceId].rarity);
    const baseAmount = 1 + Math.floor(state.depth / 18) + Math.floor(resourceRarityIndex / 2);
    const luckBonus = Math.random() < stats.luck * 0.28 ? 1 : 0;
    const critBonus = crit ? 1 : 0;
    const amount = Math.max(1, Math.floor(baseAmount * rarity.loot + luckBonus + critBonus));

    this.addResource(block.resourceId, amount);
    state.blocksMined += 1;

    if (block.rarity === "legendary" || block.rarity === "mythic" || block.rarity === "void") {
      this.log(`Broke a ${rarity.name} ${block.name}: +${amount} ${RESOURCES[block.resourceId].name}.`, "good");
    }

    if (Math.random() < 0.18 + stats.luck * 0.04) {
      this.addBonusChipLoot(block.rarity);
    }

    if (state.blocksMined % 2 === 0) {
      this.advanceDepth(1, false);
    } else {
      state.currentBlock = this.createBlock();
    }
  }

  addBonusChipLoot(rarity) {
    const block = this.state.currentBlock;
    const bonus = rarity === "void" || rarity === "mythic" ? 3 : rarity === "legendary" ? 2 : 1;
    this.addResource(block.resourceId, bonus);
  }

  advanceDepth(amount, forceNewBlock) {
    const state = this.state;
    const nextDepth = state.depth + amount;
    const boss = this.getBossAtDepth(nextDepth);

    state.depth = nextDepth;
    state.deepestDepth = Math.max(state.deepestDepth, state.depth);

    if (boss && !state.defeatedBossDepths.includes(boss.depth)) {
      this.spawnBoss(boss);
    }

    if (forceNewBlock || !state.combat.enemy) {
      state.currentBlock = this.createBlock();
    }

    const biome = this.getBiome();
    if (state.depth === biome.start) {
      this.log(`Entered ${biome.name}. The pressure profile has changed.`, "warning");
    }
  }

  getBossAtDepth(depth = this.state.depth) {
    const exact = BOSS_DEFS.find((boss) => boss.depth === depth);
    if (exact) {
      return exact;
    }
    if (depth > 210 && depth % 25 === 0) {
      return BOSS_DEFS[BOSS_DEFS.length - 1];
    }
    return null;
  }

  spawnBoss(template) {
    const depth = this.state.depth;
    const scaling = template.depth ? Math.max(1, depth / template.depth) : Math.max(1, depth / 210);
    const hp = Math.ceil((260 + depth * 24 + Math.pow(depth, 1.28) * 4) * template.hp * 0.18 * scaling);
    const damage = Math.ceil((5 + depth * 0.12) * template.damage * scaling);
    this.state.combat.enemy = {
      id: `boss-${depth}`,
      name: template.name || "Void Incarnation",
      hp,
      maxHp: hp,
      damage,
      attackTimer: 2.6,
      boss: true,
      depth,
      uniqueDrop: template.uniqueDrop || "singularityFragment",
      relicChance: template.relicChance || 0.62,
      resourceDrop: template.resourceDrop || { darkMatter: 12, singularityFragment: 8 }
    };
    this.log(`${this.state.combat.enemy.name} blocks depth ${depth}.`, "danger");
  }

  spawnEnemy() {
    if (this.state.combat.enemy) {
      return;
    }

    const pool = ENEMY_DEFS.filter((enemy) => this.state.depth >= enemy.minDepth);
    if (!pool.length) {
      return;
    }

    const template = pool[Math.floor(Math.random() * pool.length)];
    const depth = this.state.depth;
    const hp = Math.ceil((75 + Math.pow(depth, 1.38) * 4.2) * template.hp);
    const damage = Math.ceil((4 + depth * 0.22) * template.damage);

    this.state.combat.enemy = {
      id: template.id,
      name: template.name,
      hp,
      maxHp: hp,
      damage,
      attackTimer: randomRange(2.5, 4),
      boss: false,
      reward: template.reward
    };

    this.log(`${template.name} emerged from the dark.`, "danger");
  }

  damageEnemy(amount, crit = false, manual = false) {
    const enemy = this.state.combat.enemy;
    if (!enemy) {
      return;
    }

    enemy.hp = Math.max(0, enemy.hp - amount);

    if (manual) {
      this.dispatchEvent(new CustomEvent("block-hit", { detail: { crit } }));
    }

    if (enemy.hp <= 0) {
      this.defeatEnemy(enemy);
    }

    this.dispatchUpdate(true);
  }

  defeatEnemy(enemy) {
    this.state.combat.enemy = null;

    if (enemy.boss) {
      this.state.defeatedBossDepths.push(enemy.depth);
      this.addResource(enemy.uniqueDrop, 1);
      for (const [id, amount] of Object.entries(enemy.resourceDrop)) {
        this.addResource(id, amount + this.getStats().bossBonus);
      }

      if (Math.random() < enemy.relicChance + this.getStats().luck * 0.08) {
        this.grantRelic();
      }

      this.log(`${enemy.name} defeated. Unique drop secured.`, "good");
      this.advanceDepth(1, true);
    } else {
      for (const [id, amount] of Object.entries(enemy.reward || {})) {
        this.addResource(id, amount);
      }
      this.log(`${enemy.name} defeated. Salvage recovered.`, "good");
    }
  }

  tickEnemy(dt) {
    const enemy = this.state.combat.enemy;
    if (!enemy) {
      return;
    }

    enemy.attackTimer -= dt * (1 + this.getStats().stress * 0.2);
    if (enemy.attackTimer <= 0) {
      enemy.attackTimer = enemy.boss ? randomRange(2.2, 3.3) : randomRange(2.8, 4.4);
      this.takeDamage(enemy.damage * this.getStats().enemyDamageTaken);
    }
  }

  takeDamage(amount) {
    const state = this.state;
    const shieldDamage = Math.min(state.player.shield, amount);
    state.player.shield -= shieldDamage;
    state.player.hp -= amount - shieldDamage;

    this.dispatchEvent(new CustomEvent("shake"));

    if (state.player.hp <= 0) {
      state.player.hp = this.getStats().maxHp * 0.55;
      state.player.shield = 0;
      const lostDepth = Math.min(5, Math.max(1, Math.floor(state.depth * 0.03)));
      state.depth = Math.max(1, state.depth - lostDepth);
      state.combat.enemy = null;
      state.currentBlock = this.createBlock();
      this.log(`Suit failure. Emergency recall pulled you back ${lostDepth} depth.`, "danger");
    }
  }

  tickPlayerRegen(dt) {
    const stats = this.getStats();
    const state = this.state;
    state.player.shield = clamp(state.player.shield + stats.shieldRegen * dt, 0, stats.maxShield);
    state.player.hp = clamp(state.player.hp + stats.hpRegen * dt, 1, stats.maxHp);
  }

  tickAutomation(dt) {
    const stats = this.getStats();
    if (stats.autoDps > 0) {
      this.dealMiningDamage(stats.autoDps * dt, false);
    }

    const interval = 8;
    if (this.droneTimer >= interval) {
      const trips = Math.floor(this.droneTimer / interval);
      this.droneTimer -= trips * interval;
      this.collectDroneYield(trips);
    }
  }

  collectDroneYield(trips = 1) {
    const stats = this.getStats();
    if (stats.droneCount <= 0) {
      return;
    }

    const biome = this.getBiome();
    const total = Math.max(1, Math.floor(stats.droneCount * stats.droneYieldMult * trips));
    const found = {};

    for (let i = 0; i < total; i += 1) {
      const resource = this.rollResourceForBiome(biome, this.rollRarity(stats.luck * 0.45));
      found[resource] = (found[resource] || 0) + 1;
    }

    for (const [id, amount] of Object.entries(found)) {
      this.addResource(id, amount);
    }
  }

  tickRefinery(dt) {
    const state = this.state;
    const stats = this.getStats();

    if (state.refinery.surge > 0) {
      state.refinery.surge = Math.max(0, state.refinery.surge - dt);
    }

    for (const job of state.refinery.queue) {
      job.progress += dt * stats.refinerySpeed;
    }

    const completed = state.refinery.queue.filter((job) => job.progress >= job.time);
    state.refinery.queue = state.refinery.queue.filter((job) => job.progress < job.time);

    for (const job of completed) {
      const recipe = REFINERY_RECIPES.find((item) => item.id === job.recipeId);
      if (!recipe) {
        continue;
      }

      for (const [id, amount] of Object.entries(recipe.output)) {
        const bonus = Math.random() < stats.refineryEfficiency ? amount : 0;
        this.addResource(id, amount + bonus);
      }
      this.log(`${recipe.name} completed.`, "good");
    }
  }

  canStartRecipe(recipe) {
    const stats = this.getStats();
    return (
      recipe.level <= stats.refineryLevel &&
      this.state.refinery.queue.length < stats.refinerySlots &&
      this.hasResources(recipe.input)
    );
  }

  startRecipe(recipeId) {
    const recipe = REFINERY_RECIPES.find((item) => item.id === recipeId);
    if (!recipe) {
      return;
    }

    if (!this.canStartRecipe(recipe)) {
      this.log("The refinery cannot start that recipe yet.", "warning");
      return;
    }

    this.spendResources(recipe.input);
    this.state.refinery.queue.push({
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      recipeId,
      progress: 0,
      time: recipe.time
    });
    this.log(`${recipe.name} added to the queue.`, "good");
    this.dispatchUpdate(true);
  }

  tickForge(dt) {
    const state = this.state;
    const stats = this.getStats();

    for (const job of state.forge.queue) {
      job.progress += dt * stats.forgeSpeed;
    }

    const completed = state.forge.queue.filter((job) => job.progress >= job.time);
    state.forge.queue = state.forge.queue.filter((job) => job.progress < job.time);

    for (const job of completed) {
      const recipe = CASTING_RECIPES.find((item) => item.id === job.recipeId);
      if (!recipe) {
        continue;
      }

      for (const [id, amount] of Object.entries(recipe.output)) {
        this.addResource(id, amount);
      }
      this.log(`${recipe.name} completed.`, "good");
    }
  }

  canStartCasting(recipe) {
    const stats = this.getStats();
    return (
      recipe.level <= stats.refineryLevel &&
      this.state.forge.queue.length < stats.forgeSlots &&
      this.hasResources(recipe.input)
    );
  }

  startCasting(recipeId) {
    const recipe = CASTING_RECIPES.find((item) => item.id === recipeId);
    if (!recipe) {
      return;
    }

    if (!this.canStartCasting(recipe)) {
      this.log("The forge cannot use that mold yet.", "warning");
      return;
    }

    this.spendResources(recipe.input);
    this.state.forge.queue.push({
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      recipeId,
      progress: 0,
      time: recipe.time
    });
    this.log(`${recipe.name} poured into the ${recipe.moldName}.`, "good");
    this.dispatchUpdate(true);
  }

  tickPotions(dt) {
    const stats = this.getStats();
    for (const potionState of Object.values(this.state.potions)) {
      potionState.remaining = Math.max(0, potionState.remaining - dt);
      potionState.cooldown = Math.max(0, potionState.cooldown - dt * stats.cooldownMult);
    }
  }

  getCostValue(cost) {
    return Object.entries(cost).reduce((total, [id, amount]) => total + (RESOURCES[id]?.sellValue || 1) * amount, 0);
  }

  getPotionPrice(potion) {
    return Math.ceil(this.getCostValue(potion.recipe) * 2.25 + potion.duration * 0.4);
  }

  buyPotion(potionId) {
    const potion = POTION_DEFS.find((item) => item.id === potionId);
    if (!potion) {
      return;
    }

    const price = this.getPotionPrice(potion);
    if (this.state.money < price) {
      this.log("Not enough Credits for that potion.", "warning");
      return;
    }

    this.state.money -= price;
    this.state.potions[potionId].owned += 1;
    this.log(`${potion.name} purchased.`, "good");
    this.dispatchUpdate(true);
  }

  craftPotion(potionId) {
    this.buyPotion(potionId);
  }

  usePotion(potionId) {
    const potion = POTION_DEFS.find((item) => item.id === potionId);
    const potionState = this.state.potions[potionId];
    if (!potion || !potionState || potionState.owned <= 0 || potionState.cooldown > 0) {
      return;
    }

    potionState.owned -= 1;
    potionState.remaining = potion.duration;
    potionState.cooldown = potion.cooldown;
    this.refreshPlayerCaps(true);
    this.log(`${potion.name} active.`, "good");
    this.dispatchUpdate(true);
  }

  getActivePotionEffects() {
    const effects = {};
    for (const potion of POTION_DEFS) {
      if ((this.state.potions[potion.id]?.remaining || 0) <= 0) {
        continue;
      }
      for (const [key, value] of Object.entries(potion.effect)) {
        if (key.endsWith("Mult")) {
          effects[key] = (effects[key] || 1) * value;
        } else {
          effects[key] = (effects[key] || 0) + value;
        }
      }
    }
    return effects;
  }

  grantRelic(specificId = null) {
    const owned = new Set(this.state.relics.owned);
    const available = RELIC_DEFS.filter((relic) => !owned.has(relic.id));
    const relic =
      (specificId && RELIC_DEFS.find((item) => item.id === specificId)) ||
      available[Math.floor(Math.random() * available.length)];

    if (!relic) {
      this.addResource("voidShard", 3);
      this.log("A duplicate relic dissolved into Void Shards.", "good");
      return;
    }

    this.state.relics.owned.push(relic.id);
    this.log(`Relic found: ${relic.name}.`, "good");
  }

  toggleRelic(relicId) {
    const equipped = this.state.relics.equipped;
    const stats = this.getStats();

    if (!this.state.relics.owned.includes(relicId)) {
      return;
    }

    if (equipped.includes(relicId)) {
      this.state.relics.equipped = equipped.filter((id) => id !== relicId);
      this.refreshPlayerCaps(true);
      this.dispatchUpdate(true);
      return;
    }

    if (equipped.length >= stats.relicSlots) {
      this.log("No open relic slot.", "warning");
      return;
    }

    equipped.push(relicId);
    this.refreshPlayerCaps(true);
    this.dispatchUpdate(true);
  }

  getRelicEffects() {
    const effects = {};
    for (const id of this.state.relics.equipped) {
      const relic = RELIC_DEFS.find((item) => item.id === id);
      if (!relic) {
        continue;
      }
      for (const [key, value] of Object.entries(relic.effects)) {
        if (key.endsWith("Mult")) {
          effects[key] = (effects[key] || 1) * value;
        } else {
          effects[key] = (effects[key] || 0) + value;
        }
      }
    }
    return effects;
  }

  tickEvents(dt) {
    const state = this.state;
    state.events.timer -= dt * (1 + this.getStats().rawStress * 0.18);

    if (state.events.timer > 0) {
      return;
    }

    state.events.timer = randomRange(42, 92);
    this.triggerRandomEvent();
  }

  triggerRandomEvent() {
    const pool = EVENT_DEFS.filter((event) => this.state.depth >= event.minDepth);
    const event = weightedPick(pool.map((item) => ({ value: item, weight: item.weight })));

    if (event.id === "enemy") {
      this.spawnEnemy();
      return;
    }

    if (event.id === "collapse") {
      const damage = 8 + this.state.depth * 0.26;
      this.state.events.collapse = 35;
      this.takeDamage(damage);
      this.log("Tunnel collapse. Blocks are tougher for a short time.", "danger");
      return;
    }

    if (event.id === "bonusLoot") {
      const biome = this.getBiome();
      const found = {};
      const rolls = 5 + Math.floor(this.state.depth / 45);
      for (let i = 0; i < rolls; i += 1) {
        const id = this.rollResourceForBiome(biome, this.rollRarity(this.getStats().luck));
        found[id] = (found[id] || 0) + 2;
      }
      for (const [id, amount] of Object.entries(found)) {
        this.addResource(id, amount);
      }
      this.log("An exposed seam spilled bonus resources.", "good");
      return;
    }

    if (event.id === "refinerySurge") {
      this.state.refinery.surge = 55;
      this.log("Thermal surge: refinery speed increased.", "good");
      return;
    }

    if (event.id === "droneCache") {
      this.collectDroneYield(3);
      this.log("Drones mapped a hidden cache.", "good");
      return;
    }

    if (event.id === "relicSignal") {
      if (Math.random() < 0.38 + this.getStats().luck * 0.06) {
        this.grantRelic();
      } else {
        this.addResource("voidShard", 2);
        this.log("A relic signal faded, leaving Void Shards behind.", "warning");
      }
    }
  }

  getRawStress() {
    const biome = this.getBiome();
    const depthStress = clamp((this.state.depth - 55) / 210, 0, 0.92);
    const bossStress = this.state.combat.enemy?.boss ? 0.08 : 0;
    return clamp(depthStress + biome.stress + bossStress, 0, 1);
  }

  getUpgradeCost(upgrade) {
    const level = this.state.upgrades[upgrade.id] || 0;
    const scaled = {};

    for (const [id, amount] of Object.entries(upgrade.base)) {
      scaled[id] = Math.ceil(amount * Math.pow(upgrade.scale, level));
    }

    for (const milestone of upgrade.milestones || []) {
      if (level >= milestone.level) {
        for (const [id, amount] of Object.entries(milestone.extra)) {
          scaled[id] = (scaled[id] || 0) + Math.ceil(amount * Math.pow(upgrade.scale, level - milestone.level));
        }
      }
    }

    return cloneCost(scaled);
  }

  getUpgradePrice(upgrade) {
    const resourceQuote = this.getUpgradeCost(upgrade);
    return Math.ceil(this.getCostValue(resourceQuote) * 1.65 + 25);
  }

  buyUpgrade(upgradeId) {
    const upgrade = UPGRADE_DEFS.find((item) => item.id === upgradeId);
    if (!upgrade) {
      return;
    }

    const level = this.state.upgrades[upgradeId] || 0;
    if (level >= upgrade.max) {
      return;
    }

    const price = this.getUpgradePrice(upgrade);
    if (this.state.money < price) {
      this.log("Not enough Credits for that upgrade.", "warning");
      return;
    }

    this.state.money -= price;
    this.state.upgrades[upgradeId] = level + 1;
    this.refreshPlayerCaps(true);
    this.log(`${upgrade.name} upgraded to level ${level + 1}.`, "good");
    this.dispatchUpdate(true);
  }

  getPickaxeCost(pickaxe) {
    if (!pickaxe.materialId) {
      return {};
    }

    return {
      [pickaxePartResourceId(pickaxe.materialId, "head")]: 1,
      [pickaxePartResourceId(pickaxe.materialId, "shaft")]: 1,
      [pickaxePartResourceId(pickaxe.materialId, "binding")]: 1
    };
  }

  craftPickaxe(pickaxeId) {
    const pickaxe = PICKAXE_DEFS.find((item) => item.id === pickaxeId);
    if (!pickaxe || pickaxe.id === "starter") {
      return;
    }

    if (this.state.pickaxes.owned.includes(pickaxe.id)) {
      this.equipPickaxe(pickaxe.id);
      return;
    }

    const cost = this.getPickaxeCost(pickaxe);
    if (!this.hasResources(cost)) {
      this.log("Missing cast parts for that pickaxe.", "warning");
      return;
    }

    this.spendResources(cost);
    this.state.pickaxes.owned.push(pickaxe.id);
    this.state.pickaxes.equipped = pickaxe.id;
    this.refreshPlayerCaps(true);
    this.log(`${pickaxe.name} assembled and equipped.`, "good");
    this.dispatchUpdate(true);
  }

  equipPickaxe(pickaxeId) {
    if (!this.state.pickaxes.owned.includes(pickaxeId)) {
      return;
    }

    this.state.pickaxes.equipped = pickaxeId;
    this.refreshPlayerCaps(true);
    this.log(`${this.getEquippedPickaxe().name} equipped.`, "good");
    this.dispatchUpdate(true);
  }

  sellResource(resourceId, amount = 1) {
    const owned = this.state.resources[resourceId] || 0;
    const resource = RESOURCES[resourceId];
    const count = amount === "all" ? owned : Math.min(owned, Math.max(1, Math.floor(Number(amount) || 1)));
    if (!resource || count <= 0) {
      return;
    }

    const value = count * (resource.sellValue || 1);
    this.state.resources[resourceId] -= count;
    this.state.money += value;
    this.log(`Sold ${count} ${resource.name} for ${value} Credits.`, "good");
    this.dispatchUpdate(true);
  }

  getPrestigeCost(def) {
    const level = this.state.rebirth.prestige[def.id] || 0;
    return Math.ceil(def.baseCost * Math.pow(1.65, level));
  }

  buyPrestige(prestigeId) {
    const def = PRESTIGE_DEFS.find((item) => item.id === prestigeId);
    if (!def) {
      return;
    }

    const level = this.state.rebirth.prestige[prestigeId] || 0;
    if (level >= def.max) {
      return;
    }

    const cost = this.getPrestigeCost(def);
    if (this.state.rebirth.voidCores < cost) {
      this.log("Not enough Void Cores.", "warning");
      return;
    }

    this.state.rebirth.voidCores -= cost;
    this.state.rebirth.prestige[prestigeId] = level + 1;
    this.refreshPlayerCaps(true);
    this.log(`${def.name} permanently upgraded.`, "good");
    this.dispatchUpdate(true);
  }

  getRebirthReward() {
    if (this.state.depth < REBIRTH_DEPTH) {
      return 0;
    }

    const depthCores = Math.floor((this.state.depth - 120) / 28);
    const bossCores = this.state.defeatedBossDepths.filter((depth) => depth >= 100).length;
    const relicCores = Math.floor(this.state.relics.owned.length / 3);
    const firstSilence = this.state.defeatedBossDepths.includes(180) ? 2 : 0;
    return Math.max(1, depthCores + bossCores + relicCores + firstSilence);
  }

  rebirth() {
    const reward = this.getRebirthReward();
    if (reward <= 0) {
      this.log("The chamber needs depth 180 before it can open.", "warning");
      return;
    }

    const prestige = { ...this.state.rebirth.prestige };
    const voidCores = this.state.rebirth.voidCores + reward;
    const totalVoidCores = this.state.rebirth.totalVoidCores + reward;
    const count = this.state.rebirth.count + 1;
    const newState = makeDefaultState();

    newState.rebirth = {
      count,
      voidCores,
      totalVoidCores,
      prestige
    };

    this.state = newState;
    this.applyStarterKit();
    this.state.currentBlock = this.createBlock();
    this.refreshPlayerCaps(false);
    this.log(`Rebirth complete. ${reward} Void Cores gained.`, "good");
    saveState(this.state);
    this.dispatchUpdate(true);
  }

  applyStarterKit() {
    const starter = this.state.rebirth.prestige.coreStart || 0;
    if (!starter || this.state.blocksMined > 0 || this.state.totalPlayTime > 4) {
      return;
    }

    this.addResource("stone", starter * 28, false);
    this.addResource("coal", starter * 12, false);
    this.addResource("ironOre", starter * 10, false);
    this.addResource("copperOre", starter * 10, false);
  }

  hasResources(cost) {
    return Object.entries(cost).every(([id, amount]) => (this.state.resources[id] || 0) >= amount);
  }

  spendResources(cost) {
    for (const [id, amount] of Object.entries(cost)) {
      this.state.resources[id] = Math.max(0, (this.state.resources[id] || 0) - amount);
    }
  }

  addResource(id, amount, dirty = true) {
    if (!(id in this.state.resources)) {
      this.state.resources[id] = 0;
    }
    this.state.resources[id] += amount;
    if (dirty) {
      this.uiDirty = true;
    }
  }

  log(message, type = "info") {
    const entry = {
      time: Date.now(),
      message,
      type
    };
    this.state.log.unshift(entry);
    this.state.log = this.state.log.slice(0, 80);
    this.dispatchUpdate(true);
  }

  save() {
    saveState(this.state);
    this.log("Game saved.", "good");
  }

  resetSave() {
    clearSave();
    this.state = makeDefaultState();
    this.state.currentBlock = this.createBlock();
    this.refreshPlayerCaps(false);
    this.log("Save reset. Fresh void, fresh trouble.", "warning");
    this.dispatchUpdate(true);
  }

  applyOfflineProgress() {
    if (this.lastOfflineApplied) {
      return;
    }
    this.lastOfflineApplied = true;

    const elapsed = Math.min(8 * 60 * 60, Math.max(0, (Date.now() - (this.state.lastSaved || Date.now())) / 1000));
    if (elapsed < 30) {
      return;
    }

    const stats = this.getStats();
    const simulatedTrips = Math.floor(elapsed / 8);
    if (stats.droneCount > 0 && simulatedTrips > 0) {
      this.collectDroneYield(Math.min(simulatedTrips, 180));
    }

    let refineryTime = Math.min(elapsed, 60 * 60);
    while (refineryTime > 0 && this.state.refinery.queue.length) {
      const next = this.state.refinery.queue[0];
      const needed = Math.max(0, next.time - next.progress) / Math.max(0.1, stats.refinerySpeed);
      const step = Math.min(refineryTime, needed);
      next.progress += step * stats.refinerySpeed;
      refineryTime -= step;
      if (next.progress >= next.time) {
        const recipe = REFINERY_RECIPES.find((item) => item.id === next.recipeId);
        this.state.refinery.queue.shift();
        if (recipe) {
          for (const [id, amount] of Object.entries(recipe.output)) {
            this.addResource(id, amount, false);
          }
        }
      } else {
        break;
      }
    }

    let forgeTime = Math.min(elapsed, 45 * 60);
    while (forgeTime > 0 && this.state.forge.queue.length) {
      const next = this.state.forge.queue[0];
      const needed = Math.max(0, next.time - next.progress) / Math.max(0.1, stats.forgeSpeed);
      const step = Math.min(forgeTime, needed);
      next.progress += step * stats.forgeSpeed;
      forgeTime -= step;
      if (next.progress >= next.time) {
        const recipe = CASTING_RECIPES.find((item) => item.id === next.recipeId);
        this.state.forge.queue.shift();
        if (recipe) {
          for (const [id, amount] of Object.entries(recipe.output)) {
            this.addResource(id, amount, false);
          }
        }
      } else {
        break;
      }
    }

    this.log(`Offline systems ran for ${Math.floor(elapsed / 60)} minutes.`, "good");
  }

  dispatchUpdate(force = false) {
    if (force) {
      this.uiDirty = true;
    }
    if (!this.uiDirty) {
      return;
    }
    this.dispatchEvent(new CustomEvent("state-changed"));
    this.uiDirty = false;
  }
}

window.VoidMinerGame = {
  VoidMinerGame
};
})();
