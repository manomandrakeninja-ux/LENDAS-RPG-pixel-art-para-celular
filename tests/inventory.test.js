import test from 'node:test';
import assert from 'node:assert/strict';
import { Inventory } from '../src/game/Inventory.js';
import { RESOURCE_TYPES } from '../src/game/config.js';

const EMPTY_ITEMS = Object.fromEntries(Object.keys(RESOURCE_TYPES).map((type) => [type, 0]));

test('the real backpack has twelve slots and legacy capacities are upgraded', () => {
  const inventory = new Inventory();
  const legacy = new Inventory({ maxSlots: 6 });

  assert.equal(inventory.maxSlots, 12);
  assert.equal(inventory.totalCapacity, 144);
  assert.equal(legacy.maxSlots, 12);
  assert.equal(legacy.serialize().capacityVersion, 3);
});

test('a twelfth resource type fills the backpack and rejects the thirteenth', () => {
  const inventory = new Inventory();
  const types = Object.keys(RESOURCE_TYPES);

  for (const type of types.slice(0, 12)) {
    assert.equal(inventory.add(type, 1), true, `deveria aceitar ${type}`);
  }
  assert.equal(inventory.usedSlots, 12);
  assert.equal(inventory.isFull, true);
  assert.equal(inventory.add(types[12], 1), false);
  assert.equal(inventory.add(types[0], 1), false);
  assert.equal(inventory.items[types[12]], 0);
});

test('malformed or legacy overflow is preserved for migration into storage', () => {
  const inventory = new Inventory({
    capacityVersion: 3,
    maxSlots: 12,
    items: Object.fromEntries(Object.keys(RESOURCE_TYPES).map((type) => [type, 1]))
  });
  const overflow = inventory.takeMigrationOverflow();

  assert.equal(inventory.usedSlots, 12);
  assert.equal(inventory.total, 12);
  const overflowTypeCount = Object.keys(RESOURCE_TYPES).length - 12;
  assert.equal(Object.keys(overflow).length, overflowTypeCount);
  assert.equal(Object.values(overflow).reduce((sum, amount) => sum + amount, 0), overflowTypeCount);
  assert.deepEqual(inventory.takeMigrationOverflow(), {});
});

test('inventory respects slot and total carrying limits', () => {
  const inventory = new Inventory({ capacityVersion: 3, maxSlots: 1 });

  assert.equal(inventory.add('wood', 12), true);
  assert.equal(inventory.add('wood'), false);
  assert.equal(inventory.add('stone'), false);
  assert.equal(inventory.usedSlots, 1);
  assert.equal(inventory.total, 12);
});

test('removing a cost is atomic when resources are insufficient', () => {
  const inventory = new Inventory();
  inventory.add('wood', 4);
  inventory.add('stone', 2);

  assert.equal(inventory.remove({ wood: 5, stone: 1 }), false);
  assert.equal(inventory.items.wood, 4);
  assert.equal(inventory.items.stone, 2);
  assert.equal(inventory.remove({ wood: 3, stone: 2 }), true);
  assert.equal(inventory.items.wood, 1);
  assert.equal(inventory.items.stone, 0);
});

test('saved inventory preserves capacity and resource counts', () => {
  const original = new Inventory({ capacityVersion: 3, maxSlots: 8 });
  original.add('herbs', 5);
  original.add('moonherb', 2);

  const restored = new Inventory(original.serialize());
  assert.equal(restored.maxSlots, 8);
  assert.equal(restored.unitsPerSlot, 12);
  assert.equal(restored.items.herbs, 5);
  assert.equal(restored.items.moonherb, 2);
  assert.equal(restored.usedSlots, 2);
});

test('bundle capacity checks are atomic before collecting chest loot', () => {
  const inventory = new Inventory({ capacityVersion: 3, maxSlots: 1 });
  assert.equal(inventory.canAddBundle({ wood: 2, stone: 3 }), false);

  inventory.add('wood', 1);
  assert.equal(inventory.canAddBundle({ wood: 2 }), false);
  assert.equal(inventory.canAddBundle({ wood: 2, stone: 1 }), false);

  const full = new Inventory({ capacityVersion: 3, maxSlots: 1 });
  full.add('wood', 12);
  assert.equal(full.canAddBundle({ stone: 1 }), false);
});

test('bundle delivery keeps leftovers instead of silently losing resources', () => {
  const inventory = new Inventory({ capacityVersion: 3, maxSlots: 1 });
  const result = inventory.addBundle({ wood: 2, bone: 3 });

  assert.deepEqual(result.accepted, { wood: 2 });
  assert.deepEqual(result.remaining, { bone: 3 });
  assert.equal(inventory.items.wood, 2);
});

test('death removes only the configured fraction of carried resources', () => {
  const inventory = new Inventory();
  inventory.add('wood', 10);
  inventory.add('food', 5);

  const removed = inventory.removeFraction(0.4);
  assert.deepEqual(removed, { wood: 4, food: 2 });
  assert.equal(inventory.items.wood, 6);
  assert.equal(inventory.items.food, 3);
  assert.deepEqual(inventory.serialize().items, {
    ...EMPTY_ITEMS,
    wood: 6,
    food: 3
  });
});
