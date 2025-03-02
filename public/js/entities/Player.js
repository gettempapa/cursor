import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';
import { Constants } from '../utils/constants.js';
import { createImpactEffect } from '../utils/helpers.js';

/**
 * Player class for handling player functionality
 */
export class Player {
    /**
     * Create a new player
     * @param {THREE.Scene} scene - The scene to add the player to
     * @param {Object} options - Player options
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.camera = options.camera || null;
        this.debug = options.debug || null;
        
        // Player state
        this.position = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3();
        this.rotation = new THREE.Euler();
        this.height = 1.8;
        this.isJumping = false;
        this.isFalling = false;
        this.jumpVelocity = 0;
        this.lastShootTime = 0;
        this.lastFootstepTime = 0;
        this.footstepInterval = Constants.AUDIO.FOOTSTEP_INTERVAL;
        this.isMoving = false;
        
        // Player model
        this.model = null;
        this.rifle = null;
        this.hands = null;
        
        // Controls
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            shoot: false
        };
        
        // Mouse controls
        this.mouse = {
            x: 0,
            y: 0
        };
        
        // Impact effects
        this.impactEffects = [];
        
        // Initialize player
        this.init();
    }
    
    /**
     * Initialize the player
     */
    init() {
        this.createPlayerModel();
        this.setupControls();
    }
    
    /**
     * Create the player model
     */
    createPlayerModel() {
        // Create player model group
        this.model = new THREE.Group();
        this.model.position.y = this.height;
        this.scene.add(this.model);
        
        // Create player body
        const bodyGeometry = new THREE.CapsuleGeometry(0.4, 1.2, 4, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: Constants.COLORS.SOLDIER_BODY,
            roughness: 0.8
        });
        
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.model.add(body);
        
        // Create player head
        const headGeometry = new THREE.SphereGeometry(0.25, 8, 8);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: Constants.COLORS.SOLDIER_FACE,
            roughness: 0.7
        });
        
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 0.8, 0);
        this.model.add(head);
        
        // Create helmet
        this.createPlayerHelmet(head);
        
        // Create limbs
        this.createPlayerLimbs();
        
        // Create rifle
        this.createRifle();
        
        // Create hands to hold the rifle
        if (this.rifle) {
            this.createHands(this.rifle);
        }
    }
    
    /**
     * Create a helmet for the player
     * @param {THREE.Mesh} head - The player's head mesh
     */
    createPlayerHelmet(head) {
        // Create helmet
        const helmetGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const helmetMaterial = new THREE.MeshStandardMaterial({ 
            color: Constants.COLORS.CAMO[0],
            roughness: 0.9
        });
        
        const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
        helmet.position.set(0, 0.05, 0);
        helmet.scale.set(1, 0.8, 1);
        head.add(helmet);
        
        // Create night vision goggles
        const goggleGeometry = new THREE.BoxGeometry(0.4, 0.1, 0.1);
        const goggleMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222222,
            roughness: 0.5
        });
        
        const goggles = new THREE.Mesh(goggleGeometry, goggleMaterial);
        goggles.position.set(0, 0.1, 0.25);
        helmet.add(goggles);
        
        // Create goggle lenses
        const lensGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.05, 8);
        const lensMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x44FF44,
            emissive: 0x225522,
            roughness: 0.3
        });
        
        const leftLens = new THREE.Mesh(lensGeometry, lensMaterial);
        leftLens.rotation.x = Math.PI / 2;
        leftLens.position.set(0.1, 0, 0.05);
        goggles.add(leftLens);
        
        const rightLens = new THREE.Mesh(lensGeometry, lensMaterial);
        rightLens.rotation.x = Math.PI / 2;
        rightLens.position.set(-0.1, 0, 0.05);
        goggles.add(rightLens);
    }
    
    /**
     * Create limbs for the player
     */
    createPlayerLimbs() {
        const camoTexture = Constants.COLORS.CAMO[0];
        const limbMaterial = new THREE.MeshStandardMaterial({ 
            color: Constants.COLORS.SOLDIER_BODY,
            roughness: 0.8
        });
        
        // Create arms
        const armGeometry = new THREE.CapsuleGeometry(0.1, 0.6, 4, 8);
        
        // Left arm
        const leftArm = new THREE.Mesh(armGeometry, limbMaterial);
        leftArm.position.set(0.5, 0.4, 0);
        leftArm.rotation.z = -Math.PI / 4;
        this.model.add(leftArm);
        
        // Right arm
        const rightArm = new THREE.Mesh(armGeometry, limbMaterial);
        rightArm.position.set(-0.5, 0.4, 0);
        rightArm.rotation.z = Math.PI / 4;
        this.model.add(rightArm);
        
        // Create legs
        const legGeometry = new THREE.CapsuleGeometry(0.15, 0.8, 4, 8);
        const legMaterial = new THREE.MeshStandardMaterial({ 
            color: camoTexture,
            roughness: 0.8
        });
        
        // Left leg
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(0.2, -0.8, 0);
        this.model.add(leftLeg);
        
        // Right leg
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(-0.2, -0.8, 0);
        this.model.add(rightLeg);
    }
    
    /**
     * Create a rifle for the player
     */
    createRifle() {
        // Create rifle group
        this.rifle = new THREE.Group();
        
        // Create rifle body
        const rifleBodyGeometry = new THREE.BoxGeometry(0.1, 0.1, 1);
        const rifleMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x111111,
            roughness: 0.5
        });
        
        const rifleBody = new THREE.Mesh(rifleBodyGeometry, rifleMaterial);
        this.rifle.add(rifleBody);
        
        // Create rifle stock
        const rifleStockGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.4);
        const rifleStockMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 0.7
        });
        
        const rifleStock = new THREE.Mesh(rifleStockGeometry, rifleStockMaterial);
        rifleStock.position.set(0, -0.05, -0.6);
        this.rifle.add(rifleStock);
        
        // Create rifle barrel
        const rifleBarrelGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8);
        const rifleBarrel = new THREE.Mesh(rifleBarrelGeometry, rifleMaterial);
        rifleBarrel.rotation.x = Math.PI / 2;
        rifleBarrel.position.set(0, 0, 0.8);
        this.rifle.add(rifleBarrel);
        
        // Create rifle scope
        const rifleScope = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8),
            rifleMaterial
        );
        rifleScope.rotation.x = Math.PI / 2;
        rifleScope.position.set(0, 0.08, 0.2);
        this.rifle.add(rifleScope);
        
        // Position the rifle in front of the player
        this.rifle.position.set(0.3, 0.2, 0.5);
        this.rifle.rotation.y = -Math.PI / 4;
        
        // Add to model
        this.model.add(this.rifle);
    }
    
    /**
     * Create hands to hold the rifle
     * @param {THREE.Group} rifle - The rifle object
     */
    createHands(rifle) {
        const handGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const handMaterial = new THREE.MeshStandardMaterial({ 
            color: Constants.COLORS.SOLDIER_FACE,
            roughness: 0.7
        });
        
        // Create left hand (front grip)
        const leftHand = new THREE.Mesh(handGeometry, handMaterial);
        leftHand.position.set(0, 0, 0.3);
        rifle.add(leftHand);
        
        // Create right hand (trigger)
        const rightHand = new THREE.Mesh(handGeometry, handMaterial);
        rightHand.position.set(0, -0.1, -0.2);
        rifle.add(rightHand);
    }
    
    /**
     * Set up player controls
     */
    setupControls() {
        // Keyboard controls
        document.addEventListener('keydown', (event) => {
            this.handleKeyDown(event.code);
        });
        
        document.addEventListener('keyup', (event) => {
            this.handleKeyUp(event.code);
        });
        
        // Mouse controls for looking
        document.addEventListener('mousemove', (event) => {
            this.handleMouseMove(event);
        });
        
        // Mouse click for shooting
        document.addEventListener('mousedown', (event) => {
            if (event.button === 0) { // Left mouse button
                this.keys.shoot = true;
                this.shoot();
            }
        });
        
        document.addEventListener('mouseup', (event) => {
            if (event.button === 0) { // Left mouse button
                this.keys.shoot = false;
            }
        });
        
        // Pointer lock for mouse control
        const gameContainer = document.getElementById('gameContainer');
        if (gameContainer) {
            gameContainer.addEventListener('click', () => {
                gameContainer.requestPointerLock = gameContainer.requestPointerLock || 
                                                  gameContainer.mozRequestPointerLock || 
                                                  gameContainer.webkitRequestPointerLock;
                gameContainer.requestPointerLock();
            });
        }
    }
    
    /**
     * Handle key down events
     * @param {string} code - Key code
     */
    handleKeyDown(code) {
        switch (code) {
            case 'KeyW':
                this.keys.forward = true;
                break;
            case 'KeyS':
                this.keys.backward = true;
                break;
            case 'KeyA':
                this.keys.left = true;
                break;
            case 'KeyD':
                this.keys.right = true;
                break;
            case 'Space':
                this.keys.jump = true;
                if (!this.isJumping && !this.isFalling) {
                    this.jump();
                }
                break;
        }
    }
    
    /**
     * Handle key up events
     * @param {string} code - Key code
     */
    handleKeyUp(code) {
        switch (code) {
            case 'KeyW':
                this.keys.forward = false;
                break;
            case 'KeyS':
                this.keys.backward = false;
                break;
            case 'KeyA':
                this.keys.left = false;
                break;
            case 'KeyD':
                this.keys.right = false;
                break;
            case 'Space':
                this.keys.jump = false;
                break;
        }
    }
    
    /**
     * Handle mouse movement
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseMove(event) {
        if (document.pointerLockElement) {
            // Update rotation based on mouse movement
            this.rotation.y -= event.movementX * Constants.PLAYER.TURN_SPEED;
            
            // Limit vertical look
            const verticalLook = this.camera.rotation.x + event.movementY * Constants.PLAYER.TURN_SPEED;
            this.camera.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, verticalLook));
        }
    }
    
    /**
     * Make the player shoot
     */
    shoot() {
        const now = Date.now();
        if (now - this.lastShootTime < Constants.PLAYER.SHOT_COOLDOWN) {
            return;
        }
        
        this.lastShootTime = now;
        
        // Visual effect for shooting - muzzle flash
        if (this.rifle) {
            // Create muzzle flash
            const muzzleFlash = new THREE.PointLight(0xFFAA00, 1, 5);
            muzzleFlash.position.set(0, 0, 1.2);
            this.rifle.add(muzzleFlash);
            
            // Remove after a short delay
            setTimeout(() => {
                this.rifle.remove(muzzleFlash);
            }, 100);
        }
        
        // Create ray for bullet
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        
        // Get ray origin and direction
        const rayOrigin = raycaster.ray.origin.clone();
        const rayDirection = raycaster.ray.direction.clone();
        
        // Return ray data for collision detection
        return {
            origin: rayOrigin,
            direction: rayDirection
        };
    }
    
    /**
     * Make the player jump
     */
    jump() {
        if (!this.isJumping && !this.isFalling) {
            this.isJumping = true;
            this.jumpVelocity = Constants.PLAYER.JUMP_SPEED;
        }
    }
    
    /**
     * Create an impact effect at the specified position
     * @param {THREE.Vector3} position - Position of the impact
     * @param {THREE.Vector3} normal - Normal vector of the impact surface
     */
    createImpactEffect(position, normal) {
        const effect = createImpactEffect(this.scene, position, normal);
        this.impactEffects.push(effect);
    }
    
    /**
     * Update the player
     * @param {number} deltaTime - Time since last update in seconds
     * @param {Function} getHeightAtPosition - Function to get height at a position
     * @param {Function} checkCollisions - Function to check collisions
     */
    update(deltaTime, getHeightAtPosition, checkCollisions) {
        // Cap delta time to prevent large jumps
        deltaTime = Math.min(deltaTime, Constants.GAME.MAX_DELTA_TIME);
        
        // Reset movement flag
        this.isMoving = false;
        
        // Calculate movement direction
        const moveDirection = new THREE.Vector3(0, 0, 0);
        
        if (this.keys.forward) {
            moveDirection.z -= 1;
            this.isMoving = true;
        }
        
        if (this.keys.backward) {
            moveDirection.z += 1;
            this.isMoving = true;
        }
        
        if (this.keys.left) {
            moveDirection.x -= 1;
            this.isMoving = true;
        }
        
        if (this.keys.right) {
            moveDirection.x += 1;
            this.isMoving = true;
        }
        
        // Normalize movement direction
        if (moveDirection.length() > 0) {
            moveDirection.normalize();
        }
        
        // Apply rotation to movement direction
        moveDirection.applyEuler(new THREE.Euler(0, this.rotation.y, 0));
        
        // Calculate velocity
        this.velocity.x = moveDirection.x * Constants.PLAYER.MOVE_SPEED;
        this.velocity.z = moveDirection.z * Constants.PLAYER.MOVE_SPEED;
        
        // Apply jumping and gravity
        if (this.isJumping || this.isFalling) {
            // Apply gravity
            this.jumpVelocity -= Constants.PLAYER.GRAVITY * deltaTime * 60;
            
            // Update position
            this.position.y += this.jumpVelocity;
            
            // Check if we've landed
            const groundHeight = getHeightAtPosition(this.position);
            
            if (this.position.y <= groundHeight) {
                this.position.y = groundHeight;
                this.isJumping = false;
                this.isFalling = false;
                this.jumpVelocity = 0;
            }
        } else {
            // Check if we're falling
            const groundHeight = getHeightAtPosition(this.position);
            
            if (this.position.y > groundHeight) {
                this.isFalling = true;
                this.jumpVelocity = 0;
            } else {
                this.position.y = groundHeight;
            }
        }
        
        // Update position
        const newPosition = this.position.clone();
        newPosition.x += this.velocity.x * deltaTime * 60;
        newPosition.z += this.velocity.z * deltaTime * 60;
        
        // Check for collisions
        if (!checkCollisions(newPosition)) {
            this.position.copy(newPosition);
        }
        
        // Update model position
        if (this.model) {
            this.model.position.copy(this.position);
            this.model.position.y += this.height;
            this.model.rotation.y = this.rotation.y;
        }
        
        // Update camera position
        this.updateCamera();
        
        // Update rifle aim
        if (this.rifle && this.camera) {
            this.updateRifleAim();
        }
        
        // Play footstep sound if moving
        if (this.isMoving && !this.isJumping && !this.isFalling) {
            const now = Date.now();
            if (now - this.lastFootstepTime > this.footstepInterval) {
                this.lastFootstepTime = now;
                // Footstep sound would be played here
            }
        }
        
        // Update impact effects
        this.updateImpactEffects(deltaTime);
    }
    
    /**
     * Update the camera position
     */
    updateCamera() {
        if (!this.camera) return;
        
        // Calculate camera position
        const cameraOffset = Constants.PLAYER.CAMERA_OFFSET.clone();
        
        // Apply player rotation to camera offset
        cameraOffset.applyEuler(new THREE.Euler(0, this.rotation.y, 0));
        
        // Set camera position
        this.camera.position.copy(this.position).add(cameraOffset);
        
        // Set camera rotation
        this.camera.rotation.y = this.rotation.y;
    }
    
    /**
     * Update the rifle aim to match camera direction
     */
    updateRifleAim() {
        if (!this.rifle || !this.camera) return;
        
        // Get camera look direction
        const lookDirection = new THREE.Vector3(0, 0, -1);
        lookDirection.applyQuaternion(this.camera.quaternion);
        
        // Calculate a point in front of the camera
        const lookTarget = new THREE.Vector3().copy(this.camera.position).add(
            lookDirection.multiplyScalar(10)
        );
        
        // Make rifle look at that point
        const rifleWorldPos = new THREE.Vector3();
        this.rifle.getWorldPosition(rifleWorldPos);
        
        // Calculate direction from rifle to look target
        const direction = new THREE.Vector3().subVectors(lookTarget, rifleWorldPos);
        
        // Convert world direction to local direction
        const localDirection = direction.clone();
        this.model.worldToLocal(localDirection);
        
        // Update rifle rotation
        this.rifle.lookAt(
            this.rifle.position.clone().add(localDirection)
        );
    }
    
    /**
     * Update impact effects
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateImpactEffects(deltaTime) {
        for (let i = this.impactEffects.length - 1; i >= 0; i--) {
            const isAlive = this.impactEffects[i].update(deltaTime);
            
            if (!isAlive) {
                this.impactEffects[i].cleanup();
                this.impactEffects.splice(i, 1);
            }
        }
    }
}

export default Player; 