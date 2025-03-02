import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';

/**
 * Creates a random color from an array of colors
 * @param {Array} colorArray - Array of color values
 * @returns {number} - Random color from the array
 */
export function getRandomColor(colorArray) {
    return colorArray[Math.floor(Math.random() * colorArray.length)];
}

/**
 * Generates a random position within a radius
 * @param {number} radius - The maximum radius
 * @param {number} centerX - X coordinate of center (default 0)
 * @param {number} centerZ - Z coordinate of center (default 0)
 * @returns {THREE.Vector3} - Random position
 */
export function getRandomPosition(radius, centerX = 0, centerZ = 0) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius;
    return new THREE.Vector3(
        centerX + Math.cos(angle) * distance,
        0, // Y is always 0 (ground level)
        centerZ + Math.sin(angle) * distance
    );
}

/**
 * Creates a blood splatter effect
 * @param {THREE.Scene} scene - The scene to add particles to
 * @param {THREE.Vector3} position - Position of the blood splatter
 * @param {number} count - Number of particles to create
 * @param {number} size - Size of each particle
 * @returns {Object} - Blood particles object with geometry, material, and particles
 */
export function createBloodEffect(scene, position, count = 20, size = 0.1) {
    const particles = [];
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({
        color: 0x8B0000,
        size: size,
        transparent: true,
        opacity: 0.8
    });
    
    // Create particles
    for (let i = 0; i < count; i++) {
        const particle = {
            position: new THREE.Vector3(
                position.x + (Math.random() - 0.5) * 0.5,
                position.y + (Math.random() - 0.5) * 0.5,
                position.z + (Math.random() - 0.5) * 0.5
            ),
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                Math.random() * 0.2,
                (Math.random() - 0.5) * 0.1
            ),
            life: 1.0
        };
        particles.push(particle);
    }
    
    // Create the points system
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        positions[i * 3] = particles[i].position.x;
        positions[i * 3 + 1] = particles[i].position.y;
        positions[i * 3 + 2] = particles[i].position.z;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    
    return {
        geometry,
        material,
        particles,
        points,
        update: function(deltaTime) {
            let alive = false;
            
            for (let i = 0; i < this.particles.length; i++) {
                const particle = this.particles[i];
                
                if (particle.life > 0) {
                    alive = true;
                    
                    // Update position
                    particle.position.add(particle.velocity);
                    
                    // Apply gravity
                    particle.velocity.y -= 0.01;
                    
                    // Update life
                    particle.life -= deltaTime;
                    
                    // Update position in buffer
                    positions[i * 3] = particle.position.x;
                    positions[i * 3 + 1] = particle.position.y;
                    positions[i * 3 + 2] = particle.position.z;
                }
            }
            
            // Update the geometry
            geometry.attributes.position.needsUpdate = true;
            
            // Update opacity based on life
            material.opacity = Math.max(0, particles[0].life);
            
            return alive;
        }
    };
}

/**
 * Checks if a ray intersects with a mesh
 * @param {THREE.Vector3} rayOrigin - Origin of the ray
 * @param {THREE.Vector3} rayDirection - Direction of the ray
 * @param {THREE.Mesh} mesh - Mesh to check intersection with
 * @returns {Object|null} - Intersection data or null if no intersection
 */
export function checkRayIntersection(rayOrigin, rayDirection, mesh) {
    const raycaster = new THREE.Raycaster(rayOrigin, rayDirection);
    const intersects = raycaster.intersectObject(mesh, true);
    
    if (intersects.length > 0) {
        return intersects[0];
    }
    
    return null;
}

/**
 * Creates an impact effect at the specified position
 * @param {THREE.Scene} scene - The scene to add the effect to
 * @param {THREE.Vector3} position - Position of the impact
 * @param {THREE.Vector3} normal - Normal vector of the impact surface
 * @returns {Object} - Impact effect object
 */
export function createImpactEffect(scene, position, normal) {
    // Create a small sphere at the impact point
    const geometry = new THREE.SphereGeometry(0.05, 8, 8);
    const material = new THREE.MeshBasicMaterial({
        color: 0xFFFF00,
        transparent: true,
        opacity: 1.0
    });
    
    const impact = new THREE.Mesh(geometry, material);
    impact.position.copy(position);
    scene.add(impact);
    
    // Create particles
    const particleCount = 10;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.02, 4, 4),
            new THREE.MeshBasicMaterial({
                color: 0xFFAA00,
                transparent: true,
                opacity: 1.0
            })
        );
        
        // Position at impact point
        particle.position.copy(position);
        
        // Calculate velocity - mostly along the normal direction with some randomness
        const velocity = new THREE.Vector3(
            normal.x + (Math.random() - 0.5) * 0.5,
            normal.y + (Math.random() - 0.5) * 0.5,
            normal.z + (Math.random() - 0.5) * 0.5
        ).normalize().multiplyScalar(0.1 + Math.random() * 0.1);
        
        particle.userData.velocity = velocity;
        particle.userData.life = 1.0;
        
        scene.add(particle);
        particles.push(particle);
    }
    
    return {
        impact,
        particles,
        update: function(deltaTime) {
            // Fade out the impact
            impact.material.opacity -= deltaTime * 2;
            
            // Update particles
            let alive = impact.material.opacity > 0;
            
            for (const particle of particles) {
                if (particle.userData.life > 0) {
                    alive = true;
                    
                    // Move particle
                    particle.position.add(particle.userData.velocity);
                    
                    // Apply gravity
                    particle.userData.velocity.y -= 0.01;
                    
                    // Reduce life
                    particle.userData.life -= deltaTime;
                    
                    // Update opacity
                    particle.material.opacity = particle.userData.life;
                }
            }
            
            return alive;
        },
        cleanup: function() {
            scene.remove(impact);
            for (const particle of particles) {
                scene.remove(particle);
            }
        }
    };
}

export default {
    getRandomColor,
    getRandomPosition,
    createBloodEffect,
    checkRayIntersection,
    createImpactEffect
}; 