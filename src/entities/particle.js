"use strict";

window.Particle = class Particle {
  constructor({ x, y, vx, vy, radius, life, color }) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.life = life;
    this.maxLife = life;
    this.color = color;
  }

  update(dt) {
    this.life -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += 320 * dt;
  }

  draw(ctx) {
    if (this.life <= 0) {
      return;
    }

    const ratio = this.life / this.maxLife;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    // Soft outer glow that expands slightly as the particle dies
    ctx.globalAlpha = ratio * 0.35;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * (1.8 + (1 - ratio) * 1.2), 0, Math.PI * 2);
    ctx.fill();

    // Bright core that shrinks as it fades
    ctx.globalAlpha = ratio;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * (0.4 + ratio * 0.6), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};
