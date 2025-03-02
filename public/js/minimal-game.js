// Minimal version to test Three.js loading
import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';

// Debug output element
const debug = document.getElementById('debug');
debug.style.display = 'block';
debug.innerHTML = 'Starting minimal test...';

try {
    // Create the scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue
    
    // Create the camera
    const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.z = 5;
    
    // Create the renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Get container and append the renderer
    const container = document.getElementById('gameContainer');
    container.appendChild(renderer.domElement);
    
    debug.innerHTML += '<br>Core setup complete';
    
    // Create a red cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    
    debug.innerHTML += '<br>Added red cube';
    
    // Animation function
    function animate() {
        requestAnimationFrame(animate);
        
        // Rotate the cube
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        
        // Render the scene
        renderer.render(scene, camera);
    }
    
    // Hide loading screen
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) loadingScreen.style.display = 'none';
    
    // Start animation
    animate();
    
    debug.innerHTML += '<br>Animation started';
} catch (error) {
    debug.innerHTML += `<br>ERROR: ${error.message}<br>${error.stack}`;
    console.error('Error in minimal game:', error);
} 