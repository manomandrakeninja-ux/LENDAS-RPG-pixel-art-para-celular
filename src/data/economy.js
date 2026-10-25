import ECONOMY_DATA from './economy.json' with { type: 'json' };

export { ECONOMY_DATA };

export const COIN_DROP_RANGES = Object.freeze(Object.fromEntries(
  Object.entries(ECONOMY_DATA.coinDrops).map(([period, range]) => [period, Object.freeze([...range])])
));

/** Moedas ao derrotar um inimigo: comuns 1–3, noturnos 3–8, elite 10–20 (economy.json). */
export function rollCoinDrop(period = 'day', random = Math.random, isElite = false) {
  const range = isElite ? COIN_DROP_RANGES.elite : COIN_DROP_RANGES[period] ?? COIN_DROP_RANGES.day;
  const minimum = range[0];
  const maximum = range[1];
  return minimum + Math.floor(random() * (maximum - minimum + 1));
}

/** Moedas de um baú, fixas por baú (o mesmo baú sempre rende o mesmo valor). */
export function chestCoins(chestId) {
  const [minimum, maximum] = ECONOMY_DATA.chestCoins;
  let hash = 2166136261;
  for (const character of String(chestId)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return minimum + ((hash >>> 0) % (maximum - minimum + 1));
}

export const MARKET_CATALOG = Object.freeze(ECONOMY_DATA.market.catalog.map((entry) => Object.freeze({ ...entry })));
export const TRAVELER_CATALOG = Object.freeze({
  rare: Object.freeze(ECONOMY_DATA.market.traveler.rare.map((entry) => Object.freeze({ ...entry }))),
  epic: Object.freeze(ECONOMY_DATA.market.traveler.epic.map((entry) => Object.freeze({ ...entry })))
});
export const AUCTION_CONFIG = Object.freeze({ ...ECONOMY_DATA.market.auction });
export const MARKET_SELL_PRICES = Object.freeze({ ...ECONOMY_DATA.sellPrices });

export function sellPriceOf(type) {
  return MARKET_SELL_PRICES[type] ?? 1;
}

/** Valor de revenda de um pacote; usado para que nenhum desconto gere lucro de revenda. */
export function resaleValue(bundle = {}) {
  return Object.entries(bundle).reduce((sum, [type, amount]) => sum + sellPriceOf(type) * amount, 0);
}

export function findCatalogEntry(id) {
  return MARKET_CATALOG.find((entry) => entry.id === id) ??
    TRAVELER_CATALOG.rare.find((entry) => entry.id === id) ??
    TRAVELER_CATALOG.epic.find((entry) => entry.id === id) ??
    null;
}
