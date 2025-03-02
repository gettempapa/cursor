import * as THREE from 'three';

class Game {
    constructor() {
        this.container = document.getElementById('gameContainer');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Set up renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87ceeb); // Sky blue background
        this.container.appendChild(this.renderer.domElement);
        
        // Add physics state
        this.velocity = new THREE.Vector3();
        this.gravity = -0.015;
        this.jumpForce = 0.3;
        this.isGrounded = true;
        
        // Store crates for collision detection
        this.crates = [];
        
        // Movement and rotation state
        this.moveState = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false
        };
        this.moveSpeed = 0.1;
        this.rotationSpeed = 0.002;
        this.mouseX = 0;
        this.mouseY = 0;
        
        this.trees = []; // Store tree references for collision detection
        this.treeCollisionRadius = 1.5; // Collision radius for trees
        this.playerCollisionRadius = 0.5; // Collision radius for player
        
        // Camera settings
        this.defaultCameraDistance = 9.75; // 35% closer than 15 units
        this.cameraOffset = new THREE.Vector3(0, 2, this.defaultCameraDistance);
        this.cameraLookOffset = new THREE.Vector3(0, 1, 0);
        this.currentZoomDistance = this.defaultCameraDistance;
        this.minZoomDistance = this.defaultCameraDistance * 0.5; // 50% closer
        this.maxZoomDistance = this.defaultCameraDistance * 1.5; // 50% further
        this.zoomSpeed = 0.0015;
        
        // Shooting state
        this.isShooting = false;
        this.muzzleFlash = null;
        this.muzzleLight = null;
        this.flashDuration = 50; // milliseconds
        
        // Animation state
        this.legAngle = 0;
        this.legAnimationSpeed = 0.15;
        this.verticalAngle = 0;
        this.minVerticalAngle = -Math.PI / 6; // -30 degrees
        this.maxVerticalAngle = Math.PI / 3;  // 60 degrees
        
        // Enemy state
        this.enemy = null;
        this.enemyTarget = new THREE.Vector3();
        this.enemyRotationTarget = 0;
        this.enemyMoveSpeed = 0.05;
        this.enemyRotationSpeed = 0.02;
        this.enemyUpdateInterval = 3000; // milliseconds between new random targets
        this.levelRadius = 20; // Confine enemy to this radius
        this.enemyShootInterval = 2000; // Time between enemy shots
        this.enemyLastShot = 0; // Track last enemy shot time
        this.enemyMuzzleFlash = null; // Enemy's muzzle flash
        this.enemyMuzzleLight = null; // Enemy's muzzle light
        
        // Audio setup
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.gunshotBuffer = null;
        this.loadGunshotSound();
        
        // Add death state
        this.isDead = false;
        this.deathMessageContainer = null;
        
        // Add weapon state
        this.currentWeapon = 'rifle';
        this.weaponMenuVisible = false;
        this.weaponMenuContainer = null;
        
        // Set up basic scene
        this.setupScene();
        
        // Set up controls
        this.setupControls();
        
        // Set up weapon menu
        this.setupWeaponMenu();
        
        // Handle window resizing
        window.addEventListener('resize', () => this.onWindowResize(), false);
        
        // Lock pointer on click
        this.container.addEventListener('click', () => {
            this.container.requestPointerLock();
        });
        
        // Add crosshair
        this.setupCrosshair();
        
        // Start the animation loop
        this.animate();
    }
    
    createSoldier(isEnemy = false) {
        const soldier = new THREE.Group();
        
        // Body (torso)
        const torsoGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.4);
        const uniformMaterial = new THREE.MeshStandardMaterial({ color: 0x4a5243 }); // Military green
        const torso = new THREE.Mesh(torsoGeometry, uniformMaterial);
        torso.position.y = 0.4;
        soldier.add(torso);
        
        // Head
        const headGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xe0b59e }); // Skin color
        const head = new THREE.Mesh(headGeometry, skinMaterial);
        head.position.y = 0.95;
        soldier.add(head);
        
        // Helmet
        const helmetGeometry = new THREE.BoxGeometry(0.35, 0.2, 0.35);
        const helmetMaterial = new THREE.MeshStandardMaterial({ color: 0x2f3230 }); // Dark gray
        const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
        helmet.position.y = 1.1;
        soldier.add(helmet);
        
        // Legs
        const legGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        const leftLeg = new THREE.Mesh(legGeometry, uniformMaterial);
        leftLeg.position.set(0.15, -0.3, 0);
        soldier.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, uniformMaterial);
        rightLeg.position.set(-0.15, -0.3, 0);
        soldier.add(rightLeg);
        
        // Arms
        const armGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        const leftArm = new THREE.Mesh(armGeometry, uniformMaterial);
        leftArm.position.set(0.4, 0.4, 0);
        soldier.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, uniformMaterial);
        rightArm.position.set(-0.4, 0.4, 0);
        soldier.add(rightArm);

        // Add initial weapon (rifle)
        if (!isEnemy) {
            const rifle = this.createRifle();
            soldier.add(rifle);
        } else {
            // Enemy always uses rifle
            const rifle = this.createRifle();
            soldier.add(rifle);
        }
        
        return soldier;
    }
    
    createPineTree(x, z, scale = 1, type = 'pine') {
        const treeGroup = new THREE.Group();
        
        // Randomize tree characteristics
        const heightVariation = 0.8 + Math.random() * 0.4;
        const trunkTwist = (Math.random() - 0.5) * 0.2;
        const branchDensity = 0.7 + Math.random() * 0.6;
        
        // Enhanced trunk with natural twist and bark texture
        const trunkGeometry = new THREE.CylinderGeometry(0.2 * scale, 0.3 * scale, 4 * scale * heightVariation, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ 
            color: type === 'pine' ? 0x4d2926 : 0x6b4423,
            roughness: 0.9,
            metalness: 0.1,
            bumpScale: 0.5
        });
        
        // Add twist to trunk vertices
        const trunkPositions = trunkGeometry.attributes.position.array;
        for (let i = 0; i < trunkPositions.length; i += 3) {
            const y = trunkPositions[i + 1];
            const angle = y * trunkTwist;
            const x = trunkPositions[i];
            const z = trunkPositions[i + 2];
            trunkPositions[i] = x * Math.cos(angle) - z * Math.sin(angle);
            trunkPositions[i + 2] = x * Math.sin(angle) + z * Math.cos(angle);
        }
        trunkGeometry.attributes.position.needsUpdate = true;
        
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 2 * scale;
        treeGroup.add(trunk);
        
        // Create more natural-looking foliage
        const leafMaterial = new THREE.MeshStandardMaterial({ 
            color: type === 'pine' ? 0x0b5c0b : 0x2d5a27,
            roughness: 0.8
        });
        
        const createLayer = (y, radius, height) => {
            const coneGeometry = new THREE.ConeGeometry(radius * scale, height * scale, 8);
            const cone = new THREE.Mesh(coneGeometry, leafMaterial);
            cone.position.y = y * scale;
            treeGroup.add(cone);
        };
        
        // Add layers with scale factor
        createLayer(5.5, 1.5, 3);
        createLayer(4.5, 1.8, 2.5);
        createLayer(3.5, 2, 2);
        
        treeGroup.position.set(x, 0, z);
        
        // Store tree position and radius for collision detection
        this.trees.push({
            position: new THREE.Vector2(x, z),
            radius: this.treeCollisionRadius * scale
        });
        
        return treeGroup;
    }
    
    checkCollisions(newPosition) {
        const playerPosition = new THREE.Vector2(newPosition.x, newPosition.z);
        
        // Check tree collisions
        for (const tree of this.trees) {
            const distance = playerPosition.distanceTo(tree.position);
            if (distance < (this.playerCollisionRadius + tree.radius)) {
                return true;
            }
        }
        
        // Check crate collisions
        for (const crate of this.crates) {
            // Only check horizontal collision if we're not above the crate
            if (newPosition.y <= crate.position.y + crate.size.y) {
                const dx = Math.abs(newPosition.x - crate.position.x);
                const dz = Math.abs(newPosition.z - crate.position.z);
                
                if (dx < (crate.size.x / 2 + this.playerCollisionRadius) &&
                    dz < (crate.size.z / 2 + this.playerCollisionRadius)) {
                    return true;
                }
            }
        }
        
        // Check bunker collisions
        if (this.bunkerBox) {
            const margin = 0.3;
            const isInBunkerX = newPosition.x >= (this.bunkerBox.min.x + margin) && 
                               newPosition.x <= (this.bunkerBox.max.x - margin);
            const isInBunkerZ = newPosition.z >= (this.bunkerBox.min.z + margin) && 
                               newPosition.z <= (this.bunkerBox.max.z - margin);
            
            if ((isInBunkerX && !isInBunkerZ && newPosition.z > this.bunkerBox.min.z - margin && 
                 newPosition.z < this.bunkerBox.max.z + margin) ||
                (!isInBunkerX && isInBunkerZ && newPosition.x > this.bunkerBox.min.x - margin && 
                 newPosition.x < this.bunkerBox.max.x + margin)) {
                return true;
            }
        }
        
        return false;
    }
    
    setupScene() {
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Brighter ambient light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // Increased intensity
        directionalLight.position.set(1, 2, 1); // Adjusted light position
        this.scene.add(ambientLight);
        this.scene.add(directionalLight);

        // Add bunker
        this.createBunker();
        
        // Add bridge
        this.createBridge();

        // Add crates
        this.createCrates();

        // Add enhanced fog for misty mountains
        this.scene.fog = new THREE.Fog(0x87ceeb, 50, 150); // Match sky color
        
        // Create epic mountains
        this.createMountains();
        
        // Add ground with enhanced texture
        this.createGround();
        
        // Add stream
        this.createStream();
        
        // Add varied trees
        this.createTrees();
        
        // Create and add soldier model at a safe starting position
        this.soldier = this.createSoldier(false);
        this.player = new THREE.Group();
        this.player.add(this.soldier);
        this.player.position.set(5, 1, 5);
        this.scene.add(this.player);
        
        // Set up camera
        this.camera.position.copy(this.player.position).add(this.cameraOffset);
        this.scene.add(this.camera);
        
        // Create and add enemy
        this.enemy = this.createSoldier(true);
        this.enemy.position.set(-5, 1, -5);
        this.scene.add(this.enemy);
        
        // Start enemy AI
        this.updateEnemyTarget();
        setInterval(() => this.updateEnemyTarget(), this.enemyUpdateInterval);
    }
    
    setupControls() {
        // Mouse movement
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.container) {
                this.mouseX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
                this.mouseY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
                
                // Horizontal rotation
                this.player.rotation.y -= this.mouseX * this.rotationSpeed;
                
                // Vertical camera angle with limits
                this.verticalAngle -= this.mouseY * this.rotationSpeed;
                this.verticalAngle = Math.max(this.minVerticalAngle, Math.min(this.maxVerticalAngle, this.verticalAngle));
            }
        });
        
        // WASD and Space controls
        document.addEventListener('keydown', (e) => {
            switch(e.code) {
                case 'KeyW': this.moveState.forward = true; break;
                case 'KeyS': this.moveState.backward = true; break;
                case 'KeyA': this.moveState.left = true; break;
                case 'KeyD': this.moveState.right = true; break;
                case 'Space': 
                    if (this.isGrounded) {
                        this.velocity.y = this.jumpForce;
                        this.isGrounded = false;
                    }
                    break;
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

        // Add mouse click handler for shooting
        this.container.addEventListener('mousedown', (e) => {
            if (document.pointerLockElement === this.container && e.button === 0) {
                this.shoot();
            }
        });

        // Add mouse wheel handler for zooming
        document.addEventListener('wheel', (e) => {
            if (document.pointerLockElement === this.container) {
                // Update zoom distance based on wheel delta
                this.currentZoomDistance += e.deltaY * this.zoomSpeed;
                
                // Clamp zoom distance between min and max
                this.currentZoomDistance = Math.max(
                    this.minZoomDistance,
                    Math.min(this.maxZoomDistance, this.currentZoomDistance)
                );
                
                // Update camera offset z component
                this.cameraOffset.z = this.currentZoomDistance;
            }
        });

        // Add respawn handler
        document.addEventListener('keydown', () => {
            if (this.isDead) {
                this.respawn();
            }
        });

        this.container.addEventListener('click', () => {
            if (this.isDead) {
                this.respawn();
            } else if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        });

        // Add weapon menu controls
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyI') {
                this.toggleWeaponMenu(!this.weaponMenuVisible);
            } else if (this.weaponMenuVisible) {
                switch(e.code) {
                    case 'Digit1':
                        this.switchWeapon('rifle');
                        break;
                    case 'Digit2':
                        this.switchWeapon('pistol');
                        break;
                }
            }
        });
    }
    
    updateMovement() {
        if (this.isDead) return; // No movement when dead
        
        // Update vertical movement (jumping/falling)
        if (!this.isGrounded) {
            this.velocity.y += this.gravity;
            this.player.position.y += this.velocity.y;
            
            // Check for ground collision
            if (this.player.position.y <= 1) {
                this.player.position.y = 1;
                this.velocity.y = 0;
                this.isGrounded = true;
            }
        }
        
        // Calculate horizontal movement direction
        const direction = new THREE.Vector3();
        
        if (this.moveState.forward) direction.z -= 1;
        if (this.moveState.backward) direction.z += 1;
        if (this.moveState.left) direction.x -= 1;
        if (this.moveState.right) direction.x += 1;
        
        // Normalize direction vector and apply player's rotation
        if (direction.length() > 0) {
            direction.normalize();
            direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.rotation.y);
            
            // Animate legs when moving
            this.legAngle += this.legAnimationSpeed;
            
            // Get references to legs
            const leftLeg = this.soldier.children.find(child => child.position.x === 0.15 && child.position.y === -0.3);
            const rightLeg = this.soldier.children.find(child => child.position.x === -0.15 && child.position.y === -0.3);
            
            if (leftLeg && rightLeg) {
                // Alternate leg movements
                leftLeg.rotation.x = Math.sin(this.legAngle) * 0.5;
                rightLeg.rotation.x = Math.sin(this.legAngle + Math.PI) * 0.5;
            }

            // Calculate new position
            const newPosition = new THREE.Vector3(
                this.player.position.x + direction.x * this.moveSpeed,
                this.player.position.y,
                this.player.position.z + direction.z * this.moveSpeed
            );
            
            // Check for stream collision if not on bridge
            if (!this.bridgeBox.containsPoint(newPosition) && this.checkStreamCollision(newPosition)) {
                if (!this.isDead) {
                    this.isDead = true;
                    this.showDeathMessage();
                    // Make player fall over
                    this.soldier.rotation.z = Math.PI / 2;
                }
                return;
            }
            
            // Check for other collisions before updating position
            if (!this.checkCollisions(newPosition)) {
                this.player.position.copy(newPosition);
            }
        } else {
            // Reset legs to standing position when not moving
            const leftLeg = this.soldier.children.find(child => child.position.x === 0.15 && child.position.y === -0.3);
            const rightLeg = this.soldier.children.find(child => child.position.x === -0.15 && child.position.y === -0.3);
            
            if (leftLeg && rightLeg) {
                leftLeg.rotation.x = 0;
                rightLeg.rotation.x = 0;
            }
        }
    }
    
    updateCamera() {
        // Calculate desired camera position
        const idealOffset = this.cameraOffset.clone();
        
        // Apply vertical rotation to camera offset
        const verticalRotationMatrix = new THREE.Matrix4();
        verticalRotationMatrix.makeRotationX(this.verticalAngle);
        idealOffset.applyMatrix4(verticalRotationMatrix);
        
        // Apply horizontal rotation
        idealOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.rotation.y);
        const idealPosition = this.player.position.clone().add(idealOffset);
        
        // Ensure camera doesn't go below ground level
        idealPosition.y = Math.max(0.5, idealPosition.y);
        
        // Update camera position
        this.camera.position.copy(idealPosition);
        
        // Calculate look target (slightly above player)
        const lookTarget = this.player.position.clone().add(this.cameraLookOffset);
        this.camera.lookAt(lookTarget);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Animate stream particles
        if (this.streamParticles) {
            const positions = this.streamParticles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 2] -= 0.1; // Move particles along stream
                if (positions[i + 2] < -50) {
                    positions[i + 2] = 50; // Reset particle to start
                }
            }
            this.streamParticles.geometry.attributes.position.needsUpdate = true;
        }
        
        this.updateMovement();
        this.updateCamera();
        this.updateEnemy();
        this.renderer.render(this.scene, this.camera);
    }

    setupCrosshair() {
        // Create crosshair container - positioned up and to the right
        const crosshairContainer = document.createElement('div');
        crosshairContainer.style.position = 'absolute';
        crosshairContainer.style.top = '45%'; // Moved up
        crosshairContainer.style.left = '52%'; // Moved right
        crosshairContainer.style.transform = 'translate(-50%, -50%)';
        crosshairContainer.style.width = '20px'; // Slightly smaller
        crosshairContainer.style.height = '20px';
        crosshairContainer.style.pointerEvents = 'none';

        // Create crosshair
        const crosshair = document.createElement('div');
        crosshair.style.width = '100%';
        crosshair.style.height = '100%';
        crosshair.style.position = 'relative';
        
        // Add circle
        const circle = document.createElement('div');
        circle.style.position = 'absolute';
        circle.style.width = '100%';
        circle.style.height = '100%';
        circle.style.border = '1.5px solid rgba(255, 255, 255, 0.8)'; // White, thinner, more professional
        circle.style.borderRadius = '50%';
        crosshair.appendChild(circle);
        
        // Add crosshair lines
        const createLine = (vertical) => {
            const line = document.createElement('div');
            line.style.position = 'absolute';
            line.style.backgroundColor = 'rgba(255, 255, 255, 0.8)'; // White
            
            if (vertical) {
                line.style.width = '1.5px'; // Thinner lines
                line.style.height = '100%';
                line.style.left = '50%';
                line.style.transform = 'translateX(-50%)';
            } else {
                line.style.height = '1.5px'; // Thinner lines
                line.style.width = '100%';
                line.style.top = '50%';
                line.style.transform = 'translateY(-50%)';
            }
            
            return line;
        };

        crosshair.appendChild(createLine(true));
        crosshair.appendChild(createLine(false));
        
        crosshairContainer.appendChild(crosshair);
        this.container.appendChild(crosshairContainer);
    }

    loadGunshotSound() {
        const duration = 0.5; // Longer for more bass and echo
        const sampleRate = this.audioContext.sampleRate;
        this.gunshotBuffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = this.gunshotBuffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            
            // Initial supersonic crack (sharper and louder)
            const crack = Math.exp(-t * 800) * (Math.random() * 2 - 1) * 1.2;
            
            // Deep bass impact (lower frequency, more powerful)
            const bass = Math.exp(-t * 20) * Math.sin(2 * Math.PI * 60 * t) * 1.5;
            
            // Mid-frequency body (fuller sound)
            const mid = Math.exp(-t * 80) * Math.sin(2 * Math.PI * 300 * t);
            
            // High-frequency crack detail
            const highCrack = Math.exp(-t * 1000) * Math.sin(2 * Math.PI * 2000 * t) * 0.3;
            
            // Combine components with enhanced mixing
            data[i] = (
                crack * 0.8 +     // Sharper initial crack
                bass * 0.7 +      // Stronger bass
                mid * 0.5 +       // Fuller mid-range
                highCrack * 0.4   // Crisp high-end detail
            ) * 4.0;             // Overall volume boost
        }
    }

    playGunshot() {
        if (!this.gunshotBuffer) return;
        
        const source = this.audioContext.createBufferSource();
        source.buffer = this.gunshotBuffer;
        
        // Enhanced bass frequencies
        const lowpass = this.audioContext.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 300; // Lower frequency for more bass
        lowpass.Q.value = 10.0; // Sharper resonance
        
        // Supersonic crack frequencies
        const highpass = this.audioContext.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 3000; // Higher for sharper crack
        highpass.Q.value = 7.0;
        
        // More aggressive compression
        const compressor = this.audioContext.createDynamicsCompressor();
        compressor.threshold.value = -30;
        compressor.knee.value = 0;
        compressor.ratio.value = 15;
        compressor.attack.value = 0;
        compressor.release.value = 0.2;
        
        // Enhanced echo effect
        const convolver = this.audioContext.createConvolver();
        const reverbTime = 4.0;
        const rate = this.audioContext.sampleRate;
        const length = rate * reverbTime;
        const impulse = this.audioContext.createBuffer(2, length, rate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);
        
        // Create more powerful echo reflections
        for (let i = 0; i < length; i++) {
            const t = i / rate;
            const echoPeaks = [0.03, 0.08, 0.12, 0.2, 0.3, 0.5];
            let echoSum = 0;
            for (const delay of echoPeaks) {
                echoSum += Math.exp(-15 * Math.abs(t - delay)) * (1 - t / reverbTime);
            }
            const decay = Math.exp(-1.2 * i / length);
            left[i] = decay * (1 + echoSum) * 0.8;
            right[i] = decay * (1 + echoSum) * 0.8;
        }
        convolver.buffer = impulse;
        
        // Volume controls
        const mainGain = this.audioContext.createGain();
        mainGain.gain.value = 1.0; // Full volume
        
        const reverbGain = this.audioContext.createGain();
        reverbGain.gain.value = 0.7; // Stronger echo
        
        // Connect the enhanced audio chain
        source.connect(compressor);
        compressor.connect(lowpass);
        lowpass.connect(highpass);
        
        // Split into direct sound and echo
        const directGain = this.audioContext.createGain();
        directGain.gain.value = 0.8;
        highpass.connect(directGain);
        directGain.connect(mainGain);
        mainGain.connect(this.audioContext.destination);
        
        // Echo path
        highpass.connect(convolver);
        convolver.connect(reverbGain);
        reverbGain.connect(this.audioContext.destination);
        
        source.start();
    }

    shoot(isEnemy = false) {
        if (isEnemy) {
            if (!this.enemyMuzzleFlash) return;
            
            // Show enemy muzzle flash
            this.enemyMuzzleFlash.material.opacity = 1;
            this.enemyMuzzleLight.intensity = 2;
            
            // Play gunshot sound
            this.playGunshot();
            
            // Hide enemy muzzle flash after duration
            setTimeout(() => {
                this.enemyMuzzleFlash.material.opacity = 0;
                this.enemyMuzzleLight.intensity = 0;
            }, this.flashDuration);
            
        } else {
            if (this.isShooting) return;
            this.isShooting = true;
            
            // Show player muzzle flash
            this.muzzleFlash.material.opacity = 1;
            this.muzzleLight.intensity = 2;
            
            // Play gunshot sound
            this.playGunshot();
            
            // Hide player muzzle flash after duration
            setTimeout(() => {
                this.muzzleFlash.material.opacity = 0;
                this.muzzleLight.intensity = 0;
                this.isShooting = false;
            }, this.flashDuration);
        }
    }

    updateEnemyTarget() {
        // Set new random position target within level bounds
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * this.levelRadius;
        this.enemyTarget.set(
            Math.cos(angle) * radius,
            1,
            Math.sin(angle) * radius
        );
        
        // Set new random rotation target
        this.enemyRotationTarget = Math.random() * Math.PI * 2;
    }

    updateEnemy() {
        if (!this.enemy) return;

        // Move towards target
        const direction = this.enemyTarget.clone().sub(this.enemy.position);
        if (direction.length() > 0.1) {
            direction.normalize();
            this.enemy.position.add(direction.multiplyScalar(this.enemyMoveSpeed));
            
            // Animate legs while moving
            const leftLeg = this.enemy.children.find(child => child.position.x === 0.15 && child.position.y === -0.3);
            const rightLeg = this.enemy.children.find(child => child.position.x === -0.15 && child.position.y === -0.3);
            
            if (leftLeg && rightLeg) {
                const time = performance.now() * 0.005;
                leftLeg.rotation.x = Math.sin(time) * 0.5;
                rightLeg.rotation.x = Math.sin(time + Math.PI) * 0.5;
            }
        }

        // Make enemy face player
        const toPlayer = new THREE.Vector3();
        toPlayer.subVectors(this.player.position, this.enemy.position);
        this.enemy.rotation.y = Math.atan2(-toPlayer.x, -toPlayer.z);

        // Enemy shooting logic
        const currentTime = performance.now();
        if (currentTime - this.enemyLastShot > this.enemyShootInterval) {
            this.shoot(true);
            this.enemyLastShot = currentTime;
        }

        // Check for collisions with trees
        const enemyPosition2D = new THREE.Vector2(this.enemy.position.x, this.enemy.position.z);
        for (const tree of this.trees) {
            const distance = enemyPosition2D.distanceTo(tree.position);
            if (distance < (this.playerCollisionRadius + tree.radius)) {
                // If collision detected, get new target
                this.updateEnemyTarget();
                break;
            }
        }
    }

    createBunker() {
        const bunkerGroup = new THREE.Group();
        
        // Bunker materials
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x5c5c5c,
            roughness: 0.7,
            metalness: 0.2
        });
        const windowMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.5,
            metalness: 0.3
        });

        // Main bunker structure (8x4x6 meters - increased size)
        const bunkerGeometry = new THREE.BoxGeometry(8, 4, 6);
        const bunker = new THREE.Mesh(bunkerGeometry, wallMaterial);
        bunker.position.set(12, 2, -12); // Moved further out
        
        // Create windows (scaled up)
        const windowWidth = 1.5;
        const windowHeight = 1.2;
        const windowDepth = 0.3;
        const windowGeometry = new THREE.BoxGeometry(windowWidth, windowHeight, windowDepth);
        
        // Front windows
        const frontWindow1 = new THREE.Mesh(windowGeometry, windowMaterial);
        frontWindow1.position.set(-2.5, 0.5, 3);
        bunker.add(frontWindow1);
        
        const frontWindow2 = new THREE.Mesh(windowGeometry, windowMaterial);
        frontWindow2.position.set(2.5, 0.5, 3);
        bunker.add(frontWindow2);
        
        // Side windows
        const sideWindow1 = new THREE.Mesh(windowGeometry, windowMaterial);
        sideWindow1.rotation.y = Math.PI / 2;
        sideWindow1.position.set(4, 0.5, 0);
        bunker.add(sideWindow1);
        
        const sideWindow2 = new THREE.Mesh(windowGeometry, windowMaterial);
        sideWindow2.rotation.y = Math.PI / 2;
        sideWindow2.position.set(-4, 0.5, 0);
        bunker.add(sideWindow2);
        
        // Add entrance (no door, just an opening)
        const entranceWidth = 2;
        const entranceHeight = 2.5;
        const entranceGeometry = new THREE.BoxGeometry(entranceWidth, entranceHeight, 0.3);
        const entrance = new THREE.Mesh(entranceGeometry, windowMaterial);
        entrance.position.set(0, -0.5, -3);
        bunker.add(entrance);
        
        // Add roof overhang
        const roofGeometry = new THREE.BoxGeometry(8.5, 0.3, 6.5);
        const roof = new THREE.Mesh(roofGeometry, wallMaterial);
        roof.position.set(0, 2.1, 0);
        bunker.add(roof);
        
        bunkerGroup.add(bunker);
        this.scene.add(bunkerGroup);
        
        // Update bunker collision box
        const bunkerBox = new THREE.Box3(
            new THREE.Vector3(8, 0, -15),  // min point
            new THREE.Vector3(16, 4, -9)   // max point
        );
        this.bunkerBox = bunkerBox;
    }

    createBridge() {
        const bridgeGroup = new THREE.Group();
        
        // Bridge materials
        const woodMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.9,
            metalness: 0.1
        });
        
        // Main bridge platform - extended to cover full stream width
        const bridgeGeometry = new THREE.BoxGeometry(6, 0.2, 6);
        const bridge = new THREE.Mesh(bridgeGeometry, woodMaterial);
        bridge.position.set(0, 0.3, 0);
        bridgeGroup.add(bridge);
        
        // Add railings
        const railingGeometry = new THREE.BoxGeometry(0.1, 0.5, 6);
        const leftRailing = new THREE.Mesh(railingGeometry, woodMaterial);
        leftRailing.position.set(-2.9, 0.5, 0);
        bridgeGroup.add(leftRailing);
        
        const rightRailing = new THREE.Mesh(railingGeometry, woodMaterial);
        rightRailing.position.set(2.9, 0.5, 0);
        bridgeGroup.add(rightRailing);
        
        // Add support posts
        const postGeometry = new THREE.BoxGeometry(0.2, 1.5, 0.2); // Made posts taller
        const positions = [
            [-2.9, -0.6, -2.9], // Lowered posts to reach riverbed
            [-2.9, -0.6, 2.9],
            [2.9, -0.6, -2.9],
            [2.9, -0.6, 2.9]
        ];
        
        positions.forEach(pos => {
            const post = new THREE.Mesh(postGeometry, woodMaterial);
            post.position.set(...pos);
            bridgeGroup.add(post);
        });
        
        // Position bridge over stream
        bridgeGroup.position.set(0, 0, 0);
        this.scene.add(bridgeGroup);
        
        // Update bridge bounds for collision detection
        this.bridgeBox = new THREE.Box3(
            new THREE.Vector3(-3, 0, -3),
            new THREE.Vector3(3, 0.5, 3)
        );
    }

    checkStreamCollision(position) {
        // Get stream position (it meanders, so we need to check along its path)
        const streamX = Math.sin(position.z * 0.1) * 2;
        const streamWidth = 1.5; // Half the actual stream width
        
        // Check if player is within stream bounds
        return Math.abs(position.x - streamX) < streamWidth;
    }

    showDeathMessage() {
        if (!this.deathMessageContainer) {
            this.deathMessageContainer = document.createElement('div');
            this.deathMessageContainer.style.position = 'absolute';
            this.deathMessageContainer.style.top = '50%';
            this.deathMessageContainer.style.left = '50%';
            this.deathMessageContainer.style.transform = 'translate(-50%, -50%)';
            this.deathMessageContainer.style.color = 'red';
            this.deathMessageContainer.style.fontSize = '48px';
            this.deathMessageContainer.style.fontWeight = 'bold';
            this.deathMessageContainer.style.textShadow = '2px 2px 4px black';
            this.deathMessageContainer.style.fontFamily = 'Arial, sans-serif';
            this.deathMessageContainer.textContent = 'YOU DIED';
            this.container.appendChild(this.deathMessageContainer);
        }
        this.deathMessageContainer.style.display = 'block';
    }

    hideDeathMessage() {
        if (this.deathMessageContainer) {
            this.deathMessageContainer.style.display = 'none';
        }
    }

    respawn() {
        this.isDead = false;
        this.hideDeathMessage();
        this.player.position.set(5, 1, 5);
        this.player.rotation.set(0, 0, 0);
        this.soldier.rotation.set(0, 0, 0);
    }

    setupWeaponMenu() {
        // Create weapon menu container
        this.weaponMenuContainer = document.createElement('div');
        this.weaponMenuContainer.style.position = 'absolute';
        this.weaponMenuContainer.style.top = '50%';
        this.weaponMenuContainer.style.left = '50%';
        this.weaponMenuContainer.style.transform = 'translate(-50%, -50%)';
        this.weaponMenuContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.weaponMenuContainer.style.padding = '20px';
        this.weaponMenuContainer.style.borderRadius = '10px';
        this.weaponMenuContainer.style.display = 'none';
        this.weaponMenuContainer.style.color = 'white';
        this.weaponMenuContainer.style.fontFamily = 'Arial, sans-serif';
        this.weaponMenuContainer.style.fontSize = '24px';
        this.weaponMenuContainer.style.textAlign = 'left';
        this.weaponMenuContainer.style.minWidth = '200px';
        
        // Add weapon options
        this.weaponMenuContainer.innerHTML = `
            <div style="margin-bottom: 20px; color: #ff0; text-align: center;">WEAPON SELECT</div>
            <div style="margin: 10px 0;">1. Rifle</div>
            <div style="margin: 10px 0;">2. Pistol</div>
        `;
        
        this.container.appendChild(this.weaponMenuContainer);
    }

    toggleWeaponMenu(show) {
        if (this.weaponMenuContainer) {
            this.weaponMenuContainer.style.display = show ? 'block' : 'none';
            this.weaponMenuVisible = show;
            
            // Lock/unlock controls based on menu state
            if (show) {
                document.exitPointerLock();
            }
        }
    }

    switchWeapon(weaponType) {
        const oldWeapon = this.soldier.children.find(child => child.isWeapon);
        if (oldWeapon) {
            this.soldier.remove(oldWeapon);
        }

        if (weaponType === 'rifle') {
            const rifle = this.createRifle();
            this.soldier.add(rifle);
            this.currentWeapon = 'rifle';
        } else if (weaponType === 'pistol') {
            const pistol = this.createPistol();
            this.soldier.add(pistol);
            this.currentWeapon = 'pistol';
        }

        this.toggleWeaponMenu(false);
    }

    createRifle() {
        const rifle = new THREE.Group();
        rifle.isWeapon = true;
        
        const rifleMaterial = new THREE.MeshStandardMaterial({ color: 0x2f2f2f });
        
        // Rifle body - positioned for proper military stance
        const rifleBody = new THREE.BoxGeometry(0.1, 0.15, 1.2);
        const rifleBodyMesh = new THREE.Mesh(rifleBody, rifleMaterial);
        rifleBodyMesh.position.set(0.4, 0.35, 0.3); // Moved forward and up for proper stance
        rifleBodyMesh.rotation.set(0, -Math.PI/24, 0); // Less angled, more straight
        
        // Rifle stock
        const stockGeometry = new THREE.BoxGeometry(0.1, 0.25, 0.3);
        const stock = new THREE.Mesh(stockGeometry, rifleMaterial);
        stock.position.set(0, -0.05, -0.6);
        rifleBodyMesh.add(stock);
        
        // Rifle scope
        const scopeGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.15, 8);
        const scope = new THREE.Mesh(scopeGeometry, rifleMaterial);
        scope.rotation.x = Math.PI / 2;
        scope.position.set(0, 0.1, 0.2);
        rifleBodyMesh.add(scope);

        // Add muzzle flash
        const flashGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0
        });
        
        this.muzzleFlash = new THREE.Mesh(flashGeometry, flashMaterial);
        this.muzzleFlash.position.set(0, 0, 0.7);
        this.muzzleLight = new THREE.PointLight(0xffaa00, 0, 3);
        this.muzzleLight.position.copy(this.muzzleFlash.position);
        rifleBodyMesh.add(this.muzzleFlash);
        rifleBodyMesh.add(this.muzzleLight);
        
        rifle.add(rifleBodyMesh);
        return rifle;
    }

    createPistol() {
        const pistol = new THREE.Group();
        pistol.isWeapon = true;
        
        const pistolMaterial = new THREE.MeshStandardMaterial({ color: 0x2f2f2f });
        
        // Pistol body - positioned for proper stance
        const pistolBody = new THREE.BoxGeometry(0.08, 0.15, 0.4);
        const pistolBodyMesh = new THREE.Mesh(pistolBody, pistolMaterial);
        pistolBodyMesh.position.set(0.4, 0.35, 0.3); // Aligned with rifle position
        pistolBodyMesh.rotation.set(0, -Math.PI/24, 0); // Less angled
        
        // Pistol grip
        const gripGeometry = new THREE.BoxGeometry(0.08, 0.2, 0.12);
        const grip = new THREE.Mesh(gripGeometry, pistolMaterial);
        grip.position.set(0, -0.15, 0);
        pistolBodyMesh.add(grip);

        // Add muzzle flash
        const flashGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0
        });
        
        this.muzzleFlash = new THREE.Mesh(flashGeometry, flashMaterial);
        this.muzzleFlash.position.set(0, 0, 0.25);
        this.muzzleLight = new THREE.PointLight(0xffaa00, 0, 2);
        this.muzzleLight.position.copy(this.muzzleFlash.position);
        pistolBodyMesh.add(this.muzzleFlash);
        pistolBodyMesh.add(this.muzzleLight);
        
        pistol.add(pistolBodyMesh);
        return pistol;
    }

    createMountains() {
        const mountainCount = 12;
        const mountainRadius = 100;
        
        for (let i = 0; i < mountainCount; i++) {
            const angle = (i / mountainCount) * Math.PI * 2;
            const x = Math.cos(angle) * mountainRadius;
            const z = Math.sin(angle) * mountainRadius;
            
            // Create more complex mountain geometry
            const mountainGeometry = new THREE.BufferGeometry();
            const vertices = [];
            const segments = 8;
            const height = 35 + Math.random() * 15;
            
            // Create base points
            for (let j = 0; j < segments; j++) {
                const segmentAngle = (j / segments) * Math.PI * 2;
                const radius = 15 + Math.random() * 5;
                const px = Math.cos(segmentAngle) * radius;
                const pz = Math.sin(segmentAngle) * radius;
                vertices.push(x + px, 0, z + pz);
            }
            
            // Create triangles connecting to peak
            for (let j = 0; j < segments; j++) {
                const next = (j + 1) % segments;
                vertices.push(
                    x + Math.cos(j / segments * Math.PI * 2) * 15,
                    0,
                    z + Math.sin(j / segments * Math.PI * 2) * 15,
                    x,
                    height,
                    z,
                    x + Math.cos(next / segments * Math.PI * 2) * 15,
                    0,
                    z + Math.sin(next / segments * Math.PI * 2) * 15
                );
            }
            
            mountainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            mountainGeometry.computeVertexNormals();
            
            const mountainMaterial = new THREE.MeshStandardMaterial({
                color: 0xaaaaaa,
                roughness: 0.8,
                metalness: 0.2,
                side: THREE.DoubleSide
            });
            
            const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
            this.scene.add(mountain);
            
            // Add snow caps
            const snowCapGeometry = new THREE.ConeGeometry(8, 10, segments);
            const snowMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.6,
                metalness: 0.1
            });
            const snowCap = new THREE.Mesh(snowCapGeometry, snowMaterial);
            snowCap.position.set(x, height - 5, z);
            this.scene.add(snowCap);
        }
    }

    createCrates() {
        const crateMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.8,
            metalness: 0.1
        });

        // Helper function to create a crate
        const createCrate = (size, position) => {
            const crateGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
            const crate = new THREE.Mesh(crateGeometry, crateMaterial);
            crate.position.copy(position);
            
            // Add wood grain texture through geometry
            const positions = crateGeometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += (Math.random() - 0.5) * 0.02;
                positions[i + 1] += (Math.random() - 0.5) * 0.02;
                positions[i + 2] += (Math.random() - 0.5) * 0.02;
            }
            crateGeometry.attributes.position.needsUpdate = true;
            
            // Store crate for collision detection
            this.crates.push({
                mesh: crate,
                size: size,
                position: position
            });
            
            return crate;
        };

        // Create crate stacks near bunker
        const cratePositions = [
            { size: new THREE.Vector3(1.5, 1.5, 1.5), pos: new THREE.Vector3(8, 0.75, -10) },
            { size: new THREE.Vector3(1.2, 1.2, 1.2), pos: new THREE.Vector3(8, 2.1, -10) },
            { size: new THREE.Vector3(2, 1, 2), pos: new THREE.Vector3(10, 0.5, -8) }
        ];

        // Create crates for jumping challenge near stream
        const streamCrates = [
            { size: new THREE.Vector3(1, 1, 1), pos: new THREE.Vector3(-4, 0.5, 4) },
            { size: new THREE.Vector3(1, 1, 1), pos: new THREE.Vector3(-2, 0.5, 7) },
            { size: new THREE.Vector3(1.2, 1.2, 1.2), pos: new THREE.Vector3(0, 0.6, 10) }
        ];

        // Add all crates to scene
        [...cratePositions, ...streamCrates].forEach(crate => {
            const crateMesh = createCrate(crate.size, crate.pos);
            this.scene.add(crateMesh);
        });
    }

    createTrees() {
        // Add varied trees around the scene
        const treeTypes = ['pine', 'oak'];
        const treeCount = 25;
        
        // Create trees in a more natural scattered pattern
        for (let i = 0; i < treeCount; i++) {
            // Use random angles and varying distances for more natural placement
            const angle = Math.random() * Math.PI * 2;
            const radius = 10 + Math.random() * 15; // More varied distances
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            // Randomize tree characteristics
            const type = treeTypes[Math.floor(Math.random() * treeTypes.length)];
            const scale = 0.8 + Math.random() * 0.4;
            
            // Add some clustering by occasionally placing trees close to each other
            const tree = this.createPineTree(x, z, scale, type);
            this.scene.add(tree);
            
            // 30% chance to add a smaller tree nearby
            if (Math.random() < 0.3) {
                const nearbyAngle = angle + (Math.random() - 0.5) * Math.PI / 4;
                const nearbyRadius = radius + (Math.random() - 0.5) * 3;
                const nearbyX = Math.cos(nearbyAngle) * nearbyRadius;
                const nearbyZ = Math.sin(nearbyAngle) * nearbyRadius;
                const nearbyTree = this.createPineTree(nearbyX, nearbyZ, scale * 0.8, type);
                this.scene.add(nearbyTree);
            }
        }
    }

    createGround() {
        const groundGeometry = new THREE.PlaneGeometry(200, 200, 100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2d5a27, // Grass green
            roughness: 0.7, // Less rough for better color
            metalness: 0.0, // No metalness for natural look
            emissive: 0x0c2a07, // Slight emissive for better visibility
            emissiveIntensity: 0.2 // Increased from 0.1
        });
        
        // Enhanced terrain displacement
        const vertices = groundGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            const distance = Math.sqrt(x * x + z * z);
            
            // Create varied terrain with hills and valleys
            if (distance > 5) {
                vertices[i + 1] = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2 +  // Large terrain features
                                 Math.sin(x * 0.5) * Math.cos(z * 0.5) * 0.5 + // Medium hills
                                 (Math.random() - 0.5) * 0.3;                   // Small detail
            }
        }
        
        groundGeometry.attributes.position.needsUpdate = true;
        groundGeometry.computeVertexNormals();
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2; // Fix ground rotation
        this.scene.add(ground);
    }

    createStream() {
        const streamWidth = 3;
        const streamLength = 100;
        const streamDepth = 1;
        
        // Create sunken riverbed
        const riverbedGeometry = new THREE.BoxGeometry(streamWidth + 2, streamDepth, streamLength);
        const riverbedMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a,
            roughness: 0.9
        });
        const riverbed = new THREE.Mesh(riverbedGeometry, riverbedMaterial);
        riverbed.position.set(0, -streamDepth/2, 0);
        this.scene.add(riverbed);
        
        // Create water surface with enhanced material
        const streamGeometry = new THREE.PlaneGeometry(streamWidth, streamLength, 20, 100);
        const waterMaterial = new THREE.MeshStandardMaterial({
            color: 0x3498db, // Bright blue water
            metalness: 0.9, // More metallic for better reflection
            roughness: 0.1, // Smoother for water
            transparent: true,
            opacity: 0.8,
            emissive: 0x104a7a, // Slight blue emissive
            emissiveIntensity: 0.4 // Increased intensity
        });
        
        // Create meandering stream path
        const streamVertices = streamGeometry.attributes.position.array;
        for (let i = 0; i < streamVertices.length; i += 3) {
            const z = streamVertices[i + 2];
            streamVertices[i] += Math.sin(z * 0.1) * 2;
            streamVertices[i + 1] = -streamDepth + 0.1;
        }
        streamGeometry.attributes.position.needsUpdate = true;
        streamGeometry.computeVertexNormals();
        
        const stream = new THREE.Mesh(streamGeometry, waterMaterial);
        stream.rotation.x = -Math.PI / 2;
        this.scene.add(stream);
        
        // Add rocks along edges
        this.addStreamRocks(streamWidth, streamLength, streamDepth);
        
        // Add water particles
        this.addWaterParticles(streamWidth, streamLength);
    }

    addStreamRocks(streamWidth, streamLength, streamDepth) {
        const createRock = (size) => {
            const rockGeometry = new THREE.DodecahedronGeometry(size);
            const rockMaterial = new THREE.MeshStandardMaterial({
                color: 0x7c7c7c,
                roughness: 0.9,
                metalness: 0.1
            });
            return new THREE.Mesh(rockGeometry, rockMaterial);
        };

        for (let z = -streamLength/2; z < streamLength/2; z += 2) {
            const streamX = Math.sin(z * 0.1) * 2;
            
            ['left', 'right'].forEach(side => {
                if (Math.random() < 0.8) {
                    const rock = createRock(0.3 + Math.random() * 0.4);
                    const xOffset = (side === 'left' ? -1 : 1) * (streamWidth/2 + 0.3 + Math.random() * 0.5);
                    rock.position.set(
                        streamX + xOffset,
                        -streamDepth + Math.random() * 0.5,
                        z
                    );
                    rock.rotation.set(
                        Math.random() * Math.PI,
                        Math.random() * Math.PI,
                        Math.random() * Math.PI
                    );
                    this.scene.add(rock);
                }
            });
        }
    }

    addWaterParticles(streamWidth, streamLength) {
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = [];
        const particleCount = 200;
        
        for (let i = 0; i < particleCount; i++) {
            particlePositions.push(
                Math.random() * streamWidth - streamWidth/2 + Math.sin((i/particleCount) * streamLength * 0.1) * 2,
                0.2,
                (i/particleCount) * streamLength - streamLength/2
            );
        }
        
        particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.1,
            transparent: true,
            opacity: 0.6
        });
        
        this.streamParticles = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(this.streamParticles);
    }
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
}); 