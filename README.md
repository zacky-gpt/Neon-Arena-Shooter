# Browser Shooter Structure

## Overview

This project is split so it can still be opened directly with `index.html`, while staying easier to expand with images, sounds, and new gameplay systems.

## File Layout

- `index.html`
  - The entry point.
  - Loads the canvas, title screen UI, and all script files in order.
- `styles/main.css`
  - All page, canvas shell, title screen, and menu styling.
- `src/config.js`
  - The main balance and behavior settings.
  - If you want to tune gameplay first, start here.
- `src/platforms.js`
  - Defines the arena floor and platforms.
- `src/data/weapons.js`
  - Data definitions for ranged weapon behavior and projectile stats.
- `src/data/items.js`
  - Data definitions for pickup items, including weapon progression, healing, and ability unlocks.
- `src/utils.js`
  - Shared helper functions like collision checks, clamping, and formatting.
- `src/input.js`
  - Keyboard and mouse input handling.
- `src/game.js`
  - Main game loop state for enemies, bullets, particles, pickups, score, and hit handling.
- `src/render.js`
  - Drawing code for the arena, UI, title background, and overlays.
- `src/main.js`
  - App bootstrapping.
  - Connects title screen, presets, input setup, and the main animation loop.
- `src/entities/player.js`
  - Player movement, roll, jump, boost, air dash unlocks, shooting, melee, and drawing.
- `src/entities/enemy.js`
  - Enemy movement, enemy shooting, and drawing.
- `src/entities/pickup.js`
  - Dropped item behavior, gravity, and collection visuals.
- `src/entities/bullet.js`
  - Player bullet and enemy bullet classes.
- `src/entities/particle.js`
  - Particle effects.

## First Places To Edit

### Balance tuning

Edit `src/config.js`.

Important sections:
- `player`: movement speed, HP, shot speed, damage, landing lag
- `boost`: boost drain, recovery, acceleration, cooldown after empty
- `airDash`: dash speed, duration, cooldown, and default unlock state
- `roll`: roll timing and inertia
- `melee`: kick range, damage, knockback
- `enemy`: spawn rate, bullet speed, damage, fire interval
- `drops`: enemy drop chances for weapons, ability modules, and repair packs

### Bullet and platform collision

Edit these flags in `src/config.js`:
- `player.bulletHitsPlatforms`
- `enemy.bulletHitsPlatforms`

Current defaults:
- Player bullets collide with platforms
- Enemy bullets collide with platforms

### Weapon growth and unlock items

Edit:
- `src/data/weapons.js`
- `src/data/items.js`
- `src/config.js`

Current examples:
- enemies can drop `Weapon Cache`, which fills the W gauge and upgrades the gun every 10 pickups
- enemies can drop `Air Dash Module`, which unlocks `Shift + move` air dash
- enemies can drop `Repair Pack`, which restores a small amount of HP when you are hurt

### Stage layout

Edit `src/platforms.js`.

### Title screen presets

Edit `CONFIG_PRESETS` in `src/config.js`.

## Adding Assets Later

Recommended folders to add next:
- `assets/images/`
- `assets/audio/`

Suggested examples:
- `assets/images/player/`
- `assets/images/enemies/`
- `assets/images/ui/`
- `assets/audio/sfx/`
- `assets/audio/music/`

Keep paths relative to `index.html` or the current script file structure so the project stays portable.

## Portability Notes

- The current setup avoids absolute paths.
- It is designed to keep working when the whole folder is moved as-is.
- Because scripts are loaded with normal `<script src="...">` tags, it still works with local `file://` opening.

## Safe Expansion Strategy

If you keep building this project, a good order is:
1. Add image assets and swap simple shapes for sprites.
2. Add sound effects.
3. Add more enemy types.
4. Add title/settings persistence with `localStorage`.
5. Add waves, boss fights, and stage variations.

