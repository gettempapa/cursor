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
        
        // Head with camo helmet
        const headGeometry = new THREE.BoxGeometry(0.35, 0.32, 0.35);
        
        // Create camo material with multiple colors
        const camoColors = [0x4b5320, 0x3a421a, 0x5d6d21, 0x2c3317]; // Different shades of green
        
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
        
        // Face (visible under the helmet)
        const faceGeometry = new THREE.BoxGeometry(0.22, 0.22, 0.22);
        const faceMaterial = new THREE.MeshBasicMaterial({ color: 0xD2B48C });
        const face = new THREE.Mesh(faceGeometry, faceMaterial);
        face.position.set(0, 0.95, 0.05); // Position slightly lower than helmet and forward
        this.player.add(face);
        
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
                    console.log("Playing rifle sound");
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
    
    setupControls() {
        // Movement
        this.moveState = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false
        };
        
        // Track mouse state for shooting
        this.mouseDown = false;
        
        document.addEventListener('keydown', (e) => {
            switch (e.code) {
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