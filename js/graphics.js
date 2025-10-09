/**
 * Graphics Module
 * Handles all rendering, drawing, and visual effects for the game
 */

const Graphics = {
    // Canvas and context references
    canvas: null,
    ctx: null,
    currentLevel: 1,
    
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

    setLevel(level) {
        this.currentLevel = Math.max(1, Math.min(5, Number(level || 1)));
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
     * Draw background depending on level
     */
    drawBackground() {
        if (!this.ctx) return;
        if (this.currentLevel === 1) {
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
        } else if (this.currentLevel === 2) {
            // Sea: blue background with simple wave stripes
            this.ctx.fillStyle = '#3BA7F0';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'rgba(255,255,255,0.25)';
            const stripeH = 10;
            for (let y = 0; y < this.canvas.height; y += 40) {
                this.ctx.fillRect(0, y + 15, this.canvas.width, stripeH);
                this.ctx.fillRect(0, y + 35, this.canvas.width, 4);
            }
        } else if (this.currentLevel === 3) {
            // Moon: grey background with craters
            this.ctx.fillStyle = '#9ea3a8';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#8d9297';
            for (let i = 0; i < 20; i++) {
                const r = 6 + Math.random() * 18;
                const x = Math.random() * this.canvas.width;
                const y = Math.random() * this.canvas.height;
                this.ctx.beginPath();
                this.ctx.arc(x, y, r, 0, Math.PI * 2);
                this.ctx.fill();
            }
        } else if (this.currentLevel === 4) {
            // Beach: gradient sky to sand split
            const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            gradient.addColorStop(0, '#4da3ff'); // sky blue
            gradient.addColorStop(0.55, '#7ecbff');
            gradient.addColorStop(0.75, '#fce38a');
            gradient.addColorStop(1, '#f7c66a');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Gentle wave line at horizon
            this.ctx.fillStyle = 'rgba(255,255,255,0.35)';
            const horizonY = Math.floor(this.canvas.height * 0.55);
            for (let i = 0; i < 6; i++) {
                const offset = i * 14;
                this.ctx.fillRect(0, horizonY + offset, this.canvas.width, 4);
            }
        } else {
            // Neon grid dusk for laser level
            const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            gradient.addColorStop(0, '#2c1d6f');
            gradient.addColorStop(0.4, '#4b227b');
            gradient.addColorStop(0.75, '#f64f6b');
            gradient.addColorStop(1, '#ffa24c');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Simple grid lines to hint at lasers
            this.ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            this.ctx.lineWidth = 1;
            const spacing = 48;
            for (let x = 0; x < this.canvas.width; x += spacing) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.canvas.height);
                this.ctx.stroke();
            }
            for (let y = 0; y < this.canvas.height; y += spacing) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.canvas.width, y);
                this.ctx.stroke();
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

        // Level-specific overlays
        if (this.currentLevel === 2) {
            // Simple boat under the man
            this.ctx.fillStyle = '#6b4f2a';
            const bw = config.width + 12;
            const bh = 8;
            this.ctx.fillRect(drawX - bw / 2, drawY + config.height / 2, bw, bh);
            this.ctx.fillStyle = '#5b3f1a';
            this.ctx.fillRect(drawX - bw / 2 + 4, drawY + config.height / 2 + 2, bw - 8, bh - 4);
        } else if (this.currentLevel === 3) {
            // Helmet around the head (circle visor)
            this.ctx.strokeStyle = '#dfe7ef';
            this.ctx.lineWidth = 3;
            const cx = drawX;
            const cy = drawY - config.height / 2 - config.headHeight / 2;
            const r = Math.max(config.headWidth, config.headHeight);
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
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

        // Level-specific overlays
        if (this.currentLevel === 2) {
            // Boat under the cow
            this.ctx.fillStyle = '#6b4f2a';
            const bw = config.width + 16;
            const bh = 10;
            this.ctx.fillRect(cow.x - bw / 2, cow.y + config.height / 2, bw, bh);
            this.ctx.fillStyle = '#5b3f1a';
            this.ctx.fillRect(cow.x - bw / 2 + 5, cow.y + config.height / 2 + 2, bw - 10, bh - 4);
        } else if (this.currentLevel === 3) {
            // Helmet around the cow's head region
            this.ctx.strokeStyle = '#dfe7ef';
            this.ctx.lineWidth = 3;
            const cx = cow.x;
            const cy = cow.y - config.height / 2 - config.headHeight / 2;
            const r = Math.max(config.headWidth, config.headHeight) + 4;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
            this.ctx.stroke();
        }
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
