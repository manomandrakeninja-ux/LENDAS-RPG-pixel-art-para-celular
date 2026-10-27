// Invasões nas regiões (fora do acampamento): a cada 2-3 dias de jogo uma região perto do
// nível do herói sofre uma invasão de 3 ondas, com um líder de aura dourada na última.
// Lógica pura (roda no Node); a cena só cria os monstros, mostra o aviso e marca o mapa.
// Os ataques ao acampamento continuam em RaidDirector.
import { ENEMY_TYPES } from '../data/enemies.js';
import { REGION_CENTERS, REGION_INFO, REGION_SPAWNS } from '../data/worldRegions.js';

export const INVASION_CONFIG = Object.freeze({
  minGapDays: 2,
  maxGapDays: 3,
  waves: 3,
  waveSizes: Object.freeze([4, 6, 8]),
  waveDelayMs: 4000,
  coinMultiplier: 2,
  gearChanceMultiplier: 2,
  auraColor: 0xff8a2a,
  leaderAuraColor: 0xffd56b,
  // Quantos dias de jogo a invasão espera pelo herói antes de acabar sozinha.
  expireDays: 1
});

export const VALLEY_CENTER = Object.freeze({ x: 1500, y: 1100 });

/** Centro (x, y) da região para marcar no mapa. */
export function invasionCenter(region) {
  return REGION_CENTERS[region] ?? VALLEY_CENTER;
}

/** Regiões que podem sofrer invasão: o Vale e as seis regiões com monstros próprios. */
export const INVASION_REGIONS = Object.freeze(['vale', ...Object.keys(REGION_SPAWNS)]);

function distanceToRange(level, range) {
  if (level < range[0]) return range[0] - level;
  if (level > range[1]) return level - range[1];
  return 0;
}

/** Região escolhida para o nível dado: as mais próximas da faixa, sorteando entre elas. */
export function pickInvasionRegion(level, random = Math.random, exclude = null) {
  const lvl = Math.max(1, Math.floor(Number(level) || 1));
  const scored = INVASION_REGIONS
    .map((region) => ({ region, gap: distanceToRange(lvl, REGION_INFO[region].levelRange) }))
    .sort((a, b) => a.gap - b.gap);
  const best = scored[0].gap;
  // Aceita regiões até 8 níveis fora da faixa mais próxima, para variar.
  let pool = scored.filter((entry) => entry.gap <= best + 8 && entry.region !== exclude);
  if (pool.length === 0) pool = scored.slice(0, 1);
  return pool[Math.floor(random() * pool.length) % pool.length].region;
}

/** Espécies da região (dia e noite), sem repetir e sem chefes. */
export function invasionSpecies(region) {
  const pools = REGION_SPAWNS[region];
  const kinds = pools ? [...pools.day, ...pools.night] : ['wolf', 'boar', 'skeleton', 'spider', 'werewolf', 'ghost'];
  return [...new Set(kinds)].filter((kind) => ENEMY_TYPES[kind] && !ENEMY_TYPES[kind].boss);
}

/** Nível dos invasores: o do herói, preso à faixa da região. */
export function invasionLevel(region, playerLevel) {
  const [lo, hi] = REGION_INFO[region].levelRange;
  return Math.max(lo, Math.min(hi, Math.floor(Number(playerLevel) || 1)));
}

/**
 * As 3 ondas: [{ index, level, members: [{ kind, leader }] }].
 * Cada onda é maior que a anterior; na última o líder é a espécie mais forte da região.
 */
export function invasionWaves(region, playerLevel, random = Math.random) {
  const species = invasionSpecies(region);
  const level = invasionLevel(region, playerLevel);
  const power = (kind) => ENEMY_TYPES[kind].health * ENEMY_TYPES[kind].damage;
  const strongest = [...species].sort((a, b) => power(b) - power(a))[0];
  return INVASION_CONFIG.waveSizes.map((size, index) => {
    const members = Array.from({ length: size }, () => ({ kind: species[Math.floor(random() * species.length) % species.length], leader: false }));
    if (index === INVASION_CONFIG.waves - 1) members[0] = { kind: strongest, leader: true };
    return { index, level, members };
  });
}

/** Recompensa ao vencer a invasão (além das moedas dobradas e do equipamento de cada invasor). */
export function invasionReward(region, playerLevel) {
  const level = invasionLevel(region, playerLevel);
  return { coins: Math.round(40 + level * 6), xp: Math.round(level * 12) };
}

/** Moedas de um invasor: o dobro. */
export function invasionCoins(base) {
  return Math.round(base * INVASION_CONFIG.coinMultiplier);
}

export class RegionInvasionState {
  constructor(saved = {}, random = Math.random) {
    this.random = random;
    const whole = (value, fallback = 0) => {
      const number = Math.floor(Number(value));
      return Number.isFinite(number) ? Math.max(0, number) : fallback;
    };
    this.lastDay = whole(saved?.lastDay);
    this.nextDay = whole(saved?.nextDay);
    this.completed = whole(saved?.completed);
    this.lastRegion = REGION_INFO[saved?.lastRegion] ? saved.lastRegion : null;
    const active = saved?.active;
    this.active = active && INVASION_REGIONS.includes(active.region)
      ? {
        region: active.region,
        level: Math.max(1, whole(active.level, 1)),
        startDay: Math.max(1, whole(active.startDay, 1)),
        wave: Math.min(INVASION_CONFIG.waves, whole(active.wave)),
        leaderDefeated: Boolean(active.leaderDefeated)
      }
      : null;
  }

  get isActive() {
    return Boolean(this.active);
  }

  /** Dias que faltam para a próxima invasão (0 se já pode). */
  daysUntilNext(day) {
    return Math.max(0, this.nextDay - day);
  }

  gap() {
    const span = INVASION_CONFIG.maxGapDays - INVASION_CONFIG.minGapDays + 1;
    return INVASION_CONFIG.minGapDays + (Math.floor(this.random() * span) % span);
  }

  /**
   * Chamado a cada virada de dia. Devolve a invasão nova (para avisar na tela) ou null.
   * Sem invasão marcada, a primeira vem 2-3 dias depois do dia atual.
   */
  checkDay(day, playerLevel) {
    const today = Math.max(1, Math.floor(Number(day) || 1));
    if (this.active && today - this.active.startDay > INVASION_CONFIG.expireDays) {
      // O herói não apareceu: os invasores desistem.
      this.active = null;
    }
    if (this.active) return null;
    if (this.nextDay === 0) this.nextDay = today + this.gap();
    if (today < this.nextDay) return null;
    const region = pickInvasionRegion(playerLevel, this.random, this.lastRegion);
    this.active = {
      region,
      level: invasionLevel(region, playerLevel),
      startDay: today,
      wave: 0,
      leaderDefeated: false
    };
    this.lastRegion = region;
    this.lastDay = today;
    this.nextDay = today + this.gap();
    return { ...this.active };
  }

  /** Próxima onda a nascer (e marca como nascida), ou null se não há mais. */
  nextWave() {
    if (!this.active || this.active.wave >= INVASION_CONFIG.waves) return null;
    const waves = invasionWaves(this.active.region, this.active.level, this.random);
    const wave = waves[this.active.wave];
    this.active.wave += 1;
    return wave;
  }

  /** O herói morreu ou saiu: a onda em andamento recomeça quando ele voltar. */
  restartCurrentWave() {
    if (this.active && this.active.wave > 0 && !this.active.leaderDefeated) this.active.wave -= 1;
  }

  /** O líder caiu? Então a invasão termina e devolve a recompensa. */
  finish() {
    if (!this.active || !this.active.leaderDefeated) return null;
    const reward = invasionReward(this.active.region, this.active.level);
    const region = this.active.region;
    this.active = null;
    this.completed += 1;
    return { region, ...reward };
  }

  serialize() {
    return {
      lastDay: this.lastDay,
      nextDay: this.nextDay,
      completed: this.completed,
      lastRegion: this.lastRegion,
      active: this.active ? { ...this.active } : null
    };
  }
}
