/**
 * UI Module
 * Handles screen management, UI elements, and transitions
 */

const UI = {
    // Screen elements
    screens: {
        setup: null,
        gameOver: null,
        ending: null,
        initials: null
    },
    
    // Button elements
    buttons: {
        start: null,
        continue: null,
        playAgain: null,
        initialsContinue: null
    },
    
    // Callback functions
    onStartGame: null,
    onContinue: null,
    onPlayAgain: null,
    onInitialsConfirm: null,

    /**
     * Initialize the UI module
     */
    init(callbacks = {}) {
        this.onStartGame = callbacks.onStartGame || null;
        this.onContinue = callbacks.onContinue || null;
        this.onPlayAgain = callbacks.onPlayAgain || null;
        this.onInitialsConfirm = callbacks.onInitialsConfirm || null;
        
        this.setupElements();
        this.setupEventListeners();
        this.setupPreviews();
    },

    /**
     * Get references to all UI elements
     */
    setupElements() {
        // Screen elements
        this.screens.setup = document.getElementById('setupScreen');
        this.screens.gameOver = document.getElementById('gameOverScreen');
        this.screens.ending = document.getElementById('endingScreen');
        this.screens.initials = document.getElementById('initialsScreen');
        
        // Button elements
        this.buttons.start = document.getElementById('startButton');
        this.buttons.continue = document.getElementById('continueButton');
        this.buttons.playAgain = document.getElementById('playAgainButton');
        this.buttons.initialsContinue = document.getElementById('initialsContinueButton');
    },

    /**
     * Set up event listeners for buttons
     */
    setupEventListeners() {
        if (this.buttons.start) {
            this.buttons.start.addEventListener('click', () => {
                if (this.onStartGame) {
                    this.onStartGame();
                }
            });
        }
        
        // No separate continue button in combined end screen
        
        if (this.buttons.playAgain) {
            this.buttons.playAgain.addEventListener('click', () => {
                if (this.onPlayAgain) {
                    this.onPlayAgain();
                }
            });
        }

        if (this.buttons.initialsContinue) {
            this.buttons.initialsContinue.addEventListener('click', () => {
                if (this.onInitialsConfirm) {
                    this.onInitialsConfirm();
                }
            });
        }
    },

    /**
     * Set up character previews in the setup screen
     */
    setupPreviews() {
        if (typeof Graphics !== 'undefined' && Graphics.setupPreviews) {
            Graphics.setupPreviews();
        }
    },

    /**
     * Show a specific screen and hide others
     */
    showScreen(screenName, withAnimation = true) {
        // Hide all screens first
        Object.values(this.screens).forEach(screen => {
            if (screen) {
                screen.style.display = 'none';
                screen.classList.remove('fade-in');
            }
        });
        
        // Show the requested screen
        const targetScreen = this.screens[screenName];
        if (targetScreen) {
            targetScreen.style.display = 'flex';
            
            if (withAnimation) {
                // Small delay to ensure display change is processed
                setTimeout(() => {
                    targetScreen.classList.add('fade-in');
                }, 10);
            }
        }
    },

    /**
     * Hide all screens
     */
    hideAllScreens() {
        Object.values(this.screens).forEach(screen => {
            if (screen) {
                screen.style.display = 'none';
                screen.classList.remove('fade-in');
            }
        });
    },

    /**
     * Show the setup screen
     */
    showSetupScreen() {
        this.showScreen('setup', true);
    },

    /**
     * Show the game over screen
     */
    showGameOverScreen() {
        this.showScreen('gameOver', true);
    },

    /**
     * Show the ending screen
     */
    // Ending screen removed in combined flow

    /** Show initials screen */
    showInitialsScreen() {
        this.showScreen('initials', true);
    },

    /**
     * Hide all screens to show the game canvas
     */
    showGameScreen() {
        this.hideAllScreens();
    },

    /**
     * Check if any screen is currently visible
     */
    isAnyScreenVisible() {
        return Object.values(this.screens).some(screen => {
            return screen && screen.style.display === 'flex';
        });
    },

    /**
     * Get the currently visible screen name
     */
    getCurrentScreen() {
        for (const [name, screen] of Object.entries(this.screens)) {
            if (screen && screen.style.display === 'flex') {
                return name;
            }
        }
        return null;
    },

    /**
     * Update cash amount display (if present)
     */
    updateCashAmount(amount) {
        const cashElement = document.getElementById('cashAmount');
        if (cashElement) {
            cashElement.textContent = amount;
        }
    },

    /**
     * Enable or disable a button
     */
    setButtonEnabled(buttonName, enabled) {
        const button = this.buttons[buttonName];
        if (button) {
            button.disabled = !enabled;
            if (enabled) {
                button.classList.remove('disabled');
            } else {
                button.classList.add('disabled');
            }
        }
    },

    /**
     * Add loading state to a button
     */
    setButtonLoading(buttonName, loading) {
        const button = this.buttons[buttonName];
        if (button) {
            if (loading) {
                button.classList.add('loading');
                button.disabled = true;
            } else {
                button.classList.remove('loading');
                button.disabled = false;
            }
        }
    },

    /**
     * Handle visibility change (pause/resume)
     */
    handleVisibilityChange(isVisible, gameRunning) {
        if (!isVisible && gameRunning) {
            // Game went to background while running
            // Could show a pause overlay here if needed
            return false; // Indicate game should pause
        } else if (isVisible && !this.isAnyScreenVisible()) {
            // Game came back to foreground and no UI screen is showing
            return true; // Indicate game should resume
        }
        return gameRunning; // Maintain current state
    },

    /**
     * Cleanup UI event listeners
     */
    cleanup() {
        // Remove event listeners if needed
        // Currently using anonymous functions, so cleanup is automatic
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI;
} else {
    window.UI = UI;
}
