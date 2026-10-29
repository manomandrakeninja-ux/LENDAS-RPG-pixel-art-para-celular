import test from 'node:test';
import assert from 'node:assert/strict';
import { Inventory } from '../src/game/Inventory.js';
import { INVENTORY_CONFIG } from '../src/game/config.js';
import { formatCount } from '../src/game/formatCount.js';
import { freeUnitsFor, slotsUsed } from '../src/game/storageSlots.js';
import { BUILDING_DEFS } from '../src/data/buildings.js';
import { migrateSave } from '../src/game/save.js';

test('a backpack slot holds 1000 and a storage slot 9999', () => {
  assert.equal(INVENTORY_CONFIG.unitsPerSlot, 1000);
  assert.equal(BUILDING_DEFS.house.storageStackSize, 9999);
});

test('backpack stacks: 1000 in one slot, 1001 needs two', () => {
  const inventory = new Inventory({}, { maxSlots: 2 });
  assert.equal(inventory.add('wood', 1000), true);
  assert.equal(inventory.usedSlots, 1);
  assert.equal(inventory.add('wood', 1), true);
  assert.equal(inventory.usedSlots, 2);
  assert.equal(inventory.freeUnitsFor('wood'), 999);
  assert.equal(inventory.freeUnitsFor('stone'), 0);
  assert.equal(inventory.add('wood', 1000), false);
  assert.equal(inventory.add('wood', 999), true);
  assert.equal(inventory.isFull, true);
});

test('storage slots hold 9999 per type', () => {
  assert.equal(slotsUsed({ wood: 9999 }, 9999), 1);
  assert.equal(slotsUsed({ wood: 10000 }, 9999), 2);
  assert.equal(freeUnitsFor({ wood: 9990 }, 'wood', 1, 9999), 9);
});

test('old saves (12 per slot, small counts) load intact with the new stack size', () => {
  const inventory = new Inventory({ capacityVersion: 3, maxSlots: 12, unitsPerSlot: 12, items: { wood: 40, stone: 7 } });
  assert.equal(inventory.unitsPerSlot, 1000);
  assert.equal(inventory.items.wood, 40);
  assert.equal(inventory.usedSlots, 2);
  assert.deepEqual(inventory.takeMigrationOverflow(), {});
  const migrated = migrateSave({ version: 2, inventory: { unitsPerSlot: 12, items: { wood: 5 } } });
  assert.equal(migrated.inventory.unitsPerSlot, 1000);
});

test('large quantities are shown readably', () => {
  assert.equal(formatCount(7), '7');
  assert.equal(formatCount(1000), '1000');
  assert.equal(formatCount(9999), '9999');
  assert.equal(formatCount(12000), '12k');
  assert.equal(formatCount(12345), '12,3k');
  assert.equal(formatCount(1200000), '1,2M');
});
