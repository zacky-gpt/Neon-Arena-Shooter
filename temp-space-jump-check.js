const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = process.cwd();
const scriptPaths = [
  "src/config.js",
  "src/data/weapons.js",
  "src/data/items.js",
  "src/platforms.js",
  "src/utils.js",
  "src/input.js",
  "src/entities/particle.js",
  "src/entities/bullet.js",
  "src/entities/enemy.js",
  "src/entities/pickup.js",
  "src/entities/player.js",
  "src/game.js",
  "src/render.js",
  "src/main.js",
];

const listeners = {};
const elements = new Map();
function createStubElement() {
  return {
    classList: { add() {}, remove() {}, toggle() {} },
    dataset: {},
    innerHTML: "",
    textContent: "",
    addEventListener(type, handler) {
      if (!listeners[type]) {
        listeners[type] = [];
      }
      listeners[type].push(handler);
    },
    getContext() { return ctx; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 720 }; },
  };
}

const ctx = {
  save() {}, restore() {}, clearRect() {}, fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
  stroke() {}, fill() {}, arc() {}, translate() {}, rotate() {}, quadraticCurveTo() {}, closePath() {}, fillText() {},
  createLinearGradient() { return { addColorStop() {} }; },
  set fillStyle(v) {}, set strokeStyle(v) {}, set lineWidth(v) {}, set shadowBlur(v) {}, set shadowColor(v) {},
  set font(v) {}, set textAlign(v) {}, set textBaseline(v) {},
};

const presetButtons = [createStubElement(), createStubElement(), createStubElement()];
presetButtons[0].dataset.preset = "standard";
presetButtons[1].dataset.preset = "mobility";
presetButtons[2].dataset.preset = "siege";

const canvas = createStubElement();
canvas.width = 1280;
canvas.height = 720;

const context = {
  console,
  Math,
  Date,
  JSON,
  performance: { now: () => 0 },
  requestAnimationFrame(fn) { context.__raf = fn; },
  window: null,
  document: {
    getElementById(id) {
      if (!elements.has(id)) {
        elements.set(id, id === "gameCanvas" ? canvas : createStubElement());
      }
      return elements.get(id);
    },
    querySelectorAll(selector) {
      return selector === "[data-preset]" ? presetButtons : [];
    },
  },
  addEventListener(type, handler) {
    if (!listeners[type]) {
      listeners[type] = [];
    }
    listeners[type].push(handler);
  },
  removeEventListener() {},
  setTimeout,
  clearTimeout,
};
context.window = context;
context.global = context;
vm.createContext(context);

for (const relativePath of scriptPaths) {
  const code = fs.readFileSync(path.join(root, relativePath), "utf8");
  vm.runInContext(code, context, { filename: relativePath });
}

function dispatch(type, event) {
  for (const handler of listeners[type] || []) {
    handler({ preventDefault() {}, ...event });
  }
}

function resetInput() {
  context.input.left = false;
  context.input.right = false;
  context.input.jump = false;
  context.input.jumpPressed = false;
  context.input.boost = false;
  context.input.shift = false;
  context.input.shiftPressed = false;
  context.input.fire = false;
  context.input.meleePressed = false;
}

context.startGame();

context.game = new context.Game();
resetInput();
let player = context.game.player;
player.onGround = true;
player.vy = 0;
dispatch("keydown", { code: "KeyW", repeat: false });
player.update(1 / 60, context.game);
if (player.vy >= 0 || player.boost !== context.CONFIG.boost.max) {
  throw new Error(`W jump failed: vy=${player.vy}, boost=${player.boost}`);
}
dispatch("keyup", { code: "KeyW" });

context.game = new context.Game();
resetInput();
player = context.game.player;
player.onGround = true;
player.vy = 0;
dispatch("keydown", { code: "Space", repeat: false });
player.update(1 / 60, context.game);
if (player.vy >= 0) {
  throw new Error(`Space jump failed: vy=${player.vy}`);
}
if (player.boost >= context.CONFIG.boost.max) {
  throw new Error("Space did not consume boost gauge");
}
dispatch("keyup", { code: "Space" });

context.game = new context.Game();
resetInput();
dispatch("keydown", { code: "Space", repeat: false });
dispatch("keydown", { code: "KeyW", repeat: false });
dispatch("keyup", { code: "Space" });
if (!context.input.jump) {
  throw new Error("Jump state was lost while W remained held");
}
dispatch("keyup", { code: "KeyW" });
if (context.input.jump) {
  throw new Error("Jump state stuck after key releases");
}

console.log("W/Space jump and Space boost input check passed");
