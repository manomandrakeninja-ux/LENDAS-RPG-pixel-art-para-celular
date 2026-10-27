import assert from 'node:assert/strict';
import test from 'node:test';
import { GEAR_ITEMS, gearStats } from '../src/data/gear.js';
import { ENHANCE_BONUS, MAX_ENHANCE, enhanceChance, enhanceCost, rollJewelDrop, socketCount } from '../src/data/enhance.js';
import { GearSystem } from '../src/game/GearSystem.js';

test('aprimorar: cada nível soma 6% e custa mais', () => {
  const base = gearStats('glacial-chest', 'common');
  const plus10 = gearStats('glacial-chest', 'common', 10);
  assert.ok(plus10.defense >= Math.round(base.defense * (1 + ENHANCE_BONUS * MAX_ENHANCE)) - 1);
  assert.ok(gearStats('glacial-chest', 'common', 1).defense > base.defense);
  assert.ok(enhanceCost(50, 6).iron > enhanceCost(50, 2).iron);
  for (let target = 1; target < 5; target += 1) assert.equal(enhanceChance(target), 1);
  assert.ok(enhanceChance(10) < enhanceChance(5) && enhanceChance(5) < 1);
});

test('aprimorar: falha só do +5 em diante, volta 1 nível e nunca quebra', () => {
  const gear = new GearSystem();
  const item = gear.add('glacial-chest', 'common');
  for (let step = 1; step <= 4; step += 1) assert.ok(gear.enhance(item.uid, () => 0.999).success);
  assert.equal(item.upgrade, 4);
  const fail = gear.enhance(item.uid, () => 0.999);
  assert.ok(fail.ok && !fail.success);
  assert.equal(item.upgrade, 3);
  assert.ok(gear.find(item.uid));
  item.upgrade = MAX_ENHANCE;
  assert.equal(gear.enhance(item.uid).ok, false);
  assert.equal(gear.enhanceCostFor(item.uid), null);
});

test('joias: encaixes por raridade, atributos e devolução ao vender', () => {
  assert.equal(socketCount('chest', 'common'), 1);
  assert.equal(socketCount('weapon', 'uncommon'), 2);
  assert.equal(socketCount('helmet', 'rare'), 3);
  assert.equal(socketCount('ring', 'rare'), 0);
  const gear = new GearSystem();
  const item = gear.add('glacial-chest', 'rare');
  assert.equal(item.sockets.length, 3);
  assert.equal(gear.socketJewel(item.uid, 'fire').ok, false);
  gear.addJewel('fire'); gear.addJewel('life'); gear.addJewel('crit');
  for (const type of ['fire', 'life', 'crit']) assert.ok(gear.socketJewel(item.uid, type).ok);
  assert.equal(gear.socketJewel(item.uid, 'fire').ok, false);
  gear.equip(item.uid, 150);
  const plain = gearStats('glacial-chest', 'rare');
  const bonus = gear.bonuses();
  assert.ok(bonus.attack > 0 && bonus.maxHealth > 0 && bonus.critChance > 0 && bonus.defense === plain.defense);
  assert.ok(gear.unsocketJewel(item.uid, 0).ok);
  assert.equal(gear.jewels.fire, 1);
  gear.remove(item.uid);
  assert.equal(gear.jewels.life, 1);
});

test('joias e aprimoramento: save ida e volta; save antigo continua válido', () => {
  const gear = new GearSystem();
  const item = gear.add('glacial-chest', 'uncommon');
  item.upgrade = 3;
  gear.addJewel('ice', 2);
  gear.socketJewel(item.uid, 'ice');
  const copy = new GearSystem(JSON.parse(JSON.stringify(gear.serialize())));
  assert.equal(copy.find(item.uid).upgrade, 3);
  assert.deepEqual(copy.find(item.uid).sockets, ['ice', null]);
  assert.equal(copy.jewels.ice, 1);
  const old = new GearSystem({ bag: [{ uid: 5, id: 'glacial-chest', rarity: 'rare' }], equipped: { chest: 5 }, nextUid: 6 });
  assert.equal(old.find(5).upgrade, 0);
  assert.equal(old.find(5).sockets.length, 3);
  assert.deepEqual(old.bonuses().defense, gearStats('glacial-chest', 'rare').defense);
});

test('joias: queda de inimigo comum, elite e chefe', () => {
  assert.deepEqual(rollJewelDrop({}, () => 0.99), []);
  assert.equal(rollJewelDrop({}, () => 0.01).length, 1);
  assert.equal(rollJewelDrop({ elite: true }, () => 0.15).length, 1);
  assert.equal(rollJewelDrop({ boss: true }, () => 0.5).length, 2);
  assert.ok(GEAR_ITEMS['glacial-chest']);
});
