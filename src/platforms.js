"use strict";

window.createPlatforms = function createPlatforms(config) {
  const layouts = [
    { x: 0, y: config.world.floorY, width: config.canvas.width, height: config.canvas.height - config.world.floorY, type: "floor" },
    { x: 170, y: 610, width: 260, height: 18, type: "platform" },
    { x: 360, y: 475, width: 180, height: 18, type: "platform" },
    { x: 630, y: 360, width: 190, height: 18, type: "platform" },
    { x: 915, y: 490, width: 180, height: 18, type: "platform" },
    { x: 1085, y: 620, width: 270, height: 18, type: "platform" },
  ];

  if (config.mode.type === "duel") {
    return layouts.filter((platform) => !(platform.type === "platform" && (platform.y >= 620 || (platform.x === 170 && platform.y === 610))));
  }

  return layouts;
};

