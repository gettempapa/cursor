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
        this.createGround();
        this.addGrassToGround();
        this.createScenicHill();
        this.createSimpleTrees();
        this.createLogCabin();
        this.createSimpleLighting();
    }
    
    /**
     * Create the ground
     */
    createGround() {
        // Create ground geometry
        const groundSize = Constants.GAME.GROUND_SIZE;
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 32, 32);
        
        // Create ground material
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: Constants.COLORS.GROUND,
            roughness: 0.8,
            metalness: 0.2,
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
        
        // Create grass patches
        const patchCount = 100;
        const groundSize = Constants.GAME.GROUND_SIZE;
        
        for (let i = 0; i < patchCount; i++) {
            // Random position within ground bounds
            const position = getRandomPosition(groundSize / 2);
            
            // Create grass patch
            const patchSize = 1 + Math.random() * 2;
            const patchGeometry = new THREE.PlaneGeometry(patchSize, patchSize);
            const patchMaterial = new THREE.MeshBasicMaterial({
                map: grassTexture,
                transparent: true,
                alphaTest: 0.5,
                side: THREE.DoubleSide
            });
            
            const patch = new THREE.Mesh(patchGeometry, patchMaterial);
            patch.position.set(position.x, 0.05, position.z);
            patch.rotation.x = -Math.PI / 2;
            
            // Random rotation
            patch.rotation.z = Math.random() * Math.PI * 2;
            
            this.scene.add(patch);
            this.grassPatches.push(patch);
        }
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
        const hillMaterial = new THREE.MeshStandardMaterial({
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
        
        // Draw grass blades
        const bladeCount = 20;
        
        for (let i = 0; i < bladeCount; i++) {
            // Random position
            const x = Math.random() * canvas.width;
            const y = canvas.height;
            
            // Random width and height
            const width = 2 + Math.random() * 4;
            const height = 20 + Math.random() * 30;
            
            // Random color
            const r = 30 + Math.random() * 50;
            const g = 100 + Math.random() * 80;
            const b = 30 + Math.random() * 50;
            
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
        const trunkMaterial = new THREE.MeshStandardMaterial({
            color: Constants.COLORS.TREE_TRUNK,
            roughness: 0.9
        });
        
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = treeHeight / 2;
        trunk.castShadow = true;
        tree.add(trunk);
        
        // Create foliage
        const foliageCount = 3;
        const foliageMaterial = new THREE.MeshStandardMaterial({
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
        const logMaterial = new THREE.MeshStandardMaterial({
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
        const doorMaterial = new THREE.MeshStandardMaterial({
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
        const logMaterial = new THREE.MeshStandardMaterial({
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
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.8
        });
        
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        windowGroup.add(frame);
        
        // Create window glass
        const glassGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.05);
        const glassMaterial = new THREE.MeshStandardMaterial({
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
        const roofMaterial = new THREE.MeshStandardMaterial({
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
}

export default Environment; 