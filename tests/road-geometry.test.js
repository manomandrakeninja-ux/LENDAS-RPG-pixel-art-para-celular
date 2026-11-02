import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildTerrainGrid, roadAt, T, TILE, ROADS, regionAt } from '../src/data/worldRegions.js';

// Referência gerada por scripts/gerar-referencia-estradas.mjs (geometria original das estradas).
const ref = JSON.parse(fs.readFileSync(path.resolve('tests/fixtures/road-baseline.json'), 'utf8'));
const grid = buildTerrainGrid();

test('estradas: centros e pontos de cada estrada não mudam', () => {
  assert.deepEqual(ROADS.map((r) => ({ name: r.name, points: r.points })), ref.roadPoints);
});

test('estradas: mesmo número de células de estrada no mundo e no Vale', () => {
  const cells = [];
  for (let i = 0; i < grid.terrain.length; i += 1) if (grid.terrain[i] === T.ROAD) cells.push(i);
  assert.equal(cells.length, ref.worldRoadCells);
  const vale = cells.filter((i) => regionAt((i % grid.cols) * TILE + TILE / 2, Math.floor(i / grid.cols) * TILE + TILE / 2) === 'vale');
  assert.equal(vale.length, ref.valeRoadCells);
});

test('estradas: amostras de roadAt iguais à referência', () => {
  const diffs = [];
  for (const entry of ref.roadSamples.split(' ')) {
    const [xy, v] = entry.split(':');
    const [x, y] = xy.split(',').map(Number);
    if ((roadAt(x, y) ? 1 : 0) !== Number(v)) diffs.push(xy);
  }
  assert.ok(diffs.length === 0, `${diffs.length} amostras de roadAt mudaram (ex.: ${diffs.slice(0, 5).join(' ')})`);
});
