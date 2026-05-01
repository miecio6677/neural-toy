import { BACKPACKS, LEGENDARIES, LOCATIONS, SHOP_CATEGORIES, getFishGuide, getLocationGuideNote } from "./data.js";
import { formatMoney, formatWeight, getInventoryWeight, getKeepnetCapacity, skillXpForLevel, xpForLevel } from "./storage.js";

export function rarityLabel(rarity) {
  return {
    common: "Common",
    medal: "Medal",
    unique: "Unique",
    legendary: "Legendary",
  }[rarity] ?? rarity;
}

export function renderHeader(state, elements) {
  elements.moneyStat.textContent = formatMoney(state.money);
  elements.levelStat.textContent = `Lv. ${state.level}`;
  elements.xpStat.textContent = `${state.xp.toLocaleString("en-US")} XP`;
}

export function setActiveNav(view) {
  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function tagList(items) {
  return (items?.length ? items : ["brak danych"])
    .map((item) => `<span class="tag">${escapeHtml(item)}</span>`)
    .join("");
}

function stars(count) {
  const filled = Math.ceil(count / 2);
  return `${"★★★★★".slice(0, filled).padEnd(5, "☆")} ${count}/10`;
}

function fishRows(location) {
  return location.fish
    .map(
      (fish) => `
      <div class="fish-row">
        <div>
          <b>${fish.name}</b><br />
          <small>${formatWeight(fish.maxWeight)} max · ${formatMoney(fish.baseValue)} + ${formatMoney(fish.valuePerKg)}/kg</small>
        </div>
        <div class="tag-row">
          ${fish.canBeUnique ? `<span class="tag unique">unique</span>` : ""}
          <span class="tag medal">medal</span>
        </div>
      </div>
    `,
    )
    .join("");
}

export function renderMapPanel(location, state) {
  const selected = location ?? LOCATIONS[0];
  const unlocked = state.unlockedLocations.includes(selected.id);
  const isCurrent = state.currentLocation?.id === selected.id || state.currentLocationId === selected.id;
  const canTravel = unlocked && (isCurrent || state.money >= selected.travelCost);
  const legendary = LEGENDARIES[selected.id];
  return `
    <div class="panel-head">
      <h2>${selected.country} - ${selected.name}</h2>
      <p>${selected.type}</p>
    </div>
    <div class="panel-body">
      <div class="section">
        <div class="info-grid">
          <div class="info-cell"><span>Trudność</span><b>${stars(selected.difficulty)}</b></div>
          <div class="info-cell"><span>Koszt podróży</span><b>${formatMoney(selected.travelCost)}</b></div>
          <div class="info-cell"><span>Odblokowanie</span><b>Lv. ${selected.unlockLevel}</b></div>
          <div class="info-cell"><span>Wymagany sprzęt</span><b>${selected.requiredGear}</b></div>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Ryby</div>
        <div class="fish-list scroll">${fishRows(selected)}</div>
      </div>
      <div class="section">
        <div class="section-title">Legendary fish</div>
        <div class="journal-row">
          <b>${legendary.name}</b><br />
          <small>${legendary.species} · Lv. ${legendary.minLevel}+ · ${formatMoney(legendary.value)}</small>
        </div>
      </div>
      <div class="panel-actions">
        <button class="primary" data-action="travel" data-location="${selected.id}" ${canTravel ? "" : "disabled"}>
          ${isCurrent ? "Łów tutaj" : "Travel"}
        </button>
        ${!unlocked ? `<span class="tag">Wymaga Lv. ${selected.unlockLevel}</span>` : ""}
        ${unlocked && !isCurrent && state.money < selected.travelCost ? `<span class="tag">Brak środków</span>` : ""}
      </div>
    </div>
  `;
}

export function renderFishingPanel(state, weather) {
  const location = state.currentLocation;
  if (!location) {
    return `
      <div class="panel-head"><h2>Łowienie</h2><p>Wybierz łowisko z mapy</p></div>
      <div class="panel-body">
        <button class="primary" data-view-jump="map">Mapa świata</button>
      </div>
    `;
  }
  const capacity = getKeepnetCapacity(state.player);
  const weight = getInventoryWeight(state.player);
  const legendary = LEGENDARIES[location.id];
  return `
    <div class="panel-head">
      <h2>${location.country} - ${location.name}</h2>
      <p>${weather.currentLabel} · ${weather.getClockLabel()} · ${Math.round(weather.temperature)}°C</p>
    </div>
    <div class="panel-body">
      <div class="section">
        <div class="info-grid">
          <div class="info-cell"><span>Keepnet</span><b>${formatWeight(weight)} / ${formatWeight(capacity)}</b></div>
          <div class="info-cell"><span>Current</span><b>${Math.round(location.current * 100)}%</b></div>
          <div class="info-cell"><span>Depth</span><b>${Math.round(location.depth * 100)}%</b></div>
          <div class="info-cell"><span>Legendary</span><b>${legendary.name}</b></div>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Aktywny zestaw</div>
        <div class="tag-row">
          <span class="tag">${state.equipment.rod.name}</span>
          <span class="tag">${state.equipment.reel.name}</span>
          <span class="tag">${state.equipment.line.name}</span>
          <span class="tag">${state.equipment.lure.name}</span>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Ryby na łowisku</div>
        <div class="fish-list scroll">${fishRows(location)}</div>
      </div>
      <div class="panel-actions">
        <button class="primary" data-view-jump="map">Mapa świata</button>
        <button data-view-jump="shop">Sklep</button>
        <button data-action="sell-all" ${state.player.inventory.length ? "" : "disabled"}>Sell keepnet</button>
      </div>
    </div>
  `;
}

function renderShopItem(category, item, state) {
  const owned = state.owned[category.ownedKey]?.includes(item.id);
  const equipped = category.equippedKey && state.equipped[category.equippedKey] === item.id;
  const locked = state.level < item.unlockLevel;
  const canBuy = !owned && !locked && state.money >= item.price;
  const stats = Object.entries(item)
    .filter(([key, value]) => ["maxTension", "control", "castPower", "speed", "drag", "strength", "friction", "snagResist", "mass", "rodSlots", "keepnetKg", "detection", "luck"].includes(key) && typeof value !== "object")
    .map(([key, value]) => `<span class="tag">${key}: ${typeof value === "number" ? Number(value.toFixed(2)) : value}</span>`)
    .join("");
  return `
    <div class="shop-item">
      <div class="shop-item-head">
        <div>
          <b>${item.name}</b><br />
          <small>${item.description ?? ""}</small>
        </div>
        <span class="tag">${item.price ? formatMoney(item.price) : "Owned"}</span>
      </div>
      <div class="tag-row">${stats}<span class="tag">Lv. ${item.unlockLevel}</span></div>
      <div class="shop-actions">
        ${
          owned
            ? category.equippedKey
              ? `<button data-action="equip" data-category="${category.id}" data-item="${item.id}" ${equipped ? "disabled" : ""}>${equipped ? "Equipped" : "Equip"}</button>`
              : `<button disabled>Owned</button>`
            : `<button class="primary" data-action="buy" data-category="${category.id}" data-item="${item.id}" ${canBuy ? "" : "disabled"}>${locked ? "Locked" : "Buy"}</button>`
        }
      </div>
    </div>
  `;
}

export function renderShopPanel(state, activeCategory = "rods") {
  const category = SHOP_CATEGORIES.find((item) => item.id === activeCategory) ?? SHOP_CATEGORIES[0];
  return `
    <div class="panel-head">
      <h2>Sklep</h2>
      <p>${formatMoney(state.money)} · Lv. ${state.level}</p>
    </div>
    <div class="panel-body">
      <div class="section">
        <div class="segmented">
          ${SHOP_CATEGORIES.map(
            (item) => `<button data-action="shop-category" data-category="${item.id}" class="${item.id === category.id ? "active" : ""}">${item.label}</button>`,
          ).join("")}
        </div>
      </div>
      <div class="shop-grid">
        ${category.items.map((item) => renderShopItem(category, item, state)).join("")}
      </div>
    </div>
  `;
}

export function renderInventoryPanel(state) {
  const capacity = getKeepnetCapacity(state);
  const weight = getInventoryWeight(state);
  const rows = state.inventory
    .map(
      (fish) => `
      <div class="inventory-row">
        <div class="inventory-head">
          <div>
            <b>${fish.legendaryName ? `${fish.legendaryName} (${fish.speciesName})` : fish.speciesName}</b><br />
            <small>${fish.locationName} · ${formatWeight(fish.weight)} · ${formatMoney(fish.value)}</small>
          </div>
          <span class="tag ${fish.rarity}">${rarityLabel(fish.rarity)}</span>
        </div>
      </div>
    `,
    )
    .join("");
  return `
    <div class="panel-head">
      <h2>Inventory</h2>
      <p>${formatWeight(weight)} / ${formatWeight(capacity)}</p>
    </div>
    <div class="panel-body">
      <div class="section">
        <button class="primary" data-action="sell-all" ${state.inventory.length ? "" : "disabled"}>Sell all · ${formatMoney(state.inventory.reduce((sum, fish) => sum + fish.value, 0))}</button>
      </div>
      <div class="item-list">
        ${rows || `<div class="empty-state">Keepnet jest pusty</div>`}
      </div>
    </div>
  `;
}

export function renderWikiPanel(state, selectedLocationId, selectedFishName) {
  const location = LOCATIONS.find((item) => item.id === selectedLocationId) ?? LOCATIONS[0];
  const selectedFish = location.fish.find((fish) => fish.name === selectedFishName) ?? location.fish[0];
  const guide = getFishGuide(location.id, selectedFish.name);
  const caught = state.journal.caught[`${location.id}:${selectedFish.name}`];
  const recordLabel = caught ? formatWeight(caught.bestWeight) : "Nie złowiona";
  const locationNote = getLocationGuideNote(location.id);
  const legendary = LEGENDARIES[location.id];
  const locationButtons = LOCATIONS.map(
    (item) => `
      <button data-action="wiki-location" data-location="${item.id}" class="${item.id === location.id ? "active" : ""}">
        ${escapeHtml(item.country)}
      </button>
    `,
  ).join("");
  const fishButtons = location.fish
    .map((fish) => {
      const fishCaught = state.journal.caught[`${location.id}:${fish.name}`];
      return `
        <button class="wiki-fish-btn ${fish.name === selectedFish.name ? "active" : ""}" data-action="wiki-fish" data-location="${location.id}" data-fish="${escapeHtml(fish.name)}">
          <span>${escapeHtml(fish.name)}</span>
          <small>${fishCaught ? formatWeight(fishCaught.bestWeight) : "nie złowiona"}</small>
        </button>
      `;
    })
    .join("");
  return `
    <div class="panel-head">
      <h2>Wiki ryb</h2>
      <p>${location.country} - ${location.name}</p>
    </div>
    <div class="panel-body wiki-panel">
      <div class="section">
        <div class="section-title">Łowiska</div>
        <div class="segmented wiki-locations">${locationButtons}</div>
      </div>
      <div class="section">
        <div class="section-title">Indeks gatunków</div>
        <div class="wiki-index-list">${fishButtons}</div>
      </div>
      <div class="wiki-detail">
        <div class="wiki-fish-hero" style="--fish-hue:${selectedFish.visualHue}; --fish-scale:${Math.min(1.28, Math.max(0.74, 0.78 + selectedFish.maxWeight / 110))}">
          <span>${escapeHtml(selectedFish.name)}</span>
        </div>
        <div class="info-grid">
          <div class="info-cell"><span>Rekord gracza</span><b>${recordLabel}</b></div>
          <div class="info-cell"><span>Status</span><b>${caught ? `${caught.count}x złowiona` : "nie złowiona"}</b></div>
          <div class="info-cell"><span>Maks. w grze</span><b>${formatWeight(selectedFish.maxWeight)}</b></div>
          <div class="info-cell"><span>Wartość</span><b>${formatMoney(selectedFish.baseValue)} + ${formatMoney(selectedFish.valuePerKg)}/kg</b></div>
        </div>
        <div class="section">
          <div class="section-title">Najlepsze</div>
          <div class="tag-row">${tagList(guide.best)}</div>
        </div>
        <div class="section">
          <div class="section-title">OK</div>
          <div class="tag-row">${tagList(guide.ok)}</div>
        </div>
        <div class="section">
          <div class="section-title">Nie działa</div>
          <div class="tag-row">${tagList(guide.bad)}</div>
        </div>
        <div class="section">
          <div class="section-title">Zachowanie</div>
          <div class="tag-row">
            <span class="tag">${escapeHtml(selectedFish.behavior)}</span>
            <span class="tag">aktywność ${selectedFish.activeHours.map((hour) => `${String(hour).padStart(2, "0")}:00`).join(" / ")}</span>
            <span class="tag">pogoda: ${escapeHtml(selectedFish.weatherPreference)}</span>
          </div>
        </div>
        ${
          guide.note || locationNote
            ? `<div class="catch-note">${escapeHtml(guide.note || locationNote)}</div>`
            : ""
        }
        <div class="section">
          <div class="section-title">Legendary na łowisku</div>
          <div class="journal-row">
            <b>${escapeHtml(legendary.name)}</b><br />
            <small>${escapeHtml(legendary.species)} · Lv. ${legendary.minLevel}+ · ${formatMoney(legendary.value)}</small>
          </div>
        </div>
      </div>
    </div>
  `;
}

function skillRow(name, entry) {
  const next = skillXpForLevel(entry.level + 1);
  const width = Math.min(100, (entry.xp / next) * 100);
  return `
    <div class="quest-row">
      <div class="quest-head"><b>${name}</b><span class="tag">Lv. ${entry.level}</span></div>
      <div class="meter-label"><span>${entry.xp} XP</span><span>${next} XP</span></div>
      <div class="bar cool"><span style="width:${width}%"></span></div>
    </div>
  `;
}

function questRows(quests) {
  return quests
    .map((quest) => {
      const pct = Math.min(100, (quest.progress / quest.target) * 100);
      return `
        <div class="quest-row">
          <div class="quest-head">
            <div><b>${quest.title}</b><br /><small>${Math.floor(quest.progress)} / ${quest.target}</small></div>
            <span class="tag">${formatMoney(quest.reward)}</span>
          </div>
          <div class="bar"><span style="width:${pct}%"></span></div>
          <div class="shop-actions">
            <button data-action="claim-quest" data-quest="${quest.id}" ${quest.progress >= quest.target && !quest.claimed ? "" : "disabled"}>
              ${quest.claimed ? "Claimed" : "Claim"}
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

export function renderJournalPanel(state) {
  const caughtRows = Object.values(state.journal.caught)
    .sort((a, b) => b.bestValue - a.bestValue)
    .slice(0, 20)
    .map(
      (entry) => `
      <div class="journal-row">
        <b>${entry.speciesName}</b><br />
        <small>${entry.locationName} · ${entry.count}x · best ${formatWeight(entry.bestWeight)} · ${formatMoney(entry.bestValue)}</small>
      </div>
    `,
    )
    .join("");
  const specials = [...state.journal.legendaries, ...state.journal.uniques, ...state.journal.medals]
    .slice(0, 20)
    .map(
      (fish) => `
      <div class="journal-row">
        <b>${fish.legendaryName ? `${fish.legendaryName} (${fish.speciesName})` : fish.speciesName}</b><br />
        <small>${rarityLabel(fish.rarity)} · ${formatWeight(fish.weight)} · ${fish.locationName}</small>
      </div>
    `,
    )
    .join("");
  const player = state;
  const nextLevel = xpForLevel(player.level + 1);
  const levelPct = Math.min(100, (player.xp / nextLevel) * 100);
  return `
    <div class="panel-head">
      <h2>Dziennik</h2>
      <p>Lv. ${player.level} · ${player.xp.toLocaleString("en-US")} XP</p>
    </div>
    <div class="panel-body">
      <div class="section">
        <div class="section-title">Progress</div>
        <div class="meter-label"><span>Level ${player.level}</span><span>${nextLevel} XP</span></div>
        <div class="bar cool"><span style="width:${levelPct}%"></span></div>
      </div>
      <div class="section">
        <div class="section-title">Skille</div>
        ${skillRow("Casting", player.skills.casting)}
        ${skillRow("Control", player.skills.control)}
        ${skillRow("Luck", player.skills.luck)}
        ${skillRow("Detection", player.skills.detection)}
      </div>
      <div class="section">
        <div class="section-title">Questy dzienne</div>
        ${questRows(player.quests.daily)}
      </div>
      <div class="section">
        <div class="section-title">Milestone</div>
        ${questRows(player.quests.milestones)}
      </div>
      <div class="section">
        <div class="section-title">Specjalne wpisy</div>
        <div class="item-list">${specials || `<div class="empty-state">Brak medalowych, unikatowych i legendary fish</div>`}</div>
      </div>
      <div class="section">
        <div class="section-title">Najlepsze połowy</div>
        <div class="item-list">${caughtRows || `<div class="empty-state">Jeszcze nic nie złowiono</div>`}</div>
      </div>
      <div class="panel-actions">
        <button class="danger-btn" data-action="reset-save">Reset save</button>
      </div>
    </div>
  `;
}

export function renderRodDock(manager) {
  return manager.rods
    .map((rod, index) => {
      const tension = rod.tensionSystem?.tension ?? 0;
      const stamina = rod.tensionSystem?.stamina ?? 0;
      return `
        <div class="rod-card ${index === manager.activeIndex ? "active" : ""} ${rod.status === "bite" ? "bite" : ""}" data-action="select-rod" data-rod="${index}">
          <div class="rod-title"><span>Rod ${index + 1}</span><span class="tag">${rod.status}</span></div>
          <div class="rod-meta">${rod.message}</div>
          ${
            rod.status === "fighting"
              ? `<div class="bar danger"><span style="width:${Math.min(100, tension)}%"></span></div><div class="bar cool"><span style="width:${Math.min(100, stamina)}%"></span></div>`
              : ""
          }
        </div>
      `;
    })
    .join("");
}

export function renderActionBar(state, manager) {
  const rod = manager.activeRod;
  if (state.view === "map") {
    const selected = state.selectedLocation ?? LOCATIONS[0];
    const unlocked = state.unlockedLocations.includes(selected.id);
    const isCurrent = state.currentLocation?.id === selected.id || state.currentLocationId === selected.id;
    const canTravel = unlocked && (isCurrent || state.money >= selected.travelCost);
    return `
      <button class="primary" data-action="travel" data-location="${selected.id}" ${canTravel ? "" : "disabled"}>
        ${isCurrent ? "Łów tutaj" : "Travel"}
      </button>
    `;
  }
  if (state.view !== "fishing") {
    return `<button class="primary" data-view-jump="map">Mapa świata</button>`;
  }
  if (!state.currentLocation) {
    return `<button class="primary" data-view-jump="map">Travel</button>`;
  }
  const passiveButtons = manager.rods
    .map((item, index) => {
      if (index === manager.activeIndex || item.status !== "idle") return "";
      return `<button data-action="passive-rod" data-rod="${index}">Set Rod ${index + 1}</button>`;
    })
    .join("");
  const statusButton =
    rod?.status === "idle"
      ? `<button class="primary" data-action="cast-active">Rzuć</button>`
      : rod?.status === "bite"
        ? `<button class="warning" data-action="hook-active">Zatnij</button>`
        : `<button data-action="cancel-active">Reset</button>`;
  const controlButtons =
    rod?.status === "retrieving" || rod?.status === "fighting"
      ? `<button class="primary hold-control" data-hold-control="reel">Zwijaj</button>
         <button class="hold-control" data-hold-control="loosen">Popuść</button>`
      : "";
  return `
    ${statusButton}
    ${controlButtons}
    ${passiveButtons}
    <button data-view-jump="map">Mapa</button>
  `;
}

export function renderHud(state, weather, manager) {
  const rod = manager.activeRod;
  if (!state.currentLocation) {
    return `
      <div class="hud-stack">
        <div class="hud-box"><strong>World map</strong><span>${state.unlockedLocations.length}/${LOCATIONS.length} łowisk</span></div>
      </div>
    `;
  }
  const tension = rod?.tensionSystem?.tension ?? 0;
  const stamina = rod?.tensionSystem?.stamina ?? 0;
  const lure = rod?.lurePhysics;
  const tensionPct = Math.min(100, tension);
  const tensionState = tension >= 86 ? "high" : tension <= 18 ? "low" : "ok";
  const fightMeter =
    rod?.status === "fighting"
      ? `<div class="tension-meter ${tensionState}">
          <div class="tension-label">Napięcie</div>
          <div class="tension-track">
            <span class="zone high"></span>
            <span class="zone mid"></span>
            <span class="zone low"></span>
            <i style="height:${tensionPct}%"></i>
          </div>
          <b>${Math.round(tension)}%</b>
        </div>`
      : "";
  return `
    ${fightMeter}
    <div class="hud-stack">
      <div class="hud-box"><strong>${state.currentLocation.country}</strong><span>${state.currentLocation.name}</span></div>
      <div class="hud-box"><strong>Weather</strong><span>${weather.currentLabel} · ${weather.getClockLabel()}</span></div>
      ${
        lure
          ? `<div class="hud-box"><strong>Lure</strong><span>${lure.style} · depth ${Math.round(lure.depth * 100)}%</span></div>`
          : ""
      }
    </div>
    <div class="hud-stack">
      ${
        rod?.status === "fighting"
          ? `<div class="hud-box"><strong>Tension</strong><div class="bar danger"><span style="width:${tensionPct}%"></span></div></div>
             <div class="hud-box"><strong>Fish stamina</strong><div class="bar cool"><span style="width:${Math.min(100, stamina)}%"></span></div></div>`
          : `<div class="hud-box"><strong>Rod</strong><span>${rod?.status ?? "idle"}</span></div>`
      }
    </div>
  `;
}

export function renderCatchModal(fish, capacityOk) {
  const specialClass = fish.rarity === "unique" ? "unique" : fish.rarity === "legendary" ? "legendary" : "";
  const title = fish.legendaryName ? `${fish.legendaryName} (${fish.speciesName})` : fish.speciesName;
  const hue = fish.visualHue ?? (fish.rarity === "legendary" ? 43 : 188);
  const weightPct = Math.min(100, Math.round((fish.weight / Math.max(fish.maxWeight ?? fish.weight, 0.1)) * 100));
  const scale = Math.min(1.32, Math.max(0.78, 0.78 + weightPct / 180));
  return `
    <div class="catch-hero ${specialClass}" style="--fish-hue:${hue}; --fish-scale:${scale}">
      <span class="catch-badge ${fish.rarity}">${rarityLabel(fish.rarity)}</span>
    </div>
    <div class="catch-summary">
      <h2>${title}</h2>
      <p>${fish.locationName} · ${weightPct}% maksymalnej wagi gatunku</p>
    </div>
    <div class="info-grid">
      <div class="info-cell"><span>Waga</span><b>${formatWeight(fish.weight)}</b></div>
      <div class="info-cell"><span>Wartość</span><b>${formatMoney(fish.value)}</b></div>
      <div class="info-cell"><span>Rzadkość</span><b>${rarityLabel(fish.rarity)}</b></div>
      <div class="info-cell"><span>Hook set</span><b>${Math.round(fish.hookQuality * 100)}%</b></div>
    </div>
    ${capacityOk ? "" : `<div class="catch-note">Keepnet jest pełny, więc tej ryby nie da się zachować.</div>`}
    <div class="modal-actions">
      <button class="primary" data-modal-action="keep" ${capacityOk ? "" : "disabled"}>Zachowaj</button>
      <button data-modal-action="release">Wypuść</button>
      <button data-modal-action="sell">Sprzedaj</button>
    </div>
  `;
}
