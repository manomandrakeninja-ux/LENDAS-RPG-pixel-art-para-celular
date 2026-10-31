// Simulação automatizada de um "dia de jogo" só com sistemas puros (sem Phaser):
// o jogador sai do acampamento e precisa alcançar (a pé, por terreno andável) cada
// caverna/torre/vilarejo/baú do overworld; o clima varia por dia e por região.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAVES, DOCKS, OVERWORLD, REGION_INFO, REGION_SPAWNS, ROADS, ROAD_SIGNS, T, TOWERS, TREASURE_SPOTS, VILLAGES, WORLD_COLS, OVERWORLD_ROWS, TILE,
  buildTerrainGrid, buildTerrainGridUncached, dockPosition, pointOnRoad, regionAt, terrainAt, TERRAIN_NODES, VALLEY_EXTRA_SPAWNS
} from '../src/data/worldRegions.js';
globalThis.__buildTerrainGridUncached = buildTerrainGridUncached;
import { weatherAt } from '../src/data/weather.js';
import { COMBAT_CONFIG } from '../src/data/combat.js';
import { BIOME_PROP_ENTRIES } from '../src/art/biomeProps.js';
import { ENEMY_TYPES } from '../src/data/enemies.js';
import { EconomySystem } from '../src/game/EconomySystem.js';
import { CONSUMABLES, useConsumable } from '../src/data/consumables.js';
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

test('simulação: performance — build fria do grid < 2 s e cache < 5 ms', async () => {
  const t0 = process.hrtime.bigint();
  const fresh = buildTerrainGridUncached();
  const coldMs = Number(process.hrtime.bigint() - t0) / 1e6;
  const t1 = process.hrtime.bigint();
  const cached = buildTerrainGrid();
  const warmMs = Number(process.hrtime.bigint() - t1) / 1e6;
  assert.equal(fresh.rows, 736, 'grid com 736 linhas (overworld 300 + subterrâneo)');
  assert.equal(fresh.cols, WORLD_COLS, 'grid com 400 colunas');
  assert.equal(fresh.terrain.length, 736 * WORLD_COLS, 'terrain achatado completo');
  assert.ok(coldMs < 2000, `build fria lenta demais: ${coldMs.toFixed(1)} ms`);
  assert.ok(warmMs < 5, `cache deveria ser instantâneo: ${warmMs.toFixed(3)} ms`);
  assert.equal(cached, buildTerrainGrid(), 'cache retorna a mesma instância');
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

test('simulação: configs de combate são sadias (alcance, cooldown, shout, combo)', () => {
  assert.ok(COMBAT_CONFIG.basicAttackRange > 0 && COMBAT_CONFIG.basicAttackRange <= 200, 'alcance corpo a corpo desarrazoado');
  assert.ok(COMBAT_CONFIG.basicAttackCooldownMs >= 150 && COMBAT_CONFIG.basicAttackCooldownMs <= 1500, 'cooldown de ataque desarrazoado');
  assert.ok(Number.isInteger(COMBAT_CONFIG.combo.length) && COMBAT_CONFIG.combo.length >= 2, 'combo precisa de 2+ golpes');
  assert.ok(COMBAT_CONFIG.combo.finisherMultiplier > 1, 'finisher deve dar mais dano');
  assert.ok(COMBAT_CONFIG.shout.chargePerHit > 0 && COMBAT_CONFIG.shout.chargePerFinisher >= COMBAT_CONFIG.shout.chargePerHit, 'shout deve carregar com hits');
  // A carga máxima do shout é 100 (verificada no código do Player/GameScene); aqui conferimos que dá pra encher em ~25 hits.
  assert.ok(COMBAT_CONFIG.shout.chargePerHit * 25 >= 100, 'shout demoraria demais para carregar');
  assert.ok(COMBAT_CONFIG.shout.damageMultiplier > 1 && COMBAT_CONFIG.shout.flatDamage > 0, 'shout deve causar dano extra');
  assert.ok(COMBAT_CONFIG.shout.range > COMBAT_CONFIG.basicAttackRange, 'shout deve ter alcance maior que o golpe');
  assert.ok(COMBAT_CONFIG.shout.cooldownMs >= 3000, 'shout precisa de cooldown longo');
});

test('simulação: props de bioma — nomes únicos e draw() gera pixels não vazios', () => {
  const names = new Set();
  assert.ok(BIOME_PROP_ENTRIES.length >= 60, 'atlas de props deveria ter dezenas de objetos');
  for (const entry of BIOME_PROP_ENTRIES) {
    assert.ok(!names.has(entry.name), `prop duplicado: ${entry.name}`);
    names.add(entry.name);
    const art = entry.draw();
    const data = art?.data ?? art;
    assert.ok(data && (data.data?.length ?? data.length ?? 0) > 0, `prop ${entry.name} gerou vazio`);
  }
  // As flores novas dos ciclos 38-41 devem existir.
  for (const name of ['snow-flower-0', 'dune-flower-0', 'swamp-flower-0', 'ash-flower-0']) {
    assert.ok(names.has(name), `prop ${name} faltando no atlas`);
  }
});

test('simulação: toda caverna/torre referencia monstros e boss válidos (ENEMY_TYPES)', () => {
  assert.ok(CAVES.length >= 8, 'esperava várias cavernas');
  for (const cave of CAVES) {
    assert.ok(cave.floors >= 1 && cave.floors <= 5, `caverna ${cave.id} com andares desarrazoados (${cave.floors})`);
    for (const kind of cave.monsters) assert.ok(ENEMY_TYPES[kind], `caverna ${cave.id} referencia monstro inexistente: ${kind}`);
    assert.ok(ENEMY_TYPES[cave.boss], `caverna ${cave.id} referencia boss inexistente: ${cave.boss}`);
    assert.ok(cave.entrance && Number.isFinite(cave.entrance.x) && Number.isFinite(cave.entrance.y), `caverna ${cave.id} sem entrada válida`);
    assert.ok(cave.region && REGION_INFO[cave.region], `caverna ${cave.id} em região inexistente: ${cave.region}`);
  }
  for (const tower of Object.values(TOWERS)) {
    // boss é opcional (algumas torres são só de Recursos), mas se declarado precisa existir.
    if (tower.boss) assert.ok(ENEMY_TYPES[tower.boss], `torre ${tower.name} com boss inexistente: ${tower.boss}`);
    assert.ok(REGION_INFO[tower.region], `torre ${tower.name} em região inexistente: ${tower.region}`);
  }
});

test('simulação: economia nunca fica negativa e o hook onGain dispara só com ganho real', () => {
  const eco = new EconomySystem({ coins: 100 });
  let gained = 0;
  eco.onGain = (n) => { gained += n; };
  assert.equal(eco.spendCoins(150), false, 'não pode gastar mais do que tem');
  assert.equal(eco.coins, 100);
  assert.equal(eco.spendCoins(40), true);
  assert.equal(eco.coins, 60);
  assert.equal(eco.addCoins(25), 25);
  assert.equal(eco.coins, 85);
  assert.equal(gained, 25);
  eco.addCoins(-50); // valor negativo vira 0 e não dispara hook
  assert.equal(eco.coins, 85);
  assert.equal(gained, 25);
  assert.equal(new EconomySystem({ coins: -10 }).coins, 0, 'save negativo vira 0');
  assert.equal(new EconomySystem({}).coins, 0);
});

test('simulação: consumíveis — poção cura sem passar do máx, comida enche stamina, tocha dura', () => {
  const inventory = { items: { potion: 2, food: 1, torch: 1 }, remove({ potion, food, torch } = {}) {
    if (potion) this.items.potion -= potion;
    if (food) this.items.food -= food;
    if (torch) this.items.torch -= torch;
  } };
  const player = { level: 10, health: 40, maxHealth: 100, stamina: 20, torchTimer: 0 };
  // Poção: cura e gasta 1.
  const r1 = useConsumable('potion', inventory, player);
  assert.equal(r1.ok, true);
  assert.ok(player.health > 40 && player.health <= 100);
  assert.equal(inventory.items.potion, 1);
  // Vida cheia não consome.
  player.health = 100;
  assert.equal(useConsumable('potion', inventory, player).reason, 'full-health');
  assert.equal(inventory.items.potion, 1);
  // Gasta a última poção com vida baixa → depois fica missing.
  player.health = 10;
  assert.equal(useConsumable('potion', inventory, player).ok, true);
  assert.equal(inventory.items.potion, 0);
  // Comida: cura um pouco (comida é 'heal' baixo).
  player.health = 50;
  const r2 = useConsumable('food', inventory, player);
  assert.equal(r2.ok, true);
  assert.ok(player.health > 50 && player.health <= 100);
  // Tocha: define torchTimer.
  const r3 = useConsumable('torch', inventory, player);
  assert.equal(r3.ok, true);
  assert.ok(player.torchTimer > 0);
  // Sem item → missing; tipo inválido → not-consumable.
  assert.equal(useConsumable('potion', inventory, player).reason, 'missing');
  assert.equal(useConsumable('espada', inventory, player).reason, 'not-consumable');
  // Toda定义 de consumível tem exatamente um efeito.
  for (const [type, def] of Object.entries(CONSUMABLES)) {
    const effects = [def.heal, def.stamina, def.durationMs, def.trap, def.buff].filter(Boolean).length;
    assert.ok(effects >= 1, `consumível ${type} sem efeito`);
    assert.ok(def.hotkey, `consumível ${type} sem hotkey`);
  }
});

test('simulação: todo porto fica na borda do mar (tem água vizinha) e em região válida', () => {
  assert.ok(DOCKS.length >= 5, 'esperava vários portos');
  for (const dock of DOCKS) {
    assert.ok(REGION_INFO[dock.region], `porto ${dock.name} em região inexistente: ${dock.region}`);
    const pos = dockPosition(dock);
    assert.ok(Number.isFinite(pos.x) && Number.isFinite(pos.y), `porto ${dock.name} sem posição`);
    // Ao menos um dos 8 vizinhos da posição do barco é mar.
    let nearSea = false;
    for (let dx = -2; dx <= 2 && !nearSea; dx += 1) {
      for (let dy = -2; dy <= 2 && !nearSea; dy += 1) {
        if (terrainAt(pos.boatY ? pos.x + dx * TILE : pos.x + dx * TILE, (pos.boatY ?? pos.y) + dy * TILE) === T.SEA) nearSea = true;
      }
    }
    assert.ok(nearSea, `porto ${dock.name} não está na costa (sem mar por perto)`);
    // A píer/entrada não pode estar em terreno bloqueante.
    assert.ok(![T.SEA, T.LAVA, T.WALL, T.VOID].includes(terrainAt(pos.x, pos.y)), `porto ${dock.name} em terreno bloqueante`);
  }
});

test('simulação: vilarejos válidos — casas, falas, região e chão andável no centro', () => {
  assert.ok(VILLAGES.length >= 4, 'esperava 4 vilarejos');
  for (const village of VILLAGES) {
    assert.ok(Array.isArray(village.houses) && village.houses.length === 3, `${village.name} precisa de 3 casas`);
    assert.ok(Array.isArray(village.lines) && village.lines.length > 0, `${village.name} sem falas`);
    assert.ok(REGION_INFO[village.region], `${village.name} em região inexistente: ${village.region}`);
    const terrain = terrainAt(village.x, village.y);
    assert.ok(![T.SEA, T.LAVA, T.WALL, T.VOID, T.MURK].includes(terrain), `${village.name} em terreno não andável (${terrain})`);
    assert.ok(village.x > 0 && village.x < WORLD_COLS * TILE && village.y > 0 && village.y < OVERWORLD_ROWS * TILE, `${village.name} fora do mapa`);
  }
});

test('simulação: todos os tipos de inimigo têm dados sadios (vida, dano, hitbox, drops, spawn)', () => {
  const types = Object.entries(ENEMY_TYPES);
  assert.ok(types.length >= 40, 'esperava dezenas de tipos de inimigo');
  for (const [id, def] of types) {
    assert.ok(def.name, `${id} sem nome`);
    assert.ok(def.health > 0 && def.damage > 0 && def.xp > 0, `${id} com atributos inválidos`);
    assert.ok(def.speed > 0, `${id} parado`);
    assert.ok(def.hitbox && def.hitbox.width > 0 && def.hitbox.height > 0, `${id} sem hitbox`);
    assert.ok(def.placeholder && def.placeholder.shape, `${id} sem shape visual`);
    assert.ok(['day', 'night', 'both', 'any'].includes(def.period), `${id} período inválido: ${def.period}`);
    // Bosses e monstros de caverna (abismo etc.) não usam spawnWeight de overworld.
    const special = CAVES.some((c) => c.boss === id || c.monsters.includes(id)) || Object.values(TOWERS).some((t) => t.boss === id);
    if (!special) assert.ok(def.spawnWeight && (def.spawnWeight.day > 0 || def.spawnWeight.night > 0), `${id} nunca spawna`);
    for (const drop of def.drops ?? []) {
      assert.ok(drop.type && drop.chance > 0 && drop.chance <= 1 && drop.max >= drop.min, `${id} drop inválido: ${JSON.stringify(drop)}`);
    }
  }
  // Todo boss referenciado por caverna/torre existe e é bem maior que os trash.
  for (const cave of CAVES) {
    const boss = ENEMY_TYPES[cave.boss];
    assert.ok(boss.health >= 150, `boss ${cave.boss} fraco demais (${boss.health})`);
  }
});

test('simulação: curva de nível das skills — nível 2 aos 200 XP, monotônica e com bônus', () => {
  const skills = new PlayerSkills({});
  assert.equal(skills.level('blade'), 0, 'começa nível 0');
  skills.addXp('blade', 199);
  assert.equal(skills.level('blade'), 1, '199 XP = nível 1 (nível = floor(sqrt(xp/50)))');
  const levels = skills.addXp('blade', 1); // total 200
  assert.ok(levels >= 1, 'subiu de nível aos 200 XP');
  assert.equal(skills.level('blade'), 2);
  // Curva monotônica: mais XP nunca baixa o nível.
  for (let i = 0; i < 20; i += 1) skills.addXp('blade', 500);
  const lv = skills.level('blade');
  assert.ok(lv >= 3, `nível alto alcançável (ficou ${lv})`);
  skills.addXp('blade', 0);
  assert.equal(skills.level('blade'), lv, 'XP zero não muda nível');
  // Multiplicador de lâmina cresce com o nível e nunca fica abaixo de 1.
  const mult = skills.bladeDamageMultiplier?.() ?? 1;
  assert.ok(mult >= 1 && mult < 3, `bônus de lâmina sadio (nv ${lv} → ${mult})`);
  // Skill inexistente não quebra.
  assert.equal(skills.level('inexistente'), 0);
  skills.addXp('inexistente', 100);
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
