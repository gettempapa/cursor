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
    const tree = new THREE.Group();
    
    // Tree trunk (cylinder)
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
    const trunkMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 }); // Brown
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1; // Half the height up from ground
    tree.add(trunk);
    
    // Tree foliage (cone)
    const foliageGeometry = new THREE.ConeGeometry(1.2, 3, 8);
    const foliageMaterial = new THREE.MeshBasicMaterial({ color: 0x2E8B57 }); // Forest green
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.y = 2.5; // Position on top of trunk
    tree.add(foliage);
    
    // Set position
    tree.position.set(x, 0, z);
    
    // Add to scene and store in array
    scene.add(tree);
    trees.push(tree);
    
    return tree;
}

// Create a simple humanoid figure
function createHumanoidMesh() {
    // Create a group for the entire player
    const playerGroup = new THREE.Group();
    
    // Create a group for the body parts that rotate with movement
    playerBody = new THREE.Group();
    playerGroup.add(playerBody);
    
    // Create a group for the parts that rotate with aiming
    playerAimHelper = new THREE.Group();
    // Adjust aim helper position to be at shoulder height, not head height
    playerAimHelper.position.y = 1.2; 
    playerGroup.add(playerAimHelper);
    
    // Head (sphere)
    const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const headMaterial = new THREE.MeshBasicMaterial({ color: 0xFFCC99 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.75;
    playerBody.add(head);
    
    // Helmet (slightly larger sphere with top cut off)
    const helmetGeometry = new THREE.SphereGeometry(0.28, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const helmetMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 }); // Dark gray
    const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
    helmet.position.y = 1.82; // Slightly above head
    playerBody.add(helmet);
    
    // Torso (box)
    const torsoGeometry = new THREE.BoxGeometry(0.5, 0.8, 0.25);
    const torsoMaterial = new THREE.MeshBasicMaterial({ color: 0x000080 }); // Navy blue for the uniform
    const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torso.position.y = 1.2;
    playerBody.add(torso);
    
    // Legs
    const legGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.2);
    const legMaterial = new THREE.MeshBasicMaterial({ color: 0x006600 }); // Dark green for pants
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.15, 0.5, 0);
    playerBody.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.15, 0.5, 0);
    playerBody.add(rightLeg);
    
    // Left arm (stays with body)
    const armGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
    const armMaterial = new THREE.MeshBasicMaterial({ color: 0x000080 });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.35, 1.2, 0);
    playerBody.add(leftArm);
    
    // Right arm and gun (follows aim direction)
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.35, 0, 0); // Position relative to the aim helper
    playerAimHelper.add(rightArmGroup);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArmGroup.add(rightArm);
    
    // Add a small "gun" to the right hand
    const gunGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.3);
    const gunMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const gun = new THREE.Mesh(gunGeometry, gunMaterial);
    gun.position.set(0, 0, -0.25);
    rightArmGroup.add(gun);
    
    // Create a visible aim direction indicator (for debugging)
    const aimIndicatorGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.3, 8);
    const aimIndicatorMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const aimIndicator = new THREE.Mesh(aimIndicatorGeometry, aimIndicatorMaterial);
    aimIndicator.rotation.x = Math.PI / 2; // Make it point forward (z-axis)
    aimIndicator.position.z = -0.4; // Position it in front of the gun
    rightArmGroup.add(aimIndicator);
    
    // Position the entire model so it stands on the ground
    playerGroup.position.y = 0.1; // Small offset to avoid z-fighting with ground
    
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
        scene.background = new THREE.Color(0x87CEEB); // Sky blue background
        
        // Add some fog for depth
        scene.fog = new THREE.Fog(0x87CEEB, 50, 100);
        
        // Create camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Create renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(renderer.domElement);
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 0.5);
        scene.add(directionalLight);
        
        // Create ground
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3A9D23, // Green grass color
            roughness: 0.8, 
            metalness: 0.2 
        });
        ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        ground.position.y = 0;
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
        
        // Add trees to the environment
        // Place 8 trees in a symmetric pattern
        createTree(5, 5);
        createTree(-5, 5);
        createTree(5, -5);
        createTree(-5, -5);
        createTree(10, 10);
        createTree(-10, 10);
        createTree(10, -10);
        createTree(-10, -10);
        
        // Add 20 random trees
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * 80 - 40; // -40 to 40
            const z = Math.random() * 80 - 40; // -40 to 40
            
            // Don't place trees too close to player spawn
            if (Math.sqrt(x * x + z * z) > 8) {
                createTree(x, z);
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