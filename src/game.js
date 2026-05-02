"use strict";

window.Game = class Game {
  constructor() {
    this.player = new Player();
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.pickups = [];
    this.particles = [];
    this.elapsed = 0;
    this.score = 0;
    this.spawnTimer = 0;
    this.gameOver = false;
    this.movementComboCount = 0;
    this.movementComboTimer = 0;
    this.movementComboLastAction = "";
    this.lastDropId = "none";
    this.lastDropRepeatCount = 0;
    this.pendingSpawns = [];
    this.healSpawnTimers = [];
    this.resetRepairSpawnTimers();
  }

  reset() {
    this.player.reset();
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.pickups = [];
    this.particles = [];
    this.elapsed = 0;
    this.score = 0;
    this.spawnTimer = 0;
    this.gameOver = false;
    this.resetMovementCombo();
    this.lastDropId = "none";
    this.lastDropRepeatCount = 0;
    this.pendingSpawns = [];
    this.resetRepairSpawnTimers();
  }

  update(dt) {
    if (this.gameOver) {
      this.particles = this.particles.filter((particle) => {
        particle.update(dt);
        return particle.life > 0;
      });
      return;
    }

    this.elapsed += dt;
    this.spawnTimer -= dt;

    if (this.movementComboTimer > 0) {
      this.movementComboTimer = Math.max(0, this.movementComboTimer - dt);
      if (this.movementComboTimer <= 0) {
        this.resetMovementCombo();
      }
    }

    this.player.update(dt, this);
    this.updateSpawns();
    this.updatePendingSpawns(dt);
    this.updateRepairSpawns(dt);

    for (const bullet of this.bullets) {
      bullet.update(dt);
    }

    for (const bullet of this.enemyBullets) {
      bullet.update(dt);
    }

    for (const enemy of this.enemies) {
      enemy.update(dt, this.player, this);
    }

    for (const pickup of this.pickups) {
      pickup.update(dt);
    }

    for (const particle of this.particles) {
      particle.update(dt);
    }

    this.handleBulletHits();
    this.handleSpecialHits();
    this.handleMeleeHits();
    this.handleEnemyBulletHits();
    this.handleEnemyContacts();
    this.handlePickupCollection();

    this.bullets = this.bullets.filter((bullet) => bullet.alive);
    this.enemyBullets = this.enemyBullets.filter((bullet) => bullet.alive);
    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0);
    this.pickups = this.pickups.filter((pickup) => pickup.alive);
    this.particles = this.particles.filter((particle) => particle.life > 0);

    if (this.player.hp <= 0) {
      this.gameOver = true;
      this.resetMovementCombo();
    }
  }

  registerMovementAction(actionId) {
    if (!actionId) {
      return;
    }

    if (this.movementComboTimer > 0 && this.movementComboCount > 0) {
      this.movementComboCount += 1;
    } else {
      this.movementComboCount = 1;
    }

    this.movementComboLastAction = actionId;
    this.movementComboTimer = CONFIG.movementCombo.timeout;
  }

  resetMovementCombo() {
    this.movementComboCount = 0;
    this.movementComboTimer = 0;
    this.movementComboLastAction = "";
  }

  getMovementComboMultiplier() {
    if (this.movementComboCount <= 1) {
      return 1;
    }

    return clamp(
      1 + (this.movementComboCount - 1) * CONFIG.movementCombo.scoreMultiplier,
      1,
      CONFIG.movementCombo.maxMultiplier
    );
  }

  getMovementComboShotBonus(baseDamage) {
    if (this.movementComboCount <= 1) {
      return 0;
    }

    return Math.round(baseDamage * (this.getMovementComboMultiplier() - 1));
  }

  getEnemyMaxHp() {
    return Math.round(CONFIG.enemy.baseHp + (this.elapsed / 60) * CONFIG.enemy.hpGrowthPerMinute);
  }

  noteDropResult(dropId) {
    if (dropId === this.lastDropId) {
      this.lastDropRepeatCount += 1;
    } else {
      this.lastDropId = dropId;
      this.lastDropRepeatCount = 0;
    }
  }

  choosePickupDropId() {
    const entries = [
      { id: "none", weight: CONFIG.drops.noneWeight },
    ];

    if (this.player.canGainWeaponXp()) {
      entries.push({ id: "weaponCache", weight: CONFIG.drops.weaponWeight });
    }

    if (this.player.hasPendingAbilityUnlocks()) {
      entries.push({ id: "airDashModule", weight: CONFIG.drops.airDashWeight });
    }


    for (const entry of entries) {
      if (entry.id === this.lastDropId) {
        entry.weight *= Math.pow(CONFIG.drops.repeatPenalty, this.lastDropRepeatCount + 1);
      }
    }

    const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const entry of entries) {
      roll -= entry.weight;
      if (roll <= 0) {
        return entry.id;
      }
    }

    return entries[entries.length - 1].id;
  }

  getHealPlatforms() {
    return platforms.filter((platform) => platform.type === "platform");
  }

  resetRepairSpawnTimers() {
    this.healSpawnTimers = this.getHealPlatforms().map(() => this.rollRepairSpawnDelay(true));
  }

  rollRepairSpawnDelay(initial = false) {
    const delay = randomRange(CONFIG.healing.spawnIntervalMin, CONFIG.healing.spawnIntervalMax);
    return initial ? delay * randomRange(0.45, 1) : delay;
  }

  countActiveRepairPacks() {
    return this.pickups.filter((pickup) => pickup.alive && pickup.itemId === "repairPack").length;
  }

  hasPickupNear(x, y, radius = 42) {
    return this.pickups.some((pickup) => pickup.alive && Math.hypot(pickup.centerX - x, pickup.centerY - y) < radius);
  }

  spawnRepairPackAtPlatform(platformIndex) {
    const platform = this.getHealPlatforms()[platformIndex];
    if (!platform) {
      return false;
    }

    const spawnX = platform.x + platform.width / 2 - 17;
    const spawnY = platform.y - 34;
    if (this.hasPickupNear(spawnX + 17, spawnY + 17)) {
      return false;
    }

    const pickup = new Pickup("repairPack", spawnX, spawnY);
    pickup.vx = 0;
    pickup.vy = 0;
    pickup.onGround = true;
    pickup.spawnPlatformIndex = platformIndex;
    this.pickups.push(pickup);
    return true;
  }

  updateRepairSpawns(dt) {
    const healPlatforms = this.getHealPlatforms();
    if (healPlatforms.length === 0 || !this.healSpawnTimers || this.healSpawnTimers.length !== healPlatforms.length) {
      this.resetRepairSpawnTimers();
    }

    for (let i = 0; i < healPlatforms.length; i += 1) {
      this.healSpawnTimers[i] -= dt;
      if (this.healSpawnTimers[i] > 0) {
        continue;
      }

      const occupied = this.pickups.some((pickup) => pickup.alive && pickup.itemId === "repairPack" && pickup.spawnPlatformIndex === i);
      if (occupied) {
        this.healSpawnTimers[i] = CONFIG.healing.retryDelay;
        continue;
      }

      if (this.countActiveRepairPacks() >= CONFIG.healing.maxActivePacks) {
        this.healSpawnTimers[i] = CONFIG.healing.retryDelay;
        continue;
      }

      if (this.spawnRepairPackAtPlatform(i)) {
        this.healSpawnTimers[i] = this.rollRepairSpawnDelay();
      } else {
        this.healSpawnTimers[i] = CONFIG.healing.retryDelay;
      }
    }
  }

  pickEnemyType() {
    if (CONFIG.mode.type === "duel") {
      return "rival";
    }

    const typeRoll = Math.random();
    const droneWeight = this.elapsed >= CONFIG.enemy.droneStartTime ? 0.18 : 0;
    const standoffWeight = this.elapsed >= CONFIG.enemy.standoffStartTime ? 0.26 : 0;

    if (typeRoll < droneWeight) {
      return "drone";
    }

    if (typeRoll < droneWeight + standoffWeight) {
      return "standoff";
    }

    return "charger";
  }

  buildSpawnPlan() {
    const type = this.pickEnemyType();
    const rivalY = CONFIG.world.floorY - CONFIG.player.height;
    if (type === "rival") {
      const rivalPoints = [
        { x: 120, y: rivalY },
        { x: CONFIG.canvas.width - 160, y: rivalY },
        { x: CONFIG.canvas.width * 0.28, y: 540 },
        { x: CONFIG.canvas.width * 0.72, y: 540 },
      ];
      const point = rivalPoints[Math.floor(Math.random() * rivalPoints.length)];
      const speedBonus = (this.elapsed / 60) * CONFIG.enemy.speedGrowthPerMinute + this.score * 0.01;
      return {
        x: point.x,
        y: point.y,
        type,
        maxHp: Math.round(this.getEnemyMaxHp() * CONFIG.duel.rivalHpMultiplier),
        speedBonus,
        timer: CONFIG.enemy.spawnWarningDuration,
        duration: CONFIG.enemy.spawnWarningDuration,
      };
    }

    const groundY = CONFIG.world.floorY - CONFIG.enemy.height;
    const groundPoints = [
      { x: 40, y: 120 },
      { x: CONFIG.canvas.width - 82, y: 120 },
      { x: CONFIG.canvas.width / 2 - CONFIG.enemy.width / 2, y: 56 },
      { x: 48, y: groundY },
      { x: CONFIG.canvas.width - 90, y: groundY },
    ];
    const dronePoints = [
      { x: 70, y: 70 },
      { x: CONFIG.canvas.width / 2 - 20, y: 40 },
      { x: CONFIG.canvas.width - 110, y: 70 },
      { x: 200, y: 110 },
      { x: CONFIG.canvas.width - 240, y: 110 },
    ];
    const pool = type === "drone" ? dronePoints : groundPoints;
    const point = pool[Math.floor(Math.random() * pool.length)];
    const maxHpBase = this.getEnemyMaxHp();
    const maxHp = Math.round(maxHpBase * (type === "drone" ? 0.78 : type === "standoff" ? 0.88 : 1));
    const speedBonus = (this.elapsed / 60) * CONFIG.enemy.speedGrowthPerMinute + this.score * 0.01;

    return {
      x: point.x,
      y: point.y,
      type,
      maxHp,
      speedBonus,
      timer: CONFIG.enemy.spawnWarningDuration,
      duration: CONFIG.enemy.spawnWarningDuration,
    };
  }

  updatePendingSpawns(dt) {
    for (let i = this.pendingSpawns.length - 1; i >= 0; i -= 1) {
      const pending = this.pendingSpawns[i];
      pending.timer -= dt;
      if (pending.timer > 0) {
        continue;
      }

      this.enemies.push(new Enemy(pending.x, pending.y, pending.speedBonus, {
        maxHp: pending.maxHp,
        type: pending.type,
      }));
      this.pendingSpawns.splice(i, 1);
    }
  }

  updateSpawns() {
    if (CONFIG.mode.type === "duel") {
      if (this.enemies.length > 0 || this.pendingSpawns.length > 0) {
        return;
      }

      if (this.spawnTimer > 0) {
        return;
      }

      this.spawnTimer = CONFIG.duel.respawnDelay;
      this.pendingSpawns.push(this.buildSpawnPlan());
      return;
    }

    if (this.spawnTimer > 0) {
      return;
    }

    const spawnInterval = Math.max(
      CONFIG.enemy.minSpawnInterval,
      CONFIG.enemy.spawnInterval
        - (this.elapsed / 60) * CONFIG.enemy.spawnAccelerationPerMinute
        - this.score * CONFIG.enemy.spawnAccelerationPerScore * 0.001
    );

    this.spawnTimer = spawnInterval;
    this.pendingSpawns.push(this.buildSpawnPlan());
  }

  handleBulletHits() {
    for (const bullet of this.bullets) {
      if (!bullet.alive) {
        continue;
      }

      for (const enemy of this.enemies) {
        const bodyHit = circleIntersectsRect(bullet.x, bullet.y, bullet.radius, enemy.getBodyHitbox());
        const headshot = enemy.canHeadshot() && circleIntersectsRect(bullet.x, bullet.y, bullet.radius, enemy.getHeadHitbox());
        if (enemy.defeated || (!bodyHit && !headshot)) {
          continue;
        }

        const hitDamage = Math.round(bullet.damage * (headshot ? CONFIG.enemy.headshotMultiplier : 1));
        enemy.hp -= hitDamage;
        bullet.alive = false;
        this.spawnHitBurst(bullet.x, bullet.y, headshot ? "rgba(255, 238, 132, 0.98)" : "rgba(255, 113, 131, 0.95)");

        const comboBonus = this.getMovementComboShotBonus(hitDamage);
        if (comboBonus > 0) {
          this.score += comboBonus;
        }

        if (enemy.hp <= 0) {
          this.defeatEnemy(enemy);
        }
        break;
      }
    }
  }

  handleSpecialHits() {
    const special = this.player.getSpecialAttackData();
    if (!special) {
      return;
    }

    for (const enemy of this.enemies) {
      if (enemy.defeated || this.player.specialHitEnemies.has(enemy) || !rectsOverlap(special.hitbox, enemy)) {
        continue;
      }

      this.player.specialHitEnemies.add(enemy);
      enemy.hp -= special.damage;
      const knockDirection = special.type === "diveKick"
        ? (Math.sign(enemy.centerX - this.player.centerX) || this.player.facing || 1)
        : (this.player.facing || 1);
      enemy.vx = knockDirection * special.knockbackX;
      enemy.vy = special.knockbackY;
      enemy.disableContact(CONFIG.enemy.contactDisableOnKnockback);
      this.spawnHitBurst(enemy.centerX, enemy.centerY, special.type === "dashKick" ? "rgba(255, 221, 122, 0.95)" : "rgba(255, 165, 104, 0.95)");

      if (special.type === "dashKick") {
        this.player.onDashKickHit(this);
      } else {
        this.player.onDiveKickHit(this);
      }

      if (enemy.hp <= 0) {
        this.defeatEnemy(enemy);
      }
      break;
    }
  }

  handleMeleeHits() {
    if (!this.player.isMeleeActive) {
      return;
    }

    const meleeBox = this.player.getMeleeHitbox();
    const direction = this.player.facing || 1;

    for (const enemy of this.enemies) {
      if (enemy.defeated || this.player.meleeHitEnemies.has(enemy) || !rectsOverlap(meleeBox, enemy)) {
        continue;
      }

      this.player.meleeHitEnemies.add(enemy);
      enemy.hp -= CONFIG.melee.damage;
      enemy.vx = direction * CONFIG.melee.knockbackX;
      enemy.vy = CONFIG.melee.knockbackY;
      enemy.disableContact(CONFIG.enemy.contactDisableOnKnockback);
      this.player.grantHitGrace(CONFIG.melee.contactGrace);
      this.spawnHitBurst(enemy.centerX, enemy.centerY, "rgba(146, 245, 255, 0.95)");

      if (enemy.hp <= 0) {
        this.defeatEnemy(enemy);
      }
    }
  }

  handleEnemyBulletHits() {
    for (const bullet of this.enemyBullets) {
      if (!bullet.alive || !circleIntersectsRect(bullet.x, bullet.y, bullet.radius, this.player)) {
        continue;
      }

      bullet.alive = false;
      const damaged = this.player.takeDamage(bullet.damage);
      this.spawnHitBurst(bullet.x, bullet.y, "rgba(255, 135, 148, 0.95)");

      if (damaged) {
        this.resetMovementCombo();
        const direction = Math.sign(this.player.centerX - bullet.x) || 1;
        this.player.vx += direction * 180;
        this.player.vy -= 120;
      }
    }
  }

  handleEnemyContacts() {
    for (const enemy of this.enemies) {
      if (enemy.defeated || enemy.hp <= 0 || !rectsOverlap(enemy, this.player) || !enemy.canDamagePlayer()) {
        continue;
      }

      const damaged = this.player.takeDamage(CONFIG.enemy.contactDamage);
      enemy.markDamageDealt();

      if (damaged) {
        this.resetMovementCombo();
        const direction = Math.sign(this.player.centerX - enemy.centerX) || 1;
        this.player.vx += direction * 220;
        this.player.vy = -260;
        this.spawnHitBurst(this.player.centerX, this.player.centerY, "rgba(120, 220, 255, 0.95)");
      }
    }
  }

  handlePickupCollection() {
    for (const pickup of this.pickups) {
      if (!pickup.alive || !rectsOverlap(pickup, this.player)) {
        continue;
      }

      const def = pickup.definition;
      if (!def) {
        continue;
      }

      if (def.kind === "health" && this.player.hp >= CONFIG.player.maxHp) {
        continue;
      }

      pickup.alive = false;

      if (def.kind === "weapon") {
        this.player.collectWeaponXp(def.weaponXp || 1);
      }

      if (def.kind === "ability") {
        this.player.unlockAbility(def.ability);
      }

      if (def.kind === "health") {
        this.player.heal(def.healAmount);
      }

      this.spawnHitBurst(pickup.centerX, pickup.centerY, def.glow);
    }
  }

  defeatEnemy(enemy) {
    if (enemy.defeated || enemy.hp > 0) {
      return;
    }

    enemy.defeated = true;
    this.score += enemy.type === "rival" ? CONFIG.duel.rivalScoreValue : CONFIG.enemy.scoreValue;
    this.spawnDeathBurst(enemy.centerX, enemy.centerY);
    this.trySpawnPickup(enemy.centerX, enemy.centerY);
  }

  trySpawnPickup(x, y) {
    const dropId = this.choosePickupDropId();
    this.noteDropResult(dropId);

    if (dropId === "none") {
      return;
    }

    this.pickups.push(new Pickup(dropId, x - 17, y - 17));
  }

  spawnDiveKickShockwave(centerX, groundY, facing) {
    const shockwave = {
      x: centerX - CONFIG.diveKick.shockwaveRange,
      y: groundY - CONFIG.diveKick.shockwaveHeight,
      width: CONFIG.diveKick.shockwaveRange * 2,
      height: CONFIG.diveKick.shockwaveHeight,
    };

    for (const enemy of this.enemies) {
      if (enemy.defeated || !rectsOverlap(shockwave, enemy)) {
        continue;
      }

      enemy.hp -= CONFIG.diveKick.shockwaveDamage;
      const direction = Math.sign(enemy.centerX - centerX) || facing || 1;
      enemy.vx = direction * CONFIG.diveKick.shockwaveKnockbackX;
      enemy.vy = CONFIG.diveKick.shockwaveKnockbackY;
      enemy.disableContact(CONFIG.enemy.contactDisableOnKnockback);
      this.spawnHitBurst(enemy.centerX, enemy.centerY, "rgba(255, 176, 112, 0.95)");

      if (enemy.hp <= 0) {
        this.defeatEnemy(enemy);
      }
    }

    for (let i = 0; i < 14; i += 1) {
      this.particles.push(new Particle({
        x: centerX + randomRange(-CONFIG.diveKick.shockwaveRange, CONFIG.diveKick.shockwaveRange),
        y: groundY,
        vx: randomRange(-360, 360),
        vy: randomRange(-280, -70),
        radius: randomRange(3, 6),
        life: randomRange(0.14, 0.28),
        color: "rgba(255, 177, 103, 0.92)",
      }));
    }
  }

  spawnHitBurst(x, y, color) {
    for (let i = 0; i < CONFIG.effects.hitParticles; i += 1) {
      this.particles.push(new Particle({
        x,
        y,
        vx: randomRange(-210, 210),
        vy: randomRange(-220, 120),
        radius: randomRange(2, 5),
        life: randomRange(0.14, 0.34),
        color,
      }));
    }
  }

  spawnDeathBurst(x, y) {
    for (let i = 0; i < CONFIG.effects.enemyDeathParticles; i += 1) {
      this.particles.push(new Particle({
        x,
        y,
        vx: randomRange(-260, 260),
        vy: randomRange(-280, 180),
        radius: randomRange(3, 7),
        life: randomRange(0.24, 0.52),
        color: Math.random() < 0.6 ? "rgba(255, 96, 115, 0.92)" : "rgba(255, 199, 100, 0.92)",
      }));
    }
  }
};



