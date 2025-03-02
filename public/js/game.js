class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('game-container').appendChild(this.renderer.domElement);
        
        // Basic scene
        this.scene.add(new THREE.AmbientLight(0xffffff));
        this.scene.add(new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100),
            new THREE.MeshBasicMaterial({ color: 0x3a5f0b })
        )).rotation.x = -Math.PI/2;
        
        // Player and target
        this.player = new THREE.Mesh(
            new THREE.BoxGeometry(1, 2, 1),
            new THREE.MeshBasicMaterial({ color: 0x567d46 })
        );
        this.scene.add(this.player);
        
        this.target = new THREE.Mesh(
            new THREE.BoxGeometry(4, 4, 6),
            new THREE.MeshBasicMaterial({ color: 0x8b4513 })
        );
        this.target.position.set(20, 2, 20);
        this.scene.add(this.target);
        
        // Core game state
        this.moveInput = new THREE.Vector2();
        this.yaw = 0;
        this.pitch = 0;
        
        // Input handlers
        document.addEventListener('keydown', e => this.handleKey(e.code, true));
        document.addEventListener('keyup', e => this.handleKey(e.code, false));
        document.addEventListener('click', () => document.getElementById('game-container').requestPointerLock());
        document.addEventListener('mousemove', e => {
            if (document.pointerLockElement) {
                this.yaw -= e.movementX * 0.002;
                this.pitch = Math.max(-1, Math.min(1, this.pitch + e.movementY * 0.002));
            }
        });
        
        requestAnimationFrame(() => this.update());
    }
    
    handleKey(key, pressed) {
        switch(key) {
            case 'KeyW': this.moveInput.y = pressed ? -1 : 0; break;
            case 'KeyS': this.moveInput.y = pressed ? 1 : 0; break;
            case 'KeyA': this.moveInput.x = pressed ? -1 : 0; break;
            case 'KeyD': this.moveInput.x = pressed ? 1 : 0; break;
        }
    }
    
    update() {
        requestAnimationFrame(() => this.update());
        
        // Move player
        if (this.moveInput.lengthSq() > 0) {
            const move = this.moveInput.normalize().multiplyScalar(0.15);
            this.player.position.x += Math.sin(this.yaw) * move.y + Math.cos(this.yaw) * move.x;
            this.player.position.z += Math.cos(this.yaw) * move.y - Math.sin(this.yaw) * move.x;
        }
        this.player.rotation.y = this.yaw;
        
        // Position camera
        const dist = 5;
        const height = 2;
        const lookHeight = 1.5;
        
        this.camera.position.x = this.player.position.x - Math.sin(this.yaw) * dist * Math.cos(this.pitch);
        this.camera.position.y = this.player.position.y + height + dist * Math.sin(this.pitch);
        this.camera.position.z = this.player.position.z - Math.cos(this.yaw) * dist * Math.cos(this.pitch);
        
        this.camera.lookAt(
            this.player.position.x,
            this.player.position.y + lookHeight,
            this.player.position.z
        );
        
        this.renderer.render(this.scene, this.camera);
    }
}

new Game(); 