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
        const duration = 0.5;
        const sampleRate = this.audioContext.sampleRate;
        this.gunshotBuffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = this.gunshotBuffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            
            // Initial supersonic crack
            const crack = Math.exp(-t * 800) * (Math.random() * 2 - 1) * 2.0;
            
            // Deep bass impact
            const bass = Math.exp(-t * 20) * Math.sin(2 * Math.PI * 40 * t) * 2.5;
            
            // Mid-frequency body
            const mid = Math.exp(-t * 80) * Math.sin(2 * Math.PI * 300 * t) * 1.5;
            
            // High-frequency crack detail
            const highCrack = Math.exp(-t * 1000) * Math.sin(2 * Math.PI * 2000 * t) * 0.8;
            
            // Combine components
            data[i] = (
                crack * 1.2 +
                bass * 1.0 +
                mid * 0.8 +
                highCrack * 0.6
            ) * 6.0;
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
        // Lowpass filter for bass
        const lowpass = this.audioContext.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 200;
        lowpass.Q.value = 12.0;
        
        // Highpass filter for crack
        const highpass = this.audioContext.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 4000;
        highpass.Q.value = 9.0;
        
        // Compressor for punch
        const compressor = this.audioContext.createDynamicsCompressor();
        compressor.threshold.value = -24;
        compressor.knee.value = 0;
        compressor.ratio.value = 20;
        compressor.attack.value = 0;
        compressor.release.value = 0.1;
        
        // Echo effect
        const convolver = this.audioContext.createConvolver();
        const reverbTime = 5.0;
        const rate = this.audioContext.sampleRate;
        const length = rate * reverbTime;
        const impulse = this.audioContext.createBuffer(2, length, rate);
        
        this.createReverbImpulse(impulse, reverbTime);
        convolver.buffer = impulse;
        
        // Volume controls
        const mainGain = this.audioContext.createGain();
        mainGain.gain.value = 2.0;
        
        const reverbGain = this.audioContext.createGain();
        reverbGain.gain.value = 1.0;
        
        // Connect the chain
        compressor.connect(lowpass);
        lowpass.connect(highpass);
        
        // Split into direct and reverb paths
        const directGain = this.audioContext.createGain();
        directGain.gain.value = 1.2;
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
        
        const echoPeaks = [0.02, 0.06, 0.1, 0.15, 0.25, 0.4];
        
        for (let i = 0; i < impulse.length; i++) {
            const t = i / rate;
            let echoSum = 0;
            
            for (const delay of echoPeaks) {
                echoSum += Math.exp(-12 * Math.abs(t - delay)) * (1 - t / reverbTime);
            }
            
            const decay = Math.exp(-1.0 * i / impulse.length);
            const value = decay * (1 + echoSum) * 1.2;
            
            left[i] = value;
            right[i] = value;
        }
    }
    
    resume() {
        return this.audioContext.resume();
    }
    
    suspend() {
        return this.audioContext.suspend();
    }
} 