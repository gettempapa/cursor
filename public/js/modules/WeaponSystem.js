import * as THREE from 'three';
import { AudioManager } from '../utils/AudioManager.js';

export class WeaponSystem {
    constructor(soldier, scene) {
        this.soldier = soldier;
        this.scene = scene;
        this.isShooting = false;
        this.isReloading = false;
        this.reloadTime = 2000;
        
        // Weapon state
        this.currentWeapon = 'rifle';
        this.weaponMenuVisible = false;
        
        // Ammo system
        this.ammo = {
            rifle: { current: 30, max: 30, reserve: 90 },
            pistol: { current: 12, max: 12, reserve: 48 },
            rocketLauncher: { current: 3, max: 3, reserve: 9 }
        };
        
        // Weapon characteristics
        this.weaponStats = {
            rifle: {
                damage: 20,
                spread: 0.03,
                recoil: 0.02,
                fireRate: 100
            },
            pistol: {
                damage: 15,
                spread: 0.05,
                recoil: 0.03,
                fireRate: 200
            },
            rocketLauncher: {
                damage: 100,
                spread: 0.01,
                recoil: 0.05,
                fireRate: 1000,
                projectileSpeed: 0.5,
                explosionRadius: 5
            }
        };
        
        // Visual effects
        this.muzzleFlash = null;
        this.muzzleLight = null;
        this.flashDuration = 50;
        
        // Initialize audio
        this.audioManager = new AudioManager();
        
        // Create initial weapon
        this.switchWeapon('rifle');
    }
    
    createRifle() {
        const rifle = new THREE.Group();
        rifle.isWeapon = true;
        
        const rifleMaterial = new THREE.MeshStandardMaterial({ color: 0x2f2f2f });
        
        // Rifle body
        const rifleBody = new THREE.BoxGeometry(0.1, 0.15, 1.2);
        const rifleBodyMesh = new THREE.Mesh(rifleBody, rifleMaterial);
        rifleBodyMesh.position.set(0.4, 0.35, 0.3);
        rifleBodyMesh.rotation.set(0, -Math.PI/24, 0);
        
        // Add rifle parts
        this.addRifleParts(rifleBodyMesh, rifleMaterial);
        
        // Add muzzle flash
        this.setupMuzzleFlash(rifleBodyMesh);
        
        rifle.add(rifleBodyMesh);
        return rifle;
    }
    
    addRifleParts(rifleBodyMesh, rifleMaterial) {
        // Stock
        const stockGeometry = new THREE.BoxGeometry(0.1, 0.25, 0.3);
        const stock = new THREE.Mesh(stockGeometry, rifleMaterial);
        stock.position.set(0, -0.05, -0.6);
        rifleBodyMesh.add(stock);
        
        // Scope
        const scopeGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.15, 8);
        const scope = new THREE.Mesh(scopeGeometry, rifleMaterial);
        scope.rotation.x = Math.PI / 2;
        scope.position.set(0, 0.1, 0.2);
        rifleBodyMesh.add(scope);
    }
    
    createPistol() {
        const pistol = new THREE.Group();
        pistol.isWeapon = true;
        
        const pistolMaterial = new THREE.MeshStandardMaterial({ color: 0x2f2f2f });
        
        // Pistol body
        const pistolBody = new THREE.BoxGeometry(0.08, 0.15, 0.4);
        const pistolBodyMesh = new THREE.Mesh(pistolBody, pistolMaterial);
        pistolBodyMesh.position.set(0.4, 0.35, 0.3);
        pistolBodyMesh.rotation.set(0, -Math.PI/24, 0);
        
        // Add pistol grip
        const gripGeometry = new THREE.BoxGeometry(0.08, 0.2, 0.12);
        const grip = new THREE.Mesh(gripGeometry, pistolMaterial);
        grip.position.set(0, -0.15, 0);
        pistolBodyMesh.add(grip);
        
        // Add muzzle flash
        this.setupMuzzleFlash(pistolBodyMesh);
        
        pistol.add(pistolBodyMesh);
        return pistol;
    }
    
    setupMuzzleFlash(weaponMesh) {
        // Create muzzle flash
        const flashGeometry = new THREE.SphereGeometry(
            this.currentWeapon === 'rifle' ? 0.15 : 0.08,
            8,
            8
        );
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0,
            emissive: 0xffff00,
            emissiveIntensity: 1.0
        });
        
        this.muzzleFlash = new THREE.Mesh(flashGeometry, flashMaterial);
        this.muzzleFlash.position.set(
            0,
            0,
            this.currentWeapon === 'rifle' ? 0.7 : 0.25
        );
        
        // Create muzzle light
        this.muzzleLight = new THREE.PointLight(
            0xffaa00,
            0,
            this.currentWeapon === 'rifle' ? 5 : 2
        );
        this.muzzleLight.position.copy(this.muzzleFlash.position);
        
        weaponMesh.add(this.muzzleFlash);
        weaponMesh.add(this.muzzleLight);
    }
    
    createRocketLauncher() {
        const rocketLauncher = new THREE.Group();
        rocketLauncher.isWeapon = true;
        
        const launcherMaterial = new THREE.MeshStandardMaterial({ color: 0x3f3f3f });
        
        // Main tube
        const tubeGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 12);
        const tube = new THREE.Mesh(tubeGeometry, launcherMaterial);
        tube.rotation.z = Math.PI / 2;
        tube.position.set(0.4, 0.35, 0.3);
        
        // Back support
        const supportGeometry = new THREE.BoxGeometry(0.15, 0.25, 0.4);
        const support = new THREE.Mesh(supportGeometry, launcherMaterial);
        support.position.set(0, -0.1, -0.5);
        tube.add(support);
        
        // Sight
        const sightGeometry = new THREE.BoxGeometry(0.05, 0.15, 0.05);
        const sight = new THREE.Mesh(sightGeometry, launcherMaterial);
        sight.position.set(0, 0.15, 0.2);
        tube.add(sight);
        
        // Add muzzle flash
        const flashGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 0,
            emissive: 0xff4400,
            emissiveIntensity: 1.0
        });
        
        this.muzzleFlash = new THREE.Mesh(flashGeometry, flashMaterial);
        this.muzzleFlash.position.set(0, 0, 0.8);
        
        this.muzzleLight = new THREE.PointLight(0xff4400, 0, 8);
        this.muzzleLight.position.copy(this.muzzleFlash.position);
        
        tube.add(this.muzzleFlash);
        tube.add(this.muzzleLight);
        
        rocketLauncher.add(tube);
        return rocketLauncher;
    }

    createRocket(position, direction) {
        const rocketGroup = new THREE.Group();
        
        // Rocket body
        const rocketMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
        const bodyGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
        const body = new THREE.Mesh(bodyGeometry, rocketMaterial);
        body.rotation.x = Math.PI / 2;
        
        // Rocket tip
        const tipGeometry = new THREE.ConeGeometry(0.05, 0.1, 8);
        const tip = new THREE.Mesh(tipGeometry, rocketMaterial);
        tip.position.z = 0.2;
        tip.rotation.x = Math.PI / 2;
        
        // Rocket fins
        const finMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const finGeometry = new THREE.BoxGeometry(0.1, 0.02, 0.1);
        for (let i = 0; i < 4; i++) {
            const fin = new THREE.Mesh(finGeometry, finMaterial);
            fin.position.z = -0.1;
            fin.rotation.z = (Math.PI / 2) * i;
            body.add(fin);
        }
        
        rocketGroup.add(body);
        rocketGroup.add(tip);
        
        // Add smoke trail particle system
        const smokeParticles = new THREE.Group();
        rocketGroup.smokeParticles = smokeParticles;
        this.scene.add(smokeParticles);
        
        // Set rocket properties
        rocketGroup.position.copy(position);
        rocketGroup.velocity = direction.multiplyScalar(this.weaponStats.rocketLauncher.projectileSpeed);
        rocketGroup.distanceTraveled = 0;
        rocketGroup.maxDistance = 30; // 100 feet equivalent
        
        return rocketGroup;
    }

    createSmokeParticle(position) {
        const smokeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const smokeMaterial = new THREE.MeshBasicMaterial({
            color: 0x888888,
            transparent: true,
            opacity: 0.4
        });
        const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial);
        smoke.position.copy(position);
        smoke.scale.set(0.1, 0.1, 0.1);
        smoke.birthTime = Date.now();
        smoke.lifetime = 1000; // milliseconds
        return smoke;
    }

    updateRockets() {
        if (!this.activeRockets) this.activeRockets = [];
        const now = Date.now();
        
        // Update each rocket
        for (let i = this.activeRockets.length - 1; i >= 0; i--) {
            const rocket = this.activeRockets[i];
            
            // Move rocket
            rocket.position.add(rocket.velocity);
            rocket.distanceTraveled += rocket.velocity.length();
            
            // Add smoke particle
            if (rocket.smokeParticles) {
                const smoke = this.createSmokeParticle(rocket.position.clone());
                rocket.smokeParticles.add(smoke);
            }
            
            // Update smoke particles
            if (rocket.smokeParticles) {
                rocket.smokeParticles.children.forEach((smoke, index) => {
                    const age = now - smoke.birthTime;
                    if (age > smoke.lifetime) {
                        rocket.smokeParticles.remove(smoke);
                    } else {
                        const lifePercent = age / smoke.lifetime;
                        smoke.material.opacity = 0.4 * (1 - lifePercent);
                        smoke.scale.addScalar(0.01);
                    }
                });
            }
            
            // Check for collisions or max distance
            const raycaster = new THREE.Raycaster(
                rocket.position.clone(),
                rocket.velocity.clone().normalize(),
                0,
                rocket.velocity.length()
            );
            const intersects = raycaster.intersectObjects(this.scene.children, true);
            
            const shouldExplode = intersects.length > 0 || rocket.distanceTraveled >= rocket.maxDistance;
            
            if (shouldExplode) {
                this.createExplosion(rocket.position.clone());
                // Remove rocket and its smoke trail
                this.scene.remove(rocket);
                if (rocket.smokeParticles) {
                    this.scene.remove(rocket.smokeParticles);
                }
                this.activeRockets.splice(i, 1);
                
                // Apply damage to objects within explosion radius
                const explosionRadius = this.weaponStats.rocketLauncher.explosionRadius;
                this.scene.children.forEach(object => {
                    if (object.isEnemy || object.isPlayer) {
                        const distance = object.position.distanceTo(rocket.position);
                        if (distance <= explosionRadius) {
                            const damage = Math.floor(
                                this.weaponStats.rocketLauncher.damage * 
                                (1 - distance / explosionRadius)
                            );
                            if (object.takeDamage) {
                                object.takeDamage(damage);
                            }
                        }
                    }
                });
            }
        }
    }

    createExplosion(position) {
        // Explosion light
        const light = new THREE.PointLight(0xff4400, 5, 10);
        light.position.copy(position);
        this.scene.add(light);
        
        // Explosion particles
        const explosionGroup = new THREE.Group();
        const particleCount = 20;
        const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 0.8
        });
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(position);
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3
            );
            particle.birthTime = Date.now();
            explosionGroup.add(particle);
        }
        
        this.scene.add(explosionGroup);
        
        // Fade out and remove explosion effects
        setTimeout(() => {
            const fadeInterval = setInterval(() => {
                light.intensity *= 0.9;
                explosionGroup.children.forEach(particle => {
                    particle.material.opacity *= 0.9;
                    particle.position.add(particle.velocity);
                    particle.velocity.y -= 0.01; // Add gravity to particles
                });
                
                if (light.intensity < 0.1) {
                    clearInterval(fadeInterval);
                    this.scene.remove(light);
                    this.scene.remove(explosionGroup);
                }
            }, 50);
        }, 100);
    }
    
    shoot(camera, onHit) {
        if (this.isShooting || this.isReloading) return false;
        
        const ammoInfo = this.ammo[this.currentWeapon];
        if (ammoInfo.current <= 0) {
            if (ammoInfo.reserve > 0) {
                this.reload();
            }
            return false;
        }
        
        this.isShooting = true;
        ammoInfo.current--;
        
        // Show muzzle flash
        if (this.muzzleFlash) {
            this.muzzleFlash.material.opacity = 1;
            this.muzzleLight.intensity = 3;
        }
        
        if (this.currentWeapon === 'rocketLauncher') {
            // Create and launch rocket
            const direction = new THREE.Vector3();
            camera.getWorldDirection(direction);
            
            const rocketStartPos = new THREE.Vector3();
            camera.getWorldPosition(rocketStartPos);
            rocketStartPos.add(direction.multiplyScalar(1.5));
            
            const rocket = this.createRocket(rocketStartPos, direction);
            if (!this.activeRockets) this.activeRockets = [];
            this.activeRockets.push(rocket);
            this.scene.add(rocket);
        } else {
            // Regular weapon shooting logic
            const direction = new THREE.Vector3();
            camera.getWorldDirection(direction);
            
            const spread = this.weaponStats[this.currentWeapon].spread;
            direction.x += (Math.random() - 0.5) * spread;
            direction.y += (Math.random() - 0.5) * spread;
            direction.z += (Math.random() - 0.5) * spread;
            direction.normalize();
            
            const raycaster = new THREE.Raycaster();
            raycaster.set(camera.position, direction);
            
            const intersects = raycaster.intersectObjects(this.scene.children, true);
            if (intersects.length > 0 && onHit) {
                onHit(intersects[0]);
            }
        }
        
        // Play sound
        this.audioManager.playGunshot();
        
        // Hide muzzle flash after duration
        setTimeout(() => {
            if (this.muzzleFlash) {
                this.muzzleFlash.material.opacity = 0;
                this.muzzleLight.intensity = 0;
            }
            this.isShooting = false;
        }, this.flashDuration);
        
        return true;
    }
    
    reload() {
        if (this.isReloading) return;
        
        const ammoInfo = this.ammo[this.currentWeapon];
        if (ammoInfo.current === ammoInfo.max || ammoInfo.reserve <= 0) return;
        
        this.isReloading = true;
        
        setTimeout(() => {
            const neededAmmo = ammoInfo.max - ammoInfo.current;
            const reloadAmount = Math.min(neededAmmo, ammoInfo.reserve);
            
            ammoInfo.current += reloadAmount;
            ammoInfo.reserve -= reloadAmount;
            
            this.isReloading = false;
        }, this.reloadTime);
    }
    
    switchWeapon(weaponType) {
        if (weaponType === this.currentWeapon) return;
        
        const oldWeapon = this.soldier.children.find(child => child.isWeapon);
        if (oldWeapon) {
            this.soldier.remove(oldWeapon);
        }
        
        this.currentWeapon = weaponType;
        const newWeapon = weaponType === 'rifle' ? this.createRifle() : weaponType === 'pistol' ? this.createPistol() : this.createRocketLauncher();
        this.soldier.add(newWeapon);
    }
    
    getCurrentAmmo() {
        return this.ammo[this.currentWeapon];
    }
    
    update() {
        if (this.activeRockets) {
            this.updateRockets();
        }
    }
} 