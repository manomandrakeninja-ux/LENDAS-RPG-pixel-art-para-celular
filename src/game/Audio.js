function isHeadless() {
  return typeof navigator !== 'undefined' && /HeadlessChrome/.test(navigator.userAgent);
}

// Escalas (semitons a partir da tônica) e andamento de cada região.
const MAJOR = [0, 2, 4, 7, 9, 12];
const MINOR = [0, 3, 5, 7, 10, 12];
const MUSIC = {
  vale: { root: 261.6, bpm: 84, wave: 'triangle', scale: MAJOR, pattern: [0, 2, 4, 2, 3, 1, 2, null] },
  floresta: { root: 220, bpm: 72, wave: 'triangle', scale: MINOR, pattern: [0, null, 2, 1, 3, null, 1, 0] },
  brejo: { root: 196, bpm: 60, wave: 'sine', scale: MINOR, pattern: [0, null, null, 2, 1, null, 3, null] },
  ilha: { root: 293.7, bpm: 96, wave: 'triangle', scale: MAJOR, pattern: [0, 3, 2, 4, 3, 5, 4, 2] },
  picos: { root: 246.9, bpm: 66, wave: 'sine', scale: MINOR, pattern: [4, null, 2, null, 3, 1, null, 0] },
  deserto: { root: 233, bpm: 78, wave: 'square', scale: [0, 1, 4, 5, 7, 8], pattern: [0, 1, 2, 1, 3, 2, 1, null] },
  brasa: { root: 174.6, bpm: 90, wave: 'sawtooth', scale: MINOR, pattern: [0, 0, 2, 0, 3, 2, 1, 0] },
  abismo: { root: 130.8, bpm: 54, wave: 'sawtooth', scale: [0, 1, 3, 6, 7, 10], pattern: [0, null, 1, null, 3, 2, null, 0] },
  caverna: { root: 146.8, bpm: 58, wave: 'sine', scale: MINOR, pattern: [0, null, null, 3, null, 2, null, null] }
};

/** Tema da região (puro, testável): { root, bpm, wave, notes } com notas em semitons ou null (pausa). */
export function musicTheme(region) {
  const key = Object.keys(MUSIC).find((name) => String(region ?? '').toLowerCase().includes(name)) ?? 'vale';
  const base = MUSIC[key];
  return { root: base.root, bpm: base.bpm, wave: base.wave, notes: base.pattern.map((i) => (i === null ? null : base.scale[i])) };
}

export class AudioManager {
  constructor() {
    this.context = null;
    this.muted = false;
    this.masterGain = null;
    this.volume = 0.7;
    this.musicOn = true;
    this.music = null;
  }

  unlock() {
    if (typeof window === 'undefined' || isHeadless()) return false;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    if (!this.context) {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    return true;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain) this.masterGain.gain.value = muted ? 0 : this.volume;
  }

  /** Volume geral de 0 a 1 (Configurações). */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, Number(volume) || 0));
    if (this.masterGain && !this.muted) this.masterGain.gain.value = this.volume;
  }

  playTone(frequency, duration = 0.12, type = 'square', volume = 0.05, delay = 0) {
    if (this.muted || this.volume <= 0 || !this.unlock()) return;
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

  /** Golpe no ar: chiado curto e grave. */
  playSwing() {
    this.playTone(330, 0.05, 'sawtooth', 0.02);
    this.playTone(200, 0.07, 'sawtooth', 0.018, 0.03);
  }

  /** Moeda: dois tons agudos. */
  playCoin() {
    this.playTone(988, 0.06, 'square', 0.022);
    this.playTone(1318, 0.12, 'square', 0.022, 0.06);
  }

  playLevelUp() {
    [523, 659, 784, 1047].forEach((f, i) => this.playTone(f, 0.16, 'triangle', 0.045, i * 0.1));
  }

  /** Aprimorar: martelada seguida de brilho (sucesso) ou baque (falha). */
  playEnhance(success = true) {
    this.playPick();
    if (success) [784, 1175].forEach((f, i) => this.playTone(f, 0.14, 'triangle', 0.04, 0.12 + i * 0.09));
    else this.playTone(140, 0.25, 'sawtooth', 0.04, 0.12);
  }

  setMusicOn(on) {
    this.musicOn = !!on;
    if (!this.musicOn) this.stopMusic();
  }

  stopMusic() {
    if (this.music?.timer) clearInterval(this.music.timer);
    this.music = null;
  }

  /** Música procedural simples por região: toca uma melodia curta em laço. */
  playMusic(region) {
    if (!this.musicOn || this.muted || this.volume <= 0) return this.stopMusic();
    if (this.music?.region === region) return;
    this.stopMusic();
    if (!this.unlock()) return;
    const theme = musicTheme(region);
    const step = 60 / theme.bpm;
    let index = 0;
    const tick = () => {
      if (this.muted || !this.musicOn) return;
      const note = theme.notes[index % theme.notes.length];
      index += 1;
      if (note === null) return;
      const freq = theme.root * 2 ** (note / 12);
      this.playTone(freq, step * 0.9, theme.wave, 0.018);
      if (index % 4 === 1) this.playTone(freq / 2, step * 3.6, 'sine', 0.02);
    };
    tick();
    this.music = { region, theme, timer: setInterval(tick, step * 1000) };
  }

  playHit() {
    this.playTone(150, 0.07, 'square', 0.035);
  }

  /** Picaretada: batida metálica curta. */
  playPick() {
    this.playTone(880, 0.04, 'square', 0.03);
    this.playTone(220, 0.06, 'triangle', 0.035, 0.02);
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
