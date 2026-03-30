/**mpya
 * - Three.js for 3D rendering
 * - Raycasting for mouse/touch input
 * - Physics: body chain IK, momentum//haikua rahisi
 * - Grid-based orb spawning system
 * - Collision detection with sweep
 * 
 * Flow:
 * boot() → initThree() → setupLighting() → buildWorld() →
 * createBug() → setupControls() → setupUI() → gameLoop()
 */
const TILE_SIZE = 26;           
const TILE_COUNT = 9;           
const SEG_COUNT = 11;           
const SEG_SPACING = 0.95;       

const BUG_SPEED = 0.60;         
const ORB_COUNT = 8;            
const MIN_NUM = 1;              
const MAX_NUM = 15;             

const TOUCH_SENSITIVITY = 1; // 0=immobile, 1=same as mouse(mobile config)
const CAMERA_FOLLOW_SPEED = 0.10; // Camera smoothing: higher=faster follow
const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);


const ORB_SPAWN_GRID = 50;// grid cell size (spawns new orbs every 50 units)

const ORB_COLORS = [
  0xff6b6b, // Red
  0xffd93d, // Yellow
  0x6bcb77, // Green
  0x4d96ff, // Blue
  0xff922b, // Orange
  0xda77f2, // Purple
  0x4ec9b0, // teal
  0xff85a1  // Pink
];

let scene, camera, renderer, raycaster;// Three.js Objects

let headGroup;                      // Main bug head mesh group
let bodySegments = [];              // Array of body segment mesh groups
let segmentPositions = [];          // Array of {x, z} positions for IK chain

let groundTiles = [];               // Array of grass tile meshes
let decoGroups = [];                // Array of decoration groups (flowers, rocks, etc)

let numberOrbs = [];                // Array of {group, ring, sphere, label, val, isCorrect, ...}

let currentEquation = '';            // String display of equation
let correctAnswer = 0;              // Answer to current equation
let score = 0;                      // Current score (increments by 10 per correct orb)
let gameActive = false;             // Is gameplay running?
let gamePaused = false;             // Is game paused by player?
let targetPoint = new THREE.Vector3(0, 0, 0); // Where bug is moving to (mouse/touch)

let clock;                          // THREE.Clock for delta time
const particles = [];               // Array of particles {msh, vel, life}
let sunLight;                       // Main directional light (follows camera)

let lastOrbSpawnX = 0;              // Last grid cell X we spawned
let lastOrbSpawnZ = 0;              // Last grid cell Z we spawned

let audioContext;                   // Web Audio API context
let soundEnabled = true;            // Toggle sound on/off
let backgroundMusicOscillators = [];// Looping background music oscillators
let musicEnabled = true;            // Background music toggle

let gameMode = 'normal';            // 'normal', 'timeAttack', 'survival'
let difficulty = 'easy';            // 'easy', 'medium', 'hard'
let timeLeft = 60;                  // Time attack countdown
let timerMesh = null;               // 3D timer torus for Time Attack
let comboStreak = 0;                // Current combo count
let highScore = 0;                  // Best score ever (from localStorage)
let gameStartTime = 0;              // When current game started

let equationOperator = '+';         // '+', '-', '*', '/'
const EQUATIONS = {
  easy: { operators: ['+'], numRange: [1, 10] },
  medium: { operators: ['+', '-'], numRange: [1, 20] },
  hard: { operators: ['+', '-', '*', '/'], numRange: [1, 30] }
};

let activePowerups = [];            // {type, endTime} - 'slowTime', 'doublePoints', 'shield'
let shieldActive = false;           // 1 wrong answer forgiven
let slowTimeActive = false;         // Orbs move slower
let doublePointsActive = false;     // 2x score multiplier
let powerupMultiplier = 1;          // current point multiplier

let achievements = {
  'first10': { earned: false, name: 'First 10 Points' },//archivements
  'combo5': { earned: false, name: '5x Combo' },
  'combo10': { earned: false, name: '10x Combo' },
  'score100': { earned: false, name: 'Century' },
  'score500': { earned: false, name: 'High Roller' },
  'equations20': { earned: false, name: 'Math Whiz' }
};

let tutorialShown = false;          // has player seen tutorial?
let settingsOpen = false;           // is settings menu open?

function initThree() {
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x56ccf2, 60, 140); // Blues, 60-140 unit range(fog)

  
  const aspect = window.innerWidth / window.innerHeight;// Create perspective camera (matches portrait phone layout)
  camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 500);
  camera.position.set(0, 20, 12); // High angle, looking down at bug
  camera.lookAt(0, 0, -1);         // Look slightly ahead

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });//WebGL renderer
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 2x for mobile only
  
  renderer.shadowMap.enabled = true;//shadow
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; 

  renderer.domElement.id = 'threeCanvas';//canvas ID
  document.body.insertBefore(renderer.domElement, document.body.firstChild);

  raycaster = new THREE.Raycaster();//mouse/touch 
  clock = new THREE.Clock();

  window.addEventListener('resize', onResize);//windows resize
}

function initAudio() {
  try {
    const audioCtx = window.AudioContext || window.webkitAudioContext;
    audioContext = new audioCtx();
  } catch (e) {
    console.warn('Web Audio API not supported');
    soundEnabled = false;
  }
  
  loadHighScore();
  loadGameSettings();
  startBackgroundMusic();
}

function saveHighScore(newScore) {
  if (newScore > highScore) {
    highScore = newScore;
    localStorage.setItem('sayItRightHighScore', highScore.toString());
    checkAchievement('score100', newScore >= 100);
    checkAchievement('score500', newScore >= 500);
    return true; // new high score!
  }
  return false;
}

function loadHighScore() {
  const saved = localStorage.getItem('sayItRightHighScore');
  highScore = saved ? parseInt(saved) : 0;
  const display = document.getElementById('highScoreDisplay');
  if (display) display.textContent = `Best: ${highScore}`;
}

function resetHighScore() {
  highScore = 0;
  localStorage.removeItem('sayItRightHighScore');
  const display = document.getElementById('highScoreDisplay');
  if (display) display.textContent = 'Best: 0';
  
  const notification = document.createElement('div');//success
  notification.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #10b981; color: white; padding: 20px 40px; border-radius: 12px; font-size: 18px; font-weight: bold; z-index: 9999; box-shadow: 0 8px 24px rgba(0,0,0,0.3);';
  notification.textContent = '✓ High Score Reset!';
  document.body.appendChild(notification);
  
  setTimeout(() => notification.remove(), 2000);
}

function loadGameSettings() {//settings
  const savedMusic = localStorage.getItem('sayItRightMusic');
  if (savedMusic !== null) musicEnabled = savedMusic === '1';
  
  const savedDifficulty = localStorage.getItem('sayItRightDifficulty');
  if (savedDifficulty) difficulty = savedDifficulty;
}

function saveGameSettings() {
  localStorage.setItem('sayItRightMusic', musicEnabled ? '1' : '0');
  localStorage.setItem('sayItRightDifficulty', difficulty);
}

function startBackgroundMusic() {//bs sound
  if (!musicEnabled || !audioContext || backgroundMusicOscillators.length > 0) return;
  
  try {
    const ctx = audioContext;
    const now = ctx.currentTime;
    
    const notes = [130.81, 164.81, 196.00]; // C3, E3, G3
    
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.value = 0.01; // quiet background
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      backgroundMusicOscillators.push(osc);
    });
  } catch(e) {
    console.warn('Background music failed:', e);
  }
}

function stopBackgroundMusic() {
  backgroundMusicOscillators.forEach(osc => {
    try { osc.stop(); } catch(e) {}
  });
  backgroundMusicOscillators = [];
}

function toggleBackgroundMusic() {
  musicEnabled = !musicEnabled;
  if (musicEnabled) startBackgroundMusic();
  else stopBackgroundMusic();
  localStorage.setItem('sayItRightMusic', musicEnabled ? '1' : '0');
}


function playCorrectSound() {
  if (!soundEnabled || !audioContext) return;
  
  const now = audioContext.currentTime;
  const duration = 0.4;
  
  // Oscillator: pitch sweep
  const osc = audioContext.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(262, now);      // C4
  osc.frequency.exponentialRampToValueAtTime(392, now + duration); // G4
  
  const gain = audioContext.createGain();//attack decay
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
  
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playWrongSound() {
  if (!soundEnabled || !audioContext) return;
  
  const now = audioContext.currentTime;
  const duration = 0.3;
  
  // Oscillator: pitch drop
  const osc = audioContext.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, now);      // low note
  osc.frequency.exponentialRampToValueAtTime(80, now + duration); // lower
  
  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
  
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playGlitterSound() {
  if (!soundEnabled || !audioContext) return;
  
  const now = audioContext.currentTime;
  const duration = 0.25;
  
  // Oscillator: high pitch
  const osc = audioContext.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(800, now);      // High C
  
  const gain = audioContext.createGain();//quick fade
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
  
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playClickSound() {
  if (!soundEnabled || !audioContext) return;
  
  const now = audioContext.currentTime;
  const duration = 0.15;
  
  const osc = audioContext.createOscillator();// Oscillator: medium pitch
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, now);      // A4
  
  const gain = audioContext.createGain();//envelope
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
  
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  const soundBtn = document.getElementById('soundToggleBtn');
  if (soundBtn) {
    soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
  }
  playClickSound();
}

function setupAudio() {
  initAudio();
}

function incrementCombo() {
  comboStreak++;
  const comboEl = document.getElementById('comboDisplay');
  if (comboEl) {
    comboEl.textContent = `${comboStreak}x COMBO`;
    comboEl.style.animation = 'none';
    setTimeout(() => { comboEl.style.animation = 'comboAnim 0.5s ease-out'; }, 10);
  }
  
  // play combo sound every 5 streak
  if (comboStreak % 5 === 0 && comboStreak > 0) {
    playGlitterSound();
  }
}

function resetCombo() {
  if (comboStreak >= 10) checkAchievement('combo10', true);
  if (comboStreak >= 5) checkAchievement('combo5', true);
  comboStreak = 0;
  const comboEl = document.getElementById('comboDisplay');
  if (comboEl) comboEl.textContent = '';
}

function getComboMultiplier() {
  // every 5 streak = +10% multiplier
  return 1 + (Math.floor(comboStreak / 5) * 0.1);
}

function updateDifficulty() {
  const scoreThreshold = score >= 500 ? 'hard' : score >= 200 ? 'medium' : 'easy';//increases with score
  if (difficulty !== scoreThreshold) {
    difficulty = scoreThreshold;
  }
}

function getNumberRange() {
  const eqConfig = EQUATIONS[difficulty];
  return eqConfig.numRange;
}

function getOperators() {
  const eqConfig = EQUATIONS[difficulty];
  return eqConfig.operators;
}

function generateEquation() {//many types
  const range = getNumberRange();
  const operators = getOperators();
  
  const num1 = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
  const num2 = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  
  let answer = 0;
  let display = '';
  
  switch(operator) {
    case '+':
      answer = num1 + num2;
      display = `${num1} + ${num2}`;
      break;
    case '-':
      answer = num1 - num2;
      display = `${num1} - ${num2}`;
      break;
    case '*':
      answer = num1 * num2;
      display = `${num1} × ${num2}`;
      break;
    case '/':
      answer = Math.round(num1 / num2);
      display = `${num1} ÷ ${num2}`;
      break;
  }
  
  currentEquation = display;
  correctAnswer = Math.max(1, Math.abs(answer)); // ensure positive
  
  const eq = document.getElementById('equationText');
  if (eq) eq.textContent = currentEquation;
}

function spawnPowerup() {//powerups
  if (Math.random() > 0.05) return; // 5% spawn chance per orb
  
  const types = ['slowTime', 'doublePoints', 'shield'];
  const type = types[Math.floor(Math.random() * types.length)];
  const duration = 8000; // 8 seconds
  
  activePowerups.push({ type, endTime: Date.now() + duration });
  displayPowerupNotification(type);
}

function updatePowerups() {
  activePowerups = activePowerups.filter(p => {
    if (Date.now() > p.endTime) {
      deactivatePowerup(p.type);
      return false;
    }
    return true;
  });
  
  powerupMultiplier = activePowerups.some(p => p.type === 'doublePoints') ? 2 : 1;
}

function activatePowerup(type) {
  switch(type) {
    case 'slowTime':
      slowTimeActive = true;
      break;
    case 'doublePoints':
      doublePointsActive = true;
      break;
    case 'shield':
      shieldActive = true;
      break;
  }
}

function deactivatePowerup(type) {
  switch(type) {
    case 'slowTime':
      slowTimeActive = false;
      break;
    case 'doublePoints':
      doublePointsActive = false;
      break;
    case 'shield':
      shieldActive = false;
      break;
  }
}

function displayPowerupNotification(type) {
  const names = {
    slowTime: '🕓 SLOW TIME!',
    doublePoints: '✖２ DOUBLE POINTS!',//https://emojidb.org/
    shield: '🛡️ SHIELD!'
  };
  
  const notification = document.createElement('div');
  notification.className = 'powerupNotif';
  notification.textContent = names[type];
  notification.style.cssText = `
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    font-size: 32px; font-weight: bold;
    color: #ffff00; text-shadow: 0 0 10px #ff8800;
    pointer-events: none; z-index: 100;
    animation: powerupPop 1s ease-out forwards;
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 1000);
}

function checkAchievement(id, condition) {
  if (condition && !achievements[id].earned) {
    achievements[id].earned = true;
    showAchievementPopup(achievements[id].name);
    localStorage.setItem(`achievement_${id}`, '1');
  }
}

function showAchievementPopup(name) {
  const popup = document.createElement('div');
  popup.className = 'achievementPopup';
  popup.innerHTML = `🏆 Achievement Unlocked!<br>${name}`;//kasmall popup
  popup.style.cssText = `
    position: fixed; top: 100px; right: 20px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white; padding: 15px 25px;
    border-radius: 10px; font-weight: bold;
    box-shadow: 0 8px 16px rgba(0,0,0,0.3);
    pointer-events: none; z-index: 100;
    animation: slideIn 0.5s ease-out;
  `;
  document.body.appendChild(popup);
  setTimeout(() => {
    popup.style.animation = 'slideOut 0.5s ease-in forwards';
    setTimeout(() => popup.remove(), 500);
  }, 2500);
}

function loadAchievements() {
  Object.keys(achievements).forEach(id => {
    if (localStorage.getItem(`achievement_${id}`)) {
      achievements[id].earned = true;
    }
  });
}

function setupLighting() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));

  const hemi = new THREE.HemisphereLight(0x87ceeb, 0x4ade80, 0.7);
  scene.add(hemi);

  sunLight = new THREE.DirectionalLight(0xfff5e0, 1.4);
  sunLight.position.set(12, 24, 8);
  sunLight.castShadow = true;
  
  // shadow camera setup (orthographic projection for shadows)
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 120;
  sunLight.shadow.camera.left = -40;
  sunLight.shadow.camera.right = 40;
  sunLight.shadow.camera.top = 40;
  sunLight.shadow.camera.bottom = -40;
  sunLight.shadow.mapSize.set(2048, 2048); // High-res shadows

  scene.add(sunLight);
}


function createTimer3D() {
  if (timerMesh) scene.remove(timerMesh);
  
  timerMesh = new THREE.Group();
  
  const torusGeo = new THREE.TorusGeometry(2, 0.3, 16, 100);
  const torusMat = new THREE.MeshPhongMaterial({ 
    color: 0x00d4ff, 
    emissive: 0x0099ff,
    shininess: 100
  });
  const torus = new THREE.Mesh(torusGeo, torusMat);
  torus.rotation.x = Math.PI / 2.5; // Tilt for perspective
  torus.userData.baseMaterial = torusMat;
  timerMesh.add(torus);
  
  // Position timer in top of screen
  timerMesh.position.set(0, 15, -8);
  
  scene.add(timerMesh);
}


function updateTimer3D() {//timer
  if (!timerMesh) return;
  
  const torus = timerMesh.children[0];
  const timePercent = timeLeft / 60;  // rotation speed increases as time runs out
  const rotationSpeed = 0.05 + (1 - timePercent) * 0.1;
  torus.rotation.z += rotationSpeed;
  
  let color;
  if (timePercent > 0.33) {
    color = new THREE.Color().setHSL(0.55, 1, 0.5);
  } else if (timePercent > 0.16) {
    const transitionPercent = (0.33 - timePercent) / 0.17;
    color = new THREE.Color().setHSL(0.55 - transitionPercent * 0.35, 1, 0.5);
  } else {
    color = new THREE.Color().setHSL(0, 1, 0.5);
  }
  
  if (timePercent < 0.16) {
    const pulse = 0.7 + Math.sin(Date.now() * 0.01) * 0.3;
    torus.scale.set(pulse, pulse, pulse);
  } else {
    torus.scale.set(1, 1, 1);
  }
  
  torus.material.color.copy(color);
  torus.material.emissive.copy(color.clone().multiplyScalar(0.6));
}

const tileColors = [0x2d7a1f, 0x347a24, 0x2a5e1c, 0x3a8229, 0x306820, 0x278024];//grass shades of green

function buildWorld() {
  for (let tx = 0; tx < TILE_COUNT; tx++) {
    for (let tz = 0; tz < TILE_COUNT; tz++) {
      const geo = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);// plane geometry for tile
      const mat = new THREE.MeshLambertMaterial({
        color: tileColors[Math.floor(Math.random() * tileColors.length)]
      });
      
      const tile = new THREE.Mesh(geo, mat);
      tile.rotation.x = -Math.PI / 2; // rotate 90° to face up(mesh)
      
      tile.position.set(
        (tx - Math.floor(TILE_COUNT / 2)) * TILE_SIZE,
        0,
        (tz - Math.floor(TILE_COUNT / 2)) * TILE_SIZE
      );
      
      tile.receiveShadow = true;
      scene.add(tile);
      groundTiles.push(tile);

      const dg = new THREE.Group();
      dg.position.copy(tile.position);
      addTileDecos(dg, TILE_SIZE);
      scene.add(dg);
      decoGroups.push(dg);
    }
  }
}

function addTileDecos(group, size) {//random placement
  const count = 4 + Math.floor(Math.random() * 5); // 4-8 decorations per tile
  
  for (let i = 0; i < count; i++) {
    const px = (Math.random() - 0.5) * (size - 4);
    const pz = (Math.random() - 0.5) * (size - 4);
    
    const t = Math.random();
    let d;
    if      (t < 0.38) d = makeFlower();      // 38% flowers
    else if (t < 0.60) d = makeMushroom();    // 22% mushrooms
    else if (t < 0.80) d = makeRock();        // 20% rocks
    else               d = makeBush();        // 20% bushes
    
    if (d) {
      d.position.set(px, 0, pz);
      group.add(d);
    }
  }
}


function makeFlower() {//flower
  const g = new THREE.Group();
  
  const stemM = new THREE.MeshLambertMaterial({ color: 0x16a34a });//stem
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.75, 6), stemM);
  stem.position.y = 0.37;
  g.add(stem);
  
  const petalColors = [0xff6b6b, 0xffd93d, 0xda77f2, 0xff85a1, 0xf97316, 0x38bdf8];//petals
  const hm = new THREE.MeshLambertMaterial({
    color: petalColors[Math.floor(Math.random() * petalColors.length)]
  });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), hm);
  head.position.y = 0.82;
  g.add(head);
  
  const cm = new THREE.MeshLambertMaterial({ color: 0xfef3c7 });//center
  const cn = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), cm);
  cn.position.y = 0.88;
  g.add(cn);
  
  return g;
}

function makeMushroom() {//mushroom
  const g = new THREE.Group();
  
  const stemM = new THREE.MeshLambertMaterial({ color: 0xfefce8 });//stem
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.48, 8), stemM);
  stem.position.y = 0.24;
  g.add(stem);
  
  const capC = [0xef4444, 0xf97316, 0xa855f7, 0xec4899];//cap
  const capM = new THREE.MeshLambertMaterial({
    color: capC[Math.floor(Math.random() * capC.length)]
  });
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    capM
  );
  cap.position.y = 0.47;
  g.add(cap);
  
  return g;
}


function makeRock() {//rocks
  const g = new THREE.Group();
  const m = new THREE.MeshLambertMaterial({ color: 0x9ca3af });
  const r = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.2 + Math.random() * 0.18, 0),
    m
  );
  r.position.y = 0.15;
  r.rotation.set(Math.random(), Math.random(), Math.random() * 0.4);
  g.add(r);
  return g;
}


function makeBush() {//bush 
  const g = new THREE.Group();
  const m = new THREE.MeshLambertMaterial({ color: 0x15803d });
  
  [[0,0.28,0,0.33],[0.28,0.2,0.08,0.24],[-0.22,0.2,0.06,0.26]].forEach(([x,y,z,r]) => {
    const sp = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8), m);
    sp.position.set(x, y, z);
    g.add(sp);
  });
  return g;
}

function createBug() {
  headGroup = new THREE.Group();
  scene.add(headGroup);
  // scale bug smaller on mobile for better visibility
  const headScale = IS_MOBILE ? 0.75 : 1;

  const hMat = new THREE.MeshPhongMaterial({//head
    color: 0x4ade80,
    shininess: 90,
    specular: 0xaaffaa
  });
  const hSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.72 * headScale, 22, 22),
    hMat
  );
  hSphere.position.y = 0.56 * headScale;
  hSphere.castShadow = true;
  headGroup.add(hSphere);

  const blushM = new THREE.MeshBasicMaterial({
    color: 0xfca5a5,
    transparent: true,
    opacity: 0.55
  });
  [-0.42, 0.42].forEach(bx => {
    const bl = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), blushM);
    bl.position.set(bx, 0.42, 0.58);
    headGroup.add(bl);
  });

  // EYES 
  const eyeM = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 140 });
  const pupM = new THREE.MeshPhongMaterial({ color: 0x0f172a });
  const irisM = new THREE.MeshPhongMaterial({ color: 0x22d3ee, shininess: 80 });
  const hiM = new THREE.MeshBasicMaterial({ color: 0xffffff });

  [-0.32, 0.32].forEach((ex, si) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 14), eyeM);//eye white part(dont know the name)
    eye.position.set(ex, 0.72, 0.52);
    headGroup.add(eye);

    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), irisM);//iris
    iris.position.set(ex * 1.05, 0.73, 0.63);
    headGroup.add(iris);

    const pup = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), pupM);//pupil
    pup.position.set(ex * 1.08, 0.74, 0.68);
    headGroup.add(pup);

    const hi = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), hiM);//highlight
    hi.position.set(ex * 1.1 + 0.04, 0.775, 0.72);
    headGroup.add(hi);
  });

  const smilM = new THREE.MeshPhongMaterial({ color: 0x166534 });//smile(haionekani lakini iko)
  for (let i = 0; i < 5; i++) {
    const t = (i / 4) * Math.PI;
    const sd = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), smilM);
    sd.position.set(
      Math.cos(t + Math.PI / 2) * 0.34,
      0.38 + Math.sin(t + Math.PI / 2) * 0.1,
      0.64
    );
    headGroup.add(sd);
  }

  const antM = new THREE.MeshPhongMaterial({ color: 0x166534 });//antenae(pembe)
  const tipM = new THREE.MeshPhongMaterial({
    color: 0xfbbf24,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.4
  });
  
  [[-0.28, 0.4], [0.28, -0.4]].forEach(([ax, rz]) => {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.65, 8),
      antM
    );
    base.position.set(ax, 1.12, 0.28);
    base.rotation.z = rz;
    headGroup.add(base);
    
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), tipM);//glow
    tip.position.set(ax + ax * 0.5, 1.47, 0.28);
    headGroup.add(tip);
  });

  // BODY SEGMENTS 
  bodySegments = [];
  segmentPositions = [{ x: 0, z: 0 }]; // head position

  const segCols = [0x4ade80, 0x22c55e]; // alternating greens
  const stripM = new THREE.MeshPhongMaterial({ color: 0x15803d, shininess: 40 });

  for (let i = 0; i < SEG_COUNT; i++) {
    const t = i / SEG_COUNT;
    const sr = 0.65 - t * 0.2; // taper toward tail
    const sg = new THREE.Group();

    const sM = new THREE.MeshPhongMaterial({//body/segment sphere
      color: segCols[i % 2],
      shininess: 65,
      specular: 0x55ff55
    });
    const sp = new THREE.Mesh(new THREE.SphereGeometry(sr, 14, 14), sM);
    sp.position.y = sr * 0.72;
    sp.castShadow = true;
    sg.add(sp);

    const strp = new THREE.Mesh(//segment ring
      new THREE.TorusGeometry(sr * 0.88, 0.055, 6, 18, Math.PI),
      stripM
    );
    strp.position.y = sr * 0.72;
    strp.rotation.x = Math.PI / 2;
    sg.add(strp);

    if (i % 2 === 0) {//each segment 1 legs
      const legM = new THREE.MeshPhongMaterial({ color: 0x166534 });
      
      [-1, 1].forEach(side => {
        const leg = new THREE.Mesh(//leg cylinder
          new THREE.CylinderGeometry(0.045, 0.035, 0.52, 6),
          legM
        );
        leg.position.set(side * (sr + 0.18), sr * 0.32, 0);
        leg.rotation.z = side * 0.72;
        sg.add(leg);
        
        const foot = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 6), legM);//feet
        foot.position.set(side * (sr + 0.4), 0.06, 0);
        sg.add(foot);
      });
    }

    sg.position.set(-(i + 1) * SEG_SPACING, 0, 0);// position segment in chain (behind head)just like prvious SVG but now #D vibes get it
    scene.add(sg);
    bodySegments.push(sg);
    segmentPositions.push({ x: -(i + 1) * SEG_SPACING, z: 0 });
  }
}

const ORB_CSS_COLORS = [
  '#ff6b6b','#ffd93d','#6bcb77','#4d96ff',
  '#ff922b','#da77f2','#4ec9b0','#ff85a1'
];

function createOrbLabel(value, cssColor) {
  const div = document.createElement('div');
  div.className = 'orb-label';
  div.textContent = value;
  div.style.background = cssColor;
  div.style.boxShadow = `0 0 18px 6px ${cssColor}88, inset 0 1px 0 rgba(255,255,255,0.5)`;
  document.body.appendChild(div);
  return div;
}

function removeOrbLabel(label) {//fade out anime X orb 
  if (!label) return;
  label.classList.add('dying'); // trigger CSS animation
  setTimeout(() => {
    if (label.parentNode) label.parentNode.removeChild(label);
  }, 300);
}

/**
 * World to Screen Projection
 * Converts 3D world position to 2D screen coordinates
 * Used to position HTML labels over 3D orbs
 */
function worldToScreen(worldPos) {
  const v = worldPos.clone().project(camera);
  return {
    x: (v.x + 1) / 2 * window.innerWidth,
    y: (-v.y + 1) / 2 * window.innerHeight,
    behind: v.z > 1  // True if behind camera
  };
}

/**
 * Sync Orb Labels
 * Update position of all HTML labels each frame
 * Runs every loop iteration to follow 3D orbs
 */
function syncOrbLabels() {
  numberOrbs.forEach(o => {
    if (!o.label) return;
    const s = worldToScreen(o.group.position);
    o.label.style.left = s.x + 'px';
    o.label.style.top = s.y + 'px';
    o.label.style.opacity = s.behind ? '0' : '1'; // hide if behind camera
  });
}

function spawnOrbsAtGridCell(gridX, gridZ) {//40% are correct answers, 60% are wrong
  if (!gameActive) return;

  const cellBaseX = gridX * ORB_SPAWN_GRID;
  const cellBaseZ = gridZ * ORB_SPAWN_GRID;

  for (let i = 0; i < ORB_COUNT; i++) {
    let val;
    let isCorrect = false;
    // Different spawn logic for game modes
    // Normal/Time Attack/Survival: 40% correct, 60% wrong
    isCorrect = Math.random() < 0.4;

      if (isCorrect) {
        val = correctAnswer;
      } else {
        val = correctAnswer + Math.floor(Math.random() * 13) - 6;//generate wrong answers
        while (val === correctAnswer || val < 1 || val > 50) {
          val = correctAnswer + Math.floor(Math.random() * 13) - 6;
        }
      }

    const spreadX = cellBaseX + (Math.random() - 0.5) * ORB_SPAWN_GRID;// random position within grid cell
    const spreadZ = cellBaseZ + (Math.random() - 0.5) * ORB_SPAWN_GRID;

    const col3 = ORB_COLORS[i % ORB_COLORS.length];
    const colCSS = ORB_CSS_COLORS[i % ORB_CSS_COLORS.length];

    const og = new THREE.Group();

    const haloM = new THREE.MeshBasicMaterial({// glow halo (semi-transparent sphere)
      color: col3,
      transparent: true,
      opacity: 0.20,
      side: THREE.BackSide
    });
    og.add(new THREE.Mesh(new THREE.SphereGeometry(1.38, 14, 14), haloM));
    
    const sM = new THREE.MeshPhongMaterial({// added main sphere (emissive for glow)
      color: col3,
      emissive: col3,
      emissiveIntensity: 0.30,
      shininess: 110,
      transparent: true,
      opacity: 0.92
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.92, 18, 18), sM);
    sphere.castShadow = true;
    og.add(sphere);

    const rM = new THREE.MeshPhongMaterial({// Equator ring (rotating detail)
      color: 0xffffff,
      emissive: col3,
      emissiveIntensity: 0.55
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.09, 8, 28), rM);
    ring.rotation.x = Math.PI / 2;
    og.add(ring);

    og.position.set(spreadX, 1.3, spreadZ);
    scene.add(og);

    const label = createOrbLabel(val, colCSS);//html label

    numberOrbs.push({//store orb data
      group: og,
      ring: ring,
      sphere: sphere,
      label: label,
      val: val,
      baseY: 1.3,
      phase: Math.random() * Math.PI * 2, // bobbing animation
      vx: (Math.random() - 0.5) * 0.025,  // horizontal drift
      vz: (Math.random() - 0.5) * 0.025,
      isCorrect: isCorrect
    });
  }
}

function initializeOrbSpawning() {
  numberOrbs.forEach(o => {// clear old orbs
    scene.remove(o.group);
    removeOrbLabel(o.label);
  });
  numberOrbs = [];
  lastOrbSpawnX = 0;
  lastOrbSpawnZ = 0;
  for (let gx = -1; gx <= 1; gx++) {// 3×3 grid of cells around player
    for (let gz = -1; gz <= 1; gz++) {
      spawnOrbsAtGridCell(gx, gz);
    }
  }
}

function burst(pos, wrong = false) {//20 small spheres that fly outward
  for (let i = 0; i < 20; i++) {
    const col = wrong ? 0xff3333 : ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)];// red for wrong, random for correct
    const msh = new THREE.Mesh(
      new THREE.SphereGeometry(0.1 + Math.random() * 0.1, 6, 6),
      new THREE.MeshBasicMaterial({ color: col, transparent: true })
    );
    msh.position.copy(pos);
    scene.add(msh);

    // Velocity: outward in radial pattern
    const angle = (i / 20) * Math.PI * 2;
    const spd = 0.12 + Math.random() * 0.2;

    particles.push({
      msh: msh,
      vel: new THREE.Vector3(
        Math.cos(angle) * spd,
        0.18 + Math.random() * 0.22, // upward bias
        Math.sin(angle) * spd
      ),
      life: 1.0
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {//particles,  gravity, update position, fade out
    const p = particles[i];
    
    // Apply gravity
    p.vel.y -= 0.012;
    
    // Update position
    p.msh.position.add(p.vel);
    
    // Fade
    p.life -= dt * 1.4;
    p.msh.material.opacity = p.life;
    
    // Remove when gone
    if (p.life <= 0) {
      scene.remove(p.msh);
      particles.splice(i, 1);
    }
  }
}
/**
 * Update World
 * Recycle tiles, spawn new orbs, update lighting
 * Called every frame
 */
function updateWorld() {
  const bx = segmentPositions[0].x;
  const bz = segmentPositions[0].z;
  const half = Math.floor(TILE_COUNT / 2) * TILE_SIZE;
  const wrap = TILE_COUNT * TILE_SIZE;

  // Recycle tiles: wrap around when bug moves too far
  groundTiles.forEach((tile, i) => {
    if (tile.position.x < bx - half) tile.position.x += wrap;
    if (tile.position.x > bx + half) tile.position.x -= wrap;
    if (tile.position.z < bz - half) tile.position.z += wrap;
    if (tile.position.z > bz + half) tile.position.z -= wrap;
    decoGroups[i].position.set(tile.position.x, 0, tile.position.z);
  });

  // Continuous orb spawning
  const currentGridX = Math.floor(bx / ORB_SPAWN_GRID);
  const currentGridZ = Math.floor(bz / ORB_SPAWN_GRID);

  if (currentGridX !== lastOrbSpawnX || currentGridZ !== lastOrbSpawnZ) {
    // Player moved to new grid cell - spawn adjacent cells
    for (let gx = currentGridX - 1; gx <= currentGridX + 1; gx++) {
      for (let gz = currentGridZ - 1; gz <= currentGridZ + 1; gz++) {
        // Check if orbs already exist in this cell
        const hasOrbs = numberOrbs.some(o =>
          Math.abs(Math.floor(o.group.position.x / ORB_SPAWN_GRID) - gx) < 0.1 &&
          Math.abs(Math.floor(o.group.position.z / ORB_SPAWN_GRID) - gz) < 0.1
        );
        if (!hasOrbs) {
          spawnOrbsAtGridCell(gx, gz);
        }
      }
    }
    lastOrbSpawnX = currentGridX;
    lastOrbSpawnZ = currentGridZ;
  }

  // Remove distant orbs (optimization - don't render orbs > 80 units away)
  for (let i = numberOrbs.length - 1; i >= 0; i--) {
    const o = numberOrbs[i];
    const dx = o.group.position.x - bx;
    const dz = o.group.position.z - bz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 80) {
      scene.remove(o.group);
      removeOrbLabel(o.label);
      numberOrbs.splice(i, 1);
    }
  }

  // Sun light follows bug (always behind-right)
  sunLight.position.set(bx + 12, 24, bz + 8);
  sunLight.target.position.set(bx, 0, bz);
  sunLight.target.updateMatrixWorld();
}
/**
 * Update Bug Movement
 * - Move head toward target point
 * - Apply body chain constraints (inverse kinematics)
 * - Update segment rotations for direction
 */
function updateBug() {
  const head = segmentPositions[0];
  const dx = targetPoint.x - head.x;
  const dz = targetPoint.z - head.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  // Move head toward target (only if far enough)
  if (dist > 0.25) {
    const spd = Math.min(dist * 0.1, BUG_SPEED); // Speed based on distance, capped
    const nx = dx / dist;
    const nz = dz / dist;
    head.x += nx * spd;  // Move by normalized direction
    head.z += nz * spd;
    headGroup.rotation.y = Math.atan2(nx, nz); // Rotate to face direction
  }

  // Update head position in 3D
  headGroup.position.set(head.x, 0, head.z);

  // Update body segments (IK chain)
  // Each segment tries to stay SEG_SPACING away from the previous one
  for (let i = 1; i < segmentPositions.length; i++) {
    const prev = segmentPositions[i - 1];
    const curr = segmentPositions[i];
    
    const sdx = curr.x - prev.x;
    const sdz = curr.z - prev.z;
    const sd = Math.sqrt(sdx * sdx + sdz * sdz);

    // If too far from previous segment, move toward it
    if (sd > SEG_SPACING) {
      const ratio = (sd - SEG_SPACING) / sd;
      curr.x -= sdx * ratio;
      curr.z -= sdz * ratio;
    }

    // Update segment position
    const seg = bodySegments[i - 1];
    seg.position.x = curr.x;
    seg.position.z = curr.z;

    // Rotate segment to point toward previous segment
    const rdx = prev.x - curr.x;
    const rdz = prev.z - curr.z;
    if (Math.abs(rdx) + Math.abs(rdz) > 0.001) {
      seg.rotation.y = Math.atan2(rdx, rdz);
    }
  }
}

/**
 * Update Camera
 * Smooth follow behind bug, always looking ahead
 */
function updateCamera() {
  const hx = segmentPositions[0].x;
  const hz = segmentPositions[0].z;
  
  // Smooth interpolation toward bug position
  camera.position.x += (hx - camera.position.x) * CAMERA_FOLLOW_SPEED;
  camera.position.z += (hz + 11 - camera.position.z) * CAMERA_FOLLOW_SPEED;
  camera.position.y = 20;
  
  // Always look slightly ahead of bug
  camera.lookAt(hx, 0, hz - 1.5);
}

/**
 * Update Orbs Animation
 * Bobbing motion + rotation
 */
function updateOrbs(t) {
  numberOrbs.forEach(o => {
    // Vertical bobbing
    o.group.position.y = o.baseY + Math.sin(t * 1.8 + o.phase) * 0.32;
    
    // Horizontal drift
    o.group.position.x += o.vx;
    o.group.position.z += o.vz;
    
    // Rotation animations
    o.ring.rotation.z += 0.022;
    o.sphere.rotation.y += 0.012;
  });
}
/**
 * Check Collisions
 * Test bug distance against all orbs
 * Collision distance: 1.85 units
 */
function checkCollisions() {
  if (!gameActive) return;
  
  const hx = segmentPositions[0].x;
  const hz = segmentPositions[0].z;

  // Check each orb
  for (let i = numberOrbs.length - 1; i >= 0; i--) {
    const o = numberOrbs[i];
    const dx = hx - o.group.position.x;
    const dz = hz - o.group.position.z;
    
    // Simple distance check
    if (Math.sqrt(dx * dx + dz * dz) < 1.85) {
      // Check if answer is correct
      const isCorrect = o.val === correctAnswer;
      
      if (isCorrect) {
        handleCorrect(o, i);
      } else {
        handleWrong(o);
      }
      break;
    }
  }
}

/**
 * Show Combo Flash
 * Display "✓ +10" or "✗ WRONG!" text
 */
let comboTimeout;
function showComboFlash(text) {
  const el = document.getElementById('comboFlash');
  el.textContent = text;
  el.classList.remove('show');
  void el.offsetWidth; // Force reflow to restart animation
  el.classList.add('show');
  clearTimeout(comboTimeout);
  comboTimeout = setTimeout(() => el.classList.remove('show'), 900);
}

/**
 * Handle Correct Answer
 * Award points, spawn new equation, trigger animation
 */
function handleCorrect(orb, idx) {
  // Award points with multipliers
  const basePoints = 10;
  const comboBonus = Math.floor(basePoints * (comboStreak / 10));
  const powerupBonus = Math.floor((basePoints + comboBonus) * (powerupMultiplier - 1));
  const totalPoints = basePoints + comboBonus + powerupBonus;
  
  score += totalPoints;
  document.getElementById('scoreDisplay').textContent = score;
  
  // Show feedback
  showComboFlash(`✓ +${totalPoints}`);
  burst(orb.group.position.clone());
  
  // Play sound effects
  playCorrectSound();
  
  // Combo streak
  incrementCombo();
  
  // Difficulty progression
  updateDifficulty();
  
  // Spawn power-ups
  spawnPowerup();
  
  // Check achievements
  checkAchievement('first10', score >= 10);
  
  // Remove orb
  removeOrbLabel(orb.label);
  scene.remove(orb.group);
  numberOrbs.splice(idx, 1);

  // Generate new equation
  generateEquation();
  document.getElementById('equationText').textContent = currentEquation;

  // Trigger glitter animation & sound
  playGlitterSound();
  const eqBox = document.getElementById('equationBox');
  eqBox.classList.remove('glitter');
  void eqBox.offsetWidth; // Force reflow
  eqBox.classList.add('glitter');
}

/**
 * Handle Wrong Answer
 * End game or apply shield power-up
 */
function handleWrong(orb) {
  if (!gameActive) return;
  
  // Reset combo on wrong answer
  resetCombo();
  
  // Check if shield is active
  if (shieldActive) {
    const shieldIdx = activePowerups.findIndex(p => p.type === 'shield');
    if (shieldIdx > -1) {
      activePowerups.splice(shieldIdx, 1);
      deactivatePowerup('shield');
      // Show shield used feedback
      showComboFlash('🛡️ SAVED!');
      burst(orb.group.position.clone());
      playWrongSound();
      
      // Remove this orb but continue game
      removeOrbLabel(orb.label);
      scene.remove(orb.group);
      numberOrbs.splice(numberOrbs.indexOf(orb), 1);
      return;
    }
  }
  
  // Game over
  gameActive = false;
  
  // Play wrong sound
  playWrongSound();
  
  // Red flash on wrong orb
  orb.sphere.material.color.setHex(0xff2222);
  orb.sphere.material.emissive.setHex(0xff2222);
  
  // Feedback
  burst(orb.group.position.clone(), true);
  showComboFlash('✗ WRONG!');

  // Check if new high score
  const isNewHighScore = saveHighScore(score);
  
  // Show game over after delay
  setTimeout(() => {
    document.getElementById('finalScore').textContent = score;
    if (isNewHighScore) {
      document.getElementById('highScoreMessage').textContent = 'NEW HIGH SCORE!';
      document.getElementById('highScoreMessage').style.color = '#fbbf24';
    } else {
      document.getElementById('highScoreMessage').textContent = `Best: ${highScore}`;
    }
    document.getElementById('gameOverModal').style.display = 'flex';
    stopBackgroundMusic();
  }, 900);
}

/**
 * Setup Controls
 * Convert mouse/touch input to bug target position
 */
function setupControls() {
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const mVec = new THREE.Vector2();

  /**
   * Update Target Point
   * Uses raycasting to find where player clicked on ground
   */
  function updateTarget(cx, cy, isTouchInput = false) {
    let adjX = cx, adjY = cy;

    // Apply touch sensitivity damping
    if (isTouchInput && IS_MOBILE) {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const offsetX = (cx - centerX) * TOUCH_SENSITIVITY;
      const offsetY = (cy - centerY) * TOUCH_SENSITIVITY;
      adjX = centerX + offsetX;
      adjY = centerY + offsetY;
    }

    // Normalize screen coordinates to NDC (Normalized Device Coordinates)
    mVec.x = (adjX / window.innerWidth) * 2 - 1;
    mVec.y = (adjY / window.innerHeight) * -2 + 1;

    // Raycast from camera through screen position to ground plane
    raycaster.setFromCamera(mVec, camera);
    raycaster.ray.intersectPlane(groundPlane, targetPoint);
  }

  // Mouse movement
  window.addEventListener('mousemove', e => {
    if (gameActive) updateTarget(e.clientX, e.clientY, false);
  });

  // Touch movement
  window.addEventListener('touchmove', e => {
    e.preventDefault();
    if (gameActive) updateTarget(e.touches[0].clientX, e.touches[0].clientY, true);
  }, { passive: false });

  // Touch start
  window.addEventListener('touchstart', e => {
    if (gameActive) updateTarget(e.touches[0].clientX, e.touches[0].clientY, true);
  }, { passive: true });
}

function initGame() {
  score = 0;
  gameActive = true;
  gamePaused = false;
  comboStreak = 0;
  activePowerups = [];
  shieldActive = false;
  slowTimeActive = false;
  doublePointsActive = false;
  powerupMultiplier = 1;
  gameStartTime = Date.now();
  timeLeft = gameMode === 'timeAttack' ? 60 : Infinity;
  
  if (timerMesh) {//reset timer
    scene.remove(timerMesh);
    timerMesh = null;
  }
  
  document.getElementById('scoreDisplay').textContent = '0';
  document.getElementById('comboDisplay').textContent = '';
  document.getElementById('gameOverModal').style.display = 'none';
  document.getElementById('pauseModal').style.display = 'none';
  document.getElementById('quitModal').style.display = 'none';

  segmentPositions.length = 0;//bug position
  segmentPositions.push({ x: 0, z: 0 });
  for (let i = 0; i < SEG_COUNT; i++) {
    segmentPositions.push({ x: -(i + 1) * SEG_SPACING, z: 0 });
  }

  targetPoint.set(0, 0, 0);
  camera.position.set(0, 20, 11);

  generateEquation();
  document.getElementById('equationText').textContent = currentEquation;//equation generation
  const eqBox = document.getElementById('equationBox');//glitter effect
  eqBox.classList.remove('glitter');
  void eqBox.offsetWidth;
  eqBox.classList.add('glitter');

  initializeOrbSpawning();//spawn orbs
}


function onResize() {//camera aspect & render size(window resize)
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function gameLoop() {
  requestAnimationFrame(gameLoop);
  const dt = clock.getDelta();     // Delta time since last frame
  const now = clock.getElapsedTime(); // Total elapsed time

  // Update game state
  if (gameActive && !gamePaused) {
    // Time attack mode countdown
    if (gameMode === 'timeAttack') {
      timeLeft = Math.max(0, 60 - Math.floor((Date.now() - gameStartTime) / 1000));
      
      if (!timerMesh) {
        createTimer3D();
      }
      
      updateTimer3D();
      
      if (timeLeft <= 0) {
        gameActive = false;
        if (timerMesh) scene.remove(timerMesh);
        timerMesh = null;
        setTimeout(() => {
          document.getElementById('finalScore').textContent = score;
          document.getElementById('highScoreMessage').textContent = `Best: ${highScore}`;
          document.getElementById('gameOverModal').style.display = 'flex';
          stopBackgroundMusic();
        }, 500);
      }
    }
    
    updateBug();
    updateCamera();
    checkCollisions();
    updatePowerups(); // Update active power-ups
  } else if (!gameActive) {
    updateCamera(); // Still follow camera on game over screen
  }

  updateWorld();
  updateOrbs(now);
  updateParticles(dt);
  syncOrbLabels();

  renderer.render(scene, camera);
}

function setupUI() {
  document.getElementById('playBtn').addEventListener('click', () => {//start screen
    playClickSound();
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameModeModal').style.display = 'flex';
  });

  document.getElementById('howToPlayBtn').addEventListener('click', () => {
    playClickSound();
    document.getElementById('instructionsModal').style.display = 'flex';
  });

  document.getElementById('closeInstructions').addEventListener('click', () => {
    playClickSound();
    document.getElementById('instructionsModal').style.display = 'none';
  });

  document.getElementById('instructionsModal').addEventListener('click', e => {
    if (e.target === document.getElementById('instructionsModal')) {
      playClickSound();
      document.getElementById('instructionsModal').style.display = 'none';
    }
  });

  document.getElementById('normalModeBtn').addEventListener('click', () => {//mode selector
    selectGameMode('normal');
  });
  document.getElementById('timeAttackBtn').addEventListener('click', () => {
    selectGameMode('timeAttack');
  });
  document.getElementById('survivalBtn').addEventListener('click', () => {
    selectGameMode('survival');
  });

  document.getElementById('settingsBtn').addEventListener('click', () => {
    playClickSound();
    settingsOpen = true;
    document.getElementById('settingsModal').style.display = 'flex';
  });

  document.getElementById('closeSettingsBtn').addEventListener('click', () => {
    playClickSound();
    settingsOpen = false;
    document.getElementById('settingsModal').style.display = 'none';
    saveGameSettings();
  });

  document.getElementById('closeSettings').addEventListener('click', () => {
    playClickSound();
    settingsOpen = false;
    document.getElementById('settingsModal').style.display = 'none';
    saveGameSettings();
  });

  document.getElementById('settingsModal').addEventListener('click', e => {
    if (e.target === document.getElementById('settingsModal')) {
      playClickSound();
      settingsOpen = false;
      document.getElementById('settingsModal').style.display = 'none';
      saveGameSettings();
    }
  });

  document.getElementById('sfxVolume').addEventListener('change', e => {//settings control
    soundEnabled = e.target.value > 0;
  });

  document.getElementById('musicVolume').addEventListener('change', e => {
    musicEnabled = e.target.value > 0;
    if (musicEnabled) startBackgroundMusic();
    else stopBackgroundMusic();
  });

  document.getElementById('difficultySelect').addEventListener('change', e => {
    difficulty = e.target.value;
    saveGameSettings();
  });

  document.getElementById('resetScoreBtn').addEventListener('click', resetHighScore);

  document.getElementById('playAgainBtn').addEventListener('click', () => {//game over
    playClickSound();
    document.getElementById('gameOverModal').style.display = 'none';
    document.getElementById('gameModeModal').style.display = 'flex';
  });

  document.getElementById('mainMenuBtn').addEventListener('click', () => {
    playClickSound();
    gameActive = false;
    numberOrbs.forEach(o => { scene.remove(o.group); removeOrbLabel(o.label); });
    numberOrbs = [];
    document.getElementById('gameOverModal').style.display = 'none';
    document.getElementById('hud').style.display = 'none';
    document.getElementById('startScreen').style.display = 'flex';
    stopBackgroundMusic();
  });

  document.getElementById('pauseBtn').addEventListener('click', () => {//pause
    if (gameActive) {
      playClickSound();
      gamePaused = true;
      document.getElementById('pauseModal').style.display = 'flex';
    }
  });

  document.getElementById('resumeBtn').addEventListener('click', () => {
    playClickSound();
    gamePaused = false;
    document.getElementById('pauseModal').style.display = 'none';
  });

  document.getElementById('pauseMenuBtn').addEventListener('click', () => {
    playClickSound();
    gameActive = false;
    gamePaused = false;
    numberOrbs.forEach(o => { scene.remove(o.group); removeOrbLabel(o.label); });
    numberOrbs = [];
    document.getElementById('pauseModal').style.display = 'none';
    document.getElementById('hud').style.display = 'none';
    document.getElementById('startScreen').style.display = 'flex';
    stopBackgroundMusic();
  });

  document.getElementById('exitBtn').addEventListener('click', () => {//quit/exit
    if (gameActive) {
      playClickSound();
      document.getElementById('quitModal').style.display = 'flex';
    }
  });

  document.getElementById('quitConfirmBtn').addEventListener('click', () => {
    playClickSound();
    gameActive = false;
    gamePaused = false;
    numberOrbs.forEach(o => { scene.remove(o.group); removeOrbLabel(o.label); });
    numberOrbs = [];
    document.getElementById('quitModal').style.display = 'none';
    document.getElementById('hud').style.display = 'none';
    document.getElementById('startScreen').style.display = 'flex';
    stopBackgroundMusic();
  });

  document.getElementById('quitCancelBtn').addEventListener('click', () => {
    playClickSound();
    document.getElementById('quitModal').style.display = 'none';
    if (gamePaused) {
      document.getElementById('pauseModal').style.display = 'flex';
    }
  });

  document.getElementById('soundToggleBtn').addEventListener('click', toggleSound);//sound t
}

function selectGameMode(mode) {
  gameMode = mode;
  document.getElementById('gameModeModal').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  
  // Set time attack timer if needed
  if (mode === 'timeAttack') {
    timeLeft = 60;
  }
  
  initGame();
}
function boot() {
  initThree();              // 1. Setup 3D scene
  setupLighting();          // 2. Add lights
  buildWorld();             // 3. Create grass & decorations
  createBug();              // 4. Create player character
  setupControls();          // 5. Enable input
  setupAudio();             // 6. Initialize Web Audio
  setupUI();                // 7. Bind UI buttons
  gameLoop();               // 8. Start rendering
}

boot();
