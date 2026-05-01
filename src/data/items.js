"use strict";

window.ITEM_DEFS = {
  weaponCache: {
    id: "weaponCache",
    label: "Weapon Cache",
    description: "Each pickup adds one W cache point toward the next weapon stage.",
    kind: "weapon",
    weaponXp: 1,
    color: "#ffb870",
    glow: "rgba(255, 166, 96, 0.9)",
  },
  airDashModule: {
    id: "airDashModule",
    label: "Mobility Chip",
    description: "Unlocks the next air action in sequence.",
    kind: "ability",
    ability: "airDash",
    color: "#77f4d7",
    glow: "rgba(119, 244, 215, 0.88)",
  },
  repairPack: {
    id: "repairPack",
    label: "Repair Pack",
    description: "Restores a small amount of HP.",
    kind: "health",
    healAmount: 26,
    color: "#8bff98",
    glow: "rgba(144, 255, 161, 0.9)",
  },
};
