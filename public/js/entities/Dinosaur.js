import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';
import { Entity } from './Entity.js';
import { Constants } from '../utils/constants.js';

/**
 * Dinosaur entity class
 */
export class Dinosaur extends Entity {
    /**
     * Create a new dinosaur
     * @param {THREE.Scene} scene - The scene to add the dinosaur to
     * @param {THREE.Vector3} position - Initial position of the dinosaur
     */
    constructor(scene, position) {
        super(scene, position);
        
        // Dinosaur specific properties
        this.moveSpeed = Constants.DINOSAUR.MOVE_SPEED;
        this.wanderRadius = Constants.DINOSAUR.WANDER_RADIUS;
        this.size = Constants.DINOSAUR.SIZE;
        this.lastRoarTime = 0;
        this.roarInterval = Constants.DINOSAUR.ROAR_INTERVAL;
        
        // Initialize the dinosaur
        this.init();
    }
    
    /**
     * Create the dinosaur model
     */
    createModel() {
        // Create the dinosaur body
        const bodyGeometry = new THREE.CapsuleGeometry(0.7 * this.size, 1.5 * this.size, 4, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: Constants.COLORS.DINO_BODY,
            roughness: 0.8
        });
        
        this.model = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.model.position.copy(this.position);
        this.model.position.y = 1.5 * this.size; // Raise to stand on ground
        this.scene.add(this.model);
        
        // Create the dinosaur head
        const headGeometry = new THREE.SphereGeometry(0.5 * this.size, 8, 8);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: Constants.COLORS.DINO_BODY,
            roughness: 0.7
        });
        
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 0.7 * this.size, -0.9 * this.size);
        this.model.add(head);
        
        // Create the dinosaur snout
        const snoutGeometry = new THREE.CylinderGeometry(0.2 * this.size, 0.4 * this.size, 0.7 * this.size, 8);
        const snout = new THREE.Mesh(snoutGeometry, headMaterial);
        snout.rotation.x = Math.PI / 2;
        snout.position.set(0, 0, -0.6 * this.size);
        head.add(snout);
        
        // Create eyes
        const eyeGeometry = new THREE.SphereGeometry(0.1 * this.size, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(0.25 * this.size, 0.2 * this.size, -0.4 * this.size);
        head.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(-0.25 * this.size, 0.2 * this.size, -0.4 * this.size);
        head.add(rightEye);
        
        // Create the dinosaur tail
        const tailGeometry = new THREE.CylinderGeometry(0.1 * this.size, 0.5 * this.size, 2 * this.size, 8);
        const tailMaterial = new THREE.MeshStandardMaterial({ 
            color: Constants.COLORS.DINO_BODY,
            roughness: 0.8
        });
        
        const tail = new THREE.Mesh(tailGeometry, tailMaterial);
        tail.rotation.x = Math.PI / 2;
        tail.position.set(0, -0.2 * this.size, 1.5 * this.size);
        this.model.add(tail);
        
        // Create spikes along the back
        const spikeGeometry = new THREE.ConeGeometry(0.1 * this.size, 0.4 * this.size, 4);
        const spikeMaterial = new THREE.MeshStandardMaterial({ 
            color: Constants.COLORS.DINO_SPIKES,
            roughness: 0.7
        });
        
        // Add spikes along the back and tail
        for (let i = 0; i < 7; i++) {
            const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
            spike.rotation.x = -Math.PI / 2;
            
            if (i < 3) {
                // Spikes on the back
                spike.position.set(0, 0.7 * this.size, (i * 0.4 - 0.4) * this.size);
                this.model.add(spike);
            } else {
                // Spikes on the tail
                spike.position.set(0, 0, (i - 3) * 0.3 * this.size);
                spike.scale.set(0.8, 0.8, 0.8);
                tail.add(spike);
            }
        }
        
        // Create legs
        this.createLeg(true, true);  // Left front leg
        this.createLeg(false, true); // Right front leg
        this.createLeg(true, false); // Left back leg
        this.createLeg(false, false); // Right back leg
        
        // Create belly
        const bellyGeometry = new THREE.CapsuleGeometry(0.65 * this.size, 1.4 * this.size, 4, 8);
        const bellyMaterial = new THREE.MeshStandardMaterial({ 
            color: Constants.COLORS.DINO_BELLY,
            roughness: 0.7
        });
        
        const belly = new THREE.Mesh(bellyGeometry, bellyMaterial);
        belly.rotation.x = Math.PI / 2;
        belly.position.set(0, -0.3 * this.size, 0);
        belly.scale.set(0.9, 0.7, 0.7);
        this.model.add(belly);
        
        // Create bounding box for collision detection
        this.boundingBox = new THREE.Box3().setFromObject(this.model);
    }
    
    /**
     * Create a leg for the dinosaur
     * @param {boolean} isLeft - Whether this is a left leg
     * @param {boolean} isFront - Whether this is a front leg
     */
    createLeg(isLeft, isFront) {
        const legMaterial = new THREE.MeshStandardMaterial({ 
            color: Constants.COLORS.DINO_BODY,
            roughness: 0.8
        });
        
        // Position multiplier based on which leg
        const xMultiplier = isLeft ? 1 : -1;
        const zMultiplier = isFront ? -1 : 1;
        
        // Leg dimensions
        const upperLegLength = isFront ? 0.7 * this.size : 0.9 * this.size;
        const lowerLegLength = isFront ? 0.6 * this.size : 0.8 * this.size;
        const legWidth = isFront ? 0.2 * this.size : 0.25 * this.size;
        
        // Create upper leg
        const upperLegGeometry = new THREE.CylinderGeometry(legWidth, legWidth * 0.8, upperLegLength, 8);
        const upperLeg = new THREE.Mesh(upperLegGeometry, legMaterial);
        
        // Position and rotate upper leg
        upperLeg.position.set(
            xMultiplier * 0.7 * this.size,
            -0.5 * this.size,
            zMultiplier * 0.5 * this.size
        );
        
        // Angle the leg outward slightly
        upperLeg.rotation.x = Math.PI / 2 + (isFront ? 0.3 : 0.2);
        upperLeg.rotation.z = xMultiplier * (isFront ? 0.2 : 0.1);
        
        this.model.add(upperLeg);
        
        // Create lower leg
        const lowerLegGeometry = new THREE.CylinderGeometry(legWidth * 0.8, legWidth * 0.6, lowerLegLength, 8);
        const lowerLeg = new THREE.Mesh(lowerLegGeometry, legMaterial);
        
        // Position lower leg at the end of upper leg
        lowerLeg.position.set(0, -upperLegLength / 2 - lowerLegLength / 2, 0);
        
        // Angle the lower leg
        lowerLeg.rotation.x = isFront ? -0.5 : -0.3;
        
        upperLeg.add(lowerLeg);
        
        // Create foot
        const footGeometry = new THREE.BoxGeometry(
            legWidth * 1.5,
            legWidth * 0.8,
            legWidth * 2
        );
        const foot = new THREE.Mesh(footGeometry, legMaterial);
        
        // Position foot at the end of lower leg
        foot.position.set(0, -lowerLegLength / 2 - legWidth * 0.4, legWidth * 0.5);
        
        lowerLeg.add(foot);
        
        // Create claws
        const clawGeometry = new THREE.ConeGeometry(legWidth * 0.2, legWidth * 0.5, 4);
        const clawMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x111111,
            roughness: 0.5
        });
        
        // Add three claws to each foot
        for (let i = 0; i < 3; i++) {
            const claw = new THREE.Mesh(clawGeometry, clawMaterial);
            claw.rotation.x = -Math.PI / 2;
            claw.position.set(
                (i - 1) * legWidth * 0.5,
                -legWidth * 0.2,
                legWidth * 1.1
            );
            foot.add(claw);
        }
    }
    
    /**
     * Update the dinosaur
     * @param {number} deltaTime - Time since last update in seconds
     * @param {THREE.Vector3} playerPosition - Current player position
     */
    update(deltaTime, playerPosition) {
        super.update(deltaTime, playerPosition);
        
        if (this.isDead) return;
        
        // Check if it's time to roar
        const now = Date.now();
        if (now - this.lastRoarTime > this.roarInterval) {
            this.lastRoarTime = now;
            this.roar();
        }
        
        // If player is close, chase them
        if (playerPosition) {
            const distanceToPlayer = this.model.position.distanceTo(playerPosition);
            
            if (distanceToPlayer < 20) {
                // Set target to player position
                this.targetPosition = playerPosition.clone();
            }
        }
    }
    
    /**
     * Make the dinosaur roar
     */
    roar() {
        // We would play a sound here if we had audio
        console.log('Dinosaur roars!');
        
        // Visual effect for roar - temporarily scale the head
        const head = this.model.children[0];
        if (head) {
            // Store original scale
            const originalScale = head.scale.clone();
            
            // Scale up
            head.scale.set(1.2, 1.2, 1.2);
            
            // Return to original scale after a short delay
            setTimeout(() => {
                head.scale.copy(originalScale);
            }, 300);
        }
    }
}

export default Dinosaur; 