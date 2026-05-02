"use strict";

window.Enemy = class Enemy {
  constructor(x, y, speedBonus, stats = {}) {
    this.type = stats.type || "charger";
    this.width = this.type === "drone" ? 40 : this.type === "rival" ? CONFIG.player.width : CONFIG.enemy.width;
    this.height = this.type === "drone" ? 40 : this.type === "rival" ? CONFIG.player.height : CONFIG.enemy.height;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.maxHp = stats.maxHp ?? CONFIG.enemy.baseHp ?? CONFIG.enemy.maxHp;
    this.hp = this.maxHp;
    this.defeated = false;
    this.speed = (CONFIG.enemy.baseSpeed + speedBonus) * (this.type === "standoff" ? 0.88 : this.type === "drone" ? 0.94 : this.type === "rival" ? 1.18 : 1);
    this.contactCooldown = 0;
    this.contactDisabledTimer = 0;
    const rivalShootMultiplier = CONFIG.mode.type === "duel" ? CONFIG.duel.rivalShootMultiplier : 0.82;
    this.shootCooldown = randomRange(CONFIG.enemy.shootIntervalMin, CONFIG.enemy.shootIntervalMax) * (this.type === "charger" ? 1.05 : this.type === "standoff" ? 0.9 : this.type === "rival" ? rivalShootMultiplier : 0.82);
    this.onGround = false;
    this.hoverPhase = randomRange(0, Math.PI * 2);
    this.preferredDistance = this.type === "charger" ? 0 : (this.type === "standoff" ? randomRange(300, 430) : this.type === "rival" ? randomRange(200, 300) : randomRange(200, 300));
    this.jumpCooldown = randomRange(0.35, 0.8);
    this.dashCooldown = randomRange(0.7, 1.1);
    this.rivalRollTimer = 0;
    this.rivalRollDirection = 1;
    this.rivalRollCooldown = randomRange(CONFIG.duel.rivalRollCooldownMin, CONFIG.duel.rivalRollCooldownMax);
  }

  get centerX() {
    return this.x + this.width / 2;
  }

  get centerY() {
    return this.y + this.height / 2;
  }

  update(dt, player, game) {
    this.contactCooldown -= dt;
    this.contactDisabledTimer = Math.max(0, this.contactDisabledTimer - dt);
    this.shootCooldown -= dt;

    this.jumpCooldown -= dt;
    this.dashCooldown -= dt;
    this.rivalRollCooldown -= dt;
    this.rivalRollTimer = Math.max(0, this.rivalRollTimer - dt);

    if (this.type === "drone") {
      this.updateDrone(dt, player);
    } else if (this.type === "rival") {
      this.updateRival(dt, player);
    } else {
      this.updateGroundEnemy(dt, player);
    }

    this.tryShoot(player, game);
  }

  updateGroundEnemy(dt, player) {
    const direction = Math.sign(player.centerX - this.centerX) || 1;
    const distanceX = Math.abs(player.centerX - this.centerX);
    let desiredSpeed = direction * this.speed;

    if (this.type === "standoff") {
      if (distanceX < this.preferredDistance * 0.75) {
        desiredSpeed = -direction * this.speed * 0.95;
      } else if (distanceX > this.preferredDistance * 1.15) {
        desiredSpeed = direction * this.speed * 0.8;
      } else {
        desiredSpeed = 0;
      }
    } else if (distanceX < 110) {
      desiredSpeed = direction * 45;
    }

    this.vx = moveToward(this.vx, desiredSpeed, 1800 * dt);

    if (!this.onGround && player.y + player.height < this.y - 40) {
      this.vy -= 180 * dt;
    }

    this.vy += CONFIG.world.gravity * dt;
    this.vy = Math.min(this.vy, CONFIG.player.maxFallSpeed);

    this.x += this.vx * dt;
    this.resolveHorizontalCollisions();
    this.constrainToArenaHorizontal();

    const oldY = this.y;
    const verticalSpeed = this.vy;
    this.y += this.vy * dt;
    this.resolveVerticalCollisions(oldY, verticalSpeed);
  }

  updateRival(dt, player) {
    const direction = Math.sign(player.centerX - this.centerX) || 1;
    const distanceX = Math.abs(player.centerX - this.centerX);

    if (this.rivalRollTimer > 0) {
      this.updateRivalRoll(dt);
      return;
    }

    let desiredSpeed = direction * this.speed * 0.78;

    if (distanceX < this.preferredDistance * 0.72) {
      desiredSpeed = -direction * this.speed * 0.68;
    } else if (distanceX < this.preferredDistance * 1.04) {
      desiredSpeed = direction * this.speed * 0.24;
    }

    this.vx = moveToward(this.vx, desiredSpeed, 2400 * dt);

    if (this.onGround && this.rivalRollCooldown <= 0 && distanceX > 130 && distanceX < 320) {
      this.startRivalRoll(direction);
      this.updateRivalRoll(dt);
      return;
    }

    if (this.onGround && this.jumpCooldown <= 0 && (player.centerY < this.centerY - 36 || distanceX < 190)) {
      this.vy = CONFIG.player.jumpVelocity * 0.92;
      this.onGround = false;
      this.jumpCooldown = randomRange(0.55, 1.05);
    }

    if (!this.onGround) {
      if ((player.centerY < this.centerY - 28 || distanceX > 260) && this.vy > -560) {
        this.vy -= CONFIG.boost.acceleration * 0.3 * dt;
      }

      if (this.dashCooldown <= 0 && distanceX > 250) {
        this.vx = direction * CONFIG.airDash.speed * 0.76;
        this.dashCooldown = randomRange(1.0, 1.6);
      }
    }

    this.vy += CONFIG.world.gravity * dt;
    this.vy = Math.min(this.vy, CONFIG.player.maxFallSpeed);

    this.x += this.vx * dt;
    this.resolveHorizontalCollisions();
    this.constrainToArenaHorizontal();

    const oldY = this.y;
    const verticalSpeed = this.vy;
    this.y += this.vy * dt;
    this.resolveVerticalCollisions(oldY, verticalSpeed);
  }

  updateRivalRoll(dt) {
    this.vx = moveToward(this.vx, this.rivalRollDirection * CONFIG.duel.rivalRollSpeed, CONFIG.player.acceleration * 1.2 * dt);
    this.vy += CONFIG.world.gravity * dt;
    this.vy = Math.min(this.vy, CONFIG.player.maxFallSpeed);

    this.x += this.vx * dt;
    this.resolveHorizontalCollisions();
    this.constrainToArenaHorizontal();

    const oldY = this.y;
    const verticalSpeed = this.vy;
    this.y += this.vy * dt;
    this.resolveVerticalCollisions(oldY, verticalSpeed);
  }

  startRivalRoll(direction) {
    this.rivalRollTimer = CONFIG.duel.rivalRollDuration;
    this.rivalRollDirection = direction || 1;
    this.rivalRollCooldown = randomRange(CONFIG.duel.rivalRollCooldownMin, CONFIG.duel.rivalRollCooldownMax);
    this.vx = this.rivalRollDirection * CONFIG.duel.rivalRollSpeed;
  }

  updateDrone(dt, player) {
    const direction = Math.sign(player.centerX - this.centerX) || 1;
    const distanceX = Math.abs(player.centerX - this.centerX);
    const targetHeight = Math.max(80, Math.min(CONFIG.world.floorY - 200, player.centerY - 170 + Math.sin(this.hoverPhase) * 26));
    let desiredSpeedX = direction * this.speed * 0.75;

    if (distanceX < this.preferredDistance * 0.75) {
      desiredSpeedX = -direction * this.speed * 0.65;
    } else if (distanceX < this.preferredDistance * 1.1) {
      desiredSpeedX = 0;
    }

    this.vx = moveToward(this.vx, desiredSpeedX, 1400 * dt);
    this.vy = moveToward(this.vy, (targetHeight - this.y) * 3.4, 1200 * dt);
    this.hoverPhase += dt * 2.2;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.x = clamp(this.x, CONFIG.world.arenaPadding, CONFIG.canvas.width - this.width - CONFIG.world.arenaPadding);
    this.y = clamp(this.y, 40, CONFIG.world.floorY - this.height - 40);
    this.onGround = false;
  }

  tryShoot(player, game) {
    if (this.type === "rival" && this.rivalRollTimer > 0) {
      return;
    }

    const muzzleY = this.type === "drone" ? this.centerY : this.type === "rival" ? this.y + 28 : this.y + 22;
    const dx = player.centerX - this.centerX;
    const dy = player.centerY - muzzleY;
    const distance = Math.hypot(dx, dy);
    if (this.shootCooldown > 0 || distance > CONFIG.enemy.shootRange) {
      return;
    }

    const angle = Math.atan2(dy, dx);
    const speedMultiplier = this.type === "drone" ? 1.08 : this.type === "standoff" ? 0.94 : this.type === "rival" ? 1.02 : 1;
    game.enemyBullets.push(new EnemyBullet(
      this.centerX,
      muzzleY,
      Math.cos(angle) * CONFIG.enemy.bulletSpeed * speedMultiplier,
      Math.sin(angle) * CONFIG.enemy.bulletSpeed * speedMultiplier
    ));

    const rivalShootMultiplier = CONFIG.mode.type === "duel" ? CONFIG.duel.rivalShootMultiplier : 0.7;
    this.shootCooldown = randomRange(CONFIG.enemy.shootIntervalMin, CONFIG.enemy.shootIntervalMax) * (this.type === "charger" ? 1.02 : this.type === "standoff" ? 0.86 : this.type === "rival" ? rivalShootMultiplier : 0.76);

    for (let i = 0; i < 5; i += 1) {
      game.particles.push(new Particle({
        x: this.centerX,
        y: muzzleY,
        vx: Math.cos(angle) * randomRange(40, 120) + randomRange(-25, 25),
        vy: Math.sin(angle) * randomRange(40, 120) + randomRange(-25, 25),
        radius: randomRange(2, 4),
        life: randomRange(0.08, 0.18),
        color: this.type === "drone" ? "rgba(120, 238, 255, 0.92)" : this.type === "standoff" ? "rgba(255, 190, 126, 0.92)" : this.type === "rival" ? "rgba(132, 255, 214, 0.92)" : "rgba(255, 131, 145, 0.9)",
      }));
    }
  }

  resolveHorizontalCollisions() {
    if (this.type === "drone") {
      return;
    }

    for (const platform of platforms) {
      if (!rectsOverlap(this, platform)) {
        continue;
      }

      if (this.vx > 0) {
        this.x = platform.x - this.width;
      } else if (this.vx < 0) {
        this.x = platform.x + platform.width;
      }
      this.vx *= -0.15;
    }
  }

  constrainToArenaHorizontal() {
    const minX = CONFIG.world.arenaPadding;
    const maxX = CONFIG.canvas.width - this.width - CONFIG.world.arenaPadding;

    if (this.x < minX) {
      this.x = minX;
      this.vx = Math.max(0, this.vx);
    } else if (this.x > maxX) {
      this.x = maxX;
      this.vx = Math.min(0, this.vx);
    }
  }

  resolveVerticalCollisions(oldY, verticalSpeedBeforeMove) {
    if (this.type === "drone") {
      this.onGround = false;
      return;
    }

    this.onGround = false;

    for (const platform of platforms) {
      if (!rectsOverlap(this, platform)) {
        continue;
      }

      const oldBottom = oldY + this.height;
      const newBottom = this.y + this.height;
      const platformTop = platform.y;
      const platformBottom = platform.y + platform.height;

      if (verticalSpeedBeforeMove >= 0 && oldBottom <= platformTop && newBottom >= platformTop) {
        this.y = platformTop - this.height;
        this.vy = 0;
        this.onGround = true;
      } else if (verticalSpeedBeforeMove < 0 && oldY >= platformBottom && this.y <= platformBottom) {
        this.y = platformBottom;
        this.vy = 0;
      }
    }
  }

  disableContact(duration) {
    this.contactDisabledTimer = Math.max(this.contactDisabledTimer, duration);
  }

  canBeDamaged() {
    return !(this.type === "rival" && this.rivalRollTimer > 0);
  }

  getHeadHitbox() {
    if (this.type === "drone") {
      return null;
    }

    const headRadius = 14;
    const headCenterY = this.type === "rival" ? this.y - 5 : this.y - 8;
    return {
      x: this.centerX - headRadius,
      y: headCenterY - headRadius,
      width: headRadius * 2,
      height: headRadius * 2,
    };
  }

  getBodyHitbox() {
    if (this.type === "drone") {
      return {
        x: this.x - 2,
        y: this.y - 2,
        width: this.width + 4,
        height: this.height + 4,
      };
    }

    const top = this.type === "rival" ? this.y + 8 : this.y + 10;
    const width = this.type === "rival" ? 32 : 30;
    return {
      x: this.centerX - width / 2,
      y: top,
      width,
      height: this.y + this.height - top,
    };
  }

  canHeadshot() {
    return this.type !== "drone" && this.canBeDamaged();
  }

  getHpBarRect() {
    const width = CONFIG.enemy.hpBarWidth;
    return {
      x: this.centerX - width / 2,
      y: this.type === "drone" ? this.y - 14 : this.y - 30,
      width,
      height: CONFIG.enemy.hpBarHeight,
    };
  }

  canDamagePlayer() {
    return this.contactCooldown <= 0 && this.contactDisabledTimer <= 0 && !(this.type === "rival" && this.rivalRollTimer > 0);
  }

  markDamageDealt() {
    this.contactCooldown = CONFIG.enemy.contactInterval;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.centerX, this.centerY);

    if (this.type === "drone") {
      ctx.fillStyle = "#79e8ff";
      roundRect(ctx, -16, -10, 32, 20, 8);
      ctx.fill();
      ctx.fillStyle = "rgba(120, 238, 255, 0.28)";
      ctx.fillRect(-28, -3, 56, 6);
      ctx.fillStyle = "#d8fbff";
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(120, 238, 255, 0.7)";
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (this.type === "rival") {
      if (this.rivalRollTimer > 0) {
        ctx.fillStyle = "#4ce0b5";
        roundRect(ctx, -26, -12, 52, 22, 10);
        ctx.fill();
        ctx.fillStyle = "#8ef3d6";
        roundRect(ctx, -22, -4, 44, 8, 4);
        ctx.fill();
        ctx.restore();
        return;
      }

      ctx.fillStyle = "#4ce0b5";
      roundRect(ctx, -15, -32, 30, 42, 9);
      ctx.fill();
      ctx.fillStyle = "#8ef3d6";
      roundRect(ctx, -12, 10, 10, 24, 6);
      roundRect(ctx, 2, 10, 10, 24, 6);
      ctx.fill();
      ctx.fillStyle = "#dffef3";
      ctx.beginPath();
      ctx.arc(0, -44, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#b2ffe8";
      ctx.fillRect(-18, -10, 36, 6);
      ctx.restore();
      return;
    }

    ctx.fillStyle = this.type === "standoff" ? "#ffb76d" : "#ed435e";
    roundRect(ctx, -14, -30, 28, 40, 8);
    ctx.fill();

    ctx.fillStyle = this.type === "standoff" ? "#ffd29c" : "#ff8391";
    roundRect(ctx, -11, 10, 9, 24, 6);
    roundRect(ctx, 2, 10, 9, 24, 6);
    ctx.fill();

    ctx.fillStyle = this.type === "standoff" ? "#fff0d8" : "#ffd2d8";
    ctx.beginPath();
    ctx.arc(0, -42, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.type === "standoff" ? "#ffe0a8" : "#ffacb7";
    ctx.fillRect(-18, -10, 36, 6);
    ctx.restore();
  }
};
