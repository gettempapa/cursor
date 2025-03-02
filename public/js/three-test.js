// Ultra-minimal test for Three.js loading
console.log('Script starting');

// Try to import Three.js
try {
    // Using a dynamic import to test loading
    import('https://unpkg.com/three@0.157.0/build/three.module.js')
        .then(THREE => {
            console.log('THREE.js loaded successfully');
            document.getElementById('result').textContent = 'SUCCESS: Three.js loaded correctly';
            
            // Create a small test to verify it works
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer();
            renderer.setSize(100, 100); // Small size for testing
            document.body.appendChild(renderer.domElement);
            
            // Make a red cube
            const geometry = new THREE.BoxGeometry();
            const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const cube = new THREE.Mesh(geometry, material);
            scene.add(cube);
            camera.position.z = 5;
            
            // Render it once
            renderer.render(scene, camera);
            
            document.getElementById('result').textContent += '\nRenderer created and cube rendered!';
        })
        .catch(error => {
            console.error('Error importing THREE:', error);
            document.getElementById('result').textContent = 'ERROR: Failed to load Three.js\n' + error.message;
        });
} catch (error) {
    console.error('Error in script:', error);
    document.getElementById('result').textContent = 'ERROR: ' + error.message;
} 