import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';
import { Constants } from '../utils/constants.js';
import { getRandomPosition } from '../utils/helpers.js';

/**
 * Environment class for handling the game environment
 */
export class Environment {
    /**
     * Create a new environment
     * @param {THREE.Scene} scene - The scene to add the environment to
     */
    constructor(scene) {
        this.scene = scene;
        this.ground = null;
        this.trees = [];
        this.hills = [];
        this.cabin = null;
        this.grassPatches = [];
        
        // Initialize environment
        this.init();
    }
    
    /**
     * Initialize the environment
     */
    init() {
        // Basic environment setup
        this.createGround();
        this.addGrassToGround();
        this.createScenicHill();
        
        // Enhanced environment features
        this.createTrees();
        this.addForestUndergrowth();
        this.createWaterFeatures();
        
        // Add military base
        this.createMilitaryBase();
        
        // Add sky and atmospheric effects
        this.positionSkyElements();
        this.addAtmosphericFog();
    }
    
    /**
     * Create the ground
     */
    createGround() {
        // Create ground geometry
        const groundSize = Constants.GAME.GROUND_SIZE;
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 64, 64);
        
        // Add subtle terrain variations
        const vertices = groundGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            const distanceFromCenter = Math.sqrt(x * x + z * z);
            
            if (distanceFromCenter < groundSize * 0.45) {
                const xNoise = x * 0.02;
                const zNoise = z * 0.02;
                const noise = 
                    Math.sin(xNoise) * Math.cos(zNoise) * 1.5 + 
                    Math.sin(xNoise * 2.5) * Math.cos(zNoise * 2.5) * 0.8 +
                    Math.sin(xNoise * 5) * Math.cos(zNoise * 5) * 0.4;
                
                vertices[i + 1] = noise * Math.max(0, 1 - distanceFromCenter / (groundSize * 0.45));
            }
        }
        groundGeometry.attributes.position.needsUpdate = true;
        groundGeometry.computeVertexNormals();
        
        // Create ground material with a much richer grass color
        const groundMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0x2D8A27), // More vibrant grass green
            side: THREE.DoubleSide
        });
        
        // Create ground mesh
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
    }
    
    /**
     * Add grass to the ground
     */
    addGrassToGround() {
        // Create grass texture
        const grassTexture = this.createGrassTexture();
        
        // Create grass patches with much higher density
        const patchCount = 2000; // Significantly increased from 500
        const groundSize = Constants.GAME.GROUND_SIZE;
        
        for (let i = 0; i < patchCount; i++) {
            // Random position within ground bounds with clustering
            const useCluster = Math.random() < 0.8; // 80% chance for clustered grass
            let position;
            
            if (useCluster) {
                // Create denser clusters of grass
                const clusterCount = 12; // Increased from 8
                const clusterIndex = Math.floor(Math.random() * clusterCount);
                const clusterAngle = (clusterIndex / clusterCount) * Math.PI * 2;
                const clusterDistance = Math.random() * groundSize * 0.45; // More spread out
                const clusterX = Math.cos(clusterAngle) * clusterDistance;
                const clusterZ = Math.sin(clusterAngle) * clusterDistance;
                
                // Position within cluster
                const radius = 20 + Math.random() * 30; // Larger clusters
                const localAngle = Math.random() * Math.PI * 2;
                const localDistance = Math.random() * radius;
                
                position = {
                    x: clusterX + Math.cos(localAngle) * localDistance,
                    z: clusterZ + Math.sin(localAngle) * localDistance
                };
            } else {
                position = getRandomPosition(groundSize / 2);
            }
            
            // Create grass patch with varied sizes
            const patchSize = 2 + Math.random() * 3; // Increased size range
            const patchGeometry = new THREE.PlaneGeometry(patchSize, patchSize);
            
            // Randomize grass color slightly for more natural look
            const hueOffset = (Math.random() * 0.1) - 0.05;
            const satOffset = Math.random() * 0.2;
            const lightOffset = (Math.random() * 0.2) - 0.1;
            
            const patchMaterial = new THREE.MeshBasicMaterial({
                map: grassTexture,
                transparent: true,
                alphaTest: 0.5,
                side: THREE.DoubleSide,
                color: new THREE.Color().setHSL(0.3 + hueOffset, 0.7 + satOffset, 0.4 + lightOffset)
            });
            
            const patch = new THREE.Mesh(patchGeometry, patchMaterial);
            patch.position.set(position.x, 0.05 + Math.random() * 0.2, position.z); // More height variation
            patch.rotation.x = -Math.PI / 2;
            patch.rotation.z = Math.random() * Math.PI * 2;
            
            // Add slight random tilt for more natural look
            patch.rotation.y = (Math.random() * 0.3) - 0.15;
            
            this.scene.add(patch);
            this.grassPatches.push(patch);
        }
        
        // Add additional ground cover with higher density
        this.addGroundCover();
    }
    
    addGroundCover() {
        const coverCount = 200;
        const groundSize = Constants.GAME.GROUND_SIZE;
        
        for (let i = 0; i < coverCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 20 + Math.random() * (groundSize / 2 - 30);
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            // Randomly select ground cover type
            const type = Math.random();
            
            if (type < 0.4) { // 40% chance for small grass clusters
                this.createGrassCluster(x, z);
            } else if (type < 0.7) { // 30% chance for flowers
                this.createFlowerPatch(x, z);
            } else { // 30% chance for small ferns
                this.createSmallFern(x, z);
            }
        }
    }
    
    createGrassCluster(x, z) {
        const clusterGroup = new THREE.Group();
        const bladeCount = 15 + Math.floor(Math.random() * 10);
        
        for (let i = 0; i < bladeCount; i++) {
            const height = 0.3 + Math.random() * 0.4;
            const width = 0.02 + Math.random() * 0.03;
            
            const bladeGeometry = new THREE.PlaneGeometry(width, height);
            const r = 50 + Math.random() * 30;
            const g = 100 + Math.random() * 50;
            const b = 30 + Math.random() * 30;
            
            const bladeMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color(`rgb(${r}, ${g}, ${b})`),
                side: THREE.DoubleSide
            });
            
            const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
            
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 0.2;
            blade.position.set(
                Math.cos(angle) * distance,
                height / 2,
                Math.sin(angle) * distance
            );
            
            blade.rotation.y = angle;
            blade.rotation.x = (Math.random() * 0.3) - 0.15;
            
            clusterGroup.add(blade);
        }
        
        clusterGroup.position.set(x, 0, z);
        this.scene.add(clusterGroup);
    }
    
    createFlowerPatch(x, z) {
        const flowerGroup = new THREE.Group();
        const flowerCount = 1 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < flowerCount; i++) {
            const stemHeight = 0.3 + Math.random() * 0.4;
            const stemGeometry = new THREE.CylinderGeometry(0.01, 0.01, stemHeight, 4);
            const stemMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color(0x2D5A27)
            });
            
            const stem = new THREE.Mesh(stemGeometry, stemMaterial);
            stem.position.y = stemHeight / 2;
            
            // Flower head
            const flowerGeometry = new THREE.CircleGeometry(0.1 + Math.random() * 0.1, 8);
            
            // Random flower color
            let flowerColor;
            const flowerType = Math.random();
            if (flowerType < 0.3) {
                flowerColor = new THREE.Color(0xFFFFFF); // White
            } else if (flowerType < 0.6) {
                flowerColor = new THREE.Color(0xFFF44F); // Yellow
            } else {
                flowerColor = new THREE.Color(0xFF69B4); // Pink
            }
            
            const flowerMaterial = new THREE.MeshBasicMaterial({
                color: flowerColor,
                side: THREE.DoubleSide
            });
            
            const flower = new THREE.Mesh(flowerGeometry, flowerMaterial);
            flower.position.y = stemHeight;
            flower.rotation.x = -Math.PI / 2;
            
            const flowerGroup = new THREE.Group();
            flowerGroup.add(stem);
            flowerGroup.add(flower);
            
            // Position within patch
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 0.2;
            flowerGroup.position.set(
                Math.cos(angle) * distance,
                0,
                Math.sin(angle) * distance
            );
            
            // Random slight tilt
            flowerGroup.rotation.x = (Math.random() * 0.2) - 0.1;
            flowerGroup.rotation.z = (Math.random() * 0.2) - 0.1;
            
            flowerGroup.add(stem);
            flowerGroup.add(flower);
        }
        
        flowerGroup.position.set(x, 0, z);
        this.scene.add(flowerGroup);
    }
    
    createSmallFern(x, z) {
        const fernGroup = new THREE.Group();
        const leafCount = 4 + Math.floor(Math.random() * 4);
        
        for (let i = 0; i < leafCount; i++) {
            const leafGeometry = new THREE.PlaneGeometry(
                0.1 + Math.random() * 0.2,
                0.3 + Math.random() * 0.3
            );
            
            const r = 30 + Math.random() * 30;
            const g = 90 + Math.random() * 40;
            const b = 30 + Math.random() * 30;
            
            const leafMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color(`rgb(${r}, ${g}, ${b})`),
                side: THREE.DoubleSide
            });
            
            const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
            
            const angle = (i / leafCount) * Math.PI * 2;
            leaf.position.y = 0.15;
            leaf.rotation.y = angle;
            leaf.rotation.x = Math.PI / 4;
            
            fernGroup.add(leaf);
        }
        
        fernGroup.position.set(x, 0, z);
        this.scene.add(fernGroup);
    }
    
    /**
     * Create a scenic hill
     */
    createScenicHill() {
        // Create a path for the hill
        const pathPoints = [];
        const pathSegments = 10;
        const pathRadius = 20;
        
        for (let i = 0; i <= pathSegments; i++) {
            const angle = (i / pathSegments) * Math.PI * 2;
            pathPoints.push(
                new THREE.Vector3(
                    Math.cos(angle) * pathRadius,
                    0,
                    Math.sin(angle) * pathRadius
                )
            );
        }
        
        const pathCurve = new THREE.CatmullRomCurve3(pathPoints);
        
        // Create hill geometry
        const hillSize = 40;
        const hillHeight = 10;
        const hillGeometry = new THREE.CircleGeometry(hillSize / 2, 32);
        
        // Create hill material
        const hillMaterial = new THREE.MeshBasicMaterial({
            color: Constants.COLORS.GROUND,
            roughness: 0.9,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        
        // Create hill mesh
        const hill = new THREE.Mesh(hillGeometry, hillMaterial);
        hill.rotation.x = -Math.PI / 2;
        hill.position.set(0, 0, 0);
        
        // Modify hill vertices to create elevation
        const vertices = hillGeometry.attributes.position.array;
        
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            
            // Distance from center
            const distance = Math.sqrt(x * x + z * z);
            const normalizedDistance = distance / (hillSize / 2);
            
            // Calculate height based on distance from center
            const height = Math.cos(normalizedDistance * Math.PI / 2) * hillHeight;
            
            // Apply height
            vertices[i + 1] = Math.max(0, height);
        }
        
        // Update geometry
        hillGeometry.attributes.position.needsUpdate = true;
        hillGeometry.computeVertexNormals();
        
        this.scene.add(hill);
        this.hills.push(hill);
        
        // Add grass to hill
        this.addGrassToHill(hill, pathCurve, hillSize, hillHeight);
        
        // Add trees to hill
        this.createHillTrees(hill, pathCurve, hillSize, hillHeight);
    }
    
    /**
     * Create a grass texture
     * @returns {THREE.Texture} - Grass texture
     */
    createGrassTexture() {
        // Create canvas for grass texture
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw more grass blades
        const bladeCount = 30; // Increased from 20
        
        for (let i = 0; i < bladeCount; i++) {
            // Random position
            const x = Math.random() * canvas.width;
            const y = canvas.height;
            
            // Random width and height
            const width = 2 + Math.random() * 4;
            const height = 25 + Math.random() * 35; // Taller grass
            
            // More vibrant grass colors
            const r = 45 + Math.random() * 50;  // Increased green component
            const g = 130 + Math.random() * 80; // More vibrant green
            const b = 40 + Math.random() * 50;  // Slightly more yellow tint
            
            // Draw blade
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - width / 2, y - height);
            ctx.lineTo(x + width / 2, y - height);
            ctx.closePath();
            ctx.fill();
        }
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        return texture;
    }
    
    /**
     * Add grass to a hill
     * @param {THREE.Mesh} hill - The hill mesh
     * @param {THREE.CatmullRomCurve3} pathCurve - The path curve
     * @param {number} hillSize - The size of the hill
     * @param {number} hillHeight - The height of the hill
     */
    addGrassToHill(hill, pathCurve, hillSize, hillHeight) {
        // Create grass texture
        const grassTexture = this.createGrassTexture();
        
        // Create grass patches
        const patchCount = 200;
        
        for (let i = 0; i < patchCount; i++) {
            // Random angle and distance from center
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * (hillSize / 2);
            
            // Calculate position
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            // Calculate height at position
            const normalizedDistance = distance / (hillSize / 2);
            const height = Math.cos(normalizedDistance * Math.PI / 2) * hillHeight;
            
            // Create grass patch
            const patchSize = 0.5 + Math.random() * 1.5;
            const patchGeometry = new THREE.PlaneGeometry(patchSize, patchSize);
            const patchMaterial = new THREE.MeshBasicMaterial({
                map: grassTexture,
                transparent: true,
                alphaTest: 0.5,
                side: THREE.DoubleSide
            });
            
            const patch = new THREE.Mesh(patchGeometry, patchMaterial);
            patch.position.set(x, height + 0.05, z);
            patch.rotation.x = -Math.PI / 2;
            
            // Random rotation
            patch.rotation.z = Math.random() * Math.PI * 2;
            
            this.scene.add(patch);
            this.grassPatches.push(patch);
        }
    }
    
    /**
     * Create trees on a hill
     * @param {THREE.Mesh} hill - The hill mesh
     * @param {THREE.CatmullRomCurve3} pathCurve - The path curve
     * @param {number} hillSize - The size of the hill
     * @param {number} hillHeight - The height of the hill
     */
    createHillTrees(hill, pathCurve, hillSize, hillHeight) {
        // Create trees along the path
        const treeCount = 15;
        
        for (let i = 0; i < treeCount; i++) {
            // Random position along the path
            const pathPosition = Math.random();
            const pathPoint = pathCurve.getPoint(pathPosition);
            
            // Random offset from path
            const offsetAngle = Math.random() * Math.PI * 2;
            const offsetDistance = 2 + Math.random() * 5;
            
            const x = pathPoint.x + Math.cos(offsetAngle) * offsetDistance;
            const z = pathPoint.z + Math.sin(offsetAngle) * offsetDistance;
            
            // Calculate distance from center
            const distance = Math.sqrt(x * x + z * z);
            
            // Only place trees if within hill bounds
            if (distance < hillSize / 2) {
                // Calculate height at position
                const normalizedDistance = distance / (hillSize / 2);
                const y = Math.cos(normalizedDistance * Math.PI / 2) * hillHeight;
                
                // Create tree
                this.createTree(x, y, z);
            }
        }
    }
    
    /**
     * Create simple trees around the environment
     */
    createSimpleTrees() {
        // Create trees
        const treeCount = 30;
        const groundSize = Constants.GAME.GROUND_SIZE;
        
        for (let i = 0; i < treeCount; i++) {
            // Random position
            const position = getRandomPosition(groundSize / 2 - 5);
            
            // Create tree
            this.createTree(position.x, 0, position.z);
        }
    }
    
    /**
     * Create a tree at the specified position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     */
    createTree(x, y, z) {
        // Create tree group
        const tree = new THREE.Group();
        tree.position.set(x, y, z);
        
        // Random tree height
        const treeHeight = 3 + Math.random() * 3;
        
        // Create trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, treeHeight, 8);
        const trunkMaterial = new THREE.MeshBasicMaterial({
            color: Constants.COLORS.TREE_TRUNK,
            roughness: 0.9
        });
        
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = treeHeight / 2;
        trunk.castShadow = true;
        tree.add(trunk);
        
        // Create foliage
        const foliageCount = 3;
        const foliageMaterial = new THREE.MeshBasicMaterial({
            color: Constants.COLORS.TREE_FOLIAGE,
            roughness: 0.8
        });
        
        for (let i = 0; i < foliageCount; i++) {
            const foliageSize = 1.5 - i * 0.2;
            const foliageGeometry = new THREE.ConeGeometry(foliageSize, 2, 8);
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            
            foliage.position.y = treeHeight - 1 + i * 1.2;
            foliage.castShadow = true;
            tree.add(foliage);
        }
        
        this.scene.add(tree);
        this.trees.push(tree);
    }
    
    /**
     * Create a log cabin
     */
    createLogCabin() {
        // Create cabin group
        this.cabin = new THREE.Group();
        this.cabin.position.set(15, 0, 15);
        
        // Cabin dimensions
        const cabinWidth = 6;
        const cabinDepth = 8;
        const cabinHeight = 3;
        const logDiameter = 0.4;
        
        // Create log material
        const logMaterial = new THREE.MeshBasicMaterial({
            color: Constants.COLORS.TREE_TRUNK,
            roughness: 0.9
        });
        
        // Create walls
        this.createLogWall(cabinWidth, logDiameter, 0, -cabinDepth / 2, 0);
        this.createLogWall(cabinWidth, logDiameter, 0, cabinDepth / 2, 0);
        this.createLogWall(cabinDepth, logDiameter, -cabinWidth / 2, 0, Math.PI / 2);
        this.createLogWall(cabinDepth, logDiameter, cabinWidth / 2, 0, Math.PI / 2);
        
        // Create roof
        this.createRoofPanel(true);
        this.createRoofPanel(false);
        
        // Create door
        const doorGeometry = new THREE.BoxGeometry(1.5, 2.2, 0.1);
        const doorMaterial = new THREE.MeshBasicMaterial({
            color: 0x8B4513,
            roughness: 0.8
        });
        
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, 1.1, -cabinDepth / 2 - 0.05);
        this.cabin.add(door);
        
        // Create windows
        this.createWindow(-2, -cabinDepth / 2, 0);
        this.createWindow(2, -cabinDepth / 2, 0);
        this.createWindow(0, cabinDepth / 2, Math.PI);
        this.createWindow(-2, cabinDepth / 2, Math.PI);
        this.createWindow(2, cabinDepth / 2, Math.PI);
        
        // Add cabin to scene
        this.scene.add(this.cabin);
    }
    
    /**
     * Create a log wall
     * @param {number} width - Width of the wall
     * @param {number} logDiameter - Diameter of the logs
     * @param {number} posX - X position
     * @param {number} posZ - Z position
     * @param {number} rotation - Y rotation
     */
    createLogWall(width, logDiameter, posX, posZ, rotation) {
        // Create wall group
        const wall = new THREE.Group();
        wall.position.set(posX, 0, posZ);
        wall.rotation.y = rotation;
        
        // Create log material
        const logMaterial = new THREE.MeshBasicMaterial({
            color: Constants.COLORS.TREE_TRUNK,
            roughness: 0.9
        });
        
        // Create logs
        const logCount = Math.floor(3 / logDiameter);
        
        for (let i = 0; i < logCount; i++) {
            const logGeometry = new THREE.CylinderGeometry(logDiameter / 2, logDiameter / 2, width, 8);
            const log = new THREE.Mesh(logGeometry, logMaterial);
            
            log.rotation.z = Math.PI / 2;
            log.position.y = i * logDiameter;
            log.castShadow = true;
            
            wall.add(log);
        }
        
        this.cabin.add(wall);
    }
    
    /**
     * Create a window
     * @param {number} posX - X position
     * @param {number} posZ - Z position
     * @param {number} rotY - Y rotation
     */
    createWindow(posX, posZ, rotY) {
        // Create window group
        const windowGroup = new THREE.Group();
        windowGroup.position.set(posX, 1.5, posZ);
        windowGroup.rotation.y = rotY;
        
        // Create window frame
        const frameGeometry = new THREE.BoxGeometry(1, 1, 0.1);
        const frameMaterial = new THREE.MeshBasicMaterial({
            color: 0x8B4513,
            roughness: 0.8
        });
        
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        windowGroup.add(frame);
        
        // Create window glass
        const glassGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.05);
        const glassMaterial = new THREE.MeshBasicMaterial({
            color: 0xADD8E6,
            transparent: true,
            opacity: 0.5,
            roughness: 0.2
        });
        
        const glass = new THREE.Mesh(glassGeometry, glassMaterial);
        glass.position.z = 0.05;
        windowGroup.add(glass);
        
        this.cabin.add(windowGroup);
    }
    
    /**
     * Create a roof panel
     * @param {boolean} isLeft - Whether this is the left panel
     */
    createRoofPanel(isLeft) {
        // Roof dimensions
        const roofWidth = 7;
        const roofDepth = 9;
        const roofHeight = 2;
        
        // Create roof geometry
        const roofGeometry = new THREE.BufferGeometry();
        
        // Define vertices
        const vertices = new Float32Array([
            0, 3, -roofDepth / 2,  // 0: Top front
            0, 3, roofDepth / 2,   // 1: Top back
            isLeft ? -roofWidth / 2 : roofWidth / 2, 1, -roofDepth / 2,  // 2: Bottom front
            isLeft ? -roofWidth / 2 : roofWidth / 2, 1, roofDepth / 2    // 3: Bottom back
        ]);
        
        // Define faces
        const indices = [
            0, 1, 2,  // Front face
            1, 3, 2   // Back face
        ];
        
        // Set attributes
        roofGeometry.setIndex(indices);
        roofGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        roofGeometry.computeVertexNormals();
        
        // Create roof material
        const roofMaterial = new THREE.MeshBasicMaterial({
            color: 0x8B4513,
            roughness: 0.9,
            side: THREE.DoubleSide
        });
        
        // Create roof mesh
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.castShadow = true;
        
        this.cabin.add(roof);
    }
    
    /**
     * Create simple lighting for the environment
     */
    createSimpleLighting() {
        // Create ambient light
        const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.5);
        this.scene.add(ambientLight);
        
        // Create directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        
        // Configure shadow
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        
        this.scene.add(directionalLight);
    }
    
    /**
     * Get the height at the specified position
     * @param {THREE.Vector3} position - Position to check
     * @returns {number} - Height at the position
     */
    getHeightAtPosition(position) {
        // Default ground height
        let height = 0;
        
        // Check hills
        for (const hill of this.hills) {
            // Get hill position
            const hillPosition = hill.position;
            
            // Calculate distance from hill center
            const dx = position.x - hillPosition.x;
            const dz = position.z - hillPosition.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            // Check if within hill bounds
            const hillRadius = 20; // Half of hillSize
            if (distance < hillRadius) {
                // Calculate height based on distance from center
                const normalizedDistance = distance / hillRadius;
                const hillHeight = Math.cos(normalizedDistance * Math.PI / 2) * 10;
                
                // Update height if hill is higher
                height = Math.max(height, hillHeight);
            }
        }
        
        return height;
    }
    
    createTrees() {
        const treeCount = 100; // Reduced from 150 for better performance
        const minDistance = 40; // Minimum distance from center
        const maxDistance = 230; // Maximum distance from center
        
        for (let i = 0; i < treeCount; i++) {
            // Get a random position in a ring around the center
            const angle = Math.random() * Math.PI * 2;
            
            // Create clusters of trees
            const useCluster = Math.random() < 0.7; // 70% chance for clustered trees
            let distance;
            
            if (useCluster) {
                // Create denser clusters of trees
                const clusterCount = 6;
                const clusterIndex = Math.floor(Math.random() * clusterCount);
                const clusterAngle = (clusterIndex / clusterCount) * Math.PI * 2;
                const clusterDistance = minDistance + Math.random() * (maxDistance - minDistance);
                const clusterX = Math.cos(clusterAngle) * clusterDistance;
                const clusterZ = Math.sin(clusterAngle) * clusterDistance;
                
                // Position within cluster
                const clusterRadius = 15 + Math.random() * 20;
                const localAngle = Math.random() * Math.PI * 2;
                const localDistance = Math.random() * clusterRadius;
                
                const x = clusterX + Math.cos(localAngle) * localDistance;
                const z = clusterZ + Math.sin(localAngle) * localDistance;
                
                const tree = window.createTree(); // Using global createTree function from main.js
                tree.position.set(x, 0, z);
                this.scene.add(tree);
            } else {
                // Random trees throughout the environment
                distance = minDistance + Math.random() * (maxDistance - minDistance);
                const x = Math.cos(angle) * distance;
                const z = Math.sin(angle) * distance;
                
                const tree = window.createTree();
                
                // Add some variation to tree sizes for more natural look
                const scale = 0.8 + Math.random() * 0.5;
                tree.scale.set(scale, scale, scale);
                
                tree.position.set(x, 0, z);
                this.scene.add(tree);
            }
        }
    }
    
    // New method to add undergrowth beneath trees
    addForestUndergrowth() {
        const undergrowthCount = 200; // Reduced from 300 for better performance
        const minDistance = 40;
        const maxDistance = 220;
        
        // Create ferns, mushrooms, fallen logs, etc.
        for (let i = 0; i < undergrowthCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = minDistance + Math.random() * (maxDistance - minDistance);
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            // Randomly select undergrowth type
            const type = Math.random();
            
            if (type < 0.4) { // 40% chance for ferns
                this.createFern(x, z);
            } else if (type < 0.7) { // 30% chance for mushrooms
                this.createMushroom(x, z);
            } else if (type < 0.9) { // 20% chance for fallen logs
                this.createFallenLog(x, z);
            } else { // 10% chance for rocks
                this.createRock(x, z);
            }
        }
    }
    
    // Create a detailed fern
    createFern(x, z) {
        const fernGroup = new THREE.Group();
        const stemCount = 7 + Math.floor(Math.random() * 8);
        const fernHeight = 0.5 + Math.random() * 1.5;
        
        // Create each stem
        for (let i = 0; i < stemCount; i++) {
            const stemGeometry = new THREE.PlaneGeometry(
                0.2 + Math.random() * 0.4,
                fernHeight * (0.7 + Math.random() * 0.5)
            );
            
            // Green color with variation
            const r = 30 + Math.random() * 40;
            const g = 100 + Math.random() * 60;
            const b = 30 + Math.random() * 30;
            
            const stemMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color(`rgb(${r}, ${g}, ${b})`),
                side: THREE.DoubleSide
            });
            
            const stem = new THREE.Mesh(stemGeometry, stemMaterial);
            
            // Position around center with outward splay
            const angle = (i / stemCount) * Math.PI * 2 + (Math.random() * 0.3 - 0.15);
            const distance = 0.05 + Math.random() * 0.15;
            stem.position.x = Math.cos(angle) * distance;
            stem.position.z = Math.sin(angle) * distance;
            stem.position.y = fernHeight / 2;
            
            // Rotate outward and droop
            stem.rotation.y = angle;
            stem.rotation.x = Math.random() * 0.4 - 0.2 - 0.2; // Slight droop
            
            fernGroup.add(stem);
        }
        
        fernGroup.position.set(x, 0, z);
        this.scene.add(fernGroup);
    }
    
    // Create mushrooms
    createMushroom(x, z) {
        const mushroomGroup = new THREE.Group();
        const mushroomCount = 1 + Math.floor(Math.random() * 5); // Cluster of mushrooms
        
        for (let i = 0; i < mushroomCount; i++) {
            // Create stem
            const stemHeight = 0.2 + Math.random() * 0.4;
            const stemRadius = 0.05 + Math.random() * 0.1;
            const stemGeometry = new THREE.CylinderGeometry(
                stemRadius * 0.8, stemRadius, stemHeight, 8
            );
            
            const stemMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color(0xEEEEEE)
            });
            
            const stem = new THREE.Mesh(stemGeometry, stemMaterial);
            stem.position.y = stemHeight / 2;
            
            // Create cap
            const capRadius = stemRadius * (2 + Math.random());
            const capHeight = capRadius * (0.6 + Math.random() * 0.4);
            const capGeometry = new THREE.SphereGeometry(
                capRadius, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2
            );
            
            // Random cap color (red, brown, white, etc.)
            let capColor;
            const colorType = Math.random();
            if (colorType < 0.4) {
                // Reddish
                capColor = new THREE.Color(0xAA3333);
            } else if (colorType < 0.7) {
                // Brownish
                capColor = new THREE.Color(0x8B4513);
            } else {
                // Whitish
                capColor = new THREE.Color(0xDDDDDD);
            }
            
            const capMaterial = new THREE.MeshBasicMaterial({
                color: capColor
            });
            
            const cap = new THREE.Mesh(capGeometry, capMaterial);
            cap.position.y = stemHeight;
            cap.scale.set(1, capHeight / capRadius, 1);
            
            // Random position in cluster
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 0.3;
            const localX = Math.cos(angle) * distance;
            const localZ = Math.sin(angle) * distance;
            
            // Create full mushroom
            const mushroom = new THREE.Group();
            mushroom.add(stem);
            mushroom.add(cap);
            mushroom.position.set(localX, 0, localZ);
            
            // Random scaling and rotation
            const scale = 0.7 + Math.random() * 0.6;
            mushroom.scale.set(scale, scale, scale);
            mushroom.rotation.y = Math.random() * Math.PI * 2;
            mushroom.rotation.x = (Math.random() * 0.2) - 0.1;
            mushroom.rotation.z = (Math.random() * 0.2) - 0.1;
            
            mushroomGroup.add(mushroom);
        }
        
        mushroomGroup.position.set(x, 0, z);
        this.scene.add(mushroomGroup);
    }
    
    // Create a fallen log
    createFallenLog(x, z) {
        // Log dimensions
        const length = 2 + Math.random() * 4;
        const radius = 0.3 + Math.random() * 0.3;
        
        // Create log with detailed geometry
        const logGeometry = new THREE.CylinderGeometry(
            radius, radius, length, 10, 1
        );
        
        // Create detailed wood texture for the log
        const barkColor = new THREE.Color(0x614126);
        barkColor.offsetHSL(
            (Math.random() * 0.05) - 0.025, // Small hue variation
            (Math.random() * 0.1) - 0.05,   // Saturation variation
            (Math.random() * 0.1) - 0.05    // Lightness variation
        );
        
        const logMaterial = new THREE.MeshBasicMaterial({
            color: barkColor
        });
        
        const log = new THREE.Mesh(logGeometry, logMaterial);
        
        // Position log horizontally
        log.rotation.z = Math.PI / 2;
        
        // Add some random rotation for natural look
        log.rotation.x = (Math.random() * 0.4) - 0.2;
        log.rotation.y = Math.random() * Math.PI;
        
        // Position slightly into the ground
        log.position.set(x, radius * 0.7, z);
        
        // Add moss patches to log
        const mossCount = Math.floor(Math.random() * 5) + 2;
        for (let i = 0; i < mossCount; i++) {
            const mossSize = 0.2 + Math.random() * 0.3;
            const mossGeometry = new THREE.SphereGeometry(mossSize, 8, 6, 0, Math.PI);
            
            // Create moss material
            const mossColor = new THREE.Color(0x2D7038);
            mossColor.offsetHSL(
                (Math.random() * 0.1) - 0.05, // Hue variation
                (Math.random() * 0.2),        // Saturation variation
                (Math.random() * 0.1) - 0.05  // Lightness variation
            );
            
            const mossMaterial = new THREE.MeshBasicMaterial({
                color: mossColor
            });
            
            const moss = new THREE.Mesh(mossGeometry, mossMaterial);
            
            // Position moss on top of log
            const mossAngle = Math.random() * Math.PI;
            const mossHeight = radius * 0.9;
            moss.position.set(
                (Math.random() * length) - (length / 2), // Along log
                mossHeight * Math.sin(mossAngle),       // Around circumference
                mossHeight * Math.cos(mossAngle)
            );
            
            // Rotate to conform to log surface
            moss.rotation.x = mossAngle + Math.PI / 2;
            moss.rotation.z = Math.PI / 2;
            moss.scale.set(1, 0.4, 1); // Flatten the moss
            
            log.add(moss);
        }
        
        this.scene.add(log);
    }
    
    // Create rocks
    createRock(x, z) {
        // Rock dimensions
        const size = 0.5 + Math.random() * 1.0;
        
        // Create base rock mesh
        let rockGeometry;
        const rockType = Math.random();
        
        if (rockType < 0.33) {
            // Spherical rock
            rockGeometry = new THREE.SphereGeometry(size, 7, 7);
        } else if (rockType < 0.66) {
            // Dodecahedron rock
            rockGeometry = new THREE.DodecahedronGeometry(size, 0);
        } else {
            // Icosahedron rock
            rockGeometry = new THREE.IcosahedronGeometry(size, 0);
        }
        
        // Deform the geometry for more natural shape
        if (rockGeometry.attributes && rockGeometry.attributes.position) {
            const positions = rockGeometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += (Math.random() * 0.2 - 0.1) * size;
                positions[i + 1] += (Math.random() * 0.2 - 0.1) * size;
                positions[i + 2] += (Math.random() * 0.2 - 0.1) * size;
            }
            rockGeometry.attributes.position.needsUpdate = true;
            rockGeometry.computeVertexNormals();
        }
        
        // Create detailed rock texture
        const rockColor = new THREE.Color(0x888888);
        rockColor.offsetHSL(
            0,                          // No hue variation
            (Math.random() * 0.1) - 0.05, // Small saturation variation
            (Math.random() * 0.2) - 0.1   // Lightness variation
        );
        
        const rockMaterial = new THREE.MeshBasicMaterial({
            color: rockColor
        });
        
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        
        // Rotate for natural look
        rock.rotation.x = Math.random() * Math.PI;
        rock.rotation.y = Math.random() * Math.PI;
        rock.rotation.z = Math.random() * Math.PI;
        
        // Position with base partially in ground
        rock.position.set(x, size * 0.3, z);
        rock.receiveShadow = true;
        rock.castShadow = true;
        
        this.scene.add(rock);
    }
    
    // Add a more detailed water system
    createWaterFeatures() {
        const waterBodyCount = Math.random() < 0.5 ? 1 : 2; // 1 or 2 water bodies
        
        for (let i = 0; i < waterBodyCount; i++) {
            // Position water away from center
            const angle = (i / waterBodyCount) * Math.PI * 2 + (Math.random() * Math.PI / 2);
            const distance = 80 + Math.random() * 100;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            // Create pond or small lake
            const size = 15 + Math.random() * 25;
            const waterGeometry = new THREE.CircleGeometry(size, 24);
            
            // Pond material with water-like properties
            const waterMaterial = new THREE.MeshBasicMaterial({
                color: 0x4A6FE3,
                transparent: true,
                opacity: 0.8
            });
            
            const water = new THREE.Mesh(waterGeometry, waterMaterial);
            water.rotation.x = -Math.PI / 2; // Lay flat
            water.position.set(x, 0.2, z); // Slightly above ground
            
            this.scene.add(water);
            
            // Add shore details around the water
            this.createShoreDetails(x, z, size);
        }
    }
    
    // Add details around water shore
    createShoreDetails(centerX, centerZ, waterSize) {
        // Add rocks, reeds, and shore vegetation
        const detailCount = Math.floor(waterSize * 1.5);
        
        for (let i = 0; i < detailCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            // Position at the edge of water with some variation
            const distance = waterSize * (0.9 + Math.random() * 0.3);
            const x = centerX + Math.cos(angle) * distance;
            const z = centerZ + Math.sin(angle) * distance;
            
            const detailType = Math.random();
            
            if (detailType < 0.3) {
                // Shore rocks
                this.createRock(x, z);
            } else if (detailType < 0.8) {
                // Reeds and cattails
                this.createReed(x, z);
            } else {
                // Shore grass
                this.createShoreGrass(x, z);
            }
        }
    }
    
    // Create reed/cattail plants
    createReed(x, z) {
        const reedGroup = new THREE.Group();
        const reedCount = 3 + Math.floor(Math.random() * 7);
        
        for (let i = 0; i < reedCount; i++) {
            const height = 1.5 + Math.random() * 2;
            const width = 0.05 + Math.random() * 0.05;
            
            // Reed stem
            const stemGeometry = new THREE.CylinderGeometry(
                width * 0.5, width, height, 4
            );
            
            const stemColor = new THREE.Color(0x567D46);
            stemColor.offsetHSL(
                (Math.random() * 0.05) - 0.025, // Small hue variation
                (Math.random() * 0.1),          // Saturation variation
                (Math.random() * 0.1) - 0.05    // Lightness variation
            );
            
            // Changed to MeshBasicMaterial for better stability
            const stemMaterial = new THREE.MeshBasicMaterial({
                color: stemColor
            });
            
            const stem = new THREE.Mesh(stemGeometry, stemMaterial);
            
            // Cattail top (for some reeds)
            if (Math.random() < 0.7) {
                const cattailHeight = height * 0.2;
                const cattailRadius = width * 2;
                const cattailGeometry = new THREE.CylinderGeometry(
                    cattailRadius, cattailRadius, cattailHeight, 8
                );
                
                const cattailMaterial = new THREE.MeshBasicMaterial({
                    color: 0x5C4033 // Brown
                });
                
                const cattail = new THREE.Mesh(cattailGeometry, cattailMaterial);
                cattail.position.y = height * 0.4;
                stem.add(cattail);
            }
            
            // Position and rotate reed
            stem.position.y = height / 2;
            stem.rotation.x = (Math.random() * 0.3) - 0.15;
            stem.rotation.z = (Math.random() * 0.3) - 0.15;
            
            // Position in cluster
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 0.5;
            const localX = Math.cos(angle) * distance;
            const localZ = Math.sin(angle) * distance;
            
            const reedInstance = new THREE.Group();
            reedInstance.add(stem);
            reedInstance.position.set(localX, 0, localZ);
            
            reedGroup.add(reedInstance);
        }
        
        reedGroup.position.set(x, 0, z);
        this.scene.add(reedGroup);
    }
    
    // Create shore grass
    createShoreGrass(x, z) {
        const grassGroup = new THREE.Group();
        const bladeCount = 10 + Math.random() * 20;
        
        for (let i = 0; i < bladeCount; i++) {
            const height = 0.5 + Math.random() * 1.0;
            const width = 0.03 + Math.random() * 0.05;
            
            // Grass blade geometry
            const bladeGeometry = new THREE.PlaneGeometry(width, height);
            
            // Green color with variation
            const r = 60 + Math.random() * 40;
            const g = 120 + Math.random() * 60;
            const b = 30 + Math.random() * 40;
            
            const bladeMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color(`rgb(${r}, ${g}, ${b})`),
                side: THREE.DoubleSide
            });
            
            const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
            
            // Position and orientation
            blade.position.y = height / 2;
            
            // Bend grass blades outward from center
            const angle = Math.random() * Math.PI * 2;
            blade.rotation.y = angle;
            blade.rotation.x = (Math.random() * 0.4) - 0.2;
            
            // Position in clump
            const distance = Math.random() * 0.3;
            const localX = Math.cos(angle) * distance;
            const localZ = Math.sin(angle) * distance;
            
            blade.position.x = localX;
            blade.position.z = localZ;
            
            grassGroup.add(blade);
        }
        
        grassGroup.position.set(x, 0, z);
        this.scene.add(grassGroup);
    }
    
    // Create a simple sky with clouds
    createSky() {
        this.sky = new THREE.Group();
        
        // Create more realistic sky dome
        const skyDomeRadius = 500;
        const skyDomeGeometry = new THREE.SphereGeometry(skyDomeRadius, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB, // Sky blue
            side: THREE.BackSide
        });
        
        const skyDome = new THREE.Mesh(skyDomeGeometry, skyMaterial);
        this.sky.add(skyDome);
        
        // Add more detailed clouds
        const cloudCount = 20; // Reduced from 30 for better performance
        for (let i = 0; i < cloudCount; i++) {
            const cloudGroup = new THREE.Group();
            const cloudSegmentCount = 3 + Math.floor(Math.random() * 5);
            
            // Create a cloud from multiple spheres
            for (let j = 0; j < cloudSegmentCount; j++) {
                const cloudSize = 15 + Math.random() * 25;
                const cloudGeometry = new THREE.SphereGeometry(cloudSize, 7, 7);
                const cloudMaterial = new THREE.MeshBasicMaterial({
                    color: 0xFFFFFF,
                    transparent: true,
                    opacity: 0.8 + Math.random() * 0.2
                });
                
                const cloudSegment = new THREE.Mesh(cloudGeometry, cloudMaterial);
                
                // Position segments to form cloud shape
                cloudSegment.position.x = (j - cloudSegmentCount / 2) * (cloudSize * 0.8) + (Math.random() * 10 - 5);
                cloudSegment.position.y = Math.random() * 10 - 5;
                cloudSegment.position.z = Math.random() * 10 - 5;
                
                // Slight random scale for varied appearance
                const segmentScale = 0.8 + Math.random() * 0.4;
                cloudSegment.scale.set(segmentScale, segmentScale * 0.6, segmentScale * 1.2);
                
                cloudGroup.add(cloudSegment);
            }
            
            // Position cloud in sky
            const cloudAngle = Math.random() * Math.PI * 2;
            const cloudElevation = 20 + Math.random() * 60;
            const cloudDistance = skyDomeRadius * 0.7;
            
            cloudGroup.position.x = Math.cos(cloudAngle) * cloudDistance;
            cloudGroup.position.y = cloudElevation;
            cloudGroup.position.z = Math.sin(cloudAngle) * cloudDistance;
            
            this.sky.add(cloudGroup);
        }
        
        return this.sky;
    }
    
    // Position sky elements
    positionSkyElements() {
        if (!this.sky) {
            this.createSky();
        }
        
        this.sky.position.y = 150;
        this.scene.add(this.sky);
    }
    
    // Add atmospheric fog
    addAtmosphericFog() {
        // Add atmospheric fog with a soft blue hue
        this.scene.fog = new THREE.FogExp2(0xC4E4F4, 0.005);
    }

    createMilitaryBase() {
        // Position the base outside the forest area
        const baseDistance = 280; // Outside tree line
        const baseAngle = Math.PI / 4; // 45 degrees
        const baseX = Math.cos(baseAngle) * baseDistance;
        const baseZ = Math.sin(baseAngle) * baseDistance;
        
        // Create base group
        const baseGroup = new THREE.Group();
        baseGroup.position.set(baseX, 0, baseZ);
        
        // Create main compound
        this.createCompoundWalls(baseGroup);
        this.createBarracks(baseGroup);
        this.createCommandCenter(baseGroup);
        this.createVehicleDepot(baseGroup);
        this.createWatchTowers(baseGroup);
        this.createMilitaryProps(baseGroup);
        
        this.scene.add(baseGroup);
    }
    
    createCompoundWalls(baseGroup) {
        const wallLength = 100;
        const wallHeight = 4;
        const wallThickness = 0.5;
        
        // Create wall material with military texture
        const wallMaterial = new THREE.MeshBasicMaterial({
            color: 0x5A5A5A, // Military gray
        });
        
        // Create walls
        const walls = [
            { start: [-wallLength/2, 0, -wallLength/2], end: [wallLength/2, 0, -wallLength/2] },
            { start: [wallLength/2, 0, -wallLength/2], end: [wallLength/2, 0, wallLength/2] },
            { start: [wallLength/2, 0, wallLength/2], end: [-wallLength/2, 0, wallLength/2] },
            { start: [-wallLength/2, 0, wallLength/2], end: [-wallLength/2, 0, -wallLength/2] }
        ];
        
        walls.forEach(wall => {
            const length = Math.sqrt(
                Math.pow(wall.end[0] - wall.start[0], 2) +
                Math.pow(wall.end[2] - wall.start[2], 2)
            );
            
            const wallGeometry = new THREE.BoxGeometry(length, wallHeight, wallThickness);
            const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
            
            // Position wall
            wallMesh.position.set(
                (wall.start[0] + wall.end[0]) / 2,
                wallHeight / 2,
                (wall.start[2] + wall.end[2]) / 2
            );
            
            // Rotate wall
            const angle = Math.atan2(
                wall.end[2] - wall.start[2],
                wall.end[0] - wall.start[0]
            );
            wallMesh.rotation.y = angle;
            
            baseGroup.add(wallMesh);
        });
        
        // Add barbed wire on top
        walls.forEach(wall => {
            const barbedWireGeometry = new THREE.CylinderGeometry(0.1, 0.1, length, 8);
            const barbedWireMaterial = new THREE.MeshBasicMaterial({ color: 0x303030 });
            const barbedWire = new THREE.Mesh(barbedWireGeometry, barbedWireMaterial);
            
            barbedWire.position.set(
                (wall.start[0] + wall.end[0]) / 2,
                wallHeight + 0.1,
                (wall.start[2] + wall.end[2]) / 2
            );
            barbedWire.rotation.z = Math.PI / 2;
            barbedWire.rotation.y = Math.atan2(
                wall.end[2] - wall.start[2],
                wall.end[0] - wall.start[0]
            );
            
            baseGroup.add(barbedWire);
        });
    }
    
    createBarracks(baseGroup) {
        const barrackLength = 20;
        const barrackWidth = 8;
        const barrackHeight = 3;
        
        // Create barracks building
        const barrackGeometry = new THREE.BoxGeometry(barrackLength, barrackHeight, barrackWidth);
        const barrackMaterial = new THREE.MeshBasicMaterial({ color: 0x4A5F39 }); // Military green
        const barrack = new THREE.Mesh(barrackGeometry, barrackMaterial);
        
        // Position barracks
        barrack.position.set(-30, barrackHeight/2, -20);
        
        // Add roof
        const roofGeometry = new THREE.BoxGeometry(barrackLength + 1, 0.5, barrackWidth + 1);
        const roofMaterial = new THREE.MeshBasicMaterial({ color: 0x2F2F2F });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = barrackHeight;
        barrack.add(roof);
        
        // Add windows
        const windowCount = 6;
        const windowSpacing = barrackLength / (windowCount + 1);
        for(let i = 1; i <= windowCount; i++) {
            const windowGeometry = new THREE.PlaneGeometry(1, 1);
            const windowMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x88AAE0,
                transparent: true,
                opacity: 0.6
            });
            
            // Front windows
            const frontWindow = new THREE.Mesh(windowGeometry, windowMaterial);
            frontWindow.position.set(-barrackLength/2 + i * windowSpacing, 0, barrackWidth/2 + 0.01);
            barrack.add(frontWindow);
            
            // Back windows
            const backWindow = new THREE.Mesh(windowGeometry, windowMaterial);
            backWindow.position.set(-barrackLength/2 + i * windowSpacing, 0, -barrackWidth/2 - 0.01);
            backWindow.rotation.y = Math.PI;
            barrack.add(backWindow);
        }
        
        baseGroup.add(barrack);
    }
    
    createCommandCenter(baseGroup) {
        const centerWidth = 15;
        const centerHeight = 6;
        
        // Create main building
        const centerGeometry = new THREE.BoxGeometry(centerWidth, centerHeight, centerWidth);
        const centerMaterial = new THREE.MeshBasicMaterial({ color: 0x3F4F4F });
        const center = new THREE.Mesh(centerGeometry, centerMaterial);
        
        // Position command center
        center.position.set(0, centerHeight/2, 0);
        
        // Add communication array on top
        const antennaHeight = 8;
        const antennaGeometry = new THREE.CylinderGeometry(0.2, 0.2, antennaHeight, 8);
        const antennaMaterial = new THREE.MeshBasicMaterial({ color: 0x2F2F2F });
        const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
        antenna.position.set(0, centerHeight + antennaHeight/2, 0);
        center.add(antenna);
        
        // Add satellite dish
        const dishRadius = 2;
        const dishGeometry = new THREE.SphereGeometry(dishRadius, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const dishMaterial = new THREE.MeshBasicMaterial({ color: 0x8F8F8F });
        const dish = new THREE.Mesh(dishGeometry, dishMaterial);
        dish.position.set(centerWidth/4, centerHeight, centerWidth/4);
        dish.rotation.x = -Math.PI / 6;
        dish.rotation.y = Math.PI / 4;
        center.add(dish);
        
        baseGroup.add(center);
    }
    
    createVehicleDepot(baseGroup) {
        const depotWidth = 25;
        const depotHeight = 5;
        const depotDepth = 15;
        
        // Create depot structure
        const depotGeometry = new THREE.BoxGeometry(depotWidth, depotHeight, depotDepth);
        const depotMaterial = new THREE.MeshBasicMaterial({ color: 0x4F4F4F });
        const depot = new THREE.Mesh(depotGeometry, depotMaterial);
        
        // Position depot
        depot.position.set(30, depotHeight/2, 20);
        
        // Add large entrance
        const doorGeometry = new THREE.BoxGeometry(8, 4, 0.5);
        const doorMaterial = new THREE.MeshBasicMaterial({ color: 0x2F2F2F });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, 2, depotDepth/2);
        depot.add(door);
        
        // Add military vehicles (simplified shapes)
        this.createMilitaryVehicle(depot, -5, 0, -2);
        this.createMilitaryVehicle(depot, 5, 0, -2);
        
        baseGroup.add(depot);
    }
    
    createMilitaryVehicle(parent, x, y, z) {
        const vehicleGroup = new THREE.Group();
        
        // Vehicle body
        const bodyGeometry = new THREE.BoxGeometry(4, 2, 2);
        const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x4A5F39 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        vehicleGroup.add(body);
        
        // Wheels
        const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 8);
        const wheelMaterial = new THREE.MeshBasicMaterial({ color: 0x1F1F1F });
        
        const wheelPositions = [
            [-1.5, -1, 1], [1.5, -1, 1],
            [-1.5, -1, -1], [1.5, -1, -1]
        ];
        
        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(...pos);
            wheel.rotation.z = Math.PI / 2;
            vehicleGroup.add(wheel);
        });
        
        vehicleGroup.position.set(x, y + 1, z);
        parent.add(vehicleGroup);
    }
    
    createWatchTowers(baseGroup) {
        const towerPositions = [
            [-45, -45], [45, -45],
            [-45, 45], [45, 45]
        ];
        
        towerPositions.forEach(pos => {
            const tower = this.createWatchTower();
            tower.position.set(pos[0], 0, pos[1]);
            baseGroup.add(tower);
        });
    }
    
    createWatchTower() {
        const towerGroup = new THREE.Group();
        
        // Tower base
        const baseHeight = 8;
        const baseGeometry = new THREE.BoxGeometry(2, baseHeight, 2);
        const baseMaterial = new THREE.MeshBasicMaterial({ color: 0x4F4F4F });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = baseHeight/2;
        towerGroup.add(base);
        
        // Watch post
        const postWidth = 4;
        const postHeight = 3;
        const postGeometry = new THREE.BoxGeometry(postWidth, postHeight, postWidth);
        const postMaterial = new THREE.MeshBasicMaterial({ color: 0x3F3F3F });
        const post = new THREE.Mesh(postGeometry, postMaterial);
        post.position.y = baseHeight + postHeight/2;
        towerGroup.add(post);
        
        // Roof
        const roofGeometry = new THREE.ConeGeometry(postWidth/1.4, 2, 4);
        const roofMaterial = new THREE.MeshBasicMaterial({ color: 0x2F2F2F });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = baseHeight + postHeight + 1;
        towerGroup.add(roof);
        
        // Spotlight
        const spotlightGeometry = new THREE.ConeGeometry(0.5, 1, 8);
        const spotlightMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
        const spotlight = new THREE.Mesh(spotlightGeometry, spotlightMaterial);
        spotlight.position.set(1.5, baseHeight + postHeight/2, 0);
        spotlight.rotation.z = Math.PI/2;
        towerGroup.add(spotlight);
        
        return towerGroup;
    }
    
    createMilitaryProps(baseGroup) {
        // Add sandbag barriers
        this.createSandbagBarriers(baseGroup);
        
        // Add cargo containers
        this.createCargoContainers(baseGroup);
        
        // Add miscellaneous props
        this.createMiscProps(baseGroup);
    }
    
    createSandbagBarriers(baseGroup) {
        const barrierPositions = [
            [-20, -30], [20, -30],
            [-20, 30], [20, 30]
        ];
        
        barrierPositions.forEach(pos => {
            const barrier = this.createSandbagBarrier();
            barrier.position.set(pos[0], 0, pos[1]);
            baseGroup.add(barrier);
        });
    }
    
    createSandbagBarrier() {
        const barrierGroup = new THREE.Group();
        
        // Create rows of sandbags
        for(let row = 0; row < 3; row++) {
            for(let col = 0; col < 5; col++) {
                const bagGeometry = new THREE.BoxGeometry(1, 0.5, 0.8);
                const bagMaterial = new THREE.MeshBasicMaterial({ color: 0x8B7355 });
                const bag = new THREE.Mesh(bagGeometry, bagMaterial);
                
                bag.position.set(
                    col * 0.9 - 2,
                    row * 0.4,
                    row % 2 ? 0.4 : 0
                );
                
                barrierGroup.add(bag);
            }
        }
        
        return barrierGroup;
    }
    
    createCargoContainers(baseGroup) {
        const containerPositions = [
            [35, -35], [35, -30],
            [30, -35]
        ];
        
        containerPositions.forEach(pos => {
            const container = this.createCargoContainer();
            container.position.set(pos[0], 0, pos[1]);
            container.rotation.y = Math.random() * Math.PI / 2;
            baseGroup.add(container);
        });
    }
    
    createCargoContainer() {
        const containerGroup = new THREE.Group();
        
        // Container body
        const bodyGeometry = new THREE.BoxGeometry(6, 2.5, 2.5);
        const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x5A7F5A });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1.25;
        containerGroup.add(body);
        
        // Container details (ridges)
        const ridgeGeometry = new THREE.BoxGeometry(6.2, 0.1, 2.6);
        const ridgeMaterial = new THREE.MeshBasicMaterial({ color: 0x4A6F4A });
        
        const topRidge = new THREE.Mesh(ridgeGeometry, ridgeMaterial);
        topRidge.position.y = 2.5;
        containerGroup.add(topRidge);
        
        const bottomRidge = new THREE.Mesh(ridgeGeometry, ridgeMaterial);
        bottomRidge.position.y = 0;
        containerGroup.add(bottomRidge);
        
        return containerGroup;
    }
    
    createMiscProps(baseGroup) {
        // Add fuel drums
        const drumPositions = [
            [25, -25], [26, -25], [25.5, -26]
        ];
        
        drumPositions.forEach(pos => {
            const drum = this.createFuelDrum();
            drum.position.set(pos[0], 0, pos[1]);
            baseGroup.add(drum);
        });
        
        // Add communication equipment
        const commEquip = this.createCommEquipment();
        commEquip.position.set(-15, 0, 15);
        baseGroup.add(commEquip);
    }
    
    createFuelDrum() {
        const drumGeometry = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 12);
        const drumMaterial = new THREE.MeshBasicMaterial({ color: 0x8B2323 });
        const drum = new THREE.Mesh(drumGeometry, drumMaterial);
        drum.position.y = 0.6;
        return drum;
    }
    
    createCommEquipment() {
        const equipGroup = new THREE.Group();
        
        // Base unit
        const baseGeometry = new THREE.BoxGeometry(2, 1, 1.5);
        const baseMaterial = new THREE.MeshBasicMaterial({ color: 0x2F4F4F });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.5;
        equipGroup.add(base);
        
        // Antenna array
        const antennaGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2, 8);
        const antennaMaterial = new THREE.MeshBasicMaterial({ color: 0x1F1F1F });
        
        for(let i = 0; i < 3; i++) {
            const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
            antenna.position.set(
                (i - 1) * 0.5,
                1.5,
                0
            );
            equipGroup.add(antenna);
        }
        
        return equipGroup;
    }
}

export default Environment; 