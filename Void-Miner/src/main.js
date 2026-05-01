(() => {
const { VoidMinerGame } = window.VoidMinerGame;
const { loadState } = window.VoidMinerState;
const { VoidMinerUI } = window.VoidMinerUI;

const game = new VoidMinerGame(loadState());
const ui = new VoidMinerUI(game);

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  game.tick(dt);
  ui.drawBackground(dt);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

window.voidMiner = {
  game,
  ui
};
})();
