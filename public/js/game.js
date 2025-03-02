class Game {
    constructor() {
        this.setupCore();
        this.createEnvironment();
        this.createPlayer();
        this.createDinosaur();
        this.setupControls();
        
        // Start game loop
        this.lastTime = performance.now();
        this.animate();
    }
    
    setupCore() {
        // Basic Three.js setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        
        // Add to DOM
        this.container = document.getElementById('game-container');
        this.container.appendChild(this.renderer.domElement);
        
        // Basic lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(50, 100, 50);
        sunLight.castShadow = true;
        this.scene.add(sunLight);
        
        // Player state
        this.playerState = {
            position: new THREE.Vector3(0, 0, 0),
            rotation: new THREE.Euler(0, 0, 0),
            moveSpeed: 0.15,
            moving: false
        };
        
        // Camera angles
        this.cameraAngles = {
            vertical: 0,
            horizontal: 0
        };
    }
    
    createEnvironment() {
        // Ground
        const groundGeo = new THREE.PlaneGeometry(200, 200);
        const grassTexture = new THREE.TextureLoader().load('textures/grass.jpg');
        grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
        grassTexture.repeat.set(50, 50);
        
        const groundMat = new THREE.MeshStandardMaterial({
            map: grassTexture,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Add trees
        for (let i = 0; i < 50; i++) {
            const tree = this.createTree();
            tree.position.set(
                Math.random() * 180 - 90,
                0,
                Math.random() * 180 - 90
            );
            this.scene.add(tree);
        }
    }
    
    createTree() {
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.8, 5),
            new THREE.MeshStandardMaterial({ color: 0x4d2926 })
        );
        trunk.castShadow = true;
        
        const leaves = new THREE.Mesh(
            new THREE.ConeGeometry(3, 6, 8),
            new THREE.MeshStandardMaterial({ color: 0x0d5302 })
        );
        leaves.position.y = 5;
        leaves.castShadow = true;
        
        const tree = new THREE.Group();
        tree.add(trunk);
        tree.add(leaves);
        return tree;
    }
    
    createPlayer() {
        // Navy SEAL model
        const playerGeo = new THREE.BoxGeometry(1, 2, 1);
        const playerMat = new THREE.MeshStandardMaterial({ color: 0x567d46 }); // Camo green
        this.player = new THREE.Mesh(playerGeo, playerMat);
        this.player.castShadow = true;
        this.scene.add(this.player);
        
        // Rifle
        const rifleGroup = new THREE.Group();
        const rifleBody = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.2, 1),
            new THREE.MeshStandardMaterial({ color: 0x2b2b2b })
        );
        rifleGroup.add(rifleBody);
        
        const scope = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.2),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
        );
        scope.rotation.z = Math.PI / 2;
        scope.position.y = 0.1;
        rifleGroup.add(scope);
        
        rifleGroup.position.set(0.4, 0.5, 0.3);
        this.rifle = rifleGroup;
        this.player.add(rifleGroup);
    }
    
    createDinosaur() {
        const dinoGroup = new THREE.Group();
        
        // Body
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(4, 3, 6),
            new THREE.MeshStandardMaterial({ color: 0x5a4d41 })
        );
        dinoGroup.add(body);
        
        // Head
        const head = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 2, 3),
            new THREE.MeshStandardMaterial({ color: 0x5a4d41 })
        );
        head.position.set(0, 1.5, 3);
        dinoGroup.add(head);
        
        // Legs
        const legGeo = new THREE.BoxGeometry(1, 3, 1);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x5a4d41 });
        
        [-1.5, 1.5].forEach(x => {
            [-2, 2].forEach(z => {
                const leg = new THREE.Mesh(legGeo, legMat);
                leg.position.set(x, -1.5, z);
                dinoGroup.add(leg);
            });
        });
        
        dinoGroup.position.set(20, 1.5, 20);
        dinoGroup.castShadow = true;
        this.dinosaur = dinoGroup;
        this.scene.add(dinoGroup);
    }
    
    setupControls() {
        // Movement state
        this.moveState = {
            forward: false,
            backward: false,
            left: false,
            right: false
        };
        
        // WASD controls
        document.addEventListener('keydown', (e) => {
            switch (e.code) {
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
                // Horizontal rotation (left/right)
                this.playerState.rotation.y -= e.movementX * 0.002;
                
                // Vertical rotation (up/down)
                this.cameraAngles.vertical += e.movementY * 0.002;
                this.cameraAngles.vertical = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.cameraAngles.vertical));
            }
        });
    }
    
    updatePlayerCamera() {
        const cameraHeight = 2;
        const cameraDistance = 5;
        
        const playerPosition = this.playerState.position.clone();
        playerPosition.y += 1.5;
        
        const horizontalDist = Math.cos(this.cameraAngles.vertical) * cameraDistance;
        const verticalDist = Math.sin(this.cameraAngles.vertical) * cameraDistance;
        
        const cameraPosition = new THREE.Vector3(
            -Math.sin(this.playerState.rotation.y) * horizontalDist,
            cameraHeight + verticalDist,
            -Math.cos(this.playerState.rotation.y) * horizontalDist
        );
        
        this.camera.position.copy(playerPosition).add(cameraPosition);
        this.camera.lookAt(playerPosition);
        this.camera.up.set(0, 1, 0);
    }
    
    updatePlayer(deltaTime) {
        const direction = new THREE.Vector3(0, 0, 0);
        
        if (this.moveState.forward) direction.z -= 1;
        if (this.moveState.backward) direction.z += 1;
        if (this.moveState.left) direction.x -= 1;
        if (this.moveState.right) direction.x += 1;
        
        this.playerState.moving = direction.length() > 0;
        
        if (this.playerState.moving) {
            direction.normalize();
            direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerState.rotation.y);
            direction.multiplyScalar(this.playerState.moveSpeed * deltaTime * 60);
            
            this.playerState.position.add(direction);
            this.player.position.copy(this.playerState.position);
            this.player.rotation.y = this.playerState.rotation.y;
        }
    }
    
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const now = performance.now();
        const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;
        
        this.updatePlayer(deltaTime);
        this.updatePlayerCamera();
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Create game instance when page loads
window.addEventListener('DOMContentLoaded', () => {
    try {
        window.game = new Game();
    } catch (error) {
        console.error('Failed to start game:', error);
    }
}); 