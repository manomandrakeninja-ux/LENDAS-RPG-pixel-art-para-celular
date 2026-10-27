// Bloqueio do escudo: em cada janela de ~1 s só os 2 primeiros atacantes distintos que acertam
// têm o dano reduzido; os demais acertos da janela pegam só a defesa normal. Lógica pura (Node).

export const SHIELD_BLOCK = Object.freeze({ windowMs: 1000, maxBlocked: 2, ratio: 0.6 });

export class ShieldBlocker {
  constructor(config = SHIELD_BLOCK) {
    this.config = config;
    this.windowStart = -Infinity;
    this.blocked = new Set();
  }

  /** Um acerto de `sourceId` no instante `now` (ms): devolve a fração bloqueada (0 se não couber). */
  tryBlock(sourceId, now) {
    if (now - this.windowStart >= this.config.windowMs) {
      this.windowStart = now;
      this.blocked.clear();
    }
    if (this.blocked.has(sourceId)) return this.config.ratio;
    if (this.blocked.size >= this.config.maxBlocked) return 0;
    this.blocked.add(sourceId);
    return this.config.ratio;
  }
}

/** Dano bruto depois do bloqueio (antes da defesa). */
export function blockedDamage(amount, blockRatio) {
  return amount * (1 - blockRatio);
}
