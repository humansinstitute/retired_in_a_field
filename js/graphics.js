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

    // Cached level-specific assets
    cloudField: null,

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
        this.currentLevel = Math.max(1, Math.min(6, Number(level || 1)));
        if (this.currentLevel !== 6) {
            this.cloudField = null;
        }
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
            gradient.addColorStop(0, '#4da3ff');
            gradient.addColorStop(0.55, '#7ecbff');
            gradient.addColorStop(0.75, '#fce38a');
            gradient.addColorStop(1, '#f7c66a');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.fillStyle = 'rgba(255,255,255,0.35)';
            const horizonY = Math.floor(this.canvas.height * 0.55);
            for (let i = 0; i < 6; i++) {
                const offset = i * 14;
                this.ctx.fillRect(0, horizonY + offset, this.canvas.width, 4);
            }
        } else if (this.currentLevel === 5) {
            // Neon grid backdrop for laser showdown
            const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            gradient.addColorStop(0, '#2c1d6f');
            gradient.addColorStop(0.4, '#4b227b');
            gradient.addColorStop(0.75, '#f64f6b');
            gradient.addColorStop(1, '#ffa24c');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

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
        } else if (this.currentLevel === 6) {
            this.drawCloudSky();
        } else {
            // Fallback
            this.ctx.fillStyle = '#8bc34a';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
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
        } else if (this.currentLevel === 6) {
            // Plane seat / wing beneath the man
            const seatWidth = config.width + 52;
            const seatHeight = 12;
            const seatY = drawY + config.height / 2 - seatHeight / 2;
            this.ctx.fillStyle = '#d9e2f4';
            this.ctx.fillRect(drawX - seatWidth / 2, seatY, seatWidth, seatHeight);
            this.ctx.fillStyle = '#b2c1db';
            this.ctx.fillRect(drawX - seatWidth / 2 + 4, seatY + 3, seatWidth - 8, seatHeight - 6);

            // Wing taper
            const wingWidth = seatWidth + 60;
            const wingThickness = 10;
            this.ctx.fillStyle = '#94a7c7';
            this.ctx.beginPath();
            this.ctx.moveTo(drawX - wingWidth / 2, seatY + seatHeight);
            this.ctx.lineTo(drawX + wingWidth / 2, seatY + seatHeight);
            this.ctx.lineTo(drawX + wingWidth / 2 - 36, seatY + seatHeight + wingThickness);
            this.ctx.lineTo(drawX - wingWidth / 2 + 36, seatY + seatHeight + wingThickness);
            this.ctx.closePath();
            this.ctx.fill();

            // Harness straps
            this.ctx.fillStyle = '#111822';
            this.ctx.fillRect(drawX - 6, drawY - config.height / 2, 4, config.height);
            this.ctx.fillRect(drawX + 2, drawY - config.height / 2, 4, config.height);

            // Cabin floor shadow
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            const shadowWidth = seatWidth + 20;
            const shadowHeight = 12;
            this.ctx.beginPath();
            this.ctx.ellipse(drawX, seatY + seatHeight + wingThickness + shadowHeight / 2, shadowWidth / 2, shadowHeight, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Legs
        if (this.currentLevel === 6) {
            const legThickness = config.legWidth;
            const footLength = config.legHeight + 6;
            const seatBaseY = drawY + config.height / 2 - 2;
            this.ctx.fillStyle = config.bodyColor;
            // Left leg bent forward
            this.ctx.fillRect(drawX - 10, seatBaseY - 4, legThickness, 6);
            this.ctx.fillRect(drawX - 10 + legThickness, seatBaseY, footLength, 4);
            // Right leg bent forward
            this.ctx.fillRect(drawX + 2, seatBaseY - 4, legThickness, 6);
            this.ctx.fillRect(drawX + 2 + legThickness, seatBaseY, footLength, 4);
        } else {
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
        }
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
        } else if (this.currentLevel === 6) {
            // Parachute canopy and lines
            const canopyWidth = config.width + 24;
            const canopyHeight = 24;
            const canopyY = cow.y - config.height / 2 - canopyHeight - 10;
            const canopyGradient = this.ctx.createLinearGradient(cow.x - canopyWidth / 2, canopyY, cow.x + canopyWidth / 2, canopyY + canopyHeight);
            canopyGradient.addColorStop(0, '#ffdf5a');
            canopyGradient.addColorStop(1, '#ff8e53');
            this.ctx.fillStyle = canopyGradient;
            this.ctx.beginPath();
            this.ctx.moveTo(cow.x - canopyWidth / 2, canopyY + canopyHeight);
            this.ctx.quadraticCurveTo(cow.x, canopyY - canopyHeight * 0.6, cow.x + canopyWidth / 2, canopyY + canopyHeight);
            this.ctx.closePath();
            this.ctx.fill();

            // Suspension lines
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.lineWidth = 2;
            const lineSpacing = canopyWidth / 4;
            for (let i = -2; i <= 2; i++) {
                const anchorX = cow.x + (i * lineSpacing * 0.5);
                this.ctx.beginPath();
                this.ctx.moveTo(anchorX, canopyY + canopyHeight);
                this.ctx.lineTo(cow.x - 12 + i * 6, cow.y - config.height / 2);
                this.ctx.stroke();
            }
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
    },

    drawCloudSky() {
        if (!this.ctx || !this.canvas) return;
        const width = this.canvas.width;
        const height = this.canvas.height;

        const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#67c8ff');
        gradient.addColorStop(0.45, '#8fd6ff');
        gradient.addColorStop(1, '#f3fbff');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, width, height);

        if (!this.cloudField || this.cloudField.width !== width || this.cloudField.height !== height) {
            this.cloudField = this.generateCloudField(width, height);
        }

        for (const layer of this.cloudField.layers) {
            for (const cloud of layer.clouds) {
                this.ctx.fillStyle = cloud.color;
                this.drawEllipse(cloud.x, cloud.y, cloud.radiusX, cloud.radiusY);
            }
        }
    },

    generateCloudField(width, height) {
        const layers = [];
        const layerConfigs = [
            { countFactor: 260, radius: [90, 50], alpha: [0.22, 0.30] },
            { countFactor: 220, radius: [70, 40], alpha: [0.26, 0.36] },
            { countFactor: 180, radius: [50, 30], alpha: [0.32, 0.45] }
        ];

        layerConfigs.forEach((cfg, index) => {
            const clouds = [];
            const baseCount = Math.max(4, Math.floor(width / cfg.countFactor));
            const count = baseCount + index * 2;
            const verticalBand = height * (0.3 + index * 0.18);
            for (let i = 0; i < count; i++) {
                const rand = Math.sin((i + 1) * 43758.5453) * 43758.5453;
                const rand2 = Math.sin((i + 7) * 12543.3271) * 12543.3271;
                const randNorm = rand - Math.floor(rand);
                const randNorm2 = rand2 - Math.floor(rand2);
                const x = -100 + randNorm * (width + 200);
                const y = verticalBand + (randNorm2 - 0.5) * (height * 0.18);
                const radiusX = cfg.radius[0] + randNorm * (cfg.radius[0] * 0.6);
                const radiusY = cfg.radius[1] + randNorm2 * (cfg.radius[1] * 0.5);
                const alpha = cfg.alpha[0] + (cfg.alpha[1] - cfg.alpha[0]) * Math.abs(randNorm2);
                const normalizedAlpha = Math.min(0.9, Math.max(0.15, alpha));
                clouds.push({
                    x,
                    y,
                    radiusX,
                    radiusY,
                    color: `rgba(255,255,255,${normalizedAlpha.toFixed(3)})`
                });
            }
            layers.push({ clouds });
        });

        return { width, height, layers };
    },

    drawEllipse(x, y, radiusX, radiusY) {
        if (!this.ctx) return;
        if (typeof this.ctx.ellipse === 'function') {
            this.ctx.beginPath();
            this.ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
            this.ctx.fill();
            return;
        }
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.translate(x, y);
        this.ctx.scale(radiusX / radiusY, 1);
        this.ctx.arc(0, 0, radiusY, 0, Math.PI * 2);
        this.ctx.restore();
        this.ctx.fill();
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Graphics;
} else {
    window.Graphics = Graphics;
}
