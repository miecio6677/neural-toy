(() => {
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatNumber(value) {
  const number = Number(value || 0);
  if (number < 1000) {
    return Number.isInteger(number) ? String(number) : number.toFixed(1);
  }

  const units = ["K", "M", "B", "T", "Qa", "Qi"];
  let scaled = number;
  let unit = "";
  for (const next of units) {
    scaled /= 1000;
    unit = next;
    if (Math.abs(scaled) < 1000) {
      break;
    }
  }

  return `${scaled >= 100 ? scaled.toFixed(0) : scaled >= 10 ? scaled.toFixed(1) : scaled.toFixed(2)}${unit}`;
}

function formatTime(seconds) {
  const safe = Math.max(0, seconds);
  if (safe < 60) {
    return `${Math.ceil(safe)}s`;
  }

  const minutes = Math.floor(safe / 60);
  const rest = Math.ceil(safe % 60);
  return `${minutes}m ${String(rest).padStart(2, "0")}s`;
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function weightedPick(entries) {
  const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight ?? entry[1]), 0);
  let roll = Math.random() * total;

  for (const entry of entries) {
    const weight = Math.max(0, entry.weight ?? entry[1]);
    roll -= weight;
    if (roll <= 0) {
      return entry.value ?? entry[0];
    }
  }

  const last = entries[entries.length - 1];
  return last.value ?? last[0];
}

function titleCase(text) {
  return text.replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function cloneCost(cost) {
  return Object.fromEntries(Object.entries(cost).map(([id, amount]) => [id, Math.ceil(amount)]));
}

window.VoidMinerUtils = {
  clamp,
  formatNumber,
  formatTime,
  randomRange,
  weightedPick,
  titleCase,
  cloneCost
};
})();
