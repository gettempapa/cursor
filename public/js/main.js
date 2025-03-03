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

// Add leg animation variables after the movement parameters
const LEG_SWING_SPEED = 8; // How fast the legs move
const MAX_LEG_ROTATION = Math.PI / 4; // Maximum leg swing angle
let legAnimationTime = 0; // Time tracker for leg animation

// Add bullet hole and impact effect variables after the bullet array
const bulletHoles = [];
const maxBulletHoles = 50; // Maximum number of bullet holes to keep
const impactEffects = [];

// Tree mesh instances and materials
let treeMeshes = {
    trunk: null,
    foliageLow: null,
    foliageHigh: null,
    branchLow: null,
    branchHigh: null
};

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

// Create tree templates for instancing
function initTreeTemplates() {
    // Create trunk template
    const trunkGeometry = new THREE.CylinderGeometry(0.4, 0.5, 5, 8);
    const trunkMaterial = new THREE.MeshBasicMaterial({ color: 0x614126 });
    treeMeshes.trunk = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, 1000);
    treeMeshes.trunk.count = 0;  // Initialize count
    
    // Create high-detail foliage template
    const foliageHighGeometry = new THREE.SphereGeometry(2, 12, 12);
    const foliageHighMaterial = new THREE.MeshBasicMaterial({ color: 0x2E6E31 });
    treeMeshes.foliageHigh = new THREE.InstancedMesh(foliageHighGeometry, foliageHighMaterial, 1000);
    treeMeshes.foliageHigh.count = 0;  // Initialize count
    
    // Create low-detail foliage template
    const foliageLowGeometry = new THREE.SphereGeometry(2, 6, 6);
    const foliageLowMaterial = new THREE.MeshBasicMaterial({ color: 0x2E6E31 });
    treeMeshes.foliageLow = new THREE.InstancedMesh(foliageLowGeometry, foliageLowMaterial, 1000);
    treeMeshes.foliageLow.count = 0;  // Initialize count
    
    // Create high-detail branch template
    const branchHighGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 6);
    const branchHighMaterial = new THREE.MeshBasicMaterial({ color: 0x614126 });
    treeMeshes.branchHigh = new THREE.InstancedMesh(branchHighGeometry, branchHighMaterial, 1000);
    treeMeshes.branchHigh.count = 0;  // Initialize count
    
    // Create low-detail branch template
    const branchLowGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 4);
    const branchLowMaterial = new THREE.MeshBasicMaterial({ color: 0x614126 });
    treeMeshes.branchLow = new THREE.InstancedMesh(branchLowGeometry, branchLowMaterial, 1000);
    treeMeshes.branchLow.count = 0;  // Initialize count
    
    // Add meshes to scene
    Object.values(treeMeshes).forEach(mesh => scene.add(mesh));
}

// Create a tree using instanced meshes
function createTree(x, z) {
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3(x, 0, z);
    const scale = 3.5 + Math.random() * 2.0;
    const rotation = Math.random() * Math.PI * 2;
    const treeType = Math.floor(Math.random() * 4);
    
    // Calculate distance from camera for LOD
    const distanceToCamera = position.distanceTo(camera.position);
    const useHighDetail = distanceToCamera < 50;
    
    // Tree color variations
    const colors = {
        oak: { bark: 0x614126, leaves: 0x2E6E31 },
        pine: { bark: 0x483C32, leaves: 0x2C5545 },
        birch: { bark: 0xD3CDBD, leaves: 0x5DA130 },
        willow: { bark: 0x5A4D41, leaves: 0x6A8D73 }
    };
    
    const treeColors = [colors.oak, colors.pine, colors.birch, colors.willow][treeType];
    
    // Add color variation
    const barkColor = new THREE.Color(treeColors.bark);
    const leafColor = new THREE.Color(treeColors.leaves);
    barkColor.offsetHSL((Math.random() * 0.05) - 0.025, Math.random() * 0.1, (Math.random() * 0.1) - 0.05);
    leafColor.offsetHSL((Math.random() * 0.05) - 0.025, Math.random() * 0.2, Math.random() * 0.1);
    
    // Set trunk instance
    matrix.makeRotationY(rotation);
    matrix.setPosition(position);
    matrix.scale(new THREE.Vector3(scale, scale, scale));
    const trunkIndex = treeMeshes.trunk.count++;
    treeMeshes.trunk.setMatrixAt(trunkIndex, matrix);
    treeMeshes.trunk.setColorAt(trunkIndex, barkColor);
    
    // Add foliage instances
    const foliageMesh = useHighDetail ? treeMeshes.foliageHigh : treeMeshes.foliageLow;
    const branchMesh = useHighDetail ? treeMeshes.branchHigh : treeMeshes.branchLow;
    
    // Create branches with foliage
    const branchCount = useHighDetail ? 5 : 3;
    for (let i = 0; i < branchCount; i++) {
        const branchAngle = (i / branchCount) * Math.PI * 2 + (Math.random() * 0.5);
        const branchHeight = scale * (2 + Math.random());
        const branchPosition = new THREE.Vector3(
            x + Math.cos(branchAngle) * scale * 0.5,
            branchHeight,
            z + Math.sin(branchAngle) * scale * 0.5
        );
        
        // Set branch instance
        matrix.makeRotationY(branchAngle);
        matrix.setPosition(branchPosition);
        matrix.scale(new THREE.Vector3(1, 1, 1));
        const branchIndex = branchMesh.count++;
        branchMesh.setMatrixAt(branchIndex, matrix);
        branchMesh.setColorAt(branchIndex, barkColor);
        
        // Add foliage at branch tips
        const foliagePosition = new THREE.Vector3(
            branchPosition.x + Math.cos(branchAngle) * scale * 0.7,
            branchPosition.y + scale * 0.5,
            branchPosition.z + Math.sin(branchAngle) * scale * 0.7
        );
        
        matrix.makeRotationY(Math.random() * Math.PI * 2);
        matrix.setPosition(foliagePosition);
        const foliageScale = 0.8 + Math.random() * 0.4;
        matrix.scale(new THREE.Vector3(foliageScale, foliageScale, foliageScale));
        const foliageIndex = foliageMesh.count++;
        foliageMesh.setMatrixAt(foliageIndex, matrix);
        foliageMesh.setColorAt(foliageIndex, leafColor);
    }
    
    // Update instance matrices
    Object.values(treeMeshes).forEach(mesh => {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
    
    return { position, scale, type: treeType };
}

// Create forest with improved clustering
function createForest() {
    initTreeTemplates();
    
    const clearingRadius = 18;
    const forestRadius = 100;
    
    // Create natural clusters using Poisson disk sampling
    const clusters = [];
    const minClusterDistance = 20;
    
    // Generate cluster centers
    for (let attempts = 0; attempts < 50; attempts++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = clearingRadius + Math.random() * (forestRadius - clearingRadius);
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        
        // Check distance from other clusters
        let tooClose = false;
        for (const cluster of clusters) {
            const dx = cluster.x - x;
            const dz = cluster.z - z;
            if (Math.sqrt(dx * dx + dz * dz) < minClusterDistance) {
                tooClose = true;
                break;
            }
        }
        
        if (!tooClose) {
            clusters.push({
                x, z,
                radius: 10 + Math.random() * 15,
                density: 0.5 + Math.random() * 0.5
            });
        }
    }
    
    // Create trees in clusters
    clusters.forEach(cluster => {
        const treeCount = Math.floor(cluster.radius * cluster.density * 2);
        for (let i = 0; i < treeCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.pow(Math.random(), 0.5) * cluster.radius; // Square root for more natural distribution
            const x = cluster.x + Math.cos(angle) * distance;
            const z = cluster.z + Math.sin(angle) * distance;
            
            if (Math.sqrt(x * x + z * z) > clearingRadius) {
                createTree(x, z);
            }
        }
    });
    
    // Add scattered trees
    const scatteredCount = 30;
    for (let i = 0; i < scatteredCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = clearingRadius + Math.random() * (forestRadius - clearingRadius);
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        
        if (Math.sqrt(x * x + z * z) > clearingRadius) {
            createTree(x, z);
        }
    }
}

// Create a simple humanoid figure
function createHumanoidMesh() {
    const playerGroup = new THREE.Group();
    
    // Create separate groups for legs
    const leftLegGroup = new THREE.Group();
    const rightLegGroup = new THREE.Group();
    playerGroup.add(leftLegGroup);
    playerGroup.add(rightLegGroup);
    
    // Create separate group for aiming parts and arms
    playerAimHelper = new THREE.Group();
    playerAimHelper.position.set(0, 1.5, 0); // Shoulder height
    playerGroup.add(playerAimHelper);
    
    // Modern tactical color scheme
    const tacticalColors = {
        black: 0x111111,
        darkGrey: 0x333333,
        oliveGreen: 0x556B2F,
        gunmetal: 0x2C3539,
        weaponMetal: 0x4C4C4C,
        weaponBlack: 0x1A1A1A
    };

    // Create M16-style rifle
    const createM16 = () => {
        const rifleGroup = new THREE.Group();
        
        // Main body
        const bodyGeometry = new THREE.BoxGeometry(0.1, 0.2, 1.2);
        const bodyMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.weaponBlack });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        rifleGroup.add(body);
        
        // Barrel
        const barrelGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8);
        const barrelMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.weaponMetal });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.rotation.z = Math.PI / 2;
        barrel.position.z = 0.8;
        rifleGroup.add(barrel);
        
        // Stock
        const stockGeometry = new THREE.BoxGeometry(0.08, 0.15, 0.4);
        const stock = new THREE.Mesh(stockGeometry, bodyMaterial);
        stock.position.z = -0.6;
        rifleGroup.add(stock);
        
        // Magazine
        const magGeometry = new THREE.BoxGeometry(0.08, 0.25, 0.12);
        const magazine = new THREE.Mesh(magGeometry, bodyMaterial);
        magazine.position.y = -0.2;
        rifleGroup.add(magazine);
        
        // Sight
        const sightGeometry = new THREE.BoxGeometry(0.04, 0.08, 0.08);
        const sight = new THREE.Mesh(sightGeometry, bodyMaterial);
        sight.position.y = 0.12;
        sight.position.z = 0.3;
        rifleGroup.add(sight);
        
        // Handle grip
        const gripGeometry = new THREE.BoxGeometry(0.08, 0.2, 0.1);
        const grip = new THREE.Mesh(gripGeometry, bodyMaterial);
        grip.position.y = -0.1;
        grip.position.z = -0.2;
        grip.rotation.x = Math.PI / 6;
        rifleGroup.add(grip);

        return rifleGroup;
    };

    // Create arms to hold the rifle
    const createArms = () => {
        const armsGroup = new THREE.Group();
        
        // Upper arms
        const upperArmGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.12);
        const armMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.oliveGreen });
        
        // Left upper arm
        const leftUpperArm = new THREE.Mesh(upperArmGeometry, armMaterial);
        leftUpperArm.position.set(-0.3, 0, 0);
        leftUpperArm.rotation.x = -Math.PI / 4;
        armsGroup.add(leftUpperArm);
        
        // Right upper arm
        const rightUpperArm = new THREE.Mesh(upperArmGeometry, armMaterial);
        rightUpperArm.position.set(0.3, 0, 0);
        rightUpperArm.rotation.x = -Math.PI / 4;
        armsGroup.add(rightUpperArm);
        
        // Forearms
        const forearmGeometry = new THREE.BoxGeometry(0.08, 0.25, 0.1);
        
        // Left forearm
        const leftForearm = new THREE.Mesh(forearmGeometry, armMaterial);
        leftForearm.position.set(-0.3, -0.2, 0.2);
        leftForearm.rotation.x = -Math.PI / 2;
        armsGroup.add(leftForearm);
        
        // Right forearm
        const rightForearm = new THREE.Mesh(forearmGeometry, armMaterial);
        rightForearm.position.set(0.3, -0.2, 0.2);
        rightForearm.rotation.x = -Math.PI / 2;
        armsGroup.add(rightForearm);
        
        // Hands
        const handGeometry = new THREE.BoxGeometry(0.08, 0.1, 0.08);
        const handMaterial = new THREE.MeshBasicMaterial({ color: 0xE0BEAC });
        
        // Left hand
        const leftHand = new THREE.Mesh(handGeometry, handMaterial);
        leftHand.position.set(-0.3, -0.2, 0.4);
        armsGroup.add(leftHand);
        
        // Right hand
        const rightHand = new THREE.Mesh(handGeometry, handMaterial);
        rightHand.position.set(0.3, -0.2, 0.4);
        armsGroup.add(rightHand);

        return armsGroup;
    };

    // Create and add rifle and arms to aim helper
    const rifle = createM16();
    rifle.position.set(0, -0.3, 0.4); // Position rifle in front
    playerAimHelper.add(rifle);

    const arms = createArms();
    playerAimHelper.add(arms);
    
    // Head with proper proportions
    const headGeometry = new THREE.SphereGeometry(0.15, 24, 24);
    const headMaterial = new THREE.MeshBasicMaterial({ color: 0xE0BEAC });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.7;
    playerGroup.add(head);
    
    // Modern combat helmet
    const helmetGeometry = new THREE.SphereGeometry(0.18, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const helmetMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.darkGrey });
    const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
    helmet.position.y = 1.75;
    playerGroup.add(helmet);
    
    // Tactical vest with better proportions
    const vestGeometry = new THREE.BoxGeometry(0.45, 0.6, 0.25);
    const vestMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.darkGrey });
    const vest = new THREE.Mesh(vestGeometry, vestMaterial);
    vest.position.y = 1.3;
    playerGroup.add(vest);
    
    // Tactical pouches
    const pouchGeometry = new THREE.BoxGeometry(0.1, 0.15, 0.08);
    const pouchMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
    
    // Add multiple pouches
    const pouchPositions = [
        { x: -0.15, y: 1.25, z: 0.15 },
        { x: 0.15, y: 1.25, z: 0.15 },
        { x: 0, y: 1.4, z: 0.15 }
    ];
    
    pouchPositions.forEach(pos => {
        const pouch = new THREE.Mesh(pouchGeometry, pouchMaterial);
        pouch.position.set(pos.x, pos.y, pos.z);
        playerGroup.add(pouch);
    });
    
    // Upper body (under vest)
    const torsoGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.2);
    const torsoMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.oliveGreen });
    const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torso.position.y = 1.3;
    playerGroup.add(torso);
    
    // Create legs with better proportions
    const createLeg = (isLeft) => {
        const legGroup = isLeft ? leftLegGroup : rightLegGroup;
        const xOffset = isLeft ? -0.1 : 0.1;
        
        // Upper leg
        const upperLegGeometry = new THREE.BoxGeometry(0.12, 0.4, 0.15);
        const upperLegMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.oliveGreen });
        const upperLeg = new THREE.Mesh(upperLegGeometry, upperLegMaterial);
        upperLeg.position.set(xOffset, 0.8, 0);
        legGroup.add(upperLeg);
        
        // Lower leg
        const lowerLegGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.13);
        const lowerLeg = new THREE.Mesh(lowerLegGeometry, upperLegMaterial);
        lowerLeg.position.set(xOffset, 0.4, 0);
        legGroup.add(lowerLeg);
        
        // Boot
        const bootGeometry = new THREE.BoxGeometry(0.12, 0.1, 0.2);
        const bootMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
        const boot = new THREE.Mesh(bootGeometry, bootMaterial);
        boot.position.set(xOffset, 0.1, 0.02);
        legGroup.add(boot);
        
        // Knee pad
        const kneePadGeometry = new THREE.BoxGeometry(0.14, 0.12, 0.16);
        const kneePadMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
        const kneePad = new THREE.Mesh(kneePadGeometry, kneePadMaterial);
        kneePad.position.set(xOffset, 0.6, 0.02);
        legGroup.add(kneePad);
        
        return legGroup;
    };
    
    // Create both legs
    createLeg(true);  // Left leg
    createLeg(false); // Right leg
    
    // Add tactical belt
    const beltGeometry = new THREE.BoxGeometry(0.45, 0.05, 0.25);
    const beltMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
    const belt = new THREE.Mesh(beltGeometry, beltMaterial);
    belt.position.y = 1.0;
    playerGroup.add(belt);
    
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

        // Initialize synthesized sounds
        const initAudio = () => {
            if (audioListener.context.state === 'suspended') {
                audioListener.context.resume();
            }
            createSynthesizedSounds();
        };
        document.addEventListener('click', initAudio, { once: true });

        // Create renderer with improved settings
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        
        // Enable shadows based on device performance
        const performanceCheck = () => {
            // Check if the device can handle shadows
            const gl = renderer.getContext();
            const extensions = gl.getSupportedExtensions();
            const hasGoodExtensions = extensions && (
                extensions.includes('WEBGL_depth_texture') || 
                extensions.includes('WEBKIT_WEBGL_depth_texture')
            );
            
            // Check for mobile devices which might struggle with shadows
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            // Enable shadows only on capable devices
            if (hasGoodExtensions && !isMobile) {
                renderer.shadowMap.enabled = true;
                renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                return true;
            } else {
                renderer.shadowMap.enabled = false;
                return false;
            }
        };
        
        const shadowsEnabled = performanceCheck();
        document.body.appendChild(renderer.domElement);
        
        // Enhanced lighting for better scene quality
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Softer ambient light
        scene.add(ambientLight);
        
        // Add directional sunlight with shadows
        const sunLight = new THREE.DirectionalLight(0xfffaf0, 0.8); // Warm sunlight color
        sunLight.position.set(50, 100, 50);
        
        if (shadowsEnabled) {
            sunLight.castShadow = true;
            sunLight.shadow.mapSize.width = 1024;
            sunLight.shadow.mapSize.height = 1024;
            sunLight.shadow.camera.near = 0.5;
            sunLight.shadow.camera.far = 500;
            sunLight.shadow.camera.left = -100;
            sunLight.shadow.camera.right = 100;
            sunLight.shadow.camera.top = 100;
            sunLight.shadow.camera.bottom = -100;
            
            // Prevent shadow acne
            sunLight.shadow.bias = -0.001;
        }
        
        scene.add(sunLight);
        
        // Create enhanced ground with texture and detail
        const groundSize = 500;
        const groundSegments = 64; // Reduced from 128 for better performance
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, groundSegments, groundSegments);
        
        // Add terrain variations - gentle hills and dips
        const vertices = groundGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            // Skip edges for a flat boundary
            const x = vertices[i];
            const z = vertices[i + 2];
            const distanceFromCenter = Math.sqrt(x * x + z * z);
            
            if (distanceFromCenter < groundSize * 0.45) {
                // Apply simplex-like noise for natural terrain
                const xNoise = x * 0.02;
                const zNoise = z * 0.02;
                const noise = 
                    Math.sin(xNoise) * Math.cos(zNoise) * 1.5 + 
                    Math.sin(xNoise * 2.5) * Math.cos(zNoise * 2.5) * 0.8 +
                    Math.sin(xNoise * 5) * Math.cos(zNoise * 5) * 0.4;
                
                // Apply height variation, less intense farther from center
                vertices[i + 1] = noise * Math.max(0, 1 - distanceFromCenter / (groundSize * 0.45));
            }
        }
        groundGeometry.attributes.position.needsUpdate = true;
        groundGeometry.computeVertexNormals();
        
        // Create reliable ground material that works well in production
        // Using MeshBasicMaterial for better compatibility across devices
        const groundMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x2D8A27, // Brighter, more vibrant green
            side: THREE.DoubleSide
        });
        
        ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        ground.position.y = 0;
        ground.receiveShadow = shadowsEnabled;
        scene.add(ground);
        
        // Add detailed grass patches and ground foliage
        const createGrassAndFoliage = () => {
            const totalPatches = 2000; // Significantly increased from 300 for denser coverage
            
            // Create a simple grass texture using canvas
            const grassTextureCanvas = document.createElement('canvas');
            grassTextureCanvas.width = 64;
            grassTextureCanvas.height = 64;
            const ctx = grassTextureCanvas.getContext('2d');
            
            // Create grass blades
            ctx.clearRect(0, 0, 64, 64);
            ctx.fillStyle = 'rgba(0, 0, 0, 0)'; // Transparent background
            ctx.fillRect(0, 0, 64, 64);
            
            // Draw grass blades
            for (let i = 0; i < 15; i++) {
                const x = 32 + (Math.random() * 30 - 15);
                const width = 1 + Math.random() * 2;
                const height = 20 + Math.random() * 30;
                
                // Randomize grass blade color
                const r = 50 + Math.random() * 40;
                const g = 120 + Math.random() * 70;
                const b = 30 + Math.random() * 40;
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                
                // Draw blade
                ctx.beginPath();
                ctx.moveTo(x, 64);
                ctx.quadraticCurveTo(
                    x + (Math.random() * 10 - 5), // Control point x
                    64 - height * 0.5,           // Control point y
                    x + (Math.random() * 6 - 3),  // End point x
                    64 - height                  // End point y
                );
                ctx.lineTo(x + width, 64 - height);
                ctx.quadraticCurveTo(
                    x + width + (Math.random() * 10 - 5), // Control point x
                    64 - height * 0.5,                   // Control point y
                    x + width, 64                        // End point x/y
                );
                ctx.closePath();
                ctx.fill();
            }
            
            const grassTexture = new THREE.CanvasTexture(grassTextureCanvas);
            
            // Create additional ground cover textures
            const createFlowerTexture = (color1, color2) => {
                const canvas = document.createElement('canvas');
                canvas.width = 64;
                canvas.height = 64;
                const context = canvas.getContext('2d');
                
                context.clearRect(0, 0, 64, 64);
                context.fillStyle = 'rgba(0, 0, 0, 0)';
                context.fillRect(0, 0, 64, 64);
                
                // Draw stems
                for (let i = 0; i < 3; i++) {
                    const x = 20 + i * 10 + (Math.random() * 6 - 3);
                    const stemHeight = 25 + Math.random() * 20;
                    
                    context.beginPath();
                    context.moveTo(x, 64);
                    context.lineTo(x, 64 - stemHeight);
                    context.lineWidth = 1 + Math.random();
                    context.strokeStyle = `rgb(60, ${100 + Math.random() * 50}, 60)`;
                    context.stroke();
                    
                    // Draw flower
                    context.beginPath();
                    context.arc(x, 64 - stemHeight, 4 + Math.random() * 4, 0, Math.PI * 2);
                    context.fillStyle = color1;
                    context.fill();
                    
                    // Draw flower center
                    context.beginPath();
                    context.arc(x, 64 - stemHeight, 2, 0, Math.PI * 2);
                    context.fillStyle = color2;
                    context.fill();
                }
                
                return new THREE.CanvasTexture(canvas);
            };
            
            // Create various ground cover textures
            const whiteFlowerTexture = createFlowerTexture('rgb(255, 255, 255)', 'rgb(255, 255, 150)');
            const yellowFlowerTexture = createFlowerTexture('rgb(255, 255, 150)', 'rgb(255, 150, 0)');
            const purpleFlowerTexture = createFlowerTexture('rgb(200, 150, 255)', 'rgb(100, 50, 150)');
            
            // Different types of ground cover
            const textures = [
                { texture: grassTexture, scale: 1.0, probability: 0.7 },
                { texture: whiteFlowerTexture, scale: 0.7, probability: 0.1 },
                { texture: yellowFlowerTexture, scale: 0.8, probability: 0.1 },
                { texture: purpleFlowerTexture, scale: 0.6, probability: 0.1 }
            ];
            
            // Create and distribute grass/flower patches
            for (let i = 0; i < totalPatches; i++) {
                // Get random position with higher concentration in certain areas
                let x, z;
                const placeInCluster = Math.random() < 0.7; // 70% in clusters
                
                if (placeInCluster) {
                    // Create cluster centers
                    const clusterCount = 8;
                    const clusterIndex = Math.floor(Math.random() * clusterCount);
                    const angle = (clusterIndex / clusterCount) * Math.PI * 2;
                    const clusterDistance = 50 + Math.random() * 150;
                    const clusterX = Math.cos(angle) * clusterDistance;
                    const clusterZ = Math.sin(angle) * clusterDistance;
                    
                    // Position within cluster
                    const radius = 20 + Math.random() * 30;
                    const localAngle = Math.random() * Math.PI * 2;
                    const localDistance = Math.random() * radius;
                    
                    x = clusterX + Math.cos(localAngle) * localDistance;
                    z = clusterZ + Math.sin(localAngle) * localDistance;
                } else {
                    // Random position
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 20 + Math.random() * 230;
                    x = Math.cos(angle) * distance;
                    z = Math.sin(angle) * distance;
                }
                
                // Get height at position by sampling ground geometry
                let y = 0;
                const sampleX = (x / groundSize) * 2;
                const sampleZ = (z / groundSize) * 2;
                
                // Approximate height
                y = Math.sin(sampleX * Math.PI * 2) * Math.cos(sampleZ * Math.PI * 2) * 1.5 +
                    Math.sin(sampleX * Math.PI * 5) * Math.cos(sampleZ * Math.PI * 5) * 0.5;
                
                // Choose texture type based on probability
                let textureInfo;
                const rand = Math.random();
                let cumProb = 0;
                
                for (const info of textures) {
                    cumProb += info.probability;
                    if (rand <= cumProb) {
                        textureInfo = info;
                        break;
                    }
                }
                
                if (!textureInfo) textureInfo = textures[0]; // Default to grass
                
                // Create grass/flower patch
                const size = (1 + Math.random() * 1.5) * textureInfo.scale;
                const patchGeometry = new THREE.PlaneGeometry(size, size);
                const patchMaterial = new THREE.MeshBasicMaterial({
                    map: textureInfo.texture,
                    transparent: true,
                    alphaTest: 0.5,
                    side: THREE.DoubleSide
                });
                
                const patch = new THREE.Mesh(patchGeometry, patchMaterial);
                patch.position.set(x, y + 0.05, z);
                patch.rotation.x = -Math.PI / 2;
                patch.rotation.z = Math.random() * Math.PI * 2;
                
                scene.add(patch);
            }
            
            // Create larger ferns and bushes for additional ground cover
            const createFern = (x, z) => {
                const fernGroup = new THREE.Group();
                const stemCount = 5 + Math.floor(Math.random() * 5);
                const fernHeight = 0.5 + Math.random() * 1.0;
                
                // Get height at position
                let y = 0;
                const sampleX = (x / groundSize) * 2;
                const sampleZ = (z / groundSize) * 2;
                
                // Approximate height
                y = Math.sin(sampleX * Math.PI * 2) * Math.cos(sampleZ * Math.PI * 2) * 1.5 +
                    Math.sin(sampleX * Math.PI * 5) * Math.cos(sampleZ * Math.PI * 5) * 0.5;
                
                // Create each stem
                for (let i = 0; i < stemCount; i++) {
                    const stemGeometry = new THREE.PlaneGeometry(
                        0.1 + Math.random() * 0.3,
                        fernHeight * (0.6 + Math.random() * 0.4)
                    );
                    
                    // Green color with variation
                    const r = 30 + Math.random() * 30;
                    const g = 100 + Math.random() * 50;
                    const b = 30 + Math.random() * 30;
                    
                    const stemMaterial = new THREE.MeshBasicMaterial({
                        color: new THREE.Color(`rgb(${r}, ${g}, ${b})`),
                        side: THREE.DoubleSide
                    });
                    
                    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
                    
                    // Position around center
                    const angle = (i / stemCount) * Math.PI * 2 + (Math.random() * 0.5 - 0.25);
                    const distance = Math.random() * 0.2;
                    stem.position.x = Math.cos(angle) * distance;
                    stem.position.z = Math.sin(angle) * distance;
                    stem.position.y = fernHeight / 2;
                    
                    // Rotate outward
                    stem.rotation.y = angle;
                    stem.rotation.x = Math.random() * 0.3 - 0.15;
                    
                    fernGroup.add(stem);
                }
                
                fernGroup.position.set(x, y, z);
                scene.add(fernGroup);
            };
            
            // Create bushes
            const createBush = (x, z) => {
                const bushGroup = new THREE.Group();
                
                // Get height at position
                let y = 0;
                const sampleX = (x / groundSize) * 2;
                const sampleZ = (z / groundSize) * 2;
                
                // Approximate height
                y = Math.sin(sampleX * Math.PI * 2) * Math.cos(sampleZ * Math.PI * 2) * 1.5 +
                    Math.sin(sampleX * Math.PI * 5) * Math.cos(sampleZ * Math.PI * 5) * 0.5;
                
                // Bush size
                const bushSize = 0.8 + Math.random() * 1.2;
                
                // Create bush from multiple spheres
                const sphereCount = 3 + Math.floor(Math.random() * 4);
                for (let i = 0; i < sphereCount; i++) {
                    const sphereGeometry = new THREE.SphereGeometry(
                        bushSize * (0.6 + Math.random() * 0.4),
                        6, 6
                    );
                    
                    // Green color with variation - ensure values are integers between 0-255
                    const r = Math.floor(20 + Math.random() * 30);
                    const g = Math.floor(80 + Math.random() * 60);
                    const b = Math.floor(20 + Math.random() * 30);
                    
                    const sphereMaterial = new THREE.MeshBasicMaterial({
                        color: new THREE.Color(r/255, g/255, b/255)
                    });
                    
                    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
                    
                    // Position randomly within bush bounds
                    sphere.position.x = (Math.random() * 0.6 - 0.3) * bushSize;
                    sphere.position.z = (Math.random() * 0.6 - 0.3) * bushSize;
                    sphere.position.y = bushSize * 0.6 + (Math.random() * 0.4 - 0.2) * bushSize;
                    
                    // Scale randomly for variety
                    sphere.scale.x = 0.8 + Math.random() * 0.4;
                    sphere.scale.y = 0.8 + Math.random() * 0.4;
                    sphere.scale.z = 0.8 + Math.random() * 0.4;
                    
                    bushGroup.add(sphere);
                }
                
                bushGroup.position.set(x, y, z);
                return bushGroup;
            };
            
            // Add ferns and bushes
            const fernCount = 50;
            const bushCount = 30;
            
            for (let i = 0; i < fernCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = 30 + Math.random() * 150;
                const x = Math.cos(angle) * distance;
                const z = Math.sin(angle) * distance;
                
                createFern(x, z);
            }
            
            for (let i = 0; i < bushCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = 40 + Math.random() * 150;
                const x = Math.cos(angle) * distance;
                const z = Math.sin(angle) * distance;
                
                createBush(x, z);
            }
        };
        
        // Create all the grass and ground foliage
        createGrassAndFoliage();
        
        // Create a simple atmospheric effect
        const createAtmosphericEffect = () => {
            // Distant fog mountains for depth
            const mountainGeometry = new THREE.PlaneGeometry(1000, 100);
            const mountainMaterial = new THREE.MeshBasicMaterial({
                color: 0x8FAFC5, // Foggy blue-gray
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide
            });
            
            // Create a ring of mountains around the scene
            const mountainCount = 12;
            for (let i = 0; i < mountainCount; i++) {
                const angle = (i / mountainCount) * Math.PI * 2;
                const distance = 300;
                
                const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
                mountain.position.set(
                    Math.cos(angle) * distance,
                    30, // Height above ground
                    Math.sin(angle) * distance
                );
                
                // Face inward
                mountain.rotation.y = angle;
                
                scene.add(mountain);
            }
        };
        
        // Add atmospheric elements
        createAtmosphericEffect();
        
        // Create player group
        player = new THREE.Group();
        // Position player near the military base (280 units at 45 degrees)
        const baseDistance = 260; // Slightly closer to the base
        const baseAngle = Math.PI / 4; // 45 degrees
        player.position.set(
            Math.cos(baseAngle) * baseDistance,
            1,
            Math.sin(baseAngle) * baseDistance
        );
        scene.add(player);
        
        // Create player body
        playerBody = createHumanoidMesh();
        player.add(playerBody);
        
        // Create the forest using the new system
        createForest();
        
        // Add the walls
        createMapWalls();
        
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
        // Create raycaster for accurate shooting
        const raycaster = new THREE.Raycaster();
        const shootDirection = new THREE.Vector3(0, 0, -1);
        shootDirection.applyEuler(playerAimHelper.rotation);
        raycaster.set(playerAimHelper.position, shootDirection);

        // Check for intersections with objects
        const intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
            const hit = intersects[0];
            
            // Create bullet hole
            const bulletHoleGeometry = new THREE.CircleGeometry(0.05, 16);
            const bulletHoleMaterial = new THREE.MeshBasicMaterial({
                color: 0x000000,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
            });
            const bulletHole = new THREE.Mesh(bulletHoleGeometry, bulletHoleMaterial);

            // Position bullet hole slightly above the surface to prevent z-fighting
            const offset = 0.001;
            bulletHole.position.copy(hit.point);
            bulletHole.position.add(hit.normal.multiplyScalar(offset));
            
            // Orient bullet hole to face the correct direction
            bulletHole.lookAt(hit.point.clone().add(hit.normal));

            scene.add(bulletHole);
            bulletHoles.push(bulletHole);

            // Remove oldest bullet hole if we exceed the maximum
            if (bulletHoles.length > maxBulletHoles) {
                const oldestHole = bulletHoles.shift();
                scene.remove(oldestHole);
            }

            // Create impact effect
            const impactGeometry = new THREE.SphereGeometry(0.05, 8, 8);
            const impactMaterial = new THREE.MeshBasicMaterial({
                color: 0xFFFF00,
                transparent: true,
                opacity: 0.8
            });
            const impact = new THREE.Mesh(impactGeometry, impactMaterial);
            impact.position.copy(hit.point);
            scene.add(impact);
            impactEffects.push({
                mesh: impact,
                created: Date.now()
            });

            // Play ricochet sound if loaded
            if (ricochetSound && !ricochetSound.isPlaying) {
                ricochetSound.play();
            }
        }

        // Create visible bullet trail
        const bulletGeometry = new THREE.SphereGeometry(0.02, 8, 8);
        const bulletMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFD700,
            transparent: true,
            opacity: 0.8
        });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        // Position bullet at gun position
        bullet.position.copy(playerAimHelper.position);
        
        scene.add(bullet);
        
        // Add bullet data for movement
        bullets.push({
            mesh: bullet,
            direction: shootDirection.clone(),
            speed: 2.0, // Increased bullet speed
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
    // Update bullet positions
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

    // Update impact effects
    const currentTime = Date.now();
    for (let i = impactEffects.length - 1; i >= 0; i--) {
        const effect = impactEffects[i];
        const age = currentTime - effect.created;
        
        // Fade out impact effect
        if (age < 500) {
            effect.mesh.material.opacity = 0.8 * (1 - age / 500);
            effect.mesh.scale.multiplyScalar(1.05);
        } else {
            scene.remove(effect.mesh);
            impactEffects.splice(i, 1);
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
    
    // Leg animation
    if (direction.length() > 0.1) {
        // Calculate animation time based on movement
        legAnimationTime += Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z) * LEG_SWING_SPEED;
        
        // Find leg groups
        const leftLeg = player.children.find(child => child === player.children[0]); // First child is leftLegGroup
        const rightLeg = player.children.find(child => child === player.children[1]); // Second child is rightLegGroup
        
        if (leftLeg && rightLeg) {
            // Animate legs in opposite phases
            leftLeg.rotation.x = Math.sin(legAnimationTime) * MAX_LEG_ROTATION;
            rightLeg.rotation.x = Math.sin(legAnimationTime + Math.PI) * MAX_LEG_ROTATION;
            
            // Add slight side-to-side motion
            leftLeg.rotation.z = Math.cos(legAnimationTime) * MAX_LEG_ROTATION * 0.3;
            rightLeg.rotation.z = Math.cos(legAnimationTime + Math.PI) * MAX_LEG_ROTATION * 0.3;
        }
    } else {
        // Reset legs to standing position
        const leftLeg = player.children.find(child => child === player.children[0]);
        const rightLeg = player.children.find(child => child === player.children[1]);
        
        if (leftLeg && rightLeg) {
            leftLeg.rotation.x = 0;
            leftLeg.rotation.z = 0;
            rightLeg.rotation.x = 0;
            rightLeg.rotation.z = 0;
        }
    }
    
    renderer.render(scene, camera);
}

// Create a fallback gunshot sound using oscillator if loading fails
function createFallbackGunshotSound() {
    console.log('Creating fallback gunshot sound');
    
    try {
        // Create a simple oscillator-based gunshot sound
        const context = audioListener.context;
        const sampleRate = context.sampleRate;
        const duration = 0.3;
        const bufferSize = Math.floor(sampleRate * duration);
        const buffer = context.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate a simple gunshot waveform
        for (let i = 0; i < bufferSize; i++) {
            const t = i / sampleRate;
            let sample = 0;
            
            if (t < 0.01) {
                sample = t / 0.01;
            } else if (t < 0.05) {
                sample = 1 - ((t - 0.01) / 0.04);
            } else {
                sample = 0.5 * Math.exp(-(t - 0.05) * 10);
            }
            
            sample *= (0.5 + Math.random() * 0.5);
            
            if (i > 0 && i < bufferSize - 1) {
                sample = 0.7 * sample + 0.15 * data[i-1] + 0.15 * (Math.random() - 0.5);
            }
            
            data[i] = Math.max(-1, Math.min(1, sample * 0.8));
        }
        
        // Create a new audio with the buffer
        if (gunshotSound && typeof gunshotSound.disconnect === 'function') {
            gunshotSound.disconnect();
        }
        
        gunshotSound = new THREE.Audio(audioListener);
        gunshotSound.setBuffer(buffer);
        gunshotSound.setVolume(0.8);
        gunshotSoundLoaded = true;
        console.log('Fallback gunshot sound created successfully');
    } catch (error) {
        console.warn('Error creating fallback sound:', error);
        gunshotSoundLoaded = false;
    }
}

// Create middle eastern style walls
function createMapWalls() {
    const wallHeight = 20;
    const mapSize = 500; // Match the ground size
    const wallThickness = 2;
    
    // Create wall texture using canvas for detailed brick pattern
    const wallTextureCanvas = document.createElement('canvas');
    wallTextureCanvas.width = 512;
    wallTextureCanvas.height = 512;
    const ctx = wallTextureCanvas.getContext('2d');
    
    // Base tan color
    ctx.fillStyle = '#D4BC8B';
    ctx.fillRect(0, 0, 512, 512);
    
    // Draw brick pattern
    ctx.fillStyle = '#C1A87C';
    for (let y = 0; y < 512; y += 32) {
        const offset = (y % 64 === 0) ? 0 : 32; // Offset alternate rows
        for (let x = offset; x < 512; x += 64) {
            ctx.fillRect(x, y, 60, 28);
            // Add darker grout lines
            ctx.fillStyle = '#A69372';
            ctx.fillRect(x - 2, y - 2, 64, 4);
            ctx.fillRect(x - 2, y - 2, 4, 32);
            ctx.fillStyle = '#C1A87C';
        }
    }
    
    // Add noise for texture variation
    const imageData = ctx.getImageData(0, 0, 512, 512);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 20;
        data[i] += noise;     // r
        data[i + 1] += noise; // g
        data[i + 2] += noise; // b
    }
    ctx.putImageData(imageData, 0, 0);
    
    const wallTexture = new THREE.CanvasTexture(wallTextureCanvas);
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(8, 2); // Adjust for proper brick scaling
    
    // Create wall material with bump mapping for depth
    const wallMaterial = new THREE.MeshPhongMaterial({
        map: wallTexture,
        bumpMap: wallTexture,
        bumpScale: 0.2,
        color: 0xffffff,
        specular: 0x222222,
        shininess: 5
    });
    
    // Create decorative top piece geometry
    const createTopDecoration = (length) => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(0, 2);
        // Create crenellations
        for (let i = 0; i < length; i += 4) {
            shape.lineTo(i, 2);
            shape.lineTo(i, 3);
            shape.lineTo(i + 2, 3);
            shape.lineTo(i + 2, 2);
        }
        shape.lineTo(length, 2);
        shape.lineTo(length, 0);
        return new THREE.ShapeGeometry(shape);
    };
    
    // Create walls
    const walls = [];
    const wallPositions = [
        { pos: [0, wallHeight/2, mapSize/2], rot: [0, 0, 0], size: [mapSize, wallHeight, wallThickness] },
        { pos: [0, wallHeight/2, -mapSize/2], rot: [0, 0, 0], size: [mapSize, wallHeight, wallThickness] },
        { pos: [mapSize/2, wallHeight/2, 0], rot: [0, Math.PI/2, 0], size: [mapSize, wallHeight, wallThickness] },
        { pos: [-mapSize/2, wallHeight/2, 0], rot: [0, Math.PI/2, 0], size: [mapSize, wallHeight, wallThickness] }
    ];
    
    wallPositions.forEach(wallData => {
        // Main wall
        const wallGeometry = new THREE.BoxGeometry(...wallData.size);
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(...wallData.pos);
        wall.rotation.set(...wallData.rot);
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
        walls.push(wall);
        
        // Top decoration
        const topDecoration = new THREE.Mesh(
            createTopDecoration(wallData.size[0]),
            wallMaterial
        );
        topDecoration.position.set(
            wallData.pos[0] - wallData.size[0]/2,
            wallData.pos[1] + wallData.size[1]/2,
            wallData.pos[2]
        );
        topDecoration.rotation.set(...wallData.rot);
        scene.add(topDecoration);
        
        // Add arch details every 50 units
        const archCount = Math.floor(wallData.size[0] / 50);
        for (let i = 0; i < archCount; i++) {
            const archDepth = 1;
            const archWidth = 6;
            const archHeight = 10;
            
            // Create arch shape
            const archShape = new THREE.Shape();
            archShape.moveTo(0, 0);
            archShape.lineTo(0, archHeight - archWidth/2);
            archShape.absarc(archWidth/2, archHeight - archWidth/2, archWidth/2, Math.PI, 0, true);
            archShape.lineTo(archWidth, 0);
            
            const archGeometry = new THREE.ShapeGeometry(archShape);
            const arch = new THREE.Mesh(archGeometry, wallMaterial);
            
            // Position arch along wall
            const offset = -wallData.size[0]/2 + (i + 0.5) * (wallData.size[0]/archCount);
            arch.position.set(
                wallData.pos[0] + (wallData.rot[1] ? 0 : offset),
                wallData.pos[1] - wallData.size[1]/2,
                wallData.pos[2] + (wallData.rot[1] ? offset : 0)
            );
            arch.rotation.set(...wallData.rot);
            
            // Add depth to arch
            const archExtrusion = new THREE.ExtrudeGeometry(archShape, {
                depth: archDepth,
                bevelEnabled: false
            });
            const archWithDepth = new THREE.Mesh(archExtrusion, wallMaterial);
            archWithDepth.position.copy(arch.position);
            archWithDepth.rotation.copy(arch.rotation);
            
            // Adjust position to align with wall
            if (wallData.rot[1]) {
                archWithDepth.position.z -= archDepth/2;
            } else {
                archWithDepth.position.x -= archDepth/2;
            }
            
            scene.add(archWithDepth);
        }
    });
}

// Create all synthesized sounds
function createSynthesizedSounds() {
    createFallbackGunshotSound();
    createSynthesizedRicochetSound();
    createSynthesizedReloadSound();
}

// Create synthesized ricochet sound
function createSynthesizedRicochetSound() {
    try {
        const context = audioListener.context;
        const sampleRate = context.sampleRate;
        const duration = 0.2;
        const bufferSize = Math.floor(sampleRate * duration);
        const buffer = context.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate a metallic ping sound
        for (let i = 0; i < bufferSize; i++) {
            const t = i / sampleRate;
            const frequency = 2000 + Math.exp(-t * 20) * 3000;
            let sample = Math.sin(t * frequency * Math.PI * 2);
            sample *= Math.exp(-t * 15);
            data[i] = sample * 0.5;
        }
        
        ricochetSound = new THREE.Audio(audioListener);
        ricochetSound.setBuffer(buffer);
        ricochetSound.setVolume(0.4);
    } catch (error) {
        console.warn('Error creating ricochet sound:', error);
    }
}

// Create synthesized reload sound
function createSynthesizedReloadSound() {
    try {
        const context = audioListener.context;
        const sampleRate = context.sampleRate;
        const duration = 0.4;
        const bufferSize = Math.floor(sampleRate * duration);
        const buffer = context.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate a mechanical click sound
        for (let i = 0; i < bufferSize; i++) {
            const t = i / sampleRate;
            let sample = 0;
            
            if (t < 0.1) {
                // Initial click
                sample = Math.random() * 2 - 1;
                sample *= Math.exp(-t * 100);
            } else if (t > 0.2 && t < 0.3) {
                // Second mechanical sound
                sample = Math.random() * 2 - 1;
                sample *= Math.exp(-(t - 0.2) * 80);
            }
            
            data[i] = sample * 0.6;
        }
        
        reloadSound = new THREE.Audio(audioListener);
        reloadSound.setBuffer(buffer);
        reloadSound.setVolume(0.5);
    } catch (error) {
        console.warn('Error creating reload sound:', error);
    }
} 