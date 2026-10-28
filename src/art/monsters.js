import { PixelCanvas } from './pixel.js';
import { REGION_DRAWERS, REGION_LOGICAL, REGION_MONSTER_SIZES } from './monstersRegions.js';
import { BAKED_MONSTERS } from './monsterSprites.js';
import { drawBakedFrame, isBakedMonster } from './bakedMonsters.js';

// Monstros. Os do lote 1 da Fase 20G (base + profundos mais vistos + Senhor do Abismo) são
// pintados em alta resolução e reduzidos para pixel art (scripts/bake-monsters.mjs →
// src/art/monsterSprites.js), com 4 quadros de andar e 1 de ataque. Os demais ainda usam os
// desenhos por primitivas de monstersRegions.js / monstersDeep.js (lotes 2 e 3), com 2 quadros.

const BAKED_SIZES = Object.fromEntries(
  Object.entries(BAKED_MONSTERS).map(([kind, { size, elite }]) => [kind, { size, elite }])
);

/** Tamanho normal e de elite (px) de cada monstro. */
export const MONSTER_SIZES = Object.freeze({
  ...REGION_MONSTER_SIZES,
  ...BAKED_SIZES
});

export const MONSTER_PREVIEW = ['slime', 'wolf', 'boar', 'skeleton', 'spider', 'ghost', 'werewolf', 'golem']
  .map((kind) => ({ kind, ...MONSTER_SIZES[kind] }));

/** Canvas com coordenadas lógicas convertidas para o tamanho real. */
function grid(canvas, size, logical) {
  const k = size / logical;
  const p = (value) => value * k;
  const length = (value) => Math.max(1, Math.round(value * k));
  return {
    k,
    pixel: (x, y, color, alpha) => canvas.rect(Math.floor(p(x)), Math.floor(p(y)), length(1), length(1), color, alpha),
    rect: (x, y, width, height, color, alpha) => canvas.rect(Math.round(p(x)), Math.round(p(y)), length(width), length(height), color, alpha),
    line: (x0, y0, x1, y1, color) => {
      const steps = Math.max(1, Math.round(k));
      for (let ox = 0; ox < steps; ox += 1) {
        for (let oy = 0; oy < steps; oy += 1) canvas.line(p(x0) + ox, p(y0) + oy, p(x1) + ox, p(y1) + oy, color);
      }
    },
    ellipse: (cx, cy, rx, ry, color, alpha) => canvas.ellipse(p(cx), p(cy), p(rx), p(ry), color, alpha),
    shaded: (cx, cy, rx, ry, colors, options) => canvas.shadedEllipse(p(cx), p(cy), p(rx), p(ry), colors, options),
    each: (cx, cy, rx, ry, callback) => canvas.forEllipse(p(cx), p(cy), p(rx), p(ry), (x, y, nx, ny) => callback(x, y, nx, ny)),
    raw: canvas,
    polygon: (points, color, alpha) => canvas.polygon(points.map(([x, y]) => [p(x), p(y)]), color, alpha),
    shadow: (cx, cy, rx, ry, alpha) => canvas.shadow(p(cx), p(cy), p(rx), p(ry), alpha)
  };
}

const INK = '#120d12';

export function hasMonsterArt(kind) {
  return isBakedMonster(kind) || Boolean(REGION_DRAWERS[kind]);
}

/** Quantos quadros o monstro tem (pintados: 5 = 4 de andar + ataque; antigos: 2). */
export function monsterFrameCount(kind) {
  return BAKED_MONSTERS[kind]?.frames ?? 2;
}

/** Índice do quadro de ataque, ou null se o monstro não tem. */
export function monsterAttackFrame(kind) {
  return BAKED_MONSTERS[kind]?.attackFrame ?? null;
}

/** Desenha um quadro do monstro no tamanho pedido (pintados: 0..3 andar, 4 ataque; antigos: 0 ou 1). */
export function drawMonsterFrame(kind, size, frame, { elite = false } = {}) {
  if (isBakedMonster(kind)) return drawBakedFrame(kind, size, frame);
  const canvas = new PixelCanvas(size, size);
  const draw = REGION_DRAWERS[kind];
  if (!draw) return canvas;
  draw(grid(canvas, size, REGION_LOGICAL[kind]), frame % 2, elite);
  return canvas.outline({ strength: 0.9, ink: INK, rim: 'strong' }).quantize();
}
