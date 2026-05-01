(() => {
const {
  CASTING_RECIPES,
  PICKAXE_DEFS,
  POTION_DEFS,
  PRESTIGE_DEFS,
  RARITIES,
  REFINERY_RECIPES,
  RELIC_DEFS,
  RESOURCES,
  UPGRADE_DEFS
} = window.VoidMinerData;
const { formatNumber, formatTime, titleCase } = window.VoidMinerUtils;

class VoidMinerUI {
  constructor(game) {
    this.game = game;
    this.elements = collectElements();
    this.activeTab = "upgrades";
    this.lastCanvasBiome = "";
    this.particles = [];
    this.bindEvents();
    this.initCanvas();
    this.render();
  }

  bindEvents() {
    const { elements, game } = this;

    elements.mineButton.addEventListener("click", () => game.mineManual());
    elements.blockVisual.addEventListener("click", () => game.mineManual());
    elements.descendButton.addEventListener("click", () => game.descend());
    elements.saveButton.addEventListener("click", () => game.save());
    elements.resetButton.addEventListener("click", () => {
      if (confirm("Reset your Void Miner save?")) {
        game.resetSave();
      }
    });
    elements.rebirthButton.addEventListener("click", () => game.rebirth());

    document.addEventListener("keydown", (event) => {
      if (event.code === "Space" && !isTypingTarget(event.target)) {
        event.preventDefault();
        game.mineManual();
      }
    });

    elements.tabbar.addEventListener("click", (event) => {
      const button = event.target.closest("[data-tab]");
      if (!button) {
        return;
      }
      this.activeTab = button.dataset.tab;
      this.renderTabs();
      this.renderActivePanel();
    });

    elements.systemsPanel.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) {
        return;
      }

      const action = button.dataset.action;
      const id = button.dataset.id;
      if (action === "buy-upgrade") {
        game.buyUpgrade(id);
      } else if (action === "start-recipe") {
        game.startRecipe(id);
      } else if (action === "start-casting") {
        game.startCasting(id);
      } else if (action === "craft-pickaxe") {
        game.craftPickaxe(id);
      } else if (action === "equip-pickaxe") {
        game.equipPickaxe(id);
      } else if (action === "sell-resource") {
        game.sellResource(id, button.dataset.amount || 1);
      } else if (action === "craft-potion") {
        game.craftPotion(id);
      } else if (action === "buy-potion") {
        game.buyPotion(id);
      } else if (action === "use-potion") {
        game.usePotion(id);
      } else if (action === "toggle-relic") {
        game.toggleRelic(id);
      } else if (action === "buy-prestige") {
        game.buyPrestige(id);
      }
    });

    game.addEventListener("state-changed", () => this.render());
    game.addEventListener("block-hit", () => {
      elements.blockVisual.classList.remove("hit");
      void elements.blockVisual.offsetWidth;
      elements.blockVisual.classList.add("hit");
    });
    game.addEventListener("shake", () => {
      document.body.classList.remove("shake");
      void document.body.offsetWidth;
      document.body.classList.add("shake");
    });
  }

  initCanvas() {
    const canvas = this.elements.canvas;
    const ctx = canvas.getContext("2d");
    this.canvas = { canvas, ctx, width: 0, height: 0 };
    window.addEventListener("resize", () => this.resizeCanvas());
    this.resizeCanvas();
  }

  resizeCanvas() {
    const { canvas } = this.canvas;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    this.canvas.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.canvas.width = width;
    this.canvas.height = height;
    this.seedParticles();
  }

  seedParticles() {
    const count = Math.max(70, Math.floor((this.canvas.width * this.canvas.height) / 18000));
    this.particles = Array.from({ length: count }, () => ({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      r: Math.random() * 1.8 + 0.35,
      s: Math.random() * 16 + 8,
      a: Math.random() * 0.42 + 0.08
    }));
  }

  drawBackground(dt) {
    const { ctx, width, height } = this.canvas;
    const biome = this.game.getBiome();
    const stats = this.game.getStats();

    if (this.lastCanvasBiome !== biome.id) {
      this.lastCanvasBiome = biome.id;
      this.seedParticles();
    }

    ctx.clearRect(0, 0, width, height);
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#070a10");
    gradient.addColorStop(0.48, biome.color);
    gradient.addColorStop(1, "#05070c");
    ctx.globalAlpha = 0.3 + stats.stress * 0.18;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = "screen";
    for (const particle of this.particles) {
      particle.y += (particle.s + stats.stress * 24) * dt;
      particle.x += Math.sin((particle.y + particle.r) * 0.018) * dt * 10;
      if (particle.y > height + 8) {
        particle.y = -8;
        particle.x = Math.random() * width;
      }

      ctx.globalAlpha = particle.a + stats.stress * 0.08;
      ctx.fillStyle = biome.glow.includes("rgba") ? biome.glow.replace(/[\d.]+\)$/u, "0.95)") : "#ffffff";
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }

  render() {
    const state = this.game.state;
    const stats = this.game.getStats();
    const biome = this.game.getBiome();
    const block = state.currentBlock;
    const blockRarity = RARITIES[block.rarity];
    const root = document.documentElement;

    root.style.setProperty("--stress", stats.stress.toFixed(3));
    root.style.setProperty("--block-color", blockRarity.color);
    root.style.setProperty("--block-glow", blockRarity.glow);
    root.style.setProperty("--crack-opacity", (1 - block.hp / block.maxHp).toFixed(3));

    this.elements.biomeLabel.textContent = biome.name;
    this.elements.depthValue.textContent = formatNumber(state.depth);
    this.elements.hpValue.textContent = `${formatNumber(Math.ceil(state.player.hp))}/${formatNumber(stats.maxHp)}`;
    this.elements.shieldValue.textContent = `${formatNumber(Math.floor(state.player.shield))}/${formatNumber(stats.maxShield)}`;
    this.elements.stressValue.textContent = `${Math.round(stats.stress * 100)}%`;
    this.elements.moneyValue.textContent = formatMoney(state.money);
    this.elements.voidCoreValue.textContent = formatNumber(state.rebirth.voidCores);

    this.elements.blockSubtitle.textContent = `${blockRarity.name} ${RESOURCES[block.resourceId].name} deposit`;
    this.elements.rarityBadge.textContent = blockRarity.name;
    this.elements.rarityBadge.style.borderColor = blockRarity.color;
    this.elements.rarityBadge.style.color = blockRarity.color;
    this.elements.blockName.textContent = block.name;
    this.elements.blockHpText.textContent = `${formatNumber(Math.ceil(block.hp))} / ${formatNumber(block.maxHp)} HP`;
    this.elements.blockHpBar.style.width = `${Math.max(0, (block.hp / block.maxHp) * 100)}%`;

    this.elements.damageStat.textContent = formatNumber(stats.damage);
    this.elements.speedStat.textContent = `${stats.miningSpeed.toFixed(2)}/s`;
    this.elements.critStat.textContent = `${Math.round(stats.critChance * 100)}%`;
    this.elements.luckStat.textContent = `${Math.round(stats.luck * 100)}%`;
    this.elements.droneStat.textContent = formatNumber(stats.droneCount);
    this.elements.autoStat.textContent = formatNumber(stats.autoDps);

    this.renderEnemy();
    this.renderBuffs();
    this.renderResources();
    this.renderTabs();
    this.renderActivePanel();
  }

  renderEnemy() {
    const enemy = this.game.state.combat.enemy;
    if (!enemy) {
      this.elements.combatCard.classList.add("hidden");
      return;
    }

    this.elements.combatCard.classList.remove("hidden");
    this.elements.enemyName.textContent = enemy.name;
    this.elements.enemySubtitle.textContent = enemy.boss ? `Boss at depth ${enemy.depth}` : "Hostile tunnel contact";
    this.elements.enemyKind.textContent = enemy.boss ? "Boss" : "Enemy";
    this.elements.enemyHpBar.style.width = `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`;
    this.elements.enemyHpText.textContent = `${formatNumber(Math.ceil(enemy.hp))} / ${formatNumber(enemy.maxHp)} HP`;
    this.elements.enemyDamageText.textContent = `${formatNumber(enemy.damage)} damage`;
  }

  renderBuffs() {
    const chips = [];
    for (const potion of POTION_DEFS) {
      const potionState = this.game.state.potions[potion.id];
      if (potionState?.remaining > 0) {
        chips.push(`<span class="buff-chip">${potion.name}: ${formatTime(potionState.remaining)}</span>`);
      }
    }

    if (this.game.state.refinery.surge > 0) {
      chips.push(`<span class="buff-chip">Thermal Surge: ${formatTime(this.game.state.refinery.surge)}</span>`);
    }

    if (this.game.state.events.collapse > 0) {
      chips.push(`<span class="buff-chip">Collapse Pressure: ${formatTime(this.game.state.events.collapse)}</span>`);
    }

    this.elements.activeBuffs.innerHTML = chips.length ? chips.join("") : `<span class="buff-chip">No active buffs</span>`;
  }

  renderResources() {
    const state = this.game.state;
    const entries = Object.entries(RESOURCES)
      .map(([id, resource]) => ({ id, resource, amount: state.resources[id] || 0 }))
      .filter((entry) => entry.amount > 0)
      .sort((a, b) => {
        if (b.amount !== a.amount) {
          return b.amount - a.amount;
        }
        return a.resource.name.localeCompare(b.resource.name);
      });

    const ownedCount = entries.filter((entry) => entry.amount > 0).length;
    this.elements.inventorySummary.textContent = `${ownedCount} resource types discovered`;
    this.elements.resourceList.innerHTML = entries.length
      ? entries
          .map(({ id, resource, amount }) => {
            const rarity = RARITIES[resource.rarity];
            return `
              <div class="resource-row" data-resource="${id}">
                <span class="resource-swatch" style="color:${resource.color}; background:${resource.color}"></span>
                <span class="resource-name">
                  <strong>${resource.name}</strong>
                  <span class="resource-rarity" style="border-color:${rarity.color}; color:${rarity.color}">${rarity.name}</span>
                </span>
                <span class="resource-amount">${formatNumber(amount)}</span>
              </div>
            `;
          })
          .join("")
      : `<div class="log-entry">Inventory is empty.</div>`;
  }

  renderTabs() {
    this.elements.tabButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === this.activeTab);
    });
    this.elements.tabPanels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === `tab-${this.activeTab}`);
    });
  }

  renderActivePanel() {
    if (this.activeTab === "upgrades") {
      this.renderUpgrades();
    } else if (this.activeTab === "forge") {
      this.renderForge();
    } else if (this.activeTab === "refinery") {
      this.renderRefinery();
    } else if (this.activeTab === "potions") {
      this.renderPotions();
    } else if (this.activeTab === "market") {
      this.renderMarket();
    } else if (this.activeTab === "relics") {
      this.renderRelics();
    } else if (this.activeTab === "rebirth") {
      this.renderRebirth();
    } else if (this.activeTab === "log") {
      this.renderLog();
    }
  }

  renderUpgrades() {
    const state = this.game.state;
    this.elements.upgradeList.innerHTML = UPGRADE_DEFS.map((upgrade) => {
      const level = state.upgrades[upgrade.id] || 0;
      const price = this.game.getUpgradePrice(upgrade);
      const canBuy = level < upgrade.max && state.money >= price;
      return `
        <article class="system-card">
          <div class="card-top">
            <div>
              <div class="card-title">
                <strong>${upgrade.name}</strong>
                <span class="effect-chip">${upgrade.category}</span>
                <span class="effect-chip">Level ${level} / ${upgrade.max}</span>
              </div>
              <p class="card-desc">${upgrade.description}</p>
            </div>
            <button class="card-action primary" type="button" data-action="buy-upgrade" data-id="${upgrade.id}" ${canBuy ? "" : "disabled"}>Buy</button>
          </div>
          <div class="cost-row">${renderMoneyCost(price, state.money)}</div>
        </article>
      `;
    }).join("");
  }

  renderForge() {
    const state = this.game.state;
    const stats = this.game.getStats();
    const equipped = stats.pickaxe;

    this.elements.pickaxeName.textContent = equipped.name;
    this.elements.pickaxeDamage.textContent = `${equipped.damageMult.toFixed(2)}x`;
    this.elements.forgeSpeed.textContent = `${stats.forgeSpeed.toFixed(2)}x`;
    this.elements.forgeSlots.textContent = stats.forgeSlots;

    this.elements.castingList.innerHTML = CASTING_RECIPES.map((recipe) => {
      const locked = recipe.level > stats.refineryLevel;
      const canStart = this.game.canStartCasting(recipe);
      return `
        <article class="system-card ${locked ? "locked" : ""}">
          <div class="card-top">
            <div>
              <div class="card-title">
                <strong>${recipe.name}</strong>
                <span class="effect-chip">${recipe.moldName}</span>
                <span class="effect-chip">Level ${recipe.level}</span>
                <span class="effect-chip">${formatTime(recipe.time)}</span>
              </div>
              <p class="card-desc">${renderRecipeText(recipe)}</p>
            </div>
            <button class="card-action primary" type="button" data-action="start-casting" data-id="${recipe.id}" ${canStart ? "" : "disabled"}>Cast</button>
          </div>
          <div class="cost-row">${renderCost(recipe.input, state.resources)}</div>
        </article>
      `;
    }).join("");

    this.elements.forgeQueue.innerHTML = state.forge.queue.length
      ? state.forge.queue
          .map((job) => {
            const recipe = CASTING_RECIPES.find((item) => item.id === job.recipeId);
            const progress = Math.min(1, job.progress / job.time);
            return `
              <article class="system-card">
                <div class="card-title">
                  <strong>${recipe?.name || "Unknown Casting"}</strong>
                  <span class="effect-chip">${Math.round(progress * 100)}%</span>
                </div>
                <div class="progress-track"><span style="width:${progress * 100}%"></span></div>
              </article>
            `;
          })
          .join("")
      : `<div class="log-entry">Forge queue is empty.</div>`;

    this.elements.pickaxeList.innerHTML = PICKAXE_DEFS.map((pickaxe) => {
      const owned = state.pickaxes.owned.includes(pickaxe.id);
      const equippedNow = state.pickaxes.equipped === pickaxe.id;
      const cost = this.game.getPickaxeCost(pickaxe);
      const canCraft = !owned && Object.keys(cost).length > 0 && this.game.hasResources(cost);
      const rarity = RARITIES[pickaxe.rarity];
      const action = owned ? "equip-pickaxe" : "craft-pickaxe";
      const label = equippedNow ? "Equipped" : owned ? "Equip" : "Assemble";
      return `
        <article class="system-card ${owned ? "" : "locked"}">
          <div class="card-top">
            <div>
              <div class="card-title">
                <strong>${pickaxe.name}</strong>
                <span class="effect-chip" style="border-color:${rarity.color}; color:${rarity.color}">${rarity.name}</span>
                ${equippedNow ? `<span class="effect-chip">Equipped</span>` : ""}
              </div>
              <p class="card-desc">${pickaxe.description}</p>
            </div>
            <button class="card-action primary" type="button" data-action="${action}" data-id="${pickaxe.id}" ${equippedNow || (!owned && !canCraft) ? "disabled" : ""}>${label}</button>
          </div>
          <div class="effect-row">${renderPickaxeEffects(pickaxe)}</div>
          ${Object.keys(cost).length ? `<div class="cost-row">${renderCost(cost, state.resources)}</div>` : ""}
        </article>
      `;
    }).join("");
  }

  renderRefinery() {
    const stats = this.game.getStats();
    this.elements.refineryLevel.textContent = stats.refineryLevel;
    this.elements.refinerySpeed.textContent = `${stats.refinerySpeed.toFixed(2)}x`;
    this.elements.refineryEfficiency.textContent = `${Math.round(stats.refineryEfficiency * 100)}%`;
    this.elements.refinerySlots.textContent = stats.refinerySlots;

    this.elements.recipeList.innerHTML = REFINERY_RECIPES.map((recipe) => {
      const locked = recipe.level > stats.refineryLevel;
      const canStart = this.game.canStartRecipe(recipe);
      return `
        <article class="system-card ${locked ? "locked" : ""}">
          <div class="card-top">
            <div>
              <div class="card-title">
                <strong>${recipe.name}</strong>
                <span class="effect-chip">Level ${recipe.level}</span>
                <span class="effect-chip">${formatTime(recipe.time)}</span>
              </div>
              <p class="card-desc">${renderRecipeText(recipe)}</p>
            </div>
            <button class="card-action primary" type="button" data-action="start-recipe" data-id="${recipe.id}" ${canStart ? "" : "disabled"}>Start</button>
          </div>
          <div class="cost-row">${renderCost(recipe.input, this.game.state.resources)}</div>
        </article>
      `;
    }).join("");

    this.elements.refineryQueue.innerHTML = this.game.state.refinery.queue.length
      ? this.game.state.refinery.queue
          .map((job) => {
            const recipe = REFINERY_RECIPES.find((item) => item.id === job.recipeId);
            const progress = Math.min(1, job.progress / job.time);
            return `
              <article class="system-card">
                <div class="card-title">
                  <strong>${recipe?.name || "Unknown Job"}</strong>
                  <span class="effect-chip">${Math.round(progress * 100)}%</span>
                </div>
                <div class="progress-track"><span style="width:${progress * 100}%"></span></div>
              </article>
            `;
          })
          .join("")
      : `<div class="log-entry">Queue is empty.</div>`;
  }

  renderPotions() {
    this.elements.potionList.innerHTML = POTION_DEFS.map((potion) => {
      const potionState = this.game.state.potions[potion.id];
      const price = this.game.getPotionPrice(potion);
      const canBuy = this.game.state.money >= price;
      const canUse = potionState.owned > 0 && potionState.cooldown <= 0;
      return `
        <article class="system-card">
          <div class="card-top">
            <div>
              <div class="card-title">
                <strong>${potion.name}</strong>
                <span class="effect-chip">Owned ${potionState.owned}</span>
                <span class="effect-chip">Duration ${formatTime(potion.duration)}</span>
                <span class="effect-chip">Cooldown ${potionState.cooldown > 0 ? formatTime(potionState.cooldown) : formatTime(potion.cooldown)}</span>
              </div>
              <p class="card-desc">${potion.description}</p>
            </div>
            <div class="cost-row">
              <button class="card-action" type="button" data-action="buy-potion" data-id="${potion.id}" ${canBuy ? "" : "disabled"}>Buy</button>
              <button class="card-action primary" type="button" data-action="use-potion" data-id="${potion.id}" ${canUse ? "" : "disabled"}>Use</button>
            </div>
          </div>
          <div class="cost-row">${renderMoneyCost(price, this.game.state.money)}</div>
        </article>
      `;
    }).join("");
  }

  renderMarket() {
    const state = this.game.state;
    const entries = Object.entries(RESOURCES)
      .map(([id, resource]) => ({ id, resource, amount: state.resources[id] || 0 }))
      .filter((entry) => entry.amount > 0)
      .sort((a, b) => {
        if ((b.resource.sellValue || 0) !== (a.resource.sellValue || 0)) {
          return (b.resource.sellValue || 0) - (a.resource.sellValue || 0);
        }
        return a.resource.name.localeCompare(b.resource.name);
      });

    this.elements.marketMoney.textContent = formatMoney(state.money);
    this.elements.marketList.innerHTML = entries.length
      ? entries
          .map(({ id, resource, amount }) => {
            const rarity = RARITIES[resource.rarity];
            return `
              <article class="system-card">
                <div class="card-top">
                  <div>
                    <div class="card-title">
                      <strong>${resource.name}</strong>
                      <span class="effect-chip" style="border-color:${rarity.color}; color:${rarity.color}">${rarity.name}</span>
                      <span class="effect-chip">${titleCase(resource.kind)}</span>
                      <span class="effect-chip">${formatMoney(resource.sellValue)} each</span>
                    </div>
                    <p class="card-desc">Owned ${formatNumber(amount)}. Total value ${formatMoney(amount * resource.sellValue)}.</p>
                  </div>
                  <div class="cost-row">
                    <button class="card-action" type="button" data-action="sell-resource" data-id="${id}" data-amount="1">Sell 1</button>
                    <button class="card-action" type="button" data-action="sell-resource" data-id="${id}" data-amount="10" ${amount >= 10 ? "" : "disabled"}>Sell 10</button>
                    <button class="card-action primary" type="button" data-action="sell-resource" data-id="${id}" data-amount="all">Sell All</button>
                  </div>
                </div>
              </article>
            `;
          })
          .join("")
      : `<div class="log-entry">No resources to sell.</div>`;
  }

  renderRelics() {
    const state = this.game.state;
    const stats = this.game.getStats();
    this.elements.relicSlotSummary.textContent = `${state.relics.equipped.length} / ${stats.relicSlots}`;

    const owned = new Set(state.relics.owned);
    this.elements.relicList.innerHTML = RELIC_DEFS.map((relic) => {
      const hasRelic = owned.has(relic.id);
      const equipped = state.relics.equipped.includes(relic.id);
      const rarity = RARITIES[relic.rarity];
      return `
        <article class="system-card ${hasRelic ? "" : "locked"}">
          <div class="card-top">
            <div>
              <div class="card-title">
                <strong>${hasRelic ? relic.name : "Undiscovered Relic"}</strong>
                <span class="effect-chip" style="border-color:${rarity.color}; color:${rarity.color}">${titleCase(relic.rarity)}</span>
                ${equipped ? `<span class="effect-chip">Equipped</span>` : ""}
              </div>
              <p class="card-desc">${hasRelic ? relic.description : "Bosses and deep relic signals can reveal this item."}</p>
            </div>
            <button class="card-action primary" type="button" data-action="toggle-relic" data-id="${relic.id}" ${hasRelic ? "" : "disabled"}>${equipped ? "Unequip" : "Equip"}</button>
          </div>
          <div class="effect-row"><span class="effect-chip">${hasRelic ? relic.effectText : "Unknown effect"}</span></div>
        </article>
      `;
    }).join("");
  }

  renderRebirth() {
    const reward = this.game.getRebirthReward();
    this.elements.rebirthSummary.textContent =
      reward > 0
        ? `Rebirth now for ${reward} Void Cores. Run depth: ${this.game.state.depth}.`
        : `Reach depth 180 to convert this run into Void Cores. Current depth: ${this.game.state.depth}.`;
    this.elements.rebirthButton.disabled = reward <= 0;

    this.elements.prestigeList.innerHTML = PRESTIGE_DEFS.map((def) => {
      const level = this.game.state.rebirth.prestige[def.id] || 0;
      const cost = this.game.getPrestigeCost(def);
      const canBuy = level < def.max && this.game.state.rebirth.voidCores >= cost;
      return `
        <article class="system-card">
          <div class="card-top">
            <div>
              <div class="card-title">
                <strong>${def.name}</strong>
                <span class="effect-chip">Level ${level} / ${def.max}</span>
              </div>
              <p class="card-desc">${def.description}</p>
            </div>
            <button class="card-action primary" type="button" data-action="buy-prestige" data-id="${def.id}" ${canBuy ? "" : "disabled"}>Spend ${cost}</button>
          </div>
        </article>
      `;
    }).join("");
  }

  renderLog() {
    this.elements.eventLog.innerHTML = this.game.state.log.length
      ? this.game.state.log
          .map((entry) => `<div class="log-entry ${entry.type}">${new Date(entry.time).toLocaleTimeString()}: ${entry.message}</div>`)
          .join("")
      : `<div class="log-entry">No events yet.</div>`;
  }
}

function collectElements() {
  return {
    canvas: document.querySelector("#void-canvas"),
    biomeLabel: document.querySelector("#biome-label"),
    depthValue: document.querySelector("#depth-value"),
    hpValue: document.querySelector("#hp-value"),
    shieldValue: document.querySelector("#shield-value"),
    stressValue: document.querySelector("#stress-value"),
    moneyValue: document.querySelector("#money-value"),
    voidCoreValue: document.querySelector("#void-core-value"),
    saveButton: document.querySelector("#save-button"),
    resetButton: document.querySelector("#reset-button"),
    activeBuffs: document.querySelector("#active-buffs"),
    blockSubtitle: document.querySelector("#block-subtitle"),
    rarityBadge: document.querySelector("#rarity-badge"),
    blockVisual: document.querySelector("#block-visual"),
    blockName: document.querySelector("#block-name"),
    blockHpText: document.querySelector("#block-hp-text"),
    blockHpBar: document.querySelector("#block-hp-bar"),
    mineButton: document.querySelector("#mine-button"),
    descendButton: document.querySelector("#descend-button"),
    damageStat: document.querySelector("#damage-stat"),
    speedStat: document.querySelector("#speed-stat"),
    critStat: document.querySelector("#crit-stat"),
    luckStat: document.querySelector("#luck-stat"),
    droneStat: document.querySelector("#drone-stat"),
    autoStat: document.querySelector("#auto-stat"),
    combatCard: document.querySelector("#combat-card"),
    enemyName: document.querySelector("#enemy-name"),
    enemySubtitle: document.querySelector("#enemy-subtitle"),
    enemyKind: document.querySelector("#enemy-kind"),
    enemyHpBar: document.querySelector("#enemy-hp-bar"),
    enemyHpText: document.querySelector("#enemy-hp-text"),
    enemyDamageText: document.querySelector("#enemy-damage-text"),
    inventorySummary: document.querySelector("#inventory-summary"),
    resourceList: document.querySelector("#resource-list"),
    systemsPanel: document.querySelector(".systems-panel"),
    tabbar: document.querySelector(".tabbar"),
    tabButtons: [...document.querySelectorAll(".tab-button")],
    tabPanels: [...document.querySelectorAll(".tab-panel")],
    upgradeList: document.querySelector("#upgrade-list"),
    pickaxeName: document.querySelector("#pickaxe-name"),
    pickaxeDamage: document.querySelector("#pickaxe-damage"),
    forgeSpeed: document.querySelector("#forge-speed"),
    forgeSlots: document.querySelector("#forge-slots"),
    castingList: document.querySelector("#casting-list"),
    forgeQueue: document.querySelector("#forge-queue"),
    pickaxeList: document.querySelector("#pickaxe-list"),
    refineryLevel: document.querySelector("#refinery-level"),
    refinerySpeed: document.querySelector("#refinery-speed"),
    refineryEfficiency: document.querySelector("#refinery-efficiency"),
    refinerySlots: document.querySelector("#refinery-slots"),
    recipeList: document.querySelector("#recipe-list"),
    refineryQueue: document.querySelector("#refinery-queue"),
    potionList: document.querySelector("#potion-list"),
    marketMoney: document.querySelector("#market-money"),
    marketList: document.querySelector("#market-list"),
    relicSlotSummary: document.querySelector("#relic-slot-summary"),
    relicList: document.querySelector("#relic-list"),
    rebirthSummary: document.querySelector("#rebirth-summary"),
    rebirthButton: document.querySelector("#rebirth-button"),
    prestigeList: document.querySelector("#prestige-list"),
    eventLog: document.querySelector("#event-log")
  };
}

function formatMoney(value) {
  return `${formatNumber(value)} cr`;
}

function renderMoneyCost(price, money) {
  const enough = money >= price;
  return `<span class="cost-chip" style="border-color:${enough ? "rgba(165,255,122,0.45)" : "rgba(255,95,122,0.55)"}">Credits: ${formatMoney(money)} / ${formatMoney(price)}</span>`;
}

function renderCost(cost, resources) {
  return Object.entries(cost)
    .map(([id, amount]) => {
      const resource = RESOURCES[id];
      const owned = resources[id] || 0;
      const enough = owned >= amount;
      return `<span class="cost-chip" style="border-color:${enough ? "rgba(165,255,122,0.45)" : "rgba(255,95,122,0.55)"}">${resource?.name || id}: ${formatNumber(owned)} / ${formatNumber(amount)}</span>`;
    })
    .join("");
}

function renderPickaxeEffects(pickaxe) {
  const effects = [
    `Damage ${pickaxe.damageMult.toFixed(2)}x`,
    `Speed ${pickaxe.speedMult.toFixed(2)}x`
  ];

  if (pickaxe.critChance) {
    effects.push(`Crit +${Math.round(pickaxe.critChance * 100)}%`);
  }
  if (pickaxe.critDamage) {
    effects.push(`Crit damage +${Math.round(pickaxe.critDamage * 100)}%`);
  }
  if (pickaxe.luck) {
    effects.push(`Luck +${Math.round(pickaxe.luck * 100)}%`);
  }
  if (pickaxe.stressResist) {
    effects.push(`Stress resist +${Math.round(pickaxe.stressResist * 100)}%`);
  }

  return effects.map((text) => `<span class="effect-chip">${text}</span>`).join("");
}

function renderRecipeText(recipe) {
  const output = Object.entries(recipe.output)
    .map(([id, amount]) => `${formatNumber(amount)} ${RESOURCES[id]?.name || id}`)
    .join(", ");
  return `Produces ${output}.`;
}

function isTypingTarget(target) {
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName);
}

window.VoidMinerUI = {
  VoidMinerUI
};
})();
