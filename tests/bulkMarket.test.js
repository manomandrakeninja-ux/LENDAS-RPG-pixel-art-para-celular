import test from 'node:test';
import assert from 'node:assert/strict';
import { Inventory } from '../src/game/Inventory.js';
import { MarketSystem, COMMON_SELL_TYPES } from '../src/game/MarketSystem.js';
import { sellPriceOf, MARKET_CATALOG } from '../src/data/economy.js';
import { COMMON_DROP_SCALE, scaledAmount, scaledChance } from '../src/data/dropScale.js';
import { ENEMY_TYPES } from '../src/data/enemies.js';

const wallet = (coins = 0) => ({
  coins,
  addCoins(n) { this.coins += n; return n; },
  spendCoins(n) { if (this.coins < n) return false; this.coins -= n; return true; }
});

function setup() {
  return { market: new MarketSystem({ level: 10 }), inventory: new Inventory(), economy: wallet() };
}

test('sellMany sells a chosen quantity and pays the shown total', () => {
  const { market, inventory, economy } = setup();
  inventory.add('iron', 500);
  assert.equal(market.sellValue({ iron: 250 }), 250 * sellPriceOf('iron'));
  const result = market.sellMany({ iron: 250 }, inventory, economy);
  assert.equal(result.ok, true);
  assert.equal(inventory.items.iron, 250);
  assert.equal(economy.coins, 250 * sellPriceOf('iron'));
});

test('sellMany never sells more than owned and skips protected items', () => {
  const { market, inventory, economy } = setup();
  inventory.add('wood', 30);
  inventory.add('titanCore', 3);
  const result = market.sellMany({ wood: 99999, titanCore: 3 }, inventory, economy, new Set(['titanCore']));
  assert.equal(result.ok, true);
  assert.deepEqual(result.sold, { wood: 30 });
  assert.equal(inventory.items.titanCore, 3);
  assert.equal(market.sellMany({ titanCore: 3 }, inventory, economy, new Set(['titanCore'])).ok, false);
});

test('common selection only covers cheap materials and respects protection', () => {
  const { market, inventory } = setup();
  inventory.add('wood', 10);
  inventory.add('stone', 5);
  inventory.add('gold', 4);
  inventory.add('potion', 2);
  assert.deepEqual(market.commonSelection(inventory), { wood: 10, stone: 5 });
  assert.deepEqual(market.commonSelection(inventory, new Set(['stone'])), { wood: 10 });
  for (const type of COMMON_SELL_TYPES) assert.ok(sellPriceOf(type) <= 2);
});

test('selling is locked before the market allows it', () => {
  const market = new MarketSystem({ level: 1 });
  const inventory = new Inventory();
  inventory.add('wood', 5);
  assert.equal(market.sellMany({ wood: 5 }, inventory, wallet()).reason, 'locked');
});

test('buyMany buys several units and stops when coins run out', () => {
  const { market, inventory } = setup();
  const offer = market.offers.find((entry) => entry.quantity >= 2) ?? market.offers[0];
  const price = market.priceOf(MARKET_CATALOG.find((entry) => entry.id === offer.id));
  const economy = wallet(price * 2 + 1);
  const max = market.maxBuyable(offer.id, inventory, economy);
  assert.ok(max >= 1 && max <= 2);
  const result = market.buyMany(offer.id, inventory, economy, 'daily', 5);
  assert.equal(result.bought, max);
  assert.equal(result.spent, price * max);
});

test('common monster drops are cut by about 40-50% while bosses and rares are untouched', () => {
  const slime = ENEMY_TYPES.slime;
  const herbs = slime.drops.find((drop) => drop.type === 'herbs');
  const expectedBefore = 0.55 * 1.5;
  let sum = 0;
  let seed = 7;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const runs = 20000;
  for (let i = 0; i < runs; i += 1) {
    if (random() > scaledChance(herbs, slime)) continue;
    sum += scaledAmount(1 + Math.floor(random() * 2), herbs, slime, random);
  }
  const reduction = 1 - (sum / runs) / expectedBefore;
  assert.ok(reduction > 0.38 && reduction < 0.52, `reducao ${reduction}`);
  const dragon = ENEMY_TYPES.dragon;
  for (const drop of dragon.drops) {
    assert.equal(scaledChance(drop, dragon), drop.chance);
    assert.equal(scaledAmount(5, drop, dragon), 5);
  }
  const rare = ENEMY_TYPES.pirate.drops.find((drop) => drop.type === 'mapPiece');
  assert.equal(scaledChance(rare, ENEMY_TYPES.pirate), rare.chance);
  assert.ok(COMMON_DROP_SCALE.chance < 1);
});
