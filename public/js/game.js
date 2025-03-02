import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';
import { Player } from './modules/Player.js';
import { Enemy } from './modules/Enemy.js';
import { Environment } from './modules/Environment.js';
import { UI } from './modules/UI.js';

// Utility function to check if WebGL is available
function isWebGLAvailable() {
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && 
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
        return false;
    }
}

export class Game {
    constructor() {
        // Setup debug mode if enabled
        this.debug = document.getElementById('debug');
        const debugEnabled = window.location.search.includes('debug=true');
        if (debugEnabled && this.debug) {
            this.debug.style.display = 'block';
            this.debug.innerHTML = 'Initializing game...<br>';
        }
        
        this.logDebug('Checking Three.js availability: ' + (typeof THREE !== 'undefined' ? 'OK' : 'FAILED'));
        
        // Check for WebGL support
        const webGLSupported = isWebGLAvailable();
        this.logDebug('WebGL support: ' + (webGLSupported ? 'YES' : 'NO'));
        
        if (!webGLSupported) {
            this.showError('WebGL is not supported in your browser or environment. The game cannot run.');
            throw new Error('WebGL is not supported');
        }
        
        try {
            // Get container
            this.container = document.getElementById('gameContainer');
            this.logDebug('Game container: ' + (this.container ? 'FOUND' : 'MISSING'));
            
            // Initialize core systems
            this.scene = new THREE.Scene();
            this.logDebug('Scene created');
            
            this.scene.background = new THREE.Color(0x87ceeb); // Sky blue background
            
            // Set up renderer with proper settings and fallbacks
            try {
                this.renderer = new THREE.WebGLRenderer({ 
                    antialias: true,
                    powerPreference: "high-performance"
                });
                this.logDebug('WebGLRenderer created with antialias');
            } catch (rendererError) {
                this.logDebug('Error creating renderer with antialias: ' + rendererError.message);
                // Try again without antialias
                this.renderer = new THREE.WebGLRenderer({ 
                    antialias: false,
                    powerPreference: "default"
                });
                this.logDebug('WebGLRenderer created without antialias');
            }
            
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setClearColor(0x87ceeb, 1);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            
            // Update deprecated encoding properties
            this.renderer.outputColorSpace = THREE.SRGBColorSpace; // Instead of outputEncoding
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.0;
            this.container.appendChild(this.renderer.domElement);
            this.logDebug('Renderer attached to DOM');
            
            // Add a simple test cube to verify rendering
            const testGeometry = new THREE.BoxGeometry(1, 1, 1);
            const testMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const testCube = new THREE.Mesh(testGeometry, testMaterial);
            testCube.position.set(0, 0, -5);
            this.scene.add(testCube);
            this.logDebug('Test cube added');
            
            // Do an initial render to test
            this.renderer.render(this.scene, new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000));
            this.logDebug('Initial render test complete');
            
            // Initialize game components
            this.environment = new Environment(this.scene);
            this.logDebug('Environment created');
            
            this.player = new Player(this.scene);
            this.logDebug('Player created');
            
            this.enemy = new Enemy(this.scene);
            this.logDebug('Enemy created');
            
            this.ui = new UI(this.container);
            this.logDebug('UI created');
            
            // Set up controls
            this.setupControls();
            this.logDebug('Controls set up');
            
            // Handle window resizing
            window.addEventListener('resize', () => this.onWindowResize(), false);
            
            // Lock pointer on click
            this.container.addEventListener('click', () => {
                this.container.requestPointerLock();
            });
            
            // Start the animation loop
            this.animate();
            this.logDebug('Animation loop started');
        } catch (error) {
            this.showError('Error initializing game: ' + error.message);
            console.error('Game initialization error:', error);
            throw error;
        }
    }
    
    // Helper method for debug logging
    logDebug(message) {
        console.log(message);
        if (this.debug && this.debug.style.display === 'block') {
            this.debug.innerHTML += message + '<br>';
        }
    }
    
    // Helper method to show errors
    showError(message) {
        console.error(message);
        if (this.debug) {
            this.debug.style.display = 'block';
            this.debug.innerHTML += '<span style="color: red; font-weight: bold;">' + message + '</span><br>';
        }
        
        // Also show an alert for critical errors
        alert('Game Error: ' + message);
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
                case 'Space': 
                    if (this.player.isGrounded) {
                        this.player.velocity.y = this.player.jumpForce;
                        this.player.isGrounded = false;
                    }
                    break;
                case 'KeyR':
                    this.player.weaponSystem.reload();
                    this.ui.showReloadIndicator();
                    break;
                case 'KeyI':
                    e.preventDefault();
                    this.ui.toggleWeaponMenu(!this.ui.weaponMenuContainer.style.display === 'block');
                    if (this.ui.weaponMenuContainer.style.display === 'block') {
                        document.exitPointerLock();
                    }
                    break;
                case 'Digit1':
                    if (this.ui.weaponMenuContainer.style.display === 'block') {
                        this.player.weaponSystem.switchWeapon('rifle');
                        this.ui.toggleWeaponMenu(false);
                        this.container.requestPointerLock();
                    }
                    break;
                case 'Digit2':
                    if (this.ui.weaponMenuContainer.style.display === 'block') {
                        this.player.weaponSystem.switchWeapon('pistol');
                        this.ui.toggleWeaponMenu(false);
                        this.container.requestPointerLock();
                    }
                    break;
                case 'Digit3':
                    if (this.ui.weaponMenuContainer.style.display === 'block') {
                        this.player.weaponSystem.switchWeapon('rocketLauncher');
                        this.ui.toggleWeaponMenu(false);
                        this.container.requestPointerLock();
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
        try {
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
            
            // Render scene with player's camera
            this.renderer.render(this.scene, this.player.camera);
        } catch (error) {
            console.error('Error in animation loop:', error);
            this.logDebug('Animation error: ' + error.message);
            
            // If we've had multiple errors, stop the animation to prevent browser crashes
            if (!this.animationErrorCount) {
                this.animationErrorCount = 1;
            } else {
                this.animationErrorCount++;
                
                if (this.animationErrorCount > 10) {
                    this.showError('Too many animation errors. Animation stopped for safety.');
                    throw error; // Stop animation by not requesting the next frame
                }
            }
        }
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