/**
 * Graphics Module
 * Handles all rendering, drawing, and visual effects for the game
 */

const Graphics = {
    // Canvas and context references
    canvas: null,
    ctx: null,
    
    // Vibration state
    vibrationOffset: { x: 0, y: 0 },
    vibrationPhase: 0,

    /**
     * Initialize the graphics module with canvas reference
     */
    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resizeCanvas();
        
        // Set up event listeners for resize
        window.addEventListener('resize', () => this.resizeCanvas());
        window.addEventListener('orientationchange', () => {
            // Small delay to ensure orientation change is complete
            setTimeout(() => this.resizeCanvas(), 100);
        });
    },

    /**
     * Resize canvas to full viewport
     */
    resizeCanvas() {
        if (!this.canvas) return;
        
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.canvas.width = width;
        this.canvas.height = height;
        
        return { width, height };
    },

    /**
     * Update vibration effect based on man's movement state
     */
    updateVibration(isStationary) {
        const config = (typeof GameConfig !== 'undefined' && GameConfig.vibration) ? GameConfig.vibration : {
            baseIntensity: 0.5,
            stationaryIntensity: 0.2,
            phaseIncrement: 0.2,
            stationaryPhaseIncrement: 0.1,
            stationaryThreshold: 2
        };
        
        if (isStationary) {
            this.vibrationPhase += config.stationaryPhaseIncrement;
            const intensity = config.stationaryIntensity;
            this.vibrationOffset.x = Math.sin(this.vibrationPhase) * intensity;
            this.vibrationOffset.y = Math.cos(this.vibrationPhase * 1.3) * intensity;
        } else {
            this.vibrationPhase += config.phaseIncrement;
            const intensity = config.baseIntensity;
            this.vibrationOffset.x = Math.sin(this.vibrationPhase) * intensity;
            this.vibrationOffset.y = Math.cos(this.vibrationPhase * 1.3) * intensity;
        }
    },

    /**
     * Clear the entire canvas
     */
    clearCanvas() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },

    /**
     * Draw field background with grass pattern
     */
    drawField() {
        if (!this.ctx) return;
        if (typeof GameConfig === 'undefined' || !GameConfig.canvas) return;
        const config = GameConfig.canvas;
        this.ctx.fillStyle = config.fieldColor;
        
        for (let i = 0; i < this.canvas.width; i += config.grassPatternSize) {
            for (let j = 0; j < this.canvas.height; j += config.grassPatternSize) {
                if ((i + j) % (config.grassPatternSize * 2) === 0) {
                    this.ctx.fillRect(i, j, config.grassBlockSize, config.grassBlockHeight);
                }
            }
        }
    },

    /**
     * Draw the man character with vibration effect
     */
    drawMan(man) {
        if (!this.ctx) return;
        if (typeof GameConfig === 'undefined' || !GameConfig.man) return;
        const config = GameConfig.man;
        
        // Apply vibration offset
        const drawX = man.x + this.vibrationOffset.x;
        const drawY = man.y + this.vibrationOffset.y;
        
        // Body
        this.ctx.fillStyle = config.bodyColor;
        this.ctx.fillRect(
            drawX - config.width / 2, 
            drawY - config.height / 2, 
            config.width, 
            config.height
        );
        
        // Head
        this.ctx.fillStyle = config.headColor;
        this.ctx.fillRect(
            drawX - config.headWidth / 2, 
            drawY - config.height / 2 - config.headHeight, 
            config.headWidth, 
            config.headHeight
        );
        
        // Legs
        this.ctx.fillStyle = config.bodyColor;
        this.ctx.fillRect(
            drawX - 12, 
            drawY + config.height / 2 - 5, 
            config.legWidth, 
            config.legHeight
        );
        this.ctx.fillRect(
            drawX + 4, 
            drawY + config.height / 2 - 5, 
            config.legWidth, 
            config.legHeight
        );
    },

    /**
     * Draw the cow character
     */
    drawCow(cow) {
        if (!this.ctx) return;
        if (typeof GameConfig === 'undefined' || !GameConfig.cow) return;
        const config = GameConfig.cow;
        
        // Body
        this.ctx.fillStyle = config.bodyColor;
        this.ctx.fillRect(
            cow.x - config.width / 2, 
            cow.y - config.height / 2, 
            config.width, 
            config.height
        );
        
        // Spots
        this.ctx.fillStyle = config.spotColor;
        this.ctx.fillRect(
            cow.x - config.width / 2 + 5, 
            cow.y - config.height / 2 + 5, 
            10, 10
        );
        this.ctx.fillRect(
            cow.x + config.width / 2 - 15, 
            cow.y + config.height / 2 - 15, 
            8, 8
        );
        
        // Head
        this.ctx.fillStyle = config.bodyColor;
        this.ctx.fillRect(
            cow.x - 15, 
            cow.y - config.height / 2 - 10, 
            config.headWidth, 
            config.headHeight
        );
        
        // Head spots
        this.ctx.fillStyle = config.spotColor;
        this.ctx.fillRect(
            cow.x - 12, 
            cow.y - config.height / 2 - 8, 
            6, 6
        );
        this.ctx.fillRect(
            cow.x + 2, 
            cow.y - config.height / 2 - 7, 
            4, 4
        );
        
        // Legs
        this.ctx.fillStyle = config.bodyColor;
        this.ctx.fillRect(
            cow.x - 17, 
            cow.y + config.height / 2 - 5, 
            config.legWidth, 
            config.legHeight
        );
        this.ctx.fillRect(
            cow.x + 10, 
            cow.y + config.height / 2 - 5, 
            config.legWidth, 
            config.legHeight
        );
        
        // Leg details
        this.ctx.fillStyle = config.spotColor;
        this.ctx.fillRect(
            cow.x - 17, 
            cow.y + config.height / 2 + 5, 
            config.legWidth, 2
        );
        this.ctx.fillRect(
            cow.x + 10, 
            cow.y + config.height / 2 + 5, 
            config.legWidth, 2
        );
    },

    /**
     * Create preview canvas for man character
     */
    createManPreview() {
        if (typeof GameConfig === 'undefined' || !GameConfig.preview) return document.createElement('canvas');
        const config = GameConfig.preview.man;
        const manCanvas = document.createElement('canvas');
        manCanvas.width = config.width;
        manCanvas.height = config.height;
        const manCtx = manCanvas.getContext('2d');
        
        // Body
        manCtx.fillStyle = GameConfig.man.bodyColor;
        manCtx.fillRect(0, 4, config.width, 20);
        
        // Head
        manCtx.fillStyle = GameConfig.man.headColor;
        manCtx.fillRect(7, 0, 10, 8);
        
        // Legs
        manCtx.fillStyle = GameConfig.man.bodyColor;
        manCtx.fillRect(3, 16, 6, 8);
        manCtx.fillRect(15, 16, 6, 8);
        
        return manCanvas;
    },

    /**
     * Create preview canvas for cow character
     */
    createCowPreview() {
        if (typeof GameConfig === 'undefined' || !GameConfig.preview) return document.createElement('canvas');
        const config = GameConfig.preview.cow;
        const cowCanvas = document.createElement('canvas');
        cowCanvas.width = config.width;
        cowCanvas.height = config.height;
        const cowCtx = cowCanvas.getContext('2d');
        
        // Body
        cowCtx.fillStyle = GameConfig.cow.bodyColor;
        cowCtx.fillRect(0, 4, config.width, 28);
        
        // Spots
        cowCtx.fillStyle = GameConfig.cow.spotColor;
        cowCtx.fillRect(4, 8, 8, 8);
        cowCtx.fillRect(20, 20, 6, 6);
        
        // Head
        cowCtx.fillStyle = GameConfig.cow.bodyColor;
        cowCtx.fillRect(0, 0, 24, 12);
        
        // Head spots
        cowCtx.fillStyle = GameConfig.cow.spotColor;
        cowCtx.fillRect(3, 2, 4, 4);
        cowCtx.fillRect(15, 3, 3, 3);
        
        // Legs
        cowCtx.fillStyle = GameConfig.cow.bodyColor;
        cowCtx.fillRect(2, 24, 5, 8);
        cowCtx.fillRect(25, 24, 5, 8);
        
        // Leg details
        cowCtx.fillStyle = GameConfig.cow.spotColor;
        cowCtx.fillRect(2, 30, 5, 2);
        cowCtx.fillRect(25, 30, 5, 2);
        
        return cowCanvas;
    },

    /**
     * Set up preview characters in the setup screen
     */
    setupPreviews() {
        if (typeof GameConfig === 'undefined') return; // avoid crashing if config not loaded yet
        const previewMan = document.getElementById('previewMan');
        const previewCow = document.getElementById('previewCow');
        
        if (previewMan) {
            previewMan.innerHTML = '';
            previewMan.appendChild(this.createManPreview());
        }
        
        if (previewCow) {
            previewCow.innerHTML = '';
            previewCow.appendChild(this.createCowPreview());
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Graphics;
} else {
    window.Graphics = Graphics;
}
