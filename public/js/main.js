import * as THREE from 'https://cdn.skypack.dev/three@0.137.0';

// Scene setup
let camera, scene, renderer;
let player;
let playerBody; // Separate body and aim control
let playerAimHelper; // Helper for aiming direction
let ground;
const bullets = [];
let lastShootTime = 0;
const shootCooldown = 250; // milliseconds between shots
const trees = []; // Array to store tree objects

// Audio system
let audioListener;
let gunshotSound;
let gunshotSoundLoaded = false;
let ricochetSound;
let reloadSound;

// Movement variables
const keys = {};
const velocity = new THREE.Vector3();
const moveDirection = new THREE.Vector3();
const direction = new THREE.Vector3(); // Add missing direction vector that was removed
const friction = 0.85; // Higher friction for more predictable stopping

// Movement parameters
const MAX_SPEED = 0.2; // Maximum movement speed
const ACCELERATION = 0.01; // Lower acceleration for smoother control
const DECELERATION = 0.95; // How quickly the player slows down

// Physics parameters
const GRAVITY = 0.015;
const JUMP_FORCE = 0.3;
let isOnGround = true;

// Player forward direction (movement direction)
const playerDirection = new THREE.Vector3(0, 0, -1);
// Aim direction (can be different from movement)
const aimDirection = new THREE.Vector3(0, 0, -1);

// Camera controls
const cameraOffset = new THREE.Vector3(0, 2, 5); // Position behind and above player
let mouseX = 0;
let mouseY = 0; // Vertical aim control
const aimSensitivity = 0.002; // How sensitive the aiming is
const maxVerticalRotation = Math.PI / 3; // Limit up/down rotation
let isPointerLocked = false;

// Debug information for tracking script loading
console.log('Script loaded:', document.currentScript?.src);
console.log('Base URL:', window.location.href);

// Check for WebGL support
function checkWebGL() {
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && 
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch(e) {
        console.error('WebGL check error:', e);
        return false;
    }
}

// Initialize everything
console.log('Starting game initialization');
if (!checkWebGL()) {
    alert('Your browser does not support WebGL, which is required for this game.');
    document.getElementById('instructions').innerHTML += '<p style="color:red">WebGL not supported!</p>';
} else {
    init();
    animate();
}

// Create a simple tree
function createTree(x, z) {
    // Create a tree group to hold all parts
    const tree = new THREE.Group();
    
    // Randomize tree characteristics for variety
    const scale = 3.5 + Math.random() * 2.0; // Increased overall size
    const trunkHeight = 5 * scale;
    const trunkRadius = 0.4 * scale;
    const foliageSize = 4.0 * scale;
    
    // Determine tree type - adding more variety
    const treeType = Math.floor(Math.random() * 4); // 0=oak, 1=pine, 2=birch, 3=willow
    
    // More pronounced random rotation and tilt for natural look
    const rotation = Math.random() * Math.PI * 2;
    const tiltAmount = Math.random() * 0.1; // Increased tilt variation
    const tiltDirection = Math.random() * Math.PI * 2;
    
    // Tree trunk with more realistic materials and more geometry segments
    const trunkGeometry = new THREE.CylinderGeometry(
        trunkRadius * 0.7, // Narrower at top
        trunkRadius * 1.2, // Wider at base with more flare
        trunkHeight,
        12,              // More radial segments for better roundness
        8,               // More height segments for bark detail variation
        true             // Open-ended for branch connections
    );
    
    // Different bark colors based on tree type
    let barkColor;
    switch(treeType) {
        case 0: // Oak - rich brown
            barkColor = 0x5D4037;
            break;
        case 1: // Pine - dark brown
            barkColor = 0x3E2723;
            break;
        case 2: // Birch - light grayish
            barkColor = 0xBDBDBD;
            break;
        case 3: // Willow - medium brown
            barkColor = 0x6D4C41;
            break;
    }
    
    // Use MeshStandardMaterial for better lighting effects if available
    const trunkMaterial = (typeof THREE.MeshStandardMaterial !== 'undefined') ? 
        new THREE.MeshStandardMaterial({ 
            color: barkColor,
            roughness: 0.9,    // Very rough
            metalness: 0.1,    // Slight shine for wet bark look
            flatShading: true  // For more texture
        }) : 
        new THREE.MeshBasicMaterial({ color: barkColor });
    
    // Add subtle color variation to trunk
    trunkMaterial.color.r += (Math.random() * 0.1) - 0.05;
    trunkMaterial.color.g += (Math.random() * 0.05) - 0.025;
    trunkMaterial.color.b += (Math.random() * 0.05) - 0.025;
    
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    trunk.rotation.x = Math.sin(tiltDirection) * tiltAmount;
    trunk.rotation.z = Math.cos(tiltDirection) * tiltAmount;
    
    // Add subtle trunk deformation by scaling
    trunk.scale.x *= 1 + (Math.random() * 0.1 - 0.05);
    trunk.scale.z *= 1 + (Math.random() * 0.1 - 0.05);
    
    // Add bark texture through geometry manipulation if using MeshStandardMaterial
    if (typeof THREE.MeshStandardMaterial !== 'undefined') {
        // Create bark-like extrusions on the trunk
        const vertices = trunkGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            // Skip the top and bottom caps of the cylinder
            const y = vertices[i + 1];
            if (y > -trunkHeight/2 + 0.1 && y < trunkHeight/2 - 0.1) {
                // Apply random noise to create bark texture
                const angle = Math.atan2(vertices[i], vertices[i + 2]);
                const noise = Math.sin(angle * 8 + y * 2) * 0.03 * scale;
                
                // Calculate the radial direction
                const dx = vertices[i];
                const dz = vertices[i + 2];
                const len = Math.sqrt(dx * dx + dz * dz);
                
                // Apply the noise in the radial direction
                if (len > 0) {
                    vertices[i] += (dx / len) * noise;
                    vertices[i + 2] += (dz / len) * noise;
                }
            }
        }
        trunkGeometry.attributes.position.needsUpdate = true;
        trunkGeometry.computeVertexNormals();
    }
    
    tree.add(trunk);
    
    // Create multiple layers of foliage for a more realistic look
    const foliageLayers = 5 + Math.floor(Math.random() * 3); // 5-7 layers for lusher foliage
    
    // Enhanced color palette with more variation based on tree type
    let foliageColors;
    
    switch(treeType) {
        case 0: // Oak - more yellowy-greens
            foliageColors = [
                0x33691E, // Deep green
                0x558B2F, // Dark green
                0x7CB342, // Medium green
                0x9CCC65, // Light green
                0xC5E1A5, // Pale green
                0xDCEDC8  // Very pale green
            ];
            break;
        case 1: // Pine - deep blues and greens
            foliageColors = [
                0x1B5E20, // Deep green
                0x2E7D32, // Dark green
                0x388E3C, // Medium green
                0x43A047, // Light green
                0x4CAF50, // Bright green
                0x66BB6A  // Pale green
            ];
            break;
        case 2: // Birch - light greens and yellows
            foliageColors = [
                0x7CB342, // Medium green
                0x9CCC65, // Light green
                0xC5E1A5, // Pale green
                0xDCEDC8, // Very pale green
                0xF0F4C3, // Pale yellow-green
                0xFFF9C4  // Very pale yellow
            ];
            break;
        case 3: // Willow - grayish-greens
            foliageColors = [
                0x455A64, // Blue-gray
                0x546E7A, // Light blue-gray
                0x78909C, // Very light blue-gray
                0x7CB342, // Medium green
                0x9CCC65, // Light green
                0xC5E1A5  // Pale green
            ];
            break;
    }
    
    // Add more branches for a lusher appearance
    const primaryBranchCount = Math.floor(Math.random() * 6) + 8; // 8-13 main branches
    
    for (let i = 0; i < primaryBranchCount; i++) {
        const branchHeight = trunkHeight * (0.2 + Math.random() * 0.7); // Vary height along trunk
        const branchAngle = (i / primaryBranchCount) * Math.PI * 2 + (Math.random() * 0.5 - 0.25);
        const branchTilt = Math.PI * 0.2 + Math.random() * Math.PI * 0.3; // Upward tilt
        
        const branchLength = scale * (1.2 + Math.random() * 0.8);
        const branchThickness = scale * (0.05 + Math.random() * 0.1);
        
        // Create branch with a slight natural taper
        const branchGeometry = new THREE.CylinderGeometry(
            branchThickness * 0.7,  // Tip (thinner)
            branchThickness,        // Base
            branchLength,
            6,                      // Fewer segments for branches
            2                       // Two height segments for slight bending
        );
        
        const branch = new THREE.Mesh(branchGeometry, trunkMaterial.clone());
        
        // Position and rotate branch
        branch.position.y = branchHeight;
        branch.position.x = Math.cos(branchAngle) * trunkRadius * 0.9;
        branch.position.z = Math.sin(branchAngle) * trunkRadius * 0.9;
        
        // Rotate to point outward and upward
        branch.rotation.z = branchTilt;
        branch.rotation.y = branchAngle;
        
        // Slight bend in larger branches
        if (branchLength > scale * 1.5) {
            branchGeometry.translate(0, branchLength * 0.1, 0);
            branch.rotation.z += 0.1;
        }
        
        // Move origin to end of cylinder for correct rotation
        branchGeometry.translate(0, branchLength/2, 0);
        
        // For certain tree types, add sub-branches with leaves at the end
        if (treeType === 0 || treeType === 2 || treeType === 3) { // Oak, Birch, Willow
            // Add small leaf cluster at the end of each branch
            const leafClusterGeometry = new THREE.SphereGeometry(
                scale * (0.4 + Math.random() * 0.3),
                8,
                8
            );
            
            // Choose a color based on tree type
            const leafColorIndex = Math.floor(Math.random() * foliageColors.length);
            const leafColor = new THREE.Color(foliageColors[leafColorIndex]);
            
            // Add variation
            leafColor.r += (Math.random() * 0.15) - 0.075;
            leafColor.g += (Math.random() * 0.15) - 0.075;
            leafColor.b += (Math.random() * 0.15) - 0.075;
            
            const leafMaterial = (typeof THREE.MeshStandardMaterial !== 'undefined') ? 
                new THREE.MeshStandardMaterial({ 
                    color: leafColor,
                    roughness: 0.8,
                    metalness: 0.0
                }) : 
                new THREE.MeshBasicMaterial({ color: leafColor });
            
            const leafCluster = new THREE.Mesh(leafClusterGeometry, leafMaterial);
            leafCluster.position.y = branchLength;
            
            // Slight random offset for more natural look
            leafCluster.position.x = (Math.random() * 0.2 - 0.1) * scale;
            leafCluster.position.z = (Math.random() * 0.2 - 0.1) * scale;
            
            branch.add(leafCluster);
        }
        
        tree.add(branch);
    }
    
    // Create foliage layers with more variation and detail
    // Different foliage for different tree types
    if (treeType === 1) { // Pine - conical shape
        // Create more connected pine-like foliage
        for (let i = 0; i < foliageLayers; i++) {
            // Layer size decreases as we go up, more variation in scaling
            const layerScale = 1 - (i * (0.15 + Math.random() * 0.05));
            const layerHeight = 3.5 * scale * layerScale;
            const layerWidth = foliageSize * layerScale * (0.9 + Math.random() * 0.2); // Width variation
            
            // Pine trees use cones
            const foliageGeometry = new THREE.ConeGeometry(
                layerWidth, 
                layerHeight, 
                10, // More segments 
                4,  // Height segments
                true // Open ended
            );
            
            // Choose a color with more variation
            const colorIndex = Math.floor(Math.random() * foliageColors.length);
            const baseColor = foliageColors[colorIndex];
            
            // Add more significant color variation for natural look
            const color = new THREE.Color(baseColor);
            color.r += (Math.random() * 0.1) - 0.05;
            color.g += (Math.random() * 0.15) - 0.075; // More green variation
            color.b += (Math.random() * 0.1) - 0.05;
            
            // Use StandardMaterial for better lighting if available
            const foliageMaterial = (typeof THREE.MeshStandardMaterial !== 'undefined') ? 
                new THREE.MeshStandardMaterial({ 
                    color: color,
                    roughness: 0.8,
                    metalness: 0.0,
                    flatShading: Math.random() > 0.5 // Random shading style
                }) : 
                new THREE.MeshBasicMaterial({ color: color });
            
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            
            // Position each layer
            const heightVariation = (Math.random() * 0.1 - 0.05) * scale;
            const layerPosition = trunkHeight * 0.5 + (i * 1.0 * scale) + heightVariation;
            foliage.position.y = layerPosition;
            
            // Add slight offset for more natural appearance
            foliage.position.x += (Math.random() - 0.5) * scale * 0.2;
            foliage.position.z += (Math.random() - 0.5) * scale * 0.2;
            
            // Add random rotation and slight scaling for variety
            foliage.rotation.y = Math.random() * Math.PI;
            
            tree.add(foliage);
        }
    } else if (treeType === 3) { // Willow - drooping branches with leaves
        // Create a central foliage cluster
        const centralFoliageGeometry = new THREE.SphereGeometry(
            foliageSize * 0.7,
            10,
            10
        );
        
        const colorIndex = Math.floor(Math.random() * foliageColors.length);
        const baseColor = foliageColors[colorIndex];
        
        const color = new THREE.Color(baseColor);
        color.r += (Math.random() * 0.1) - 0.05;
        color.g += (Math.random() * 0.15) - 0.075;
        color.b += (Math.random() * 0.1) - 0.05;
        
        const foliageMaterial = (typeof THREE.MeshStandardMaterial !== 'undefined') ? 
            new THREE.MeshStandardMaterial({ 
                color: color,
                roughness: 0.8,
                metalness: 0.0,
                flatShading: false
            }) : 
            new THREE.MeshBasicMaterial({ color: color });
        
        const centralFoliage = new THREE.Mesh(centralFoliageGeometry, foliageMaterial);
        centralFoliage.position.y = trunkHeight * 0.85;
        tree.add(centralFoliage);
        
        // Add many drooping branches
        const droopingBranchCount = 20 + Math.floor(Math.random() * 10);
        for (let i = 0; i < droopingBranchCount; i++) {
            const branchAngle = (i / droopingBranchCount) * Math.PI * 2 + (Math.random() * 0.3 - 0.15);
            const branchLength = scale * (2.0 + Math.random() * 1.0);
            
            // Thin drooping branch
            const branchGeometry = new THREE.CylinderGeometry(
                0.01 * scale,
                0.03 * scale,
                branchLength,
                4,
                1
            );
            
            const branch = new THREE.Mesh(branchGeometry, trunkMaterial.clone());
            
            // Position branch around the central foliage
            branch.position.copy(centralFoliage.position);
            branch.position.x += Math.cos(branchAngle) * foliageSize * 0.7 * 0.9;
            branch.position.z += Math.sin(branchAngle) * foliageSize * 0.7 * 0.9;
            
            // Rotate to droop downward
            branch.rotation.x = Math.PI / 2 + (Math.random() * 0.3 + 0.3);
            branch.rotation.y = branchAngle;
            
            // Move origin to end for correct rotation
            branchGeometry.translate(0, branchLength/2, 0);
            
            tree.add(branch);
            
            // Add small leaf clusters along the branch
            const leafCount = Math.floor(Math.random() * 3) + 2;
            for (let j = 0; j < leafCount; j++) {
                const leafPosition = 0.3 + (j / leafCount) * 0.7; // Position along branch
                const leafSize = 0.15 * scale * (1.0 - j / leafCount * 0.3); // Smaller leaves toward end
                
                const leafGeometry = new THREE.SphereGeometry(
                    leafSize,
                    6,
                    6
                );
                
                const leafColorIndex = Math.floor(Math.random() * foliageColors.length);
                const leafColor = new THREE.Color(foliageColors[leafColorIndex]);
                
                // Add variation
                leafColor.r += (Math.random() * 0.1) - 0.05;
                leafColor.g += (Math.random() * 0.1) - 0.05;
                leafColor.b += (Math.random() * 0.1) - 0.05;
                
                const leafMaterial = foliageMaterial.clone();
                leafMaterial.color = leafColor;
                
                const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
                leaf.position.y = -branchLength * leafPosition; // Negative because branch points down
                
                // Random offset
                leaf.position.x = (Math.random() * 0.1 - 0.05) * scale;
                leaf.position.z = (Math.random() * 0.1 - 0.05) * scale;
                
                branch.add(leaf);
            }
        }
    } else { // Oak or Birch - fuller, rounder foliage
        // Create multiple layers of foliage for a more realistic look
        for (let i = 0; i < foliageLayers; i++) {
            // Layer size decreases as we go up, more variation in scaling
            const layerScale = 1 - (i * (0.1 + Math.random() * 0.05));
            const layerHeight = 3.0 * scale * layerScale;
            const layerWidth = foliageSize * layerScale * (0.9 + Math.random() * 0.2); // Width variation
            
            // More shape variations
            let foliageGeometry;
            const shape = Math.random();
            
            if (shape > 0.7) { // 30% chance of rounded top
                foliageGeometry = new THREE.SphereGeometry(
                    layerWidth, 
                    10, // More segments for smoother look
                    8, 
                    0, 
                    Math.PI * 2, 
                    0, 
                    Math.PI * (0.4 + Math.random() * 0.2) // Vary the slice amount
                );
            } else if (shape > 0.3) { // 40% chance of flattened sphere
                foliageGeometry = new THREE.SphereGeometry(
                    layerWidth,
                    10,
                    8
                );
                foliageGeometry.scale(1, 0.7, 1); // Flatten slightly
            } else { // 30% chance of dodecahedron
                foliageGeometry = new THREE.DodecahedronGeometry(
                    layerWidth * 0.9,
                    0 // No subdivision for faceted look
                );
                // Scale to make it slightly taller than wide
                foliageGeometry.scale(1, 1.1, 1);
            }
            
            // Choose a color with more variation
            const colorIndex = Math.floor(Math.random() * foliageColors.length);
            const baseColor = foliageColors[colorIndex];
            
            // Add more significant color variation for natural look
            const color = new THREE.Color(baseColor);
            color.r += (Math.random() * 0.15) - 0.075;
            color.g += (Math.random() * 0.2) - 0.1; // More green variation
            color.b += (Math.random() * 0.15) - 0.075;
            
            // Use StandardMaterial for better lighting if available
            const foliageMaterial = (typeof THREE.MeshStandardMaterial !== 'undefined') ? 
                new THREE.MeshStandardMaterial({ 
                    color: color,
                    roughness: 0.8,
                    metalness: 0.0,
                    flatShading: Math.random() > 0.7 // Less faceted
                }) : 
                new THREE.MeshBasicMaterial({ color: color });
            
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            
            // Position each layer with more variation
            const heightVariation = (Math.random() * 0.4 - 0.2) * scale;
            const layerPosition = trunkHeight * 0.7 + (i * 0.7 * scale) + heightVariation;
            foliage.position.y = layerPosition;
            
            // Add more pronounced offset for more natural appearance
            foliage.position.x += (Math.random() - 0.5) * scale * 0.5;
            foliage.position.z += (Math.random() - 0.5) * scale * 0.5;
            
            // Add random rotation and slight scaling for variety
            foliage.rotation.y = Math.random() * Math.PI;
            foliage.rotation.x = (Math.random() - 0.5) * 0.1;
            foliage.rotation.z = (Math.random() - 0.5) * 0.1;
            
            // Random scaling for more natural variation
            foliage.scale.x *= 0.9 + Math.random() * 0.2;
            foliage.scale.z *= 0.9 + Math.random() * 0.2;
            
            tree.add(foliage);
        }
    }
    
    // Set position with slight random offset
    const posX = x + (Math.random() - 0.5) * 3; // More position variation
    const posZ = z + (Math.random() - 0.5) * 3;
    tree.position.set(posX, 0, posZ);
    tree.rotation.y = rotation;
    
    // Add to scene and store in array
    scene.add(tree);
    trees.push(tree);
    
    return tree;
}

// Expose the createTree function globally
window.createTree = createTree;

// Create a simple humanoid figure
function createHumanoidMesh() {
    const playerGroup = new THREE.Group();
    
    // Create separate group for aiming parts
    playerAimHelper = new THREE.Group();
    playerAimHelper.position.set(0, 1.2, 0); // Position at shoulder height and centered
    playerGroup.add(playerAimHelper);
    
    // Modern tactical color scheme
    const tacticalColors = {
        black: 0x111111,         // Deep black for tactical gear
        darkGrey: 0x333333,      // Dark grey for some equipment
        oliveGreen: 0x556B2F,    // Modern military olive
        desertTan: 0xC2B280,     // Modern desert camo base
        foliageGreen: 0x4F7942,  // Foliage green for woodland camo
        gunmetal: 0x2C3539,      // Gunmetal for weapons and accessories
        khaki: 0xBDB76B,         // Khaki for some uniform elements
        navy: 0x000080           // Navy for special forces elements
    };
    
    // Create a more detailed face with features instead of a yellow sphere
    // Head with proper skin tone
    const headGeometry = new THREE.SphereGeometry(0.22, 24, 24);
    const headMaterial = new THREE.MeshBasicMaterial({ color: 0xE0BEAC }); // Realistic skin tone
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.5;
    playerGroup.add(head);
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Black eyes
    
    // Left eye
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.07, 1.53, 0.18);
    playerGroup.add(leftEye);
    
    // Right eye
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.07, 1.53, 0.18);
    playerGroup.add(rightEye);
    
    // Modern combat helmet with NVG mount
    const helmetGeometry = new THREE.SphereGeometry(0.27, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const helmetMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.oliveGreen });
    const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
    helmet.position.y = 1.55;
    playerGroup.add(helmet);
    
    // Helmet accessories - NVG mount
    const nvgMountGeometry = new THREE.BoxGeometry(0.1, 0.05, 0.05);
    const nvgMountMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
    const nvgMount = new THREE.Mesh(nvgMountGeometry, nvgMountMaterial);
    nvgMount.position.set(0, 1.65, 0.2);
    playerGroup.add(nvgMount);
    
    // Tactical headset/comms
    const headsetGeometry = new THREE.TorusGeometry(0.25, 0.04, 8, 16, Math.PI);
    const headsetMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
    const headset = new THREE.Mesh(headsetGeometry, headsetMaterial);
    headset.rotation.x = Math.PI / 2;
    headset.position.set(0, 1.5, 0);
    playerGroup.add(headset);
    
    // Mic on headset
    const micGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.1, 8);
    const micMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
    const mic = new THREE.Mesh(micGeometry, micMaterial);
    mic.rotation.x = Math.PI / 4;
    mic.position.set(0.2, 1.45, 0.1);
    playerGroup.add(mic);
    
    // Modern tactical vest rather than simple box
    // Main vest body
    const vestGeometry = new THREE.BoxGeometry(0.54, 0.65, 0.3);
    const vestMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.oliveGreen });
    const vest = new THREE.Mesh(vestGeometry, vestMaterial);
    vest.position.y = 1.0;
    playerGroup.add(vest);
    
    // Add MOLLE pouches to vest
    // Ammo pouches
    const pouchGeometry = new THREE.BoxGeometry(0.12, 0.15, 0.08);
    const pouchMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.oliveGreen });
    
    // Left ammo pouch
    const leftPouch = new THREE.Mesh(pouchGeometry, pouchMaterial);
    leftPouch.position.set(-0.2, 0.95, 0.18);
    playerGroup.add(leftPouch);
    
    // Right ammo pouch
    const rightPouch = new THREE.Mesh(pouchGeometry, pouchMaterial);
    rightPouch.position.set(0.2, 0.95, 0.18);
    playerGroup.add(rightPouch);
    
    // Center admin pouch
    const adminPouchGeometry = new THREE.BoxGeometry(0.2, 0.12, 0.1);
    const adminPouch = new THREE.Mesh(adminPouchGeometry, pouchMaterial);
    adminPouch.position.set(0, 1.1, 0.18);
    playerGroup.add(adminPouch);
    
    // Create left arm group for positioning
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.32, 1.1, 0.05);
    // Rotate left arm to support the front of the rifle
    leftArmGroup.rotation.x = Math.PI * 0.05; // Less tilt forward for proper posture
    leftArmGroup.rotation.z = -Math.PI * 0.15; // Angle outward to support rifle
    leftArmGroup.rotation.y = Math.PI * 0.1; // Slight rotation to position hand properly
    playerGroup.add(leftArmGroup);
    
    // Left arm - tactical uniform
    const upperArmGeometry = new THREE.BoxGeometry(0.14, 0.3, 0.14);
    const upperArmMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.oliveGreen });
    const leftUpperArm = new THREE.Mesh(upperArmGeometry, upperArmMaterial);
    leftUpperArm.position.set(0, -0.1, 0);
    leftArmGroup.add(leftUpperArm);
    
    // Left forearm with tactical glove - adjust position to better support the foregrip
    const forearmGeometry = new THREE.BoxGeometry(0.13, 0.3, 0.13);
    const forearmMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.oliveGreen });
    const leftForearm = new THREE.Mesh(forearmGeometry, forearmMaterial);
    leftForearm.position.set(0, -0.35, 0);
    leftForearm.rotation.x = Math.PI * 0.2; // More angled to properly support foregrip
    leftForearm.rotation.y = Math.PI * 0.1; // Slight rotation to position hand naturally
    leftArmGroup.add(leftForearm);
    
    // Left tactical glove - shape and position for holding foregrip
    const leftGloveGeometry = new THREE.BoxGeometry(0.13, 0.08, 0.15); // Slightly longer in z direction for grip
    const gloveMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
    const leftGlove = new THREE.Mesh(leftGloveGeometry, gloveMaterial);
    leftGlove.position.set(0, -0.5, 0.02); // Positioned to hold foregrip
    leftGlove.rotation.x = Math.PI * 0.15; // Rotated to wrap around foregrip
    leftArmGroup.add(leftGlove);
    
    // Create right arm group for positioning - position it relative to the shoulder area of the vest
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.28, -0.1, 0.05); // Position relative to playerAimHelper, which is at shoulder height
    // Rotate right arm to hold the gun properly on the trigger/grip
    rightArmGroup.rotation.x = Math.PI * 0.15; // More tilt forward for trigger hand
    rightArmGroup.rotation.z = Math.PI * 0.15; // Angle inward toward body
    rightArmGroup.rotation.y = -Math.PI * 0.05; // Slight rotation for better grip position
    playerAimHelper.add(rightArmGroup);
    
    // Right upper arm
    const rightUpperArm = new THREE.Mesh(upperArmGeometry, upperArmMaterial);
    rightUpperArm.position.set(0, -0.1, 0);
    rightArmGroup.add(rightUpperArm);
    
    // Right forearm
    const rightForearm = new THREE.Mesh(forearmGeometry, forearmMaterial);
    rightForearm.position.set(0, -0.35, 0);
    rightForearm.rotation.x = Math.PI * 0.25; // Increased angle for better trigger grip position
    rightForearm.rotation.z = Math.PI * 0.05; // Slight rotation for more natural wrist position
    rightArmGroup.add(rightForearm);
    
    // Right tactical glove - adjusted for trigger grip
    const rightGloveGeometry = new THREE.BoxGeometry(0.13, 0.09, 0.16); // Sized for pistol grip
    const rightGlove = new THREE.Mesh(rightGloveGeometry, gloveMaterial);
    rightGlove.position.set(0, -0.5, 0.03); // Position to grip pistol grip
    rightGlove.rotation.x = Math.PI * 0.15; // Angled to wrap fingers around grip
    rightArmGroup.add(rightGlove);
    
    // Tactical pants
    const pantsGeometry = new THREE.BoxGeometry(0.5, 0.2, 0.25);
    const pantsMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.oliveGreen });
    const pants = new THREE.Mesh(pantsGeometry, pantsMaterial);
    pants.position.set(0, 0.65, 0);
    playerGroup.add(pants);
    
    // Legs - tactical cargo pants
    const legGeometry = new THREE.BoxGeometry(0.2, 0.5, 0.2);
    const legMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.oliveGreen });
    
    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.15, 0.45, 0);
    playerGroup.add(leftLeg);
    
    // Left cargo pocket
    const cargoPocketGeometry = new THREE.BoxGeometry(0.1, 0.15, 0.22);
    const cargoPocketMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.oliveGreen });
    const leftCargoPocket = new THREE.Mesh(cargoPocketGeometry, cargoPocketMaterial);
    leftCargoPocket.position.set(-0.2, 0.45, 0);
    playerGroup.add(leftCargoPocket);
    
    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.15, 0.45, 0);
    playerGroup.add(rightLeg);
    
    // Right cargo pocket
    const rightCargoPocket = new THREE.Mesh(cargoPocketGeometry, cargoPocketMaterial);
    rightCargoPocket.position.set(0.2, 0.45, 0);
    playerGroup.add(rightCargoPocket);
    
    // Tactical boots
    const bootGeometry = new THREE.BoxGeometry(0.22, 0.2, 0.28);
    const bootMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
    
    // Left boot
    const leftBoot = new THREE.Mesh(bootGeometry, bootMaterial);
    leftBoot.position.set(-0.15, 0.1, 0.02);
    playerGroup.add(leftBoot);
    
    // Right boot
    const rightBoot = new THREE.Mesh(bootGeometry, bootMaterial);
    rightBoot.position.set(0.15, 0.1, 0.02);
    playerGroup.add(rightBoot);
    
    // Add tactical combat belt
    const beltGeometry = new THREE.TorusGeometry(0.28, 0.05, 8, 16);
    const beltMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
    const belt = new THREE.Mesh(beltGeometry, beltMaterial);
    belt.rotation.x = Math.PI / 2;
    belt.position.set(0, 0.75, 0);
    playerGroup.add(belt);
    
    // Create a tactical modern rifle
    const gunGroup = new THREE.Group();
    gunGroup.name = "gunGroup"; // Add name for reference
    
    // Main rifle body - more detailed
    const rifleBodyGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.7);
    const gunMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
    const rifleBody = new THREE.Mesh(rifleBodyGeometry, gunMaterial);
    gunGroup.add(rifleBody);
    
    // Rifle stock - modern polymer
    const stockGeometry = new THREE.BoxGeometry(0.05, 0.12, 0.25);
    const stockMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
    const stock = new THREE.Mesh(stockGeometry, stockMaterial);
    stock.position.set(0, -0.03, 0.45);
    gunGroup.add(stock);
    
    // Add rifle buttstock padding
    const buttpadGeometry = new THREE.BoxGeometry(0.06, 0.13, 0.02);
    const buttpadMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.darkGrey });
    const buttpad = new THREE.Mesh(buttpadGeometry, buttpadMaterial);
    buttpad.position.set(0, -0.03, 0.58);
    gunGroup.add(buttpad);
    
    // Rail system on top of rifle
    const railGeometry = new THREE.BoxGeometry(0.04, 0.02, 0.5);
    const railMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.gunmetal });
    const topRail = new THREE.Mesh(railGeometry, railMaterial);
    topRail.position.set(0, 0.035, -0.1);
    gunGroup.add(topRail);
    
    // Tactical foregrip
    const foregrip = new THREE.BoxGeometry(0.04, 0.1, 0.04);
    const foregrip_mesh = new THREE.Mesh(foregrip, gunMaterial);
    foregrip_mesh.position.set(0, -0.07, -0.2);
    gunGroup.add(foregrip_mesh);
    
    // Pistol grip
    const gripGeometry = new THREE.BoxGeometry(0.05, 0.15, 0.05);
    const grip = new THREE.Mesh(gripGeometry, gunMaterial);
    grip.position.set(0, -0.1, 0.2);
    gunGroup.add(grip);
    
    // Modern magazine
    const magazineGeometry = new THREE.BoxGeometry(0.05, 0.18, 0.08);
    const magazineMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.gunmetal });
    const magazine = new THREE.Mesh(magazineGeometry, magazineMaterial);
    magazine.position.set(0, -0.13, 0.1);
    gunGroup.add(magazine);
    
    // Barrel with flash hider
    const barrelGeometry = new THREE.CylinderGeometry(0.025, 0.03, 0.2, 8);
    const barrel = new THREE.Mesh(barrelGeometry, gunMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0, -0.45);
    gunGroup.add(barrel);
    
    // Flash hider
    const flashHiderGeometry = new THREE.CylinderGeometry(0.04, 0.03, 0.08, 8);
    const flashHider = new THREE.Mesh(flashHiderGeometry, gunMaterial);
    flashHider.rotation.x = Math.PI / 2;
    flashHider.position.set(0, 0, -0.55);
    gunGroup.add(flashHider);
    
    // Add a tactical red dot sight
    const sightBaseGeometry = new THREE.BoxGeometry(0.07, 0.05, 0.1);
    const sightBaseMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
    const sightBase = new THREE.Mesh(sightBaseGeometry, sightBaseMaterial);
    sightBase.position.set(0, 0.07, -0.15);
    gunGroup.add(sightBase);
    
    // Red dot emitter
    const emitterGeometry = new THREE.BoxGeometry(0.03, 0.03, 0.06);
    const emitterMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
    const emitter = new THREE.Mesh(emitterGeometry, emitterMaterial);
    emitter.position.set(0, 0.1, -0.13);
    gunGroup.add(emitter);
    
    // Add red glow for the sight
    const redDotGeometry = new THREE.SphereGeometry(0.01, 8, 8);
    const redDotMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFF0000,
        transparent: true,
        opacity: 0.8
    });
    const redDot = new THREE.Mesh(redDotGeometry, redDotMaterial);
    redDot.position.set(0, 0.1, -0.1);
    gunGroup.add(redDot);
    
    // Add tactical sling attachment points
    const slingPointGeometry = new THREE.TorusGeometry(0.015, 0.005, 8, 16);
    const slingPointMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.gunmetal });
    
    // Front sling point
    const frontSlingPoint = new THREE.Mesh(slingPointGeometry, slingPointMaterial);
    frontSlingPoint.rotation.y = Math.PI / 2;
    frontSlingPoint.position.set(0.03, 0, -0.3);
    gunGroup.add(frontSlingPoint);
    
    // Rear sling point
    const rearSlingPoint = new THREE.Mesh(slingPointGeometry, slingPointMaterial);
    rearSlingPoint.rotation.y = Math.PI / 2;
    rearSlingPoint.position.set(0.03, 0, 0.3);
    gunGroup.add(rearSlingPoint);
    
    // Add a more realistic trigger to the rifle
    const triggerGeometry = new THREE.BoxGeometry(0.02, 0.05, 0.02);
    const triggerMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.gunmetal });
    const trigger = new THREE.Mesh(triggerGeometry, triggerMaterial);
    trigger.position.set(0, -0.13, 0.18); // Position in trigger guard
    gunGroup.add(trigger);
    
    // Add a trigger guard
    const triggerGuardGeometry = new THREE.TorusGeometry(0.03, 0.01, 8, 8, Math.PI);
    const triggerGuard = new THREE.Mesh(triggerGuardGeometry, gunMaterial);
    triggerGuard.rotation.x = Math.PI / 2;
    triggerGuard.position.set(0, -0.1, 0.18);
    gunGroup.add(triggerGuard);
    
    // Position the rifle in proper aiming position
    // Move the gun up to be gripped properly by the hands
    gunGroup.position.set(0.04, 0.15, -0.25);
    
    // Slightly adjust rifle angle for proper hand alignment
    gunGroup.rotation.x = -Math.PI * 0.03;
    // No need to rotate to point forward since we fixed the position
    // gunGroup.rotation.y = Math.PI; // Removed this line as it was making the gun point backward
    // Slight tilt for realistic aiming
    gunGroup.rotation.z = Math.PI * 0.02;
    
    // Connect the right hand to the rifle grip
    rightArmGroup.add(gunGroup);
    
    // Create visual connection between left hand and foregrip
    // Invisible helper object positioned at the foregrip
    const leftHandTarget = new THREE.Object3D();
    leftHandTarget.position.set(-0.29, 1.1, -0.05); // Position where left hand should reach
    playerGroup.add(leftHandTarget);
    
    // Adjust left arm group to point toward foregrip
    leftArmGroup.lookAt(leftHandTarget.position);
    // Adjust left arm rotation slightly for natural positioning
    leftArmGroup.rotation.x += Math.PI * 0.1;
    leftArmGroup.rotation.z -= Math.PI * 0.1;
    
    // Add visual aim indicator (laser sight from gun)
    const aimIndicatorGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.4, 8);
    const aimIndicatorMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFF0000,
        transparent: true,
        opacity: 0.5
    });
    const aimIndicator = new THREE.Mesh(aimIndicatorGeometry, aimIndicatorMaterial);
    aimIndicator.rotation.x = Math.PI / 2;
    aimIndicator.position.set(0, 0, -0.75); // Position in front of gun barrel
    gunGroup.add(aimIndicator);
    
    // Add a tactical knife on the belt
    const knifeHandleGeometry = new THREE.BoxGeometry(0.03, 0.03, 0.12);
    const knifeHandleMaterial = new THREE.MeshBasicMaterial({ color: tacticalColors.black });
    const knifeHandle = new THREE.Mesh(knifeHandleGeometry, knifeHandleMaterial);
    knifeHandle.position.set(-0.25, 0.75, 0.15);
    knifeHandle.rotation.x = Math.PI / 2.5;
    playerGroup.add(knifeHandle);
    
    const knifeBladeGeometry = new THREE.BoxGeometry(0.02, 0.01, 0.15);
    const knifeBladeMaterial = new THREE.MeshBasicMaterial({ color: 0xC0C0C0 }); // Silver
    const knifeBlade = new THREE.Mesh(knifeBladeGeometry, knifeBladeMaterial);
    knifeBlade.position.set(-0.25, 0.85, 0.23);
    knifeBlade.rotation.x = Math.PI / 2.5;
    playerGroup.add(knifeBlade);
    
    return playerGroup;
}

// Utility function to add tactical details to objects
function addTacticalDetails(object, colors) {
    // This function adds visual elements to make objects look more tactical
    // For example, attaching small accessories, reflectors, or patches
    if (!object || !object.material) return;
    
    // We could add details in more advanced implementations
    // For now, this is a placeholder for future enhancements
    // such as normal maps, textures, or additional geometry
    
    // In a more advanced implementation, this would add:
    // - Velcro patches
    // - Unit insignias
    // - Tactical accessories
    // - Wear patterns
    // - Reflective elements for night operations
}

// Add setupEventListeners function to handle keyboard and mouse input
function setupEventListeners() {
    // Keyboard controls
    document.addEventListener('keydown', (event) => {
        keys[event.code] = true;
        console.log('Key pressed:', event.code);
        
        // Jump when spacebar is pressed and player is on the ground
        if (event.code === 'Space' && isOnGround) {
            velocity.y = JUMP_FORCE;
            isOnGround = false;
            console.log('JUMP!');
        }
    });

    document.addEventListener('keyup', (event) => {
        keys[event.code] = false;
    });

    // Mouse controls for aiming
    document.addEventListener('mousemove', (event) => {
        if (!isPointerLocked) return;
        
        // Fix mouse X direction for standard third-person controls
        // When mouse moves right (positive movementX), camera should rotate right (negative mouseX)
        mouseX -= event.movementX * aimSensitivity;
        
        // Limit vertical rotation
        mouseY -= event.movementY * aimSensitivity;
        mouseY = Math.max(-maxVerticalRotation, Math.min(maxVerticalRotation, mouseY));
    });
    
    // Pointer lock for FPS controls
    renderer.domElement.addEventListener('click', () => {
        if (!isPointerLocked) {
            renderer.domElement.requestPointerLock();
        }
    });
    
    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === renderer.domElement;
    });
    
    // Shooting mechanic
    document.addEventListener('mousedown', (event) => {
        if (event.button === 0) { // Left mouse button
            shoot();
        }
    });
}

function init() {
    // Check WebGL compatibility first
    if (!checkWebGL()) return;
    
    try {
        // Create the scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x8FBCD4); // Slightly darker sky blue
        
        // Add atmospheric fog for depth
        scene.fog = new THREE.FogExp2(0x8FBCD4, 0.004); // Reduced fog density
        
        // Create camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Set up audio system
        audioListener = new THREE.AudioListener();
        camera.add(audioListener);
        
        // Make sure audio context is initialized properly
        const initAudio = () => {
            if (audioListener.context.state === 'suspended') {
                audioListener.context.resume();
            }
        };
        document.addEventListener('click', initAudio, { once: true });

        // Load gunshot sound - powerful rifle sound
        gunshotSound = new THREE.Audio(audioListener);
        const audioLoader = new THREE.AudioLoader();
        
        // Load main gunshot sound
        audioLoader.load(
            'https://freesound.org/data/previews/642/642315_7177907-lq.mp3', // Powerful rifle shot
            function(buffer) {
                gunshotSound.setBuffer(buffer);
                gunshotSound.setVolume(0.8); // Slightly less than full volume
                gunshotSound.setPlaybackRate(0.9); // Slightly slowed for more bass
                gunshotSoundLoaded = true;
                console.log('Gunshot sound loaded!');
            },
            function(xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            function(err) {
                console.error('Error loading gunshot sound:', err);
                // Fallback to create an oscillator sound if loading fails
                createFallbackGunshotSound();
            }
        );
        
        // Load ricochet sound for bullet impact
        ricochetSound = new THREE.Audio(audioListener);
        audioLoader.load(
            'https://freesound.org/data/previews/420/420368_7383104-lq.mp3',
            function(buffer) {
                ricochetSound.setBuffer(buffer);
                ricochetSound.setVolume(0.5);
            },
            null,
            function(err) {
                console.error('Error loading ricochet sound:', err);
            }
        );
        
        // Load reload sound for potential reload mechanic
        reloadSound = new THREE.Audio(audioListener);
        audioLoader.load(
            'https://freesound.org/data/previews/522/522396_9468981-lq.mp3',
            function(buffer) {
                reloadSound.setBuffer(buffer);
                reloadSound.setVolume(0.6);
            },
            null,
            function(err) {
                console.error('Error loading reload sound:', err);
            }
        );

        // Create renderer with improved settings
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        
        // Enable shadows based on device performance
        const performanceCheck = () => {
            // Check if the device can handle shadows
            const gl = renderer.getContext();
            const extensions = gl.getSupportedExtensions();
            const hasGoodExtensions = extensions && (
                extensions.includes('WEBGL_depth_texture') || 
                extensions.includes('WEBKIT_WEBGL_depth_texture')
            );
            
            // Check for mobile devices which might struggle with shadows
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            // Enable shadows only on capable devices
            if (hasGoodExtensions && !isMobile) {
                renderer.shadowMap.enabled = true;
                renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                return true;
            } else {
                renderer.shadowMap.enabled = false;
                return false;
            }
        };
        
        const shadowsEnabled = performanceCheck();
        document.body.appendChild(renderer.domElement);
        
        // Enhanced lighting for better scene quality
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Softer ambient light
        scene.add(ambientLight);
        
        // Add directional sunlight with shadows
        const sunLight = new THREE.DirectionalLight(0xfffaf0, 0.8); // Warm sunlight color
        sunLight.position.set(50, 100, 50);
        
        if (shadowsEnabled) {
            sunLight.castShadow = true;
            sunLight.shadow.mapSize.width = 1024;
            sunLight.shadow.mapSize.height = 1024;
            sunLight.shadow.camera.near = 0.5;
            sunLight.shadow.camera.far = 500;
            sunLight.shadow.camera.left = -100;
            sunLight.shadow.camera.right = 100;
            sunLight.shadow.camera.top = 100;
            sunLight.shadow.camera.bottom = -100;
        }
        
        scene.add(sunLight);
        
        // Create enhanced ground with texture and detail
        const groundSize = 500;
        const groundSegments = 64; // Reduced from 128 for better performance
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, groundSegments, groundSegments);
        
        // Add terrain variations - gentle hills and dips
        const vertices = groundGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            // Skip edges for a flat boundary
            const x = vertices[i];
            const z = vertices[i + 2];
            const distanceFromCenter = Math.sqrt(x * x + z * z);
            
            if (distanceFromCenter < groundSize * 0.45) {
                // Apply simplex-like noise for natural terrain
                const xNoise = x * 0.02;
                const zNoise = z * 0.02;
                const noise = 
                    Math.sin(xNoise) * Math.cos(zNoise) * 1.5 + 
                    Math.sin(xNoise * 2.5) * Math.cos(zNoise * 2.5) * 0.8 +
                    Math.sin(xNoise * 5) * Math.cos(zNoise * 5) * 0.4;
                
                // Apply height variation, less intense farther from center
                vertices[i + 1] = noise * Math.max(0, 1 - distanceFromCenter / (groundSize * 0.45));
            }
        }
        groundGeometry.attributes.position.needsUpdate = true;
        groundGeometry.computeVertexNormals();
        
        // Create richer ground texture
        // Using MeshStandardMaterial for better lighting and shadow reception
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2D572C, // Base green
            roughness: 0.9,
            metalness: 0.0,
            side: THREE.DoubleSide
        });
        
        // Apply color variations to the ground for more realism
        if (groundMaterial.color && typeof groundMaterial.color.offsetHSL === 'function') {
            // Random hue variation for different areas
            const groundColors = [];
            const colorVariations = 5;
            
            for (let i = 0; i < colorVariations; i++) {
                const color = new THREE.Color(0x2D572C);
                // Subtle variations in hue and saturation
                color.offsetHSL(
                    (Math.random() * 0.1) - 0.05, // Hue variation
                    (Math.random() * 0.2),        // Saturation increase
                    (Math.random() * 0.1) - 0.05   // Lightness variation
                );
                groundColors.push(color);
            }
            
            // Apply color variations
            if (groundGeometry.setAttribute) {
                const colors = [];
                const positionArray = groundGeometry.attributes.position.array;
                
                for (let i = 0; i < positionArray.length; i += 3) {
                    const x = positionArray[i];
                    const z = positionArray[i + 2];
                    
                    // Different colors based on position
                    const noiseVal = Math.sin(x * 0.05) * Math.cos(z * 0.05);
                    const colorIndex = Math.floor(Math.abs(noiseVal) * colorVariations) % colorVariations;
                    const color = groundColors[colorIndex];
                    
                    colors.push(color.r, color.g, color.b);
                }
                
                const colorAttribute = new THREE.Float32BufferAttribute(colors, 3);
                groundGeometry.setAttribute('color', colorAttribute);
                groundMaterial.vertexColors = true;
            }
        }
        
        ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        ground.position.y = 0;
        ground.receiveShadow = shadowsEnabled;
        scene.add(ground);
        
        // Add detailed grass patches and ground foliage
        const createGrassAndFoliage = () => {
            const totalPatches = 300; // Reduced from 500 for better performance
            
            // Create a simple grass texture using canvas
            const grassTextureCanvas = document.createElement('canvas');
            grassTextureCanvas.width = 64;
            grassTextureCanvas.height = 64;
            const ctx = grassTextureCanvas.getContext('2d');
            
            // Create grass blades
            ctx.clearRect(0, 0, 64, 64);
            ctx.fillStyle = 'rgba(0, 0, 0, 0)'; // Transparent background
            ctx.fillRect(0, 0, 64, 64);
            
            // Draw grass blades
            for (let i = 0; i < 15; i++) {
                const x = 32 + (Math.random() * 30 - 15);
                const width = 1 + Math.random() * 2;
                const height = 20 + Math.random() * 30;
                
                // Randomize grass blade color
                const r = 50 + Math.random() * 40;
                const g = 120 + Math.random() * 70;
                const b = 30 + Math.random() * 40;
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                
                // Draw blade
                ctx.beginPath();
                ctx.moveTo(x, 64);
                ctx.quadraticCurveTo(
                    x + (Math.random() * 10 - 5), // Control point x
                    64 - height * 0.5,           // Control point y
                    x + (Math.random() * 6 - 3),  // End point x
                    64 - height                  // End point y
                );
                ctx.lineTo(x + width, 64 - height);
                ctx.quadraticCurveTo(
                    x + width + (Math.random() * 10 - 5), // Control point x
                    64 - height * 0.5,                   // Control point y
                    x + width, 64                        // End point x/y
                );
                ctx.closePath();
                ctx.fill();
            }
            
            const grassTexture = new THREE.CanvasTexture(grassTextureCanvas);
            
            // Create additional ground cover textures
            const createFlowerTexture = (color1, color2) => {
                const canvas = document.createElement('canvas');
                canvas.width = 64;
                canvas.height = 64;
                const context = canvas.getContext('2d');
                
                context.clearRect(0, 0, 64, 64);
                context.fillStyle = 'rgba(0, 0, 0, 0)';
                context.fillRect(0, 0, 64, 64);
                
                // Draw stems
                for (let i = 0; i < 3; i++) {
                    const x = 20 + i * 10 + (Math.random() * 6 - 3);
                    const stemHeight = 25 + Math.random() * 20;
                    
                    context.beginPath();
                    context.moveTo(x, 64);
                    context.lineTo(x, 64 - stemHeight);
                    context.lineWidth = 1 + Math.random();
                    context.strokeStyle = `rgb(60, ${100 + Math.random() * 50}, 60)`;
                    context.stroke();
                    
                    // Draw flower
                    context.beginPath();
                    context.arc(x, 64 - stemHeight, 4 + Math.random() * 4, 0, Math.PI * 2);
                    context.fillStyle = color1;
                    context.fill();
                    
                    // Draw flower center
                    context.beginPath();
                    context.arc(x, 64 - stemHeight, 2, 0, Math.PI * 2);
                    context.fillStyle = color2;
                    context.fill();
                }
                
                return new THREE.CanvasTexture(canvas);
            };
            
            // Create various ground cover textures
            const whiteFlowerTexture = createFlowerTexture('rgb(255, 255, 255)', 'rgb(255, 255, 150)');
            const yellowFlowerTexture = createFlowerTexture('rgb(255, 255, 150)', 'rgb(255, 150, 0)');
            const purpleFlowerTexture = createFlowerTexture('rgb(200, 150, 255)', 'rgb(100, 50, 150)');
            
            // Different types of ground cover
            const textures = [
                { texture: grassTexture, scale: 1.0, probability: 0.7 },
                { texture: whiteFlowerTexture, scale: 0.7, probability: 0.1 },
                { texture: yellowFlowerTexture, scale: 0.8, probability: 0.1 },
                { texture: purpleFlowerTexture, scale: 0.6, probability: 0.1 }
            ];
            
            // Create and distribute grass/flower patches
            for (let i = 0; i < totalPatches; i++) {
                // Get random position with higher concentration in certain areas
                let x, z;
                const placeInCluster = Math.random() < 0.7; // 70% in clusters
                
                if (placeInCluster) {
                    // Create cluster centers
                    const clusterCount = 8;
                    const clusterIndex = Math.floor(Math.random() * clusterCount);
                    const angle = (clusterIndex / clusterCount) * Math.PI * 2;
                    const clusterDistance = 50 + Math.random() * 150;
                    const clusterX = Math.cos(angle) * clusterDistance;
                    const clusterZ = Math.sin(angle) * clusterDistance;
                    
                    // Position within cluster
                    const radius = 20 + Math.random() * 30;
                    const localAngle = Math.random() * Math.PI * 2;
                    const localDistance = Math.random() * radius;
                    
                    x = clusterX + Math.cos(localAngle) * localDistance;
                    z = clusterZ + Math.sin(localAngle) * localDistance;
                } else {
                    // Random position
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 20 + Math.random() * 230;
                    x = Math.cos(angle) * distance;
                    z = Math.sin(angle) * distance;
                }
                
                // Get height at position by sampling ground geometry
                let y = 0;
                const sampleX = (x / groundSize) * 2;
                const sampleZ = (z / groundSize) * 2;
                
                // Approximate height
                y = Math.sin(sampleX * Math.PI * 2) * Math.cos(sampleZ * Math.PI * 2) * 1.5 +
                    Math.sin(sampleX * Math.PI * 5) * Math.cos(sampleZ * Math.PI * 5) * 0.5;
                
                // Choose texture type based on probability
                let textureInfo;
                const rand = Math.random();
                let cumProb = 0;
                
                for (const info of textures) {
                    cumProb += info.probability;
                    if (rand <= cumProb) {
                        textureInfo = info;
                        break;
                    }
                }
                
                if (!textureInfo) textureInfo = textures[0]; // Default to grass
                
                // Create grass/flower patch
                const size = (1 + Math.random() * 1.5) * textureInfo.scale;
                const patchGeometry = new THREE.PlaneGeometry(size, size);
                const patchMaterial = new THREE.MeshBasicMaterial({
                    map: textureInfo.texture,
                    transparent: true,
                    alphaTest: 0.5,
                    side: THREE.DoubleSide
                });
                
                const patch = new THREE.Mesh(patchGeometry, patchMaterial);
                patch.position.set(x, y + 0.05, z);
                patch.rotation.x = -Math.PI / 2;
                patch.rotation.z = Math.random() * Math.PI * 2;
                
                scene.add(patch);
            }
            
            // Create larger ferns and bushes for additional ground cover
            const createFern = (x, z) => {
                const fernGroup = new THREE.Group();
                const stemCount = 5 + Math.floor(Math.random() * 5);
                const fernHeight = 0.5 + Math.random() * 1.0;
                
                // Get height at position
                let y = 0;
                const sampleX = (x / groundSize) * 2;
                const sampleZ = (z / groundSize) * 2;
                
                // Approximate height
                y = Math.sin(sampleX * Math.PI * 2) * Math.cos(sampleZ * Math.PI * 2) * 1.5 +
                    Math.sin(sampleX * Math.PI * 5) * Math.cos(sampleZ * Math.PI * 5) * 0.5;
                
                // Create each stem
                for (let i = 0; i < stemCount; i++) {
                    const stemGeometry = new THREE.PlaneGeometry(
                        0.1 + Math.random() * 0.3,
                        fernHeight * (0.6 + Math.random() * 0.4)
                    );
                    
                    // Green color with variation
                    const r = 30 + Math.random() * 30;
                    const g = 100 + Math.random() * 50;
                    const b = 30 + Math.random() * 30;
                    
                    const stemMaterial = new THREE.MeshBasicMaterial({
                        color: new THREE.Color(`rgb(${r}, ${g}, ${b})`),
                        side: THREE.DoubleSide
                    });
                    
                    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
                    
                    // Position around center
                    const angle = (i / stemCount) * Math.PI * 2 + (Math.random() * 0.5 - 0.25);
                    const distance = Math.random() * 0.2;
                    stem.position.x = Math.cos(angle) * distance;
                    stem.position.z = Math.sin(angle) * distance;
                    stem.position.y = fernHeight / 2;
                    
                    // Rotate outward
                    stem.rotation.y = angle;
                    stem.rotation.x = Math.random() * 0.3 - 0.15;
                    
                    fernGroup.add(stem);
                }
                
                fernGroup.position.set(x, y, z);
                scene.add(fernGroup);
            };
            
            // Create bushes
            const createBush = (x, z) => {
                const bushGroup = new THREE.Group();
                
                // Get height at position
                let y = 0;
                const sampleX = (x / groundSize) * 2;
                const sampleZ = (z / groundSize) * 2;
                
                // Approximate height
                y = Math.sin(sampleX * Math.PI * 2) * Math.cos(sampleZ * Math.PI * 2) * 1.5 +
                    Math.sin(sampleX * Math.PI * 5) * Math.cos(sampleZ * Math.PI * 5) * 0.5;
                
                // Bush size
                const bushSize = 0.8 + Math.random() * 1.2;
                
                // Create bush from multiple spheres
                const sphereCount = 3 + Math.floor(Math.random() * 4);
                for (let i = 0; i < sphereCount; i++) {
                    const sphereGeometry = new THREE.SphereGeometry(
                        bushSize * (0.6 + Math.random() * 0.4),
                        6, 6
                    );
                    
                    // Green color with variation
                    const r = 20 + Math.random() * 30;
                    const g = 80 + Math.random() * 60;
                    const b = 20 + Math.random() * 30;
                    
                    const sphereMaterial = new THREE.MeshBasicMaterial({
                        color: new THREE.Color(`rgb(${r}, ${g}, ${b})`)
                    });
                    
                    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
                    
                    // Position randomly within bush bounds
                    sphere.position.x = (Math.random() * 0.6 - 0.3) * bushSize;
                    sphere.position.z = (Math.random() * 0.6 - 0.3) * bushSize;
                    sphere.position.y = bushSize * 0.6 + (Math.random() * 0.4 - 0.2) * bushSize;
                    
                    // Scale randomly for variety
                    sphere.scale.x = 0.8 + Math.random() * 0.4;
                    sphere.scale.y = 0.8 + Math.random() * 0.4;
                    sphere.scale.z = 0.8 + Math.random() * 0.4;
                    
                    bushGroup.add(sphere);
                }
                
                bushGroup.position.set(x, y, z);
                scene.add(bushGroup);
            };
            
            // Add ferns and bushes
            const fernCount = 50;
            const bushCount = 30;
            
            for (let i = 0; i < fernCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = 30 + Math.random() * 150;
                const x = Math.cos(angle) * distance;
                const z = Math.sin(angle) * distance;
                
                createFern(x, z);
            }
            
            for (let i = 0; i < bushCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = 40 + Math.random() * 150;
                const x = Math.cos(angle) * distance;
                const z = Math.sin(angle) * distance;
                
                createBush(x, z);
            }
        };
        
        // Create all the grass and ground foliage
        createGrassAndFoliage();
        
        // Create a simple atmospheric effect
        const createAtmosphericEffect = () => {
            // Distant fog mountains for depth
            const mountainGeometry = new THREE.PlaneGeometry(1000, 100);
            const mountainMaterial = new THREE.MeshBasicMaterial({
                color: 0x8FAFC5, // Foggy blue-gray
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide
            });
            
            // Create a ring of mountains around the scene
            const mountainCount = 12;
            for (let i = 0; i < mountainCount; i++) {
                const angle = (i / mountainCount) * Math.PI * 2;
                const distance = 300;
                
                const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
                mountain.position.set(
                    Math.cos(angle) * distance,
                    30, // Height above ground
                    Math.sin(angle) * distance
                );
                
                // Face inward
                mountain.rotation.y = angle;
                
                scene.add(mountain);
            }
        };
        
        // Add atmospheric elements
        createAtmosphericEffect();
        
        // Create player group
        player = new THREE.Group();
        player.position.set(0, 1, 0); // Start at origin, slightly above ground
        scene.add(player);
        
        // Create player body
        playerBody = createHumanoidMesh();
        player.add(playerBody);
        
        // Create a more visually appealing forest with better distribution
        const clearingRadius = 18; // Larger clearing for bigger trees
        const forestRadius = 100; // Expanded forest area
        const treeCount = 70; // More trees for a denser forest
        
        // Create a few distinct tree clusters for more natural appearance
        const clusterCount = 5;
        const clusterCenters = [];
        
        // Generate random cluster centers
        for (let i = 0; i < clusterCount; i++) {
            const angle = (i / clusterCount) * Math.PI * 2 + (Math.random() * 0.5 - 0.25);
            const distance = clearingRadius + 15 + Math.random() * 20;
            
            clusterCenters.push({
                x: Math.cos(angle) * distance,
                z: Math.sin(angle) * distance,
                radius: 10 + Math.random() * 15 // Cluster size
            });
        }
        
        // Larger trees for backdrop (furthest from player)
        const backdropTreeCount = 15;
        for (let i = 0; i < backdropTreeCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = forestRadius * 0.7 + Math.random() * (forestRadius * 0.3);
            
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            // Create tree with explicit larger scale for backdrop effect
            createTree(x, z);
        }
        
        // Trees in clusters (medium distance)
        const clusterTreeCount = 35;
        for (let i = 0; i < clusterTreeCount; i++) {
            // Pick a random cluster
            const cluster = clusterCenters[Math.floor(Math.random() * clusterCenters.length)];
            
            // Random position within cluster
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * cluster.radius;
            
            const x = cluster.x + Math.cos(angle) * distance;
            const z = cluster.z + Math.sin(angle) * distance;
            
            // Verify not in clearing
            if (Math.sqrt(x * x + z * z) > clearingRadius) {
                createTree(x, z);
            }
        }
        
        // Scattered trees (various distances)
        const scatteredTreeCount = 20;
        for (let i = 0; i < scatteredTreeCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = clearingRadius + Math.random() * (forestRadius - clearingRadius);
            
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            if (Math.sqrt(x * x + z * z) > clearingRadius) {
                createTree(x, z);
            }
        }
        
        // Handle window resizing
        window.addEventListener('resize', onWindowResize);
        
        // Setup event listeners for controls
        setupEventListeners();
        
        console.log('Initialization complete with basic materials!');
        // Start the animation loop
        animate();
    } catch (error) {
        console.error('Initialization error:', error);
        document.getElementById('instructions').innerHTML = 
            `<p style="color:red">Error: ${error.message}</p>`;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function shoot() {
    const currentTime = Date.now();
    if (currentTime - lastShootTime < shootCooldown) return;
    lastShootTime = currentTime;
    
    try {
        // Play gunshot sound
        if (gunshotSoundLoaded && gunshotSound && gunshotSound.context) {
            // Make sure audio context is running
            if (gunshotSound.context.state !== 'running') {
                gunshotSound.context.resume();
            }
            
            // Play the sound directly instead of cloning
            if (!gunshotSound.isPlaying) {
                gunshotSound.play();
            }
        } else {
            console.log("Sound not loaded correctly, using fallback");
            createFallbackGunshotSound();
            if (gunshotSound && !gunshotSound.isPlaying) {
                gunshotSound.play();
            }
        }
        
        // Get gun position and aim direction from playerAimHelper
        const gunGroup = findObjectByName(playerAimHelper, "gunGroup");
        if (!gunGroup) return;
        
        // Calculate gun position in world space
        const gunPosition = new THREE.Vector3();
        gunGroup.getWorldPosition(gunPosition);
        
        // Use playerAimHelper direction for accurate aiming
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyEuler(playerAimHelper.rotation);
        
        // Add slight random spread
        direction.x += (Math.random() - 0.5) * 0.02;
        direction.y += (Math.random() - 0.5) * 0.02;
        direction.z += (Math.random() - 0.5) * 0.02;
        direction.normalize();
        
        // Create bullet
        const bulletGeometry = new THREE.SphereGeometry(0.02, 8, 8);
        const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        // Position bullet at gun barrel
        bullet.position.copy(gunPosition);
        // Offset slightly to appear from barrel
        bullet.position.add(direction.clone().multiplyScalar(0.5));
        
        scene.add(bullet);
        
        // Add bullet data for movement
        bullets.push({
            mesh: bullet,
            direction: direction,
            speed: 1.5,
            distance: 0,
            maxDistance: 100
        });
    } catch (error) {
        console.error("Error in shoot function:", error);
    }
}

// Utility function to find an object by name in the hierarchy
function findObjectByName(root, name) {
    let found = null;
    
    // If this object has the name we're looking for, return it
    if (root.name === name) {
        return root;
    }
    
    // Otherwise, search its children
    if (root.children && root.children.length > 0) {
        for (let i = 0; i < root.children.length; i++) {
            found = findObjectByName(root.children[i], name);
            if (found) return found;
        }
    }
    
    return found;
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // Move bullet forward
        const movement = bullet.direction.clone().multiplyScalar(bullet.speed);
        bullet.mesh.position.add(movement);
        
        // Update distance traveled
        bullet.distance += bullet.speed;
        
        // Remove bullets that have gone too far
        if (bullet.distance > bullet.maxDistance) {
            scene.remove(bullet.mesh);
            bullets.splice(i, 1);
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    // Reset movement direction for this frame
    moveDirection.set(0, 0, 0);
    
    // Get input from WASD keys
    // The actual direction will be calculated relative to camera later
    if (keys['KeyW']) {
        moveDirection.z = -1; // Forward
    }
    if (keys['KeyS']) {
        moveDirection.z = 1; // Backward
    }
    if (keys['KeyA']) {
        moveDirection.x = -1; // Left
    }
    if (keys['KeyD']) {
        moveDirection.x = 1; // Right
    }
    
    // Only normalize if we're actually moving
    if (moveDirection.length() > 0) {
        moveDirection.normalize();
    }
    
    // Create a camera direction vector (where the camera is looking)
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    // Rotate it based on the current camera rotation
    cameraDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), mouseX);
    
    // Forward vector is the camera direction
    const forward = cameraDirection.clone();
    
    // Right vector is perpendicular to forward (cross product with up vector)
    const right = new THREE.Vector3().crossVectors(
        new THREE.Vector3(0, 1, 0), // Up vector
        forward
    ).normalize();
    
    // Set the direction based on camera orientation
    direction.set(0, 0, 0);
    
    // Add components based on input
    // W/S move along the camera's forward/backward axis
    if (moveDirection.z !== 0) {
        direction.add(forward.clone().multiplyScalar(moveDirection.z));
    }
    
    // A/D move along the camera's left/right axis
    if (moveDirection.x !== 0) {
        direction.add(right.clone().multiplyScalar(moveDirection.x));
    }
    
    // Normalize the final direction
    if (direction.length() > 0) {
        direction.normalize();
    }
    
    // Apply acceleration based on input
    if (direction.length() > 0) {
        // Add acceleration in the movement direction
        velocity.x += direction.x * ACCELERATION;
        velocity.z += direction.z * ACCELERATION;
        
        // Calculate current horizontal speed
        const currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        
        // If we're exceeding max speed, scale it back
        if (currentSpeed > MAX_SPEED) {
            const scaleFactor = MAX_SPEED / currentSpeed;
            velocity.x *= scaleFactor;
            velocity.z *= scaleFactor;
        }
    } else {
        // Apply stronger deceleration when no keys are pressed
        velocity.x *= DECELERATION;
        velocity.z *= DECELERATION;
    }
    
    // Apply gravity
    velocity.y -= GRAVITY;
    
    // Apply velocity to player position
    player.position.x += velocity.x;
    player.position.y += velocity.y;
    player.position.z += velocity.z;
    
    // Ground collision
    if (player.position.y < 1) {
        player.position.y = 1;
        velocity.y = 0;
        isOnGround = true;
    }
    
    // Apply friction to horizontal movement
    velocity.x *= friction;
    velocity.z *= friction;
    
    // Rotate the entire player to face movement direction
    if (direction.length() > 0.1) {
        // Calculate rotation from direction vector
        const targetRotation = Math.atan2(direction.x, direction.z);
        
        // Apply smooth rotation
        const rotationSpeed = 0.15; // How quickly the player turns to face direction
        const currentRotation = player.rotation.y;
        
        // Calculate shortest rotation path
        let rotationDiff = targetRotation - currentRotation;
        if (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
        if (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
        
        // Smooth rotation
        player.rotation.y += rotationDiff * rotationSpeed;
    }
    
    // IMPORTANT: Detach the playerAimHelper from player rotation
    // This ensures the gun aim follows camera exactly
    player.remove(playerAimHelper);
    scene.add(playerAimHelper);

    // Update player aim direction based on mouse movement
    playerAimHelper.position.copy(player.position);
    playerAimHelper.position.y = player.position.y + 1.2; // Maintain shoulder height
    playerAimHelper.rotation.y = mouseX;

    // Limit vertical aim to avoid weird angles
    mouseY = Math.max(-Math.PI/3, Math.min(Math.PI/6, mouseY));

    // Apply vertical aiming only to the playerAimHelper 
    playerAimHelper.rotation.x = mouseY;

    // Reset player body rotation for aiming independently of movement
    playerAimHelper.rotation.order = 'YXZ'; // Set rotation order to prevent gimbal lock
    
    // Update camera position relative to player
    camera.position.x = player.position.x - Math.sin(mouseX) * cameraOffset.z;
    camera.position.z = player.position.z - Math.cos(mouseX) * cameraOffset.z;
    camera.position.y = player.position.y + cameraOffset.y;
    
    // Make camera look at player
    camera.lookAt(
        player.position.x,
        player.position.y + 1.2 + mouseY * 0.5, // Add mouseY influence to vertical camera target
        player.position.z
    );
    
    // Update bullets
    updateBullets();
    
    renderer.render(scene, camera);
}

// Create a fallback gunshot sound using oscillator if loading fails
function createFallbackGunshotSound() {
    console.log('Creating fallback gunshot sound');
    
    try {
        // Create a simple oscillator-based gunshot sound
        const context = audioListener.context;
        const sampleRate = context.sampleRate;
        const duration = 0.3; // 300ms sound
        const bufferSize = Math.floor(sampleRate * duration);
        const buffer = context.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate a simple gunshot waveform
        for (let i = 0; i < bufferSize; i++) {
            const t = i / sampleRate;
            let sample = 0;
            
            if (t < 0.01) {
                // Quick attack
                sample = t / 0.01;
            } else if (t < 0.05) {
                // Sharp decay
                sample = 1 - ((t - 0.01) / 0.04);
            } else {
                // Long tail
                sample = 0.5 * Math.exp(-(t - 0.05) * 10);
            }
            
            // Add some noise
            sample *= (0.5 + Math.random() * 0.5);
            
            // Apply bandpass-like filtering by reducing high and low components
            if (i > 0 && i < bufferSize - 1) {
                sample = 0.7 * sample + 0.15 * data[i-1] + 0.15 * (Math.random() - 0.5);
            }
            
            data[i] = Math.max(-1, Math.min(1, sample * 0.8));
        }
        
        // Create a new audio with the buffer
        if (gunshotSound) {
            gunshotSound.disconnect();
        }
        
        gunshotSound = new THREE.Audio(audioListener);
        gunshotSound.setBuffer(buffer);
        gunshotSound.setVolume(0.8);
        gunshotSoundLoaded = true;
        console.log('Fallback gunshot sound created successfully');
    } catch (error) {
        console.error('Error creating fallback sound:', error);
        gunshotSoundLoaded = false;
    }
} 