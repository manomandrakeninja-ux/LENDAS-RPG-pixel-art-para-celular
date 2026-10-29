// Objetos do mundo pintados em alta resolução: árvores dos biomas, arbustos, pedras, cogumelos, troncos.
// Atlas 'biome' (origem no jogo (0.5, 0.92)) e itens soltos do atlas 'nature' (bush, pedra, ervas, cogumelo).
import {
  RAMPS, rng, ellipse, fillPoly, line, rect, px, mixHex, clip,
  clump, crown, trunk, limb, pineTier, rock, mossCap, snowCap, mushroom, pick
} from './kit.mjs';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Musgo e folhas na base de troncos/pedras. */
function mossAt(ctx, x, y, w, seed, ramp = RAMPS.leaf, count = 6) {
  const r = rng(seed);
  const list = [];
  for (let i = 0; i < count; i += 1) list.push({ x: x + r.range(-w / 2, w / 2), y: y + r.range(-1.5, 1), rr: r.range(1.4, 2.4) });
  list.sort((a, b) => a.y - b.y);
  for (const c of list) clump(ctx, c.x, c.y, c.rr, ramp, c.x < x ? 4 : 3);
}

/** Folha longa (pétala/lâmina) de (x0,y0) até (x1,y1) com largura w. */
function blade(ctx, x0, y0, x1, y1, w, dark, light) {
  const a = Math.atan2(y1 - y0, x1 - x0); const nx = -Math.sin(a); const ny = Math.cos(a);
  const mx = (x0 + x1) / 2; const my = (y0 + y1) / 2;
  fillPoly(ctx, [[x0, y0], [mx + nx * w, my + ny * w], [x1, y1], [mx - nx * w, my - ny * w]], dark);
  fillPoly(ctx, [[x0, y0], [mx + nx * w * 0.1 - nx * w * 0.2, my + ny * w * 0.1 - ny * w * 0.2], [x1, y1], [mx - nx * w, my - ny * w]], light);
}

// ---------------------------------------------------------------- árvores

function ancientOak(ctx, variant) {
  const seed = 500 + variant * 40;
  trunk(ctx, { cx: 48, top: 58, base: 108, wTop: 15, wBase: 27, seed, roots: 4, rootSpread: 13, shade: 0.5, lean: variant ? 1.5 : -1.5 });
  limb(ctx, 44, 66, 22, 46, 8, 3.5); limb(ctx, 52, 68, 76, 46, 8, 3.5);
  mossAt(ctx, 38, 106, 22, seed + 3, RAMPS.leaf, 9);
  mossAt(ctx, 50, 80, 10, seed + 4, RAMPS.leaf, 4);
  const lobes = variant
    ? [[48, 48, 40, 31], [24, 58, 20, 16], [72, 56, 21, 16], [32, 30, 22, 18], [64, 28, 22, 18], [48, 18, 22, 14]]
    : [[48, 46, 41, 30], [23, 56, 21, 17], [73, 58, 20, 15], [36, 27, 22, 17], [62, 30, 22, 17], [49, 17, 21, 14]];
  crown(ctx, { lobes, ramp: RAMPS.oak, seed: seed + 2, rMin: 2.6, rMax: 4.5, bias: 0.05, spikes: 0.4, clusters: true });
}

function treeSpecs(base, tiers, cx) { return { base, tiers, cx }; }

function conifer(ctx, { cx, base, tiers, ramp, snow = false, seed, trunkTop, wBase = 9, shift = 0 }) {
  trunk(ctx, { cx, top: trunkTop, base, wTop: 5, wBase, seed: seed + 1, roots: 3, rootSpread: 6 });
  tiers.forEach((t, i) => pineTier(ctx, { cx, top: t[0], bottom: t[1], hw: t[2], ramp, seed: seed + 10 + i, snow, dx: shift * (0.3 + i * 0.5) }));
}

function willow(ctx) {
  trunk(ctx, { cx: 42, top: 44, base: 96, wTop: 10, wBase: 20, seed: 611, roots: 3, rootSpread: 11, bark: RAMPS.barkGray, shade: 0.5 });
  limb(ctx, 40, 54, 24, 36, 6, 3, RAMPS.barkGray); limb(ctx, 46, 54, 60, 36, 6, 3, RAMPS.barkGray);
  const ramp = RAMPS.oak;
  const r = rng(612);
  // massa da copa (cúpula) e franjas caídas
  crown(ctx, { lobes: [[42, 26, 32, 17], [20, 32, 16, 12], [64, 32, 16, 12], [42, 16, 20, 10]], ramp, seed: 613, rMin: 2.3, rMax: 3.8, bias: 0.02, spikes: 0.1 });
  const strands = [];
  for (let i = 0; i < 26; i += 1) {
    const x = 8 + (i / 25) * 68 + r.range(-1.2, 1.2);
    const dome = Math.sqrt(Math.max(0, 1 - ((x - 42) / 36) ** 2));
    const y0 = 28 + (1 - dome) * 6 + r.range(-2, 2);
    strands.push({ x, y0, len: (14 + dome * 28) * r.range(0.65, 1.1), phase: r.range(0, 6.28) });
  }
  strands.sort((a, b) => Math.abs(a.x - 42) - Math.abs(b.x - 42));
  for (const s of strands.reverse()) {
    const steps = Math.round(s.len / 2.1);
    for (let k = 0; k < steps; k += 1) {
      const t = k / steps;
      const x = s.x + Math.sin(s.phase + t * 3.2) * 1.4; const y = s.y0 + k * 2.1;
      const lit = 0.62 - (s.x - 42) / 90 - t * 0.28 + r.range(-0.12, 0.12);
      const idx = clamp(Math.round(lit * (ramp.length - 1)), 1, ramp.length - 2);
      clump(ctx, x, y, 1.9 - t * 0.5, ramp, idx, { stretch: 0.8, rnd: r });
    }
  }
}

function deadTree(ctx, { bark, seed, charred = false }) {
  const r = rng(seed);
  trunk(ctx, { cx: 30, top: 40, base: 81, wTop: 6, wBase: 15, seed, roots: 3, rootSpread: 8, bark, shade: 0.2 });
  const grow = (x, y, a, len, w, depth) => {
    const ex = x + Math.cos(a) * len; const ey = y + Math.sin(a) * len;
    limb(ctx, x, y, ex, ey, w, Math.max(1.2, w * 0.55), bark);
    if (depth <= 0) return;
    grow(ex, ey, a - r.range(0.35, 0.7), len * r.range(0.62, 0.78), w * 0.6, depth - 1);
    grow(ex, ey, a + r.range(0.35, 0.7), len * r.range(0.62, 0.78), w * 0.6, depth - 1);
    if (r() < 0.4) grow(ex, ey, a + r.range(-0.2, 0.2), len * 0.55, w * 0.5, depth - 1);
  };
  grow(30, 44, -Math.PI / 2 - 0.1, 18, 7, 3);
  grow(28, 54, -Math.PI + 0.55, 18, 4.5, 2);
  grow(33, 58, -0.55, 17, 4.5, 2);
  if (charred) {
    for (let i = 0; i < 14; i += 1) px(ctx, Math.floor(r.range(22, 38)), Math.floor(r.range(44, 78)), r() < 0.5 ? '#ed7614' : '#ffa214');
    for (let i = 0; i < 4; i += 1) px(ctx, Math.floor(r.range(18, 42)), Math.floor(r.range(6, 40)), '#ffc825');
  }
}

function palm(ctx, { cx, base, topY, bend, seed, W }) {
  const r = rng(seed);
  const bark = RAMPS.bark;
  const N = 22;
  const pts = [];
  for (let i = 0; i <= N; i += 1) { const t = i / N; pts.push([cx + bend * t ** 1.7, base - (base - topY) * t, 5.2 - 1.8 * t]); }
  for (let i = 0; i < N; i += 1) {
    const [x0, y0, w0] = pts[i]; const [x1, y1, w1] = pts[i + 1];
    fillPoly(ctx, [[x0 - w0 / 2, y0], [x0 + w0 / 2, y0], [x1 + w1 / 2, y1 - 0.4], [x1 - w1 / 2, y1 - 0.4]], i % 2 ? bark[3] : bark[2]);
    line(ctx, x0 - w0 * 0.3, y0 - 0.3, x1 - w1 * 0.3, y1 - 0.3, bark[4], 0.8);
    line(ctx, x0 + w0 * 0.32, y0, x1 + w1 * 0.32, y1, bark[1], 0.8);
    line(ctx, x0 - w0 / 2, y0 - 0.2, x0 + w0 / 2, y0 - 0.2, bark[1], 0.55);
  }
  ellipse(ctx, cx, base, 4.2, 1.2, '#1a1932');
  const [tx, ty] = pts[N];
  const ramp = RAMPS.leaf;
  const fronds = [[-2.95, 28], [-2.45, 33], [-1.95, 32], [-1.45, 24], [-1.05, 33], [-0.6, 33], [-0.12, 28], [-1.7, 16]];
  fronds.sort((a, b) => Math.abs(a[0] + 1.57) - Math.abs(b[0] + 1.57)).reverse();
  for (const [a, L0] of fronds) {
    const L = L0 * 1.12 * (W / 72);
    const droop = 0.7 + r.range(0, 0.5);
    const point = (s) => [tx + Math.cos(a) * L * s, ty + Math.sin(a) * L * s * 0.8 + droop * L * s * s * 0.55];
    // eixo
    let prev = point(0);
    for (let s = 0.06; s <= 1.001; s += 0.06) {
      const p = point(s);
      line(ctx, prev[0], prev[1], p[0], p[1], ramp[3], 1.4 - s * 0.7);
      prev = p;
    }
    for (let s = 0.14; s <= 1.0; s += 0.1) {
      const p = point(s); const q = point(Math.min(1.05, s + 0.05));
      const ta = Math.atan2(q[1] - p[1], q[0] - p[0]);
      const len = (7.4 - s * 4) * (L / 36 + 0.3);
      for (const side of [-1, 1]) {
        const la = ta + side * (1.0 - s * 0.1) + 0.55;
        const ex = p[0] + Math.cos(la) * len; const ey = p[1] + Math.sin(la) * len + 1.2;
        const lit = (side < 0 ? 0.74 : 0.5) - s * 0.12 + r.range(-0.1, 0.1) + (a > -1.57 ? -0.1 : 0.05);
        const idx = clamp(Math.round(lit * 6), 1, 6);
        line(ctx, p[0], p[1], ex, ey, ramp[Math.max(1, idx - 1)], 1.5);
        line(ctx, p[0], p[1] - 0.3, (p[0] + ex) / 2 + 0.2, (p[1] + ey) / 2 - 0.2, ramp[idx], 1.0);
      }
    }
  }
  // cocos
  for (const [dx, dy] of [[-2.2, 2.2], [1.8, 2.8], [-0.2, 3.8]]) {
    ellipse(ctx, tx + dx + 0.2, ty + dy + 0.3, 2.1, 2.0, '#391f21');
    ellipse(ctx, tx + dx, ty + dy, 1.9, 1.8, '#8a4836');
    ellipse(ctx, tx + dx - 0.6, ty + dy - 0.6, 0.7, 0.55, '#e69c69');
  }
}

// ---------------------------------------------------------------- arbustos e plantas

function bush(ctx, { lobes, ramp, seed, rMin = 1.7, rMax = 2.8, bias = 0, spikes = 0.4, berries = null, flowers = null, snow = false }) {
  crown(ctx, { lobes, ramp, seed, rMin, rMax, bias, spikes, density: 1, clusters: Boolean(berries) });
  const r = rng(seed + 50);
  const [bx0, bx1] = [Math.min(...lobes.map((l) => l[0] - l[2])), Math.max(...lobes.map((l) => l[0] + l[2]))];
  const [by0, by1] = [Math.min(...lobes.map((l) => l[1] - l[3])), Math.max(...lobes.map((l) => l[1] + l[3]))];
  const inside = (x, y) => lobes.some(([cx, cy, rx, ry]) => ((x - cx) / (rx * 0.8)) ** 2 + ((y - cy) / (ry * 0.8)) ** 2 <= 1);
  if (berries) {
    let placed = 0;
    // Bagas em 2 tons, poucas e só no lado da luz (alto-esquerda): nada de "adesivo" espalhado.
    const mx = (bx0 + bx1) / 2; const my = (by0 + by1) / 2;
    for (let i = 0; i < 80 && placed < 6; i += 1) {
      const x = r.range(bx0, bx1); const y = r.range(by0, by1);
      if (!inside(x, y) || (x - mx) * 0.6 + (y - my) * 0.8 > 0.5) continue;
      placed += 1;
      ellipse(ctx, x, y, 1.25, 1.2, '#891e2b');
      ellipse(ctx, x - 0.3, y - 0.35, 0.85, 0.8, berries[0]);
    }
  }
  if (flowers) {
    let placed = 0;
    for (let i = 0; i < 80 && placed < 7; i += 1) {
      const x = r.range(bx0, bx1); const y = r.range(by0, by1);
      if (!inside(x, y)) continue;
      placed += 1;
      const col = flowers[placed % flowers.length];
      for (let k = 0; k < 5; k += 1) { const a = k * 1.2566; ellipse(ctx, x + Math.cos(a) * 1.3, y + Math.sin(a) * 1.1, 0.95, 0.85, col); }
      ellipse(ctx, x, y, 0.8, 0.7, '#ffeb57');
    }
  }
  if (snow) {
    for (let i = 0; i < 9; i += 1) {
      const x = r.range(bx0 + 2, bx1 - 2); const y = by0 + 2 + r.range(0, (by1 - by0) * 0.35);
      if (!inside(x, y)) continue;
      clump(ctx, x, y, r.range(1.8, 2.8), RAMPS.snow, x < (bx0 + bx1) / 2 ? 5 : 4);
    }
  }
}

function dryBush(ctx) {
  const r = rng(731);
  const bark = RAMPS.dry;
  for (let i = 0; i < 12; i += 1) {
    const a = -Math.PI / 2 + r.range(-1.25, 1.25); const L = r.range(9, 15);
    const sx = 15 + r.range(-3, 3);
    limb(ctx, sx, 19, sx + Math.cos(a) * L, 19 + Math.sin(a) * L, 1.8, 0.8, bark);
    const mx = sx + Math.cos(a) * L * 0.6; const my = 19 + Math.sin(a) * L * 0.6;
    limb(ctx, mx, my, mx + Math.cos(a + 0.6) * 5, my + Math.sin(a + 0.6) * 5, 1.2, 0.7, bark);
  }
  for (let i = 0; i < 11; i += 1) clump(ctx, 15 + r.range(-9, 9), 11 + r.range(-3, 6), r.range(1.4, 2.2), RAMPS.dry, r() < 0.5 ? 4 : 3);
}

function fern(ctx) {
  const r = rng(741);
  const ramp = RAMPS.leaf;
  const fronds = [[-2.7, 14], [-2.3, 17], [-1.9, 18], [-1.57, 15], [-1.2, 18], [-0.8, 17], [-0.4, 14]];
  fronds.sort((a, b) => Math.abs(a[0] + 1.57) - Math.abs(b[0] + 1.57)).reverse();
  for (const [a, L] of fronds) {
    const pt = (s) => [17 + Math.cos(a) * L * s, 23 + Math.sin(a) * L * s * 0.9 + 6 * s * s * (L / 17)];
    let prev = pt(0);
    for (let s = 0.08; s <= 1.001; s += 0.08) { const p = pt(s); line(ctx, prev[0], prev[1], p[0], p[1], ramp[2], 1.2); prev = p; }
    for (let s = 0.1; s <= 1.0; s += 0.09) {
      const p = pt(s); const q = pt(Math.min(1.05, s + 0.05)); const ta = Math.atan2(q[1] - p[1], q[0] - p[0]);
      for (const side of [-1, 1]) {
        const len = 4.6 - s * 3;
        const la = ta + side * 1.15;
        const idx = clamp(Math.round((side < 0 ? 0.78 : 0.52) * 6 - s * 0.6 + r.range(-0.4, 0.4)), 1, 6);
        line(ctx, p[0], p[1], p[0] + Math.cos(la) * len, p[1] + Math.sin(la) * len, ramp[idx], 1.5);
      }
    }
  }
}

function reeds(ctx) {
  const r = rng(751);
  const ramp = RAMPS.leaf;
  const stems = [[6, 4], [10, 9], [14, 5], [18, 11], [22, 6], [25, 10], [8, 14], [20, 15]];
  for (const [x, top] of stems) {
    const lean = r.range(-2, 2);
    // folhas longas
    for (let k = 0; k < 2; k += 1) blade(ctx, x + k * 1.5, 29, x + lean * 2.4 + (k ? 3.2 : -3.2), top + 6 + k * 3, 1.3, ramp[2], ramp[4]);
    line(ctx, x, 29, x + lean, top + 4, ramp[3], 1.2);
    // espiga marrom
    ellipse(ctx, x + lean + 0.2, top + 3.4, 1.7, 3.6, '#391f21');
    ellipse(ctx, x + lean - 0.2, top + 3, 1.2, 3.1, '#8a4836');
    ellipse(ctx, x + lean - 0.6, top + 1.8, 0.5, 1.1, '#bf6f4a');
  }
  ellipse(ctx, 15, 30, 13, 1.2, '#134c4c');
}

function bigFlower(ctx) {
  const ramp = RAMPS.leaf;
  line(ctx, 14, 28, 14.5, 14, ramp[2], 2.2);
  line(ctx, 13.4, 28, 13.8, 15, ramp[4], 0.8);
  blade(ctx, 14, 26, 4, 20, 2.6, ramp[2], ramp[4]);
  blade(ctx, 14, 24, 24, 17, 2.6, ramp[2], ramp[3]);
  blade(ctx, 14, 28, 8, 26, 1.7, ramp[1], ramp[3]);
  const pet = ['#93388f', '#c85086', '#f68187', '#fdd2ed'];
  for (let k = 0; k < 7; k += 1) {
    const a = (k / 7) * Math.PI * 2 - 0.4; const px0 = 14.5 + Math.cos(a) * 5.2; const py0 = 12 + Math.sin(a) * 4.4;
    ellipse(ctx, px0, py0 + 0.5, 3.1, 2.8, pet[0]);
    ellipse(ctx, px0 - 0.2, py0, 2.7, 2.4, k % 2 ? pet[1] : pet[2]);
    ellipse(ctx, px0 - 0.7, py0 - 0.7, 1.1, 0.8, pet[3]);
  }
  ellipse(ctx, 14.5, 12, 2.6, 2.3, '#c64524'); ellipse(ctx, 14, 11.5, 1.9, 1.6, '#ffc825'); px(ctx, 13, 10, '#ffeb57');
}

function herbs(ctx) {
  const ramp = RAMPS.leaf;
  const r = rng(761);
  const leaves = [[14, 24, 5, 12], [14, 24, 20, 11], [14, 24, 9, 6], [14, 24, 19, 6], [14, 24, 14, 4], [14, 24, 3, 17], [14, 24, 25, 17]];
  for (const [x, y, ex, ey] of leaves) { blade(ctx, x, y, ex, ey, 2.6, ramp[2], ramp[4]); line(ctx, x, y, (x + ex) / 2 + 0.2, (y + ey) / 2, ramp[5], 0.6); }
  for (const [x, y] of [[8, 6], [16, 3], [21, 8]]) { ellipse(ctx, x, y, 1.7, 1.6, '#f9e6cf'); ellipse(ctx, x - 0.4, y - 0.4, 0.8, 0.7, '#ffffff'); px(ctx, x, y + 0.4, '#ffeb57'); }
  void r;
}

function cactus(ctx, { small }) {
  const ramp = RAMPS.leaf;
  const body = (x, y0, y1, w) => {
    ellipse(ctx, x, y0 + w / 2, w / 2, w / 2, ramp[3]);
    rect(ctx, x - w / 2, y0 + w / 2, w, y1 - y0 - w / 2, ramp[3]);
    clip(ctx, [[x - w / 2, y0], [x + w / 2, y0], [x + w / 2, y1], [x - w / 2, y1]], () => {
      rect(ctx, x - w / 2, y0, w * 0.3, y1 - y0, ramp[4]);
      rect(ctx, x - w / 2, y0, w * 0.12, y1 - y0, ramp[5]);
      rect(ctx, x + w * 0.2, y0, w, y1 - y0, ramp[2]);
      rect(ctx, x + w * 0.38, y0, w, y1 - y0, ramp[1]);
    });
    for (const f of [-0.15, 0.2]) line(ctx, x + w * f, y0 + w * 0.5, x + w * f, y1, ramp[f < 0 ? 4 : 2], 0.6);
    const r = rng(Math.round(x * 7 + y0));
    for (let i = 0; i < w * (y1 - y0) / 14; i += 1) px(ctx, Math.floor(x + r.range(-w / 2 + 1, w / 2 - 1)), Math.floor(r.range(y0 + 2, y1 - 1)), '#f9e6cf');
  };
  if (small) {
    body(18, 12, 29, 11); body(8, 18, 27, 6);
    // pequeno braço ligado
    rect(ctx, 8, 24, 8, 3, ramp[3]);
    ellipse(ctx, 18, 12, 2.2, 1.6, '#f68187');
  } else {
    body(18, 6, 51, 13);
    body(7, 20, 36, 6); rect(ctx, 7, 32, 8, 4, ramp[3]);
    body(29, 26, 42, 6); rect(ctx, 24, 37, 8, 4, ramp[3]);
    ellipse(ctx, 18, 6, 3, 2, '#f68187'); ellipse(ctx, 17.4, 5.4, 1.4, 1, '#fdd2ed'); px(ctx, 18, 5, '#ffeb57');
  }
  ellipse(ctx, 18, small ? 29 : 51, small ? 9 : 10, 1.3, '#1a1932');
}

// ---------------------------------------------------------------- cogumelos e troncos

function fallenLog(ctx, { bog }) {
  const bark = bog ? ['#0e071b', '#1c121c', '#391f21', '#5d2c28', '#775c5b', '#918275', '#b4b4b4'] : RAMPS.bark;
  const r = rng(bog ? 811 : 801);
  const y0 = 9; const y1 = 25;
  ellipse(ctx, 29, 26, 25, 2, '#1a1932');
  fillPoly(ctx, [[8, y0], [50, y0 - 0.5], [50, y1], [8, y1 + 0.3]], bark[3]);
  ellipse(ctx, 8, 17, 3.6, 8.2, bark[2]);
  clip(ctx, [[5, y0 - 1], [52, y0 - 1], [52, y1 + 1], [5, y1 + 1]], () => {
    rect(ctx, 4, y0 - 1, 50, 4, bark[4]); rect(ctx, 4, y0 - 1, 50, 1.4, bark[5]);
    rect(ctx, 4, y1 - 5, 50, 6, bark[2]); rect(ctx, 4, y1 - 2.2, 50, 4, bark[1]);
    for (let i = 0; i < 38; i += 1) {
      const x = 6 + r() * 44; const y = y0 + 1 + r() * (y1 - y0 - 2);
      line(ctx, x, y, x + r.range(3, 8), y + r.range(-0.5, 0.5), y > 18 ? bark[1] : bark[2], 0.8);
      if (y < 15 && r() < 0.5) line(ctx, x + 1, y - 0.8, x + r.range(2, 6), y - 0.6, bark[5], 0.7);
    }
  });
  // extremidade cortada com anéis
  ellipse(ctx, 50, 17, 4.2, 8.4, bark[2]);
  ellipse(ctx, 49.6, 17, 3.5, 7.4, '#cba36f');
  ellipse(ctx, 49.4, 17, 2.5, 5.4, '#e8b878'); ellipse(ctx, 49.2, 17, 1.4, 3, '#cba36f'); px(ctx, 49, 17, '#ad7954');
  line(ctx, 47.8, 11.5, 48.6, 12.5, '#f6ca9f', 0.8);
  // musgo/limo e cogumelinhos
  mossAt(ctx, 18, 10.5, 16, bog ? 812 : 802, RAMPS.leaf, 7);
  mossAt(ctx, 36, 10, 10, bog ? 813 : 803, RAMPS.leaf, 4);
  if (bog) mushroom(ctx, { cx: 30, base: 12, capRx: 3.2, capRy: 2.5, stemW: 1.6, stemH: 4, cap: ['#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f', '#d3fc7e'], spots: '#d3fc7e', seed: 5 });
  else mushroom(ctx, { cx: 30, base: 11, capRx: 3.4, capRy: 2.6, stemW: 1.6, stemH: 3.6, cap: ['#8a4836', '#bf6f4a', '#e69c69', '#f6ca9f', '#f9e6cf', '#ffffff'], spots: '#ffffff', seed: 6 });
}

const ROCK_PIECES = {
  'mossy-rock': { w: 40, h: 30, shadow: [20, 27, 16, 2.4], paint: (ctx) => rock(ctx, { cx: 20, base: 27, rx: 16.5, ry: 12, pal: RAMPS.stone, seed: 261, moss: 1.7 }) },
  'snow-rock': { w: 46, h: 34, shadow: [23, 31, 19, 2.4], paint: (ctx) => rock(ctx, { cx: 23, base: 31, rx: 19, ry: 13.5, pal: RAMPS.stone, seed: 271, snow: 1 }) },
  'sea-rock': { w: 44, h: 32, shadow: [22, 29, 18, 2.2], paint: (ctx) => { rock(ctx, { cx: 22, base: 29, rx: 18, ry: 13, pal: RAMPS.seastone, seed: 281, wet: true }); mossCap(ctx, { cx: 18, y: 25, rx: 12, base: 29, seed: 283, amount: 0.5, ramp: ['#0c2e44', '#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f', '#d3fc7e'] }); } },
  'desert-rock': { w: 60, h: 44, shadow: [30, 41, 26, 2.6], paint: (ctx) => { rock(ctx, { cx: 30, base: 41, rx: 26, ry: 18, pal: RAMPS.sandstone, seed: 291, m: 10, jag: 0.09 }); } },
  obsidian: {
    w: 44, h: 48, shadow: [22, 45, 17, 2.4],
    paint: (ctx) => {
      rock(ctx, { cx: 22, base: 45, rx: 17, ry: 20, pal: RAMPS.obsidian, seed: 301, m: 7, jag: 0.2 });
      for (const [x0, y0, x1, y1] of [[14, 22, 19, 30], [26, 16, 29, 25], [20, 33, 26, 39]]) line(ctx, x0, y0, x1, y1, '#ca52c9', 0.8);
      px(ctx, 16, 20, '#f68187'); px(ctx, 27, 15, '#fdd2ed');
    }
  },
  'resource-stone': { w: 28, h: 28, shadow: [14, 25, 11, 2], paint: (ctx) => { rock(ctx, { cx: 13, base: 25, rx: 11, ry: 9, pal: RAMPS.stone, seed: 321, moss: 0.5, m: 8 }); rock(ctx, { cx: 22.5, base: 25.5, rx: 4.6, ry: 3.8, pal: RAMPS.stone, seed: 322, m: 6 }); } }
};




export const PROP_PIECES = {
  'ancient-oak-0': { w: 96, h: 112, paint: (ctx) => ancientOak(ctx, 0) },
  'ancient-oak-1': { w: 96, h: 112, paint: (ctx) => ancientOak(ctx, 1) },
  'mossy-pine-0': { w: 56, h: 88, paint: (ctx) => conifer(ctx, { cx: 28, base: 85, trunkTop: 62, tiers: [[44, 68, 21], [30, 52, 17], [17, 38, 12.5], [4, 25, 8]], ramp: RAMPS.pine, seed: 540 }) },
  'mossy-pine-1': { w: 56, h: 88, paint: (ctx) => conifer(ctx, { cx: 28, base: 85, trunkTop: 62, tiers: [[45, 68, 20], [31, 53, 16], [18, 39, 12], [5, 26, 8]], ramp: RAMPS.pine, seed: 560 }) },
  'snow-pine-0': { w: 58, h: 92, paint: (ctx) => conifer(ctx, { cx: 29, base: 89, trunkTop: 66, tiers: [[46, 71, 22], [32, 56, 17], [18, 41, 12.5], [4, 26, 8.5]], ramp: RAMPS.pine, snow: true, seed: 580 }) },
  'snow-pine-1': { w: 58, h: 92, paint: (ctx) => conifer(ctx, { cx: 29, base: 89, trunkTop: 66, tiers: [[47, 71, 21], [33, 57, 16], [19, 42, 12], [5, 27, 8]], ramp: RAMPS.pine, snow: true, seed: 600 }) },
  willow: { w: 84, h: 100, paint: willow },
  'dead-tree': { w: 60, h: 84, paint: (ctx) => deadTree(ctx, { bark: RAMPS.barkGray, seed: 621 }) },
  'charred-tree': { w: 60, h: 84, paint: (ctx) => deadTree(ctx, { bark: RAMPS.barkChar, seed: 631, charred: true }) },
  'palm-0': { w: 72, h: 92, paint: (ctx) => palm(ctx, { cx: 32, base: 89, topY: 32, bend: 7, seed: 651, W: 72 }) },
  'palm-1': { w: 72, h: 108, paint: (ctx) => palm(ctx, { cx: 38, base: 105, topY: 34, bend: -7, seed: 661, W: 72 }) },
  cactus: { w: 36, h: 54, paint: (ctx) => cactus(ctx, { small: false }) },
  'cactus-small': { w: 36, h: 32, paint: (ctx) => cactus(ctx, { small: true }) },
  'fallen-log': { w: 60, h: 30, paint: (ctx) => fallenLog(ctx, { bog: false }) },
  'bog-log': { w: 60, h: 30, paint: (ctx) => fallenLog(ctx, { bog: true }) },
  fern: { w: 34, h: 26, shadow: [17, 23, 11, 1.8], paint: fern },
  reeds: { w: 30, h: 32, paint: reeds },
  'big-flower': { w: 28, h: 30, shadow: [14.5, 28, 8, 1.6], paint: bigFlower },
  'resource-herbs': { w: 28, h: 28, shadow: [14, 25, 10, 2], paint: herbs },
  'dry-bush': { w: 30, h: 22, shadow: [15, 20, 11, 1.6], paint: dryBush },
  bush: {
    w: 40, h: 30, shadow: [20, 28, 16, 2.4],
    paint: (ctx) => bush(ctx, { lobes: [[20, 17, 17, 10], [11, 19, 9, 7], [30, 19, 9, 7], [20, 10, 10, 7]], ramp: RAMPS.oak, seed: 701, bias: 0.05, berries: ['#ea323c', '#f68187'] })
  },
  'tropical-bush': {
    w: 44, h: 34, shadow: [22, 31, 18, 2.4],
    paint: (ctx) => bush(ctx, { lobes: [[22, 20, 19, 11], [11, 23, 10, 8], [33, 23, 10, 8], [22, 11, 11, 8]], ramp: RAMPS.leaf, seed: 711, bias: 0.04, flowers: ['#f68187', '#ffc825', '#fdd2ed'] })
  },
  'frozen-bush': {
    w: 34, h: 26, shadow: [17, 23, 13, 2],
    paint: (ctx) => bush(ctx, { lobes: [[17, 15, 14, 9], [9, 17, 8, 6], [25, 17, 8, 6], [17, 9, 8, 6]], ramp: RAMPS.frost, seed: 721, rMin: 1.6, rMax: 2.6, bias: 0.05, snow: true })
  },
  'ash-bush': {
    w: 30, h: 22, shadow: [15, 19, 11, 1.8],
    paint: (ctx) => bush(ctx, { lobes: [[15, 12, 12, 7], [8, 14, 7, 5], [22, 14, 7, 5]], ramp: RAMPS.ash, seed: 731, rMin: 1.5, rMax: 2.4, bias: 0.06 })
  },
  'giant-mushroom': {
    w: 40, h: 46, shadow: [20, 43, 10, 2],
    paint: (ctx) => { mossAt(ctx, 14, 43, 10, 901, RAMPS.leaf, 3); mushroom(ctx, { cx: 20, base: 43, capRx: 17.5, capRy: 15, stemW: 8, stemH: 17, seed: 902 }); mossAt(ctx, 27, 43, 8, 903, RAMPS.leaf, 3); }
  },
  'swamp-shroom': {
    w: 30, h: 28, shadow: [15, 25, 11, 1.8],
    paint: (ctx) => {
      const cap = ['#0c2e44', '#0069aa', '#0098dc', '#00cdf9', '#94fdff', '#d5e8ef'];
      const stem = ['#2a2f4e', '#657392', '#9cc8e6', '#d5e8ef'];
      mushroom(ctx, { cx: 9, base: 25, capRx: 5.2, capRy: 4.4, stemW: 2.6, stemH: 9, cap, spots: '#d5e8ef', stem, gills: '#1a1932', seed: 911, glow: '#94fdff' });
      mushroom(ctx, { cx: 21, base: 25, capRx: 4.6, capRy: 3.8, stemW: 2.4, stemH: 7, cap, spots: '#d5e8ef', stem, gills: '#1a1932', seed: 912, glow: '#94fdff' });
      mushroom(ctx, { cx: 15, base: 26, capRx: 6.4, capRy: 5.2, stemW: 3, stemH: 13, cap, spots: '#d5e8ef', stem, gills: '#1a1932', seed: 913, glow: '#94fdff' });
    }
  },
  'detail-mushroom': {
    w: 16, h: 16, shadow: [8, 14, 5, 1.2],
    paint: (ctx) => mushroom(ctx, { cx: 8, base: 14, capRx: 6, capRy: 5, stemW: 3.2, stemH: 5.5, seed: 921 })
  },
  ...ROCK_PIECES
};
