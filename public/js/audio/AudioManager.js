import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';
import { Constants } from '../utils/constants.js';

/**
 * AudioManager class for handling game audio
 */
export class AudioManager {
    /**
     * Create a new audio manager
     * @param {THREE.Scene} scene - The scene to add audio to
     * @param {THREE.Camera} camera - The camera for listener
     */
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.sounds = {};
        this.listener = null;
        this.initialized = false;
        
        // Initialize audio
        this.init();
    }
    
    /**
     * Initialize the audio manager
     */
    init() {
        // Create audio listener
        this.listener = new THREE.AudioListener();
        
        // Add listener to camera
        if (this.camera) {
            this.camera.add(this.listener);
        }
        
        // Prepare sounds
        this.prepareAudioForLaterInitialization();
    }
    
    /**
     * Prepare audio for later initialization
     * This is needed because audio context must be initialized after user interaction
     */
    prepareAudioForLaterInitialization() {
        // Add event listener for first interaction
        const initAudioOnFirstInteraction = () => {
            if (!this.initialized) {
                this.setupAudio();
                this.initialized = true;
                
                // Remove event listeners
                document.removeEventListener('click', initAudioOnFirstInteraction);
                document.removeEventListener('keydown', initAudioOnFirstInteraction);
            }
        };
        
        // Add event listeners
        document.addEventListener('click', initAudioOnFirstInteraction);
        document.addEventListener('keydown', initAudioOnFirstInteraction);
    }
    
    /**
     * Set up audio
     */
    setupAudio() {
        // Create footstep sounds
        this.createFootstepSound('dirt');
        this.createFootstepSound('grass');
        this.createFootstepSound('wood');
        
        // Create gunshot sound
        this.createGunshotSound();
        
        // Create impact sound
        this.createImpactSound();
        
        // Create dinosaur roar sound
        this.createDinosaurRoarSound();
    }
    
    /**
     * Create a footstep sound
     * @param {string} variation - Variation of footstep sound
     */
    createFootstepSound(variation) {
        // Create audio buffer
        const sound = new THREE.Audio(this.listener);
        
        // Create audio loader
        const audioLoader = new THREE.AudioLoader();
        
        // Load sound
        const soundFile = this.getFootstepSoundFile(variation);
        
        if (soundFile) {
            audioLoader.load(
                soundFile,
                (buffer) => {
                    sound.setBuffer(buffer);
                    sound.setVolume(0.5);
                    this.sounds[`footstep_${variation}`] = sound;
                },
                (xhr) => {
                    console.log(`${variation} footstep sound: ${(xhr.loaded / xhr.total * 100)}% loaded`);
                },
                (error) => {
                    console.error('Error loading footstep sound:', error);
                }
            );
        } else {
            // Create a simple oscillator as fallback
            this.createFallbackSound(`footstep_${variation}`);
        }
    }
    
    /**
     * Get footstep sound file based on variation
     * @param {string} variation - Variation of footstep sound
     * @returns {string|null} - Sound file URL or null if not available
     */
    getFootstepSoundFile(variation) {
        // In a real game, these would be actual sound file URLs
        // For this example, we'll return null to use the fallback sounds
        return null;
    }
    
    /**
     * Create a gunshot sound
     */
    createGunshotSound() {
        // Create audio buffer
        const sound = new THREE.Audio(this.listener);
        
        // Create audio loader
        const audioLoader = new THREE.AudioLoader();
        
        // Load sound
        const soundFile = this.getGunshotSoundFile();
        
        if (soundFile) {
            audioLoader.load(
                soundFile,
                (buffer) => {
                    sound.setBuffer(buffer);
                    sound.setVolume(0.7);
                    this.sounds.gunshot = sound;
                },
                (xhr) => {
                    console.log(`Gunshot sound: ${(xhr.loaded / xhr.total * 100)}% loaded`);
                },
                (error) => {
                    console.error('Error loading gunshot sound:', error);
                }
            );
        } else {
            // Create a simple oscillator as fallback
            this.createFallbackSound('gunshot', 'square', 100, 0.1);
        }
    }
    
    /**
     * Get gunshot sound file
     * @returns {string|null} - Sound file URL or null if not available
     */
    getGunshotSoundFile() {
        // In a real game, this would be an actual sound file URL
        return null;
    }
    
    /**
     * Create an impact sound
     */
    createImpactSound() {
        // Create audio buffer
        const sound = new THREE.Audio(this.listener);
        
        // Create audio loader
        const audioLoader = new THREE.AudioLoader();
        
        // Load sound
        const soundFile = this.getImpactSoundFile();
        
        if (soundFile) {
            audioLoader.load(
                soundFile,
                (buffer) => {
                    sound.setBuffer(buffer);
                    sound.setVolume(0.5);
                    this.sounds.impact = sound;
                },
                (xhr) => {
                    console.log(`Impact sound: ${(xhr.loaded / xhr.total * 100)}% loaded`);
                },
                (error) => {
                    console.error('Error loading impact sound:', error);
                }
            );
        } else {
            // Create a simple oscillator as fallback
            this.createFallbackSound('impact', 'sine', 300, 0.2);
        }
    }
    
    /**
     * Get impact sound file
     * @returns {string|null} - Sound file URL or null if not available
     */
    getImpactSoundFile() {
        // In a real game, this would be an actual sound file URL
        return null;
    }
    
    /**
     * Create a dinosaur roar sound
     */
    createDinosaurRoarSound() {
        // Create audio buffer
        const sound = new THREE.Audio(this.listener);
        
        // Create audio loader
        const audioLoader = new THREE.AudioLoader();
        
        // Load sound
        const soundFile = this.getDinosaurRoarSoundFile();
        
        if (soundFile) {
            audioLoader.load(
                soundFile,
                (buffer) => {
                    sound.setBuffer(buffer);
                    sound.setVolume(0.8);
                    this.sounds.dinosaurRoar = sound;
                },
                (xhr) => {
                    console.log(`Dinosaur roar sound: ${(xhr.loaded / xhr.total * 100)}% loaded`);
                },
                (error) => {
                    console.error('Error loading dinosaur roar sound:', error);
                }
            );
        } else {
            // Create a simple oscillator as fallback
            this.createFallbackSound('dinosaurRoar', 'sawtooth', 150, 1.0);
        }
    }
    
    /**
     * Get dinosaur roar sound file
     * @returns {string|null} - Sound file URL or null if not available
     */
    getDinosaurRoarSoundFile() {
        // In a real game, this would be an actual sound file URL
        return null;
    }
    
    /**
     * Create a fallback sound using an oscillator
     * @param {string} name - Name of the sound
     * @param {string} type - Type of oscillator (sine, square, sawtooth, triangle)
     * @param {number} frequency - Frequency of the oscillator
     * @param {number} duration - Duration of the sound in seconds
     */
    createFallbackSound(name, type = 'sine', frequency = 200, duration = 0.3) {
        // Create audio context
        const context = this.listener.context;
        
        // Create buffer
        const sampleRate = context.sampleRate;
        const buffer = context.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Fill buffer with oscillator data
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            
            // Different waveforms
            switch (type) {
                case 'sine':
                    data[i] = Math.sin(2 * Math.PI * frequency * t);
                    break;
                case 'square':
                    data[i] = Math.sin(2 * Math.PI * frequency * t) >= 0 ? 0.7 : -0.7;
                    break;
                case 'sawtooth':
                    data[i] = 2 * (t * frequency - Math.floor(0.5 + t * frequency));
                    break;
                case 'triangle':
                    data[i] = 2 * Math.abs(2 * (t * frequency - Math.floor(t * frequency)) - 1) - 1;
                    break;
                default:
                    data[i] = Math.sin(2 * Math.PI * frequency * t);
            }
            
            // Apply envelope
            const fadeIn = 0.01;
            const fadeOut = 0.05;
            
            if (t < fadeIn) {
                // Fade in
                data[i] *= t / fadeIn;
            } else if (t > duration - fadeOut) {
                // Fade out
                data[i] *= (duration - t) / fadeOut;
            }
        }
        
        // Create sound
        const sound = new THREE.Audio(this.listener);
        sound.setBuffer(buffer);
        
        // Store sound
        this.sounds[name] = sound;
    }
    
    /**
     * Play a footstep sound
     * @param {string} variation - Variation of footstep sound
     */
    playFootstepSound(variation = 'dirt') {
        const sound = this.sounds[`footstep_${variation}`];
        
        if (sound && !sound.isPlaying) {
            sound.play();
        }
    }
    
    /**
     * Play a gunshot sound
     */
    playGunshotSound() {
        const sound = this.sounds.gunshot;
        
        if (sound) {
            // Clone the sound to allow overlapping
            const gunshot = sound.clone();
            gunshot.play();
        }
    }
    
    /**
     * Play an impact sound
     */
    playImpactSound() {
        const sound = this.sounds.impact;
        
        if (sound) {
            // Clone the sound to allow overlapping
            const impact = sound.clone();
            impact.play();
        }
    }
    
    /**
     * Play a dinosaur roar sound
     */
    playDinosaurRoarSound() {
        const sound = this.sounds.dinosaurRoar;
        
        if (sound && !sound.isPlaying) {
            sound.play();
        }
    }
    
    /**
     * Create a positional sound
     * @param {string} name - Name of the sound
     * @param {THREE.Object3D} object - Object to attach the sound to
     * @param {string} type - Type of oscillator for fallback
     * @param {number} frequency - Frequency for fallback
     * @param {number} duration - Duration for fallback
     * @returns {THREE.PositionalAudio} - Positional audio object
     */
    createPositionalSound(name, object, type = 'sine', frequency = 200, duration = 0.3) {
        // Create positional audio
        const sound = new THREE.PositionalAudio(this.listener);
        
        // Set parameters
        sound.setRefDistance(Constants.AUDIO.REFERENCE_DISTANCE);
        sound.setMaxDistance(Constants.AUDIO.MAX_DISTANCE);
        sound.setRolloffFactor(1);
        
        // Create fallback sound
        const context = this.listener.context;
        const sampleRate = context.sampleRate;
        const buffer = context.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Fill buffer with oscillator data
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            
            // Different waveforms
            switch (type) {
                case 'sine':
                    data[i] = Math.sin(2 * Math.PI * frequency * t);
                    break;
                case 'square':
                    data[i] = Math.sin(2 * Math.PI * frequency * t) >= 0 ? 0.7 : -0.7;
                    break;
                case 'sawtooth':
                    data[i] = 2 * (t * frequency - Math.floor(0.5 + t * frequency));
                    break;
                case 'triangle':
                    data[i] = 2 * Math.abs(2 * (t * frequency - Math.floor(t * frequency)) - 1) - 1;
                    break;
                default:
                    data[i] = Math.sin(2 * Math.PI * frequency * t);
            }
            
            // Apply envelope
            const fadeIn = 0.01;
            const fadeOut = 0.05;
            
            if (t < fadeIn) {
                // Fade in
                data[i] *= t / fadeIn;
            } else if (t > duration - fadeOut) {
                // Fade out
                data[i] *= (duration - t) / fadeOut;
            }
        }
        
        // Set buffer
        sound.setBuffer(buffer);
        
        // Add to object
        object.add(sound);
        
        // Store sound
        this.sounds[name] = sound;
        
        return sound;
    }
}

export default AudioManager; 