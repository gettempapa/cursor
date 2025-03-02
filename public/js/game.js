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
        this.zoomSpeed = 0.0005;
        
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
        
        // Set up basic scene
        this.setupScene();
        
        // Set up controls
        this.setupControls();
        
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

        // Add rifle
        const rifleMaterial = new THREE.MeshStandardMaterial({ color: 0x2f2f2f }); // Dark gray for rifle
        
        // Rifle body
        const rifleBody = new THREE.BoxGeometry(0.1, 0.15, 1.2);
        const rifle = new THREE.Mesh(rifleBody, rifleMaterial);
        rifle.position.set(0.4, 0.4, 0); // Adjusted position
        rifle.rotation.y = 0; // Point forward
        
        // Rifle stock
        const stockGeometry = new THREE.BoxGeometry(0.1, 0.25, 0.3);
        const stock = new THREE.Mesh(stockGeometry, rifleMaterial);
        stock.position.set(0, 0, -0.6); // Adjusted position
        rifle.add(stock);
        
        // Rifle scope
        const scopeGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.15, 8);
        const scope = new THREE.Mesh(scopeGeometry, rifleMaterial);
        scope.rotation.x = Math.PI / 2;
        scope.position.set(0, 0.1, 0);
        rifle.add(scope);

        // Create muzzle flash (initially invisible)
        const flashGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0
        });
        
        if (isEnemy) {
            this.enemyMuzzleFlash = new THREE.Mesh(flashGeometry, flashMaterial);
            this.enemyMuzzleFlash.position.set(0, 0, 0.7); // Position at rifle barrel
            this.enemyMuzzleLight = new THREE.PointLight(0xffaa00, 0, 3);
            this.enemyMuzzleLight.position.copy(this.enemyMuzzleFlash.position);
            rifle.add(this.enemyMuzzleFlash);
            rifle.add(this.enemyMuzzleLight);
        } else {
            this.muzzleFlash = new THREE.Mesh(flashGeometry, flashMaterial);
            this.muzzleFlash.position.set(0, 0, 0.7); // Position at rifle barrel
            this.muzzleLight = new THREE.PointLight(0xffaa00, 0, 3);
            this.muzzleLight.position.copy(this.muzzleFlash.position);
            rifle.add(this.muzzleFlash);
            rifle.add(this.muzzleLight);
        }
        
        soldier.add(rifle);
        
        return soldier;
    }
    
    createPineTree(x, z) {
        const treeGroup = new THREE.Group();
        
        // Tree trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 4, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4d2926,
            roughness: 0.9
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 2;
        treeGroup.add(trunk);
        
        // Tree layers (cone shapes)
        const leafMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0b5c0b,
            roughness: 0.8
        });
        
        const createLayer = (y, radius, height) => {
            const coneGeometry = new THREE.ConeGeometry(radius, height, 8);
            const cone = new THREE.Mesh(coneGeometry, leafMaterial);
            cone.position.y = y;
            treeGroup.add(cone);
        };
        
        createLayer(5.5, 1.5, 3);
        createLayer(4.5, 1.8, 2.5);
        createLayer(3.5, 2, 2);
        
        treeGroup.position.set(x, 0, z);
        
        // Store tree position and radius for collision detection
        this.trees.push({
            position: new THREE.Vector2(x, z),
            radius: this.treeCollisionRadius
        });
        
        return treeGroup;
    }
    
    checkCollisions(newPosition) {
        const playerPosition = new THREE.Vector2(newPosition.x, newPosition.z);
        
        for (const tree of this.trees) {
            const distance = playerPosition.distanceTo(tree.position);
            if (distance < (this.playerCollisionRadius + tree.radius)) {
                return true; // Collision detected
            }
        }
        
        return false; // No collision
    }
    
    setupScene() {
        // Add lights
        const ambientLight = new THREE.AmbientLight(0x404040);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(ambientLight);
        this.scene.add(directionalLight);

        // Add fog for misty mountains
        this.scene.fog = new THREE.Fog(0xcccccc, 30, 100);
        
        // Add mountains in background
        const mountainGeometry = new THREE.BufferGeometry();
        const vertices = [];
        const mountainCount = 8;
        const mountainRadius = 80;
        
        for (let i = 0; i < mountainCount; i++) {
            const angle = (i / mountainCount) * Math.PI * 2;
            const x = Math.cos(angle) * mountainRadius;
            const z = Math.sin(angle) * mountainRadius;
            
            // Create triangular mountain peaks
            vertices.push(
                x - 10, 0, z - 10,     // base point 1
                x + 10, 0, z + 10,     // base point 2
                x, 25 + Math.random() * 10, z  // peak
            );
        }
        
        mountainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        mountainGeometry.computeVertexNormals();
        
        const mountainMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.8,
            metalness: 0.2,
            side: THREE.DoubleSide
        });
        
        const mountains = new THREE.Mesh(mountainGeometry, mountainMaterial);
        this.scene.add(mountains);
        
        // Add ground
        const groundGeometry = new THREE.PlaneGeometry(100, 100, 50, 50);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x355e3b, // Forest green
            roughness: 0.8,
            metalness: 0.2
        });
        
        // Add some height variation to the ground
        const vertices2 = groundGeometry.attributes.position.array;
        for (let i = 0; i < vertices2.length; i += 3) {
            if (Math.abs(vertices2[i]) > 5 || Math.abs(vertices2[i + 2]) > 5) {
                vertices2[i + 1] = Math.random() * 0.5; // Add small hills
            }
        }
        groundGeometry.attributes.position.needsUpdate = true;
        groundGeometry.computeVertexNormals();
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);
        
        // Add stream
        const streamWidth = 3;
        const streamLength = 100;
        const streamGeometry = new THREE.PlaneGeometry(streamWidth, streamLength, 20, 100);
        
        // Create meandering stream path
        const streamVertices = streamGeometry.attributes.position.array;
        for (let i = 0; i < streamVertices.length; i += 3) {
            const z = streamVertices[i + 2];
            streamVertices[i] += Math.sin(z * 0.1) * 2; // Meandering path
            streamVertices[i + 1] = 0.1; // Slightly above ground
        }
        streamGeometry.attributes.position.needsUpdate = true;
        streamGeometry.computeVertexNormals();
        
        const waterMaterial = new THREE.MeshStandardMaterial({
            color: 0x3498db,
            metalness: 0.9,
            roughness: 0.1,
            transparent: true,
            opacity: 0.8
        });
        
        const stream = new THREE.Mesh(streamGeometry, waterMaterial);
        stream.rotation.x = -Math.PI / 2;
        stream.position.y = 0.1; // Slightly above ground
        this.scene.add(stream);
        
        // Add rocks and vegetation along stream
        const createRock = (size) => {
            const rockGeometry = new THREE.DodecahedronGeometry(size);
            const rockMaterial = new THREE.MeshStandardMaterial({
                color: 0x7c7c7c,
                roughness: 0.9,
                metalness: 0.1
            });
            return new THREE.Mesh(rockGeometry, rockMaterial);
        };

        const createReedCluster = () => {
            const reedGroup = new THREE.Group();
            const reedMaterial = new THREE.MeshStandardMaterial({
                color: 0x567d46,
                roughness: 0.8
            });

            for (let i = 0; i < 5; i++) {
                const height = 0.5 + Math.random() * 0.5;
                const reedGeometry = new THREE.CylinderGeometry(0.02, 0.02, height, 4);
                const reed = new THREE.Mesh(reedGeometry, reedMaterial);
                
                // Position within cluster
                reed.position.set(
                    Math.random() * 0.3 - 0.15,
                    height / 2,
                    Math.random() * 0.3 - 0.15
                );
                
                // Random slight tilt
                reed.rotation.x = (Math.random() - 0.5) * 0.2;
                reed.rotation.z = (Math.random() - 0.5) * 0.2;
                
                reedGroup.add(reed);
            }
            return reedGroup;
        };

        // Place rocks and vegetation along stream path
        for (let i = -streamLength/2; i < streamLength/2; i += 4) {
            const streamX = Math.sin(i * 0.1) * 2; // Follow stream's meandering
            
            // Left side of stream
            if (Math.random() < 0.7) { // 70% chance for each position
                const rock = createRock(0.3 + Math.random() * 0.4);
                rock.position.set(
                    streamX - (1.8 + Math.random()),
                    Math.random() * 0.3,
                    i
                );
                rock.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );
                this.scene.add(rock);
            }
            
            if (Math.random() < 0.8) { // 80% chance for vegetation
                const reeds = createReedCluster();
                reeds.position.set(
                    streamX - (1.5 + Math.random() * 0.5),
                    0,
                    i
                );
                this.scene.add(reeds);
            }
            
            // Right side of stream
            if (Math.random() < 0.7) {
                const rock = createRock(0.3 + Math.random() * 0.4);
                rock.position.set(
                    streamX + (1.8 + Math.random()),
                    Math.random() * 0.3,
                    i
                );
                rock.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );
                this.scene.add(rock);
            }
            
            if (Math.random() < 0.8) {
                const reeds = createReedCluster();
                reeds.position.set(
                    streamX + (1.5 + Math.random() * 0.5),
                    0,
                    i
                );
                this.scene.add(reeds);
            }
        }
        
        // Add stream particles (for water effect)
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
        
        // Add trees
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const radius = 15 + Math.random() * 10;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const tree = this.createPineTree(x, z);
            this.scene.add(tree);
        }
        
        // Create and add soldier model
        this.soldier = this.createSoldier(false);
        this.player = new THREE.Group();
        this.player.add(this.soldier);
        this.player.position.y = 1;
        this.scene.add(this.player);
        
        // Set up camera (now separate from player)
        this.camera.position.copy(this.player.position).add(this.cameraOffset);
        this.scene.add(this.camera);
        
        // Create and add enemy
        this.enemy = this.createSoldier(true);
        this.enemy.scale.set(1, 1, 1);
        
        // Position enemy randomly within level bounds
        const randomAngle = Math.random() * Math.PI * 2;
        const randomRadius = Math.random() * this.levelRadius;
        this.enemy.position.set(
            Math.cos(randomAngle) * randomRadius,
            1,
            Math.sin(randomAngle) * randomRadius
        );
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

        // Resume audio context on first click
        this.container.addEventListener('click', () => {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        }, { once: true });
    }
    
    updateMovement() {
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
            
            // Check for collisions before updating position
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
        // Create crosshair container
        const crosshairContainer = document.createElement('div');
        crosshairContainer.style.position = 'absolute';
        crosshairContainer.style.top = '40%';
        crosshairContainer.style.left = '55%';
        crosshairContainer.style.transform = 'translate(-50%, -50%)';
        crosshairContainer.style.width = '24px';
        crosshairContainer.style.height = '24px';
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
        circle.style.border = '2px solid rgba(255, 0, 0, 0.8)';
        circle.style.borderRadius = '50%';
        crosshair.appendChild(circle);
        
        // Add crosshair lines
        const createLine = (vertical) => {
            const line = document.createElement('div');
            line.style.position = 'absolute';
            line.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
            
            if (vertical) {
                line.style.width = '2px';
                line.style.height = '100%';
                line.style.left = '50%';
                line.style.transform = 'translateX(-50%)';
            } else {
                line.style.height = '2px';
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
        // Create a more powerful gunshot sound
        const duration = 0.2;
        const sampleRate = this.audioContext.sampleRate;
        this.gunshotBuffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = this.gunshotBuffer.getChannelData(0);
        
        // Generate a punchier sound
        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            // Mix noise with a sharper attack and longer decay
            const attack = Math.exp(-t * 100);
            const decay = Math.exp(-t * 15);
            const noise = Math.random() * 2 - 1;
            data[i] = (noise * attack * 0.5 + noise * decay * 0.5) * 1.5;
        }
    }

    playGunshot() {
        if (!this.gunshotBuffer) return;
        
        const source = this.audioContext.createBufferSource();
        source.buffer = this.gunshotBuffer;
        
        // Add a lowpass filter for more bass
        const lowpass = this.audioContext.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 1000;
        
        // Add a highpass filter to keep some crack
        const highpass = this.audioContext.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 200;
        
        // Add distortion for power
        const distortion = this.audioContext.createWaveShaper();
        function makeDistortionCurve(amount) {
            const k = amount;
            const samples = 44100;
            const curve = new Float32Array(samples);
            for (let i = 0; i < samples; ++i) {
                const x = (i * 2) / samples - 1;
                curve[i] = Math.sign(x) * Math.pow(Math.abs(x), 0.5) * 2;
            }
            return curve;
        }
        distortion.curve = makeDistortionCurve(50);
        
        // Create convolver for echo effect
        const convolver = this.audioContext.createConvolver();
        const reverbTime = 1;
        const rate = this.audioContext.sampleRate;
        const length = rate * reverbTime;
        const impulse = this.audioContext.createBuffer(2, length, rate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);
        
        for (let i = 0; i < length; i++) {
            const decay = Math.exp(-3 * i / length);
            left[i] = (Math.random() * 2 - 1) * decay;
            right[i] = (Math.random() * 2 - 1) * decay;
        }
        convolver.buffer = impulse;
        
        // Create volume controls
        const mainGain = this.audioContext.createGain();
        mainGain.gain.value = 0.4; // Main volume
        
        const reverbGain = this.audioContext.createGain();
        reverbGain.gain.value = 0.2; // Echo volume
        
        // Connect the audio nodes
        source.connect(distortion);
        distortion.connect(lowpass);
        lowpass.connect(highpass);
        
        // Main signal path
        highpass.connect(mainGain);
        mainGain.connect(this.audioContext.destination);
        
        // Reverb path
        highpass.connect(convolver);
        convolver.connect(reverbGain);
        reverbGain.connect(this.audioContext.destination);
        
        // Play the sound
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
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
}); 