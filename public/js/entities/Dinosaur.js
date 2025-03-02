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
        // Create main dinosaur group
        this.model = new THREE.Group();
        this.model.position.copy(this.position);
        this.model.position.y = 1.5 * this.size; // Raise to stand on ground
        this.scene.add(this.model);
        
        // Create the dinosaur body with more detailed shape
        const bodyGeometry = new THREE.CapsuleGeometry(0.7 * this.size, 1.5 * this.size, 8, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: Constants.COLORS.DINO_BODY,
            roughness: 0.7,
            metalness: 0.1
        });
        
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.x = Math.PI / 12; // Slight forward tilt
        this.model.add(body);
        
        // Create the dinosaur neck
        const neckGeometry = new THREE.CapsuleGeometry(0.4 * this.size, 0.8 * this.size, 8, 16);
        const neck = new THREE.Mesh(neckGeometry, bodyMaterial);
        neck.position.set(0, 0.5 * this.size, -0.7 * this.size);
        neck.rotation.x = -Math.PI / 4; // Angle the neck upward
        this.model.add(neck);
        
        // Create the dinosaur head with more detail
        const headGeometry = new THREE.SphereGeometry(0.5 * this.size, 12, 12);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: Constants.COLORS.DINO_BODY,
            roughness: 0.6,
            metalness: 0.1
        });
        
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 0.4 * this.size, -0.3 * this.size);
        head.scale.set(1, 0.8, 1.2); // Elongate the head
        neck.add(head);
        
        // Create the dinosaur snout with more detail
        const snoutGeometry = new THREE.CylinderGeometry(0.2 * this.size, 0.4 * this.size, 0.7 * this.size, 12);
        const snout = new THREE.Mesh(snoutGeometry, headMaterial);
        snout.rotation.x = Math.PI / 2;
        snout.position.set(0, 0, -0.6 * this.size);
        head.add(snout);
        
        // Add nostrils
        const nostrilGeometry = new THREE.SphereGeometry(0.06 * this.size, 8, 8);
        const nostrilMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x330000,
            roughness: 0.9,
            metalness: 0
        });
        
        const leftNostril = new THREE.Mesh(nostrilGeometry, nostrilMaterial);
        leftNostril.position.set(0.15 * this.size, 0, -0.35 * this.size);
        leftNostril.scale.set(1, 0.5, 1);
        snout.add(leftNostril);
        
        const rightNostril = new THREE.Mesh(nostrilGeometry, nostrilMaterial);
        rightNostril.position.set(-0.15 * this.size, 0, -0.35 * this.size);
        rightNostril.scale.set(1, 0.5, 1);
        snout.add(rightNostril);
        
        // Create more detailed eyes
        const eyeSocketGeometry = new THREE.SphereGeometry(0.12 * this.size, 12, 12);
        const eyeSocketMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222222,
            roughness: 0.8
        });
        
        const leftEyeSocket = new THREE.Mesh(eyeSocketGeometry, eyeSocketMaterial);
        leftEyeSocket.position.set(0.25 * this.size, 0.2 * this.size, -0.4 * this.size);
        leftEyeSocket.scale.set(1, 1, 0.5);
        head.add(leftEyeSocket);
        
        const rightEyeSocket = new THREE.Mesh(eyeSocketGeometry, eyeSocketMaterial);
        rightEyeSocket.position.set(-0.25 * this.size, 0.2 * this.size, -0.4 * this.size);
        rightEyeSocket.scale.set(1, 1, 0.5);
        head.add(rightEyeSocket);
        
        // Create eyeballs
        const eyeGeometry = new THREE.SphereGeometry(0.08 * this.size, 12, 12);
        const eyeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFFF00, // Yellow eyes
            roughness: 0.2,
            metalness: 0.3,
            emissive: 0x222200
        });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(0, 0, 0.05 * this.size);
        leftEyeSocket.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0, 0, 0.05 * this.size);
        rightEyeSocket.add(rightEye);
        
        // Create pupils
        const pupilGeometry = new THREE.SphereGeometry(0.04 * this.size, 8, 8);
        const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(0, 0, 0.05 * this.size);
        leftPupil.scale.set(1, 1, 0.1);
        leftEye.add(leftPupil);
        
        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(0, 0, 0.05 * this.size);
        rightPupil.scale.set(1, 1, 0.1);
        rightEye.add(rightPupil);
        
        // Add teeth to the mouth
        this.addTeeth(snout);
        
        // Create the dinosaur tail with more detail
        const tailGeometry = new THREE.CylinderGeometry(0.1 * this.size, 0.5 * this.size, 2.2 * this.size, 12);
        const tailMaterial = new THREE.MeshStandardMaterial({ 
            color: Constants.COLORS.DINO_BODY,
            roughness: 0.7,
            metalness: 0.1
        });
        
        const tail = new THREE.Mesh(tailGeometry, tailMaterial);
        tail.rotation.x = Math.PI / 2;
        tail.position.set(0, -0.2 * this.size, 1.5 * this.size);
        this.model.add(tail);
        
        // Create more detailed spikes along the back
        const spikeGeometry = new THREE.ConeGeometry(0.1 * this.size, 0.4 * this.size, 8);
        const spikeMaterial = new THREE.MeshStandardMaterial({ 
            color: Constants.COLORS.DINO_SPIKES,
            roughness: 0.6,
            metalness: 0.2
        });
        
        // Add spikes along the back and tail
        for (let i = 0; i < 9; i++) {
            const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
            spike.rotation.x = -Math.PI / 2;
            
            if (i < 4) {
                // Spikes on the back
                spike.position.set(0, 0.7 * this.size, (i * 0.4 - 0.6) * this.size);
                spike.scale.set(1, 1 + (i * 0.1), 1);
                this.model.add(spike);
            } else {
                // Spikes on the tail
                spike.position.set(0, 0, (i - 4) * 0.3 * this.size);
                spike.scale.set(0.8 - ((i - 4) * 0.08), 0.8 - ((i - 4) * 0.05), 0.8 - ((i - 4) * 0.08));
                tail.add(spike);
            }
        }
        
        // Create legs
        this.createLeg(true, true);  // Left front leg
        this.createLeg(false, true); // Right front leg
        this.createLeg(true, false); // Left back leg
        this.createLeg(false, false); // Right back leg
        
        // Create belly with more detail
        const bellyGeometry = new THREE.CapsuleGeometry(0.65 * this.size, 1.4 * this.size, 8, 16);
        const bellyMaterial = new THREE.MeshStandardMaterial({ 
            color: Constants.COLORS.DINO_BELLY,
            roughness: 0.6,
            metalness: 0.1
        });
        
        const belly = new THREE.Mesh(bellyGeometry, bellyMaterial);
        belly.rotation.x = Math.PI / 2;
        belly.position.set(0, -0.3 * this.size, 0);
        belly.scale.set(0.9, 0.7, 0.7);
        this.model.add(belly);
        
        // Add scales/texture to the body
        this.addScales(body);
        this.addScales(neck);
        this.addScales(tail);
        
        // Create bounding box for collision detection
        this.boundingBox = new THREE.Box3().setFromObject(this.model);
    }
    
    /**
     * Add teeth to the dinosaur's mouth
     * @param {THREE.Mesh} snout - The snout mesh
     */
    addTeeth(snout) {
        const teethMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFF0,
            roughness: 0.3,
            metalness: 0.1
        });
        
        // Add upper teeth
        for (let i = 0; i < 6; i++) {
            const toothGeometry = new THREE.ConeGeometry(0.04 * this.size, 0.12 * this.size, 8);
            const tooth = new THREE.Mesh(toothGeometry, teethMaterial);
            
            const angle = (i - 2.5) * Math.PI / 10;
            const radius = 0.3 * this.size;
            
            tooth.position.set(
                Math.sin(angle) * radius,
                -0.3 * this.size,
                Math.cos(angle) * radius - 0.1 * this.size
            );
            
            tooth.rotation.x = Math.PI;
            snout.add(tooth);
        }
        
        // Add lower teeth (fewer and smaller)
        for (let i = 0; i < 4; i++) {
            const toothGeometry = new THREE.ConeGeometry(0.03 * this.size, 0.08 * this.size, 8);
            const tooth = new THREE.Mesh(toothGeometry, teethMaterial);
            
            const angle = (i - 1.5) * Math.PI / 8;
            const radius = 0.25 * this.size;
            
            tooth.position.set(
                Math.sin(angle) * radius,
                -0.35 * this.size,
                Math.cos(angle) * radius - 0.1 * this.size
            );
            
            snout.add(tooth);
        }
    }
    
    /**
     * Add scale details to the dinosaur's body parts
     * @param {THREE.Mesh} bodyPart - The body part to add scales to
     */
    addScales(bodyPart) {
        const scaleCount = 20;
        const scaleSize = 0.08 * this.size;
        const scaleGeometry = new THREE.CircleGeometry(scaleSize, 5);
        const scaleMaterial = new THREE.MeshStandardMaterial({
            color: Constants.COLORS.DINO_SPIKES,
            roughness: 0.8,
            metalness: 0.1
        });
        
        for (let i = 0; i < scaleCount; i++) {
            const scale = new THREE.Mesh(scaleGeometry, scaleMaterial);
            
            // Random position on the body part
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const radius = 0.7 * this.size;
            
            scale.position.set(
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.sin(phi) * Math.sin(theta),
                radius * Math.cos(phi)
            );
            
            // Orient scale to face outward
            scale.lookAt(new THREE.Vector3(0, 0, 0));
            scale.scale.set(0.7 + Math.random() * 0.6, 0.7 + Math.random() * 0.6, 1);
            
            bodyPart.add(scale);
        }
    }
    
    /**
     * Create a leg for the dinosaur
     * @param {boolean} isLeft - Whether this is a left leg
     * @param {boolean} isFront - Whether this is a front leg
     */
    createLeg(isLeft, isFront) {
        const legMaterial = new THREE.MeshStandardMaterial({ 
            color: Constants.COLORS.DINO_BODY,
            roughness: 0.7,
            metalness: 0.1
        });
        
        // Position multiplier based on which leg
        const xMultiplier = isLeft ? 1 : -1;
        const zMultiplier = isFront ? -1 : 1;
        
        // Leg dimensions - back legs larger than front
        const upperLegLength = isFront ? 0.7 * this.size : 0.9 * this.size;
        const lowerLegLength = isFront ? 0.6 * this.size : 0.8 * this.size;
        const legWidth = isFront ? 0.2 * this.size : 0.25 * this.size;
        
        // Create upper leg with more detail
        const upperLegGeometry = new THREE.CapsuleGeometry(legWidth, upperLegLength, 8, 12);
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
        
        // Add muscle definition to upper leg
        const muscleBulgeGeometry = new THREE.SphereGeometry(legWidth * 1.1, 8, 8);
        const muscleBulge = new THREE.Mesh(muscleBulgeGeometry, legMaterial);
        muscleBulge.position.set(0, upperLegLength * 0.2, 0);
        muscleBulge.scale.set(1, 0.7, 1);
        upperLeg.add(muscleBulge);
        
        // Create lower leg with more detail
        const lowerLegGeometry = new THREE.CapsuleGeometry(legWidth * 0.8, lowerLegLength, 8, 12);
        const lowerLeg = new THREE.Mesh(lowerLegGeometry, legMaterial);
        
        // Position lower leg at the end of upper leg
        lowerLeg.position.set(0, -upperLegLength / 2 - lowerLegLength / 2, 0);
        
        // Angle the lower leg
        lowerLeg.rotation.x = isFront ? -0.5 : -0.3;
        
        upperLeg.add(lowerLeg);
        
        // Create foot with more detail
        const footGeometry = new THREE.BoxGeometry(
            legWidth * 1.8,
            legWidth * 0.8,
            legWidth * 2.2
        );
        const footMaterial = new THREE.MeshStandardMaterial({
            color: Constants.COLORS.DINO_BODY,
            roughness: 0.8,
            metalness: 0.1
        });
        
        const foot = new THREE.Mesh(footGeometry, footMaterial);
        
        // Position foot at the end of lower leg
        foot.position.set(0, -lowerLegLength / 2 - legWidth * 0.4, legWidth * 0.5);
        
        lowerLeg.add(foot);
        
        // Create more detailed claws
        const clawGeometry = new THREE.ConeGeometry(legWidth * 0.2, legWidth * 0.6, 8);
        const clawMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x111111,
            roughness: 0.4,
            metalness: 0.3
        });
        
        // Add three claws to each foot
        for (let i = 0; i < 3; i++) {
            const claw = new THREE.Mesh(clawGeometry, clawMaterial);
            claw.rotation.x = -Math.PI / 2;
            claw.position.set(
                (i - 1) * legWidth * 0.6,
                -legWidth * 0.2,
                legWidth * 1.2
            );
            
            // Vary the claw sizes slightly
            const scale = 0.9 + Math.random() * 0.3;
            claw.scale.set(scale, scale, scale);
            
            // Vary the claw angles slightly
            claw.rotation.z = (Math.random() - 0.5) * 0.2;
            
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