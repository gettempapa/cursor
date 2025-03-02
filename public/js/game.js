class Game {
    constructor() {
        this.initScene();
        this.initPlayer();
        this.initTarget();
        this.initControls();
        this.startGameLoop();
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Ground
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100),
            new THREE.MeshStandardMaterial({ color: 0x3a5f0b })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    initPlayer() {
        this.player = new THREE.Mesh(
            new THREE.BoxGeometry(1, 2, 1),
            new THREE.MeshStandardMaterial({ color: 0x567d46 })
        );
        this.player.castShadow = true;
        this.scene.add(this.player);

        this.moveInput = new THREE.Vector2();
        this.yaw = 0;
        this.pitch = 0;
    }

    initTarget() {
        this.target = new THREE.Mesh(
            new THREE.BoxGeometry(4, 4, 6),
            new THREE.MeshStandardMaterial({ color: 0x8b4513 })
        );
        this.target.position.set(20, 2, 20);
        this.target.castShadow = true;
        this.scene.add(this.target);
    }

    initControls() {
        document.addEventListener('keydown', e => this.handleKey(e.code, true));
        document.addEventListener('keyup', e => this.handleKey(e.code, false));
        document.addEventListener('click', () => document.getElementById('game-container').requestPointerLock());
        document.addEventListener('mousemove', e => {
            if (document.pointerLockElement) {
                this.yaw -= e.movementX * 0.002;
                this.pitch = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, this.pitch + e.movementY * 0.002));
            }
        });
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
        // Move player
        if (this.moveInput.lengthSq() > 0) {
            const move = this.moveInput.normalize().multiplyScalar(0.15);
            this.player.position.x += Math.sin(this.yaw) * move.y + Math.cos(this.yaw) * move.x;
            this.player.position.z += Math.cos(this.yaw) * move.y - Math.sin(this.yaw) * move.x;
        }
        this.player.rotation.y = this.yaw;

        // Position camera
        const cameraOffset = new THREE.Vector3(0, 2, 5);
        cameraOffset.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
        cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

        this.camera.position.copy(this.player.position).add(cameraOffset);
        this.camera.lookAt(this.player.position);

        this.renderer.render(this.scene, this.camera);
    }

    startGameLoop() {
        const gameLoop = () => {
            requestAnimationFrame(gameLoop);
            this.update();
        };
        gameLoop();
    }
}

new Game(); 