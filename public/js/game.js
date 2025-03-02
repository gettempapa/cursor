import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';

class Game {
    constructor() {
        // Debug mode
        this.debug = document.getElementById('debug');
        this.debug.style.display = 'block';
        this.debug.textContent = 'Initializing...';

        try {
            // Core setup
            this.setupCore();
            
            // Create environment
            this.createEnvironment();
            
            // Create player character
            this.createPlayer();
            
            // Setup controls
            this.setupControls();
            
            // Hide loading screen
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) loadingScreen.style.display = 'none';
            
            // Start animation loop
            this.animate();
            
            this.debug.textContent = 'Game running - WASD to move, mouse to look';
        } catch (error) {
            console.error('Game initialization failed:', error);
            this.debug.textContent = `Error: ${error.message}`;
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
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB); // Sky blue
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        
        // Handle window resizing
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    createEnvironment() {
        // Create ground
        const groundSize = 100;
        const groundTexture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg');
        groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
        groundTexture.repeat.set(25, 25);
        groundTexture.anisotropy = 16;
        
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            map: groundTexture,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
        
        // Add trees
        this.createTrees();
        
        // Add lighting
        this.createLighting();
    }
    
    createTrees() {
        // Create simple tree model
        const treeCount = 50;
        const treePositions = [];
        
        for (let i = 0; i < treeCount; i++) {
            const tree = new THREE.Group();
            
            // Tree trunk
            const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
            const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.y = 1;
            trunk.castShadow = true;
            tree.add(trunk);
            
            // Tree foliage
            const foliageGeometry = new THREE.ConeGeometry(1, 3, 8);
            const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x2E8B57 });
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.position.y = 3;
            foliage.castShadow = true;
            tree.add(foliage);
            
            // Position tree randomly on the ground
            const area = 40; // Area to place trees
            let x, z;
            let validPosition = false;
            
            // Ensure trees aren't too close to each other
            while (!validPosition) {
                x = Math.random() * area - area/2;
                z = Math.random() * area - area/2;
                
                validPosition = true;
                for (const pos of treePositions) {
                    const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(z - pos.z, 2));
                    if (distance < 4) { // Minimum distance between trees
                        validPosition = false;
                        break;
                    }
                }
            }
            
            treePositions.push({x, z});
            tree.position.set(x, 0, z);
            this.scene.add(tree);
        }
    }
    
    createLighting() {
        // Main directional light (sun)
        const sunLight = new THREE.DirectionalLight(0xffffcc, 1);
        sunLight.position.set(20, 30, 20);
        sunLight.castShadow = true;
        
        // Configure shadow properties
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 100;
        sunLight.shadow.camera.left = -50;
        sunLight.shadow.camera.right = 50;
        sunLight.shadow.camera.top = 50;
        sunLight.shadow.camera.bottom = -50;
        
        this.scene.add(sunLight);
        
        // Ambient light for general illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        // Hemisphere light to enhance outdoor look
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x2E8B57, 0.6);
        this.scene.add(hemisphereLight);
    }
    
    createPlayer() {
        // Player state
        this.playerState = {
            position: new THREE.Vector3(0, 1, 0),
            rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
            moveSpeed: 0.12,
            turnSpeed: 0.02,
            moving: false
        };
        
        // Create simple soldier model
        this.player = new THREE.Group();
        
        // Body
        const bodyGeometry = new THREE.BoxGeometry(0.5, 0.8, 0.3);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x2F4F4F }); // Dark slate for soldier uniform
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.4;
        body.castShadow = true;
        this.player.add(body);
        
        // Head
        const headGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0xD2B48C }); // Tan for skin tone
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1;
        head.castShadow = true;
        this.player.add(head);
        
        // Legs
        const legGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        const legMaterial = new THREE.MeshStandardMaterial({ color: 0x2F4F4F });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(0.15, -0.3, 0);
        leftLeg.castShadow = true;
        this.player.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(-0.15, -0.3, 0);
        rightLeg.castShadow = true;
        this.player.add(rightLeg);
        
        // Arms
        const armGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        const armMaterial = new THREE.MeshStandardMaterial({ color: 0x2F4F4F });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(0.35, 0.4, 0);
        leftArm.castShadow = true;
        this.player.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(-0.35, 0.4, 0);
        rightArm.castShadow = true;
        this.player.add(rightArm);
        
        // Position player and add to scene
        this.player.position.copy(this.playerState.position);
        this.scene.add(this.player);
        
        // Setup camera defaults for third-person view
        this.cameraOffset = new THREE.Vector3(0, 2, 5); // Behind and above the player
        this.updatePlayerCamera();
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
        // Position camera behind player
        const cameraOffset = this.cameraOffset.clone();
        cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerState.rotation.y);
        
        const targetPosition = this.playerState.position.clone().add(cameraOffset);
        this.camera.position.copy(targetPosition);
        
        // Make camera look at player's head height
        const lookTarget = this.playerState.position.clone();
        lookTarget.y += 1; // Look at the player's head
        this.camera.lookAt(lookTarget);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update player
        this.updatePlayer();
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Create game instance when page loads
window.addEventListener('DOMContentLoaded', () => {
    try {
        new Game();
    } catch (error) {
        console.error('Failed to start game:', error);
        const debug = document.getElementById('debug');
        if (debug) {
            debug.style.display = 'block';
            debug.textContent = `Failed to start game: ${error.message}`;
        }
    }
}); 