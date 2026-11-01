import { hash } from '../art/pixel.js';

// Mundo grande de Eldoria: o Vale original (0..2880 x 0..2160) continua no canto
// noroeste, com as mesmas coordenadas, e o mundo cresce para leste e para o sul.
// Tudo aqui é determinístico (mesmo mapa em toda partida) e roda no Node (testes).

export const TILE = 48;
// Mapa grande (400x300 ladrilhos = 19200x14400 px, ~4 km x 3 km a 10 m/ladrilho).
export const WORLD_COLS = 400;
export const OVERWORLD_ROWS = 300;
export const OVERWORLD = Object.freeze({ width: WORLD_COLS * TILE, height: OVERWORLD_ROWS * TILE });
// Helpers pra posicionar POIs em frações do mundo: W(0.5) = meio da largura.
const W = (f) => Math.round(OVERWORLD.width * f);
const H = (f) => Math.round(OVERWORLD.height * f);
export const VALLEY = Object.freeze({ x: 0, y: 0, width: 2880, height: 2160 });

// Subterrâneo: salas das cavernas numa faixa abaixo do mar (fora do mapa visível).
export const ROOM_COLS = 30;
export const ROOM_ROWS = 20;
const ROOM_GAP = 4;
const UNDERGROUND_FIRST_ROW = OVERWORLD_ROWS + 4;
const ROOMS_PER_ROW = 4;
// Fileiras de 4 salas no subterrâneo: 18 fileiras = 72 salas (mapa grande tem 64 dungeons no total).
export const UNDERGROUND_ROWS = 18;
export const TOTAL_ROWS = UNDERGROUND_FIRST_ROW + UNDERGROUND_ROWS * (ROOM_ROWS + ROOM_GAP);
export const FULL_WORLD = Object.freeze({ width: WORLD_COLS * TILE, height: TOTAL_ROWS * TILE });

// ---------- Regiões ----------

export const REGION_INFO = Object.freeze({
  vale: { name: 'Vale de Eldoria', levels: '1-15', levelRange: [1, 15], color: '#4a7b48', banner: 'O lar do acampamento.' },
  antiga: { name: 'Floresta Antiga', levels: '12-30', levelRange: [12, 30], color: '#24452c', banner: 'Árvores mais velhas que os reis. Goblins e orcs vigiam as trilhas.' },
  brejo: { name: 'Brejo Sombrio', levels: '25-45', levelRange: [25, 45], color: '#3d4a33', banner: 'Água parada, névoa e coisas que se afogaram aqui.' },
  gelo: {
    name: 'Picos Gelados', levels: '50-75', levelRange: [50, 75], color: '#d8e6f0', banner: 'O vento corta como lâmina.',
    hazard: { flag: 'warmClothes', damage: 3, message: 'Frio intenso! Roupas quentes protegem você (missão 51).' }
  },
  areia: {
    name: 'Grande Deserto', levels: '70-95', levelRange: [70, 95], color: '#d8b56a', banner: 'Areia sem fim e tumbas de reis esquecidos.',
    hazard: { flag: 'desertSupplies', damage: 3, message: 'O sol do deserto drena suas forças! Suprimentos ajudam (missão 61).' }
  },
  esmeralda: { name: 'Ilha Esmeralda', levels: '35-55', levelRange: [35, 55], color: '#5aa04a', banner: 'Praias brancas, coqueiros e piratas que não descansam.' },
  brasa: {
    name: 'Ilha de Brasa', levels: '90-120', levelRange: [90, 120], color: '#5a2a22', banner: 'O vulcão respira. Demônios guardam o fogo antigo.',
    hazard: { flag: 'ashMasks', damage: 4, message: 'Cinzas queimam seus pulmões! Máscaras protegem você (missão 82).' }
  },
  mar: { name: 'Mar de Eldoria', levels: '-', color: '#2a5a8a', banner: '' },
  caverna: { name: 'Caverna', levels: '-', color: '#2a2630', banner: '' }
});

// Terrenos (tipo de chão de cada quadrado).
export const T = Object.freeze({
  VALLEY: 0, FOREST: 1, SWAMP: 2, SNOW: 3, SAND: 4, BEACH: 5, JUNGLE: 6, ASH: 7,
  SEA: 8, LAVA: 9, MURK: 10, ICE: 11, CAVE: 12, WALL: 13, VOID: 14, DUNE: 15, ROAD: 16
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

// Fronteiras irregulares entre as regiões do continente. As que crescem com o mapa
// usam frações de OVERWORLD (W/H), mantendo a mesma proporção do mapa antigo.
const eastOfValley = (y) => VALLEY.width + 60 + fractal(y / 240, 3.7, 11, 4) * 380;
const southOfValley = (x) => VALLEY.height + 60 + fractal(x / 240, 8.1, 12, 4) * 380;
const desertWest = (y) => W(0.70) + (fractal(y / 240, 1.3, 13, 4) - 0.5) * W(0.072);
const coastY = (x) => H(0.647) + (fractal(x / 220, 5.2, 14, 4) - 0.5) * H(0.071);

export const ISLANDS = Object.freeze({
  esmeralda: { cx: W(0.25), cy: H(0.841), rx: W(0.16), ry: H(0.112), seed: 21 },
  brasa: { cx: W(0.764), cy: H(0.844), rx: W(0.174), ry: H(0.115), seed: 22 }
});
// Cratera do vulcão (lago de lava) na Ilha de Brasa.
const CRATER = { cx: W(0.785), cy: H(0.822), rx: W(0.042), ry: H(0.035) };
// Oásis do deserto (água parada com coqueiros em volta).
export const OASES = Object.freeze([
  { x: W(0.847), y: H(0.167), r: W(0.024) },
  { x: W(0.792), y: H(0.484), r: W(0.019) }
]);

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

// ---------- Monstros por região ----------

export const REGION_SPAWNS = Object.freeze({
  antiga: { day: ['goblin', 'goblin', 'bear', 'orc'], night: ['treant', 'orc', 'werewolf', 'bat'] },
  brejo: { day: ['frog', 'frog', 'snake', 'slime'], night: ['zombie', 'witch', 'ghost', 'bat'] },
  gelo: { day: ['frostWolf', 'frostWolf', 'yeti', 'snowOwl', 'mammoth'], night: ['iceElemental', 'frostWolf', 'yeti', 'snowOwl'] },
  areia: { day: ['scorpion', 'scorpion', 'sandworm', 'snake', 'cobra', 'scarab', 'sandGolem'], night: ['mummy', 'scorpion', 'sandworm', 'djinn', 'scarab'] },
  esmeralda: { day: ['crab', 'crab', 'snake'], night: ['pirate', 'crab', 'bat'] },
  brasa: { day: ['imp', 'salamander', 'imp', 'lavaHound', 'magmaSlime', 'phoenix'], night: ['demon', 'imp', 'salamander', 'fireElemental', 'obsidianKnight', 'lavaHound'] }
});

// ---------- Cavernas ----------

// Cada caverna tem andares (salas no subterrâneo); o chefe espera no último.
export const CAVES = Object.freeze([
  {
    id: 'toca-orc', name: 'Toca dos Orcs', region: 'antiga', entrance: { x: W(0.599), y: H(0.539) }, floors: 2, theme: 'earth',
    monsters: ['goblin', 'orc', 'bat'], boss: 'orcChief'
  },
  {
    id: 'gruta-afogada', name: 'Gruta Afogada', region: 'brejo', entrance: { x: W(0.136), y: H(0.565) }, floors: 2, theme: 'swamp',
    monsters: ['frog', 'zombie', 'bat'], boss: 'hydra'
  },
  {
    id: 'caverna-cristal', name: 'Caverna de Cristal', region: 'gelo', entrance: { x: W(0.558), y: H(0.141) }, floors: 3, theme: 'ice',
    monsters: ['iceElemental', 'frostWolf', 'yeti'], boss: 'frostGiant'
  },
  {
    id: 'tumba-farao', name: 'Tumba do Faraó', region: 'areia', entrance: { x: W(0.879), y: H(0.29) }, floors: 3, theme: 'tomb',
    monsters: ['mummy', 'scorpion', 'snake'], boss: 'pharaoh'
  },
  {
    id: 'gruta-piratas', name: 'Gruta dos Piratas', region: 'esmeralda', entrance: { x: 4020, y: 11080 }, floors: 2, theme: 'sea', // perto do Ancoradouro dos Piratas (ilha esmeralda)
    monsters: ['crab', 'pirate', 'bat'], boss: 'ghostCaptain'
  },
  {
    id: 'coracao-vulcao', name: 'Coração do Vulcão', region: 'brasa', entrance: { x: W(0.719), y: H(0.863) }, floors: 3, theme: 'fire',
    monsters: ['imp', 'salamander', 'demon', 'fireElemental', 'obsidianKnight'], boss: 'dragon'
  },
  {
    id: 'abismo-brasa', name: 'Abismo de Brasa', region: 'brasa', entrance: { x: W(0.819), y: H(0.874) }, floors: 4, theme: 'fire',
    levelRange: [115, 150],
    monsters: ['ashWraith', 'gargoyle', 'boneWyrm', 'voidStalker', 'cinderGiant', 'hellWarden', 'lavaWorm', 'soulReaper', 'abyssHound'], boss: 'abyssLord'
  },
  // --- Cavernas novas do mapa grande (áreas distantes) ---
  // Coordenadas escolhidas para cair na região certa segundo regionAt():
  // gelo = leste do Vale (x>W(0.16)), y<H(0.18), x<W(0.63) (antes do deserto);
  // antiga = x entre W(0.16)..W(0.63), y entre H(0.18)..H(0.57); brejo = x<W(0.16), y>H(0.18)..H(0.57).
  {
    id: 'caverna-vento', name: 'Caverna do Vento Eterno', region: 'gelo', entrance: { x: W(0.6), y: H(0.09) }, floors: 3, theme: 'ice',
    levelRange: [60, 85],
    monsters: ['snowOwl', 'yeti', 'iceElemental', 'frostWolf'], boss: 'frostGiant'
  },
  {
    id: 'gruta-penhasco', name: 'Gruta do Penhasco', region: 'antiga', entrance: { x: W(0.55), y: H(0.5) }, floors: 3, theme: 'earth',
    levelRange: [30, 50],
    monsters: ['orc', 'bear', 'werewolf', 'treant'], boss: 'orcChief'
  },
  {
    id: 'caverna-abismo-sul', name: 'Caverna do Abismo Sul', region: 'brejo', entrance: { x: W(0.1), y: H(0.55) }, floors: 3, theme: 'swamp',
    levelRange: [40, 60],
    monsters: ['witch', 'zombie', 'frog', 'ghost'], boss: 'hydra'
  },
  {
    id: 'santuario-ouro', name: 'Santuário de Ouro', region: 'areia', entrance: { x: W(0.94), y: H(0.45) }, floors: 4, theme: 'tomb',
    levelRange: [80, 100],
    monsters: ['mummy', 'djinn', 'sandGolem', 'sandworm'], boss: 'pharaoh'
  }
]);

/** Faixa de níveis de uma caverna (a da própria caverna ou a da região onde fica). */
export function caveLevelRange(cave) {
  return cave?.levelRange ?? REGION_INFO[cave?.region]?.levelRange ?? null;
}

// ---------- Torres ----------

// Uma torre por região (fora do Vale), no modelo das cavernas: entrada no mapa e andares
// (salas) com monstros da região, cada andar mais forte que o anterior. O baú fica no topo.
const TOWER_SPOTS = {
  antiga: { name: 'Torre do Carvalho', x: W(0.63), y: H(0.585), floors: 3, theme: 'earth' },
  brejo: { name: 'Torre Afogada', x: W(0.13), y: H(0.549), floors: 3, theme: 'swamp' },
  gelo: { name: 'Torre de Gelo', x: W(0.503), y: H(0.15), floors: 3, theme: 'ice' },
  areia: { name: 'Torre dos Ventos', x: W(0.823), y: H(0.415), floors: 4, theme: 'tomb' },
  esmeralda: { name: 'Torre do Farol', x: W(0.31), y: H(0.844), floors: 3, theme: 'sea' },
  brasa: { name: 'Torre de Cinzas', x: W(0.74), y: H(0.8), floors: 4, theme: 'fire' },
  // Torres novas do mapa grande (mesmas faixas de coordenadas das cavernas acima).
  geloLeste: { name: 'Torre do Horizonte', region: 'gelo', x: W(0.58), y: H(0.12), floors: 4, theme: 'ice' },
  brejoSul: { name: 'Torre do Pântano', region: 'brejo', x: W(0.08), y: H(0.52), floors: 4, theme: 'swamp' },
  antigaSul: { name: 'Torre das Sombras', region: 'antiga', x: W(0.62), y: H(0.6), floors: 4, theme: 'earth' }
};

export const TOWERS = Object.freeze(Object.entries(TOWER_SPOTS).map(([key, spot]) => {
  const region = spot.region ?? key;
  return Object.freeze({
    id: `torre-${key}`,
    name: spot.name,
    region,
    tower: true,
    entrance: Object.freeze({ x: spot.x, y: spot.y }),
    floors: spot.floors,
    theme: spot.theme,
    monsters: Object.freeze([...new Set([...REGION_SPAWNS[region].day, ...REGION_SPAWNS[region].night])]),
    boss: null
  });
}));
export const TOWERS_BY_REGION = Object.freeze(Object.fromEntries(TOWERS.map((tower) => [tower.region, tower])));

/** Cavernas e torres: tudo que tem entrada no mapa e andares no subterrâneo. */
export const DUNGEONS = Object.freeze([...CAVES, ...TOWERS]);
export const CAVES_BY_ID = Object.freeze(Object.fromEntries(DUNGEONS.map((cave) => [cave.id, cave])));

/** Faixa de níveis de um andar da torre: sobe a cada andar até o teto da região. */
export function towerFloorRange(tower, floor) {
  const [lo, hi] = REGION_INFO[tower.region].levelRange;
  const span = hi - lo;
  const index = Math.max(0, Math.min(tower.floors - 1, floor));
  return [lo + Math.round((span * index) / tower.floors), lo + Math.round((span * (index + 1)) / tower.floors)];
}

/** Faixa de níveis de uma sala (andar da torre) ou da caverna inteira. */
export function dungeonLevelRange(dungeon, floor = 0) {
  return dungeon?.tower ? towerFloorRange(dungeon, floor) : caveLevelRange(dungeon);
}

/** Lista de salas (caverna, andar) na ordem do subterrâneo. */
export const CAVE_ROOMS = Object.freeze(DUNGEONS.flatMap((cave) =>
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

// Custo em moedas para viajar pelo mapa (M) até um local já descoberto; o acampamento é grátis.
export const FAST_TRAVEL_COST = 10;

// ---------- Portos (viagem de barco) ----------

export const DOCKS = Object.freeze([
  { id: 'porto-brejo', name: 'Porto do Brejo', region: 'brejo', x: W(0.12), price: 0 },
  { id: 'porto-areia', name: 'Porto das Dunas', region: 'areia', x: W(0.872), price: 0 },
  { id: 'porto-esmeralda', name: 'Porto Esmeralda', region: 'esmeralda', x: W(0.264), island: 'esmeralda', price: 0 },
  { id: 'ancoradouro-piratas', name: 'Ancoradouro dos Piratas', region: 'esmeralda', x: W(0.206), island: 'esmeralda', price: 0 }, // perto da Gruta dos Piratas
  { id: 'porto-brasa', name: 'Porto de Brasa', region: 'brasa', x: W(0.731), island: 'brasa', price: 0 },
  // Portos novos do mapa grande (na costa: x<W(0.16) = brejo, W(0.16)..W(0.63) = antiga).
  { id: 'porto-austral', name: 'Porto Austral', region: 'brejo', x: W(0.12), price: 0 },
  { id: 'porto-leste', name: 'Porto do Leste', region: 'antiga', x: W(0.55), price: 0 }
]);
// Preço da passagem (moedas) entre portos.
export const BOAT_FARE = 15;

// ---------- Estradas (terra batida: +30% de velocidade quem anda por elas) ----------
// Pontos em frações do mapa (W/H); o acampamento fica em W(0.075), H(0.075) = 1440,1080.
const CAMP_PT = [W(0.075), H(0.075)];
export const ROADS = Object.freeze([
  { name: 'Estrada do Brejo', points: [CAMP_PT, [W(0.055), H(0.30)], [W(0.10), H(0.47)], [W(0.12), H(0.545)]] },
  { name: 'Estrada da Floresta', points: [CAMP_PT, [W(0.25), H(0.12)], [W(0.45), H(0.33)], [W(0.58), H(0.50)], [W(0.599), H(0.539)]] }, // até a Toca dos Orcs
  { name: 'Estrada do Gelo', points: [CAMP_PT, [W(0.30), H(0.06)], [W(0.503), H(0.15)], [W(0.558), H(0.141)], [W(0.60), H(0.09)]] }, // torres e cavernas de gelo
  { name: 'Estrada do Penhasco', points: [[W(0.45), H(0.33)], [W(0.55), H(0.50)], [W(0.63), H(0.585)], [W(0.55), H(0.545)]] }, // penhasco → Torre do Carvalho → Porto do Leste
  { name: 'Estrada do Deserto', points: [CAMP_PT, [W(0.42), H(0.40)], [W(0.68), H(0.36)], [W(0.823), H(0.415)], [W(0.879), H(0.29)], [W(0.94), H(0.45)]] }, // até o Santuário de Ouro
  { name: 'Estrada do Abismo', points: [[W(0.10), H(0.47)], [W(0.10), H(0.55)], [W(0.136), H(0.565)]] } // Porto Austral → Gruta Afogada
]);
const ROAD_HALF_WIDTH = TILE * 0.8;
const ROAD_SEGMENTS = ROADS.flatMap((road) => {
  const segments = [];
  for (let i = 0; i < road.points.length - 1; i += 1) {
    const [ax, ay] = road.points[i];
    const [bx, by] = road.points[i + 1];
    segments.push({ ax, ay, bx, by });
  }
  return segments;
});

function segmentDistance(px, py, seg) {
  const dx = seg.bx - seg.ax;
  const dy = seg.by - seg.ay;
  const lengthSq = dx * dx + dy * dy;
  let t = lengthSq === 0 ? 0 : ((px - seg.ax) * dx + (py - seg.ay) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (seg.ax + t * dx), py - (seg.ay + t * dy));
}

/** O ponto (x, y) do mundo está em cima de uma estrada? */
export function roadAt(x, y) {
  for (const seg of ROAD_SEGMENTS) {
    if (segmentDistance(x, y, seg) < ROAD_HALF_WIDTH) return true;
  }
  return false;
}

/**
 * Posição de cada porto: começa na terra e anda para o sul (continente) ou
 * para o norte (ilhas) até achar o mar. Devolve o ponto do píer na areia e o barco na água.
 */
export function dockPosition(dock) {
  const direction = dock.island ? -1 : 1;
  let y = dock.island ? ISLANDS[dock.island].cy : H(0.558);
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

// ---------- Placas de sinalização ao longo das estradas ----------
// Uma placa a cada ~260 px de estrada, apontando para o POI mais próximo do fim da rota.
function roadSigns() {
  const pois = [
    ...CAVES.map((cave) => ({ x: cave.entrance.x, y: cave.entrance.y, name: cave.name })),
    ...Object.values(TOWERS).map((tower) => ({ x: tower.x, y: tower.y, name: tower.name })),
    ...DOCKS.map((dock) => ({ x: dock.x, y: dockPosition(dock).y, name: dock.name })),
    ...VILLAGES.map((village) => ({ x: village.x, y: village.y, name: village.name }))
  ];
  const signs = [];
  for (const road of ROADS) {
    const end = road.points[road.points.length - 1];
    let poi = null;
    let bestDistance = Infinity;
    for (const candidate of pois) {
      const distance = Math.hypot(candidate.x - end[0], candidate.y - end[1]);
      if (distance < bestDistance) { bestDistance = distance; poi = candidate; }
    }
    if (!poi || bestDistance > 1000) poi = { x: end[0], y: end[1], name: road.name };
    for (let i = 0; i < road.points.length - 1; i += 1) {
      const [ax, ay] = road.points[i];
      const [bx, by] = road.points[i + 1];
      const length = Math.hypot(bx - ax, by - ay);
      if (length < 1) continue;
      const nx = -(by - ay) / length;
      const ny = (bx - ax) / length;
      const steps = Math.max(1, Math.floor(length / 260));
      for (let s = 1; s <= steps; s += 1) {
        const t = s / steps;
        const side = s % 2 === 0 ? 1 : -1;
        // Tenta o lado Calculado; se cair em terreno bloqueante, tenta o lado oposto e depois o centro da estrada.
        let placed = null;
        for (const [ox, oy] of [[nx * 34 * side, ny * 34 * side], [nx * 34 * -side, ny * 34 * -side], [0, 0]]) {
          const x = Math.round(ax + (bx - ax) * t + ox);
          const y = Math.round(ay + (by - ay) * t + oy);
          if (!BLOCKING.has(terrainAt(x, y))) { placed = { x, y }; break; }
        }
        if (!placed) continue;
        const x = placed.x;
        const y = placed.y;
        // A placa aponta o POI (caverna/torre/porto/vilarejo) mais próximo DELA; se nenhum perto, o POI do fim da estrada.
        let near = null;
        let nearBest = Infinity;
        for (const candidate of pois) {
          const distance = Math.hypot(candidate.x - x, candidate.y - y);
          if (distance < nearBest) { nearBest = distance; near = candidate; }
        }
        const target = near && nearBest <= 1400 ? near : poi;
        signs.push({ x, y, label: target.name, poi: target });
      }
    }
  }
  return signs;
}

/** Placas de estrada do mundo inteiro (px): { x, y, label, poi }.
 *  Definido DEPOIS de VILLAGES para poder apontar vilarejos também. */

/** Direção cardeal (8 ventos) de um vetor (dx, dy) em coordenadas de tela (y para baixo = sul). */
export function compass8(dx, dy) {
  const names = ['L', 'SE', 'S', 'SO', 'O', 'NO', 'N', 'NE'];
  const angle = Math.atan2(dy, dx); // 0 = leste, π/2 = sul (y cresce para baixo)
  return names[((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8];
}

/** Ponto na polyline da estrada no parâmetro t (0..1, proporcional ao comprimento). */
export function pointOnRoad(road, t) {
  const clamped = Math.max(0, Math.min(1, t));
  const points = road.points;
  let total = 0;
  const lengths = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const length = Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
    lengths.push(length);
    total += length;
  }
  let target = clamped * total;
  for (let i = 0; i < lengths.length; i += 1) {
    if (target <= lengths[i] || i === lengths.length - 1) {
      const local = lengths[i] > 0 ? target / lengths[i] : 0;
      const [ax, ay] = points[i];
      const [bx, by] = points[i + 1];
      return { x: ax + (bx - ax) * local, y: ay + (by - ay) * local };
    }
    target -= lengths[i];
  }
  return { x: points[points.length - 1][0], y: points[points.length - 1][1] };
}

// ---------- Vilarejos nomeados (mapa grande) ----------
// Cada vilarejo tem 3 casas (offsets do centro) e um morador que conversa (tecla E).
// Posições em frações W/H perto das estradas; validadas em tests/world.test.js.
export const VILLAGES = Object.freeze([
  {
    id: 'vila-penhasco', name: 'Vila do Penhasco', region: 'antiga', x: W(0.50), y: H(0.42),
    houses: [[-110, -30], [0, -80], [110, -20]],
    lines: ['Bem-vindo à Vila do Penhasco! A Gruta do Penhasco fica logo ao norte.', 'Cuidado com os ursos da floresta antiga.', 'Se precisar de suprimentos, volte ao acampamento pela estrada.']
  },
  {
    id: 'aldeia-gelo', name: 'Aldeia do Gelo Branco', region: 'gelo', x: W(0.38), y: H(0.10),
    houses: [[-100, 20], [10, -50], [100, 30]],
    lines: ['Frio de rachar aqui em cima... A Caverna de Cristal guarda o gigante de gelo.', 'A estrada leva direto às torres do horizonte.', 'Compre peles antes de descer para o vale!']
  },
  {
    id: 'vila-dunas', name: 'Vila das Dunas', region: 'areia', x: W(0.76), y: H(0.40),
    houses: [[-100, 0], [0, -70], [100, 10]],
    lines: ['Areia nos ouvidos, ouro nos bolsos. Bem-vindo à Vila das Dunas!', 'A Tumba do Faraó fica a leste, pela estrada do deserto.', 'Não ande à noite: as múmias saem das tumbas.']
  },
  {
    id: 'vila-brejo', name: 'Vila do Brejo Fundo', region: 'brejo', x: W(0.08), y: H(0.35),
    houses: [[-90, -20], [20, -60], [100, 10]],
    lines: ['Cuidado onde pisa, forasteiro. A Gruta Afogada é logo ali embaixo.', 'O Porto do Brejo leva às ilhas de barco.', 'As bruxas do brejo gostam de visitantes... à noite.']
  }
]);

/** Placas de estrada do mundo inteiro (px): { x, y, label, poi }. (Após VILLAGES para poder apontá-los.) */
export const ROAD_SIGNS = Object.freeze(roadSigns());

// ---------- Baús de tesouro escondidos no overworld ----------
// Pontos determinísticos longe do acampamento e dos POIs; cada baú dá moedas (nível da
// região) e, às vezes, 1 peça de equipamento. Abre com E e fica aberto no save.
function treasureSpots() {
  const spots = [];
  const blockers = [
    ...CAVES.map((cave) => ({ x: cave.entrance.x, y: cave.entrance.y })),
    ...Object.values(TOWERS).map((tower) => tower.entrance ?? { x: tower.x, y: tower.y }),
    ...DOCKS.map((dock) => ({ x: dock.x, y: dockPosition(dock).y })),
    ...VILLAGES.flatMap((village) => [{ x: village.x, y: village.y }, ...village.houses.map(([dx, dy]) => ({ x: village.x + dx, y: village.y + dy }))]),
    { x: W(0.075), y: H(0.075) } // acampamento
  ];
  for (let row = 6; row < OVERWORLD_ROWS - 6; row += 13) {
    for (let col = 6; col < WORLD_COLS - 6; col += 13) {
      const x = col * TILE + TILE / 2;
      const y = row * TILE + TILE / 2;
      const terrain = terrainAt(x, y);
      if (BLOCKING.has(terrain) || terrain === T.MURK || terrain === T.ICE) continue;
      if (Math.hypot(x - W(0.075), y - H(0.075)) < 1400) continue;
      if (blockers.some((blocker) => Math.hypot(blocker.x - x, blocker.y - y) < 420)) continue;
      if (hash(col, row, 551) < 0.16) spots.push({ id: `w${col}_${row}`, x, y, region: regionAt(x, y) });
    }
  }
  return spots;
}

/** Baús de tesouro do overworld: { id, x, y, region }. */
export const TREASURE_SPOTS = Object.freeze(treasureSpots());

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

// A grade é determinística e só de leitura depois de montada → cache em módulo
// (evita remontar 400×736 células + cavernas a cada construção de mundo/teste).
let cachedTerrainGrid = null;

/** Monta (ou devolve do cache) a grade de terrenos do mundo inteiro. */
export function buildTerrainGrid() {
  if (cachedTerrainGrid) return cachedTerrainGrid;
  cachedTerrainGrid = buildTerrainGridUncached();
  return cachedTerrainGrid;
}

/** Versão sem cache (testes que precisam de uma grade nova). */
export function buildTerrainGridUncached() {
  const cols = WORLD_COLS;
  const rows = TOTAL_ROWS;
  const terrain = new Uint8Array(cols * rows).fill(T.VOID);
  for (let row = 0; row < OVERWORLD_ROWS; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      terrain[row * cols + col] = terrainAt(col * TILE + TILE / 2, row * TILE + TILE / 2);
    }
  }
  cleanGrid({ cols, rows: OVERWORLD_ROWS, terrain });
  // Estradas: terra batida por cima de qualquer chão firme (nunca sobre água, lava, lodo ou gelo).
  for (let row = 0; row < OVERWORLD_ROWS; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col;
      const kind = terrain[index];
      if (BLOCKING.has(kind) || kind === T.MURK || kind === T.ICE) continue;
      if (roadAt(col * TILE + TILE / 2, row * TILE + TILE / 2)) terrain[index] = T.ROAD;
    }
  }
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
  antiga: { x: W(0.549), y: H(0.53) }, brejo: { x: W(0.201), y: H(0.521) }, gelo: { x: W(0.549), y: H(0.214) },
  areia: { x: W(0.854), y: H(0.335) }, esmeralda: { x: W(0.25), y: H(0.822) }, brasa: { x: W(0.764), y: H(0.893) }
});

/** Regiões onde cada terreno aparece (para dizer onde achar cada recurso). */
export const TERRAIN_REGIONS = Object.freeze({
  [T.FOREST]: ['antiga'], [T.JUNGLE]: ['esmeralda'], [T.SWAMP]: ['brejo'], [T.SNOW]: ['gelo'],
  [T.SAND]: ['areia'], [T.DUNE]: ['areia'], [T.BEACH]: ['esmeralda', 'brasa'], [T.ASH]: ['brasa']
});
