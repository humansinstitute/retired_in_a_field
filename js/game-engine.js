/**
 * Game Engine Module
 * Core game logic, mechanics, and main game loop coordination
 */

const GameEngine = {
    // Game state
    gameRunning: false,
    
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
    
    cow: {
        x: 0,
        y: 0,
        width: 40,
        height: 40,
        speed: 2
    },
    
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
            onInitialsConfirm: () => this.confirmInitialsAndStart()
        });
    },
    
    /**
     * Set up visibility change handling for pause/resume
     */
    setupVisibilityHandling() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Game is in background, pause it
                this.gameRunning = false;
            } else {
                // Game is back in foreground, resume if appropriate
                const shouldResume = UI.handleVisibilityChange(true, this.gameRunning);
                if (shouldResume && !UI.isAnyScreenVisible()) {
                    this.gameRunning = true;
                    this.gameLoop();
                }
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

        // Hide all UI screens
        UI.showGameScreen();

        // Reset game objects to initial positions
        this.resetGameObjects();

        // Update controls state
        Controls.setGameRunning(true);

        // Start the game
        this.gameRunning = true;
        this.gameLoop();
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
        
        // Reset cow position
        this.cow.x = canvasSize.width * config.cow.x;
        this.cow.y = canvasSize.height * config.cow.y;
        this.cow.width = GameConfig.cow.width;
        this.cow.height = GameConfig.cow.height;
        this.cow.speed = GameConfig.cow.speed;
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
    moveCow() {
        const dx = this.man.x - this.cow.x;
        const dy = this.man.y - this.cow.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Move cow toward man at its speed
        if (distance > 0) {
            this.cow.x += (dx / distance) * this.cow.speed;
            this.cow.y += (dy / distance) * this.cow.speed;
        }
    },
    
    /**
     * Check collision between man and cow
     */
    checkCollision() {
        const dx = this.man.x - this.cow.x;
        const dy = this.man.y - this.cow.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Collision if distance is less than sum of half widths
        return distance < (this.man.width / 2 + this.cow.width / 2);
    },
    
    /**
     * Handle game over
     */
    gameOver() {
        this.gameRunning = false;
        Controls.setGameRunning(false);
        // Increment games played and score, update summary
        try {
            if (window.updatePlayer) {
                const current = window.getPlayer() || {};
                const pledged = Number(current.last_pledge || 21);
                const p = window.updatePlayer({
                    games_played: (current.games_played || 0) + 1,
                    score: (current.score || 0) + pledged
                });
                if (window.renderPlayerSummary) window.renderPlayerSummary(p);
            }
        } catch (_) {}

        // Submit leaderboard entry (non-blocking) and refresh leaderboard on success
        try {
            const player = window.getPlayer ? window.getPlayer() : null;
            const npub = player?.npub;
            const initials = player?.initials;
            const satsLost = Number(player?.last_pledge || 21); // per-game sats lost for this round
            if (window.submitLeaderboardEntry && npub && initials) {
                Promise.resolve(window.submitLeaderboardEntry({ npub, initials, satsLost }))
                    .then((ok) => { if (ok && window.fetchLeaderboardWithPlayerKey) window.fetchLeaderboardWithPlayerKey(); })
                    .catch(() => {});
            }
        } catch (_) {}
        // Update game-over score message to reflect pledged amount
        try {
            const player = window.getPlayer ? window.getPlayer() : null;
            const pledged = Number(player?.last_pledge || 21);
            const msg = document.getElementById('scoreMessage');
            if (msg) msg.textContent = `You have scored ${pledged} sats!`;
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
        UI.showSetupScreen();
        // Ensure summary reflects latest values when returning home
        try { if (window.renderPlayerSummary) window.renderPlayerSummary(); } catch (_) {}
    },
    
    /**
     * Main game loop
     */
    gameLoop() {
        if (!this.gameRunning) return;
        
        // Update vibration effect
        Graphics.updateVibration(this.isManStationary());
        
        // Clear canvas
        Graphics.clearCanvas();
        
        // Draw field background
        Graphics.drawField();
        
        // Update game objects
        this.moveMan();
        this.moveCow();
        
        // Check for collision
        if (this.checkCollision()) {
            this.gameOver();
            return;
        }
        
        // Draw game objects
        Graphics.drawCow(this.cow);
        Graphics.drawMan(this.man);
        
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
            cow: { ...this.cow }
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
