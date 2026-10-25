// Baú deixado por monstros especiais (elite, chefes de missão e o Titã do Bioma).
// Os itens são sorteados de três faixas: comuns, incomuns e raros.

export const CHEST_LOOT = Object.freeze({
  common: Object.freeze(['wood', 'stone', 'herbs', 'food', 'bone', 'torch']),
  uncommon: Object.freeze(['iron', 'coal', 'potion', 'staminaPotion', 'silk', 'ectoplasm', 'moonherb', 'leather', 'fabric', 'trap']),
  rare: Object.freeze(['gold', 'crystal', 'elixir', 'magmaCore', 'book', 'mapPiece'])
});

// Quantos itens de cada faixa, quantidades e moedas por tipo de monstro.
export const CHEST_TIERS = Object.freeze({
  elite: { common: [1, 2], uncommon: [1, 1], rareChance: 0.3, rare: [0, 1], amount: [2, 4], rareAmount: [1, 1], coins: [10, 25] },
  boss: { common: [1, 2], uncommon: [2, 3], rareChance: 1, rare: [1, 2], amount: [3, 5], rareAmount: [1, 2], coins: [40, 80] }
});

const between = (random, [min, max]) => min + Math.floor(random() * (max - min + 1));

function pick(random, pool, count, used) {
  const chosen = [];
  const options = pool.filter((type) => !used.has(type));
  for (let index = 0; index < count && options.length > 0; index += 1) {
    const [type] = options.splice(Math.floor(random() * options.length), 1);
    used.add(type);
    chosen.push(type);
  }
  return chosen;
}

/** Sorteia o conteúdo do baú: { items: { tipo: quantidade }, coins }. */
export function rollMonsterChest(tier = 'elite', random = Math.random) {
  const config = CHEST_TIERS[tier] ?? CHEST_TIERS.elite;
  const used = new Set();
  const items = {};
  for (const type of pick(random, CHEST_LOOT.common, between(random, config.common), used)) items[type] = between(random, config.amount);
  for (const type of pick(random, CHEST_LOOT.uncommon, between(random, config.uncommon), used)) items[type] = between(random, config.amount);
  if (random() < config.rareChance) {
    const rareCount = Math.max(1, between(random, config.rare));
    for (const type of pick(random, CHEST_LOOT.rare, rareCount, used)) items[type] = between(random, config.rareAmount);
  }
  return { items, coins: between(random, config.coins) };
}
