"use strict";

window.DEFAULT_CONFIG = {
  canvas: {
    width: 1440,
    height: 810,
  },
  world: {
    gravity: 2100,
    floorY: 720,
    arenaPadding: 30,
  },
  player: {
    width: 40,
    height: 78,
    moveSpeed: 420,
    airControl: 0.72,
    acceleration: 3600,
    friction: 2600,
    jumpVelocity: -780,
    maxFallSpeed: 1300,
    maxHp: 100,
    fireRate: 0.12,
    bulletSpeed: 1100,
    bulletLife: 0.8,
    bulletDamage: 24,
    bulletHitsPlatforms: true,
    invulnerableTime: 0.55,
    muzzleLength: 32,
    hardLandingSpeed: 780,
    landingLag: 0.28,
  },
  boost: {
    max: 120,
    regenPerSecond: 22,
    drainPerSecond: 31,
    acceleration: 3250,
    maxRiseSpeed: -280,
    emptyCooldown: 0.95,
  },
  weaponProgression: {
    pickupsPerLevel: 10,
  },
  mode: {
    type: "survival",
  },
  doubleJump: {
    impulse: -430,
    maxRiseSpeed: -980,
    horizontalBoost: 120,
  },
  airDash: {
    enabledByDefault: false,
    speed: 820,
    verticalBoost: -80,
    duration: 0.18,
    cooldown: 0.2,
  },
  dive: {
    speed: 1080,
    duration: 0.24,
  },
  highJump: {
    jumpVelocity: -1080,
    horizontalBoost: 140,
  },
  dashKick: {
    duration: 0.38,
    cooldown: 0.3,
    speed: 860,
    verticalSpeed: 90,
    damage: 46,
    knockbackX: 720,
    knockbackY: -320,
    bounceX: 80,
    bounceY: -520,
    hitWidth: 126,
    hitHeight: 68,
    contactGrace: 0.14,
  },
  diveKick: {
    duration: 0.34,
    cooldown: 0.34,
    speed: 1180,
    damage: 52,
    knockbackX: 560,
    knockbackY: -420,
    bounceY: -640,
    hitWidth: 92,
    hitHeight: 94,
    contactGrace: 0.14,
    shockwaveRange: 64,
    shockwaveHeight: 34,
    shockwaveDamage: 38,
    shockwaveKnockbackX: 760,
    shockwaveKnockbackY: -360,
    groundLag: 0.14,
  },
  movementCombo: {
    timeout: 1.6,
    scoreMultiplier: 0.18,
    maxMultiplier: 2.4,
  },
  roll: {
    crouchHeight: 52,
    height: 36,
    duration: 0.52,
    initialSpeed: 690,
    cruiseSpeed: 360,
    drag: 900,
    reverseBrake: 2200,
    jumpSpeedX: 590,
    jumpSpeedY: -540,
  },
  melee: {
    cooldown: 0.42,
    activeTime: 0.16,
    range: 86,
    height: 58,
    damage: 34,
    knockbackX: 460,
    knockbackY: -265,
    contactGrace: 0.18,
  },
  duel: {
    respawnDelay: 1.25,
    rivalHpMultiplier: 1.85,
    rivalScoreValue: 220,
  },
  enemy: {
    width: 42,
    height: 68,
    baseSpeed: 135,
    speedGrowthPerMinute: 18,
    baseHp: 42,
    maxHp: 42,
    hpGrowthPerMinute: 9,
    contactDamage: 16,
    contactInterval: 0.7,
    bulletSpeed: 360,
    bulletLife: 3.6,
    bulletDamage: 14,
    bulletHitsPlatforms: true,
    shootIntervalMin: 1.8,
    shootIntervalMax: 3.1,
    shootRange: 920,
    bulletRadius: 6,
    spawnInterval: 2.05,
    minSpawnInterval: 0.6,
    spawnAccelerationPerMinute: 0.12,
    spawnAccelerationPerScore: 0.01,
    scoreValue: 100,
    contactDisableOnKnockback: 0.38,
    spawnWarningDuration: 0.72,
    standoffStartTime: 85,
    droneStartTime: 165,
    headshotMultiplier: 1.45,
    hpBarWidth: 34,
    hpBarHeight: 5,
  },
  healing: {
    spawnIntervalMin: 12,
    spawnIntervalMax: 18,
    retryDelay: 3.5,
    maxActivePacks: 3,
  },
  drops: {
    weaponWeight: 4.8,
    airDashWeight: 1.2,
    healWeight: 0.9,
    noneWeight: 5.1,
    repeatPenalty: 0.55,
  },
  effects: {
    hitParticles: 10,
    boostTrailParticles: 2,
    enemyDeathParticles: 18,
  },
  ui: {
    topBarX: 22,
    topBarY: 20,
    barWidth: 220,
    barHeight: 18,
  },
};

window.CONFIG_PRESETS = {
  standard: {
    label: "Standard",
    description: "Close to the current default ruleset and easy to test controls with.",
    overrides: {},
  },
  duel: {
    label: "Duel",
    description: "One agile rival at a time with stronger 1v1 pacing and longer exchanges.",
    overrides: {
      mode: {
        type: "duel",
      },
      drops: {
        weaponWeight: 5.6,
        noneWeight: 4.3,
      },
      enemy: {
        spawnWarningDuration: 0.86,
      },
      duel: {
        respawnDelay: 1.45,
        rivalHpMultiplier: 2.0,
        rivalScoreValue: 260,
      },
    },
  },
  siege: {
    label: "Siege",
    description: "A tenser set with heavier melee and denser enemy fire.",
    overrides: {
      melee: {
        damage: 40,
        knockbackX: 520,
      },
      enemy: {
        bulletSpeed: 420,
        bulletDamage: 16,
        shootIntervalMin: 1.45,
        shootIntervalMax: 2.45,
        hpGrowthPerMinute: 11,
      },
      drops: {
        noneWeight: 5.6,
      },
    },
  },
};

window.deepClone = function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
};

window.mergeConfig = function mergeConfig(base, overrides) {
  const output = Array.isArray(base) ? [...base] : { ...base };

  for (const [key, value] of Object.entries(overrides)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      output[key] = mergeConfig(base[key] || {}, value);
    } else {
      output[key] = value;
    }
  }

  return output;
};

window.createConfig = function createConfig(presetKey) {
  const preset = window.CONFIG_PRESETS[presetKey] || window.CONFIG_PRESETS.standard;
  return window.mergeConfig(window.deepClone(window.DEFAULT_CONFIG), preset.overrides);
};

