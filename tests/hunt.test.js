import test from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, HUNTS_BY_ID, HuntSystem, availableHunts, huntReward, repeatMultiplier } from '../src/game/HuntSystem.js';
import { ShieldBlocker, SHIELD_BLOCK, blockedDamage } from '../src/game/ShieldBlock.js';
import { ENEMY_TYPES } from '../src/data/enemies.js';
import { migrateSave } from '../src/game/save.js';

test('hunts cover every region with level-scaled counts and rewards', () => {
  const regions = new Set(HUNTS.map((hunt) => hunt.region));
  for (const region of ['vale', 'antiga', 'brejo', 'gelo', 'areia', 'esmeralda', 'brasa']) assert.ok(regions.has(region), region);
  const wolf = HUNTS_BY_ID['vale:wolf'];
  assert.ok(wolf && wolf.count >= 8);
  const low = huntReward(HUNTS_BY_ID['vale:rat']);
  const high = huntReward(HUNTS_BY_ID['brasa:demon']);
  assert.ok(high.xp > low.xp && high.coins > low.coins);
});

test('available hunts follow the player level', () => {
  assert.ok(availableHunts(1).every((hunt) => hunt.level <= 7));
  assert.ok(availableHunts(100).every((hunt) => hunt.level >= 60 && hunt.level <= 106));
  assert.ok(availableHunts(150).length > 0);
});

test('one active hunt: kills count, completion, reward and cheaper repeats', () => {
  const hunts = new HuntSystem();
  assert.equal(hunts.accept('vale:wolf', 1).ok, true);
  assert.equal(hunts.accept('vale:rat', 1).ok, false);
  assert.equal(hunts.onKill('slime'), false);
  const count = HUNTS_BY_ID['vale:wolf'].count;
  for (let i = 0; i < count; i += 1) assert.equal(hunts.onKill('wolf'), true);
  assert.equal(hunts.onKill('wolf'), false);
  assert.ok(hunts.complete);
  assert.match(hunts.label(), new RegExp(`Lobo ${count}/${count}`));
  const first = hunts.turnIn();
  assert.equal(first.ok, true);
  assert.equal(hunts.active, null);
  hunts.accept('vale:wolf', 1);
  for (let i = 0; i < count; i += 1) hunts.onKill('wolf');
  const second = hunts.turnIn();
  assert.ok(second.xp < first.xp && second.coins < first.coins);
  assert.ok(repeatMultiplier(10) >= 0.25);
});

test('too-dangerous hunts are refused and abandon clears the hunt', () => {
  const hunts = new HuntSystem();
  assert.equal(hunts.accept('brasa:demon', 1).ok, false);
  hunts.accept('vale:rat', 1);
  assert.equal(hunts.abandon(), true);
  assert.equal(hunts.hunt, null);
});

test('hunt save round trip and old saves without the field', () => {
  const hunts = new HuntSystem();
  hunts.accept('vale:wolf', 3);
  hunts.onKill('wolf');
  const restored = new HuntSystem(JSON.parse(JSON.stringify(hunts.serialize())));
  assert.equal(restored.active.progress, 1);
  const old = new HuntSystem(migrateSave({ version: 2 }).hunts);
  assert.equal(old.active, null);
  assert.deepEqual(new HuntSystem({ active: { id: 'nada:nada', progress: 5 }, done: { x: 2 } }).serialize(), { active: null, done: {} });
});

test('shield blocks only the first 2 attackers of each ~1 s window', () => {
  const shield = new ShieldBlocker();
  const a = {}; const b = {}; const c = {};
  assert.equal(shield.tryBlock(a, 0), SHIELD_BLOCK.ratio);
  assert.equal(shield.tryBlock(b, 100), SHIELD_BLOCK.ratio);
  assert.equal(shield.tryBlock(c, 200), 0);
  assert.equal(shield.tryBlock(a, 300), SHIELD_BLOCK.ratio);
  assert.equal(shield.tryBlock(c, 999), 0);
  assert.equal(shield.tryBlock(c, 1000), SHIELD_BLOCK.ratio);
  assert.equal(blockedDamage(100, 0.6), 40);
});

test('shooters, paralysis and rage species have complete data', () => {
  const shooters = Object.entries(ENEMY_TYPES).filter(([, def]) => def.ranged);
  assert.ok(shooters.length >= 3);
  for (const [type, def] of shooters) {
    assert.ok(def.ranged.range > def.attackRange, `${type} range`);
    assert.ok(def.ranged.keepDistance > def.attackRange && def.ranged.keepDistance < def.ranged.range, `${type} keep`);
    assert.ok(def.projectile.speed > 0 && def.projectile.damageMultiplier > 0 && def.projectile.lifetimeMs > 0, `${type} projectile`);
  }
  for (const id of ['witch', 'pirate', 'imp']) assert.ok(ENEMY_TYPES[id].ranged, id);
  const paralysers = Object.values(ENEMY_TYPES).filter((def) => def.paralyze);
  assert.ok(paralysers.length >= 1 && paralysers.length <= 2);
  assert.ok(paralysers.every((def) => def.paralyze.durationMs === 1000));
  const raged = Object.values(ENEMY_TYPES).filter((def) => def.rage);
  assert.ok(raged.length >= 2 && raged.length <= 3);
  assert.ok(raged.every((def) => def.rage.healthRatio === 0.3 && def.rage.speedMultiplier > 1 && def.rage.damageMultiplier > 1));
});
