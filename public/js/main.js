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
    const trunkMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x5D4037,   // Rich brown
        roughness: 0.8,
        metalness: 0.1,
        flatShading: true
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2; // Position based on trunk height
    trunk.rotation.x = Math.sin(tiltDirection) * tiltAmount;
    trunk.rotation.z = Math.cos(tiltDirection) * tiltAmount;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
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
        
        const foliageMaterial = new THREE.MeshStandardMaterial({ 
            color: color,
            roughness: 0.8,
            metalness: 0.1,
            flatShading: true
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
        
        // Enable shadows
        foliage.castShadow = true;
        foliage.receiveShadow = true;
        
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
    
    // Body parts
    // Head (sphere)
    const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700 }); // Yellow
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.5;
    head.castShadow = true;
    playerGroup.add(head);
    
    // Helmet
    const helmetGeometry = new THREE.SphereGeometry(0.27, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const helmetMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 }); // Dark gray
    const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
    helmet.position.y = 1.55; // Slightly above head
    helmet.castShadow = true;
    playerGroup.add(helmet);
    
    // Body (box)
    const bodyGeometry = new THREE.BoxGeometry(0.5, 0.7, 0.25);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x1E88E5 }); // Blue
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.0;
    body.castShadow = true;
    playerGroup.add(body);
    
    // Left arm
    const leftArmGeometry = new THREE.BoxGeometry(0.15, 0.6, 0.15);
    const leftArmMaterial = new THREE.MeshStandardMaterial({ color: 0x1E88E5 }); // Blue
    const leftArm = new THREE.Mesh(leftArmGeometry, leftArmMaterial);
    leftArm.position.set(-0.325, 1.0, 0); // Left of body
    leftArm.castShadow = true;
    playerGroup.add(leftArm);
    
    // Right arm (will hold the gun)
    const rightArmGeometry = new THREE.BoxGeometry(0.15, 0.6, 0.15);
    const rightArmMaterial = new THREE.MeshStandardMaterial({ color: 0x1E88E5 }); // Blue
    const rightArm = new THREE.Mesh(rightArmGeometry, rightArmMaterial);
    rightArm.position.set(0.35, 1.0, 0); // Right of body, adjusted for aim helper
    rightArm.castShadow = true;
    playerAimHelper.add(rightArm); // Attach to aim helper so it moves with aiming
    
    // Legs
    const legGeometry = new THREE.BoxGeometry(0.2, 0.7, 0.2);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x212121 }); // Dark gray
    
    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.15, 0.35, 0);
    leftLeg.castShadow = true;
    playerGroup.add(leftLeg);
    
    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.15, 0.35, 0);
    rightLeg.castShadow = true;
    playerGroup.add(rightLeg);
    
    // Add a gun to the right hand
    const gunGroup = new THREE.Group();
    
    // Gun body
    const gunBodyGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.5);
    const gunMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 }); // Dark gray
    const gunBody = new THREE.Mesh(gunBodyGeometry, gunMaterial);
    gunBody.castShadow = true;
    gunGroup.add(gunBody);
    
    // Gun handle
    const gunHandleGeometry = new THREE.BoxGeometry(0.08, 0.2, 0.08);
    const gunHandle = new THREE.Mesh(gunHandleGeometry, gunMaterial);
    gunHandle.position.set(0, -0.14, 0.05);
    gunHandle.castShadow = true;
    gunGroup.add(gunHandle);
    
    // Position gun in hand
    gunGroup.position.set(0, 0, -0.3);
    rightArm.add(gunGroup);
    
    // Add visual aim indicator
    const aimGeometry = new THREE.BoxGeometry(0.01, 0.01, 0.4);
    const aimMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 }); // Red
    const aimIndicator = new THREE.Mesh(aimGeometry, aimMaterial);
    aimIndicator.position.set(0, 0, -0.4); // Position in front of gun
    gunGroup.add(aimIndicator);
    
    return playerGroup;
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
        
        // Add some atmospheric fog for depth
        scene.fog = new THREE.FogExp2(0x8FBCD4, 0.008);
        
        // Create camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Create renderer with improved settings
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(renderer.domElement);
        
        // Improved lighting for forest
        const ambientLight = new THREE.AmbientLight(0xCCDDFF, 0.4); // Blueish ambient light
        scene.add(ambientLight);
        
        // Main directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xFFFFDD, 1.0);
        directionalLight.position.set(10, 30, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -30;
        directionalLight.shadow.camera.right = 30;
        directionalLight.shadow.camera.top = 30;
        directionalLight.shadow.camera.bottom = -30;
        scene.add(directionalLight);
        
        // Softer fill light from opposite direction
        const fillLight = new THREE.DirectionalLight(0x8899AA, 0.3);
        fillLight.position.set(-5, 10, -5);
        scene.add(fillLight);
        
        // Create ground with better texture
        const groundGeometry = new THREE.PlaneGeometry(500, 500);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2D572C, // Darker grass
            roughness: 0.9, 
            metalness: 0.0,
            flatShading: true
        });
        ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        ground.position.y = 0;
        ground.receiveShadow = true;
        scene.add(ground);
        
        // Create player
        player = new THREE.Group();
        player.position.set(0, 1, 0); // Start at origin, slightly above ground
        scene.add(player);
        
        // Create player body
        playerBody = createHumanoidMesh();
        player.add(playerBody);
        
        // Create helper for aiming direction
        playerAimHelper = new THREE.Group();
        playerAimHelper.position.y = 1.2; // Position at shoulder height
        player.add(playerAimHelper);
        
        // Create a dense forest by placing trees in a more natural pattern
        
        // 1. A small clearing around the player spawn
        const clearingRadius = 15;
        
        // 2. Dense forest area (100-150 trees)
        const forestRadius = 120; // Larger radius for the forest
        const treeCount = 120 + Math.floor(Math.random() * 30); // 120-150 trees
        
        // Create forest with clustered trees for a more natural look
        for (let i = 0; i < treeCount; i++) {
            // Use polar coordinates for more natural distribution
            const angle = Math.random() * Math.PI * 2;
            const distance = clearingRadius + Math.random() * (forestRadius - clearingRadius);
            const clusterOffset = Math.random() * 5 - 2.5; // Trees tend to grow in clusters
            
            // Convert to cartesian coordinates
            const x = Math.cos(angle) * distance + clusterOffset;
            const z = Math.sin(angle) * distance + clusterOffset;
            
            // Don't place trees too close to player spawn
            const distFromOrigin = Math.sqrt(x * x + z * z);
            if (distFromOrigin > clearingRadius) {
                createTree(x, z);
            }
        }
        
        // 3. Add some tree clusters for visual interest
        const clusterCount = 6;
        for (let i = 0; i < clusterCount; i++) {
            const clusterAngle = (i / clusterCount) * Math.PI * 2;
            const clusterDist = clearingRadius + 15;
            const clusterX = Math.cos(clusterAngle) * clusterDist;
            const clusterZ = Math.sin(clusterAngle) * clusterDist;
            
            // Create 4-6 trees in a tight cluster
            const treesInCluster = 4 + Math.floor(Math.random() * 3);
            for (let j = 0; j < treesInCluster; j++) {
                const offsetX = (Math.random() - 0.5) * 8;
                const offsetZ = (Math.random() - 0.5) * 8;
                createTree(clusterX + offsetX, clusterZ + offsetZ);
            }
        }
        
        // Handle window resizing
        window.addEventListener('resize', onWindowResize);
        
        // Setup event listeners for controls
        setupEventListeners();
        
        console.log('Initialization complete!');
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
    try {
        const now = Date.now();
        if (now - lastShootTime < shootCooldown) return;
        
        lastShootTime = now;
        
        // Create a bullet
        const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        // Get bullet direction from aim
        const bulletDirection = new THREE.Vector3(0, 0, -1);
        bulletDirection.applyAxisAngle(new THREE.Vector3(1, 0, 0), mouseY);
        bulletDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), mouseX);
        
        // Get position of the gun
        const bulletStartPos = new THREE.Vector3();
        playerAimHelper.updateWorldMatrix(true, false); // Update matrices
        bulletStartPos.setFromMatrixPosition(playerAimHelper.matrixWorld);
        bulletStartPos.x += Math.sin(mouseX) * 0.35; // Offset to gun position
        bulletStartPos.z += Math.cos(mouseX) * 0.35;
        
        // Position the bullet at the gun's position
        bullet.position.copy(bulletStartPos);
        
        // Store bullet direction and speed for animation
        bullet.userData.direction = bulletDirection;
        bullet.userData.speed = 0.5;
        bullet.userData.distanceTraveled = 0;
        bullet.userData.maxDistance = 50; // Maximum bullet travel distance
        
        // Add to scene and track in bullets array
        scene.add(bullet);
        bullets.push(bullet);
    } catch (error) {
        console.error('Error in shoot function:', error);
    }
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // Move bullet forward
        const movement = bullet.userData.direction.clone().multiplyScalar(bullet.userData.speed);
        bullet.position.add(movement);
        
        // Update distance traveled
        bullet.userData.distanceTraveled += bullet.userData.speed;
        
        // Remove bullets that have gone too far
        if (bullet.userData.distanceTraveled > bullet.userData.maxDistance) {
            scene.remove(bullet);
            bullets.splice(i, 1);
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    // Reset movement direction for this frame
    moveDirection.set(0, 0, 0);
    
    // Forward/back
    if (keys['KeyW']) {
        moveDirection.z = -1;
    }
    if (keys['KeyS']) {
        moveDirection.z = 1;
    }
    
    // Strafe left/right
    if (keys['KeyA']) {
        moveDirection.x = -1;
    }
    if (keys['KeyD']) {
        moveDirection.x = 1;
    }
    
    // Only normalize if we're actually moving
    if (moveDirection.length() > 0) {
        moveDirection.normalize();
    }
    
    // Convert movement to camera-relative direction
    // Use the horizontal component of camera rotation (mouseX)
    direction.copy(moveDirection);
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), mouseX);
    
    // Apply acceleration with proper speed limits
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
    
    // Smoothly rotate player body to face movement direction when moving
    if (direction.length() > 0.1) {
        playerDirection.copy(direction).normalize();
        const targetRotation = Math.atan2(playerDirection.x, playerDirection.z);
        
        // Smooth rotation - interpolate between current and target rotation
        const rotationSpeed = 0.15;
        const currentRotation = playerBody.rotation.y;
        
        // Calculate shortest rotation path
        let rotationDiff = targetRotation - currentRotation;
        if (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
        if (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
        
        // Apply smooth rotation
        playerBody.rotation.y += rotationDiff * rotationSpeed;
    }
    
    // Update aim direction based on mouse
    playerAimHelper.rotation.y = mouseX;
    playerAimHelper.rotation.x = mouseY;
    
    // Update camera position relative to player
    const cameraAngle = mouseX;
    camera.position.x = player.position.x - Math.sin(cameraAngle) * cameraOffset.z;
    camera.position.z = player.position.z - Math.cos(cameraAngle) * cameraOffset.z;
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