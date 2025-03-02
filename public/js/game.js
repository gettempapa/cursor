import * as THREE from 'three';
import { Player } from './modules/Player.js';
import { Enemy } from './modules/Enemy.js';
import { Environment } from './modules/Environment.js';
import { UI } from './modules/UI.js';

export class Game {
    constructor() {
        this.container = document.getElementById('gameContainer');
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87ceeb); // Sky blue background
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        
        // Initialize game components
        this.environment = new Environment(this.scene);
        this.player = new Player(this.scene);
        
        // Initialize enemy with a specific position
        this.enemy = new Enemy(this.scene, new THREE.Vector3(-10, 1, -10));
        this.scene.add(this.enemy.object); // Explicitly add enemy to scene
        
        this.ui = new UI(this.container);
        
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
    
    setupControls() {
        // Mouse movement
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.container) {
                this.player.handleMouseMovement(e.movementX, e.movementY);
            }
        });
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (this.player.isDead) return;
            
            switch(e.code) {
                case 'KeyW': this.player.moveState.forward = true; break;
                case 'KeyS': this.player.moveState.backward = true; break;
                case 'KeyA': this.player.moveState.left = true; break;
                case 'KeyD': this.player.moveState.right = true; break;
                case 'Space': this.player.moveState.jump = true; break;
                case 'KeyR':
                    this.player.weaponSystem.reload();
                    this.ui.showReloadIndicator();
                    break;
                case 'Tab':
                    e.preventDefault();
                    this.ui.toggleWeaponMenu();
                    break;
                case 'Digit1':
                    if (this.ui.weaponMenuContainer.style.display === 'block') {
                        this.player.weaponSystem.switchWeapon('rifle');
                        this.ui.toggleWeaponMenu(false);
                    }
                    break;
                case 'Digit2':
                    if (this.ui.weaponMenuContainer.style.display === 'block') {
                        this.player.weaponSystem.switchWeapon('pistol');
                        this.ui.toggleWeaponMenu(false);
                    }
                    break;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            switch(e.code) {
                case 'KeyW': this.player.moveState.forward = false; break;
                case 'KeyS': this.player.moveState.backward = false; break;
                case 'KeyA': this.player.moveState.left = false; break;
                case 'KeyD': this.player.moveState.right = false; break;
                case 'Space': this.player.moveState.jump = false; break;
            }
        });
        
        // Mouse click for shooting
        this.container.addEventListener('mousedown', (e) => {
            if (document.pointerLockElement === this.container && e.button === 0) {
                const didShoot = this.player.weaponSystem.shoot(this.player.camera, (hit) => {
                    if (hit && hit.object === this.enemy.object) {
                        const remainingHealth = this.enemy.takeDamage(20);
                        if (remainingHealth <= 0) {
                            setTimeout(() => this.respawnEnemy(), 5000); // Respawn after 5 seconds
                        }
                    }
                });
                
                if (didShoot) {
                    this.ui.updateHUD(
                        this.player.health,
                        this.player.weaponSystem.getCurrentAmmo(),
                        this.player.weaponSystem.currentWeapon
                    );
                }
            }
        });
        
        // Mouse wheel for zooming
        document.addEventListener('wheel', (e) => {
            if (document.pointerLockElement === this.container) {
                this.player.handleZoom(e.deltaY);
            }
        });
    }
    
    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.player.camera.aspect = width / height;
        this.player.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update game state
        this.player.update(this.environment);
        
        if (this.enemy && this.enemy.object) {
            // Update enemy AI and animations
            this.enemy.update(this.player, this.environment);
            
            // Update enemy health bar if enemy is alive
            const distanceToEnemy = this.player.object.position.distanceTo(this.enemy.object.position);
            if (distanceToEnemy < 30) { // Only show health bar when enemy is nearby
                this.ui.updateEnemyHealthBar(this.enemy.health, this.enemy.maxHealth, distanceToEnemy);
            }
        }
        
        // Update HUD
        this.ui.updateHUD(
            this.player.health,
            this.player.weaponSystem.getCurrentAmmo(),
            this.player.weaponSystem.currentWeapon
        );
        
        // Render scene
        this.renderer.render(this.scene, this.player.camera);
    }

    // Update enemy respawn logic
    respawnEnemy() {
        if (this.enemy) {
            this.enemy.destroy();
            this.scene.remove(this.enemy.object);
        }
        
        // Spawn enemy at a random position away from player
        const angle = Math.random() * Math.PI * 2;
        const radius = 15 + Math.random() * 5; // Spawn 15-20 units away
        const position = new THREE.Vector3(
            Math.cos(angle) * radius,
            1,
            Math.sin(angle) * radius
        );
        
        this.enemy = new Enemy(this.scene, position);
        this.scene.add(this.enemy.object);
    }
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
}); 