"use strict";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const menuOverlay = document.getElementById("menuOverlay");
const startButton = document.getElementById("startButton");
const presetButtons = Array.from(document.querySelectorAll("[data-preset]"));
const presetSummary = document.getElementById("presetSummary");
const hint = document.getElementById("hint");

window.CONFIG = createConfig("standard");
canvas.width = CONFIG.canvas.width;
canvas.height = CONFIG.canvas.height;
window.platforms = createPlatforms(CONFIG);
window.game = null;

const appState = {
  screen: "title",
  presetKey: "standard",
};

function updatePresetSummary() {
  const preset = CONFIG_PRESETS[appState.presetKey];
  const startingWeapon = WEAPON_PROGRESSION[0];
  presetSummary.innerHTML = `
    <p class="preset-summary-title">${preset.label} Loadout</p>
    <p class="preset-summary-copy">${preset.description}</p>
    <p class="preset-summary-copy">Mode ${CONFIG.mode.type === "duel" ? "1v1 Duel" : "Survival"} / Boost ${CONFIG.boost.max} / Roll ${CONFIG.roll.duration.toFixed(2)}s / Melee ${CONFIG.melee.damage} / Enemy Fire ${CONFIG.enemy.shootIntervalMin.toFixed(1)}-${CONFIG.enemy.shootIntervalMax.toFixed(1)}s</p>
    <p class="preset-summary-copy">Starter weapon ${startingWeapon.label} / W Cache upgrades the gun every ${CONFIG.weaponProgression.pickupsPerLevel} pickups</p>
    <p class="preset-summary-copy">Starter bullets ${startingWeapon.bulletHitsPlatforms ? "collide with" : "pass through"} platforms / Enemy bullets ${CONFIG.enemy.bulletHitsPlatforms ? "collide with" : "pass through"} platforms</p>
  `;
}

function applyPreset(presetKey) {
  appState.presetKey = presetKey;
  window.CONFIG = createConfig(presetKey);
  canvas.width = CONFIG.canvas.width;
  canvas.height = CONFIG.canvas.height;
  window.platforms = createPlatforms(CONFIG);

  for (const button of presetButtons) {
    button.classList.toggle("is-active", button.dataset.preset === presetKey);
  }

  updatePresetSummary();
}

function showTitle() {
  appState.screen = "title";
  menuOverlay.classList.remove("is-hidden");
  hint.textContent = "Choose a preset and start";
}

function hideTitle() {
  menuOverlay.classList.add("is-hidden");
  hint.textContent = "Click to focus";
}

function startGame() {
  if (appState.screen === "playing") {
    return;
  }

  window.CONFIG = createConfig(appState.presetKey);
  canvas.width = CONFIG.canvas.width;
  canvas.height = CONFIG.canvas.height;
  window.platforms = createPlatforms(CONFIG);
  window.game = new Game();
  appState.screen = "playing";
  hideTitle();
}

function restartGame() {
  if (!window.game) {
    startGame();
    return;
  }

  window.game = new Game();
  appState.screen = "playing";
  hideTitle();
}

for (const button of presetButtons) {
  button.addEventListener("click", () => {
    applyPreset(button.dataset.preset);
  });
}

startButton.addEventListener("click", startGame);

setupInput(canvas, {
  onStart() {
    if (appState.screen === "title") {
      startGame();
    }
  },
  onRestart() {
    if (appState.screen === "playing" && window.game && window.game.gameOver) {
      restartGame();
    }
  },
  onMenu() {
    if (appState.screen === "playing") {
      showTitle();
    }
  },
});

applyPreset(appState.presetKey);
showTitle();

let lastTime = performance.now();
requestAnimationFrame(loop);

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 1 / 30);
  lastTime = timestamp;

  if (appState.screen === "playing" && window.game) {
    window.game.update(dt);
    renderGame(ctx, window.game);
  } else {
    drawMenuScene(ctx);
  }

  clearPressedInputs();
  requestAnimationFrame(loop);
}



