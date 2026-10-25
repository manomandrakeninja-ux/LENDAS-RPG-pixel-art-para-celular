import BUILDING_DATA from './buildings.json' with { type: 'json' };

// Acesso tipado aos dados de src/data/buildings.json (custos, efeitos e textos por nível).
export { BUILDING_DATA };
export const MAX_BUILDING_LEVEL = BUILDING_DATA.maxLevel;
export const BUILDING_ORDER = Object.freeze([...BUILDING_DATA.order]);
export const BUILDING_DEFS = BUILDING_DATA.buildings;
export const BUILDING_REPAIR_COST = Object.freeze({ ...BUILDING_DATA.repairCost });
export const BUILDING_HIT_DURABILITY_LOSS = BUILDING_DATA.hitDurabilityLoss;
export const CAMP_COMPLETION_MESSAGE = BUILDING_DATA.completionMessage;
export const DUNGEON_CONFIG = Object.freeze({ ...BUILDING_DATA.dungeon });
export const MAX_DURABILITY = 100;

export function clampLevel(key, level) {
  const minimum = BUILDING_DEFS[key]?.startLevel ?? 1;
  const value = Math.floor(Number(level));
  if (!Number.isFinite(value)) return minimum;
  return Math.min(MAX_BUILDING_LEVEL, Math.max(minimum, value));
}

/** Valor de um efeito numérico no nível informado; nível 0 (não construído) devolve null. */
export function buildingStat(key, stat, level) {
  const values = BUILDING_DEFS[key]?.stats?.[stat];
  if (!Array.isArray(values) || level < 1) return null;
  return values[Math.min(MAX_BUILDING_LEVEL, Math.floor(level)) - 1];
}

export function hasUnlock(key, unlock, level) {
  const required = BUILDING_DEFS[key]?.unlocks?.[unlock];
  return Number.isFinite(required) && level >= required;
}

export function upgradeCost(key, targetLevel) {
  if (targetLevel > MAX_BUILDING_LEVEL) return null;
  const cost = BUILDING_DEFS[key]?.costs?.[String(targetLevel)];
  return cost ? { ...cost } : null;
}

export function levelDescription(key, level) {
  return BUILDING_DEFS[key]?.levels?.[String(level)] ?? '';
}

export function isCampComplete(levels = {}) {
  return BUILDING_ORDER.every((key) => (levels[key] ?? 0) >= MAX_BUILDING_LEVEL);
}

/**
 * Fontes de pagamento: mochila primeiro, depois armazém, e moedas na carteira.
 * `sources` = { inventory: { items }, storage: { [type]: n }, economy: { coins } }
 */
export function availableFor(type, sources) {
  if (type === 'coins') return Math.max(0, Math.floor(sources.economy?.coins ?? 0));
  return (sources.inventory?.items?.[type] ?? 0) + (sources.storage?.[type] ?? 0);
}

export function canAfford(cost = {}, sources = {}) {
  return Object.entries(cost).every(([type, amount]) => availableFor(type, sources) >= amount);
}

export function missingFor(cost = {}, sources = {}) {
  const missing = {};
  for (const [type, amount] of Object.entries(cost)) {
    const lacking = amount - availableFor(type, sources);
    if (lacking > 0) missing[type] = lacking;
  }
  return missing;
}

/** Cobra o custo de forma atômica: ou paga tudo, ou não mexe em nada. */
export function payCost(cost = {}, sources = {}) {
  if (!canAfford(cost, sources)) return false;
  for (const [type, amount] of Object.entries(cost)) {
    if (type === 'coins') {
      sources.economy.spendCoins(amount);
      continue;
    }
    const fromBackpack = Math.min(amount, sources.inventory?.items?.[type] ?? 0);
    if (fromBackpack > 0) sources.inventory.items[type] -= fromBackpack;
    const fromStorage = amount - fromBackpack;
    if (fromStorage > 0) sources.storage[type] -= fromStorage;
  }
  return true;
}
