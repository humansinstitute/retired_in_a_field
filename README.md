# Retired in a Field - Game Build

## Description
A simple, relaxing game where you control a man in a field, trying to avoid a persistent **white cow with black spots** that continuously moves toward you. Features a setup screen with token input, **full-screen mobile experience**, a **preview of game characters** on the entry screen, and an **enhanced vibration effect** for the retired man character.

## How to Play
1. Open `index.html` in a web browser
2. On the setup screen, you'll see a preview of the man (left) and **white cow with black spots** (right) with a field background
3. Enter a Cash token and click "Pay Cash to Start Game"
4. Click or drag to move the man (blue character)
5. Avoid the **white cow with black spots** for as long as possible
6. When the cow catches you, you'll see "Gotcha!" and then click "Continue"
7. The ending screen will show "That's my money now"
8. Click "Play Again" to restart

## Game Features
- Pixel-style sprites for man and cow
- **Cow is now white with black spots** (traditional Holstein cow appearance)
- **Enhanced vibration effect**: The retired man vibrates more noticeably when stationary
- Mouse and touch controls
- Cow that continuously follows the player
- **Setup screen with character preview** (man on left, cow on right)
- Setup screen with token input
- "Gotcha!" message when the cow catches you
- Ending screen with "That's my money now" message
- **Full-screen field that covers entire mobile screen**
- **Modern minimal CSS styling inspired by Wingman**

## Controls
- **Mouse**: Click to move, drag to continuously reposition
- **Touch**: Tap to move, drag to continuously reposition

## Token System
- Players must enter a Cash token to start the game
- Token is stored in memory during gameplay
- Token can be reused for subsequent games

## Vibration Effect Details
- **Stationary vibration**: When the man is not moving (close to his target position), he vibrates with **increased intensity**
- **Moving vibration**: When the man is actively moving toward a new target, the vibration is reduced
- **Smooth animation**: Uses sine and cosine waves for natural-looking vibration movement
- **Performance optimized**: Vibration effect uses minimal CPU resources

## Mobile Responsiveness Features
- **Full-screen canvas**: Field covers 100% of viewport width and height on mobile
- **Fixed positioning**: Game container uses `position: fixed` to ensure full coverage
- **Viewport meta tag** prevents zooming and ensures proper scaling
- **Safe area handling**: Respects iPhone X+ notches and Android cutouts
- **Font sizes set to 16px** to prevent iOS zoom on input fields
- **Touch-friendly button sizes** with proper padding
- **Canvas resizes dynamically** to fit any screen perfectly
- **Touch event handling optimized** for mobile devices
- **Prevents text selection and overscroll behavior**
- **Proper touch feedback** with active states
- **Visibility change handling**: Pauses game when tab is inactive

## Visual Design Changes
- **Cow updated**: Changed from black with white spots to **white with black spots** for better recognition
- **Cow details enhanced**: Added head spots and leg details for more authentic appearance
- **Preview updated**: Setup screen preview now shows the correct white cow with black spots
- **Game sprites updated**: Both preview and gameplay cow sprites reflect the new color scheme
- **Vibration effect**: Enhanced the retired man's vibration when stationary for more character personality

## Build Information
- Built on: 2025-09-24
- Single HTML file implementation
- No external dependencies
- Mobile-optimized with full-screen responsive design, character preview, and enhanced vibration effect
