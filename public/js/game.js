// Direct import with URL - no import map needed
import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';

// Constants module for better organization
const Constants = {
    // Player settings
    PLAYER: {
        MOVE_SPEED: 0.12,
        TURN_SPEED: 0.02,
        JUMP_HEIGHT: 2.0,
        JUMP_SPEED: 0.15,
        GRAVITY: 0.008,
        SHOT_COOLDOWN: 100, // milliseconds between shots
        CAMERA_OFFSET: new THREE.Vector3(1.5, 1.8, 5)
    },
    
    // Game settings
    GAME: {
        FOG_DENSITY: 0.005,
        GROUND_SIZE: 100,
        MAX_DELTA_TIME: 0.1
    },
    
    // Colors
    COLORS: {
        SKY: 0x87CEEB,
        GROUND: 0x2d5a27,
        TREE_TRUNK: 0x8B4513,
        TREE_FOLIAGE: 0x2E8B57,
        SOLDIER_BODY: 0x2F4F4F,
        SOLDIER_FACE: 0xD2B48C,
        CAMO: [0x4b5320, 0x3a421a, 0x5d6d21, 0x2c3317],
        DINO_BODY: 0x2d8659,
        DINO_BELLY: 0x3da677,
        DINO_SPIKES: 0x1a5038
    },
    
    // Dinosaur settings
    DINOSAUR: {
        MOVE_SPEED: 0.08,
        ROAR_INTERVAL: 15000, // milliseconds between roars
        WANDER_RADIUS: 40,
        SIZE: 1.5 // Scale factor
    }
};

// Dinosaur class for realistic dinosaur that walks around
class Dinosaur {
    constructor(scene, position) {
        this.scene = scene;
        
        // Ensure position is valid
        if (!position || isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) {
            console.warn('Invalid dinosaur position, using default position');
            this.position = new THREE.Vector3(30, 1, 30);
        } else {
            this.position = position.clone();
        }
        
        this.rotation = new THREE.Euler(0, Math.random() * Math.PI * 2, 0, 'YXZ');
        this.moveSpeed = Constants.DINOSAUR.MOVE_SPEED;
        this.model = this.createDinosaurModel();
        this.targetPosition = this.getNewTargetPosition();
        this.updateInterval = Math.random() * 5000 + 8000; // Random update interval between 8-13 seconds
        this.lastUpdate = performance.now();
        this.lastRoar = 0;
        this.roarInterval = Constants.DINOSAUR.ROAR_INTERVAL;
        this.legAngle = 0;
        this.tailAngle = 0;
        this.moving = false;
        this.health = 100;
        this.bloodParticles = [];
        
        // Add to scene
        this.model.position.copy(this.position);
        this.model.rotation.copy(this.rotation);
        scene.add(this.model);
        
        console.log('Dinosaur created at position:', this.position);
    }
    
    createDinosaurModel() {
        const dinosaur = new THREE.Group();
        const scale = Constants.DINOSAUR.SIZE * 1.3; // Increased size for more intimidation
        
        // Create sophisticated materials with textures, bumps and shine
        const bodyTexture = this.createDinosaurTexture();
        const bodyNormalMap = this.createDinosaurNormalMap();
        
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: Constants.COLORS.DINO_BODY,
            roughness: 0.7,
            metalness: 0.1,
            map: bodyTexture,
            normalMap: bodyNormalMap,
            normalScale: new THREE.Vector2(1, 1),
            bumpMap: bodyNormalMap,
            bumpScale: 0.02
        });
        
        const bellyMaterial = new THREE.MeshStandardMaterial({
            color: Constants.COLORS.DINO_BELLY,
            roughness: 0.6,
            metalness: 0.1,
            map: bodyTexture,
            normalMap: bodyNormalMap,
            normalScale: new THREE.Vector2(0.5, 0.5)
        });
        
        const spikeMaterial = new THREE.MeshStandardMaterial({
            color: Constants.COLORS.DINO_SPIKES,
            roughness: 0.3,
            metalness: 0.4,
            envMap: this.scene.background
        });
        
        const teethMaterial = new THREE.MeshStandardMaterial({
            color: 0xf8f8f0,
            roughness: 0.3,
            metalness: 0.4
        });
        
        // Main body - use a smoother geometry
        const bodyShape = new THREE.Shape();
        bodyShape.moveTo(-0.6 * scale, -0.5 * scale);
        bodyShape.lineTo(0.6 * scale, -0.5 * scale);
        bodyShape.lineTo(0.7 * scale, 0 * scale);
        bodyShape.lineTo(0.6 * scale, 0.5 * scale);
        bodyShape.lineTo(-0.6 * scale, 0.5 * scale);
        bodyShape.lineTo(-0.7 * scale, 0 * scale);
        bodyShape.lineTo(-0.6 * scale, -0.5 * scale);
        
        const extrudeSettings = {
            steps: 1,
            depth: 2.5 * scale,
            bevelEnabled: true,
            bevelThickness: 0.2 * scale,
            bevelSize: 0.2 * scale,
            bevelOffset: 0,
            bevelSegments: 5
        };
        
        const bodyGeometry = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings);
        bodyGeometry.rotateX(Math.PI / 2);
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1.5 * scale;
        body.rotation.x = Math.PI / 2;
        dinosaur.add(body);
        
        // Create muscle bulges for a more realistic appearance
        const shoulderGeometry = new THREE.SphereGeometry(0.6 * scale, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const leftShoulder = new THREE.Mesh(shoulderGeometry, bodyMaterial);
        leftShoulder.position.set(0.6 * scale, 0.2 * scale, -0.8 * scale);
        leftShoulder.rotation.z = -Math.PI / 2;
        body.add(leftShoulder);
        
        const rightShoulder = new THREE.Mesh(shoulderGeometry, bodyMaterial);
        rightShoulder.position.set(-0.6 * scale, 0.2 * scale, -0.8 * scale);
        rightShoulder.rotation.z = Math.PI / 2;
        body.add(rightShoulder);
        
        const hipGeometry = new THREE.SphereGeometry(0.7 * scale, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const leftHip = new THREE.Mesh(hipGeometry, bodyMaterial);
        leftHip.position.set(0.6 * scale, 0.2 * scale, 0.8 * scale);
        leftHip.rotation.z = -Math.PI / 2;
        body.add(leftHip);
        
        const rightHip = new THREE.Mesh(hipGeometry, bodyMaterial);
        rightHip.position.set(-0.6 * scale, 0.2 * scale, 0.8 * scale);
        rightHip.rotation.z = Math.PI / 2;
        body.add(rightHip);
        
        // Neck using curved geometries
        const neckCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0.3 * scale, -0.4 * scale),
            new THREE.Vector3(0, 0.5 * scale, -0.8 * scale),
            new THREE.Vector3(0, 0.7 * scale, -1.2 * scale),
        ]);
        
        const neckGeometry = new THREE.TubeGeometry(neckCurve, 8, 0.3 * scale, 12, false);
        const neck = new THREE.Mesh(neckGeometry, bodyMaterial);
        neck.position.set(0, 0.3 * scale, -1.2 * scale);
        body.add(neck);
        
        // Head with more detailed features
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 0.7 * scale, -1.2 * scale);
        headGroup.rotation.x = -Math.PI / 6;
        neck.add(headGroup);
        
        // Skull with beveled edges for realism
        const skullGeometry = new THREE.BoxGeometry(0.7 * scale, 0.5 * scale, 1 * scale);
        const skull = new THREE.Mesh(skullGeometry, bodyMaterial);
        headGroup.add(skull);
        
        // Detailed jaw
        const jawGeometry = new THREE.BoxGeometry(0.65 * scale, 0.3 * scale, 1.1 * scale);
        const jaw = new THREE.Mesh(jawGeometry, bodyMaterial);
        jaw.position.set(0, -0.3 * scale, 0);
        jaw.rotation.x = this.jawAngle || 0; // For animation
        headGroup.add(jaw);
        this.jaw = jaw; // Store for animations
        
        // Eyes with advanced materials for a predatory look
        const eyeGeometry = new THREE.SphereGeometry(0.08 * scale, 16, 16);
        const irisGeometry = new THREE.SphereGeometry(0.04 * scale, 16, 16);
        
        const eyeWhiteMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const irisMaterial = new THREE.MeshBasicMaterial({ color: 0xcc3311 }); // Predatory red eyes
        
        // Create detailed eyes
        const createDetailedEye = (x) => {
            const eyeGroup = new THREE.Group();
            eyeGroup.position.set(x, 0.1 * scale, -0.3 * scale);
            
            const eyeball = new THREE.Mesh(eyeGeometry, eyeWhiteMaterial);
            eyeGroup.add(eyeball);
            
            const iris = new THREE.Mesh(irisGeometry, irisMaterial);
            iris.position.z = -0.05 * scale;
            eyeGroup.add(iris);
            
            // Add eyelid
            const lidGeometry = new THREE.SphereGeometry(0.085 * scale, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
            const lidMaterial = new THREE.MeshStandardMaterial({ 
                color: Constants.COLORS.DINO_BODY, 
                roughness: 0.7,
                side: THREE.DoubleSide
            });
            
            const eyelid = new THREE.Mesh(lidGeometry, lidMaterial);
            eyelid.rotation.x = Math.PI / 2;
            eyelid.position.z = -0.01 * scale;
            eyeGroup.add(eyelid);
            
            return eyeGroup;
        };
        
        const leftEye = createDetailedEye(0.25 * scale);
        const rightEye = createDetailedEye(-0.25 * scale);
        skull.add(leftEye);
        skull.add(rightEye);
        
        // Detailed teeth
        const createTeeth = (parent, isUpper) => {
            const teethGroup = new THREE.Group();
            teethGroup.position.z = -0.5 * scale;
            const yPos = isUpper ? -0.2 * scale : 0.15 * scale;
            const rotation = isUpper ? Math.PI : 0;
            
            for (let i = 0; i < 8; i++) {
                const toothSize = (0.03 + Math.random() * 0.03) * scale;
                const toothGeometry = new THREE.ConeGeometry(toothSize, 0.1 * scale, 5);
                const tooth = new THREE.Mesh(toothGeometry, teethMaterial);
                
                // Position teeth along jaw
                const xOffset = -0.25 * scale + i * 0.07 * scale;
                tooth.position.set(xOffset, yPos, 0);
                tooth.rotation.x = rotation;
                teethGroup.add(tooth);
            }
            
            parent.add(teethGroup);
        };
        
        createTeeth(skull, true);  // Upper jaw teeth
        createTeeth(jaw, false);   // Lower jaw teeth
        
        // Realistic tail with segmented animation
        this.tail = new THREE.Group();
        body.add(this.tail);
        this.tailSegments = [];
        
        // Create a curved, articulated tail
        const tailCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 0.5 * scale),
            new THREE.Vector3(0, 0, 1 * scale),
            new THREE.Vector3(0, 0, 1.5 * scale),
            new THREE.Vector3(0, 0, 2 * scale),
            new THREE.Vector3(0, 0, 2.5 * scale),
            new THREE.Vector3(0, 0, 3 * scale)
        ]);
        
        // Create tail segments for animation
        const tailPoints = tailCurve.getPoints(6);
        for (let i = 0; i < tailPoints.length - 1; i++) {
            const startPoint = tailPoints[i];
            const endPoint = tailPoints[i + 1];
            
            const segmentLength = startPoint.distanceTo(endPoint);
            const tailRadius = 0.3 * scale * (1 - i / 7); // Tail tapers toward the end
            
            const segmentGeometry = new THREE.CylinderGeometry(
                tailRadius, 
                tailRadius * 0.8, 
                segmentLength, 
                12, 1,
                false
            );
            
            const segment = new THREE.Mesh(segmentGeometry, bodyMaterial);
            segment.position.copy(startPoint);
            
            // Calculate rotation to point to next segment
            segment.lookAt(endPoint);
            segment.rotateX(Math.PI / 2);
            
            // Connect segments hierarchically
            if (i === 0) {
                segment.position.set(0, -0.1 * scale, 1.2 * scale);
                this.tail.add(segment);
            } else {
                this.tailSegments[i-1].add(segment);
                segment.position.set(0, 0, segmentLength);
            }
            
            this.tailSegments.push(segment);
        }
        
        // Add spikes along back and tail
        const addSpikes = (parent, count, startZ, endZ, maxHeight) => {
            for (let i = 0; i < count; i++) {
                const progress = i / (count - 1);
                const zPos = startZ + progress * (endZ - startZ);
                
                // Spikes have varying heights with a pattern
                const heightPattern = Math.sin(progress * Math.PI) * 0.5 + 0.5;
                const spikeHeight = (maxHeight * heightPattern) * scale;
                
                const spikeGeometry = new THREE.ConeGeometry(0.08 * scale, spikeHeight, 4);
                const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
                spike.position.set(0, (0.5 + heightPattern * 0.1) * scale, zPos);
                spike.rotation.x = -Math.PI / 2;
                parent.add(spike);
            }
        };
        
        // Add spikes along the back
        addSpikes(body, 10, -1.0 * scale, 1.0 * scale, 0.4);
        
        // Add spikes along the tail
        for (let i = 0; i < this.tailSegments.length; i++) {
            if (i < 3) { // Only add spikes to first few segments
                const spike = new THREE.Mesh(
                    new THREE.ConeGeometry(0.06 * scale * (1 - i * 0.2), 0.25 * scale * (1 - i * 0.2), 4),
                    spikeMaterial
                );
                spike.position.y = 0.2 * scale;
                spike.rotation.x = -Math.PI / 2;
                this.tailSegments[i].add(spike);
            }
        }
        
        // Legs with muscle definition and articulation
        this.legs = [];
        
        // Create dinosaur legs
        const createLeg = (isLeft, isFront) => {
            const legGroup = new THREE.Group();
            const xPos = isLeft ? 0.55 * scale : -0.55 * scale;
            const zPos = isFront ? -0.8 * scale : 0.8 * scale;
            
            // For front legs, the structure is different than hind legs
            if (isFront) {
                // Front legs are smaller
                const legScale = 0.8;
                
                // Upper leg with muscle bulge
                const upperLegGeometry = new THREE.CylinderGeometry(
                    0.15 * scale * legScale,
                    0.12 * scale * legScale,
                    0.6 * scale * legScale,
                    10
                );
                const upperLeg = new THREE.Mesh(upperLegGeometry, bodyMaterial);
                upperLeg.position.y = -0.3 * scale;
                upperLeg.rotation.x = Math.PI / 15;
                legGroup.add(upperLeg);
                
                // Lower leg
                const lowerLegGeometry = new THREE.CylinderGeometry(
                    0.11 * scale * legScale,
                    0.09 * scale * legScale,
                    0.6 * scale * legScale,
                    8
                );
                const lowerLeg = new THREE.Mesh(lowerLegGeometry, bodyMaterial);
                lowerLeg.position.y = -0.6 * scale;
                lowerLeg.rotation.x = -Math.PI / 8;
                upperLeg.add(lowerLeg);
                
                // Foot with three toes
                const foot = new THREE.Group();
                foot.position.y = -0.3 * scale;
                lowerLeg.add(foot);
                
                // Create detailed foot with toes
                const footPad = new THREE.Mesh(
                    new THREE.BoxGeometry(0.25 * scale, 0.1 * scale, 0.35 * scale),
                    bodyMaterial
                );
                foot.add(footPad);
                
                // Add three toes with claws
                for (let i = 0; i < 3; i++) {
                    const toe = new THREE.Mesh(
                        new THREE.BoxGeometry(0.07 * scale, 0.06 * scale, 0.2 * scale),
                        bodyMaterial
                    );
                    
                    const xOffset = (i - 1) * 0.08 * scale;
                    toe.position.set(xOffset, 0, -0.2 * scale);
                    
                    const claw = new THREE.Mesh(
                        new THREE.ConeGeometry(0.04 * scale, 0.15 * scale, 4),
                        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.6 })
                    );
                    claw.position.z = -0.15 * scale;
                    claw.rotation.x = -Math.PI / 4;
                    toe.add(claw);
                    
                    foot.add(toe);
                }
            } else {
                // Hind legs are more powerful
                
                // Create upper leg with powerful thigh muscle
                const thighGeometry = new THREE.CylinderGeometry(
                    0.23 * scale, 
                    0.18 * scale, 
                    0.8 * scale,
                    12
                );
                const upperLeg = new THREE.Mesh(thighGeometry, bodyMaterial);
                upperLeg.position.y = -0.4 * scale;
                upperLeg.rotation.x = -Math.PI / 12;
                legGroup.add(upperLeg);
                
                // Lower leg
                const lowerLegGeometry = new THREE.CylinderGeometry(
                    0.17 * scale,
                    0.14 * scale,
                    0.7 * scale,
                    10
                );
                const lowerLeg = new THREE.Mesh(lowerLegGeometry, bodyMaterial);
                lowerLeg.position.y = -0.75 * scale;
                lowerLeg.rotation.x = Math.PI / 6;
                upperLeg.add(lowerLeg);
                
                // Ankle joint
                const ankleGeometry = new THREE.SphereGeometry(0.12 * scale, 8, 8);
                const ankle = new THREE.Mesh(ankleGeometry, bodyMaterial);
                ankle.position.y = -0.35 * scale;
                lowerLeg.add(ankle);
                
                // Foot with detailed toes
                const foot = new THREE.Group();
                foot.position.y = -0.12 * scale;
                foot.rotation.x = Math.PI / 4;
                ankle.add(foot);
                
                // Create detailed foot with powerful toes
                const footPad = new THREE.Mesh(
                    new THREE.BoxGeometry(0.3 * scale, 0.12 * scale, 0.4 * scale),
                    bodyMaterial
                );
                foot.add(footPad);
                
                // Add three toes with large claws
                for (let i = 0; i < 3; i++) {
                    const toeGeometry = new THREE.BoxGeometry(0.08 * scale, 0.07 * scale, 0.25 * scale);
                    const toe = new THREE.Mesh(toeGeometry, bodyMaterial);
                    
                    const xOffset = (i - 1) * 0.1 * scale;
                    toe.position.set(xOffset, 0, -0.25 * scale);
                    
                    // Add vicious claws to the toes
                    const claw = new THREE.Mesh(
                        new THREE.ConeGeometry(0.05 * scale, 0.2 * scale, 4),
                        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.6 })
                    );
                    claw.position.z = -0.2 * scale;
                    claw.rotation.x = -Math.PI / 4;
                    toe.add(claw);
                    
                    foot.add(toe);
                }
            }
            
            legGroup.position.set(xPos, 0, zPos);
            body.add(legGroup);
            
            return { 
                group: legGroup, 
                upper: legGroup.children[0], 
                lower: legGroup.children[0].children[0],
                foot: legGroup.children[0].children[0].children[0],
                isFront 
            };
        };
        
        createLeg(true, true);   // Front left
        createLeg(false, true);  // Front right
        createLeg(true, false);  // Back left
        createLeg(false, false); // Back right
        
        return dinosaur;
    }
    
    getNewTargetPosition() {
        const angle = Math.random() * Math.PI * 2;
        
        // Limit the dinosaur's wandering radius to keep it in the main grassy area
        const distance = Math.random() * (Constants.DINOSAUR.WANDER_RADIUS * 0.7); // Reduced radius
        
        // Use current position as base if it's valid, otherwise use a default position
        const baseX = isNaN(this.position.x) ? 30 : this.position.x;
        const baseZ = isNaN(this.position.z) ? 30 : this.position.z;
        
        // Calculate new position
        let newX = baseX + Math.cos(angle) * distance;
        let newZ = baseZ + Math.sin(angle) * distance;
        
        // Ensure the dinosaur stays within the main grassy area bounds
        // These values should match your main grassy area dimensions
        const GRASSY_AREA_MIN_X = -50;
        const GRASSY_AREA_MAX_X = 50;
        const GRASSY_AREA_MIN_Z = -50;
        const GRASSY_AREA_MAX_Z = 50;
        
        // Clamp the values to keep within bounds
        newX = Math.max(GRASSY_AREA_MIN_X, Math.min(GRASSY_AREA_MAX_X, newX));
        newZ = Math.max(GRASSY_AREA_MIN_Z, Math.min(GRASSY_AREA_MAX_Z, newZ));
        
        return new THREE.Vector3(
            newX,
            1,
            newZ
        );
    }
    
    update(deltaTime, playerPosition) {
        const now = performance.now();
        
        // Update leg animation
        if (this.moving) {
            this.legAngle += deltaTime * 5;
            this.tailAngle += deltaTime * 3;
            
            // Animate legs
            this.legs.forEach((leg, index) => {
                const offset = index % 2 === 0 ? 0 : Math.PI;
                const legSwing = Math.sin(this.legAngle + offset) * 0.3;
                
                if (leg.isFront) {
                    leg.upper.rotation.x = legSwing;
                    leg.lower.rotation.x = -Math.abs(legSwing) * 0.5;
                } else {
                    leg.upper.rotation.x = -legSwing;
                    leg.lower.rotation.x = Math.abs(legSwing) * 0.5;
                }
            });
            
            // Animate tail
            if (this.tail) {
                this.tail.rotation.y = Math.sin(this.tailAngle) * 0.2;
            }
        }
        
        // Check if it's time to update target position
        if (now - this.lastUpdate > this.updateInterval) {
            this.targetPosition = this.getNewTargetPosition();
            this.lastUpdate = now;
            this.updateInterval = Math.random() * 5000 + 8000; // 8-13 seconds
        }
        
        // Move towards target position
        const direction = new THREE.Vector3();
        direction.subVectors(this.targetPosition, this.position);
        
        // Only move if we're not too close to the target
        if (direction.length() > 0.5) {
            this.moving = true;
            
            // Calculate rotation to face the target
            const targetRotation = Math.atan2(direction.x, direction.z);
            
            // Smoothly rotate towards the target
            let rotationDiff = targetRotation - this.rotation.y;
            
            // Handle the -PI to PI transition
            if (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
            if (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
            
            this.rotation.y += rotationDiff * 0.05;
            
            // Move forward in the direction we're facing
            const moveDirection = new THREE.Vector3(0, 0, -1);
            moveDirection.applyEuler(this.rotation);
            
            // Scale by move speed and delta time
            moveDirection.multiplyScalar(this.moveSpeed * deltaTime * 60);
            
            // Update position
            this.position.add(moveDirection);
            
            // Check for NaN values and fix them
            if (isNaN(this.position.x) || isNaN(this.position.y) || isNaN(this.position.z)) {
                console.warn('Dinosaur position contains NaN, resetting to valid position');
                this.position.set(30, 1, 30);
            }
            
            // Update model position and rotation
            this.model.position.copy(this.position);
            this.model.rotation.copy(this.rotation);
        } else {
            this.moving = false;
        }
        
        // Occasionally roar
        if (now - this.lastRoar > this.roarInterval) {
            this.roar();
            this.lastRoar = now;
            this.roarInterval = Constants.DINOSAUR.ROAR_INTERVAL + Math.random() * 5000; // Add some randomness
        }
        
        // Update blood particles if any
        if (this.bloodParticles.length > 0) {
            this.updateBloodParticles(deltaTime);
        }
    }
    
    roar() {
        // Play roar sound if audio is initialized
        if (window.game && window.game.audioInitialized && window.game.audioContext) {
            try {
                // Create oscillator for roar sound
                const oscillator = window.game.audioContext.createOscillator();
                const gainNode = window.game.audioContext.createGain();
                
                // Connect nodes
                oscillator.connect(gainNode);
                gainNode.connect(window.game.audioContext.destination);
                
                // Set parameters for a roar-like sound
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(100, window.game.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(50, window.game.audioContext.currentTime + 1.5);
                
                // Volume envelope
                gainNode.gain.setValueAtTime(0, window.game.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.5, window.game.audioContext.currentTime + 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.01, window.game.audioContext.currentTime + 1.5);
                
                // Start and stop
                oscillator.start();
                oscillator.stop(window.game.audioContext.currentTime + 1.5);
            } catch (error) {
                console.warn('Could not play dinosaur roar:', error);
            }
        }
    }
    
    takeDamage(amount, hitPosition) {
        this.health -= amount;
        this.createBloodSplatter(hitPosition);
        
        // React to being hit - turn toward player
        if (window.game && window.game.playerState) {
            const playerDir = new THREE.Vector3();
            playerDir.subVectors(window.game.playerState.position, this.position);
            this.rotation.y = Math.atan2(playerDir.x, playerDir.z);
            this.model.rotation.copy(this.rotation);
        }
        
        // If health depleted, remove the dinosaur
        if (this.health <= 0) {
            this.scene.remove(this.model);
            
            // Remove from game's dinosaurs array if it exists
            if (window.game && window.game.dinosaurs) {
                const index = window.game.dinosaurs.indexOf(this);
                if (index !== -1) {
                    window.game.dinosaurs.splice(index, 1);
                }
            }
        }
    }
    
    createBloodSplatter(hitPosition) {
        // Create blood particles at hit position
        const particleCount = 20 + Math.floor(Math.random() * 10);
        
        for (let i = 0; i < particleCount; i++) {
            // Create a small sphere for each blood particle
            const size = 0.03 + Math.random() * 0.05;
            const geometry = new THREE.SphereGeometry(size, 4, 4);
            const material = new THREE.MeshBasicMaterial({ 
                color: 0x8B0000,
                transparent: true,
                opacity: 0.8
            });
            
            const particle = new THREE.Mesh(geometry, material);
            
            // Position at hit location
            particle.position.copy(hitPosition);
            
            // Random velocity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                Math.random() * 0.1,
                (Math.random() - 0.5) * 0.1
            );
            
            // Add to scene and track
            this.scene.add(particle);
            this.bloodParticles.push({
                mesh: particle,
                velocity: velocity,
                life: 1.0 // Life value from 1.0 to 0.0
            });
        }
    }
    
    updateBloodParticles(deltaTime) {
        const gravity = new THREE.Vector3(0, -0.005, 0);
        
        for (let i = this.bloodParticles.length - 1; i >= 0; i--) {
            const particle = this.bloodParticles[i];
            
            // Apply gravity
            particle.velocity.add(gravity.clone().multiplyScalar(deltaTime * 60));
            
            // Move particle
            particle.mesh.position.add(particle.velocity.clone().multiplyScalar(deltaTime * 60));
            
            // Reduce life
            particle.life -= deltaTime * 0.5;
            
            // Update opacity based on life
            particle.mesh.material.opacity = particle.life * 0.8;
            
            // Remove if life is depleted or it hit the ground
            if (particle.life <= 0 || particle.mesh.position.y <= 0.05) {
                this.scene.remove(particle.mesh);
                this.bloodParticles.splice(i, 1);
            }
        }
    }
    
    checkBulletHit(rayOrigin, rayDirection) {
        // Create a bounding box for the dinosaur
        const boundingBox = new THREE.Box3().setFromObject(this.model);
        
        // Create a ray for intersection testing
        const ray = new THREE.Ray(rayOrigin, rayDirection);
        
        // Check if ray intersects the bounding box
        const intersectionPoint = new THREE.Vector3();
        if (ray.intersectBox(boundingBox, intersectionPoint)) {
            // Calculate damage based on distance
            const distance = rayOrigin.distanceTo(intersectionPoint);
            const damage = Math.max(10, 30 - distance); // More damage when closer
            
            // Apply damage
            this.takeDamage(damage, intersectionPoint);
            return true;
        }
        
        return false;
    }
}

class Enemy {
    constructor(scene, position) {
        this.scene = scene;
        this.position = position.clone();
        this.rotation = new THREE.Euler(0, Math.random() * Math.PI * 2, 0, 'YXZ');
        this.moveSpeed = Constants.PLAYER.MOVE_SPEED * 0.6; // Slightly slower than player
        this.lastShot = 0;
        this.shotCooldown = 2000; // 2 seconds between shots
        this.targetPosition = this.getNewTargetPosition();
        this.updateInterval = Math.random() * 2000 + 3000; // Random update interval between 3-5 seconds
        this.lastUpdate = performance.now();
        this.legAngle = 0;
        this.moving = false;
        
        // Health and damage properties
        this.health = 100;
        this.bloodParticles = [];
        this.lastDamageTime = 0;
        
        // Create the model after initializing all properties
        this.model = this.createEnemyModel();
    }

    createEnemyModel() {
        const enemy = new THREE.Group();

        // Create multicam camo pattern for texture
        const camoCanvas = document.createElement('canvas');
        camoCanvas.width = 512;
        camoCanvas.height = 512;
        const ctx = camoCanvas.getContext('2d');
        
        // Base camo color - sandy tan base for multicam
        ctx.fillStyle = '#B5A276';
        ctx.fillRect(0, 0, 512, 512);
        
        // Multicam-like pattern with multiple colors
        const camoColors = ['#63613E', '#605E3F', '#8C7E62', '#312F22', '#7D7969', '#A99F8A'];
        
        // Add large blobs
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = 30 + Math.random() * 60;
            ctx.fillStyle = camoColors[Math.floor(Math.random() * camoColors.length)];
            ctx.beginPath();
            ctx.ellipse(x, y, size, size * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Add smaller detailed spots
        for (let i = 0; i < 60; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = 5 + Math.random() * 20;
            ctx.fillStyle = camoColors[Math.floor(Math.random() * camoColors.length)];
            ctx.beginPath();
            ctx.ellipse(x, y, size, size * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const camoTexture = new THREE.CanvasTexture(camoCanvas);
        
        // Create tactical vest (body)
        const bodyGeometry = new THREE.BoxGeometry(0.54, 0.8, 0.35);
        const vestMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1A2E14, // Darker green for tactical vest
            roughness: 0.9,
            metalness: 0.1
        });
        const body = new THREE.Mesh(bodyGeometry, vestMaterial);
        body.position.y = 0.4;
        enemy.add(body);
        
        // Add tactical pouches to vest
        const pouchGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.08);
        const pouchMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0A0A0A, // Black pouches
            roughness: 0.8,
            metalness: 0.2
        });
        
        // Add magazine pouches on front
        for (let i = 0; i < 2; i++) {
            const pouch = new THREE.Mesh(pouchGeometry, pouchMaterial);
            pouch.position.set(0.12 * (i === 0 ? 1 : -1), 0.4, 0.18);
            body.add(pouch);
        }
        
        // Add utility pouches on sides
        for (let i = 0; i < 2; i++) {
            const sidePouch = new THREE.Mesh(pouchGeometry, pouchMaterial);
            sidePouch.position.set(0.28 * (i === 0 ? 1 : -1), 0.3, 0);
            sidePouch.rotation.y = Math.PI * 0.5 * (i === 0 ? 1 : -1);
            body.add(sidePouch);
        }

        // Create helmet with tactical details
        const helmetGeometry = new THREE.BoxGeometry(0.38, 0.32, 0.38);
        const helmetMaterial = new THREE.MeshStandardMaterial({ 
            map: camoTexture,
            roughness: 0.9,
            metalness: 0.2
        });
        const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
        helmet.position.y = 1;
        enemy.add(helmet);
        
        // Add helmet accessories - NVG mount
        const mountGeometry = new THREE.BoxGeometry(0.1, 0.05, 0.1);
        const mountMaterial = new THREE.MeshStandardMaterial({ color: 0x0A0A0A });
        const nvgMount = new THREE.Mesh(mountGeometry, mountMaterial);
        nvgMount.position.set(0, 0.12, 0.16);
        helmet.add(nvgMount);
        
        // Side rails
        for (let i = 0; i < 2; i++) {
            const rail = new THREE.Mesh(
                new THREE.BoxGeometry(0.05, 0.05, 0.2),
                mountMaterial
            );
            rail.position.set(0.2 * (i === 0 ? 1 : -1), 0, 0);
            helmet.add(rail);
        }

        // Face with tactical face paint
        const faceGeometry = new THREE.BoxGeometry(0.22, 0.22, 0.22);
        const faceMaterial = new THREE.MeshStandardMaterial({ color: Constants.COLORS.SOLDIER_FACE });
        const face = new THREE.Mesh(faceGeometry, faceMaterial);
        face.position.set(0, 0.95, 0.05);
        
        // Create face paint texture
        const faceCanvas = document.createElement('canvas');
        faceCanvas.width = 128;
        faceCanvas.height = 128;
        const faceCtx = faceCanvas.getContext('2d');
        
        // Base skin color
        faceCtx.fillStyle = '#C9A585';
        faceCtx.fillRect(0, 0, 128, 128);
        
        // Add face paint stripes
        faceCtx.fillStyle = '#0A0A0A';
        
        // Horizontal stripes
        faceCtx.fillRect(20, 30, 88, 10);
        faceCtx.fillRect(30, 60, 68, 8);
        
        // Apply texture to face
        const faceTexture = new THREE.CanvasTexture(faceCanvas);
        face.material.map = faceTexture;
        
        enemy.add(face);

        // Create tactical pants (legs) with cargo pockets
        const legGeometry = new THREE.BoxGeometry(0.22, 0.6, 0.22);
        const pantsMaterial = new THREE.MeshStandardMaterial({ 
            map: camoTexture,
            roughness: 0.9,
            metalness: 0.1
        });
        
        this.leftLeg = new THREE.Mesh(legGeometry, pantsMaterial);
        this.leftLeg.position.set(0.15, -0.3, 0);
        enemy.add(this.leftLeg);
        
        this.rightLeg = new THREE.Mesh(legGeometry, pantsMaterial);
        this.rightLeg.position.set(-0.15, -0.3, 0);
        enemy.add(this.rightLeg);
        
        // Add knee pads
        const kneePadGeometry = new THREE.BoxGeometry(0.25, 0.12, 0.25);
        const kneePadMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0A0A0A,
            roughness: 0.8
        });
        
        for (let i = 0; i < 2; i++) {
            const kneePad = new THREE.Mesh(kneePadGeometry, kneePadMaterial);
            kneePad.position.set(0.15 * (i === 0 ? 1 : -1), -0.1, 0.02);
            enemy.add(kneePad);
        }

        // Create tactical boots
        const bootGeometry = new THREE.BoxGeometry(0.24, 0.18, 0.28);
        const bootMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0A0A0A, // Black tactical boots
            roughness: 0.9,
            metalness: 0.3
        });
        
        const leftBoot = new THREE.Mesh(bootGeometry, bootMaterial);
        leftBoot.position.set(0.15, -0.62, 0.02);
        enemy.add(leftBoot);
        
        const rightBoot = new THREE.Mesh(bootGeometry, bootMaterial);
        rightBoot.position.set(-0.15, -0.62, 0.02);
        enemy.add(rightBoot);

        // Create tactical arms with improved geometry
        const upperArmGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.35, 8);
        const lowerArmGeometry = new THREE.CylinderGeometry(0.07, 0.07, 0.35, 8);
        const armMaterial = new THREE.MeshStandardMaterial({ map: camoTexture });
        
        // Upper arms
        this.leftArm = new THREE.Group();
        const leftUpperArm = new THREE.Mesh(upperArmGeometry, armMaterial);
        leftUpperArm.rotation.z = Math.PI/2;
        leftUpperArm.position.y = -0.175;
        this.leftArm.add(leftUpperArm);
        this.leftArm.position.set(0.35, 0.5, 0);
        enemy.add(this.leftArm);
        
        this.rightArm = new THREE.Group();
        const rightUpperArm = new THREE.Mesh(upperArmGeometry, armMaterial);
        rightUpperArm.rotation.z = Math.PI/2;
        rightUpperArm.position.y = -0.175;
        this.rightArm.add(rightUpperArm);
        this.rightArm.position.set(-0.35, 0.5, 0);
        enemy.add(this.rightArm);
        
        // Lower arms
        const leftLowerArmGroup = new THREE.Group();
        const leftLowerArm = new THREE.Mesh(lowerArmGeometry, armMaterial);
        leftLowerArm.rotation.z = Math.PI/2;
        leftLowerArm.position.y = -0.175;
        leftLowerArmGroup.add(leftLowerArm);
        leftLowerArmGroup.position.set(0, -0.35, 0);
        this.leftArm.add(leftLowerArmGroup);
        
        const rightLowerArmGroup = new THREE.Group();
        const rightLowerArm = new THREE.Mesh(lowerArmGeometry, armMaterial);
        rightLowerArm.rotation.z = Math.PI/2;
        rightLowerArm.position.y = -0.175;
        rightLowerArmGroup.add(rightLowerArm);
        rightLowerArmGroup.position.set(0, -0.35, 0);
        this.rightArm.add(rightLowerArmGroup);
        
        // Tactical gloves
        const handGeometry = new THREE.BoxGeometry(0.16, 0.16, 0.16);
        const gloveMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0A0A0A, // Black tactical gloves
            roughness: 0.8
        });
        
        const leftHand = new THREE.Mesh(handGeometry, gloveMaterial);
        leftHand.position.set(0, -0.55, 0);
        this.leftArm.add(leftHand);
        
        const rightHand = new THREE.Mesh(handGeometry, gloveMaterial);
        rightHand.position.set(0, -0.55, 0);
        this.rightArm.add(rightHand);

        // Store the model reference before adding the rifle
        this.model = enemy;

        // Add rifle
        const rifle = this.createEnemyRifle();
        enemy.add(rifle);

        // Position the enemy
        enemy.position.copy(this.position);
        enemy.rotation.copy(this.rotation);

        // Add to scene
        this.scene.add(enemy);

        return enemy;
    }

    createEnemyRifle() {
        const rifle = new THREE.Group();
        
        // Rifle materials
        const metalMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2c2c2c, 
            roughness: 0.5,
            metalness: 0.7
        });
        const blackMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0A0A0A, 
            roughness: 0.8,
            metalness: 0.2
        });
        
        // Create rifle receiver (main body)
        const receiverGeometry = new THREE.BoxGeometry(0.08, 0.12, 0.5);
        const receiver = new THREE.Mesh(receiverGeometry, blackMaterial);
        rifle.add(receiver);
        
        // Rifle barrel
        const barrelGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8);
        const barrel = new THREE.Mesh(barrelGeometry, metalMaterial);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.z = 0.6;
        rifle.add(barrel);
        
        // Handguard
        const handguardGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8);
        const handguard = new THREE.Mesh(handguardGeometry, blackMaterial);
        handguard.rotation.x = Math.PI / 2;
        handguard.position.z = 0.35;
        rifle.add(handguard);
        
        // Rifle stock
        const stockGeometry = new THREE.BoxGeometry(0.08, 0.12, 0.35);
        const stock = new THREE.Mesh(stockGeometry, blackMaterial);
        stock.position.z = -0.42;
        rifle.add(stock);
        
        // Pistol grip
        const gripGeometry = new THREE.BoxGeometry(0.06, 0.15, 0.06);
        const grip = new THREE.Mesh(gripGeometry, blackMaterial);
        grip.position.set(0, -0.12, -0.1);
        grip.rotation.x = Math.PI * 0.2;
        rifle.add(grip);
        
        // Magazine
        const magGeometry = new THREE.BoxGeometry(0.06, 0.15, 0.08);
        const magazine = new THREE.Mesh(magGeometry, blackMaterial);
        magazine.position.set(0, -0.08, 0.05);
        rifle.add(magazine);
        
        // Optic sight
        const opticBodyGeometry = new THREE.BoxGeometry(0.1, 0.08, 0.15);
        const opticBody = new THREE.Mesh(opticBodyGeometry, blackMaterial);
        opticBody.position.set(0, 0.1, 0.1);
        rifle.add(opticBody);
        
        // Optic lens
        const lensGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16);
        const lensMaterial = new THREE.MeshStandardMaterial({
            color: 0x0066FF,
            roughness: 0.2,
            metalness: 0.8,
            transparent: true,
            opacity: 0.7
        });
        const lens = new THREE.Mesh(lensGeometry, lensMaterial);
        lens.rotation.x = Math.PI / 2;
        lens.position.set(0, 0.1, 0.17);
        rifle.add(lens);
        
        // Muzzle flash (initially invisible)
        const muzzleGeometry = new THREE.ConeGeometry(0.08, 0.2, 8);
        const muzzleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFF00, 
            transparent: true,
            opacity: 0.8
        });
        this.muzzleFlash = new THREE.Mesh(muzzleGeometry, muzzleMaterial);
        this.muzzleFlash.position.z = 0.95;
        this.muzzleFlash.rotation.x = Math.PI / 2;
        this.muzzleFlash.visible = false;
        rifle.add(this.muzzleFlash);
        
        // Position the rifle in enemy's hands
        rifle.position.set(0.28, 0.4, 0.2);
        rifle.rotation.y = -0.2;
        
        return rifle;
    }

    getNewTargetPosition() {
        const angle = Math.random() * Math.PI * 2;
        const distance = 10 + Math.random() * 20;
        return new THREE.Vector3(
            Math.cos(angle) * distance,
            1,
            Math.sin(angle) * distance
        );
    }

    update(deltaTime, playerPosition) {
        const now = performance.now();

        // Update movement
        const directionToTarget = this.targetPosition.clone().sub(this.position);
        const distanceToTarget = directionToTarget.length();

        // Get new target if we've reached the current one
        if (distanceToTarget < 0.5 || now - this.lastUpdate > this.updateInterval) {
            this.targetPosition = this.getNewTargetPosition();
            this.lastUpdate = now;
        }

        // Move towards target
        if (distanceToTarget > 0.1) {
            directionToTarget.normalize();
            const movement = directionToTarget.multiplyScalar(this.moveSpeed * deltaTime * 60);
            this.position.add(movement);
            
            // Update rotation to face movement direction
            this.rotation.y = Math.atan2(directionToTarget.x, directionToTarget.z);
            this.moving = true;

            // Animate legs while moving
            this.legAngle += deltaTime * 5;
            if (this.leftLeg && this.rightLeg) {
                this.leftLeg.rotation.x = Math.sin(this.legAngle) * 0.4;
                this.rightLeg.rotation.x = Math.sin(this.legAngle + Math.PI) * 0.4;
            }
        } else {
            this.moving = false;
            if (this.leftLeg && this.rightLeg) {
                this.leftLeg.rotation.x = 0;
                this.rightLeg.rotation.x = 0;
            }
        }

        // Update model position and rotation
        this.model.position.copy(this.position);
        this.model.rotation.copy(this.rotation);

        // Random shooting
        if (now - this.lastShot > this.shotCooldown && Math.random() < 0.1) {
            this.shoot();
            this.lastShot = now;
        }
        
        // Update blood particles if any
        this.updateBloodParticles(deltaTime);
    }

    shoot() {
        // Check cooldown and pointer lock
        const now = performance.now();
        if (now - this.lastShot < this.shotCooldown || 
            document.pointerLockElement !== this.container) {
            return;
        }
        
        this.lastShot = now;
        
        // Play rifle sound
        if (this.audioInitialized && this.rifleSound && this.rifleSound.buffer) {
            try {
                const soundClone = this.rifleSound.clone();
                const pitchVariation = 0.9 + Math.random() * 0.2;
                soundClone.setPlaybackRate(pitchVariation);
                soundClone.play();
            } catch (audioError) {
                console.warn('Error playing rifle sound:', audioError);
            }
        }
        
        // Show muzzle flash
        if (this.muzzleFlash) {
            this.muzzleFlash.visible = true;
            setTimeout(() => {
                this.muzzleFlash.visible = false;
            }, 50);
        }
    }

    // Add method to handle taking damage
    takeDamage(amount, hitPosition) {
        this.health -= amount;
        this.lastDamageTime = performance.now();
        
        // Create blood splatter effect
        this.createBloodSplatter(hitPosition);
        
        // Check if enemy is dead
        if (this.health <= 0) {
            // TODO: Implement death animation or removal
            this.model.visible = false;
        }
    }
    
    // Create blood splatter effect
    createBloodSplatter(hitPosition) {
        // Create blood particles
        const particleCount = 20 + Math.floor(Math.random() * 30);
        const bloodColor = 0x8B0000; // Dark red
        
        for (let i = 0; i < particleCount; i++) {
            // Create a small sphere for each blood particle
            const particleGeometry = new THREE.SphereGeometry(0.03 + Math.random() * 0.05, 4, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({ color: bloodColor });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Position at hit location
            particle.position.copy(hitPosition);
            
            // Random velocity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.2,
                (Math.random() - 0.5) * 0.2
            );
            
            // Add to scene and track
            this.scene.add(particle);
            this.bloodParticles.push({
                mesh: particle,
                velocity: velocity,
                gravity: 0.01,
                lifetime: 1 + Math.random() * 2, // 1-3 seconds
                age: 0
            });
        }
    }
    
    // Update blood particles
    updateBloodParticles(deltaTime) {
        const particlesToRemove = [];
        
        // Update each particle
        for (let i = 0; i < this.bloodParticles.length; i++) {
            const particle = this.bloodParticles[i];
            
            // Update age
            particle.age += deltaTime;
            
            // Check if particle should be removed
            if (particle.age >= particle.lifetime) {
                particlesToRemove.push(i);
                continue;
            }
            
            // Apply gravity to velocity
            particle.velocity.y -= particle.gravity * deltaTime;
            
            // Update position
            particle.mesh.position.x += particle.velocity.x * deltaTime * 60;
            particle.mesh.position.y += particle.velocity.y * deltaTime * 60;
            particle.mesh.position.z += particle.velocity.z * deltaTime * 60;
            
            // Check for ground collision
            if (particle.mesh.position.y < 0.05) {
                particle.mesh.position.y = 0.05;
                particle.velocity.y = 0;
                particle.velocity.x *= 0.8; // Friction
                particle.velocity.z *= 0.8; // Friction
            }
            
            // Fade out near end of lifetime
            if (particle.age > particle.lifetime * 0.7) {
                const opacity = 1 - ((particle.age - (particle.lifetime * 0.7)) / (particle.lifetime * 0.3));
                particle.mesh.material.opacity = opacity;
                particle.mesh.material.transparent = true;
            }
        }
        
        // Remove dead particles (in reverse order to avoid index issues)
        for (let i = particlesToRemove.length - 1; i >= 0; i--) {
            const index = particlesToRemove[i];
            const particle = this.bloodParticles[index];
            
            // Remove from scene
            this.scene.remove(particle.mesh);
            
            // Remove from array
            this.bloodParticles.splice(index, 1);
        }
    }

    // Check if a bullet hit this enemy
    checkBulletHit(rayOrigin, rayDirection) {
        // Create a bounding box for the enemy
        const boundingBox = new THREE.Box3().setFromObject(this.model);
        
        // Create a ray
        const ray = new THREE.Ray(rayOrigin, rayDirection);
        
        // Check for intersection
        const intersectionPoint = new THREE.Vector3();
        if (ray.intersectsBox(boundingBox, intersectionPoint)) {
            // Calculate hit position (slightly offset towards the ray origin to appear on the surface)
            const hitPosition = intersectionPoint.clone();
            const toOrigin = rayOrigin.clone().sub(hitPosition).normalize().multiplyScalar(0.05);
            hitPosition.add(toOrigin);
            
            // Apply damage
            this.takeDamage(25, hitPosition);
            return true;
        }
        
        return false;
    }
}

class Game {
    constructor() {
        // Enhanced debug mode
        this.debug = document.getElementById('debug');
        this.debug.style.display = 'block';
        this.debug.innerHTML = 'Initializing game...<br>Checking Three.js: ' + (typeof THREE !== 'undefined' ? 'OK' : 'FAILED');

        // Audio initialized flag
        this.audioInitialized = false;

        try {
            // Core setup
            this.setupCore();
            this.debug.innerHTML += '<br>Core setup complete';
            
            // Initialize game components with error handling
            this.initializeGameComponents();
            
            // Remove fallback cube after successful initialization
            const fallbackCube = this.scene.getObjectByName('fallbackCube');
            if (fallbackCube) {
                this.scene.remove(fallbackCube);
            }
            
            // Start animation loop
            this.animate();
            
            this.debug.innerHTML += '<br>Game running - WASD to move, mouse to look';
        } catch (error) {
            console.error('Game initialization failed:', error);
            this.debug.innerHTML = `Error: ${error.message}<br>Stack: ${error.stack}`;
        }
    }
    
    // Create enemy function - moved here to ensure it's properly defined
    createEnemy() {
        try {
            // Generate a random position away from the player
            const angle = Math.random() * Math.PI * 2;
            const distance = 20 + Math.random() * 30; // Between 20-50 units from center
            const position = new THREE.Vector3(
                Math.cos(angle) * distance,
                1,
                Math.sin(angle) * distance
            );
            
            // Check if position is valid (not inside objects)
            let validPosition = true;
            
            // Check collision with trees
            for (const tree of this.trees) {
                const dx = tree.position.x - position.x;
                const dz = tree.position.z - position.z;
                const distSquared = dx * dx + dz * dz;
                
                if (distSquared < (tree.radius + 1) * (tree.radius + 1)) {
                    validPosition = false;
                    break;
                }
            }
            
            // If position is valid, create the enemy
            if (validPosition) {
                const enemy = new Enemy(this.scene, position);
                this.enemies.push(enemy);
                
                // Pass audio context to enemy if available
                if (this.audioInitialized && this.listener) {
                    enemy.listener = this.listener;
                    enemy.audioInitialized = true;
                }
            } else {
                // Try again with a different position
                this.createEnemy();
            }
        } catch (error) {
            console.error('Error creating enemy:', error);
            this.debug.innerHTML += `<br>Error creating enemy: ${error.message}`;
        }
    }
    
    // Initialize all game components with proper error handling
    initializeGameComponents() {
        // Initialize arrays before using them
        this.trees = [];
        this.enemies = [];
        this.dinosaurs = [];
        this.maxEnemies = 1; // Just one enemy as requested
        
        // Initialize camera angles before player creation
        this.cameraAngles = {
            vertical: 0,
            horizontal: 0
        };
        
        // Create environment with error handling
        try {
            this.createEnvironment();
            this.debug.innerHTML += '<br>Environment created';
        } catch (envError) {
            console.error('Environment creation failed:', envError);
            this.debug.innerHTML += `<br>Environment creation failed: ${envError.message}`;
            throw envError; // Rethrow to prevent further initialization
        }
        
        // Create player with error handling
        try {
            this.createPlayer();
            this.debug.innerHTML += '<br>Player created';
        } catch (playerError) {
            console.error('Player creation failed:', playerError);
            this.debug.innerHTML += `<br>Player creation failed: ${playerError.message}`;
            throw playerError;
        }
        
        // Setup controls with error handling
        try {
            this.setupControls();
            this.debug.innerHTML += '<br>Controls setup complete';
        } catch (controlsError) {
            console.error('Controls setup failed:', controlsError);
            this.debug.innerHTML += `<br>Controls setup failed: ${controlsError.message}`;
            throw controlsError;
        }
        
        // Audio setup will be initialized on first user interaction
        this.prepareAudioForLaterInitialization();
        this.debug.innerHTML += '<br>Audio will initialize on first interaction';
        
        // Create enemies after environment is set up - but make it optional
        if (typeof this.createEnemy === 'function') {
            try {
                for (let i = 0; i < this.maxEnemies; i++) {
                    this.createEnemy();
                }
                this.debug.innerHTML += '<br>Enemies created';
            } catch (enemyError) {
                console.error('Enemy creation failed:', enemyError);
                this.debug.innerHTML += `<br>Enemy creation failed: ${enemyError.message}`;
                // Don't throw here - game can still run without enemies
            }
        } else {
            console.warn('createEnemy function not available - skipping enemy creation');
            this.debug.innerHTML += '<br>Enemy creation skipped (function not available)';
        }
        
        // Create dinosaur
        if (typeof this.createDinosaur === 'function') {
            try {
                this.createDinosaur();
                this.debug.innerHTML += '<br>Dinosaur created';
            } catch (dinoError) {
                console.error('Dinosaur creation failed:', dinoError);
                this.debug.innerHTML += `<br>Dinosaur creation failed: ${dinoError.message}`;
                // Don't throw here - game can still run without dinosaur
            }
        }
        
        // Hide loading screen
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }
    
    setupCore() {
        // Get container
        this.container = document.getElementById('gameContainer');
        if (!this.container) throw new Error('No game container found');
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(Constants.COLORS.SKY);
        this.scene.fog = new THREE.FogExp2(0x88BBEE, Constants.GAME.FOG_DENSITY);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            70, // FOV
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 5, 10);
        
        // Create renderer with updated properties for Three.js compatibility
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(Constants.COLORS.SKY);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Set modern properties (not deprecated ones)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.useLegacyLights = false;
        
        this.container.appendChild(this.renderer.domElement);

        // Add a temporary fallback cube for visibility testing
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(0, 0, 0);
        cube.name = 'fallbackCube';
        this.scene.add(cube);
        
        // Do a test render
        this.renderer.render(this.scene, this.camera);
        this.debug.innerHTML += '<br>Test render complete';
        
        // Handle window resizing
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    // New method to prepare audio but defer actual initialization
    prepareAudioForLaterInitialization() {
        // Create audio listener and attach to camera
        this.listener = new THREE.AudioListener();
        this.camera.add(this.listener);
        
        // Create empty rifle sound container
        this.rifleSound = null;
        this.footstepSounds = [];
        
        // Setup event for first user interaction to initialize audio
        const initAudioOnFirstInteraction = () => {
            try {
                // Check if audio is already initialized
                if (this.audioInitialized) return;
                
                // Try to resume audio context if it exists but is suspended
                if (this.listener && this.listener.context && this.listener.context.state !== 'running') {
                    this.listener.context.resume().then(() => {
                        console.log('AudioContext resumed successfully');
                        this.setupAudio();
                        this.audioInitialized = true;
                        this.debug.innerHTML += '<br>Audio initialized after user interaction';
                    }).catch(err => {
                        console.error('Failed to resume AudioContext:', err);
                    });
                } else {
                    // Normal initialization
                    this.setupAudio();
                    this.audioInitialized = true;
                    this.debug.innerHTML += '<br>Audio initialized after user interaction';
                }
            } catch (audioError) {
                console.error('Audio initialization failed:', audioError);
                this.debug.innerHTML += `<br>Audio initialization failed: ${audioError.message}`;
            }
        };
        
        // Listen for user interaction to initialize audio
        document.addEventListener('click', initAudioOnFirstInteraction);
        document.addEventListener('keydown', initAudioOnFirstInteraction);
        
        // Also try to initialize on visibility change (for when tab becomes visible)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.listener && this.listener.context) {
                this.listener.context.resume().catch(e => {
                    console.warn('Could not resume audio context on visibility change:', e);
                });
            }
        });
    }
    
    setupAudio() {
        try {
            // Make sure listener is available
            if (!this.listener) {
                console.warn('AudioListener not available, creating new one');
                this.listener = new THREE.AudioListener();
                this.camera.add(this.listener);
            }
            
            // Create the rifle sound
            this.rifleSound = new THREE.Audio(this.listener);
            
            // Make sure listener and context are available
            if (!this.listener || !this.listener.context) {
                console.warn('AudioListener or AudioContext not available');
                return;
            }
            
            // Try to resume the audio context if it's suspended
            if (this.listener.context.state === 'suspended') {
                this.listener.context.resume().catch(e => {
                    console.warn('Could not resume audio context during setup:', e);
                });
            }
            
            // Create AudioContext
            const audioContext = this.listener.context;
            
            // Create a buffer for our gun sound
            const sampleRate = audioContext.sampleRate;
            const duration = 0.6; // Longer sound duration for more impact
            const bufferSize = sampleRate * duration;
            const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
            
            // Get the channel data for processing
            const channelData = buffer.getChannelData(0);
            
            // Generate a more powerful gunshot sound
            // Initial explosion/crack (high amplitude noise)
            const attackTime = sampleRate * 0.02; // 20ms attack
            for (let i = 0; i < attackTime; i++) {
                channelData[i] = (Math.random() * 2 - 1) * 0.95; // Higher amplitude white noise
            }
            
            // Add a powerful bass thump
            for (let i = 0; i < attackTime; i++) {
                const index = i;
                const bassFreq = 60; // Low frequency in Hz
                const bassAmplitude = 0.8 * (1 - i / attackTime);
                channelData[index] += Math.sin(i * (bassFreq / sampleRate) * Math.PI * 2) * bassAmplitude;
            }
            
            // Quick decay with lower frequency components
            const decayTime = sampleRate * 0.08; // 80ms decay
            for (let i = 0; i < decayTime; i++) {
                const index = i + attackTime;
                const amplitude = 0.9 * (1 - i / decayTime);
                // Add some lower frequency components for more "boom"
                const lowFreq = Math.sin(i * 0.01) * 0.5;
                const midFreq = Math.sin(i * 0.03) * 0.3;
                channelData[index] = ((Math.random() * 2 - 1) + lowFreq + midFreq) * amplitude;
            }
            
            // Reverb/echo tail with filtered noise
            const reverbStart = attackTime + decayTime;
            const reverbTime = bufferSize - reverbStart;
            for (let i = 0; i < reverbTime; i++) {
                const index = i + reverbStart;
                const amplitude = 0.4 * Math.exp(-4.0 * i / reverbTime);
                // Add filtered noise for more realistic reverb
                const noise = (Math.random() * 2 - 1) * 0.6;
                const filtered = (noise + (index > 0 ? channelData[index - 1] : 0)) * 0.5;
                channelData[index] = filtered * amplitude;
            }
            
            // Add a mechanical "click" sound at the beginning
            const clickTime = sampleRate * 0.01;
            for (let i = 0; i < clickTime; i++) {
                const index = i;
                const clickFreq = 2000; // High frequency in Hz
                const clickAmplitude = 0.3 * (1 - i / clickTime);
                channelData[index] += Math.sin(i * (clickFreq / sampleRate) * Math.PI * 2) * clickAmplitude;
            }
            
            // Set the buffer to our audio
            this.rifleSound.setBuffer(buffer);
            this.rifleSound.setVolume(1.0); // Louder volume
            
            // Add some processing for more impact
            const compressor = audioContext.createDynamicsCompressor();
            compressor.threshold.setValueAtTime(-30, audioContext.currentTime);
            compressor.knee.setValueAtTime(40, audioContext.currentTime);
            compressor.ratio.setValueAtTime(12, audioContext.currentTime);
            compressor.attack.setValueAtTime(0, audioContext.currentTime);
            compressor.release.setValueAtTime(0.25, audioContext.currentTime);
            
            this.rifleSound.setFilter(compressor);
            
            // Create footstep sounds
            this.footstepSounds = [];
            for (let i = 0; i < 4; i++) {
                this.createFootstepSound(i);
            }
            
            this.lastFootstepTime = 0;
            this.footstepInterval = 350; // ms between footsteps
            
            this.debug.innerHTML += '<br>Audio initialized successfully';
            this.audioInitialized = true;
        } catch (error) {
            console.error('Error setting up audio:', error);
            this.debug.innerHTML += `<br>Audio setup error: ${error.message}`;
        }
    }
    
    // Create a single footstep sound variation
    createFootstepSound(variation) {
        if (!this.listener || !this.listener.context) return;
        
        try {
            const footstepSound = new THREE.Audio(this.listener);
            const audioContext = this.listener.context;
            
            // Create a buffer for our footstep sound - longer for more realistic boot sound
            const sampleRate = audioContext.sampleRate;
            const duration = 0.3; // longer duration for boots (was 0.15)
            const bufferSize = sampleRate * duration;
            const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
            
            // Get the channel data for processing
            const channelData = buffer.getChannelData(0);
            
            // Generate a more realistic boot on grass sound
            const attackTime = sampleRate * 0.03; // 30ms attack for heavier boot sound
            
            // Different "materials" for variety - deeper tones for boots
            let baseTone = 0.15 + (variation * 0.05); // Lower frequency for boots
            let toneDecay = 0.5 - (variation * 0.05);
            
            // Initial impact - heavier for boots
            for (let i = 0; i < attackTime; i++) {
                // Sharper attack for boot impact with some randomness
                const phase = i / attackTime; 
                const amplitude = 0.9 * (1 - phase) * (Math.random() * 0.3 + 0.7);
                channelData[i] = Math.sin(i * baseTone) * amplitude;
            }
            
            // Decay part - longer for boots crushing grass
            const decayStart = attackTime;
            const decayTime = bufferSize - decayStart;
            
            for (let i = 0; i < decayTime; i++) {
                const index = i + decayStart;
                const phase = i / decayTime;
                
                // Slower decay for boots
                const amplitude = 0.7 * Math.exp(-4.0 * phase);
                
                // Add more noise to simulate grass crushing under boots
                const grassCrush = (Math.random() * 2 - 1) * 0.4 * (1 - phase);
                
                // Add a subtle "squish" effect for wet grass
                const squishEffect = Math.sin(i * 0.1) * 0.1 * Math.exp(-8.0 * phase);
                
                // Mix tone, noise and squish for realistic boot on grass
                channelData[index] = (Math.sin(i * baseTone * toneDecay) * amplitude) + 
                                     (grassCrush * amplitude) + 
                                     squishEffect;
            }
            
            // Set the buffer to our audio
            footstepSound.setBuffer(buffer);
            footstepSound.setVolume(0.6); // Higher volume for boots
            
            // Add to footstep sounds array
            this.footstepSounds.push(footstepSound);
        } catch (error) {
            console.error('Error creating footstep sound:', error);
        }
    }
    
    // Play a random footstep sound
    playFootstepSound() {
        // Skip if audio not initialized or no footstep sounds available
        if (!this.audioInitialized || !this.footstepSounds || this.footstepSounds.length === 0) {
            return;
        }
        
        const now = performance.now();
        if (now - this.lastFootstepTime < this.footstepInterval) return;
        
        this.lastFootstepTime = now;
        
        try {
            // Check if audio context is available and running
            if (!this.listener || !this.listener.context) {
                console.warn('AudioListener or AudioContext not available for footstep sound');
                return;
            }
            
            // Ensure audio context is running (might be suspended on some browsers)
            if (this.listener.context.state !== 'running') {
                this.listener.context.resume().catch(e => {
                    console.warn('Could not resume audio context:', e);
                });
                return; // Skip this footstep, will play on next step if context is resumed
            }
            
            // Pick a random footstep sound
            const soundIndex = Math.floor(Math.random() * this.footstepSounds.length);
            const footstepSound = this.footstepSounds[soundIndex];
            
            if (footstepSound && footstepSound.buffer) {
                // Create a new Audio instance instead of cloning
                const newSound = new THREE.Audio(this.listener);
                newSound.setBuffer(footstepSound.buffer);
                
                // Add slight random pitch variation for realism - lower for boots
                const pitchVariation = 0.7 + Math.random() * 0.2; // 0.7-0.9 (lower pitch for boots)
                newSound.setPlaybackRate(pitchVariation);
                
                // Add a low-pass filter for more realistic boot sound
                if (this.listener.context) {
                    const filter = this.listener.context.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.value = 1000 + Math.random() * 500;
                    
                    // Connect through the filter
                    newSound.setFilter(filter);
                }
                
                newSound.play();
            }
        } catch (audioError) {
            console.warn('Error playing footstep sound:', audioError);
        }
    }
    
    createEnvironment() {
        // Create ground with better material and grass texture
        const groundSize = Constants.GAME.GROUND_SIZE;
        const groundTexture = this.createGrassTexture();
        
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: Constants.COLORS.GROUND,
            roughness: 0.8,
            metalness: 0.2,
            map: groundTexture
        });
        
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
        
        // Add 3D grass to the ground
        this.addGrassToGround();
        
        // Add scenic hill with path
        this.createScenicHill();
        
        // Add trees using better materials
        this.trees = [];
        this.createSimpleTrees();
        
        // Add improved log cabin
        this.createLogCabin();
        
        // Add improved lighting
        this.createSimpleLighting();
    }
    
    // Add 3D grass to the ground
    addGrassToGround() {
        const groundSize = Constants.GAME.GROUND_SIZE;
        const grassCount = 5000; // Number of grass patches
        
        // Create grass geometry - a thin blade shape
        const grassGeometry = new THREE.PlaneGeometry(0.1, 0.8); // Much thinner
        
        // Create grass materials with different shades
        const grassMaterials = [
            new THREE.MeshStandardMaterial({
                color: 0x4a5d32, // Dark green
                roughness: 1.0,
                metalness: 0.0,
                side: THREE.DoubleSide
            }),
            new THREE.MeshStandardMaterial({
                color: 0x5a6b3c, // Medium green
                roughness: 1.0,
                metalness: 0.0,
                side: THREE.DoubleSide
            }),
            new THREE.MeshStandardMaterial({
                color: 0x6b7a45, // Light green
                roughness: 1.0,
                metalness: 0.0,
                side: THREE.DoubleSide
            })
        ];
        
        // Create grass instances
        for (let i = 0; i < grassCount; i++) {
            // Generate random position on the ground
            const x = (Math.random() - 0.5) * (groundSize - 5);
            const z = (Math.random() - 0.5) * (groundSize - 5);
            
            // Skip grass near the cabin
            if (x > -25 && x < -15 && z > -15 && z < -5) {
                continue;
            }
            
            // Skip grass near the hill
            const distToHill = Math.sqrt(Math.pow(x - 50, 2) + Math.pow(z - (-30), 2));
            if (distToHill < 30) {
                continue;
            }
            
            // Create a cluster of thin grass blades
            const grassCluster = new THREE.Group();
            
            // Randomly select a grass material
            const materialIndex = Math.floor(Math.random() * grassMaterials.length);
            
            // Create 3-5 blades per cluster for more realistic look
            const bladeCount = 3 + Math.floor(Math.random() * 3);
            
            for (let j = 0; j < bladeCount; j++) {
                // Create a single blade
                const blade = new THREE.Mesh(grassGeometry, grassMaterials[materialIndex]);
                
                // Randomize blade properties
                const bladeScale = 0.5 + Math.random() * 0.7;
                blade.scale.set(1, bladeScale, 1);
                
                // Slight random position within cluster
                blade.position.set(
                    (Math.random() - 0.5) * 0.2,
                    0,
                    (Math.random() - 0.5) * 0.2
                );
                
                // Random rotation for natural look
                blade.rotation.y = Math.random() * Math.PI;
                
                // Add slight curve to blade
                blade.rotation.x = -0.1 + Math.random() * 0.2;
                
                grassCluster.add(blade);
            }
            
            // Position grass cluster on ground
            grassCluster.position.set(x, 0.2, z);
            
            // Add slight random tilt
            grassCluster.rotation.x = (Math.random() * 0.1);
            grassCluster.rotation.z = (Math.random() - 0.5) * 0.1;
            
            this.scene.add(grassCluster);
        }
    }
    
    createScenicHill() {
        // Create the hill using a heightmap
        const hillSize = 60;
        const hillSegments = 100;
        const hillHeight = 25;
        const hillGeometry = new THREE.PlaneGeometry(hillSize, hillSize, hillSegments, hillSegments);
        
        // Generate height data for the hill
        const vertices = hillGeometry.attributes.position.array;
        const pathPoints = [];
        
        // Create a winding path up the hill
        for (let i = 0; i <= 10; i++) {
            const t = i / 10;
            const angle = t * Math.PI * 1.5; // Winding factor
            const radius = (1 - t) * hillSize * 0.4;
            pathPoints.push(new THREE.Vector3(
                Math.cos(angle) * radius,
                t * hillHeight,
                Math.sin(angle) * radius
            ));
        }
        
        // Create a smooth curve for the path
        const pathCurve = new THREE.CatmullRomCurve3(pathPoints);
        
        // Modify vertices to create hill and path
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            
            // Distance from center
            const distance = Math.sqrt(x * x + z * z);
            const maxDistance = hillSize * 0.5;
            
            // Calculate base height using smooth falloff
            let height = Math.cos(distance / maxDistance * Math.PI * 0.5);
            height = Math.max(0, height) * hillHeight;
            
            // Add some noise for natural look
            height += (Math.random() * 0.5 - 0.25) * (height / hillHeight) * 2;
            
            // Check if point is near the path
            const nearestPoint = pathCurve.getPointAt(
                pathCurve.getUtoTmapping(0, distance / maxDistance)
            );
            const distanceToPath = Math.sqrt(
                Math.pow(x - nearestPoint.x, 2) + 
                Math.pow(z - nearestPoint.z, 2)
            );
            
            // Flatten area around path
            if (distanceToPath < 2) {
                const pathBlend = (2 - distanceToPath) / 2;
                height = nearestPoint.y + (height - nearestPoint.y) * (1 - pathBlend);
            }
            
            vertices[i + 1] = height;
        }
        
        // Update geometry
        hillGeometry.computeVertexNormals();
        
        // Create hill texture with grass detail
        const textureLoader = new THREE.TextureLoader();
        const grassTexture = this.createGrassTexture();
        
        // Create materials with proper textures
        const hillMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a5d32, // Base green for hill
            roughness: 0.8,
            metalness: 0.1,
            map: grassTexture,
            displacementScale: 0.5,
            displacementBias: -0.2
        });
        
        // Create hill mesh
        const hill = new THREE.Mesh(hillGeometry, hillMaterial);
        hill.rotation.x = -Math.PI / 2;
        hill.position.set(50, 0, -30); // Position the hill
        hill.castShadow = true;
        hill.receiveShadow = true;
        this.scene.add(hill);
        
        // Create the dirt path
        const pathWidth = 2;
        const pathPoints2D = [];
        for (let i = 0; i <= 100; i++) {
            const point = pathCurve.getPointAt(i / 100);
            pathPoints2D.push(new THREE.Vector2(point.x, point.z));
        }
        
        const pathShape = new THREE.Shape();
        const pathGeometry = new THREE.BufferGeometry();
        const pathVertices = [];
        const pathNormals = [];
        
        // Generate vertices for the path
        for (let i = 0; i < pathPoints2D.length - 1; i++) {
            const current = pathPoints2D[i];
            const next = pathPoints2D[i + 1];
            const direction = next.clone().sub(current).normalize();
            const normal = new THREE.Vector2(-direction.y, direction.x);
            
            // Create path vertices
            pathVertices.push(
                current.x + normal.x * pathWidth, 0, current.y + normal.y * pathWidth,
                current.x - normal.x * pathWidth, 0, current.y - normal.y * pathWidth,
                next.x + normal.x * pathWidth, 0, next.y + normal.y * pathWidth,
                next.x - normal.x * pathWidth, 0, next.y - normal.y * pathWidth
            );
            
            // Add normals
            for (let j = 0; j < 4; j++) {
                pathNormals.push(0, 1, 0);
            }
        }
        
        // Create path geometry
        pathGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pathVertices, 3));
        pathGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(pathNormals, 3));
        
        // Create path material with dirt texture
        const pathMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // Dirt brown
            roughness: 1,
            metalness: 0
        });
        
        // Create path mesh
        const path = new THREE.Mesh(pathGeometry, pathMaterial);
        path.position.copy(hill.position);
        path.position.y += 0.01; // Slightly above the hill to prevent z-fighting
        path.receiveShadow = true;
        this.scene.add(path);
        
        // Add 3D grass on the hill
        this.addGrassToHill(hill, pathCurve, hillSize, hillHeight);
        
        // Add trees on the hill
        this.createHillTrees(hill, pathCurve, hillSize, hillHeight);
    }
    
    // Create a procedural grass texture
    createGrassTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Base green color
        ctx.fillStyle = '#4a5d32';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add grass texture details
        const grassColors = [
            '#4a5d32', // Dark green
            '#5a6b3c', // Medium green
            '#6b7a45', // Light green
            '#3c4f28', // Very dark green
            '#7d8a50'  // Yellow-green
        ];
        
        // Draw grass blades
        for (let i = 0; i < 5000; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const width = 0.5 + Math.random() * 1; // Thinner blades
            const height = 5 + Math.random() * 15; // Longer blades
            const colorIndex = Math.floor(Math.random() * grassColors.length);
            
            ctx.fillStyle = grassColors[colorIndex];
            ctx.beginPath();
            
            // Draw a blade of grass (slightly curved)
            const controlX = x + (Math.random() * 4 - 2);
            ctx.moveTo(x, y + height);
            ctx.quadraticCurveTo(controlX, y + height/2, x, y);
            ctx.lineTo(x + width, y);
            ctx.quadraticCurveTo(controlX + width, y + height/2, x + width, y + height);
            ctx.fill();
        }
        
        // Add some soil/dirt patches
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = 3 + Math.random() * 8;
            
            ctx.fillStyle = `rgba(101, 67, 33, ${Math.random() * 0.2})`;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        
        return texture;
    }
    
    // Add 3D grass to the hill
    addGrassToHill(hill, pathCurve, hillSize, hillHeight) {
        const hillCenter = hill.position;
        const grassCount = 2000; // Number of grass patches
        
        // Create grass geometry - a thin blade shape
        const grassGeometry = new THREE.PlaneGeometry(0.1, 1.2); // Much thinner
        
        // Create grass material with alpha for transparency
        const grassMaterial = new THREE.MeshStandardMaterial({
            color: 0x5a6b3c,
            roughness: 1.0,
            metalness: 0.0,
            side: THREE.DoubleSide
        });
        
        // Create grass instances
        for (let i = 0; i < grassCount; i++) {
            // Generate random position on the hill
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * hillSize * 0.48; // Keep within hill bounds
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            // Calculate height at this point
            const distance = Math.sqrt(x * x + z * z);
            const maxDistance = hillSize * 0.5;
            let height = Math.cos(distance / maxDistance * Math.PI * 0.5);
            height = Math.max(0, height) * hillHeight;
            
            // Check distance from path
            const nearestPoint = pathCurve.getPointAt(
                pathCurve.getUtoTmapping(0, distance / maxDistance)
            );
            const distanceToPath = Math.sqrt(
                Math.pow(x - nearestPoint.x, 2) + 
                Math.pow(z - nearestPoint.z, 2)
            );
            
            // Only place grass if it's not too close to the path
            if (distanceToPath > 1.5) {
                // Create a cluster of thin grass blades
                const grassCluster = new THREE.Group();
                
                // Create 3-5 blades per cluster for more realistic look
                const bladeCount = 3 + Math.floor(Math.random() * 3);
                
                for (let j = 0; j < bladeCount; j++) {
                    // Create a single blade
                    const blade = new THREE.Mesh(grassGeometry, grassMaterial);
                    
                    // Randomize blade properties
                    const bladeScale = 0.5 + Math.random() * 0.7;
                    blade.scale.set(1, bladeScale, 1);
                    
                    // Slight random position within cluster
                    blade.position.set(
                        (Math.random() - 0.5) * 0.2,
                        0,
                        (Math.random() - 0.5) * 0.2
                    );
                    
                    // Random rotation for natural look
                    blade.rotation.y = Math.random() * Math.PI;
                    
                    // Add slight curve to blade
                    blade.rotation.x = -0.1 + Math.random() * 0.2;
                    
                    grassCluster.add(blade);
                }
                
                // Position grass cluster on hill
                grassCluster.position.set(
                    hillCenter.x + x,
                    hillCenter.y + height + 0.1, // Slightly above ground
                    hillCenter.z + z
                );
                
                // Add slight random tilt based on hill slope
                const slopeAngle = 0.2 * (1 - height / hillHeight);
                grassCluster.rotation.x = (Math.random() * 0.1) + slopeAngle;
                grassCluster.rotation.z = (Math.random() - 0.5) * 0.1;
                
                this.scene.add(grassCluster);
            }
        }
    }
    
    createHillTrees(hill, pathCurve, hillSize, hillHeight) {
        const treeCount = 100; // Number of trees to add on the hill
        const hillCenter = hill.position;
        
        for (let i = 0; i < treeCount; i++) {
            // Generate random position on the hill
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * hillSize * 0.45; // Keep within hill bounds
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            // Calculate height at this point
            const distance = Math.sqrt(x * x + z * z);
            const maxDistance = hillSize * 0.5;
            let height = Math.cos(distance / maxDistance * Math.PI * 0.5);
            height = Math.max(0, height) * hillHeight;
            
            // Check distance from path
            const nearestPoint = pathCurve.getPointAt(
                pathCurve.getUtoTmapping(0, distance / maxDistance)
            );
            const distanceToPath = Math.sqrt(
                Math.pow(x - nearestPoint.x, 2) + 
                Math.pow(z - nearestPoint.z, 2)
            );
            
            // Only place trees if they're not too close to the path
            if (distanceToPath > 3) {
                const tree = new THREE.Group();
                
                // Create tree with size variation based on height
                const heightFactor = height / hillHeight;
                const trunkHeight = (1.5 + Math.random()) * (0.8 + heightFactor * 0.4);
                
                // Create trunk
                const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.2, trunkHeight, 8);
                const trunkMaterial = new THREE.MeshStandardMaterial({
                    color: Constants.COLORS.TREE_TRUNK,
                    roughness: 0.9,
                    metalness: 0.1
                });
                const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
                trunk.position.y = trunkHeight / 2;
                trunk.castShadow = true;
                trunk.receiveShadow = true;
                tree.add(trunk);
                
                // Create foliage layers
                const foliageMaterial = new THREE.MeshStandardMaterial({
                    color: Constants.COLORS.TREE_FOLIAGE,
                    roughness: 0.8,
                    metalness: 0.05
                });
                
                const layers = 2 + Math.floor(Math.random() * 2);
                const maxRadius = (0.8 + Math.random() * 0.4) * (0.8 + heightFactor * 0.4);
                
                for (let j = 0; j < layers; j++) {
                    const layerHeight = 1 + Math.random() * 0.3;
                    const layerRadius = maxRadius * (1 - j / layers * 0.3);
                    
                    const foliageGeometry = new THREE.ConeGeometry(layerRadius, layerHeight, 8);
                    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
                    
                    foliage.position.y = trunkHeight * 0.6 + j * layerHeight * 0.7;
                    foliage.castShadow = true;
                    foliage.receiveShadow = true;
                    tree.add(foliage);
                }
                
                // Position tree on hill
                tree.position.set(
                    hillCenter.x + x,
                    hillCenter.y + height,
                    hillCenter.z + z
                );
                
                // Random rotation
                tree.rotation.y = Math.random() * Math.PI * 2;
                
                // Add slight tilt based on height
                const tiltAngle = (1 - heightFactor) * 0.2;
                tree.rotation.x = (Math.random() - 0.5) * tiltAngle;
                tree.rotation.z = (Math.random() - 0.5) * tiltAngle;
                
                this.scene.add(tree);
                
                // Store for collision detection
                this.trees.push({
                    position: new THREE.Vector3(
                        hillCenter.x + x,
                        hillCenter.y + height,
                        hillCenter.z + z
                    ),
                    radius: maxRadius * 0.8
                });
            }
        }
    }
    
    createSimpleTrees() {
        // Create more realistic pine trees
        const treeCount = 40;
        
        for (let i = 0; i < treeCount; i++) {
            const tree = new THREE.Group();
            
            // Tree trunk with better material
            const trunkHeight = 2 + Math.random() * 2;
            const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, trunkHeight, 8);
            const trunkMaterial = new THREE.MeshStandardMaterial({ 
                color: Constants.COLORS.TREE_TRUNK,
                roughness: 0.9,
                metalness: 0.1
            });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.y = trunkHeight / 2;
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            tree.add(trunk);
            
            // Create multiple layers of foliage for pine tree
            const foliageMaterial = new THREE.MeshStandardMaterial({ 
                color: Constants.COLORS.TREE_FOLIAGE,
                roughness: 0.8,
                metalness: 0.05
            });
            
            // Each tree gets 3-5 layers of foliage
            const foliageLayers = 3 + Math.floor(Math.random() * 2);
            const maxRadius = 1.4 + Math.random() * 0.6;
            
            for (let j = 0; j < foliageLayers; j++) {
                // Calculate position and size for this layer
                const layerHeight = 1.2 + Math.random() * 0.5;
                const layerRadius = maxRadius * (1 - j / foliageLayers * 0.4);
                
                // Create pine foliage cone
                const foliageGeometry = new THREE.ConeGeometry(layerRadius, layerHeight, 8);
                const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
                
                // Position each cone with slight variations
                const layerPosition = trunkHeight * 0.5 + j * layerHeight * 0.7;
                foliage.position.y = layerPosition;
                
                foliage.castShadow = true;
                foliage.receiveShadow = true;
                tree.add(foliage);
            }
            
            // Position tree randomly in forest
            let validPosition = false;
            let x, z;
            
            // Keep trying until we find a valid position
            while (!validPosition) {
                validPosition = true;
                
                // Generate random position
                const radius = 15 + Math.random() * 40; // Between 15-55 units from center
                const angle = Math.random() * Math.PI * 2;
                x = Math.cos(angle) * radius;
                z = Math.sin(angle) * radius;
                
                // Ensure trees aren't too close to cabin
                if (x > -25 && x < -15 && z > -15 && z < -5) {
                    validPosition = false;
                    continue;
                }
                
                // Ensure trees aren't too close to each other
                for (const existingTree of this.trees) {
                    const dx = existingTree.position.x - x;
                    const dz = existingTree.position.z - z;
                    const distSquared = dx * dx + dz * dz;
                    
                    if (distSquared < 25) { // Min distance of 5 units between tree centers
                        validPosition = false;
                        break;
                    }
                }
            }
            
            // Randomize tree size
            const scale = 0.7 + Math.random() * 0.6; // 0.7-1.3 scale
            tree.scale.set(scale, scale, scale);
            
            // Position tree
            tree.position.set(x, 0, z);
            
            // Store tree for collision detection
            this.trees.push({
                position: new THREE.Vector3(x, 0, z),
                radius: 0.8 * scale // Collision radius
            });
            
            this.scene.add(tree);
        }
    }
    
    createLogCabin() {
        const cabin = new THREE.Group();
        
        // Cabin base/foundation
        const baseGeometry = new THREE.BoxGeometry(12, 0.5, 10);
        const stoneMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x777777,
            roughness: 0.9,
            metalness: 0.1
        });
        const base = new THREE.Mesh(baseGeometry, stoneMaterial);
        base.position.y = 0.25;
        base.receiveShadow = true;
        cabin.add(base);
        
        // Log material with more detail
        const logMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.9,
            metalness: 0.05
        });
        
        // Create walls using horizontal logs (cylinders)
        const wallHeight = 4; // Increased height for more logs
        const logRadius = 0.15; // Slightly smaller logs
        const logCount = Math.floor(wallHeight / (logRadius * 2)); // More logs due to increased height
        
        // Function to create a log wall with more detail
        const createLogWall = (width, depth, posX, posZ, rotation) => {
            const logLength = rotation ? depth : width;
            
            for (let i = 0; i < logCount; i++) {
                const logGeometry = new THREE.CylinderGeometry(logRadius, logRadius, logLength, 8);
                const log = new THREE.Mesh(logGeometry, logMaterial);
                
                // Position log correctly
                log.position.y = (i * logRadius * 2) + logRadius + 0.5; // +0.5 for foundation height
                log.position.x = posX;
                log.position.z = posZ;
                
                // Rotate log to be horizontal and in correct orientation
                log.rotation.z = Math.PI / 2; // Make cylinder horizontal
                if (rotation) {
                    log.rotation.y = Math.PI / 2; // Rotate 90 degrees for side walls
                }
                
                // Add slight random offset to each log for more realistic look
                log.position.y += Math.random() * 0.02 - 0.01;
                if (rotation) {
                    log.position.z += Math.random() * 0.04 - 0.02;
                } else {
                    log.position.x += Math.random() * 0.04 - 0.02;
                }
                
                log.castShadow = true;
                log.receiveShadow = true;
                cabin.add(log);
                
                // Add log ends for more realism on front and back walls
                if (!rotation) {
                    const leftEndGeometry = new THREE.CylinderGeometry(logRadius, logRadius, 0.1, 8);
                    const rightEndGeometry = new THREE.CylinderGeometry(logRadius, logRadius, 0.1, 8);
                    
                    const leftEnd = new THREE.Mesh(leftEndGeometry, logMaterial);
                    const rightEnd = new THREE.Mesh(rightEndGeometry, logMaterial);
                    
                    leftEnd.rotation.x = Math.PI / 2;
                    rightEnd.rotation.x = Math.PI / 2;
                    
                    leftEnd.position.set(posX - logLength/2, log.position.y, posZ);
                    rightEnd.position.set(posX + logLength/2, log.position.y, posZ);
                    
                    leftEnd.castShadow = true;
                    rightEnd.castShadow = true;
                    
                    cabin.add(leftEnd);
                    cabin.add(rightEnd);
                }
            }
        };
        
        // Front wall with door frame
        createLogWall(10, 8, 0, 4, false);
        
        // Back wall
        createLogWall(10, 8, 0, -4, false);
        
        // Left wall
        createLogWall(8, 8, 5, 0, true);
        
        // Right wall
        createLogWall(8, 8, -5, 0, true);
        
        // Create door
        const doorGeometry = new THREE.BoxGeometry(2, 2.5, 0.1);
        const doorMaterial = new THREE.MeshStandardMaterial({
            color: 0x6D4C41,
            roughness: 0.7,
            metalness: 0.2
        });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, 1.75, 4.05);
        door.castShadow = true;
        door.receiveShadow = true;
        cabin.add(door);
        
        // Add door handle
        const handleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const handleMaterial = new THREE.MeshStandardMaterial({
            color: 0xB87333,
            roughness: 0.5,
            metalness: 0.7
        });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.set(0.6, 1.5, 4.11);
        cabin.add(handle);
        
        // Create windows
        const createWindow = (posX, posZ, rotY) => {
            // Window frame
            const frameGeometry = new THREE.BoxGeometry(1.5, 1.5, 0.1);
            const frameMaterial = new THREE.MeshStandardMaterial({
                color: 0x6D4C41,
                roughness: 0.7,
                metalness: 0.2
            });
            const frame = new THREE.Mesh(frameGeometry, frameMaterial);
            frame.position.set(posX, 2, posZ);
            frame.rotation.y = rotY;
            frame.castShadow = true;
            frame.receiveShadow = true;
            cabin.add(frame);
            
            // Window glass
            const glassGeometry = new THREE.BoxGeometry(1.2, 1.2, 0.05);
            const glassMaterial = new THREE.MeshStandardMaterial({
                color: 0xD4F1F9,
                roughness: 0.2,
                metalness: 0.8,
                transparent: true,
                opacity: 0.6
            });
            const glass = new THREE.Mesh(glassGeometry, glassMaterial);
            glass.position.set(posX, 2, posZ);
            if (rotY === 0) {
                glass.position.z += 0.04;
            } else {
                glass.position.x += 0.04;
            }
            glass.rotation.y = rotY;
            cabin.add(glass);
        };
        
        // Add windows to each wall
        createWindow(-3, 4.05, 0); // Front
        createWindow(3, 4.05, 0);  // Front
        createWindow(0, -4.05, 0); // Back
        createWindow(5.05, 2, Math.PI/2); // Left
        createWindow(5.05, -2, Math.PI/2); // Left
        createWindow(-5.05, 0, Math.PI/2); // Right
        
        // Create smaller, simpler roof
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B0000,
            roughness: 0.7,
            metalness: 0.1
        });
        
        // Create a simple peaked roof instead of large panels
        // Center ridge beam
        const ridgeGeometry = new THREE.BoxGeometry(0.3, 0.3, 10);
        const ridge = new THREE.Mesh(ridgeGeometry, logMaterial);
        ridge.position.set(0, wallHeight + 0.6, 0);
        ridge.castShadow = true;
        cabin.add(ridge);
        
        // Create roof using two triangular prisms
        const roofHeight = 1.5; // Lower roof height
        const roofWidth = 13;
        const roofDepth = 11;
        
        // Create custom geometry for a sloped roof panel
        const createRoofPanel = (isLeft) => {
            const shape = new THREE.Shape();
            
            // Define the shape of the roof panel (triangle)
            const halfWidth = roofWidth / 2;
            shape.moveTo(-halfWidth, 0);
            shape.lineTo(0, roofHeight);
            shape.lineTo(halfWidth, 0);
            shape.lineTo(-halfWidth, 0);
            
            const extrudeSettings = {
                steps: 1,
                depth: roofDepth,
                bevelEnabled: false
            };
            
            const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            const roof = new THREE.Mesh(geometry, roofMaterial);
            
            // Position and rotate the roof panel
            roof.position.set(0, wallHeight, -roofDepth/2);
            roof.rotation.x = -Math.PI / 2;
            
            if (isLeft) {
                roof.position.x = -0.15;
                roof.rotation.y = 0;
            } else {
                roof.position.x = 0.15;
                roof.rotation.y = Math.PI;
            }
            
            roof.castShadow = true;
            roof.receiveShadow = true;
            return roof;
        };
        
        // Add the two roof panels
        const leftPanel = createRoofPanel(true);
        const rightPanel = createRoofPanel(false);
        cabin.add(leftPanel);
        cabin.add(rightPanel);
        
        // Add log beams supporting the roof
        for (let i = -4; i <= 4; i += 2) {
            // Cross beams
            const beamGeometry = new THREE.CylinderGeometry(0.1, 0.1, 11, 8);
            const beam = new THREE.Mesh(beamGeometry, logMaterial);
            beam.position.set(0, wallHeight + i * 0.2, 0);
            beam.rotation.z = Math.PI / 2;
            beam.castShadow = true;
            cabin.add(beam);
            
            // Support beams
            if (i % 4 === 0) {
                const supportGeometry = new THREE.CylinderGeometry(0.1, 0.1, roofHeight, 8);
                const support = new THREE.Mesh(supportGeometry, logMaterial);
                support.position.set(i, wallHeight + roofHeight/2, 0);
                support.castShadow = true;
                cabin.add(support);
            }
        }
        
        // Chimney
        const chimneyGeometry = new THREE.BoxGeometry(1, 3, 1);
        const chimney = new THREE.Mesh(chimneyGeometry, stoneMaterial);
        chimney.position.set(-3.5, wallHeight + 1.5, -2);
        chimney.castShadow = true;
        chimney.receiveShadow = true;
        cabin.add(chimney);
        
        // Position cabin
        cabin.position.set(-20, 0, -10);
        this.scene.add(cabin);
        
        // Store cabin for collision detection
        this.cabin = {
            position: new THREE.Vector3(-20, 0, -10),
            size: new THREE.Vector3(12, wallHeight, 10)
        };
    }
    
    createSimpleLighting() {
        // Main directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xfffaf0, 1.2);
        directionalLight.position.set(20, 30, 20);
        directionalLight.castShadow = true;
        
        // Improve shadow quality
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 100;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        directionalLight.shadow.bias = -0.0005;
        
        this.scene.add(directionalLight);
        
        // Secondary fill light
        const fillLight = new THREE.DirectionalLight(0xc7e5ff, 0.5);
        fillLight.position.set(-20, 20, -20);
        this.scene.add(fillLight);
        
        // Ambient light for general illumination - warmer tone
        const ambientLight = new THREE.AmbientLight(0x909fb9, 0.4);
        this.scene.add(ambientLight);
        
        // Add subtle hemisphere light
        const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x362c12, 0.4);
        this.scene.add(hemisphereLight);
    }
    
    createPlayer() {
        // Ensure camera angles are initialized
        if (!this.cameraAngles) {
            this.cameraAngles = {
                vertical: 0,
                horizontal: 0
            };
        }
        
        // Player state with constants
        this.playerState = {
            position: new THREE.Vector3(0, 1, 0),
            rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
            moveSpeed: Constants.PLAYER.MOVE_SPEED,
            turnSpeed: Constants.PLAYER.TURN_SPEED,
            moving: false,
            shooting: false,
            lastShot: 0,
            shotCooldown: Constants.PLAYER.SHOT_COOLDOWN,
            // Jump properties
            isJumping: false,
            jumpHeight: Constants.PLAYER.JUMP_HEIGHT,
            jumpSpeed: Constants.PLAYER.JUMP_SPEED,
            jumpVelocity: 0,
            gravity: Constants.PLAYER.GRAVITY
        };
        
        // Create player model using a more modular approach
        this.createPlayerModel();
        
        // Position player and add to scene
        this.player.position.copy(this.playerState.position);
        this.scene.add(this.player);
        
        // Setup camera for third-person view
        this.cameraOffset = Constants.PLAYER.CAMERA_OFFSET.clone();
        this.updatePlayerCamera();
    }
    
    createPlayerModel() {
        // Create detailed Navy SEAL soldier model
        this.player = new THREE.Group();
        
        // Create a canvas for multicam camo texture
        const camoCanvas = document.createElement('canvas');
        camoCanvas.width = 512;
        camoCanvas.height = 512;
        const ctx = camoCanvas.getContext('2d');
        
        // Fill with multicam base color (tan)
        ctx.fillStyle = '#B5A276';
        ctx.fillRect(0, 0, 512, 512);
        
        // Add multicam pattern spots (more realistic military pattern)
        const camoColors = ['#798461', '#5D5D3E', '#A59372', '#4D5940', '#6C7056', '#3F3F2A'];
        
        // Create large base blobs
        for (let i = 0; i < 40; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = 40 + Math.random() * 80;
            const colorIndex = Math.floor(Math.random() * camoColors.length);
            
            ctx.fillStyle = camoColors[colorIndex];
            ctx.beginPath();
            
            // Create irregular blob shapes
            const points = 6 + Math.floor(Math.random() * 5);
            for (let j = 0; j < points; j++) {
                const angle = (j / points) * Math.PI * 2;
                const radius = size * (0.7 + Math.random() * 0.6);
                const px = x + Math.cos(angle) * radius;
                const py = y + Math.sin(angle) * radius;
                
                if (j === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            
            ctx.closePath();
            ctx.fill();
        }
        
        // Add smaller detail spots
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = 5 + Math.random() * 15;
            const colorIndex = Math.floor(Math.random() * camoColors.length);
            
            ctx.fillStyle = camoColors[colorIndex];
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Create texture from canvas
        const camoTexture = new THREE.CanvasTexture(camoCanvas);
        camoTexture.wrapS = THREE.RepeatWrapping;
        camoTexture.wrapT = THREE.RepeatWrapping;
        
        // Materials for different equipment parts
        const camoMaterial = new THREE.MeshStandardMaterial({ 
            map: camoTexture,
            roughness: 0.8,
            metalness: 0.1
        });
        
        const blackMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222222,
            roughness: 0.7,
            metalness: 0.2
        });
        
        const vestMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x556B2F,  // Darker green for tactical vest
            roughness: 0.9,
            metalness: 0.1
        });
        
        // Torso with better proportions
        const torsoGeometry = new THREE.BoxGeometry(0.5, 0.7, 0.3);
        const torso = new THREE.Mesh(torsoGeometry, camoMaterial);
        torso.position.y = 0.5;
        this.player.add(torso);
        
        // Tactical vest with MOLLE system
        const vestGeometry = new THREE.BoxGeometry(0.52, 0.72, 0.32);
        const vest = new THREE.Mesh(vestGeometry, vestMaterial);
        vest.position.set(0, 0.5, 0);
        this.player.add(vest);
        
        // Vest details - add pouches and equipment
        const addPouch = (x, y, z, width, height, depth) => {
            const pouchGeometry = new THREE.BoxGeometry(width, height, depth);
            const pouch = new THREE.Mesh(pouchGeometry, blackMaterial);
            pouch.position.set(x, y, z);
            this.player.add(pouch);
            return pouch;
        };
        
        // Magazine pouches
        addPouch(0.2, 0.5, 0.17, 0.15, 0.15, 0.05);
        addPouch(0, 0.5, 0.17, 0.15, 0.15, 0.05);
        addPouch(-0.2, 0.5, 0.17, 0.15, 0.15, 0.05);
        
        // Radio pouch
        addPouch(-0.25, 0.6, 0, 0.08, 0.2, 0.3);
        
        // Create helmet with proper shape and details
        this.createPlayerHelmet();
        
        // Face with tactical facepaint
        this.createPlayerFace();
        
        // Create limbs with improved textures
        this.createPlayerLimbs(camoTexture);
        
        // Create modern assault rifle
        this.createRifle();
    }
    
    createPlayerFace() {
        // Face with tactical facepaint
        const faceGeometry = new THREE.BoxGeometry(0.22, 0.22, 0.22);
        
        // Create face texture with facepaint
        const faceCanvas = document.createElement('canvas');
        faceCanvas.width = 256;
        faceCanvas.height = 256;
        const faceCtx = faceCanvas.getContext('2d');
        
        // Base skin color
        faceCtx.fillStyle = '#C4A484'; // Tactical tan
        faceCtx.fillRect(0, 0, 256, 256);
        
        // Create face features
        // Eyes
        faceCtx.fillStyle = '#FFFFFF';
        faceCtx.fillRect(60, 100, 40, 20); // Left eye white
        faceCtx.fillRect(156, 100, 40, 20); // Right eye white
        
        faceCtx.fillStyle = '#3E6B89'; // Blue eyes
        faceCtx.fillRect(70, 105, 20, 10); // Left eye
        faceCtx.fillRect(166, 105, 20, 10); // Right eye
        
        // Add tactical face paint
        faceCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        
        // Under eyes
        faceCtx.fillRect(50, 125, 60, 15); // Left stripe
        faceCtx.fillRect(146, 125, 60, 15); // Right stripe
        
        // Cheek stripes
        faceCtx.fillRect(30, 150, 70, 10);
        faceCtx.fillRect(156, 150, 70, 10);
        
        // Forehead and chin
        faceCtx.fillRect(0, 30, 256, 25);
        faceCtx.fillRect(0, 200, 256, 25);
        
        // Create texture from canvas
        const faceTexture = new THREE.CanvasTexture(faceCanvas);
        const faceMaterial = new THREE.MeshStandardMaterial({ 
            map: faceTexture,
            roughness: 0.7,
            metalness: 0.1
        });
        
        const face = new THREE.Mesh(faceGeometry, faceMaterial);
        face.position.set(0, 0.95, 0.05);
        this.player.add(face);
    }
    
    createPlayerHelmet() {
        // Create tactical helmet with details like NVG mount and rails
        
        // Base helmet using sphere for rounded shape
        const helmetGeometry = new THREE.SphereGeometry(0.18, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        
        // Create multicam material for helmet
        const camoCanvas = document.createElement('canvas');
        camoCanvas.width = 256;
        camoCanvas.height = 256;
        const ctx = camoCanvas.getContext('2d');
        
        // Fill with base color
        ctx.fillStyle = '#5D5D3E';
        ctx.fillRect(0, 0, 256, 256);
        
        // Add irregular camo spots
        const camoColors = ['#798461', '#B5A276', '#4D5940'];
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const size = 20 + Math.random() * 40;
            const colorIndex = Math.floor(Math.random() * camoColors.length);
            
            ctx.fillStyle = camoColors[colorIndex];
            ctx.beginPath();
            
            // Create irregular shapes
            const points = 6 + Math.floor(Math.random() * 5);
            for (let j = 0; j < points; j++) {
                const angle = (j / points) * Math.PI * 2;
                const radius = size * (0.7 + Math.random() * 0.3);
                const px = x + Math.cos(angle) * radius;
                const py = y + Math.sin(angle) * radius;
                
                if (j === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            
            ctx.closePath();
            ctx.fill();
        }
        
        // Create texture from canvas
        const helmetTexture = new THREE.CanvasTexture(camoCanvas);
        
        // Create helmet material
        const helmetMaterial = new THREE.MeshStandardMaterial({ 
            map: helmetTexture,
            roughness: 0.8,
            metalness: 0.2
        });
        
        // Create the helmet
        const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
        helmet.rotation.x = -0.2; // Tilt slightly forward
        helmet.position.set(0, 1.05, 0);
        helmet.scale.set(1.2, 1, 1.2); // Slightly oval shape
        this.player.add(helmet);
        
        // Add tactical details
        const blackMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222222,
            roughness: 0.7,
            metalness: 0.3
        });
        
        // NVG mount on front
        const nvgMountGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
        const nvgMount = new THREE.Mesh(nvgMountGeometry, blackMaterial);
        nvgMount.position.set(0, 1.13, 0.16);
        this.player.add(nvgMount);
        
        // Side rails
        const railGeometry = new THREE.BoxGeometry(0.03, 0.02, 0.15);
        
        const leftRail = new THREE.Mesh(railGeometry, blackMaterial);
        leftRail.position.set(0.17, 1.05, 0.05);
        leftRail.rotation.y = Math.PI / 2 - 0.3;
        this.player.add(leftRail);
        
        const rightRail = new THREE.Mesh(railGeometry, blackMaterial);
        rightRail.position.set(-0.17, 1.05, 0.05);
        rightRail.rotation.y = -Math.PI / 2 + 0.3;
        this.player.add(rightRail);
        
        // Helmet cover band
        const bandGeometry = new THREE.CylinderGeometry(0.19, 0.19, 0.03, 16, 1, true);
        const band = new THREE.Mesh(bandGeometry, blackMaterial);
        band.position.set(0, 1.05, 0);
        this.player.add(band);
    }
    
    createPlayerLimbs(camoTexture) {
        // Create more realistic limbs with tactical gear
        
        // Materials
        const camoMaterial = new THREE.MeshStandardMaterial({ 
            map: camoTexture,
            roughness: 0.8,
            metalness: 0.1
        });
        
        const blackMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222222,
            roughness: 0.7,
            metalness: 0.2
        });
        
        // Legs with improved shape - using cylinders for more realistic form
        // Thighs
        const thighGeometry = new THREE.CylinderGeometry(0.1, 0.09, 0.4, 8);
        
        const leftThigh = new THREE.Mesh(thighGeometry, camoMaterial);
        leftThigh.position.set(0.15, 0.1, 0);
        leftThigh.rotation.z = 0.1;
        this.player.add(leftThigh);
        
        const rightThigh = new THREE.Mesh(thighGeometry, camoMaterial);
        rightThigh.position.set(-0.15, 0.1, 0);
        rightThigh.rotation.z = -0.1;
        this.player.add(rightThigh);
        
        // Calves
        const calfGeometry = new THREE.CylinderGeometry(0.08, 0.06, 0.4, 8);
        
        const leftCalf = new THREE.Mesh(calfGeometry, camoMaterial);
        leftCalf.position.set(0.15, -0.3, 0);
        this.player.add(leftCalf);
        
        const rightCalf = new THREE.Mesh(calfGeometry, camoMaterial);
        rightCalf.position.set(-0.15, -0.3, 0);
        this.player.add(rightCalf);
        
        // Tactical boots
        const bootGeometry = new THREE.BoxGeometry(0.12, 0.16, 0.25);
        
        const leftBoot = new THREE.Mesh(bootGeometry, blackMaterial);
        leftBoot.position.set(0.15, -0.55, 0.05);
        this.player.add(leftBoot);
        
        const rightBoot = new THREE.Mesh(bootGeometry, blackMaterial);
        rightBoot.position.set(-0.15, -0.55, 0.05);
        this.player.add(rightBoot);
        
        // Add knee pads
        const kneePadGeometry = new THREE.CylinderGeometry(0.09, 0.09, 0.06, 8, 1, false, Math.PI / 2, Math.PI);
        const kneePadMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x444444,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const leftKneePad = new THREE.Mesh(kneePadGeometry, kneePadMaterial);
        leftKneePad.rotation.x = Math.PI / 2;
        leftKneePad.position.set(0.15, -0.1, 0.08);
        this.player.add(leftKneePad);
        
        const rightKneePad = new THREE.Mesh(kneePadGeometry, kneePadMaterial);
        rightKneePad.rotation.x = Math.PI / 2;
        rightKneePad.position.set(-0.15, -0.1, 0.08);
        this.player.add(rightKneePad);
        
        // Arms with tactical sleeves
        // Upper arms
        const upperArmGeometry = new THREE.CylinderGeometry(0.08, 0.07, 0.3, 8);
        
        this.leftUpperArm = new THREE.Mesh(upperArmGeometry, camoMaterial);
        this.leftUpperArm.position.set(0.3, 0.65, 0);
        this.leftUpperArm.rotation.z = -0.3;
        this.player.add(this.leftUpperArm);
        
        this.rightUpperArm = new THREE.Mesh(upperArmGeometry, camoMaterial);
        this.rightUpperArm.position.set(-0.3, 0.65, 0);
        this.rightUpperArm.rotation.z = 0.3;
        this.player.add(this.rightUpperArm);
        
        // Forearms
        const forearmGeometry = new THREE.CylinderGeometry(0.06, 0.05, 0.3, 8);
        
        this.leftForearm = new THREE.Mesh(forearmGeometry, camoMaterial);
        this.leftForearm.position.set(0.45, 0.5, 0);
        this.leftForearm.rotation.z = -0.3;
        this.player.add(this.leftForearm);
        
        this.rightForearm = new THREE.Mesh(forearmGeometry, camoMaterial);
        this.rightForearm.position.set(-0.45, 0.5, 0);
        this.rightForearm.rotation.z = 0.3;
        this.player.add(this.rightForearm);
        
        // Tactical gloves
        const handGeometry = new THREE.BoxGeometry(0.08, 0.12, 0.08);
        const glovesMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.8,
            metalness: 0.2
        });
        
        this.leftHand = new THREE.Mesh(handGeometry, glovesMaterial);
        this.leftHand.position.set(0.58, 0.42, 0);
        this.player.add(this.leftHand);
        
        this.rightHand = new THREE.Mesh(handGeometry, glovesMaterial);
        this.rightHand.position.set(-0.58, 0.42, 0);
        this.player.add(this.rightHand);
        
        // Store references to limbs for animation
        this.leftLeg = {
            thigh: leftThigh,
            calf: leftCalf,
            foot: leftBoot
        };
        
        this.rightLeg = {
            thigh: rightThigh,
            calf: rightCalf,
            foot: rightBoot
        };
        
        // Store arm references for the rifle positioning
        this.leftArm = {
            upper: this.leftUpperArm,
            lower: this.leftForearm,
            hand: this.leftHand
        };
        
        this.rightArm = {
            upper: this.rightUpperArm,
            lower: this.rightForearm,
            hand: this.rightHand
        };
    }
    
    createRifle() {
        // Create a more detailed modern assault rifle like an M4/HK416
        const rifle = new THREE.Group();
        
        // Materials
        const blackMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x111111,
            roughness: 0.7,
            metalness: 0.5
        });
        
        const darkGrayMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222222,
            roughness: 0.8,
            metalness: 0.4
        });
        
        const stockMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222222,
            roughness: 0.9,
            metalness: 0.2
        });
        
        const metalMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x777777,
            roughness: 0.4,
            metalness: 0.8
        });
        
        // Main receiver
        const receiverGeometry = new THREE.BoxGeometry(0.05, 0.08, 0.4);
        const receiver = new THREE.Mesh(receiverGeometry, blackMaterial);
        rifle.add(receiver);
        
        // Barrel
        const barrelGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8);
        const barrel = new THREE.Mesh(barrelGeometry, metalMaterial);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.z = 0.45;
        rifle.add(barrel);
        
        // Flash hider
        const flashHiderGeometry = new THREE.CylinderGeometry(0.02, 0.025, 0.08, 8);
        const flashHider = new THREE.Mesh(flashHiderGeometry, blackMaterial);
        flashHider.rotation.x = Math.PI / 2;
        flashHider.position.z = 0.71;
        rifle.add(flashHider);
        
        // Handguard with rails
        const handguardGeometry = new THREE.BoxGeometry(0.07, 0.07, 0.35);
        const handguard = new THREE.Mesh(handguardGeometry, darkGrayMaterial);
        handguard.position.z = 0.25;
        handguard.position.y = -0.01;
        rifle.add(handguard);
        
        // Top rail
        const topRailGeometry = new THREE.BoxGeometry(0.025, 0.01, 0.5);
        const topRail = new THREE.Mesh(topRailGeometry, blackMaterial);
        topRail.position.y = 0.045;
        topRail.position.z = 0.15;
        rifle.add(topRail);
        
        // Pistol grip
        const gripGeometry = new THREE.BoxGeometry(0.04, 0.12, 0.05);
        const grip = new THREE.Mesh(gripGeometry, blackMaterial);
        grip.position.y = -0.10;
        grip.position.z = -0.06;
        grip.rotation.x = Math.PI / 8;
        rifle.add(grip);
        
        // Stock - more modern retractable style
        const stockGeometry = new THREE.BoxGeometry(0.04, 0.06, 0.25);
        const stock = new THREE.Mesh(stockGeometry, stockMaterial);
        stock.position.z = -0.28;
        rifle.add(stock);
        
        // Buffer tube
        const bufferTubeGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.15, 8);
        const bufferTube = new THREE.Mesh(bufferTubeGeometry, darkGrayMaterial);
        bufferTube.rotation.x = Math.PI / 2;
        bufferTube.position.z = -0.15;
        bufferTube.position.y = 0.01;
        rifle.add(bufferTube);
        
        // Magazine
        const magazineGeometry = new THREE.BoxGeometry(0.04, 0.15, 0.06);
        const magazine = new THREE.Mesh(magazineGeometry, blackMaterial);
        magazine.position.y = -0.12;
        magazine.position.z = 0.05;
        rifle.add(magazine);
        
        // Optic sight/scope
        const opticBodyGeometry = new THREE.BoxGeometry(0.04, 0.04, 0.1);
        const opticBody = new THREE.Mesh(opticBodyGeometry, blackMaterial);
        opticBody.position.y = 0.08;
        opticBody.position.z = 0.1;
        rifle.add(opticBody);
        
        // Optic lens
        const lensGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.02, 16);
        const lensMaterial = new THREE.MeshStandardMaterial({
            color: 0x88CCFF,
            transparent: true,
            opacity: 0.7,
            metalness: 0.9,
            roughness: 0.1
        });
        const lens = new THREE.Mesh(lensGeometry, lensMaterial);
        lens.rotation.x = Math.PI / 2;
        lens.position.y = 0.08;
        lens.position.z = 0.06;
        rifle.add(lens);
        
        // Rifle foregrip
        const foregrip = new THREE.Mesh(
            new THREE.CylinderGeometry(0.015, 0.02, 0.1, 8),
            blackMaterial
        );
        foregrip.position.set(0, -0.09, 0.25);
        rifle.add(foregrip);
        
        // Muzzle flash (initially invisible)
        const muzzleGeometry = new THREE.ConeGeometry(0.04, 0.15, 16);
        const muzzleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFAA44,
            transparent: true,
            opacity: 0.8
        });
        this.muzzleFlash = new THREE.Mesh(muzzleGeometry, muzzleMaterial);
        this.muzzleFlash.position.z = 0.75;
        this.muzzleFlash.rotation.x = Math.PI / 2;
        this.muzzleFlash.visible = false;
        rifle.add(this.muzzleFlash);
        
        // Position rifle in standard third-person shooter position
        rifle.position.set(0.35, 0.45, 0.3);
        rifle.rotation.y = -Math.PI / 16; // Slight angle
        
        this.player.add(rifle);
        this.rifle = rifle;
    }
    
    setupControls() {
        // Movement
        this.moveState = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false
        };

        // Camera angles are now initialized in initializeGameComponents
        
        // Track mouse state for shooting
        this.mouseDown = false;
        
        document.addEventListener('keydown', (e) => {
            switch (e.code) {
                case 'KeyW': this.moveState.forward = true; break;
                case 'KeyS': this.moveState.backward = true; break;
                case 'KeyA': this.moveState.left = true; break;
                case 'KeyD': this.moveState.right = true; break;
                case 'Space': this.jump(); break;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            switch(e.code) {
                case 'KeyW': this.moveState.forward = false; break;
                case 'KeyS': this.moveState.backward = false; break;
                case 'KeyA': this.moveState.left = false; break;
                case 'KeyD': this.moveState.right = false; break;
            }
        });
        
        // Mouse controls for standard third-person shooter
        this.container.addEventListener('click', () => {
            this.container.requestPointerLock();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.container) {
                // In standard third-person shooter controls:
                // - Horizontal mouse movement rotates the player character (not just the camera)
                // - Vertical mouse movement only adjusts the camera pitch
                
                // Update player rotation based on horizontal mouse movement
                this.playerState.rotation.y -= e.movementX * 0.002;
                
                // Update camera pitch (vertical angle) with tighter constraints for better control
                this.cameraAngles.vertical = Math.max(
                    -Math.PI / 4, // Look up limit (less extreme)
                    Math.min(
                        Math.PI / 8, // Look down limit (less extreme)
                        this.cameraAngles.vertical + e.movementY * 0.002
                    )
                );
            }
        });
        
        // Shooting controls
        document.addEventListener('mousedown', (e) => {
            if (e.button === 0 && document.pointerLockElement === this.container) {
                this.mouseDown = true;
                this.playerState.shooting = true;
                this.shoot();
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouseDown = false;
                this.playerState.shooting = false;
            }
        });
    }
    
    shoot() {
        // Check if enough time has passed since last shot
        const now = performance.now();
        if (now - this.playerState.lastShot < this.playerState.shotCooldown) {
            return;
        }
        
        // Update last shot time
        this.playerState.lastShot = now;
        
        // Set shooting flag for animation
        this.playerState.shooting = true;
        setTimeout(() => {
            this.playerState.shooting = false;
        }, 100);
        
        // Show muzzle flash briefly
        if (this.muzzleFlash) {
            this.muzzleFlash.visible = true;
            setTimeout(() => {
                this.muzzleFlash.visible = false;
            }, 50);
        }
        
        // Play rifle sound - enhanced for a more badass sound
        if (this.audioInitialized && this.audioContext && this.audioContext.state === 'running') {
            try {
                // Create audio nodes
                const mainGain = this.audioContext.createGain();
                mainGain.connect(this.audioContext.destination);
                mainGain.gain.value = 0.8; // Master volume
                
                // 1. Create the initial explosion sound (low frequency boom)
                const boomOsc = this.audioContext.createOscillator();
                const boomGain = this.audioContext.createGain();
                
                boomOsc.connect(boomGain);
                boomGain.connect(mainGain);
                
                boomOsc.type = 'sawtooth';
                boomOsc.frequency.setValueAtTime(80, this.audioContext.currentTime); // Lower frequency for more bass
                boomOsc.frequency.exponentialRampToValueAtTime(30, this.audioContext.currentTime + 0.2);
                
                // Volume envelope for the boom
                boomGain.gain.setValueAtTime(0, this.audioContext.currentTime);
                boomGain.gain.linearRampToValueAtTime(1.0, this.audioContext.currentTime + 0.01);
                boomGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                
                // 2. Create the crack sound (high frequency)
                const crackOsc = this.audioContext.createOscillator();
                const crackGain = this.audioContext.createGain();
                
                crackOsc.connect(crackGain);
                crackGain.connect(mainGain);
                
                crackOsc.type = 'sawtooth';
                crackOsc.frequency.setValueAtTime(1200, this.audioContext.currentTime);
                crackOsc.frequency.exponentialRampToValueAtTime(300, this.audioContext.currentTime + 0.1);
                
                // Volume envelope for the crack
                crackGain.gain.setValueAtTime(0, this.audioContext.currentTime);
                crackGain.gain.linearRampToValueAtTime(0.8, this.audioContext.currentTime + 0.005);
                crackGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
                
                // 3. Add white noise for the blast
                const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.2, this.audioContext.sampleRate);
                const noiseData = noiseBuffer.getChannelData(0);
                for (let i = 0; i < noiseBuffer.length; i++) {
                    noiseData[i] = Math.random() * 2 - 1;
                }
                
                const noiseSource = this.audioContext.createBufferSource();
                noiseSource.buffer = noiseBuffer;
                
                const noiseGain = this.audioContext.createGain();
                noiseSource.connect(noiseGain);
                noiseGain.connect(mainGain);
                
                noiseGain.gain.setValueAtTime(0, this.audioContext.currentTime);
                noiseGain.gain.linearRampToValueAtTime(0.7, this.audioContext.currentTime + 0.01);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
                
                // 4. Add a mechanical click sound
                setTimeout(() => {
                    const clickOsc = this.audioContext.createOscillator();
                    const clickGain = this.audioContext.createGain();
                    
                    clickOsc.connect(clickGain);
                    clickGain.connect(mainGain);
                    
                    clickOsc.type = 'square';
                    clickOsc.frequency.setValueAtTime(800, this.audioContext.currentTime);
                    
                    clickGain.gain.setValueAtTime(0, this.audioContext.currentTime);
                    clickGain.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
                    clickGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.03);
                    
                    clickOsc.start();
                    clickOsc.stop(this.audioContext.currentTime + 0.03);
                }, 50);
                
                // Start and stop all oscillators
                boomOsc.start();
                boomOsc.stop(this.audioContext.currentTime + 0.3);
                
                crackOsc.start();
                crackOsc.stop(this.audioContext.currentTime + 0.1);
                
                noiseSource.start();
                noiseSource.stop(this.audioContext.currentTime + 0.2);
                
                // Add reverb effect for more realistic outdoor gunshot
                if (this.audioContext.createConvolver) {
                    setTimeout(() => {
                        const echoGain = this.audioContext.createGain();
                        echoGain.gain.value = 0.3;
                        echoGain.connect(this.audioContext.destination);
                        
                        const echoOsc = this.audioContext.createOscillator();
                        const echoOscGain = this.audioContext.createGain();
                        
                        echoOsc.connect(echoOscGain);
                        echoOscGain.connect(echoGain);
                        
                        echoOsc.type = 'sawtooth';
                        echoOsc.frequency.setValueAtTime(100, this.audioContext.currentTime);
                        echoOsc.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.3);
                        
                        echoOscGain.gain.setValueAtTime(0, this.audioContext.currentTime);
                        echoOscGain.gain.linearRampToValueAtTime(0.5, this.audioContext.currentTime + 0.05);
                        echoOscGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
                        
                        echoOsc.start();
                        echoOsc.stop(this.audioContext.currentTime + 0.5);
                    }, 100);
                }
            } catch (error) {
                console.warn('Could not play rifle sound:', error);
            }
        }
        
        // Calculate ray from camera for hit detection
        const raycaster = new THREE.Raycaster();
        const rayOrigin = this.camera.position.clone();
        
        // Direction from camera
        const rayDirection = new THREE.Vector3(0, 0, -1);
        rayDirection.applyQuaternion(this.camera.quaternion);
        rayDirection.normalize();
        
        // Set raycaster
        raycaster.set(rayOrigin, rayDirection);
        
        // Check for enemy hits
        let hitSomething = false;
        
        // Check enemies
        if (this.enemies) {
            for (const enemy of this.enemies) {
                if (enemy.checkBulletHit(rayOrigin, rayDirection)) {
                    hitSomething = true;
                    break;
                }
            }
        }
        
        // Check dinosaurs
        if (!hitSomething && this.dinosaurs) {
            for (const dinosaur of this.dinosaurs) {
                if (dinosaur.checkBulletHit(rayOrigin, rayDirection)) {
                    hitSomething = true;
                    break;
                }
            }
        }
        
        // If nothing was hit, check for environment hits
        if (!hitSomething) {
            // Check for intersections with scene objects
            const intersects = raycaster.intersectObjects(this.scene.children, true);
            
            if (intersects.length > 0) {
                // Create impact effect at hit point
                this.createImpactEffect(intersects[0].point, intersects[0].face.normal);
            }
        }
    }
    
    // Create impact effect when bullet hits terrain
    createImpactEffect(position, normal) {
        // Create dust particles
        const particleCount = 10 + Math.floor(Math.random() * 10);
        
        for (let i = 0; i < particleCount; i++) {
            // Create a small sphere for each dust particle
            const particleGeometry = new THREE.SphereGeometry(0.02 + Math.random() * 0.03, 4, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xCCCCCC,
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Position at impact location
            particle.position.copy(position);
            
            // Random velocity in hemisphere facing normal direction
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                Math.random() * 0.1,
                (Math.random() - 0.5) * 0.1
            );
            
            // Adjust velocity to face away from surface
            velocity.add(normal.clone().multiplyScalar(0.1));
            
            // Add to scene
            this.scene.add(particle);
            
            // Remove after short time
            setTimeout(() => {
                this.scene.remove(particle);
            }, 500 + Math.random() * 500);
            
            // Animate particle
            const animate = () => {
                particle.position.add(velocity);
                velocity.y -= 0.005; // Gravity
                
                // Fade out
                if (particle.material.opacity > 0) {
                    particle.material.opacity -= 0.02;
                    requestAnimationFrame(animate);
                }
            };
            
            animate();
        }
    }
    
    // Add method to make the player jump
    jump() {
        // Only allow jumping if the player is on the ground
        if (!this.playerState.isJumping && this.playerState.position.y <= 1.01) {
            this.playerState.isJumping = true;
            this.playerState.jumpVelocity = this.playerState.jumpSpeed;
        }
    }
    
    // Add a method to check for collisions
    checkCollisions(position) {
        // Check collisions with trees
        for (const tree of this.trees) {
            const dx = tree.position.x - position.x;
            const dz = tree.position.z - position.z;
            const distSquared = dx * dx + dz * dz;
            
            if (distSquared < tree.radius * tree.radius) {
                return true; // Collision detected
            }
        }
        
        // Check collision with cabin
        if (this.cabin) {
            const cabinPos = this.cabin.position;
            const cabinSize = this.cabin.size;
            
            // Check if player is inside cabin bounds (rectangular collision)
            if (
                position.x > cabinPos.x - cabinSize.x/2 && position.x < cabinPos.x + cabinSize.x/2 &&
                position.z > cabinPos.z - cabinSize.z/2 && position.z < cabinPos.z + cabinSize.z/2
            ) {
                return true; // Collision with cabin
            }
        }
        
        return false; // No collision
    }
    
    updatePlayerCamera() {
        // Fixed third-person shooter camera implementation
        
        // Calculate camera position directly behind player
        // Use a fixed distance for the camera to prevent circular panning
        const cameraDistance = Constants.PLAYER.CAMERA_OFFSET.z;
        const cameraHeight = Constants.PLAYER.CAMERA_OFFSET.y;
        
        // Calculate camera position directly behind player based on player's rotation
        const cameraPosition = new THREE.Vector3(
            this.playerState.position.x - Math.sin(this.playerState.rotation.y) * cameraDistance,
            this.playerState.position.y + cameraHeight,
            this.playerState.position.z - Math.cos(this.playerState.rotation.y) * cameraDistance
        );
        
        this.camera.position.copy(cameraPosition);
        
        // Calculate target position - player position plus height offset
        const targetHeight = 1.0; // Look at player head height
        const targetPosition = this.playerState.position.clone();
        targetPosition.y += targetHeight;
        
        // Apply vertical tilt if needed
        if (this.cameraAngles.vertical !== 0) {
            // Calculate a point above or below the player based on vertical angle
            const verticalOffset = Math.tan(this.cameraAngles.vertical) * cameraDistance;
            targetPosition.y += verticalOffset;
        }
        
        // Point camera at target
        this.camera.lookAt(targetPosition);
        
        // Calculate aim point for weapon
        const aimDirection = new THREE.Vector3(0, 0, -1);
        aimDirection.applyEuler(new THREE.Euler(
            this.cameraAngles.vertical,
            this.playerState.rotation.y,
            0,
            'YXZ'
        ));
        
        const aimTarget = this.playerState.position.clone();
        aimTarget.y += 1.0; // Aim from eye level
        aimTarget.add(aimDirection.multiplyScalar(20));
        
        // Update rifle aim
        this.updateRifleAim(aimTarget);
    }
    
    updateRifleAim(lookTarget) {
        if (!this.rifle) return;
        
        // Calculate aim direction from player to look target
        const aimDirection = lookTarget.clone().sub(this.playerState.position);
        aimDirection.normalize();
        
        // Calculate rifle angles - use YXZ order to match camera rotation
        const rifleRotation = new THREE.Euler(0, 0, 0, 'YXZ');
        rifleRotation.y = Math.atan2(aimDirection.x, aimDirection.z);
        rifleRotation.x = -Math.asin(aimDirection.y);
        
        // Update rifle rotation to match aim direction
        this.rifle.rotation.x = rifleRotation.x;
        this.rifle.rotation.y = rifleRotation.y;
        this.rifle.rotation.z = 0; // Prevent any roll rotation
        
        // Position rifle in front of player
        this.rifle.position.set(0.35, 0.45, 0.3);
        
        // Update arm positions to naturally hold the rifle
        if (this.leftArm && this.rightArm) {
            // Position arms to naturally hold the rifle based on where it's pointing
            
            // Left arm (forward grip)
            if (this.leftArm.upper && this.leftArm.lower && this.leftArm.hand) {
                // Upper arm rotation
                this.leftArm.upper.rotation.x = rifleRotation.x * 0.3;
                this.leftArm.upper.rotation.y = rifleRotation.y * 0.4;
                this.leftArm.upper.rotation.z = -0.3; // Keep basic pose
                
                // Forearm rotation - point toward the rifle foregrip
                this.leftArm.lower.rotation.x = rifleRotation.x * 0.5;
                this.leftArm.lower.rotation.y = rifleRotation.y * 0.6;
                this.leftArm.lower.rotation.z = -0.3;
                
                // Hand position
                this.leftArm.hand.position.x = 0.58 + rifleRotation.y * 0.05;
                this.leftArm.hand.position.y = 0.42 - rifleRotation.x * 0.1;
                this.leftArm.hand.position.z = rifleRotation.x * 0.1;
                
                // Hand rotation
                this.leftArm.hand.rotation.x = rifleRotation.x;
                this.leftArm.hand.rotation.y = rifleRotation.y;
            }
            
            // Right arm (trigger hand)
            if (this.rightArm.upper && this.rightArm.lower && this.rightArm.hand) {
                // Upper arm rotation
                this.rightArm.upper.rotation.x = rifleRotation.x * 0.3;
                this.rightArm.upper.rotation.y = rifleRotation.y * 0.4;
                this.rightArm.upper.rotation.z = 0.3; // Keep basic pose
                
                // Forearm rotation - point toward the rifle trigger
                this.rightArm.lower.rotation.x = rifleRotation.x * 0.5;
                this.rightArm.lower.rotation.y = rifleRotation.y * 0.6;
                this.rightArm.lower.rotation.z = 0.3;
                
                // Hand position
                this.rightArm.hand.position.x = -0.58 + rifleRotation.y * 0.05;
                this.rightArm.hand.position.y = 0.42 - rifleRotation.x * 0.1;
                this.rightArm.hand.position.z = rifleRotation.x * 0.1;
                
                // Hand rotation
                this.rightArm.hand.rotation.x = rifleRotation.x;
                this.rightArm.hand.rotation.y = rifleRotation.y;
            }
        }
    }
    
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        // Calculate delta time for smooth animation
        const now = performance.now();
        let deltaTime = (now - this.lastTime) / 1000;
        
        // Cap delta time to prevent large jumps after tab switch
        deltaTime = Math.min(deltaTime, Constants.GAME.MAX_DELTA_TIME);
        this.lastTime = now;
        
        // Update player
        this.updatePlayer(deltaTime);
        
        // Update enemies
        if (this.enemies) {
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                this.enemies[i].update(deltaTime, this.playerState.position);
            }
        }
        
        // Update dinosaurs
        if (this.dinosaurs && this.dinosaurs.length > 0) {
            // Log dinosaur positions occasionally
            if (Math.random() < 0.01) { // Log roughly once every 100 frames
                console.log(`Dinosaurs: ${this.dinosaurs.length}, First dinosaur position:`, 
                    this.dinosaurs[0].position);
            }
            
            for (let i = this.dinosaurs.length - 1; i >= 0; i--) {
                this.dinosaurs[i].update(deltaTime, this.playerState.position);
            }
        } else if (now % 5000 < 16) { // Check roughly every 5 seconds
            console.log("No dinosaurs present in the scene");
        }
        
        // Update debug info
        this.updateDebugInfo();
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    updateDebugInfo() {
        // Only update if debug is visible
        if (this.debug.style.display === 'block') {
            const position = this.playerState.position;
            const posText = `Position: ${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}`;
            const rotText = `Rotation: ${(this.playerState.rotation.y * 180 / Math.PI).toFixed(1)}°`;
            const fpsText = `FPS: ${this.fpsCounter?.fps || 0}`;
            
            // Update debug info without clearing previous messages
            const debugLines = this.debug.innerHTML.split('<br>');
            const staticInfo = debugLines.slice(0, 5).join('<br>'); // Keep initialization messages
            
            this.debug.innerHTML = `${staticInfo}<br>${posText}<br>${rotText}<br>${fpsText}`;
        }
    }
    
    updatePlayer(deltaTime) {
        // Calculate movement with delta time for consistent speed
        const direction = new THREE.Vector3(0, 0, 0);
        
        if (this.moveState.forward) direction.z -= 1;
        if (this.moveState.backward) direction.z += 1;
        if (this.moveState.left) direction.x -= 1;
        if (this.moveState.right) direction.x += 1;
        
        this.playerState.moving = direction.length() > 0;
        
        // Handle horizontal movement with delta time
        if (this.playerState.moving) {
            // Normalize direction vector and apply rotation
            direction.normalize();
            direction.applyEuler(this.playerState.rotation);
            
            // Apply delta time to movement speed
            const scaledSpeed = this.playerState.moveSpeed * deltaTime * 60; // Normalize to 60fps
            
            // Calculate new position but don't apply it yet
            const movement = direction.multiplyScalar(scaledSpeed);
            const newPosition = this.playerState.position.clone();
            newPosition.x += movement.x;
            newPosition.z += movement.z;
            
            // Check for collisions before applying movement
            if (!this.checkCollisions(newPosition)) {
                // No collision, apply movement
                this.playerState.position.copy(newPosition);
                
                // Update Y position based on terrain height (for hill walking)
                if (!this.playerState.isJumping) {
                    const terrainHeight = this.getHeightAtPosition(this.playerState.position);
                    this.playerState.position.y = terrainHeight;
                }
                
                // Play footstep sound when moving
                this.playFootstepSound();
            }
            
            // Update player mesh rotation
            this.player.rotation.y = this.playerState.rotation.y;
        }
        
        // Handle jumping and gravity with delta time
        if (this.playerState.isJumping) {
            // Scale gravity and jump velocity by delta time
            const scaledGravity = this.playerState.gravity * deltaTime * 60;
            const scaledVelocity = this.playerState.jumpVelocity * deltaTime * 60;
            
            // Apply jump velocity
            this.playerState.position.y += scaledVelocity;
            
            // Apply gravity to reduce jump velocity
            this.playerState.jumpVelocity -= scaledGravity;
            
            // Get terrain height at current position
            const terrainHeight = this.getHeightAtPosition(this.playerState.position);
            
            // Check if player has landed
            if (this.playerState.position.y <= terrainHeight && this.playerState.jumpVelocity < 0) {
                this.playerState.position.y = terrainHeight; // Reset to terrain level
                this.playerState.isJumping = false;
                this.playerState.jumpVelocity = 0;
                
                // Play landing sound (use a footstep but louder)
                if (this.audioInitialized && this.footstepSounds && this.footstepSounds.length > 0) {
                    try {
                        // Check if audio context is available and running
                        if (!this.listener || !this.listener.context) {
                            console.warn('AudioListener or AudioContext not available for landing sound');
                        } else if (this.listener.context.state !== 'running') {
                            // Try to resume the audio context
                            this.listener.context.resume().catch(e => {
                                console.warn('Could not resume audio context:', e);
                            });
                        } else {
                            // Create a new Audio instance instead of cloning
                            const landSound = new THREE.Audio(this.listener);
                            landSound.setBuffer(this.footstepSounds[0].buffer);
                            landSound.setVolume(0.6); // Louder than regular footstep
                            landSound.setPlaybackRate(0.7); // Slower for more weight
                            landSound.play();
                        }
                    } catch (e) {
                        console.warn('Error playing landing sound:', e);
                    }
                }
            }
        }
        
        // Update camera position to follow player
        this.updatePlayerCamera();
        
        // Update player model position
        if (this.player) {
            this.player.position.copy(this.playerState.position);
        }
    }
    
    // Add method to get height at a specific position (for hill walking)
    getHeightAtPosition(position) {
        // Default height (ground level)
        let height = 1;
        
        // Check if position is on the hill
        const hillCenter = new THREE.Vector3(50, 0, -30); // Hill position
        const hillSize = 60;
        const hillHeight = 25;
        
        // Calculate distance from hill center (x-z plane only)
        const dx = position.x - hillCenter.x;
        const dz = position.z - hillCenter.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        // If on the hill, calculate height based on distance from center
        if (distance < hillSize / 2) {
            const maxDistance = hillSize / 2;
            const normalizedDistance = distance / maxDistance;
            
            // Calculate height using cosine falloff (same as in createScenicHill)
            let hillY = Math.cos(normalizedDistance * Math.PI * 0.5);
            hillY = Math.max(0, hillY) * hillHeight;
            
            // Add some noise for natural look (less than in visual mesh to avoid bumpy walking)
            hillY += (Math.random() * 0.2 - 0.1);
            
            // Set height to hill height
            height = hillY;
        }
        
        return height;
    }

    // Add createDinosaur method to Game class after createEnemy method
    createDinosaur() {
        try {
            console.log("Starting dinosaur creation process");
            this.debug.innerHTML += '<br>Attempting to create dinosaur...';
            
            // Generate a random position away from the player
            const angle = Math.random() * Math.PI * 2;
            const distance = 30 + Math.random() * 20; // Between 30-50 units from center
            const position = new THREE.Vector3(
                Math.cos(angle) * distance,
                1,
                Math.sin(angle) * distance
            );
            
            console.log("Generated dinosaur position:", position);
            
            // Validate position
            if (isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) {
                console.warn("Invalid position generated, using default position");
                position.set(30, 1, 30);
            }
            
            // Check if position is valid (not inside objects)
            let validPosition = true;
            
            // Check collision with trees
            for (const tree of this.trees) {
                if (!tree.position) continue;
                
                const dx = tree.position.x - position.x;
                const dz = tree.position.z - position.z;
                const distSquared = dx * dx + dz * dz;
                
                if (distSquared < (tree.radius + 2) * (tree.radius + 2)) {
                    validPosition = false;
                    console.log("Invalid position - too close to tree");
                    break;
                }
            }
            
            // If position is valid, create the dinosaur
            if (validPosition) {
                console.log("Position valid, creating dinosaur");
                const dinosaur = new Dinosaur(this.scene, position);
                
                // Initialize dinosaurs array if it doesn't exist
                if (!this.dinosaurs) {
                    this.dinosaurs = [];
                    console.log("Initialized dinosaurs array");
                }
                
                this.dinosaurs.push(dinosaur);
                console.log("Added dinosaur to array, total:", this.dinosaurs.length);
                
                // Pass audio context to dinosaur if available
                if (this.audioInitialized && this.listener) {
                    dinosaur.listener = this.listener;
                    dinosaur.audioInitialized = true;
                    console.log("Audio context passed to dinosaur");
                }
                
                this.debug.innerHTML += '<br>Dinosaur created successfully at position ' + 
                    position.x.toFixed(1) + ', ' + position.y.toFixed(1) + ', ' + position.z.toFixed(1);
            } else {
                // Try again with a different position
                console.log("Retrying with different position");
                this.debug.innerHTML += '<br>Retrying dinosaur creation with different position';
                this.createDinosaur();
            }
        } catch (error) {
            console.error('Error creating dinosaur:', error);
            this.debug.innerHTML += `<br>Error creating dinosaur: ${error.message}<br>Stack: ${error.stack}`;
        }
    }
    
    createDinosaurTexture() {
        // Create a procedural texture for the dinosaur skin
        const canvas = document.createElement('canvas');
        const size = 512;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Base color - dark green
        ctx.fillStyle = '#2d8659';
        ctx.fillRect(0, 0, size, size);
        
        // Create scale pattern
        const scaleSize = 10;
        const rows = size / scaleSize;
        const cols = size / scaleSize;
        
        // Draw scales
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                // Offset every other row
                const offsetX = y % 2 === 0 ? 0 : scaleSize / 2;
                
                // Vary scale colors slightly for realism
                const hue = 140 + Math.random() * 20; // Green hue
                const saturation = 40 + Math.random() * 20;
                const lightness = 30 + Math.random() * 15;
                
                ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                
                // Draw rounded scale shape
                ctx.beginPath();
                ctx.arc(
                    x * scaleSize + offsetX,
                    y * scaleSize,
                    scaleSize / 2 - 1,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }
        }
        
        // Add some larger pattern variations
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = 20 + Math.random() * 40;
            
            // Create darker patches
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.ellipse(x, y, r, r * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Add some highlights
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = 5 + Math.random() * 15;
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        
        return texture;
    }
    
    createDinosaurNormalMap() {
        // Create a normal map for the dinosaur skin to give it bumpy texture
        const canvas = document.createElement('canvas');
        const size = 512;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Fill with neutral normal color (rgb(128,128,255))
        ctx.fillStyle = 'rgb(128,128,255)';
        ctx.fillRect(0, 0, size, size);
        
        // Create bumpy scales
        const scaleSize = 10;
        const rows = size / scaleSize;
        const cols = size / scaleSize;
        
        // Draw scale bumps in normal map format
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                // Offset every other row
                const offsetX = y % 2 === 0 ? 0 : scaleSize / 2;
                
                // Create gradient for each scale to simulate bump
                const centerX = x * scaleSize + offsetX;
                const centerY = y * scaleSize;
                
                const gradient = ctx.createRadialGradient(
                    centerX, centerY, 0,
                    centerX, centerY, scaleSize / 2
                );
                
                // Normal map colors: RGB = XYZ displacement
                // Brighter = raised, darker = depressed
                gradient.addColorStop(0, 'rgb(160,160,255)'); // Center is raised (brighter)
                gradient.addColorStop(0.8, 'rgb(128,128,255)'); // Neutral normal
                gradient.addColorStop(1, 'rgb(100,100,255)'); // Edge is lower (darker)
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(centerX, centerY, scaleSize / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Add some larger bumps and creases
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = 20 + Math.random() * 30;
            
            // Randomly decide if this is a bump (brighter) or depression (darker)
            const isBump = Math.random() > 0.5;
            const innerColor = isBump ? 'rgba(180,180,255,0.7)' : 'rgba(90,90,255,0.7)';
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
            gradient.addColorStop(0, innerColor);
            gradient.addColorStop(1, 'rgba(128,128,255,0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Create some wrinkles
        for (let i = 0; i < 20; i++) {
            const x1 = Math.random() * size;
            const y1 = Math.random() * size;
            const x2 = x1 + (Math.random() - 0.5) * 100;
            const y2 = y1 + (Math.random() - 0.5) * 100;
            const width = 2 + Math.random() * 8;
            
            ctx.strokeStyle = 'rgb(90,90,255)';
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            
            // Add highlight to one side of the wrinkle
            ctx.strokeStyle = 'rgb(160,160,255)';
            ctx.lineWidth = width / 2;
            ctx.beginPath();
            ctx.moveTo(x1 + 2, y1 + 2);
            ctx.lineTo(x2 + 2, y2 + 2);
            ctx.stroke();
        }
        
        // Create texture from canvas
        const normalMap = new THREE.CanvasTexture(canvas);
        normalMap.wrapS = THREE.RepeatWrapping;
        normalMap.wrapT = THREE.RepeatWrapping;
        normalMap.repeat.set(3, 3);
        
        return normalMap;
    }
}

// Create game instance when page loads
window.addEventListener('DOMContentLoaded', () => {
    try {
        window.game = new Game(); // Store in global scope for debugging
    } catch (error) {
        console.error('Failed to start game:', error);
        const debug = document.getElementById('debug');
        if (debug) {
            debug.style.display = 'block';
            debug.innerHTML = `Failed to start game: ${error.message}<br>Stack: ${error.stack}`;
        }
    }
}); 