import { Game } from './core/Game.js';

/**
 * Initialize the game when the DOM is loaded
 */
console.log('Main.js module loaded, waiting for DOMContentLoaded event...');

window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');
    
    try {
        console.log('Creating Game instance...');
        // Create game instance
        window.game = new Game();
        
        // Log success
        console.log('Game initialized successfully');
    } catch (error) {
        // Log error
        console.error('Failed to start game:', error);
        
        // Show error in debug element
        const debug = document.getElementById('debug');
        if (debug) {
            debug.style.display = 'block';
            debug.innerHTML = `Failed to start game: ${error.message}<br>Stack: ${error.stack}`;
        }
        
        // Show error in loading screen
        const loadingError = document.getElementById('loadingError');
        if (loadingError) {
            loadingError.style.display = 'block';
            loadingError.textContent = `Failed to start game: ${error.message}`;
        }
    }
}); 