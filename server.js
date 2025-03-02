import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Simple request logger middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Serve static files from public directory
app.use(express.static('public'));

// Explicitly serve all Three.js modules from the CDN rather than local modules
app.get('/node_modules/three/*', (req, res) => {
    // Redirect to unpkg CDN for Three.js
    const threePath = req.path.replace('/node_modules/three/', '');
    res.redirect(`https://unpkg.com/three@0.161.0/${threePath}`);
});

// If no redirect, serve node_modules as fallback
app.use('/node_modules', express.static('node_modules'));

// Add CORS headers to help with remote debugging
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Handle all routes by serving index.html
app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Error handler middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).send('Server error occurred.');
});

// Listen on all interfaces (important for cloud hosting)
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
}); 