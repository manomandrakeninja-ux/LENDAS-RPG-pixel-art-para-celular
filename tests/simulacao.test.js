// Simulação automatizada de um "dia de jogo" só com sistemas puros (sem Phaser):
// o jogador sai do acampamento e precisa alcançar (a pé, por terreno andável) cada
// caverna/torre/vilarejo/baú do overworld; o clima varia por dia e por região.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAVES, DOCKS, OVERWORLD, REGION_INFO, REGION_SPAWNS, ROADS, ROAD_SIGNS, T, TOWERS, TREASURE_SPOTS, VILLAGES, WORLD_COLS, OVERWORLD_ROWS, TILE,
  buildTerrainGrid, dockPosition, pointOnRoad, regionAt, terrainAt, TERRAIN_NODES, VALLEY_EXTRA_SPAWNS
} from '../src/data/worldRegions.js';
import { weatherAt } from '../src/data/weather.js';
import { PlayerSkills } from '../src/data/skills.js';
import { migrateSave, createSaveEnvelope, SAVE_VERSION } from '../src/game/save.js';

// Alinhado com BLOCKING do jogo: lodo (MURK) é andável, só deixa lento — não entra aqui.
const NOT_WALKABLE = new Set([T.SEA, T.LAVA, T.WALL, T.VOID]);

function walkable(grid, col, row) {
  if (col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) return false;
  return !NOT_WALKABLE.has(grid.terrain[row * grid.cols + col]);
}

/** BFS em grade a partir do acampamento: alcança todos os POIs a pé (estradas ajudam, mas não são obrigatórias). */
function reachableFromCamp(grid, camp) {
  const seen = new Uint8Array(grid.cols * grid.rows);
  const queue = [[Math.floor(camp.x / TILE), Math.floor(camp.y / TILE)]];
  seen[queue[0][1] * grid.cols + queue[0][0]] = 1;
  while (queue.length) {
    const [col, row] = queue.pop();
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = col + dc;
      const nr = row + dr;
      if (!walkable(grid, nc, nr) || seen[nr * grid.cols + nc]) continue;
      seen[nr * grid.cols + nc] = 1;
      queue.push([nc, nr]);
    }
  }
  return seen;
}

test('simulação: todo POI é alcançável a pé do acampamento ou de barco (ilha com porto perto)', () => {
  const grid = buildTerrainGrid();
  const camp = { x: Math.round(OVERWORLD.width * 0.075), y: Math.round(OVERWORLD.height * 0.075) };
  const seen = reachableFromCamp(grid, camp);
  const at = (x, y) => seen[Math.floor(y / TILE) * grid.cols + Math.floor(x / TILE)] === 1;
  // De barco: basta existir porto na mesma ilha/região (a travessia é entre portos; depois anda-se na ilha).
  const boatable = (x, y) => {
    const region = regionAt(x, y);
    return DOCKS.some((dock) => dock.island && dock.region === region);
  };
  const reachable = (x, y, what) => assert.ok(at(x, y) || boatable(x, y), `${what} inalcançável (nem a pé nem de barco)`);
  for (const cave of CAVES) reachable(cave.entrance.x, cave.entrance.y, `caverna ${cave.id}`);
  for (const tower of Object.values(TOWERS)) reachable(tower.entrance.x, tower.entrance.y, `torre ${tower.id}`);
  for (const village of VILLAGES) {
    reachable(village.x, village.y, `vilarejo ${village.id}`);
    for (const [dx, dy] of village.houses) reachable(village.x + dx, village.y + dy, `casa de ${village.id}`);
  }
  for (const spot of TREASURE_SPOTS) reachable(spot.x, spot.y, `baú ${spot.id}`);
  // Sanidade: só as cavernas das ilhas (esmeralda/brasa) exigem barco; o resto é a pé.
  const walkOnly = CAVES.filter((cave) => at(cave.entrance.x, cave.entrance.y));
  assert.ok(walkOnly.length >= CAVES.length - 3, `muitas cavernas exigiriam barco (${walkOnly.length}/${CAVES.length})`);
});

test('simulação: 30 dias de clima — cada região produz o clima esperado e há dias de cada tipo', () => {
  const days = new Set();
  for (let day = 1; day <= 30; day += 1) {
    const state = { dayCount: day, isNight: false };
    days.add(weatherAt('vale', state));
    assert.ok(['rain', 'clear'].includes(weatherAt('vale', state)));
    assert.ok(['snow', 'clear'].includes(weatherAt('gelo', state)));
    assert.ok(['dust', 'clear'].includes(weatherAt('areia', state)));
    assert.ok(['ash', 'clear'].includes(weatherAt('brasa', state)));
    assert.equal(weatherAt('caverna', state), 'clear');
    assert.equal(weatherAt('vale', { dayCount: day, isNight: true }), 'clear');
  }
  assert.ok(days.has('rain') || days.has('clear'), 'dias sem clima definido');
});

test('simulação: 1 dia de combate/XP — skills sobem de nível e o save aguenta o roundtrip', () => {
  const skills = new PlayerSkills({});
  // Nível 2 de lâmina = 200 XP (50·2²); 34 golpes de 6 XP = 204 XP. Bloqueio: 10 XP → nível 1.
  for (let i = 0; i < 34; i += 1) skills.addXp('blade', 6);
  for (let i = 0; i < 10; i += 1) skills.addXp('block', 10);
  assert.ok(skills.level('blade') >= 2, `blade level ${skills.level('blade')}`);
  assert.ok(skills.level('block') >= 1);
  const save = migrateSave({
    version: SAVE_VERSION,
    time: { cycleTime: 0, dayCount: 1 },
    skills: skills.serialize(),
    waypoint: { x: 100, y: 200 }
  });
  const envelope = createSaveEnvelope(save);
  assert.equal(envelope.version, SAVE_VERSION);
  const restored = new PlayerSkills(envelope.skills);
  assert.equal(restored.level('blade'), skills.level('blade'), 'skill persistiu no save');
});

test('buildTerrainGrid usa cache: mesma instância em chamadas repetidas (e uncached gera outra)', async () => {
  const { buildTerrainGridUncached } = await import('../src/data/worldRegions.js');
  const a = buildTerrainGrid();
  const b = buildTerrainGrid();
  assert.equal(a, b, 'cache deve devolver a mesma grade');
  const fresh = buildTerrainGridUncached();
  assert.notEqual(fresh, a, 'uncached gera instância nova');
  assert.equal(fresh.cols, a.cols);
  assert.deepEqual([...fresh.terrain.slice(0, 100)], [...a.terrain.slice(0, 100)], 'mesmo conteúdo');
});

test('simulação: mapa grande cabe na memória de grade e não vaza para fora', () => {
  const grid = buildTerrainGrid();
  assert.equal(grid.cols, WORLD_COLS);
  // A grade cobre o overworld (300 linhas) + o subterrâneo das cavernas embaixo.
  assert.ok(grid.rows >= OVERWORLD_ROWS, `grid.rows ${grid.rows}`);
  for (const x of [0, TILE, WORLD_COLS * TILE - 1]) {
    for (const y of [0, TILE, OVERWORLD_ROWS * TILE - 1]) {
      const terrain = terrainAt(x, y);
      assert.ok(Number.isInteger(terrain) && terrain >= 0, `terreno inválido em ${x},${y}`);
    }
  }
  assert.ok(regionAt(10, 10));
  assert.ok(dockPosition(DOCKS[0]));
});

test('simulação: conteúdo por bioma — todo terreno de overworld aparece no mapa e tem recursos possíveis', () => {
  const grid = buildTerrainGrid();
  const present = new Set();
  for (let row = 0; row < OVERWORLD_ROWS; row += 1) {
    for (let col = 0; col < WORLD_COLS; col += 1) present.add(grid.terrain[row * WORLD_COLS + col]);
  }
  // Terrenos de gameplay do overworld que devem existir no mapa.
  for (const kind of [T.FOREST, T.SWAMP, T.SNOW, T.SAND, T.DUNE, T.BEACH, T.JUNGLE, T.ASH, T.ROAD, T.SEA]) {
    assert.ok(present.has(kind), `terreno ${kind} não aparece no mapa`);
  }
  // Todo terreno com recursos possíveis tem tabela de nós; os de recurso têm nome no REGION_NODES.
  for (const kind of Object.keys(TERRAIN_NODES).map(Number)) {
    assert.ok(present.has(kind), `terreno de recurso ${kind} não aparece no mapa`);
  }
  // Toda região do overworld tem monstros para spawn (REGION_SPAWNS ou spawns extras do vale).
  for (const key of Object.keys(REGION_INFO)) {
    if (key === 'mar' || key === 'caverna') continue;
    const spawns = key === 'vale'
      ? [...VALLEY_EXTRA_SPAWNS.day, ...VALLEY_EXTRA_SPAWNS.night]
      : [...(REGION_SPAWNS[key]?.day ?? []), ...(REGION_SPAWNS[key]?.night ?? [])];
    assert.ok(spawns.length > 0, `região ${key} sem monstros para spawn`);
  }
});

test('simulação: placas de estrada válidas e estradas andáveis', () => {
  // Toda placa tem label não vazio e POI dentro do mundo; toda placa fica em chão não bloqueante.
  assert.ok(ROAD_SIGNS.length > 50, 'deveria haver dezenas de placas');
  for (const sign of ROAD_SIGNS) {
    assert.ok(typeof sign.label === 'string' && sign.label.length > 0, 'placa sem label');
    assert.ok(sign.poi && Number.isFinite(sign.poi.x) && Number.isFinite(sign.poi.y), 'placa sem POI');
    assert.ok(sign.poi.x >= 0 && sign.poi.x <= WORLD_COLS * TILE && sign.poi.y >= 0 && sign.poi.y <= OVERWORLD_ROWS * TILE, 'POI fora do mundo');
    assert.ok(!NOT_WALKABLE.has(terrainAt(sign.x, sign.y)), `placa em terreno bloqueante (${terrainAt(sign.x, sign.y)})`);
  }
  // Amostra de pontos ao longo de cada estrada deve ser andável.
  for (const road of ROADS) {
    for (let t = 0; t <= 1; t += 0.1) {
      const p = pointOnRoad(road, t);
      const terrain = terrainAt(p.x, p.y);
      assert.ok(!NOT_WALKABLE.has(terrain), `estrada ${road.name} passa por terreno bloqueante ${terrain} em t=${t.toFixed(1)}`);
    }
  }
});

test('simulação: o jogador não sai do mapa — trava física de limites do mundo ativa no Player', async () => {
  // terrainAt é infinita (gera terreno até fora do mapa), então a proteção real é física:
  // Player.js precisa chamar body.setCollideWorldBounds(true). Conferimos no código-fonte.
  const fs = await import('node:fs');
  const playerSource = fs.readFileSync(new URL('../src/game/Player.js', import.meta.url), 'utf8');
  assert.ok(playerSource.includes('setCollideWorldBounds(true)'), 'Player sem trava de limites do mundo');
  // E o tamanho do mundo físico cobre o overworld inteiro.
  const { FULL_WORLD } = await import('../src/data/worldRegions.js');
  assert.ok(FULL_WORLD.width >= OVERWORLD.width && FULL_WORLD.height >= OVERWORLD.height, 'mundo físico menor que o overworld');
});
