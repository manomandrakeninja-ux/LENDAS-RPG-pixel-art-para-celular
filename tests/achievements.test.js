import test from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS, Achievements, completedSets, makeDailyQuests } from '../src/data/achievements.js';
import { GEAR_ITEMS } from '../src/data/gear.js';

test('cerca de 40 conquistas com ids únicos e título', () => {
  assert.ok(ACHIEVEMENTS.length >= 38 && ACHIEVEMENTS.length <= 45);
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
  assert.ok(ACHIEVEMENTS.every((a) => a.title && a.name));
});

test('três missões diárias, escalam com o nível e renovam por dia', () => {
  assert.equal(makeDailyQuests(1, 1).length, 3);
  assert.ok(makeDailyQuests(1, 60)[0].target > makeDailyQuests(1, 1)[0].target);
  const a = new Achievements();
  assert.equal(a.refreshDaily(1, 5), true);
  assert.equal(a.refreshDaily(1, 5), false);
  const done = a.note('kills', 999);
  assert.equal(done.length, 1);
  assert.equal(a.daily.quests[0].done, true);
  assert.equal(a.stats.dailies, 1);
  assert.equal(a.note('kills', 5).length, 0);
  assert.equal(a.refreshDaily(2, 5), true);
  assert.equal(a.daily.quests[0].progress, 0);
});

test('conquistas liberam por contador, nível e bestiário; título só se liberado', () => {
  const a = new Achievements();
  a.note('kills', 50);
  const fresh = a.check({ level: 10, bestiary: 5, bestiaryTotal: 40, sets: 0 });
  const names = fresh.map((x) => x.name);
  assert.ok(names.includes('Matar 50 monstros') && names.includes('Chegar ao nível 10') && names.includes('Registrar 5 espécies'));
  assert.equal(a.check({ level: 10, bestiary: 5, bestiaryTotal: 40 }).length, 0);
  assert.equal(a.setTitle('ach5').ok, false);
  assert.equal(a.setTitle(fresh[0].id).ok, true);
  assert.ok(a.titleName);
});

test('save ida e volta e save antigo vazio', () => {
  const a = new Achievements();
  a.refreshDaily(3, 20);
  a.note('gathered', 600);
  a.check({ level: 20, bestiaryTotal: 1 });
  a.setTitle('ach1');
  const b = new Achievements(JSON.parse(JSON.stringify(a.serialize())));
  assert.deepEqual(b.serialize(), a.serialize());
  const old = new Achievements(undefined);
  assert.equal(old.count, 0);
  assert.equal(old.daily.quests.length, 0);
});

test('conjunto completo exige as 4 peças de armadura', () => {
  const ids = Object.values(GEAR_ITEMS).filter((i) => i.set === 'couro' && ['helmet', 'chest', 'legs', 'boots'].includes(i.slot)).map((i) => i.id);
  assert.equal(completedSets(ids.slice(0, 3), GEAR_ITEMS), 0);
  assert.equal(completedSets(ids, GEAR_ITEMS), 1);
});
