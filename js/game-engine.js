/**
 * Game Engine Module
 * Core game logic, mechanics, and main game loop coordination
 */

const GameEngine = {
    // Game state
    gameRunning: false,
    // Track if game was running before tab was hidden to avoid false resumes
    wasRunningBeforeHidden: false,
    // Level state
    currentLevel: 1,
    
    // Speed scaling state for the cow
    speedScaling: {
        intervalMs: 3000, // every 3 seconds
        factor: 1.21,      // increase by 21%
        lastIncreaseAt: 0  // timestamp via performance.now()
    },

    // Level 4 wave state
    level4: {
        waveIntervalMs: 2000,
        lastWaveAt: 0,
        waveNumber: 0,
        baseDropSpeed: 5
    },

    // Level 5 power-up state
    level5: {
        powerUpIntervalMs: 2000,
        lastPowerUpAt: 0,
        powerUp: null
    },

    laserActiveUntil: 0,
    
    // Game objects
    man: {
        x: 0,
        y: 0,
        width: 30,
        height: 30,
        speed: 5,
        targetX: 0,
        targetY: 0
    },
    // One or more cows depending on level
    cows: [],
    
    // Module references
    canvas: null,
    
    /**
     * Initialize the game engine
     */
    init() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            console.error('Game canvas not found!');
            return false;
        }
        
        // Initialize all modules
        this.initializeModules();
        
        // Set up visibility change handling
        this.setupVisibilityHandling();
        
        return true;
    },
    
    /**
     * Initialize all game modules
     */
    initializeModules() {
        // Initialize graphics module
        Graphics.init(this.canvas);
        
        // Initialize controls module
        Controls.init(this.canvas, {
            onTargetSet: (x, y) => this.setManTarget(x, y)
        });
        
        // Initialize UI module
        UI.init({
            onStartGame: () => this.startGame(),
            onPlayAgain: () => this.restartGame(),
            onInitialsConfirm: () => this.confirmInitialsAndStart(),
            onLevelSelect: (lvl) => this.selectLevelAndStart(lvl)
        });
    },
    
    /**
     * Set up visibility change handling for pause/resume
     */
    setupVisibilityHandling() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Game is in background, pause it and remember prior state
                this.wasRunningBeforeHidden = this.gameRunning === true;
                this.gameRunning = false;
                try { Controls.setGameRunning(false); } catch (_) {}
            } else {
                // Game is back in foreground, resume only if it was running before
                const shouldResume = this.wasRunningBeforeHidden && UI.handleVisibilityChange(true, this.gameRunning);
                if (shouldResume && !UI.isAnyScreenVisible()) {
                    this.gameRunning = true;
                    // Prevent catching up increases during background time
                    const resumeNow = (typeof performance !== 'undefined' ? performance.now() : Date.now());
                    this.speedScaling.lastIncreaseAt = resumeNow;
                    if (this.currentLevel === 4 && this.level4) {
                        this.level4.lastWaveAt = resumeNow;
                    }
                    if (this.currentLevel === 5 && this.level5) {
                        this.level5.lastPowerUpAt = resumeNow;
                    }
                    this.gameLoop();
                }
                this.wasRunningBeforeHidden = false;
            }
        });
    },
    
    /**
     * Start a new game
     */
    startGame() {
        // If initials are not set, route to initials screen
        try {
            const p = window.getPlayer ? window.getPlayer() : null;
            if (!p || !p.initials) {
                if (window.InitialsUI && window.InitialsUI.initInitialsUI) {
                    window.InitialsUI.initInitialsUI();
                }
                UI.showInitialsScreen();
                return;
            }
        } catch (_) {}

        // Always show level selection to give players a goal
        const unlocked = this.computeUnlockedLevel();
        if (!this._pendingLevelSelection) {
            this._pendingLevelSelection = true;
            UI.showLevelScreen(unlocked);
            return;
        }

        // If already pending (e.g., returning from initials), proceed
        this.beginGameAtLevel(this.currentLevel || 1);
    },

    confirmInitialsAndStart() {
        try {
            if (window.InitialsUI && window.updatePlayer) {
                const initials = window.InitialsUI.getInitials();
                const p = window.updatePlayer({ initials });
                if (window.renderPlayerSummary) window.renderPlayerSummary(p);
            }
        } catch (_) {}
        // Then start the game normally
        this.startGame();
    },

    /**
     * Compute highest unlocked level based on games played
     * L1: default, L2: >=2 games, L3: >=4 games
     */
    computeUnlockedLevel() {
        return 5;
    },

    /** Handle selection from the level screen and begin */
    selectLevelAndStart(level) {
        this.currentLevel = Math.max(1, Math.min(5, Number(level || 1)));
        this._pendingLevelSelection = false;
        // For level 1 and 2, show a level-specific start screen before beginning
        if (this.currentLevel === 1) {
            try { if (UI && typeof UI.showScreen === "function") UI.showScreen('levelStart'); } catch (_) {}
            return;
        }
        if (this.currentLevel === 2) {
            try { if (UI && typeof UI.showScreen === "function") UI.showScreen('level2Start'); } catch (_) {}
            return;
        }
        if (this.currentLevel === 3) {
            try { if (UI && typeof UI.showScreen === "function") UI.showScreen('level3Start'); } catch (_) {}
            return;
        }
        if (this.currentLevel === 4) {
            try { if (UI && typeof UI.showScreen === "function") UI.showScreen('level4Start'); } catch (_) {}
            return;
        }
        if (this.currentLevel === 5) {
            try { if (UI && typeof UI.showScreen === "function") UI.showScreen('level5Start'); } catch (_) {}
            return;
        }
        this.beginGameAtLevel(this.currentLevel);
    },

    /** Begin game with a specific level */
    beginGameAtLevel(level) {
        this.currentLevel = Math.max(1, Math.min(5, Number(level || 1)));
        // Inform graphics of the level
        try { if (Graphics && typeof Graphics.setLevel === 'function') Graphics.setLevel(this.currentLevel); } catch (_) {}

        // Hide all UI screens
        UI.showGameScreen();

        // Reset game objects to initial positions
        this.resetGameObjects();

        // Update controls state
        Controls.setGameRunning(true);

        // Start the game
        this.gameRunning = true;
        const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        // Initialize timers per level
        if (this.currentLevel === 4) {
            this.level4.lastWaveAt = now;
            this.level4.waveNumber = 0;
        }
        if (this.currentLevel === 5) {
            this.level5.lastPowerUpAt = now;
            this.level5.powerUp = null;
            this.laserActiveUntil = 0;
        }
        this.speedScaling.lastIncreaseAt = now;
        this.gameLoop();
    },
    
    /**
     * Reset game objects to initial positions
     */
    resetGameObjects() {
        const canvasSize = Graphics.resizeCanvas();
        const config = GameConfig.initialPositions;
        
        // Reset man position
        this.man.x = canvasSize.width * config.man.x;
        this.man.y = canvasSize.height * config.man.y;
        this.man.targetX = this.man.x;
        this.man.targetY = this.man.y;
        this.man.width = GameConfig.man.width;
        this.man.height = GameConfig.man.height;
        this.man.speed = GameConfig.man.speed;
        
        // Reset cow(s) based on level
        const baseCow = () => ({
            x: 0,
            y: 0,
            width: GameConfig.cow.width,
            height: GameConfig.cow.height,
            speed: GameConfig.cow.speed,
            disabledUntil: 0
        });
        this.cows = [];
        if (this.currentLevel === 2) {
            // Two cows: top-left and top-right
            const margin = 40;
            const c1 = baseCow();
            c1.x = margin;
            c1.y = margin;
            const c2 = baseCow();
            c2.x = canvasSize.width - margin;
            c2.y = margin;
            this.cows.push(c1, c2);
        } else if (this.currentLevel === 3) {
            // Three cows: top-left, top-right, bottom-left
            const margin = 40;
            const c1 = baseCow(); c1.x = margin; c1.y = margin;
            const c2 = baseCow(); c2.x = canvasSize.width - margin; c2.y = margin;
            const c3 = baseCow(); c3.x = margin; c3.y = canvasSize.height - margin;
            this.cows.push(c1, c2, c3);
        } else if (this.currentLevel === 4) {
            // Level 4 spawns happen during gameplay; start with no cows on screen
            this.cows = [];
        } else if (this.currentLevel === 5) {
            const margin = 60;
            const c1 = baseCow(); c1.x = margin; c1.y = margin;
            const c2 = baseCow(); c2.x = canvasSize.width - margin; c2.y = canvasSize.height - margin;
            this.cows.push(c1, c2);
        } else {
            const c = baseCow();
            c.x = canvasSize.width * config.cow.x;
            c.y = canvasSize.height * config.cow.y;
            this.cows.push(c);
        }
    },
    
    /**
     * Set man's target position
     */
    setManTarget(x, y) {
        this.man.targetX = x;
        this.man.targetY = y;
    },
    
    /**
     * Check if man is stationary (close to target)
     */
    isManStationary() {
        const dx = this.man.targetX - this.man.x;
        const dy = this.man.targetY - this.man.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < GameConfig.vibration.stationaryThreshold;
    },
    
    /**
     * Move man towards target position
     */
    moveMan() {
        const dx = this.man.targetX - this.man.x;
        const dy = this.man.targetY - this.man.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If not at target, move toward it
        if (distance > 1) {
            this.man.x += (dx / distance) * this.man.speed;
            this.man.y += (dy / distance) * this.man.speed;
        }
    },
    
    /**
     * Move cow towards man
     */
    moveCows(now) {
        if (this.currentLevel === 4) {
            this.updateLevel4Cows();
            return;
        }
        for (const cow of this.cows) {
            if (cow.disabledUntil && cow.disabledUntil > now) continue;
            if (cow.disabledUntil && cow.disabledUntil <= now) cow.disabledUntil = 0;
            const dx = this.man.x - cow.x;
            const dy = this.man.y - cow.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 0) {
                cow.x += (dx / distance) * cow.speed;
                cow.y += (dy / distance) * cow.speed;
            }
        }
    },

    updateLevel4Cows() {
        const canvasHeight = this.canvas ? this.canvas.height : (typeof window !== 'undefined' ? window.innerHeight : 0);
        const remaining = [];
        for (const cow of this.cows) {
            cow.y += cow.speed;
            if ((cow.y - cow.height / 2) <= canvasHeight + cow.height) {
                remaining.push(cow);
            }
        }
        this.cows = remaining;
    },

    maybeSpawnLevel4Wave(now) {
        const state = this.level4;
        if (!state) return;
        if (!state.lastWaveAt) {
            state.lastWaveAt = now;
        }
        if (now - state.lastWaveAt < state.waveIntervalMs) return;

        state.waveNumber += 1;
        const count = 2 + Math.floor((state.waveNumber - 1) / 2);
        this.spawnLevel4Wave(count);
        state.lastWaveAt = now;
    },

    spawnLevel4Wave(count) {
        if (!this.canvas) return;
        const state = this.level4;
        const width = this.canvas.width;
        const cowConfig = GameConfig.cow || { width: 40, height: 40, speed: 2 };
        const halfW = cowConfig.width / 2;
        const xMin = halfW;
        const xMax = Math.max(xMin, width - halfW);
        const waveXs = [];
        for (let i = 0; i < count; i++) {
            let x = xMin + Math.random() * Math.max(1, xMax - xMin);
            let attempts = 0;
            while (attempts < 5 && waveXs.some(prev => Math.abs(prev - x) < cowConfig.width)) {
                x = xMin + Math.random() * Math.max(1, xMax - xMin);
                attempts += 1;
            }
            waveXs.push(x);
            const cow = {
                x,
                y: -cowConfig.height - Math.random() * 80,
                width: cowConfig.width,
                height: cowConfig.height,
                speed: state.baseDropSpeed + Math.min(state.waveNumber * 0.4, 5) + Math.random() * 0.8,
                disabledUntil: 0
            };
            this.cows.push(cow);
        }
    },

    maybeSpawnLevel5PowerUp(now) {
        const state = this.level5;
        if (!state) return;
        if (!state.lastPowerUpAt) state.lastPowerUpAt = now;
        if (now - state.lastPowerUpAt < state.powerUpIntervalMs) return;
        this.spawnLevel5PowerUp();
        state.lastPowerUpAt = now;
    },

    spawnLevel5PowerUp() {
        if (!this.canvas) return;
        const radius = 18;
        const padding = radius + 10;
        const x = padding + Math.random() * Math.max(1, this.canvas.width - padding * 2);
        const y = padding + Math.random() * Math.max(1, this.canvas.height - padding * 2);
        this.level5.powerUp = { x, y, radius };
    },

    checkLevel5PowerUpCollision(now) {
        const powerUp = this.level5.powerUp;
        if (!powerUp) return;
        const dx = this.man.x - powerUp.x;
        const dy = this.man.y - powerUp.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= (powerUp.radius + Math.max(this.man.width, this.man.height) / 2)) {
            this.activateLaser(now);
            this.level5.powerUp = null;
            this.level5.lastPowerUpAt = now;
        }
    },

    activateLaser(now) {
        this.laserActiveUntil = now + 1000; // 1 second duration
    },

    isLaserActive(now) {
        return now <= this.laserActiveUntil;
    },

    disableCow(cow, now) {
        cow.disabledUntil = now + 1000;
    },

    drawLevel5PowerUp() {
        if (this.currentLevel !== 5) return;
        const powerUp = this.level5.powerUp;
        if (!powerUp) return;
        const ctx = Graphics && Graphics.ctx;
        if (!ctx) return;
        ctx.save();
        const gradient = ctx.createRadialGradient(powerUp.x, powerUp.y, 6, powerUp.x, powerUp.y, powerUp.radius);
        gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
        gradient.addColorStop(0.5, '#ff4f6d');
        gradient.addColorStop(1, 'rgba(255,20,147,0.4)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(powerUp.x, powerUp.y, powerUp.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },

    drawLaserEyes(now) {
        if (this.currentLevel !== 5) return;
        if (!this.isLaserActive(now)) return;
        const ctx = Graphics && Graphics.ctx;
        const config = GameConfig.man;
        if (!ctx || !config) return;
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.85)';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        const eyeOffsetX = config.headWidth / 4;
        const eyeY = this.man.y - config.height / 2 - config.headHeight / 2;
        const leftEyeX = this.man.x - eyeOffsetX;
        const rightEyeX = this.man.x + eyeOffsetX;
        const beamLength = this.canvas ? this.canvas.width : (typeof window !== 'undefined' ? window.innerWidth : 400);
        ctx.beginPath();
        ctx.moveTo(leftEyeX, eyeY);
        ctx.lineTo(leftEyeX - beamLength, eyeY - 20);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(rightEyeX, eyeY);
        ctx.lineTo(rightEyeX + beamLength, eyeY - 10);
        ctx.stroke();
        ctx.restore();
    },

    applyLaserDamage(now) {
        if (this.currentLevel !== 5) return;
        if (!this.isLaserActive(now)) return;
        const config = GameConfig.man;
        if (!config) return;
        const eyeOffsetX = config.headWidth / 4;
        const eyeY = this.man.y - config.height / 2 - config.headHeight / 2;
        for (const cow of this.cows) {
            if (cow.disabledUntil && cow.disabledUntil > now) continue;
            if (cow.disabledUntil && cow.disabledUntil <= now) cow.disabledUntil = 0;
            const dy = Math.abs(cow.y - eyeY);
            const verticalHit = dy <= (cow.height / 2 + 18);
            if (!verticalHit) continue;
            if (cow.x < this.man.x - eyeOffsetX) {
                this.disableCow(cow, now);
            } else if (cow.x > this.man.x + eyeOffsetX) {
                this.disableCow(cow, now);
            }
        }
    },
    
    /**
     * Check collision between man and cow
     */
    checkCollision(now) {
        for (const cow of this.cows) {
            if (cow.disabledUntil && cow.disabledUntil > now) continue;
            if (cow.disabledUntil && cow.disabledUntil <= now) cow.disabledUntil = 0;
            const dx = this.man.x - cow.x;
            const dy = this.man.y - cow.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < (this.man.width / 2 + cow.width / 2)) {
                if (this.currentLevel === 5 && this.isLaserActive(now)) {
                    this.disableCow(cow, now);
                    continue;
                }
                return true;
            }
        }
        return false;
    },
    
    /**
     * Handle game over
     */
    gameOver() {
        this.gameRunning = false;
        Controls.setGameRunning(false);
        UI.showGameOverScreen();
    },
    
    // Combined flow: no separate ending screen
    
    /**
     * Restart the game
     */
    restartGame() {
        this.gameRunning = false;
        Controls.setGameRunning(false);
        this.laserActiveUntil = 0;
        if (this.level5) {
            this.level5.powerUp = null;
        }
        UI.showSetupScreen();
        // Ensure summary reflects latest values when returning home
        try { if (window.renderPlayerSummary) window.renderPlayerSummary(); } catch (_) {}
    },
    
    /**
     * Main game loop
     */
    gameLoop() {
        if (!this.gameRunning) return;
        
        // Apply timed cow speed increases
        const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        if (this.currentLevel === 4) {
            this.maybeSpawnLevel4Wave(now);
        } else {
            const elapsedSinceLast = now - this.speedScaling.lastIncreaseAt;
            if (elapsedSinceLast >= this.speedScaling.intervalMs) {
                const steps = Math.floor(elapsedSinceLast / this.speedScaling.intervalMs);
                // Multiply once by factor^steps to avoid incremental rounding
                const mult = Math.pow(this.speedScaling.factor, steps);
                try {
                    const before0 = (this.cows[0]?.speed ?? 0);
                    for (const cow of this.cows) cow.speed *= mult;
                    const after0 = (this.cows[0]?.speed ?? 0);
                    console.log(`[CowSpeed] +${steps} step(s): ${before0.toFixed(3)} -> ${after0.toFixed(3)} (applied to ${this.cows.length} cow(s))`);
                } catch (_) { for (const cow of this.cows) cow.speed *= mult; }
                this.speedScaling.lastIncreaseAt += steps * this.speedScaling.intervalMs;
            }
            if (this.currentLevel === 5) {
                this.maybeSpawnLevel5PowerUp(now);
            }
        }

        // Update vibration effect
        Graphics.updateVibration(this.isManStationary());
        
        // Clear canvas
        Graphics.clearCanvas();
        
        // Draw field background
        Graphics.drawBackground();

        if (this.currentLevel === 5) {
            this.drawLevel5PowerUp();
        }

        // Debug HUD: show first cow speed (temporary to verify scaling)
        if (this.currentLevel !== 4 && this.currentLevel !== 5) {
            try {
                const ctx = Graphics && Graphics.ctx;
                if (ctx) {
                    ctx.save();
                    ctx.font = '28px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif';
                    ctx.fillStyle = 'rgba(255,255,255,0.9)';
                    const s = (this.cows[0]?.speed || 0).toFixed(2);
                    ctx.fillText(`Cow speed: ${s}`, 12, 38);
                    ctx.restore();
                }
            } catch (_) {}
        }

        // Update game objects
        this.moveMan();
        if (this.currentLevel === 5) {
            this.checkLevel5PowerUpCollision(now);
            this.applyLaserDamage(now);
        }
        this.moveCows(now);
        
        // Check for collision
        if (this.checkCollision(now)) {
            this.gameOver();
            return;
        }
        
        // Draw game objects
        for (const cow of this.cows) {
            if (cow.disabledUntil && cow.disabledUntil > now) continue;
            Graphics.drawCow(cow);
        }
        Graphics.drawMan(this.man);
        this.drawLaserEyes(now);
        
        // Continue game loop
        requestAnimationFrame(() => this.gameLoop());
    },
    
    /**
     * Get current game state
     */
    getGameState() {
        return {
            running: this.gameRunning,
            man: { ...this.man },
            cows: this.cows.map(c => ({ ...c }))
        };
    },
    
    /**
     * Pause the game
     */
    pause() {
        this.gameRunning = false;
        Controls.setGameRunning(false);
    },
    
    /**
     * Resume the game
     */
    resume() {
        if (!UI.isAnyScreenVisible()) {
            this.gameRunning = true;
            Controls.setGameRunning(true);
            // Prevent catching up increases during paused time
            const resumeNow = (typeof performance !== 'undefined' ? performance.now() : Date.now());
            this.speedScaling.lastIncreaseAt = resumeNow;
            if (this.currentLevel === 4 && this.level4) {
                this.level4.lastWaveAt = resumeNow;
            }
            if (this.currentLevel === 5 && this.level5) {
                this.level5.lastPowerUpAt = resumeNow;
            }
            this.gameLoop();
        }
    },
    
    /**
     * Cleanup game resources
     */
    cleanup() {
        this.gameRunning = false;
        Controls.cleanup();
        UI.cleanup();
    }
};

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (GameEngine.init()) {
        console.log('Game engine initialized successfully');
    } else {
        console.error('Failed to initialize game engine');
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameEngine;
} else {
    window.GameEngine = GameEngine;
}
