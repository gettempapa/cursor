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
            pistol: { current: 12, max: 12, reserve: 48 }
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
        
        // Calculate shot direction with spread
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        
        const spread = this.weaponStats[this.currentWeapon].spread;
        direction.x += (Math.random() - 0.5) * spread;
        direction.y += (Math.random() - 0.5) * spread;
        direction.z += (Math.random() - 0.5) * spread;
        direction.normalize();
        
        // Create raycaster for hit detection
        const raycaster = new THREE.Raycaster();
        raycaster.set(camera.position, direction);
        
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
        const newWeapon = weaponType === 'rifle' ? this.createRifle() : this.createPistol();
        this.soldier.add(newWeapon);
    }
    
    getCurrentAmmo() {
        return this.ammo[this.currentWeapon];
    }
    
    update() {
        // Update weapon state, animations, etc.
    }
} 