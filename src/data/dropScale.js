// Monstros comuns davam itens demais e lotavam a mochila: cerca de 45% menos
// (chance x0,65 e quantidade x0,75). Chefes (drop garantido) e raridades
// (chance abaixo de 20%) não mudam, para as missões de coleta continuarem possíveis.
export const COMMON_DROP_SCALE = Object.freeze({ chance: 0.65, amount: 0.75, rareBelow: 0.2 });

export function isScaledDrop(drop, definition = {}) {
  return !definition.boss && drop.chance < 1 && drop.chance >= COMMON_DROP_SCALE.rareBelow;
}

export function scaledChance(drop, definition = {}) {
  return isScaledDrop(drop, definition) ? drop.chance * COMMON_DROP_SCALE.chance : drop.chance;
}

/** Quantidade com arredondamento sorteado (média exata); nunca abaixo de 1. */
export function scaledAmount(amount, drop, definition = {}, random = Math.random) {
  if (definition.boss || drop.chance >= 1) return amount;
  const scaled = amount * COMMON_DROP_SCALE.amount;
  const base = Math.floor(scaled);
  return Math.max(1, base + (random() < scaled - base ? 1 : 0));
}
