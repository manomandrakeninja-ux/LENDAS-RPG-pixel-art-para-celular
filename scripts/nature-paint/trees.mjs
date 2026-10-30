// Árvores do Vale (atlas 'nature'): pinheiros com 3 quadros de balanço, carvalho, outono e frutífera.
// Origem no jogo (0.5, 0.88): a base do tronco fica em ~0.93 da altura.
import { RAMPS, rng, ellipse, crown, trunk, limb, pineTier } from './kit.mjs';

const PINE_TIERS = [
  { top: 44, bottom: 68, hw: 23, sway: 0.25 },
  { top: 30, bottom: 53, hw: 18, sway: 0.55 },
  { top: 17, bottom: 39, hw: 13.5, sway: 1 },
  { top: 4, bottom: 26, hw: 9, sway: 2.2 }
];

export function paintPine(ctx, shift, { ramp = RAMPS.pine, seed = 100, snow = false, squat = 0 } = {}) {
  trunk(ctx, { cx: 32, top: 60, base: 82, wTop: 5, wBase: 9, seed: seed + 1, roots: 3, rootSpread: 6 });
  // squat: andares de cima descem (pinheiro mais baixo e largo; a ponta desce `squat` px).
  PINE_TIERS.forEach((t, i) => pineTier(ctx, { cx: 32, top: t.top + squat * (i / 3), bottom: t.bottom + squat * (i / 3) * 0.7, hw: t.hw * (1 - squat * 0.006), ramp, seed: seed + 10 + i, snow, dx: shift * 1.8 * t.sway }));
}

// Rodada 3: 3ª variante, mais alta e estreita (5 andares), com os andares deslocados para lados
// alternados e pontas caídas de um lado só: as metades da copa ficam bem diferentes.
const PINE_TALL = [
  { top: 54, bottom: 76, hw: 17, sway: 0.25, off: -2.2 },
  { top: 41, bottom: 62, hw: 14, sway: 0.45, off: 1.8 },
  { top: 28, bottom: 48, hw: 11.5, sway: 0.7, off: -1.4 },
  { top: 15, bottom: 34, hw: 9, sway: 1, off: 1.6 },
  { top: 3, bottom: 21, hw: 6, sway: 2, off: 0.4 }
];
export function paintPineTall(ctx, shift, { ramp = RAMPS.pine, seed = 220 } = {}) {
  trunk(ctx, { cx: 30, top: 70, base: 94, wTop: 4.5, wBase: 8, seed: seed + 1, roots: 3, rootSpread: 5 });
  PINE_TALL.forEach((t, i) => pineTier(ctx, { cx: 30 + t.off, top: t.top, bottom: t.bottom, hw: t.hw, ramp, seed: seed + 10 + i, dx: shift * 1.8 * t.sway }));
}

const CROWN = [[36, 38, 25, 20], [19, 42, 13, 11], [53, 42, 13, 11], [26, 22, 16, 14], [46, 22, 16, 14], [36, 14, 13, 10]];

export function paintRound(ctx, { ramp, seed, bias = 0, fruit = null }) {
  trunk(ctx, { cx: 36, top: 46, base: 82, wTop: 8, wBase: 13, seed: seed + 1, roots: 3, rootSpread: 6, shade: 0.45 });
  limb(ctx, 35, 52, 21, 38, 5, 2.5);
  limb(ctx, 38, 54, 52, 38, 5, 2.5);
  crown(ctx, { lobes: CROWN, ramp, seed: seed + 2, rMin: 2.5, rMax: 4.1, bias, clusters: true });
  if (fruit) {
    // Frutas em 2 tons e só no lado iluminado (alto-esquerda), como pendem da luz.
    const r = rng(seed + 9);
    let placed = 0;
    for (let i = 0; i < 60 && placed < 9; i += 1) {
      const x = 14 + r() * 44; const y = 14 + r() * 40;
      if (((x - 36) / 27) ** 2 + ((y - 34) / 24) ** 2 > 0.8) continue;
      if ((x - 36) * 0.6 + (y - 34) * 0.8 > 2) continue;
      placed += 1;
      ellipse(ctx, x, y, 1.6, 1.5, '#891e2b');
      ellipse(ctx, x - 0.35, y - 0.4, 1.1, 1, fruit);
    }
  }
}

export const TREE_PIECES = {
  'pine-0': { w: 64, h: 88, paint: (ctx) => paintPine(ctx, 0) },
  'pine-1': { w: 64, h: 88, paint: (ctx) => paintPine(ctx, -1) },
  'pine-2': { w: 64, h: 88, paint: (ctx) => paintPine(ctx, 1) },
  // Segunda variante de pinheiro (outras assimetrias e pontas de galho), também com 3 quadros de balanço.
  'pine-b-0': { w: 64, h: 88, paint: (ctx) => paintPine(ctx, 0, { seed: 160, squat: 10 }) },
  'pine-b-1': { w: 64, h: 88, paint: (ctx) => paintPine(ctx, -1, { seed: 160, squat: 10 }) },
  'pine-b-2': { w: 64, h: 88, paint: (ctx) => paintPine(ctx, 1, { seed: 160, squat: 10 }) },
  'pine-c-0': { w: 60, h: 100, paint: (ctx) => paintPineTall(ctx, 0) },
  'pine-c-1': { w: 60, h: 100, paint: (ctx) => paintPineTall(ctx, -1) },
  'pine-c-2': { w: 60, h: 100, paint: (ctx) => paintPineTall(ctx, 1) },
  'oak-tree': { w: 72, h: 88, paint: (ctx) => paintRound(ctx, { ramp: RAMPS.oak, seed: 200, bias: 0.04 }) },
  'autumn-tree': { w: 72, h: 88, paint: (ctx) => paintRound(ctx, { ramp: RAMPS.autumn, seed: 300, bias: 0.02 }) },
  'fruit-tree': { w: 72, h: 88, paint: (ctx) => paintRound(ctx, { ramp: RAMPS.leaf, seed: 400, bias: 0.06, fruit: '#ea323c' }) }
};
