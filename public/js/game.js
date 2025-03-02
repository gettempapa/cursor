import * as THREE from 'three';
import { Player } from './modules/Player.js';
import { Enemy } from './modules/Enemy.js';
import { Environment } from './modules/Environment.js';
import { UI } from './modules/UI.js';

export class Game {
    constructor() {
        this.container = document.getElementById('gameContainer');
        this.scene = new THREE.Scene();
        this.renderer = this.setupRenderer();
        
        // Initialize game components
        this.environment = new Environment(this.scene);
        this.player = new Player(this.scene);
        this.enemy = new Enemy(this.scene);
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
    
    setupRenderer() {
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x87ceeb); // Sky blue background
        this.container.appendChild(renderer.domElement);
        return renderer;
    }
    
    setupControls() {
        // Mouse movement
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.container) {
                this.player.handleMouseMovement(
                    e.movementX || e.mozMovementX || e.webkitMovementX || 0,
                    e.movementY || e.mozMovementY || e.webkitMovementY || 0
                );
            }
        });
        
        // WASD, Space, and R controls
        document.addEventListener('keydown', (e) => {
            if (this.player.isDead) return;
            
            switch(e.code) {
                case 'KeyW': this.player.moveState.forward = true; break;
                case 'KeyS': this.player.moveState.backward = true; break;
                case 'KeyA': this.player.moveState.left = true; break;
                case 'KeyD': this.player.moveState.right = true; break;
                case 'KeyR': this.player.weaponSystem.reload(); break;
                case 'Space':
                    if (this.player.isGrounded) {
                        this.player.velocity.y = this.player.jumpForce;
                        this.player.isGrounded = false;
                    }
                    break;
                case 'KeyI':
                    const show = !this.ui.weaponMenuContainer.style.display || 
                               this.ui.weaponMenuContainer.style.display === 'none';
                    this.ui.toggleWeaponMenu(show);
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
            }
        });
        
        // Mouse click for shooting
        this.container.addEventListener('mousedown', (e) => {
            if (document.pointerLockElement === this.container && e.button === 0) {
                const didShoot = this.player.weaponSystem.shoot(this.player.camera, (hit) => {
                    if (hit.object === this.enemy.object) {
                        const remainingHealth = this.enemy.takeDamage(20);
                        if (remainingHealth <= 0) {
                            this.enemy.destroy();
                            setTimeout(() => {
                                this.enemy = new Enemy(this.scene);
                            }, 5000);
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
        
        // Respawn handler
        document.addEventListener('keydown', () => {
            if (this.player.isDead) {
                this.player.respawn();
                this.ui.hideDeathMessage();
            }
        });
    }
    
    onWindowResize() {
        this.player.camera.aspect = window.innerWidth / window.innerHeight;
        this.player.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update game state
        this.player.update(this.environment);
        
        if (this.enemy) {
            this.enemy.update(this.player, this.environment);
            
            // Update enemy health bar
            const distanceToEnemy = this.player.getPosition().distanceTo(this.enemy.getPosition());
            this.ui.updateEnemyHealthBar(this.enemy.health, this.enemy.maxHealth, distanceToEnemy);
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
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
}); 