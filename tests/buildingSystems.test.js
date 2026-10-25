import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANIMAL_PRODUCTS,
  FARM_CROPS,
  FARM_PLOT_COUNTS,
  FORGE_RECIPES,
  MARKET_CATALOG,
  MARKET_SELL_PRICES
} from '../src/data/buildingSystems.js';
import { FarmSystem } from '../src/game/FarmSystem.js';
import { MarketSystem } from '../src/game/MarketSystem.js';
import { EquipmentSystem } from '../src/game/EquipmentSystem.js';
import { Inventory } from '../src/game/Inventory.js';
import { DayNightCycle } from '../src/game/DayNightCycle.js';
import { EconomySystem } from '../src/game/EconomySystem.js';

test('farm crops use the requested real-time growth durations', () => {
  assert.equal(FARM_CROPS.wheat.seconds, 60);
  assert.equal(FARM_CROPS.pumpkin.seconds, 90);
  assert.equal(FARM_CROPS.herb.seconds, 45);
  assert.deepEqual(FARM_PLOT_COUNTS, { 1: 4, 2: 6, 3: 8 });
  assert.equal(Object.values(ANIMAL_PRODUCTS).every((product) => product.seconds === 120), true);
});

test('farm plots plant, mature, harvest and expand by building level', () => {
  const farm = new FarmSystem({ level: 1, now: 0, random: () => 0 });
  assert.equal(farm.plotCount, 4);
  assert.equal(farm.plant(0, 'wheat', 0).ok, true);
  assert.equal(farm.harvestPlot(0, 59_999).ok, false);
  const harvested = farm.harvestPlot(0, 60_000, () => true);
  assert.equal(harvested.ok, true);
  assert.equal(harvested.type, 'food');
  assert.equal(harvested.amount, 2);

  farm.setLevel(2);
  assert.equal(farm.plotCount, 6);
  farm.setLevel(3);
  assert.equal(farm.plotCount, 8);
});

test('automatic harvest never clears a crop when storage rejects the yield', () => {
  const farm = new FarmSystem({ level: 3, now: 0, random: () => 0 });
  farm.plant(0, 'herb', 0);
  assert.equal(farm.update(45_000, () => false), null);
  assert.equal(farm.plots[0].crop, 'herb');
  assert.deepEqual(farm.update(45_000, () => true), { herbs: 2 });
  assert.equal(farm.plots[0].crop, null);
});

test('animal products become available every 120 seconds', () => {
  const farm = new FarmSystem({ now: 0 });
  assert.equal(farm.collectAnimal('egg', 119_999).ok, false);
  assert.equal(farm.collectAnimal('egg', 120_000).ok, true);
  assert.equal(farm.animals.egg.readyAt, 240_000);
});

test('market rolls six daily offers and purchases are atomic', () => {
  const market = new MarketSystem({ day: 1 });
  assert.equal(market.offers.length, 6);
  const repeated = new MarketSystem({ day: 1 });
  assert.deepEqual(repeated.offers, market.offers);
  const nextDay = new MarketSystem({ day: 2 });
  assert.notDeepEqual(nextDay.offers, market.offers);

  const inventory = new Inventory();
  const economy = new EconomySystem({ coins: 10 });
  market.offers = [{ id: 'seeds', quantity: 2 }];
  const beforeCoins = economy.coins;
  assert.equal(market.buy('seeds', inventory, economy).ok, true);
  assert.equal(economy.coins, beforeCoins - MARKET_CATALOG.find((entry) => entry.id === 'seeds').price);
  assert.equal(inventory.items.seeds, 1);
});

test('market purchase rolls back atomically when the backpack has no free slot', () => {
  const market = new MarketSystem({ day: 1 });
  const inventory = new Inventory();
  const types = Object.keys(inventory.items).filter((type) => type !== 'seeds');
  for (const type of types.slice(0, 12)) inventory.add(type, 1);
  inventory.items.food = 6;
  market.offers = [{ id: 'seeds', quantity: 2 }];

  const economy = new EconomySystem({ coins: 10 });
  const result = market.buy('seeds', inventory, economy);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'inventory');
  assert.equal(economy.coins, 10);
  assert.equal(inventory.items.seeds, 0);
  assert.equal(market.offers[0].quantity, 2);
});

test('market selling converts one resource into one coin without losing the resource', () => {
  const market = new MarketSystem({ day: 1 });
  const inventory = new Inventory();
  const economy = new EconomySystem();
  inventory.add('wood', 2);
  assert.equal(market.sell('wood', inventory, economy).ok, true);
  assert.equal(inventory.items.wood, 1);
  assert.equal(economy.coins, 1);
  assert.equal(inventory.items.food, 0);
});

test('rare resources sell for more and never above their market purchase price', () => {
  const market = new MarketSystem({ day: 1 });
  const inventory = new Inventory();
  const economy = new EconomySystem();
  inventory.add('gold', 2);
  assert.equal(market.sell('gold', inventory, economy).coins, MARKET_SELL_PRICES.gold);
  assert.equal(economy.coins, MARKET_SELL_PRICES.gold);
  assert.ok(MARKET_SELL_PRICES.gold > MARKET_SELL_PRICES.wood);

  for (const offer of MARKET_CATALOG) {
    const [[type, amount]] = Object.entries(offer.yield);
    assert.ok(MARKET_SELL_PRICES[type] * amount < offer.price, `${offer.id} geraria lucro de revenda`);
  }
});

test('forge recipes enforce levels, materials, base equipment and derived stats', () => {
  const equipment = new EquipmentSystem({ forgeLevel: 1 });
  const inventory = new Inventory();
  inventory.add('stone', 3);
  inventory.add('wood', 2);
  assert.equal(equipment.craft('stonePickaxe', inventory).ok, true);
  assert.equal(equipment.pickaxeTier, 'stone');
  assert.equal(inventory.items.stone, 0);
  assert.equal(inventory.items.wood, 0);

  inventory.add('iron', 3);
  inventory.add('wood', 1);
  assert.equal(equipment.craft('ironSword', inventory).ok, true);
  assert.deepEqual(equipment.getBonuses(), { attack: 5, defense: 0 });
  assert.equal(equipment.craft('sharpnessEnchantment', inventory).ok, false);
  assert.equal(equipment.craft('steelSword', inventory).ok, false);

  equipment.forgeLevel = 3;
  inventory.add('gold', 1);
  inventory.add('moonherb', 2);
  inventory.add('iron', 2);
  assert.equal(equipment.craft('sharpnessEnchantment', inventory).ok, true);
  assert.equal(equipment.getBonuses().attack, 7);
  assert.equal(FORGE_RECIPES.ironArmor.cost.iron, 5);
});

test('thirty game minutes can be advanced independently from the real rest delay', () => {
  const cycle = new DayNightCycle({ cycleTime: 0, dayCount: 1 });
  const before = cycle.getState();
  const after = cycle.advanceGameMinutes(30);
  const beforeMinutes = before.hour * 60 + before.minute;
  const afterMinutes = after.hour * 60 + after.minute;
  assert.equal(afterMinutes - beforeMinutes, 30);
});
