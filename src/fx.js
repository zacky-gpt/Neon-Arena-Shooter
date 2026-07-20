"use strict";

// Screen-level game feel effects: shake, hit stop, flashes, popups, afterimages, ambient embers.
window.fx = {
  shakeTimer: 0,
  shakeDuration: 0,
  shakePower: 0,
  hitStopTimer: 0,
  damageFlashTimer: 0,
  popups: [],
  ghosts: [],
  embers: [],
  emberSpawnTimer: 0,

  reset() {
    this.shakeTimer = 0;
    this.shakeDuration = 0;
    this.shakePower = 0;
    this.hitStopTimer = 0;
    this.damageFlashTimer = 0;
    this.popups = [];
    this.ghosts = [];
  },

  shake(power, duration) {
    if (power >= this.shakePower || this.shakeTimer <= 0) {
      this.shakePower = power;
      this.shakeTimer = duration;
      this.shakeDuration = duration;
    }
  },

  hitStop(duration) {
    this.hitStopTimer = Math.max(this.hitStopTimer, duration);
  },

  damageFlash(duration = 0.26) {
    this.damageFlashTimer = Math.max(this.damageFlashTimer, duration);
  },

  // Hit stop plays as brief slow motion rather than a full freeze
  applyHitStop(dt) {
    return this.hitStopTimer > 0 ? dt * 0.14 : dt;
  },

  spawnPopup(x, y, text, options = {}) {
    const life = options.life ?? 0.55;
    this.popups.push({
      x: x + randomRange(-5, 5),
      y,
      vy: options.rise ?? -66,
      text,
      color: options.color || "#ffffff",
      size: options.size || 12,
      bold: options.bold || false,
      life,
      maxLife: life,
    });

    if (this.popups.length > 40) {
      this.popups.shift();
    }
  },

  spawnGhost(rect, color = "96, 224, 255") {
    this.ghosts.push({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      color,
      life: 0.22,
      maxLife: 0.22,
    });

    if (this.ghosts.length > 60) {
      this.ghosts.shift();
    }
  },

  update(dt) {
    this.hitStopTimer = Math.max(0, this.hitStopTimer - dt);
    this.damageFlashTimer = Math.max(0, this.damageFlashTimer - dt);

    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      if (this.shakeTimer <= 0) {
        this.shakePower = 0;
      }
    }

    for (const popup of this.popups) {
      popup.life -= dt;
      popup.y += popup.vy * dt;
      popup.vy *= 1 - 2.4 * dt;
    }
    this.popups = this.popups.filter((popup) => popup.life > 0);

    for (const ghost of this.ghosts) {
      ghost.life -= dt;
    }
    this.ghosts = this.ghosts.filter((ghost) => ghost.life > 0);

    this.emberSpawnTimer -= dt;
    if (this.emberSpawnTimer <= 0 && this.embers.length < 34) {
      this.emberSpawnTimer = randomRange(0.14, 0.34);
      this.embers.push({
        x: randomRange(0, CONFIG.canvas.width),
        y: CONFIG.canvas.height + 12,
        speed: randomRange(16, 52),
        sway: randomRange(8, 26),
        phase: randomRange(0, Math.PI * 2),
        radius: randomRange(1, 2.6),
        alpha: randomRange(0.1, 0.34),
        color: Math.random() < 0.68 ? "140, 220, 255" : "255, 172, 194",
      });
    }

    for (const ember of this.embers) {
      ember.y -= ember.speed * dt;
      ember.phase += dt * 1.4;
    }
    this.embers = this.embers.filter((ember) => ember.y > -14);
  },

  getShakeOffset() {
    if (this.shakeTimer <= 0 || this.shakeDuration <= 0) {
      return { x: 0, y: 0 };
    }

    const falloff = this.shakeTimer / this.shakeDuration;
    const power = this.shakePower * falloff;
    return {
      x: randomRange(-power, power),
      y: randomRange(-power, power),
    };
  },

  drawEmbers(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const ember of this.embers) {
      const x = ember.x + Math.sin(ember.phase) * ember.sway;
      ctx.fillStyle = `rgba(${ember.color}, ${ember.alpha})`;
      ctx.beginPath();
      ctx.arc(x, ember.y, ember.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  drawGhosts(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const ghost of this.ghosts) {
      const ratio = ghost.life / ghost.maxLife;
      ctx.fillStyle = `rgba(${ghost.color}, ${0.22 * ratio})`;
      roundRect(ctx, ghost.x, ghost.y, ghost.width, ghost.height, 10);
      ctx.fill();
    }
    ctx.restore();
  },

  drawPopups(ctx) {
    ctx.save();
    ctx.textAlign = "center";
    for (const popup of this.popups) {
      const ratio = popup.life / popup.maxLife;
      // Quick pop-in scale, then fade out
      const appear = clamp((popup.maxLife - popup.life) / 0.08, 0, 1);
      const size = popup.size * (0.6 + appear * 0.4);
      ctx.globalAlpha = Math.min(1, ratio * 2);
      ctx.font = `${popup.bold ? "bold " : ""}${Math.round(size)}px 'Segoe UI', sans-serif`;
      ctx.fillStyle = "rgba(4, 8, 12, 0.65)";
      ctx.fillText(popup.text, popup.x + 1, popup.y + 1);
      ctx.fillStyle = popup.color;
      ctx.fillText(popup.text, popup.x, popup.y);
    }
    ctx.restore();
  },
};
