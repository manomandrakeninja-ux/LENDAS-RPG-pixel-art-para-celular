import test from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_TYPES, enemyXp } from '../src/data/enemies.js';
import { LEVEL_CHOICES, PERK_LEVELS, PlayerProgression, xpRequiredForLevel } from '../src/data/progression.js';

test('XP levels the player and queues one choice per level (+15 vida, +3 ataque, +2 defesa)', () => {
  const progression = new PlayerProgression();
  const result = progression.addXp(100);

  assert.equal(result.leveledUp, true);
  assert.equal(result.levelsGained, 1);
  assert.equal(progression.level, 2);
  assert.equal(progression.xp, 0);
  assert.equal(progression.maxHealth, 100, 'a vida só sobe se o jogador escolher');
  assert.equal(progression.hasPendingChoice, true);
  assert.equal(progression.nextChoiceLevel, 2);

  assert.equal(progression.choose('attack').applied, true);
  assert.equal(progression.attackBonus, 3);
  progression.addXp(200);
  assert.equal(progression.choose('health').applied, true);
  assert.equal(progression.maxHealth, 115);
  progression.addXp(300);
  assert.equal(progression.choose('defense').applied, true);
  assert.equal(progression.defenseBonus, 2);
  assert.equal(progression.choose('speed').applied, false);
  assert.deepEqual(Object.fromEntries(Object.entries(LEVEL_CHOICES).map(([key, choice]) => [key, choice.amount])),
    { health: 15, attack: 3, defense: 2 });
});

test('XP to level up is level × 100 up to 20, steeper after, and progression stops at level 150', () => {
  assert.equal(xpRequiredForLevel(1), 100);
  assert.equal(xpRequiredForLevel(2), 200);
  assert.equal(xpRequiredForLevel(19), 1900);
  assert.equal(xpRequiredForLevel(20), 2000);
  assert.equal(xpRequiredForLevel(50), 50 * 100 * 2);
  assert.ok(xpRequiredForLevel(149) > xpRequiredForLevel(100));

  const progression = new PlayerProgression();
  progression.addXp(1_000_000_000);
  assert.equal(progression.level, 150);
  assert.equal(progression.xp, 0);
  assert.equal(progression.xpToNext, 0);
  assert.equal(progression.xpRatio, 1);
  assert.equal(progression.pendingLevels.length, 149);
  assert.deepEqual(progression.pendingPerks, PERK_LEVELS);
  assert.equal(progression.hasLegendAura, true);

  progression.addXp(1000);
  assert.equal(progression.level, 150);
  assert.equal(progression.pendingLevels.length, 149);
});

test('late perks change health, attack, defense, damage, coins and XP', () => {
  const base = new PlayerProgression({ version: 2, level: 60, perks: [], pendingPerks: [] });
  const strong = new PlayerProgression({ version: 2, level: 60, perks: ['giant', 'titan', 'warlord', 'fortress', 'critical', 'fury', 'goldfinder', 'scholar'], pendingPerks: [] });
  assert.equal(strong.maxHealth, Math.round((base.maxHealth + 60) * 1.12));
  assert.equal(strong.attackBonus, base.attackBonus + 15);
  assert.equal(strong.defenseBonus, base.defenseBonus + 15);
  assert.equal(strong.coinMultiplier, 1.3);
  assert.equal(strong.damageMultiplier(1, () => 0.99), 1);
  assert.equal(strong.damageMultiplier(0.2, () => 0.99), 1.4);
  assert.ok(Math.abs(strong.damageMultiplier(0.2, () => 0) - 2.8) < 1e-9);
  assert.equal(strong.addXp(100).gained, 115);
  // Todo marco precisa ter ao menos 3 talentos para escolher.
  const all = new PlayerProgression({ version: 2, level: 150, perks: [], pendingPerks: [] });
  for (const level of PERK_LEVELS) {
    const offer = all.perkOffer(level);
    assert.equal(offer.length, 3, `marco ${level}`);
    all.perks.push(offer[0]);
  }
});

test('progression state survives serialization including pending choices', () => {
  const progression = new PlayerProgression({ version: 2, level: 3, xp: 25, attackPoints: 1, defensePoints: 2, healthPoints: 1, pendingLevels: [4] });
  const restored = new PlayerProgression(progression.serialize());

  assert.equal(restored.level, 3);
  assert.equal(restored.xp, 25);
  assert.equal(restored.attackBonus, 3);
  assert.equal(restored.defenseBonus, 4);
  assert.equal(restored.maxHealth, 115);
  assert.deepEqual(restored.pendingLevels, [4]);
});

test('saves from the old progression keep every bonus they had', () => {
  // Antes: +10 de vida automático por nível e +2 por ponto de ataque/defesa.
  const legacy = new PlayerProgression({ level: 4, xp: 10, attackPoints: 2, defensePoints: 1, pendingLevels: [], perks: [] });
  assert.equal(legacy.maxHealth, 130);
  assert.equal(legacy.attackBonus, 4);
  assert.equal(legacy.defenseBonus, 2);
  const restored = new PlayerProgression(legacy.serialize());
  assert.equal(restored.maxHealth, 130);
  assert.equal(restored.attackBonus, 4);
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
  const progression = new PlayerProgression({ version: 2, level: 5, perks: ['vitality'], pendingPerks: [] });
  assert.equal(progression.maxHealth, 100 + 25);
  const restored = new PlayerProgression(progression.serialize());
  assert.deepEqual(restored.perks, ['vitality']);
  assert.equal(restored.hasPendingPerk, false);
});

test('saves from before perks receive the milestone choices they already passed', () => {
  const legacy = new PlayerProgression({ level: 11, xp: 0 });
  assert.deepEqual(legacy.pendingPerks, [5, 10]);
  assert.equal(legacy.hasPendingChoice, true);
});

test('enemy XP values come from enemies.json and elites give double', () => {
  assert.equal(ENEMY_TYPES.slime.xp, 10);
  assert.equal(ENEMY_TYPES.wolf.xp, 20);
  assert.equal(ENEMY_TYPES.boar.xp, 25);
  assert.equal(ENEMY_TYPES.skeleton.xp, 30);
  assert.equal(ENEMY_TYPES.spider.xp, 30);
  assert.equal(ENEMY_TYPES.ghost.xp, 35);
  assert.equal(ENEMY_TYPES.werewolf.xp, 50);
  assert.equal(enemyXp('wolf', true), 40);
  assert.equal(enemyXp('werewolf', false), 50);
});
