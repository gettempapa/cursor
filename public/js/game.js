class SkiingGame {
    constructor() {
        this.setupScene();
        this.setupPlayer();
        this.setupControls();
        this.startGameLoop();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Snowy mountain
        const mountainTexture = new THREE.TextureLoader().load('textures/snow.jpg');
        mountainTexture.wrapS = mountainTexture.wrapT = THREE.RepeatWrapping;
        mountainTexture.repeat.set(100, 100);

        const mountain = new THREE.Mesh(
            new THREE.CylinderGeometry(4000, 4000, 8000, 32, 1, true),
            new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide })
        );
        mountain.rotation.x = Math.PI / 2;
        mountain.receiveShadow = true;
        this.scene.add(mountain);
    }

    setupPlayer() {
        this.player = new THREE.Mesh(
            new THREE.BoxGeometry(1, 2, 1),
            new THREE.MeshStandardMaterial({ color: 0x567d46 })
        );
        this.player.castShadow = true;
        this.player.position.set(0, 4000, 0); // Start at the top of the mountain
        this.scene.add(this.player);

        this.velocity = new THREE.Vector3();
        this.acceleration = new THREE.Vector3();
        this.moveInput = new THREE.Vector2();
        this.yaw = 0;
        this.pitch = 0;
    }

    setupControls() {
        document.addEventListener('keydown', e => this.handleKey(e.code, true));
        document.addEventListener('keyup', e => this.handleKey(e.code, false));
        document.addEventListener('click', () => document.body.requestPointerLock());
        document.addEventListener('mousemove', e => {
            if (document.pointerLockElement) {
                this.yaw -= e.movementX * 0.002;
                this.pitch = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, this.pitch + e.movementY * 0.002));
            }
        });
    }

    handleKey(key, pressed) {
        const direction = pressed ? 1 : 0;
        switch(key) {
            case 'KeyW': this.moveInput.y = -direction; break;
            case 'KeyS': this.moveInput.y = direction; break;
            case 'KeyA': this.moveInput.x = -direction; break;
            case 'KeyD': this.moveInput.x = direction; break;
        }
    }

    update() {
        // Skiing physics
        const gravity = new THREE.Vector3(0, -0.01, 0);
        this.acceleration.copy(gravity);

        if (this.moveInput.lengthSq() > 0) {
            const move = this.moveInput.normalize().multiplyScalar(0.1);
            this.acceleration.x += Math.sin(this.yaw) * move.y + Math.cos(this.yaw) * move.x;
            this.acceleration.z += Math.cos(this.yaw) * move.y - Math.sin(this.yaw) * move.x;
        }

        this.velocity.add(this.acceleration);
        this.velocity.multiplyScalar(0.99); // Friction

        this.player.position.add(this.velocity);
        this.player.rotation.y = this.yaw;

        // Position camera
        const cameraOffset = new THREE.Vector3(0, 2, 5).applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
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

new SkiingGame(); 