import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';

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

// Mouse controls
let mouseX = 0;
let rotationSpeed = 0.002;
let isPointerLocked = false;

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
        // Create player (Navy SEAL represented as a blue box for now)
        const playerGeometry = new THREE.BoxGeometry(1, 2, 1);
        const playerMaterial = new THREE.MeshBasicMaterial({ color: 0x000080 }); // Navy blue color
        player = new THREE.Mesh(playerGeometry, playerMaterial);
        player.position.y = 1; // Elevate player to stand on the ground
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
        
        document.addEventListener('mousemove', (e) => {
            if (isPointerLocked) {
                mouseX += e.movementX * rotationSpeed;
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
    const now = Date.now();
    if (now - lastShootTime < shootCooldown) return;
    
    lastShootTime = now;
    
    // Create a bullet
    const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Position the bullet at the player's position + forward direction
    const bulletDirection = new THREE.Vector3(0, 0, -1);
    bulletDirection.applyQuaternion(player.quaternion);
    bullet.position.copy(player.position.clone().add(bulletDirection.multiplyScalar(1)));
    bullet.position.y = 1.5; // Adjust height to be at "gun" level
    
    // Store bullet direction and speed for animation
    bullet.userData.direction = bulletDirection;
    bullet.userData.speed = 0.5;
    bullet.userData.distanceTraveled = 0;
    bullet.userData.maxDistance = 50; // Maximum bullet travel distance
    
    // Add to scene and track in bullets array
    scene.add(bullet);
    bullets.push(bullet);
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
            
            // Apply rotation to direction based on camera angle
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
        
        // Rotate player to face movement direction
        if (velocity.length() > 0.01) {
            player.rotation.y = Math.atan2(velocity.x, velocity.z);
        }
        
        // Update camera position to follow player from behind
        const cameraOffset = new THREE.Vector3(0, 2, 4);
        cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), mouseX);
        
        camera.position.x = player.position.x + cameraOffset.x;
        camera.position.y = player.position.y + cameraOffset.y;
        camera.position.z = player.position.z + cameraOffset.z;
        camera.lookAt(player.position);
        
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