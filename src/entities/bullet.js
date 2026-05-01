"use strict";

window.Bullet = class Bullet {
  constructor(x, y, vx, vy, life, damage, options = {}) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.damage = damage;
    this.radius = options.radius ?? 4;
    this.color = options.color ?? "#ffd76d";
    this.glow = options.glow ?? "rgba(255, 203, 82, 0.9)";
    this.hitsPlatforms = options.hitsPlatforms ?? CONFIG.player.bulletHitsPlatforms;
    this.alive = true;
  }

  update(dt) {
    this.life -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.hitsPlatforms) {
      for (const platform of platforms) {
        if (circleIntersectsRect(this.x, this.y, this.radius, platform)) {
          this.alive = false;
          return;
        }
      }
    }

    if (
      this.life <= 0 ||
      this.x < -20 ||
      this.x > CONFIG.canvas.width + 20 ||
      this.y < -20 ||
      this.y > CONFIG.canvas.height + 20
    ) {
      this.alive = false;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.glow;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

window.EnemyBullet = class EnemyBullet {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = CONFIG.enemy.bulletLife;
    this.damage = CONFIG.enemy.bulletDamage;
    this.radius = CONFIG.enemy.bulletRadius;
    this.alive = true;
  }

  update(dt) {
    this.life -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (
      this.life <= 0 ||
      this.x < -30 ||
      this.x > CONFIG.canvas.width + 30 ||
      this.y < -30 ||
      this.y > CONFIG.canvas.height + 30
    ) {
      this.alive = false;
      return;
    }

    if (CONFIG.enemy.bulletHitsPlatforms) {
      for (const platform of platforms) {
        if (circleIntersectsRect(this.x, this.y, this.radius, platform)) {
          this.alive = false;
          return;
        }
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = "#ff7b89";
    ctx.shadowBlur = 12;
    ctx.shadowColor = "rgba(255, 91, 117, 0.85)";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};
