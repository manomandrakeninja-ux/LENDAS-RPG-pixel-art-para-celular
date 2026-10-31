import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  CAVES, DUNGEONS, CAVE_NODES, DOCKS, OVERWORLD, REGION_INFO, REGION_NODES, REGION_SPAWNS, ROADS, ROAD_SIGNS, ROOM_COLS, ROOM_ROWS, T, TERRAIN_NODES, TILE,
  TOWERS, TREASURE_SPOTS, VALLEY, VILLAGES, VALLEY_EXTRA_SPAWNS, WORLD_COLS, OVERWORLD_ROWS, buildTerrainGrid, compass8, dockPosition, pointOnRoad, regionAt, roadAt, terrainAt
} from '../src/data/worldRegions.js';
import { layoutTiles } from '../src/data/terrainLayout.js';
import { ENEMY_TYPES } from '../src/data/enemies.js';
import { hasMonsterArt } from '../src/art/monsters.js';
import { BESTIARY_ORDER, Bestiary, habitatsOf } from '../src/game/Bestiary.js';
import { sunShadow } from '../src/data/sunlight.js';

const grid = buildTerrainGrid();

test('mundo: 400x300 ladrilhos e o Vale continua inteiro (mesmas coordenadas)', () => {
  assert.equal(WORLD_COLS, 400);
  assert.equal(OVERWORLD_ROWS, 300);
  assert.equal(OVERWORLD.width, 19200);
  assert.equal(OVERWORLD.height, 14400);
  for (let x = 24; x < VALLEY.width; x += 240) {
    for (let y = 24; y < VALLEY.height; y += 240) assert.equal(regionAt(x, y), 'vale', `${x},${y}`);
  }
  const seen = new Set();
  for (let x = 24; x < grid.cols * TILE; x += 96) for (let y = 24; y < OVERWORLD.height; y += 96) seen.add(regionAt(x, y));
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
  // Entre o continente e cada ilha há mar (costa em ~65% da altura, ilhas começam em ~73%).
  assert.equal(terrainAt(Math.round(OVERWORLD.width * 0.25), Math.round(OVERWORLD.height * 0.72)), T.SEA);
  assert.equal(terrainAt(Math.round(OVERWORLD.width * 0.764), Math.round(OVERWORLD.height * 0.72)), T.SEA);
});

test('POIs do mapa grande: toda entrada cai na região declarada e em terra firme', () => {
  for (const cave of [...CAVES, ...TOWERS]) {
    const { x, y } = cave.entrance;
    assert.ok(x > 0 && x < OVERWORLD.width && y > 0 && y < OVERWORLD.height, `${cave.id} dentro do mapa`);
    assert.equal(regionAt(x, y), cave.region, `${cave.id} região`);
    const terrain = terrainAt(x, y);
    assert.ok(![T.SEA, T.LAVA, T.VOID, T.WALL].includes(terrain), `${cave.id} em terra firme (terrain ${terrain})`);
  }
  for (const dock of DOCKS) {
    const position = dockPosition(dock);
    assert.equal(regionAt(position.x, position.y), dock.region, `${dock.id} região`);
    assert.notEqual(terrainAt(position.x, position.y), T.SEA, `${dock.id} píer em terra`);
    assert.equal(terrainAt(position.x, position.boatY), T.SEA, `${dock.id} barco no mar`);
  }
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
  assert.equal(grid.rooms.length, DUNGEONS.reduce((sum, cave) => sum + cave.floors, 0));
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
  assert.equal(CAVES.filter((cave) => ENEMY_TYPES[cave.boss]?.boss).length, CAVES.length);
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
  const { ground, overlay, overlay2 } = layoutTiles(grid, { x: 1440, y: 1080 });
  const missing = new Set([...ground, ...overlay, ...overlay2].filter((name) => typeof name === 'string' && sheet.index[name] === undefined));
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

test('estradas: passam por terra firme, alcançam os destinos e não viram mar/lava', () => {
  assert.ok(ROADS.length >= 5);
  let roadTiles = 0;
  for (const road of ROADS) {
    // Todo ponto de controle da estrada fica em chão andável (ou píer de porto).
    for (const [x, y] of road.points) {
      const terrain = terrainAt(x, y);
      assert.ok(![T.SEA, T.LAVA, T.WALL, T.VOID].includes(terrain), `${road.name} em ${terrain} (${x},${y})`);
      assert.ok(roadAt(x, y), `${road.name} deveria estar na estrada em ${x},${y}`);
    }
    // Um ponto no meio do primeiro segmento também é estrada.
    const [ax, ay] = road.points[0];
    const [bx, by] = road.points[1];
    assert.ok(roadAt((ax + bx) / 2, (ay + by) / 2), road.name);
  }
  for (let row = 0; row < OVERWORLD_ROWS; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const kind = grid.terrain[row * grid.cols + col];
      if (kind === T.ROAD) {
        roadTiles += 1;
        assert.ok(![T.SEA, T.LAVA, T.MURK, T.ICE].includes(terrainAt(col * TILE + TILE / 2, row * TILE + TILE / 2)));
      }
    }
  }
  assert.ok(roadTiles > 500, `estradas demais sumidas (${roadTiles} ladrilhos)`);
});

test('placas de estrada: existem, ficam em terra firme perto de estrada e apontam para um POI', () => {
  assert.ok(ROAD_SIGNS.length >= 10, `poucas placas (${ROAD_SIGNS.length})`);
  for (const sign of ROAD_SIGNS) {
    assert.ok(![T.SEA, T.LAVA, T.WALL, T.VOID].includes(terrainAt(sign.x, sign.y)), `placa na água em ${sign.x},${sign.y}`);
    assert.ok(roadAt(sign.x, sign.y) || roadAt(sign.x + 40, sign.y) || roadAt(sign.x - 40, sign.y) || roadAt(sign.x, sign.y + 40) || roadAt(sign.x, sign.y - 40), `placa longe da estrada em ${sign.x},${sign.y}`);
    assert.ok(sign.label && sign.poi && Number.isFinite(sign.poi.x), 'placa sem destino');
  }
});

test('vilarejos: cada um cai na região certa, em terra firme, com casas andáveis e fala', () => {
  assert.ok(VILLAGES.length >= 4);
  for (const village of VILLAGES) {
    assert.equal(regionAt(village.x, village.y), village.region, `${village.id} região`);
    assert.ok(![T.SEA, T.LAVA, T.WALL, T.VOID, T.MURK].includes(terrainAt(village.x, village.y)), `${village.id} centro`);
    assert.ok(village.houses.length >= 3, `${village.id} precisa de 3 casas`);
    for (const [dx, dy] of village.houses) {
      const terrain = terrainAt(village.x + dx, village.y + dy);
      assert.ok(![T.SEA, T.LAVA, T.WALL, T.VOID, T.MURK].includes(terrain), `${village.id} casa em ${terrain}`);
    }
    assert.ok(village.lines.length >= 2 && village.name, `${village.id} sem fala`);
  }
});

test('baús de tesouro: espalhados longe do acampamento e dos POIs, só em terra firme', () => {
  assert.ok(TREASURE_SPOTS.length >= 12, `poucos baús (${TREASURE_SPOTS.length})`);
  const camp = { x: Math.round(OVERWORLD.width * 0.075), y: Math.round(OVERWORLD.height * 0.075) };
  for (const spot of TREASURE_SPOTS) {
    assert.ok(![T.SEA, T.LAVA, T.WALL, T.VOID, T.MURK, T.ICE].includes(terrainAt(spot.x, spot.y)), `baú em ${terrainAt(spot.x, spot.y)}`);
    assert.ok(Math.hypot(spot.x - camp.x, spot.y - camp.y) >= 1400, 'baú perto demais do acampamento');
    for (const cave of CAVES) assert.ok(Math.hypot(spot.x - cave.entrance.x, spot.y - cave.entrance.y) >= 420, 'baú em cima de caverna');
    assert.ok(REGION_INFO[spot.region], `região ${spot.region}`);
  }
});

test('pointOnRoad: percorre a estrada proporcionalmente ao comprimento e para nas pontas', () => {
  for (const road of ROADS) {
    const start = pointOnRoad(road, 0);
    const end = pointOnRoad(road, 1);
    const mid = pointOnRoad(road, 0.5);
    assert.ok(Math.hypot(start.x - road.points[0][0], start.y - road.points[0][1]) < 1, 'início');
    const last = road.points[road.points.length - 1];
    assert.ok(Math.hypot(end.x - last[0], end.y - last[1]) < 1, 'fim');
    assert.ok(mid.x > 0 && mid.y > 0, 'meio válido');
    // t fora de 0..1 prende nas pontas.
    const over = pointOnRoad(road, 5);
    assert.ok(Math.hypot(over.x - last[0], over.y - last[1]) < 1, 'limite superior');
  }
});

test('compass8: bússola de 8 ventos aponta para o lado certo (y para baixo = sul)', () => {
  assert.equal(compass8(10, 0), 'L');
  assert.equal(compass8(0, 10), 'S');
  assert.equal(compass8(-10, 0), 'O');
  assert.equal(compass8(0, -10), 'N');
  assert.equal(compass8(10, 10), 'SE');
  assert.equal(compass8(-10, -10), 'NO');
  assert.equal(compass8(-10, 10), 'SO');
  assert.equal(compass8(10, -10), 'NE');
});

test('sombras: compridas de manhã e à tarde, curtas ao meio-dia, viradas para lados opostos', () => {
  const morning = sunShadow(7);
  const noon = sunShadow(12);
  const evening = sunShadow(17);
  assert.ok(morning.length > noon.length && evening.length > noon.length);
  assert.ok(morning.angle > 0 && evening.angle < 0);
  assert.ok(sunShadow(23).alpha < noon.alpha);
});
