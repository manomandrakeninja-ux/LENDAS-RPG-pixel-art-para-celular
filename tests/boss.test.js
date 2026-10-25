import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_CAMP_DISTANCE, BOSS_CONFIG } from '../src/data/boss.js';
import { EquipmentSystem } from '../src/game/EquipmentSystem.js';
import { Inventory } from '../src/game/Inventory.js';
import { RESOURCE_TYPES } from '../src/game/config.js';

test('biome boss has the requested health, damage, distance and three attack patterns', () => {
  assert.equal(BOSS_CONFIG.maxHealth, 500);
  assert.equal(BOSS_CONFIG.damage, 30);
  assert.ok(BOSS_CAMP_DISTANCE > 800);
  assert.deepEqual([...BOSS_CONFIG.patterns], ['charge', 'slam', 'volley']);
  assert.equal(BOSS_CONFIG.coinDrop, 50);
});

test('boss recipe is locked until the boss is defeated and can then be forged', () => {
  const equipment = new EquipmentSystem({ forgeLevel: 1 });
  const inventory = new Inventory();
  inventory.add('titanCore', 1);
  inventory.add('iron', 4);
  inventory.add('gold', 1);

  assert.equal(equipment.canCraft('titanBlade').ok, false);
  assert.equal(equipment.unlockRecipe('titanBlade'), true);
  assert.equal(equipment.isRecipeUnlocked('titanBlade'), true);
  assert.equal(equipment.craft('titanBlade', (cost) => inventory.remove(cost)).ok, true);
  assert.equal(equipment.getBonuses().attack, 22);
  assert.equal(inventory.items.titanCore, 0);
  assert.ok(RESOURCE_TYPES.titanCore);
});
