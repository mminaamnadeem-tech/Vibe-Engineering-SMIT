// ============================================================================
// Subway Surfers Lite 3D - Web Audio API Synthesizer
// Zero external audio files required. 100% procedurally synthesized in real-time.
// ============================================================================

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this.isMuted = false;
    this.sfxEnabled = true;
    this.bgmEnabled = true;
    this.bgmInterval = null;
    this.bgmStep = 0;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.9;
      this.sfxGain.connect(this.masterGain);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.35;
      this.bgmGain.connect(this.masterGain);

      this.initialized = true;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch (e) {
      console.warn("Web Audio API not supported or blocked:", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- Sound Effects ---

  playCoin() {
    if (!this.initialized || !this.sfxEnabled || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    // 2-tone melodic coin chime (B5 -> E6)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.06); // E6
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playJump() {
    if (!this.initialized || !this.sfxEnabled || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    // Whoosh pitch rise
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.18);
    
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.23);
  }

  playSlide() {
    if (!this.initialized || !this.sfxEnabled || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    // White noise sweep / friction sound
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.2);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    
    whiteNoise.start(now);
    whiteNoise.stop(now + 0.2);
  }

  playLaneSwitch() {
    if (!this.initialized || !this.sfxEnabled || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.08);
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playPowerup() {
    if (!this.initialized || !this.sfxEnabled || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    // 4-note ascending fanfare
    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + index * 0.06;
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.35, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
      
      osc.connect(gain);
      gain.connect(this.sfxGain);
      
      osc.start(startTime);
      osc.stop(startTime + 0.22);
    });
  }

  playHoverboard() {
    if (!this.initialized || !this.sfxEnabled || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    // Futuristic power-up charge
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.25);
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(3000, now + 0.25);
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.32);
  }

  playCrash() {
    if (!this.initialized || !this.sfxEnabled || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    // Low punch osc
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
    
    oscGain.gain.setValueAtTime(0.6, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
    
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.45);

    // Noise impact
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.4);
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    
    noise.start(now);
    noise.stop(now + 0.42);
  }

  // --- Dynamic Arcade BGM Engine ---

  startBGM() {
    if (this.bgmInterval) return;
    this.init();
    this.resume();

    // Bassline and Arp pattern in C minor / Dorian
    const bassNotes = [130.81, 130.81, 155.56, 174.61, 196.00, 196.00, 174.61, 155.56]; // C3, Eb3, F3, G3
    const leadNotes = [523.25, 622.25, 783.99, 932.33, 783.99, 622.25, 587.33, 523.25]; // C5, Eb5, G5, Bb5...
    
    const stepDuration = 0.14; // ~107 BPM 16th groove

    const playStep = () => {
      if (!this.initialized || !this.bgmEnabled || this.isMuted) {
        this.bgmStep = (this.bgmStep + 1) % 16;
        return;
      }
      
      const now = this.ctx.currentTime;
      const step = this.bgmStep;
      
      // Bass synth on 8th notes
      if (step % 2 === 0) {
        const bassNote = bassNotes[(step / 2) % bassNotes.length];
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(bassNote, now);
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(350, now);
        filter.frequency.exponentialRampToValueAtTime(150, now + 0.2);
        
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);
        
        osc.start(now);
        osc.stop(now + 0.24);
      }

      // Melody arpeggio accents
      if (step % 4 === 0 || step === 6 || step === 14) {
        const leadNote = leadNotes[step % leadNotes.length];
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(leadNote, now);
        
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        
        osc.connect(gain);
        gain.connect(this.bgmGain);
        
        osc.start(now);
        osc.stop(now + 0.2);
      }

      // Hi-hat crisp tick
      if (step % 2 === 1) {
        const bufferSize = this.ctx.sampleRate * 0.04;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1);
        }
        const hat = this.ctx.createBufferSource();
        hat.buffer = buffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(7000, now);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        
        hat.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);
        
        hat.start(now);
        hat.stop(now + 0.05);
      }

      this.bgmStep = (this.bgmStep + 1) % 16;
    };

    this.bgmInterval = setInterval(playStep, stepDuration * 1000);
  }

  stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : 0.8;
    }
    return this.isMuted;
  }
}

window.soundEngine = new SoundEngine();
