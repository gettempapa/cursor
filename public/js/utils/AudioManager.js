export class AudioManager {
    constructor() {
        this.audioContext = null;
        this.gunshotBuffer = null;
        this.isInitialized = false;
    }
    
    initialize() {
        if (this.isInitialized) return;
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.loadGunshotSound();
        this.isInitialized = true;
    }
    
    loadGunshotSound() {
        if (!this.audioContext) return;
        
        const duration = 1.5;
        const sampleRate = this.audioContext.sampleRate;
        this.gunshotBuffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = this.gunshotBuffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            
            // Initial supersonic crack (much sharper and MUCH louder)
            const crack = Math.exp(-t * 2000) * (Math.random() * 2 - 1) * 15.0;
            
            // Deep bass impact (lower frequency, MUCH more powerful)
            const bass = Math.exp(-t * 8) * Math.sin(2 * Math.PI * 20 * t) * 18.0;
            
            // Mid-frequency body (fuller sound)
            const mid = Math.exp(-t * 30) * Math.sin(2 * Math.PI * 120 * t) * 8.0;
            
            // High-frequency crack detail (sharper)
            const highCrack = Math.exp(-t * 3000) * Math.sin(2 * Math.PI * 5000 * t) * 5.0;
            
            // Combine components with enhanced mixing and MUCH higher volume
            data[i] = (
                crack * 3.0 +     // Triple the crack
                bass * 4.0 +      // Quadruple the bass
                mid * 2.0 +       // Double the mid-range
                highCrack * 1.5   // Boost the high-end detail
            ) * 25.0;            // Massive overall volume boost
        }
    }
    
    playGunshot() {
        if (!this.audioContext || !this.gunshotBuffer) return;
        
        // Ensure context is running
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        const source = this.audioContext.createBufferSource();
        source.buffer = this.gunshotBuffer;
        
        // Enhanced audio processing chain
        const audioChain = this.createAudioChain();
        source.connect(audioChain.input);
        audioChain.output.connect(this.audioContext.destination);
        
        source.start(0);
    }
    
    createAudioChain() {
        // Lowpass filter for enhanced bass
        const lowpass = this.audioContext.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 80; // Even lower frequency for more bass
        lowpass.Q.value = 25.0; // Sharper resonance
        
        // Highpass filter for crack
        const highpass = this.audioContext.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 8000; // Higher for sharper crack
        highpass.Q.value = 20.0;
        
        // More aggressive compression for punch
        const compressor = this.audioContext.createDynamicsCompressor();
        compressor.threshold.value = -50;
        compressor.knee.value = 0;
        compressor.ratio.value = 40;
        compressor.attack.value = 0;
        compressor.release.value = 0.1;
        
        // Enhanced echo effect for outdoor environment
        const convolver = this.audioContext.createConvolver();
        const reverbTime = 12.0; // Longer reverb time
        const rate = this.audioContext.sampleRate;
        const length = rate * reverbTime;
        const impulse = this.audioContext.createBuffer(2, length, rate);
        
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);
        
        // Create more powerful echo reflections
        for (let i = 0; i < length; i++) {
            const t = i / rate;
            const echoPeaks = [0.01, 0.03, 0.07, 0.15, 0.3, 0.5]; // More echo peaks
            let echoSum = 0;
            for (const delay of echoPeaks) {
                echoSum += Math.exp(-6 * Math.abs(t - delay)) * (1 - t / reverbTime);
            }
            const decay = Math.exp(-0.5 * i / length);
            left[i] = decay * (1 + echoSum) * 2.0;
            right[i] = decay * (1 + echoSum) * 2.0;
        }
        convolver.buffer = impulse;
        
        // Volume controls with MUCH more impact
        const mainGain = this.audioContext.createGain();
        mainGain.gain.value = 8.0; // Double the previous volume
        
        const reverbGain = this.audioContext.createGain();
        reverbGain.gain.value = 4.0; // Double the echo volume
        
        // Connect the chain
        compressor.connect(lowpass);
        lowpass.connect(highpass);
        
        // Split into direct and reverb paths with enhanced balance
        const directGain = this.audioContext.createGain();
        directGain.gain.value = 3.0; // Triple the direct sound
        highpass.connect(directGain);
        directGain.connect(mainGain);
        
        highpass.connect(convolver);
        convolver.connect(reverbGain);
        reverbGain.connect(mainGain);
        
        return {
            input: compressor,
            output: mainGain
        };
    }
    
    createReverbImpulse(impulse, reverbTime) {
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);
        const rate = this.audioContext.sampleRate;
        
        // More echo peaks for complex outdoor reflections
        const echoPeaks = [
            0.01, 0.03, 0.06, 0.1, 0.15, 0.2, 0.3, 0.4, 0.6, 0.8
        ];
        
        for (let i = 0; i < impulse.length; i++) {
            const t = i / rate;
            let echoSum = 0;
            
            // Enhanced echo pattern
            for (const delay of echoPeaks) {
                echoSum += Math.exp(-8 * Math.abs(t - delay)) * (1 - t / reverbTime);
            }
            
            // Slower decay for outdoor environment
            const decay = Math.exp(-0.8 * i / impulse.length);
            const value = decay * (1 + echoSum) * 1.5;
            
            // Add slight stereo variation for more realistic outdoor echo
            const stereoOffset = Math.sin(t * 2.5) * 0.1;
            left[i] = value * (1 + stereoOffset);
            right[i] = value * (1 - stereoOffset);
        }
    }
    
    resume() {
        return this.audioContext.resume();
    }
    
    suspend() {
        return this.audioContext.suspend();
    }
} 