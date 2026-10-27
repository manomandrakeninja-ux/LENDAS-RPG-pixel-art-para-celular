// Renascimento (nível 150 volta ao 1, com bônus) e arena de chefes (ondas perto da Fogueira). Funções puras.

export const REBIRTH_CONFIG = Object.freeze({
  level: 150,
  max: 10,
  bonusPerRebirth: 0.05
});

/** Multiplicador de dano, vida e XP depois de n renascimentos (+5% cada). */
export function rebirthMultiplier(count) {
  const n = Math.max(0, Math.min(REBIRTH_CONFIG.max, Math.floor(Number(count) || 0)));
  return 1 + n * REBIRTH_CONFIG.bonusPerRebirth;
}

export function canRebirth(level, count) {
  return Math.floor(Number(level) || 0) >= REBIRTH_CONFIG.level && (Number(count) || 0) < REBIRTH_CONFIG.max;
}

export const ARENA_CONFIG = Object.freeze({
  rewardEvery: 5,
  // Chefes por faixa de onda: espécies de níveis cada vez mais altos.
  roster: Object.freeze(['orcChief', 'hydra', 'ghostCaptain', 'frostGiant', 'pharaoh', 'dragon', 'cinderGiant', 'hellWarden', 'abyssLord'])
});

/** Chefes de uma onda (1, 2, 3...): espécie, nível, vida e dano extras. */
export function arenaWave(wave, playerLevel = 1) {
  const w = Math.max(1, Math.floor(Number(wave) || 1));
  const count = Math.min(4, 1 + Math.floor((w - 1) / 5));
  const level = Math.min(150, Math.max(10, Math.floor(Number(playerLevel) || 1)) + Math.floor(w * 1.5));
  const bosses = [];
  for (let i = 0; i < count; i += 1) {
    const slot = Math.min(ARENA_CONFIG.roster.length - 1, Math.floor((w - 1) / 3) + i);
    bosses.push({ kind: ARENA_CONFIG.roster[slot], level, health: 1.5 + w * 0.2, damage: 1 + w * 0.05 });
  }
  return bosses;
}

/** Recompensa ao fechar a onda w (a cada 5 ondas); 0 nas outras. */
export function arenaReward(wave) {
  const w = Math.floor(Number(wave) || 0);
  if (w <= 0 || w % ARENA_CONFIG.rewardEvery !== 0) return null;
  return { coins: 150 * w, xp: 120 * w };
}

export class Arena {
  constructor(saved = {}) {
    this.record = Math.max(0, Math.floor(Number(saved?.record) || 0));
    this.active = false;
    this.wave = 0;
  }

  start() { this.active = true; this.wave = 0; return this.nextWave(); }

  /** Avança para a próxima onda e devolve seus chefes. */
  nextWave(playerLevel = 1) {
    this.wave += 1;
    return arenaWave(this.wave, playerLevel);
  }

  /** Onda vencida: atualiza o recorde e devolve a recompensa (ou null). */
  clear() {
    if (this.wave > this.record) this.record = this.wave;
    return arenaReward(this.wave);
  }

  end() { this.active = false; this.wave = 0; }

  serialize() { return { record: this.record }; }
}
