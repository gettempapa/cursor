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
        
        // Start the animation loop
        this.animate();
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
        return treeGroup;
    }
    
    setupScene() {
        // Add lights
        const ambientLight = new THREE.AmbientLight(0x404040);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(ambientLight);
        this.scene.add(directionalLight);
        
        // Add ground
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x355e3b, // Forest green
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);
        
        // Add trees
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const radius = 15 + Math.random() * 10;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const tree = this.createPineTree(x, z);
            this.scene.add(tree);
        }
        
        // Add player model
        const playerGeometry = new THREE.BoxGeometry(1, 2, 1);
        const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        this.player = new THREE.Mesh(playerGeometry, playerMaterial);
        this.player.position.y = 1;
        this.scene.add(this.player);
        
        // Set up camera
        this.camera.position.set(0, 1.7, 0);
        this.player.add(this.camera);
    }
    
    setupControls() {
        // Mouse movement
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.container) {
                this.mouseX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
                this.mouseY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
                
                // Rotate player (and camera) horizontally
                this.player.rotation.y -= this.mouseX * this.rotationSpeed;
                
                // Rotate camera vertically (limit up/down look)
                this.camera.rotation.x = Math.max(-Math.PI/2, 
                    Math.min(Math.PI/2, 
                        this.camera.rotation.x - this.mouseY * this.rotationSpeed
                    )
                );
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
            
            // Update player position
            this.player.position.x += direction.x * this.moveSpeed;
            this.player.position.z += direction.z * this.moveSpeed;
        }
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.updateMovement();
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
}); 