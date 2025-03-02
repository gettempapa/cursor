import * as THREE from 'https://cdn.skypack.dev/three@0.137.0';

// Scene setup
let camera, scene, renderer;
let player;
let playerBody; // Separate body and aim control
let playerAimHelper; // Helper for aiming direction
let ground;
const bullets = [];
let lastShootTime = 0;
const shootCooldown = 250; // milliseconds between shots
const trees = []; // Array to store tree objects

// Movement variables
const keys = {};
const velocity = new THREE.Vector3();
const moveDirection = new THREE.Vector3();
const direction = new THREE.Vector3(); // Add missing direction vector that was removed
const friction = 0.85; // Higher friction for more predictable stopping

// Movement parameters
const MAX_SPEED = 0.2; // Maximum movement speed
const ACCELERATION = 0.01; // Lower acceleration for smoother control
const DECELERATION = 0.95; // How quickly the player slows down

// Physics parameters
const GRAVITY = 0.015;
const JUMP_FORCE = 0.3;
let isOnGround = true;

// Player forward direction (movement direction)
const playerDirection = new THREE.Vector3(0, 0, -1);
// Aim direction (can be different from movement)
const aimDirection = new THREE.Vector3(0, 0, -1);

// Camera controls
const cameraOffset = new THREE.Vector3(0, 2, 5); // Position behind and above player
let mouseX = 0;
let mouseY = 0; // Vertical aim control
const aimSensitivity = 0.002; // How sensitive the aiming is
const maxVerticalRotation = Math.PI / 3; // Limit up/down rotation
let isPointerLocked = false;

// Debug information for tracking script loading
console.log('Script loaded:', document.currentScript?.src);
console.log('Base URL:', window.location.href);

// Check for WebGL support
function checkWebGL() {
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && 
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch(e) {
        console.error('WebGL check error:', e);
        return false;
    }
}

// Initialize everything
console.log('Starting game initialization');
if (!checkWebGL()) {
    alert('Your browser does not support WebGL, which is required for this game.');
    document.getElementById('instructions').innerHTML += '<p style="color:red">WebGL not supported!</p>';
} else {
    init();
    animate();
}

// Create a simple tree
function createTree(x, z) {
    // Create a tree group to hold all parts
    const tree = new THREE.Group();
    
    // Randomize tree characteristics for variety
    const scale = 2.5 + Math.random() * 1.5; // Tree size (much larger)
    const trunkHeight = 5 * scale;
    const trunkRadius = 0.4 * scale;
    const foliageSize = 3.5 * scale;
    
    // Slight random rotation and tilt for natural look
    const rotation = Math.random() * Math.PI * 2;
    const tiltAmount = Math.random() * 0.05;
    const tiltDirection = Math.random() * Math.PI * 2;
    
    // Tree trunk (cylinder) with better materials
    const trunkGeometry = new THREE.CylinderGeometry(
        trunkRadius * 0.7, // Narrower at top
        trunkRadius,       // Wider at base
        trunkHeight,
        8
    );
    const trunkMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x5D4037   // Rich brown
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2; // Position based on trunk height
    trunk.rotation.x = Math.sin(tiltDirection) * tiltAmount;
    trunk.rotation.z = Math.cos(tiltDirection) * tiltAmount;
    tree.add(trunk);
    
    // Create multiple layers of foliage for a more realistic look
    const foliageLayers = 3 + Math.floor(Math.random() * 2); // 3-4 layers
    const foliageColors = [
        0x2E7D32, // Dark green
        0x388E3C, // Medium green
        0x43A047, // Light green
        0x4CAF50  // Bright green
    ];
    
    for (let i = 0; i < foliageLayers; i++) {
        // Layer size decreases as we go up
        const layerScale = 1 - (i * 0.2);
        const layerHeight = 3.5 * scale * layerScale;
        const layerWidth = foliageSize * layerScale;
        
        // Randomize shape slightly - cone or hemisphere
        let foliageGeometry;
        const shape = Math.random();
        if (shape > 0.7) { // 30% chance of rounded top
            foliageGeometry = new THREE.SphereGeometry(layerWidth, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
        } else { // 70% chance of conical
            foliageGeometry = new THREE.ConeGeometry(layerWidth, layerHeight, 8);
        }
        
        // Choose a color with slight variation
        const colorIndex = Math.floor(Math.random() * foliageColors.length);
        const baseColor = foliageColors[colorIndex];
        // Add slight color variation
        const color = new THREE.Color(baseColor);
        color.r += (Math.random() * 0.1) - 0.05;
        color.g += (Math.random() * 0.1) - 0.05;
        color.b += (Math.random() * 0.1) - 0.05;
        
        const foliageMaterial = new THREE.MeshBasicMaterial({ 
            color: color
        });
        
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        
        // Position each layer
        const layerPosition = trunkHeight * 0.65 + (i * 1.2 * scale);
        foliage.position.y = layerPosition;
        
        // Add slight offset for more natural appearance
        foliage.position.x += (Math.random() - 0.5) * 0.5;
        foliage.position.z += (Math.random() - 0.5) * 0.5;
        
        // Add slight rotation for variety
        foliage.rotation.y = Math.random() * Math.PI;
        
        tree.add(foliage);
    }
    
    // Set position with slight random offset
    const posX = x + (Math.random() - 0.5) * 2;
    const posZ = z + (Math.random() - 0.5) * 2;
    tree.position.set(posX, 0, posZ);
    tree.rotation.y = rotation;
    
    // Add to scene and store in array
    scene.add(tree);
    trees.push(tree);
    
    return tree;
}

// Create a simple humanoid figure
function createHumanoidMesh() {
    const playerGroup = new THREE.Group();
    
    // Create separate group for aiming parts
    playerAimHelper = new THREE.Group();
    playerAimHelper.position.y = 1.2; // Position at shoulder height
    playerGroup.add(playerAimHelper);
    
    // Modern tactical color scheme
    const tacticalColors = {
        black: 0x111111,         // Deep black for tactical gear
        darkGrey: 0x333333,      // Dark grey for some equipment
        oliveGreen: 0x556B2F,    // Modern military olive
        desertTan: 0xC2B280,     // Modern desert camo base
        foliageGreen: 0x4F7942,  // Foliage green for woodland camo
        gunmetal: 0x2C3539,      // Gunmetal for weapons and accessories
        khaki: 0xBDB76B,         // Khaki for some uniform elements
        navy: 0x000080           // Navy for special forces elements
    };
    
    // Create a more detailed face with features instead of a yellow sphere
    // Head with proper skin tone
    const headGeometry = new THREE.SphereGeometry(0.22, 24, 24);
    const headMaterial = new THREE.MeshBasicMaterial({ color: 0xE0BEAC }); // Realistic skin tone
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.5;
    playerGroup.add(head);
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Black eyes
    
    // Left eye
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.07, 1.53, 0.18);
    playerGroup.add(leftEye);
    
    // Right eye
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.07, 1.53, 0.18);
    playerGroup.add(rightEye);
    
    // Modern combat helmet with NVG mount
    const helmetGeometry = new THREE.SphereGeometry(0.27, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const helmetMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.oliveGreen });
    const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
    helmet.position.y = 1.55;
    playerGroup.add(helmet);
    
    // Helmet accessories - NVG mount
    const nvgMountGeometry = new THREE.BoxGeometry(0.1, 0.05, 0.05);
    const nvgMountMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
    const nvgMount = new THREE.Mesh(nvgMountGeometry, nvgMountMaterial);
    nvgMount.position.set(0, 1.65, 0.2);
    playerGroup.add(nvgMount);
    
    // Tactical headset/comms
    const headsetGeometry = new THREE.TorusGeometry(0.25, 0.04, 8, 16, Math.PI);
    const headsetMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
    const headset = new THREE.Mesh(headsetGeometry, headsetMaterial);
    headset.rotation.x = Math.PI / 2;
    headset.position.set(0, 1.5, 0);
    playerGroup.add(headset);
    
    // Mic on headset
    const micGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.1, 8);
    const micMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
    const mic = new THREE.Mesh(micGeometry, micMaterial);
    mic.rotation.x = Math.PI / 4;
    mic.position.set(0.2, 1.45, 0.1);
    playerGroup.add(mic);
    
    // Modern tactical vest rather than simple box
    // Main vest body
    const vestGeometry = new THREE.BoxGeometry(0.54, 0.65, 0.3);
    const vestMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.oliveGreen });
    const vest = new THREE.Mesh(vestGeometry, vestMaterial);
    vest.position.y = 1.0;
    playerGroup.add(vest);
    
    // Add MOLLE pouches to vest
    // Ammo pouches
    const pouchGeometry = new THREE.BoxGeometry(0.12, 0.15, 0.08);
    const pouchMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.oliveGreen });
    
    // Left ammo pouch
    const leftPouch = new THREE.Mesh(pouchGeometry, pouchMaterial);
    leftPouch.position.set(-0.2, 0.95, 0.18);
    playerGroup.add(leftPouch);
    
    // Right ammo pouch
    const rightPouch = new THREE.Mesh(pouchGeometry, pouchMaterial);
    rightPouch.position.set(0.2, 0.95, 0.18);
    playerGroup.add(rightPouch);
    
    // Center admin pouch
    const adminPouchGeometry = new THREE.BoxGeometry(0.2, 0.12, 0.1);
    const adminPouch = new THREE.Mesh(adminPouchGeometry, pouchMaterial);
    adminPouch.position.set(0, 1.1, 0.18);
    playerGroup.add(adminPouch);
    
    // Create left arm group for positioning
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.32, 1.1, 0.05);
    // Rotate left arm to support the front of the rifle
    leftArmGroup.rotation.x = Math.PI * 0.05; // Less tilt forward for proper posture
    leftArmGroup.rotation.z = -Math.PI * 0.15; // Angle outward to support rifle
    leftArmGroup.rotation.y = Math.PI * 0.1; // Slight rotation to position hand properly
    playerGroup.add(leftArmGroup);
    
    // Left arm - tactical uniform
    const upperArmGeometry = new THREE.BoxGeometry(0.14, 0.3, 0.14);
    const upperArmMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.oliveGreen });
    const leftUpperArm = new THREE.Mesh(upperArmGeometry, upperArmMaterial);
    leftUpperArm.position.set(0, -0.1, 0);
    leftArmGroup.add(leftUpperArm);
    
    // Left forearm with tactical glove
    const forearmGeometry = new THREE.BoxGeometry(0.13, 0.3, 0.13);
    const forearmMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.oliveGreen });
    const leftForearm = new THREE.Mesh(forearmGeometry, forearmMaterial);
    leftForearm.position.set(0, -0.35, 0);
    leftForearm.rotation.x = Math.PI * 0.1; // Angle for supporting the foregrip
    leftArmGroup.add(leftForearm);
    
    // Left tactical glove
    const gloveGeometry = new THREE.BoxGeometry(0.14, 0.08, 0.14);
    const gloveMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
    const leftGlove = new THREE.Mesh(gloveGeometry, gloveMaterial);
    leftGlove.position.set(0, -0.5, 0);
    leftArmGroup.add(leftGlove);
    
    // Create right arm group for positioning
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.32, 1.1, 0.1);
    // Rotate right arm to hold the gun properly on the trigger/grip
    rightArmGroup.rotation.x = Math.PI * 0.15; // More tilt forward for trigger hand
    rightArmGroup.rotation.z = Math.PI * 0.15; // Angle inward toward body
    rightArmGroup.rotation.y = -Math.PI * 0.05; // Slight rotation for better grip position
    playerAimHelper.add(rightArmGroup);
    
    // Right upper arm
    const rightUpperArm = new THREE.Mesh(upperArmGeometry, upperArmMaterial);
    rightUpperArm.position.set(0, -0.1, 0);
    rightArmGroup.add(rightUpperArm);
    
    // Right forearm
    const rightForearm = new THREE.Mesh(forearmGeometry, forearmMaterial);
    rightForearm.position.set(0, -0.35, 0);
    rightForearm.rotation.x = Math.PI * 0.2; // Angle downward to grip the pistol grip
    rightArmGroup.add(rightForearm);
    
    // Right tactical glove
    const rightGlove = new THREE.Mesh(gloveGeometry, gloveMaterial);
    rightGlove.position.set(0, -0.5, 0);
    rightArmGroup.add(rightGlove);
    
    // Tactical pants
    const pantsGeometry = new THREE.BoxGeometry(0.5, 0.2, 0.25);
    const pantsMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.oliveGreen });
    const pants = new THREE.Mesh(pantsGeometry, pantsMaterial);
    pants.position.set(0, 0.65, 0);
    playerGroup.add(pants);
    
    // Legs - tactical cargo pants
    const legGeometry = new THREE.BoxGeometry(0.2, 0.5, 0.2);
    const legMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.oliveGreen });
    
    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.15, 0.45, 0);
    playerGroup.add(leftLeg);
    
    // Left cargo pocket
    const cargoPocketGeometry = new THREE.BoxGeometry(0.1, 0.15, 0.22);
    const cargoPocketMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.oliveGreen });
    const leftCargoPocket = new THREE.Mesh(cargoPocketGeometry, cargoPocketMaterial);
    leftCargoPocket.position.set(-0.2, 0.45, 0);
    playerGroup.add(leftCargoPocket);
    
    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.15, 0.45, 0);
    playerGroup.add(rightLeg);
    
    // Right cargo pocket
    const rightCargoPocket = new THREE.Mesh(cargoPocketGeometry, cargoPocketMaterial);
    rightCargoPocket.position.set(0.2, 0.45, 0);
    playerGroup.add(rightCargoPocket);
    
    // Tactical boots
    const bootGeometry = new THREE.BoxGeometry(0.22, 0.2, 0.28);
    const bootMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
    
    // Left boot
    const leftBoot = new THREE.Mesh(bootGeometry, bootMaterial);
    leftBoot.position.set(-0.15, 0.1, 0.02);
    playerGroup.add(leftBoot);
    
    // Right boot
    const rightBoot = new THREE.Mesh(bootGeometry, bootMaterial);
    rightBoot.position.set(0.15, 0.1, 0.02);
    playerGroup.add(rightBoot);
    
    // Add tactical combat belt
    const beltGeometry = new THREE.TorusGeometry(0.28, 0.05, 8, 16);
    const beltMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
    const belt = new THREE.Mesh(beltGeometry, beltMaterial);
    belt.rotation.x = Math.PI / 2;
    belt.position.set(0, 0.75, 0);
    playerGroup.add(belt);
    
    // Create a tactical modern rifle
    const gunGroup = new THREE.Group();
    gunGroup.name = "gunGroup"; // Add name for reference
    
    // Main rifle body - more detailed
    const rifleBodyGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.7);
    const gunMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
    const rifleBody = new THREE.Mesh(rifleBodyGeometry, gunMaterial);
    gunGroup.add(rifleBody);
    
    // Rifle stock - modern polymer
    const stockGeometry = new THREE.BoxGeometry(0.05, 0.12, 0.25);
    const stockMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
    const stock = new THREE.Mesh(stockGeometry, stockMaterial);
    stock.position.set(0, -0.03, 0.45);
    gunGroup.add(stock);
    
    // Add rifle buttstock padding
    const buttpadGeometry = new THREE.BoxGeometry(0.06, 0.13, 0.02);
    const buttpadMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.darkGrey });
    const buttpad = new THREE.Mesh(buttpadGeometry, buttpadMaterial);
    buttpad.position.set(0, -0.03, 0.58);
    gunGroup.add(buttpad);
    
    // Rail system on top of rifle
    const railGeometry = new THREE.BoxGeometry(0.04, 0.02, 0.5);
    const railMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.gunmetal });
    const topRail = new THREE.Mesh(railGeometry, railMaterial);
    topRail.position.set(0, 0.035, -0.1);
    gunGroup.add(topRail);
    
    // Tactical foregrip
    const foregrip = new THREE.BoxGeometry(0.04, 0.1, 0.04);
    const foregrip_mesh = new THREE.Mesh(foregrip, gunMaterial);
    foregrip_mesh.position.set(0, -0.07, -0.2);
    gunGroup.add(foregrip_mesh);
    
    // Pistol grip
    const gripGeometry = new THREE.BoxGeometry(0.05, 0.15, 0.05);
    const grip = new THREE.Mesh(gripGeometry, gunMaterial);
    grip.position.set(0, -0.1, 0.2);
    gunGroup.add(grip);
    
    // Modern magazine
    const magazineGeometry = new THREE.BoxGeometry(0.05, 0.18, 0.08);
    const magazineMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.gunmetal });
    const magazine = new THREE.Mesh(magazineGeometry, magazineMaterial);
    magazine.position.set(0, -0.13, 0.1);
    gunGroup.add(magazine);
    
    // Barrel with flash hider
    const barrelGeometry = new THREE.CylinderGeometry(0.025, 0.03, 0.2, 8);
    const barrel = new THREE.Mesh(barrelGeometry, gunMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0, -0.45);
    gunGroup.add(barrel);
    
    // Flash hider
    const flashHiderGeometry = new THREE.CylinderGeometry(0.04, 0.03, 0.08, 8);
    const flashHider = new THREE.Mesh(flashHiderGeometry, gunMaterial);
    flashHider.rotation.x = Math.PI / 2;
    flashHider.position.set(0, 0, -0.55);
    gunGroup.add(flashHider);
    
    // Add a tactical red dot sight
    const sightBaseGeometry = new THREE.BoxGeometry(0.07, 0.05, 0.1);
    const sightBaseMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
    const sightBase = new THREE.Mesh(sightBaseGeometry, sightBaseMaterial);
    sightBase.position.set(0, 0.07, -0.15);
    gunGroup.add(sightBase);
    
    // Red dot emitter
    const emitterGeometry = new THREE.BoxGeometry(0.03, 0.03, 0.06);
    const emitterMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
    const emitter = new THREE.Mesh(emitterGeometry, emitterMaterial);
    emitter.position.set(0, 0.1, -0.13);
    gunGroup.add(emitter);
    
    // Add red glow for the sight
    const redDotGeometry = new THREE.SphereGeometry(0.01, 8, 8);
    const redDotMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFF0000,
        transparent: true,
        opacity: 0.8
    });
    const redDot = new THREE.Mesh(redDotGeometry, redDotMaterial);
    redDot.position.set(0, 0.1, -0.1);
    gunGroup.add(redDot);
    
    // Add tactical sling attachment points
    const slingPointGeometry = new THREE.TorusGeometry(0.015, 0.005, 8, 16);
    const slingPointMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.gunmetal });
    
    // Front sling point
    const frontSlingPoint = new THREE.Mesh(slingPointGeometry, slingPointMaterial);
    frontSlingPoint.rotation.y = Math.PI / 2;
    frontSlingPoint.position.set(0.03, 0, -0.3);
    gunGroup.add(frontSlingPoint);
    
    // Rear sling point
    const rearSlingPoint = new THREE.Mesh(slingPointGeometry, slingPointMaterial);
    rearSlingPoint.rotation.y = Math.PI / 2;
    rearSlingPoint.position.set(0.03, 0, 0.3);
    gunGroup.add(rearSlingPoint);
    
    // Position the rifle in proper aiming position
    // Move the gun up toward shoulder level for aiming
    gunGroup.position.set(0.05, 0.17, 0.25);
    
    // Tilt the gun slightly to align with soldier's eye line
    gunGroup.rotation.x = -Math.PI * 0.03;
    // Rotate gun to point forward
    gunGroup.rotation.y = Math.PI;
    // Slight tilt for realistic aiming
    gunGroup.rotation.z = Math.PI * 0.02;
    
    // Connect the right hand to the rifle grip
    rightArmGroup.add(gunGroup);
    
    // Add visual aim indicator (laser sight from gun)
    const aimGeometry = new THREE.BoxGeometry(0.005, 0.005, 0.8);
    const aimMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFF0000,
        transparent: true,
        opacity: 0.5
    });
    const aimIndicator = new THREE.Mesh(aimGeometry, aimMaterial);
    aimIndicator.name = "aimIndicator"; // Add name for reference
    aimIndicator.position.set(0, 0.02, -0.9); // Position in front of gun
    gunGroup.add(aimIndicator);
    
    // Add a tactical knife on the belt
    const knifeHandleGeometry = new THREE.BoxGeometry(0.03, 0.03, 0.12);
    const knifeHandleMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
    const knifeHandle = new THREE.Mesh(knifeHandleGeometry, knifeHandleMaterial);
    knifeHandle.position.set(-0.25, 0.75, 0.15);
    knifeHandle.rotation.x = Math.PI / 2.5;
    playerGroup.add(knifeHandle);
    
    const knifeBladeGeometry = new THREE.BoxGeometry(0.02, 0.01, 0.15);
    const knifeBladeMaterial = new THREE.MeshBasicMaterial({ color: 0xC0C0C0 }); // Silver
    const knifeBlade = new THREE.Mesh(knifeBladeGeometry, knifeBladeMaterial);
    knifeBlade.position.set(-0.25, 0.85, 0.23);
    knifeBlade.rotation.x = Math.PI / 2.5;
    playerGroup.add(knifeBlade);
    
    return playerGroup;
}

// Utility function to add tactical details to objects
function addTacticalDetails(object, colors) {
    // This function adds visual elements to make objects look more tactical
    // For example, attaching small accessories, reflectors, or patches
    if (!object || !object.material) return;
    
    // We could add details in more advanced implementations
    // For now, this is a placeholder for future enhancements
    // such as normal maps, textures, or additional geometry
    
    // In a more advanced implementation, this would add:
    // - Velcro patches
    // - Unit insignias
    // - Tactical accessories
    // - Wear patterns
    // - Reflective elements for night operations
}

// Add setupEventListeners function to handle keyboard and mouse input
function setupEventListeners() {
    // Keyboard controls
    document.addEventListener('keydown', (event) => {
        keys[event.code] = true;
        console.log('Key pressed:', event.code);
        
        // Jump when spacebar is pressed and player is on the ground
        if (event.code === 'Space' && isOnGround) {
            velocity.y = JUMP_FORCE;
            isOnGround = false;
            console.log('JUMP!');
        }
    });

    document.addEventListener('keyup', (event) => {
        keys[event.code] = false;
    });

    // Mouse controls for aiming
    document.addEventListener('mousemove', (event) => {
        if (!isPointerLocked) return;
        
        // Fix mouse X direction for standard third-person controls
        // When mouse moves right (positive movementX), camera should rotate right (negative mouseX)
        mouseX -= event.movementX * aimSensitivity;
        
        // Limit vertical rotation
        mouseY -= event.movementY * aimSensitivity;
        mouseY = Math.max(-maxVerticalRotation, Math.min(maxVerticalRotation, mouseY));
    });
    
    // Pointer lock for FPS controls
    renderer.domElement.addEventListener('click', () => {
        if (!isPointerLocked) {
            renderer.domElement.requestPointerLock();
        }
    });
    
    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === renderer.domElement;
    });
    
    // Shooting mechanic
    document.addEventListener('mousedown', (event) => {
        if (event.button === 0) { // Left mouse button
            shoot();
        }
    });
}

function init() {
    // Check WebGL compatibility first
    if (!checkWebGL()) return;
    
    try {
        // Create the scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x8FBCD4); // Slightly darker sky blue
        
        // Add atmospheric fog for depth
        scene.fog = new THREE.FogExp2(0x8FBCD4, 0.004); // Reduced fog density
        
        // Create camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Create renderer with improved settings
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        // Disable shadows for better performance
        renderer.shadowMap.enabled = false;
        document.body.appendChild(renderer.domElement);
        
        // Simplified lighting for better compatibility
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Brighter ambient light
        scene.add(ambientLight);
        
        // Create ground with simpler material
        const groundGeometry = new THREE.PlaneGeometry(500, 500);
        const groundMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x2D572C, // Darker grass
            side: THREE.DoubleSide
        });
        ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        ground.position.y = 0;
        scene.add(ground);
        
        // Create player group
        player = new THREE.Group();
        player.position.set(0, 1, 0); // Start at origin, slightly above ground
        scene.add(player);
        
        // Create player body
        playerBody = createHumanoidMesh();
        player.add(playerBody);
        
        // Create a simpler forest (fewer trees for better performance)
        const clearingRadius = 15;
        const forestRadius = 80; // Smaller radius for better performance
        const treeCount = 50; // Reduced number of trees
        
        for (let i = 0; i < treeCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = clearingRadius + Math.random() * (forestRadius - clearingRadius);
            
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            if (Math.sqrt(x * x + z * z) > clearingRadius) {
                createTree(x, z);
            }
        }
        
        // Handle window resizing
        window.addEventListener('resize', onWindowResize);
        
        // Setup event listeners for controls
        setupEventListeners();
        
        console.log('Initialization complete with basic materials!');
        // Start the animation loop
        animate();
    } catch (error) {
        console.error('Initialization error:', error);
        document.getElementById('instructions').innerHTML = 
            `<p style="color:red">Error: ${error.message}</p>`;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function shoot() {
    const now = Date.now();
    if (now - lastShootTime < shootCooldown) return;
    lastShootTime = now;
    
    try {
        console.log('Shooting!');
        
        // Create bullet
        const bulletGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        // Find the gun barrel position and direction
        // First, get a reference to the gun group and aim indicator
        const gunGroup = findObjectByName(player, "gunGroup");
        const aimIndicator = findObjectByName(player, "aimIndicator");
        
        if (!gunGroup || !aimIndicator) {
            console.error("Cannot find gun or aim indicator");
            return;
        }
        
        // Get the world position of the gun barrel (use the aim indicator's position)
        const barrelPosition = new THREE.Vector3();
        aimIndicator.getWorldPosition(barrelPosition);
        
        // Get the forward direction of the gun (normalized direction from gun to aim indicator)
        const bulletDirection = new THREE.Vector3();
        aimIndicator.getWorldPosition(bulletDirection);
        
        const gunPosition = new THREE.Vector3();
        gunGroup.getWorldPosition(gunPosition);
        
        // Calculate direction from gun to aim indicator
        bulletDirection.sub(gunPosition).normalize();
        
        // Position bullet at the barrel
        bullet.position.copy(barrelPosition);
        
        // Store bullet data
        const bulletData = {
            mesh: bullet,
            direction: bulletDirection,
            speed: 0.5,
            distance: 0,
            maxDistance: 100
        };
        
        scene.add(bullet);
        bullets.push(bulletData);
        
        // Add muzzle flash effect at the barrel
        const flashGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFF00,
            transparent: true,
            opacity: 1
        });
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(barrelPosition);
        scene.add(flash);
        
        // Remove flash after short time
        setTimeout(() => {
            scene.remove(flash);
        }, 50);
        
    } catch (error) {
        console.error('Error in shoot function:', error);
    }
}

// Utility function to find an object by name in the hierarchy
function findObjectByName(root, name) {
    let found = null;
    
    // If this object has the name we're looking for, return it
    if (root.name === name) {
        return root;
    }
    
    // Otherwise, search its children
    if (root.children && root.children.length > 0) {
        for (let i = 0; i < root.children.length; i++) {
            found = findObjectByName(root.children[i], name);
            if (found) return found;
        }
    }
    
    return found;
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // Move bullet forward
        const movement = bullet.direction.clone().multiplyScalar(bullet.speed);
        bullet.mesh.position.add(movement);
        
        // Update distance traveled
        bullet.distance += bullet.speed;
        
        // Remove bullets that have gone too far
        if (bullet.distance > bullet.maxDistance) {
            scene.remove(bullet.mesh);
            bullets.splice(i, 1);
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    // Reset movement direction for this frame
    moveDirection.set(0, 0, 0);
    
    // Get input from WASD keys
    // The actual direction will be calculated relative to camera later
    if (keys['KeyW']) {
        moveDirection.z = -1; // Forward
    }
    if (keys['KeyS']) {
        moveDirection.z = 1; // Backward
    }
    if (keys['KeyA']) {
        moveDirection.x = -1; // Left
    }
    if (keys['KeyD']) {
        moveDirection.x = 1; // Right
    }
    
    // Only normalize if we're actually moving
    if (moveDirection.length() > 0) {
        moveDirection.normalize();
    }
    
    // Create a camera direction vector (where the camera is looking)
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    // Rotate it based on the current camera rotation
    cameraDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), mouseX);
    
    // Forward vector is the camera direction
    const forward = cameraDirection.clone();
    
    // Right vector is perpendicular to forward (cross product with up vector)
    const right = new THREE.Vector3().crossVectors(
        new THREE.Vector3(0, 1, 0), // Up vector
        forward
    ).normalize();
    
    // Set the direction based on camera orientation
    direction.set(0, 0, 0);
    
    // Add components based on input
    // W/S move along the camera's forward/backward axis
    if (moveDirection.z !== 0) {
        direction.add(forward.clone().multiplyScalar(moveDirection.z));
    }
    
    // A/D move along the camera's left/right axis
    if (moveDirection.x !== 0) {
        direction.add(right.clone().multiplyScalar(moveDirection.x));
    }
    
    // Normalize the final direction
    if (direction.length() > 0) {
        direction.normalize();
    }
    
    // Apply acceleration based on input
    if (direction.length() > 0) {
        // Add acceleration in the movement direction
        velocity.x += direction.x * ACCELERATION;
        velocity.z += direction.z * ACCELERATION;
        
        // Calculate current horizontal speed
        const currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        
        // If we're exceeding max speed, scale it back
        if (currentSpeed > MAX_SPEED) {
            const scaleFactor = MAX_SPEED / currentSpeed;
            velocity.x *= scaleFactor;
            velocity.z *= scaleFactor;
        }
    } else {
        // Apply stronger deceleration when no keys are pressed
        velocity.x *= DECELERATION;
        velocity.z *= DECELERATION;
    }
    
    // Apply gravity
    velocity.y -= GRAVITY;
    
    // Apply velocity to player position
    player.position.x += velocity.x;
    player.position.y += velocity.y;
    player.position.z += velocity.z;
    
    // Ground collision
    if (player.position.y < 1) {
        player.position.y = 1;
        velocity.y = 0;
        isOnGround = true;
    }
    
    // Apply friction to horizontal movement
    velocity.x *= friction;
    velocity.z *= friction;
    
    // Rotate the entire player to face movement direction
    if (direction.length() > 0.1) {
        // Calculate rotation from direction vector
        const targetRotation = Math.atan2(direction.x, direction.z);
        
        // Apply smooth rotation
        const rotationSpeed = 0.15; // How quickly the player turns to face direction
        const currentRotation = player.rotation.y;
        
        // Calculate shortest rotation path
        let rotationDiff = targetRotation - currentRotation;
        if (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
        if (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
        
        // Smooth rotation
        player.rotation.y += rotationDiff * rotationSpeed;
    }
    
    // Update aim direction based on mouse
    playerAimHelper.rotation.y = 0; // Reset to avoid compounding rotations
    playerAimHelper.rotation.x = mouseY;
    
    // Update camera position relative to player
    camera.position.x = player.position.x - Math.sin(mouseX) * cameraOffset.z;
    camera.position.z = player.position.z - Math.cos(mouseX) * cameraOffset.z;
    camera.position.y = player.position.y + cameraOffset.y;
    
    // Make camera look at player
    camera.lookAt(
        player.position.x,
        player.position.y + 1.2, // Look at upper body height
        player.position.z
    );
    
    // Update bullets
    updateBullets();
    
    renderer.render(scene, camera);
} 