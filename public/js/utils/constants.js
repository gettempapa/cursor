import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';

// Constants module for better organization
export const Constants = {
    // Player settings
    PLAYER: {
        MOVE_SPEED: 0.12,
        TURN_SPEED: 0.02,
        JUMP_HEIGHT: 2.0,
        JUMP_SPEED: 0.15,
        GRAVITY: 0.008,
        SHOT_COOLDOWN: 100, // milliseconds between shots
        CAMERA_OFFSET: new THREE.Vector3(1.5, 1.8, 5)
    },
    
    // Game settings
    GAME: {
        FOG_DENSITY: 0.005,
        GROUND_SIZE: 100,
        MAX_DELTA_TIME: 0.1
    },
    
    // Colors
    COLORS: {
        SKY: 0x87CEEB,
        GROUND: 0x2d5a27,
        TREE_TRUNK: 0x8B4513,
        TREE_FOLIAGE: 0x2E8B57,
        SOLDIER_BODY: 0x2F4F4F,
        SOLDIER_FACE: 0xD2B48C,
        CAMO: [0x4b5320, 0x3a421a, 0x5d6d21, 0x2c3317],
        DINO_BODY: 0x2d8659,
        DINO_BELLY: 0x3da677,
        DINO_SPIKES: 0x1a5038
    },
    
    // Dinosaur settings
    DINOSAUR: {
        MOVE_SPEED: 0.08,
        ROAR_INTERVAL: 15000, // milliseconds between roars
        WANDER_RADIUS: 40,
        SIZE: 1.5 // Scale factor
    },
    
    // Enemy settings
    ENEMY: {
        MOVE_SPEED: 0.08,
        WANDER_RADIUS: 40,
        SHOOT_INTERVAL: 2000, // milliseconds between shots
        SIZE: 1.0 // Scale factor
    },
    
    // Audio settings
    AUDIO: {
        FOOTSTEP_INTERVAL: 350, // milliseconds between footstep sounds
        MAX_DISTANCE: 50,
        REFERENCE_DISTANCE: 10
    }
};

export default Constants; 