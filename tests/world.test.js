import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  CAVES, CAVE_NODES, DOCKS, REGION_INFO, REGION_NODES, REGION_SPAWNS, ROOM_COLS, ROOM_ROWS, T, TERRAIN_NODES, TILE,
  VALLEY, VALLEY_EXTRA_SPAWNS, buildTerrainGrid, dockPosition, regionAt, terrainAt
} from '../src/data/worldRegions.js';
import { layoutTiles } from '../src/data/terrainLayout.js';
import { ENEMY_TYPES } from '../src/data/enemies.js';
import { hasMonsterArt } from '../src/art/monsters.js';
import { BESTIARY_ORDER, Bestiary, habitatsOf } from '../src/game/Bestiary.js';
import { sunShadow } from '../src/data/sunlight.js';

const grid = buildTerrainGrid();

test('mundo: o Vale continua inteiro (mesmas coordenadas) e o resto vira regiões novas', () => {
  for (let x = 24; x < VALLEY.width; x += 240) {
    for (let y = 24; y < VALLEY.height; y += 240) assert.equal(regionAt(x, y), 'vale', `${x},${y}`);
  }
  const seen = new Set();
  for (let x = 24; x < grid.cols * TILE; x += 96) for (let y = 24; y < 5376; y += 96) seen.add(regionAt(x, y));
  for (const key of ['vale', 'antiga', 'brejo', 'gelo', 'areia', 'esmeralda', 'brasa', 'mar']) assert.ok(seen.has(key), key);
  // A grade é sempre a mesma (mapa determinístico).
  assert.deepEqual(buildTerrainGrid().terrain, grid.terrain);
});

test('mundo: as ilhas só se alcançam de barco e cada porto fica na beira do mar', () => {
  for (const dock of DOCKS) {
    const position = dockPosition(dock);
    assert.notEqual(terrainAt(position.x, position.y), T.SEA, `${dock.id} em terra`);
    assert.equal(terrainAt(position.x, position.boatY), T.SEA, `${dock.id} barco na água`);
    assert.equal(regionAt(position.x, position.y), dock.region, `${dock.id} região`);
  }
  // Entre o continente e cada ilha há mar.
  assert.equal(terrainAt(1800, 3800), T.SEA);
  assert.equal(terrainAt(5500, 3800), T.SEA);
});

test('cavernas: toda sala liga a escada de entrada à saída (ou ao chefe)', () => {
  for (const room of grid.rooms) {
    const { grid: plan, entry, exit } = room.plan;
    const seen = new Set([`${entry.col},${entry.row}`]);
    const queue = [[entry.col, entry.row]];
    while (queue.length) {
      const [col, row] = queue.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const c = col + dx;
        const r = row + dy;
        if (c < 0 || r < 0 || c >= ROOM_COLS || r >= ROOM_ROWS || !plan[r * ROOM_COLS + c] || seen.has(`${c},${r}`)) continue;
        seen.add(`${c},${r}`);
        queue.push([c, r]);
      }
    }
    assert.ok(seen.has(`${exit.col},${exit.row}`), `${room.cave} andar ${room.floor}`);
    for (const chamber of room.plan.chambers) assert.ok(plan[chamber.row * ROOM_COLS + chamber.col], `câmara ${room.cave}`);
  }
  assert.equal(grid.rooms.length, CAVES.reduce((sum, cave) => sum + cave.floors, 0));
  for (const cave of CAVES) {
    assert.equal(regionAt(cave.entrance.x, cave.entrance.y), cave.region, cave.id);
    assert.ok(ENEMY_TYPES[cave.boss]?.boss, cave.boss);
    for (const kind of cave.monsters) assert.ok(ENEMY_TYPES[kind], kind);
    assert.ok(CAVE_NODES[cave.theme], cave.theme);
  }
});

test('monstros: cerca de 55 espécies, todas com desenho, atributos e lugar onde vivem', () => {
  const kinds = Object.keys(ENEMY_TYPES);
  assert.ok(kinds.length >= 55, `${kinds.length} espécies`);
  for (const kind of kinds) {
    assert.ok(hasMonsterArt(kind), `arte de ${kind}`);
    assert.ok(habitatsOf(kind).length > 0, `habitat de ${kind}`);
  }
  for (const spawns of [...Object.values(REGION_SPAWNS), VALLEY_EXTRA_SPAWNS]) {
    for (const kind of [...spawns.day, ...spawns.night]) assert.ok(ENEMY_TYPES[kind] && !ENEMY_TYPES[kind].boss, kind);
  }
  assert.equal(CAVES.filter((cave) => ENEMY_TYPES[cave.boss]?.boss).length, 7);
  assert.deepEqual([...BESTIARY_ORDER].sort(), [...kinds].sort());
});

test('bestiário: conta abates, avisa na primeira vez e fica salvo', () => {
  const bestiary = new Bestiary();
  assert.equal(bestiary.recordKill('goblin'), true);
  assert.equal(bestiary.recordKill('goblin'), false);
  assert.equal(bestiary.recordKill('naoExiste'), false);
  const restored = new Bestiary(JSON.parse(JSON.stringify(bestiary.serialize())));
  assert.equal(restored.kills.goblin, 2);
  assert.equal(restored.progress.known, 1);
});

test('chão: todo ladrilho usado pelo mapa existe na folha gerada', () => {
  const sheet = JSON.parse(fs.readFileSync('public/assets/tiles/terrain-sheet.json', 'utf8'));
  const { ground } = layoutTiles(grid, { x: 1440, y: 1080 });
  const missing = new Set(ground.filter((name) => typeof name === 'string' && sheet.index[name] === undefined));
  assert.deepEqual([...missing], []);
  const atlas = JSON.parse(fs.readFileSync('public/assets/nature/biome-atlas.json', 'utf8'));
  const nature = JSON.parse(fs.readFileSync('public/assets/nature/nature-atlas.json', 'utf8'));
  for (const node of Object.values(REGION_NODES)) {
    assert.ok((node.atlas === 'biome' ? atlas : nature).frames[node.frame], node.frame);
  }
  for (const table of [...Object.values(TERRAIN_NODES), ...Object.values(CAVE_NODES)]) {
    for (const type of Object.keys(table)) assert.ok(REGION_NODES[type], type);
  }
  for (const key of Object.keys(REGION_INFO)) assert.ok(REGION_INFO[key].name);
});

test('sombras: compridas de manhã e à tarde, curtas ao meio-dia, viradas para lados opostos', () => {
  const morning = sunShadow(7);
  const noon = sunShadow(12);
  const evening = sunShadow(17);
  assert.ok(morning.length > noon.length && evening.length > noon.length);
  assert.ok(morning.angle > 0 && evening.angle < 0);
  assert.ok(sunShadow(23).alpha < noon.alpha);
});
