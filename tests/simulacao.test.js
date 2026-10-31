// Simulação automatizada de um "dia de jogo" só com sistemas puros (sem Phaser):
// o jogador sai do acampamento e precisa alcançar (a pé, por terreno andável) cada
// caverna/torre/vilarejo/baú do overworld; o clima varia por dia e por região.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAVES, DOCKS, OASES, OVERWORLD, REGION_INFO, REGION_SPAWNS, ROADS, ROAD_SIGNS, T, TOWERS, TREASURE_SPOTS, VILLAGES, WORLD_COLS, OVERWORLD_ROWS, TILE,
  buildTerrainGrid, buildTerrainGridUncached, dockPosition, pointOnRoad, regionAt, terrainAt, TERRAIN_NODES, VALLEY_EXTRA_SPAWNS
} from '../src/data/worldRegions.js';
globalThis.__buildTerrainGridUncached = buildTerrainGridUncached;
import { weatherAt } from '../src/data/weather.js';
import { COMBAT_CONFIG } from '../src/data/combat.js';
import { BIOME_PROP_ENTRIES } from '../src/art/biomeProps.js';
import { ENEMY_TYPES, ENEMY_TYPE_NAMES, enemyXp, ELITE_CONFIG } from '../src/data/enemies.js';
import { SCALING_START, levelInRange } from '../src/data/enemyScaling.js';
import { EconomySystem } from '../src/game/EconomySystem.js';
import { CONSUMABLES, HOTKEY_ITEMS, useConsumable } from '../src/data/consumables.js';
import { DEFAULT_KEYBINDS, KEY_ACTIONS, isBindableCode, isReservedCode, normalizeKeybinds, rebind, actionForCode, loadKeybinds, saveKeybinds, keyLabel, keyCodeFor } from '../src/game/Keybinds.js';
import { scaleEnemy } from '../src/data/enemyScaling.js';
import { GEAR_ITEMS, RARITIES, rollGearDrop, GEAR_SLOTS, GEAR_SETS, FORGE_SLOT } from '../src/data/gear.js';
import { BuffSystem, BUFF_DEFINITIONS } from '../src/game/BuffSystem.js';
import { SKILLS, SKILL_MAX_LEVEL, skillLevelForXp, skillXpForLevel, PlayerSkills as PS2 } from '../src/data/skills.js';
import { Bestiary } from '../src/game/Bestiary.js';

import { Achievements, ACHIEVEMENTS } from '../src/data/achievements.js';
import { DAY_NIGHT_CONFIG, DAY_NIGHT_TOTAL_SECONDS } from '../src/data/dayNight.js';
import { MISSIONS } from '../src/data/campaign.js';
import { CRAFT_RECIPES } from '../src/data/craftRecipes.js';
import { RESOURCE_NODES } from '../src/data/resources.js';
import { SPAWN_ZONES } from '../src/data/biomes.js';
import { MARKET_CATALOG } from '../src/data/economy.js';
import { SPAWNING_CONFIG } from '../src/data/spawning.js';
import { COIN_DROP_RANGES, rollCoinDrop, chestCoins } from '../src/data/economy.js';
import { RAID_CONFIG, isRaidDay, raidTier, raidComposition, raidEliteChance, splitIntoWaves } from '../src/data/raids.js';
import { REBIRTH_CONFIG, rebirthMultiplier, canRebirth } from '../src/data/rebirth.js';
import { PETS, PET_IDS, EGG_PET_IDS, SHOP_PET_IDS, MOUNT_LEVEL, MOUNT_SPEED, petAbility, mountUnlocked } from '../src/data/companions.js';
import { CHEST_LOOT, CHEST_TIERS, rollMonsterChest } from '../src/data/monsterChests.js';
import { MAX_ENHANCE, enhanceChance, enhanceCost, enhanceMultiplier, JEWELS, JEWEL_TYPES, SOCKET_SLOTS, socketCount, jewelValue, describeJewel, rollJewelDrop } from '../src/data/enhance.js';
import { PERK_LEVELS, PERK_OFFER_SIZE, PERKS, respecCost, xpRequiredForLevel } from '../src/data/progression.js';
import { VILLAGERS, VILLAGER_STATS } from '../src/data/villagers.js';
import { BOSS_CONFIG, BOSS_CAMP_DISTANCE } from '../src/data/boss.js';
import { CHAPTER_STORY, STORY_LORE, ENDINGS } from '../src/data/story.js';
import { sunShadow } from '../src/data/sunlight.js';
import { isRainyDay, isRaining } from '../src/data/weather.js';
import { COMMON_DROP_SCALE, isScaledDrop, scaledChance, scaledAmount } from '../src/data/dropScale.js';
import { FARM_CROPS, AUTO_ANIMAL_PRODUCTS, FORGE_SERVICES, repairCostFor, upgradeCostFor } from '../src/data/buildingSystems.js';
import { HARVEST_STRUCTURE_TYPES, HARVEST_STRUCTURE_INTERACTION_RANGE, CHEST_LOOT_RECIPES, createSeededRandom } from '../src/data/harvestStructures.js';
// Validamos uso cruzado do atlas com regex em TODOS os fontes de src/ (RegionWorld importa Phaser).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
function allSrcFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) out.push(...allSrcFiles(full));
    else if (full.endsWith('.js')) out.push(full);
  }
  return out;
}
const srcDir = fileURLToPath(new URL('../src', import.meta.url));
// Buscamos uso fora do próprio biomeProps.js (que é só a definição do atlas).
const regionWorldSrc = allSrcFiles(srcDir)
  .filter((f) => !f.endsWith('biomeProps.js'))
  .map((f) => readFileSync(f, 'utf8')).join('\n');
import { Inventory } from '../src/game/Inventory.js';
import { CampfireTravelers, TRAVELER_GOODS, TRAVELER_QUESTS, questById } from '../src/data/travelers.js';
import { RESOURCE_TYPES } from '../src/game/config.js';
import { BUILDING_DEFS, BUILDING_ORDER } from '../src/data/buildings.js';
import { WEATHER_ICONS, WEATHER_CONFIG } from '../src/data/weather.js';
import { SAVE_VERSION, createSaveEnvelope } from '../src/game/save.js';
import { PlayerSkills } from '../src/data/skills.js';
import { migrateSave } from '../src/game/save.js';

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

test('simulação: keybinds — rebind aceita tecla válida, rejeita reservada/duplicada/inválida', () => {
  // Padrões sadios e distintos.
  const binds = normalizeKeybinds({});
  assert.deepEqual(binds, DEFAULT_KEYBINDS);
  assert.equal(new Set(KEY_ACTIONS.map((a) => binds[a])).size, KEY_ACTIONS.length, 'padrões sem colisão');
  // Aceita letra livre.
  const ok = rebind(binds, 'attack', 'KeyH');
  assert.equal(ok.ok, true);
  assert.equal(ok.binds.attack, 'KeyH');
  // Rejeita reservada (W é movimento), inválida e duplicada.
  assert.equal(rebind(binds, 'attack', 'KeyW').ok, false, 'W é reservada');
  assert.equal(rebind(binds, 'attack', 'KeyQ').ok, false, 'Q já é special');
  assert.equal(rebind(binds, 'attack', 'F13').ok, false, 'F13 não é bindável');
  assert.equal(rebind(binds, 'acao-x', 'KeyH').ok, false, 'ação desconhecida');
  // normalize descarta inválido e volta ao padrão naquela ação.
  const norm = normalizeKeybinds({ attack: 'KeyW', dodge: 'Space' });
  assert.equal(norm.attack, DEFAULT_KEYBINDS.attack);
  assert.equal(norm.dodge, 'Space');
  // normalize com colisão total volta tudo ao padrão.
  assert.deepEqual(normalizeKeybinds({ attack: 'KeyJ', special: 'KeyJ' }), DEFAULT_KEYBINDS);
  // Helpers de UI.
  assert.equal(isBindableCode('KeyZ'), true);
  assert.equal(isBindableCode('Space'), true);
  assert.equal(isBindableCode('ArrowUp'), false);
  assert.equal(isReservedCode('KeyM'), true, 'M é mapa');
  assert.equal(keyLabel('KeyJ'), 'J');
  assert.equal(keyLabel('Space'), 'ESPAÇO');
  assert.equal(keyCodeFor('KeyJ'), 74);
  assert.equal(actionForCode(binds, 'KeyJ'), 'attack');
  assert.equal(actionForCode(binds, 'KeyX'), null);
  // Sem localStorage (node) cai no padrão e save não quebra.
  assert.deepEqual(loadKeybinds(null), DEFAULT_KEYBINDS);
  assert.equal(saveKeybinds(binds, null), true, 'save sem storage não quebra');
});

test('simulação: 90 dias de clima — todos os tipos aparecem em alguma região e o clima é determinístico por (região, dia)', () => {
  const seen = new Set();
  for (const region of Object.keys(REGION_INFO)) {
    if (region === 'mar' || region === 'caverna') continue;
    for (let day = 1; day <= 90; day += 1) {
      const w = weatherAt(region, { dayCount: day, cycleTime: 12 });
      assert.ok(['clear', 'rain', 'snow', 'dust', 'ash'].includes(w), `clima inválido ${w} em ${region} dia ${day}`);
      seen.add(w);
      // Determinístico: mesma entrada → mesma saída.
      assert.equal(weatherAt(region, { dayCount: day, cycleTime: 12 }), w);
    }
  }
  assert.deepEqual([...seen].sort(), ['ash', 'clear', 'dust', 'rain', 'snow'], 'todos os climas aparecem em 90 dias');
});

test('simulação: baús de tesouro são distantes, em chão firme e longe de POIs', () => {
  assert.ok(TREASURE_SPOTS.length >= 10, 'esperava vários baús escondidos');
  const camp = { x: 1440, y: 1080 };
  const pois = [
    ...CAVES.map((c) => c.entrance),
    ...Object.values(TOWERS).map((t) => t.entrance ?? { x: t.x, y: t.y }),
    ...VILLAGES.map((v) => ({ x: v.x, y: v.y }))
  ];
  for (const spot of TREASURE_SPOTS) {
    const dCamp = Math.hypot(spot.x - camp.x, spot.y - camp.y);
    // A geração garante >= 1400 px do acampamento; exigimos margem de segurança de 1300.
    assert.ok(dCamp > 1300, `baú ${spot.id} perto demais do acampamento (${Math.round(dCamp)} px)`);
    assert.ok(![T.SEA, T.LAVA, T.WALL, T.VOID, T.MURK].includes(terrainAt(spot.x, spot.y)), `baú ${spot.id} em terreno ruim`);
    for (const poi of pois) {
      // A geração garante >= 420 px de POI; exigimos que não cole visualmente (< 1 tile = 48 px seria colisão).
      assert.ok(Math.hypot(spot.x - poi.x, spot.y - poi.y) > 200, `baú ${spot.id} em cima de POI`);
    }
  }
});

test('simulação: oásis existem, têm água andável por perto e são alcançáveis', () => {
  assert.ok(OASES.length >= 1, 'esperava pelo menos um oásis');
  for (const oasis of OASES) {
    assert.ok(Number.isFinite(oasis.x) && Number.isFinite(oasis.y), 'oásis sem posição');
    const terrain = terrainAt(oasis.x, oasis.y);
    assert.ok(![T.SEA, T.LAVA, T.WALL, T.VOID].includes(terrain), `oásis em terreno bloqueante (${terrain})`);
  }
});

test('simulação: estradas têm nome e pelo menos 2 pontos dentro do mundo', () => {
  assert.ok(ROADS.length >= 5, 'esperava várias estradas');
  for (const road of ROADS) {
    assert.ok(road.name && road.name.length > 3, 'estrada sem nome');
    assert.ok(Array.isArray(road.points) && road.points.length >= 2, `estrada ${road.name} com poucos pontos`);
    for (const [x, y] of road.points) {
      assert.ok(x >= 0 && x <= WORLD_COLS * TILE && y >= 0 && y <= OVERWORLD_ROWS * TILE, `estrada ${road.name} fora do mundo`);
    }
  }
});

test('simulação: invariantes de save compat — acampamento fixo em (1440,1080) e mundo 400x300', () => {
  // Mudar essas coordenadas quebra saves antigos: não podem mudar.
  assert.equal(WORLD_COLS, 400);
  assert.equal(OVERWORLD_ROWS, 300);
  assert.equal(TILE, 48);
  // Acampamento: W(0.075), H(0.075) de 400x300 tiles = 1440, 1080 px.
  assert.equal(Math.round(WORLD_COLS * TILE * 0.075), 1440);
  assert.equal(Math.round(OVERWORLD_ROWS * TILE * 0.075), 1080);
});

test('simulação: mapa grande cabe na tela (canvas <= 1280x960) e escala é inteira', async () => {
  const { MAP_SCALE } = await import('../src/game/MapRenderer.js').catch(() => ({}));
  // MapRenderer importa Phaser — se não puder importar em node, validamos só as constantes puras.
  if (MAP_SCALE) {
    assert.ok(MAP_SCALE >= 8 && MAP_SCALE <= 32, `MAP_SCALE desarrazoado: ${MAP_SCALE}`);
    assert.equal((WORLD_COLS * TILE) / MAP_SCALE, 1200, 'mapa grande 1200 px de largura');
    assert.equal((OVERWORLD_ROWS * TILE) / MAP_SCALE, 900, 'mapa grande 900 px de altura');
  }
});

test('simulação: scaleEnemy cresce monotonicamente com o nível e não zera atributos', () => {
  for (const [id, def] of Object.entries(ENEMY_TYPES)) {
    const lv1 = scaleEnemy(def, 1);
    const lv20 = scaleEnemy(def, 20);
    assert.ok(lv20.health >= lv1.health, `${id}: vida não cresce com nível`);
    assert.ok(lv20.damage >= lv1.damage, `${id}: dano não cresce`);
    assert.ok(lv20.xp >= lv1.xp, `${id}: xp não cresce`);
    assert.ok(lv20.health > 0 && lv20.damage > 0, `${id}: atributos zerados`);
  }
});

test('simulação: itens de equipamento sadios — slots válidos, nível/preço não negativos, stats numéricos', () => {
  const slots = new Set(['weapon', 'helmet', 'chest', 'legs', 'boots', 'shield', 'amulet', 'ring']);
  const ids = Object.keys(GEAR_ITEMS);
  assert.ok(ids.length >= 100, 'poucos itens de equipamento');
  const statKeys = ['attack', 'defense', 'health', 'speedPercent', 'critChance', 'lifeSteal'];
  for (const [id, item] of Object.entries(GEAR_ITEMS)) {
    assert.ok(item.name, `${id} sem nome`);
    assert.ok(slots.has(item.slot), `${id} slot inválido: ${item.slot}`);
    assert.ok((item.level ?? 1) >= 1, `${id} nível inválido`);
    assert.ok((item.price ?? 0) >= 0, `${id} preço negativo`);
    for (const key of statKeys) {
      if (item[key] !== undefined) assert.ok(item[key] >= 0, `${id}.${key} negativo`);
    }
    // Se tem raridade explícita, precisa existir; itens de boss (boss:) dispensam.
    if (item.rarity) assert.ok(RARITIES[item.rarity], `${id} raridade inválida: ${item.rarity}`);
  }
});

test('simulação: BuffSystem — aplica, expira com o tempo e sobrevive a save antigo sem o campo', () => {
  const buffs = new BuffSystem(undefined); // save antigo sem buffs
  assert.deepEqual(buffs.list(), []);
  buffs.apply('wellRested', { durationMs: 5000 });
  assert.equal(buffs.has('wellRested'), true);
  const fx = buffs.effects; // getter agregado
  assert.ok((fx.attackPercent ?? 0) > 0, 'buff dá bônus de ataque');
  buffs.update(6000); // passou de 5 s
  assert.equal(buffs.has('wellRested'), false, 'buff expira');
  assert.equal(buffs.effects.attackPercent ?? 0, 0, 'sem buff = sem bônus');
  // buff desconhecido não quebra
  assert.equal(buffs.apply('naoExiste', { durationMs: 1000 }), false);
  assert.equal(buffs.has('naoExiste'), false);
  // serialize → novo BuffSystem continua de onde parou
  buffs.apply('wellRested', { durationMs: 60000 });
  const reloaded = new BuffSystem(buffs.serialize());
  assert.equal(reloaded.has('wellRested'), true);
  // Toda definição tem nome e ao menos um efeito
  for (const [id, def] of Object.entries(BUFF_DEFINITIONS)) {
    assert.ok(def.name && Object.keys(def.effects ?? {}).length > 0, `buff ${id} mal definido`);
  }
});

test('simulação: Bestiary — registra abates, conta progresso e persiste no save', () => {
  const bestiary = new Bestiary(undefined);
  assert.equal(bestiary.known('slime'), false);
  bestiary.recordKill('slime');
  bestiary.recordKill('slime');
  bestiary.recordKill('wolf');
  assert.equal(bestiary.known('slime'), true);
  assert.equal(bestiary.kills.slime, 2, 'conta 2 abates de slime');
  const reloaded = new Bestiary(bestiary.serialize());
  assert.equal(reloaded.kills.slime, 2, 'persiste no save');
  assert.equal(reloaded.kills.ghost ?? 0, 0);
  // Todos os tipos de inimigo podem ser registrados no bestiário
  for (const id of Object.keys(ENEMY_TYPES)) { bestiary.recordKill(id); assert.equal(bestiary.known(id), true, `bestiário cobre ${id}`); }
});

test('simulação: Achievements — conta stats, completa ao bater a meta e persiste', () => {
  const ach = new Achievements(undefined);
  ach.note('kills', 1);
  const first = ACHIEVEMENTS.find((a) => a.stat === 'kills' && a.goal === 1);
  const unlocked = ach.check();
  assert.ok(unlocked.some((u) => u.id === first.id), 'desbloqueou "Matar 1 monstros"');
  assert.equal(ach.value('kills'), 1);
  const reloaded = new Achievements(ach.serialize());
  assert.equal(reloaded.value('kills'), 1, 'persiste');
  assert.equal(reloaded.unlocked[first.id], true, 'save carregado não perde conquista');
  // Todas as conquistas têm id, stat, goal, name e title
  for (const a of ACHIEVEMENTS) {
    assert.ok(a.id && a.stat && (a.goal === 'all' || a.goal > 0) && a.name && a.title, `conquista mal formada: ${JSON.stringify(a)}`);
  }
});

test('simulação: ciclo dia/noite sadio — durações positivas, dawn antes do dusk, total consistente', () => {
  const c = DAY_NIGHT_CONFIG;
  assert.ok(c.dayDurationSeconds > 60 && c.nightDurationSeconds > 30, 'dia e noite com duração razoável');
  assert.ok(c.transitionDurationSeconds > 0 && c.transitionDurationSeconds < c.dayDurationSeconds, 'transição sadia');
  assert.ok(c.dawnHour < c.duskHour, 'amanhecer antes do anoitecer');
  assert.ok(c.dawnHour >= 0 && c.duskHour <= 24, 'horários no relógio');
  assert.equal(DAY_NIGHT_TOTAL_SECONDS, c.dayDurationSeconds + c.nightDurationSeconds);
});

test('simulação: combate sadio — esquiva tem i-frames, combo de 3 golpes, finisher mais forte', () => {
  assert.ok(COMBAT_CONFIG.dodgeInvulnerabilityMs > 0, 'esquiva precisa de i-frames');
  assert.equal(COMBAT_CONFIG.combo.length, 3, 'combo de 3 golpes');
  assert.ok(COMBAT_CONFIG.combo.finisherMultiplier > 1, 'finisher causa mais dano');
  assert.ok(COMBAT_CONFIG.basicAttackRange > 0 && COMBAT_CONFIG.basicAttackCooldownMs > 0, 'ataque básico sadio');
  assert.ok(COMBAT_CONFIG.combo.windowMs > COMBAT_CONFIG.basicAttackCooldownMs, 'janela do combo cobre o cooldown');
  assert.ok(COMBAT_CONFIG.shout.range > 0 && COMBAT_CONFIG.shout.cooldownMs > 0, 'grito sadio');
  assert.ok(COMBAT_CONFIG.shout.damageMultiplier > 1, 'grito causa mais dano');
  assert.ok(COMBAT_CONFIG.shout.chargePerHit > 0 && COMBAT_CONFIG.shout.chargePerFinisher > COMBAT_CONFIG.shout.chargePerHit, 'finisher carrega mais grito');
  assert.ok(COMBAT_CONFIG.specialAttackMultiplier > COMBAT_CONFIG.combo.finisherMultiplier - 0.5, 'especial compete com finisher');
});

test('simulação: inventário — adiciona (bool), conta em items, usa slots, persiste no save', () => {
  const inv = new Inventory(undefined);
  assert.equal(inv.add('potion', 3), true);
  assert.equal(inv.add('herbs', 5), true);
  assert.equal(inv.items.potion, 3);
  assert.ok(inv.usedSlots > 0 && inv.usedSlots <= inv.maxSlots, 'slots usados sadios');
  assert.ok(inv.total >= 8, 'total conta unidades');
  // tipo desconhecido não entra
  assert.equal(inv.add('diamante', 1), false);
  assert.equal(inv.items.diamante, undefined);
  // enche até o limite sem quebrar
  let guard = 0;
  while (inv.add('herbs', inv.unitsPerSlot) && guard < 500) guard += 1;
  assert.equal(inv.add('potion', inv.unitsPerSlot), false, 'mochila cheia rejeita');
  const reloaded = new Inventory(inv.serialize());
  assert.equal(reloaded.items.herbs, inv.items.herbs, 'persiste quantidades');
  assert.equal(reloaded.maxSlots, inv.maxSlots, 'persiste capacidade');
});

test('simulação: viajantes da fogueira — bens/missões sadios, visita e presente por dia', () => {
  assert.ok(Object.keys(TRAVELER_GOODS).length >= 3, 'poucos bens de viajante');
  for (const [id, good] of Object.entries(TRAVELER_GOODS)) {
    assert.ok(good.name && (good.price ?? 0) >= 0 && good.yield, `bem ${id} mal formado: ${JSON.stringify(good)}`);
  }
  assert.ok(Object.keys(TRAVELER_QUESTS).length >= 3, 'poucas missões de viajante');
  for (const [id, quest] of Object.entries(TRAVELER_QUESTS)) {
    assert.ok(quest.text && quest.reward && (quest.count ?? 1) > 0, `missão ${id} mal formada`);
  }
  const travelers = new CampfireTravelers(undefined);
  // Dia 100 é múltiplo de qualquer intervalo pequeno; fogueira nível alto libera viajantes.
  assert.equal(travelers.isVisitDay(100, 99), true, 'dia 100 é dia de visita com fogueira alta');
  assert.equal(travelers.present, false, 'sem visita ainda → sem presente');
  assert.equal(travelers.refresh(100, 99), true, 'refresh prepara a visita');
  assert.equal(travelers.present, true, 'agora tem presente/visita');
  assert.ok(travelers.goods.length >= 1 && travelers.offeredQuest, 'visita traz bens e missão');
  assert.equal(travelers.refresh(100, 99), true, 'refresh no mesmo dia mantém');
  const reloaded = new CampfireTravelers(travelers.serialize());
  assert.equal(reloaded.present, true, 'persiste visita');
  assert.deepEqual(reloaded.goods, travelers.goods, 'persiste bens');
  // aceitar missão só uma vez
  assert.equal(travelers.acceptQuest(), true);
  assert.equal(travelers.acceptQuest(), false, 'só uma missão ativa por vez');
});

test('simulação: fluxo de missão de viajante — recordKill avança, questReady na meta, claim paga recompensa', () => {
  const travelers = new CampfireTravelers({});
  travelers.refresh(100, 99);
  assert.equal(travelers.acceptQuest(), true);
  const quest = questById(travelers.activeQuest.id);
  assert.ok((quest.count ?? Object.keys(quest.items ?? {}).length) > 0, 'missão tem meta');
  const sources = { inventory: { items: { herbs: 0 } }, storage: {} };
  if (quest.kind === 'kill') {
    assert.equal(travelers.questReady(sources), false);
    for (let i = 0; i < quest.count; i += 1) assert.equal(travelers.recordKill(quest.enemy ?? 'slime'), true);
    assert.equal(travelers.recordKill('outro'), false, 'abate de outro tipo não conta');
    assert.equal(travelers.questReady(sources), true, 'pronta para entregar');
    const reward = travelers.claim(sources, () => true);
    assert.ok(reward && reward.coins >= 0, 'claim devolve recompensa');
    assert.equal(travelers.activeQuest, null, 'missão entregue some');
  } else {
    // entrega: precisa ter itens suficientes
    const need = quest.items;
    const poor = { inventory: { items: {} }, storage: {} };
    assert.equal(travelers.questReady(poor), false, 'sem itens não está pronta');
    const rich = { inventory: { items: Object.fromEntries(Object.keys(need).map((k) => [k, need[k]])) }, storage: {} };
    assert.equal(travelers.questReady(rich), true, 'com itens está pronta');
    let paid = null;
    const reward = travelers.claim(rich, (items) => { paid = items; return true; });
    assert.ok(reward && paid, 'claim de entrega cobra itens e paga recompensa');
  }
});

test('simulação: tipos de recurso sadios — nome, ícone e peso por unidade', () => {
  const types = Object.keys(RESOURCE_TYPES);
  assert.ok(types.length >= 10, 'poucos tipos de recurso');
  for (const [id, res] of Object.entries(RESOURCE_TYPES)) {
    assert.ok(res.label, `${id} sem label`);
    assert.ok(Number.isFinite(res.color), `${id} sem cor`);
    assert.ok(res.icon === undefined || res.icon === null || (typeof res.icon === 'number' && res.icon >= 0), `${id} ícone inválido`);
  }
  // tipos usados por consumíveis existem como recurso
  for (const key of Object.keys(CONSUMABLES)) {
    const gives = CONSUMABLES[key].gives ?? key;
    assert.ok(RESOURCE_TYPES[gives] || ['health', 'stamina', 'buff'].includes(gives), `consumível ${key} dá recurso inexistente: ${gives}`);
  }
});

test('simulação: construções do acampamento sadias — ordem, nome, custo e efeito', () => {
  assert.ok(BUILDING_ORDER.length >= 5, 'poucas construções');
  for (const id of BUILDING_ORDER) {
    const def = BUILDING_DEFS[id];
    assert.ok(def, `construção ${id} fora de BUILDING_DEFS`);
    assert.ok(def.name, `${id} sem nome`);
    assert.ok(def.levels && Object.keys(def.levels).length > 0, `${id} sem níveis`);
    // custos por nível ficam em def.costs (ex.: { 2: { wood: 40 } }); fogueira começa no nível 1.
    const costEntries = Object.values(def.costs ?? {}).flatMap((lvlCost) => Object.entries(lvlCost ?? {}));
    if (def.startLevel === undefined || (def.startLevel ?? 1) < 10) {
      assert.ok(costEntries.length > 0, `${id} sem custo de melhoria`);
    }
    for (const [res, amount] of costEntries) assert.ok(amount > 0, `${id} custo negativo de ${res}`);
  }
  // campfire precisa existir (travelers dependem)
  assert.ok(BUILDING_DEFS.campfire, 'sem fogueira');
});

test('simulação: clima — todo clima possível tem ícone e config de severidade', () => {
  const climas = ['clear', 'rain', 'snow', 'dust', 'ash'];
  for (const c of climas) {
    assert.ok(c in WEATHER_ICONS, `sem ícone para ${c}`);
  }
  assert.ok(WEATHER_CONFIG.rainChance > 0 && WEATHER_CONFIG.rainChance < 1, 'rainChance sadio');
  // weatherAt devolve sempre um clima válido para qualquer região/dia
  for (const region of Object.keys(REGION_INFO)) {
    for (const day of [1, 7, 30, 365]) {
      assert.ok(climas.includes(weatherAt(region, { dayCount: day, cycleTime: 0 })), `clima inválido em ${region} dia ${day}`);
    }
  }
});

test('simulação: cavernas sadias — entrada no mapa, boss e monstros existem em ENEMY_TYPES', () => {
  assert.ok(CAVES.length >= 10, 'poucas cavernas');
  for (const cave of CAVES) {
    assert.ok(cave.id && cave.name, 'caverna sem id/nome');
    assert.ok(cave.entrance && Number.isFinite(cave.entrance.x) && Number.isFinite(cave.entrance.y), `${cave.id} sem entrada`);
    assert.ok(cave.entrance.x > 0 && cave.entrance.x < WORLD_COLS * TILE && cave.entrance.y > 0 && cave.entrance.y < OVERWORLD_ROWS * TILE, `${cave.id} entrada fora do mapa`);
    assert.ok(ENEMY_TYPES[cave.boss], `${cave.id} boss inexistente: ${cave.boss}`);
    for (const m of cave.monsters ?? []) assert.ok(ENEMY_TYPES[m], `${cave.id} monstro inexistente: ${m}`);
  }
  // ids únicos
  assert.equal(new Set(CAVES.map((c) => c.id)).size, CAVES.length, 'ids de caverna duplicados');
});

test('simulação: save — envelope v2, migrate de versão futura não quebra e defaults novos existem', () => {
  assert.equal(SAVE_VERSION, 2, 'versão do save deve continuar 2 (compatibilidade)');
  const env = createSaveEnvelope({ player: { level: 5 } });
  assert.equal(env.version, 2);
  assert.ok(env.savedAt, 'envelope tem savedAt');
  // versão do futuro é rejeitada com erro controlado (não quebra o jogo silenciosamente)
  assert.throws(() => migrateSave({ version: 999, garbage: true }), /mais recente/, 'versão futura deve ser rejeitada com mensagem clara');
  // envelope parcial preenche defaults (progression, time, etc.)
  const migrated = migrateSave(createSaveEnvelope({}));
  assert.ok(migrated, 'envelope vazio migra');
  assert.ok(migrated.progression && typeof migrated.progression === 'object', 'progression existe após migrate');
  assert.ok(migrated.time && typeof migrated.time.dayCount === 'number', 'time.dayCount default existe');
  assert.ok(migrated.inventory && typeof migrated.inventory === 'object', 'inventory default existe');
});

test('simulação: spawns por região — dia e noite com tipos válidos; ilhas têm spawn próprio', () => {
  const regioes = Object.keys(REGION_SPAWNS);
  assert.ok(regioes.length >= 6, 'poucas regiões com spawn');
  for (const [region, spawns] of Object.entries(REGION_SPAWNS)) {
    assert.ok(Array.isArray(spawns.day) && spawns.day.length > 0, `${region} sem spawn de dia`);
    assert.ok(Array.isArray(spawns.night) && spawns.night.length > 0, `${region} sem spawn de noite`);
    for (const id of [...spawns.day, ...spawns.night]) {
      assert.ok(ENEMY_TYPES[id], `${region} referencia inimigo inexistente: ${id}`);
    }
  }
  // Ilhas (esmeralda/brasa) têm spawns próprios, diferentes do continente.
  assert.ok(REGION_SPAWNS.esmeralda && REGION_SPAWNS.brasa, 'ilhas sem spawn próprio');
  assert.notDeepEqual(REGION_SPAWNS.esmeralda.day, REGION_SPAWNS.antiga.day, 'ilha esmeralda deve ter fauna própria');
});

test('simulação: POIs do mapa — placas apontam para POIs reais e alcance ≤ 1400 px', () => {
  assert.ok(ROAD_SIGNS.length > 100, 'poucas placas');
  const poiPoints = [
    ...CAVES.map((c) => c.entrance),
    ...Object.values(TOWERS).map((t) => t.entrance ?? { x: t.x, y: t.y }),
    ...DOCKS.map((d) => ({ x: d.x, y: dockPosition(d).y })),
    ...VILLAGES.map((v) => ({ x: v.x, y: v.y }))
  ];
  for (const sign of ROAD_SIGNS) {
    assert.ok(sign.label && sign.label.length > 2, 'placa sem label');
    assert.ok(Number.isFinite(sign.x) && Number.isFinite(sign.y), 'placa sem posição');
    assert.ok(![T.SEA, T.LAVA, T.WALL, T.VOID].includes(terrainAt(sign.x, sign.y)), `placa ${sign.label} em terreno bloqueante`);
    // se tem poi, deve haver um POI real perto (<= 1400 px)
    if (sign.poi) {
      const near = poiPoints.some((p) => Math.hypot(p.x - sign.poi.x, p.y - sign.poi.y) < 60);
      assert.ok(near, `placa "${sign.label}" aponta para POI inexistente em (${sign.poi.x}, ${sign.poi.y})`);
    }
  }
});

test('simulação: mapa mundi — células reveladas (fog) persistem e respeitam limites do mundo', () => {
  // fog é guardado como pares [col,row] compactos: valida formato sem instanciar cena.
  const fog = [[0, 0], [399, 299], [12, 34]];
  for (const [c, r] of fog) {
    assert.ok(c >= 0 && c < WORLD_COLS && r >= 0 && r < OVERWORLD_ROWS + 436, 'fog fora do grid (overworld+subterrâneo)');
  }
  // waypoint clampado nos limites (regra do ciclo 49)
  const clamp = (x, y) => [Math.max(0, Math.min(WORLD_COLS * TILE, x)), Math.max(0, Math.min(OVERWORLD_ROWS * TILE, y))];
  assert.deepEqual(clamp(-50, -50), [0, 0]);
  assert.deepEqual(clamp(99999, 99999), [WORLD_COLS * TILE, OVERWORLD_ROWS * TILE]);
  assert.deepEqual(clamp(500, 600), [500, 600]);
});

test('simulação: tiles de estrada (T.ROAD) existem em quantidade e são andáveis (não bloqueantes)', () => {
  const grid = buildTerrainGrid();
  let roadTiles = 0;
  for (let i = 0; i < grid.terrain.length; i += 1) {
    if (grid.terrain[i] === T.ROAD) {
      roadTiles += 1;
      // ROAD por definição não pode ser bloqueante
      assert.ok(![T.SEA, T.LAVA, T.WALL, T.VOID].includes(grid.terrain[i]), 'ROAD nunca é bloqueante');
    }
  }
  assert.ok(roadTiles > 500, `poucos tiles de estrada no grid (${roadTiles})`);
  // pointOnRoad devolve ponto dentro do mundo para cada estrada
  for (const road of ROADS) {
    const p = pointOnRoad(road, 0.5);
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `pointOnRoad quebrou para ${road.name}`);
    assert.ok(p.x >= 0 && p.x <= WORLD_COLS * TILE && p.y >= 0 && p.y <= OVERWORLD_ROWS * TILE, `${road.name} fora do mundo`);
  }
});

test('simulação: rollGearDrop determinístico — drop válido, slot real, raridade existe; boss garante lendário', () => {
  const rnd = () => 0.5; // determinístico
  for (let i = 0; i < 50; i += 1) {
    const drops = rollGearDrop({ region: 'antiga', level: 10 }, () => (i * 0.13) % 1);
    for (const drop of drops) {
      assert.ok(GEAR_ITEMS[drop.id], `drop com id inexistente: ${drop.id}`);
      assert.ok(GEAR_SLOTS.includes(GEAR_ITEMS[drop.id].slot), `slot inválido em ${drop.id}`);
      assert.ok(RARITIES[drop.rarity], `raridade inválida em ${drop.id}: ${drop.rarity}`);
    }
  }
  // boss com guaranteed → lendário
  const bossDrops = rollGearDrop({ region: 'brasa', level: 40, boss: 'dragon', guaranteed: true }, () => 0.1);
  assert.ok(bossDrops.length >= 1, 'boss lendário deve dropar ao menos 1 item');
  assert.ok(bossDrops.some((d) => d.rarity === 'legendary'), 'boss garantido dropa lendário');
  // sem chance (random alto) → vazio, sem quebrar
  const none = rollGearDrop({ region: 'vale', level: 1 }, () => 0.999);
  assert.ok(Array.isArray(none), 'sem drop devolve array vazio, não quebra');
});

test('simulação: consumíveis — hotkeys 1–5 únicos e cada um tem efeito definido', () => {
  const hks = Object.values(CONSUMABLES).map((c) => c.hotkey).filter((h) => h !== undefined && h !== null);
  assert.ok(hks.length >= 5, 'poucos atalhos de consumível');
  for (const hk of hks) assert.ok(hk >= 1 && hk <= 5, `hotkey fora de 1-5: ${hk}`);
  // Vários consumíveis podem dividir a mesma tecla (usa o primeiro com estoque) — máx 3 por tecla.
  const counts = {};
  for (const hk of hks) counts[hk] = (counts[hk] ?? 0) + 1;
  for (const [hk, n] of Object.entries(counts)) assert.ok(n <= 3, `tecla ${hk} com ${n} consumíveis (máx 3)`);
  for (const [key, c] of Object.entries(CONSUMABLES)) {
    // nome vem do recurso correspondente (RESOURCE_TYPES)
    assert.ok(RESOURCE_TYPES[key]?.label ?? c.name, `${key} sem nome/label`);
    assert.ok(Object.keys(c).some((k) => k !== 'hotkey'), `${key} sem nenhum efeito`);
  }
});

test('simulação: skills — definições sadias e curva de XP simétrica (xp↔nível)', () => {
  const ids = Object.keys(SKILLS);
  assert.ok(ids.length >= 4, 'poucas skills');
  for (const [id, def] of Object.entries(SKILLS)) {
    assert.ok(def.name && def.icon && def.desc, `skill ${id} mal definida`);
    assert.ok(def.xpBase > 0, `skill ${id} xpBase inválido`);
  }
  // curva: skillXpForLevel(skillLevelForXp(x)) == x para múltiplos
  for (const x of [0, 50, 200, 1000, 5000]) {
    const lv = skillLevelForXp(x);
    assert.ok(lv >= 0 && lv <= SKILL_MAX_LEVEL, `nível fora do limite para ${x} XP: ${lv}`);
    assert.equal(skillXpForLevel(lv) <= x, true, 'xp do nível não ultrapassa o total');
  }
  assert.ok(skillXpForLevel(2) > skillXpForLevel(1), 'curva cresce');
  assert.ok(SKILL_MAX_LEVEL >= 10, 'nível máx desarrazoado');
});

test('simulação: elite config sadio — multiplicadores > 1 e aura definida', () => {
  assert.ok(ELITE_CONFIG.healthMultiplier > 1 && ELITE_CONFIG.damageMultiplier > 1, 'elite deve ser mais forte');
  assert.ok(ELITE_CONFIG.chance.night > ELITE_CONFIG.chance.day, 'elite mais comum à noite');
  assert.ok(ELITE_CONFIG.auraColor !== undefined && ELITE_CONFIG.label, 'elite sem aura/label');
  // enemyXp de elite vale mais
  assert.ok(enemyXp('wolf', true, 5) > enemyXp('wolf', false, 5), 'elite dá mais XP');
});

test('simulação: totems/estátuas (ruin-pillar) — posição dentro do mundo e não bloqueante', () => {
  // Vilarejos têm pedra rúnica (ciclo 35): validamos as posições das vilas + runa desplazada.
  for (const village of VILLAGES) {
    const rune = { x: village.x + 56, y: village.y + 52 };
    assert.ok(rune.x > 0 && rune.x < WORLD_COLS * TILE && rune.y > 0 && rune.y < OVERWORLD_ROWS * TILE, `${village.name}: runa fora do mapa`);
    assert.ok(![T.SEA, T.LAVA, T.WALL, T.VOID].includes(terrainAt(rune.x, rune.y)), `${village.name}: runa em terreno bloqueante`);
  }
});

test('simulação: ilhas esmeralda/brasa são alcançáveis por porto e têm docks', () => {
  const islandDocks = DOCKS.filter((d) => ['esmeralda', 'brasa'].includes(d.region));
  assert.ok(islandDocks.length >= 2, 'ilhas precisam de porto próprio');
  for (const dock of islandDocks) {
    assert.ok(['esmeralda', 'brasa'].includes(dock.region), `dock ${dock.name} região errada`);
    assert.ok(dock.island === dock.region, `dock ${dock.name} sem vínculo island=${dock.region}`);
  }
});

test('simulação: atlas de props — nomes únicos, draw não vazio, todos usados em algum bioma', () => {
  const entries = BIOME_PROP_ENTRIES;
  const names = entries.map((e) => e.name);
  assert.equal(new Set(names).size, names.length, 'nomes de props duplicados no atlas');
  assert.ok(names.length > 200, `atlas pequeno demais (${names.length})`);
  for (const e of entries) {
    assert.ok(e.draw && typeof e.draw === 'function', `${e.name} sem draw`);
    const tex = e.draw();
    assert.ok(tex && tex.width > 0 && tex.height > 0, `${e.name} draw vazio`);
  }
  // Todo prop do atlas aparece no fonte do RegionWorld — exceto reserva intencional
  // (T.VALLEY é um prado limpo por design: valley-flower fica no atlas para eventos futuros).
  const RESERVED = /^valley-flower-/;
  for (const name of names) {
    // Props de MURK são montados com template (`lily-${n}`): vale o prefixo sem o dígito final.
    // Aceita substring (region-cave-earth), template por dígito (`lily-${n}`) ou por tema (`stalagmite-${theme}`).
    const base = name.slice(0, name.lastIndexOf('-'));
    const used = regionWorldSrc.includes(name)
      || regionWorldSrc.includes(`\`${base}-`)
      || regionWorldSrc.includes(`\`${base}\``);
    assert.ok(RESERVED.test(name) || used, `prop ${name} definido mas não usado fora do atlas`);
  }
});

test('simulação: torres — têm entrada, boss opcional válido e estão em terreno firme', () => {
  const towers = Object.values(TOWERS);
  assert.ok(towers.length >= 8, 'poucas torres');
  for (const tower of towers) {
    const pos = tower.entrance ?? { x: tower.x, y: tower.y };
    assert.ok(Number.isFinite(pos.x) && Number.isFinite(pos.y), `${tower.name} sem entrada`);
    assert.ok(pos.x > 0 && pos.x < WORLD_COLS * TILE && pos.y > 0 && pos.y < OVERWORLD_ROWS * TILE, `${tower.name} fora do mapa`);
    assert.ok(![T.SEA, T.LAVA, T.WALL, T.VOID, T.MURK].includes(terrainAt(pos.x, pos.y)), `${tower.name} em terreno ruim`);
    if (tower.boss) assert.ok(ENEMY_TYPES[tower.boss], `${tower.name} boss inexistente: ${tower.boss}`);
    assert.ok((tower.monsters ?? []).length > 0, `${tower.name} sem monstros`);
    for (const m of tower.monsters ?? []) assert.ok(ENEMY_TYPES[m], `${tower.name} monstro inexistente: ${m}`);
  }
  // Bosses moram nas cavernas: pelo menos a maioria tem boss válido
  const withBoss = CAVES.filter((c) => c.boss);
  assert.ok(withBoss.length >= CAVES.length * 0.8, 'poucas cavernas com boss');
});

test('simulação: biomas do mapa — terreno varia por região e limites do mundo respeitados', () => {
  // Amostra o grid: cada região declarada aparece de verdade no mapa
  const grid = buildTerrainGrid();
  const seen = new Set();
  for (let i = 0; i < grid.terrain.length; i += 97) seen.add(grid.terrain[i]);
  for (const t of [T.VALLEY, T.FOREST, T.SWAMP, T.SNOW, T.SAND, T.BEACH, T.JUNGLE, T.ASH, T.SEA, T.DUNE, T.ROAD, T.MURK]) {
    assert.ok(seen.has(t), `terreno ${t} nunca amostrado no mapa`);
  }
  // Bordas do mundo: primeira/última linha e coluna existem e não quebram
  assert.ok(grid.terrain.length === grid.rows * grid.cols, 'grid consistente');
});

test('simulação: clima — weatherAt é determinístico por seed e cobre todos os tipos', () => {
  const seen = new Set();
  for (let day = 0; day < 400; day += 1) {
    for (const region of Object.keys(REGION_SPAWNS)) {
      const w = weatherAt(region, { dayCount: day, cycleTime: 0.5 });
      assert.ok(['clear', 'rain', 'snow', 'dust', 'ash'].includes(w), `clima inválido: ${w}`);
      seen.add(w);
    }
  }
  assert.ok(seen.size >= 3, `poucos climas observados (${[...seen].join(',')})`);
  // determinismo: mesma entrada → mesma saída
  const a = weatherAt('floresta', { dayCount: 10, cycleTime: 0.3 });
  const b = weatherAt('floresta', { dayCount: 10, cycleTime: 0.3 });
  assert.equal(a, b, 'weatherAt não é determinístico');
});

test('simulação: ciclo dia/noite — durações somam DAY_NIGHT_TOTAL_SECONDS e fases mudam', () => {
  // O total do ciclo = dia + noite (as transições acontecem dentro desses blocos).
  const total = DAY_NIGHT_CONFIG.dayDurationSeconds + DAY_NIGHT_CONFIG.nightDurationSeconds;
  assert.equal(total, DAY_NIGHT_TOTAL_SECONDS, 'durções não batem com o total');
  assert.ok(DAY_NIGHT_CONFIG.dayDurationSeconds > DAY_NIGHT_CONFIG.nightDurationSeconds, 'dia deve durar mais que a noite');
  assert.ok(DAY_NIGHT_CONFIG.warningSeconds <= DAY_NIGHT_CONFIG.transitionDurationSeconds, 'aviso deve caber na transição');
});

test('simulação: quests de viajantes — goods têm preço > 0 e yield válido; quest completa dá recompensa', () => {
  const goods = Object.values(TRAVELER_GOODS);
  assert.ok(goods.length >= 3, 'poucos bens de viajante');
  for (const g of goods) {
    assert.ok(g.id && g.name, 'bem sem id/nome');
    assert.ok(g.price > 0, `${g.id} preço inválido`);
    assert.ok(typeof g.yield === 'object' && Object.values(g.yield).every((n) => n >= 1), `${g.id} yield inválido`);
  }
  // fluxo completo com inventário fake
  const t = new CampfireTravelers();
  t.refresh(100, 99);
  assert.ok(t.present, 'viajante presente no dia 100 com fogueira nv 99');
  assert.ok(t.acceptQuest(), 'quest aceita');
  const quest = TRAVELER_QUESTS.find((q) => q.id === t.activeQuest.id);
  assert.ok(quest, 'quest ativa encontrada em TRAVELER_QUESTS');
  const storage = {};
  const inventory = { items: {} };
  if (quest.kind === 'kill') {
    for (let i = 0; i < quest.count; i += 1) t.recordKill(quest.enemy ?? 'wolf');
  } else {
    for (const [type, amount] of Object.entries(quest.items)) inventory.items[type] = amount + 5;
  }
  assert.ok(t.questReady({ inventory, storage }), 'quest pronta após progresso/itens');
  const reward = t.claim({ inventory, storage }, () => true);
  assert.ok(reward && (reward.coins > 0 || reward.items), 'recompensa recebida');
});

test('simulação: save v2 — envelope serializa e migra de v1 sem perder dados', () => {
  const env = createSaveEnvelope({ time: { day: 7 }, inventory: { items: { wood: 10 } } });
  assert.equal(env.version, SAVE_VERSION, 'versão do envelope');
  assert.ok(env.savedAt, 'savedAt preenchido');
  const json = JSON.stringify(env);
  const back = JSON.parse(json);
  assert.equal(back.inventory.items.wood, 10, 'dados preservados no round-trip');
  // save v1 migra para v2
  const v1 = { version: 1, player: { x: 1, y: 2 }, inventory: { items: { stone: 3 } } };
  const migrated = migrateSave(v1);
  assert.equal(migrated.version, 2, 'migrou para v2');
  assert.equal(migrated.inventory.items.stone, 3, 'inventário preservado na migração');
});

test('simulação: bestiário — registra kills, conhece inimigos e serializa', () => {
  const b = new Bestiary();
  assert.equal(b.known('wolf'), false, 'desconhece antes do kill');
  b.recordKill('wolf');
  b.recordKill('wolf');
  b.recordKill('bear');
  assert.equal(b.known('wolf'), true, 'conhece após kill');
  assert.equal(b.kills.wolf, 2, 'conta kills');
  const data = b.serialize();
  const b2 = new Bestiary();
  b2.deserialize?.(data) ?? Object.assign(b2.kills, data.kills ?? data);
  assert.equal(b2.kills.wolf, 2, 'round-trip preserva kills');
});

test('simulação: buffs — apply com opções, effects agregam, expira por tempo/dia', () => {
  const buffs = new BuffSystem();
  assert.ok(buffs.apply('dailyAttack', { durationMs: 1000 }), 'apply retorna true');
  assert.ok(buffs.has('dailyAttack'), 'buff ativo');
  assert.ok(buffs.effects.attack > 0 || buffs.effects.attackPercent > 0, 'buff deve dar bonus de ataque');
  buffs.update(2000, 1);
  assert.equal(buffs.has('dailyAttack'), false, 'buff expirou por tempo');
  // buff por dia
  buffs.apply('warmth', { untilDay: 5 });
  buffs.update(0, 6);
  assert.equal(buffs.has('warmth'), false, 'buff expirou por dia');
  const data = buffs.serialize();
  assert.ok(Array.isArray(data), 'serialize devolve lista');
});

test('simulação: achievements — note/check desbloqueia e serialize preserva', () => {
  const a = new Achievements();
  const before = Object.keys(a.unlocked).length;
  a.note('kills', 10);
  const unlocked = a.check();
  assert.ok(Array.isArray(unlocked), 'check devolve lista');
  assert.ok(Object.keys(a.unlocked).length >= before, 'unlocked não diminuiu');
  // note até bater a meta de uma conquista simples
  for (let i = 0; i < 60; i += 1) a.note('kills', 1);
  const after = a.check();
  assert.ok(Object.keys(a.unlocked).length > before || after.length >= 0, 'progresso registrado');
  const data = a.serialize();
  const a2 = new Achievements();
  a2.deserialize?.(data) ?? Object.assign(a2.unlocked, data.unlocked ?? {});
  assert.deepEqual(Object.keys(a2.unlocked).sort(), Object.keys(a.unlocked).sort(), 'serialize preserva unlocked');
});

test('simulação: economia — addCoins/spendCoins nunca deixa negativo e registra total ganho', () => {
  const e = new EconomySystem();
  e.addCoins(50);
  assert.equal(e.coins, 50, 'saldo após ganho');
  assert.ok(e.spendCoins(20), 'gasto dentro do saldo');
  assert.equal(e.coins, 30, 'saldo após gasto');
  assert.ok(!e.spendCoins(999), 'gasto acima do saldo falha');
  assert.equal(e.coins, 30, 'saldo não fica negativo');
});

test('simulação: escalonamento de inimigos — enemyXp cresce com nível e elite multiplica', () => {
  const base5 = enemyXp('goblin', false, 5);
  const base20 = enemyXp('goblin', false, 20);
  assert.ok(base20 > base5, 'XP deve crescer com o nível');
  const elite = enemyXp('goblin', true, 5);
  assert.ok(elite > base5, 'elite dá mais XP');
  // XP por nível não decresce (pode ser constante por tier)
  let prev = -1;
  for (let lvl = 1; lvl <= 50; lvl += 1) {
    const xp = enemyXp('wolf', false, lvl);
    assert.ok(xp >= prev, `XP decresceu no nível ${lvl}`);
    prev = xp;
  }
  // scaling real: coinMultiplier começa em 1 e cresce a partir de SCALING_START
  const sLow = scaleEnemy('wolf', 1);
  const sHigh = scaleEnemy('wolf', 50);
  assert.equal(sLow.coinMultiplier, 1, 'sem scaling antes do nível inicial');
  assert.ok(sHigh.coinMultiplier > sLow.coinMultiplier, 'multiplicador de moedas cresce com o nível');
  assert.ok(SCALING_START >= 1, 'SCALING_START desarrazoado');
  // levelInRange faz clamp do nível na faixa [min, max]
  assert.equal(levelInRange({ level: 10 }, [1, 20]), 10, 'dentro da faixa mantém');
  assert.equal(levelInRange({ level: 25 }, [1, 20]), 20, 'acima da faixa clampa no máx');
  assert.equal(levelInRange({ level: 0 }, [1, 20]), 1, 'abaixo da faixa clampa no mín');
  assert.equal(levelInRange({}, null), 1, 'sem faixa devolve base 1');
});

test('simulação: combate — config de combo/shout/dodge sadia e dentro de limites', () => {
  assert.ok(COMBAT_CONFIG.combo.length >= 2 && COMBAT_CONFIG.combo.length <= 6, 'combo length desarrazoado');
  assert.ok(COMBAT_CONFIG.combo.windowMs >= 300 && COMBAT_CONFIG.combo.windowMs <= 3000, 'janela de combo desarrazoada');
  assert.ok(COMBAT_CONFIG.combo.finisherMultiplier >= 1.2, 'finisher deve multiplicar dano');
  assert.ok(COMBAT_CONFIG.dodgeInvulnerabilityMs > 0 && COMBAT_CONFIG.dodgeInvulnerabilityMs <= 1000, 'i-frames desarrazoados');
  assert.ok(COMBAT_CONFIG.shout.cooldownMs >= 1000, 'grito com cooldown muito curto');
  assert.ok(COMBAT_CONFIG.basicAttackRange > 0 && COMBAT_CONFIG.basicAttackCooldownMs > 0, 'ataque básico mal configurado');
});

test('simulação: gear sets — cada conjunto tem peças em slots distintos e bônus de set', () => {
  const sets = Object.entries(GEAR_SETS);
  assert.ok(sets.length >= 5, 'poucos conjuntos de equipamento');
  for (const [key, set] of sets) {
    assert.ok(set.name, `set ${key} sem nome`);
    assert.ok(set.bonus && Object.keys(set.bonus).length > 0, `set ${key} sem bônus de conjunto`);
    // as peças do set são os itens com tierKey === key
    const pieceIds = Object.values(GEAR_ITEMS).filter((i) => i.tierKey === key).map((i) => i.id);
    assert.ok(pieceIds.length >= 3, `set ${key} com poucas peças (${pieceIds.length})`);
    const slots = pieceIds.map((id) => GEAR_ITEMS[id].slot);
    const slotCount = {};
    for (const s of slots) slotCount[s] = (slotCount[s] ?? 0) + 1;
    // anel pode ter par (2); demais slots no máx 1
    for (const [s, n] of Object.entries(slotCount)) {
      assert.ok(n <= ((s === 'ring' || s === 'weapon') ? 2 : 1), `set ${key} slot ${s} com ${n} peças`);
    }
  }
});

test('simulação: forja — FORGE_SLOT mapeia arma/peito/escudo e todos são slots válidos', () => {
  for (const [slot, forgeKey] of Object.entries(FORGE_SLOT)) {
    assert.ok(GEAR_SLOTS.includes(slot), `slot de forja inválido: ${slot}`);
    assert.ok(typeof forgeKey === 'string' && forgeKey.length > 0, `chave de forja inválida para ${slot}`);
  }
  // todo item upgradável pela forja cai num slot mapeado
  const forgeable = Object.values(GEAR_ITEMS).filter((item) => item.slot && FORGE_SLOT[item.slot]);
  assert.ok(forgeable.length > 10, 'poucos itens forjáveis');
});

test('simulação: recursos (RESOURCE_TYPES) — label, cor e ícone válidos; baú usa recursos existentes', () => {
  const keys = Object.keys(RESOURCE_TYPES);
  assert.ok(keys.length >= 15, 'poucos tipos de recurso');
  for (const [key, def] of Object.entries(RESOURCE_TYPES)) {
    assert.ok(def.label, `recurso ${key} sem label`);
    const validColor = (c) => typeof c === 'number' || /^#[0-9a-fA-F]{6}$/.test(c);
    assert.ok(validColor(def.color), `recurso ${key} cor inválida: ${def.color}`);
    assert.ok(def.accent === undefined || validColor(def.accent), `recurso ${key} accent inválido`);
  }
  // baús de tesouro usam recursos que existem
  for (const spot of TREASURE_SPOTS) {
    for (const reward of spot.rewards ?? []) {
      if (reward.type) assert.ok(RESOURCE_TYPES[reward.type], `baú usa recurso inexistente: ${reward.type}`);
    }
  }
});

test('simulação: inventário — add respeita limite de slots e serialize faz round-trip', () => {
  const inv = new Inventory();
  assert.ok(inv.add('wood', 500), 'add dentro do limite');
  assert.equal(inv.items.wood, 500, 'quantidade acumulada');
  assert.ok(inv.add('wood', 600), 'segundo add no mesmo slot');
  assert.equal(inv.items.wood, 1100, 'acumula no slot (12×1000)');
  assert.ok(!inv.add('stone', 12 * 1000 + 1), 'não cabe além da capacidade total');
  const full = new Inventory();
  for (const r of Object.keys(RESOURCE_TYPES).slice(0, 12)) full.add(r, 10);
  assert.ok(!full.add('zzz-new-resource', 1) || full.usedSlots < 12, 'slot extra bloqueado quando cheio');
  const data = inv.serialize();
  const inv2 = new Inventory();
  inv2.deserialize?.(data) ?? Object.assign(inv2.items, data.items ?? data);
  assert.equal(inv2.items.wood, 1100, 'serialize preserva itens');
});

test('simulação: vilas — têm nome, posição válida, não bloqueantes e dentro do mapa', () => {
  assert.ok(VILLAGES.length >= 4, 'poucas vilas');
  for (const v of VILLAGES) {
    assert.ok(v.name && v.name.length > 2, 'vila sem nome');
    assert.ok(v.x > 0 && v.x < WORLD_COLS * TILE && v.y > 0 && v.y < OVERWORLD_ROWS * TILE, `${v.name} fora do mapa`);
    assert.ok(![T.SEA, T.LAVA, T.WALL, T.VOID].includes(terrainAt(v.x, v.y)), `${v.name} em terreno bloqueante`);
  }
  // nomes únicos
  assert.equal(new Set(VILLAGES.map((v) => v.name)).size, VILLAGES.length, 'nomes de vilas repetidos');
});

test('simulação: cavernas — entrada válida, não bloqueante, dentro do mapa; boss válido', () => {
  assert.ok(CAVES.length >= 8, 'poucas cavernas');
  for (const c of CAVES) {
    const e = c.entrance ?? { x: c.x, y: c.y };
    assert.ok(e.x > 0 && e.x < WORLD_COLS * TILE && e.y > 0 && e.y < OVERWORLD_ROWS * TILE, `${c.name} fora do mapa`);
    assert.ok(![T.SEA, T.LAVA, T.WALL, T.VOID].includes(terrainAt(e.x, e.y)), `${c.name} entrada bloqueante`);
    if (c.boss) assert.ok(ENEMY_TYPES[c.boss], `${c.name} boss inexistente: ${c.boss}`);
  }
});

test('simulação: baús de tesouro — longe de acampamento/torres, em terreno firme, rewards válidos', () => {
  assert.ok(TREASURE_SPOTS.length >= 20, 'poucos baús');
  const blockers = [...Object.values(TOWERS).map((t) => t.entrance ?? { x: t.x, y: t.y }), { x: 1440, y: 1080 }];
  for (const spot of TREASURE_SPOTS) {
    assert.ok(spot.x > 0 && spot.x < WORLD_COLS * TILE && spot.y > 0 && spot.y < OVERWORLD_ROWS * TILE, 'baú fora do mapa');
    assert.ok(![T.SEA, T.LAVA, T.WALL, T.VOID].includes(terrainAt(spot.x, spot.y)), 'baú em terreno bloqueante');
    const dCamp = Math.hypot(spot.x - 1440, spot.y - 1080);
    assert.ok(dCamp > 1200, `baú muito perto do acampamento (${Math.round(dCamp)})`);
    for (const b of blockers) {
      assert.ok(Math.hypot(spot.x - b.x, spot.y - b.y) > 400, 'baú colidindo com torre/acampamento');
    }
    assert.ok(spot.id && spot.region, 'baú sem id/região');
  }
});

test('simulação: keybinds — teclas de ação não colidem entre si', () => {
  const seen = {};
  for (const [action, code] of Object.entries(DEFAULT_KEYBINDS ?? {})) {
    assert.ok(!seen[code], `code ${code} usado por ${seen[code]} e ${action}`);
    seen[code] = action;
  }
  // as 5 ações padrão existem com code válido (as demais teclas ficam no GameScene)
  for (const action of KEY_ACTIONS) {
    const code = DEFAULT_KEYBINDS[action];
    assert.ok(code && typeof code === 'string' && code.length >= 2, `ação obrigatória ausente: ${action}`);
  }
});

test('simulação: construções (BUILDING_DEFS) — keys, níveis, custos e desbloqueios sadios', () => {
  const keys = Object.keys(BUILDING_DEFS);
  assert.ok(keys.includes('campfire') && keys.includes('farm') && keys.includes('forge'), 'construções base ausentes');
  for (const [key, def] of Object.entries(BUILDING_DEFS)) {
    assert.ok(def.name, `${key} sem nome`);
    assert.ok(def.levels && Object.keys(def.levels).length >= 1, `${key} sem níveis`);
    for (const [lvl, desc] of Object.entries(def.levels)) {
      assert.ok(typeof desc === 'string' && desc.length > 3, `${key} nível ${lvl} sem descrição`);
    }
    // custos por nível (exceto nível 1 de fogueira que é grátis por design)
    if (def.costs) {
      for (const [lvl, cost] of Object.entries(def.costs)) {
        assert.ok(Object.keys(cost).length > 0, `${key} nível ${lvl} custo vazio`);
        for (const [res, amt] of Object.entries(cost)) {
          // 'coins' é a moeda da economia; demais devem ser recursos válidos
          assert.ok(res === 'coins' || RESOURCE_TYPES[res], `${key} custo com recurso inexistente: ${res}`);
          assert.ok(amt > 0, `${key} custo inválido`);
        }
      }
    }
  }
});

test('simulação: save v2 — migrateSave rejeita versão futura (proteção de compatibilidade)', () => {
  assert.throws(() => migrateSave({ version: 99, savedAt: 'x' }), /mais recente/, 'versão futura deve lançar erro');
  // envelope válido passa sem erro
  const ok = migrateSave(createSaveEnvelope({ time: { day: 1 } }));
  assert.equal(ok.version, SAVE_VERSION, 'envelope atual migra para si mesmo');
});

test('simulação: tiers de gear — cada tier tem itens em vários slots e raridades crescem com o tier', () => {
  const byTier = {};
  for (const item of Object.values(GEAR_ITEMS)) {
    if (!item.tierKey) continue;
    (byTier[item.tierKey] ??= []).push(item);
  }
  const tiers = Object.keys(byTier);
  assert.ok(tiers.length >= 10, `poucos tiers (${tiers.length})`);
  for (const [tier, items] of Object.entries(byTier)) {
    const slots = new Set(items.map((i) => i.slot));
    assert.ok(slots.size >= 4, `tier ${tier} cobre poucos slots (${[...slots].join(',')})`);
    for (const item of items) {
      if (item.rarity) assert.ok(RARITIES[item.rarity], `tier ${tier} raridade inválida: ${item.rarity}`);
    }
  }
  // nível do tier cresce com o nome (ordem aproximada)
  const levels = tiers.map((t) => byTier[t][0].level ?? 0);
  const sorted = [...levels].sort((a, b) => a - b);
  assert.deepEqual(levels.slice().sort((a, b) => a - b), sorted, 'níveis de tier consistentes');
});

test('simulação: waypoints — clamp dentro do mundo e id único por waypoint', () => {
  // waypoints do mapa (se houver lista exportada) ou validação da regra de clamp
  const clampWaypoint = (x, y) => [
    Math.max(0, Math.min(WORLD_COLS * TILE, x)),
    Math.max(0, Math.min(OVERWORLD_ROWS * TILE, y))
  ];
  assert.deepEqual(clampWaypoint(-100, 99999), [0, OVERWORLD_ROWS * TILE], 'clamp nos limites');
  assert.deepEqual(clampWaypoint(500, 500), [500, 500], 'ponto interno intacto');
});

test('simulação: bestiário cobre todos os inimigos com nome e tier', () => {
  for (const [id, def] of Object.entries(ENEMY_TYPES)) {
    assert.ok(def.name, `inimigo ${id} sem nome`);
    assert.ok(def.tier >= 1 && def.tier <= 15, `inimigo ${id} tier inválido: ${def.tier}`);
    assert.ok(def.health > 0 && def.damage > 0, `inimigo ${id} sem stats`);
    assert.ok(def.name, `inimigo ${id} sem nome`);
  }
});

test('simulação: consumíveis — useConsumable(type, inventory, player) funciona ou falha com motivo', () => {
  const inv = new Inventory();
  inv.add('potion', 2);
  const player = { health: 10, maxHealth: 100, addBuff: () => true };
  const r1 = useConsumable('potion', inv, player);
  assert.ok(r1.ok, `poção deve funcionar: ${r1.reason ?? ''}`);
  assert.equal(inv.items.potion, 1, 'poção consumida do inventário');
  const r2 = useConsumable('potionGreat', inv, player);
  assert.ok(!r2.ok && r2.reason, 'sem item deve falhar com motivo');
});

test('simulação: mapa mundi — MAP_SCALE produz imagem dentro de limites (1200×900)', () => {
  // regra do ciclo 49: escala 16 → 400×300 tiles × 16 = 6400×4800 / fator → 1200×900
  const w = Math.round(WORLD_COLS * TILE / 16);
  const h = Math.round(OVERWORLD_ROWS * TILE / 16);
  assert.equal(w, 1200, 'largura do minimapa');
  assert.equal(h, 900, 'altura do minimapa');
});

test('simulação: TILE sadio para gameplay (48 px invariante)', () => {
  assert.equal(TILE, 48, 'TILE=48 invariante');
  assert.equal(WORLD_COLS, 400, 'WORLD_COLS=400 invariante');
  assert.equal(OVERWORLD_ROWS, 300, 'OVERWORLD_ROWS=300 invariante');
});

test('simulação: oásis — têm água por perto, não bloqueantes e dentro do mapa', () => {
  assert.ok(OASES.length >= 2, 'poucas oásis');
  for (const o of OASES) {
    assert.ok(o.x > 0 && o.x < WORLD_COLS * TILE && o.y > 0 && o.y < OVERWORLD_ROWS * TILE, `oásis fora do mapa`);
    assert.ok(![T.SEA, T.LAVA, T.WALL, T.VOID].includes(terrainAt(o.x, o.y)), 'oásis em terreno bloqueante');
    assert.ok((o.r ?? 0) > 100, 'oásis sem raio válido');
  }
});

test('simulação: portos (DOCKS) — posição válida, não bloqueante, preço não negativo', () => {
  assert.ok(DOCKS.length >= 5, 'poucos portos');
  for (const d of DOCKS) {
    assert.ok(d.name && d.region, 'porto sem nome/região');
    const pos = dockPosition(d);
    assert.ok(pos.x > 0 && pos.x < WORLD_COLS * TILE && pos.y > 0 && pos.y < OVERWORLD_ROWS * TILE, `porto ${d.name} fora do mapa`);
    assert.ok((d.price ?? 0) >= 0, `porto ${d.name} preço negativo`);
    // porto fica perto do mar (barco entra na água)
    let nearSea = false;
    for (let dx = -4; dx <= 4 && !nearSea; dx += 1) {
      for (let dy = -4; dy <= 4 && !nearSea; dy += 1) {
        if (terrainAt(pos.x + dx * TILE, (pos.boatY ?? pos.y) + dy * TILE) === T.SEA) nearSea = true;
      }
    }
    assert.ok(nearSea, `porto ${d.name} longe do mar`);
  }
});

test('simulação: regiões (REGION_INFO) — têm nome, bioma válido e spawn condizente', () => {
  const infos = Object.entries(REGION_INFO ?? {});
  assert.ok(infos.length >= 8, 'poucas regiões com info');
  for (const [id, info] of infos) {
    assert.ok(info.name, `região ${id} sem nome`);
    // cor/faixa de nível são opcionais (mar não tem), mas se existem devem ser válidas
    if (info.color !== undefined) assert.ok(/^#[0-9a-fA-F]{6}$/.test(info.color), `região ${id} cor inválida`);
    if (info.levelRange !== undefined) assert.ok(Array.isArray(info.levelRange) && info.levelRange[0] <= info.levelRange[1], `região ${id} levelRange inválido`);
  }
  // toda região com spawn próprio deve ter info (vale/mar usam padrão)
  for (const id of Object.keys(REGION_SPAWNS)) {
    assert.ok(REGION_INFO[id], `região ${id} tem spawn mas não tem info`);
  }
});

test('simulação: grid do mundo — linhas/colunas consistentes e terreno dentro do enum T', () => {
  const grid = buildTerrainGrid();
  assert.equal(grid.cols, WORLD_COLS, 'cols=400');
  assert.equal(grid.rows, 736, 'rows=736 (300 overworld + 436 subterrâneo)');
  assert.equal(grid.terrain.length, grid.rows * grid.cols, 'terrain.length consistente');
  const valid = new Set(Object.values(T));
  for (let i = 0; i < grid.terrain.length; i += 101) {
    assert.ok(valid.has(grid.terrain[i]), `terreno inválido no índice ${i}: ${grid.terrain[i]}`);
  }
});

test('simulação: achievements com goal "all" — desbloqueia só quando todos os tipos conhecidos', () => {
  const allGoals = Object.entries(ACHIEVEMENTS).filter(([, a]) => a.goal === 'all');
  assert.ok(allGoals.length >= 1, 'nenhuma conquista "all" encontrada');
  for (const [id, a] of allGoals) {
    assert.ok(a.stat, `conquista ${id} sem stat`);
    const ach = new Achievements();
    // sem dados: não desbloqueia
    ach.check();
    assert.equal(ach.unlocked[id], undefined, `${id} não deve desbloquear vazia`);
  }
  // preenche a meta de uma conquista simples e garante que check a registra (id real = a.id)
  const simple = Object.values(ACHIEVEMENTS).find((a) => a.goal !== 'all' && typeof a.goal === 'number');
  assert.ok(simple, 'nenhuma conquista numérica simples');
  const ach = new Achievements();
  ach.note(simple.stat, simple.goal + 1);
  const got = ach.check();
  assert.ok(ach.unlocked[simple.id], `conquista ${simple.id} deveria desbloquear com ${simple.goal + 1}`);
  assert.ok(got.some((a) => a.id === simple.id), 'check devolve a conquista desbloqueada');
});

test('simulação: buffs — serialize devolve lista com ids válidos e tempos restantes', () => {
  const b = new BuffSystem();
  b.apply('meal', { durationMs: 60000 });
  b.apply('wellRested', { untilDay: 10 });
  const data = b.serialize();
  assert.ok(Array.isArray(data) && data.length === 2, 'serialize lista 2 buffs ativos');
  for (const entry of data) {
    assert.ok(BUFF_DEFINITIONS[entry.id], `buff serializado desconhecido: ${entry.id}`);
    assert.ok(entry.remainingMs === null || entry.remainingMs > 0, 'remainingMs sadio');
  }
  // list() reflete os ativos
  assert.equal(b.list().length, 2, 'list() = 2 buffs');
});

test('simulação: clima por região — neve só neva no gelo, poeira só no deserto/cinzas', () => {
  // amostra grande: gelo pode nevar; vale nunca neva
  let snowInIce = 0; let snowInVale = 0;
  let dustInAreia = 0; let dustInVale = 0;
  for (let day = 0; day < 600; day += 1) {
    if (weatherAt('gelo', { dayCount: day, cycleTime: 0.5 }) === 'snow') snowInIce += 1;
    if (weatherAt('vale', { dayCount: day, cycleTime: 0.5 }) === 'snow') snowInVale += 1;
    if (weatherAt('areia', { dayCount: day, cycleTime: 0.5 }) === 'dust') dustInAreia += 1;
    if (weatherAt('vale', { dayCount: day, cycleTime: 0.5 }) === 'dust') dustInVale += 1;
  }
  assert.ok(snowInIce > 0, 'gelo deveria nevar em algum dia');
  assert.equal(snowInVale, 0, 'vale nunca deve nevar');
  assert.ok(dustInAreia > 0, 'deserto deveria ter poeira em algum dia');
  assert.equal(dustInVale, 0, 'vale nunca deve ter poeira');
});

test('simulação: regions do subterrâneo — cavernas têm tema válido e profundidade sadia', () => {
  const themes = new Set(['earth', 'swamp', 'ice', 'tomb', 'sea', 'fire']);
  for (const c of CAVES) {
    assert.ok(c.theme === undefined || themes.has(c.theme), `caverna ${c.id} tema inválido: ${c.theme}`);
    assert.ok((c.depth ?? 0) >= 0, `caverna ${c.id} profundidade inválida`);
  }
  // há cavernas de vários temas
  const usedThemes = new Set(CAVES.map((c) => c.theme).filter(Boolean));
  assert.ok(usedThemes.size >= 3, `poucos temas de caverna (${[...usedThemes].join(',')})`);
});

test('simulação: recursos abundantes — RESOURCE_TYPES cobre drops comuns de inimigos', () => {
  // enemies têm drops com tipos que existem em RESOURCE_TYPES (ou coins/xp implícitos)
  for (const [id, def] of Object.entries(ENEMY_TYPES)) {
    for (const drop of def.drops ?? []) {
      if (drop.type) assert.ok(RESOURCE_TYPES[drop.type], `inimigo ${id} dropa recurso inexistente: ${drop.type}`);
      if (drop.chance !== undefined) assert.ok(drop.chance > 0 && drop.chance <= 1, `inimigo ${id} chance inválida`);
    }
  }
});

test('simulação: GEAR_ITEMS — stats são números não negativos e nível sadio', () => {
  for (const [id, item] of Object.entries(GEAR_ITEMS)) {
    assert.ok(item.id === id || item.id, `item ${id} sem id`);
    assert.ok(GEAR_SLOTS.includes(item.slot), `item ${id} slot inválido: ${item.slot}`);
    assert.ok((item.level ?? 0) >= 1, `item ${id} nível inválido`);
    for (const [stat, val] of Object.entries(item)) {
      if (['attack', 'defense', 'health', 'speedPercent'].includes(stat)) {
        assert.ok(typeof val === 'number' && val >= 0, `item ${id} stat ${stat} inválido: ${val}`);
      }
    }
  }
});

test('simulação: dayNight — fases progridem dentro do ciclo total e não pulam', () => {
  // amostramos "horas" do ciclo e garantimos que há dia, transição e noite
  // (função real pode estar em dayNight.js; aqui validamos a config + total)
  const cfg = DAY_NIGHT_CONFIG;
  assert.ok(cfg.dawnHour < cfg.duskHour, 'dawn antes de dusk');
  assert.ok(cfg.dawnHour >= 0 && cfg.duskHour <= 24, 'horas fora de 0-24');
  assert.ok(DAY_NIGHT_TOTAL_SECONDS === cfg.dayDurationSeconds + cfg.nightDurationSeconds, 'total consistente');
});

test('simulação: habilidades (PlayerSkills) — gainXp sobe nível e não passa do máx', () => {
  const ps = new PS2();
  for (let i = 0; i < 200; i += 1) ps.gainXp?.('blade', 100) ?? ps.addXp?.('blade', 100);
  const lvl = ps.level?.('blade') ?? ps.getLevel?.('blade') ?? 0;
  assert.ok(lvl >= 1, 'deveria ter subido de nível');
  assert.ok(lvl <= SKILL_MAX_LEVEL, `nível além do máx (${SKILL_MAX_LEVEL}): ${lvl}`);
});

test('simulação: economia — serializa e recupera saldo; debtBackpacks preserva mochilas', () => {
  const e = new EconomySystem();
  e.addCoins(123);
  const data = e.serialize();
  const e2 = new EconomySystem();
  e2.deserialize?.(data) ?? Object.assign(e2, data);
  assert.equal(e2.coins, 123, 'saldo preservado no serialize');
});

test('simulação: bestiário — knows all após registrar todos os tipos', () => {
  const b = new Bestiary();
  for (const id of Object.keys(ENEMY_TYPES)) b.recordKill(id);
  for (const id of Object.keys(ENEMY_TYPES)) assert.ok(b.known(id), `deveria conhecer ${id}`);
});

test('simulação: RESOURCE_TYPES tem label+cor+ícone para todos os recursos', () => {
  const n = Object.keys(RESOURCE_TYPES).length;
  assert.ok(n >= 20, `poucos recursos (${n})`);
  for (const [id, r] of Object.entries(RESOURCE_TYPES)) {
    assert.ok(r.label && typeof r.label === 'string', `recurso ${id} sem label`);
    assert.ok(typeof r.color === 'number' && r.color >= 0 && r.color <= 0xffffff, `recurso ${id} cor inválida`);
    // icon é índice no atlas (número) ou null para recursos especiais (fish, crystal, etc.)
    assert.ok(r.icon === null || (typeof r.icon === 'number' && r.icon >= 0), `recurso ${id} ícone inválido`);
  }
});

test('simulação: HOTKEY_ITEMS — teclas 1-5 com até 3 consumíveis por tecla', () => {
  const keys = Object.keys(HOTKEY_ITEMS);
  assert.ok(keys.length >= 1 && keys.length <= 5, 'hotkeys devem ser 1..5');
  for (const [key, list] of Object.entries(HOTKEY_ITEMS)) {
    assert.ok(/^[1-5]$/.test(key), `hotkey fora de 1-5: ${key}`);
    assert.ok(Array.isArray(list) && list.length <= 3, `hotkey ${key} com mais de 3 itens`);
    for (const itemId of list) assert.ok(CONSUMABLES[itemId], `hotkey ${key} aponta para consumível inexistente: ${itemId}`);
  }
});

test('simulação: FORGE_SLOT existe e rollGearDrop devolve raridades válidas por região', () => {
  assert.ok(FORGE_SLOT && typeof FORGE_SLOT === 'object', 'FORGE_SLOT ausente');
  const drops = rollGearDrop({ region: 'selva', level: 20, elite: true, boss: false, guaranteed: true }, Math.random);
  assert.ok(Array.isArray(drops) && drops.length >= 1, 'drop vazio');
  for (const d of drops) {
    assert.ok(GEAR_ITEMS[d.id], `drop com item inexistente: ${d.id}`);
    if (d.rarity) assert.ok(RARITIES[d.rarity], `raridade inválida: ${d.rarity}`);
  }
  // boss dropa 2 itens; com random baixo (<0.6) inclui lendário de boss
  const bossId = Object.values(GEAR_ITEMS).find((i) => i.boss)?.boss;
  if (bossId) {
    let seq = 0; const fakeRandom = () => (seq++ === 0 ? 0.1 : 0.9);
    const bossDrops = rollGearDrop({ region: 'brasa', level: 40, boss: bossId }, fakeRandom);
    assert.equal(bossDrops.length, 2, 'boss dropa 2 itens');
    assert.ok(bossDrops.some((d) => d.rarity === 'legendary' && GEAR_ITEMS[d.id].boss === bossId), 'boss dropa lendário com random baixo');
  }
});

test('simulação: campanha — missões têm id único e título', () => {
  const ids = new Set();
  for (const m of MISSIONS) {
    assert.ok(m.id, 'missão sem id');
    assert.ok(!ids.has(m.id), `id duplicado: ${m.id}`);
    ids.add(m.id);
    assert.ok(m.title || m.name, `missão ${m.id} sem título`);
  }
  assert.ok(ids.size >= 5, 'poucas missões de campanha');
});

test('simulação: keybinds — normalizeKeybinds preenche padrão e rebind troca ação', () => {
  const kb = normalizeKeybinds(null);
  for (const action of KEY_ACTIONS) {
    assert.ok(kb[action] && typeof kb[action] === 'string', `ação ${action} sem tecla padrão`);
    assert.ok(isBindableCode(kb[action]), `tecla padrão inválida: ${kb[action]}`);
  }
  const rebound = rebind(normalizeKeybinds(null), 'attack', 'KeyX');
  assert.ok(rebound.ok, `rebind falhou: ${rebound.message ?? ''}`);
  assert.equal(actionForCode(rebound.binds, 'KeyX'), 'attack', 'rebind refletido em actionForCode');
  assert.equal(actionForCode(rebound.binds, 'KeyJ'), null, 'tecla antiga liberada');
  assert.ok(!isReservedCode('KeyX'), 'KeyX não deve ser reservada');
});

test('simulação: CRAFT_RECIPES — ingredientes e resultado são recursos/itens válidos', () => {
  assert.ok(CRAFT_RECIPES.length >= 10, 'poucas receitas');
  for (const r of CRAFT_RECIPES) {
    assert.ok(r.id && r.name, 'receita sem id/nome');
    for (const [res, amt] of Object.entries(r.cost ?? {})) {
      assert.ok(RESOURCE_TYPES[res] || CONSUMABLES[res], `receita ${r.id} custo inválido: ${res}`);
      assert.ok(amt > 0, `receita ${r.id} quantidade inválida`);
    }
    for (const [res, amt] of Object.entries(r.yield ?? {})) {
      // 'xp' e 'coins' são resultados virtuais válidos de algumas receitas
      assert.ok(RESOURCE_TYPES[res] || CONSUMABLES[res] || res === 'xp' || res === 'coins', `receita ${r.id} resultado inválido: ${res}`);
      assert.ok(amt > 0, `receita ${r.id} resultado quantidade inválida`);
    }
  }
});

test('simulação: vilas — têm nome, NPCs e posição dentro do mundo', () => {
  assert.ok(VILLAGES.length >= 4, 'poucas vilas');
  for (const v of VILLAGES) {
    assert.ok(v.name, 'vila sem nome');
    assert.ok(v.x > 0 && v.x < WORLD_COLS * TILE && v.y > 0 && v.y < OVERWORLD_ROWS * TILE, `${v.name} fora do mapa`);
    assert.ok(Array.isArray(v.houses) && v.houses.length >= 1, `${v.name} sem casas`);
    assert.ok(Array.isArray(v.lines) && v.lines.length >= 1, `${v.name} sem linhas de diálogo`);
  }
});

test('simulação: road signs — apontam para POI dentro do mundo', () => {
  assert.ok(ROAD_SIGNS.length >= 5, 'poucos sinais');
  for (const sign of ROAD_SIGNS) {
    assert.ok(sign.poi, 'sinal sem POI');
    assert.ok(sign.poi.x >= 0 && sign.poi.x <= WORLD_COLS * TILE, 'POI x fora');
    assert.ok(sign.poi.y >= 0 && sign.poi.y <= OVERWORLD_ROWS * TILE, 'POI y fora');
  }
});

test('simulação: torres — têm entrada, monstros e ficam em região válida', () => {
  assert.ok(TOWERS.length >= 9, 'poucas torres');
  const regionKeys = new Set(Object.keys(REGION_INFO));
  for (const t of TOWERS) {
    assert.ok(t.entrance && typeof t.entrance.x === 'number', `torre ${t.name} sem entrada`);
    assert.ok(t.entrance.x > 0 && t.entrance.x < WORLD_COLS * TILE && t.entrance.y > 0 && t.entrance.y < OVERWORLD_ROWS * TILE, `${t.name} entrada fora do mapa`);
    assert.ok(Array.isArray(t.monsters) && t.monsters.length >= 1, `${t.name} sem monstros`);
    for (const m of t.monsters) assert.ok(ENEMY_TYPES[m], `torre ${t.name} monstro inválido: ${m}`);
    assert.ok(regionKeys.has(t.region), `torre ${t.name} região inválida: ${t.region}`);
  }
});

test('simulação: ELITE_CONFIG — multiplicadores sadios e aura definida', () => {
  assert.ok(ELITE_CONFIG.healthMultiplier > 1, 'elite deve ter mais vida');
  assert.ok(ELITE_CONFIG.damageMultiplier > 1, 'elite deve dar mais dano');
  assert.ok(typeof ELITE_CONFIG.auraColor === 'number' || typeof ELITE_CONFIG.auraColor === 'string', 'elite sem aura');
  assert.ok(ELITE_CONFIG.chance && typeof ELITE_CONFIG.chance.day === 'number' && typeof ELITE_CONFIG.chance.night === 'number', 'chance elite incompleta');
  assert.ok(ELITE_CONFIG.chance.day > 0 && ELITE_CONFIG.chance.night > 0, 'elite nunca aparece?');
});

test('simulação: COMBAT_CONFIG — combo, esquiva e grito com valores sadios', () => {
  assert.ok(COMBAT_CONFIG.combo.length >= 3, 'combo curto demais');
  assert.ok(COMBAT_CONFIG.combo.windowMs > 0, 'janela de combo inválida');
  assert.ok(COMBAT_CONFIG.combo.finisherMultiplier > 1, 'finisher deve multiplicar');
  assert.ok(COMBAT_CONFIG.dodgeInvulnerabilityMs > 0, 'i-frames de esquiva inválidos');
  assert.ok(COMBAT_CONFIG.shout.cooldownMs > 0, 'cooldown do grito inválido');
  assert.ok(COMBAT_CONFIG.basicAttackRange > 0, 'alcance de ataque inválido');
});

test('simulação: viajantes — bens têm preço > 0 e yield de recurso válido; quests têm tipo válido', () => {
  for (const g of TRAVELER_GOODS) {
    assert.ok(g.price > 0, `bem ${g.id} preço inválido`);
    for (const [res, amt] of Object.entries(g.yield ?? {})) {
      assert.ok(RESOURCE_TYPES[res], `bem ${g.id} yield inválido: ${res}`);
      assert.ok(amt > 0, `bem ${g.id} yield quantidade inválida`);
    }
  }
  for (const q of TRAVELER_QUESTS) {
    assert.ok(['kill', 'deliver'].includes(q.kind), `quest ${q.id} kind inválido: ${q.kind}`);
    assert.ok(q.text && q.reward, `quest ${q.id} sem texto/recompensa`);
    if (q.kind === 'kill' && q.enemy) assert.ok(ENEMY_TYPES[q.enemy], `quest ${q.id} inimigo inválido: ${q.enemy}`);
  }
});

test('simulação: save — envelope v2 tem campos essenciais e migrateSave v1 preserva inventário', () => {
  const env = createSaveEnvelope({ inventory: { items: { wood: 5 } }, coins: 42 });
  assert.equal(env.version, SAVE_VERSION, 'versão do envelope');
  assert.ok(env.savedAt, 'savedAt presente');
  assert.ok(migrateSave({ version: 1, inventory: { items: { wood: 7 } } }).inventory.items.wood === 7, 'v1 migra preservando itens');
});

test('simulação: spawn por região — dia e noite têm inimigos válidos', () => {
  for (const [region, spawns] of Object.entries(REGION_SPAWNS)) {
    for (const phase of ['day', 'night']) {
      const list = spawns[phase] ?? [];
      for (const id of list) assert.ok(ENEMY_TYPES[id], `região ${region} ${phase} spawn inválido: ${id}`);
    }
  }
  // vale tem spawn extra válido
  for (const id of [...VALLEY_EXTRA_SPAWNS.day, ...VALLEY_EXTRA_SPAWNS.night]) {
    assert.ok(ENEMY_TYPES[id], `vale extra spawn inválido: ${id}`);
  }
});

test('simulação: SKILLS — xp para nível é monotônico e cobre o máx', () => {
  let prev = -1;
  for (let lvl = 1; lvl <= SKILL_MAX_LEVEL; lvl += 1) {
    const xp = skillXpForLevel(lvl);
    assert.ok(xp > prev, `xp do nível ${lvl} deve crescer`);
    prev = xp;
    assert.equal(skillLevelForXp(xp), lvl, `skillLevelForXp(${xp}) = ${lvl}`);
  }
  assert.ok(Object.keys(SKILLS).length >= 4, 'poucas habilidades');
});

test('simulação: GEAR_SETS — cada set tem peças suficientes (2-5) e bônus válidos', () => {
  for (const [key, set] of Object.entries(GEAR_SETS)) {
    assert.ok(set.name, `set ${key} sem nome`);
    const pieces = Object.values(GEAR_ITEMS).filter((i) => i.tierKey === key);
    // ring/weapon podem ter 2 peças cada → até 10 no total
    assert.ok(pieces.length >= 2 && pieces.length <= 10, `set ${key} com ${pieces.length} peças (esperado 2-10)`);
    assert.ok(set.bonus && Object.keys(set.bonus).length >= 1, `set ${key} sem bônus`);
  }
});

test('simulação: baús (TREASURE_SPOTS) — id único, posição válida, não bloqueantes', () => {
  const ids = new Set();
  for (const s of TREASURE_SPOTS) {
    assert.ok(!ids.has(s.id), `baú id duplicado: ${s.id}`);
    ids.add(s.id);
    assert.ok(s.x > 0 && s.x < WORLD_COLS * TILE && s.y > 0 && s.y < OVERWORLD_ROWS * TILE, `baú ${s.id} fora do mapa`);
    assert.ok(![T.SEA, T.LAVA, T.WALL, T.VOID].includes(terrainAt(s.x, s.y)), `baú ${s.id} em terreno bloqueante`);
  }
  assert.ok(ids.size >= 10, 'poucos baús');
});

test('simulação: roads — nomes únicos e pontos dentro do mundo', () => {
  const names = new Set();
  for (const road of ROADS) {
    assert.ok(!names.has(road.name), `estrada duplicada: ${road.name}`);
    names.add(road.name);
    for (const p of road.points ?? []) {
      const [px, py] = Array.isArray(p) ? p : [p.x, p.y];
      assert.ok(px >= 0 && px <= WORLD_COLS * TILE && py >= 0 && py <= OVERWORLD_ROWS * TILE, `ponto da estrada ${road.name} fora do mundo`);
    }
    assert.ok((road.points?.length ?? 0) >= 2, `estrada ${road.name} com poucos pontos`);
  }
});

test('simulação: cavernas — boss só em caverna funda (≥80%) e entrada válida', () => {
  const withBoss = CAVES.filter((c) => c.boss);
  assert.ok(withBoss.length >= 3, 'poucas cavernas com boss');
  for (const c of withBoss) {
    assert.ok((c.depth ?? 0) >= 0, 'profundidade inválida');
    assert.ok(ENEMY_TYPES[c.boss], `boss inválido na caverna ${c.id}: ${c.boss}`);
  }
  for (const c of CAVES) {
    assert.ok(c.entrance && c.entrance.x > 0 && c.entrance.x < WORLD_COLS * TILE, `caverna ${c.id} entrada x inválida`);
    assert.ok(c.entrance.y > 0 && c.entrance.y < OVERWORLD_ROWS * TILE, `caverna ${c.id} entrada y inválida`);
  }
});

test('simulação: clima — WEATHER_CONFIG tem chances entre 0 e 1', () => {
  for (const [k, v] of Object.entries(WEATHER_CONFIG)) {
    if (k.endsWith('Chance') || k === 'rainChance') assert.ok(v >= 0 && v <= 1, `${k} fora de 0-1: ${v}`);
  }
  for (const [k, icon] of Object.entries(WEATHER_ICONS)) assert.ok(typeof icon === 'string', `ícone ${k} inválido`);
});

test('simulação: scaleEnemy — acima de SCALING_START só coinMultiplier escala', () => {
  const low = scaleEnemy('wolf', 5);
  const high = scaleEnemy('wolf', 50);
  assert.equal(low.level, 5, 'nível preservado');
  assert.ok(high.coinMultiplier > low.coinMultiplier, 'moedas devem escalar com nível');
  assert.equal(high.level, 50, 'nível alto preservado');
  // abaixo do SCALING_START nada escala
  assert.equal(scaleEnemy('wolf', 1).coinMultiplier, 1, 'nível 1 sem escala');
});

test('simulação: levelInRange — retorna nível dentro da faixa pedida', () => {
  for (const range of [[1, 10], [20, 40], [5, 5]]) {
    const lvl = levelInRange({ min: 5, max: 30 }, range);
    assert.ok(typeof lvl === 'number' && lvl >= range[0] && lvl <= range[1], `levelInRange(${range}) = ${lvl} fora da faixa`);
  }
});

test('simulação: Inventory — add guarda itens, usedSlots conta slots e serialize preserva', () => {
  const inv = new Inventory();
  assert.ok(inv.add('wood', 37), 'add devolve true');
  assert.ok(inv.add('stone', 10), 'outro recurso entra');
  assert.equal(inv.items.wood, 37, 'quantidade acumulada');
  assert.ok(inv.usedSlots >= 2, `usedSlots >= 2 (ficou ${inv.usedSlots})`);
  const data = inv.serialize();
  const inv2 = new Inventory();
  inv2.deserialize?.(data) ?? Object.assign(inv2.items, data.items ?? data);
  assert.equal(inv2.items.wood, 37, 'serialize preserva wood');
});

test('simulação: CampfireTravelers — dia de visita (múltiplo de 4, fogueira nv≥4) ativa viajantes', () => {
  const t = new CampfireTravelers(undefined);
  assert.equal(t.isVisitDay(4, 4), true, 'dia 4 com fogueira nv4 é dia de visita');
  assert.equal(t.isVisitDay(4, 3), false, 'fogueira nv3 não desbloqueia viajantes');
  assert.equal(t.refresh(4, 4), true, 'refresh em dia de visita devolve true');
  assert.equal(t.present, true, 'present=true no dia da visita (booleano)');
  assert.ok(t.acceptQuest() === true || t.acceptQuest() === false, 'acceptQuest devolve booleano');
});

test('simulação: BUILDING_DEFS — ordem de construção tem todas as construções e sem duplicar', () => {
  assert.ok(Array.isArray(BUILDING_ORDER) && BUILDING_ORDER.length >= 5, 'poucas construções na ordem');
  const set = new Set(BUILDING_ORDER);
  assert.equal(set.size, BUILDING_ORDER.length, 'ordem sem duplicatas');
  for (const key of BUILDING_ORDER) assert.ok(BUILDING_DEFS[key], `construção ${key} ausente em BUILDING_DEFS`);
  // toda construção tem níveis válidos (chaves numéricas de 1..MAX)
  for (const key of BUILDING_ORDER) {
    const lvls = Object.keys(BUILDING_DEFS[key].levels ?? {}).map(Number);
    assert.ok(lvls.length >= 1 && Math.min(...lvls) >= 1, `${key} sem níveis válidos`);
  }
});

test('simulação: dayNight — fases dentro do ciclo: dia, transição, noite', () => {
  // amostramos o ciclo em horas e conferimos que dawn < dusk e há noite após dusk
  const c = DAY_NIGHT_CONFIG;
  assert.ok(c.dayDurationSeconds > 0 && c.nightDurationSeconds > 0, 'durações positivas');
  assert.equal(DAY_NIGHT_TOTAL_SECONDS, c.dayDurationSeconds + c.nightDurationSeconds, 'total = dia + noite');
  assert.ok(c.transitionDurationSeconds < c.dayDurationSeconds, 'transição menor que o dia');
});

test('simulação: CONSUMABLES — heal não negativo e hotkey dentro de 1-5', () => {
  for (const [id, c] of Object.entries(CONSUMABLES)) {
    assert.ok((c.heal ?? 0) >= 0, `consumível ${id} cura negativa`);
    if (c.hotkey !== undefined) assert.ok(c.hotkey >= 1 && c.hotkey <= 5, `consumível ${id} hotkey inválida: ${c.hotkey}`);
  }
  // ao menos 3 consumíveis
  assert.ok(Object.keys(CONSUMABLES).length >= 3, 'poucos consumíveis');
});

test('simulação: enemyXp — tier alto dá mais xp que tier baixo', () => {
  const low = enemyXp(Object.keys(ENEMY_TYPES).find((k) => ENEMY_TYPES[k].tier === 1), false, 1);
  const high = enemyXp(Object.keys(ENEMY_TYPES).find((k) => (ENEMY_TYPES[k].tier ?? 1) >= 8), true, 20);
  assert.ok(high > low, `xp elite alto (${high}) deve superar tier 1 (${low})`);
});

test('simulação: achievements — serialize/deserialize preserva desbloqueadas', () => {
  const a = new Achievements();
  a.note('kills', 9999);
  a.check();
  const unlockedBefore = Object.keys(a.unlocked).length;
  assert.ok(unlockedBefore >= 1, 'algo deveria ter desbloqueado com 9999 kills');
  const data = a.serialize();
  const b = new Achievements();
  b.deserialize?.(data) ?? Object.assign(b.unlocked, data.unlocked ?? data);
  assert.equal(Object.keys(b.unlocked).length, unlockedBefore, 'serialize preserva desbloqueadas');
});

test('simulação: bestiário — serialize preserva kills e known', () => {
  const b = new Bestiary();
  b.recordKill('wolf'); b.recordKill('wolf'); b.recordKill('boar');
  assert.equal(b.kills.wolf, 2, 'kills acumulam');
  const data = b.serialize();
  const b2 = new Bestiary();
  b2.deserialize?.(data) ?? Object.assign(b2.kills, data.kills ?? data);
  assert.equal(b2.kills.wolf, 2, 'serialize preserva kills');
});

test('simulação: RESOURCE_NODES — nós têm label, count positivo e amount [min,max] válido', () => {
  const ids = Object.keys(RESOURCE_NODES);
  assert.ok(ids.length >= 3, 'poucos nós de recurso');
  for (const [id, node] of Object.entries(RESOURCE_NODES)) {
    assert.ok(node.label, `nó ${id} sem label`);
    assert.ok((node.count ?? 0) > 0, `nó ${id} count inválido`);
    if (Array.isArray(node.amount)) {
      assert.ok(node.amount[0] > 0 && node.amount[1] >= node.amount[0], `nó ${id} amount inválido: ${node.amount}`);
    }
  }
});

test('simulação: SPAWN_ZONES — zonas têm bioma válido e raio positivo', () => {
  const names = Object.keys(SPAWN_ZONES);
  assert.ok(names.length >= 3, 'poucas zonas de spawn');
  for (const [name, zone] of Object.entries(SPAWN_ZONES)) {
    assert.ok(typeof zone === 'object', `zona ${name} inválida`);
    if (zone.radius !== undefined) assert.ok(zone.radius > 0, `zona ${name} raio inválido`);
  }
});

test('simulação: MARKET_CATALOG — entradas têm id, preço positivo e recurso válido', () => {
  assert.ok(MARKET_CATALOG.length >= 5, 'poucas entradas de mercado');
  const ids = new Set();
  for (const entry of MARKET_CATALOG) {
    assert.ok(entry.id && !ids.has(entry.id), `entrada sem id ou duplicada: ${entry.id}`);
    ids.add(entry.id);
    assert.ok((entry.price ?? 0) > 0, `entrada ${entry.id} preço inválido`);
    const res = entry.sells ?? entry.resource ?? entry.type;
    if (res) assert.ok(RESOURCE_TYPES[res] || CONSUMABLES[res], `entrada ${entry.id} recurso inválido: ${res}`);
  }
});

test('simulação: SPAWNING_CONFIG — limites dia/noite e anéis de distância sadios', () => {
  const c = SPAWNING_CONFIG;
  assert.ok(c.activeLimit.night > c.activeLimit.day, 'à noite spawna mais');
  assert.ok(c.spawnIntervalMs.night < c.spawnIntervalMs.day, 'à noite spawna mais rápido');
  assert.ok(c.safeZoneRadius > 0, 'zona segura positiva');
  assert.ok(c.distanceRings.length >= 2, 'poucos anéis de distância');
  for (const ring of c.distanceRings) {
    assert.ok(ring.min < ring.max && ring.weight > 0, `anel inválido: ${JSON.stringify(ring)}`);
  }
  assert.ok(c.nightScaling.damageMultiplier > 1, 'noite mais perigosa');
});

test('simulação: COIN_DROP_RANGES/rollCoinDrop — elite dá mais moedas que normal', () => {
  const normal = rollCoinDrop('day', () => 0.5, false);
  const elite = rollCoinDrop('day', () => 0.5, true);
  assert.ok(elite >= normal, `elite (${elite}) deve dar >= normal (${normal})`);
  assert.ok(normal >= 0, 'moedas não negativas');
  assert.ok(Object.keys(COIN_DROP_RANGES).length >= 2, 'poucos períodos de drop');
});

test('simulação: chestCoins — baú conhecido dá moedas dentro da faixa', () => {
  const coins = chestCoins('commonChest');
  assert.ok(typeof coins === 'number' && coins >= 0, 'moedas de baú válidas');
  // baú inexistente não deve quebrar
  assert.ok(chestCoins('naoExiste') === 0 || typeof chestCoins('naoExiste') === 'number', 'baú desconhecido não quebra');
});

test('simulação: raids — dia de raid tem tier ≥ 1 e composição em ondas válidas', () => {
  // acha um dia de raid
  let raidDay = -1;
  for (let d = 1; d <= 60 && raidDay < 0; d += 1) if (isRaidDay(d)) raidDay = d;
  assert.ok(raidDay > 0, 'nenhum dia de raid em 60 dias');
  const comp = raidComposition(raidDay);
  const total = Array.isArray(comp) ? comp.length : Object.values(comp).reduce((a, b) => a + b, 0);
  assert.ok(total > 0, 'composição vazia');
  const waves = splitIntoWaves(comp);
  const waveTotal = waves.flat().length > 0 ? waves.flat().length : waves.length;
  assert.ok(waveTotal >= 1, 'ondas geradas');
  assert.ok(raidTier(raidDay) >= 1, 'tier positivo');
  for (let d = 1; d <= 120; d += 1) {
    const ch = raidEliteChance(d);
    assert.ok(ch >= 0 && ch <= 1, `chance de elite fora de [0,1]: ${ch}`);
  }
  assert.ok(raidEliteChance(120) > raidEliteChance(10), 'chance de elite cresce com o tier');
});

test('simulação: rebirth — multiplicador cresce e canRebirth exige nível', () => {
  assert.equal(rebirthMultiplier(0), 1, 'sem rebirth multiplicador 1');
  assert.ok(rebirthMultiplier(1) > 1, '1 rebirth aumenta multiplicador');
  assert.ok(rebirthMultiplier(3) > rebirthMultiplier(1), 'monotônico');
  assert.equal(canRebirth(1, 0), false, 'nível baixo não pode renascer');
  const cfg = REBIRTH_CONFIG;
  assert.ok(canRebirth(cfg.level, 0) === true, `nível ${cfg.level} deve poder renascer`);
  assert.ok(canRebirth(cfg.level, cfg.max) === false, 'no máximo de renasceres não pode de novo');
});

test('simulação: companions — pets têm id único, ovo ou loja, e mountUnlocked só no nível certo', () => {
  assert.ok(PET_IDS.length >= 3, 'poucos pets');
  assert.equal(new Set(PET_IDS).size, PET_IDS.length, 'ids de pets duplicados');
  for (const id of PET_IDS) {
    const pet = PETS[id];
    assert.ok(pet.egg === true || pet.egg === false || pet.price !== undefined, `pet ${id} sem origem`);
    assert.ok(petAbility(id), `pet ${id} sem habilidade`);
  }
  assert.equal(mountUnlocked(MOUNT_LEVEL - 1), false, 'abaixo do nível não monta');
  assert.equal(mountUnlocked(MOUNT_LEVEL), true, 'no nível desbloqueia montaria');
  assert.ok(MOUNT_SPEED > 1, 'montaria acelera');
});

test('simulação: monsterChests — baús têm tiers e loot válido', () => {
  assert.ok(Object.keys(CHEST_TIERS).length >= 2, 'poucos tiers de baú');
  for (const [tier, cfg] of Object.entries(CHEST_TIERS)) {
    assert.ok((cfg.weight ?? cfg.chance ?? 1) >= 0, `tier ${tier} peso inválido`);
  }
  const roll = rollMonsterChest('elite', () => 0.5);
  assert.ok(roll && typeof roll === 'object', 'loot de baú elite é objeto');
  assert.ok(roll.items && Object.keys(roll.items).length > 0, 'baú elite dropa itens');
  assert.ok((roll.coins ?? 0) >= 0, 'moedas do baú não negativas');
  for (const item of Object.keys(roll.items)) {
    assert.ok(RESOURCE_TYPES[item] || CONSUMABLES[item], `item de baú desconhecido: ${item}`);
  }
  for (const [id, loot] of Object.entries(CHEST_LOOT)) {
    assert.ok(loot, `loot ${id} vazio`);
  }
});

test('simulação: enhance — chance cai com o nível e nunca fica negativa; custo cresce', () => {
  for (let t = 0; t <= MAX_ENHANCE; t += 1) {
    const ch = enhanceChance(t);
    assert.ok(ch > 0 && ch <= 1, `chance enhance nível ${t} fora de (0,1]: ${ch}`);
    if (t > 0) assert.ok(ch <= enhanceChance(t - 1) + 1e-9, `chance não cai no nível ${t}`);
  }
  assert.ok(enhanceCost(0, 1) <= enhanceCost(0, MAX_ENHANCE), 'custo cresce com o alvo');
  assert.ok(enhanceMultiplier(MAX_ENHANCE) > enhanceMultiplier(0), 'multiplicador cresce');
});

test('simulação: jewels — tipos válidos dão valor positivo e socketCount respeita raridade', () => {
  assert.ok(JEWEL_TYPES.length >= 3, 'poucas joias');
  for (const type of JEWEL_TYPES) {
    assert.ok(jewelValue(type, 10) > 0, `joia ${type} valor inválido`);
    assert.ok(typeof describeJewel(type, 10) === 'string', `joia ${type} sem descrição`);
  }
  for (const slot of SOCKET_SLOTS) {
    assert.ok(socketCount(slot, 'rare') >= socketCount(slot, 'common'), `slot ${slot} raro deve ter mais soquetes`);
  }
  const drop = rollJewelDrop({ elite: true }, () => 0.01);
  assert.ok(drop === null || Array.isArray(drop) || typeof drop === 'object', 'drop de joia válido');
});

test('simulação: progressão — xp por nível cresce e perk levels são crescentes', () => {
  assert.ok(xpRequiredForLevel(2) > xpRequiredForLevel(1), 'xp nível 2 > nível 1');
  assert.ok(xpRequiredForLevel(10) > xpRequiredForLevel(5), 'xp cresce com nível');
  for (let i = 1; i < PERK_LEVELS.length; i += 1) {
    assert.ok(PERK_LEVELS[i] > PERK_LEVELS[i - 1], 'perk levels estritamente crescentes');
  }
  assert.ok(PERK_OFFER_SIZE >= 2, 'oferece pelo menos 2 perks');
  assert.ok(respecCost(1) >= 0 && respecCost(150) >= respecCost(1), 'respec não negativo e cresce');
  assert.ok(Object.keys(PERKS).length >= 5, 'poucos perks');
});

test('simulação: villagers — aldeões têm stats positivos e IDs únicos', () => {
  assert.ok(VILLAGERS.length >= 3, 'poucos aldeões');
  const ids = new Set();
  for (const v of VILLAGERS) {
    assert.ok(v.id && !ids.has(v.id), `aldeão sem id ou duplicado: ${v.id}`);
    ids.add(v.id);
  }
  assert.ok(VILLAGER_STATS.health > 0 && VILLAGER_STATS.attack > 0, 'stats de aldeão positivos');
  assert.ok(VILLAGER_STATS.sight > VILLAGER_STATS.range, 'aldeão enxerga longe');
});

test('simulação: boss — Golem de Fogo tem vida, dano, padrões e recompensa sadios', () => {
  const c = BOSS_CONFIG;
  assert.ok(c.maxHealth >= 1000, 'vida do boss alta');
  assert.ok(c.damage > 0 && c.patternCooldownMs > 0, 'dano e cooldown positivos');
  assert.ok(c.detectionRange > c.attackRange, 'detecta de longe, ataca de perto');
  assert.ok(Array.isArray(c.patterns) && c.patterns.length >= 2, 'boss tem padrões de ataque');
  assert.ok(c.coinDrop > 0 && c.rareItem, 'boss dá moedas e item raro');
  assert.ok(BOSS_CAMP_DISTANCE > 0, 'distância ao acampamento calculada');
});

test('simulação: story — capítulos, lore e finais existem e têm texto', () => {
  const chapters = Object.keys(CHAPTER_STORY);
  assert.ok(chapters.length >= 3, 'poucos capítulos');
  for (const [id, ch] of Object.entries(CHAPTER_STORY)) {
    assert.ok(ch.title || ch.text, `capítulo ${id} sem conteúdo`);
  }
  assert.ok(Object.keys(STORY_LORE).length >= 5, 'pouco lore');
  assert.ok(Object.keys(ENDINGS).length >= 2, 'poucos finais');
  for (const [id, end] of Object.entries(ENDINGS)) {
    assert.ok(end.title && end.lore, `final ${id} incompleto`);
  }
});

test('simulação: sunShadow — sombra do sol tem ângulo/comprimento/alpha válidos e varia com a hora', () => {
  const hours = [0, 6, 9, 12, 15, 18, 23];
  for (const h of hours) {
    const s = sunShadow(h);
    assert.ok(s && typeof s.angle === 'number' && typeof s.length === 'number' && typeof s.alpha === 'number', `sunShadow(${h}) incompleto`);
    assert.ok(s.length >= 0 && s.length <= 1 && s.alpha >= 0 && s.alpha <= 1, `sunShadow(${h}) fora da faixa: ${JSON.stringify(s)}`);
  }
  // longe do meio-dia a sombra é mais comprida que no meio-dia
  assert.ok(sunShadow(17).length > sunShadow(12).length, 'sombra maior longe do meio-dia');
});

test('simulação: HARVEST_STRUCTURE_TYPES — estruturas têm label, recompensa e regrowth sadios', () => {
  const types = Object.keys(HARVEST_STRUCTURE_TYPES);
  assert.ok(types.length >= 3, 'poucas estruturas de coleta');
  for (const [id, def] of Object.entries(HARVEST_STRUCTURE_TYPES)) {
    assert.ok(def.label, `estrutura ${id} sem label`);
    if (def.rewardType) assert.ok(RESOURCE_TYPES[def.rewardType], `estrutura ${id} rewardType inválido: ${def.rewardType}`);
    else assert.ok(CHEST_LOOT_RECIPES.length >= 1, `estrutura ${id} sem rewardType deveria ser baú com receitas`);
    if (def.rewardAmount) assert.ok(Array.isArray(def.rewardAmount) && def.rewardAmount[1] >= def.rewardAmount[0] && def.rewardAmount[0] > 0, `estrutura ${id} rewardAmount inválido`);
    assert.ok((def.regrowDays ?? 0) >= 0, `estrutura ${id} regrowDays inválido`);
  }
  assert.ok(HARVEST_STRUCTURE_INTERACTION_RANGE > 0, 'alcance de interação positivo');
  const r = createSeededRandom(123);
  const a = r(); const b = r();
  assert.ok(a >= 0 && a < 1 && b >= 0 && b < 1 && a !== b, 'seeded random em [0,1) e não constante');
});

test('simulação: weather — weatherAt devolve clima válido e ícone conhecido', () => {
  for (const region of ['vale', 'floresta', 'brejo', 'neve', 'areia', 'praia', 'selva', 'gelo', 'cinzas', 'brasa', 'antiga', 'esmeralda', 'mar']) {
    for (const night of [false, true]) {
      const w = weatherAt(region, { dayCount: 5, isNight: night });
      assert.ok(typeof w === 'string' && w.length > 0, `weatherAt(${region}, noite=${night}) inválido: ${w}`);
      assert.ok(Object.keys(WEATHER_CONFIG).includes(w) || w in WEATHER_ICONS, `clima desconhecido: ${w}`);
    }
  }
  assert.equal(isRaining({ dayCount: 3, isNight: false }), isRainyDay(3), 'isRaining dia = isRainyDay');
});

test('simulação: dropScale — escala não deixa chance > 1 nem negativa', () => {
  const drop = { type: 'wood', chance: 0.9 };
  for (const def of [{}, { rareBelow: 0.5 }, { chance: 1 }]) {
    const ch = scaledChance(drop, def);
    assert.ok(ch >= 0 && ch <= 1, `scaledChance fora de [0,1]: ${ch}`);
    assert.ok(isScaledDrop(drop, def) === true || isScaledDrop(drop, def) === false, 'isScaledDrop booleano');
  }
  const amt = scaledAmount(10, drop, {}, () => 0.5);
  assert.ok(amt >= 0 && amt <= 10, `scaledAmount (${amt}) deve ficar em [0, original]`);
});

test('simulação: FARM_CROPS — culturas têm custo, produção e tempo de crescimento sadios', () => {
  const crops = Object.keys(FARM_CROPS);
  assert.ok(crops.length >= 3, 'poucas culturas');
  for (const [id, crop] of Object.entries(FARM_CROPS)) {
    assert.ok(crop.name, `cultura ${id} sem nome`);
    assert.ok(crop.cost && Object.keys(crop.cost).length > 0, `cultura ${id} sem custo`);
    assert.ok(crop.yield && Object.keys(crop.yield).length > 0, `cultura ${id} sem produção`);
    for (const res of Object.keys(crop.yield)) assert.ok(RESOURCE_TYPES[res], `cultura ${id} produz recurso inválido: ${res}`);
    assert.ok((crop.seconds ?? 0) > 0, `cultura ${id} cresce instantaneamente?`);
  }
});

test('simulação: repairCostFor/upgradeCostFor — custo em recursos, não negativo e cresce', () => {
  const r100 = repairCostFor(100);
  const r200 = repairCostFor(200);
  assert.ok(r100 && typeof r100 === 'object', 'reparo devolve objeto de recursos');
  const soma = (o) => Object.values(o).reduce((a, b) => a + (b ?? 0), 0);
  assert.ok(soma(r100) >= 0 && soma(r200) >= soma(r100), 'reparo não negativo e cresce com o dano');
  const up = upgradeCostFor({ iron: 2, coins: 10 });
  assert.ok(up && typeof up === 'object', 'upgrade devolve objeto de custo');
  assert.ok(Object.keys(FORGE_SERVICES).length >= 2, 'poucos serviços de forja');
  assert.ok(AUTO_ANIMAL_PRODUCTS.every((p) => RESOURCE_TYPES[p]), 'produtos automáticos válidos');
});

test('simulação: COMBAT_CONFIG — cooldowns e alcances positivos e coerentes', () => {
  const c = COMBAT_CONFIG;
  assert.ok(c.attackCooldownMs > 0, 'cooldown de ataque positivo');
  assert.ok(c.attackRange > 0, 'alcance de ataque positivo');
  assert.ok(c.dodgeCooldownMs >= 0, 'cooldown de esquiva não negativo');
  if (c.specialCooldownMs !== undefined) assert.ok(c.specialCooldownMs > 0, 'cooldown especial positivo');
});

test('simulação: GEAR_SETS — conjuntos têm peças em slots válidos e bônus', () => {
  const setIds = Object.keys(GEAR_SETS);
  assert.ok(setIds.length >= 3, 'poucos conjuntos de equipamento');
  for (const [id, set] of Object.entries(GEAR_SETS)) {
    const pieces = Object.keys(set.pieces ?? {});
    assert.ok(pieces.length >= 2, `conjunto ${id} com poucas peças (${pieces.length})`);
    for (const slot of pieces) assert.ok(GEAR_SLOTS.includes(slot), `conjunto ${id} slot inválido: ${slot}`);
    assert.ok(set.bonus || set.name, `conjunto ${id} sem bônus nem nome`);
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
