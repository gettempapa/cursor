import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';
import { Constants } from '../utils/constants.js';
import { Environment } from '../environment/Environment.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Dinosaur } from '../entities/Dinosaur.js';
import { AudioManager } from '../audio/AudioManager.js';
import { createImpactEffect } from '../utils/helpers.js';

console.log('Game.js module loaded, THREE.js version:', THREE.REVISION);

/**
 * Main Game class
 */
export class Game {
    /**
     * Create a new game
     */
    constructor() {
        console.log('Game constructor called');
        
        // Debug element
        this.debug = document.getElementById('debug');
        this.debug.style.display = 'block';
        this.debug.innerHTML = 'Initializing game...<br>Checking Three.js: ' + (typeof THREE !== 'undefined' ? 'OK' : 'FAILED');
        console.log('THREE.js check:', typeof THREE !== 'undefined' ? 'OK' : 'FAILED');
        
        // Game state
        this.isRunning = false;
        this.lastTime = 0;
        this.enemies = [];
        this.dinosaurs = [];
        this.impactEffects = [];
        
        // Core components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.environment = null;
        this.audioManager = null;
        
        // Initialize game
        try {
            console.log('Setting up core components...');
            this.setupCore();
            this.debug.innerHTML += '<br>Core setup complete';
            
            console.log('Initializing game components...');
            this.initializeGameComponents();
            
            // Remove loading screen
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
            
            // Start animation loop
            this.isRunning = true;
            this.animate();
            
            this.debug.innerHTML += '<br>Game running - WASD to move, mouse to look';
            console.log('Game initialization complete');
        } catch (error) {
            console.error('Game initialization failed:', error);
            this.debug.innerHTML = `Error: ${error.message}<br>Stack: ${error.stack}`;
        }
    }
    
    /**
     * Set up core components
     */
    setupCore() {
        // Create scene
        this.scene = new THREE.Scene();
        
        // Add fog
        this.scene.fog = new THREE.FogExp2(Constants.COLORS.SKY, Constants.GAME.FOG_DENSITY);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(Constants.COLORS.SKY);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Add renderer to DOM
        const gameContainer = document.getElementById('gameContainer');
        if (gameContainer) {
            gameContainer.appendChild(this.renderer.domElement);
        } else {
            document.body.appendChild(this.renderer.domElement);
        }
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        // Create a fallback cube to show something is working
        const fallbackCube = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        fallbackCube.position.set(0, 0.5, -5);
        fallbackCube.name = 'fallbackCube';
        this.scene.add(fallbackCube);
    }
    
    /**
     * Initialize game components
     */
    initializeGameComponents() {
        // Create environment
        this.environment = new Environment(this.scene);
        
        // Create player
        this.player = new Player(this.scene, {
            camera: this.camera,
            debug: this.debug
        });
        
        // Create audio manager
        this.audioManager = new AudioManager(this.scene, this.camera);
        
        // Create initial enemies
        for (let i = 0; i < 5; i++) {
            this.createEnemy();
        }
        
        // Create dinosaur
        this.createDinosaur();
        
        // Remove fallback cube
        const fallbackCube = this.scene.getObjectByName('fallbackCube');
        if (fallbackCube) {
            this.scene.remove(fallbackCube);
        }
    }
    
    /**
     * Create an enemy
     */
    createEnemy() {
        try {
            // Generate a random position away from the player
            const angle = Math.random() * Math.PI * 2;
            const distance = 20 + Math.random() * 30; // Between 20-50 units from center
            const position = new THREE.Vector3(
                Math.cos(angle) * distance,
                0,
                Math.sin(angle) * distance
            );
            
            // Create enemy
            const enemy = new Enemy(this.scene, position);
            this.enemies.push(enemy);
        } catch (error) {
            console.error('Error creating enemy:', error);
            this.debug.innerHTML += `<br>Error creating enemy: ${error.message}`;
        }
    }
    
    /**
     * Create a dinosaur
     */
    createDinosaur() {
        try {
            // Generate a random position away from the player
            const angle = Math.random() * Math.PI * 2;
            const distance = 30 + Math.random() * 20; // Between 30-50 units from center
            const position = new THREE.Vector3(
                Math.cos(angle) * distance,
                0,
                Math.sin(angle) * distance
            );
            
            // Create dinosaur
            const dinosaur = new Dinosaur(this.scene, position);
            this.dinosaurs.push(dinosaur);
        } catch (error) {
            console.error('Error creating dinosaur:', error);
            this.debug.innerHTML += `<br>Error creating dinosaur: ${error.message}`;
        }
    }
    
    /**
     * Animation loop
     * @param {number} time - Current time from requestAnimationFrame
     */
    animate(time = 0) {
        if (!this.isRunning) return;
        
        // Request next frame
        requestAnimationFrame((t) => this.animate(t));
        
        // Calculate delta time
        const deltaTime = (time - this.lastTime) / 1000;
        this.lastTime = time;
        
        // Update game
        this.update(deltaTime);
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * Update game state
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Cap delta time to prevent large jumps
        const cappedDeltaTime = Math.min(deltaTime, Constants.GAME.MAX_DELTA_TIME);
        
        // Update player
        if (this.player) {
            // Get bullet ray from player if shooting
            const bulletRay = this.player.keys.shoot ? this.player.shoot() : null;
            
            // Update player
            this.player.update(
                cappedDeltaTime,
                (position) => this.getHeightAtPosition(position),
                (position) => this.checkCollisions(position)
            );
            
            // Check for bullet hits if player shot
            if (bulletRay) {
                this.checkBulletHits(bulletRay.origin, bulletRay.direction);
            }
        }
        
        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            if (enemy.isDead) {
                // Remove dead enemies after a delay
                if (Date.now() - enemy.deathTime > 5000) {
                    this.enemies.splice(i, 1);
                    
                    // Create a new enemy to replace the dead one
                    this.createEnemy();
                }
            } else {
                // Update enemy
                enemy.update(cappedDeltaTime, this.player ? this.player.position : null);
            }
        }
        
        // Update dinosaurs
        for (let i = this.dinosaurs.length - 1; i >= 0; i--) {
            const dinosaur = this.dinosaurs[i];
            
            if (dinosaur.isDead) {
                // Remove dead dinosaurs after a delay
                if (Date.now() - dinosaur.deathTime > 5000) {
                    this.dinosaurs.splice(i, 1);
                    
                    // Create a new dinosaur to replace the dead one
                    this.createDinosaur();
                }
            } else {
                // Update dinosaur
                dinosaur.update(cappedDeltaTime, this.player ? this.player.position : null);
            }
        }
        
        // Update impact effects
        for (let i = this.impactEffects.length - 1; i >= 0; i--) {
            const isAlive = this.impactEffects[i].update(cappedDeltaTime);
            
            if (!isAlive) {
                this.impactEffects[i].cleanup();
                this.impactEffects.splice(i, 1);
            }
        }
        
        // Update debug info
        this.updateDebugInfo();
    }
    
    /**
     * Update debug information
     */
    updateDebugInfo() {
        if (this.debug && this.player) {
            const pos = this.player.position;
            this.debug.innerHTML = `Position: ${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}<br>` +
                                  `Enemies: ${this.enemies.length}<br>` +
                                  `Dinosaurs: ${this.dinosaurs.length}<br>` +
                                  `FPS: ${(1 / (this.lastTime - this.lastFrameTime) * 1000).toFixed(1)}`;
            this.lastFrameTime = this.lastTime;
        }
    }
    
    /**
     * Check for bullet hits
     * @param {THREE.Vector3} rayOrigin - Origin of the ray
     * @param {THREE.Vector3} rayDirection - Direction of the ray
     */
    checkBulletHits(rayOrigin, rayDirection) {
        // Check for enemy hits
        for (const enemy of this.enemies) {
            if (enemy.checkBulletHit(rayOrigin, rayDirection)) {
                // Play impact sound
                if (this.audioManager) {
                    this.audioManager.playImpactSound();
                }
                return;
            }
        }
        
        // Check for dinosaur hits
        for (const dinosaur of this.dinosaurs) {
            if (dinosaur.checkBulletHit(rayOrigin, rayDirection)) {
                // Play impact sound
                if (this.audioManager) {
                    this.audioManager.playImpactSound();
                }
                return;
            }
        }
        
        // Check for environment hits
        const raycaster = new THREE.Raycaster(rayOrigin, rayDirection);
        const intersects = raycaster.intersectObjects([this.environment.ground, ...this.environment.trees, ...this.environment.hills], true);
        
        if (intersects.length > 0) {
            const hit = intersects[0];
            
            // Create impact effect
            const effect = createImpactEffect(this.scene, hit.point, hit.normal);
            this.impactEffects.push(effect);
            
            // Play impact sound
            if (this.audioManager) {
                this.audioManager.playImpactSound();
            }
        }
    }
    
    /**
     * Get height at position
     * @param {THREE.Vector3} position - Position to check
     * @returns {number} - Height at position
     */
    getHeightAtPosition(position) {
        if (this.environment) {
            return this.environment.getHeightAtPosition(position);
        }
        
        return 0;
    }
    
    /**
     * Check for collisions
     * @param {THREE.Vector3} position - Position to check
     * @returns {boolean} - Whether there is a collision
     */
    checkCollisions(position) {
        // Check for collisions with trees
        if (this.environment && this.environment.trees) {
            for (const tree of this.environment.trees) {
                const treePos = tree.position;
                const dx = position.x - treePos.x;
                const dz = position.z - treePos.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                // Simple collision with tree trunk
                if (distance < 0.5) {
                    return true;
                }
            }
        }
        
        // Check for collisions with cabin
        if (this.environment && this.environment.cabin) {
            const cabinPos = this.environment.cabin.position;
            const dx = position.x - cabinPos.x;
            const dz = position.z - cabinPos.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            // Simple collision with cabin
            if (distance < 5) {
                return true;
            }
        }
        
        return false;
    }
}

export default Game; 