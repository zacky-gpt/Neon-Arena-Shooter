"use strict";

window.Pickup = class Pickup {
  constructor(itemId, x, y) {
    this.itemId = itemId;
    this.definition = ITEM_DEFS[itemId];
    this.x = x;
    this.y = y;
    this.width = 34;
    this.height = 34;
    this.vx = randomRange(-50, 50);
    this.vy = -180;
    this.alive = true;
    this.bobTimer = 0;
    this.onGround = false;
  }

  get centerX() {
    return this.x + this.width / 2;
  }

  get centerY() {
    return this.y + this.height / 2;
  }

  update(dt) {
    this.bobTimer += dt;

    if (!this.onGround) {
      this.vy += CONFIG.world.gravity * dt;
      this.vy = Math.min(this.vy, CONFIG.player.maxFallSpeed * 0.7);
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.resolveWorldCollisions();
    }
  }

  resolveWorldCollisions() {
    for (const platform of platforms) {
      if (!rectsOverlap(this, platform)) {
        continue;
      }

      if (this.vy >= 0 && this.y + this.height <= platform.y + this.height + 12) {
        this.y = platform.y - this.height;
        this.vy = 0;
        this.vx *= 0.5;
        this.onGround = true;
        return;
      }
    }

    this.x = clamp(this.x, CONFIG.world.arenaPadding, CONFIG.canvas.width - this.width - CONFIG.world.arenaPadding);
  }

  getGlyph() {
    if (this.definition.kind === "weapon") {
      return "W";
    }
    if (this.definition.kind === "ability") {
      return "A";
    }
    if (this.definition.kind === "health") {
      return "+";
    }
    return "?";
  }

  draw(ctx) {
    const bobOffset = this.onGround ? Math.sin(this.bobTimer * 4) * 4 : 0;
    const drawX = this.x;
    const drawY = this.y + bobOffset;

    ctx.save();
    ctx.fillStyle = this.definition.color;
    ctx.shadowBlur = 18;
    ctx.shadowColor = this.definition.glow;
    roundRect(ctx, drawX, drawY, this.width, this.height, 10);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.font = "bold 16px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.getGlyph(), drawX + this.width / 2, drawY + this.height / 2 + 1);
    ctx.restore();
  }
};
