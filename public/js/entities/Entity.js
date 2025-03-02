import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';
import { createBloodEffect, checkRayIntersection } from '../utils/helpers.js';

/**
 * Base Entity class for game entities like dinosaurs and enemies
 */
export class Entity {
    /**
     * Create a new entity
     * @param {THREE.Scene} scene - The scene to add the entity to
     * @param {THREE.Vector3} position - Initial position of the entity
     */
    constructor(scene, position) {
        this.scene = scene;
        this.position = position.clone();
        this.model = null;
        this.mixer = null;
        this.animations = {};
        this.health = 100;
        this.isDead = false;
        this.deathTime = 0;
        this.bloodParticles = [];
        this.targetPosition = null;
        this.moveSpeed = 0.1;
        this.wanderRadius = 30;
        this.lastUpdateTime = Date.now();
        this.boundingBox = null;
    }
    
    /**
     * Initialize the entity
     */
    init() {
        this.createModel();
        this.getNewTargetPosition();
    }
    
    /**
     * Create the entity model - to be implemented by subclasses
     */
    createModel() {
        throw new Error('createModel must be implemented by subclass');
    }
    
    /**
     * Get a new random target position for wandering
     */
    getNewTargetPosition() {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * this.wanderRadius;
        this.targetPosition = new THREE.Vector3(
            Math.cos(angle) * distance,
            0,
            Math.sin(angle) * distance
        );
    }
    
    /**
     * Update the entity
     * @param {number} deltaTime - Time since last update in seconds
     * @param {THREE.Vector3} playerPosition - Current player position
     */
    update(deltaTime, playerPosition) {
        if (this.isDead) return;
        
        // Update animation mixer
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
        
        // Update blood particles
        this.updateBloodParticles(deltaTime);
        
        // Move towards target position
        if (this.targetPosition && this.model) {
            // Calculate direction to target
            const direction = new THREE.Vector3().subVectors(this.targetPosition, this.model.position);
            
            // If we're close to the target, get a new one
            if (direction.length() < 1) {
                this.getNewTargetPosition();
                return;
            }
            
            // Normalize direction and move
            direction.normalize();
            
            // Move the model
            this.model.position.x += direction.x * this.moveSpeed * deltaTime * 60;
            this.model.position.z += direction.z * this.moveSpeed * deltaTime * 60;
            
            // Rotate to face direction of movement
            this.model.rotation.y = Math.atan2(direction.x, direction.z);
            
            // Update position
            this.position.copy(this.model.position);
            
            // Update bounding box
            if (this.boundingBox) {
                this.boundingBox.setFromObject(this.model);
            }
        }
        
        // Periodically get a new target position
        const now = Date.now();
        if (now - this.lastUpdateTime > 5000) {
            this.lastUpdateTime = now;
            this.getNewTargetPosition();
        }
    }
    
    /**
     * Take damage
     * @param {number} amount - Amount of damage to take
     * @param {THREE.Vector3} hitPosition - Position of the hit
     */
    takeDamage(amount, hitPosition) {
        if (this.isDead) return;
        
        this.health -= amount;
        
        // Create blood splatter
        this.createBloodSplatter(hitPosition);
        
        if (this.health <= 0) {
            this.die();
        }
    }
    
    /**
     * Create blood splatter effect
     * @param {THREE.Vector3} hitPosition - Position of the hit
     */
    createBloodSplatter(hitPosition) {
        const bloodEffect = createBloodEffect(this.scene, hitPosition);
        this.bloodParticles.push(bloodEffect);
    }
    
    /**
     * Update blood particles
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateBloodParticles(deltaTime) {
        for (let i = this.bloodParticles.length - 1; i >= 0; i--) {
            const isAlive = this.bloodParticles[i].update(deltaTime);
            
            if (!isAlive) {
                // Remove the points from the scene
                this.scene.remove(this.bloodParticles[i].points);
                
                // Remove from array
                this.bloodParticles.splice(i, 1);
            }
        }
    }
    
    /**
     * Handle death
     */
    die() {
        this.isDead = true;
        this.deathTime = Date.now();
        
        // Play death animation if available
        if (this.animations.death) {
            this.animations.death.reset().play();
        }
        
        // Remove from scene after delay
        setTimeout(() => {
            if (this.model) {
                this.scene.remove(this.model);
            }
        }, 5000);
    }
    
    /**
     * Check if a bullet hit this entity
     * @param {THREE.Vector3} rayOrigin - Origin of the ray
     * @param {THREE.Vector3} rayDirection - Direction of the ray
     * @returns {boolean} - Whether the entity was hit
     */
    checkBulletHit(rayOrigin, rayDirection) {
        if (this.isDead || !this.model) return false;
        
        const intersection = checkRayIntersection(rayOrigin, rayDirection, this.model);
        
        if (intersection) {
            // Apply damage
            this.takeDamage(25, intersection.point);
            return true;
        }
        
        return false;
    }
}

export default Entity; 