import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RAID_CONFIG,
  isRaidDay,
  raidComposition,
  raidEliteChance,
  raidReward,
  splitIntoWaves
} from '../src/data/raids.js';

test('raids happen on days 10, 20, 30... with a 30 second warning', () => {
  assert.deepEqual([9, 10, 11, 20, 30, 0].map(isRaidDay), [false, true, false, true, true, false]);
  assert.equal(RAID_CONFIG.warningSeconds, 30);
  assert.equal(RAID_CONFIG.warningText, 'ATAQUE IMINENTE! Prepare o acampamento!');
});

test('day 10 and day 20 waves follow the spec and later days scale up', () => {
  assert.deepEqual(raidComposition(10), { slime: 10, wolf: 5 });
  assert.deepEqual(raidComposition(20), { skeleton: 15, ghost: 8, werewolf: 3 });
  const total = (day) => Object.values(raidComposition(day)).reduce((sum, count) => sum + count, 0);
  assert.ok(total(30) > total(20));
  assert.ok(total(50) > total(30));
  assert.equal(raidEliteChance(20), 0);
  assert.ok(raidEliteChance(40) > raidEliteChance(30));
  assert.ok(raidEliteChance(200) <= 0.5);
});

test('waves split every attacker and mix the enemy types', () => {
  const waves = splitIntoWaves({ slime: 10, wolf: 5 }, 3);
  assert.equal(waves.length, 3);
  assert.equal(waves.flat().length, 15);
  assert.equal(waves.flat().filter((kind) => kind === 'wolf').length, 5);
  for (const wave of waves) assert.ok(wave.includes('wolf') && wave.includes('slime'));
});

test('surviving a raid pays coins and doubled XP', () => {
  assert.deepEqual(raidReward(10, 200), { coins: 60, xp: 400 });
  assert.deepEqual(raidReward(30, 100), { coins: 180, xp: 200 });
});
