import assert from 'node:assert/strict';
import test from 'node:test';
import { CHAPTERS, LORE, MISSIONS, NPCS, SITES } from '../src/data/campaign.js';
import { ENEMY_TYPES } from '../src/data/enemies.js';
import { FORGE_RECIPES } from '../src/data/buildingSystems.js';
import { RESOURCE_TYPES } from '../src/game/config.js';
import { CampaignState, STATE_OBJECTIVES, eventAmount, rollDailies } from '../src/game/CampaignState.js';

const KNOWN_TYPES = new Set(['gather', 'structure', 'kill', 'boss', 'bossPhase', 'owns', 'craft', 'building', 'animal',
  'plant', 'harvest', 'buy', 'sell', 'deliver', 'reach', 'interact', 'rescue', 'talk', 'puzzle', 'defend', 'flag',
  'seals', 'choice', 'residents']);
const SITE_TAGS = new Set(Object.values(SITES).flatMap((site) => [site.enemies?.tag, site.boss?.tag].filter(Boolean)));
const GROUPS = new Set(Object.values(SITES).map((site) => site.group).filter(Boolean));

/** Contexto que diz "sim" para todos os objetivos de estado (como um jogador que cumpriu tudo). */
const fullCtx = {
  owns: () => true,
  buildingLevel: () => 10,
  animalUnlocked: () => true,
  available: () => 999
};

/** Gera os eventos que completam um objetivo de evento. */
function eventsFor(objective) {
  const count = objective.count ?? 1;
  const base = { type: objective.type, target: objective.target };
  switch (objective.type) {
    case 'gather': return [{ ...base, amount: count }];
    case 'kill': return Array.from({ length: count }, () => ({
      type: 'kill',
      kind: SITE_TAGS.has(objective.target) ? 'slime' : objective.target,
      tag: SITE_TAGS.has(objective.target) ? objective.target : null,
      region: objective.region,
      night: objective.region === 'noite'
    }));
    case 'buy':
    case 'sell': return [{ type: objective.type, amount: count }];
    case 'rescue': return Array.from({ length: count }, () => ({ type: 'rescue', target: objective.target, group: objective.target }));
    case 'talk': return [{ type: 'talk', targets: [objective.target] }];
    case 'bossPhase': return [{ type: 'bossPhase', target: objective.target, ratio: objective.ratio }];
    case 'defend': return [{ type: 'defend', target: objective.target, seconds: count }];
    default: return Array.from({ length: count }, () => ({ ...base }));
  }
}

test('campaign has 100 unique missions, 10 per chapter, with valid references', () => {
  assert.equal(MISSIONS.length, 100);
  assert.equal(new Set(MISSIONS.map((mission) => mission.id)).size, 100);
  assert.equal(CHAPTERS.length, 10);
  for (let chapter = 1; chapter <= 10; chapter += 1) {
    assert.equal(MISSIONS.filter((mission) => mission.chapter === chapter).length, 10, `capítulo ${chapter}`);
  }
  for (const mission of MISSIONS) {
    assert.ok(mission.title && mission.description, mission.id);
    assert.ok(NPCS[mission.npc], `${mission.id}: NPC ${mission.npc}`);
    assert.ok(mission.rewards.xp > 0 && mission.rewards.coins > 0, `${mission.id}: recompensa`);
    if (mission.lore) assert.ok(LORE[mission.lore], `${mission.id}: lore ${mission.lore}`);
    for (const type of Object.keys(mission.rewards.items)) assert.ok(RESOURCE_TYPES[type], `${mission.id}: item ${type}`);
    for (const objective of mission.objectives) {
      assert.ok(KNOWN_TYPES.has(objective.type), `${mission.id}: tipo ${objective.type}`);
      assert.ok((objective.count ?? 1) > 0, `${mission.id}: quantidade`);
      const target = objective.target;
      if (['gather', 'deliver'].includes(objective.type)) assert.ok(RESOURCE_TYPES[target], `${mission.id}: item ${target}`);
      if (['reach', 'interact', 'defend'].includes(objective.type)) assert.ok(SITES[target], `${mission.id}: local ${target}`);
      if (objective.type === 'rescue') assert.ok(SITES[target] || GROUPS.has(target), `${mission.id}: resgate ${target}`);
      if (objective.type === 'puzzle') assert.ok(GROUPS.has(target), `${mission.id}: puzzle ${target}`);
      if (['boss', 'bossPhase'].includes(objective.type)) assert.ok(SITE_TAGS.has(target), `${mission.id}: chefe ${target}`);
      if (objective.type === 'kill') {
        assert.ok(['any', 'elite'].includes(target) || ENEMY_TYPES[target] || SITE_TAGS.has(target), `${mission.id}: alvo ${target}`);
      }
      if (objective.type === 'talk') assert.ok(SITES[target] || NPCS[target], `${mission.id}: conversa ${target}`);
      if (objective.type === 'owns') for (const id of target) assert.ok(FORGE_RECIPES[id], `${mission.id}: receita ${id}`);
    }
  }
});

test('every quest site has art, a known kind and a position inside the world', () => {
  const kinds = new Set(['marker', 'source', 'loot', 'investigate', 'rescue', 'talk', 'enemies', 'boss', 'pillar', 'defend', 'assault', 'choice']);
  for (const [id, site] of Object.entries(SITES)) {
    assert.ok(kinds.has(site.kind), `${id}: ${site.kind}`);
    assert.ok(site.x > 0 && site.x < 2880 && site.y > 0 && site.y < 2160, `${id}: posição`);
    if (site.gives) for (const type of Object.keys(site.gives)) assert.ok(RESOURCE_TYPES[type], `${id}: item ${type}`);
    for (const spec of [site.enemies, site.boss].filter(Boolean)) assert.ok(ENEMY_TYPES[spec.kind], `${id}: espécie ${spec.kind}`);
    if (site.recruits) assert.ok(NPCS[site.recruits], `${id}: recruta ${site.recruits}`);
  }
});

test('a new campaign starts with only the first mission available', () => {
  const state = new CampaignState();
  assert.equal(state.stateOf('m001'), 'available');
  assert.equal(state.stateOf('m002'), 'locked');
  assert.equal(state.accept('m002'), false, 'pré-requisito');
  assert.equal(state.currentChapter, 1);
  assert.equal(state.completedCount, 0);
});

test('objectives advance only from matching events while the mission is active', () => {
  const state = new CampaignState();
  state.emit({ type: 'gather', target: 'wood', amount: 5 });
  assert.equal(state.entry('m001').progress[0], 0, 'missão ainda não aceita');
  assert.ok(state.accept('m001'));
  state.emit({ type: 'gather', target: 'stone', amount: 5 });
  assert.equal(state.entry('m001').progress[0], 0, 'item errado');
  state.emit({ type: 'gather', target: 'wood', amount: 3 });
  state.emit({ type: 'gather', target: 'wood', amount: 9 });
  assert.equal(state.entry('m001').progress[0], 5, 'progresso limitado ao total');
});

test('rewards are delivered once and unlock the next mission', () => {
  const state = new CampaignState();
  state.accept('m001');
  assert.equal(state.turnIn('m001'), null, 'incompleta');
  state.emit({ type: 'gather', target: 'wood', amount: 5 });
  const result = state.turnIn('m001');
  assert.ok(result);
  assert.equal(result.rewards.xp, MISSIONS[0].rewards.xp);
  assert.equal(state.turnIn('m001'), null, 'não paga duas vezes');
  assert.equal(state.stateOf('m001'), 'done');
  assert.equal(state.stateOf('m002'), 'available');
  assert.ok(state.lore.includes('despertar'));
});

test('quest-tagged enemies do not count as their base species', () => {
  const objective = { type: 'kill', target: 'slime', count: 3 };
  assert.equal(eventAmount(objective, { type: 'kill', kind: 'slime', tag: 'rato' }), 0);
  assert.equal(eventAmount(objective, { type: 'kill', kind: 'slime', tag: null }), 1);
  assert.equal(eventAmount({ type: 'kill', target: 'rato', count: 2 }, { type: 'kill', kind: 'slime', tag: 'rato' }), 1);
  assert.equal(eventAmount({ type: 'kill', target: 'any', count: 5, region: 'floresta' }, { type: 'kill', kind: 'wolf', region: 'norte' }), 0);
});

test('state objectives use the live game state (owning, building, delivering)', () => {
  const state = new CampaignState();
  const mission = MISSIONS.find((entry) => entry.id === 'm022');
  assert.equal(state.objectiveValue(mission, 0, { buildingLevel: () => 1 }), 0);
  assert.equal(state.objectiveValue(mission, 0, { buildingLevel: () => 2 }), 1);
  const deliver = MISSIONS.find((entry) => entry.id === 'm005');
  assert.equal(state.objectiveValue(deliver, 0, { available: () => 3 }), 3);
  assert.deepEqual(state.deliveryCost(deliver), { water: 5 });
});

test('save round-trip keeps progress, choices and rewards; tampered saves are fixed', () => {
  const state = new CampaignState();
  state.accept('m001');
  state.emit({ type: 'gather', target: 'wood', amount: 5 });
  state.turnIn('m001');
  state.accept('m002');
  state.emit({ type: 'structure', target: 'mushroom' });
  state.addSeal('terra');
  state.choice = 'restore';
  const copy = new CampaignState(JSON.parse(JSON.stringify(state.serialize())));
  assert.equal(copy.stateOf('m001'), 'done');
  assert.equal(copy.entry('m001').rewarded, true);
  assert.equal(copy.stateOf('m002'), 'active');
  assert.equal(copy.entry('m002').progress[0], 1);
  assert.deepEqual(copy.seals, ['terra']);
  assert.equal(copy.choice, 'restore');
  assert.equal(copy.turnIn('m001'), null);

  const tampered = new CampaignState({ missions: { m050: { state: 'active', progress: [1] } } });
  assert.equal(tampered.stateOf('m050'), 'locked', 'sem pré-requisitos não pode estar ativa');
  assert.equal(new CampaignState({ missions: { m001: { state: 'done', rewarded: true } } }).stateOf('m002'), 'available');
});

test('daily missions unlock after mission 10, are deterministic and pay once', () => {
  const state = new CampaignState();
  assert.equal(state.refreshDaily(3), false);
  assert.equal(state.daily.list.length, 0);
  for (const mission of MISSIONS.slice(0, 10)) state.missions[mission.id].state = 'done';
  state.refreshAvailability();
  assert.ok(state.refreshDaily(12));
  assert.equal(state.daily.list.length, 3);
  assert.deepEqual(rollDailies(12).map((entry) => entry.template), state.daily.list.map((entry) => entry.template));
  const index = state.daily.list.findIndex((entry) => state.dailyTemplate(entry).objective.type !== 'deliver');
  const objective = state.dailyTemplate(state.daily.list[index]).objective;
  for (const event of eventsFor(objective)) state.emit(event);
  assert.ok(state.claimDaily(index));
  assert.equal(state.claimDaily(index), null);
  assert.equal(state.refreshDaily(12), false, 'mesmo dia não renova');
  assert.equal(rollDailies(30, true).length, 4, 'pós-jogo ganha um desafio extra');
});

test('the whole campaign can be completed from mission 1 to 100', () => {
  const state = new CampaignState();
  for (const mission of MISSIONS) {
    assert.equal(state.stateOf(mission.id), 'available', `${mission.id} deveria estar liberada`);
    assert.ok(state.accept(mission.id));
    mission.objectives.forEach((objective) => {
      if (objective.type === 'seals') for (const seal of ['terra', 'agua', 'vento', 'luz', 'fogo']) state.addSeal(seal);
      if (objective.type === 'choice') state.choice = 'restore';
      if (objective.type === 'residents') state.residents = 10;
      if (!STATE_OBJECTIVES.has(objective.type)) for (const event of eventsFor(objective)) state.emit(event);
    });
    assert.ok(state.isComplete(mission, fullCtx), `${mission.id} não completou`);
    assert.ok(state.turnIn(mission.id, fullCtx), `${mission.id} não foi entregue`);
  }
  assert.equal(state.completedCount, 100);
  assert.ok(state.flags.postGame);
  assert.ok(state.flags.warmClothes && state.flags.desertSupplies && state.flags.ashMasks);
  assert.equal(state.currentMission, null);
});
