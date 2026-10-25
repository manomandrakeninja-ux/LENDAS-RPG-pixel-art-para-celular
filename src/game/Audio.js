export class AudioManager {
  constructor() {
    this.context = null;
    this.muted = false;
    this.masterGain = null;
  }

  unlock() {
    if (typeof window === 'undefined') return false;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    if (!this.context) {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.7;
      this.masterGain.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    return true;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain) this.masterGain.gain.value = muted ? 0 : 0.7;
  }

  playTone(frequency, duration = 0.12, type = 'square', volume = 0.05, delay = 0) {
    if (this.muted || !this.unlock()) return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.masterGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  playNightWarning(config) {
    this.playTone(config.frequency, config.duration, 'square', config.volume);
    this.playTone(config.secondFrequency, config.duration, 'square', config.volume, config.duration + 0.12);
  }

  playNightfall() {
    this.playTone(180, 0.28, 'triangle', 0.045);
    this.playTone(120, 0.38, 'triangle', 0.035, 0.18);
  }

  playDawn() {
    this.playTone(392, 0.2, 'triangle', 0.04);
    this.playTone(523, 0.24, 'triangle', 0.04, 0.14);
  }

  playHit() {
    this.playTone(150, 0.07, 'square', 0.035);
  }

  playCollect() {
    this.playTone(660, 0.08, 'square', 0.025);
    this.playTone(880, 0.09, 'square', 0.022, 0.06);
  }

  playDeath() {
    this.playTone(220, 0.2, 'sawtooth', 0.045);
    this.playTone(110, 0.3, 'sawtooth', 0.035, 0.16);
  }
}
