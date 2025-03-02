# SOCOM-style Third Person Shooter

A browser-based third-person shooter game inspired by SOCOM, built with Three.js.

## Overview

This project is a 3D third-person shooter game that runs directly in the browser. It features:

- Third-person camera perspective
- WASD movement controls
- Mouse aiming and shooting
- Enemy AI that hunts the player
- Dinosaur AI that roams and attacks
- Procedurally generated environment with trees, hills, and a cabin
- Simple physics for jumping and collision detection
- Sound effects (using Web Audio API)

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- A keyboard and mouse
- An internet connection (for loading Three.js from CDN)

### Accessing the Game

The game is deployed on Digital Ocean and can be accessed directly through your web browser.

### Controls

- **W, A, S, D**: Move forward, left, backward, right
- **Mouse**: Look around
- **Left Mouse Button**: Shoot
- **Space**: Jump

## Project Structure

The project is organized into a modular structure:

```
public/
├── js/
│   ├── core/
│   │   └── Game.js         # Main game class
│   ├── entities/
│   │   ├── Entity.js       # Base entity class
│   │   ├── Player.js       # Player class
│   │   ├── Enemy.js        # Enemy class
│   │   └── Dinosaur.js     # Dinosaur class
│   ├── environment/
│   │   └── Environment.js  # Environment class
│   ├── audio/
│   │   └── AudioManager.js # Audio manager class
│   ├── utils/
│   │   ├── constants.js    # Game constants
│   │   └── helpers.js      # Helper functions
│   └── main.js             # Entry point
├── game.html               # Game HTML file
└── index.html              # Main HTML file
```

## Technical Details

### Rendering

The game uses Three.js for 3D rendering, with the following features:

- PerspectiveCamera for the player view
- WebGLRenderer with antialiasing
- Fog for distance culling
- Shadow mapping for realistic shadows
- Custom geometries for game objects

### Game Logic

The game logic is organized into classes:

- **Game**: Main game class that manages the game loop and components
- **Player**: Handles player movement, shooting, and camera
- **Enemy**: AI-controlled enemy that hunts the player
- **Dinosaur**: AI-controlled dinosaur that roams and attacks
- **Environment**: Manages the game world, including terrain and objects
- **AudioManager**: Handles sound effects and music

### Performance Considerations

- Object pooling for bullets and effects
- Distance-based culling for entities
- Simplified collision detection
- Low-poly models for better performance

## Deployment

This game is deployed on Digital Ocean. The deployment process involves:

1. Setting up a Digital Ocean Droplet with Nginx
2. Configuring the web server to serve static files
3. Uploading the game files to the server

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Three.js for the 3D rendering engine
- SOCOM for the inspiration 