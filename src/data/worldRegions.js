import { hash } from '../art/pixel.js';

// Mundo grande de Eldoria: o Vale original (0..2880 x 0..2160) continua no canto
// noroeste, com as mesmas coordenadas, e o mundo cresce para leste e para o sul.
// Tudo aqui é determinístico (mesmo mapa em toda partida) e roda no Node (testes).

export const TILE = 48;
export const WORLD_COLS = 150;
export const OVERWORLD_ROWS = 112;
export const OVERWORLD = Object.freeze({ width: WORLD_COLS * TILE, height: OVERWORLD_ROWS * TILE });
export const VALLEY = Object.freeze({ x: 0, y: 0, width: 2880, height: 2160 });

// Subterrâneo: salas das cavernas numa faixa abaixo do mar (fora do mapa visível).
export const ROOM_COLS = 30;
export const ROOM_ROWS = 20;
const ROOM_GAP = 4;
const UNDERGROUND_FIRST_ROW = OVERWORLD_ROWS + 4;
const ROOMS_PER_ROW = 4;
export const TOTAL_ROWS = UNDERGROUND_FIRST_ROW + 4 * (ROOM_ROWS + ROOM_GAP);
export const FULL_WORLD = Object.freeze({ width: WORLD_COLS * TILE, height: TOTAL_ROWS * TILE });

// ---------- Regiões ----------

export const REGION_INFO = Object.freeze({
  vale: { name: 'Vale de Eldoria', levels: '1-10', color: '#4a7b48', banner: 'O lar do acampamento.' },
  antiga: { name: 'Floresta Antiga', levels: '6-12', color: '#24452c', banner: 'Árvores mais velhas que os reis. Goblins e orcs vigiam as trilhas.' },
  brejo: { name: 'Brejo Sombrio', levels: '8-14', color: '#3d4a33', banner: 'Água parada, névoa e coisas que se afogaram aqui.' },
  gelo: {
    name: 'Picos Gelados', levels: '12-18', color: '#d8e6f0', banner: 'O vento corta como lâmina.',
    hazard: { flag: 'warmClothes', damage: 3, message: 'Frio intenso! Roupas quentes protegem você (missão 51).' }
  },
  areia: {
    name: 'Grande Deserto', levels: '14-20', color: '#d8b56a', banner: 'Areia sem fim e tumbas de reis esquecidos.',
    hazard: { flag: 'desertSupplies', damage: 3, message: 'O sol do deserto drena suas forças! Suprimentos ajudam (missão 61).' }
  },
  esmeralda: { name: 'Ilha Esmeralda', levels: '10-16', color: '#5aa04a', banner: 'Praias brancas, coqueiros e piratas que não descansam.' },
  brasa: {
    name: 'Ilha de Brasa', levels: '18-20+', color: '#5a2a22', banner: 'O vulcão respira. Demônios guardam o fogo antigo.',
    hazard: { flag: 'ashMasks', damage: 4, message: 'Cinzas queimam seus pulmões! Máscaras protegem você (missão 82).' }
  },
  mar: { name: 'Mar de Eldoria', levels: '-', color: '#2a5a8a', banner: '' },
  caverna: { name: 'Caverna', levels: '-', color: '#2a2630', banner: '' }
});

// Terrenos (tipo de chão de cada quadrado).
export const T = Object.freeze({
  VALLEY: 0, FOREST: 1, SWAMP: 2, SNOW: 3, SAND: 4, BEACH: 5, JUNGLE: 6, ASH: 7,
  SEA: 8, LAVA: 9, MURK: 10, ICE: 11, CAVE: 12, WALL: 13, VOID: 14, DUNE: 15
});
export const TERRAIN_NAMES = Object.freeze(Object.fromEntries(Object.entries(T).map(([key, value]) => [value, key])));
/** Água funda e lava bloqueiam a passagem; paredes da caverna e o vazio também. */
export const BLOCKING = new Set([T.SEA, T.LAVA, T.WALL, T.VOID]);
/** Terrenos que ficam na camada de baixo (animada) e recebem borda do chão vizinho. */
export const UNDER_TERRAINS = new Set([T.SEA, T.LAVA, T.MURK, T.ICE]);

// Ruído suave determinístico (valor interpolado) e soma de oitavas.
function valueNoise(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, seed);
  const b = hash(x0 + 1, y0, seed);
  const c = hash(x0, y0 + 1, seed);
  const d = hash(x0 + 1, y0 + 1, seed);
  const top = a + (b - a) * sx;
  const bottom = c + (d - c) * sx;
  return top + (bottom - top) * sy;
}

export function fractal(x, y, seed = 0, octaves = 3) {
  let total = 0;
  let amplitude = 1;
  let norm = 0;
  let frequency = 1;
  for (let octave = 0; octave < octaves; octave += 1) {
    total += valueNoise(x * frequency, y * frequency, seed + octave * 101) * amplitude;
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return total / norm;
}

// Fronteiras irregulares entre as regiões do continente.
const eastOfValley = (y) => VALLEY.width + 60 + fractal(y / 240, 3.7, 11, 4) * 380;
const southOfValley = (x) => VALLEY.height + 60 + fractal(x / 240, 8.1, 12, 4) * 380;
const desertWest = (y) => 5040 + (fractal(y / 240, 1.3, 13, 4) - 0.5) * 520;
const coastY = (x) => 3480 + (fractal(x / 220, 5.2, 14, 4) - 0.5) * 380;

export const ISLANDS = Object.freeze({
  esmeralda: { cx: 1800, cy: 4520, rx: 1150, ry: 600, seed: 21 },
  brasa: { cx: 5500, cy: 4540, rx: 1250, ry: 620, seed: 22 }
});
// Cratera do vulcão (lago de lava) na Ilha de Brasa.
const CRATER = { cx: 5650, cy: 4420, rx: 300, ry: 190 };
// Oásis do deserto (água parada com coqueiros em volta).
export const OASES = Object.freeze([{ x: 6100, y: 900, r: 170 }, { x: 5700, y: 2600, r: 140 }]);

function islandValue(island, x, y) {
  const dx = (x - island.cx) / island.rx;
  const dy = (y - island.cy) / island.ry;
  const wobble = (fractal(x / 260, y / 260, island.seed) - 0.5) * 0.55;
  return dx * dx + dy * dy + wobble;
}

/** Região do ponto (x, y) em pixels do mundo. */
export function regionAt(x, y) {
  if (y >= OVERWORLD.height) return 'caverna';
  for (const [key, island] of Object.entries(ISLANDS)) {
    if (islandValue(island, x, y) < 1) return key;
  }
  if (y > coastY(x)) return 'mar';
  const east = eastOfValley(y);
  const south = southOfValley(x);
  if (x >= desertWest(y)) return 'areia';
  if (x < east && y < south) return 'vale';
  if (y < south) return 'gelo';
  return x < east ? 'brejo' : 'antiga';
}

/** Terreno base do ponto (sem bordas). */
export function terrainAt(x, y) {
  const region = regionAt(x, y);
  switch (region) {
    case 'vale': return T.VALLEY;
    case 'mar': return T.SEA;
    case 'caverna': return T.VOID;
    case 'antiga': return T.FOREST;
    case 'brejo': return fractal(x / 210, y / 210, 31) > 0.62 ? T.MURK : T.SWAMP;
    case 'gelo': return fractal(x / 260, y / 260, 32) > 0.68 ? T.ICE : T.SNOW;
    case 'areia': {
      for (const oasis of OASES) {
        if (Math.hypot(x - oasis.x, y - oasis.y) < oasis.r) return T.MURK;
      }
      return fractal(x / 180, y / 180, 33) > 0.6 ? T.DUNE : T.SAND;
    }
    case 'esmeralda': {
      const value = islandValue(ISLANDS.esmeralda, x, y);
      return value > 0.72 ? T.BEACH : T.JUNGLE;
    }
    case 'brasa': {
      const value = islandValue(ISLANDS.brasa, x, y);
      const dx = (x - CRATER.cx) / CRATER.rx;
      const dy = (y - CRATER.cy) / CRATER.ry;
      const crater = dx * dx + dy * dy + (fractal(x / 90, y / 90, 34) - 0.5) * 0.5;
      if (crater < 1) return T.LAVA;
      if (value > 0.8) return T.BEACH;
      return fractal(x / 150, y / 150, 35) > 0.74 ? T.LAVA : T.ASH;
    }
    default: return T.VALLEY;
  }
}

// ---------- Cavernas ----------

// Cada caverna tem andares (salas no subterrâneo); o chefe espera no último.
export const CAVES = Object.freeze([
  {
    id: 'toca-orc', name: 'Toca dos Orcs', region: 'antiga', entrance: { x: 4310, y: 2900 }, floors: 2, theme: 'earth',
    monsters: ['goblin', 'orc', 'bat'], boss: 'orcChief'
  },
  {
    id: 'gruta-afogada', name: 'Gruta Afogada', region: 'brejo', entrance: { x: 980, y: 3040 }, floors: 2, theme: 'swamp',
    monsters: ['frog', 'zombie', 'bat'], boss: 'hydra'
  },
  {
    id: 'caverna-cristal', name: 'Caverna de Cristal', region: 'gelo', entrance: { x: 4020, y: 760 }, floors: 3, theme: 'ice',
    monsters: ['iceElemental', 'frostWolf', 'yeti'], boss: 'frostGiant'
  },
  {
    id: 'tumba-farao', name: 'Tumba do Faraó', region: 'areia', entrance: { x: 6330, y: 1560 }, floors: 3, theme: 'tomb',
    monsters: ['mummy', 'scorpion', 'snake'], boss: 'pharaoh'
  },
  {
    id: 'gruta-piratas', name: 'Gruta dos Piratas', region: 'esmeralda', entrance: { x: 1480, y: 4620 }, floors: 2, theme: 'sea',
    monsters: ['crab', 'pirate', 'bat'], boss: 'ghostCaptain'
  },
  {
    id: 'coracao-vulcao', name: 'Coração do Vulcão', region: 'brasa', entrance: { x: 5180, y: 4640 }, floors: 3, theme: 'fire',
    monsters: ['imp', 'salamander', 'demon'], boss: 'dragon'
  }
]);
export const CAVES_BY_ID = Object.freeze(Object.fromEntries(CAVES.map((cave) => [cave.id, cave])));

/** Lista de salas (caverna, andar) na ordem do subterrâneo. */
export const CAVE_ROOMS = Object.freeze(CAVES.flatMap((cave) =>
  Array.from({ length: cave.floors }, (_, floor) => ({ cave: cave.id, floor }))
).map((room, index) => {
  const column = index % ROOMS_PER_ROW;
  const row = Math.floor(index / ROOMS_PER_ROW);
  const col0 = 5 + column * (ROOM_COLS + ROOM_GAP);
  const row0 = UNDERGROUND_FIRST_ROW + row * (ROOM_ROWS + ROOM_GAP);
  return Object.freeze({ ...room, index, col0, row0, x: col0 * TILE, y: row0 * TILE, width: ROOM_COLS * TILE, height: ROOM_ROWS * TILE });
}));

export function caveRoom(caveId, floor) {
  return CAVE_ROOMS.find((room) => room.cave === caveId && room.floor === floor) ?? null;
}

export function roomAt(x, y) {
  return CAVE_ROOMS.find((room) => x >= room.x && x < room.x + room.width && y >= room.y && y < room.y + room.height) ?? null;
}

/**
 * Planta de uma sala: túnel sinuoso da escada de subida (esquerda) até a de
 * descida/arena do chefe (direita), com câmaras laterais. Devolve uma grade
 * ROOM_COLS x ROOM_ROWS (1 = chão) e os pontos de entrada e saída (em quadrados).
 */
export function carveRoom(room) {
  const cols = ROOM_COLS;
  const rows = ROOM_ROWS;
  const grid = new Uint8Array(cols * rows);
  const seed = 500 + room.index * 17;
  const open = (cx, cy, radius) => {
    for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
      for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
        if (x < 1 || y < 1 || x >= cols - 1 || y >= rows - 1) continue;
        const rough = radius + (hash(x, y, seed) - 0.5) * 0.9;
        if ((x - cx) ** 2 + (y - cy) ** 2 <= rough * rough) grid[y * cols + x] = 1;
      }
    }
  };
  const entry = { col: 3, row: 3 + Math.floor(hash(1, 2, seed) * (rows - 6)) };
  const exit = { col: cols - 5, row: 3 + Math.floor(hash(3, 4, seed) * (rows - 6)) };
  // Caminho principal com pontos de controle aleatórios.
  const points = [entry];
  for (let step = 1; step <= 4; step += 1) {
    points.push({ col: 3 + step * ((cols - 8) / 5), row: 3 + hash(step, 9, seed) * (rows - 6) });
  }
  points.push(exit);
  for (let index = 0; index + 1 < points.length; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    const length = Math.max(1, Math.hypot(b.col - a.col, b.row - a.row));
    for (let t = 0; t <= length; t += 0.5) {
      const k = t / length;
      open(a.col + (b.col - a.col) * k, a.row + (b.row - a.row) * k, 1.6 + hash(Math.round(t), index, seed) * 1.1);
    }
  }
  // Câmaras (onde ficam os bandos de monstros).
  const chambers = [];
  for (let index = 0; index < 4; index += 1) {
    const col = 6 + hash(index, 30, seed) * (cols - 12);
    const row = 4 + hash(index, 31, seed) * (rows - 8);
    const radius = 2.6 + hash(index, 32, seed) * 1.6;
    open(col, row, radius);
    // Liga a câmara ao caminho mais próximo.
    const nearest = points.reduce((best, point) =>
      Math.hypot(point.col - col, point.row - row) < Math.hypot(best.col - col, best.row - row) ? point : best, points[0]);
    const length = Math.hypot(nearest.col - col, nearest.row - row);
    for (let t = 0; t <= length; t += 0.5) {
      const k = t / Math.max(1, length);
      open(col + (nearest.col - col) * k, row + (nearest.row - row) * k, 1.4);
    }
    chambers.push({ col: Math.round(col), row: Math.round(row) });
  }
  open(entry.col, entry.row, 2.4);
  open(exit.col, exit.row, room.isLast ? 4.2 : 2.4);
  return { grid, entry, exit, chambers };
}

// ---------- Portos (viagem de barco) ----------

export const DOCKS = Object.freeze([
  { id: 'porto-brejo', name: 'Porto do Brejo', region: 'brejo', x: 1560, price: 0 },
  { id: 'porto-areia', name: 'Porto das Dunas', region: 'areia', x: 6280, price: 0 },
  { id: 'porto-esmeralda', name: 'Porto Esmeralda', region: 'esmeralda', x: 1900, island: 'esmeralda', price: 0 },
  { id: 'porto-brasa', name: 'Porto de Brasa', region: 'brasa', x: 5260, island: 'brasa', price: 0 }
]);
// Preço da passagem (moedas) entre portos.
export const BOAT_FARE = 15;

/**
 * Posição de cada porto: começa na terra e anda para o sul (continente) ou
 * para o norte (ilhas) até achar o mar. Devolve o ponto do píer na areia e o barco na água.
 */
export function dockPosition(dock) {
  const direction = dock.island ? -1 : 1;
  let y = dock.island ? ISLANDS[dock.island].cy : 3000;
  let lastLand = y;
  for (let step = 0; step < 400; step += 1) {
    const terrain = terrainAt(dock.x, y);
    if (terrain === T.SEA) break;
    lastLand = y;
    y += direction * 12;
  }
  const shore = Math.floor(lastLand / TILE) * TILE + TILE / 2;
  return {
    x: Math.floor(dock.x / TILE) * TILE + TILE / 2,
    y: shore - direction * TILE,
    boatY: shore + direction * TILE * 2.2
  };
}

// ---------- Monstros por região ----------

export const REGION_SPAWNS = Object.freeze({
  antiga: { day: ['goblin', 'goblin', 'bear', 'orc'], night: ['treant', 'orc', 'werewolf', 'bat'] },
  brejo: { day: ['frog', 'frog', 'snake', 'slime'], night: ['zombie', 'witch', 'ghost', 'bat'] },
  gelo: { day: ['frostWolf', 'frostWolf', 'yeti'], night: ['iceElemental', 'frostWolf', 'yeti'] },
  areia: { day: ['scorpion', 'scorpion', 'sandworm', 'snake'], night: ['mummy', 'scorpion', 'sandworm'] },
  esmeralda: { day: ['crab', 'crab', 'snake'], night: ['pirate', 'crab', 'bat'] },
  brasa: { day: ['imp', 'salamander', 'imp'], night: ['demon', 'imp', 'salamander'] }
});

// Monstros novos também aparecem no Vale (somados às zonas antigas).
export const VALLEY_EXTRA_SPAWNS = Object.freeze({ day: ['rat', 'snake'], night: ['bat'] });

export const REGION_KEYS = Object.freeze(Object.keys(REGION_INFO).filter((key) => key !== 'caverna'));

/** Remove poças/lagos encostados no Vale (lá o chão é a grama antiga, sem borda). */
function cleanGrid(grid) {
  const { cols, rows, terrain } = grid;
  const fallback = { [T.MURK]: T.SWAMP, [T.ICE]: T.SNOW };
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const kind = terrain[row * cols + col];
      if (!fallback[kind]) continue;
      let nearValley = false;
      for (let dy = -1; dy <= 1 && !nearValley; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const c = col + dx;
          const r = row + dy;
          if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
          if (terrain[r * cols + c] === T.VALLEY) { nearValley = true; break; }
        }
      }
      if (nearValley) terrain[row * cols + col] = fallback[kind];
    }
  }
  return grid;
}

// ---------- Grade de terreno (todo o mundo, inclusive as salas das cavernas) ----------

/** Monta a grade de terrenos do mundo inteiro. Leva poucos milissegundos. */
export function buildTerrainGrid() {
  const cols = WORLD_COLS;
  const rows = TOTAL_ROWS;
  const terrain = new Uint8Array(cols * rows).fill(T.VOID);
  for (let row = 0; row < OVERWORLD_ROWS; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      terrain[row * cols + col] = terrainAt(col * TILE + TILE / 2, row * TILE + TILE / 2);
    }
  }
  cleanGrid({ cols, rows: OVERWORLD_ROWS, terrain });
  const rooms = [];
  for (const room of CAVE_ROOMS) {
    const cave = CAVES_BY_ID[room.cave];
    const plan = carveRoom({ ...room, isLast: room.floor === cave.floors - 1 });
    for (let r = 0; r < ROOM_ROWS; r += 1) {
      for (let c = 0; c < ROOM_COLS; c += 1) {
        terrain[(room.row0 + r) * cols + room.col0 + c] = plan.grid[r * ROOM_COLS + c] ? T.CAVE : T.WALL;
      }
    }
    rooms.push({ ...room, plan });
  }
  return { cols, rows, terrain, rooms };
}

// ---------- Recursos das regiões ----------

// frame: desenho no atlas (nature = antigos, biome = novos). Minérios pedem picareta.
export const REGION_NODES = Object.freeze({
  wood: { atlas: 'nature', frame: 'resource-wood', amount: [2, 4] },
  stone: { atlas: 'nature', frame: 'resource-stone', amount: [2, 4], requiresPickaxe: true },
  herbs: { atlas: 'nature', frame: 'resource-herbs', amount: [2, 3] },
  food: { atlas: 'biome', frame: 'node-food', amount: [2, 3] },
  iron: { atlas: 'biome', frame: 'node-iron', amount: [1, 3], requiresPickaxe: true },
  coal: { atlas: 'biome', frame: 'node-coal', amount: [2, 3], requiresPickaxe: true },
  gold: { atlas: 'biome', frame: 'node-gold', amount: [1, 2], requiresPickaxe: true },
  crystal: { atlas: 'biome', frame: 'node-crystal', amount: [1, 2], requiresPickaxe: true },
  magmaCore: { atlas: 'biome', frame: 'node-magmaCore', amount: [1, 1], requiresPickaxe: true }
});

/** Quais recursos nascem em cada terreno (peso). */
export const TERRAIN_NODES = Object.freeze({
  [T.FOREST]: { wood: 4, herbs: 2, stone: 1 },
  [T.JUNGLE]: { wood: 2, food: 2, herbs: 2 },
  [T.SWAMP]: { herbs: 3, wood: 1 },
  [T.SNOW]: { stone: 2, crystal: 1.5, iron: 1 },
  [T.SAND]: { stone: 1, gold: 1 },
  [T.DUNE]: { gold: 1 },
  [T.BEACH]: { food: 1, stone: 0.5 },
  [T.ASH]: { coal: 2, iron: 1.5, magmaCore: 0.4 }
});

/** Minérios no chão das cavernas, por tema. */
export const CAVE_NODES = Object.freeze({
  earth: { iron: 2, coal: 2 }, swamp: { herbs: 2, coal: 1 }, ice: { crystal: 3, iron: 1 },
  tomb: { gold: 3, stone: 1 }, sea: { gold: 2, iron: 1 }, fire: { magmaCore: 1.5, coal: 2 }
});

/** Dias até um recurso coletado nascer de novo. */
export const NODE_REGROW_DAYS = 2;

/** Centro de cada região (nome no mapa e destino dos atalhos "ver no mapa"). */
export const REGION_CENTERS = Object.freeze({
  antiga: { x: 3950, y: 2850 }, brejo: { x: 1450, y: 2800 }, gelo: { x: 3950, y: 1150 },
  areia: { x: 6150, y: 1800 }, esmeralda: { x: 1800, y: 4420 }, brasa: { x: 5500, y: 4800 }
});

/** Regiões onde cada terreno aparece (para dizer onde achar cada recurso). */
export const TERRAIN_REGIONS = Object.freeze({
  [T.FOREST]: ['antiga'], [T.JUNGLE]: ['esmeralda'], [T.SWAMP]: ['brejo'], [T.SNOW]: ['gelo'],
  [T.SAND]: ['areia'], [T.DUNE]: ['areia'], [T.BEACH]: ['esmeralda', 'brasa'], [T.ASH]: ['brasa']
});
