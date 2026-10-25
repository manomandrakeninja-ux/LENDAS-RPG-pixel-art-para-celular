import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HARVEST_STRUCTURE_TYPES,
  HarvestStructureState
} from '../src/data/harvestStructures.js';
import { WORLD } from '../src/game/config.js';

function createState(options = {}) {
  return new HarvestStructureState({
    world: WORLD,
    dayCount: 1,
    rewardRandom: () => 0,
    ...options
  });
}

test('harvest structures use the requested rewards and regrowth delays', () => {
  assert.deepEqual(HARVEST_STRUCTURE_TYPES.tree.rewardAmount, [2, 4]);
  assert.equal(HARVEST_STRUCTURE_TYPES.tree.regrowDays, 2);
  assert.deepEqual(HARVEST_STRUCTURE_TYPES.rock.rewardAmount, [2, 3]);
  assert.equal(HARVEST_STRUCTURE_TYPES.rock.regrowDays, 3);
  assert.deepEqual(HARVEST_STRUCTURE_TYPES.herbBush.rewardAmount, [1, 2]);
  assert.equal(HARVEST_STRUCTURE_TYPES.herbBush.regrowDays, 1);
  assert.equal(HARVEST_STRUCTURE_TYPES.mushroom.nightOnly, true);
  assert.equal(HARVEST_STRUCTURE_TYPES.chest.count, 8);
});

test('the world contains the configured number of harvestable structures', () => {
  const state = createState();
  const counts = Object.fromEntries(
    Object.keys(HARVEST_STRUCTURE_TYPES).map((type) => [type, state.byType(type).length])
  );

  assert.equal(counts.tree, 32);
  assert.equal(counts.rock, 22);
  assert.equal(counts.herbBush, 26);
  assert.equal(counts.mushroom, 16);
  assert.equal(counts.chest, 8);
  assert.equal(counts.mineMarker, 1);
  assert.equal(counts.oreVein - 18 >= 6 && counts.oreVein - 18 <= 10, true);
  assert.equal(counts.coalVein >= 2 && counts.coalVein <= 3, true);
  assert.equal(counts.goldVein <= 1, true);
  assert.ok(state.structures.every((structure) =>
    structure.x >= 0 && structure.x <= WORLD.width &&
    structure.y >= 0 && structure.y <= WORLD.height
  ));
});

test('trees, rocks and herb bushes regenerate after their configured delays', () => {
  const state = createState();
  const cases = [
    ['tree', 2],
    ['rock', 3],
    ['herbBush', 1]
  ];

  for (const [type, days] of cases) {
    const structure = state.byType(type)[0];
    assert.equal(structure.available, true);
    state.collect(structure.id, 1);
    assert.equal(structure.available, false);
    assert.equal(structure.readyDay, 1 + days);
    assert.deepEqual(state.handleDayChange(1 + days - 1), []);
    assert.equal(structure.available, false);
    assert.equal(state.handleDayChange(1 + days).length, 1);
    assert.equal(structure.available, true);
  }
});

test('mushrooms are collectible only at night and return the next night', () => {
  const state = createState();
  const mushroom = state.byType('mushroom')[0];

  assert.equal(state.nearestOfType('mushroom', mushroom.x, mushroom.y, 10, false), null);
  assert.equal(state.nearestOfType('mushroom', mushroom.x, mushroom.y, 10, true), mushroom);
  state.collect(mushroom.id, 1);
  assert.equal(mushroom.available, false);
  assert.notEqual(state.nearestOfType('mushroom', mushroom.x, mushroom.y, 10, true)?.id, mushroom.id);
  state.handleDayChange(2);
  assert.equal(mushroom.available, true);
});

test('chests keep unique loot and never regenerate', () => {
  const state = createState();
  const chests = state.byType('chest');
  const lootSignatures = chests.map((chest) => JSON.stringify(chest.loot));
  assert.equal(new Set(lootSignatures).size, chests.length);

  const chest = chests[0];
  const reward = state.rollReward(chest);
  assert.ok(Object.keys(reward.loot).length > 0);
  state.collect(chest.id, 1);
  assert.equal(chest.collected, true);
  assert.equal(chest.available, false);
  state.handleDayChange(20);
  assert.equal(chest.available, false);
});

test('ore veins require a pickaxe and regenerate after four days', () => {
  const state = createState();
  const vein = state.byType('oreVein').find((structure) => structure.id.startsWith('oreVein-'));
  assert.equal(HARVEST_STRUCTURE_TYPES.rock.requiresPickaxe, true);
  assert.equal(HARVEST_STRUCTURE_TYPES.oreVein.requiresPickaxe, true);
  assert.deepEqual(HARVEST_STRUCTURE_TYPES.oreVein.rewardAmount, [2, 4]);
  assert.equal(HARVEST_STRUCTURE_TYPES.oreVein.regrowDays, 4);
  state.collect(vein.id, 1);
  assert.equal(vein.readyDay, 5);
  assert.equal(state.handleDayChange(4).some((entry) => entry.id === vein.id), false);
  assert.equal(state.handleDayChange(5).some((entry) => entry.id === vein.id), true);
});

test('world ore is placed away from camp and the mine contains a mineral concentration', () => {
  const state = createState();
  const camp = WORLD.camp;
  const worldVeins = state.byType('oreVein').filter((structure) => structure.id.startsWith('oreVein-'));
  assert.equal(worldVeins.length, 18);
  assert.equal(worldVeins.every((vein) => {
    const distance = Math.hypot(vein.x - camp.x, vein.y - camp.y);
    return distance >= 600 && distance <= 1300;
  }), true);

  const mine = state.byType('mineMarker')[0];
  const mineVeins = state.byType('oreVein').filter((structure) => structure.id.startsWith('mine-'));
  const coalVeins = state.byType('coalVein');
  assert.equal(mineVeins.length >= 6 && mineVeins.length <= 10, true);
  assert.equal(coalVeins.length >= 2 && coalVeins.length <= 3, true);
  assert.equal(mineVeins.every((vein) => Math.hypot(vein.x - mine.x, vein.y - mine.y) <= 130), true);
});

test('harvested structure state survives save serialization', () => {
  const state = createState();
  const tree = state.byType('tree')[0];
  const chest = state.byType('chest')[0];
  state.collect(tree.id, 4);
  state.collect(chest.id, 4);
  const saved = state.serialize();

  const restoredDayFour = createState({ saved, dayCount: 4 });
  assert.equal(restoredDayFour.byType('tree')[0].available, false);
  assert.equal(restoredDayFour.byType('chest')[0].collected, true);

  const restoredDaySix = createState({ saved, dayCount: 6 });
  assert.equal(restoredDaySix.byType('tree')[0].available, true);
  assert.equal(restoredDaySix.byType('chest')[0].available, false);
});
