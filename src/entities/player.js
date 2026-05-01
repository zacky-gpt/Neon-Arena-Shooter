"use strict";

window.Player = class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 240;
    this.y = 420;
    this.width = CONFIG.player.width;
    this.height = CONFIG.player.height;
    this.vx = 0;
    this.vy = 0;
    this.hp = CONFIG.player.maxHp;
    this.boost = CONFIG.boost.max;
    this.boostLockTimer = 0;
    this.fireCooldown = 0;
    this.meleeCooldown = 0;
    this.meleeTimer = 0;
    this.meleeHitEnemies = new Set();
    this.specialHitEnemies = new Set();
    this.invulnerableTimer = 0;
    this.onGround = false;
    this.facing = 1;
    this.isCrouching = false;
    this.isRolling = false;
    this.rollTimer = 0;
    this.rollDirection = 1;
    this.landingLagTimer = 0;
    this.landingLagRollCancelable = true;
    this.lastMoveInput = 0;
    this.justLanded = false;
    this.weaponPickupCount = 0;
    this.weaponStage = 0;
    this.meleeWeaponLabel = "Boot Kick";
    this.abilities = {
      airDash: CONFIG.airDash.enabledByDefault,
      doubleJump: false,
      dive: false,
      highJump: false,
      dashKick: false,
      diveKick: false,
    };
    this.airAction = "none";
    this.airDashAvailable = this.abilities.airDash;
    this.doubleJumpAvailable = this.abilities.doubleJump;
    this.diveAvailable = this.abilities.dive;
    this.airDashTimer = 0;
    this.airDashCooldownTimer = 0;
    this.diveTimer = 0;
    this.dashKickTimer = 0;
    this.diveKickTimer = 0;
  }

  get currentWeapon() {
    return WEAPON_PROGRESSION[this.weaponStage] || WEAPON_PROGRESSION[WEAPON_PROGRESSION.length - 1];
  }

  get isWeaponMaxed() {
    return this.weaponStage >= WEAPON_PROGRESSION.length - 1;
  }

  get weaponStageCount() {
    return WEAPON_PROGRESSION.length;
  }

  getWeaponProgress() {
    const needed = CONFIG.weaponProgression.pickupsPerLevel;
    if (this.isWeaponMaxed) {
      return {
        current: needed,
        needed,
        isMax: true,
        total: this.weaponPickupCount,
      };
    }

    return {
      current: this.weaponPickupCount % needed,
      needed,
      isMax: false,
      total: this.weaponPickupCount,
    };
  }

  canGainWeaponXp() {
    return !this.isWeaponMaxed;
  }

  get unlockedAirDash() {
    return this.abilities.airDash;
  }

  get centerX() {
    return this.x + this.width / 2;
  }

  get centerY() {
    return this.y + this.height / 2;
  }

  get gunOriginY() {
    return this.y + Math.min(26, this.height * 0.48);
  }

  get aimAngle() {
    return Math.atan2(input.mouseY - this.gunOriginY, input.mouseX - this.centerX);
  }

  get muzzle() {
    const angle = this.aimAngle;
    return {
      x: this.centerX + Math.cos(angle) * CONFIG.player.muzzleLength,
      y: this.gunOriginY + Math.sin(angle) * CONFIG.player.muzzleLength,
    };
  }

  get isMeleeActive() {
    return this.meleeTimer > 0;
  }

  get currentAirAbilityOrder() {
    return ["airDash", "doubleJump", "dive", "highJump", "dashKick", "diveKick"];
  }

  getSpecialAttackData() {
    if (this.dashKickTimer > 0) {
      return {
        type: "dashKick",
        hitbox: this.getDashKickHitbox(),
        damage: CONFIG.dashKick.damage,
        knockbackX: CONFIG.dashKick.knockbackX,
        knockbackY: CONFIG.dashKick.knockbackY,
      };
    }

    if (this.diveKickTimer > 0) {
      return {
        type: "diveKick",
        hitbox: this.getDiveKickHitbox(),
        damage: CONFIG.diveKick.damage,
        knockbackX: CONFIG.diveKick.knockbackX,
        knockbackY: CONFIG.diveKick.knockbackY,
      };
    }

    return null;
  }

  getActionTokens() {
    return [
      {
        label: "AD",
        unlocked: this.abilities.airDash,
        active: this.airAction === "airDash",
        ready: this.onGround || this.airDashAvailable,
      },
      {
        label: "DJ",
        unlocked: this.abilities.doubleJump,
        active: false,
        ready: this.onGround || this.doubleJumpAvailable,
      },
      {
        label: "DV",
        unlocked: this.abilities.dive,
        active: this.airAction === "dive" || this.airAction === "diveKick",
        ready: this.onGround || this.diveAvailable,
      },
      {
        label: "HJ",
        unlocked: this.abilities.highJump,
        active: false,
        ready: this.abilities.highJump && this.landingLagTimer > 0,
      },
      {
        label: "FK",
        unlocked: this.abilities.dashKick,
        active: this.airAction === "dashKick",
        ready: this.airDashTimer > 0,
      },
      {
        label: "DK",
        unlocked: this.abilities.diveKick,
        active: this.airAction === "diveKick",
        ready: this.diveTimer > 0,
      },
    ];
  }

  getMeleeHitbox() {
    const direction = this.facing || 1;
    return {
      x: direction > 0 ? this.centerX + 8 : this.centerX - CONFIG.melee.range,
      y: this.centerY - CONFIG.melee.height * 0.55,
      width: CONFIG.melee.range,
      height: CONFIG.melee.height,
    };
  }

  getDashKickHitbox() {
    const direction = this.facing || 1;
    return {
      x: direction > 0 ? this.centerX + 2 : this.centerX - CONFIG.dashKick.hitWidth - 2,
      y: this.centerY - CONFIG.dashKick.hitHeight * 0.55,
      width: CONFIG.dashKick.hitWidth,
      height: CONFIG.dashKick.hitHeight,
    };
  }

  getDiveKickHitbox() {
    return {
      x: this.centerX - CONFIG.diveKick.hitWidth / 2,
      y: this.centerY - 2,
      width: CONFIG.diveKick.hitWidth,
      height: CONFIG.diveKick.hitHeight,
    };
  }

  getNextUnlockableAbility() {
    for (const ability of this.currentAirAbilityOrder) {
      if (!this.abilities[ability]) {
        return ability;
      }
    }
    return null;
  }

  hasPendingAbilityUnlocks() {
    return this.getNextUnlockableAbility() !== null;
  }

  update(dt, game) {
    const moveInput = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const startedMoving = moveInput !== 0 && this.lastMoveInput === 0;
    const previousOnGround = this.onGround;
    const jumpPressed = input.jumpPressed;

    this.justLanded = false;

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }

    this.fireCooldown -= dt;
    this.meleeCooldown -= dt;
    this.meleeTimer = Math.max(0, this.meleeTimer - dt);
    this.landingLagTimer = Math.max(0, this.landingLagTimer - dt);
    this.boostLockTimer = Math.max(0, this.boostLockTimer - dt);
    this.airDashTimer = Math.max(0, this.airDashTimer - dt);
    this.airDashCooldownTimer = Math.max(0, this.airDashCooldownTimer - dt);
    this.diveTimer = Math.max(0, this.diveTimer - dt);
    this.dashKickTimer = Math.max(0, this.dashKickTimer - dt);
    this.diveKickTimer = Math.max(0, this.diveKickTimer - dt);

    if (this.landingLagTimer <= 0) {
      this.landingLagRollCancelable = true;
    }

    this.syncExpiredAirActions();

    if (!this.isRolling && moveInput !== 0) {
      this.facing = moveInput > 0 ? 1 : -1;
    }

    if (!this.onGround && this.canTriggerDoubleJump()) {
      this.startDoubleJump(moveInput, game);
    } else if (!this.onGround && this.canTriggerDive()) {
      this.startDive(game);
    } else if (!this.onGround && this.canTriggerAirDash(moveInput)) {
      this.startAirDash(moveInput, game);
    }

    if (this.landingLagTimer > 0 && this.abilities.highJump && input.shift && input.jumpW) {
      this.startHighJump(moveInput, game);
    }

    if (this.landingLagTimer > 0 && this.landingLagRollCancelable) {
      const wantsLagCancel = input.shift && moveInput !== 0 && (input.shiftPressed || startedMoving);
      if (wantsLagCancel) {
        this.landingLagTimer = 0;
        this.startRoll(moveInput, game, "landingCancel");
      }
    }

    if (this.onGround && !this.isRolling && this.landingLagTimer <= 0) {
      const wantsRoll = input.shift && moveInput !== 0 && (input.shiftPressed || startedMoving);
      if (wantsRoll) {
        this.startRoll(moveInput, game, "roll");
      }
    }

    if (this.isRolling) {
      this.updateRoll(dt, moveInput, jumpPressed, game);
    } else if (this.dashKickTimer > 0) {
      this.updateDashKick(dt, game);
    } else if (this.diveKickTimer > 0) {
      this.updateDiveKick(dt, game);
    } else if (this.diveTimer > 0) {
      this.updateDive(dt, game);
    } else if (this.airDashTimer > 0) {
      this.updateAirDash(dt, game);
    } else if (this.landingLagTimer > 0) {
      this.updateLandingRecovery(dt);
    } else if (this.onGround) {
      this.updateGroundMovement(dt, moveInput, jumpPressed);
    } else {
      this.updateAirMovement(dt, moveInput);
    }

    this.applyAirBoost(dt, game);

    this.vy += CONFIG.world.gravity * dt;
    this.vy = Math.min(this.vy, CONFIG.player.maxFallSpeed);

    this.x += this.vx * dt;
    this.resolveHorizontalCollisions();

    const oldY = this.y;
    const impactSpeed = this.vy;
    this.y += this.vy * dt;
    this.resolveVerticalCollisions(oldY, impactSpeed);

    this.x = clamp(this.x, CONFIG.world.arenaPadding, CONFIG.canvas.width - this.width - CONFIG.world.arenaPadding);

    if (this.justLanded) {
      this.handleLanding(impactSpeed, previousOnGround, game);
    }

    if (input.fire) {
      this.tryFire(game);
    }

    if (input.meleePressed) {
      this.tryMelee(game);
    }

    if (this.boostLockTimer <= 0) {
      this.boost += CONFIG.boost.regenPerSecond * dt;
      this.boost = clamp(this.boost, 0, CONFIG.boost.max);
    }

    this.lastMoveInput = moveInput;
  }

  syncExpiredAirActions() {
    if (this.airAction === "airDash" && this.airDashTimer <= 0) {
      this.airAction = "none";
    }
    if (this.airAction === "dive" && this.diveTimer <= 0) {
      this.airAction = "none";
    }
    if (this.airAction === "dashKick" && this.dashKickTimer <= 0) {
      this.airAction = "none";
      this.specialHitEnemies.clear();
    }
    if (this.airAction === "diveKick" && this.diveKickTimer <= 0) {
      this.airAction = "none";
      this.specialHitEnemies.clear();
    }
  }

  updateGroundMovement(dt, moveInput, jumpPressed) {
    const wantsCrouch = input.shift && moveInput === 0;
    this.setCrouchState(wantsCrouch);

    const targetSpeed = this.isCrouching ? 0 : moveInput * CONFIG.player.moveSpeed;
    if (!this.isCrouching && moveInput !== 0) {
      this.vx = moveToward(this.vx, targetSpeed, CONFIG.player.acceleration * dt);
    } else {
      this.vx = moveToward(this.vx, 0, CONFIG.player.friction * dt);
    }

    if (jumpPressed) {
      this.tryStand();
      this.vy = CONFIG.player.jumpVelocity;
      this.onGround = false;
    }
  }

  updateAirMovement(dt, moveInput) {
    this.setCrouchState(false);

    if (moveInput !== 0) {
      const targetSpeed = moveInput * CONFIG.player.moveSpeed;
      this.vx = moveToward(this.vx, targetSpeed, CONFIG.player.acceleration * CONFIG.player.airControl * dt);
    }
  }

  updateLandingRecovery(dt) {
    this.setCrouchState(false);
    this.vx = moveToward(this.vx, 0, CONFIG.player.friction * 0.8 * dt);
  }

  canTriggerDoubleJump() {
    const requested = input.shift && input.jumpW && (input.wJumpPressed || input.shiftPressed);
    return this.abilities.doubleJump && this.doubleJumpAvailable && requested && this.airAction === "none";
  }

  canTriggerAirDash(moveInput) {
    return (
      this.abilities.airDash &&
      this.airDashAvailable &&
      this.airDashCooldownTimer <= 0 &&
      this.airAction === "none" &&
      input.shift &&
      input.shiftPressed &&
      moveInput !== 0
    );
  }

  canTriggerDive() {
    const requested = input.shift && input.down && (input.shiftPressed || input.downPressed);
    return this.abilities.dive && this.diveAvailable && requested && (this.airAction === "none" || this.airAction === "airDash");
  }

  startDoubleJump(moveInput, game) {
    game.registerMovementAction("doubleJump");
    this.doubleJumpAvailable = false;
    this.vy = Math.max(this.vy + CONFIG.doubleJump.impulse, CONFIG.doubleJump.maxRiseSpeed);
    if (moveInput !== 0) {
      this.facing = Math.sign(moveInput);
      this.vx = clamp(this.vx + moveInput * CONFIG.doubleJump.horizontalBoost, -CONFIG.airDash.speed, CONFIG.airDash.speed);
    }
    this.spawnBoostTrail(game, 0, 0.9, 6);
  }

  startAirDash(moveInput, game) {
    game.registerMovementAction("airDash");
    this.airAction = "airDash";
    this.airDashAvailable = false;
    this.airDashTimer = CONFIG.airDash.duration;
    this.airDashCooldownTimer = CONFIG.airDash.cooldown;
    this.vx = Math.sign(moveInput) * CONFIG.airDash.speed;
    this.vy = Math.min(this.vy, CONFIG.airDash.verticalBoost);
    this.facing = Math.sign(moveInput);
    this.spawnBoostTrail(game, -this.facing, 0.15, 10);
  }

  startDive(game) {
    game.registerMovementAction("dive");
    this.airAction = "dive";
    this.diveAvailable = false;
    this.airDashTimer = 0;
    this.diveTimer = CONFIG.dive.duration;
    this.vx = 0;
    this.vy = Math.max(this.vy, CONFIG.dive.speed);
    this.spawnBoostTrail(game, 0, -0.25, 8);
  }

  startHighJump(moveInput, game) {
    game.registerMovementAction("highJump");
    this.landingLagTimer = 0;
    this.landingLagRollCancelable = true;
    this.tryStand();
    this.onGround = false;
    this.vy = CONFIG.highJump.jumpVelocity;
    if (moveInput !== 0) {
      this.facing = Math.sign(moveInput);
      this.vx = moveInput * (CONFIG.player.moveSpeed + CONFIG.highJump.horizontalBoost);
    }
    this.spawnBoostTrail(game, 0, 0.8, 8);
  }

  startDashKick(game) {
    game.registerMovementAction("flyingKick");
    this.airAction = "dashKick";
    this.airDashTimer = 0;
    this.dashKickTimer = CONFIG.dashKick.duration;
    this.meleeCooldown = Math.max(this.meleeCooldown, CONFIG.dashKick.cooldown);
    this.specialHitEnemies.clear();
    this.vx = this.facing * CONFIG.dashKick.speed;
    this.vy = Math.min(this.vy, CONFIG.dashKick.verticalSpeed);
    this.spawnBoostTrail(game, -this.facing, 0.18, 8);
  }

  startDiveKick(game) {
    game.registerMovementAction("flyingKick");
    this.airAction = "diveKick";
    this.diveTimer = 0;
    this.diveKickTimer = CONFIG.diveKick.duration;
    this.meleeCooldown = Math.max(this.meleeCooldown, CONFIG.diveKick.cooldown);
    this.specialHitEnemies.clear();
    this.vx = 0;
    this.vy = CONFIG.diveKick.speed;
    this.spawnBoostTrail(game, 0, -0.3, 8);
  }

  updateAirDash(dt, game) {
    const dashDirection = Math.sign(this.vx) || this.facing || 1;
    this.vx = moveToward(this.vx, dashDirection * CONFIG.airDash.speed, CONFIG.airDash.speed * 4 * dt);
    this.spawnBoostTrail(game, -dashDirection, 0.12, 2);
  }

  updateDive(dt, game) {
    this.vx = moveToward(this.vx, 0, CONFIG.player.acceleration * dt);
    this.vy = moveToward(this.vy, CONFIG.dive.speed, CONFIG.dive.speed * 4 * dt);
    this.spawnBoostTrail(game, 0, -0.18, 2);
  }

  updateDashKick(dt, game) {
    const direction = this.facing || 1;
    this.vx = moveToward(this.vx, direction * CONFIG.dashKick.speed, CONFIG.dashKick.speed * 5 * dt);
    this.vy = moveToward(this.vy, CONFIG.dashKick.verticalSpeed, CONFIG.dashKick.speed * 3 * dt);
    this.spawnBoostTrail(game, -direction, 0.08, 2);
  }

  updateDiveKick(dt, game) {
    this.vx = moveToward(this.vx, 0, CONFIG.player.acceleration * dt);
    this.vy = moveToward(this.vy, CONFIG.diveKick.speed, CONFIG.diveKick.speed * 4 * dt);
    this.spawnBoostTrail(game, 0, -0.25, 2);
  }

  applyAirBoost(dt, game) {
    if (this.isRolling || this.airAction !== "none" || !input.boost || this.boostLockTimer > 0 || this.boost <= 0) {
      return;
    }

    if (this.onGround) {
      this.onGround = false;
    }

    this.vy -= CONFIG.boost.acceleration * dt;
    this.vy = Math.max(this.vy, CONFIG.boost.maxRiseSpeed);
    this.boost = Math.max(0, this.boost - CONFIG.boost.drainPerSecond * dt);
    this.spawnBoostTrail(game, 0, 1, 3);

    if (this.boost <= 0) {
      this.boost = 0;
      this.boostLockTimer = CONFIG.boost.emptyCooldown;
    }
  }

  startRoll(direction, game, actionName = "roll") {
    game.registerMovementAction(actionName);
    this.isRolling = true;
    this.isCrouching = false;
    this.rollDirection = Math.sign(direction) || this.facing || 1;
    this.rollTimer = CONFIG.roll.duration;
    this.facing = this.rollDirection;
    this.setHeight(CONFIG.roll.height);
    this.vx = this.rollDirection * Math.max(Math.abs(this.vx), CONFIG.roll.initialSpeed);
    this.spawnBoostTrail(game, -this.rollDirection, 0.25, 6);
  }

  updateRoll(dt, moveInput, jumpPressed, game) {
    this.rollTimer -= dt;
    this.facing = this.rollDirection;

    if (jumpPressed && this.onGround) {
      this.endRoll();
      this.vx = this.rollDirection * CONFIG.roll.jumpSpeedX;
      this.vy = CONFIG.roll.jumpSpeedY;
      this.onGround = false;
      game.registerMovementAction("sideLeap");
      this.spawnBoostTrail(game, -this.rollDirection, 0.4, 8);
      return;
    }

    if (moveInput === -this.rollDirection) {
      this.vx = moveToward(this.vx, 0, CONFIG.roll.reverseBrake * dt);
    } else {
      this.vx = moveToward(this.vx, this.rollDirection * CONFIG.roll.cruiseSpeed, CONFIG.roll.drag * dt);
    }

    this.spawnBoostTrail(game, -this.rollDirection, 0.18);

    if (this.rollTimer <= 0) {
      this.endRoll();
    }
  }

  endRoll() {
    this.isRolling = false;
    this.rollTimer = 0;

    if (input.shift && !input.left && !input.right) {
      this.setCrouchState(true);
      return;
    }

    this.tryStand();
  }

  handleLanding(impactSpeed, previousOnGround, game) {
    const landedFromDiveKick = this.airAction === "diveKick" && this.diveKickTimer > 0;
    const landedFromAction = this.airAction !== "none";

    if (landedFromDiveKick) {
      this.performDiveKickLanding(game);
    } else {
      if (!previousOnGround && impactSpeed >= CONFIG.player.hardLandingSpeed) {
        this.landingLagTimer = CONFIG.player.landingLag;
        this.landingLagRollCancelable = true;
      }

      if (landedFromAction) {
        this.clearCurrentAirAction();
      }
    }

    if (this.abilities.airDash) {
      this.airDashAvailable = true;
    }
    if (this.abilities.doubleJump) {
      this.doubleJumpAvailable = true;
    }
    if (this.abilities.dive) {
      this.diveAvailable = true;
    }
  }

  performDiveKickLanding(game) {
    this.clearCurrentAirAction();
    this.landingLagTimer = CONFIG.diveKick.groundLag;
    this.landingLagRollCancelable = false;
    game.spawnDiveKickShockwave(this.centerX, this.y + this.height - 4, this.facing);
    this.spawnBoostTrail(game, 0, -0.55, 8);
  }

  clearCurrentAirAction() {
    this.airAction = "none";
    this.airDashTimer = 0;
    this.diveTimer = 0;
    this.dashKickTimer = 0;
    this.diveKickTimer = 0;
    this.specialHitEnemies.clear();
  }

  onDashKickHit(game) {
    this.grantHitGrace(CONFIG.dashKick.contactGrace);
    this.clearCurrentAirAction();
    this.vx = -this.facing * CONFIG.dashKick.bounceX;
    this.vy = CONFIG.dashKick.bounceY;
    this.diveAvailable = this.abilities.dive;
    this.spawnBoostTrail(game, 0, -0.45, 7);
  }

  onDiveKickHit(game) {
    this.grantHitGrace(CONFIG.diveKick.contactGrace);
    this.clearCurrentAirAction();
    this.vx *= 0.2;
    this.vy = CONFIG.diveKick.bounceY;
    this.airDashAvailable = this.abilities.airDash;
    this.spawnBoostTrail(game, 0, -0.6, 9);
  }

  grantHitGrace(duration) {
    this.invulnerableTimer = Math.max(this.invulnerableTimer, duration);
  }

  collectWeaponXp(amount = 1) {
    if (!this.canGainWeaponXp()) {
      return {
        advanced: false,
        stage: this.weaponStage,
        isMax: true,
      };
    }

    const previousStage = this.weaponStage;
    const maxPickupCount = (WEAPON_PROGRESSION.length - 1) * CONFIG.weaponProgression.pickupsPerLevel;
    this.weaponPickupCount = clamp(this.weaponPickupCount + amount, 0, maxPickupCount);
    this.weaponStage = Math.min(
      Math.floor(this.weaponPickupCount / CONFIG.weaponProgression.pickupsPerLevel),
      WEAPON_PROGRESSION.length - 1
    );

    return {
      advanced: this.weaponStage > previousStage,
      stage: this.weaponStage,
      isMax: this.isWeaponMaxed,
    };
  }

  unlockAbility(ability) {
    if (ability !== "airDash") {
      return null;
    }

    const nextAbility = this.getNextUnlockableAbility();
    if (!nextAbility) {
      return null;
    }

    this.abilities[nextAbility] = true;
    if (nextAbility === "airDash") {
      this.airDashAvailable = true;
    }
    if (nextAbility === "doubleJump") {
      this.doubleJumpAvailable = true;
    }
    if (nextAbility === "dive") {
      this.diveAvailable = true;
    }
    return nextAbility;
  }

  setCrouchState(shouldCrouch) {
    if (this.isRolling) {
      return;
    }

    if (shouldCrouch) {
      this.isCrouching = true;
      this.setHeight(CONFIG.roll.crouchHeight);
      return;
    }

    if (this.isCrouching) {
      this.tryStand();
    }
  }

  tryStand() {
    if (this.canUseHeight(CONFIG.player.height)) {
      this.isCrouching = false;
      this.setHeight(CONFIG.player.height);
      return true;
    }

    this.isCrouching = true;
    this.setHeight(CONFIG.roll.crouchHeight);
    return false;
  }

  setHeight(newHeight) {
    if (this.height === newHeight) {
      return;
    }

    const bottom = this.y + this.height;
    this.height = newHeight;
    this.y = bottom - newHeight;
  }

  canUseHeight(targetHeight) {
    const bottom = this.y + this.height;
    const testRect = {
      x: this.x,
      y: bottom - targetHeight,
      width: this.width,
      height: targetHeight,
    };

    for (const platform of platforms) {
      if (rectsOverlap(testRect, platform)) {
        return false;
      }
    }

    return true;
  }

  resolveHorizontalCollisions() {
    for (const platform of platforms) {
      if (platform.type !== "platform" && platform.type !== "floor") {
        continue;
      }

      if (!rectsOverlap(this, platform)) {
        continue;
      }

      if (this.vx > 0) {
        this.x = platform.x - this.width;
      } else if (this.vx < 0) {
        this.x = platform.x + platform.width;
      }
      this.vx = 0;
    }
  }

  resolveVerticalCollisions(oldY, verticalSpeedBeforeMove) {
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
        this.justLanded = true;
      } else if (verticalSpeedBeforeMove < 0 && oldY >= platformBottom && this.y <= platformBottom) {
        this.y = platformBottom;
        this.vy = 0;
      }
    }
  }

  tryFire(game) {
    const fireLockedByAction = this.airAction === "dive" || this.airAction === "dashKick" || this.airAction === "diveKick";
    if (this.fireCooldown > 0 || game.gameOver || this.isRolling || this.landingLagTimer > 0 || this.isMeleeActive || fireLockedByAction) {
      return;
    }

    const weapon = this.currentWeapon;
    this.fireCooldown = weapon.fireRate;
    const baseAngle = this.aimAngle;
    const muzzle = this.muzzle;
    const projectileCount = weapon.projectileCount || 1;
    const spreadAngle = weapon.spreadAngle || 0;
    const pattern = weapon.pattern || "spread";
    const laneSpacing = weapon.laneSpacing || 0;
    const perpendicularX = -Math.sin(baseAngle);
    const perpendicularY = Math.cos(baseAngle);

    for (let i = 0; i < projectileCount; i += 1) {
      const offset = projectileCount === 1 ? 0 : (i - (projectileCount - 1) / 2) * spreadAngle;
      const laneOffset = projectileCount === 1 ? 0 : (i - (projectileCount - 1) / 2) * laneSpacing;
      const originX = pattern === "convergeColumns" ? muzzle.x + perpendicularX * laneOffset : muzzle.x;
      const originY = pattern === "convergeColumns" ? muzzle.y + perpendicularY * laneOffset : muzzle.y;
      const angle = pattern === "convergeColumns"
        ? Math.atan2(input.mouseY - originY, input.mouseX - originX)
        : baseAngle + offset;
      game.bullets.push(new Bullet(
        originX,
        originY,
        Math.cos(angle) * weapon.projectileSpeed,
        Math.sin(angle) * weapon.projectileSpeed,
        weapon.projectileLife,
        weapon.projectileDamage,
        {
          radius: weapon.projectileRadius,
          color: weapon.projectileColor,
          glow: weapon.projectileGlow,
          hitsPlatforms: weapon.bulletHitsPlatforms,
        }
      ));
    }

    for (let i = 0; i < 4; i += 1) {
      game.particles.push(new Particle({
        x: muzzle.x,
        y: muzzle.y,
        vx: Math.cos(baseAngle) * randomRange(50, 140) + randomRange(-40, 40),
        vy: Math.sin(baseAngle) * randomRange(50, 140) + randomRange(-40, 40),
        radius: randomRange(2, 4),
        life: randomRange(0.08, 0.16),
        color: "rgba(255, 223, 137, 0.95)",
      }));
    }
  }

  tryMelee(game) {
    if (this.meleeCooldown > 0 || this.isRolling || this.landingLagTimer > 0) {
      return;
    }

    if (this.airDashTimer > 0 && this.abilities.dashKick) {
      this.startDashKick(game);
      return;
    }

    if (this.diveTimer > 0 && this.abilities.diveKick) {
      this.startDiveKick(game);
      return;
    }

    this.meleeCooldown = CONFIG.melee.cooldown;
    this.meleeTimer = CONFIG.melee.activeTime;
    this.meleeHitEnemies.clear();
  }

  spawnBoostTrail(game, directionX, directionY, count = CONFIG.effects.boostTrailParticles) {
    for (let i = 0; i < count; i += 1) {
      game.particles.push(new Particle({
        x: this.centerX - directionX * 12 + randomRange(-4, 4),
        y: this.centerY - directionY * 12 + randomRange(-8, 8),
        vx: -directionX * randomRange(70, 180) + randomRange(-20, 20),
        vy: -directionY * randomRange(70, 180) + randomRange(-30, 30),
        radius: randomRange(3, 6),
        life: randomRange(0.12, 0.28),
        color: "rgba(85, 227, 255, 0.88)",
      }));
    }
  }

  heal(amount) {
    const previousHp = this.hp;
    this.hp = Math.min(CONFIG.player.maxHp, this.hp + amount);
    return this.hp > previousHp;
  }

  takeDamage(amount) {
    if (this.isRolling) {
      return false;
    }

    if (this.invulnerableTimer > 0) {
      return false;
    }

    this.hp = Math.max(0, this.hp - amount);
    this.invulnerableTimer = CONFIG.player.invulnerableTime;
    return true;
  }

  draw(ctx) {
    const angle = this.aimAngle;
    const blink = this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer * 18) % 2 === 0;
    const bodyColor = blink ? "#8de9ff" : "#38a8ff";
    const bottom = this.y + this.height;

    ctx.save();
    ctx.translate(this.centerX, bottom);

    if (this.isRolling) {
      const spin = -0.18 * this.rollDirection + clamp(this.vx / 1500, -0.32, 0.32);
      ctx.rotate(spin);
      ctx.fillStyle = bodyColor;
      roundRect(ctx, -24, -22, 48, 24, 12);
      ctx.fill();
      ctx.fillStyle = "#bcefff";
      ctx.beginPath();
      ctx.arc(14 * this.rollDirection, -10, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5ed9ff";
      roundRect(ctx, -18, -10, 26, 8, 4);
      ctx.fill();
      ctx.restore();
      return;
    }

    const crouchPose = this.isCrouching || this.landingLagTimer > 0;
    const bodyTop = crouchPose ? -40 : -58;
    const bodyHeight = crouchPose ? 28 : 40;
    const legTop = crouchPose ? -18 : -20;
    const legHeight = crouchPose ? 18 : 28;
    const headY = crouchPose ? -50 : -68;
    const gunOriginY = crouchPose ? -34 : -42;

    ctx.fillStyle = bodyColor;
    roundRect(ctx, -15, bodyTop, 30, bodyHeight, 10);
    ctx.fill();

    ctx.fillStyle = "#58d2ff";
    roundRect(ctx, -12, legTop, 11, legHeight, 7);
    roundRect(ctx, 1, legTop, 11, legHeight, 7);
    ctx.fill();

    ctx.fillStyle = "#bcefff";
    ctx.beginPath();
    ctx.arc(0, headY, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(0, gunOriginY);
    ctx.rotate(angle);
    ctx.fillStyle = "#d5f6ff";
    roundRect(ctx, 2, -6, 44, 12, 5);
    ctx.fill();
    ctx.fillStyle = "#5ed9ff";
    roundRect(ctx, 8, 6, 14, 10, 4);
    ctx.fill();
    ctx.restore();

    if (this.isMeleeActive) {
      ctx.strokeStyle = "rgba(132, 245, 255, 0.75)";
      ctx.lineWidth = 8;
      ctx.beginPath();
      if (this.facing > 0) {
        ctx.arc(18, -32, 42, -1.0, 0.4);
      } else {
        ctx.arc(-18, -32, 42, Math.PI - 0.4, Math.PI + 1.0);
      }
      ctx.stroke();
    }

    if (this.airDashTimer > 0) {
      ctx.strokeStyle = "rgba(119, 244, 215, 0.7)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, -34, 34, 0.4, Math.PI * 1.7);
      ctx.stroke();
    }

    if (this.diveTimer > 0) {
      ctx.strokeStyle = "rgba(110, 255, 186, 0.7)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(0, 30);
      ctx.stroke();
    }

    if (this.dashKickTimer > 0) {
      ctx.strokeStyle = "rgba(255, 221, 122, 0.84)";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(6 * this.facing, -18);
      ctx.lineTo(56 * this.facing, -6);
      ctx.stroke();
    }

    if (this.diveKickTimer > 0) {
      ctx.strokeStyle = "rgba(255, 160, 102, 0.84)";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(0, 38);
      ctx.stroke();
    }

    ctx.restore();
  }
};




