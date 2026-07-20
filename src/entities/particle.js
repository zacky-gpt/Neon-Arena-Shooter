"use strict";

window.Particle = class Particle {
  constructor({ x, y, vx, vy, radius, life, color, shape = "dot", gravity = 320, growth = 0 }) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.life = life;
    this.maxLife = life;
    this.color = color;
    this.shape = shape;
    this.gravity = gravity;
    this.growth = growth;
  }

  update(dt) {
    this.life -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.radius += this.growth * dt;
  }

  draw(ctx) {
    if (this.life <= 0) {
      return;
    }

    const ratio = this.life / this.maxLife;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    if (this.shape === "ring") {
      // Expanding shockwave ring
      ctx.globalAlpha = ratio * 0.85;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(1, 4.5 * ratio);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (this.shape === "spark") {
      // Thin streak aligned with velocity
      const speed = Math.hypot(this.vx, this.vy) || 1;
      const lengthScale = this.radius * 3.2 / speed;
      ctx.globalAlpha = ratio;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(1, this.radius * 0.5);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(this.x - this.vx * lengthScale, this.y - this.vy * lengthScale);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
      ctx.restore();
      return;
    }

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
