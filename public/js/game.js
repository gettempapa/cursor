import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';

class Game {
    constructor() {
        // Debug mode
        this.debug = document.getElementById('debug');
        this.debug.style.display = 'block';
        this.debug.textContent = 'Initializing...';

        try {
            // Get container
            this.container = document.getElementById('gameContainer');
            if (!this.container) throw new Error('No game container found');
            
            // Create scene
            this.scene = new THREE.Scene();
            
            // Create camera
            this.camera = new THREE.PerspectiveCamera(
                75,
                window.innerWidth / window.innerHeight,
                0.1,
                1000
            );
            this.camera.position.set(0, 2, 5);
            
            // Create renderer
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setClearColor(0x87ceeb); // Sky blue
            this.container.appendChild(this.renderer.domElement);
            
            // Add a simple cube to test rendering
            const geometry = new THREE.BoxGeometry();
            const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            this.cube = new THREE.Mesh(geometry, material);
            this.scene.add(this.cube);
            
            // Add ground
            const groundGeometry = new THREE.PlaneGeometry(10, 10);
            const groundMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x2d5a27,
                side: THREE.DoubleSide
            });
            const ground = new THREE.Mesh(groundGeometry, groundMaterial);
            ground.rotation.x = Math.PI / 2;
            this.scene.add(ground);
            
            // Add basic lighting
            const light = new THREE.DirectionalLight(0xffffff, 1);
            light.position.set(1, 1, 1);
            this.scene.add(light);
            
            // Add ambient light
            const ambient = new THREE.AmbientLight(0x404040);
            this.scene.add(ambient);
            
            // Hide loading screen
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) loadingScreen.style.display = 'none';
            
            // Start animation loop
            this.animate();
            
            this.debug.textContent = 'Game running';
        } catch (error) {
            console.error('Game initialization failed:', error);
            this.debug.textContent = `Error: ${error.message}`;
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Rotate cube to show something is happening
        if (this.cube) {
            this.cube.rotation.x += 0.01;
            this.cube.rotation.y += 0.01;
        }
        
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