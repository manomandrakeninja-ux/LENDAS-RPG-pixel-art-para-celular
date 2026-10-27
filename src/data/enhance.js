// Aprimorar (+1 a +10, no Ferreiro) e joias (encaixes de armas e armaduras). Dados puros, sem Phaser.

export const MAX_ENHANCE = 10;
/** Cada nível de aprimoramento soma isto aos atributos da peça. */
export const ENHANCE_BONUS = 0.06;
/** A partir deste alvo, o aprimoramento pode falhar (e volta 1 nível; a peça nunca quebra). */
export const ENHANCE_RISK_FROM = 5;

const SUCCESS_CHANCE = Object.freeze({ 5: 0.85, 6: 0.75, 7: 0.65, 8: 0.55, 9: 0.45, 10: 0.35 });

/** Chance de dar certo ao subir para `target` (+1..+10). */
export function enhanceChance(target) {
  return SUCCESS_CHANCE[target] ?? 1;
}

/** Custo (ferro + moedas) de subir `item` para `target`. */
export function enhanceCost(level, target) {
  const lvl = Math.max(1, level);
  return {
    iron: Math.max(2, Math.round((2 + lvl * 0.25) * (1 + (target - 1) * 0.35))),
    coins: Math.round((20 + lvl * 8) * target * (1 + target * 0.1))
  };
}

/** Multiplicador de atributos de uma peça com +N. */
export function enhanceMultiplier(upgrade = 0) {
  return 1 + ENHANCE_BONUS * Math.min(MAX_ENHANCE, Math.max(0, Math.floor(Number(upgrade) || 0)));
}

export const JEWELS = Object.freeze({
  fire: { name: 'Joia de Fogo', short: 'Fogo', color: '#ff7a3c', stat: 'attack', perLevel: 0.2, label: 'ATQ' },
  ice: { name: 'Joia de Gelo', short: 'Gelo', color: '#7ad8ff', stat: 'defense', perLevel: 0.16, label: 'DEF' },
  poison: { name: 'Joia de Veneno', short: 'Veneno', color: '#8ee05a', stat: 'poison', perLevel: 0.12, label: 'VENENO' },
  life: { name: 'Joia de Vida', short: 'Vida', color: '#ff6b8a', stat: 'maxHealth', perLevel: 0.9, label: 'VIDA' },
  crit: { name: 'Joia de Crítico', short: 'Crítico', color: '#ffd84a', stat: 'critChance', perLevel: 0, label: 'CRÍT.' }
});
export const JEWEL_TYPES = Object.freeze(Object.keys(JEWELS));

/** Espaços que aceitam joias. */
export const SOCKET_SLOTS = Object.freeze(['weapon', 'shield', 'helmet', 'chest', 'legs', 'boots']);
const SOCKETS_BY_RARITY = Object.freeze({ common: 1, uncommon: 2, rare: 3, legendary: 3 });

/** Quantos encaixes a peça tem (0 para anel e amuleto). */
export function socketCount(slot, rarity) {
  return SOCKET_SLOTS.includes(slot) ? (SOCKETS_BY_RARITY[rarity] ?? 1) : 0;
}

/** Valor que uma joia dá numa peça do nível dado. */
export function jewelValue(type, itemLevel) {
  const jewel = JEWELS[type];
  if (!jewel) return 0;
  if (type === 'crit') return 0.03;
  return Math.max(1, Math.round(itemLevel * jewel.perLevel));
}

export function describeJewel(type, itemLevel) {
  const jewel = JEWELS[type];
  if (!jewel) return '';
  const value = jewelValue(type, itemLevel);
  return type === 'crit' ? `${jewel.label} +${Math.round(value * 100)}%` : `${jewel.label} +${value}`;
}

/** Chance de joia por morte de inimigo comum / elite. Chefes sempre deixam 2. */
export const JEWEL_DROP = Object.freeze({ normalChance: 0.03, eliteChance: 0.2, bossCount: 2 });

export function rollJewelDrop({ elite = false, boss = false, chanceMultiplier = 1 } = {}, random = Math.random) {
  const pick = () => JEWEL_TYPES[Math.floor(random() * JEWEL_TYPES.length)];
  if (boss) return Array.from({ length: JEWEL_DROP.bossCount }, pick);
  return random() < Math.min(1, (elite ? JEWEL_DROP.eliteChance : JEWEL_DROP.normalChance) * chanceMultiplier) ? [pick()] : [];
}
