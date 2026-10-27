import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GEAR_ITEMS, GEAR_SETS, GEAR_SLOTS, RARITIES, SHOP_MAX_LEVEL, blessingPrice, gearPoolForLevel, gearSellPrice, gearStats, regionGearPool, rollGearDrop
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
  for (let level = 1; level <= 150; level += 1) assert.ok(gearPoolForLevel(level).length >= 4, `nível ${level}`);
  for (const cave of CAVES) assert.ok(Object.values(GEAR_ITEMS).some((item) => item.boss === cave.boss), cave.boss);
  for (const item of Object.values(GEAR_ITEMS)) {
    assert.ok(GEAR_SLOTS.includes(item.slot), item.id);
    assert.ok(item.level >= 1 && item.level <= 150, item.id);
    assert.ok(item.colors?.length === 2, item.id);
  }
});

test('equipamento: raridade aumenta os atributos e o preço de venda', () => {
  const common = gearStats('glacial-chest', 'common');
  const rare = gearStats('glacial-chest', 'rare');
  assert.equal(common.defense, GEAR_ITEMS['glacial-chest'].defense);
  assert.ok(rare.defense > common.defense);
  assert.ok(gearSellPrice('glacial-chest', 'rare') > gearSellPrice('glacial-chest', 'common'));
  assert.ok(RARITIES.legendary);
});

test('equipamento: vestir pede nível, conjunto completo liga o bônus e cobre a Forja', () => {
  const gear = new GearSystem();
  const pieces = ['glacial-helmet', 'glacial-chest', 'glacial-legs', 'glacial-boots'].map((id) => gear.add(id));
  assert.equal(gear.equip(pieces[0].uid, 5).ok, false, 'nível baixo');
  for (const piece of pieces) assert.equal(gear.equip(piece.uid, 56).ok, true);
  assert.deepEqual(gear.activeSets(), ['glacial']);
  assert.equal(gear.bonuses().defense, pieces.reduce((sum, piece) => sum + GEAR_ITEMS[piece.id].defense, 0) + GEAR_SETS.glacial.bonus.defense);
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

test('tiers: 18 conjuntos, ~170 peças, ~45 armas, bônus e preços crescem com o tier', () => {
  const items = Object.values(GEAR_ITEMS);
  assert.equal(Object.keys(GEAR_SETS).length, 18);
  assert.ok(items.length >= 165 && items.length <= 185, String(items.length));
  const weapons = items.filter((item) => item.slot === 'weapon').length;
  assert.ok(weapons >= 42 && weapons <= 50, String(weapons));
  const sets = Object.values(GEAR_SETS).sort((a, b) => a.level - b.level);
  assert.equal(sets[0].level, 1);
  assert.equal(sets.at(-1).level, 150);
  for (let i = 1; i < sets.length; i += 1) {
    assert.ok(sets[i].level > sets[i - 1].level);
    for (const stat of Object.keys(sets[i].bonus)) if (sets[i - 1].bonus[stat]) assert.ok(sets[i].bonus[stat] >= sets[i - 1].bonus[stat], stat);
  }
  assert.ok(GEAR_ITEMS['titanico-chest'].defense > GEAR_ITEMS['ferro-chest'].defense * 4);
  assert.ok(GEAR_ITEMS['titanico-weapon-a'].attack > GEAR_ITEMS['ferro-weapon-a'].attack * 5);
  assert.ok(gearSellPrice('titanico-chest') > gearSellPrice('ferro-chest') * 20);
  // Ids antigos continuam existindo (saves).
  for (const id of ['couro-helmet', 'glacial-chest', 'vulcanico-boots', 'rustyDagger', 'magmaBlade', 'dragonClaw', 'abyssBlade', 'wardAmulet', 'kingRing', 'iceShield', 'scarabAmulet']) {
    assert.ok(GEAR_ITEMS[id], id);
  }
  assert.equal(GEAR_ITEMS.abyssBlade.level, 150);
  // Loja: só tiers até o nível 30.
  const shop = items.filter((item) => item.shop);
  assert.ok(shop.length > 10);
  for (const item of shop) assert.ok(item.level <= SHOP_MAX_LEVEL || item.id === 'wardAmulet', item.id);
  assert.ok(!GEAR_ITEMS['mithril-chest'].shop);
});

test('lança de arremesso: 3 tiers, alcance 4 e chance de quebrar ao acertar', () => {
  const spears = ['throwSpear1', 'throwSpear2', 'throwSpear3'].map((id) => GEAR_ITEMS[id]);
  for (const spear of spears) {
    assert.equal(spear.slot, 'weapon');
    assert.equal(spear.thrown, true);
    assert.equal(spear.range, 4);
    assert.ok(spear.breakChance > 0 && spear.breakChance < 1);
  }
  assert.ok(spears[2].attack > spears[1].attack && spears[1].attack > spears[0].attack);
  const gear = new GearSystem();
  const spear = gear.add('throwSpear1');
  gear.equip(spear.uid, 10);
  assert.equal(gear.rollThrownBreak(() => 0.99), null, 'não quebra');
  assert.ok(gear.find(spear.uid));
  assert.equal(gear.rollThrownBreak(() => 0).id, 'throwSpear1');
  assert.equal(gear.find(spear.uid), null);
  assert.equal(gear.equipped.weapon, null);
  const sword = gear.add('rustyDagger');
  gear.equip(sword.uid, 1);
  assert.equal(gear.rollThrownBreak(() => 0), null, 'arma comum nunca quebra');
});

test('drops por nível: o monstro só deixa peças da faixa dele; chefes, do nível deles', () => {
  const low = rollGearDrop({ region: 'vale', level: 5, elite: true }, sequence(0.1, 0.5, 0.1));
  assert.ok(GEAR_ITEMS[low[0].id].level <= 5);
  const high = rollGearDrop({ region: 'brasa', level: 140, elite: true }, sequence(0.1, 0.5, 0.1));
  assert.ok(GEAR_ITEMS[high[0].id].level >= 77 && GEAR_ITEMS[high[0].id].level <= 140);
  for (const item of gearPoolForLevel(60)) assert.ok(item.level <= 60 && item.level >= 33, item.id);
  // Sem nível do monstro, vale o topo da faixa da região.
  assert.ok(regionGearPool('gelo').every((item) => item.level <= 75));
  for (const [region, level, boss] of [['antiga', 30, 'orcChief'], ['brasa', 120, 'dragon'], ['brasa', 150, 'abyssLord']]) {
    const drops = rollGearDrop({ region, level, boss }, sequence(0.9, 0.2, 0.7, 0.3));
    assert.equal(drops.length, 2);
    for (const drop of drops) assert.ok(GEAR_ITEMS[drop.id].level >= level * 0.75 - 1 && GEAR_ITEMS[drop.id].level <= level, drop.id);
    const lucky = rollGearDrop({ region, level, boss }, sequence(0.1, 0.2, 0.3, 0.7));
    assert.equal(GEAR_ITEMS[lucky[0].id].boss, boss);
  }
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
