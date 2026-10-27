// Escalonamento dos inimigos pelo nível: até o nível 15 tudo fica igual ao valor base
// de enemies.json; acima disso vida, dano, XP e moedas crescem com o nível.

export const SCALING_START = 15;

const over = (level) => Math.max(0, Number(level) - SCALING_START);
const ratio = (level) => Math.max(1, Number(level) / SCALING_START);

/** Multiplicadores de um nível (1 até o nível 15). */
export function levelMultipliers(level) {
  return {
    health: 1 + over(level) * 0.08,
    damage: 1 + over(level) * 0.08,
    xp: ratio(level) ** 1.7,
    coins: ratio(level) ** 1.2
  };
}

/** Atributos de uma espécie no nível dado: { level, health, damage, xp, coinMultiplier }. */
export function scaleEnemy(def, level = def?.level ?? 1) {
  const lvl = Math.max(1, Math.floor(Number(level) || 1));
  const m = levelMultipliers(lvl);
  return {
    level: lvl,
    health: Math.round(def.health * m.health),
    damage: Math.round(def.damage * m.damage),
    xp: Math.round(def.xp * m.xp),
    coinMultiplier: m.coins
  };
}

/** Nível de uma espécie ao nascer numa faixa [min, max] (região ou caverna). */
export function levelInRange(def, range) {
  const base = def?.level ?? 1;
  if (!range) return base;
  return Math.min(range[1], Math.max(range[0], base));
}

/** Raridade do loot pela chance: Comum, Incomum ou Raro. */
export function dropRarity(chance) {
  if (chance >= 0.5) return 'common';
  if (chance >= 0.2) return 'uncommon';
  return 'rare';
}
export const RARITY_LABELS = Object.freeze({ common: 'Comum', uncommon: 'Incomum', rare: 'Raro' });
