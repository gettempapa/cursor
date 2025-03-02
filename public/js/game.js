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
        
        // Audio setup with immediate resume
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioContext.resume().then(() => {
            console.log('AudioContext resumed successfully');
        });
        this.gunshotBuffer = null;
        this.loadGunshotSound();
        
        // Add death state
        this.isDead = false;
        this.deathMessageContainer = null;
        
        // Add weapon state
        this.currentWeapon = 'rifle';
        this.weaponMenuVisible = false;
        this.weaponMenuContainer = null;
        
        // Add health system
        this.playerHealth = 100;
        this.enemyHealth = 100;
        this.maxHealth = 100;
        this.damageAmount = 20;
        
        // Add ammo system
        this.ammo = {
            rifle: { current: 30, max: 30, reserve: 90 },
            pistol: { current: 12, max: 12, reserve: 48 }
        };
        this.isReloading = false;
        this.reloadTime = 2000; // milliseconds
        
        // Add HUD
        this.setupHUD();
        
        // Add visual feedback elements
        this.setupVisualFeedback();
        
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
        let collisionResult = {
            hasCollision: false,
            newY: newPosition.y
        };
        
        // Check tree collisions
        for (const tree of this.trees) {
            const distance = playerPosition.distanceTo(tree.position);
            if (distance < (this.playerCollisionRadius + tree.radius)) {
                collisionResult.hasCollision = true;
                return collisionResult;
            }
        }
        
        // Check crate collisions with improved vertical collision
        for (const crate of this.crates) {
            const dx = Math.abs(newPosition.x - crate.position.x);
            const dz = Math.abs(newPosition.z - crate.position.z);
            const isWithinHorizontalBounds = dx < (crate.size.x / 2 + this.playerCollisionRadius) &&
                                           dz < (crate.size.z / 2 + this.playerCollisionRadius);
            
            if (isWithinHorizontalBounds) {
                const crateTop = crate.position.y + crate.size.y;
                const playerBottom = newPosition.y;
                const playerTop = newPosition.y + 2; // Approximate player height
                
                // Check if falling onto crate
                if (this.velocity.y <= 0 && playerBottom <= crateTop && playerBottom > crate.position.y) {
                    collisionResult.hasCollision = false;
                    collisionResult.newY = crateTop;
                    return collisionResult;
                }
                
                // Check if hitting crate from sides or bottom
                if (playerBottom < crateTop && playerTop > crate.position.y) {
                    collisionResult.hasCollision = true;
                    return collisionResult;
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
                collisionResult.hasCollision = true;
                return collisionResult;
            }
        }
        
        return collisionResult;
    }
    
    setupScene() {
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(1, 2, 1);
        this.scene.add(ambientLight);
        this.scene.add(directionalLight);

        // Add ground with enhanced texture
        this.createGround();
        
        // Add bushes
        this.createBushes();
        
        // Add bunker
        this.createBunker();
        
        // Add crates
        this.createCrates();
        
        // Add varied trees
        this.createTrees();
        
        // Create and add soldier model at a safe starting position
        this.soldier = this.createSoldier(false);
        this.player = new THREE.Group();
        this.player.add(this.soldier);
        this.player.position.set(5, 1, 5);
        this.player.rotation.y = Math.PI; // Make player face away from camera
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
        
        // WASD, Space, and R controls
        document.addEventListener('keydown', (e) => {
            if (this.isDead) return;
            
            switch(e.code) {
                case 'KeyW': this.moveState.forward = true; break;
                case 'KeyS': this.moveState.backward = true; break;
                case 'KeyA': this.moveState.left = true; break;
                case 'KeyD': this.moveState.right = true; break;
                case 'KeyR': this.reload(); break;
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
        if (this.isDead) return;
        
        // Update vertical movement (jumping/falling)
        if (!this.isGrounded) {
            this.velocity.y += this.gravity;
            const newPosition = new THREE.Vector3(
                this.player.position.x,
                this.player.position.y + this.velocity.y,
                this.player.position.z
            );
            
            // Check for collisions including ground and crates
            const collisionResult = this.checkCollisions(newPosition);
            
            if (collisionResult.hasCollision) {
                // Hit something from the side or bottom
                this.velocity.y = 0;
            } else {
                // Update position, might be adjusted by collision detection
                this.player.position.y = collisionResult.newY;
                
                // Check if landed on ground or crate
                if (this.player.position.y <= 1) {
                    this.player.position.y = 1;
                    this.velocity.y = 0;
                    this.isGrounded = true;
                } else if (collisionResult.newY !== newPosition.y) {
                    // Landed on a crate
                    this.velocity.y = 0;
                    this.isGrounded = true;
                }
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
            
            // Check for collisions before updating position
            const collisionResult = this.checkCollisions(newPosition);
            if (!collisionResult.hasCollision) {
                this.player.position.x = newPosition.x;
                this.player.position.z = newPosition.z;
                // Keep the adjusted Y position from any vertical collisions
                if (collisionResult.newY !== newPosition.y) {
                    this.player.position.y = collisionResult.newY;
                }
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
            const crack = Math.exp(-t * 800) * (Math.random() * 2 - 1) * 2.0;
            
            // Deep bass impact (lower frequency, more powerful)
            const bass = Math.exp(-t * 20) * Math.sin(2 * Math.PI * 40 * t) * 2.5;
            
            // Mid-frequency body (fuller sound)
            const mid = Math.exp(-t * 80) * Math.sin(2 * Math.PI * 300 * t) * 1.5;
            
            // High-frequency crack detail
            const highCrack = Math.exp(-t * 1000) * Math.sin(2 * Math.PI * 2000 * t) * 0.8;
            
            // Combine components with enhanced mixing
            data[i] = (
                crack * 1.2 +     // Sharper initial crack
                bass * 1.0 +      // Stronger bass
                mid * 0.8 +       // Fuller mid-range
                highCrack * 0.6   // Crisp high-end detail
            ) * 6.0;             // Overall volume boost
        }
    }

    playGunshot() {
        if (!this.gunshotBuffer) return;
        
        const source = this.audioContext.createBufferSource();
        source.buffer = this.gunshotBuffer;
        
        // Enhanced bass frequencies
        const lowpass = this.audioContext.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 200; // Lower frequency for more bass
        lowpass.Q.value = 12.0; // Sharper resonance
        
        // Supersonic crack frequencies
        const highpass = this.audioContext.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 4000; // Higher for sharper crack
        highpass.Q.value = 9.0;
        
        // More aggressive compression
        const compressor = this.audioContext.createDynamicsCompressor();
        compressor.threshold.value = -24;
        compressor.knee.value = 0;
        compressor.ratio.value = 20;
        compressor.attack.value = 0;
        compressor.release.value = 0.1;
        
        // Enhanced echo effect
        const convolver = this.audioContext.createConvolver();
        const reverbTime = 5.0;
        const rate = this.audioContext.sampleRate;
        const length = rate * reverbTime;
        const impulse = this.audioContext.createBuffer(2, length, rate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);
        
        // Create more powerful echo reflections
        for (let i = 0; i < length; i++) {
            const t = i / rate;
            const echoPeaks = [0.02, 0.06, 0.1, 0.15, 0.25, 0.4];
            let echoSum = 0;
            for (const delay of echoPeaks) {
                echoSum += Math.exp(-12 * Math.abs(t - delay)) * (1 - t / reverbTime);
            }
            const decay = Math.exp(-1.0 * i / length);
            left[i] = decay * (1 + echoSum) * 1.2;
            right[i] = decay * (1 + echoSum) * 1.2;
        }
        convolver.buffer = impulse;
        
        // Volume controls
        const mainGain = this.audioContext.createGain();
        mainGain.gain.value = 2.0; // Doubled volume
        
        const reverbGain = this.audioContext.createGain();
        reverbGain.gain.value = 1.0; // Stronger echo
        
        // Connect the enhanced audio chain
        source.connect(compressor);
        compressor.connect(lowpass);
        lowpass.connect(highpass);
        
        // Split into direct sound and echo
        const directGain = this.audioContext.createGain();
        directGain.gain.value = 1.2;
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
            this.enemyMuzzleLight.intensity = 3;
            
            // Calculate hit chance based on distance and add randomness
            const distanceToPlayer = this.enemy.position.distanceTo(this.player.position);
            const maxRange = 20;
            const hitChance = Math.max(0, 1 - (distanceToPlayer / maxRange));
            
            if (Math.random() < hitChance * 0.3) {
                this.playerHealth = Math.max(0, this.playerHealth - this.damageAmount);
                this.showDamageEffect();
                if (this.playerHealth <= 0 && !this.isDead) {
                    this.die();
                }
                this.updateHUD();
            }
            
            // Play gunshot sound
            this.playGunshot();
            
            // Hide enemy muzzle flash after duration
            setTimeout(() => {
                this.enemyMuzzleFlash.material.opacity = 0;
                this.enemyMuzzleLight.intensity = 0;
            }, this.flashDuration);
            
        } else {
            if (this.isShooting || this.isReloading) return;
            
            // Check ammo
            const ammoInfo = this.ammo[this.currentWeapon];
            if (ammoInfo.current <= 0) {
                if (ammoInfo.reserve > 0) {
                    this.reload();
                }
                return;
            }
            
            this.isShooting = true;
            ammoInfo.current--;
            
            // Show player muzzle flash with increased intensity
            if (this.muzzleFlash) {
                this.muzzleFlash.material.opacity = 1;
                this.muzzleLight.intensity = 3;
            }
            
            // Calculate hit detection
            const raycaster = new THREE.Raycaster();
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);
            
            // Add weapon spread
            const spread = this.currentWeapon === 'rifle' ? 0.03 : 0.05;
            cameraDirection.x += (Math.random() - 0.5) * spread;
            cameraDirection.y += (Math.random() - 0.5) * spread;
            cameraDirection.z += (Math.random() - 0.5) * spread;
            
            raycaster.set(this.camera.position, cameraDirection.normalize());
            
            // Check if enemy is hit
            if (this.enemy) {
                const enemyBoundingBox = new THREE.Box3().setFromObject(this.enemy);
                const hit = raycaster.ray.intersectsBox(enemyBoundingBox);
                
                if (hit) {
                    this.enemyHealth = Math.max(0, this.enemyHealth - this.damageAmount);
                    if (this.enemyHealth <= 0) {
                        this.killEnemy();
                    }
                }
            }
            
            // Ensure audio context is running and play gunshot
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            this.playGunshot();
            
            // Add recoil effect
            const recoilAmount = this.currentWeapon === 'rifle' ? 0.02 : 0.03;
            this.verticalAngle += recoilAmount;
            this.verticalAngle = Math.min(this.maxVerticalAngle, this.verticalAngle);
            
            // Hide player muzzle flash after duration
            setTimeout(() => {
                if (this.muzzleFlash) {
                    this.muzzleFlash.material.opacity = 0;
                    this.muzzleLight.intensity = 0;
                }
                this.isShooting = false;
            }, this.flashDuration);
            
            // Update HUD
            this.updateHUD();
        }
    }

    reload() {
        if (this.isReloading || this.isDead) return;
        
        const ammoInfo = this.ammo[this.currentWeapon];
        if (ammoInfo.current === ammoInfo.max || ammoInfo.reserve <= 0) return;
        
        this.isReloading = true;
        this.reloadIndicator.style.display = 'block';
        
        // Play reload animation/sound here
        
        setTimeout(() => {
            const neededAmmo = ammoInfo.max - ammoInfo.current;
            const reloadAmount = Math.min(neededAmmo, ammoInfo.reserve);
            
            ammoInfo.current += reloadAmount;
            ammoInfo.reserve -= reloadAmount;
            
            this.isReloading = false;
            this.reloadIndicator.style.display = 'none';
            this.updateHUD();
        }, this.reloadTime);
    }
    
    die() {
        this.isDead = true;
        this.showDeathMessage();
        // Optional: play death animation
    }
    
    killEnemy() {
        // Remove enemy from scene
        this.scene.remove(this.enemy);
        this.enemy = null;
        
        // Optional: play enemy death animation/effects
        
        // Respawn enemy after delay
        setTimeout(() => {
            this.enemy = this.createSoldier(true);
            this.enemy.position.set(-5, 1, -5);
            this.enemyHealth = this.maxHealth;
            this.scene.add(this.enemy);
        }, 5000);
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

        // Calculate distance to player
        const distanceToPlayer = this.enemy.position.distanceTo(this.player.position);
        const idealRange = 10; // The enemy tries to maintain this distance
        
        // Enemy behavior states
        const isTooClose = distanceToPlayer < idealRange * 0.7;
        const isTooFar = distanceToPlayer > idealRange * 1.3;
        const hasLineOfSight = this.checkLineOfSight();
        
        // Move towards target
        let targetPosition;
        if (!hasLineOfSight) {
            // If no line of sight, move towards player
            targetPosition = this.player.position;
        } else if (isTooClose) {
            // Back away while facing player
            const awayFromPlayer = this.enemy.position.clone().sub(this.player.position).normalize();
            targetPosition = this.enemy.position.clone().add(awayFromPlayer.multiplyScalar(5));
        } else if (isTooFar) {
            // Move closer while maintaining some distance
            const toPlayer = this.player.position.clone().sub(this.enemy.position).normalize();
            targetPosition = this.enemy.position.clone().add(toPlayer.multiplyScalar(2));
        } else {
            // Strafe sideways when at ideal range
            const toPlayer = this.player.position.clone().sub(this.enemy.position).normalize();
            const strafeDir = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x);
            targetPosition = this.enemy.position.clone().add(strafeDir.multiplyScalar(Math.sin(Date.now() * 0.001) * 2));
        }
        
        // Calculate movement direction
        const direction = targetPosition.clone().sub(this.enemy.position);
        if (direction.length() > 0.1) {
            direction.normalize();
            
            // Check for collisions before moving
            const newPosition = this.enemy.position.clone().add(direction.multiplyScalar(this.enemyMoveSpeed));
            const enemyPosition2D = new THREE.Vector2(newPosition.x, newPosition.z);
            
            let canMove = true;
            
            // Check tree collisions
            for (const tree of this.trees) {
                const distance = enemyPosition2D.distanceTo(tree.position);
                if (distance < (this.playerCollisionRadius + tree.radius)) {
                    canMove = false;
                    break;
                }
            }
            
            // Move if no collision
            if (canMove) {
                this.enemy.position.copy(newPosition);
                
                // Animate legs while moving
                const leftLeg = this.enemy.children.find(child => child.position.x === 0.15 && child.position.y === -0.3);
                const rightLeg = this.enemy.children.find(child => child.position.x === -0.15 && child.position.y === -0.3);
                
                if (leftLeg && rightLeg) {
                    const time = performance.now() * 0.005;
                    leftLeg.rotation.x = Math.sin(time) * 0.5;
                    rightLeg.rotation.x = Math.sin(time + Math.PI) * 0.5;
                }
            } else {
                // If collision detected, get new target
                this.updateEnemyTarget();
            }
        }

        // Make enemy face player
        const toPlayer = new THREE.Vector3();
        toPlayer.subVectors(this.player.position, this.enemy.position);
        this.enemy.rotation.y = Math.atan2(-toPlayer.x, -toPlayer.z);

        // Enemy shooting logic
        const currentTime = performance.now();
        if (currentTime - this.enemyLastShot > this.enemyShootInterval && hasLineOfSight) {
            this.shoot(true);
            this.enemyLastShot = currentTime;
            
            // Randomize next shot interval
            this.enemyShootInterval = 1500 + Math.random() * 1000;
        }
    }

    checkLineOfSight() {
        if (!this.enemy) return false;
        
        const raycaster = new THREE.Raycaster();
        const toPlayer = this.player.position.clone().sub(this.enemy.position);
        const distance = toPlayer.length();
        
        raycaster.set(
            this.enemy.position,
            toPlayer.normalize()
        );
        
        // Check for obstacles between enemy and player
        const obstacles = [];
        this.scene.traverse(object => {
            if (object.isMesh && object !== this.enemy && object !== this.player) {
                obstacles.push(object);
            }
        });
        
        const intersects = raycaster.intersectObjects(obstacles);
        return intersects.length === 0 || intersects[0].distance > distance;
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
            color: 0x2d5a27, // Rich grass green
            roughness: 0.9, // More rough for grass texture
            metalness: 0.0, // No metalness for natural look
            emissive: 0x1a3819, // Darker green emissive
            emissiveIntensity: 0.2
        });
        
        // Simplified terrain with gentle undulation
        const vertices = groundGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            
            // Create gentle rolling hills
            vertices[i + 1] = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.5;
        }
        
        groundGeometry.attributes.position.needsUpdate = true;
        groundGeometry.computeVertexNormals();
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);
    }

    createBush(x, z, scale = 1) {
        const bushGroup = new THREE.Group();
        
        // Create multiple spheres for a bush-like shape
        const bushMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d5a27, // Match ground color
            roughness: 0.8,
            metalness: 0.0
        });
        
        // Main bush body
        const mainSphere = new THREE.SphereGeometry(0.5 * scale, 8, 8);
        const main = new THREE.Mesh(mainSphere, bushMaterial);
        bushGroup.add(main);
        
        // Add smaller spheres around the main one for detail
        const positions = [
            { x: 0.3, y: 0.1, z: 0.3, scale: 0.7 },
            { x: -0.3, y: 0.2, z: 0.2, scale: 0.8 },
            { x: 0.2, y: 0.3, z: -0.3, scale: 0.6 },
            { x: -0.2, y: 0.15, z: -0.2, scale: 0.7 }
        ];
        
        positions.forEach(pos => {
            const smallSphere = new THREE.SphereGeometry(0.3 * scale * pos.scale, 8, 8);
            const smallBush = new THREE.Mesh(smallSphere, bushMaterial);
            smallBush.position.set(pos.x * scale, pos.y * scale, pos.z * scale);
            bushGroup.add(smallBush);
        });
        
        bushGroup.position.set(x, 0.5 * scale, z);
        return bushGroup;
    }

    createBushes() {
        const bushCount = 40; // Add plenty of bushes
        
        for (let i = 0; i < bushCount; i++) {
            // Create bushes in clusters
            const angle = Math.random() * Math.PI * 2;
            const radius = 5 + Math.random() * 25; // Spread them out
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            // Randomize bush size
            const scale = 0.6 + Math.random() * 0.8;
            
            const bush = this.createBush(x, z, scale);
            this.scene.add(bush);
            
            // 40% chance to add smaller bushes nearby for clusters
            if (Math.random() < 0.4) {
                const clusterCount = Math.floor(Math.random() * 3) + 1;
                for (let j = 0; j < clusterCount; j++) {
                    const offset = 1.5;
                    const nearbyX = x + (Math.random() - 0.5) * offset;
                    const nearbyZ = z + (Math.random() - 0.5) * offset;
                    const nearbyScale = scale * (0.6 + Math.random() * 0.3);
                    
                    const nearbyBush = this.createBush(nearbyX, nearbyZ, nearbyScale);
                    this.scene.add(nearbyBush);
                }
            }
        }
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
        rifleBodyMesh.position.set(0.4, 0.35, 0.3);
        rifleBodyMesh.rotation.set(0, -Math.PI/24, 0);
        
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

        // Enhanced muzzle flash
        const flashGeometry = new THREE.SphereGeometry(0.15, 8, 8); // Larger flash
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0,
            emissive: 0xffff00,
            emissiveIntensity: 1.0
        });
        
        this.muzzleFlash = new THREE.Mesh(flashGeometry, flashMaterial);
        this.muzzleFlash.position.set(0, 0, 0.7);
        
        // Brighter muzzle light
        this.muzzleLight = new THREE.PointLight(0xffaa00, 0, 5); // Increased intensity and range
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

    setupHUD() {
        // Create HUD container
        this.hudContainer = document.createElement('div');
        this.hudContainer.style.position = 'absolute';
        this.hudContainer.style.bottom = '20px';
        this.hudContainer.style.left = '20px';
        this.hudContainer.style.color = 'white';
        this.hudContainer.style.fontFamily = 'Arial, sans-serif';
        this.hudContainer.style.fontSize = '18px';
        this.hudContainer.style.textShadow = '2px 2px 2px rgba(0,0,0,0.5)';
        
        // Create health display
        this.healthDisplay = document.createElement('div');
        this.healthDisplay.style.marginBottom = '10px';
        this.hudContainer.appendChild(this.healthDisplay);
        
        // Create ammo display
        this.ammoDisplay = document.createElement('div');
        this.hudContainer.appendChild(this.ammoDisplay);
        
        // Create enemy health bar (top of screen)
        this.enemyHealthBar = document.createElement('div');
        this.enemyHealthBar.style.position = 'absolute';
        this.enemyHealthBar.style.top = '20px';
        this.enemyHealthBar.style.left = '50%';
        this.enemyHealthBar.style.transform = 'translateX(-50%)';
        this.enemyHealthBar.style.width = '200px';
        this.enemyHealthBar.style.height = '20px';
        this.enemyHealthBar.style.backgroundColor = 'rgba(0,0,0,0.5)';
        this.enemyHealthBar.style.border = '2px solid white';
        this.enemyHealthBar.style.display = 'none';
        
        this.enemyHealthFill = document.createElement('div');
        this.enemyHealthFill.style.width = '100%';
        this.enemyHealthFill.style.height = '100%';
        this.enemyHealthFill.style.backgroundColor = 'red';
        this.enemyHealthFill.style.transition = 'width 0.3s ease-in-out';
        this.enemyHealthBar.appendChild(this.enemyHealthFill);
        
        this.container.appendChild(this.hudContainer);
        this.container.appendChild(this.enemyHealthBar);
        
        this.updateHUD();
    }
    
    updateHUD() {
        if (!this.hudContainer) return;
        
        // Update health display with color based on health level
        const healthColor = this.playerHealth > 70 ? 'white' : 
                          this.playerHealth > 30 ? 'yellow' : 'red';
        this.healthDisplay.style.color = healthColor;
        this.healthDisplay.innerHTML = `❤️ Health: ${this.playerHealth}`;
        
        // Update ammo display
        const currentWeaponAmmo = this.ammo[this.currentWeapon];
        this.ammoDisplay.innerHTML = `🎯 Ammo: ${currentWeaponAmmo.current}/${currentWeaponAmmo.reserve}`;
        
        // Show/hide low ammo warning
        const lowAmmoThreshold = this.currentWeapon === 'rifle' ? 10 : 4;
        this.lowAmmoWarning.style.display = 
            currentWeaponAmmo.current <= lowAmmoThreshold ? 'block' : 'none';
        
        // Update enemy health bar
        const distanceToEnemy = this.enemy ? 
            this.player.position.distanceTo(this.enemy.position) : Infinity;
        
        if (distanceToEnemy < 15) {
            this.enemyHealthBar.style.display = 'block';
            this.enemyHealthFill.style.width = `${(this.enemyHealth / this.maxHealth) * 100}%`;
            
            // Update enemy health bar color based on health
            const healthPercent = this.enemyHealth / this.maxHealth;
            const r = Math.floor(255 * (1 - healthPercent));
            const g = Math.floor(255 * healthPercent);
            this.enemyHealthFill.style.backgroundColor = `rgb(${r}, ${g}, 0)`;
        } else {
            this.enemyHealthBar.style.display = 'none';
        }
    }

    setupVisualFeedback() {
        // Create damage overlay
        this.damageOverlay = document.createElement('div');
        this.damageOverlay.style.position = 'absolute';
        this.damageOverlay.style.top = '0';
        this.damageOverlay.style.left = '0';
        this.damageOverlay.style.width = '100%';
        this.damageOverlay.style.height = '100%';
        this.damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0)';
        this.damageOverlay.style.pointerEvents = 'none';
        this.damageOverlay.style.transition = 'background-color 0.1s ease-in-out';
        this.container.appendChild(this.damageOverlay);
        
        // Create reload indicator
        this.reloadIndicator = document.createElement('div');
        this.reloadIndicator.style.position = 'absolute';
        this.reloadIndicator.style.top = '50%';
        this.reloadIndicator.style.left = '50%';
        this.reloadIndicator.style.transform = 'translate(-50%, -50%)';
        this.reloadIndicator.style.color = 'white';
        this.reloadIndicator.style.fontSize = '24px';
        this.reloadIndicator.style.fontFamily = 'Arial, sans-serif';
        this.reloadIndicator.style.textShadow = '2px 2px 2px rgba(0,0,0,0.5)';
        this.reloadIndicator.style.display = 'none';
        this.reloadIndicator.textContent = 'RELOADING';
        this.container.appendChild(this.reloadIndicator);
        
        // Create low ammo warning
        this.lowAmmoWarning = document.createElement('div');
        this.lowAmmoWarning.style.position = 'absolute';
        this.lowAmmoWarning.style.bottom = '60px';
        this.lowAmmoWarning.style.left = '20px';
        this.lowAmmoWarning.style.color = 'red';
        this.lowAmmoWarning.style.fontSize = '18px';
        this.lowAmmoWarning.style.fontFamily = 'Arial, sans-serif';
        this.lowAmmoWarning.style.textShadow = '2px 2px 2px rgba(0,0,0,0.5)';
        this.lowAmmoWarning.style.display = 'none';
        this.lowAmmoWarning.textContent = 'LOW AMMO!';
        this.container.appendChild(this.lowAmmoWarning);
    }
    
    showDamageEffect() {
        this.damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        setTimeout(() => {
            this.damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0)';
        }, 100);
    }
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
}); 