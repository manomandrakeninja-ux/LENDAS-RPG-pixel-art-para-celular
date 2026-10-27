import test from 'node:test';
import assert from 'node:assert/strict';
import { SPAWN_ZONES } from '../src/data/biomes.js';
import { ELITE_CONFIG, ENEMY_TYPES } from '../src/data/enemies.js';
import { SPAWNING_CONFIG } from '../src/data/spawning.js';
import { RESOURCE_TYPES } from '../src/game/config.js';

const EXPECTED_ENEMIES = ['slime', 'wolf', 'boar', 'skeleton', 'ghost', 'spider', 'werewolf'];

test('the Phase 1 catalog contains all day and night species', () => {
  // As espécies da Fase 1 continuam primeiro; as das regiões novas vêm depois.
  assert.deepEqual(Object.keys(ENEMY_TYPES).slice(0, EXPECTED_ENEMIES.length), EXPECTED_ENEMIES);
  const phaseOne = Object.entries(ENEMY_TYPES).filter(([type]) => EXPECTED_ENEMIES.includes(type));
  assert.deepEqual(phaseOne.filter(([, definition]) => definition.period === 'day').map(([type]) => type), ['slime', 'wolf', 'boar']);
  assert.deepEqual(phaseOne.filter(([, definition]) => definition.period === 'night').map(([type]) => type), ['skeleton', 'ghost', 'spider', 'werewolf']);
});

test('every enemy has complete behavior, perception and combat data', () => {
  for (const [type, definition] of Object.entries(ENEMY_TYPES)) {
    assert.ok(definition.health > 0, `${type} health`);
    assert.ok(definition.damage > 0, `${type} damage`);
    assert.ok(definition.speed > 0, `${type} speed`);
    assert.ok(definition.perception > 0, `${type} perception`);
    assert.ok(definition.attackRange > 0, `${type} attack range`);
    assert.ok(definition.attackCooldown > 0, `${type} attack cooldown`);
    assert.ok(['chase', 'patrol', 'pack'].includes(definition.behavior), `${type} behavior`);
    assert.ok(definition.packAttack && definition.packAttack.maxAttackers >= 1, `${type} pack rule`);
    assert.ok(definition.drops.length > 0, `${type} drops`);
  }
});

test('enemy drops only reference configured inventory resources', () => {
  for (const definition of Object.values(ENEMY_TYPES)) {
    for (const drop of definition.drops) {
      assert.ok(drop.type in RESOURCE_TYPES, `${drop.type} should be a resource`);
      assert.ok(drop.chance > 0 && drop.chance <= 1, `${drop.type} chance`);
      assert.ok(drop.min >= 1 && drop.max >= drop.min, `${drop.type} amount`);
    }
  }
});

test('night has more active enemies and a higher elite chance', () => {
  assert.ok(SPAWNING_CONFIG.activeLimit.night > SPAWNING_CONFIG.activeLimit.day);
  assert.ok(SPAWNING_CONFIG.spawnIntervalMs.night < SPAWNING_CONFIG.spawnIntervalMs.day);
  assert.ok(ELITE_CONFIG.chance.night > ELITE_CONFIG.chance.day);
  assert.ok(ELITE_CONFIG.healthMultiplier > 1);
  assert.ok(ELITE_CONFIG.damageMultiplier > 1);
  assert.ok(ELITE_CONFIG.dropMultiplier > 1);
});

test('spawn zones only reference known enemies and cover both periods', () => {
  for (const zone of Object.values(SPAWN_ZONES)) {
    assert.ok(zone.enemies.day.length > 0, `${zone.name} day pool`);
    assert.ok(zone.enemies.night.length > 0, `${zone.name} night pool`);
    for (const type of [...zone.enemies.day, ...zone.enemies.night]) {
      assert.ok(type in ENEMY_TYPES, `${zone.name} enemy ${type}`);
    }
  }
});

test('only flying or ghostly species ignore obstacles', () => {
  const obstacleIgnoring = Object.entries(ENEMY_TYPES)
    .filter(([, definition]) => definition.ignoresObstacles)
    .map(([type]) => type);
  assert.deepEqual(obstacleIgnoring, ['ghost', 'bat', 'iceElemental']);
});
