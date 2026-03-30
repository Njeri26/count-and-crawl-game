# Count & Crawl🐛

A vibrant, interactive 3D math game for kids! Guide a cute bug across an endless grassy landscape, solving arithmetic equations by eating the correct number orbs. Fast-paced gameplay with smooth touch controls, beautiful animations, and full mobile responsiveness.

---

##Game Overview

### What is Count & Crawl 3D?

Count & Crawl 3D is an educational game that combines:
- **Math Practice**: Simple addition equations (num1 + num2 = ?)
- **Action Gameplay**: Guide the bug in real-time to eat orbs
- **Beautiful 3D Graphics**: Built with Three.js r128
- **Mobile-First Design**: Fully responsive on all devices
- **Engaging Visuals**: Glitter animations, particle effects, smooth transitions

### Target Audience

- **Ages**: 5-12 years old
- **Skill Level**: Beginner math learners
- **Platforms**: Desktop, Tablet, Mobile (iOS & Android)

---

## 🎯 How to Play

1. **Start Game**: Click "PLAY NOW" on the main screen
2. **Read Equation**: Look at the math problem in the equation box (top-center)
3. **Move Your Bug**: Move your mouse (desktop) or finger (mobile) to guide the bug
4. **Eat Correct Orbs**: Find and eat number orbs that match the equation answer
5. **Scoring**: Each correct answer = 10 points
6. **Game Over**: Touching a wrong number ends the game
7. **New Equation**: After eating a correct orb, a new glittering equation appears

### Controls

| Control | Desktop | Mobile |
|---------|---------|--------|
| Move Bug | Mouse Movement | Finger Drag |
| Pause Game | ⏸ Button (top-left) | ⏸ Button (top-left) |
| Quit Game | ✕ Button (next to Pause) | ✕ Button (next to Pause) |
| Confirm Action | Click Button | Tap Button |

---

## 📋 Features

### Core Gameplay
- ✅ **Endless Exploration**: Infinite procedurally-generated landscape
- ✅ **Dynamic Orb Spawning**: Orbs appear continuously as you move
- ✅ **Multiple Correct Answers**: 40% of orbs are correct answers (forgiving gameplay)
- ✅ **Glitter Animation**: Equation box shimmers when new equation appears
- ✅ **Particle Effects**: Burst animations on correct/wrong answers
- ✅ **Real-Time Scoring**: Score updates instantly

### Visual Design
- 🎨 **Colorful 3D Bug**: Detailed character with eyes, antennae, body segments, legs
- 🌍 **Procedural World**: Randomly-textured grass tiles with decorations (flowers, mushrooms, rocks, bushes)
- 💫 **Animated Orbs**: Floating, rotating, bobbing number bubbles with glows
- 🌟 **Visual Feedback**: Combo text, score display, equation glitter
- 🎭 **UI Modals**: Beautiful card-based interfaces for instructions, pause, quit confirmation

### Mobile Optimization
- 📱 **Responsive Layout**: Auto-scales UI elements for all screen sizes
- 👆 **Touch Controls**: Reduced sensitivity for comfortable finger input
- 🔧 **Smaller Bug**: 75% size on mobile for better visibility
- 📞 **Mobile-Friendly Buttons**: Large, easy-to-tap controls

### Pause & Quit System
- ⏸ **Pause Button**: Freeze the game mid-play
  - Resume to continue
  - Menu to return to home
- ✕ **Quit Button**: Gracefully exit with confirmation modal
  - Shows warning: "Your progress will be lost"
  - Quit or Continue options

---

## 🛠️ Setup & Installation

### Requirements

#### System Requirements
- **Modern Web Browser**: Chrome, Firefox, Safari, Edge (any recent version)
- **No Installation Needed**: Pure HTML5 + JavaScript
- **Internet**: Required only for Three.js library (CDN)

#### Dependencies
- **Three.js r128**: 3D rendering library (loaded from CDN)
- **Google Fonts**: Bubblegum Sans, Fredoka One (loaded from CDN)
- **No Build Tools Required**: Game runs as-is

### Quick Start

#### Option 1: Direct File Access
1. Download/Copy all files to your web server or local folder:
   - `index.html` (main HTML file)
   - `styles.css` (styling)
   - `script.js` (game logic)

2. Open `index.html` in a web browser

3. Start playing! 🎮

#### Option 2: Using WAMP/XAMPP
1. Place files in `c:\wamp64\www\game\` (Windows WAMP) or equivalent Apache folder
2. Access via: `http://localhost/game/index.html`
3. Play!

#### Option 3: Web Server Deployment
1. Upload files to your web hosting server (GoDaddy, Bluehost, cPanel, etc.)
2. Access via: `https://yourdomain.com/game/index.html`
3. Play!

### File Structure
```
/game/
├── index.html          # Main HTML structure (40 lines)
├── styles.css          # All CSS styling (400+ lines, mobile-responsive)
├── script.js           # All JavaScript logic (400+ lines, heavily commented)
├── README.md           # This documentation file
└── package.json        # Node.js metadata (optional)
```

---

## 📖 Code Documentation

### Architecture Overview

The game uses the **Model-View-Controller** pattern:

```
┌─────────────────────────────────────────────┐
│         Three.js Scene Management            │
│  (3D World, Bug, Orbs, Particles, Tiles)    │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
   Game State   Input      Collision
   Management   Handler    Detection
        │          │          │
        └──────────┼──────────┘
                   │
┌──────────────────▼──────────────────┐
│       HTML UI & DOM Elements         │
│  (Buttons, Modals, HUD, Overlays)   │
└──────────────────────────────────────┘
```

### File-by-File Breakdown

#### `index.html` (40 lines)
**Purpose**: HTML structure and DOM elements

Contains:
- Meta tags for mobile optimization
- CDN links for Three.js and Google Fonts
- HUD container (pause button, exit button, equation box, score)
- Modal overlays (start screen, instructions, pause, quit, game over)
- Script tag linking to `script.js`

Key Elements:
- `#hud` - Game HUD (displays during gameplay)
- `#startScreen` - Title and play buttons
- `#pauseModal` - Pause menu
- `#quitModal` - Quit confirmation
- `#gameOverModal` - Game over screen

---

#### `styles.css` (400+ lines)
**Purpose**: All visual styling and animations

Main Sections:
1. **Reset & Body Styles** - Clear defaults, set background gradient
2. **HUD & Buttons** - Pause/exit buttons styling
3. **Equation Box** - Math problem display + glitter animation
4. **Score Box** - Points display (yellow circle)
5. **Modals & Screens** - Start, pause, quit, game over interfaces
6. **Animations** - 8+ keyframe animations:
   - `glitterPulse` - Equation box glitter effect (0.6s)
   - `titleBounce` - Title bouncing animation
   - `btnPulse` - Play button pulsing
   - `cardPop` - Modal pop-in effect
   - `comboAnim` - Combo text float-up
   - `orbPop` - Orb spawn effect
   - `orbDie` - Orb destruction effect
7. **Mobile Responsive** - Media queries for tablets (768px) and phones (480px)

Key Animations:
```css
/* Glitter pulse on new equation */
@keyframes glitterPulse {
  0% - scale 1, normal glow
  25% - scale 1.05, yellow glow 20px
  50% - scale 1.08, yellow glow 30px (peak)
  75% - scale 1.04, yellow glow 20px
  100% - scale 1, normal glow
}
```

---

#### `script.js` (400+ lines)
**Purpose**: Game logic, physics, rendering, input handling

Main Sections:

**1. Constants** (Lines 1-25)
```javascript
const TILE_SIZE = 26;           // Grass tile size
const TILE_COUNT = 9;           // 9×9 grid (81 tiles)
const SEG_COUNT = 11;           // Body segments
const BUG_SPEED = 0.20;         // Movement speed (0-1)
const ORB_COUNT = 8;            // Orbs per spawn cell
const TOUCH_SENSITIVITY = 0.65; // Mobile touch damping (0-1)
const CAMERA_FOLLOW_SPEED = 0.035; // Camera smoothing
const ORB_SPAWN_GRID = 50;      // Grid cell size for orb spawning
```

**2. State Variables** (Lines 27-40)
```javascript
let gameActive = false;         // Is game running?
let gamePaused = false;         // Is game paused?
let score = 0;                  // Current score
let numberOrbs = [];            // Array of orbs in scene
let currentEquation = {};       // Current math problem
// ... and scene/rendering objects
```

**3. Three.js Initialization** (Lines 42-100)
- `initThree()` - Setup scene, camera, renderer
- `setupLighting()` - Add ambient + directional lights
- `buildWorld()` - Create 9×9 tiled ground with decorations
- `createBug()` - Construct 3D bug model with details

**4. World Generation** (Lines 102-250)
- `addTileDecos()` - Add random flowers, mushrooms, rocks, bushes
- `makeFlower()`, `makeMushroom()`, `makeRock()`, `makeBush()` - Decoration generators
- Procedural placement with random colors

**5. Bug Model** (Lines 252-350)
Detailed 3D bug construction:
- Head (green sphere with blush, eyes, smile)
- Antennae (yellow tips)
- Body segments (11 segments, alternating colors)
- Legs (alternating segments)
- Mobile scaling (75% smaller on mobile)

**6. Orb System** (Lines 352-550)
- `createOrbLabel()` - Create HTML number labels
- `syncOrbLabels()` - Update label positions each frame
- `spawnOrbsAtGridCell()` - Spawn 8 orbs in a grid cell
  - 40% chance correct answer
  - 60% chance wrong answer
  - Unique coloring and sizing
- `initializeOrbSpawning()` - Setup initial spawn grid

**7. Collision & Scoring** (Lines 552-620)
- `checkCollisions()` - Check bug vs orb proximity
- `handleCorrect()` - Award points, trigger glitter, spawn new equation
- `handleWrong()` - Game over sequence
- `generateEquation()` - Random addition (MIN to MAX)

**8. Physics & Animation** (Lines 622-700)
- `updateBug()` - Movement, body chain IK
- `updateCamera()` - Smooth follow camera
- `updateOrbs()` - Bob and rotate orbs
- `updateParticles()` - Physics & opacity for bursts
- `updateWorld()` - Tile recycling, continuous orb spawning

**9. Controls** (Lines 702-750)
- Mouse move → raycasting to ground plane
- Touch move → same with sensitivity damping
- Mobile detection and input adjustment

**10. Game Loop** (Lines 752-800)
Main `gameLoop()` runs 60fps via `requestAnimationFrame`:
```
if (gameActive && !gamePaused):
  updateBug()
  updateCamera()
  checkCollisions()
updateWorld()
updateOrbs()
updateParticles()
syncOrbLabels()
renderer.render()
```

**11. UI Bindings** (Lines 802-900)
Event listeners for:
- Play button → `initGame()`
- Pause button → show pause modal
- Exit button → show quit confirmation
- Resume button → unpause
- Quit confirm → back to menu
- Resume instruction modal actions

**12. Boot** (Lines 902-910)
Initialization sequence on page load:
```javascript
boot() {
  initThree();
  setupLighting();
  buildWorld();
  createBug();
  setupControls();
  setupUI();
  gameLoop();
}
```

---

## 🔧 Configuration & Tuning

### Quick Adjustments

#### Difficulty
```javascript
// Line 14: Make equation harder
const MAX_NUM = 20;  // Was 15 (equations up to 40)

// Line 13: Make equation easier
const MIN_NUM = 0;   // Was 1 (includes 0)
```

#### Bug Speed
```javascript
// Line 15: Slower/faster movement
const BUG_SPEED = 0.15;  // Slower (was 0.20)
const BUG_SPEED = 0.30;  // Faster (was 0.20)
```

#### Touch Sensitivity
```javascript
// Line 19: More/less sensitive
const TOUCH_SENSITIVITY = 0.8;  // More responsive (was 0.65)
const TOUCH_SENSITIVITY = 0.5;  // Less responsive (was 0.65)
```

#### Background Speed
```javascript
// Line 20: Faster/slower parallax
const CAMERA_FOLLOW_SPEED = 0.050;  // Faster (was 0.035)
const CAMERA_FOLLOW_SPEED = 0.020;  // Slower (was 0.035)
```

#### Orb Spawning
```javascript
// Line 22: More/fewer orbs per cell
const ORB_COUNT = 12;  // More orbs (was 8)
const ORB_COUNT = 4;   // Fewer orbs (was 8)

// Line 21: Spawn grid distance
const ORB_SPAWN_GRID = 70;  // Sparser (was 50)
const ORB_SPAWN_GRID = 30;  // Denser (was 50)
```

#### Correct Answer Rate
```javascript
// Line 387: Chance of correct orb
const isCorrect = Math.random() < 0.5;  // 50% (was 40%)
const isCorrect = Math.random() < 0.3;  // 30% (was 40%)
```

---

## 🎨 Color Palette

Game uses vibrant Tailwind-inspired colors:

| Element | Color | Hex | Usage |
|---------|-------|-----|-------|
| Primary Green | Light Green | #4ade80 | Bug head, correct indicator |
| Grass | Dark Green | #1a5f1d | Ground tiles |
| Equation Box | White | #ffffff | Math equation display |
| Score Circle | Golden | #fde68a | Score display |
| Glitter | Yellow | #fde68a | Equation glitter animation |
| Orb Variety | 8 colors | See `ORB_COLORS` array | Number orbs |
| Error Red | Red | #ff3333 | Wrong answer feedback |
| Button Green | Green | #16a34a | Positive actions |
| Button Gray | Gray | #9ca3af | Neutral actions |

---

## 📱 Mobile Responsiveness

### Breakpoints

| Size | Breakpoint | Changes |
|------|-----------|---------|
| Desktop | 769px+ | Full size UI, normal bug (100%) |
| Tablet | 481-768px | 10-15% UI reduction, button sizing |
| Mobile | ≤480px | 20% UI reduction, 75% bug size, compact buttons |

### Touch Optimizations

1. **Sensitivity**: 65% reduction in finger movement impact vs mouse
2. **Dead Zone**: Center 30% of screen doesn't move bug much
3. **Button Size**: 40-50px buttons (easy to tap)
4. **Reduced Animations**: Lower polygon count for orbs on low-end devices
5. **Device Detection**: Automatic via `navigator.userAgent` regex

---

## 🚀 Performance Considerations

### Optimization Techniques

1. **Object Pooling**: Reuse particle meshes (not fully implemented)
2. **Distance Culling**: Remove orbs > 80 units away
3. **Grid-Based Spawning**: Only spawn orbs in adjacent cells
4. **Reduced Particle Count**: 20 particles per burst
5. **Fog**: Limits rendering distance (60-140 units)
6. **LOD**: Simpler geometry for decorations

### Performance Tips

```javascript
// Monitor FPS in browser console:
setInterval(() => console.log(clock.getElapsedTime()), 1000);

// Reduce detail to improve performance:
// - Lower ORB_COUNT (8 → 4)
// - Higher TILE_SPAWN_GRID (50 → 100)
// - Reduce light shadow resolution
```

### Target Performance

- **Desktop**: 60fps (stable)
- **Tablet**: 45-60fps (good)
- **Mobile**: 30-60fps (acceptable)

---

## 🐛 Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Game won't load | Three.js CDN down | Check internet connection |
| Black screen | Rendering issue | Refresh page, check console |
| Orbs not appearing | Spawn distance issue | Restart game |
| Lag on mobile | Too many orbs | Reduce `ORB_COUNT` |
| Touch not working | Event listener disabled | Check `gameActive` flag |
| Equation doesn't glitter | Animation CSS issue | Clear cache, refresh |

### Browser Console Debug

```javascript
// Check game state
console.log('Score:', score);
console.log('Orbs:', numberOrbs.length);
console.log('Game Active:', gameActive);
console.log('Game Paused:', gamePaused);
console.log('Current Equation:', currentEquation);

// Force pause
gamePaused = true;

// Force resume
gamePaused = false;

// Check orb positions
numberOrbs.forEach(o => console.log(o.val, o.group.position));
```

---

## 🎓 Educational Value

### Math Learning

- **Addition Equations**: 1+1 to 15+15 (up to 30)
- **Number Recognition**: Identifies numbers 1-50
- **Mental Math**: Quick calculation under pressure
- **Pattern Recognition**: Predicts next equations

### Skills Developed

- ✅ Arithmetic fluency
- ✅ Hand-eye coordination (mouse/touch control)
- ✅ Decision-making (choose correct orb)
- ✅ Time management (quick decisions)
- ✅ Persistence (learning from mistakes)

---

## 📄 License & Credits

- **Created by**: Njeri
- **Built with**: Three.js r128
- **Fonts**: Google Fonts (Bubblegum Sans, Fredoka One)
- **License**: Open for educational use

---

## 🤝 Contributing

Want to improve the game? Ideas:

1. **Difficulty Levels**: Easy (1-5), Medium (1-15), Hard (1-30)
2. **Power-ups**: Speed up, slow orbs, reveal answer
3. **Sound Effects**: Spawn sounds, correct/wrong feedback
4. **Leaderboard**: Track high scores
5. **New Game Modes**: Subtraction, multiplication, division
6. **Character Skins**: Different bug colors
7. **Level Progression**: Gradually increase difficulty

---

## 📞 Support & Contact

For questions, suggestions, or bug reports:
- Direct message the creator
- Check browser console for errors
- Test on different browsers

---

**Thank you for playing Count & Crawl 3D! 🐛✨**
