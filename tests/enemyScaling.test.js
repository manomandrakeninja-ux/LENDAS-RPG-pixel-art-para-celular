import test from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_TYPES, enemyXp } from '../src/data/enemies.js';
import { RARITY_LABELS, dropRarity, levelInRange, scaleEnemy } from '../src/data/enemyScaling.js';
import { CAVES, REGION_INFO, REGION_SPAWNS, caveLevelRange } from '../src/data/worldRegions.js';
import { hasMonsterArt } from '../src/art/monsters.js';

test('escalonamento: do nível 1 ao 15 os números são os de enemies.json', () => {
  for (const [kind, def] of Object.entries(ENEMY_TYPES)) {
    const s = scaleEnemy(def, 15);
    assert.equal(s.health, def.health, kind);
    assert.equal(s.damage, def.damage, kind);
    assert.equal(s.xp, def.xp, kind);
    assert.equal(s.coinMultiplier, 1);
  }
  assert.equal(enemyXp('wolf', true), 40);
});

test('escalonamento: cresce com o nível e é monótono', () => {
  const def = ENEMY_TYPES.imp;
  let last = scaleEnemy(def, 15);
  for (const level of [30, 60, 100, 150]) {
    const s = scaleEnemy(def, level);
    assert.ok(s.health > last.health && s.damage > last.damage && s.xp > last.xp && s.coinMultiplier > last.coinMultiplier, `nível ${level}`);
    last = s;
  }
});

test('espécies novas: nível 60-150, arte, habitat e faixa da região', () => {
  const deep = ['snowOwl', 'mammoth', 'cobra', 'scarab', 'sandGolem', 'djinn', 'lavaHound', 'magmaSlime', 'fireElemental', 'obsidianKnight', 'phoenix', 'ashWraith', 'gargoyle', 'boneWyrm', 'voidStalker', 'cinderGiant', 'hellWarden', 'lavaWorm', 'soulReaper', 'abyssHound', 'abyssLord'];
  assert.ok(Object.values(ENEMY_TYPES).filter((def) => def.level >= 60).length >= 20);
  for (const kind of deep) {
    assert.ok(ENEMY_TYPES[kind], kind);
    assert.ok(hasMonsterArt(kind), `arte ${kind}`);
    assert.ok(ENEMY_TYPES[kind].level >= 60 && ENEMY_TYPES[kind].level <= 150, kind);
  }
  for (const [region, spawns] of Object.entries(REGION_SPAWNS)) {
    const [min, max] = REGION_INFO[region].levelRange;
    for (const kind of [...spawns.day, ...spawns.night]) {
      const level = levelInRange(ENEMY_TYPES[kind], REGION_INFO[region].levelRange);
      assert.ok(level >= min && level <= max, `${kind} em ${region}`);
    }
  }
});

test('Abismo de Brasa: caverna 115-150 com um chefe', () => {
  const abismo = CAVES.find((cave) => cave.id === 'abismo-brasa');
  assert.deepEqual(caveLevelRange(abismo), [115, 150]);
  assert.equal(abismo.boss, 'abyssLord');
  assert.ok(ENEMY_TYPES.abyssLord.boss);
  for (const kind of abismo.monsters) assert.ok(ENEMY_TYPES[kind].level >= 115, kind);
});

test('bestiário: raridade do loot por chance', () => {
  assert.equal(dropRarity(0.8), 'common');
  assert.equal(dropRarity(0.3), 'uncommon');
  assert.equal(dropRarity(0.05), 'rare');
  assert.deepEqual(Object.values(RARITY_LABELS), ['Comum', 'Incomum', 'Raro']);
});
