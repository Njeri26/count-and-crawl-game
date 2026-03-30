/**
 * Architecture:
 * - Three.js for 3D rendering
 * - Raycasting for mouse/touch input
 * - Physics: body chain IK, momentum
 * - Grid-based orb spawning system
 * - Collision detection with sweep
 * 
 * Flow:
 * boot() → initThree() → setupLighting() → buildWorld() →
 * createBug() → setupControls() → setupUI() → gameLoop()
 */
const TILE_SIZE = 26;           // Size of one grass tile (26×26 units)
const TILE_COUNT = 9;           // Create 9×9 grid = 81 tiles (infinite look)
const SEG_COUNT = 11;           // Number of body segments on bug (head + 11 segments)
const SEG_SPACING = 0.95;       // Distance between segments (creates snake-like body)

/**
 * Gameplay Constants
 */
const BUG_SPEED = 0.20;         // Max movement speed per frame (0-1 scale)
const ORB_COUNT = 8;            // Number of orbs to spawn per grid cell
const MIN_NUM = 1;              // Minimum number in equation (1 + 1)
const MAX_NUM = 15;             // Maximum number (15 + 15 = up to 30)

/**
 * Mobile & Input Configuration
 */
const TOUCH_SENSITIVITY = 0.65; // Touch damping: 0=immobile, 1=same as mouse
const CAMERA_FOLLOW_SPEED = 0.035; // Camera smoothing: higher=faster follow
const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

/**
 * Orb Spawning Configuration
 * Continuous spawning as player moves
 */
const ORB_SPAWN_GRID = 50;      // Grid cell size (spawns new orbs every 50 units)

/**
 * Orb Colors (3D representation)
 * These are Hex color codes used for 3D spheres
 */
const ORB_COLORS = [
  0xff6b6b, // Red
  0xffd93d, // Yellow
  0x6bcb77, // Green
  0x4d96ff, // Blue
  0xff922b, // Orange
  0xda77f2, // Purple
  0x4ec9b0, // Teal
  0xff85a1  // Pink
];


// Three.js Objects
let scene, camera, renderer, raycaster;

// Player (Bug) Objects
let headGroup;                      // Main bug head mesh group
let bodySegments = [];              // Array of body segment mesh groups
let segmentPositions = [];          // Array of {x, z} positions for IK chain

// World Objects
let groundTiles = [];               // Array of grass tile meshes
let decoGroups = [];                // Array of decoration groups (flowers, rocks, etc)

// Collectible Orbs
let numberOrbs = [];                // Array of {group, ring, sphere, label, val, isCorrect, ...}

// Game State
let currentEquation = { num1: 0, num2: 0, answer: 0 };
let score = 0;                      // Current score (increments by 10 per correct orb)
let gameActive = false;             // Is gameplay running?
let gamePaused = false;             // Is game paused by player?
let targetPoint = new THREE.Vector3(0, 0, 0); // Where bug is moving to (mouse/touch)

// Rendering & Time
let clock;                          // THREE.Clock for delta time
const particles = [];               // Array of particles {msh, vel, life}
let sunLight;                       // Main directional light (follows camera)

// Orb Spawning Grid
let lastOrbSpawnX = 0;              // Last grid cell X we spawned
let lastOrbSpawnZ = 0;              // Last grid cell Z we spawned

/**
 * Initialize Three.js Scene
 * Creates main scene, perspective camera, WebGL renderer
 */
function initThree() {
  // Create scene with fog for depth perception
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x56ccf2, 60, 140); // Blues, 60-140 unit range

  // Create perspective camera (matches portrait phone layout)
  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 500);
  camera.position.set(0, 20, 12); // High angle, looking down at bug
  camera.lookAt(0, 0, -1);         // Look slightly ahead

  // Create WebGL renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit to 2x for mobile
  
  // Enable shadows for dynamic lighting
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows

  // Create canvas ID and insert into DOM
  renderer.domElement.id = 'threeCanvas';
  document.body.insertBefore(renderer.domElement, document.body.firstChild);

  // Setup raycaster for mouse/touch input
  raycaster = new THREE.Raycaster();
  clock = new THREE.Clock();

  // Listen for window resize
  window.addEventListener('resize', onResize);
}
/**
 * Setup Lighting
 * Multiple light sources create realistic 3D appearance
 */
function setupLighting() {
  // Ambient light: uniform light from all directions
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));

  // Hemisphere light: sky blue above, green grass light below
  const hemi = new THREE.HemisphereLight(0x87ceeb, 0x4ade80, 0.7);
  scene.add(hemi);

  // Directional light: sun-like light casting shadows
  sunLight = new THREE.DirectionalLight(0xfff5e0, 1.4);
  sunLight.position.set(12, 24, 8);
  sunLight.castShadow = true;
  
  // Shadow camera setup (orthographic projection for shadows)
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 120;
  sunLight.shadow.camera.left = -40;
  sunLight.shadow.camera.right = 40;
  sunLight.shadow.camera.top = 40;
  sunLight.shadow.camera.bottom = -40;
  sunLight.shadow.mapSize.set(2048, 2048); // High-res shadows

  scene.add(sunLight);
}
/**
 * Available grass tile colors (6 variations)
 * Mix of green shades for visual variety
 */
const tileColors = [0x2d7a1f, 0x347a24, 0x2a5e1c, 0x3a8229, 0x306820, 0x278024];

/**
 * Build World: Create 9×9 grid of grass tiles
 * Tiles repeat/recycle based on player position
 */
function buildWorld() {
  for (let tx = 0; tx < TILE_COUNT; tx++) {
    for (let tz = 0; tz < TILE_COUNT; tz++) {
      // Create plane geometry for tile
      const geo = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
      
      // Random color material
      const mat = new THREE.MeshLambertMaterial({
        color: tileColors[Math.floor(Math.random() * tileColors.length)]
      });
      
      // Create mesh
      const tile = new THREE.Mesh(geo, mat);
      tile.rotation.x = -Math.PI / 2; // Rotate 90° to face up
      
      // Position in grid (centered around 0,0)
      tile.position.set(
        (tx - Math.floor(TILE_COUNT / 2)) * TILE_SIZE,
        0,
        (tz - Math.floor(TILE_COUNT / 2)) * TILE_SIZE
      );
      
      // Enable shadow receiving
      tile.receiveShadow = true;
      scene.add(tile);
      groundTiles.push(tile);

      // Create decoration group for this tile
      const dg = new THREE.Group();
      dg.position.copy(tile.position);
      addTileDecos(dg, TILE_SIZE);
      scene.add(dg);
      decoGroups.push(dg);
    }
  }
}

/**
 * Add Decorations to Tile
 * Randomly place flowers, mushrooms, rocks, and bushes
 */
function addTileDecos(group, size) {
  const count = 4 + Math.floor(Math.random() * 5); // 4-8 decorations per tile
  
  for (let i = 0; i < count; i++) {
    // Random position within tile
    const px = (Math.random() - 0.5) * (size - 4);
    const pz = (Math.random() - 0.5) * (size - 4);
    
    // Random decoration type (weighted probabilities)
    const t = Math.random();
    let d;
    if      (t < 0.38) d = makeFlower();      // 38% flowers
    else if (t < 0.60) d = makeMushroom();    // 22% mushrooms
    else if (t < 0.80) d = makeRock();        // 20% rocks
    else               d = makeBush();        // 20% bushes
    
    // Add decoration to group
    if (d) {
      d.position.set(px, 0, pz);
      group.add(d);
    }
  }
}

/**
 * Create Flower Decoration
 * Green stem with colored petals
 */
function makeFlower() {
  const g = new THREE.Group();
  
  // Stem
  const stemM = new THREE.MeshLambertMaterial({ color: 0x16a34a });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.75, 6), stemM);
  stem.position.y = 0.37;
  g.add(stem);
  
  // Head (petals)
  const petalColors = [0xff6b6b, 0xffd93d, 0xda77f2, 0xff85a1, 0xf97316, 0x38bdf8];
  const hm = new THREE.MeshLambertMaterial({
    color: petalColors[Math.floor(Math.random() * petalColors.length)]
  });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), hm);
  head.position.y = 0.82;
  g.add(head);
  
  // Center
  const cm = new THREE.MeshLambertMaterial({ color: 0xfef3c7 });
  const cn = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), cm);
  cn.position.y = 0.88;
  g.add(cn);
  
  return g;
}
/**
 * Create Mushroom Decoration
 * White stem with colored cap
 */
function makeMushroom() {
  const g = new THREE.Group();
  
  // Stem
  const stemM = new THREE.MeshLambertMaterial({ color: 0xfefce8 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.48, 8), stemM);
  stem.position.y = 0.24;
  g.add(stem);
  
  // Cap (half-sphere)
  const capC = [0xef4444, 0xf97316, 0xa855f7, 0xec4899];
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

/**
 * Create Rock Decoration
 * Simple dodecahedron with random rotation
 */
function makeRock() {
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

/**
 * Create Bush Decoration
 * Three overlapping spheres for bush shape
 */
function makeBush() {
  const g = new THREE.Group();
  const m = new THREE.MeshLambertMaterial({ color: 0x15803d });
  
  // Three spheres in triangular pattern
  [[0,0.28,0,0.33],[0.28,0.2,0.08,0.24],[-0.22,0.2,0.06,0.26]].forEach(([x,y,z,r]) => {
    const sp = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8), m);
    sp.position.set(x, y, z);
    g.add(sp);
  });
  return g;
}

/**
 * Create Bug Character
 * Detailed green bug with eyes, antennae, body segments, and legs
 */
function createBug() {
  headGroup = new THREE.Group();
  scene.add(headGroup);

  // Scale bug smaller on mobile for better visibility
  const headScale = IS_MOBILE ? 0.75 : 1;

  // --- HEAD ---
  const hMat = new THREE.MeshPhongMaterial({
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

  // --- CHEEK BLUSH ---
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

  // --- EYES ---
  const eyeM = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 140 });
  const pupM = new THREE.MeshPhongMaterial({ color: 0x0f172a });
  const irisM = new THREE.MeshPhongMaterial({ color: 0x22d3ee, shininess: 80 });
  const hiM = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // Left and right eyes
  [-0.32, 0.32].forEach((ex, si) => {
    // Eye white
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 14), eyeM);
    eye.position.set(ex, 0.72, 0.52);
    headGroup.add(eye);

    // Iris (colored part)
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), irisM);
    iris.position.set(ex * 1.05, 0.73, 0.63);
    headGroup.add(iris);

    // Pupil (black dot)
    const pup = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), pupM);
    pup.position.set(ex * 1.08, 0.74, 0.68);
    headGroup.add(pup);

    // Highlight (shine)
    const hi = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), hiM);
    hi.position.set(ex * 1.1 + 0.04, 0.775, 0.72);
    headGroup.add(hi);
  });

  // --- SMILE ---
  const smilM = new THREE.MeshPhongMaterial({ color: 0x166534 });
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

  // --- ANTENNAE ---
  const antM = new THREE.MeshPhongMaterial({ color: 0x166534 });
  const tipM = new THREE.MeshPhongMaterial({
    color: 0xfbbf24,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.4
  });
  
  [[-0.28, 0.4], [0.28, -0.4]].forEach(([ax, rz]) => {
    // Base
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.65, 8),
      antM
    );
    base.position.set(ax, 1.12, 0.28);
    base.rotation.z = rz;
    headGroup.add(base);
    
    // Tip (glowing)
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), tipM);
    tip.position.set(ax + ax * 0.5, 1.47, 0.28);
    headGroup.add(tip);
  });

  // --- BODY SEGMENTS ---
  bodySegments = [];
  segmentPositions = [{ x: 0, z: 0 }]; // Head position

  const segCols = [0x4ade80, 0x22c55e]; // Alternating greens
  const stripM = new THREE.MeshPhongMaterial({ color: 0x15803d, shininess: 40 });

  // Create body segments in chain
  for (let i = 0; i < SEG_COUNT; i++) {
    const t = i / SEG_COUNT;
    const sr = 0.65 - t * 0.2; // Taper toward tail
    const sg = new THREE.Group();

    // Segment sphere
    const sM = new THREE.MeshPhongMaterial({
      color: segCols[i % 2],
      shininess: 65,
      specular: 0x55ff55
    });
    const sp = new THREE.Mesh(new THREE.SphereGeometry(sr, 14, 14), sM);
    sp.position.y = sr * 0.72;
    sp.castShadow = true;
    sg.add(sp);

    // Stripe ring around segment
    const strp = new THREE.Mesh(
      new THREE.TorusGeometry(sr * 0.88, 0.055, 6, 18, Math.PI),
      stripM
    );
    strp.position.y = sr * 0.72;
    strp.rotation.x = Math.PI / 2;
    sg.add(strp);

    // Legs on every other segment
    if (i % 2 === 0) {
      const legM = new THREE.MeshPhongMaterial({ color: 0x166534 });
      
      // Left and right legs
      [-1, 1].forEach(side => {
        // Leg cylinder
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.045, 0.035, 0.52, 6),
          legM
        );
        leg.position.set(side * (sr + 0.18), sr * 0.32, 0);
        leg.rotation.z = side * 0.72;
        sg.add(leg);
        
        // Foot
        const foot = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 6), legM);
        foot.position.set(side * (sr + 0.4), 0.06, 0);
        sg.add(foot);
      });
    }

    // Position segment in chain (behind head)
    sg.position.set(-(i + 1) * SEG_SPACING, 0, 0);
    scene.add(sg);
    bodySegments.push(sg);
    segmentPositions.push({ x: -(i + 1) * SEG_SPACING, z: 0 });
  }
}
/**
 * Orb CSS Colors (HTML labels)
 * Matches 3D ORB_COLORS array
 */
const ORB_CSS_COLORS = [
  '#ff6b6b','#ffd93d','#6bcb77','#4d96ff',
  '#ff922b','#da77f2','#4ec9b0','#ff85a1'
];

/**
 * Create Orb HTML Label
 * Creates a div element that showcases the orb number
 * Positioned via JavaScript to follow 3D orb in world space
 */
function createOrbLabel(value, cssColor) {
  const div = document.createElement('div');
  div.className = 'orb-label';
  div.textContent = value;
  div.style.background = cssColor;
  div.style.boxShadow = `0 0 18px 6px ${cssColor}88, inset 0 1px 0 rgba(255,255,255,0.5)`;
  document.body.appendChild(div);
  return div;
}

/**
 * Remove Orb Label
 * Removes HTML div with fade-out animation
 */
function removeOrbLabel(label) {
  if (!label) return;
  label.classList.add('dying'); // Trigger CSS animation
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
    o.label.style.opacity = s.behind ? '0' : '1'; // Hide if behind camera
  });
}

/**
 * Spawn Orbs in Grid Cell
 * Creates ORB_COUNT orbs at a specific grid cell position
 * 40% are correct answers, 60% are wrong
 */
function spawnOrbsAtGridCell(gridX, gridZ) {
  if (!gameActive) return;

  const eq = currentEquation;
  const cellBaseX = gridX * ORB_SPAWN_GRID;
  const cellBaseZ = gridZ * ORB_SPAWN_GRID;

  // Spawn ORB_COUNT orbs in this cell
  for (let i = 0; i < ORB_COUNT; i++) {
    let val;
    
    // 40% chance of correct answer
    const isCorrect = Math.random() < 0.4;

    if (isCorrect) {
      val = eq.answer;
    } else {
      // Generate unique wrong number
      val = eq.answer + Math.floor(Math.random() * 13) - 6;
      while (val === eq.answer || val < 1 || val > 50) {
        val = eq.answer + Math.floor(Math.random() * 13) - 6;
      }
    }

    // Random position within grid cell
    const spreadX = cellBaseX + (Math.random() - 0.5) * ORB_SPAWN_GRID;
    const spreadZ = cellBaseZ + (Math.random() - 0.5) * ORB_SPAWN_GRID;

    const col3 = ORB_COLORS[i % ORB_COLORS.length];
    const colCSS = ORB_CSS_COLORS[i % ORB_CSS_COLORS.length];

    const og = new THREE.Group();

    // Glow halo (semi-transparent sphere)
    const haloM = new THREE.MeshBasicMaterial({
      color: col3,
      transparent: true,
      opacity: 0.20,
      side: THREE.BackSide
    });
    og.add(new THREE.Mesh(new THREE.SphereGeometry(1.38, 14, 14), haloM));

    // Main sphere (emissive for glow)
    const sM = new THREE.MeshPhongMaterial({
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

    // Equator ring (rotating detail)
    const rM = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      emissive: col3,
      emissiveIntensity: 0.55
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.09, 8, 28), rM);
    ring.rotation.x = Math.PI / 2;
    og.add(ring);

    og.position.set(spreadX, 1.3, spreadZ);
    scene.add(og);

    // Create HTML label
    const label = createOrbLabel(val, colCSS);

    // Store orb data
    numberOrbs.push({
      group: og,
      ring: ring,
      sphere: sphere,
      label: label,
      val: val,
      baseY: 1.3,
      phase: Math.random() * Math.PI * 2, // For bobbing animation
      vx: (Math.random() - 0.5) * 0.025,  // Horizontal drift
      vz: (Math.random() - 0.5) * 0.025,
      isCorrect: isCorrect
    });
  }
}

/**
 * Initialize Orb Spawning
 * Setup initial spawn grid around player
 */
function initializeOrbSpawning() {
  // Clear old orbs
  numberOrbs.forEach(o => {
    scene.remove(o.group);
    removeOrbLabel(o.label);
  });
  numberOrbs = [];
  lastOrbSpawnX = 0;
  lastOrbSpawnZ = 0;

  // Spawn 3×3 grid of cells around player
  for (let gx = -1; gx <= 1; gx++) {
    for (let gz = -1; gz <= 1; gz++) {
      spawnOrbsAtGridCell(gx, gz);
    }
  }
}
/**
 * Create Particle Burst
 * Spawns 20 small spheres that fly outward
 */
function burst(pos, wrong = false) {
  for (let i = 0; i < 20; i++) {
    // Color: red for wrong, random for correct
    const col = wrong ? 0xff3333 : ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)];
    
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
        0.18 + Math.random() * 0.22, // Upward bias
        Math.sin(angle) * spd
      ),
      life: 1.0
    });
  }
}

/**
 * Update Particles
 * Apply gravity, update position, fade out
 */
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
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
      if (o.val === currentEquation.answer) {
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
  // Award points
  score += 10;
  document.getElementById('scoreDisplay').textContent = score;
  
  // Show feedback
  showComboFlash('✓ +10');
  burst(orb.group.position.clone());
  
  // Remove orb
  removeOrbLabel(orb.label);
  scene.remove(orb.group);
  numberOrbs.splice(idx, 1);

  // Generate new equation
  currentEquation = generateEquation();
  document.getElementById('equationText').textContent =
    currentEquation.num1 + ' + ' + currentEquation.num2 + ' = ?';

  // Trigger glitter animation
  const eqBox = document.getElementById('equationBox');
  eqBox.classList.remove('glitter');
  void eqBox.offsetWidth; // Force reflow
  eqBox.classList.add('glitter');
}

/**
 * Handle Wrong Answer
 * End game, show final screen
 */
function handleWrong(orb) {
  if (!gameActive) return;
  
  gameActive = false;
  
  // Red flash on wrong orb
  orb.sphere.material.color.setHex(0xff2222);
  orb.sphere.material.emissive.setHex(0xff2222);
  
  // Feedback
  burst(orb.group.position.clone(), true);
  showComboFlash('✗ WRONG!');

  // Show game over after delay
  setTimeout(() => {
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOverModal').style.display = 'flex';
  }, 900);
}

/**
 * Generate Random Equation
 * Creates addition: n1 + n2 = ?
 */
function generateEquation() {
  const n1 = Math.floor(Math.random() * MAX_NUM) + MIN_NUM;
  const n2 = Math.floor(Math.random() * MAX_NUM) + MIN_NUM;
  return { num1: n1, num2: n2, answer: n1 + n2 };
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

/* ========================================
   SECTION 13: GAME INITIALIZATION & LOOP
   Init game, main render loop
   ======================================== */

/**
 * Initialize Game
 * Reset state, spawn first equation/orbs, start gameplay
 */
function initGame() {
  score = 0;
  gameActive = true;
  gamePaused = false;
  document.getElementById('scoreDisplay').textContent = '0';
  document.getElementById('gameOverModal').style.display = 'none';
  document.getElementById('pauseModal').style.display = 'none';
  document.getElementById('quitModal').style.display = 'none';

  // Reset bug position
  segmentPositions.length = 0;
  segmentPositions.push({ x: 0, z: 0 });
  for (let i = 0; i < SEG_COUNT; i++) {
    segmentPositions.push({ x: -(i + 1) * SEG_SPACING, z: 0 });
  }

  targetPoint.set(0, 0, 0);
  camera.position.set(0, 20, 11);

  // Generate first equation
  currentEquation = generateEquation();
  document.getElementById('equationText').textContent =
    currentEquation.num1 + ' + ' + currentEquation.num2 + ' = ?';

  // Trigger glitter on first equation
  const eqBox = document.getElementById('equationBox');
  eqBox.classList.remove('glitter');
  void eqBox.offsetWidth;
  eqBox.classList.add('glitter');

  // Spawn orbs
  initializeOrbSpawning();
}

/**
 * Handle Window Resize
 * Update camera aspect and renderer size
 */
function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

/**
 * Main Game Loop
 * Called 60fps via requestAnimationFrame
 * Updates all game logic and renders to screen
 */
function gameLoop() {
  requestAnimationFrame(gameLoop);
  const dt = clock.getDelta();     // Delta time since last frame
  const now = clock.getElapsedTime(); // Total elapsed time

  // Update game state
  if (gameActive && !gamePaused) {
    updateBug();
    updateCamera();
    checkCollisions();
  } else if (!gameActive) {
    updateCamera(); // Still follow camera on game over screen
  }

  // Update world and effects
  updateWorld();
  updateOrbs(now);
  updateParticles(dt);
  syncOrbLabels();

  // Render
  renderer.render(scene, camera);
}
/**
 * Setup UI
 * Bind click events to buttons and modals
 */
function setupUI() {
  // --- START SCREEN ---
  document.getElementById('playBtn').addEventListener('click', () => {
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
    initGame();
  });

  document.getElementById('howToPlayBtn').addEventListener('click', () => {
    document.getElementById('instructionsModal').style.display = 'flex';
  });

  document.getElementById('closeInstructions').addEventListener('click', () => {
    document.getElementById('instructionsModal').style.display = 'none';
  });

  document.getElementById('instructionsModal').addEventListener('click', e => {
    if (e.target === document.getElementById('instructionsModal'))
      document.getElementById('instructionsModal').style.display = 'none';
  });

  // --- GAME OVER ---
  document.getElementById('playAgainBtn').addEventListener('click', () => {
    initGame();
  });

  document.getElementById('mainMenuBtn').addEventListener('click', () => {
    gameActive = false;
    numberOrbs.forEach(o => { scene.remove(o.group); removeOrbLabel(o.label); });
    numberOrbs = [];
    document.getElementById('gameOverModal').style.display = 'none';
    document.getElementById('hud').style.display = 'none';
    document.getElementById('startScreen').style.display = 'flex';
  });

  // --- PAUSE ---
  document.getElementById('pauseBtn').addEventListener('click', () => {
    if (gameActive) {
      gamePaused = true;
      document.getElementById('pauseModal').style.display = 'flex';
    }
  });

  document.getElementById('resumeBtn').addEventListener('click', () => {
    gamePaused = false;
    document.getElementById('pauseModal').style.display = 'none';
  });

  document.getElementById('pauseMenuBtn').addEventListener('click', () => {
    gameActive = false;
    gamePaused = false;
    numberOrbs.forEach(o => { scene.remove(o.group); removeOrbLabel(o.label); });
    numberOrbs = [];
    document.getElementById('pauseModal').style.display = 'none';
    document.getElementById('hud').style.display = 'none';
    document.getElementById('startScreen').style.display = 'flex';
  });

  // --- QUIT ---
  document.getElementById('exitBtn').addEventListener('click', () => {
    if (gameActive) {
      document.getElementById('quitModal').style.display = 'flex';
    }
  });

  document.getElementById('quitConfirmBtn').addEventListener('click', () => {
    gameActive = false;
    gamePaused = false;
    numberOrbs.forEach(o => { scene.remove(o.group); removeOrbLabel(o.label); });
    numberOrbs = [];
    document.getElementById('quitModal').style.display = 'none';
    document.getElementById('hud').style.display = 'none';
    document.getElementById('startScreen').style.display = 'flex';
  });

  document.getElementById('quitCancelBtn').addEventListener('click', () => {
    document.getElementById('quitModal').style.display = 'none';
    if (gamePaused) {
      document.getElementById('pauseModal').style.display = 'flex';
    }
  });
}
function boot() {
  initThree();              // 1. Setup 3D scene
  setupLighting();          // 2. Add lights
  buildWorld();             // 3. Create grass & decorations
  createBug();              // 4. Create player character
  setupControls();          // 5. Enable input
  setupUI();                // 6. Bind UI buttons
  gameLoop();               // 7. Start rendering
}

boot();
