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

// Audio system
let audioListener;
let gunshotSound;
let gunshotSoundLoaded = false;
let ricochetSound;
let reloadSound;

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
    const scale = 3.5 + Math.random() * 2.0; // Increased overall size
    const trunkHeight = 5 * scale;
    const trunkRadius = 0.4 * scale;
    const foliageSize = 4.0 * scale;
    
    // More pronounced random rotation and tilt for natural look
    const rotation = Math.random() * Math.PI * 2;
    const tiltAmount = Math.random() * 0.1; // Increased tilt variation
    const tiltDirection = Math.random() * Math.PI * 2;
    
    // Tree trunk with more realistic materials and more geometry segments
    const trunkGeometry = new THREE.CylinderGeometry(
        trunkRadius * 0.7, // Narrower at top
        trunkRadius * 1.2, // Wider at base with more flare
        trunkHeight,
        12,              // More radial segments for better roundness
        6,               // Height segments for bark detail variation
        true             // Open-ended for branch connections
    );
    
    // Use MeshStandardMaterial for better lighting effects if available
    const trunkMaterial = (typeof THREE.MeshStandardMaterial !== 'undefined') ? 
        new THREE.MeshStandardMaterial({ 
            color: 0x5D4037,   // Rich brown
            roughness: 0.9,    // Very rough
            metalness: 0.1,    // Slight shine for wet bark look
            flatShading: true  // For more texture
        }) : 
        new THREE.MeshBasicMaterial({ color: 0x5D4037 });
    
    // Add subtle color variation to trunk
    trunkMaterial.color.r += (Math.random() * 0.1) - 0.05;
    trunkMaterial.color.g += (Math.random() * 0.05) - 0.025;
    trunkMaterial.color.b += (Math.random() * 0.05) - 0.025;
    
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    trunk.rotation.x = Math.sin(tiltDirection) * tiltAmount;
    trunk.rotation.z = Math.cos(tiltDirection) * tiltAmount;
    
    // Add subtle trunk deformation by scaling
    trunk.scale.x *= 1 + (Math.random() * 0.1 - 0.05);
    trunk.scale.z *= 1 + (Math.random() * 0.1 - 0.05);
    
    tree.add(trunk);
    
    // Create multiple layers of foliage for a more realistic look
    const foliageLayers = 4 + Math.floor(Math.random() * 3); // 4-6 layers for more fullness
    
    // Enhanced color palette with more variation
    const foliageColors = [
        0x1B5E20, // Deep green
        0x2E7D32, // Dark green
        0x388E3C, // Medium green
        0x43A047, // Light green
        0x4CAF50, // Bright green
        0x66BB6A  // Pale green
    ];
    
    // Create foliage layers with more variation and detail
    for (let i = 0; i < foliageLayers; i++) {
        // Layer size decreases as we go up, more variation in scaling
        const layerScale = 1 - (i * (0.15 + Math.random() * 0.1));
        const layerHeight = 3.5 * scale * layerScale;
        const layerWidth = foliageSize * layerScale * (0.9 + Math.random() * 0.2); // Width variation
        
        // More shape variations
        let foliageGeometry;
        const shape = Math.random();
        
        if (shape > 0.8) { // 20% chance of rounded top
            foliageGeometry = new THREE.SphereGeometry(
                layerWidth, 
                10, // More segments for smoother look
                8, 
                0, 
                Math.PI * 2, 
                0, 
                Math.PI * (0.4 + Math.random() * 0.2) // Vary the slice amount
            );
        } else if (shape > 0.4) { // 40% chance of conical
            foliageGeometry = new THREE.ConeGeometry(
                layerWidth, 
                layerHeight, 
                10, // More segments 
                4, // Height segments
                true // Open ended
            );
        } else { // 40% chance of dodecahedron (for pine-like trees)
            foliageGeometry = new THREE.DodecahedronGeometry(
                layerWidth * 0.8,
                0 // No subdivision for faceted look
            );
            // Scale to make it taller than wide
            foliageGeometry.scale(1, 1.5, 1);
        }
        
        // Choose a color with more variation
        const colorIndex = Math.floor(Math.random() * foliageColors.length);
        const baseColor = foliageColors[colorIndex];
        
        // Add more significant color variation for natural look
        const color = new THREE.Color(baseColor);
        color.r += (Math.random() * 0.15) - 0.075;
        color.g += (Math.random() * 0.2) - 0.1; // More green variation
        color.b += (Math.random() * 0.15) - 0.075;
        
        // Use StandardMaterial for better lighting if available
        const foliageMaterial = (typeof THREE.MeshStandardMaterial !== 'undefined') ? 
            new THREE.MeshStandardMaterial({ 
                color: color,
                roughness: 0.8,
                metalness: 0.0,
                flatShading: Math.random() > 0.5 // Random shading style
            }) : 
            new THREE.MeshBasicMaterial({ color: color });
        
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        
        // Position each layer with more variation
        const heightVariation = (Math.random() * 0.4 - 0.2) * scale;
        const layerPosition = trunkHeight * (0.65 + Math.random() * 0.1) + (i * 1.2 * scale) + heightVariation;
        foliage.position.y = layerPosition;
        
        // Add more pronounced offset for more natural appearance
        foliage.position.x += (Math.random() - 0.5) * scale * 0.7;
        foliage.position.z += (Math.random() - 0.5) * scale * 0.7;
        
        // Add random rotation and slight scaling for variety
        foliage.rotation.y = Math.random() * Math.PI;
        foliage.rotation.x = (Math.random() - 0.5) * 0.1;
        foliage.rotation.z = (Math.random() - 0.5) * 0.1;
        
        // Random scaling for more natural variation
        foliage.scale.x *= 0.9 + Math.random() * 0.2;
        foliage.scale.z *= 0.9 + Math.random() * 0.2;
        
        tree.add(foliage);
    }
    
    // Add random small branches for detail
    const branchCount = Math.floor(Math.random() * 5) + 2; // 2-6 branches
    
    for (let i = 0; i < branchCount; i++) {
        const branchHeight = trunkHeight * (0.3 + Math.random() * 0.6); // Vary height along trunk
        const branchAngle = Math.random() * Math.PI * 2;
        const branchTilt = Math.PI * 0.2 + Math.random() * Math.PI * 0.3; // Upward tilt
        
        const branchLength = scale * (1 + Math.random());
        
        // Create branch geometry
        const branchGeometry = new THREE.CylinderGeometry(
            scale * 0.1,  // Tip
            scale * 0.2,  // Base
            branchLength,
            5,           // Lower detail for branches
            1
        );
        
        const branch = new THREE.Mesh(branchGeometry, trunkMaterial.clone());
        
        // Position and rotate branch
        branch.position.y = branchHeight;
        branch.position.x = Math.cos(branchAngle) * trunkRadius * 0.8;
        branch.position.z = Math.sin(branchAngle) * trunkRadius * 0.8;
        
        // Rotate to point outward and upward
        branch.rotation.z = branchTilt;
        branch.rotation.y = branchAngle;
        
        // Move origin to end of cylinder for correct rotation
        branch.geometry.translate(0, branchLength/2, 0);
        
        tree.add(branch);
    }
    
    // Set position with slight random offset
    const posX = x + (Math.random() - 0.5) * 3; // More position variation
    const posZ = z + (Math.random() - 0.5) * 3;
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
    playerAimHelper.position.set(0, 1.2, 0); // Position at shoulder height and centered
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
    
    // Left forearm with tactical glove - adjust position to better support the foregrip
    const forearmGeometry = new THREE.BoxGeometry(0.13, 0.3, 0.13);
    const forearmMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.oliveGreen });
    const leftForearm = new THREE.Mesh(forearmGeometry, forearmMaterial);
    leftForearm.position.set(0, -0.35, 0);
    leftForearm.rotation.x = Math.PI * 0.2; // More angled to properly support foregrip
    leftForearm.rotation.y = Math.PI * 0.1; // Slight rotation to position hand naturally
    leftArmGroup.add(leftForearm);
    
    // Left tactical glove - shape and position for holding foregrip
    const leftGloveGeometry = new THREE.BoxGeometry(0.13, 0.08, 0.15); // Slightly longer in z direction for grip
    const gloveMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
    const leftGlove = new THREE.Mesh(leftGloveGeometry, gloveMaterial);
    leftGlove.position.set(0, -0.5, 0.02); // Positioned to hold foregrip
    leftGlove.rotation.x = Math.PI * 0.15; // Rotated to wrap around foregrip
    leftArmGroup.add(leftGlove);
    
    // Create right arm group for positioning - position it relative to the shoulder area of the vest
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.28, -0.1, 0.05); // Position relative to playerAimHelper, which is at shoulder height
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
    rightForearm.rotation.x = Math.PI * 0.25; // Increased angle for better trigger grip position
    rightForearm.rotation.z = Math.PI * 0.05; // Slight rotation for more natural wrist position
    rightArmGroup.add(rightForearm);
    
    // Right tactical glove - adjusted for trigger grip
    const rightGloveGeometry = new THREE.BoxGeometry(0.13, 0.09, 0.16); // Sized for pistol grip
    const rightGlove = new THREE.Mesh(rightGloveGeometry, gloveMaterial);
    rightGlove.position.set(0, -0.5, 0.03); // Position to grip pistol grip
    rightGlove.rotation.x = Math.PI * 0.15; // Angled to wrap fingers around grip
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
    
    // Add a more realistic trigger to the rifle
    const triggerGeometry = new THREE.BoxGeometry(0.02, 0.05, 0.02);
    const triggerMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.gunmetal });
    const trigger = new THREE.Mesh(triggerGeometry, triggerMaterial);
    trigger.position.set(0, -0.13, 0.18); // Position in trigger guard
    gunGroup.add(trigger);
    
    // Add a trigger guard
    const triggerGuardGeometry = new THREE.TorusGeometry(0.03, 0.01, 8, 8, Math.PI);
    const triggerGuard = new THREE.Mesh(triggerGuardGeometry, gunMaterial);
    triggerGuard.rotation.x = Math.PI / 2;
    triggerGuard.position.set(0, -0.1, 0.18);
    gunGroup.add(triggerGuard);
    
    // Position the rifle in proper aiming position
    // Move the gun up to be gripped properly by the hands
    gunGroup.position.set(0.04, 0.15, -0.25);
    
    // Slightly adjust rifle angle for proper hand alignment
    gunGroup.rotation.x = -Math.PI * 0.03;
    // No need to rotate to point forward since we fixed the position
    // gunGroup.rotation.y = Math.PI; // Removed this line as it was making the gun point backward
    // Slight tilt for realistic aiming
    gunGroup.rotation.z = Math.PI * 0.02;
    
    // Connect the right hand to the rifle grip
    rightArmGroup.add(gunGroup);
    
    // Create visual connection between left hand and foregrip
    // Invisible helper object positioned at the foregrip
    const leftHandTarget = new THREE.Object3D();
    leftHandTarget.position.set(-0.29, 1.1, -0.05); // Position where left hand should reach
    playerGroup.add(leftHandTarget);
    
    // Adjust left arm group to point toward foregrip
    leftArmGroup.lookAt(leftHandTarget.position);
    // Adjust left arm rotation slightly for natural positioning
    leftArmGroup.rotation.x += Math.PI * 0.1;
    leftArmGroup.rotation.z -= Math.PI * 0.1;
    
    // Add visual aim indicator (laser sight from gun)
    const aimIndicatorGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.4, 8);
    const aimIndicatorMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFF0000,
        transparent: true,
        opacity: 0.5
    });
    const aimIndicator = new THREE.Mesh(aimIndicatorGeometry, aimIndicatorMaterial);
    aimIndicator.rotation.x = Math.PI / 2;
    aimIndicator.position.set(0, 0, -0.75); // Position in front of gun barrel
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
        
        // Set up audio system
        audioListener = new THREE.AudioListener();
        camera.add(audioListener);
        
        // Make sure audio context is initialized properly
        const initAudio = () => {
            if (audioListener.context.state === 'suspended') {
                audioListener.context.resume();
            }
        };
        document.addEventListener('click', initAudio, { once: true });

        // Load gunshot sound - powerful rifle sound
        gunshotSound = new THREE.Audio(audioListener);
        const audioLoader = new THREE.AudioLoader();
        
        // Load main gunshot sound
        audioLoader.load(
            'https://freesound.org/data/previews/642/642315_7177907-lq.mp3', // Powerful rifle shot
            function(buffer) {
                gunshotSound.setBuffer(buffer);
                gunshotSound.setVolume(0.8); // Slightly less than full volume
                gunshotSound.setPlaybackRate(0.9); // Slightly slowed for more bass
                gunshotSoundLoaded = true;
                console.log('Gunshot sound loaded!');
            },
            function(xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            function(err) {
                console.error('Error loading gunshot sound:', err);
                // Fallback to create an oscillator sound if loading fails
                createFallbackGunshotSound();
            }
        );
        
        // Load ricochet sound for bullet impact
        ricochetSound = new THREE.Audio(audioListener);
        audioLoader.load(
            'https://freesound.org/data/previews/420/420368_7383104-lq.mp3',
            function(buffer) {
                ricochetSound.setBuffer(buffer);
                ricochetSound.setVolume(0.5);
            },
            null,
            function(err) {
                console.error('Error loading ricochet sound:', err);
            }
        );
        
        // Load reload sound for potential reload mechanic
        reloadSound = new THREE.Audio(audioListener);
        audioLoader.load(
            'https://freesound.org/data/previews/522/522396_9468981-lq.mp3',
            function(buffer) {
                reloadSound.setBuffer(buffer);
                reloadSound.setVolume(0.6);
            },
            null,
            function(err) {
                console.error('Error loading reload sound:', err);
            }
        );

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
        
        // Create a more visually appealing forest with better distribution
        const clearingRadius = 18; // Larger clearing for bigger trees
        const forestRadius = 100; // Expanded forest area
        const treeCount = 70; // More trees for a denser forest
        
        // Create a few distinct tree clusters for more natural appearance
        const clusterCount = 5;
        const clusterCenters = [];
        
        // Generate random cluster centers
        for (let i = 0; i < clusterCount; i++) {
            const angle = (i / clusterCount) * Math.PI * 2 + (Math.random() * 0.5 - 0.25);
            const distance = clearingRadius + 15 + Math.random() * 20;
            
            clusterCenters.push({
                x: Math.cos(angle) * distance,
                z: Math.sin(angle) * distance,
                radius: 10 + Math.random() * 15 // Cluster size
            });
        }
        
        // Larger trees for backdrop (furthest from player)
        const backdropTreeCount = 15;
        for (let i = 0; i < backdropTreeCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = forestRadius * 0.7 + Math.random() * (forestRadius * 0.3);
            
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            // Create tree with explicit larger scale for backdrop effect
            createTree(x, z);
        }
        
        // Trees in clusters (medium distance)
        const clusterTreeCount = 35;
        for (let i = 0; i < clusterTreeCount; i++) {
            // Pick a random cluster
            const cluster = clusterCenters[Math.floor(Math.random() * clusterCenters.length)];
            
            // Random position within cluster
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * cluster.radius;
            
            const x = cluster.x + Math.cos(angle) * distance;
            const z = cluster.z + Math.sin(angle) * distance;
            
            // Verify not in clearing
            if (Math.sqrt(x * x + z * z) > clearingRadius) {
                createTree(x, z);
            }
        }
        
        // Scattered trees (various distances)
        const scatteredTreeCount = 20;
        for (let i = 0; i < scatteredTreeCount; i++) {
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
    const currentTime = Date.now();
    if (currentTime - lastShootTime < shootCooldown) return;
    lastShootTime = currentTime;
    
    try {
        // Play gunshot sound
        if (gunshotSoundLoaded && gunshotSound && gunshotSound.context) {
            // Make sure audio context is running
            if (gunshotSound.context.state !== 'running') {
                gunshotSound.context.resume();
            }
            
            // Play the sound directly instead of cloning
            if (!gunshotSound.isPlaying) {
                gunshotSound.play();
            }
        } else {
            console.log("Sound not loaded correctly, using fallback");
            createFallbackGunshotSound();
            if (gunshotSound && !gunshotSound.isPlaying) {
                gunshotSound.play();
            }
        }
        
        // Get gun position and aim direction from playerAimHelper
        const gunGroup = findObjectByName(playerAimHelper, "gunGroup");
        if (!gunGroup) return;
        
        // Calculate gun position in world space
        const gunPosition = new THREE.Vector3();
        gunGroup.getWorldPosition(gunPosition);
        
        // Use playerAimHelper direction for accurate aiming
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyEuler(playerAimHelper.rotation);
        
        // Add slight random spread
        direction.x += (Math.random() - 0.5) * 0.02;
        direction.y += (Math.random() - 0.5) * 0.02;
        direction.z += (Math.random() - 0.5) * 0.02;
        direction.normalize();
        
        // Create bullet
        const bulletGeometry = new THREE.SphereGeometry(0.02, 8, 8);
        const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        // Position bullet at gun barrel
        bullet.position.copy(gunPosition);
        // Offset slightly to appear from barrel
        bullet.position.add(direction.clone().multiplyScalar(0.5));
        
        scene.add(bullet);
        
        // Add bullet data for movement
        bullets.push({
            mesh: bullet,
            direction: direction,
            speed: 1.5,
            distance: 0,
            maxDistance: 100
        });
    } catch (error) {
        console.error("Error in shoot function:", error);
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
    
    // IMPORTANT: Detach the playerAimHelper from player rotation
    // This ensures the gun aim follows camera exactly
    player.remove(playerAimHelper);
    scene.add(playerAimHelper);

    // Update player aim direction based on mouse movement
    playerAimHelper.position.copy(player.position);
    playerAimHelper.position.y = player.position.y + 1.2; // Maintain shoulder height
    playerAimHelper.rotation.y = mouseX;

    // Limit vertical aim to avoid weird angles
    mouseY = Math.max(-Math.PI/3, Math.min(Math.PI/6, mouseY));

    // Apply vertical aiming only to the playerAimHelper 
    playerAimHelper.rotation.x = mouseY;

    // Reset player body rotation for aiming independently of movement
    playerAimHelper.rotation.order = 'YXZ'; // Set rotation order to prevent gimbal lock
    
    // Update camera position relative to player
    camera.position.x = player.position.x - Math.sin(mouseX) * cameraOffset.z;
    camera.position.z = player.position.z - Math.cos(mouseX) * cameraOffset.z;
    camera.position.y = player.position.y + cameraOffset.y;
    
    // Make camera look at player
    camera.lookAt(
        player.position.x,
        player.position.y + 1.2 + mouseY * 0.5, // Add mouseY influence to vertical camera target
        player.position.z
    );
    
    // Update bullets
    updateBullets();
    
    renderer.render(scene, camera);
}

// Create a fallback gunshot sound using oscillator if loading fails
function createFallbackGunshotSound() {
    console.log('Creating fallback gunshot sound');
    
    try {
        // Create a simple oscillator-based gunshot sound
        const context = audioListener.context;
        const sampleRate = context.sampleRate;
        const duration = 0.3; // 300ms sound
        const bufferSize = Math.floor(sampleRate * duration);
        const buffer = context.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate a simple gunshot waveform
        for (let i = 0; i < bufferSize; i++) {
            const t = i / sampleRate;
            let sample = 0;
            
            if (t < 0.01) {
                // Quick attack
                sample = t / 0.01;
            } else if (t < 0.05) {
                // Sharp decay
                sample = 1 - ((t - 0.01) / 0.04);
            } else {
                // Long tail
                sample = 0.5 * Math.exp(-(t - 0.05) * 10);
            }
            
            // Add some noise
            sample *= (0.5 + Math.random() * 0.5);
            
            // Apply bandpass-like filtering by reducing high and low components
            if (i > 0 && i < bufferSize - 1) {
                sample = 0.7 * sample + 0.15 * data[i-1] + 0.15 * (Math.random() - 0.5);
            }
            
            data[i] = Math.max(-1, Math.min(1, sample * 0.8));
        }
        
        // Create a new audio with the buffer
        if (gunshotSound) {
            gunshotSound.disconnect();
        }
        
        gunshotSound = new THREE.Audio(audioListener);
        gunshotSound.setBuffer(buffer);
        gunshotSound.setVolume(0.8);
        gunshotSoundLoaded = true;
        console.log('Fallback gunshot sound created successfully');
    } catch (error) {
        console.error('Error creating fallback sound:', error);
        gunshotSoundLoaded = false;
    }
} 