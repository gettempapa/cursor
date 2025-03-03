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
        this.position = new THREE.Vector3(0, 1, 0);
        this.velocity = new THREE.Vector3();
        this.rotation = new THREE.Euler();
        this.height = 1.8;
        this.isJumping = false;
        this.isFalling = false;
        this.jumpVelocity = 0;
        this.lastShootTime = 0;
        this.lastFootstepTime = 0;
        this.footstepInterval = 0.5;
        this.isMoving = false;
        
        // Movement constants
        this.MOVE_SPEED = 0.15;
        this.GRAVITY = 0.01;
        this.JUMP_FORCE = 0.3;
        
        // Parachute state
        this.hasParachute = true;
        this.isParachuteDeployed = true;
        this.parachuteModel = null;
        this.parachuteRotation = new THREE.Euler();
        this.parachuteTilt = new THREE.Vector2(0, 0);
        this.fallSpeed = 0;
        this.maxFallSpeed = 8;
        this.minFallSpeed = 2;
        this.horizontalSpeed = 0;
        this.maxHorizontalSpeed = 5;
        
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
        
        // Setup event listeners
        this.setupControls();
    }
    
    /**
     * Initialize the player
     */
    init() {
        this.createPlayerModel();
        this.createParachute();
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
        
        // Create rifle body - M16 style
        const rifleBodyGeometry = new THREE.BoxGeometry(0.08, 0.15, 1.0);
        const rifleMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x111111,
            roughness: 0.5
        });
        
        const rifleBody = new THREE.Mesh(rifleBodyGeometry, rifleMaterial);
        this.rifle.add(rifleBody);
        
        // Create M16 carry handle with integrated rear sight
        const carryHandleGeometry = new THREE.BoxGeometry(0.06, 0.12, 0.3);
        const carryHandle = new THREE.Mesh(carryHandleGeometry, rifleMaterial);
        carryHandle.position.set(0, 0.12, 0.1);
        this.rifle.add(carryHandle);
        
        // Create front sight post
        const frontSightGeometry = new THREE.BoxGeometry(0.04, 0.08, 0.05);
        const frontSight = new THREE.Mesh(frontSightGeometry, rifleMaterial);
        frontSight.position.set(0, 0.11, 0.7);
        this.rifle.add(frontSight);
        
        // Create M16 style barrel
        const barrelGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.9, 12);
        const barrel = new THREE.Mesh(barrelGeometry, rifleMaterial);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0, 0.85);
        this.rifle.add(barrel);
        
        // Create distinctive M16 flash hider
        const flashHiderGeometry = new THREE.CylinderGeometry(0.025, 0.03, 0.1, 6);
        const flashHider = new THREE.Mesh(flashHiderGeometry, rifleMaterial);
        flashHider.rotation.x = Math.PI / 2;
        flashHider.position.set(0, 0, 1.25);
        this.rifle.add(flashHider);
        
        // Create M16 style stock
        const stockGeometry = new THREE.BoxGeometry(0.06, 0.15, 0.4);
        const stockMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222222,
            roughness: 0.7
        });
        
        const stock = new THREE.Mesh(stockGeometry, stockMaterial);
        stock.position.set(0, -0.02, -0.6);
        this.rifle.add(stock);
        
        // Create M16 magazine
        const magGeometry = new THREE.BoxGeometry(0.06, 0.25, 0.08);
        const magazine = new THREE.Mesh(magGeometry, rifleMaterial);
        magazine.position.set(0, -0.18, 0.1);
        this.rifle.add(magazine);
        
        // Create pistol grip
        const gripGeometry = new THREE.BoxGeometry(0.06, 0.15, 0.1);
        const grip = new THREE.Mesh(gripGeometry, rifleMaterial);
        grip.position.set(0, -0.12, -0.15);
        grip.rotation.x = Math.PI / 6;
        this.rifle.add(grip);
        
        // Create handguard
        const handguardGeometry = new THREE.CylinderGeometry(0.035, 0.035, 0.6, 8);
        const handguard = new THREE.Mesh(handguardGeometry, stockMaterial);
        handguard.rotation.x = Math.PI / 2;
        handguard.position.set(0, 0, 0.5);
        this.rifle.add(handguard);
        
        // Position the rifle in tactical stance
        this.rifle.position.set(0.35, 0.1, 0.3);
        this.rifle.rotation.set(0, -Math.PI / 12, 0); // Slight angle inward
        
        // Add to model
        this.model.add(this.rifle);
    }
    
    /**
     * Create tactical gloved hands to hold the rifle
     * @param {THREE.Group} rifle - The rifle object
     */
    createTacticalHands(rifle) {
        const handGeometry = new THREE.SphereGeometry(0.06, 12, 12);
        const gloveMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222222, // Tactical gloves
            roughness: 0.7
        });
        
        // Create left hand (forward grip)
        const leftHand = new THREE.Mesh(handGeometry, gloveMaterial);
        leftHand.scale.set(1, 0.8, 1.2);
        leftHand.position.set(0, 0, 0.45); // Hold the handguard
        rifle.add(leftHand);
        
        // Create right hand (pistol grip)
        const rightHand = new THREE.Mesh(handGeometry, gloveMaterial);
        rightHand.scale.set(1, 0.8, 1.2);
        rightHand.position.set(0, -0.12, -0.15); // Hold the pistol grip
        rifle.add(rightHand);
        
        // Create forearms to connect to the body
        const forearmGeometry = new THREE.CapsuleGeometry(0.04, 0.2, 8, 8);
        const forearmMaterial = new THREE.MeshStandardMaterial({
            color: Constants.COLORS.CAMO[0],
            roughness: 0.8
        });
        
        // Left forearm
        const leftForearm = new THREE.Mesh(forearmGeometry, forearmMaterial);
        leftForearm.position.set(-0.1, 0, 0.3);
        leftForearm.rotation.set(0, 0, -Math.PI / 6);
        rifle.add(leftForearm);
        
        // Right forearm
        const rightForearm = new THREE.Mesh(forearmGeometry, forearmMaterial);
        rightForearm.position.set(-0.1, -0.1, -0.1);
        rightForearm.rotation.set(-Math.PI / 6, 0, -Math.PI / 6);
        rifle.add(rightForearm);
    }
    
    /**
     * Set up player controls
     */
    setupControls() {
        document.addEventListener('keydown', (event) => {
            switch(event.code) {
                case 'KeyW': this.keys.forward = true; break;
                case 'KeyS': this.keys.backward = true; break;
                case 'KeyA': this.keys.left = true; break;
                case 'KeyD': this.keys.right = true; break;
                case 'Space': this.keys.jump = true; break;
            }
        });
        
        document.addEventListener('keyup', (event) => {
            switch(event.code) {
                case 'KeyW': this.keys.forward = false; break;
                case 'KeyS': this.keys.backward = false; break;
                case 'KeyA': this.keys.left = false; break;
                case 'KeyD': this.keys.right = false; break;
                case 'Space': this.keys.jump = false; break;
            }
        });
    }
    
    /**
     * Update the player
     * @param {number} deltaTime - Time since last update in seconds
     * @param {Function} getHeightAtPosition - Function to get height at a position
     * @param {Function} checkCollisions - Function to check collisions
     */
    update(deltaTime, getHeightAtPosition, checkCollisions) {
        if (!this.model) return;
        
        // Handle movement
        const moveDirection = new THREE.Vector3(0, 0, 0);
        
        if (this.keys.forward) moveDirection.z -= 1;
        if (this.keys.backward) moveDirection.z += 1;
        if (this.keys.left) moveDirection.x -= 1;
        if (this.keys.right) moveDirection.x += 1;
        
        if (moveDirection.length() > 0) {
            moveDirection.normalize();
            this.isMoving = true;
        } else {
            this.isMoving = false;
        }
        
        // Apply movement direction
        moveDirection.applyEuler(new THREE.Euler(0, this.rotation.y, 0));
        
        // Update velocity
        this.velocity.x = moveDirection.x * this.MOVE_SPEED;
        this.velocity.z = moveDirection.z * this.MOVE_SPEED;
        
        // Apply gravity and jumping
        if (this.isJumping || this.isFalling) {
            this.jumpVelocity -= this.GRAVITY;
            this.position.y += this.jumpVelocity;
            
            const groundHeight = getHeightAtPosition(this.position);
            if (this.position.y <= groundHeight) {
                this.position.y = groundHeight;
                this.isJumping = false;
                this.isFalling = false;
                this.jumpVelocity = 0;
            }
        } else if (this.keys.jump) {
            this.isJumping = true;
            this.jumpVelocity = this.JUMP_FORCE;
        }
        
        // Update position
        const newPosition = this.position.clone();
        newPosition.x += this.velocity.x;
        newPosition.z += this.velocity.z;
        
        if (!checkCollisions(newPosition)) {
            this.position.copy(newPosition);
        }
        
        // Update model position and rotation
        this.model.position.copy(this.position);
        
        // Animate legs while moving
        if (this.isMoving) {
            this.animateLegs(deltaTime);
        } else {
            this.resetLegs();
        }
    }
    
    /**
     * Create the parachute model
     */
    createParachute() {
        const parachuteGroup = new THREE.Group();
        
        // Create parachute canopy
        const canopyGeometry = new THREE.SphereGeometry(4, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const canopyMaterial = new THREE.MeshBasicMaterial({
            color: 0x567d46, // Military green
            side: THREE.DoubleSide
        });
        const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
        canopy.position.y = 4;
        parachuteGroup.add(canopy);
        
        // Create strings
        const stringCount = 8;
        const stringMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
        
        for (let i = 0; i < stringCount; i++) {
            const angle = (i / stringCount) * Math.PI * 2;
            const stringGeometry = new THREE.BufferGeometry();
            const points = [
                new THREE.Vector3(Math.cos(angle) * 3, 4, Math.sin(angle) * 3),
                new THREE.Vector3(0, 0, 0)
            ];
            stringGeometry.setFromPoints(points);
            const string = new THREE.Line(stringGeometry, stringMaterial);
            parachuteGroup.add(string);
        }
        
        this.parachuteModel = parachuteGroup;
        this.parachuteModel.position.y = 2;
        this.model.add(this.parachuteModel);
    }

    /**
     * Update parachute movement
     */
    updateParachute(deltaTime) {
        // Calculate base fall speed
        this.fallSpeed = this.minFallSpeed + 
            (this.maxFallSpeed - this.minFallSpeed) * 
            (1 - Math.max(0, Math.min(1, this.parachuteTilt.y + 0.5)));

        // Update horizontal movement based on WASD controls
        const moveDirection = new THREE.Vector3(0, 0, 0);
        
        if (this.keys.forward) {
            moveDirection.z -= 1;
            this.parachuteTilt.y = Math.min(this.parachuteTilt.y + 0.1, 0.5);
        } else if (this.keys.backward) {
            moveDirection.z += 1;
            this.parachuteTilt.y = Math.max(this.parachuteTilt.y - 0.1, -0.5);
        } else {
            // Return tilt to neutral
            this.parachuteTilt.y *= 0.95;
        }
        
        if (this.keys.left) {
            moveDirection.x -= 1;
            this.parachuteTilt.x = Math.max(this.parachuteTilt.x - 0.1, -0.5);
        } else if (this.keys.right) {
            moveDirection.x += 1;
            this.parachuteTilt.x = Math.min(this.parachuteTilt.x + 0.1, 0.5);
        } else {
            // Return tilt to neutral
            this.parachuteTilt.x *= 0.95;
        }

        // Normalize movement direction
        if (moveDirection.length() > 0) {
            moveDirection.normalize();
            // Apply rotation to movement direction
            moveDirection.applyEuler(new THREE.Euler(0, this.rotation.y, 0));
        }

        // Update horizontal velocity
        this.horizontalSpeed = Math.min(this.horizontalSpeed + deltaTime * 2, this.maxHorizontalSpeed);
        this.velocity.x = moveDirection.x * this.horizontalSpeed;
        this.velocity.z = moveDirection.z * this.horizontalSpeed;
        
        // Apply vertical velocity
        this.velocity.y = -this.fallSpeed;

        // Update position
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        // Check for landing
        if (this.position.y <= 1.8) {
            this.position.y = 1.8;
            this.hasParachute = false;
            this.isParachuteDeployed = false;
            // Remove parachute model
            if (this.parachuteModel && this.model) {
                this.model.remove(this.parachuteModel);
            }
        }

        // Update parachute visuals
        if (this.parachuteModel) {
            this.parachuteModel.rotation.x = this.parachuteTilt.y;
            this.parachuteModel.rotation.z = -this.parachuteTilt.x;
        }

        // Update model position
        if (this.model) {
            this.model.position.copy(this.position);
            this.model.position.y += this.height;
            this.model.rotation.y = this.rotation.y;
        }
    }

    /**
     * Update normal ground movement
     */
    updateNormalMovement(deltaTime, getHeightAtPosition, checkCollisions) {
        // Original movement code
        this.isMoving = false;
        
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
        
        if (moveDirection.length() > 0) {
            moveDirection.normalize();
        }
        
        moveDirection.applyEuler(new THREE.Euler(0, this.rotation.y, 0));
        
        this.velocity.x = moveDirection.x * Constants.PLAYER.MOVE_SPEED;
        this.velocity.z = moveDirection.z * Constants.PLAYER.MOVE_SPEED;
        
        if (this.isJumping || this.isFalling) {
            this.jumpVelocity -= Constants.PLAYER.GRAVITY * deltaTime * 60;
            this.position.y += this.jumpVelocity;
            
            const groundHeight = getHeightAtPosition(this.position);
            
            if (this.position.y <= groundHeight) {
                this.position.y = groundHeight;
                this.isJumping = false;
                this.isFalling = false;
                this.jumpVelocity = 0;
            }
        } else {
            const groundHeight = getHeightAtPosition(this.position);
            
            if (this.position.y > groundHeight) {
                this.isFalling = true;
                this.jumpVelocity = 0;
            } else {
                this.position.y = groundHeight;
            }
        }
        
        const newPosition = this.position.clone();
        newPosition.x += this.velocity.x * deltaTime * 60;
        newPosition.z += this.velocity.z * deltaTime * 60;
        
        if (!checkCollisions(newPosition)) {
            this.position.copy(newPosition);
        }
        
        if (this.model) {
            this.model.position.copy(this.position);
            this.model.position.y += this.height;
            this.model.rotation.y = this.rotation.y;
        }
    }

    animateLegs(deltaTime) {
        if (!this.model) return;
        
        // Find leg groups (first two children of the model)
        const leftLeg = this.model.children[0];
        const rightLeg = this.model.children[1];
        
        if (!leftLeg || !rightLeg) return;
        
        // Update animation time based on movement speed
        this.legAnimTime = (this.legAnimTime || 0) + deltaTime * 5;
        
        // Animate legs in opposite phases
        const maxRotation = Math.PI / 4;
        leftLeg.rotation.x = Math.sin(this.legAnimTime) * maxRotation;
        rightLeg.rotation.x = Math.sin(this.legAnimTime + Math.PI) * maxRotation;
    }
    
    resetLegs() {
        if (!this.model) return;
        
        // Find leg groups
        const leftLeg = this.model.children[0];
        const rightLeg = this.model.children[1];
        
        if (!leftLeg || !rightLeg) return;
        
        // Reset leg rotations to standing position
        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;
    }
}

export default Player; 