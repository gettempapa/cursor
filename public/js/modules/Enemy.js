import * as THREE from 'three';
import { WeaponSystem } from './WeaponSystem.js';

export class Enemy {
    constructor(scene, position = new THREE.Vector3(-5, 1, -5)) {
        this.scene = scene;
        this.health = 100;
        this.maxHealth = 100;
        this.moveSpeed = 0.05;
        this.rotationSpeed = 0.02;
        
        // Create enemy mesh
        this.object = new THREE.Group();
        this.soldier = this.createSoldierMesh();
        this.object.add(this.soldier);
        this.object.position.copy(position);
        
        // Initialize weapon system
        this.weaponSystem = new WeaponSystem(this.soldier, scene);
        
        // AI settings
        this.target = new THREE.Vector3();
        this.rotationTarget = 0;
        this.updateInterval = 3000;
        this.lastShot = 0;
        this.shootInterval = 2000;
        this.levelRadius = 20;
        
        // Start AI behavior
        this.updateTarget();
        this.updateIntervalId = setInterval(() => this.updateTarget(), this.updateInterval);
    }
    
    createSoldierMesh() {
        const soldier = new THREE.Group();
        
        // Body (torso)
        const torsoGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.4);
        const uniformMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000 }); // Dark red for enemy
        const torso = new THREE.Mesh(torsoGeometry, uniformMaterial);
        torso.position.y = 0.4;
        soldier.add(torso);
        
        // Add other body parts
        this.addBodyParts(soldier, uniformMaterial);
        
        return soldier;
    }
    
    addBodyParts(soldier, uniformMaterial) {
        // Head
        const headGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xe0b59e });
        const head = new THREE.Mesh(headGeometry, skinMaterial);
        head.position.y = 0.95;
        soldier.add(head);
        
        // Helmet
        const helmetGeometry = new THREE.BoxGeometry(0.35, 0.2, 0.35);
        const helmetMaterial = new THREE.MeshStandardMaterial({ color: 0x4a0000 });
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
    
    update(player, collisionSystem) {
        // Calculate distance to player
        const distanceToPlayer = this.object.position.distanceTo(player.getPosition());
        const idealRange = 10;
        
        // Enemy behavior states
        const isTooClose = distanceToPlayer < idealRange * 0.7;
        const isTooFar = distanceToPlayer > idealRange * 1.3;
        const hasLineOfSight = this.checkLineOfSight(player);
        
        // Determine target position based on state
        let targetPosition;
        if (!hasLineOfSight) {
            targetPosition = player.getPosition();
        } else if (isTooClose) {
            const awayFromPlayer = this.object.position.clone()
                .sub(player.getPosition())
                .normalize();
            targetPosition = this.object.position.clone()
                .add(awayFromPlayer.multiplyScalar(5));
        } else if (isTooFar) {
            const toPlayer = player.getPosition().clone()
                .sub(this.object.position)
                .normalize();
            targetPosition = this.object.position.clone()
                .add(toPlayer.multiplyScalar(2));
        } else {
            const toPlayer = player.getPosition().clone()
                .sub(this.object.position)
                .normalize();
            const strafeDir = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x);
            targetPosition = this.object.position.clone()
                .add(strafeDir.multiplyScalar(Math.sin(Date.now() * 0.001) * 2));
        }
        
        // Move towards target
        this.moveTowardsTarget(targetPosition, collisionSystem);
        
        // Face player
        const toPlayer = new THREE.Vector3();
        toPlayer.subVectors(player.getPosition(), this.object.position);
        this.object.rotation.y = Math.atan2(-toPlayer.x, -toPlayer.z);
        
        // Shooting logic
        const currentTime = performance.now();
        if (currentTime - this.lastShot > this.shootInterval && hasLineOfSight) {
            this.shoot(player);
            this.lastShot = currentTime;
            this.shootInterval = 1500 + Math.random() * 1000;
        }
        
        // Update weapon system
        this.weaponSystem.update();
    }
    
    moveTowardsTarget(targetPosition, collisionSystem) {
        const direction = targetPosition.clone().sub(this.object.position);
        if (direction.length() > 0.1) {
            direction.normalize();
            
            const newPosition = this.object.position.clone()
                .add(direction.multiplyScalar(this.moveSpeed));
            
            const collisionResult = collisionSystem.checkCollisions(newPosition);
            if (!collisionResult.hasCollision) {
                this.object.position.copy(newPosition);
                this.animateLegs();
            } else {
                this.updateTarget();
            }
        } else {
            this.resetLegs();
        }
    }
    
    animateLegs() {
        const time = performance.now() * 0.005;
        const leftLeg = this.soldier.children.find(child => child.position.x === 0.15 && child.position.y === -0.3);
        const rightLeg = this.soldier.children.find(child => child.position.x === -0.15 && child.position.y === -0.3);
        
        if (leftLeg && rightLeg) {
            leftLeg.rotation.x = Math.sin(time) * 0.5;
            rightLeg.rotation.x = Math.sin(time + Math.PI) * 0.5;
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
    
    updateTarget() {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * this.levelRadius;
        this.target.set(
            Math.cos(angle) * radius,
            1,
            Math.sin(angle) * radius
        );
        this.rotationTarget = Math.random() * Math.PI * 2;
    }
    
    checkLineOfSight(player) {
        const raycaster = new THREE.Raycaster();
        const toPlayer = player.getPosition().clone().sub(this.object.position);
        const distance = toPlayer.length();
        
        raycaster.set(
            this.object.position,
            toPlayer.normalize()
        );
        
        const obstacles = [];
        this.scene.traverse(object => {
            if (object.isMesh && 
                object !== this.object && 
                object !== player.object) {
                obstacles.push(object);
            }
        });
        
        const intersects = raycaster.intersectObjects(obstacles);
        return intersects.length === 0 || intersects[0].distance > distance;
    }
    
    shoot(player) {
        // Calculate hit chance based on distance
        const distanceToPlayer = this.object.position.distanceTo(player.getPosition());
        const maxRange = 20;
        const hitChance = Math.max(0, 1 - (distanceToPlayer / maxRange));
        
        if (Math.random() < hitChance * 0.3) {
            player.takeDamage(20);
        }
        
        this.weaponSystem.shoot(this.object, null);
    }
    
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        return this.health;
    }
    
    destroy() {
        clearInterval(this.updateIntervalId);
        this.scene.remove(this.object);
    }
    
    getPosition() {
        return this.object.position;
    }
    
    getRotation() {
        return this.object.rotation;
    }
} 