import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GEAR_ITEMS, GEAR_SETS, GEAR_SLOTS, RARITIES, blessingPrice, gearSellPrice, gearStats, regionGearPool, rollGearDrop
} from '../src/data/gear.js';
import { GearSystem } from '../src/game/GearSystem.js';
import { CAVES, REGION_SPAWNS } from '../src/data/worldRegions.js';
import { CONSUMABLES, itemForHotkey, useConsumable } from '../src/data/consumables.js';

const sequence = (...values) => {
  let index = 0;
  return () => values[index++ % values.length];
};

test('equipamento: todo conjunto tem as 4 peças e toda região tem o que dropar', () => {
  for (const set of Object.keys(GEAR_SETS)) {
    const slots = Object.values(GEAR_ITEMS).filter((item) => item.set === set).map((item) => item.slot).sort();
    assert.deepEqual(slots, ['boots', 'chest', 'helmet', 'legs'], set);
  }
  for (const region of ['vale', ...Object.keys(REGION_SPAWNS)]) assert.ok(regionGearPool(region).length >= 4, region);
  for (const cave of CAVES) assert.ok(Object.values(GEAR_ITEMS).some((item) => item.boss === cave.boss), cave.boss);
  for (const item of Object.values(GEAR_ITEMS)) {
    assert.ok(GEAR_SLOTS.includes(item.slot), item.id);
    assert.ok(item.level >= 1 && item.level <= 20, item.id);
    assert.ok(item.colors?.length === 2, item.id);
  }
});

test('equipamento: raridade aumenta os atributos e o preço de venda', () => {
  const common = gearStats('glacial-chest', 'common');
  const rare = gearStats('glacial-chest', 'rare');
  assert.equal(common.defense, 9);
  assert.ok(rare.defense > common.defense);
  assert.ok(gearSellPrice('glacial-chest', 'rare') > gearSellPrice('glacial-chest', 'common'));
  assert.ok(RARITIES.legendary);
});

test('equipamento: vestir pede nível, conjunto completo liga o bônus e cobre a Forja', () => {
  const gear = new GearSystem();
  const pieces = ['glacial-helmet', 'glacial-chest', 'glacial-legs', 'glacial-boots'].map((id) => gear.add(id));
  assert.equal(gear.equip(pieces[0].uid, 5).ok, false, 'nível baixo');
  for (const piece of pieces) assert.equal(gear.equip(piece.uid, 12).ok, true);
  assert.deepEqual(gear.activeSets(), ['glacial']);
  assert.equal(gear.bonuses().defense, 5 + 9 + 6 + 4 + GEAR_SETS.glacial.bonus.defense);
  assert.deepEqual([...gear.forgeOverrides()], ['armor']);
  assert.equal(gear.loose.length, 0);
  assert.equal(gear.unequip('legs').ok, true);
  assert.deepEqual(gear.activeSets(), []);
  const restored = new GearSystem(JSON.parse(JSON.stringify(gear.serialize())));
  assert.equal(restored.equippedItem('chest').id, 'glacial-chest');
  assert.equal(restored.equippedItem('legs'), null);
});

test('equipamento: sacola cheia recusa peças; vender devolve moedas', () => {
  const gear = new GearSystem();
  let last = null;
  while (!gear.isFull) last = gear.add('couro-boots');
  assert.equal(gear.add('couro-boots'), null);
  const sold = gear.remove(last.uid);
  assert.equal(sold.coins, gearSellPrice('couro-boots'));
  assert.equal(gear.isFull, false);
});

test('morte: bênção é gasta primeiro; depois o Amuleto de Proteção se quebra', () => {
  const gear = new GearSystem();
  const amulet = gear.add('wardAmulet');
  gear.equip(amulet.uid, 1);
  gear.blessed = true;
  assert.equal(gear.consumeDeathProtection(), 'blessing');
  assert.equal(gear.protectedOnDeath, true);
  assert.equal(gear.consumeDeathProtection(), 'amulet');
  assert.equal(gear.find(amulet.uid), null);
  assert.equal(gear.consumeDeathProtection(), null);
  assert.ok(blessingPrice(20) > blessingPrice(1));
});

test('drops: comuns raros, elites mais, chefes sempre deixam 2 peças', () => {
  assert.deepEqual(rollGearDrop({ region: 'gelo' }, sequence(0.9)), []);
  const elite = rollGearDrop({ region: 'gelo', elite: true }, sequence(0.1, 0.5, 0.1));
  assert.equal(elite.length, 1);
  assert.equal(GEAR_ITEMS[elite[0].id].region, 'gelo');
  const boss = rollGearDrop({ region: 'brasa', boss: 'dragon' }, sequence(0.1, 0.2, 0.3, 0.7));
  assert.equal(boss.length, 2);
  assert.equal(boss[0].rarity, 'legendary');
  assert.equal(GEAR_ITEMS[boss[0].id].boss, 'dragon');
});

test('poções: a tecla 1 escolhe a menor que basta e respeita o nível', () => {
  const items = { potion: 2, potionStrong: 2, potionGreat: 2 };
  assert.equal(itemForHotkey('1', items, { level: 20, missingHealth: 40 }), 'potion');
  assert.equal(itemForHotkey('1', items, { level: 20, missingHealth: 100 }), 'potionStrong');
  assert.equal(itemForHotkey('1', items, { level: 20, missingHealth: 999 }), 'potionGreat');
  assert.equal(itemForHotkey('1', items, { level: 10, missingHealth: 999 }), 'potionStrong');
  const inventory = { items: { potionGreat: 1 }, remove() {} };
  const result = useConsumable('potionGreat', inventory, { health: 10, maxHealth: 400, level: 3 });
  assert.equal(result.reason, 'level');
  assert.equal(CONSUMABLES.potionGreat.level, 15);
});
