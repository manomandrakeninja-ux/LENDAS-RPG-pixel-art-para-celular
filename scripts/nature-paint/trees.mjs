// Árvores do Vale (atlas 'nature'): pinheiros com 3 quadros de balanço, carvalho, outono e frutífera.
// Origem no jogo (0.5, 0.88): a base do tronco fica em ~0.93 da altura.
import { RAMPS, rng, ellipse, crown, trunk, limb, pineTier } from './kit.mjs';

const PINE_TIERS = [
  { top: 44, bottom: 68, hw: 23, sway: 0.25 },
  { top: 30, bottom: 53, hw: 18, sway: 0.55 },
  { top: 17, bottom: 39, hw: 13.5, sway: 1 },
  { top: 4, bottom: 26, hw: 9, sway: 2.2 }
];

export function paintPine(ctx, shift, { ramp = RAMPS.pine, seed = 100, snow = false } = {}) {
  trunk(ctx, { cx: 32, top: 60, base: 82, wTop: 5, wBase: 9, seed: seed + 1, roots: 3, rootSpread: 6 });
  PINE_TIERS.forEach((t, i) => pineTier(ctx, { cx: 32, top: t.top, bottom: t.bottom, hw: t.hw, ramp, seed: seed + 10 + i, snow, dx: shift * 1.8 * t.sway }));
}

const CROWN = [[36, 38, 25, 20], [19, 42, 13, 11], [53, 42, 13, 11], [26, 22, 16, 14], [46, 22, 16, 14], [36, 14, 13, 10]];

export function paintRound(ctx, { ramp, seed, bias = 0, fruit = null }) {
  trunk(ctx, { cx: 36, top: 46, base: 82, wTop: 8, wBase: 13, seed: seed + 1, roots: 3, rootSpread: 6, shade: 0.45 });
  limb(ctx, 35, 52, 21, 38, 5, 2.5);
  limb(ctx, 38, 54, 52, 38, 5, 2.5);
  crown(ctx, { lobes: CROWN, ramp, seed: seed + 2, rMin: 2.5, rMax: 4.1, bias });
  if (fruit) {
    const r = rng(seed + 9);
    for (let i = 0; i < 14; i += 1) {
      const x = 14 + r() * 44; const y = 14 + r() * 40;
      if (((x - 36) / 27) ** 2 + ((y - 34) / 24) ** 2 > 0.85) continue;
      ellipse(ctx, x + 0.3, y + 0.5, 1.9, 1.8, '#571c27');
      ellipse(ctx, x, y, 1.7, 1.6, fruit);
      ellipse(ctx, x - 0.6, y - 0.6, 0.7, 0.55, '#f9e6cf');
    }
  }
}

export const TREE_PIECES = {
  'pine-0': { w: 64, h: 88, paint: (ctx) => paintPine(ctx, 0) },
  'pine-1': { w: 64, h: 88, paint: (ctx) => paintPine(ctx, -1) },
  'pine-2': { w: 64, h: 88, paint: (ctx) => paintPine(ctx, 1) },
  'oak-tree': { w: 72, h: 88, paint: (ctx) => paintRound(ctx, { ramp: RAMPS.oak, seed: 200, bias: 0.04 }) },
  'autumn-tree': { w: 72, h: 88, paint: (ctx) => paintRound(ctx, { ramp: RAMPS.autumn, seed: 300, bias: 0.02 }) },
  'fruit-tree': { w: 72, h: 88, paint: (ctx) => paintRound(ctx, { ramp: RAMPS.leaf, seed: 400, bias: 0.06, fruit: '#ea323c' }) }
};
