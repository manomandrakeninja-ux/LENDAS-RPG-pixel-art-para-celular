import test from 'node:test';
import assert from 'node:assert/strict';
import { ANIMAL_PRODUCTS, FARM_CROPS, FORGE_RECIPES } from '../src/data/buildingSystems.js';
import {
  BUILDING_DEFS,
  BUILDING_ORDER,
  MAX_BUILDING_LEVEL,
  buildingStat,
  canAfford,
  isCampComplete,
  payCost,
  upgradeCost
} from '../src/data/buildings.js';
import { MARKET_CATALOG, MARKET_SELL_PRICES, resaleValue } from '../src/data/economy.js';
import { FarmSystem } from '../src/game/FarmSystem.js';
import { MarketSystem } from '../src/game/MarketSystem.js';
import { EquipmentSystem } from '../src/game/EquipmentSystem.js';
import { Inventory } from '../src/game/Inventory.js';
import { DayNightCycle } from '../src/game/DayNightCycle.js';
import { EconomySystem } from '../src/game/EconomySystem.js';
import { BuffSystem } from '../src/game/BuffSystem.js';
import { CampfireTravelers } from '../src/data/travelers.js';
import { freeUnitsFor, slotsUsed, storeBundle } from '../src/game/storageSlots.js';
import { isRainyDay } from '../src/data/weather.js';

const payAll = () => true;

// ---------- buildings.json ----------

test('buildings.json defines the 7 camp buildings with 10 levels each', () => {
  assert.deepEqual([...BUILDING_ORDER], ['campfire', 'farm', 'forge', 'house', 'market', 'wall', 'tower']);
  assert.equal(MAX_BUILDING_LEVEL, 10);
  for (const key of BUILDING_ORDER) {
    const definition = BUILDING_DEFS[key];
    assert.equal(Object.keys(definition.levels).length, 10, `${key} precisa de 10 descrições`);
    const firstPaid = definition.startLevel === 0 ? 1 : 2;
    for (let level = firstPaid; level <= 10; level += 1) {
      assert.ok(upgradeCost(key, level), `${key} sem custo para o nível ${level}`);
    }
    assert.equal(upgradeCost(key, 11), null);
    for (const [stat, values] of Object.entries(definition.stats)) {
      assert.equal(values.length, 10, `${key}.${stat} precisa de 10 valores`);
    }
  }
  assert.equal(BUILDING_DEFS.wall.startLevel, 0);
  assert.equal(BUILDING_DEFS.tower.startLevel, 0);
  assert.equal(BUILDING_DEFS.campfire.startLevel, 1);
});

test('the spec numbers are encoded in buildings.json', () => {
  assert.deepEqual(BUILDING_DEFS.wall.stats.hp, [200, 400, 800, 1200, 2000, 3000, 5000, 8000, 12000, 20000]);
  assert.deepEqual(BUILDING_DEFS.farm.stats.plots, [2, 4, 4, 6, 6, 6, 8, 8, 8, 8]);
  assert.deepEqual(BUILDING_DEFS.house.stats.storageSlots, [20, 30, 40, 50, 60, 70, 80, 100, 120, null]);
  assert.deepEqual(BUILDING_DEFS.market.stats.offersPerDay, [4, 6, 6, 8, 8, 10, 10, 10, 10, null]);
  assert.equal(buildingStat('tower', 'archers', 1), 1);
  assert.equal(buildingStat('tower', 'intervalMs', 1), 3000);
  assert.equal(buildingStat('tower', 'damage', 1), 5);
  assert.equal(buildingStat('tower', 'arrow', 3), 'fire');
  assert.equal(buildingStat('tower', 'towers', 1), 4);
  assert.equal(buildingStat('tower', 'arrow', 9), 'lightning');
  assert.equal(buildingStat('campfire', 'fireResistance', 8), 0.3);
  assert.equal(buildingStat('campfire', 'fireResistance', 10), 0.6);
  assert.equal(buildingStat('wall', 'spikeDamage', 3), 5);
  assert.equal(buildingStat('wall', 'spikeDamage', 4), 10);
  assert.equal(buildingStat('wall', 'tower', 0), null);
});

test('upgrade payment uses backpack, then storage, then coins, and is atomic', () => {
  const inventory = new Inventory();
  inventory.add('wood', 5);
  const storage = { wood: 10, stone: 2 };
  const economy = new EconomySystem({ coins: 30 });
  const sources = { inventory, storage, economy };
  const cost = { wood: 12, stone: 2, coins: 20 };
  assert.equal(canAfford(cost, sources), true);
  assert.equal(payCost(cost, sources), true);
  assert.equal(inventory.items.wood, 0);
  assert.equal(storage.wood, 3);
  assert.equal(storage.stone, 0);
  assert.equal(economy.coins, 10);

  assert.equal(payCost({ wood: 1, coins: 50 }, sources), false);
  assert.equal(storage.wood, 3, 'nada é cobrado quando falta algo');
  assert.equal(economy.coins, 10);
});

test('the camp is complete only when all 7 buildings reach level 10', () => {
  const levels = Object.fromEntries(BUILDING_ORDER.map((key) => [key, 10]));
  assert.equal(isCampComplete(levels), true);
  assert.equal(isCampComplete({ ...levels, tower: 9 }), false);
});

test('storage slots stack 25 units per slot and support unlimited storage', () => {
  const items = { wood: 30, stone: 0 };
  assert.equal(slotsUsed(items, 25), 2);
  assert.equal(freeUnitsFor(items, 'wood', 3, 25), 45);
  assert.equal(freeUnitsFor(items, 'stone', 2, 25), 0);
  const result = storeBundle(items, { wood: 50, stone: 5 }, 3, 25);
  assert.deepEqual(result.stored, { wood: 45 });
  assert.deepEqual(result.remaining, { wood: 5, stone: 5 });
  assert.equal(freeUnitsFor(items, 'stone', null, 25), Infinity);
});

// ---------- Fazenda ----------

test('farm plots and animals follow the farm level', () => {
  const farm = new FarmSystem({ level: 1, now: 0, random: () => 0 });
  assert.equal(farm.plotCount, 2);
  assert.deepEqual(farm.unlockedAnimals, []);
  farm.setLevel(2, 0);
  assert.equal(farm.plotCount, 4);
  assert.deepEqual(farm.unlockedAnimals, ['egg']);
  farm.setLevel(3, 0);
  assert.deepEqual(farm.unlockedAnimals, ['egg', 'wool']);
  farm.setLevel(4, 0);
  assert.equal(farm.plotCount, 6);
  assert.deepEqual(farm.unlockedAnimals, ['egg', 'wool', 'milk']);
  farm.setLevel(7, 0);
  assert.equal(farm.plotCount, 8);
  assert.deepEqual(farm.unlockedAnimals, ['egg', 'wool', 'milk', 'pork']);
  assert.equal(ANIMAL_PRODUCTS.egg.amount, 2, 'cercado com 2 galinhas');
});

test('farm level 3 harvests 20% faster and level 6 grows 40% faster in the rain', () => {
  const slow = new FarmSystem({ level: 2, now: 0, random: () => 0 });
  const fast = new FarmSystem({ level: 3, now: 0, random: () => 0 });
  assert.equal(slow.cropSeconds('wheat'), 60);
  assert.equal(fast.cropSeconds('wheat'), 48);

  const irrigated = new FarmSystem({ level: 6, now: 0, random: () => 0 });
  irrigated.plant(0, 'wheat', 0);
  const readyAt = irrigated.plots[0].readyAt;
  irrigated.update(1000, 1000, { raining: true });
  assert.equal(irrigated.plots[0].readyAt, readyAt - 400);
  irrigated.update(2000, 1000, { raining: false });
  assert.equal(irrigated.plots[0].readyAt, readyAt - 400);
});

test('a destroyed farm stops growing and a damaged one grows at half speed', () => {
  const farm = new FarmSystem({ level: 2, now: 0, random: () => 0 });
  farm.plant(0, 'herb', 0);
  const readyAt = farm.plots[0].readyAt;
  farm.update(1000, 1000, { efficiency: 0 });
  assert.equal(farm.plots[0].readyAt, readyAt + 1000);
  farm.update(2000, 1000, { efficiency: 0.5 });
  assert.equal(farm.plots[0].readyAt, readyAt + 1500);
});

test('barn (level 5) stores food crops automatically up to 50', () => {
  const farm = new FarmSystem({ level: 5, now: 0, random: () => 0 });
  farm.plant(0, 'wheat', 0);
  farm.plant(1, 'herb', 0);
  const produced = farm.update(60_000, 0, { store: () => ({ stored: {}, remaining: {} }), canStore: () => true });
  assert.equal(produced.barn, 2);
  assert.equal(farm.barn, 2);
  assert.equal(farm.plots[0].crop, null);
  assert.equal(farm.plots[1].crop, 'herb', 'ervas só são colhidas sozinhas no nível 10');
  farm.barn = 50;
  farm.plant(0, 'wheat', 0);
  farm.update(60_000, 0, { canStore: () => false });
  assert.equal(farm.plots[0].crop, 'wheat', 'celeiro cheio e armazém sem espaço: a colheita espera');
});

test('farm level 7 collects eggs and milk automatically and level 9 doubles production', () => {
  const stored = {};
  const store = (bundle) => {
    for (const [type, amount] of Object.entries(bundle)) stored[type] = (stored[type] ?? 0) + amount;
    return { stored: bundle, remaining: {} };
  };
  const farm = new FarmSystem({ level: 7, now: 0, random: () => 0 });
  farm.update(200_000, 0, { store, canStore: () => true });
  assert.equal(stored.egg, 2);
  assert.equal(stored.milk, 1);
  assert.equal(stored.wool, undefined, 'lã continua manual até o nível 10');

  const doubled = new FarmSystem({ level: 9, now: 0, random: () => 0 });
  doubled.plant(0, 'herb', 0);
  const harvest = doubled.harvestPlot(0, 60_000);
  assert.equal(harvest.bundle.herbs, 4);
});

test('farm level 10 auto-harvests everything and makes 5 food per minute', () => {
  const stored = {};
  const store = (bundle) => {
    for (const [type, amount] of Object.entries(bundle)) stored[type] = (stored[type] ?? 0) + amount;
    return { stored: bundle, remaining: {} };
  };
  const farm = new FarmSystem({ level: 10, now: 0, random: () => 0 });
  farm.plant(0, 'herb', 0);
  farm.update(60_000, 60_000, { store, canStore: () => true });
  assert.equal(stored.herbs, 4);
  assert.equal(stored.wool, undefined, 'animais ainda não estavam prontos');
  assert.equal(farm.barn, 5, '5 comidas passivas em 1 minuto vão para o celeiro');
});

test('rare seeds (magic plant) unlock at farm level 8', () => {
  assert.equal(new FarmSystem({ level: 7 }).canPlantCrop('magic'), false);
  const farm = new FarmSystem({ level: 8, now: 0, random: () => 0 });
  assert.equal(farm.canPlantCrop('magic'), true);
  farm.plant(0, 'magic', 0);
  const harvest = farm.harvestPlot(0, 200_000);
  assert.ok(harvest.bundle.herbs > 0 && harvest.bundle.food > 0);
  assert.deepEqual(FARM_CROPS.magic.cost, { seeds: 2, moonherb: 1 });
});

// ---------- Ferreiro ----------

test('forge recipes unlock by forge level as in the spec', () => {
  const levelOf = (id) => FORGE_RECIPES[id].level;
  assert.equal(levelOf('stonePickaxe'), 1);
  assert.deepEqual(FORGE_RECIPES.stonePickaxe.cost, { stone: 3, wood: 2 });
  assert.equal(levelOf('simpleSword'), 1);
  assert.equal(FORGE_RECIPES.simpleSword.attack, 5);
  assert.deepEqual(FORGE_RECIPES.simpleSword.cost, { iron: 2 });
  assert.equal(levelOf('shield'), 2);
  assert.deepEqual(FORGE_RECIPES.shield.cost, { wood: 3, iron: 1 });
  assert.equal(levelOf('ironSword'), 3);
  assert.equal(FORGE_RECIPES.ironSword.attack, 10);
  assert.equal(levelOf('ironPickaxe'), 5);
  assert.deepEqual(FORGE_RECIPES.ironPickaxe.cost, { iron: 5, coal: 1 });
  assert.equal(FORGE_RECIPES.steelSword.attack, 18);
  assert.equal(levelOf('fireEnchant'), 6);
  assert.equal(levelOf('longbow'), 7);
  assert.equal(FORGE_RECIPES.steelArmor.defense, 10);
  assert.equal(levelOf('vampireEnchant'), 8);
  assert.equal(FORGE_RECIPES.legendarySword.attack, 30);
  assert.equal(FORGE_RECIPES.mythicArmor.defense, 20);
  assert.equal(levelOf('dragonScaleArmor'), 10);
  assert.ok(FORGE_RECIPES.dragonBlade.fireResistance > 0);

  const equipment = new EquipmentSystem({ forgeLevel: 1 });
  assert.equal(equipment.craft('stonePickaxe', payAll).ok, true);
  assert.equal(equipment.pickaxeTier, 'stone');
  assert.equal(equipment.craft('shield', payAll).ok, false);
  assert.equal(equipment.craft('stonePickaxe', payAll).ok, false, 'item único');
});

test('only the best weapon, armor and shield count, with durability and upgrades', () => {
  const equipment = new EquipmentSystem({ forgeLevel: 10 });
  for (const id of ['simpleSword', 'ironSword', 'ironArmor', 'shield']) equipment.craft(id, payAll);
  assert.deepEqual(equipment.equipped, { weapon: 'ironSword', armor: 'ironArmor', shield: 'shield' });
  assert.equal(equipment.getBonuses().attack, 10);
  assert.equal(equipment.getBonuses().defense, 7);

  equipment.items.ironSword.durability = 1;
  assert.equal(equipment.wear('weapon'), true, 'quebrou agora');
  assert.equal(equipment.itemValue('ironSword'), 5, 'quebrada vale metade');
  assert.equal(equipment.getBonuses().attack, 5, 'a quebrada (5) empata com a simples (5)');
  assert.deepEqual(equipment.repairCost('ironSword'), { iron: 4 });
  assert.equal(equipment.repair('ironSword', payAll).ok, true);
  assert.equal(equipment.itemValue('ironSword'), 10);

  assert.equal(equipment.upgrade('ironSword', payAll).ok, true);
  assert.equal(equipment.itemValue('ironSword'), 11);
  for (let index = 0; index < 4; index += 1) equipment.upgrade('ironSword', payAll);
  assert.equal(equipment.items.ironSword.upgrade, 5);
  assert.equal(equipment.upgrade('ironSword', payAll).ok, false, 'máximo +5');

  const dismantled = equipment.dismantle('simpleSword');
  assert.equal(dismantled.ok, true);
  assert.deepEqual(dismantled.returned, { iron: 1 });
  assert.equal(equipment.has('simpleSword'), false);
});

test('repair, dismantle and upgrades require the right forge level', () => {
  const equipment = new EquipmentSystem({ forgeLevel: 3 });
  equipment.craft('ironSword', payAll);
  equipment.items.ironSword.durability = 10;
  assert.equal(equipment.repair('ironSword', payAll).ok, false);
  assert.equal(equipment.dismantle('ironSword').ok, false);
  equipment.forgeLevel = 4;
  assert.equal(equipment.repair('ironSword', payAll).ok, true);
  assert.equal(equipment.upgrade('ironSword', payAll).ok, false);
  equipment.forgeLevel = 8;
  assert.equal(equipment.upgrade('ironSword', payAll).ok, true);
});

test('enchantments are crafted, selected and saved', () => {
  const equipment = new EquipmentSystem({ forgeLevel: 8 });
  equipment.craft('fireEnchant', payAll);
  equipment.craft('vampireEnchant', payAll);
  assert.equal(equipment.activeEnchant, 'fire');
  assert.equal(equipment.setActiveEnchant('vampire'), true);
  assert.equal(equipment.setActiveEnchant('ice'), false);
  const restored = new EquipmentSystem({ saved: equipment.serialize(), forgeLevel: 8 });
  assert.equal(restored.activeEnchant, 'vampire');
  assert.deepEqual(restored.ownedEnchants, ['fire', 'vampire']);
});

test('legacy forge saves migrate to the new recipes', () => {
  const equipment = new EquipmentSystem({
    saved: { stonePickaxe: true, ironSword: true, steelChestplate: true, sharpnessEnchantment: true },
    forgeLevel: 3
  });
  assert.equal(equipment.has('simpleSword'), true);
  assert.equal(equipment.has('steelArmor'), true);
  assert.equal(equipment.items.simpleSword.upgrade, 1, 'encantamento antigo virou +1');
  assert.equal(equipment.pickaxeTier, 'stone');
});

// ---------- Mercado ----------

test('market level 1 sells the 4 basic items at the spec prices', () => {
  const market = new MarketSystem({ day: 3, level: 1 });
  assert.deepEqual(market.offers.map((offer) => offer.id).sort(), ['healthPotion', 'seeds', 'torch', 'wood']);
  const prices = Object.fromEntries(market.offers.map((offer) => [offer.id, market.priceOf(MARKET_CATALOG.find((entry) => entry.id === offer.id))]));
  assert.deepEqual(prices, { seeds: 5, healthPotion: 10, torch: 3, wood: 2 });
  assert.equal(market.canSell, false, 'venda só no nível 2');
});

test('market offers, discounts and unlocks grow with the level', () => {
  assert.equal(new MarketSystem({ day: 3, level: 2 }).offers.length, 6);
  assert.equal(new MarketSystem({ day: 3, level: 2 }).canSell, true);
  const level3 = new MarketSystem({ day: 3, level: 3 });
  assert.equal(level3.discount, 0.1);
  assert.ok(level3.unlockedCatalog.some((entry) => entry.id === 'ironBundle'));
  assert.ok(level3.unlockedCatalog.some((entry) => entry.id === 'stoneBundle'));
  assert.equal(new MarketSystem({ day: 3, level: 4 }).offers.length, 8);
  const level5 = new MarketSystem({ day: 3, level: 5 });
  assert.equal(level5.discount, 0.2);
  assert.ok(level5.unlockedCatalog.some((entry) => entry.id === 'staminaPotion'));
  assert.ok(level5.unlockedCatalog.some((entry) => entry.id === 'trap'));
  assert.equal(new MarketSystem({ day: 3, level: 6 }).offers.length, 10);
  assert.equal(new MarketSystem({ day: 3, level: 7 }).discount, 0.3);
  const level10 = new MarketSystem({ day: 3, level: 10 });
  assert.equal(level10.offers.length, MARKET_CATALOG.length, 'todos os itens sempre disponíveis');
  assert.equal(level10.discount, 0.5);
});

test('no discount ever makes buying and reselling profitable', () => {
  const market = new MarketSystem({ day: 1, level: 10 });
  market.reputationSpent = 100_000;
  for (const entry of MARKET_CATALOG) {
    assert.ok(market.priceOf(entry) > resaleValue(entry.yield), `${entry.id} geraria lucro de revenda`);
  }
  assert.ok(MARKET_SELL_PRICES.gold > MARKET_SELL_PRICES.wood);
});

test('market purchases are atomic and selling pays the economy.json price', () => {
  const market = new MarketSystem({ day: 1, level: 2 });
  const inventory = new Inventory();
  const economy = new EconomySystem({ coins: 10 });
  market.offers = [{ id: 'seeds', quantity: 2 }];
  assert.equal(market.buy('seeds', inventory, economy).ok, true);
  assert.equal(economy.coins, 5);
  assert.equal(inventory.items.seeds, 1);

  const full = new Inventory();
  for (const type of Object.keys(full.items).filter((type) => type !== 'seeds').slice(0, 12)) full.add(type, 1);
  const rich = new EconomySystem({ coins: 10 });
  const blocked = market.buy('seeds', full, rich);
  assert.equal(blocked.ok, false);
  assert.equal(rich.coins, 10);

  inventory.add('gold', 1);
  assert.equal(market.sell('gold', inventory, economy).coins, MARKET_SELL_PRICES.gold);
});

test('traveling merchant visits every 5 days (level 4) and every 3 days with epics (level 7)', () => {
  assert.equal(new MarketSystem({ day: 5, level: 4 }).travelerOffers.length, 3);
  assert.equal(new MarketSystem({ day: 6, level: 4 }).travelerOffers.length, 0);
  const epic = new MarketSystem({ day: 6, level: 7 });
  assert.ok(epic.travelerOffers.some((offer) => offer.id === 'elixir'));
});

test('orders (level 8) arrive in storage two days later', () => {
  const market = new MarketSystem({ day: 4, level: 8 });
  const economy = new EconomySystem({ coins: 100 });
  const order = market.placeOrder('goldBundle', economy);
  assert.equal(order.ok, true);
  assert.equal(order.order.readyDay, 6);
  assert.deepEqual(market.advanceDay(5, economy).orders, []);
  assert.deepEqual(market.advanceDay(6, economy).orders, [{ id: 'goldBundle', bundle: { gold: 1 } }]);
});

test('weekly auction (level 9): outbid the rival to win, or get refunded', () => {
  const economy = new EconomySystem({ coins: 1000 });
  const market = new MarketSystem({ day: 7, level: 9 });
  assert.equal(market.hasAuctionToday, true);
  while (!market.playerLeads) assert.equal(market.bid(economy).ok, true);
  const paid = 1000 - economy.coins;
  assert.equal(paid, market.auction.playerBid);
  const result = market.advanceDay(8, economy).auctionResult;
  assert.equal(result.won, true);
  assert.equal(result.item, 'kingAmulet');

  const loser = new MarketSystem({ day: 14, level: 9 });
  const wallet = new EconomySystem({ coins: 80 });
  loser.bid(wallet);
  const lost = loser.advanceDay(15, wallet).auctionResult;
  assert.equal(lost.won, false);
  assert.equal(wallet.coins, 80, 'lance devolvido');
});

// ---------- Casa, Fogueira, clima ----------

test('buffs expire by time or at the end of the day', () => {
  const buffs = new BuffSystem();
  buffs.apply('wellRested', { durationMs: 1000 });
  buffs.apply('dailyAttack', { untilDay: 3 });
  assert.equal(buffs.effects.attackPercent, 0.1);
  assert.equal(buffs.effects.attack, 6);
  assert.equal(buffs.update(1000, 3), true);
  assert.equal(buffs.has('wellRested'), false);
  assert.equal(buffs.has('dailyAttack'), true);
  buffs.update(0, 4);
  assert.equal(buffs.has('dailyAttack'), false);
  const restored = new BuffSystem([{ id: 'warmth', remainingMs: 500, untilDay: null }]);
  assert.equal(restored.effects.attackPercent, 0.1);
});

test('campfire travelers appear every 4 days from level 4 with a quest', () => {
  const travelers = new CampfireTravelers();
  assert.equal(travelers.refresh(4, 3), false, 'Fogueira nível 3 ainda não atrai viajantes');
  assert.equal(travelers.refresh(5, 4), false);
  assert.equal(travelers.refresh(8, 4), true);
  assert.ok(travelers.offeredQuest);
  assert.equal(travelers.goods.length, 2);
  travelers.offeredQuest = 'wolves';
  assert.equal(travelers.acceptQuest(), true);
  for (let kill = 0; kill < 4; kill += 1) travelers.recordKill('wolf');
  travelers.recordKill('slime');
  assert.equal(travelers.activeQuest.progress, 4);
  const reward = travelers.claim({}, payAll);
  assert.equal(reward.coins, 25);
  assert.equal(travelers.activeQuest, null);
});

test('weather is deterministic per day and rains on about a third of the days', () => {
  assert.equal(isRainyDay(12), isRainyDay(12));
  const rainy = Array.from({ length: 300 }, (_, index) => isRainyDay(index + 1)).filter(Boolean).length;
  assert.ok(rainy > 60 && rainy < 140, `dias de chuva: ${rainy}`);
});

test('thirty game minutes can be advanced independently from the real rest delay', () => {
  const cycle = new DayNightCycle({ cycleTime: 0, dayCount: 1 });
  const before = cycle.getState();
  const after = cycle.advanceGameMinutes(30);
  const beforeMinutes = before.hour * 60 + before.minute;
  const afterMinutes = after.hour * 60 + after.minute;
  assert.equal(afterMinutes - beforeMinutes, 30);
});
