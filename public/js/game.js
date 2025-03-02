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
        
        // Create renderer with enhanced settings
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: "high-performance",
            precision: "highp"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB); // Sky blue
        
        // Enable and configure shadows
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.physicallyCorrectLights = true;
        
        // Add output encoding for better colors
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        this.container.appendChild(this.renderer.domElement);

        // Do a test render to verify the renderer works
        this.renderer.render(this.scene, this.camera);
        this.debug.innerHTML += '<br>Test render complete with enhanced graphics';
        
        // Handle window resizing
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    createEnvironment() {
        // Create ground with better material
        const groundSize = 100;
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2d5a27,
            roughness: 0.8,
            metalness: 0.2
        });
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
        
        // Add trees using better materials
        this.trees = [];
        this.createSimpleTrees();
        
        // Add improved log cabin
        this.createLogCabin();
        
        // Add improved lighting
        this.createSimpleLighting();
    }
    
    createSimpleTrees() {
        // Create more realistic pine trees
        const treeCount = 40;
        
        for (let i = 0; i < treeCount; i++) {
            const tree = new THREE.Group();
            
            // Tree trunk with better material
            const trunkHeight = 2 + Math.random() * 2;
            const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, trunkHeight, 8);
            const trunkMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x8B4513,
                roughness: 0.9,
                metalness: 0.1
            });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.y = trunkHeight / 2;
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            tree.add(trunk);
            
            // Create multiple layers of foliage for pine tree
            const foliageMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x2E8B57,
                roughness: 0.8,
                metalness: 0.05
            });
            
            // Each tree gets 3-5 layers of foliage
            const foliageLayers = 3 + Math.floor(Math.random() * 2);
            const maxRadius = 1.4 + Math.random() * 0.6;
            
            for (let j = 0; j < foliageLayers; j++) {
                // Calculate position and size for this layer
                const layerHeight = 1.2 + Math.random() * 0.5;
                const layerRadius = maxRadius * (1 - j / foliageLayers * 0.4);
                
                // Create pine foliage cone
                const foliageGeometry = new THREE.ConeGeometry(layerRadius, layerHeight, 8);
                const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
                
                // Position each cone with slight variations
                const layerPosition = trunkHeight * 0.5 + j * layerHeight * 0.7;
                foliage.position.y = layerPosition;
                
                foliage.castShadow = true;
                foliage.receiveShadow = true;
                tree.add(foliage);
            }
            
            // Position tree randomly in forest
            let validPosition = false;
            let x, z;
            
            // Keep trying until we find a valid position
            while (!validPosition) {
                validPosition = true;
                
                // Generate random position
                const radius = 15 + Math.random() * 40; // Between 15-55 units from center
                const angle = Math.random() * Math.PI * 2;
                x = Math.cos(angle) * radius;
                z = Math.sin(angle) * radius;
                
                // Ensure trees aren't too close to cabin
                if (x > -25 && x < -15 && z > -15 && z < -5) {
                    validPosition = false;
                    continue;
                }
                
                // Ensure trees aren't too close to each other
                for (const existingTree of this.trees) {
                    const dx = existingTree.position.x - x;
                    const dz = existingTree.position.z - z;
                    const distSquared = dx * dx + dz * dz;
                    
                    if (distSquared < 25) { // Min distance of 5 units between tree centers
                        validPosition = false;
                        break;
                    }
                }
            }
            
            // Randomize tree size
            const scale = 0.7 + Math.random() * 0.6; // 0.7-1.3 scale
            tree.scale.set(scale, scale, scale);
            
            // Position tree
            tree.position.set(x, 0, z);
            
            // Store tree for collision detection
            this.trees.push({
                position: new THREE.Vector3(x, 0, z),
                radius: 0.8 * scale // Collision radius
            });
            
            this.scene.add(tree);
        }
    }
    
    createLogCabin() {
        const cabin = new THREE.Group();
        
        // Cabin base/foundation
        const baseGeometry = new THREE.BoxGeometry(12, 0.5, 10);
        const stoneMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x777777,
            roughness: 0.9,
            metalness: 0.1
        });
        const base = new THREE.Mesh(baseGeometry, stoneMaterial);
        base.position.y = 0.25;
        base.receiveShadow = true;
        cabin.add(base);
        
        // Log material
        const logMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.8,
            metalness: 0.1
        });
        
        // Create walls using horizontal logs (cylinders)
        const wallHeight = 3;
        const logRadius = 0.2;
        const logCount = Math.floor(wallHeight / (logRadius * 2));
        
        // Function to create a log wall
        const createLogWall = (width, depth, posX, posZ, rotation) => {
            const logLength = rotation ? depth : width;
            
            for (let i = 0; i < logCount; i++) {
                const logGeometry = new THREE.CylinderGeometry(logRadius, logRadius, logLength, 8);
                const log = new THREE.Mesh(logGeometry, logMaterial);
                
                // Position log correctly
                log.position.y = (i * logRadius * 2) + logRadius + 0.5; // +0.5 for foundation height
                log.position.x = posX;
                log.position.z = posZ;
                
                // Rotate log to be horizontal and in correct orientation
                log.rotation.z = Math.PI / 2; // Make cylinder horizontal
                if (rotation) {
                    log.rotation.y = Math.PI / 2; // Rotate 90 degrees for side walls
                }
                
                log.castShadow = true;
                log.receiveShadow = true;
                cabin.add(log);
            }
        };
        
        // Front wall with door frame
        createLogWall(10, 8, 0, 4, false);
        
        // Back wall
        createLogWall(10, 8, 0, -4, false);
        
        // Left wall
        createLogWall(8, 8, 5, 0, true);
        
        // Right wall
        createLogWall(8, 8, -5, 0, true);
        
        // Create door
        const doorGeometry = new THREE.BoxGeometry(2, 2.5, 0.1);
        const doorMaterial = new THREE.MeshStandardMaterial({
            color: 0x6D4C41,
            roughness: 0.7,
            metalness: 0.2
        });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, 1.75, 4.05);
        door.castShadow = true;
        door.receiveShadow = true;
        cabin.add(door);
        
        // Add door handle
        const handleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const handleMaterial = new THREE.MeshStandardMaterial({
            color: 0xB87333,
            roughness: 0.5,
            metalness: 0.7
        });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.set(0.6, 1.5, 4.11);
        cabin.add(handle);
        
        // Create windows
        const createWindow = (posX, posZ, rotY) => {
            // Window frame
            const frameGeometry = new THREE.BoxGeometry(1.5, 1.5, 0.1);
            const frameMaterial = new THREE.MeshStandardMaterial({
                color: 0x6D4C41,
                roughness: 0.7,
                metalness: 0.2
            });
            const frame = new THREE.Mesh(frameGeometry, frameMaterial);
            frame.position.set(posX, 2, posZ);
            frame.rotation.y = rotY;
            frame.castShadow = true;
            frame.receiveShadow = true;
            cabin.add(frame);
            
            // Window glass
            const glassGeometry = new THREE.BoxGeometry(1.2, 1.2, 0.05);
            const glassMaterial = new THREE.MeshStandardMaterial({
                color: 0xD4F1F9,
                roughness: 0.2,
                metalness: 0.8,
                transparent: true,
                opacity: 0.6
            });
            const glass = new THREE.Mesh(glassGeometry, glassMaterial);
            glass.position.set(posX, 2, posZ);
            if (rotY === 0) {
                glass.position.z += 0.04;
            } else {
                glass.position.x += 0.04;
            }
            glass.rotation.y = rotY;
            cabin.add(glass);
        };
        
        // Add windows to each wall
        createWindow(-3, 4.05, 0); // Front
        createWindow(3, 4.05, 0);  // Front
        createWindow(0, -4.05, 0); // Back
        createWindow(5.05, 2, Math.PI/2); // Left
        createWindow(5.05, -2, Math.PI/2); // Left
        createWindow(-5.05, 0, Math.PI/2); // Right
        
        // Create roof with better structure
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B0000,
            roughness: 0.7,
            metalness: 0.1
        });
        
        // Create sloped roof
        const roofGeometry = new THREE.BoxGeometry(13, 0.5, 12);
        
        // First roof panel
        const roof1 = new THREE.Mesh(roofGeometry, roofMaterial);
        roof1.position.y = wallHeight + 1;
        roof1.rotation.z = Math.PI * 0.15;
        roof1.position.x = -1.5;
        roof1.castShadow = true;
        roof1.receiveShadow = true;
        cabin.add(roof1);
        
        // Second roof panel
        const roof2 = new THREE.Mesh(roofGeometry, roofMaterial);
        roof2.position.y = wallHeight + 1;
        roof2.rotation.z = -Math.PI * 0.15;
        roof2.position.x = 1.5;
        roof2.castShadow = true;
        roof2.receiveShadow = true;
        cabin.add(roof2);
        
        // Chimney
        const chimneyGeometry = new THREE.BoxGeometry(1, 3, 1);
        const chimney = new THREE.Mesh(chimneyGeometry, stoneMaterial);
        chimney.position.set(-3.5, wallHeight + 2.5, -2);
        chimney.castShadow = true;
        chimney.receiveShadow = true;
        cabin.add(chimney);
        
        // Position cabin
        cabin.position.set(-20, 0, -10);
        this.scene.add(cabin);
        
        // Store cabin for collision detection
        this.cabin = {
            position: new THREE.Vector3(-20, 0, -10),
            size: new THREE.Vector3(12, wallHeight, 10)
        };
    }
    
    createSimpleLighting() {
        // Main directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xfffaf0, 1.2);
        directionalLight.position.set(20, 30, 20);
        directionalLight.castShadow = true;
        
        // Improve shadow quality
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 100;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        directionalLight.shadow.bias = -0.0005;
        
        this.scene.add(directionalLight);
        
        // Secondary fill light
        const fillLight = new THREE.DirectionalLight(0xc7e5ff, 0.5);
        fillLight.position.set(-20, 20, -20);
        this.scene.add(fillLight);
        
        // Ambient light for general illumination - warmer tone
        const ambientLight = new THREE.AmbientLight(0x909fb9, 0.4);
        this.scene.add(ambientLight);
        
        // Add subtle hemisphere light
        const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x362c12, 0.4);
        this.scene.add(hemisphereLight);
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
        
        // Setup camera for third-person view
        this.cameraOffset = new THREE.Vector3(0, 1.8, 5); // Directly behind and above player
        this.updatePlayerCamera();
        
        // Create audio for weapon
        this.setupAudio();
    }
    
    createRifle() {
        const rifle = new THREE.Group();
        
        // Rifle body
        const rifleBodyGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.8);
        const rifleMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const rifleBody = new THREE.Mesh(rifleBodyGeometry, rifleMaterial);
        rifle.add(rifleBody);
        
        // Rifle barrel
        const barrelGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8);
        const barrel = new THREE.Mesh(barrelGeometry, rifleMaterial);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.z = 0.6;
        rifle.add(barrel);
        
        // Rifle stock
        const stockGeometry = new THREE.BoxGeometry(0.1, 0.15, 0.4);
        const stockMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
        const stock = new THREE.Mesh(stockGeometry, stockMaterial);
        stock.position.z = -0.4;
        rifle.add(stock);
        
        // Rifle sight
        const sightGeometry = new THREE.BoxGeometry(0.05, 0.08, 0.05);
        const sight = new THREE.Mesh(sightGeometry, rifleMaterial);
        sight.position.y = 0.08;
        sight.position.z = 0.1;
        rifle.add(sight);
        
        // Muzzle flash (initially invisible)
        const muzzleGeometry = new THREE.ConeGeometry(0.08, 0.2, 8);
        const muzzleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFF00, 
            transparent: true,
            opacity: 0.8
        });
        this.muzzleFlash = new THREE.Mesh(muzzleGeometry, muzzleMaterial);
        this.muzzleFlash.position.z = 0.9;
        this.muzzleFlash.rotation.x = Math.PI / 2;
        this.muzzleFlash.visible = false;
        rifle.add(this.muzzleFlash);
        
        // Position the rifle in player's hands
        rifle.position.set(0.3, 0.4, 0.3);
        this.player.add(rifle);
        this.rifle = rifle;
    }
    
    setupAudio() {
        // Create audio listener and attach to camera
        this.listener = new THREE.AudioListener();
        this.camera.add(this.listener);
        
        // Create the rifle sound
        this.rifleSound = new THREE.Audio(this.listener);
        
        // Load sound file - using a more powerful rifle sound
        const audioURL = 'https://freesound.org/data/previews/362/362046_5349517-lq.mp3'; // M4A1 rifle sound
        
        // Create audio loader and load sound
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load(
            audioURL,
            (buffer) => {
                this.rifleSound.setBuffer(buffer);
                this.rifleSound.setVolume(0.7); // Increased volume
                this.rifleSound.setPlaybackRate(1);
                
                // Add reverb effect for outdoor echo
                const convolver = this.listener.context.createConvolver();
                
                // Create dynamic compressor for better sound
                const compressor = this.listener.context.createDynamicsCompressor();
                compressor.threshold.setValueAtTime(-50, this.listener.context.currentTime);
                compressor.knee.setValueAtTime(40, this.listener.context.currentTime);
                compressor.ratio.setValueAtTime(12, this.listener.context.currentTime);
                compressor.attack.setValueAtTime(0, this.listener.context.currentTime);
                compressor.release.setValueAtTime(0.25, this.listener.context.currentTime);
                
                this.rifleSound.setFilter(compressor);
                
                this.debug.innerHTML += '<br>Enhanced rifle audio loaded';
            },
            (xhr) => {
                this.debug.innerHTML = `Audio ${(xhr.loaded / xhr.total * 100).toFixed(2)}% loaded`;
            },
            (error) => {
                console.error('Audio loading error:', error);
                this.debug.innerHTML += '<br>Audio loading error: ' + error.message;
                
                // Try fallback audio
                const fallbackURL = 'https://assets.codepen.io/21542/Gun%2BShotgun.mp3';
                audioLoader.load(fallbackURL, (buffer) => {
                    this.rifleSound.setBuffer(buffer);
                    this.rifleSound.setVolume(0.7);
                });
            }
        );
    }
    
    setupControls() {
        // Movement
        this.moveState = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false
        };
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            switch(e.code) {
                case 'KeyW': this.moveState.forward = true; break;
                case 'KeyS': this.moveState.backward = true; break;
                case 'KeyA': this.moveState.left = true; break;
                case 'KeyD': this.moveState.right = true; break;
                case 'Space': this.jump(); break; // Trigger jump on spacebar
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
                
                // Limit up/down camera movement
                const verticalLook = e.movementY * 0.002;
                // Adjust height slightly based on vertical look, but keep it constrained
                this.cameraOffset.y = Math.max(1.4, Math.min(2.2, this.cameraOffset.y - verticalLook));
            }
        });
        
        // Shooting controls
        document.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click
                this.playerState.shooting = true;
                this.shoot();
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) { // Left click release
                this.playerState.shooting = false;
            }
        });
    }
    
    shoot() {
        // Check cooldown
        const now = performance.now();
        if (now - this.playerState.lastShot < this.playerState.shotCooldown) {
            return;
        }
        
        this.playerState.lastShot = now;
        
        // Play sound
        if (this.rifleSound && this.rifleSound.isPlaying) {
            this.rifleSound.stop();
        }
        if (this.rifleSound && this.rifleSound.buffer) {
            this.rifleSound.play();
        }
        
        // Show muzzle flash
        if (this.muzzleFlash) {
            this.muzzleFlash.visible = true;
            setTimeout(() => {
                this.muzzleFlash.visible = false;
            }, 50);
        }
    }
    
    jump() {
        // Only allow jumping if the player is on the ground
        if (!this.playerState.isJumping && this.playerState.position.y <= 1.01) {
            this.playerState.isJumping = true;
            this.playerState.jumpVelocity = this.playerState.jumpSpeed;
        }
    }
    
    updatePlayer() {
        // Calculate movement
        const direction = new THREE.Vector3(0, 0, 0);
        
        if (this.moveState.forward) direction.z -= 1;
        if (this.moveState.backward) direction.z += 1;
        if (this.moveState.left) direction.x -= 1;
        if (this.moveState.right) direction.x += 1;
        
        this.playerState.moving = direction.length() > 0;
        
        // Handle horizontal movement
        if (this.playerState.moving) {
            // Normalize direction vector and apply rotation
            direction.normalize();
            direction.applyEuler(this.playerState.rotation);
            
            // Calculate new position but don't apply it yet
            const movement = direction.multiplyScalar(this.playerState.moveSpeed);
            const newPosition = this.playerState.position.clone();
            newPosition.x += movement.x;
            newPosition.z += movement.z;
            
            // Check for collisions before applying movement
            if (!this.checkCollisions(newPosition)) {
                // No collision, apply movement
                this.playerState.position.copy(newPosition);
            }
            
            // Update player mesh rotation
            this.player.rotation.y = this.playerState.rotation.y;
            
            // Animate legs when moving
            this.animatePlayerLegs();
        } else {
            // Reset leg positions when not moving
            this.resetPlayerLegs();
        }
        
        // Handle jumping and gravity
        if (this.playerState.isJumping) {
            // Apply jump velocity
            this.playerState.position.y += this.playerState.jumpVelocity;
            
            // Apply gravity to reduce jump velocity
            this.playerState.jumpVelocity -= this.playerState.gravity;
            
            // Check if player has landed
            if (this.playerState.position.y <= 1 && this.playerState.jumpVelocity < 0) {
                this.playerState.position.y = 1; // Reset to ground level
                this.playerState.isJumping = false;
                this.playerState.jumpVelocity = 0;
            }
        }
        
        // Update player mesh position
        this.player.position.copy(this.playerState.position);
        
        // Update camera
        this.updatePlayerCamera();
        
        // Handle continuous shooting
        if (this.playerState.shooting) {
            this.shoot();
        }
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
        // Position camera directly behind player
        const cameraOffset = this.cameraOffset.clone();
        cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerState.rotation.y);
        
        const targetPosition = this.playerState.position.clone().add(cameraOffset);
        this.camera.position.copy(targetPosition);
        
        // Look directly at the player's back
        const lookTarget = this.playerState.position.clone();
        lookTarget.y += 1.0; // Look at player's upper back/head level
        
        this.camera.lookAt(lookTarget);
        
        // Update rifle to point at center of screen/crosshair
        if (this.rifle) {
            // Get direction from camera to center of screen
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);
            
            // Calculate angle between player's forward direction and camera direction
            const playerForward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerState.rotation.y);
            
            // Adjust rifle to point toward camera direction
            this.rifle.rotation.y = this.playerState.rotation.y;
            
            // Slightly adjust the rifle position based on player's rotation
            const rightHandPos = new THREE.Vector3(0.3, 0.4, 0.3);
            this.rifle.position.copy(rightHandPos);
        }
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

    // Add a method to check for collisions
    checkCollisions(position) {
        // Check collisions with trees
        for (const tree of this.trees) {
            const dx = tree.position.x - position.x;
            const dz = tree.position.z - position.z;
            const distSquared = dx * dx + dz * dz;
            
            if (distSquared < tree.radius * tree.radius) {
                return true; // Collision detected
            }
        }
        
        // Check collision with cabin
        if (this.cabin) {
            const cabinPos = this.cabin.position;
            const cabinSize = this.cabin.size;
            
            // Check if player is inside cabin bounds (rectangular collision)
            if (
                position.x > cabinPos.x - cabinSize.x/2 && position.x < cabinPos.x + cabinSize.x/2 &&
                position.z > cabinPos.z - cabinSize.z/2 && position.z < cabinPos.z + cabinSize.z/2
            ) {
                return true; // Collision with cabin
            }
        }
        
        return false; // No collision
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