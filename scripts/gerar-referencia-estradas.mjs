import fs from 'node:fs';
import path from 'node:path';
import { buildTerrainGrid, roadAt, T, TILE, ROADS, regionAt } from '../src/data/worldRegions.js';

// Gera a referência da geometria atual das estradas (células T.ROAD do mundo, amostras de roadAt e
// posições fixas que não podem mudar). Rodar só quando a mudança de estradas for aprovada.
const grid = buildTerrainGrid();
const roadCells = [];
for (let i = 0; i < grid.terrain.length; i += 1) if (grid.terrain[i] === T.ROAD) roadCells.push(i);
const valeRoadCells = roadCells.filter((i) => regionAt((i % grid.cols) * TILE + TILE / 2, Math.floor(i / grid.cols) * TILE + TILE / 2) === 'vale');
const samples = [];
for (let y = 0; y < 2160; y += 96) for (let x = 0; x < 2880; x += 96) samples.push([x, y, roadAt(x, y) ? 1 : 0]);
const reference = {
  note: 'Referência da geometria das estradas antes da mudança de 2026-11-01. Não editar à mão.',
  worldRoadCells: roadCells.length,
  valeRoadCells: valeRoadCells.length,
  roadCellHash: roadCells.reduce((h, v) => (Math.imul(h ^ v, 16777619) >>> 0), 2166136261),
  roadPoints: ROADS.map((road) => ({ name: road.name, points: road.points })),
  roadSamples: samples.map(([x, y, v]) => `${x},${y}:${v}`).join(' '),
};
fs.writeFileSync(path.resolve('tests/fixtures/road-baseline.json'), JSON.stringify(reference, null, 1));
console.log(JSON.stringify({ worldRoadCells: reference.worldRoadCells, valeRoadCells: reference.valeRoadCells, samples: samples.length }));
