import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INVASION_CONFIG, RegionInvasionState, invasionCoins, invasionLevel, invasionWaves, pickInvasionRegion
} from '../src/game/RegionInvasion.js';
import { XP_EVENT_CONFIG, XpBoost, daysUntilDoubleXp, isDoubleXpDay } from '../src/game/XpEvents.js';
import { PlayerProgression, respecCost } from '../src/data/progression.js';
import { DUNGEONS, TOWERS, TOTAL_ROWS, CAVE_ROOMS, REGION_INFO, regionAt, towerFloorRange } from '../src/data/worldRegions.js';
import { GEAR_ITEMS, rollGearDrop } from '../src/data/gear.js';
import { ENEMY_TYPES } from '../src/data/enemies.js';
import { HERO_GENDERS, heroTexture, normalizeGender } from '../src/game/HeroStyle.js';
import { collectEffects } from '../src/game/ActiveEffects.js';

const seq = (...values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

test('invasão: acontece a cada 2-3 dias, perto do nível, em 3 ondas com líder na última', () => {
  const state = new RegionInvasionState({}, seq(0, 0.99));
  assert.equal(state.checkDay(1, 20), null);
  assert.equal(state.nextDay, 3);
  assert.equal(state.checkDay(2, 20), null);
  const invasion = state.checkDay(3, 20);
  assert.ok(invasion);
  assert.equal(REGION_INFO[invasion.region].levelRange[0] <= 20 + 8, true);
  assert.ok(state.nextDay - 3 >= INVASION_CONFIG.minGapDays && state.nextDay - 3 <= INVASION_CONFIG.maxGapDays);
  const waves = [state.nextWave(), state.nextWave(), state.nextWave()];
  assert.equal(state.nextWave(), null);
  assert.deepEqual(waves.map((wave) => wave.members.length), [4, 6, 8]);
  assert.deepEqual(waves.map((wave) => wave.members.filter((m) => m.leader).length), [0, 0, 1]);
  for (const wave of waves) for (const member of wave.members) assert.ok(ENEMY_TYPES[member.kind]);
  assert.equal(state.finish(), null);
  state.active.leaderDefeated = true;
  const reward = state.finish();
  assert.ok(reward.coins > 0 && reward.xp > 0);
  assert.equal(state.active, null);
  assert.equal(state.completed, 1);
});

test('invasão: região por nível, nível preso à faixa e dobro de moedas', () => {
  for (const level of [1, 14, 30, 60, 100, 140]) {
    const region = pickInvasionRegion(level, Math.random);
    const [lo, hi] = REGION_INFO[region].levelRange;
    assert.ok(level >= lo - 12 && level <= hi + 25, `${level} -> ${region}`);
    assert.ok(invasionLevel(region, level) >= lo && invasionLevel(region, level) <= hi);
  }
  assert.equal(invasionCoins(10), 20);
  assert.equal(invasionWaves('brasa', 100)[2].members.length, 8);
});

test('invasão: salva, recarrega e expira se o herói não aparece', () => {
  const state = new RegionInvasionState({}, seq(0.1));
  state.checkDay(1, 5);
  state.checkDay(state.nextDay, 5);
  state.nextWave();
  const copy = new RegionInvasionState(JSON.parse(JSON.stringify(state.serialize())));
  assert.deepEqual(copy.serialize(), state.serialize());
  copy.restartCurrentWave();
  assert.equal(copy.active.wave, 0);
  const start = copy.active.startDay;
  copy.checkDay(start + 2, 5);
  assert.ok(!copy.active || copy.active.startDay > start);
  assert.equal(new RegionInvasionState(null).active, null);
  assert.equal(new RegionInvasionState({ active: { region: 'xx' } }).active, null);
});

test('XP em dobro: evento a cada 7 dias e bônus de novato 1x por dia', () => {
  assert.ok(isDoubleXpDay(7) && isDoubleXpDay(14));
  assert.ok(!isDoubleXpDay(6) && !isDoubleXpDay(8) && !isDoubleXpDay(0));
  assert.equal(daysUntilDoubleXp(7), 0);
  assert.equal(daysUntilDoubleXp(8), 6);
  const boost = new XpBoost();
  assert.equal(boost.multiplier(3), 1);
  assert.ok(boost.canClaim(3));
  assert.ok(boost.claim(3).ok);
  assert.equal(boost.multiplier(3), 2);
  assert.ok(!boost.claim(3).ok);
  assert.ok(!boost.canClaim(3));
  boost.update(XP_EVENT_CONFIG.bonusMs + 1);
  assert.equal(boost.multiplier(3), 1);
  assert.ok(boost.claim(4).ok);
  assert.ok(!new XpBoost().claim(8).ok);
  assert.equal(new XpBoost().multiplier(7), 2);
  const again = new XpBoost(JSON.parse(JSON.stringify(boost.serialize())));
  assert.equal(again.claimedDay, 4);
  assert.ok(again.shouldAnnounce(7));
  assert.ok(!again.shouldAnnounce(7));
});

test('XP em dobro aparece no painel de efeitos', () => {
  const effects = collectEffects({ xp: { event: true, bonusMs: 90000 } });
  assert.ok(effects.some((effect) => effect.id === 'xp-event'));
  assert.ok(effects.some((effect) => effect.id === 'xp-bonus' && effect.time === '1:30'));
  assert.equal(collectEffects({}).length, 0);
});

test('refazer talentos: custo nível x 50 (mín. 100) e pontos voltam para escolha', () => {
  assert.equal(respecCost(1), 100);
  assert.equal(respecCost(2), 100);
  assert.equal(respecCost(10), 500);
  assert.equal(respecCost(150), 7500);
  const progression = new PlayerProgression({
    version: 2, level: 12, attackPoints: 4, defensePoints: 3, healthPoints: 4, perks: ['vampirism', 'brute'], pendingPerks: [], pendingLevels: []
  });
  assert.equal(progression.respecCost, 600);
  const maxHealthBefore = progression.maxHealth;
  const result = progression.respec();
  assert.equal(result.refunded, 11);
  assert.equal(progression.pendingLevels.length, 11);
  assert.deepEqual(progression.perks, []);
  assert.deepEqual(progression.pendingPerks, [5, 10]);
  assert.ok(progression.maxHealth < maxHealthBefore);
  while (progression.hasPendingAttribute) progression.choose('attack');
  assert.equal(progression.attackPoints, 11);
  const perk = progression.perkOffer()[0];
  assert.ok(progression.choosePerk(perk).applied);
  const reloaded = new PlayerProgression(JSON.parse(JSON.stringify(progression.serialize())));
  assert.equal(reloaded.attackPoints, 11);
});

test('torres: uma por região fora do Vale, 3-4 andares, mais fortes a cada andar e salas cabem no mundo', () => {
  assert.deepEqual(TOWERS.map((tower) => tower.region).sort(), ['antiga', 'areia', 'brasa', 'brejo', 'esmeralda', 'gelo']);
  for (const tower of TOWERS) {
    assert.ok(tower.floors >= 3 && tower.floors <= 4, tower.id);
    assert.equal(regionAt(tower.entrance.x, tower.entrance.y), tower.region, tower.id);
    for (const kind of tower.monsters) assert.ok(ENEMY_TYPES[kind], kind);
    let previous = -1;
    for (let floor = 0; floor < tower.floors; floor += 1) {
      const range = towerFloorRange(tower, floor);
      assert.ok(range[1] >= range[0] && range[0] > previous, `${tower.id} andar ${floor}`);
      previous = range[0];
    }
    assert.equal(towerFloorRange(tower, tower.floors - 1)[1], REGION_INFO[tower.region].levelRange[1]);
  }
  assert.equal(CAVE_ROOMS.length, DUNGEONS.reduce((sum, d) => sum + d.floors, 0));
  assert.ok(CAVE_ROOMS.every((room) => room.row0 + 20 <= TOTAL_ROWS));
});

test('equipamento: chance dobrada e garantido', () => {
  const never = () => 0.99;
  assert.equal(rollGearDrop({ region: 'antiga', level: 20 }, never).length, 0);
  assert.equal(rollGearDrop({ region: 'antiga', level: 20, guaranteed: true }, never).length, 1);
  const base = rollGearDrop({ region: 'antiga', level: 20 }, () => 0.2).length;
  const doubled = rollGearDrop({ region: 'antiga', level: 20, chanceMultiplier: 2 }, () => 0.2).length;
  assert.ok(doubled >= base);
  assert.ok(rollGearDrop({ region: 'gelo', level: 70, boss: 'tower:torre-gelo' }).every((drop) => GEAR_ITEMS[drop.id]));
});

test('personagem: masculino/feminino com valor padrão seguro', () => {
  assert.deepEqual(HERO_GENDERS, ['male', 'female']);
  assert.equal(normalizeGender('female'), 'female');
  assert.equal(normalizeGender('x'), 'male');
  assert.equal(normalizeGender(undefined), 'male');
  assert.equal(heroTexture('female'), 'player-female');
  assert.equal(heroTexture('male'), 'player');
});
