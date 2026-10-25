import test from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_TYPES } from '../src/data/enemies.js';
import { PlayerProgression, xpRequiredForLevel } from '../src/data/progression.js';

test('XP levels the player and queues one attribute choice per level', () => {
  const progression = new PlayerProgression();
  const result = progression.addXp(100);

  assert.equal(result.leveledUp, true);
  assert.equal(result.levelsGained, 1);
  assert.equal(progression.level, 2);
  assert.equal(progression.xp, 0);
  assert.equal(progression.maxHealth, 110);
  assert.equal(progression.hasPendingChoice, true);
  assert.equal(progression.nextChoiceLevel, 2);

  const choice = progression.choose('attack');
  assert.equal(choice.applied, true);
  assert.equal(progression.attackBonus, 2);
  assert.equal(progression.defenseBonus, 0);
  assert.equal(progression.hasPendingChoice, false);
});

test('XP thresholds increase by level and progression never exceeds level 20', () => {
  assert.equal(xpRequiredForLevel(1), 100);
  assert.equal(xpRequiredForLevel(2), 150);
  assert.equal(xpRequiredForLevel(20), 1050);

  const progression = new PlayerProgression();
  progression.addXp(100000);
  assert.equal(progression.level, 20);
  assert.equal(progression.xp, 0);
  assert.equal(progression.xpToNext, 0);
  assert.equal(progression.xpRatio, 1);
  assert.equal(progression.pendingLevels.length, 19);

  progression.addXp(1000);
  assert.equal(progression.level, 20);
  assert.equal(progression.pendingLevels.length, 19);
});

test('progression state survives serialization including pending choices', () => {
  const progression = new PlayerProgression({
    baseMaxHealth: 100,
    level: 3,
    xp: 25,
    attackPoints: 1,
    defensePoints: 2,
    pendingLevels: [4]
  });
  const restored = new PlayerProgression(progression.serialize());

  assert.equal(restored.level, 3);
  assert.equal(restored.xp, 25);
  assert.equal(restored.attackBonus, 2);
  assert.equal(restored.defenseBonus, 4);
  assert.equal(restored.maxHealth, 120);
  assert.deepEqual(restored.pendingLevels, [4]);
});

test('milestone levels queue a perk choice after the attribute choice', () => {
  const progression = new PlayerProgression();
  progression.addXp(xpRequiredForLevel(1) + xpRequiredForLevel(2) + xpRequiredForLevel(3) + xpRequiredForLevel(4));
  assert.equal(progression.level, 5);
  assert.deepEqual(progression.pendingPerks, [5]);

  const offer = progression.perkOffer();
  assert.equal(offer.length, 3);
  assert.equal(progression.choosePerk(offer[0]).applied, false, 'atributos pendentes vêm primeiro');
  for (let index = 0; index < 4; index += 1) progression.choose('defense');
  assert.equal(progression.hasPendingChoice, true);
  assert.equal(progression.choosePerk('not-a-perk').applied, false);
  assert.equal(progression.choosePerk(offer[0]).applied, true);
  assert.equal(progression.hasPerk(offer[0]), true);
  assert.equal(progression.hasPendingChoice, false);
  assert.equal(progression.perkOffer(10).includes(offer[0]), false);
});

test('vitality perk raises max health and perks survive serialization', () => {
  const progression = new PlayerProgression({ level: 5, perks: ['vitality'], pendingPerks: [] });
  assert.equal(progression.maxHealth, 100 + 4 * 10 + 25);
  const restored = new PlayerProgression(progression.serialize());
  assert.deepEqual(restored.perks, ['vitality']);
  assert.equal(restored.hasPendingPerk, false);
});

test('saves from before perks receive the milestone choices they already passed', () => {
  const legacy = new PlayerProgression({ level: 11, xp: 0 });
  assert.deepEqual(legacy.pendingPerks, [5, 10]);
  assert.equal(legacy.hasPendingChoice, true);
});

test('enemy XP values follow the requested day and night progression', () => {
  assert.equal(ENEMY_TYPES.slime.xp, 10);
  assert.equal(ENEMY_TYPES.wolf.xp, 20);
  assert.equal(ENEMY_TYPES.boar.xp, 25);
  assert.equal(ENEMY_TYPES.skeleton.xp, 30);
  assert.equal(ENEMY_TYPES.ghost.xp, 35);
  assert.equal(ENEMY_TYPES.spider.xp, 40);
  assert.equal(ENEMY_TYPES.werewolf.xp, 50);
});
