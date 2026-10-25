import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { BUILDING_ORDER } from '../src/data/buildings.js';
import { BUILDING_VISUALS, buildingVisual, visualStage } from '../src/data/buildingVisuals.js';

const atlas = JSON.parse(fs.readFileSync(new URL('../public/assets/buildings/camp-atlas.json', import.meta.url), 'utf8'));

test('levels map to the three visual stages', () => {
  assert.equal(visualStage(0), 0);
  for (const level of [1, 2, 3]) assert.equal(visualStage(level), 1);
  for (const level of [4, 5, 6, 7]) assert.equal(visualStage(level), 4);
  for (const level of [8, 9, 10]) assert.equal(visualStage(level), 8);
  assert.equal(buildingVisual('house', 0), null);
  assert.equal(buildingVisual('house', 5).frame, 'house');
});

test('every building has three different looks and the art exists', () => {
  for (const key of BUILDING_ORDER) {
    const stages = BUILDING_VISUALS[key];
    assert.ok(stages, `${key} sem configuração visual`);
    const looks = [1, 4, 8].map((stage) => stages[stage]);
    assert.ok(looks.every(Boolean), `${key} sem os 3 estágios`);
    const ids = looks.map((look) => look.frame ?? look.texture ?? look.gate);
    assert.equal(new Set(ids).size, 3, `${key}: as 3 aparências precisam ser diferentes`);
    for (const look of looks) {
      if (look.frame) assert.ok(atlas.frames[look.frame], `${key}: quadro ${look.frame} não está no atlas`);
    }
  }
  for (const stage of ['campfire', 'campfire4', 'campfire8']) {
    for (let frame = 0; frame < 4; frame += 1) assert.ok(atlas.frames[`${stage}-${frame}`], `${stage}-${frame}`);
  }
});
