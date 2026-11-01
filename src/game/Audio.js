function isHeadless() {
  return typeof navigator !== 'undefined' && /HeadlessChrome/.test(navigator.userAgent);
}

// Escalas (semitons a partir da tônica) e andamento de cada região.
const MAJOR = [0, 2, 4, 7, 9, 12];
const MINOR = [0, 3, 5, 7, 10, 12];
// Cada tema tem 16 passos (duas frases de 8): a segunda frase varia para o laço não soar repetido.
const MUSIC = {
  vale: { root: 261.6, bpm: 84, wave: 'triangle', scale: MAJOR, pattern: [0, 2, 4, 2, 3, 1, 2, null, 4, 3, 2, 1, 0, null, 2, null] },
  floresta: { root: 220, bpm: 72, wave: 'triangle', scale: MINOR, pattern: [0, null, 2, 1, 3, null, 1, 0, 2, 3, null, 1, 0, null, null, null] },
  brejo: { root: 196, bpm: 60, wave: 'sine', scale: MINOR, pattern: [0, null, null, 2, 1, null, 3, null, 2, null, 1, null, 0, null, null, null] },
  ilha: { root: 293.7, bpm: 96, wave: 'triangle', scale: MAJOR, pattern: [0, 3, 2, 4, 3, 5, 4, 2, 1, 2, 3, 4, 5, null, 4, 2] },
  picos: { root: 246.9, bpm: 66, wave: 'sine', scale: MINOR, pattern: [4, null, 2, null, 3, 1, null, 0, 2, null, 1, null, 0, null, null, null] },
  deserto: { root: 233, bpm: 78, wave: 'square', scale: [0, 1, 4, 5, 7, 8], pattern: [0, 1, 2, 1, 3, 2, 1, null, 4, 3, 2, 3, 1, 0, null, null] },
  brasa: { root: 174.6, bpm: 90, wave: 'sawtooth', scale: MINOR, pattern: [0, 0, 2, 0, 3, 2, 1, 0, 4, null, 3, 2, 1, 0, null, null] },
  abismo: { root: 130.8, bpm: 54, wave: 'sawtooth', scale: [0, 1, 3, 6, 7, 10], pattern: [0, null, 1, null, 3, 2, null, 0, 0, null, 2, null, 1, null, null, null] },
  caverna: { root: 146.8, bpm: 58, wave: 'sine', scale: MINOR, pattern: [0, null, null, 3, null, 2, null, null, 1, null, 2, null, 3, null, null, 0] }
};

// Chaves de região reais do mundo (worldRegions.regionAt / RegionWorld.regionOf) → tema.
// Sem isso, 'antiga', 'gelo', 'areia', 'esmeralda' e 'mar' caíam todas no tema do Vale.
const REGION_THEME = Object.freeze({
  vale: 'vale',
  antiga: 'floresta',
  brejo: 'brejo',
  gelo: 'picos',
  areia: 'deserto',
  esmeralda: 'ilha',
  brasa: 'brasa',
  mar: 'ilha',
  caverna: 'caverna',
  abismo: 'abismo'
});

/** Frequência de uma nota com o modo noturno aplicado (puro, testável): à noite desce 2 semitons. */
export function nightFreq(root, semitones, night) {
  return root * 2 ** ((semitones + (night ? -2 : 0)) / 12);
}

/** Tema da região (puro, testável): { root, bpm, wave, notes } com notas em semitons ou null (pausa). */
export function musicTheme(region) {
  const key = String(region ?? '').toLowerCase();
  const named = REGION_THEME[key] ?? Object.keys(MUSIC).find((name) => key.includes(name)) ?? 'vale';
  const base = MUSIC[named];
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
    this.night = false;
  }

  /** Modo noturno da música: a melodia desce 2 semitons e fica mais baixa (chamar ao anoitecer/amanhecer). */
  setNight(on) {
    this.night = !!on;
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

  // ---------- Ambiente contínuo (vento + pássaros de dia / grilos à noite) ----------

  /** Inicia o loop de vento (uma vez, após o desbloqueio do áudio). */
  startAmbience() {
    if (this.ambience || !this.unlock()) return;
    const ctx = this.context;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.masterGain);
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    noise.connect(filter);
    filter.connect(gain);
    noise.start();
    gain.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 2);
    this.ambience = { gain, filter, isNight: false, region: 'vale', timer: null };
    this.ambience.timer = setInterval(() => this.ambienceBlip(), 2400);
  }

  /** Ajusta o vento conforme a região e agenda os blips de dia/noite. */
  setAmbience(region, isNight) {
    const amb = this.ambience;
    if (!amb) return;
    const wind = { gelo: 720, areia: 660, brasa: 780, esmeralda: 430, mar: 540, brejo: 250, antiga: 300, vale: 300, caverna: 150 }[region] ?? 320;
    amb.filter.frequency.linearRampToValueAtTime(wind, this.context.currentTime + 1.2);
    amb.isNight = !!isNight;
    amb.region = region;
  }

  /** Um pio de pássaro (dia) ou grilo (noite), de vez em quando. */
  ambienceBlip() {
    const amb = this.ambience;
    if (!amb || this.muted || this.volume <= 0 || !this.context) return;
    if (Math.random() > 0.5) return;
    const ctx = this.context;
    const t = ctx.currentTime + 0.05;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(amb.gain);
    if (amb.isNight) {
      // Grilo: trinado curto agudo.
      osc.type = 'square';
      osc.frequency.value = 4100 + Math.random() * 300;
      gain.gain.setValueAtTime(0.012, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      osc.start(t);
      osc.stop(t + 0.1);
    } else {
      // Pássaro: 2-3 notas ascendentes.
      const base = 2100 + Math.random() * 900;
      osc.type = 'sine';
      const notes = 2 + Math.floor(Math.random() * 2);
      let t0 = t;
      for (let i = 0; i < notes; i += 1) {
        osc.frequency.setValueAtTime(base + i * 320, t0);
        gain.gain.setValueAtTime(0.02, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
        t0 += 0.15;
      }
      osc.start(t);
      osc.stop(t0 + 0.05);
    }
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

  /** Rugido distante do dragão ambiental: ronco grave descendente comharmônico. */
  playRoar() {
    this.playTone(90, 0.9, 'sawtooth', 0.05);
    this.playTone(65, 1.1, 'sawtooth', 0.045, 0.12);
    this.playTone(140, 0.5, 'triangle', 0.03, 0.25);
    this.playTone(48, 1.3, 'sine', 0.05, 0.3);
  }

  /** Conquista desbloqueada: fanfarra curta ascendente com um brilho no fim. */
  playAchievement() {
    [659, 784, 988, 1319].forEach((f, i) => this.playTone(f, 0.13, 'triangle', 0.05, i * 0.07));
    this.playTone(1976, 0.32, 'sine', 0.028, 0.3);
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

  /** Música procedural por região: melodia de 16 passos em laço, com variação a cada volta. */
  playMusic(region) {
    if (!this.musicOn || this.muted || this.volume <= 0) return this.stopMusic();
    if (this.music?.region === region) return;
    this.stopMusic();
    if (!this.unlock()) return;
    const theme = musicTheme(region);
    const step = 60 / theme.bpm;
    const length = theme.notes.length;
    let index = 0;
    const tick = () => {
      if (this.muted || !this.musicOn) return;
      const loop = Math.floor(index / length);
      const note = theme.notes[index % length];
      index += 1;
      if (note === null) return;
      // Na volta ímpar sobe uma quinta (7 semitons): a frase alterna e o laço não cansa.
      const variation = loop % 2 === 1 ? 7 : 0;
      // À noite a mesma região soa mais grave e baixa (2 semitons abaixo, volume ×0,7).
      const volScale = this.night ? 0.7 : 1;
      const freq = nightFreq(theme.root, note + variation, this.night);
      this.playTone(freq, step * 0.9, theme.wave, 0.018 * volScale);
      // Segunda voz levemente desafinada (×1.005 ≈ +8,7 cents): dá corpo de coro sem pesar o loop.
      this.playTone(freq * 1.005, step * 0.9, theme.wave, 0.009 * volScale);
      // De vez em quando uma quinta suave (3/2) por cima dá corpo à frase.
      if (index % 8 === 5) this.playTone(freq * 1.5, step * 0.8, 'sine', 0.008 * volScale);
      // Baixo na primeira batida de cada grupo de 4 passos.
      if (index % 4 === 1) this.playTone(freq / 2, step * 3.6, 'sine', 0.02 * volScale);
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

  /** Baú aberto: trinco + acorde dourado. */
  playChest() {
    this.playTone(1174, 0.05, 'square', 0.03);
    [659, 523, 784].forEach((f, i) => this.playTone(f, 0.12, 'triangle', 0.035, 0.06 + i * 0.07));
  }

  /** Fabricação concluída: martelada + acorde de sucesso. */
  playCraft() {
    this.playPick();
    [523, 659, 784].forEach((f, i) => this.playTone(f, 0.12, 'square', 0.03, 0.1 + i * 0.08));
  }

  playDeath() {
    this.playTone(220, 0.2, 'sawtooth', 0.045);
    this.playTone(110, 0.3, 'sawtooth', 0.035, 0.16);
  }

  /** Esquiva: chiado descendente curto. */
  playDodge() {
    this.playTone(520, 0.06, 'sawtooth', 0.02);
    this.playTone(260, 0.1, 'sawtooth', 0.018, 0.05);
  }

  /** Bloqueio com escudo: clang metálico curto. */
  playBlock() {
    this.playTone(340, 0.06, 'square', 0.04);
    this.playTone(1700, 0.05, 'square', 0.02, 0.01);
  }
}
