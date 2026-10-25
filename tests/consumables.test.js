import test from 'node:test';
import assert from 'node:assert/strict';
import { CONSUMABLES, itemForHotkey, useConsumable } from '../src/data/consumables.js';
import { Inventory } from '../src/game/Inventory.js';

const makePlayer = (health = 40, maxHealth = 100) => ({ health, maxHealth, torchTimer: 0 });

test('a potion heals, is consumed and never exceeds max health', () => {
  const inventory = new Inventory();
  inventory.add('potion', 2);
  const player = makePlayer(80);

  const result = useConsumable('potion', inventory, player);
  assert.equal(result.ok, true);
  assert.equal(result.healed, 20);
  assert.equal(player.health, 100);
  assert.equal(inventory.items.potion, 1);
});

test('healing items are kept when health is already full', () => {
  const inventory = new Inventory();
  inventory.add('food', 1);
  const player = makePlayer(100);

  assert.deepEqual(useConsumable('food', inventory, player), { ok: false, reason: 'full-health' });
  assert.equal(inventory.items.food, 1);
});

test('missing and non-consumable items are rejected without side effects', () => {
  const inventory = new Inventory();
  inventory.add('wood', 3);
  const player = makePlayer();

  assert.equal(useConsumable('potion', inventory, player).reason, 'missing');
  assert.equal(useConsumable('wood', inventory, player).reason, 'not-consumable');
  assert.equal(inventory.items.wood, 3);
  assert.equal(player.health, 40);
});

test('a torch starts the light timer and is consumed', () => {
  const inventory = new Inventory();
  inventory.add('torch', 1);
  const player = makePlayer();

  const result = useConsumable('torch', inventory, player);
  assert.equal(result.ok, true);
  assert.equal(player.torchTimer, CONSUMABLES.torch.durationMs);
  assert.equal(inventory.items.torch, 0);
});

test('food hotkey prefers food, then milk, then egg', () => {
  assert.equal(itemForHotkey('2', { food: 1, milk: 1, egg: 1 }), 'food');
  assert.equal(itemForHotkey('2', { food: 0, milk: 0, egg: 2 }), 'egg');
  assert.equal(itemForHotkey('2', {}), null);
  assert.equal(itemForHotkey('1', { potion: 1 }), 'potion');
});
