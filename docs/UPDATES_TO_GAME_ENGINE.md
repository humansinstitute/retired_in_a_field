# Game Engine Updates

This document summarizes the current gameplay changes in the standalone build, focusing on each level’s custom logic and the power-up systems that differ from the original paywalled version.

---

## Levels 1–3: Classic Chase With Speed Boosts

**Core Loop**
- Standard man-vs-cow chase; the man moves toward the pointer/tap target each frame while the cow(s) home in on the player position.
- Collision with an active cow ends the run.

**New Power-Up: Speed Boost**
- A cyan orb spawns every ~2 seconds once the previous orb is consumed or expires.
- Spawn position is randomized within the playfield, respecting a small padding buffer from the edges.
- When the man touches the orb:
  - The orb is removed immediately.
  - A 10% speed multiplier is applied to the player (`man.speed *= 1.1`).
  - The multiplier stacks for the remainder of the run; multiple pickups lead to noticeably faster movement.
- Boost state persists only for the current session. Restarting a level resets the multiplier to 1.0.
- Boost timers pause and resume correctly when the tab loses focus (e.g., mobile multitask or desktop tab switch).

```javascript
// Spawn + tracking (js/game-engine.js:37, 475-517)
speedBoost: {
  intervalMs: 2000,
  lastSpawnAt: 0,
  powerUp: null,
  multiplier: 1
},

maybeSpawnSpeedBoost(now) {
  if (!(this.currentLevel >= 1 && this.currentLevel <= 3)) return;
  const state = this.speedBoost;
  if (!state || state.powerUp) return;
  if (now - state.lastSpawnAt < state.intervalMs) return;
  state.lastSpawnAt = now;
  this.spawnSpeedBoostPowerUp();
},

checkSpeedBoostCollision() {
  if (!(this.currentLevel >= 1 && this.currentLevel <= 3)) return;
  const powerUp = this.speedBoost.powerUp;
  if (!powerUp) return;
  const distance = Math.hypot(this.man.x - powerUp.x, this.man.y - powerUp.y);
  if (distance <= (powerUp.radius + Math.max(this.man.width, this.man.height) / 2)) {
    this.speedBoost.multiplier *= 1.1;
    this.man.speed *= 1.1;
    this.speedBoost.powerUp = null;
    this.speedBoost.lastSpawnAt = now;
  }
}
```

```javascript
// Reset & initial application (js/game-engine.js:218-276)
beginGameAtLevel(level) {
  this.currentLevel = Math.max(1, Math.min(5, Number(level || 1)));
  const now = performance.now();
  if (this.currentLevel <= 3) {
    this.speedBoost.multiplier = 1;
    this.speedBoost.powerUp = null;
    this.speedBoost.lastSpawnAt = now;
  }
  // …
}

resetGameObjects() {
  // …
  const baseSpeed = GameConfig.man.speed;
  this.man.speed = (this.currentLevel <= 3)
    ? baseSpeed * this.speedBoost.multiplier
    : baseSpeed;
}
```

**Level-by-Level Notes**
- **Level 1:** Single cow on the classic field background. Boosts help the player stay ahead as the first cow accelerates over time via the existing speed-scaling logic.
- **Level 2:** Two cows begin in opposite corners (top-left/top-right). Boost spawns continue to give the player mobility against the doubled pressure.
- **Level 3:** Three cows (top-left, top-right, bottom-left) on the moon background. Boost stacks are especially useful to compensate for the triangular pincer pattern.

---

## Level 4: Beach Drop Stampede

**Environment**
- Background transitions to a sky-to-sand gradient with subtle wave lines for a beach vibe.

**Gameplay Mechanic**
- Instead of roaming cows, waves of “drop cows” spawn above the screen and descend vertically.
- A new wave spawns every 2 seconds (`waveIntervalMs = 2000`).
- Each wave contains at least two cows; every other wave increases the count by one (e.g., 2 → 2 → 3 → 3 → 4…).
- Cows fall straight down at a base speed plus a small incremental bump tied to the wave number.
- On-screen cows are removed once they exit the bottom of the canvas.
- Collision with any falling cow ends the run.

**Technical Notes**
- The regular cow speed-scaling logic is disabled for this level in favor of the wave system.
- Pausing/resuming the tab re-aligns the timers so waves do not “catch up” instantly on return.

```javascript
// Level 4 wave loop (js/game-engine.js:358-405, 547)
maybeSpawnLevel4Wave(now) {
  const state = this.level4;
  if (!state.lastWaveAt) state.lastWaveAt = now;
  if (now - state.lastWaveAt < state.waveIntervalMs) return;

  state.waveNumber += 1;
  const count = 2 + Math.floor((state.waveNumber - 1) / 2);
  this.spawnLevel4Wave(count);
  state.lastWaveAt = now;
}

spawnLevel4Wave(count) {
  // spawns cows above the viewport, each with disabledUntil tracking
}

gameLoop() {
  const now = performance.now();
  if (this.currentLevel === 4) {
    this.maybeSpawnLevel4Wave(now);
  }
  // …
}
```

---

## Level 5: Laser-Eye Showdown

**Environment**
- Neon gradient background with a subtle grid overlay to sell the sci-fi feel.

**Initial Setup**
- Two cows spawn on opposite corners (similar to Level 2), but now they can be temporarily neutralized.

**Power-Up: Laser Eyes**
- A magenta orb spawns every 2 seconds.
- Collecting the orb grants the man “laser eyes” for 1 second.
- While active:
  - Red beam lines render from the player’s eye position.
  - Any cow intersecting the beam’s vertical band is disabled for 1 second (`cow.disabledUntil`).
  - Disabled cows are omitted from collision checks and rendering until their timer elapses, at which point they resume normal behavior.
- Multiple or overlapping lasers simply extend the active window; there’s no stacking beyond resetting the timer.

**Additional Behavior**
- Standard collision rules apply when lasers are inactive.
- Power-up, disable timers, and beam rendering all pause/resume gracefully with visibility changes.

```javascript
// Level 5 laser flow (js/game-engine.js:401-468, 546-605)
maybeSpawnLevel5PowerUp(now) {
  if (!this.level5.lastPowerUpAt) this.level5.lastPowerUpAt = now;
  if (now - this.level5.lastPowerUpAt < this.level5.powerUpIntervalMs) return;
  this.spawnLevel5PowerUp();
  this.level5.lastPowerUpAt = now;
}

checkLevel5PowerUpCollision(now) {
  if (!this.level5.powerUp) return;
  const distance = Math.hypot(this.man.x - powerUp.x, this.man.y - powerUp.y);
  if (distance <= powerUp.radius + …) {
    this.activateLaser(now);
    this.level5.powerUp = null;
  }
}

applyLaserDamage(now) {
  if (!this.isLaserActive(now)) return;
  this.cows.forEach((cow) => {
    if (cow.disabledUntil > now) return;
    if (Math.abs(cow.y - eyeY) <= cow.height / 2 + 18) {
      this.disableCow(cow, now);
    }
  });
}

gameLoop() {
  const now = performance.now();
  if (this.currentLevel === 5) {
    this.maybeSpawnLevel5PowerUp(now);
  }
  // …
  if (this.currentLevel === 5) {
    this.checkLevel5PowerUpCollision(now);
    this.applyLaserDamage(now);
  }
}
```

---

## General Implementation Notes

- All state & timers live inside `js/game-engine.js` with supporting visuals in `js/graphics.js`.
- Power-ups rely on the global canvas reference for spawn bounds and on `requestAnimationFrame` for their update cadence.
- Restarting a game or switching levels clears ephemeral state (power-ups, timers, multipliers) while leaving persistent session data (initials, etc.) untouched.
