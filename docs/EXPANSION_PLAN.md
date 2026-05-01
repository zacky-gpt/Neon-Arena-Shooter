# Expansion Plan

## Goal

This document is the design memo for growing this browser shooter without letting the codebase turn into one large file again.

The main idea is:

1. Keep the current game playable at every step
2. Move new features into small, focused files
3. Prefer data-driven definitions over hardcoded behavior where possible
4. Make it easy to add enemies, weapons, stages, and characters without rewriting the core loop

## Current State

The current project is already split into:

- `index.html`
- `styles/main.css`
- `src/config.js`
- `src/input.js`
- `src/game.js`
- `src/render.js`
- `src/platforms.js`
- `src/entities/`

This is a good base for a prototype-plus phase.

It is strong enough for:

- tuning movement and combat
- adding small UI features
- adding a few more entities

It will start to strain when the project gains:

- multiple enemy types
- multiple weapons and item effects
- multiple stages or random generation
- multiple playable characters
- per-body-part damage rules like headshots

## Design Principles

### 1. Data first, behavior second

When a new feature can be expressed as stats or configuration, put that in data first.

Examples:

- character HP, speed, boost size
- weapon fire rate, projectile speed, pierce count
- enemy move style, attack interval, bullet type
- stage platform sets

This makes balancing easier and reduces duplicated code.

### 2. Separate "what exists" from "how it behaves"

Try to split:

- entity data
- entity class logic
- system-level processing
- rendering

Example:

- `data/weapons.js` defines a grenade launcher
- `weapons/ranged-weapon.js` knows how to fire projectiles
- `systems/projectile-system.js` updates projectile collisions

### 3. Favor composition over giant inheritance trees

Avoid building one giant `Enemy` class with many `if` branches.

Prefer:

- a base enemy class with shared movement and damage handling
- a behavior object or per-type update function
- a factory that creates the correct enemy type

### 4. Keep the main loop thin

`game.js` should coordinate systems, not contain every rule directly.

As the game grows, move logic out of `Game` into systems.

## Recommended Future Structure

This is the next-stage structure to aim for when more features are added:

```text
index.html
styles/
assets/
  images/
  audio/
src/
  config.js
  input.js
  main.js
  game.js
  utils.js
  data/
    characters.js
    enemies.js
    weapons.js
    items.js
    stages.js
  entities/
    player.js
    enemy-base.js
    projectile.js
    pickup.js
  enemies/
    walker-enemy.js
    drone-enemy.js
    jumper-enemy.js
    booster-enemy.js
  weapons/
    ranged-weapon.js
    melee-weapon.js
    grenade-launcher.js
    pierce-rifle.js
    spear.js
    shield.js
  stages/
    fixed-stage.js
    random-stage-generator.js
  systems/
    combat-system.js
    projectile-system.js
    collision-system.js
    spawn-system.js
    loot-system.js
    wave-system.js
    stage-system.js
  render/
    render-world.js
    render-ui.js
    render-title.js
```

Not all of this is needed now.

This is the direction to grow toward.

## Planned Feature Areas

### Enemy expansion

Planned examples:

- air drone
- jumping enemy
- boosting enemy

Recommended approach:

- keep shared HP and contact logic in a base enemy
- move special movement and attack rules into per-type files
- create enemies through a factory

Suggested files:

- `src/data/enemies.js`
- `src/enemies/drone-enemy.js`
- `src/enemies/jumper-enemy.js`
- `src/enemies/booster-enemy.js`

Suggested enemy data shape:

```js
{
  id: "drone",
  maxHp: 40,
  moveSpeed: 180,
  attackType: "projectile",
  moveType: "hover",
  scoreValue: 140
}
```

### Stage expansion

Planned examples:

- multiple fixed stages
- stage clear rules
- random platform generation

Recommended approach:

- move platform definitions out of a single hardcoded array
- treat a stage as data plus optional generation rules
- stage loader returns platforms, spawn points, and stage rules

Suggested files:

- `src/data/stages.js`
- `src/stages/fixed-stage.js`
- `src/stages/random-stage-generator.js`

Suggested stage data shape:

```js
{
  id: "factory-01",
  platforms: [...],
  playerSpawn: { x: 240, y: 420 },
  enemySpawns: ["left", "right"],
  clearRule: "survive-wave"
}
```

### Weapons and pickups

Planned examples:

- grenade
- piercing rounds
- bullet speed modifier
- bullet size modifier
- spear
- shield

Recommended approach:

- define weapon stats in data
- let the player equip a current ranged weapon and current melee weapon
- apply temporary effects through pickups or modifiers

Suggested files:

- `src/data/weapons.js`
- `src/data/items.js`
- `src/weapons/`
- `src/systems/loot-system.js`

Suggested weapon data shape:

```js
{
  id: "pierce-rifle",
  type: "ranged",
  fireRate: 0.09,
  projectileSpeed: 1350,
  damage: 18,
  pierceCount: 2,
  projectileSize: 4
}
```

### Character selection

Planned examples:

- faster but fragile character
- heavy character with more HP
- high-boost mobility character

Recommended approach:

- move player stats into character data
- keep one `Player` class, but inject a selected character profile
- title screen can later add a second menu for character selection

Suggested files:

- `src/data/characters.js`

Suggested character data shape:

```js
{
  id: "light-runner",
  maxHp: 75,
  moveSpeed: 500,
  boostMax: 130,
  boostAcceleration: 3200,
  bodyWidth: 36,
  bodyHeight: 72
}
```

### Headshots

Recommended approach:

- split enemy hurtboxes into head and body
- projectile system asks which hurtbox was hit
- combat system applies a damage multiplier

Suggested implementation path:

1. add `getHurtboxes()` to enemies
2. return a head rect and body rect
3. collision checks return `head` or `body`
4. combat system multiplies damage if `head`

Suggested data:

```js
{
  headshotMultiplier: 1.8
}
```

### Air action growth chain

Planned unlock order:

1. `airDash`
2. `dive`
3. `dashKick`
4. `diveKick`

Recommended approach:

- move away from single booleans like `unlockedAirDash`
- introduce an ability progression structure that can later be unlocked by pickups or growth points
- keep one active air action state at a time so actions do not overlap unpredictably

Suggested future data shape:

```js
{
  airDash: true,
  dive: false,
  dashKick: false,
  diveKick: false
}
```

Suggested state shape:

```js
{
  airAction: "none" // none | airDash | dive | dashKick | diveKick
}
```

#### Input rules

- `airDash`
  - current rule stays: `Shift + left/right` in air
- `dive`
  - `Shift + S` in air
  - horizontal momentum should be canceled on start
- `dashKick`
  - `right click` during the active dash effect window
- `diveKick`
  - `right click` during the active dive window
- kick priority should always be:
  - `airDash` active: trigger `dashKick`
  - `dive` active: trigger `diveKick`
  - otherwise: trigger normal melee

#### Action result rules

- `dive`
  - should behave like a downward air dash
  - once started, the player keeps moving downward for a limited active duration
  - the move ends when its duration expires or when it collides with an enemy or the ground
- `dashKick`
  - should launch from the current air dash state
  - on hit, it should deal damage and apply a stronger knockback than normal melee
  - the player's hurtbox remains active; only the kick hitbox is added outside the body
- `diveKick`
  - should continue traveling downward for a short active duration similar to a roll-style commitment
  - enemy collision: deal damage, bounce the player upward
  - ground collision: create a shockwave and enter a short landing recovery

#### Landing and shockwave rules

- `diveKick` landing shockwave
  - spawns on the landing point
  - reaches about one character width to both the left and right
  - applies more knockback than normal melee
- `diveKick` ground recovery
  - should be shorter than a normal hard landing
  - target length: about half of normal landing lag
  - cannot be roll-canceled

#### Reuse and combo rules

- hitting with `dashKick` re-enables `dive`
- hitting with `dashKick` does not re-enable `airDash`
- hitting with `diveKick` re-enables `airDash`
- hitting with `diveKick` does not re-enable `dive`
- landing with a `diveKick` shockwave counts as grounded recovery, so normal grounded refresh rules apply
- whiffing either move does not refresh anything until landing
- this creates a mobility/combo loop where `dashKick` and `diveKick` can alternate, but the same move cannot be repeated freely

This should be tracked as a rule on hit, not as a separate one-off exception.

Example:

```js
onDashKickHit() => {
  canDiveAgain = true;
}
```

```js
onDiveKickHit() => {
  canAirDashAgain = true;
}
```

#### Timing rules

The current preferred rule is:

- if the dash effect is visibly active, the kick input window is active
- if the dive effect is visibly active, the dive kick input window is active

This is a good player-facing rule because it is readable without UI text.

However, this window should still be controlled by config timing values instead of hardcoded visuals.
That way the visual effect and gameplay rule can stay synced even after tuning.

Suggested config groups:

```js
CONFIG.airDash
CONFIG.dive
CONFIG.dashKick
CONFIG.diveKick
```

Suggested timing values:

- startup time
- cancellable window
- active hit time
- recovery time
- bounce speed on hit
- shockwave radius for dive kick landing

#### Open tuning note

The current air dash effect may be too short for a satisfying cancel window.
This is likely a playtest issue rather than a design issue.

Recommended approach:

- keep the rule as "kick can be entered while the effect is active"
- tune the effect duration and cancel window together after testing
- do not lock in the final input leniency before hands-on play
- assume current windows are provisional until real controller or keyboard testing confirms they feel fair

#### Unlock and mode rules

- progression order should be:
  1. `airDash`
  2. `dive`
  3. `dashKick`
  4. `diveKick`
- unlock source should be growth points rather than direct permanent pickups
- current survival mode should treat these unlocks as run-based only
- future stage modes may allow per-stage persistence such as:
  - unlocked through `1-N`
  - reset when entering `2-N`
- the game mode should own the unlock rule, not the player class

#### UI rules

- show unlocked actions in the status window with small icons or temporary letter markers
- reserve space now for:
  - ranged weapon display
  - melee weapon display
  - future weapon switching state
- this will help later when adding inventory, ammo counts, and action unlock visibility

## Systems To Extract Next

These are the best next refactors before feature growth becomes messy.

### 1. Combat system

Move into one place:

- projectile hits
- melee hits
- enemy bullet hits
- contact damage
- future headshots
- future dash kick and dive kick hit results
- future shockwave damage

Why:

- this will centralize damage rules
- it makes weapons and body-part damage much easier later
- bounce, stomp, and shockwave reactions should not live only in `player.js`

### 2. Spawn and wave system

Move out:

- enemy spawn timing
- score/time scaling
- future wave clear rules

Why:

- stages and game modes will want different spawn logic

### 3. Stage system

Move out:

- platform creation
- stage loading
- spawn points

Why:

- fixed stages and random stages need a common interface

## Recommended Interfaces

These do not need to be implemented immediately, but they are a good target.

### Stage interface

```js
{
  id,
  createWorld(config) => {
    platforms,
    playerSpawn,
    enemySpawns,
    clearRule
  }
}
```

### Enemy interface

```js
{
  update(dt, player, game),
  draw(ctx),
  takeDamage(amount, hitType),
  getHurtboxes()
}
```

### Weapon interface

```js
{
  canFire(owner),
  fire(owner, game),
  update(dt)
}
```

## Safe Expansion Order

When adding lots of new features, this order should keep things stable:

1. Extract combat logic into a combat system
2. Move stage data out of `platforms.js`
3. Add `data/characters.js`
4. Add `data/weapons.js`
5. Add one new enemy type using the new structure
6. Add one new weapon type using the new structure
7. Add headshot support
8. Add pickups and stage clear logic
9. Add air action progression and combo rules

## Immediate Next Steps

The next concrete steps I recommend are:

1. Create an ability progression structure in player state
2. Introduce one `airAction` state instead of independent temporary flags for every new move
3. Extract hit handling from `game.js` into `systems/combat-system.js`
4. Reserve UI space for ranged slot, melee slot, and action unlock icons
5. Implement `dive` first before `dashKick` and `diveKick`

That will make later additions much smoother without overengineering too early.
