"use strict";

window.drawBackground = function drawBackground(ctx) {
  ctx.clearRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

  const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.canvas.height);
  gradient.addColorStop(0, "#132131");
  gradient.addColorStop(0.55, "#09121d");
  gradient.addColorStop(1, "#04070b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

  ctx.save();
  ctx.strokeStyle = "rgba(103, 179, 255, 0.09)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= CONFIG.canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CONFIG.canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= CONFIG.canvas.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CONFIG.canvas.width, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = "rgba(33, 55, 75, 0.8)";
  ctx.fillRect(120, 180, 170, 340);
  ctx.fillRect(980, 130, 120, 420);
  ctx.fillRect(805, 240, 60, 310);
  ctx.fillStyle = "rgba(67, 103, 133, 0.14)";
  ctx.fillRect(0, 560, CONFIG.canvas.width, 160);
};

window.drawPlatforms = function drawPlatforms(ctx) {
  for (const platform of platforms) {
    if (platform.type === "floor") {
      const floorGradient = ctx.createLinearGradient(0, platform.y, 0, CONFIG.canvas.height);
      floorGradient.addColorStop(0, "#172b3d");
      floorGradient.addColorStop(1, "#0b1219");
      ctx.fillStyle = floorGradient;
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      continue;
    }

    ctx.fillStyle = "#29455d";
    roundRect(ctx, platform.x, platform.y, platform.width, platform.height, 7);
    ctx.fill();

    ctx.fillStyle = "rgba(111, 201, 255, 0.22)";
    ctx.fillRect(platform.x + 6, platform.y + 4, platform.width - 12, 4);
  }
};

window.drawUi = function drawUi(ctx, game) {
  const hpRatio = game.player.hp / CONFIG.player.maxHp;
  const boostRatio = game.player.boost / CONFIG.boost.max;
  const boostLocked = game.player.boostLockTimer > 0;
  const weapon = game.player.currentWeapon;
  const weaponProgress = game.player.getWeaponProgress();
  const weaponRatio = weaponProgress.isMax ? 1 : weaponProgress.current / weaponProgress.needed;
  const tokens = game.player.getActionTokens();
  const comboMultiplier = game.getMovementComboMultiplier();
  const enemyLevel = game.getEnemyLevel();
  const panelY = CONFIG.canvas.height - 84;
  const panelHeight = 80;
  const scoreX = CONFIG.canvas.width - 252;

  ctx.save();
  ctx.font = "13px 'Segoe UI', sans-serif";
  ctx.fillStyle = "rgba(220, 233, 246, 0.72)";
  ctx.fillText("A/D Move   Shift Roll/AirDash   Shift+W DoubleJump/HighJump   Shift+S Dive   W/Space Jump   Hold Space Boost   LMB Fire   RMB Kick   R Restart   Esc Title", 28, 22);

  ctx.fillStyle = "rgba(5, 10, 16, 0.8)";
  roundRect(ctx, 16, panelY, CONFIG.canvas.width - 32, panelHeight, 18);
  ctx.fill();

  ctx.fillStyle = "#dce9f6";
  ctx.font = "bold 15px 'Segoe UI', sans-serif";
  ctx.fillText("HP", 28, panelY + 21);
  ctx.fillText("BOOST", 28, panelY + 43);
  ctx.fillText("W CORE", 28, panelY + 65);

  drawBar(ctx, 92, panelY + 6, 220, CONFIG.ui.barHeight, hpRatio, "#ff6170", "#66242f");
  drawBar(ctx, 92, panelY + 28, 220, CONFIG.ui.barHeight, boostRatio, boostLocked ? "#ffc14d" : "#47ddff", boostLocked ? "#52411b" : "#17384a");
  drawBar(ctx, 92, panelY + 50, 220, CONFIG.ui.barHeight, weaponRatio, weaponProgress.isMax ? "#8ef3ff" : "#ffb870", weaponProgress.isMax ? "#1a4250" : "#4d3320");

  ctx.font = "12px 'Segoe UI', sans-serif";
  ctx.fillStyle = "rgba(220, 233, 246, 0.78)";
  ctx.fillText(boostLocked ? `Cooldown ${game.player.boostLockTimer.toFixed(1)}s` : "Boost ready", 92, panelY + 76);
  ctx.fillText(weaponProgress.isMax ? "Stage MAX" : `${weaponProgress.current}/${weaponProgress.needed} caches to next stage`, 92, panelY + 66);

  ctx.fillStyle = "rgba(220, 233, 246, 0.92)";
  ctx.font = "14px 'Segoe UI', sans-serif";
  ctx.fillText(`Ranged  ${weapon.label}`, 350, panelY + 21);
  ctx.fillText(`Stage  ${game.player.weaponStage + 1}/${game.player.weaponStageCount}   Damage ${weapon.projectileDamage}   Fire ${weapon.fireRate.toFixed(2)}s`, 350, panelY + 43);
  ctx.fillText(`Melee  ${game.player.meleeWeaponLabel}`, 350, panelY + 65);

  ctx.fillStyle = "rgba(220, 233, 246, 0.86)";
  ctx.fillText("Actions", 760, panelY + 21);
  drawActionTokens(ctx, 760, panelY + 28, tokens);

  ctx.fillStyle = game.movementComboCount > 1 ? "#9ef7ff" : "rgba(220, 233, 246, 0.5)";
  ctx.font = game.movementComboCount > 1 ? "bold 14px 'Segoe UI', sans-serif" : "12px 'Segoe UI', sans-serif";
  ctx.fillText(game.movementComboCount > 0 ? `MOVE COMBO x${game.movementComboCount}  ${comboMultiplier.toFixed(2)}x shot` : "MOVE COMBO idle", 760, panelY + 68);

  ctx.fillStyle = "#dce9f6";
  ctx.font = "bold 18px 'Segoe UI', sans-serif";
  ctx.fillText(`SCORE  ${String(game.score).padStart(5, "0")}`, scoreX, panelY + 27);
  ctx.fillText(`TIME  ${formatTime(game.elapsed)}`, scoreX, panelY + 53);
  ctx.font = "bold 16px 'Segoe UI', sans-serif";
  ctx.fillText(`LEVEL  ${enemyLevel}`, scoreX, panelY + 76);
  ctx.restore();
};

window.drawActionTokens = function drawActionTokens(ctx, startX, y, tokens) {
  let x = startX;
  for (const token of tokens) {
    let fill = "rgba(90, 104, 120, 0.5)";
    let stroke = "rgba(165, 176, 190, 0.35)";
    let text = "rgba(194, 205, 218, 0.72)";

    if (token.unlocked) {
      fill = token.ready ? "rgba(52, 114, 134, 0.72)" : "rgba(102, 78, 38, 0.7)";
      stroke = token.ready ? "rgba(98, 228, 255, 0.62)" : "rgba(255, 196, 92, 0.52)";
      text = token.ready ? "#dffaff" : "#ffe0a6";
    }

    if (token.active) {
      fill = "rgba(56, 156, 116, 0.78)";
      stroke = "rgba(130, 255, 206, 0.8)";
      text = "#ecfff5";
    }

    ctx.fillStyle = fill;
    roundRect(ctx, x, y, 52, 24, 8);
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, 52, 24, 8);
    ctx.stroke();
    ctx.fillStyle = text;
    ctx.font = "bold 12px 'Segoe UI', sans-serif";
    ctx.fillText(token.label, x + 14, y + 16);
    x += 58;
  }
};

window.drawBar = function drawBar(ctx, x, y, width, height, ratio, color, bgColor) {
  ctx.fillStyle = bgColor;
  roundRect(ctx, x, y, width, height, height / 2);
  ctx.fill();

  ctx.fillStyle = color;
  roundRect(ctx, x, y, width * clamp(ratio, 0, 1), height, height / 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(240, 248, 255, 0.18)";
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, width, height, height / 2);
  ctx.stroke();
};

window.drawCrosshair = function drawCrosshair(ctx) {
  if (!input.pointerActive) {
    return;
  }

  ctx.save();
  ctx.translate(input.mouseX, input.mouseY);
  ctx.strokeStyle = "#d9fbff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(-4, 0);
  ctx.moveTo(4, 0);
  ctx.lineTo(12, 0);
  ctx.moveTo(0, -12);
  ctx.lineTo(0, -4);
  ctx.moveTo(0, 4);
  ctx.lineTo(0, 12);
  ctx.stroke();

  ctx.strokeStyle = "rgba(71, 221, 255, 0.45)";
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
};

window.drawGameOver = function drawGameOver(ctx, game) {
  ctx.save();
  ctx.fillStyle = "rgba(1, 3, 6, 0.6)";
  ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffced4";
  ctx.font = "bold 54px 'Segoe UI', sans-serif";
  ctx.fillText("GAME OVER", CONFIG.canvas.width / 2, 270);

  ctx.fillStyle = "#dce9f6";
  ctx.font = "24px 'Segoe UI', sans-serif";
  ctx.fillText(`Final Score: ${game.score}`, CONFIG.canvas.width / 2, 324);
  ctx.fillText(`Survival Time: ${formatTime(game.elapsed)}`, CONFIG.canvas.width / 2, 360);

  ctx.font = "20px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#7ee8ff";
  ctx.fillText("Press R to restart or Esc for title", CONFIG.canvas.width / 2, 418);
  ctx.restore();
};

window.drawMenuScene = function drawMenuScene(ctx) {
  drawBackground(ctx);
  drawPlatforms(ctx);

  ctx.save();
  ctx.translate(310, 520);
  ctx.fillStyle = "#38a8ff";
  roundRect(ctx, -18, -52, 36, 42, 10);
  ctx.fill();
  ctx.fillStyle = "#58d2ff";
  roundRect(ctx, -14, -10, 12, 28, 7);
  roundRect(ctx, 2, -10, 12, 28, 7);
  ctx.fill();
  ctx.fillStyle = "#bcefff";
  ctx.beginPath();
  ctx.arc(0, -68, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(945, 548);
  ctx.fillStyle = "#ed435e";
  roundRect(ctx, -16, -54, 32, 42, 10);
  ctx.fill();
  ctx.fillStyle = "#ff8391";
  roundRect(ctx, -12, -12, 10, 26, 7);
  roundRect(ctx, 2, -12, 10, 26, 7);
  ctx.fill();
  ctx.fillStyle = "#ffd2d8";
  ctx.beginPath();
  ctx.arc(0, -69, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(76, 221, 255, 0.16)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(860, 220, 110, 0.3, 2.6);
  ctx.stroke();
  ctx.restore();
};

window.drawSpawnWarnings = function drawSpawnWarnings(ctx, game) {
  if (!game.pendingSpawns || game.pendingSpawns.length === 0) {
    return;
  }

  for (const pending of game.pendingSpawns) {
    const ratio = clamp(pending.timer / pending.duration, 0, 1);
    const pulse = 1 + Math.sin((1 - ratio) * 18) * 0.18;
    const width = pending.type === "drone" ? 52 : 64;
    const height = pending.type === "drone" ? 52 : 80;
    const color = pending.type === "drone" ? "rgba(120, 238, 255, 0.82)" : pending.type === "standoff" ? "rgba(255, 208, 132, 0.82)" : "rgba(255, 118, 140, 0.84)";

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.globalAlpha = 0.45 + (1 - ratio) * 0.45;
    roundRect(ctx, pending.x - 8, pending.y - 8, width * pulse, height * pulse, 12);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.font = "bold 12px 'Segoe UI', sans-serif";
    ctx.fillText(pending.type === "drone" ? "DRN" : pending.type === "standoff" ? "SHT" : "WRN", pending.x + width * 0.18, pending.y - 14);
    ctx.restore();
  }
};

window.drawEnemyHpBar = function drawEnemyHpBar(ctx, enemy) {
  const bar = enemy.getHpBarRect();
  const ratio = clamp(enemy.hp / enemy.maxHp, 0, 1);

  ctx.save();
  ctx.fillStyle = "rgba(8, 12, 18, 0.76)";
  roundRect(ctx, bar.x - 1, bar.y - 1, bar.width + 2, bar.height + 2, 4);
  ctx.fill();

  ctx.fillStyle = enemy.type === "rival" ? "#79ffd8" : enemy.type === "drone" ? "#81f2ff" : enemy.type === "standoff" ? "#ffd18c" : "#ff8d9c";
  roundRect(ctx, bar.x, bar.y, bar.width * ratio, bar.height, 3);
  ctx.fill();
  ctx.restore();
};

window.renderGame = function renderGame(ctx, game) {
  drawBackground(ctx);
  drawPlatforms(ctx);
  drawSpawnWarnings(ctx, game);

  for (const particle of game.particles) {
    particle.draw(ctx);
  }

  for (const pickup of game.pickups) {
    pickup.draw(ctx);
  }

  for (const bullet of game.bullets) {
    bullet.draw(ctx);
  }

  for (const bullet of game.enemyBullets) {
    bullet.draw(ctx);
  }

  for (const enemy of game.enemies) {
    enemy.draw(ctx);
    drawEnemyHpBar(ctx, enemy);
  }

  game.player.draw(ctx);
  drawCrosshair(ctx);
  drawUi(ctx, game);

  if (game.gameOver) {
    drawGameOver(ctx, game);
  }
};
