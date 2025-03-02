const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

// In production, serve the built files from dist
if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
} else {
    // In development, serve from public
    app.use(express.static('public'));
}

// Serve node_modules (for Three.js)
app.use('/node_modules', express.static('node_modules'));

app.get('/', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 