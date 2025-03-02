// Direct import with URL - no import map needed
import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';

// Constants module for better organization
const Constants = {
    // Player settings
    PLAYER: {
        MOVE_SPEED: 0.12,
        TURN_SPEED: 0.02,
        JUMP_HEIGHT: 2.0,
        JUMP_SPEED: 0.15,
        GRAVITY: 0.008,
        SHOT_COOLDOWN: 100, // milliseconds between shots
        CAMERA_OFFSET: new THREE.Vector3(1.5, 1.8, 5)
    },
    
    // Game settings
    GAME: {
        FOG_DENSITY: 0.005,
        GROUND_SIZE: 100,
        MAX_DELTA_TIME: 0.1
    },
    
    // Colors
    COLORS: {
        SKY: 0x87CEEB,
        GROUND: 0x2d5a27,
        TREE_TRUNK: 0x8B4513,
        TREE_FOLIAGE: 0x2E8B57,
        SOLDIER_BODY: 0x2F4F4F,
        SOLDIER_FACE: 0xD2B48C,
        CAMO: [0x4b5320, 0x3a421a, 0x5d6d21, 0x2c3317]
    }
};

class Enemy {
    constructor(scene, position) {
        this.scene = scene;
        this.position = position.clone();
        this.rotation = new THREE.Euler(0, Math.random() * Math.PI * 2, 0, 'YXZ');
        this.moveSpeed = Constants.PLAYER.MOVE_SPEED * 0.6; // Slightly slower than player
        this.lastShot = 0;
        this.shotCooldown = 2000; // 2 seconds between shots
        this.model = this.createEnemyModel();
        this.targetPosition = this.getNewTargetPosition();
        this.updateInterval = Math.random() * 2000 + 3000; // Random update interval between 3-5 seconds
        this.lastUpdate = performance.now();
        this.legAngle = 0;
        this.moving = false;
    }

    createEnemyModel() {
        const enemy = new THREE.Group();

        // Create jacket (body)
        const bodyGeometry = new THREE.BoxGeometry(0.5, 0.8, 0.3);
        const jacketMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2F4F4F,
            roughness: 0.8,
            metalness: 0.2
        });
        const body = new THREE.Mesh(bodyGeometry, jacketMaterial);
        body.position.y = 0.4;
        enemy.add(body);

        // Create helmet with camo pattern
        const headGeometry = new THREE.BoxGeometry(0.35, 0.32, 0.35);
        const camoColors = Constants.COLORS.CAMO;
        
        // Create camo pattern
        const camoCanvas = document.createElement('canvas');
        camoCanvas.width = 128;
        camoCanvas.height = 128;
        const ctx = camoCanvas.getContext('2d');
        
        ctx.fillStyle = '#4b5320';
        ctx.fillRect(0, 0, 128, 128);
        
        for (let i = 0; i < 40; i++) {
            const x = Math.random() * 128;
            const y = Math.random() * 128;
            const size = 10 + Math.random() * 20;
            const colorIndex = Math.floor(Math.random() * camoColors.length);
            ctx.fillStyle = '#' + camoColors[colorIndex].toString(16);
            ctx.beginPath();
            ctx.ellipse(x, y, size, size * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const camoTexture = new THREE.CanvasTexture(camoCanvas);
        const helmetMaterial = new THREE.MeshStandardMaterial({ map: camoTexture });
        const helmet = new THREE.Mesh(headGeometry, helmetMaterial);
        helmet.position.y = 1;
        enemy.add(helmet);

        // Face
        const faceGeometry = new THREE.BoxGeometry(0.22, 0.22, 0.22);
        const faceMaterial = new THREE.MeshStandardMaterial({ color: Constants.COLORS.SOLDIER_FACE });
        const face = new THREE.Mesh(faceGeometry, faceMaterial);
        face.position.set(0, 0.95, 0.05);
        enemy.add(face);

        // Create pants (legs)
        const legGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        const pantsMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1a472a,
            roughness: 0.9,
            metalness: 0.1
        });
        
        this.leftLeg = new THREE.Mesh(legGeometry, pantsMaterial);
        this.leftLeg.position.set(0.15, -0.3, 0);
        enemy.add(this.leftLeg);
        
        this.rightLeg = new THREE.Mesh(legGeometry, pantsMaterial);
        this.rightLeg.position.set(-0.15, -0.3, 0);
        enemy.add(this.rightLeg);

        // Create boots
        const bootGeometry = new THREE.BoxGeometry(0.22, 0.15, 0.25);
        const bootMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2b1810,
            roughness: 0.9,
            metalness: 0.2
        });
        
        const leftBoot = new THREE.Mesh(bootGeometry, bootMaterial);
        leftBoot.position.set(0.15, -0.6, 0.02);
        enemy.add(leftBoot);
        
        const rightBoot = new THREE.Mesh(bootGeometry, bootMaterial);
        rightBoot.position.set(-0.15, -0.6, 0.02);
        enemy.add(rightBoot);

        // Create arms with hands
        const armGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        const handGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
        
        this.leftArm = new THREE.Mesh(armGeometry, jacketMaterial);
        this.leftArm.position.set(0.35, 0.4, 0);
        enemy.add(this.leftArm);
        
        this.rightArm = new THREE.Mesh(armGeometry, jacketMaterial);
        this.rightArm.position.set(-0.35, 0.4, 0);
        enemy.add(this.rightArm);
        
        const handMaterial = new THREE.MeshStandardMaterial({ color: Constants.COLORS.SOLDIER_FACE });
        
        const leftHand = new THREE.Mesh(handGeometry, handMaterial);
        leftHand.position.set(0.35, 0.1, 0);
        enemy.add(leftHand);
        
        const rightHand = new THREE.Mesh(handGeometry, handMaterial);
        rightHand.position.set(-0.35, 0.1, 0);
        enemy.add(rightHand);

        // Add rifle
        const rifle = this.createEnemyRifle();
        enemy.add(rifle);

        // Position the enemy
        enemy.position.copy(this.position);
        enemy.rotation.copy(this.rotation);

        return enemy;
    }

    createEnemyRifle() {
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
        
        // Create hands to hold the rifle
        this.createHands(rifle);
        
        // Position the rifle in player's hands - MODIFIED positioning for forward aiming
        rifle.position.set(0.25, 0.4, 0.1); // Move rifle forward and slightly right
        rifle.rotation.y = -0.15; // Adjust initial angle to point more forward
        
        this.model.add(rifle);
        this.rifle = rifle;
    }

    // Add hands to hold the rifle
    createHands(rifle) {
        const handMaterial = new THREE.MeshBasicMaterial({ color: Constants.COLORS.SOLDIER_FACE });
        
        // Left hand (forward grip)
        const leftHandGeometry = new THREE.BoxGeometry(0.08, 0.12, 0.08);
        const leftHand = new THREE.Mesh(leftHandGeometry, handMaterial);
        leftHand.position.set(0, -0.05, 0.3);
        rifle.add(leftHand);
        
        // Right hand (trigger hand)
        const rightHandGeometry = new THREE.BoxGeometry(0.08, 0.12, 0.08);
        const rightHand = new THREE.Mesh(rightHandGeometry, handMaterial);
        rightHand.position.set(0, -0.05, -0.1);
        rifle.add(rightHand);
        
        // Store references to the hands
        this.leftHand = leftHand;
        this.rightHand = rightHand;
    }

    getNewTargetPosition() {
        const angle = Math.random() * Math.PI * 2;
        const distance = 10 + Math.random() * 20;
        return new THREE.Vector3(
            Math.cos(angle) * distance,
            1,
            Math.sin(angle) * distance
        );
    }

    update(deltaTime, playerPosition) {
        const now = performance.now();

        // Update movement
        const directionToTarget = this.targetPosition.clone().sub(this.position);
        const distanceToTarget = directionToTarget.length();

        // Get new target if we've reached the current one
        if (distanceToTarget < 0.5 || now - this.lastUpdate > this.updateInterval) {
            this.targetPosition = this.getNewTargetPosition();
            this.lastUpdate = now;
        }

        // Move towards target
        if (distanceToTarget > 0.1) {
            directionToTarget.normalize();
            const movement = directionToTarget.multiplyScalar(this.moveSpeed * deltaTime * 60);
            this.position.add(movement);
            
            // Update rotation to face movement direction
            this.rotation.y = Math.atan2(directionToTarget.x, directionToTarget.z);
            this.moving = true;

            // Animate legs while moving
            this.legAngle += deltaTime * 5;
            if (this.leftLeg && this.rightLeg) {
                this.leftLeg.rotation.x = Math.sin(this.legAngle) * 0.4;
                this.rightLeg.rotation.x = Math.sin(this.legAngle + Math.PI) * 0.4;
            }
        } else {
            this.moving = false;
            if (this.leftLeg && this.rightLeg) {
                this.leftLeg.rotation.x = 0;
                this.rightLeg.rotation.x = 0;
            }
        }

        // Update model position and rotation
        this.model.position.copy(this.position);
        this.model.rotation.copy(this.rotation);

        // Random shooting
        if (now - this.lastShot > this.shotCooldown && Math.random() < 0.1) {
            this.shoot();
            this.lastShot = now;
        }
    }

    shoot() {
        // Check cooldown and pointer lock
        const now = performance.now();
        if (now - this.lastShot < this.shotCooldown || 
            document.pointerLockElement !== this.container) {
            return;
        }
        
        this.lastShot = now;
        
        // Play rifle sound
        if (this.audioInitialized && this.rifleSound && this.rifleSound.buffer) {
            try {
                const soundClone = this.rifleSound.clone();
                const pitchVariation = 0.9 + Math.random() * 0.2;
                soundClone.setPlaybackRate(pitchVariation);
                soundClone.play();
            } catch (audioError) {
                console.warn('Error playing rifle sound:', audioError);
            }
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

class Game {
    constructor() {
        // Enhanced debug mode
        this.debug = document.getElementById('debug');
        this.debug.style.display = 'block';
        this.debug.innerHTML = 'Initializing game...<br>Checking Three.js: ' + (typeof THREE !== 'undefined' ? 'OK' : 'FAILED');

        // Audio initialized flag
        this.audioInitialized = false;

        try {
            // Core setup
            this.setupCore();
            this.debug.innerHTML += '<br>Core setup complete';
            
            // Initialize game components with error handling
            this.initializeGameComponents();
            
            // Remove fallback cube after successful initialization
            const fallbackCube = this.scene.getObjectByName('fallbackCube');
            if (fallbackCube) {
                this.scene.remove(fallbackCube);
            }
            
            // Start animation loop
            this.animate();
            
            this.debug.innerHTML += '<br>Game running - WASD to move, mouse to look';
        } catch (error) {
            console.error('Game initialization failed:', error);
            this.debug.innerHTML = `Error: ${error.message}<br>Stack: ${error.stack}`;
        }
    }
    
    // Create enemy function - moved here to ensure it's properly defined
    createEnemy() {
        try {
            // Generate a random position away from the player
            const angle = Math.random() * Math.PI * 2;
            const distance = 20 + Math.random() * 30; // Between 20-50 units from center
            const position = new THREE.Vector3(
                Math.cos(angle) * distance,
                1,
                Math.sin(angle) * distance
            );
            
            // Check if position is valid (not inside objects)
            let validPosition = true;
            
            // Check collision with trees
            for (const tree of this.trees) {
                const dx = tree.position.x - position.x;
                const dz = tree.position.z - position.z;
                const distSquared = dx * dx + dz * dz;
                
                if (distSquared < (tree.radius + 1) * (tree.radius + 1)) {
                    validPosition = false;
                    break;
                }
            }
            
            // If position is valid, create the enemy
            if (validPosition) {
                const enemy = new Enemy(this.scene, position);
                this.enemies.push(enemy);
                
                // Pass audio context to enemy if available
                if (this.audioInitialized && this.listener) {
                    enemy.listener = this.listener;
                    enemy.audioInitialized = true;
                }
            } else {
                // Try again with a different position
                this.createEnemy();
            }
        } catch (error) {
            console.error('Error creating enemy:', error);
            this.debug.innerHTML += `<br>Error creating enemy: ${error.message}`;
        }
    }
    
    // Initialize all game components with proper error handling
    initializeGameComponents() {
        // Initialize arrays before using them
        this.trees = [];
        this.enemies = [];
        this.maxEnemies = 3; // Reduced number of enemies
        
        // Initialize camera angles before player creation
        this.cameraAngles = {
            vertical: 0,
            horizontal: 0
        };
        
        // Create environment with error handling
        try {
            this.createEnvironment();
            this.debug.innerHTML += '<br>Environment created';
        } catch (envError) {
            console.error('Environment creation failed:', envError);
            this.debug.innerHTML += `<br>Environment creation failed: ${envError.message}`;
            throw envError; // Rethrow to prevent further initialization
        }
        
        // Create player with error handling
        try {
            this.createPlayer();
            this.debug.innerHTML += '<br>Player created';
        } catch (playerError) {
            console.error('Player creation failed:', playerError);
            this.debug.innerHTML += `<br>Player creation failed: ${playerError.message}`;
            throw playerError;
        }
        
        // Setup controls with error handling
        try {
            this.setupControls();
            this.debug.innerHTML += '<br>Controls setup complete';
        } catch (controlsError) {
            console.error('Controls setup failed:', controlsError);
            this.debug.innerHTML += `<br>Controls setup failed: ${controlsError.message}`;
            throw controlsError;
        }
        
        // Audio setup will be initialized on first user interaction
        this.prepareAudioForLaterInitialization();
        this.debug.innerHTML += '<br>Audio will initialize on first interaction';
        
        // Create enemies after environment is set up - but make it optional
        if (typeof this.createEnemy === 'function') {
            try {
                for (let i = 0; i < this.maxEnemies; i++) {
                    this.createEnemy();
                }
                this.debug.innerHTML += '<br>Enemies created';
            } catch (enemyError) {
                console.error('Enemy creation failed:', enemyError);
                this.debug.innerHTML += `<br>Enemy creation failed: ${enemyError.message}`;
                // Don't throw here - game can still run without enemies
            }
        } else {
            console.warn('createEnemy function not available - skipping enemy creation');
            this.debug.innerHTML += '<br>Enemy creation skipped (function not available)';
        }
        
        // Hide loading screen
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }
    
    setupCore() {
        // Get container
        this.container = document.getElementById('gameContainer');
        if (!this.container) throw new Error('No game container found');
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(Constants.COLORS.SKY);
        this.scene.fog = new THREE.FogExp2(0x88BBEE, Constants.GAME.FOG_DENSITY);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            70, // FOV
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 5, 10);
        
        // Create renderer with updated properties for Three.js compatibility
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(Constants.COLORS.SKY);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Set modern properties (not deprecated ones)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.useLegacyLights = false;
        
        this.container.appendChild(this.renderer.domElement);

        // Add a temporary fallback cube for visibility testing
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(0, 0, 0);
        cube.name = 'fallbackCube';
        this.scene.add(cube);
        
        // Do a test render
        this.renderer.render(this.scene, this.camera);
        this.debug.innerHTML += '<br>Test render complete';
        
        // Handle window resizing
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    // New method to prepare audio but defer actual initialization
    prepareAudioForLaterInitialization() {
        // Create audio listener and attach to camera
        this.listener = new THREE.AudioListener();
        this.camera.add(this.listener);
        
        // Create empty rifle sound container
        this.rifleSound = null;
        this.footstepSounds = [];
        
        // Setup event for first user interaction to initialize audio
        const initAudioOnFirstInteraction = () => {
            try {
                this.setupAudio();
                this.audioInitialized = true;
                this.debug.innerHTML += '<br>Audio initialized after user interaction';
            } catch (audioError) {
                console.error('Audio initialization failed:', audioError);
                this.debug.innerHTML += `<br>Audio initialization failed: ${audioError.message}`;
            }
            
            // Remove event listeners once audio is initialized
            document.removeEventListener('click', initAudioOnFirstInteraction);
            document.removeEventListener('keydown', initAudioOnFirstInteraction);
        };
        
        // Listen for user interaction to initialize audio
        document.addEventListener('click', initAudioOnFirstInteraction);
        document.addEventListener('keydown', initAudioOnFirstInteraction);
    }
    
    setupAudio() {
        try {
            // Create the rifle sound
            this.rifleSound = new THREE.Audio(this.listener);
            
            // Make sure listener and context are available
            if (!this.listener || !this.listener.context) {
                console.warn('AudioListener or AudioContext not available');
                return;
            }
            
            // Create AudioContext
            const audioContext = this.listener.context;
            
            // Create a buffer for our gun sound
            const sampleRate = audioContext.sampleRate;
            const duration = 0.3; // sound duration in seconds
            const bufferSize = sampleRate * duration;
            const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
            
            // Get the channel data for processing
            const channelData = buffer.getChannelData(0);
            
            // Generate a gunshot sound
            // Initial explosion/crack (high amplitude noise)
            const attackTime = sampleRate * 0.01; // 10ms attack
            for (let i = 0; i < attackTime; i++) {
                channelData[i] = (Math.random() * 2 - 1) * 0.9; // High amplitude white noise
            }
            
            // Quick decay with lower frequency components
            const decayTime = sampleRate * 0.05; // 50ms decay
            for (let i = 0; i < decayTime; i++) {
                const index = i + attackTime;
                const amplitude = 0.9 * (1 - i / decayTime);
                // Add some lower frequency components for more "boom"
                const lowFreq = Math.sin(i * 0.01) * 0.3;
                channelData[index] = ((Math.random() * 2 - 1) + lowFreq) * amplitude;
            }
            
            // Reverb/echo tail with filtered noise
            const reverbStart = attackTime + decayTime;
            const reverbTime = bufferSize - reverbStart;
            for (let i = 0; i < reverbTime; i++) {
                const index = i + reverbStart;
                const amplitude = 0.3 * Math.exp(-5.0 * i / reverbTime);
                // Add filtered noise for more realistic reverb
                const noise = (Math.random() * 2 - 1) * 0.5;
                const filtered = (noise + channelData[index - 1]) * 0.5;
                channelData[index] = filtered * amplitude;
            }
            
            // Set the buffer to our audio
            this.rifleSound.setBuffer(buffer);
            this.rifleSound.setVolume(0.8);
            
            // Add some processing for more impact
            const compressor = audioContext.createDynamicsCompressor();
            compressor.threshold.setValueAtTime(-50, audioContext.currentTime);
            compressor.knee.setValueAtTime(40, audioContext.currentTime);
            compressor.ratio.setValueAtTime(12, audioContext.currentTime);
            compressor.attack.setValueAtTime(0, audioContext.currentTime);
            compressor.release.setValueAtTime(0.25, audioContext.currentTime);
            
            this.rifleSound.setFilter(compressor);
            
            // Create footstep sounds
            this.footstepSounds = [];
            for (let i = 0; i < 4; i++) {
                this.createFootstepSound(i);
            }
            
            this.lastFootstepTime = 0;
            this.footstepInterval = 350; // ms between footsteps
            
            this.debug.innerHTML += '<br>Audio initialized successfully';
            this.audioInitialized = true;
        } catch (error) {
            console.error('Error setting up audio:', error);
            this.debug.innerHTML += `<br>Audio setup error: ${error.message}`;
        }
    }
    
    // Create a single footstep sound variation
    createFootstepSound(variation) {
        if (!this.listener || !this.listener.context) return;
        
        try {
            const footstepSound = new THREE.Audio(this.listener);
            const audioContext = this.listener.context;
            
            // Create a buffer for our footstep sound
            const sampleRate = audioContext.sampleRate;
            const duration = 0.15; // sound duration in seconds
            const bufferSize = sampleRate * duration;
            const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
            
            // Get the channel data for processing
            const channelData = buffer.getChannelData(0);
            
            // Generate a footstep sound
            const attackTime = sampleRate * 0.02; // 20ms attack
            
            // Different "materials" for variety
            let baseTone = 0.3 + (variation * 0.1); // Slightly different tone per variation
            let toneDecay = 0.7 - (variation * 0.05);
            
            // Initial impact
            for (let i = 0; i < attackTime; i++) {
                // Sharper attack for footstep with some randomness
                const phase = i / attackTime; 
                const amplitude = 0.7 * (1 - phase) * (Math.random() * 0.4 + 0.6);
                channelData[i] = Math.sin(i * baseTone) * amplitude;
            }
            
            // Decay part
            const decayStart = attackTime;
            const decayTime = bufferSize - decayStart;
            
            for (let i = 0; i < decayTime; i++) {
                const index = i + decayStart;
                const phase = i / decayTime;
                
                // Exponential decay
                const amplitude = 0.5 * Math.exp(-5.0 * phase);
                
                // Add some noise to simulate material crushing
                const noise = (Math.random() * 2 - 1) * 0.2 * (1 - phase);
                
                // Mix tone and noise for realistic footstep
                channelData[index] = (Math.sin(i * baseTone * toneDecay) * amplitude) + noise * amplitude;
            }
            
            // Set the buffer to our audio
            footstepSound.setBuffer(buffer);
            footstepSound.setVolume(0.4); // Lower volume than gunshot
            
            // Add to footstep sounds array
            this.footstepSounds.push(footstepSound);
        } catch (error) {
            console.error('Error creating footstep sound:', error);
        }
    }
    
    // Play a random footstep sound
    playFootstepSound() {
        if (!this.audioInitialized || this.footstepSounds.length === 0) return;
        
        const now = performance.now();
        if (now - this.lastFootstepTime < this.footstepInterval) return;
        
        this.lastFootstepTime = now;
        
        try {
            // Pick a random footstep sound
            const soundIndex = Math.floor(Math.random() * this.footstepSounds.length);
            const footstepSound = this.footstepSounds[soundIndex];
            
            if (footstepSound && footstepSound.buffer) {
                // Clone for overlapping sounds
                const soundClone = footstepSound.clone();
                
                // Add slight random pitch variation for realism
                const pitchVariation = 0.9 + Math.random() * 0.2; // 0.9-1.1
                soundClone.setPlaybackRate(pitchVariation);
                
                soundClone.play();
            }
        } catch (audioError) {
            console.warn('Error playing footstep sound:', audioError);
        }
    }
    
    createEnvironment() {
        // Create ground with better material and grass texture
        const groundSize = Constants.GAME.GROUND_SIZE;
        const groundTexture = this.createGrassTexture();
        
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: Constants.COLORS.GROUND,
            roughness: 0.8,
            metalness: 0.2,
            map: groundTexture
        });
        
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
        
        // Add 3D grass to the ground
        this.addGrassToGround();
        
        // Add scenic hill with path
        this.createScenicHill();
        
        // Add trees using better materials
        this.trees = [];
        this.createSimpleTrees();
        
        // Add improved log cabin
        this.createLogCabin();
        
        // Add improved lighting
        this.createSimpleLighting();
    }
    
    // Add 3D grass to the ground
    addGrassToGround() {
        const groundSize = Constants.GAME.GROUND_SIZE;
        const grassCount = 5000; // Number of grass patches
        
        // Create grass geometry - a simple cross of planes
        const grassGeometry = new THREE.PlaneGeometry(0.5, 0.8);
        
        // Create grass materials with different shades
        const grassMaterials = [
            new THREE.MeshStandardMaterial({
                color: 0x4a5d32, // Dark green
                roughness: 1.0,
                metalness: 0.0,
                side: THREE.DoubleSide
            }),
            new THREE.MeshStandardMaterial({
                color: 0x5a6b3c, // Medium green
                roughness: 1.0,
                metalness: 0.0,
                side: THREE.DoubleSide
            }),
            new THREE.MeshStandardMaterial({
                color: 0x6b7a45, // Light green
                roughness: 1.0,
                metalness: 0.0,
                side: THREE.DoubleSide
            })
        ];
        
        // Create grass instances
        for (let i = 0; i < grassCount; i++) {
            // Generate random position on the ground
            const x = (Math.random() - 0.5) * (groundSize - 5);
            const z = (Math.random() - 0.5) * (groundSize - 5);
            
            // Skip grass near the cabin
            if (x > -25 && x < -15 && z > -15 && z < -5) {
                continue;
            }
            
            // Skip grass near the hill
            const distToHill = Math.sqrt(Math.pow(x - 50, 2) + Math.pow(z - (-30), 2));
            if (distToHill < 30) {
                continue;
            }
            
            // Create a cross of two planes for 3D grass
            const grassPatch = new THREE.Group();
            
            // Randomly select a grass material
            const materialIndex = Math.floor(Math.random() * grassMaterials.length);
            
            // First plane
            const blade1 = new THREE.Mesh(grassGeometry, grassMaterials[materialIndex]);
            
            // Second plane rotated 90 degrees
            const blade2 = new THREE.Mesh(grassGeometry, grassMaterials[materialIndex]);
            blade2.rotation.y = Math.PI / 2;
            
            grassPatch.add(blade1);
            grassPatch.add(blade2);
            
            // Random scale for variety
            const scale = 0.5 + Math.random() * 0.5;
            grassPatch.scale.set(scale, scale, scale);
            
            // Random rotation for natural look
            grassPatch.rotation.y = Math.random() * Math.PI * 2;
            
            // Position grass on ground
            grassPatch.position.set(x, 0.2, z);
            
            // Add slight random tilt
            grassPatch.rotation.x = (Math.random() * 0.2 - 0.1);
            grassPatch.rotation.z = (Math.random() * 0.2 - 0.1);
            
            this.scene.add(grassPatch);
        }
    }
    
    createScenicHill() {
        // Create the hill using a heightmap
        const hillSize = 60;
        const hillSegments = 100;
        const hillHeight = 25;
        const hillGeometry = new THREE.PlaneGeometry(hillSize, hillSize, hillSegments, hillSegments);
        
        // Generate height data for the hill
        const vertices = hillGeometry.attributes.position.array;
        const pathPoints = [];
        
        // Create a winding path up the hill
        for (let i = 0; i <= 10; i++) {
            const t = i / 10;
            const angle = t * Math.PI * 1.5; // Winding factor
            const radius = (1 - t) * hillSize * 0.4;
            pathPoints.push(new THREE.Vector3(
                Math.cos(angle) * radius,
                t * hillHeight,
                Math.sin(angle) * radius
            ));
        }
        
        // Create a smooth curve for the path
        const pathCurve = new THREE.CatmullRomCurve3(pathPoints);
        
        // Modify vertices to create hill and path
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            
            // Distance from center
            const distance = Math.sqrt(x * x + z * z);
            const maxDistance = hillSize * 0.5;
            
            // Calculate base height using smooth falloff
            let height = Math.cos(distance / maxDistance * Math.PI * 0.5);
            height = Math.max(0, height) * hillHeight;
            
            // Add some noise for natural look
            height += (Math.random() * 0.5 - 0.25) * (height / hillHeight) * 2;
            
            // Check if point is near the path
            const nearestPoint = pathCurve.getPointAt(
                pathCurve.getUtoTmapping(0, distance / maxDistance)
            );
            const distanceToPath = Math.sqrt(
                Math.pow(x - nearestPoint.x, 2) + 
                Math.pow(z - nearestPoint.z, 2)
            );
            
            // Flatten area around path
            if (distanceToPath < 2) {
                const pathBlend = (2 - distanceToPath) / 2;
                height = nearestPoint.y + (height - nearestPoint.y) * (1 - pathBlend);
            }
            
            vertices[i + 1] = height;
        }
        
        // Update geometry
        hillGeometry.computeVertexNormals();
        
        // Create hill texture with grass detail
        const textureLoader = new THREE.TextureLoader();
        const grassTexture = this.createGrassTexture();
        
        // Create materials with proper textures
        const hillMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a5d32, // Base green for hill
            roughness: 0.8,
            metalness: 0.1,
            map: grassTexture,
            displacementScale: 0.5,
            displacementBias: -0.2
        });
        
        // Create hill mesh
        const hill = new THREE.Mesh(hillGeometry, hillMaterial);
        hill.rotation.x = -Math.PI / 2;
        hill.position.set(50, 0, -30); // Position the hill
        hill.castShadow = true;
        hill.receiveShadow = true;
        this.scene.add(hill);
        
        // Create the dirt path
        const pathWidth = 2;
        const pathPoints2D = [];
        for (let i = 0; i <= 100; i++) {
            const point = pathCurve.getPointAt(i / 100);
            pathPoints2D.push(new THREE.Vector2(point.x, point.z));
        }
        
        const pathShape = new THREE.Shape();
        const pathGeometry = new THREE.BufferGeometry();
        const pathVertices = [];
        const pathNormals = [];
        
        // Generate vertices for the path
        for (let i = 0; i < pathPoints2D.length - 1; i++) {
            const current = pathPoints2D[i];
            const next = pathPoints2D[i + 1];
            const direction = next.clone().sub(current).normalize();
            const normal = new THREE.Vector2(-direction.y, direction.x);
            
            // Create path vertices
            pathVertices.push(
                current.x + normal.x * pathWidth, 0, current.y + normal.y * pathWidth,
                current.x - normal.x * pathWidth, 0, current.y - normal.y * pathWidth,
                next.x + normal.x * pathWidth, 0, next.y + normal.y * pathWidth,
                next.x - normal.x * pathWidth, 0, next.y - normal.y * pathWidth
            );
            
            // Add normals
            for (let j = 0; j < 4; j++) {
                pathNormals.push(0, 1, 0);
            }
        }
        
        // Create path geometry
        pathGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pathVertices, 3));
        pathGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(pathNormals, 3));
        
        // Create path material with dirt texture
        const pathMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // Dirt brown
            roughness: 1,
            metalness: 0
        });
        
        // Create path mesh
        const path = new THREE.Mesh(pathGeometry, pathMaterial);
        path.position.copy(hill.position);
        path.position.y += 0.01; // Slightly above the hill to prevent z-fighting
        path.receiveShadow = true;
        this.scene.add(path);
        
        // Add 3D grass on the hill
        this.addGrassToHill(hill, pathCurve, hillSize, hillHeight);
        
        // Add trees on the hill
        this.createHillTrees(hill, pathCurve, hillSize, hillHeight);
    }
    
    // Create a procedural grass texture
    createGrassTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Base green color
        ctx.fillStyle = '#4a5d32';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add grass texture details
        const grassColors = [
            '#4a5d32', // Dark green
            '#5a6b3c', // Medium green
            '#6b7a45', // Light green
            '#3c4f28', // Very dark green
            '#7d8a50'  // Yellow-green
        ];
        
        // Draw grass blades
        for (let i = 0; i < 5000; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const width = 1 + Math.random() * 2;
            const height = 3 + Math.random() * 10;
            const colorIndex = Math.floor(Math.random() * grassColors.length);
            
            ctx.fillStyle = grassColors[colorIndex];
            ctx.beginPath();
            
            // Draw a blade of grass (slightly curved)
            const controlX = x + (Math.random() * 4 - 2);
            ctx.moveTo(x, y + height);
            ctx.quadraticCurveTo(controlX, y + height/2, x, y);
            ctx.lineTo(x + width, y);
            ctx.quadraticCurveTo(controlX + width, y + height/2, x + width, y + height);
            ctx.fill();
        }
        
        // Add some soil/dirt patches
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = 3 + Math.random() * 8;
            
            ctx.fillStyle = `rgba(101, 67, 33, ${Math.random() * 0.2})`;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        
        return texture;
    }
    
    // Add 3D grass to the hill
    addGrassToHill(hill, pathCurve, hillSize, hillHeight) {
        const hillCenter = hill.position;
        const grassCount = 2000; // Number of grass patches
        
        // Create grass geometry - a simple cross of planes
        const grassGeometry = new THREE.PlaneGeometry(0.5, 1);
        
        // Create grass material with alpha for transparency
        const grassMaterial = new THREE.MeshStandardMaterial({
            color: 0x5a6b3c,
            roughness: 1.0,
            metalness: 0.0,
            alphaTest: 0.5,
            side: THREE.DoubleSide
        });
        
        // Create grass instances
        for (let i = 0; i < grassCount; i++) {
            // Generate random position on the hill
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * hillSize * 0.48; // Keep within hill bounds
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            // Calculate height at this point
            const distance = Math.sqrt(x * x + z * z);
            const maxDistance = hillSize * 0.5;
            let height = Math.cos(distance / maxDistance * Math.PI * 0.5);
            height = Math.max(0, height) * hillHeight;
            
            // Check distance from path
            const nearestPoint = pathCurve.getPointAt(
                pathCurve.getUtoTmapping(0, distance / maxDistance)
            );
            const distanceToPath = Math.sqrt(
                Math.pow(x - nearestPoint.x, 2) + 
                Math.pow(z - nearestPoint.z, 2)
            );
            
            // Only place grass if it's not too close to the path
            if (distanceToPath > 1.5) {
                // Create a cross of two planes for 3D grass
                const grassPatch = new THREE.Group();
                
                // First plane
                const blade1 = new THREE.Mesh(grassGeometry, grassMaterial);
                
                // Second plane rotated 90 degrees
                const blade2 = new THREE.Mesh(grassGeometry, grassMaterial);
                blade2.rotation.y = Math.PI / 2;
                
                grassPatch.add(blade1);
                grassPatch.add(blade2);
                
                // Random scale for variety
                const scale = 0.5 + Math.random() * 0.5;
                grassPatch.scale.set(scale, scale, scale);
                
                // Random rotation for natural look
                grassPatch.rotation.y = Math.random() * Math.PI * 2;
                
                // Position grass on hill
                grassPatch.position.set(
                    hillCenter.x + x,
                    hillCenter.y + height + 0.1, // Slightly above ground
                    hillCenter.z + z
                );
                
                // Add slight random tilt
                grassPatch.rotation.x = (Math.random() * 0.2 - 0.1);
                grassPatch.rotation.z = (Math.random() * 0.2 - 0.1);
                
                this.scene.add(grassPatch);
            }
        }
    }
    
    createHillTrees(hill, pathCurve, hillSize, hillHeight) {
        const treeCount = 100; // Number of trees to add on the hill
        const hillCenter = hill.position;
        
        for (let i = 0; i < treeCount; i++) {
            // Generate random position on the hill
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * hillSize * 0.45; // Keep within hill bounds
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            // Calculate height at this point
            const distance = Math.sqrt(x * x + z * z);
            const maxDistance = hillSize * 0.5;
            let height = Math.cos(distance / maxDistance * Math.PI * 0.5);
            height = Math.max(0, height) * hillHeight;
            
            // Check distance from path
            const nearestPoint = pathCurve.getPointAt(
                pathCurve.getUtoTmapping(0, distance / maxDistance)
            );
            const distanceToPath = Math.sqrt(
                Math.pow(x - nearestPoint.x, 2) + 
                Math.pow(z - nearestPoint.z, 2)
            );
            
            // Only place trees if they're not too close to the path
            if (distanceToPath > 3) {
                const tree = new THREE.Group();
                
                // Create tree with size variation based on height
                const heightFactor = height / hillHeight;
                const trunkHeight = (1.5 + Math.random()) * (0.8 + heightFactor * 0.4);
                
                // Create trunk
                const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.2, trunkHeight, 8);
                const trunkMaterial = new THREE.MeshStandardMaterial({
                    color: Constants.COLORS.TREE_TRUNK,
                    roughness: 0.9,
                    metalness: 0.1
                });
                const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
                trunk.position.y = trunkHeight / 2;
                trunk.castShadow = true;
                trunk.receiveShadow = true;
                tree.add(trunk);
                
                // Create foliage layers
                const foliageMaterial = new THREE.MeshStandardMaterial({
                    color: Constants.COLORS.TREE_FOLIAGE,
                    roughness: 0.8,
                    metalness: 0.05
                });
                
                const layers = 2 + Math.floor(Math.random() * 2);
                const maxRadius = (0.8 + Math.random() * 0.4) * (0.8 + heightFactor * 0.4);
                
                for (let j = 0; j < layers; j++) {
                    const layerHeight = 1 + Math.random() * 0.3;
                    const layerRadius = maxRadius * (1 - j / layers * 0.3);
                    
                    const foliageGeometry = new THREE.ConeGeometry(layerRadius, layerHeight, 8);
                    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
                    
                    foliage.position.y = trunkHeight * 0.6 + j * layerHeight * 0.7;
                    foliage.castShadow = true;
                    foliage.receiveShadow = true;
                    tree.add(foliage);
                }
                
                // Position tree on hill
                tree.position.set(
                    hillCenter.x + x,
                    hillCenter.y + height,
                    hillCenter.z + z
                );
                
                // Random rotation
                tree.rotation.y = Math.random() * Math.PI * 2;
                
                // Add slight tilt based on height
                const tiltAngle = (1 - heightFactor) * 0.2;
                tree.rotation.x = (Math.random() - 0.5) * tiltAngle;
                tree.rotation.z = (Math.random() - 0.5) * tiltAngle;
                
                this.scene.add(tree);
                
                // Store for collision detection
                this.trees.push({
                    position: new THREE.Vector3(
                        hillCenter.x + x,
                        hillCenter.y + height,
                        hillCenter.z + z
                    ),
                    radius: maxRadius * 0.8
                });
            }
        }
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
                color: Constants.COLORS.TREE_TRUNK,
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
                color: Constants.COLORS.TREE_FOLIAGE,
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
        
        // Log material with more detail
        const logMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.9,
            metalness: 0.05
        });
        
        // Create walls using horizontal logs (cylinders)
        const wallHeight = 4; // Increased height for more logs
        const logRadius = 0.15; // Slightly smaller logs
        const logCount = Math.floor(wallHeight / (logRadius * 2)); // More logs due to increased height
        
        // Function to create a log wall with more detail
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
                
                // Add slight random offset to each log for more realistic look
                log.position.y += Math.random() * 0.02 - 0.01;
                if (rotation) {
                    log.position.z += Math.random() * 0.04 - 0.02;
                } else {
                    log.position.x += Math.random() * 0.04 - 0.02;
                }
                
                log.castShadow = true;
                log.receiveShadow = true;
                cabin.add(log);
                
                // Add log ends for more realism on front and back walls
                if (!rotation) {
                    const leftEndGeometry = new THREE.CylinderGeometry(logRadius, logRadius, 0.1, 8);
                    const rightEndGeometry = new THREE.CylinderGeometry(logRadius, logRadius, 0.1, 8);
                    
                    const leftEnd = new THREE.Mesh(leftEndGeometry, logMaterial);
                    const rightEnd = new THREE.Mesh(rightEndGeometry, logMaterial);
                    
                    leftEnd.rotation.x = Math.PI / 2;
                    rightEnd.rotation.x = Math.PI / 2;
                    
                    leftEnd.position.set(posX - logLength/2, log.position.y, posZ);
                    rightEnd.position.set(posX + logLength/2, log.position.y, posZ);
                    
                    leftEnd.castShadow = true;
                    rightEnd.castShadow = true;
                    
                    cabin.add(leftEnd);
                    cabin.add(rightEnd);
                }
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
        
        // Create smaller, simpler roof
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B0000,
            roughness: 0.7,
            metalness: 0.1
        });
        
        // Create a simple peaked roof instead of large panels
        // Center ridge beam
        const ridgeGeometry = new THREE.BoxGeometry(0.3, 0.3, 10);
        const ridge = new THREE.Mesh(ridgeGeometry, logMaterial);
        ridge.position.set(0, wallHeight + 0.6, 0);
        ridge.castShadow = true;
        cabin.add(ridge);
        
        // Create roof using two triangular prisms
        const roofHeight = 1.5; // Lower roof height
        const roofWidth = 13;
        const roofDepth = 11;
        
        // Create custom geometry for a sloped roof panel
        const createRoofPanel = (isLeft) => {
            const shape = new THREE.Shape();
            
            // Define the shape of the roof panel (triangle)
            const halfWidth = roofWidth / 2;
            shape.moveTo(-halfWidth, 0);
            shape.lineTo(0, roofHeight);
            shape.lineTo(halfWidth, 0);
            shape.lineTo(-halfWidth, 0);
            
            const extrudeSettings = {
                steps: 1,
                depth: roofDepth,
                bevelEnabled: false
            };
            
            const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            const roof = new THREE.Mesh(geometry, roofMaterial);
            
            // Position and rotate the roof panel
            roof.position.set(0, wallHeight, -roofDepth/2);
            roof.rotation.x = -Math.PI / 2;
            
            if (isLeft) {
                roof.position.x = -0.15;
                roof.rotation.y = 0;
            } else {
                roof.position.x = 0.15;
                roof.rotation.y = Math.PI;
            }
            
            roof.castShadow = true;
            roof.receiveShadow = true;
            return roof;
        };
        
        // Add the two roof panels
        const leftPanel = createRoofPanel(true);
        const rightPanel = createRoofPanel(false);
        cabin.add(leftPanel);
        cabin.add(rightPanel);
        
        // Add log beams supporting the roof
        for (let i = -4; i <= 4; i += 2) {
            // Cross beams
            const beamGeometry = new THREE.CylinderGeometry(0.1, 0.1, 11, 8);
            const beam = new THREE.Mesh(beamGeometry, logMaterial);
            beam.position.set(0, wallHeight + i * 0.2, 0);
            beam.rotation.z = Math.PI / 2;
            beam.castShadow = true;
            cabin.add(beam);
            
            // Support beams
            if (i % 4 === 0) {
                const supportGeometry = new THREE.CylinderGeometry(0.1, 0.1, roofHeight, 8);
                const support = new THREE.Mesh(supportGeometry, logMaterial);
                support.position.set(i, wallHeight + roofHeight/2, 0);
                support.castShadow = true;
                cabin.add(support);
            }
        }
        
        // Chimney
        const chimneyGeometry = new THREE.BoxGeometry(1, 3, 1);
        const chimney = new THREE.Mesh(chimneyGeometry, stoneMaterial);
        chimney.position.set(-3.5, wallHeight + 1.5, -2);
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
        // Ensure camera angles are initialized
        if (!this.cameraAngles) {
            this.cameraAngles = {
                vertical: 0,
                horizontal: 0
            };
        }
        
        // Player state with constants
        this.playerState = {
            position: new THREE.Vector3(0, 1, 0),
            rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
            moveSpeed: Constants.PLAYER.MOVE_SPEED,
            turnSpeed: Constants.PLAYER.TURN_SPEED,
            moving: false,
            shooting: false,
            lastShot: 0,
            shotCooldown: Constants.PLAYER.SHOT_COOLDOWN,
            // Jump properties
            isJumping: false,
            jumpHeight: Constants.PLAYER.JUMP_HEIGHT,
            jumpSpeed: Constants.PLAYER.JUMP_SPEED,
            jumpVelocity: 0,
            gravity: Constants.PLAYER.GRAVITY
        };
        
        // Create player model using a more modular approach
        this.createPlayerModel();
        
        // Position player and add to scene
        this.player.position.copy(this.playerState.position);
        this.scene.add(this.player);
        
        // Setup camera for third-person view
        this.cameraOffset = Constants.PLAYER.CAMERA_OFFSET.clone();
        this.updatePlayerCamera();
    }
    
    createPlayerModel() {
        // Create simple soldier model using basic materials
        this.player = new THREE.Group();
        
        // Body
        const bodyGeometry = new THREE.BoxGeometry(0.5, 0.8, 0.3);
        const bodyMaterial = new THREE.MeshBasicMaterial({ color: Constants.COLORS.SOLDIER_BODY }); 
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.4;
        this.player.add(body);
        
        // Create helmet with camo pattern
        this.createPlayerHelmet();
        
        // Face (visible under the helmet)
        const faceGeometry = new THREE.BoxGeometry(0.22, 0.22, 0.22);
        const faceMaterial = new THREE.MeshBasicMaterial({ color: Constants.COLORS.SOLDIER_FACE });
        const face = new THREE.Mesh(faceGeometry, faceMaterial);
        face.position.set(0, 0.95, 0.05); // Position slightly lower than helmet and forward
        this.player.add(face);
        
        // Create limbs
        this.createPlayerLimbs();
        
        // Create rifle
        this.createRifle();
    }
    
    createPlayerHelmet() {
        // Head with camo helmet
        const headGeometry = new THREE.BoxGeometry(0.35, 0.32, 0.35);
        
        // Create camo material with multiple colors
        const camoColors = Constants.COLORS.CAMO;
        
        // Create a canvas to generate the camo pattern
        const camoCanvas = document.createElement('canvas');
        camoCanvas.width = 128;
        camoCanvas.height = 128;
        const ctx = camoCanvas.getContext('2d');
        
        // Fill with base color
        ctx.fillStyle = '#4b5320';
        ctx.fillRect(0, 0, 128, 128);
        
        // Add random camo spots
        for (let i = 0; i < 40; i++) {
            const x = Math.random() * 128;
            const y = Math.random() * 128;
            const size = 10 + Math.random() * 20;
            const colorIndex = Math.floor(Math.random() * camoColors.length);
            ctx.fillStyle = '#' + camoColors[colorIndex].toString(16);
            ctx.beginPath();
            ctx.ellipse(x, y, size, size * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Create texture from canvas
        const camoTexture = new THREE.CanvasTexture(camoCanvas);
        
        // Create helmet material
        const helmetMaterial = new THREE.MeshBasicMaterial({ map: camoTexture });
        
        // Create the helmet
        const helmet = new THREE.Mesh(headGeometry, helmetMaterial);
        helmet.position.y = 1;
        this.player.add(helmet);
        
        // Add helmet rim - a small flat cylinder around the helmet's bottom
        const rimGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 8);
        const rimMaterial = new THREE.MeshBasicMaterial({ color: 0x3a421a });
        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.position.set(0, 0.88, 0);
        this.player.add(rim);
    }
    
    createPlayerLimbs() {
        // Legs
        const legGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        const legMaterial = new THREE.MeshBasicMaterial({ color: Constants.COLORS.SOLDIER_BODY });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(0.15, -0.3, 0);
        this.player.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(-0.15, -0.3, 0);
        this.player.add(rightLeg);
        
        // Arms
        const armGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        const armMaterial = new THREE.MeshBasicMaterial({ color: Constants.COLORS.SOLDIER_BODY });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(0.35, 0.4, 0);
        this.player.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(-0.35, 0.4, 0);
        this.player.add(rightArm);
    }
    
    createRifle() {
        const rifle = new THREE.Group();
        
        // Rifle body
        const rifleBodyGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.8);
        const rifleMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x000000,
            roughness: 0.7,
            metalness: 0.3
        });
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
        const stockMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 0.9,
            metalness: 0.1
        });
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
        
        // Create hands to hold the rifle
        this.createHands(rifle);
        
        // Position rifle for proper third-person aiming
        rifle.position.set(0.3, 0.4, -0.2); // Moved forward and to the right
        rifle.rotation.set(0, -0.2, 0); // Slight angle for natural hold
        
        this.player.add(rifle);
        this.rifle = rifle;
    }
    
    // Add hands to hold the rifle
    createHands(rifle) {
        const handMaterial = new THREE.MeshBasicMaterial({ color: Constants.COLORS.SOLDIER_FACE });
        
        // Left hand (forward grip)
        const leftHandGeometry = new THREE.BoxGeometry(0.08, 0.12, 0.08);
        const leftHand = new THREE.Mesh(leftHandGeometry, handMaterial);
        leftHand.position.set(0, -0.05, 0.3);
        rifle.add(leftHand);
        
        // Right hand (trigger hand)
        const rightHandGeometry = new THREE.BoxGeometry(0.08, 0.12, 0.08);
        const rightHand = new THREE.Mesh(rightHandGeometry, handMaterial);
        rightHand.position.set(0, -0.05, -0.1);
        rifle.add(rightHand);
        
        // Store references to the hands
        this.leftHand = leftHand;
        this.rightHand = rightHand;
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

        // Camera angles are now initialized in initializeGameComponents
        
        // Track mouse state for shooting
        this.mouseDown = false;
        
        document.addEventListener('keydown', (e) => {
            switch (e.code) {
                case 'KeyW': this.moveState.forward = true; break;
                case 'KeyS': this.moveState.backward = true; break;
                case 'KeyA': this.moveState.left = true; break;
                case 'KeyD': this.moveState.right = true; break;
                case 'Space': this.jump(); break;
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
        
        // Mouse controls with corrected up/down movement
        this.container.addEventListener('click', () => {
            this.container.requestPointerLock();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.container) {
                // Update horizontal rotation (player turning)
                this.playerState.rotation.y -= e.movementX * 0.002;
                
                // Update vertical camera angle with constraints
                // Inverted Y movement for standard third-person controls
                this.cameraAngles.vertical -= e.movementY * 0.002;
                
                // Constrain vertical look
                this.cameraAngles.vertical = Math.max(
                    -Math.PI / 3, // Look up limit
                    Math.min(
                        Math.PI / 6, // Look down limit
                        this.cameraAngles.vertical
                    )
                );
            }
        });
        
        // Shooting controls
        document.addEventListener('mousedown', (e) => {
            if (e.button === 0 && document.pointerLockElement === this.container) {
                this.mouseDown = true;
                this.playerState.shooting = true;
                this.shoot();
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouseDown = false;
                this.playerState.shooting = false;
            }
        });
    }
    
    shoot() {
        // Check cooldown and pointer lock
        const now = performance.now();
        if (now - this.playerState.lastShot < this.playerState.shotCooldown || 
            document.pointerLockElement !== this.container) {
            return;
        }
        
        this.playerState.lastShot = now;
        
        // Play rifle sound
        if (this.audioInitialized && this.rifleSound && this.rifleSound.buffer) {
            try {
                const soundClone = this.rifleSound.clone();
                const pitchVariation = 0.9 + Math.random() * 0.2;
                soundClone.setPlaybackRate(pitchVariation);
                soundClone.play();
            } catch (audioError) {
                console.warn('Error playing rifle sound:', audioError);
            }
        }
        
        // Show muzzle flash
        if (this.muzzleFlash) {
            this.muzzleFlash.visible = true;
            setTimeout(() => {
                this.muzzleFlash.visible = false;
            }, 50);
        }
    }
    
    // Add method to make the player jump
    jump() {
        // Only allow jumping if the player is on the ground
        if (!this.playerState.isJumping && this.playerState.position.y <= 1.01) {
            this.playerState.isJumping = true;
            this.playerState.jumpVelocity = this.playerState.jumpSpeed;
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
    
    updatePlayerCamera() {
        // Ensure camera angles are initialized
        if (!this.cameraAngles) {
            this.cameraAngles = {
                vertical: 0,
                horizontal: 0
            };
            console.warn('Camera angles were not initialized, creating default values');
        }
        
        // Calculate camera position based on player position and offset
        const cameraOffset = this.cameraOffset.clone();
        
        // Apply vertical rotation to camera offset
        const verticalRotationMatrix = new THREE.Matrix4();
        verticalRotationMatrix.makeRotationX(this.cameraAngles.vertical);
        cameraOffset.applyMatrix4(verticalRotationMatrix);
        
        // Apply horizontal rotation (player's rotation)
        cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerState.rotation.y);
        
        // Set camera position
        const targetPosition = this.playerState.position.clone().add(cameraOffset);
        this.camera.position.copy(targetPosition);
        
        // Calculate look target (where the crosshair points)
        const forwardDirection = new THREE.Vector3(0, 0, -1);
        forwardDirection.applyEuler(new THREE.Euler(
            this.cameraAngles.vertical,
            this.playerState.rotation.y,
            0,
            'YXZ'
        ));
        
        // Look target is 20 units ahead in the direction we're facing
        const lookTarget = this.playerState.position.clone();
        lookTarget.add(forwardDirection.multiplyScalar(20));
        
        // Make the camera look at the target
        this.camera.lookAt(lookTarget);
        
        // Update rifle aim to match camera direction
        this.updateRifleAim(lookTarget);
    }
    
    updateRifleAim(lookTarget) {
        if (!this.rifle) return;
        
        // Calculate aim direction from player to look target
        const aimDirection = lookTarget.clone().sub(this.playerState.position);
        aimDirection.normalize();
        
        // Calculate rifle angles for proper third-person aiming
        const rifleRotation = new THREE.Euler(0, 0, 0, 'YXZ');
        rifleRotation.y = Math.atan2(aimDirection.x, aimDirection.z);
        rifleRotation.x = -Math.asin(aimDirection.y) * 0.8; // Reduced vertical rotation for better look
        
        // Smoothly interpolate current rotation to target rotation
        this.rifle.rotation.x += (rifleRotation.x - this.rifle.rotation.x) * 0.3;
        this.rifle.rotation.y += (rifleRotation.y - this.rifle.rotation.y) * 0.3;
        
        // Add subtle weapon sway during movement
        if (this.playerState.moving) {
            const swayAmount = 0.02;
            const swaySpeed = 4;
            const time = performance.now() * 0.001;
            
            this.rifle.rotation.z = Math.sin(time * swaySpeed) * swayAmount;
            this.rifle.position.y = 0.4 + Math.sin(time * swaySpeed * 2) * 0.01;
        } else {
            this.rifle.rotation.z = 0;
            this.rifle.position.y = 0.4;
        }
        
        // Update arm rotations to follow rifle
        const rightArm = this.player.children.find(child => child.position.x === -0.35 && child.position.y === 0.4);
        const leftArm = this.player.children.find(child => child.position.x === 0.35 && child.position.y === 0.4);
        
        if (rightArm && leftArm) {
            rightArm.rotation.x = this.rifle.rotation.x * 0.7;
            rightArm.rotation.y = this.rifle.rotation.y * 0.5;
            
            leftArm.rotation.x = this.rifle.rotation.x * 0.7;
            leftArm.rotation.y = this.rifle.rotation.y * 0.5;
        }
    }
    
    animate() {
        // Use proper game loop with delta time
        const now = performance.now();
        this.deltaTime = (now - (this.lastTime || now)) / 1000; // Convert to seconds
        this.lastTime = now;

        // Cap delta time to avoid huge jumps if tab was inactive
        if (this.deltaTime > Constants.GAME.MAX_DELTA_TIME) {
            this.deltaTime = Constants.GAME.MAX_DELTA_TIME;
        }

        // Track FPS
        if (!this.fpsCounter) {
            this.fpsCounter = {
                frameCount: 0,
                lastCheck: now,
                fps: 0
            };
        }
        
        this.fpsCounter.frameCount++;
        if (now - this.fpsCounter.lastCheck >= 1000) {
            // Update FPS once per second
            this.fpsCounter.fps = this.fpsCounter.frameCount;
            this.fpsCounter.frameCount = 0;
            this.fpsCounter.lastCheck = now;
        }

        requestAnimationFrame(() => this.animate());
        
        try {
            // Update player with delta time
            this.updatePlayer(this.deltaTime);
            
            // Update enemies
            this.enemies.forEach(enemy => {
                enemy.update(this.deltaTime, this.playerState.position);
            });
            
            // Render scene
            this.renderer.render(this.scene, this.camera);
            
            // Update debug info occasionally
            if (now % 100 < 16) { // Update about every 100ms
                this.updateDebugInfo();
            }
        } catch (animateError) {
            console.error('Animation error:', animateError);
            this.debug.innerHTML += `<br>Animation error: ${animateError.message}`;
        }
    }

    updateDebugInfo() {
        // Only update if debug is visible
        if (this.debug.style.display === 'block') {
            const position = this.playerState.position;
            const posText = `Position: ${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}`;
            const rotText = `Rotation: ${(this.playerState.rotation.y * 180 / Math.PI).toFixed(1)}°`;
            const fpsText = `FPS: ${this.fpsCounter?.fps || 0}`;
            
            // Update debug info without clearing previous messages
            const debugLines = this.debug.innerHTML.split('<br>');
            const staticInfo = debugLines.slice(0, 5).join('<br>'); // Keep initialization messages
            
            this.debug.innerHTML = `${staticInfo}<br>${posText}<br>${rotText}<br>${fpsText}`;
        }
    }
    
    updatePlayer(deltaTime) {
        // Calculate movement with delta time for consistent speed
        const direction = new THREE.Vector3(0, 0, 0);
        
        if (this.moveState.forward) direction.z -= 1;
        if (this.moveState.backward) direction.z += 1;
        if (this.moveState.left) direction.x -= 1;
        if (this.moveState.right) direction.x += 1;
        
        this.playerState.moving = direction.length() > 0;
        
        // Handle horizontal movement with delta time
        if (this.playerState.moving) {
            // Normalize direction vector and apply rotation
            direction.normalize();
            direction.applyEuler(this.playerState.rotation);
            
            // Apply delta time to movement speed
            const scaledSpeed = this.playerState.moveSpeed * deltaTime * 60; // Normalize to 60fps
            
            // Calculate new position but don't apply it yet
            const movement = direction.multiplyScalar(scaledSpeed);
            const newPosition = this.playerState.position.clone();
            newPosition.x += movement.x;
            newPosition.z += movement.z;
            
            // Check for collisions before applying movement
            if (!this.checkCollisions(newPosition)) {
                // No collision, apply movement
                this.playerState.position.copy(newPosition);
                
                // Play footstep sound when moving
                this.playFootstepSound();
            }
            
            // Update player mesh rotation
            this.player.rotation.y = this.playerState.rotation.y;
        }
        
        // Handle jumping and gravity with delta time
        if (this.playerState.isJumping) {
            // Scale gravity and jump velocity by delta time
            const scaledGravity = this.playerState.gravity * deltaTime * 60;
            const scaledVelocity = this.playerState.jumpVelocity * deltaTime * 60;
            
            // Apply jump velocity
            this.playerState.position.y += scaledVelocity;
            
            // Apply gravity to reduce jump velocity
            this.playerState.jumpVelocity -= scaledGravity;
            
            // Check if player has landed
            if (this.playerState.position.y <= 1 && this.playerState.jumpVelocity < 0) {
                this.playerState.position.y = 1; // Reset to ground level
                this.playerState.isJumping = false;
                this.playerState.jumpVelocity = 0;
                
                // Play landing sound (use a footstep but louder)
                if (this.audioInitialized && this.footstepSounds.length > 0) {
                    try {
                        const landSound = this.footstepSounds[0].clone();
                        landSound.setVolume(0.6); // Louder than regular footstep
                        landSound.setPlaybackRate(0.7); // Slower for more weight
                        landSound.play();
                    } catch (e) {
                        console.warn('Error playing landing sound:', e);
                    }
                }
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