/**
 * Game Configuration and Constants
 * Contains all game settings, character properties, and configuration values
 */

// Game configuration object
const GameConfig = {
    // Canvas and viewport settings
    canvas: {
        backgroundColor: '#8bc34a', // Lighter field green
        fieldColor: '#7cb342',      // Darker field green for grass pattern
        grassPatternSize: 40,
        grassBlockSize: 20,
        grassBlockHeight: 10
    },

    // Character properties
    man: {
        width: 30,
        height: 30,
        speed: 5,
        bodyColor: '#4169E1',    // Royal blue
        headColor: '#FFD700',    // Gold
        headWidth: 20,
        headHeight: 15,
        legWidth: 8,
        legHeight: 10
    },

    cow: {
        width: 40,
        height: 40,
        speed: 2,                // Slower than man
        bodyColor: '#FFFFFF',    // White body
        spotColor: '#000000',    // Black spots
        headWidth: 30,
        headHeight: 15,
        legWidth: 7,
        legHeight: 12
    },

    // Preview character sizes (for setup screen)
    preview: {
        man: {
            width: 24,
            height: 24
        },
        cow: {
            width: 32,
            height: 32
        }
    },

    // Vibration effect settings
    vibration: {
        baseIntensity: 1,
        stationaryIntensity: 3,
        phaseIncrement: 0.1,
        stationaryPhaseIncrement: 0.3,
        stationaryThreshold: 2  // Distance threshold to consider man stationary
    },

    // Game mechanics
    collision: {
        detectionDistance: 35  // Distance for collision detection (sum of half widths)
    },

    // Initial positions (will be updated based on canvas size)
    initialPositions: {
        man: {
            x: 0.5,  // 50% of canvas width
            y: 0.5   // 50% of canvas height
        },
        cow: {
            x: 0.25, // 25% of canvas width
            y: 0.25  // 25% of canvas height
        }
    },

    // Animation and timing
    animation: {
        fadeInDuration: 300  // milliseconds
    },

    // Input settings
    input: {
        dragButton: 1  // Left mouse button for drag detection
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameConfig;
} else {
    window.GameConfig = GameConfig;
}