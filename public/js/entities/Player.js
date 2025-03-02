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
        
        // Create player body - tactical vest
        const bodyGeometry = new THREE.CapsuleGeometry(0.4, 1.2, 8, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1a1a1a, // Dark tactical vest
            roughness: 0.7
        });
        
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.model.add(body);
        
        // Add tactical vest details
        this.addTacticalVestDetails(body);
        
        // Create player head
        const headGeometry = new THREE.SphereGeometry(0.25, 12, 12);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: Constants.COLORS.SOLDIER_FACE,
            roughness: 0.6
        });
        
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 0.8, 0);
        this.model.add(head);
        
        // Create tactical helmet and face mask
        this.createTacticalHelmet(head);
        
        // Create limbs with tactical gear
        this.createTacticalLimbs();
        
        // Create modern assault rifle
        this.createModernRifle();
        
        // Create gloved hands to hold the rifle
        if (this.rifle) {
            this.createTacticalHands(this.rifle);
        }
    }
    
    /**
     * Add tactical vest details to the player body
     * @param {THREE.Mesh} body - The player's body mesh
     */
    addTacticalVestDetails(body) {
        // Add chest plate
        const chestPlateGeometry = new THREE.BoxGeometry(0.8, 0.6, 0.3);
        const tacticalMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2a2a2a,
            roughness: 0.8
        });
        
        const chestPlate = new THREE.Mesh(chestPlateGeometry, tacticalMaterial);
        chestPlate.position.set(0, 0.3, 0.25);
        body.add(chestPlate);
        
        // Add magazine pouches
        const pouchGeometry = new THREE.BoxGeometry(0.15, 0.2, 0.1);
        const pouchMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1a1a1a,
            roughness: 0.9
        });
        
        // Add several pouches to the vest
        for (let i = 0; i < 3; i++) {
            const pouch = new THREE.Mesh(pouchGeometry, pouchMaterial);
            pouch.position.set(-0.2 + i * 0.2, 0.1, 0.35);
            body.add(pouch);
        }
        
        // Add shoulder pads
        const shoulderPadGeometry = new THREE.BoxGeometry(0.25, 0.1, 0.3);
        const shoulderPadMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2a2a2a,
            roughness: 0.8
        });
        
        const leftShoulderPad = new THREE.Mesh(shoulderPadGeometry, shoulderPadMaterial);
        leftShoulderPad.position.set(0.4, 0.6, 0);
        leftShoulderPad.rotation.z = 0.3;
        body.add(leftShoulderPad);
        
        const rightShoulderPad = new THREE.Mesh(shoulderPadGeometry, shoulderPadMaterial);
        rightShoulderPad.position.set(-0.4, 0.6, 0);
        rightShoulderPad.rotation.z = -0.3;
        body.add(rightShoulderPad);
    }
    
    /**
     * Create a tactical helmet for the player
     * @param {THREE.Mesh} head - The player's head mesh
     */
    createTacticalHelmet(head) {
        // Create helmet base
        const helmetGeometry = new THREE.SphereGeometry(0.3, 12, 12);
        const helmetMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2a2a2a, // Dark tactical helmet
            roughness: 0.7
        });
        
        const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
        helmet.position.set(0, 0.05, 0);
        helmet.scale.set(1, 0.8, 1.1);
        head.add(helmet);
        
        // Create helmet cover with camouflage
        const coverGeometry = new THREE.SphereGeometry(0.31, 12, 12);
        const coverMaterial = new THREE.MeshStandardMaterial({ 
            color: Constants.COLORS.CAMO[0],
            roughness: 0.9
        });
        
        const cover = new THREE.Mesh(coverGeometry, coverMaterial);
        cover.scale.set(1, 0.75, 1.05);
        helmet.add(cover);
        
        // Add helmet accessories
        this.addHelmetAccessories(helmet);
        
        // Create tactical face mask
        const maskGeometry = new THREE.BoxGeometry(0.4, 0.25, 0.05);
        const maskMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222222,
            roughness: 0.6
        });
        
        const mask = new THREE.Mesh(maskGeometry, maskMaterial);
        mask.position.set(0, -0.1, 0.2);
        head.add(mask);
    }
    
    /**
     * Add accessories to the tactical helmet
     * @param {THREE.Mesh} helmet - The helmet mesh
     */
    addHelmetAccessories(helmet) {
        // Create night vision mount
        const mountGeometry = new THREE.BoxGeometry(0.1, 0.05, 0.1);
        const mountMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x111111,
            roughness: 0.5
        });
        
        const mount = new THREE.Mesh(mountGeometry, mountMaterial);
        mount.position.set(0, 0.2, 0.25);
        helmet.add(mount);
        
        // Create advanced night vision goggles
        const goggleGeometry = new THREE.BoxGeometry(0.4, 0.1, 0.15);
        const goggleMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x111111,
            roughness: 0.5
        });
        
        const goggles = new THREE.Mesh(goggleGeometry, goggleMaterial);
        goggles.position.set(0, 0.1, 0.3);
        helmet.add(goggles);
        
        // Create high-tech goggle lenses
        const lensGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12);
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
        
        // Add tactical headset
        const headsetGeometry = new THREE.TorusGeometry(0.25, 0.05, 8, 16, Math.PI);
        const headsetMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x111111,
            roughness: 0.7
        });
        
        const headset = new THREE.Mesh(headsetGeometry, headsetMaterial);
        headset.rotation.x = Math.PI / 2;
        headset.position.set(0, -0.1, 0);
        helmet.add(headset);
        
        // Add headset microphone
        const micGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.15, 8);
        const micMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x111111,
            roughness: 0.5
        });
        
        const mic = new THREE.Mesh(micGeometry, micMaterial);
        mic.position.set(0.25, -0.1, 0.1);
        mic.rotation.z = Math.PI / 2;
        mic.rotation.y = -Math.PI / 4;
        helmet.add(mic);
    }
    
    /**
     * Create tactical limbs for the player
     */
    createTacticalLimbs() {
        // Get a camo color for uniform
        const camoColor = Constants.COLORS.CAMO[0];
        
        // Create arms with tactical sleeves
        const armGeometry = new THREE.CapsuleGeometry(0.12, 0.6, 8, 8);
        const armMaterial = new THREE.MeshStandardMaterial({ 
            color: camoColor,
            roughness: 0.8
        });
        
        // Left arm
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(0.5, 0.4, 0);
        leftArm.rotation.z = -Math.PI / 4;
        this.model.add(leftArm);
        
        // Add tactical elbow pad to left arm
        const elbowPadGeometry = new THREE.SphereGeometry(0.13, 8, 8);
        const padMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222222,
            roughness: 0.9
        });
        
        const leftElbowPad = new THREE.Mesh(elbowPadGeometry, padMaterial);
        leftElbowPad.position.set(0, -0.2, 0);
        leftElbowPad.scale.set(1, 0.5, 1);
        leftArm.add(leftElbowPad);
        
        // Right arm
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(-0.5, 0.4, 0);
        rightArm.rotation.z = Math.PI / 4;
        this.model.add(rightArm);
        
        // Add tactical elbow pad to right arm
        const rightElbowPad = new THREE.Mesh(elbowPadGeometry, padMaterial);
        rightElbowPad.position.set(0, -0.2, 0);
        rightElbowPad.scale.set(1, 0.5, 1);
        rightArm.add(rightElbowPad);
        
        // Create legs with tactical pants
        const legGeometry = new THREE.CapsuleGeometry(0.15, 0.8, 8, 8);
        const legMaterial = new THREE.MeshStandardMaterial({ 
            color: camoColor,
            roughness: 0.8
        });
        
        // Left leg
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(0.2, -0.8, 0);
        this.model.add(leftLeg);
        
        // Add tactical knee pad to left leg
        const kneePadGeometry = new THREE.SphereGeometry(0.16, 8, 8);
        
        const leftKneePad = new THREE.Mesh(kneePadGeometry, padMaterial);
        leftKneePad.position.set(0, 0.2, 0.1);
        leftKneePad.scale.set(1, 0.5, 1);
        leftLeg.add(leftKneePad);
        
        // Add tactical boot to left leg
        const bootGeometry = new THREE.BoxGeometry(0.2, 0.15, 0.3);
        const bootMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x111111,
            roughness: 0.8
        });
        
        const leftBoot = new THREE.Mesh(bootGeometry, bootMaterial);
        leftBoot.position.set(0, -0.45, 0.05);
        leftLeg.add(leftBoot);
        
        // Right leg
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(-0.2, -0.8, 0);
        this.model.add(rightLeg);
        
        // Add tactical knee pad to right leg
        const rightKneePad = new THREE.Mesh(kneePadGeometry, padMaterial);
        rightKneePad.position.set(0, 0.2, 0.1);
        rightKneePad.scale.set(1, 0.5, 1);
        rightLeg.add(rightKneePad);
        
        // Add tactical boot to right leg
        const rightBoot = new THREE.Mesh(bootGeometry, bootMaterial);
        rightBoot.position.set(0, -0.45, 0.05);
        rightLeg.add(rightBoot);
    }
    
    /**
     * Create a modern assault rifle for the player
     */
    createModernRifle() {
        // Create rifle group
        this.rifle = new THREE.Group();
        
        // Create rifle body - more detailed
        const rifleBodyGeometry = new THREE.BoxGeometry(0.08, 0.12, 1.2);
        const rifleMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x111111,
            roughness: 0.5
        });
        
        const rifleBody = new THREE.Mesh(rifleBodyGeometry, rifleMaterial);
        this.rifle.add(rifleBody);
        
        // Create rifle stock - more tactical
        const rifleStockGeometry = new THREE.BoxGeometry(0.08, 0.18, 0.4);
        const rifleStockMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222222,
            roughness: 0.7
        });
        
        const rifleStock = new THREE.Mesh(rifleStockGeometry, rifleStockMaterial);
        rifleStock.position.set(0, -0.03, -0.7);
        this.rifle.add(rifleStock);
        
        // Create rifle barrel - more detailed
        const rifleBarrelGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 12);
        const rifleBarrel = new THREE.Mesh(rifleBarrelGeometry, rifleMaterial);
        rifleBarrel.rotation.x = Math.PI / 2;
        rifleBarrel.position.set(0, 0, 0.9);
        this.rifle.add(rifleBarrel);
        
        // Create rifle scope - tactical optic
        const scopeBaseGeometry = new THREE.BoxGeometry(0.06, 0.06, 0.2);
        const scopeBase = new THREE.Mesh(scopeBaseGeometry, rifleMaterial);
        scopeBase.position.set(0, 0.09, 0.2);
        this.rifle.add(scopeBase);
        
        const scopeGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.25, 12);
        const scopeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x111111,
            roughness: 0.4
        });
        
        const scope = new THREE.Mesh(scopeGeometry, scopeMaterial);
        scope.rotation.x = Math.PI / 2;
        scope.position.set(0, 0.15, 0.2);
        this.rifle.add(scope);
        
        // Create scope lens
        const lensGeometry = new THREE.CircleGeometry(0.03, 12);
        const lensMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x88CCFF,
            emissive: 0x225566,
            roughness: 0.2
        });
        
        const lens = new THREE.Mesh(lensGeometry, lensMaterial);
        lens.position.set(0, 0, 0.13);
        lens.rotation.y = Math.PI;
        scope.add(lens);
        
        // Create tactical foregrip
        const foregrip = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.15, 12),
            rifleMaterial
        );
        foregrip.position.set(0, -0.12, 0.5);
        this.rifle.add(foregrip);
        
        // Create tactical rail system
        const railGeometry = new THREE.BoxGeometry(0.1, 0.03, 0.6);
        const rail = new THREE.Mesh(railGeometry, rifleMaterial);
        rail.position.set(0, 0.06, 0.5);
        this.rifle.add(rail);
        
        // Create magazine
        const magazineGeometry = new THREE.BoxGeometry(0.06, 0.2, 0.1);
        const magazine = new THREE.Mesh(magazineGeometry, rifleMaterial);
        magazine.position.set(0, -0.15, 0.2);
        this.rifle.add(magazine);
        
        // Position the rifle in front of the player
        this.rifle.position.set(0.3, 0.2, 0.5);
        this.rifle.rotation.y = -Math.PI / 4;
        
        // Add to model
        this.model.add(this.rifle);
    }
    
    /**
     * Create tactical gloved hands to hold the rifle
     * @param {THREE.Group} rifle - The rifle object
     */
    createTacticalHands(rifle) {
        const handGeometry = new THREE.SphereGeometry(0.08, 12, 12);
        const gloveMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222222, // Tactical gloves
            roughness: 0.7
        });
        
        // Create left hand (front grip)
        const leftHand = new THREE.Mesh(handGeometry, gloveMaterial);
        leftHand.position.set(0, -0.12, 0.5);
        leftHand.scale.set(1, 0.8, 1.2);
        rifle.add(leftHand);
        
        // Create right hand (trigger)
        const rightHand = new THREE.Mesh(handGeometry, gloveMaterial);
        rightHand.position.set(0, -0.1, -0.1);
        rightHand.scale.set(1, 0.8, 1.2);
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
            // Update horizontal rotation (turning left/right)
            this.rotation.y -= event.movementX * Constants.PLAYER.TURN_SPEED;
            
            // Update vertical look (up/down) - only affects camera, not player model
            const verticalLook = this.camera.rotation.x + event.movementY * Constants.PLAYER.TURN_SPEED;
            
            // Limit vertical look to prevent flipping
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
        
        // Calculate camera position - standard third-person offset
        const cameraOffset = Constants.PLAYER.CAMERA_OFFSET.clone();
        
        // Apply player rotation to camera offset (only horizontal rotation)
        const rotationY = new THREE.Euler(0, this.rotation.y, 0);
        cameraOffset.applyEuler(rotationY);
        
        // Set camera position
        this.camera.position.copy(this.position).add(cameraOffset);
        
        // Set camera horizontal rotation to match player
        this.camera.rotation.y = this.rotation.y;
        
        // Vertical rotation was already set in handleMouseMove
        // No roll rotation (this prevents the corkscrewing effect)
        this.camera.rotation.z = 0;
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