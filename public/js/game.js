class Game {
    constructor() {
        // Setup Three.js
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('game-container').appendChild(this.renderer.domElement);
        
        // Add basic light
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        
        // Create ground
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100),
            new THREE.MeshBasicMaterial({ color: 0x3a5f0b })
        );
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);
        
        // Create player
        this.player = new THREE.Mesh(
            new THREE.BoxGeometry(1, 2, 1),
            new THREE.MeshBasicMaterial({ color: 0x567d46 })
        );
        this.scene.add(this.player);
        
        // Create dinosaur
        this.dinosaur = new THREE.Mesh(
            new THREE.BoxGeometry(4, 4, 6),
            new THREE.MeshBasicMaterial({ color: 0x8b4513 })
        );
        this.dinosaur.position.set(20, 2, 20);
        this.scene.add(this.dinosaur);
        
        // Player state
        this.position = new THREE.Vector3();
        this.rotation = new THREE.Vector2(); // x: vertical, y: horizontal
        
        // Setup controls
        document.addEventListener('keydown', e => this.handleKey(e.code, true));
        document.addEventListener('keyup', e => this.handleKey(e.code, false));
        
        document.addEventListener('click', () => {
            document.getElementById('game-container').requestPointerLock();
        });
        
        document.addEventListener('mousemove', e => {
            if (document.pointerLockElement) {
                this.rotation.y -= e.movementX * 0.002;
                this.rotation.x -= e.movementY * 0.002;
                this.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.rotation.x));
            }
        });
        
        // Start game loop
        this.animate();
    }
    
    handleKey(code, pressed) {
        switch(code) {
            case 'KeyW': this.forward = pressed; break;
            case 'KeyS': this.backward = pressed; break;
            case 'KeyA': this.left = pressed; break;
            case 'KeyD': this.right = pressed; break;
        }
    }
    
    update() {
        // Move player
        const speed = 0.15;
        const direction = new THREE.Vector3();
        
        if (this.forward) direction.z -= 1;
        if (this.backward) direction.z += 1;
        if (this.left) direction.x -= 1;
        if (this.right) direction.x += 1;
        
        if (direction.length() > 0) {
            direction.normalize();
            direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);
            this.position.add(direction.multiplyScalar(speed));
        }
        
        // Update player
        this.player.position.copy(this.position);
        this.player.rotation.y = this.rotation.y;
        
        // Update camera
        const cameraOffset = new THREE.Vector3(0, 2, 5);
        cameraOffset.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.rotation.x);
        cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);
        
        this.camera.position.copy(this.position).add(new THREE.Vector3(0, 1.5, 0)).sub(cameraOffset);
        this.camera.lookAt(this.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.renderer.render(this.scene, this.camera);
    }
}

new Game(); 