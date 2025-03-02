class JungleHuntGame {
    constructor() {
        this.initScene();
        this.initPlayer();
        this.initDinosaurs();
        this.initControls();
        this.startGameLoop();
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Lighting
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Jungle ground
        const groundTexture = new THREE.TextureLoader().load('textures/jungle_ground.jpg');
        groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
        groundTexture.repeat.set(50, 50);

        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(500, 500),
            new THREE.MeshStandardMaterial({ map: groundTexture })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Jungle trees
        this.createTrees(100);
    }

    createTrees(count) {
        for (let i = 0; i < count; i++) {
            const tree = new THREE.Group();
            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.5, 0.5, 5),
                new THREE.MeshStandardMaterial({ color: 0x8b5a2b })
            );
            trunk.castShadow = true;
            tree.add(trunk);

            const leaves = new THREE.Mesh(
                new THREE.ConeGeometry(2, 5, 8),
                new THREE.MeshStandardMaterial({ color: 0x228b22 })
            );
            leaves.position.y = 3;
            leaves.castShadow = true;
            tree.add(leaves);

            tree.position.set(Math.random() * 400 - 200, 0, Math.random() * 400 - 200);
            this.scene.add(tree);
        }
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

    initDinosaurs() {
        this.dinosaurs = Array.from({ length: 10 }, () => {
            const dino = new THREE.Mesh(
                new THREE.BoxGeometry(4, 4, 6),
                new THREE.MeshStandardMaterial({ color: 0x8b4513 })
            );
            dino.position.set(Math.random() * 400 - 200, 2, Math.random() * 400 - 200);
            dino.castShadow = true;
            this.scene.add(dino);
            return dino;
        });
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
        const direction = pressed ? 1 : 0;
        switch(key) {
            case 'KeyW': this.moveInput.y = -direction; break;
            case 'KeyS': this.moveInput.y = direction; break;
            case 'KeyA': this.moveInput.x = -direction; break;
            case 'KeyD': this.moveInput.x = direction; break;
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

new JungleHuntGame(); 