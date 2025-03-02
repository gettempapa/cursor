import * as THREE from 'three/build/three.module.js';

export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.trees = [];
        this.crates = [];
        this.bunkerBox = null;
        this.treeCollisionRadius = 1.5;
        
        this.setupEnvironment();
    }
    
    setupEnvironment() {
        // Create ground first
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d5a27, // Rich grass green
            roughness: 0.8,
            metalness: 0.0,
            side: THREE.DoubleSide,
            receiveShadow: true
        });
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        ground.position.y = 0; // Place at y=0
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Reduced ambient light intensity
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        
        this.scene.add(ambientLight);
        this.scene.add(directionalLight);

        // Add other environment elements
        this.createCastleTower();
        this.createTrees();
        this.createBushes();
        this.createBunker();
        this.createCrates();
    }
    
    createPineTree(x, z, scale = 1, type = 'pine') {
        const treeGroup = new THREE.Group();
        
        // Randomize characteristics
        const heightVariation = 0.8 + Math.random() * 0.4;
        const trunkTwist = (Math.random() - 0.5) * 0.2;
        
        // Create trunk
        const trunkGeometry = new THREE.CylinderGeometry(
            0.2 * scale,
            0.3 * scale,
            4 * scale * heightVariation,
            8
        );
        const trunkMaterial = new THREE.MeshStandardMaterial({
            color: type === 'pine' ? 0x4d2926 : 0x6b4423,
            roughness: 0.9,
            metalness: 0.1,
            bumpScale: 0.5
        });
        
        // Add trunk twist
        const trunkPositions = trunkGeometry.attributes.position.array;
        for (let i = 0; i < trunkPositions.length; i += 3) {
            const y = trunkPositions[i + 1];
            const angle = y * trunkTwist;
            const x = trunkPositions[i];
            const z = trunkPositions[i + 2];
            trunkPositions[i] = x * Math.cos(angle) - z * Math.sin(angle);
            trunkPositions[i + 2] = x * Math.sin(angle) + z * Math.cos(angle);
        }
        trunkGeometry.attributes.position.needsUpdate = true;
        
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 2 * scale;
        treeGroup.add(trunk);
        
        // Create foliage
        const leafMaterial = new THREE.MeshStandardMaterial({
            color: type === 'pine' ? 0x0b5c0b : 0x2d5a27,
            roughness: 0.8
        });
        
        // Add foliage layers
        this.createTreeLayer(treeGroup, 5.5, 1.5, 3, scale, leafMaterial);
        this.createTreeLayer(treeGroup, 4.5, 1.8, 2.5, scale, leafMaterial);
        this.createTreeLayer(treeGroup, 3.5, 2, 2, scale, leafMaterial);
        
        treeGroup.position.set(x, 0, z);
        
        // Store tree for collision detection
        this.trees.push({
            position: new THREE.Vector2(x, z),
            radius: this.treeCollisionRadius * scale
        });
        
        return treeGroup;
    }
    
    createTreeLayer(treeGroup, y, radius, height, scale, material) {
        const coneGeometry = new THREE.ConeGeometry(radius * scale, height * scale, 8);
        const cone = new THREE.Mesh(coneGeometry, material);
        cone.position.y = y * scale;
        treeGroup.add(cone);
    }
    
    createTrees() {
        const treeTypes = ['pine', 'oak'];
        const treeCount = 25;
        
        for (let i = 0; i < treeCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 10 + Math.random() * 15;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            const type = treeTypes[Math.floor(Math.random() * treeTypes.length)];
            const scale = 0.8 + Math.random() * 0.4;
            
            const tree = this.createPineTree(x, z, scale, type);
            this.scene.add(tree);
            
            // Add cluster trees
            if (Math.random() < 0.3) {
                const nearbyAngle = angle + (Math.random() - 0.5) * Math.PI / 4;
                const nearbyRadius = radius + (Math.random() - 0.5) * 3;
                const nearbyX = Math.cos(nearbyAngle) * nearbyRadius;
                const nearbyZ = Math.sin(nearbyAngle) * nearbyRadius;
                const nearbyTree = this.createPineTree(nearbyX, nearbyZ, scale * 0.8, type);
                this.scene.add(nearbyTree);
            }
        }
    }
    
    createBush(x, z, scale = 1) {
        const bushGroup = new THREE.Group();
        
        const bushMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d5a27,
            roughness: 0.8,
            metalness: 0.0
        });
        
        // Main bush body
        const mainSphere = new THREE.SphereGeometry(0.5 * scale, 8, 8);
        const main = new THREE.Mesh(mainSphere, bushMaterial);
        bushGroup.add(main);
        
        // Add detail spheres
        const positions = [
            { x: 0.3, y: 0.1, z: 0.3, scale: 0.7 },
            { x: -0.3, y: 0.2, z: 0.2, scale: 0.8 },
            { x: 0.2, y: 0.3, z: -0.3, scale: 0.6 },
            { x: -0.2, y: 0.15, z: -0.2, scale: 0.7 }
        ];
        
        positions.forEach(pos => {
            const smallSphere = new THREE.SphereGeometry(0.3 * scale * pos.scale, 8, 8);
            const smallBush = new THREE.Mesh(smallSphere, bushMaterial);
            smallBush.position.set(
                pos.x * scale,
                pos.y * scale,
                pos.z * scale
            );
            bushGroup.add(smallBush);
        });
        
        bushGroup.position.set(x, 0.5 * scale, z);
        return bushGroup;
    }
    
    createBushes() {
        const bushCount = 40;
        
        for (let i = 0; i < bushCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 5 + Math.random() * 25;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            const scale = 0.6 + Math.random() * 0.8;
            const bush = this.createBush(x, z, scale);
            this.scene.add(bush);
            
            // Create bush clusters
            if (Math.random() < 0.4) {
                const clusterCount = Math.floor(Math.random() * 3) + 1;
                for (let j = 0; j < clusterCount; j++) {
                    const offset = 1.5;
                    const nearbyX = x + (Math.random() - 0.5) * offset;
                    const nearbyZ = z + (Math.random() - 0.5) * offset;
                    const nearbyScale = scale * (0.6 + Math.random() * 0.3);
                    
                    const nearbyBush = this.createBush(nearbyX, nearbyZ, nearbyScale);
                    this.scene.add(nearbyBush);
                }
            }
        }
    }
    
    createBunker() {
        const bunkerGroup = new THREE.Group();
        
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x5c5c5c,
            roughness: 0.7,
            metalness: 0.2
        });
        
        const windowMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.5,
            metalness: 0.3
        });
        
        // Main structure
        const bunkerGeometry = new THREE.BoxGeometry(8, 4, 6);
        const bunker = new THREE.Mesh(bunkerGeometry, wallMaterial);
        bunker.position.set(12, 2, -12);
        
        // Add windows and entrance
        this.addBunkerDetails(bunker, windowMaterial);
        
        // Add roof
        const roofGeometry = new THREE.BoxGeometry(8.5, 0.3, 6.5);
        const roof = new THREE.Mesh(roofGeometry, wallMaterial);
        roof.position.set(0, 2.1, 0);
        bunker.add(roof);
        
        bunkerGroup.add(bunker);
        this.scene.add(bunkerGroup);
        
        // Set collision box
        this.bunkerBox = new THREE.Box3(
            new THREE.Vector3(8, 0, -15),
            new THREE.Vector3(16, 4, -9)
        );
    }
    
    addBunkerDetails(bunker, windowMaterial) {
        const windowWidth = 1.5;
        const windowHeight = 1.2;
        const windowDepth = 0.3;
        const windowGeometry = new THREE.BoxGeometry(windowWidth, windowHeight, windowDepth);
        
        // Front windows
        const frontWindow1 = new THREE.Mesh(windowGeometry, windowMaterial);
        frontWindow1.position.set(-2.5, 0.5, 3);
        bunker.add(frontWindow1);
        
        const frontWindow2 = new THREE.Mesh(windowGeometry, windowMaterial);
        frontWindow2.position.set(2.5, 0.5, 3);
        bunker.add(frontWindow2);
        
        // Side windows
        const sideWindow1 = new THREE.Mesh(windowGeometry, windowMaterial);
        sideWindow1.rotation.y = Math.PI / 2;
        sideWindow1.position.set(4, 0.5, 0);
        bunker.add(sideWindow1);
        
        const sideWindow2 = new THREE.Mesh(windowGeometry, windowMaterial);
        sideWindow2.rotation.y = Math.PI / 2;
        sideWindow2.position.set(-4, 0.5, 0);
        bunker.add(sideWindow2);
        
        // Entrance
        const entranceGeometry = new THREE.BoxGeometry(2, 2.5, 0.3);
        const entrance = new THREE.Mesh(entranceGeometry, windowMaterial);
        entrance.position.set(0, -0.5, -3);
        bunker.add(entrance);
    }
    
    createCrates() {
        const crateMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.8,
            metalness: 0.1
        });
        
        // Create crates near bunker
        const cratePositions = [
            { size: new THREE.Vector3(1.5, 1.5, 1.5), pos: new THREE.Vector3(8, 0.75, -10) },
            { size: new THREE.Vector3(1.2, 1.2, 1.2), pos: new THREE.Vector3(8, 2.1, -10) },
            { size: new THREE.Vector3(2, 1, 2), pos: new THREE.Vector3(10, 0.5, -8) }
        ];
        
        // Create jumping challenge crates
        const streamCrates = [
            { size: new THREE.Vector3(1, 1, 1), pos: new THREE.Vector3(-4, 0.5, 4) },
            { size: new THREE.Vector3(1, 1, 1), pos: new THREE.Vector3(-2, 0.5, 7) },
            { size: new THREE.Vector3(1.2, 1.2, 1.2), pos: new THREE.Vector3(0, 0.6, 10) }
        ];
        
        [...cratePositions, ...streamCrates].forEach(crate => {
            const crateGeometry = new THREE.BoxGeometry(
                crate.size.x,
                crate.size.y,
                crate.size.z
            );
            
            // Add wood grain texture
            const positions = crateGeometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += (Math.random() - 0.5) * 0.02;
                positions[i + 1] += (Math.random() - 0.5) * 0.02;
                positions[i + 2] += (Math.random() - 0.5) * 0.02;
            }
            crateGeometry.attributes.position.needsUpdate = true;
            
            const crateMesh = new THREE.Mesh(crateGeometry, crateMaterial);
            crateMesh.position.copy(crate.pos);
            
            this.crates.push({
                mesh: crateMesh,
                size: crate.size,
                position: crate.pos
            });
            
            this.scene.add(crateMesh);
        });
    }
    
    createStoneBlock(width, height, depth) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        
        // Add random displacement to vertices for rough stone look
        const positions = geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += (Math.random() - 0.5) * 0.05;
            positions[i + 1] += (Math.random() - 0.5) * 0.05;
            positions[i + 2] += (Math.random() - 0.5) * 0.05;
        }
        geometry.attributes.position.needsUpdate = true;
        
        // Create stone material with slight color variation
        const hue = 0.08 + Math.random() * 0.02; // Grey with slight variation
        const saturation = 0.05 + Math.random() * 0.05;
        const lightness = 0.3 + Math.random() * 0.2;
        const color = new THREE.Color().setHSL(hue, saturation, lightness);
        
        const material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.8 + Math.random() * 0.2,
            metalness: 0.1,
            bumpScale: 0.5
        });
        
        return new THREE.Mesh(geometry, material);
    }

    createCastleTower() {
        const towerGroup = new THREE.Group();
        const towerHeight = 30;
        const towerRadius = 5;
        const numStonesPerLayer = 12;
        const stoneHeight = 1;
        const numLayers = Math.floor(towerHeight / stoneHeight);
        
        // Create main tower body
        for (let layer = 0; layer < numLayers; layer++) {
            const layerRadius = layer === numLayers - 1 ? towerRadius + 0.5 : towerRadius;
            const angleStep = (Math.PI * 2) / numStonesPerLayer;
            
            for (let i = 0; i < numStonesPerLayer; i++) {
                const angle = i * angleStep;
                const stoneWidth = (Math.PI * 2 * layerRadius) / numStonesPerLayer;
                const stone = this.createStoneBlock(stoneWidth, stoneHeight, 2);
                
                stone.position.x = Math.cos(angle) * layerRadius;
                stone.position.y = layer * stoneHeight;
                stone.position.z = Math.sin(angle) * layerRadius;
                stone.rotation.y = angle;
                
                towerGroup.add(stone);
            }
        }
        
        // Add crenellations (battlements)
        const numCrenellations = 16;
        const crenellationHeight = 1.5;
        const crenellationWidth = 1;
        const crenellationDepth = 1;
        const angleStep = (Math.PI * 2) / numCrenellations;
        
        for (let i = 0; i < numCrenellations; i++) {
            if (i % 2 === 0) { // Skip every other one to create gaps
                const angle = i * angleStep;
                const crenellation = this.createStoneBlock(
                    crenellationWidth,
                    crenellationHeight,
                    crenellationDepth
                );
                
                crenellation.position.x = Math.cos(angle) * (towerRadius + 0.5);
                crenellation.position.y = towerHeight;
                crenellation.position.z = Math.sin(angle) * (towerRadius + 0.5);
                crenellation.rotation.y = angle;
                
                towerGroup.add(crenellation);
            }
        }
        
        // Add conical roof
        const roofGeometry = new THREE.ConeGeometry(towerRadius + 1, 8, 16);
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a,
            roughness: 0.7,
            metalness: 0.2
        });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = towerHeight + 4;
        towerGroup.add(roof);
        
        // Position the tower in the scene
        towerGroup.position.set(20, 0, 20);
        this.scene.add(towerGroup);
        
        // Add collision box for the tower
        const towerBox = new THREE.Box3(
            new THREE.Vector3(15, 0, 15),
            new THREE.Vector3(25, towerHeight + 8, 25)
        );
        this.towerBox = towerBox;
    }
    
    checkCollisions(position) {
        const playerPosition = new THREE.Vector2(position.x, position.z);
        let collisionResult = {
            hasCollision: false,
            newY: position.y
        };
        
        // Check tower collisions
        if (this.towerBox) {
            const margin = 0.5;
            const isInTowerX = position.x >= (this.towerBox.min.x + margin) &&
                             position.x <= (this.towerBox.max.x - margin);
            const isInTowerZ = position.z >= (this.towerBox.min.z + margin) &&
                             position.z <= (this.towerBox.max.z - margin);
            
            if (isInTowerX && isInTowerZ) {
                collisionResult.hasCollision = true;
                return collisionResult;
            }
        }
        
        // Check tree collisions
        for (const tree of this.trees) {
            const distance = playerPosition.distanceTo(tree.position);
            if (distance < (0.5 + tree.radius)) {
                collisionResult.hasCollision = true;
                return collisionResult;
            }
        }
        
        // Check crate collisions
        for (const crate of this.crates) {
            const dx = Math.abs(position.x - crate.position.x);
            const dz = Math.abs(position.z - crate.position.z);
            const isWithinHorizontalBounds = dx < (crate.size.x / 2 + 0.5) &&
                                           dz < (crate.size.z / 2 + 0.5);
            
            if (isWithinHorizontalBounds) {
                const crateTop = crate.position.y + crate.size.y;
                const playerBottom = position.y;
                const playerTop = position.y + 2;
                
                if (position.y <= crateTop && playerTop > crate.position.y) {
                    if (position.y > crate.position.y) {
                        collisionResult.hasCollision = false;
                        collisionResult.newY = crateTop;
                    } else {
                        collisionResult.hasCollision = true;
                    }
                    return collisionResult;
                }
            }
        }
        
        // Check bunker collisions
        if (this.bunkerBox) {
            const margin = 0.3;
            const isInBunkerX = position.x >= (this.bunkerBox.min.x + margin) &&
                               position.x <= (this.bunkerBox.max.x - margin);
            const isInBunkerZ = position.z >= (this.bunkerBox.min.z + margin) &&
                               position.z <= (this.bunkerBox.max.z - margin);
            
            if ((isInBunkerX && !isInBunkerZ && position.z > this.bunkerBox.min.z - margin &&
                 position.z < this.bunkerBox.max.z + margin) ||
                (!isInBunkerX && isInBunkerZ && position.x > this.bunkerBox.min.x - margin &&
                 position.x < this.bunkerBox.max.x + margin)) {
                collisionResult.hasCollision = true;
                return collisionResult;
            }
        }
        
        return collisionResult;
    }
} 