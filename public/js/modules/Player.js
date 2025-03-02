import * as THREE from 'three';
import { WeaponSystem } from './WeaponSystem.js';

export class Player {
    constructor(scene) {
        this.scene = scene;
        this.moveSpeed = 0.1;
        this.rotationSpeed = 0.002;
        this.jumpForce = 0.3;
        this.gravity = -0.015;
        this.health = 100;
        this.maxHealth = 100;
        this.isGrounded = true;
        this.isDead = false;
        
        // Movement state
        this.velocity = new THREE.Vector3();
        this.moveState = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false
        };
        
        // Create player mesh
        this.object = new THREE.Group();
        this.soldier = this.createSoldierMesh();
        this.object.add(this.soldier);
        this.object.position.set(5, 1, 5);
        this.object.rotation.y = Math.PI;
        
        // Add player to scene
        this.scene.add(this.object);
        
        // Camera settings
        this.setupCamera();
        
        // Initialize weapon system
        this.weaponSystem = new WeaponSystem(this.soldier, scene);
        
        // Animation state
        this.legAngle = 0;
        this.legAnimationSpeed = 0.15;
        this.verticalAngle = 0;
        this.minVerticalAngle = -Math.PI / 6;
        this.maxVerticalAngle = Math.PI / 3;
    }
    
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.cameraOffset = new THREE.Vector3(0, 2, 9.75);
        this.cameraLookOffset = new THREE.Vector3(0, 1, 0);
        
        // Set initial camera position
        this.updateCamera();
    }
    
    createSoldierMesh() {
        const soldier = new THREE.Group();
        
        // Body (torso)
        const torsoGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.4);
        const uniformMaterial = new THREE.MeshStandardMaterial({ color: 0x4a5243 });
        const torso = new THREE.Mesh(torsoGeometry, uniformMaterial);
        torso.position.y = 0.4;
        soldier.add(torso);
        
        // Head
        const headGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xe0b59e });
        const head = new THREE.Mesh(headGeometry, skinMaterial);
        head.position.y = 0.95;
        soldier.add(head);
        
        // Add other body parts...
        this.addBodyParts(soldier, uniformMaterial);
        
        return soldier;
    }
    
    addBodyParts(soldier, uniformMaterial) {
        // Helmet
        const helmetGeometry = new THREE.BoxGeometry(0.35, 0.2, 0.35);
        const helmetMaterial = new THREE.MeshStandardMaterial({ color: 0x2f3230 });
        const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
        helmet.position.y = 1.1;
        soldier.add(helmet);
        
        // Legs
        const legGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        const leftLeg = new THREE.Mesh(legGeometry, uniformMaterial);
        leftLeg.position.set(0.15, -0.3, 0);
        soldier.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, uniformMaterial);
        rightLeg.position.set(-0.15, -0.3, 0);
        soldier.add(rightLeg);
        
        // Arms
        const armGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        const leftArm = new THREE.Mesh(armGeometry, uniformMaterial);
        leftArm.position.set(0.4, 0.4, 0);
        soldier.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, uniformMaterial);
        rightArm.position.set(-0.4, 0.4, 0);
        soldier.add(rightArm);
    }
    
    update(collisionSystem) {
        if (this.isDead) return;
        
        this.updateMovement(collisionSystem);
        this.updateCamera();
        this.weaponSystem.update();
    }
    
    updateMovement(collisionSystem) {
        if (this.isDead) return;
        
        // Update vertical movement (jumping/falling)
        if (!this.isGrounded) {
            this.velocity.y += this.gravity;
            const newPosition = new THREE.Vector3(
                this.object.position.x,
                this.object.position.y + this.velocity.y,
                this.object.position.z
            );
            
            const collisionResult = collisionSystem.checkCollisions(newPosition);
            
            if (collisionResult.hasCollision) {
                // Hit something from the side or bottom
                this.velocity.y = 0;
                this.isGrounded = true;
            } else {
                // Update position, might be adjusted by collision detection
                this.object.position.y = collisionResult.newY;
                
                // Check if landed on ground or crate
                if (this.object.position.y <= 1) {
                    this.object.position.y = 1;
                    this.velocity.y = 0;
                    this.isGrounded = true;
                } else if (collisionResult.newY !== newPosition.y) {
                    // Landed on a crate or other surface
                    this.velocity.y = 0;
                    this.isGrounded = true;
                }
            }
        }
        
        // Calculate horizontal movement
        const direction = new THREE.Vector3();
        
        if (this.moveState.forward) direction.z -= 1;
        if (this.moveState.backward) direction.z += 1;
        if (this.moveState.left) direction.x -= 1;
        if (this.moveState.right) direction.x += 1;
        
        if (direction.length() > 0) {
            direction.normalize();
            direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.object.rotation.y);
            
            this.animateLegs();
            
            const newPosition = new THREE.Vector3(
                this.object.position.x + direction.x * this.moveSpeed,
                this.object.position.y,
                this.object.position.z + direction.z * this.moveSpeed
            );
            
            const collisionResult = collisionSystem.checkCollisions(newPosition);
            if (!collisionResult.hasCollision) {
                this.object.position.x = newPosition.x;
                this.object.position.z = newPosition.z;
                if (collisionResult.newY !== newPosition.y) {
                    this.object.position.y = collisionResult.newY;
                }
            }
        } else {
            this.resetLegs();
        }
    }
    
    animateLegs() {
        this.legAngle += this.legAnimationSpeed;
        const leftLeg = this.soldier.children.find(child => child.position.x === 0.15 && child.position.y === -0.3);
        const rightLeg = this.soldier.children.find(child => child.position.x === -0.15 && child.position.y === -0.3);
        
        if (leftLeg && rightLeg) {
            leftLeg.rotation.x = Math.sin(this.legAngle) * 0.5;
            rightLeg.rotation.x = Math.sin(this.legAngle + Math.PI) * 0.5;
        }
    }
    
    resetLegs() {
        const leftLeg = this.soldier.children.find(child => child.position.x === 0.15 && child.position.y === -0.3);
        const rightLeg = this.soldier.children.find(child => child.position.x === -0.15 && child.position.y === -0.3);
        
        if (leftLeg && rightLeg) {
            leftLeg.rotation.x = 0;
            rightLeg.rotation.x = 0;
        }
    }
    
    updateCamera() {
        if (!this.camera) return;
        
        // Calculate camera position based on player position and offset
        const cameraPosition = this.object.position.clone().add(this.cameraOffset);
        this.camera.position.copy(cameraPosition);
        
        // Calculate look target
        const lookTarget = this.object.position.clone().add(this.cameraLookOffset);
        this.camera.lookAt(lookTarget);
    }
    
    handleMouseMovement(movementX, movementY) {
        if (this.isDead) return;
        
        // Rotate player horizontally
        this.object.rotation.y -= movementX * this.rotationSpeed;
        
        // Update vertical angle for camera
        this.verticalAngle = Math.max(
            this.minVerticalAngle,
            Math.min(this.maxVerticalAngle, this.verticalAngle - movementY * this.rotationSpeed)
        );
        
        // Update camera position
        this.updateCamera();
    }
    
    handleZoom(deltaY) {
        this.currentZoomDistance += deltaY * this.zoomSpeed;
        this.currentZoomDistance = Math.max(
            this.minZoomDistance,
            Math.min(this.maxZoomDistance, this.currentZoomDistance)
        );
        this.cameraOffset.z = this.currentZoomDistance;
        this.updateCamera();
    }
    
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        if (this.health <= 0 && !this.isDead) {
            this.die();
        }
        return this.health;
    }
    
    die() {
        this.isDead = true;
        // Death event can be handled by game manager
    }
    
    respawn() {
        this.isDead = false;
        this.health = this.maxHealth;
        this.object.position.set(5, 1, 5);
        this.object.rotation.set(0, 0, 0);
        this.soldier.rotation.set(0, 0, 0);
    }
    
    getPosition() {
        return this.object.position;
    }
    
    getRotation() {
        return this.object.rotation;
    }
} 