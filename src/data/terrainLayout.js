import { hash } from '../art/pixel.js';
import { T, TILE, UNDER_TERRAINS, VALLEY } from './worldRegions.js';

// Decide o ladrilho de cada quadrado a partir da grade de terrenos.
// Usado pelo gerador de imagens (para saber quais bordas desenhar) e pelo jogo.

const UNDER_PRIORITY = [T.SEA, T.LAVA, T.MURK, T.ICE];

// Ladrilhos de base em "Wang de cantos" (G-terreno): cada canto da grade tem uma classe (0 ou 1)
// tirada de um ruído do mundo; o ladrilho mistura as duas classes interpolando os cantos, então as
// manchas claras/escuras passam de um ladrilho para o outro sem emenda e sem repetir a cada 48 px.
// Variante = cantos (TL 1, TR 2, BL 4, BR 8) + 16 x miolo (3 miolos diferentes com a mesma borda).
export const WANG_INTERIORS = 3;
export const BASE_VARIANTS = 16 * WANG_INTERIORS;
/** Mar, lava, lodo e gelo em blocos de 3x3 ladrilhos (repetem só a cada 144 px). */
export const UNDER_SUBTILES = 3;

/** Nome do ladrilho base de um terreno. */
export const baseName = (kind, variant) => `base-${kind}-${variant}`;
export const edgeName = (land, under, mask, core = 0) => `edge-${land}-${under}-${mask}-${core}`;
export const underName = (kind, frame, sub = 0) => `under-${kind}-${frame}-${sub}`;
export const wallName = (face, variant, rim = 0) => `${face ? 'wallface' : 'wall'}-${variant}-${rim}`;
export const fringeName = (kind, mask) => `fringe-${kind}-${mask}`;
export const decorName = (kind, n) => `decor-${kind}-${n}`;

/** Quem invade quem na borda entre terrenos: o de prioridade maior desenha a franja sobre o vizinho. */
export const FRINGE_PRIORITY = Object.freeze({
  [T.SNOW]: 9, [T.VALLEY]: 8, [T.JUNGLE]: 7, [T.FOREST]: 6, [T.SWAMP]: 5, [T.BEACH]: 4, [T.SAND]: 3, [T.DUNE]: 2, [T.ASH]: 1
});
export const DECOR_VARIANTS = 6;
const DECOR_DENSITY = 0.42;

// Folha 'grass' do Vale: 0..47 grama (Wang), 48..55 trilha reta (lado x 4 variantes), 56..59 fim da trilha.
export const VALLEY_FRAMES = 64;
export const VALLEY_PATH_START = 48;
export const VALLEY_PATH_END_START = 56;
export const VALLEY_PATH_FRAMES = Object.freeze(Array.from({ length: 12 }, (_, i) => VALLEY_PATH_START + i));
const PATH_SET = new Set(VALLEY_PATH_FRAMES);

/** Ruído suave do mundo (valor interpolado), em células de `scale` cantos. */
function worldNoise(i, j, scale, seed) {
  const gx = i / scale; const gy = j / scale;
  const x0 = Math.floor(gx); const y0 = Math.floor(gy);
  const fx = gx - x0; const fy = gy - y0;
  const sx = fx * fx * (3 - 2 * fx); const sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, seed); const b = hash(x0 + 1, y0, seed);
  const c = hash(x0, y0 + 1, seed); const d = hash(x0 + 1, y0 + 1, seed);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}

/** Classe do canto (i, j) da grade: manchas de ~3-6 ladrilhos. */
function cornerNoise(i, j) {
  return worldNoise(i, j, 4.5, 811) * 0.7 + worldNoise(i, j, 1.7, 812) * 0.3 > 0.5 ? 1 : 0;
}

/** Trilha até o acampamento: null = fora, senão { side, end }. */
function pathCell(col, row, camp) {
  const centerX = col * TILE + TILE / 2;
  const centerY = row * TILE + TILE / 2;
  const inPath = (y) => Math.abs(centerX - camp.x) < 42 && y > camp.y - 36 && y < camp.y + 420;
  if (!inPath(centerY)) return null;
  return { side: centerX < camp.x ? 0 : 1, end: !inPath(centerY + TILE) };
}

/** Quadro da trilha do Vale (ou null fora dela). */
export function valleyPathFrame(col, row, camp) {
  const path = pathCell(col, row, camp);
  if (!path) return null;
  if (path.end) return VALLEY_PATH_END_START + path.side * 2 + (hash(col, row, 8) < 0.5 ? 0 : 1);
  return VALLEY_PATH_START + path.side * 4 + Math.floor(hash(col, row, 8) * 4);
}

/** Quadro do Vale sem olhar os cantos (grama de classe 0); a trilha mantém o quadro próprio. */
export function valleyFrame(col, row, camp) {
  return valleyPathFrame(col, row, camp) ?? Math.floor(hash(col, row, 44) * WANG_INTERIORS) * 16;
}

const isLand = (kind) => !UNDER_TERRAINS.has(kind) && kind !== T.WALL && kind !== T.VOID && kind !== T.CAVE;
/** Vizinhos na ordem dos bits da máscara: N 1, L 2, S 4, O 8, NE 16, SE 32, SO 64, NO 128. */
const N8 = [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]];

function variantFor(col, row, seed) {
  const roll = hash(col, row, seed);
  if (roll < 0.34) return 0;
  if (roll < 0.62) return 1;
  if (roll < 0.84) return 2;
  return 3;
}

/**
 * Para cada quadrado: ladrilho do chão (nome ou número do Vale), terreno de baixo
 * (água/lava/lodo/gelo) e a camada de cima (franjas e decoração).
 */
export function layoutTiles(grid, camp) {
  const { cols, rows, terrain } = grid;
  const at = (col, row) => (col < 0 || row < 0 || col >= cols || row >= rows ? T.VOID : terrain[row * cols + col]);
  const ground = new Array(cols * rows).fill(null);
  const under = new Int8Array(cols * rows).fill(-1);
  const overlay = new Array(cols * rows).fill(null);
  const overlay2 = new Array(cols * rows).fill(null);
  // Quadrados "lisos" (base Wang); bordas, trilha e paredes forçam a classe 0 nos cantos em volta.
  const plain = new Uint8Array(cols * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col;
      const kind = terrain[index];
      if (kind === T.VOID) continue;
      if (kind === T.WALL) {
        const rim = (at(col, row - 1) === T.CAVE ? 1 : 0) + (at(col + 1, row) === T.CAVE ? 2 : 0) + (at(col - 1, row) === T.CAVE ? 8 : 0);
        ground[index] = wallName(at(col, row + 1) === T.CAVE, variantFor(col, row, 41) % 2, rim);
        continue;
      }
      const around = N8.map(([dx, dy]) => at(col + dx, row + dy));
      if (UNDER_TERRAINS.has(kind)) {
        under[index] = kind;
        // Água com terra em volta: a terra avança por cima (contorno suave pelos cantos, sem degraus).
        const lands = around.filter((value) => isLand(value) && value !== T.VALLEY);
        if (lands.length === 0) continue;
        const counts = new Map();
        for (const value of lands) counts.set(value, (counts.get(value) ?? 0) + 1);
        const land = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
        const mask = around.reduce((sum, value, bit) => sum + (isLand(value) ? 0 : 1 << bit), 256);
        ground[index] = edgeName(land, kind, mask, Math.floor(hash(col, row, 45) * WANG_INTERIORS));
        continue;
      }
      if (kind !== T.CAVE && kind !== T.VALLEY) {
        // Terra encostada (também na diagonal) em água/lava/lodo/gelo vira ladrilho de borda.
        const edgeUnder = UNDER_PRIORITY.find((candidate) => around.includes(candidate));
        if (edgeUnder !== undefined) {
          const mask = around.reduce((sum, value, bit) => sum + (isLand(value) || value === T.CAVE ? 0 : 1 << bit), 0);
          ground[index] = edgeName(kind, edgeUnder, mask, Math.floor(hash(col, row, 45) * WANG_INTERIORS));
          under[index] = edgeUnder;
          continue;
        }
      }
      if (kind === T.VALLEY) {
        const path = valleyPathFrame(col, row, camp);
        if (path !== null) { ground[index] = path; continue; }
      }
      plain[index] = 1;
    }
  }
  // Classe de cada canto: 1 só onde os 4 quadrados em volta são lisos e do mesmo terreno.
  const corner = (i, j) => {
    if (i <= 0 || j <= 0 || i >= cols || j >= rows) return 0;
    const a = (j - 1) * cols + i - 1;
    const cells = [a, a + 1, a + cols, a + cols + 1];
    if (!cells.every((cell) => plain[cell] && terrain[cell] === terrain[a])) return 0;
    return cornerNoise(i, j);
  };
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col;
      if (!plain[index]) continue;
      const wang = corner(col, row) + corner(col + 1, row) * 2 + corner(col, row + 1) * 4 + corner(col + 1, row + 1) * 8;
      const variant = wang + 16 * Math.floor(hash(col, row, 44) * WANG_INTERIORS);
      ground[index] = terrain[index] === T.VALLEY ? variant : baseName(terrain[index], variant);
    }
  }
  // Camada de cima: franja do vizinho de prioridade maior; sem franja, decoração solta (tufos, flores, seixos).
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col;
      const kind = terrain[index];
      const own = kind === T.CAVE ? 0 : FRINGE_PRIORITY[kind];
      if (own === undefined) continue;
      if (kind !== T.CAVE) {
        // Até 2 invasores (os de prioridade maior): o segundo fica numa camada por baixo do primeiro,
        // senão a borda com ele saía reta onde dois terrenos encostam no mesmo quadrado.
        const invaders = [...new Set(N8.map(([dx, dy]) => at(col + dx, row + dy)))]
          .filter((other) => FRINGE_PRIORITY[other] !== undefined && FRINGE_PRIORITY[other] > own)
          .sort((a, b) => FRINGE_PRIORITY[b] - FRINGE_PRIORITY[a]);
        if (invaders.length) {
          // Os 8 vizinhos entram na máscara: a borda segue o contorno suavizado pelos cantos.
          const maskOf = (kindAround) => N8.reduce((sum, [dx, dy], bit) => sum + (at(col + dx, row + dy) === kindAround ? 1 << bit : 0), 0);
          overlay[index] = fringeName(invaders[0], maskOf(invaders[0]));
          if (invaders[1] !== undefined) overlay2[index] = fringeName(invaders[1], maskOf(invaders[1]));
          continue;
        }
      }
      if (under[index] >= 0 || PATH_SET.has(ground[index])) continue;
      if (hash(col, row, 61) < DECOR_DENSITY) overlay[index] = decorName(kind, Math.floor(hash(col, row, 62) * DECOR_VARIANTS));
    }
  }
  return { ground, under, overlay, overlay2 };
}

/** Pares terreno/vizinho onde vale pôr manchas de transição (fronteira de regiões). */
export function transitionCells(grid) {
  const { cols, rows, terrain } = grid;
  const result = [];
  const land = (kind) => !UNDER_TERRAINS.has(kind) && kind !== T.WALL && kind !== T.CAVE && kind !== T.VOID;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const kind = terrain[row * cols + col];
      if (!land(kind)) continue;
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const c = col + dx;
        const r = row + dy;
        if (c >= cols || r >= rows) continue;
        const other = terrain[r * cols + c];
        if (!land(other) || other === kind) continue;
        result.push({ col, row, dx, dy, kind, other });
      }
    }
  }
  return result;
}

export const isValleyCell = (col, row) => col * TILE < VALLEY.width && row * TILE < VALLEY.height;
