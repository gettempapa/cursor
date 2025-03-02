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
    
    // Military camo colors
    const camoColors = {
        darkGreen: 0x4B5320,
        lightGreen: 0x6B8E23,
        tan: 0x8B7E66,
        brown: 0x654321
    };
    
    // Body parts
    // Head (sphere)
    const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const headMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700 }); // Yellow face
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.5;
    playerGroup.add(head);
    
    // Helmet
    const helmetGeometry = new THREE.SphereGeometry(0.27, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const helmetMaterial = new THREE.MeshBasicMaterial({ color: camoColors.darkGreen }); // Camo green
    const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
    helmet.position.y = 1.55; // Slightly above head
    playerGroup.add(helmet);
    
    // Body (box) - camo torso
    const bodyGeometry = new THREE.BoxGeometry(0.5, 0.7, 0.25);
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: camoColors.lightGreen }); // Camo green
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.0;
    playerGroup.add(body);
    
    // Create left arm group for positioning
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.3, 1.1, 0.05);
    // Rotate left arm slightly to support the gun
    leftArmGroup.rotation.x = Math.PI * 0.1; // Tilt forward
    leftArmGroup.rotation.z = -Math.PI * 0.1; // Angle inward
    playerGroup.add(leftArmGroup);
    
    // Left arm - match the camo pattern
    const leftArmGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
    const leftArmMaterial = new THREE.MeshBasicMaterial({ color: camoColors.lightGreen }); // Camo green
    const leftArm = new THREE.Mesh(leftArmGeometry, leftArmMaterial);
    leftArm.position.set(0, -0.2, 0); // Position within the group
    leftArmGroup.add(leftArm);
    
    // Create right arm group for positioning
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.3, 1.1, 0.1);
    // Rotate right arm to hold the gun
    rightArmGroup.rotation.x = Math.PI * 0.1; // Tilt forward
    rightArmGroup.rotation.z = Math.PI * 0.1; // Angle inward
    playerAimHelper.add(rightArmGroup);
    
    // Right arm (will hold the gun) - match the camo pattern
    const rightArmGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
    const rightArmMaterial = new THREE.MeshBasicMaterial({ color: camoColors.lightGreen }); // Camo green
    const rightArm = new THREE.Mesh(rightArmGeometry, rightArmMaterial);
    rightArm.position.set(0, -0.2, 0); // Position within the group
    rightArmGroup.add(rightArm);
    
    // Legs - camo pants
    const legGeometry = new THREE.BoxGeometry(0.2, 0.5, 0.2);
    const legMaterial = new THREE.MeshBasicMaterial({ color: camoColors.tan }); // Tan camo
    
    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.15, 0.45, 0);
    playerGroup.add(leftLeg);
    
    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.15, 0.45, 0);
    playerGroup.add(rightLeg);
    
    // Boots
    const bootGeometry = new THREE.BoxGeometry(0.22, 0.2, 0.25); // Slightly larger than legs
    const bootMaterial = new THREE.MeshBasicMaterial({ color: 0x271A0A }); // Dark brown
    
    // Left boot
    const leftBoot = new THREE.Mesh(bootGeometry, bootMaterial);
    leftBoot.position.set(-0.15, 0.1, 0.02); // Position at bottom of leg
    playerGroup.add(leftBoot);
    
    // Right boot
    const rightBoot = new THREE.Mesh(bootGeometry, bootMaterial);
    rightBoot.position.set(0.15, 0.1, 0.02); // Position at bottom of leg
    playerGroup.add(rightBoot);
    
    // Add camo details (patches/spots) to make the outfit more visually interesting
    addCamoPatches(body, camoColors);
    addCamoPatches(leftArm, camoColors);
    addCamoPatches(rightArm, camoColors);
    addCamoPatches(leftLeg, camoColors);
    addCamoPatches(rightLeg, camoColors);
    
    // Create a realistic rifle
    const gunGroup = new THREE.Group();
    
    // Main rifle body (longer and thinner)
    const rifleBodyGeometry = new THREE.BoxGeometry(0.06, 0.06, 0.8);
    const gunMaterial = new THREE.MeshBasicMaterial({ color: 0x111111 }); // Dark gray/black
    const rifleBody = new THREE.Mesh(rifleBodyGeometry, gunMaterial);
    gunGroup.add(rifleBody);
    
    // Rifle stock (behind the main body)
    const stockGeometry = new THREE.BoxGeometry(0.05, 0.1, 0.2);
    const stockMaterial = new THREE.MeshBasicMaterial({ color: 0x3D2817 }); // Brown wood color
    const stock = new THREE.Mesh(stockGeometry, stockMaterial);
    stock.position.set(0, -0.02, 0.4); // Position behind the main body
    gunGroup.add(stock);
    
    // Rifle grip near the trigger
    const gripGeometry = new THREE.BoxGeometry(0.06, 0.15, 0.06);
    const grip = new THREE.Mesh(gripGeometry, stockMaterial);
    grip.position.set(0, -0.1, 0.2); // Position under the rifle
    gunGroup.add(grip);
    
    // Rifle magazine
    const magazineGeometry = new THREE.BoxGeometry(0.06, 0.12, 0.08);
    const magazineMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 }); // Slightly lighter black
    const magazine = new THREE.Mesh(magazineGeometry, magazineMaterial);
    magazine.position.set(0, -0.09, 0.1); // Position under the rifle
    gunGroup.add(magazine);
    
    // Small barrel detail at the front
    const barrelGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8);
    const barrel = new THREE.Mesh(barrelGeometry, gunMaterial);
    barrel.rotation.x = Math.PI / 2; // Rotate to align with rifle
    barrel.position.set(0, 0, -0.45); // Position at front of rifle
    gunGroup.add(barrel);
    
    // Position the entire gun between the hands
    gunGroup.position.set(0, -0.1, 0.3);
    // Rotate gun to point forward
    gunGroup.rotation.y = Math.PI;
    
    // Create a connector between left arm and gun
    leftArmGroup.add(gunGroup);
    
    // Add visual aim indicator
    const aimGeometry = new THREE.BoxGeometry(0.01, 0.01, 0.4);
    const aimMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 }); // Red
    const aimIndicator = new THREE.Mesh(aimGeometry, aimMaterial);
    aimIndicator.position.set(0, 0, -0.6); // Position in front of gun
    gunGroup.add(aimIndicator);
    
    return playerGroup;
}

// Function to add camo patches to an object
function addCamoPatches(object, camoColors) {
    // Can't actually add detailed camo texture in this simple setup,
    // but we can at least change the color to simulate the effect
    const randomCamo = Math.random();
    if (randomCamo > 0.5) {
        object.material.color.setHex(
            randomCamo > 0.75 ? camoColors.brown : camoColors.darkGreen
        );
    }
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
        
        // Position bullet at gun tip
        // Use the player's position + offset for gun position
        bullet.position.copy(player.position);
        bullet.position.y += 1.2; // Shoulder height
        
        // Set bullet direction based on player and aim direction
        const bulletDirection = new THREE.Vector3(0, 0, -1);
        bulletDirection.applyQuaternion(playerAimHelper.quaternion);
        bulletDirection.applyQuaternion(player.quaternion);
        
        // Store bullet data
        const bulletData = {
            mesh: bullet,
            direction: bulletDirection,
            speed: 0.5,
            distance: 0,
            maxDistance: 100
        };
        
        // Move bullet slightly forward to avoid collision with player
        bullet.position.add(bulletDirection.clone().multiplyScalar(0.6));
        
        scene.add(bullet);
        bullets.push(bulletData);
        
        // Add muzzle flash effect
        const flashGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFF00,
            transparent: true,
            opacity: 1
        });
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(bullet.position);
        scene.add(flash);
        
        // Remove flash after short time
        setTimeout(() => {
            scene.remove(flash);
        }, 50);
        
    } catch (error) {
        console.error('Error in shoot function:', error);
    }
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