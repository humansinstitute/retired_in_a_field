/**
 * Controls Module
 * Handles all input events including mouse, touch, and keyboard interactions
 */

const Controls = {
    // Canvas reference for coordinate calculations
    canvas: null,
    
    // Input state
    isGameRunning: false,
    
    // Callback functions
    onTargetSet: null,  // Called when user sets a new target position

    /**
     * Initialize the controls module
     */
    init(canvas, callbacks = {}) {
        this.canvas = canvas;
        this.onTargetSet = callbacks.onTargetSet || null;
        
        this.setupEventListeners();
    },

    /**
     * Set up all event listeners for input handling
     */
    setupEventListeners() {
        if (!this.canvas) return;

        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleInput(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleDrag(e));
        
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleInput(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleInput(e), { passive: false });
    },

    /**
     * Update game running state
     */
    setGameRunning(running) {
        this.isGameRunning = running;
    },

    /**
     * Handle primary input events (mouse clicks and touches)
     */
    handleInput(e) {
        if (!this.isGameRunning) return;
        
        // Prevent default behavior for touch events
        if (e.type.startsWith('touch')) {
            e.preventDefault();
        }
        
        const position = this.getInputPosition(e);
        if (position && this.onTargetSet) {
            this.onTargetSet(position.x, position.y);
        }
    },

    /**
     * Handle mouse drag events
     */
    handleDrag(e) {
        if (!this.isGameRunning) return;
        
        // Only move if mouse button is pressed
        if (e.buttons === GameConfig.input.dragButton) {
            this.handleInput(e);
        }
    },

    /**
     * Get input position relative to canvas
     */
    getInputPosition(e) {
        if (!this.canvas) return null;
        
        const rect = this.canvas.getBoundingClientRect();
        let x, y;
        
        if (e.type.startsWith('touch')) {
            if (e.touches && e.touches.length > 0) {
                x = e.touches[0].clientX - rect.left;
                y = e.touches[0].clientY - rect.top;
            } else {
                return null;
            }
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }
        
        // Ensure coordinates are within canvas bounds
        x = Math.max(0, Math.min(x, this.canvas.width));
        y = Math.max(0, Math.min(y, this.canvas.height));
        
        return { x, y };
    },

    /**
     * Remove all event listeners (cleanup)
     */
    cleanup() {
        if (!this.canvas) return;
        
        // Remove mouse events
        this.canvas.removeEventListener('mousedown', this.handleInput);
        this.canvas.removeEventListener('mousemove', this.handleDrag);
        
        // Remove touch events
        this.canvas.removeEventListener('touchstart', this.handleInput);
        this.canvas.removeEventListener('touchmove', this.handleInput);
    },

    /**
     * Check if a point is within canvas bounds
     */
    isWithinBounds(x, y) {
        if (!this.canvas) return false;
        return x >= 0 && x <= this.canvas.width && y >= 0 && y <= this.canvas.height;
    },

    /**
     * Convert screen coordinates to game coordinates
     * (Currently 1:1 mapping, but could be extended for scaling)
     */
    screenToGameCoords(screenX, screenY) {
        return {
            x: screenX,
            y: screenY
        };
    },

    /**
     * Convert game coordinates to screen coordinates
     * (Currently 1:1 mapping, but could be extended for scaling)
     */
    gameToScreenCoords(gameX, gameY) {
        return {
            x: gameX,
            y: gameY
        };
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Controls;
} else {
    window.Controls = Controls;
}