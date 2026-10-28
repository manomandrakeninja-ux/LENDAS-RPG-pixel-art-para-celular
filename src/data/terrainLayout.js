import { hash } from '../art/pixel.js';
import { T, TILE, UNDER_TERRAINS, VALLEY } from './worldRegions.js';

// Decide o ladrilho de cada quadrado a partir da grade de terrenos.
// Usado pelo gerador de imagens (para saber quais bordas desenhar) e pelo jogo.

const UNDER_PRIORITY = [T.SEA, T.LAVA, T.MURK, T.ICE];
export const BASE_VARIANTS = 4;

/** Nome do ladrilho base de um terreno. */
export const baseName = (kind, variant) => `base-${kind}-${variant}`;
export const edgeName = (land, under, mask) => `edge-${land}-${under}-${mask}`;
export const underName = (kind, frame) => `under-${kind}-${frame}`;
export const wallName = (face, variant, rim = 0) => `${face ? 'wallface' : 'wall'}-${variant}-${rim}`;
export const fringeName = (kind, mask) => `fringe-${kind}-${mask}`;
export const decorName = (kind, n) => `decor-${kind}-${n}`;

/** Quem invade quem na borda entre terrenos: o de prioridade maior desenha a franja sobre o vizinho. */
export const FRINGE_PRIORITY = Object.freeze({
  [T.SNOW]: 9, [T.VALLEY]: 8, [T.JUNGLE]: 7, [T.FOREST]: 6, [T.SWAMP]: 5, [T.BEACH]: 4, [T.SAND]: 3, [T.DUNE]: 2, [T.ASH]: 1
});
export const DECOR_VARIANTS = 6;
const DECOR_DENSITY = 0.42;
const VALLEY_PATH_FRAMES = new Set([4, 5, 8, 9, 12, 13, 14, 15]);

function variantFor(col, row, seed) {
  const roll = hash(col, row, seed);
  // A variante 0 é a mais comum; as outras têm detalhes (flores, pedras...).
  if (roll < 0.34) return 0;
  if (roll < 0.62) return 1;
  if (roll < 0.84) return 2;
  return 3;
}

/** Quadro da folha 'grass' do Vale (mesma regra de antes, agora determinística). */
export function valleyFrame(col, row, camp) {
  const centerX = col * TILE + TILE / 2;
  const centerY = row * TILE + TILE / 2;
  const inPath = (y) => Math.abs(centerX - camp.x) < 42 && y > camp.y - 36 && y < camp.y + 420;
  // Trilha até o acampamento; a última fileira fecha com grama em volta (quadros 8/9).
  if (inPath(centerY)) {
    const side = centerX < camp.x ? 0 : 1;
    const alt = hash(col, row, 8) < 0.5;
    if (!inPath(centerY + TILE)) return (alt ? 14 : 8) + side;
    return (alt ? 12 : 4) + side;
  }
  if (Math.hypot(centerX - camp.x, centerY - camp.y) < 105) return Math.floor(hash(col, row, 5) * 4);
  const roll = hash(col, row, 6);
  if (roll < 0.36) return 0;
  if (roll < 0.48) return 1;
  if (roll < 0.58) return 2;
  if (roll < 0.68) return 3;
  return [6, 7, 10, 11][Math.floor(hash(col, row, 7) * 4)];
}

/**
 * Para cada quadrado: ladrilho do chão (nome ou número do Vale), terreno de baixo
 * (água/lava/lodo/gelo) e se bloqueia a passagem.
 */
export function layoutTiles(grid, camp) {
  const { cols, rows, terrain } = grid;
  const at = (col, row) => (col < 0 || row < 0 || col >= cols || row >= rows ? T.VOID : terrain[row * cols + col]);
  const ground = new Array(cols * rows).fill(null);
  const under = new Int8Array(cols * rows).fill(-1);
  const overlay = new Array(cols * rows).fill(null);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col;
      const kind = terrain[index];
      if (kind === T.VOID) continue;
      if (UNDER_TERRAINS.has(kind)) {
        under[index] = kind;
        continue;
      }
      if (kind === T.WALL) {
        const rim = (at(col, row - 1) === T.CAVE ? 1 : 0) + (at(col + 1, row) === T.CAVE ? 2 : 0) + (at(col - 1, row) === T.CAVE ? 8 : 0);
        ground[index] = wallName(at(col, row + 1) === T.CAVE, variantFor(col, row, 41) % 2, rim);
        continue;
      }
      if (kind === T.CAVE) {
        ground[index] = baseName(T.CAVE, variantFor(col, row, 42));
        continue;
      }
      // Terra encostada em água/lava/lodo/gelo vira ladrilho de borda.
      const neighbors = [at(col, row - 1), at(col + 1, row), at(col, row + 1), at(col - 1, row)];
      let edgeUnder = null;
      for (const candidate of UNDER_PRIORITY) {
        if (neighbors.includes(candidate)) { edgeUnder = candidate; break; }
      }
      if (edgeUnder !== null && kind !== T.VALLEY) {
        const mask = neighbors.reduce((sum, value, side) => sum + (value === edgeUnder ? 1 << side : 0), 0);
        ground[index] = edgeName(kind, edgeUnder, mask);
        under[index] = edgeUnder;
        continue;
      }
      if (kind === T.VALLEY) {
        ground[index] = valleyFrame(col, row, camp);
        continue;
      }
      ground[index] = baseName(kind, variantFor(col, row, 43 + kind));
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
        let best = null;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const other = at(col + dx, row + dy);
            const priority = FRINGE_PRIORITY[other];
            if (priority !== undefined && priority > own && (best === null || priority > FRINGE_PRIORITY[best])) best = other;
          }
        }
        if (best !== null) {
          const side = [at(col, row - 1), at(col + 1, row), at(col, row + 1), at(col - 1, row)].map((value) => value === best);
          let mask = side.reduce((sum, value, bit) => sum + (value ? 1 << bit : 0), 0);
          const corners = [[1, -1, 0, 1], [1, 1, 2, 1], [-1, 1, 2, 3], [-1, -1, 0, 3]];
          corners.forEach(([dx, dy, a, b], corner) => {
            if (at(col + dx, row + dy) === best && !side[a] && !side[b]) mask |= 16 << corner;
          });
          overlay[index] = fringeName(best, mask);
          continue;
        }
      }
      if (under[index] >= 0 || VALLEY_PATH_FRAMES.has(ground[index])) continue;
      if (hash(col, row, 61) < DECOR_DENSITY) overlay[index] = decorName(kind, Math.floor(hash(col, row, 62) * DECOR_VARIANTS));
    }
  }
  return { ground, under, overlay };
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
