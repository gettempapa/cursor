import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';
import { Entity } from './Entity.js';
import { Constants } from '../utils/constants.js';
import { getRandomColor } from '../utils/helpers.js';

/**
 * Enemy entity class
 */
export class Enemy extends Entity {
    /**
     * Create a new enemy
     * @param {THREE.Scene} scene - The scene to add the enemy to
     * @param {THREE.Vector3} position - Initial position of the enemy
     */
    constructor(scene, position) {
        super(scene, position);
        
        // Enemy specific properties
        this.moveSpeed = Constants.ENEMY.MOVE_SPEED;
        this.wanderRadius = Constants.ENEMY.WANDER_RADIUS;
        this.size = Constants.ENEMY.SIZE;
        this.lastShootTime = 0;
        this.shootInterval = Constants.ENEMY.SHOOT_INTERVAL;
        this.rifle = null;
        this.hands = null;
        
        // Initialize the enemy
        this.init();
    }
    
    /**
     * Create the enemy model
     */
    createModel() {
        // Create the enemy body
        const bodyGeometry = new THREE.CapsuleGeometry(0.4, 1.2, 4, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: Constants.COLORS.SOLDIER_BODY,
            roughness: 0.8
        });
        
        this.model = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.model.position.copy(this.position);
        this.model.position.y = 1.4; // Raise to stand on ground
        this.scene.add(this.model);
        
        // Create the enemy head
        const headGeometry = new THREE.SphereGeometry(0.25, 8, 8);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: Constants.COLORS.SOLDIER_FACE,
            roughness: 0.7
        });
        
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 0.8, 0);
        this.model.add(head);
        
        // Create eyes
        const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(0.1, 0.05, 0.2);
        head.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(-0.1, 0.05, 0.2);
        head.add(rightEye);
        
        // Create helmet
        const helmetGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const helmetMaterial = new THREE.MeshStandardMaterial({ 
            color: getRandomColor(Constants.COLORS.CAMO),
            roughness: 0.9
        });
        
        const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
        helmet.position.set(0, 0.05, 0);
        helmet.scale.set(1, 0.8, 1);
        head.add(helmet);
        
        // Create limbs
        this.createLimbs();
        
        // Create rifle
        this.createEnemyRifle();
        
        // Create hands to hold the rifle
        if (this.rifle) {
            this.createHands(this.rifle);
        }
        
        // Create bounding box for collision detection
        this.boundingBox = new THREE.Box3().setFromObject(this.model);
    }
    
    /**
     * Create limbs for the enemy
     */
    createLimbs() {
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
        
        // Left leg
        const leftLeg = new THREE.Mesh(legGeometry, limbMaterial);
        leftLeg.position.set(0.2, -0.8, 0);
        this.model.add(leftLeg);
        
        // Right leg
        const rightLeg = new THREE.Mesh(legGeometry, limbMaterial);
        rightLeg.position.set(-0.2, -0.8, 0);
        this.model.add(rightLeg);
    }
    
    /**
     * Create a rifle for the enemy
     */
    createEnemyRifle() {
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
        
        // Position the rifle in front of the enemy
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
     * Update the enemy
     * @param {number} deltaTime - Time since last update in seconds
     * @param {THREE.Vector3} playerPosition - Current player position
     */
    update(deltaTime, playerPosition) {
        super.update(deltaTime, playerPosition);
        
        if (this.isDead) return;
        
        // If player is close, aim at them and shoot
        if (playerPosition && this.model) {
            const distanceToPlayer = this.model.position.distanceTo(playerPosition);
            
            if (distanceToPlayer < 30) {
                // Set target to player position
                this.targetPosition = playerPosition.clone();
                
                // Aim rifle at player
                if (this.rifle) {
                    // Calculate direction to player
                    const direction = new THREE.Vector3().subVectors(playerPosition, this.model.position);
                    direction.normalize();
                    
                    // Update rifle rotation to aim at player
                    this.rifle.lookAt(playerPosition);
                    
                    // Check if it's time to shoot
                    const now = Date.now();
                    if (now - this.lastShootTime > this.shootInterval) {
                        this.lastShootTime = now;
                        this.shoot();
                    }
                }
            }
        }
    }
    
    /**
     * Make the enemy shoot
     */
    shoot() {
        // We would play a sound here if we had audio
        console.log('Enemy shoots!');
        
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
    }
}

export default Enemy; 