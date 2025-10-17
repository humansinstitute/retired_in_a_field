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

    // Level 4 wave state (falling cows)
    level4: {
        waveIntervalMs: 2000,
        lastWaveAt: 0,
        waveNumber: 0,
        baseDropSpeed: 5
    },

    // Level 5 laser power-up state
    level5: {
        powerUpIntervalMs: 2000,
        lastPowerUpAt: 0,
        powerUp: null
    },

    // Level 6 (plane) skydiver state
    level6: {
        waveIntervalMs: 2000,
        lastWaveAt: 0,
        waveNumber: 0,
        baseDropSpeed: 3.8,
        speedVariance: 1.2,
        horizontalDrift: 0.6,
        powerUpIntervalMs: 5000,
        lastPowerUpAt: 0,
        powerUp: null
    },

    // Speed boost state for classic chase levels
    speedBoost: {
        intervalMs: 2000,
        lastSpawnAt: 0,
        powerUp: null,
        multiplier: 1
    },

    laserActiveUntil: 0,

    // Tracking per-run stats
    maxCowSpeed: 0,
    lastPoints: 0,
    
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
                    // Prevent timers from jumping forward while hidden
                    const resumeNow = (typeof performance !== 'undefined' ? performance.now() : Date.now());
                    this.speedScaling.lastIncreaseAt = resumeNow;
                    if (this.currentLevel === 4 && this.level4) {
                        this.level4.lastWaveAt = resumeNow;
                    }
                    if (this.currentLevel === 5 && this.level5) {
                        this.level5.lastPowerUpAt = resumeNow;
                    }
                    if (this.currentLevel === 6 && this.level6) {
                        this.level6.lastWaveAt = resumeNow;
                        this.level6.lastPowerUpAt = resumeNow;
                    }
                    if (this.currentLevel >= 1 && this.currentLevel <= 3 && this.speedBoost) {
                        this.speedBoost.lastSpawnAt = resumeNow;
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
            let p = window.getPlayer ? window.getPlayer() : null;
            let initials = p?.initials;
            if (!initials) {
                try {
                    const serverInitials = window._serverPlayer && window._serverPlayer.initials;
                    if (serverInitials && window.updatePlayer) {
                        p = window.updatePlayer({ initials: serverInitials }) || p;
                        initials = serverInitials;
                    }
                } catch (_) {}
            }
            if (!p || !initials) {
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
        // Standalone build unlocks all six levels
        return 6;
    },

    /** Handle selection from the level screen and begin */
    selectLevelAndStart(level) {
        this.currentLevel = Math.max(1, Math.min(6, Number(level || 1)));
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
        if (this.currentLevel === 6) {
            try { if (UI && typeof UI.showScreen === "function") UI.showScreen('level6Start'); } catch (_) {}
            return;
        }
        this.beginGameAtLevel(this.currentLevel);
    },

    /** Begin game with a specific level */
    beginGameAtLevel(level) {
        this.currentLevel = Math.max(1, Math.min(6, Number(level || 1)));
        const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());

        if (this.currentLevel >= 1 && this.currentLevel <= 3 && this.speedBoost) {
            this.speedBoost.multiplier = 1;
            this.speedBoost.powerUp = null;
            this.speedBoost.lastSpawnAt = now;
        } else if (this.speedBoost) {
            this.speedBoost.powerUp = null;
            this.speedBoost.multiplier = 1;
        }

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

        if (this.currentLevel === 4 && this.level4) {
            this.level4.lastWaveAt = now;
            this.level4.waveNumber = 0;
        }
        if (this.currentLevel === 5 && this.level5) {
            this.level5.lastPowerUpAt = now;
            this.level5.powerUp = null;
            this.laserActiveUntil = 0;
        }
        if (this.currentLevel === 6 && this.level6) {
            this.level6.lastWaveAt = now;
            this.level6.waveNumber = 0;
            this.level6.lastPowerUpAt = now;
            this.level6.powerUp = null;
            this.laserActiveUntil = 0;
        }

        // Initialize timers at game start
        this.speedScaling.lastIncreaseAt = now;

        // Reset per-run stats
        this.updateMaxCowSpeed(true);
        this.lastPoints = 0;

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
        const baseSpeed = GameConfig.man.speed;
        if (this.currentLevel >= 1 && this.currentLevel <= 3) {
            this.man.speed = baseSpeed * (this.speedBoost?.multiplier || 1);
        } else {
            this.man.speed = baseSpeed;
        }
        
        // Reset cow(s) based on level
        const baseCow = () => ({
            x: 0,
            y: 0,
            width: GameConfig.cow.width,
            height: GameConfig.cow.height,
            speed: GameConfig.cow.speed,
            disabledUntil: 0,
            vx: 0
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
            // Falling cows spawn during gameplay; start empty
            this.cows = [];
        } else if (this.currentLevel === 5) {
            const margin = 60;
            const c1 = baseCow();
            c1.x = margin;
            c1.y = margin;
            const c2 = baseCow();
            c2.x = canvasSize.width - margin;
            c2.y = canvasSize.height - margin;
            this.cows.push(c1, c2);
        } else if (this.currentLevel === 6) {
            // Falling cows spawn during gameplay; start empty
            this.cows = [];
        } else {
            const c = baseCow();
            c.x = canvasSize.width * config.cow.x;
            c.y = canvasSize.height * config.cow.y;
            this.cows.push(c);
        }
        // Initialize maxCowSpeed baseline to starting cow speeds
        this.updateMaxCowSpeed(true);
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
     * Move cow towards man or update per-level behavior
     */
    moveCows(now) {
        if (this.currentLevel === 4) {
            this.updateLevel4Cows();
            return;
        }
        if (this.currentLevel === 6) {
            this.updateLevel6Cows(now);
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
        if (!state.lastWaveAt) state.lastWaveAt = now;
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
            this.maxCowSpeed = Math.max(this.maxCowSpeed || 0, cow.speed);
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
        if (!this.canvas || !this.level5) return;
        const radius = 18;
        const padding = radius + 10;
        const x = padding + Math.random() * Math.max(1, this.canvas.width - padding * 2);
        const y = padding + Math.random() * Math.max(1, this.canvas.height - padding * 2);
        this.level5.powerUp = { x, y, radius };
    },

    maybeSpawnLevel6Wave(now) {
        const state = this.level6;
        if (!state || !this.canvas) return;
        if (!state.lastWaveAt) state.lastWaveAt = now;
        if (now - state.lastWaveAt < state.waveIntervalMs) return;

        state.waveNumber += 1;
        const count = Math.min(5, 2 + Math.floor(Math.max(0, state.waveNumber - 1) / 2));
        this.spawnLevel6Wave(count);
        state.lastWaveAt = now;
    },

    spawnLevel6Wave(count) {
        if (!this.canvas) return;
        const state = this.level6;
        if (!state) return;
        const cowConfig = GameConfig.cow || { width: 40, height: 40 };
        const width = this.canvas.width;
        const halfW = cowConfig.width / 2;
        const xMin = halfW + 24;
        const xMax = Math.max(xMin, width - halfW - 24);
        const positions = [];

        for (let i = 0; i < count; i++) {
            let x = xMin + Math.random() * Math.max(1, xMax - xMin);
            let attempts = 0;
            while (attempts < 6 && positions.some(p => Math.abs(p - x) < cowConfig.width * 1.1)) {
                x = xMin + Math.random() * Math.max(1, xMax - xMin);
                attempts += 1;
            }
            positions.push(x);

            const verticalSpeed = Math.max(2.6, state.baseDropSpeed + (Math.random() - 0.5) * state.speedVariance);
            const vx = (Math.random() - 0.5) * (state.horizontalDrift || 0);
            const cow = {
                x,
                y: -cowConfig.height - Math.random() * 80,
                width: cowConfig.width,
                height: cowConfig.height,
                speed: verticalSpeed,
                disabledUntil: 0,
                vx
            };
            this.cows.push(cow);
        }
    },

    updateLevel6Cows(now) {
        if (!this.canvas) return;
        const floorY = this.canvas.height + 120;
        const remaining = [];
        for (const cow of this.cows) {
            if (cow.disabledUntil && cow.disabledUntil > now) continue;
            cow.y += cow.speed;
            if (cow.vx) {
                cow.x += cow.vx;
                if (cow.x < 0) cow.x = 0;
                if (cow.x > this.canvas.width) cow.x = this.canvas.width;
            }
            if (cow.y < floorY) {
                remaining.push(cow);
            }
        }
        this.cows = remaining;
    },

    maybeSpawnLevel6PowerUp(now) {
        const state = this.level6;
        if (!state || !this.canvas) return;
        if (!state.lastPowerUpAt) state.lastPowerUpAt = now;
        if (state.powerUp) return;
        if (now - state.lastPowerUpAt < state.powerUpIntervalMs) return;
        state.lastPowerUpAt = now;
        this.spawnLevel6PowerUp();
    },

    spawnLevel6PowerUp() {
        if (!this.canvas || !this.level6) return;
        const radius = 16;
        const paddingX = radius + 30;
        const x = paddingX + Math.random() * Math.max(1, this.canvas.width - paddingX * 2);
        const halfHeight = this.canvas.height * 0.5;
        const minY = Math.max(halfHeight + radius, this.canvas.height * 0.55);
        const maxY = Math.max(minY, this.canvas.height - radius - 24);
        const range = Math.max(1, maxY - minY);
        const y = minY + Math.random() * range;
        this.level6.powerUp = { x, y, radius };
    },

    checkLevel5PowerUpCollision(now) {
        const state = this.level5;
        if (!state || !state.powerUp) return;
        const { powerUp } = state;
        const dx = this.man.x - powerUp.x;
        const dy = this.man.y - powerUp.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= (powerUp.radius + Math.max(this.man.width, this.man.height) / 2)) {
            this.activateLaser(now);
            state.powerUp = null;
            state.lastPowerUpAt = now;
        }
    },

    checkLevel6PowerUpCollision(now) {
        const state = this.level6;
        if (!state || !state.powerUp) return;
        const { powerUp } = state;
        const dx = this.man.x - powerUp.x;
        const dy = this.man.y - powerUp.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= (powerUp.radius + Math.max(this.man.width, this.man.height) / 2)) {
            this.activateLaser(now, 3000);
            state.powerUp = null;
            state.lastPowerUpAt = now;
        }
    },

    activateLaser(now, durationMs = 1000) {
        this.laserActiveUntil = now + durationMs;
    },

    isLaserActive(now) {
        return now <= this.laserActiveUntil;
    },

    disableCow(cow, now) {
        cow.disabledUntil = now + 1000;
    },

    maybeSpawnSpeedBoost(now) {
        if (!(this.currentLevel >= 1 && this.currentLevel <= 3)) return;
        const state = this.speedBoost;
        if (!state) return;
        if (!state.lastSpawnAt) state.lastSpawnAt = now;
        if (state.powerUp) return;
        if (now - state.lastSpawnAt < state.intervalMs) return;
        state.lastSpawnAt = now;
        this.spawnSpeedBoostPowerUp();
    },

    spawnSpeedBoostPowerUp() {
        if (!this.canvas || !this.speedBoost) return;
        const radius = 16;
        const padding = radius + 12;
        const x = padding + Math.random() * Math.max(1, this.canvas.width - padding * 2);
        const y = padding + Math.random() * Math.max(1, this.canvas.height - padding * 2);
        this.speedBoost.powerUp = { x, y, radius };
    },

    checkSpeedBoostCollision(now) {
        if (!(this.currentLevel >= 1 && this.currentLevel <= 3)) return;
        const powerUp = this.speedBoost?.powerUp;
        if (!powerUp) return;
        const dx = this.man.x - powerUp.x;
        const dy = this.man.y - powerUp.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= (powerUp.radius + Math.max(this.man.width, this.man.height) / 2)) {
            this.speedBoost.multiplier *= 1.1;
            this.man.speed *= 1.1;
            this.speedBoost.powerUp = null;
            this.speedBoost.lastSpawnAt = now;
        }
    },

    drawSpeedBoostPowerUp() {
        if (!(this.currentLevel >= 1 && this.currentLevel <= 3)) return;
        const powerUp = this.speedBoost?.powerUp;
        if (!powerUp) return;
        const ctx = Graphics && Graphics.ctx;
        if (!ctx) return;
        ctx.save();
        const gradient = ctx.createRadialGradient(powerUp.x, powerUp.y, 4, powerUp.x, powerUp.y, powerUp.radius);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.6, '#00d4ff');
        gradient.addColorStop(1, 'rgba(0, 212, 255, 0.35)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(powerUp.x, powerUp.y, powerUp.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },

    drawLevel5PowerUp() {
        if (this.currentLevel !== 5) return;
        const powerUp = this.level5?.powerUp;
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

    drawLevel6PowerUp() {
        if (this.currentLevel !== 6) return;
        const powerUp = this.level6?.powerUp;
        if (!powerUp) return;
        const ctx = Graphics && Graphics.ctx;
        if (!ctx) return;
        ctx.save();
        const gradient = ctx.createRadialGradient(powerUp.x, powerUp.y, 5, powerUp.x, powerUp.y, powerUp.radius);
        gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
        gradient.addColorStop(0.45, '#3de3ff');
        gradient.addColorStop(1, 'rgba(61, 227, 255, 0.25)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(powerUp.x, powerUp.y, powerUp.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(powerUp.x, powerUp.y, powerUp.radius - 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    },

    drawLaserEyes(now) {
        if (!this.isLaserActive(now)) return;
        if (this.currentLevel !== 5 && this.currentLevel !== 6) return;
        const ctx = Graphics && Graphics.ctx;
        const config = GameConfig.man;
        if (!ctx || !config) return;
        ctx.save();
        const eyeOffsetX = config.headWidth / 4;
        const eyeY = this.man.y - config.height / 2 - config.headHeight / 2;
        const leftEyeX = this.man.x - eyeOffsetX;
        const rightEyeX = this.man.x + eyeOffsetX;
        if (this.currentLevel === 5) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.85)';
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            const beamLength = this.canvas ? this.canvas.width : (typeof window !== 'undefined' ? window.innerWidth : 400);
            ctx.beginPath();
            ctx.moveTo(leftEyeX, eyeY);
            ctx.lineTo(leftEyeX - beamLength, eyeY - 20);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(rightEyeX, eyeY);
            ctx.lineTo(rightEyeX + beamLength, eyeY - 10);
            ctx.stroke();
        } else if (this.currentLevel === 6) {
            ctx.lineCap = 'round';
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.85)';
            ctx.lineWidth = 6;
            const topY = 0;
            ctx.beginPath();
            ctx.moveTo(leftEyeX, eyeY);
            ctx.lineTo(leftEyeX, topY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(rightEyeX, eyeY);
            ctx.lineTo(rightEyeX, topY);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(150, 255, 255, 0.35)';
            ctx.lineWidth = 12;
            ctx.beginPath();
            ctx.moveTo(leftEyeX, eyeY);
            ctx.lineTo(leftEyeX, topY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(rightEyeX, eyeY);
            ctx.lineTo(rightEyeX, topY);
            ctx.stroke();
        }
        ctx.restore();
    },

    applyLaserDamage(now) {
        if (!this.isLaserActive(now)) return;
        if (this.currentLevel !== 5 && this.currentLevel !== 6) return;
        const config = GameConfig.man;
        if (!config) return;
        const eyeOffsetX = config.headWidth / 4;
        const eyeY = this.man.y - config.height / 2 - config.headHeight / 2;
        if (this.currentLevel === 5) {
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
            return;
        }

        const leftEyeX = this.man.x - eyeOffsetX;
        const rightEyeX = this.man.x + eyeOffsetX;
        const beamHalfWidth = Math.max(10, config.headWidth / 3);
        for (const cow of this.cows) {
            if (cow.disabledUntil && cow.disabledUntil > now) continue;
            if (cow.disabledUntil && cow.disabledUntil <= now) cow.disabledUntil = 0;
            if (cow.y > this.man.y) continue;
            const leftHit = Math.abs(cow.x - leftEyeX) <= (cow.width / 2 + beamHalfWidth);
            const rightHit = Math.abs(cow.x - rightEyeX) <= (cow.width / 2 + beamHalfWidth);
            if (leftHit || rightHit) {
                this.disableCow(cow, now);
            }
        }
    },

    updateMaxCowSpeed(forceReset = false) {
        try {
            let maxS = forceReset ? 0 : (this.maxCowSpeed || 0);
            for (const c of this.cows) {
                maxS = Math.max(maxS, Number(c.speed || 0));
            }
            this.maxCowSpeed = maxS;
        } catch (_) {
            if (forceReset) this.maxCowSpeed = 0;
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
                if ((this.currentLevel === 5 || this.currentLevel === 6) && this.isLaserActive(now)) {
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
        this.laserActiveUntil = 0;
        if (this.level5) {
            this.level5.powerUp = null;
        }
        if (this.level6) {
            this.level6.powerUp = null;
            this.level6.waveNumber = 0;
            this.level6.lastWaveAt = 0;
            this.level6.lastPowerUpAt = 0;
        }
        if (this.speedBoost) {
            this.speedBoost.powerUp = null;
            this.speedBoost.multiplier = 1;
        }
        // Do not mutate local stats; authoritative stats come from Context VM
        // Optionally refresh server stats display
        try { if (window.fetchPlayerStatsWithPlayerKey) window.fetchPlayerStatsWithPlayerKey(); } catch (_) {}

        // Submit leaderboard entry (non-blocking) and refresh leaderboard on success
        try {
            const player = window.getPlayer ? window.getPlayer() : null;
            const npub = player?.linked_npub || player?.npub;
            const initials = player?.initials;
            const satsLost = Number((player?.last_pledge ?? 0)); // per-game sats lost for this round
            // Generate points (random between 21 and 25621)
            const points = (() => {
                try {
                    const min = 21, max = 25621;
                    const val = Math.floor(Math.random() * (max - min + 1)) + min;
                    this.lastPoints = val;
                    return val;
                } catch (_) { this.lastPoints = 21; return 21; }
            })();
            // Capture max cow speed for this round
            const maxCowSpeed = Number(this.maxCowSpeed || 0);
            const canSubmit = Boolean(window.submitLeaderboardEntry && npub && initials && satsLost > 0);
            try { console.log('[Leaderboard submit check]', { npub, initials, satsLost, canSubmit }); } catch (_) {}
            if (canSubmit) {
                Promise.resolve(window.submitLeaderboardEntry({ npub, initials, satsLost, points, maxCowSpeed }))
                    .then((ok) => {
                        try { console.log('[Leaderboard submit result]', ok); } catch (_) {}
                        if (ok && window.fetchLeaderboardWithPlayerKey) window.fetchLeaderboardWithPlayerKey();
                    })
                    .catch((err) => { try { console.error('[Leaderboard submit error]', err); } catch (_) {} });
            }
        } catch (e) { try { console.error('[Leaderboard submit exception]', e); } catch (_) {} }
        // Update game-over score message and extras
        try {
            const player = window.getPlayer ? window.getPlayer() : null;
            const pledged = Number((player?.last_pledge ?? 0));
            const msg = document.getElementById('scoreMessage');
            if (msg) msg.textContent = `You have scored ${pledged} sats!`;
            const pmsg = document.getElementById('pointsMessage');
            if (pmsg) pmsg.textContent = `Points: ${this.lastPoints}`;
            const sMsg = document.getElementById('maxSpeedMessage');
            if (sMsg) sMsg.textContent = `Max Cow Speed: ${Number(this.maxCowSpeed || 0).toFixed(2)}`;
        } catch (_) {}

        // Optimistically increment local games played so levels can unlock within session
        try {
            const p = window.getPlayer ? window.getPlayer() : null;
            const gp = Number((p?.games_played || 0)) + 1;
            if (window.updatePlayer) window.updatePlayer({ games_played: gp });
        } catch (_) {}
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
        if (this.level6) {
            this.level6.powerUp = null;
            this.level6.waveNumber = 0;
            this.level6.lastWaveAt = 0;
            this.level6.lastPowerUpAt = 0;
        }
        if (this.speedBoost) {
            this.speedBoost.powerUp = null;
            this.speedBoost.multiplier = 1;
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
        
        const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        if (this.currentLevel === 4) {
            this.maybeSpawnLevel4Wave(now);
        } else if (this.currentLevel === 6) {
            this.maybeSpawnLevel6Wave(now);
            this.maybeSpawnLevel6PowerUp(now);
        } else {
            const elapsedSinceLast = now - this.speedScaling.lastIncreaseAt;
            if (elapsedSinceLast >= this.speedScaling.intervalMs) {
                const steps = Math.floor(elapsedSinceLast / this.speedScaling.intervalMs);
                const mult = Math.pow(this.speedScaling.factor, steps);
                try {
                    const before0 = (this.cows[0]?.speed ?? 0);
                    for (const cow of this.cows) cow.speed *= mult;
                    const after0 = (this.cows[0]?.speed ?? 0);
                    console.log(`[CowSpeed] +${steps} step(s): ${before0.toFixed(3)} -> ${after0.toFixed(3)} (applied to ${this.cows.length} cow(s))`);
                } catch (_) {
                    for (const cow of this.cows) cow.speed *= mult;
                }
                this.speedScaling.lastIncreaseAt += steps * this.speedScaling.intervalMs;
                this.updateMaxCowSpeed();
            }
            if (this.currentLevel === 5) {
                this.maybeSpawnLevel5PowerUp(now);
            }
            if (this.currentLevel >= 1 && this.currentLevel <= 3) {
                this.maybeSpawnSpeedBoost(now);
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
        if (this.currentLevel === 6) {
            this.drawLevel6PowerUp();
        }
        if (this.currentLevel >= 1 && this.currentLevel <= 3) {
            this.drawSpeedBoostPowerUp();
        }

        // Debug HUD: show first cow speed (temporary to verify scaling)
        if (this.currentLevel !== 4 && this.currentLevel !== 5 && this.currentLevel !== 6) {
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
        }
        if (this.currentLevel === 6) {
            this.checkLevel6PowerUpCollision(now);
        }
        if (this.currentLevel === 5 || this.currentLevel === 6) {
            this.applyLaserDamage(now);
        }
        if (this.currentLevel >= 1 && this.currentLevel <= 3) {
            this.checkSpeedBoostCollision(now);
        }
        this.moveCows(now);
        this.updateMaxCowSpeed();
        
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
            if (this.currentLevel === 6 && this.level6) {
                this.level6.lastWaveAt = resumeNow;
                this.level6.lastPowerUpAt = resumeNow;
            }
            if (this.currentLevel >= 1 && this.currentLevel <= 3 && this.speedBoost) {
                this.speedBoost.lastSpawnAt = resumeNow;
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
