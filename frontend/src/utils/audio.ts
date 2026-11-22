/**
 * Cinematic Web Audio synthesizer for EXO-AI:
 * Generates an ethereal deep cosmic drone (432Hz harmonic sub-bass)
 * and subtle data transmission chime/clicks.
 */
class CosmicAudioController {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true;
  private droneGain: GainNode | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    } catch {
      // Audio not supported
    }
  }

  toggleSound(): boolean {
    this.init();
    if (!this.ctx) return false;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isMuted = !this.isMuted;

    if (!this.isMuted) {
      this.startDrone();
    } else {
      this.stopDrone();
    }

    return !this.isMuted;
  }

  getMuted() {
    return this.isMuted;
  }

  private startDrone() {
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.0001, now);
    this.droneGain.gain.exponentialRampToValueAtTime(0.08, now + 3);

    // Deep sub-harmonic 54Hz fundamental
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'sine';
    this.osc1.frequency.setValueAtTime(54, now);

    // Cosmic shimmer harmonic 108Hz with subtle beat frequency
    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'sine';
    this.osc2.frequency.setValueAtTime(108.3, now);

    // Filter to keep it deep and atmospheric
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, now);

    this.osc1.connect(filter);
    this.osc2.connect(filter);
    filter.connect(this.droneGain);
    this.droneGain.connect(this.ctx.destination);

    this.osc1.start(now);
    this.osc2.start(now);
  }

  private stopDrone() {
    if (!this.ctx || !this.droneGain) return;
    const now = this.ctx.currentTime;
    this.droneGain.gain.linearRampToValueAtTime(0.0001, now + 0.8);
    setTimeout(() => {
      try {
        this.osc1?.stop();
        this.osc2?.stop();
        this.osc1?.disconnect();
        this.osc2?.disconnect();
      } catch {
        // Ignored
      }
    }, 900);
  }

  playDataBlip() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800 + Math.random() * 400, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);

      gain.gain.setValueAtTime(0.015, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Ignored
    }
  }

  playTransitionWhoosh() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(1400, now + 0.5);
      filter.frequency.exponentialRampToValueAtTime(100, now + 1.2);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(45, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 1.2);
    } catch {
      // Ignored
    }
  }
}

export const cosmicAudio = new CosmicAudioController();
