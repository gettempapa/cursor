import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';
import { Player } from './modules/Player.js';

import { Enemy } from './modules/Enemy.js';
import { Environment } from './modules/Environment.js';
import { UI } from './modules/UI.js';

export class Game {
    constructor() {
        this.container = document.getElementById('gameContainer');
        
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
        
        // Camera setup
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 2, 5);
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);
        
        // Player setup
        this.playerHeight = 2;
        this.playerPosition = new THREE.Vector3(0, this.playerHeight, 0);
        this.playerRotation = new THREE.Euler(0, 0, 0, 'YXZ');
        this.moveSpeed = 0.1;
        this.mouseSensitivity = 0.002;
        
        // Movement state
        this.moveState = {
            forward: false,
            backward: false,
            left: false,
            right: false
        };
        
        // Create ground
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x2d5a27 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        // Event listeners
        this.setupEventListeners();
        
        // Start animation loop
        this.animate();
    }
    
    setupEventListeners() {
        // Mouse lock on click
        this.container.addEventListener('click', () => {
            this.container.requestPointerLock();
        });
        
        // Mouse movement
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.container) {
                this.playerRotation.y -= e.movementX * this.mouseSensitivity;
                this.playerRotation.x -= e.movementY * this.mouseSensitivity;
                this.playerRotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.playerRotation.x));
            }
        });
        
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
        
        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    updateMovement() {
        // Calculate movement direction
        const moveDirection = new THREE.Vector3(0, 0, 0);
        
        if (this.moveState.forward) moveDirection.z -= 1;
        if (this.moveState.backward) moveDirection.z += 1;
        if (this.moveState.left) moveDirection.x -= 1;
        if (this.moveState.right) moveDirection.x += 1;
        
        if (moveDirection.length() > 0) {
            moveDirection.normalize();
            
            // Apply player rotation to movement
            moveDirection.applyEuler(new THREE.Euler(0, this.playerRotation.y, 0));
            
            // Update position
            this.playerPosition.add(moveDirection.multiplyScalar(this.moveSpeed));
        }
        
        // Update camera position and rotation
        this.camera.position.copy(this.playerPosition);
        this.camera.rotation.copy(this.playerRotation);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.updateMovement();
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new Game();
}); 