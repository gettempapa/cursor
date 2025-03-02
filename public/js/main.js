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
const friction = 0.95; // Add friction to make movement more realistic

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

function init() {
    try {
        console.log('Initializing scene...');
        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB); // Sky blue background

        console.log('Setting up camera...');
        // Set up camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 3, 5);

        console.log('Setting up renderer...');
        // Set up renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(renderer.domElement);

        console.log('Creating player...');
        // Create humanoid player
        player = createHumanoidMesh();
        scene.add(player);

        console.log('Creating ground...');
        // Create ground - now green for grass
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x3A9D23, side: THREE.DoubleSide }); // Green grass
        ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = Math.PI / 2;
        ground.position.y = 0;
        scene.add(ground);
        
        console.log('Adding trees...');
        // Add some trees around the area
        createTree(5, 5);
        createTree(-5, 5);
        createTree(5, -5);
        createTree(-5, -5);
        createTree(10, 0);
        createTree(-10, 0);
        createTree(0, 10);
        createTree(0, -10);
        
        // Add some random trees further away
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * 80 - 40; // Range -40 to 40
            const z = Math.random() * 80 - 40; // Range -40 to 40
            // Don't place trees too close to spawn
            if (Math.sqrt(x*x + z*z) > 12) {
                createTree(x, z);
            }
        }

        console.log('Adding lighting...');
        // Add simple lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        console.log('Setting up event listeners...');
        // Event listeners
        window.addEventListener('resize', onWindowResize, false);
        
        // Debug key presses to help diagnose movement issues
        window.addEventListener('keydown', (e) => {
            console.log('Key pressed:', e.code);
            keys[e.code] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            keys[e.code] = false;
        });
        
        // Setup pointer lock for better mouse control
        renderer.domElement.addEventListener('click', () => {
            if (!isPointerLocked) {
                renderer.domElement.requestPointerLock();
            }
        });
        
        document.addEventListener('pointerlockchange', () => {
            isPointerLocked = document.pointerLockElement === renderer.domElement;
        });
        
        // Mouse movement for aiming
        document.addEventListener('mousemove', (e) => {
            if (isPointerLocked) {
                // Horizontal aim
                mouseX += e.movementX * aimSensitivity;
                
                // Vertical aim with limits
                mouseY -= e.movementY * aimSensitivity;
                mouseY = Math.max(-maxVerticalRotation, Math.min(maxVerticalRotation, mouseY));
            }
        });
        
        // Add shooting mechanism
        document.addEventListener('mousedown', (e) => {
            if (isPointerLocked && e.button === 0) { // Left mouse button
                shoot();
            }
        });
        
        console.log('Initialization complete!');
    } catch (error) {
        console.error('Error during initialization:', error);
        document.getElementById('instructions').innerHTML += 
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
    try {
        requestAnimationFrame(animate);
        
        // Handle player movement with WASD - simplified to make diagnostics easier
        const forward = keys['KeyW'] ? 1 : 0;
        const backward = keys['KeyS'] ? 1 : 0;
        const left = keys['KeyA'] ? 1 : 0; 
        const right = keys['KeyD'] ? 1 : 0;
        
        // Log movement keys for debugging
        if (forward || backward || left || right) {
            console.log('Movement keys:', { forward, backward, left, right });
        }
        
        moveDirection.z = forward - backward;
        moveDirection.x = right - left;
        
        // Calculate actual movement direction based on camera orientation
        if (moveDirection.length() > 0) {
            moveDirection.normalize();
            
            // Calculate the forward direction based on camera
            const angle = camera.rotation.y;
            const sin = Math.sin(angle);
            const cos = Math.cos(angle);
            
            // Direction relative to camera
            direction.x = moveDirection.x * cos + moveDirection.z * sin;
            direction.z = moveDirection.x * -sin + moveDirection.z * cos;
            
            // Add acceleration
            velocity.x += direction.x * 0.1; // Increased for more responsive movement
            velocity.z += direction.z * 0.1;
            
            // Update player's facing direction for body rotation
            playerDirection.copy(direction);
        }
        
        // Apply friction
        velocity.x *= friction;
        velocity.z *= friction;
        
        // Move player
        player.position.x += velocity.x;
        player.position.z += velocity.z;
        
        // Rotate the player body to face movement direction
        if (velocity.length() > 0.01) {
            const bodyAngle = Math.atan2(playerDirection.x, playerDirection.z);
            playerBody.rotation.y = bodyAngle;
        }
        
        // Update aim direction based on mouse
        playerAimHelper.rotation.y = mouseX;
        playerAimHelper.rotation.x = mouseY;
        
        // Position camera directly behind player
        const cameraAngle = Math.atan2(playerDirection.x, playerDirection.z);
        camera.position.x = player.position.x - Math.sin(cameraAngle) * cameraOffset.z;
        camera.position.z = player.position.z - Math.cos(cameraAngle) * cameraOffset.z;
        camera.position.y = player.position.y + cameraOffset.y;
        
        // Make camera look at player
        camera.lookAt(
            player.position.x,
            player.position.y + 1.5, // Look at head height
            player.position.z
        );
        
        // Update bullets
        updateBullets();
        
        // Render
        renderer.render(scene, camera);
    } catch (error) {
        console.error('Error in animation loop:', error);
        document.getElementById('instructions').innerHTML += 
            `<p style="color:red">Animation Error: ${error.message}</p>`;
    }
} 