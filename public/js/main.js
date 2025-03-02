import * as THREE from 'https://cdn.skypack.dev/three@0.137.0';

// Scene setup
let camera, scene, renderer;
let player;
let ground;
const bullets = [];
let lastShootTime = 0;
const shootCooldown = 250; // milliseconds between shots

// Movement variables
const keys = {};
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const friction = 0.95; // Add friction to make movement more realistic

// Camera controls
let cameraOffset = new THREE.Vector3(0, 2, 5); // Position behind and above player
let mouseX = 0;
let mouseY = 0; // Add vertical mouse control
const rotationSpeed = 0.002;
const verticalRotationSpeed = 0.002;
const maxVerticalRotation = Math.PI / 4; // Limit up/down rotation to 45 degrees
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

// Create a simple humanoid figure
function createHumanoidMesh() {
    const group = new THREE.Group();
    
    // Head (sphere)
    const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const headMaterial = new THREE.MeshBasicMaterial({ color: 0xFFCC99 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.75;
    group.add(head);
    
    // Torso (box)
    const torsoGeometry = new THREE.BoxGeometry(0.5, 0.8, 0.25);
    const torsoMaterial = new THREE.MeshBasicMaterial({ color: 0x000080 }); // Navy blue for the uniform
    const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torso.position.y = 1.2;
    group.add(torso);
    
    // Legs
    const legGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.2);
    const legMaterial = new THREE.MeshBasicMaterial({ color: 0x006600 }); // Dark green for pants
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.15, 0.5, 0);
    group.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.15, 0.5, 0);
    group.add(rightLeg);
    
    // Arms
    const armGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
    const armMaterial = new THREE.MeshBasicMaterial({ color: 0x000080 });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.35, 1.2, 0);
    group.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.35, 1.2, 0);
    group.add(rightArm);
    
    // Add a small "gun" to the right hand
    const gunGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.3);
    const gunMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const gun = new THREE.Mesh(gunGeometry, gunMaterial);
    gun.position.set(0.35, 1.1, -0.25);
    group.add(gun);
    
    // Position the entire model so it stands on the ground
    group.position.y = 0.1; // Small offset to avoid z-fighting with ground
    
    return group;
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
        // Create ground
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x808080, side: THREE.DoubleSide });
        ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = Math.PI / 2;
        ground.position.y = 0;
        scene.add(ground);

        console.log('Adding lighting...');
        // Add simple lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        console.log('Setting up event listeners...');
        // Event listeners
        window.addEventListener('resize', onWindowResize, false);
        
        // Keyboard controls - simplified event listeners
        window.addEventListener('keydown', (e) => keys[e.code] = true);
        window.addEventListener('keyup', (e) => keys[e.code] = false);
        
        // Setup pointer lock for better mouse control
        renderer.domElement.addEventListener('click', () => {
            if (!isPointerLocked) {
                renderer.domElement.requestPointerLock();
            }
        });
        
        document.addEventListener('pointerlockchange', () => {
            isPointerLocked = document.pointerLockElement === renderer.domElement;
        });
        
        // Mouse movement for camera
        document.addEventListener('mousemove', (e) => {
            if (isPointerLocked) {
                // Horizontal rotation (yaw)
                mouseX += e.movementX * rotationSpeed;
                
                // Vertical rotation (pitch) with limits
                mouseY -= e.movementY * verticalRotationSpeed;
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
        
        // Get the forward direction using camera rotation
        const bulletDirection = new THREE.Vector3(0, 0, -1);
        bulletDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), mouseX);
        bulletDirection.applyAxisAngle(new THREE.Vector3(1, 0, 0), mouseY);
        
        // Position the bullet at the correct position (right arm of player)
        const bulletStartPos = new THREE.Vector3();
        bulletStartPos.copy(player.position);
        bulletStartPos.y += 1.1; // Height of the gun
        bulletStartPos.x += Math.sin(mouseX) * 0.35; // Right hand offset
        bulletStartPos.z += Math.cos(mouseX) * 0.35;
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
        
        // Handle player movement with WASD
        direction.z = Number(keys['KeyW'] || false) - Number(keys['KeyS'] || false);
        direction.x = Number(keys['KeyD'] || false) - Number(keys['KeyA'] || false);
        
        if (direction.length() > 0) {
            direction.normalize();
            
            // Apply rotation to direction based on camera angle (horizontal only)
            const angle = mouseX;
            direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
            
            // Add acceleration
            velocity.x += direction.x * 0.05;
            velocity.z += direction.z * 0.05;
        }
        
        // Apply friction
        velocity.x *= friction;
        velocity.z *= friction;
        
        // Move player
        player.position.x += velocity.x;
        player.position.z += velocity.z;
        
        // Always rotate player model to face camera direction (horizontal only)
        player.rotation.y = mouseX;
        
        // Update camera position to follow player from behind
        // Calculate camera position based on camera offset and rotations
        const rotatedOffset = cameraOffset.clone();
        
        // Apply horizontal rotation (around Y axis)
        rotatedOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), mouseX);
        
        // Set camera position relative to player
        camera.position.x = player.position.x + rotatedOffset.x;
        camera.position.y = player.position.y + rotatedOffset.y;
        camera.position.z = player.position.z + rotatedOffset.z;
        
        // Calculate the look target based on vertical rotation
        const lookTarget = new THREE.Vector3();
        lookTarget.copy(player.position);
        lookTarget.y += 1.5; // Look at head height
        
        // Apply vertical look (pitch)
        const verticalOffset = new THREE.Vector3(0, 0, -1);
        verticalOffset.applyAxisAngle(new THREE.Vector3(1, 0, 0), mouseY);
        verticalOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), mouseX);
        verticalOffset.multiplyScalar(5); // Look distance
        
        camera.lookAt(lookTarget.add(verticalOffset));
        
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