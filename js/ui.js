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

    // Inputs
    inputs: {
        cashuToken: null
    },

    // Misc UI elements
    els: {
        cashuError: null,
        toastContainer: null,
        optionsModal: null,
        optionsClose: null,
        menuButton: null,
        optionsShowKeys: null,
        optionsShowStats: null,
        statsModal: null,
        statsModalClose: null
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

        // Initial state: if setup screen is visible, ensure Start is disabled
        if (this.screens.setup && this.screens.setup.style.display !== 'none') {
            this.setButtonEnabled('start', false);
            this.showCashuError(false);
        }
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

        // Inputs
        this.inputs.cashuToken = document.getElementById('cashuTokenInput');

        // Misc elements
        this.els.cashuError = document.getElementById('cashuTokenError');
        this.els.menuButton = document.getElementById('menuButton');
        this.els.optionsModal = document.getElementById('optionsModal');
        this.els.optionsClose = document.getElementById('optionsModalClose');
        this.els.optionsShowKeys = document.getElementById('optionsShowKeys');
        this.els.optionsShowStats = document.getElementById('optionsShowStats');
        this.els.statsModal = document.getElementById('statsModal');
        this.els.statsModalClose = document.getElementById('statsModalClose');
    },

    /**
     * Set up event listeners for buttons
     */
    setupEventListeners() {
        if (this.buttons.start) {
            this.buttons.start.addEventListener('click', async () => {
                // Guard: require a token-ish value (basic UI check), then verify via cashu_access
                const token = (this.inputs.cashuToken?.value || '').trim();
                const valid = this.validateCashuToken(token);
                if (!valid) {
                    this.showCashuError(true);
                    return;
                }
                this.setButtonLoading('start', true);
                try {
                    const res = (window.redeemCashuAccess)
                        ? await window.redeemCashuAccess(token, 21)
                        : { decision: 'ACCESS_DENIED', amount: 0, reason: 'cashu_access unavailable', mode: 'error' };
                    if (res && res.decision === 'ACCESS_GRANTED') {
                        try { localStorage.setItem('cashuToken', token); } catch (_) {}
                        if (this.onStartGame) this.onStartGame();
                    } else {
                        const reason = res && res.reason ? String(res.reason) : 'unknown';
                        this.showToast(`Minimum to play is 21 sats. ${reason}`);
                    }
                } catch (e) {
                    this.showToast(`Minimum to play is 21 sats. ${String(e && e.message ? e.message : e)}`);
                } finally {
                    this.setButtonLoading('start', false);
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

        // Live validation for Cashu token input
        if (this.inputs.cashuToken) {
            this.inputs.cashuToken.addEventListener('input', () => {
                const token = this.inputs.cashuToken.value.trim();
                const valid = this.validateCashuToken(token);
                this.showCashuError(token.length > 0 && !valid);
                this.setButtonEnabled('start', valid);
            });
        }

        // Menu open/close
        if (this.els.menuButton) {
            this.els.menuButton.addEventListener('click', () => this.showOptions(true));
        }
        if (this.els.optionsClose) {
            this.els.optionsClose.addEventListener('click', () => this.showOptions(false));
        }
        if (this.els.optionsModal) {
            this.els.optionsModal.addEventListener('click', (e) => {
                if (e.target === this.els.optionsModal) this.showOptions(false);
            });
        }

        // Options actions
        if (this.els.optionsShowKeys) {
            this.els.optionsShowKeys.addEventListener('click', () => {
                this.showOptions(false);
                if (window.openKeysModal) window.openKeysModal();
            });
        }
        if (this.els.optionsShowStats) {
            this.els.optionsShowStats.addEventListener('click', () => {
                this.showOptions(false);
                this.showStats(true);
            });
        }

        // Stats modal close
        if (this.els.statsModalClose) {
            this.els.statsModalClose.addEventListener('click', () => this.showStats(false));
        }
        if (this.els.statsModal) {
            this.els.statsModal.addEventListener('click', (e) => {
                if (e.target === this.els.statsModal) this.showStats(false);
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
        // no-op
        // Each game requires a new token: clear stored token and input
        try { localStorage.removeItem('cashuToken'); } catch (_) {}
        if (this.inputs.cashuToken) {
            this.inputs.cashuToken.value = '';
        }
        this.showCashuError(false);
        // Disable Start until a valid token is entered
        this.setButtonEnabled('start', false);
        // Hide any open modals
        this.showOptions(false);
        this.showStats(false);
    },

    /**
     * Show the game over screen
     */
    showGameOverScreen() {
        this.showScreen('gameOver', true);
        // no-op
    },

    /**
     * Show the ending screen
     */
    // Ending screen removed in combined flow

    /** Show initials screen */
    showInitialsScreen() {
        this.showScreen('initials', true);
        // no-op
    },

    /**
     * Hide all screens to show the game canvas
     */
    showGameScreen() {
        this.hideAllScreens();
        // no-op
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

    // Validate Cashu token with a simple prefix check
    validateCashuToken(token) {
        return typeof token === 'string' && token.toLowerCase().startsWith('cashu');
    },

    // Toggle error message under token input
    showCashuError(show) {
        if (this.els.cashuError) {
            this.els.cashuError.style.display = show ? 'block' : 'none';
        }
    },

    // Options modal visibility
    showOptions(show) {
        if (!this.els.optionsModal) return;
        this.els.optionsModal.style.display = show ? 'flex' : 'none';
    },

    // Stats modal visibility (and refresh content)
    showStats(show) {
        if (!this.els.statsModal) return;
        this.els.statsModal.style.display = show ? 'flex' : 'none';
        if (show) {
            try { if (window.renderPlayerSummary) window.renderPlayerSummary(); } catch (_) {}
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

    /** Simple toast notification */
    showToast(message, duration = 4000) {
        if (!this.els.toastContainer) {
            const div = document.createElement('div');
            div.id = 'toastContainer';
            div.style.position = 'fixed';
            div.style.left = '50%';
            div.style.bottom = '24px';
            div.style.transform = 'translateX(-50%)';
            div.style.zIndex = '10000';
            div.style.display = 'flex';
            div.style.flexDirection = 'column';
            div.style.alignItems = 'center';
            div.style.gap = '8px';
            document.body.appendChild(div);
            this.els.toastContainer = div;
        }
        const toast = document.createElement('div');
        toast.textContent = String(message || '');
        toast.style.background = 'var(--bg-secondary)';
        toast.style.border = '1px solid var(--border-primary)';
        toast.style.color = 'var(--text-primary)';
        toast.style.boxShadow = 'var(--shadow-md)';
        toast.style.padding = '10px 12px';
        toast.style.borderRadius = '8px';
        toast.style.maxWidth = '90vw';
        toast.style.fontSize = '0.95rem';
        this.els.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.transition = 'opacity 0.25s ease';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, Math.max(1000, duration));
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
