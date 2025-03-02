export class AudioManager {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioContext.resume().then(() => {
            console.log('AudioContext resumed successfully');
        });
        
        this.gunshotBuffer = null;
        this.loadGunshotSound();
    }
    
    loadGunshotSound() {
        const duration = 1.0;
        const sampleRate = this.audioContext.sampleRate;
        this.gunshotBuffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = this.gunshotBuffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            
            // Initial supersonic crack
            const crack = Math.exp(-t * 1200) * (Math.random() * 2 - 1) * 3.0;
            
            // Deep bass impact
            const bass = Math.exp(-t * 15) * Math.sin(2 * Math.PI * 30 * t) * 4.0;
            
            // Mid-frequency body
            const mid = Math.exp(-t * 60) * Math.sin(2 * Math.PI * 200 * t) * 2.0;
            
            // High-frequency crack detail
            const highCrack = Math.exp(-t * 1500) * Math.sin(2 * Math.PI * 3000 * t) * 1.2;
            
            // Combine components with enhanced mixing
            data[i] = (
                crack * 1.5 +
                bass * 1.8 +
                mid * 1.2 +
                highCrack * 0.8
            ) * 8.0;
        }
    }
    
    playGunshot() {
        if (!this.gunshotBuffer) return;
        
        const source = this.audioContext.createBufferSource();
        source.buffer = this.gunshotBuffer;
        
        // Enhanced audio processing chain
        const audioChain = this.createAudioChain();
        
        // Connect and start
        source.connect(audioChain.input);
        audioChain.output.connect(this.audioContext.destination);
        source.start();
    }
    
    createAudioChain() {
        // Lowpass filter for enhanced bass
        const lowpass = this.audioContext.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 150;
        lowpass.Q.value = 15.0;
        
        // Highpass filter for crack
        const highpass = this.audioContext.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 5000;
        highpass.Q.value = 12.0;
        
        // More aggressive compression for punch
        const compressor = this.audioContext.createDynamicsCompressor();
        compressor.threshold.value = -30;
        compressor.knee.value = 0;
        compressor.ratio.value = 25;
        compressor.attack.value = 0;
        compressor.release.value = 0.1;
        
        // Enhanced echo effect for outdoor environment
        const convolver = this.audioContext.createConvolver();
        const reverbTime = 8.0;
        const rate = this.audioContext.sampleRate;
        const length = rate * reverbTime;
        const impulse = this.audioContext.createBuffer(2, length, rate);
        
        this.createReverbImpulse(impulse, reverbTime);
        convolver.buffer = impulse;
        
        // Volume controls with more impact
        const mainGain = this.audioContext.createGain();
        mainGain.gain.value = 3.0;
        
        const reverbGain = this.audioContext.createGain();
        reverbGain.gain.value = 1.5;
        
        // Connect the chain
        compressor.connect(lowpass);
        lowpass.connect(highpass);
        
        // Split into direct and reverb paths with enhanced balance
        const directGain = this.audioContext.createGain();
        directGain.gain.value = 1.5;
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