// Skills por uso (estilo Skyrim): cada ação de combate treina uma skill separada,
// com nível próprio e bônus permanente. Curva: nível n exige 50*n² de XP acumulado.
export const SKILL_MAX_LEVEL = 50;

export const SKILLS = Object.freeze({
  blade: Object.freeze({ name: 'Lâmina', icon: '⚔️', desc: '+2% de dano corpo a corpo por nível', xpBase: 50 }),
  archery: Object.freeze({ name: 'Arco', icon: '🏹', desc: '+2% de dano de flecha por nível', xpBase: 50 }),
  dodge: Object.freeze({ name: 'Esquiva', icon: '💨', desc: 'Esquiva gasta menos vigor e dura mais (atéNv 50)', xpBase: 50 }),
  block: Object.freeze({ name: 'Bloqueio', icon: '🛡️', desc: '+1 de defesa por nível (treino com escudo)', xpBase: 50 })
});

/** Nível de uma skill a partir do XP acumulado (50*n² XP = nível n). */
export function skillLevelForXp(xp) {
  return Math.min(SKILL_MAX_LEVEL, Math.floor(Math.sqrt(Math.max(0, Number(xp) || 0) / 50)));
}

/** XP acumulado necessário para chegar ao nível (limite inferior do nível). */
export function skillXpForLevel(level) {
  const normalized = Math.max(0, Math.floor(Number(level) || 0));
  return 50 * normalized * normalized;
}

export class PlayerSkills {
  constructor(saved = {}) {
    this.xp = {};
    for (const key of Object.keys(SKILLS)) {
      this.xp[key] = Math.max(0, Math.floor(Number(saved?.[key]) || 0));
    }
  }

  /** Dá XP para uma skill; retorna quantos níveis subiram. */
  addXp(skill, amount) {
    if (!Object.hasOwn(SKILLS, skill)) return 0;
    const before = skillLevelForXp(this.xp[skill]);
    this.xp[skill] += Math.max(0, Math.round(Number(amount) || 0));
    return skillLevelForXp(this.xp[skill]) - before;
  }

  level(skill) {
    return skillLevelForXp(this.xp[skill] ?? 0);
  }

  bladeDamageMultiplier() {
    return 1 + 0.02 * this.level('blade');
  }

  archeryDamageMultiplier() {
    return 1 + 0.02 * this.level('archery');
  }

  dodgeStaminaMultiplier() {
    return Math.max(0.7, 1 - 0.01 * this.level('dodge'));
  }

  dodgeIframeBonusMs() {
    return Math.min(150, 30 * this.level('dodge'));
  }

  blockDefenseBonus() {
    return this.level('block');
  }

  serialize() {
    return { ...this.xp };
  }
}
