// Direct import with URL - no import map needed
import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';

class Game {
    constructor() {
        // Enhanced debug mode
        this.debug = document.getElementById('debug');
        this.debug.style.display = 'block';
        this.debug.innerHTML = 'Initializing game...<br>Checking Three.js: ' + (typeof THREE !== 'undefined' ? 'OK' : 'FAILED');

        // Add a basic cube as fallback if other elements fail
        this.addFallbackCube = () => {
            this.debug.innerHTML += '<br>Adding fallback cube for visibility test';
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const cube = new THREE.Mesh(geometry, material);
            cube.position.set(0, 0, 0);
            this.scene.add(cube);
            this.renderer.render(this.scene, this.camera);
        };

        try {
            // Core setup
            this.setupCore();
            this.debug.innerHTML += '<br>Core setup complete';
            
            // Add fallback cube immediately to test rendering
            this.addFallbackCube();
            
            // Create environment with error handling
            try {
                this.createEnvironment();
                this.debug.innerHTML += '<br>Environment created';
            } catch (envError) {
                this.debug.innerHTML += `<br>Environment creation failed: ${envError.message}`;
                console.error('Environment creation failed:', envError);
            }
            
            // Create player with error handling
            try {
                this.createPlayer();
                this.debug.innerHTML += '<br>Player created';
            } catch (playerError) {
                this.debug.innerHTML += `<br>Player creation failed: ${playerError.message}`;
                console.error('Player creation failed:', playerError);
            }
            
            // Setup controls with error handling
            try {
                this.setupControls();
                this.debug.innerHTML += '<br>Controls setup complete';
            } catch (controlsError) {
                this.debug.innerHTML += `<br>Controls setup failed: ${controlsError.message}`;
                console.error('Controls setup failed:', controlsError);
            }
            
            // Setup audio with error handling
            try {
                this.setupAudio();
                this.debug.innerHTML += '<br>Rifle audio loaded and tested';
            } catch (audioError) {
                this.debug.innerHTML += `<br>Rifle audio setup failed: ${audioError.message}`;
                console.error('Rifle audio setup failed:', audioError);
            }
            
            // Hide loading screen
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) loadingScreen.style.display = 'none';
            
            // Start animation loop
            this.animate();
            
            this.debug.innerHTML += '<br>Game running - WASD to move, mouse to look';
        } catch (error) {
            console.error('Game initialization failed:', error);
            this.debug.innerHTML = `Error: ${error.message}<br>Stack: ${error.stack}`;
        }
    }
    
    setupCore() {
        // Get container
        this.container = document.getElementById('gameContainer');
        if (!this.container) throw new Error('No game container found');
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        this.scene.fog = new THREE.FogExp2(0x88BBEE, 0.005); // Add fog for forest feel
        
        // Create camera - will be positioned by the player's update method
        this.camera = new THREE.PerspectiveCamera(
            70, // FOV
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 5, 10); // Set an initial position in case player setup fails
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB); // Sky blue
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Do a test render to verify the renderer works
        this.renderer.render(this.scene, this.camera);
        this.debug.innerHTML += '<br>Test render complete';
        
        // Handle window resizing
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    createEnvironment() {
        // Create simple ground (no textures to minimize errors)
        const groundSize = 100;
        const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x2d5a27 });
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.scene.add(this.ground);
        
        // Add trees using basic materials (no textures)
        this.createSimpleTrees();
        
        // Add simple lighting
        this.createSimpleLighting();
    }
    
    createSimpleTrees() {
        // Create just a few simple trees
        const treeCount = 10;
        
        for (let i = 0; i < treeCount; i++) {
            const tree = new THREE.Group();
            
            // Tree trunk
            const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
            const trunkMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.y = 1;
            tree.add(trunk);
            
            // Tree foliage
            const foliageGeometry = new THREE.ConeGeometry(1, 3, 8);
            const foliageMaterial = new THREE.MeshBasicMaterial({ color: 0x2E8B57 });
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.position.y = 3;
            tree.add(foliage);
            
            // Position tree in a circle pattern
            const angle = (i / treeCount) * Math.PI * 2;
            const radius = 10;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            tree.position.set(x, 0, z);
            this.scene.add(tree);
        }
    }
    
    createSimpleLighting() {
        // Simple directional light (no shadows)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 5);
        this.scene.add(directionalLight);
        
        // Ambient light for general illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
    }
    
    createPlayer() {
        // Player state
        this.playerState = {
            position: new THREE.Vector3(0, 1, 0),
            rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
            moveSpeed: 0.12,
            turnSpeed: 0.02,
            moving: false,
            shooting: false,
            lastShot: 0,
            shotCooldown: 100, // milliseconds between shots
            // Jump properties
            isJumping: false,
            jumpHeight: 2.0,
            jumpSpeed: 0.15,
            jumpVelocity: 0,
            gravity: 0.008
        };
        
        // Create simple soldier model using basic materials
        this.player = new THREE.Group();
        
        // Body
        const bodyGeometry = new THREE.BoxGeometry(0.5, 0.8, 0.3);
        const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x2F4F4F }); // Dark slate gray
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.4;
        this.player.add(body);
        
        // Head
        const headGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const headMaterial = new THREE.MeshBasicMaterial({ color: 0xD2B48C }); // Tan
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1;
        this.player.add(head);
        
        // Legs
        const legGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        const legMaterial = new THREE.MeshBasicMaterial({ color: 0x2F4F4F });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(0.15, -0.3, 0);
        this.player.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(-0.15, -0.3, 0);
        this.player.add(rightLeg);
        
        // Arms
        const armGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        const armMaterial = new THREE.MeshBasicMaterial({ color: 0x2F4F4F });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(0.35, 0.4, 0);
        this.player.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(-0.35, 0.4, 0);
        this.player.add(rightArm);
        
        // Create rifle using basic shapes
        this.createRifle();
        
        // Position player and add to scene
        this.player.position.copy(this.playerState.position);
        this.scene.add(this.player);
        
        // Setup camera for third-person view - positioned to show player in lower left
        this.cameraOffset = new THREE.Vector3(1.5, 1.8, 5); // Offset to the right and up from player
        this.updatePlayerCamera();
        
        // Create audio for weapon
        this.setupAudio();
    }
    
    setupControls() {
        // Movement
        this.moveState = {
            forward: false,
            backward: false,
            left: false,
            right: false
        };
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            switch(e.code) {
                case 'KeyW': this.moveState.forward = true; break;
                case 'KeyS': this.moveState.backward = true; break;
                case 'KeyA': this.moveState.left = true; break;
                case 'KeyD': this.moveState.right = true; break;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            switch(e.code) {
                case 'KeyW': this.moveState.forward = false; break;
                case 'KeyS': this.moveState.backward = false; break;
                case 'KeyA': this.moveState.left = false; break;
                case 'KeyD': this.moveState.right = false; break;
            }
        });
        
        // Mouse controls
        this.container.addEventListener('click', () => {
            this.container.requestPointerLock();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.container) {
                // Rotate player with mouse
                this.playerState.rotation.y -= e.movementX * 0.002;
                
                // Adjust camera height with vertical mouse
                this.cameraOffset.y = Math.max(1, Math.min(4, this.cameraOffset.y - e.movementY * 0.01));
            }
        });
    }
    
    updatePlayer() {
        // Calculate movement
        const direction = new THREE.Vector3(0, 0, 0);
        
        if (this.moveState.forward) direction.z -= 1;
        if (this.moveState.backward) direction.z += 1;
        if (this.moveState.left) direction.x -= 1;
        if (this.moveState.right) direction.x += 1;
        
        this.playerState.moving = direction.length() > 0;
        
        if (this.playerState.moving) {
            // Normalize direction vector and apply rotation
            direction.normalize();
            direction.applyEuler(this.playerState.rotation);
            
            // Update position
            this.playerState.position.add(direction.multiplyScalar(this.playerState.moveSpeed));
            
            // Update player mesh position and rotation
            this.player.position.copy(this.playerState.position);
            this.player.rotation.y = this.playerState.rotation.y;
            
            // Animate legs when moving
            this.animatePlayerLegs();
        } else {
            // Reset leg positions when not moving
            this.resetPlayerLegs();
        }
        
        // Update camera
        this.updatePlayerCamera();
    }
    
    animatePlayerLegs() {
        const time = performance.now() * 0.005;
        const leftLeg = this.player.children.find(child => child.position.x === 0.15 && child.position.y === -0.3);
        const rightLeg = this.player.children.find(child => child.position.x === -0.15 && child.position.y === -0.3);
        
        if (leftLeg && rightLeg) {
            leftLeg.rotation.x = Math.sin(time) * 0.4;
            rightLeg.rotation.x = Math.sin(time + Math.PI) * 0.4;
        }
    }
    
    resetPlayerLegs() {
        const leftLeg = this.player.children.find(child => child.position.x === 0.15 && child.position.y === -0.3);
        const rightLeg = this.player.children.find(child => child.position.x === -0.15 && child.position.y === -0.3);
        
        if (leftLeg && rightLeg) {
            leftLeg.rotation.x = 0;
            rightLeg.rotation.x = 0;
        }
    }
    
    updatePlayerCamera() {
        // Position camera with offset to keep player in the lower left
        const cameraOffset = this.cameraOffset.clone();
        cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerState.rotation.y);
        
        const targetPosition = this.playerState.position.clone().add(cameraOffset);
        this.camera.position.copy(targetPosition);
        
        // Calculate a target point in front of the player
        // This will be where the crosshair is positioned
        const forwardDirection = new THREE.Vector3(0, 0, -1);
        forwardDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerState.rotation.y);
        forwardDirection.multiplyScalar(20); // Look 20 units ahead
        
        // Create the look target in front of the player
        const lookTarget = this.playerState.position.clone().add(forwardDirection);
        lookTarget.y += 1.0; // Adjust height to match player's eye level
        
        // Add a slight offset to the look target to shift the player left and down in the view
        lookTarget.x += 0.5; // Shift the target right to move player left in view
        lookTarget.y -= 0.3; // Shift the target up to move player down in view
        
        // Have the camera look at this target (this is where the crosshair is)
        this.camera.lookAt(lookTarget);
        
        // Update rifle to point at the center of screen/crosshair (which is our look target)
        if (this.rifle) {
            // Reset the rifle's local rotation
            this.rifle.rotation.set(0, 0, 0);
            
            // Calculate the direction vector from the player to the look target
            const rifleDirection = lookTarget.clone().sub(this.playerState.position);
            rifleDirection.normalize();
            
            // Position the rifle in the player's hand but pointed at the crosshair
            // Convert the world direction to a local rotation for the rifle
            const rifleRotation = new THREE.Euler(0, 0, 0, 'YXZ');
            
            // Calculate the angle between the player's forward direction and the rifle direction
            const yAngle = Math.atan2(rifleDirection.x, rifleDirection.z);
            
            // Apply the calculated rotation
            this.rifle.rotation.y = yAngle;
            
            // Pitch the rifle up/down to aim at the crosshair's height
            const xzDistance = Math.sqrt(rifleDirection.x * rifleDirection.x + rifleDirection.z * rifleDirection.z);
            const xAngle = -Math.atan2(rifleDirection.y, xzDistance);
            this.rifle.rotation.x = xAngle;
            
            // Position the rifle in the player's right hand
            this.rifle.position.set(0.3, 0.4, 0.3);
        }
    }
    
    setupAudio() {
        // Create audio listener and attach to camera
        this.listener = new THREE.AudioListener();
        this.camera.add(this.listener);
        
        // Create the rifle sound
        this.rifleSound = new THREE.Audio(this.listener);
        
        // Load sound file - using a more reliable rifle sound URL
        const audioURL = 'https://assets.codepen.io/21542/Gun%2BShotgun.mp3'; // Use more reliable source as primary
        
        // Create audio loader and load sound
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load(
            audioURL,
            (buffer) => {
                this.rifleSound.setBuffer(buffer);
                this.rifleSound.setVolume(1.0); // Increased volume to maximum
                this.rifleSound.setPlaybackRate(1.2); // Slightly faster for more impact
                
                // Create dynamic compressor for better sound
                const compressor = this.listener.context.createDynamicsCompressor();
                compressor.threshold.setValueAtTime(-50, this.listener.context.currentTime);
                compressor.knee.setValueAtTime(40, this.listener.context.currentTime);
                compressor.ratio.setValueAtTime(12, this.listener.context.currentTime);
                compressor.attack.setValueAtTime(0, this.listener.context.currentTime);
                compressor.release.setValueAtTime(0.25, this.listener.context.currentTime);
                
                this.rifleSound.setFilter(compressor);
                
                // Test the sound on load to ensure it works
                if (this.rifleSound.buffer) {
                    this.rifleSound.play();
                    console.log("Playing test rifle sound");
                }
                
                this.debug.innerHTML += '<br>Rifle audio loaded and tested';
            },
            (xhr) => {
                this.debug.innerHTML = `Audio ${(xhr.loaded / xhr.total * 100).toFixed(2)}% loaded`;
            },
            (error) => {
                console.error('Audio loading error:', error);
                this.debug.innerHTML += '<br>Audio loading error: ' + error.message;
                
                // Try fallback audio
                const fallbackURL = 'https://freesound.org/data/previews/362/362046_5349517-lq.mp3';
                audioLoader.load(fallbackURL, (buffer) => {
                    this.rifleSound.setBuffer(buffer);
                    this.rifleSound.setVolume(1.0);
                    
                    // Test the sound on load to ensure it works
                    if (this.rifleSound.buffer) {
                        this.rifleSound.play();
                    }
                });
            }
        );
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        try {
            // Update player
            this.updatePlayer();
            
            // Render scene
            this.renderer.render(this.scene, this.camera);
        } catch (animateError) {
            console.error('Animation error:', animateError);
            this.debug.innerHTML += `<br>Animation error: ${animateError.message}`;
        }
    }

    shoot() {
        // Check cooldown
        const now = performance.now();
        if (now - this.playerState.lastShot < this.playerState.shotCooldown) {
            return;
        }
        
        this.playerState.lastShot = now;
        
        // Play sound - using more robust sound playback code
        if (this.rifleSound) {
            // Stop any currently playing sound
            if (this.rifleSound.isPlaying) {
                this.rifleSound.stop();
            }
            
            // Play the sound with a slight delay to ensure it's ready
            if (this.rifleSound.buffer) {
                // Clone the sound for overlapping shots
                const soundClone = this.rifleSound.clone();
                soundClone.setVolume(1.0);
                soundClone.play();
                
                // Log to debug
                console.log("Playing rifle sound");
            } else {
                console.warn("Rifle sound buffer not loaded yet");
            }
        } else {
            console.warn("Rifle sound not initialized");
        }
        
        // Show muzzle flash
        if (this.muzzleFlash) {
            this.muzzleFlash.visible = true;
            setTimeout(() => {
                this.muzzleFlash.visible = false;
            }, 50);
        }
    }
}

// Create game instance when page loads
window.addEventListener('DOMContentLoaded', () => {
    try {
        window.game = new Game(); // Store in global scope for debugging
    } catch (error) {
        console.error('Failed to start game:', error);
        const debug = document.getElementById('debug');
        if (debug) {
            debug.style.display = 'block';
            debug.innerHTML = `Failed to start game: ${error.message}<br>Stack: ${error.stack}`;
        }
    }
}); 