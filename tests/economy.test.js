import test from 'node:test';
import assert from 'node:assert/strict';
import { COIN_DROP_RANGES, chestCoins, rollCoinDrop } from '../src/data/economy.js';
import { EconomySystem } from '../src/game/EconomySystem.js';

test('coin drops: common 1-3, night 3-8, elite 10-20 (economy.json)', () => {
  assert.deepEqual(COIN_DROP_RANGES.day, [1, 3]);
  assert.deepEqual(COIN_DROP_RANGES.night, [3, 8]);
  assert.deepEqual(COIN_DROP_RANGES.elite, [10, 20]);
  assert.deepEqual(COIN_DROP_RANGES.boss, [20, 50]);
  assert.equal(rollCoinDrop('day', () => 0), 1);
  assert.equal(rollCoinDrop('day', () => 0.999999), 3);
  assert.equal(rollCoinDrop('night', () => 0), 3);
  assert.equal(rollCoinDrop('night', () => 0.999999), 8);
  assert.equal(rollCoinDrop('day', () => 0, true), 10);
  assert.equal(rollCoinDrop('night', () => 0.999999, true), 20);
  assert.equal(rollCoinDrop('boss', () => 0), 20);
  assert.equal(rollCoinDrop('boss', () => 0.999999), 50);
});

test('coin wallet adds, spends and persists without allowing negative values', () => {
  const economy = new EconomySystem({ coins: 5 });
  assert.equal(economy.addCoins(3), 3);
  assert.equal(economy.coins, 8);
  assert.equal(economy.spendCoins(4), true);
  assert.equal(economy.coins, 4);
  assert.equal(economy.spendCoins(9), false);
  assert.equal(economy.coins, 4);
  assert.deepEqual(economy.serialize(), { coins: 4 });
  assert.equal(new EconomySystem(economy.serialize()).coins, 4);
});

test('chests hold a fixed amount of coins between 10 and 30', () => {
  for (let index = 0; index < 8; index += 1) {
    const coins = chestCoins(`chest-${index}`);
    assert.ok(coins >= 10 && coins <= 30, `chest-${index}: ${coins}`);
    assert.equal(chestCoins(`chest-${index}`), coins);
  }
});
