// Estruturas dos locais de missão (src/art/sites.js), da coleta (HarvestStructures: baú e mina)
// e a entrada da masmorra (GameScene). Origem dos locais e da coleta: (0.5, 0.9) → base em 0.9 x tamanho.
import {
  C, STONE, STONE_COOL, STONE_DARK, WOOD, WOOD_DARK, ROOF_RED, ROOF_SLATE, THATCH,
  rng, rect, px, line, ellipse, fillPoly, clip, veil, stones, planks, logs, tiles, thatch, mossBand, mossPatches,
  windowLit, door, barrel, crate, sack, lanternBox, box, gableRoof, frontGable, baseShade, grassTufts, mixHex
} from './kit.mjs';

const GOLD = { dark: C.r0, mid: C.f2, light: C.f3, hi: C.f4 };

/** Rocha arredondada com luz de cima-esquerda e textura. */
function boulder(ctx, pts, { pal = STONE, seed = 1, light = [0.3, 0.25] } = {}) {
  fillPoly(ctx, pts, pal.tones[0]);
  const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  clip(ctx, pts, () => {
    const r = rng(seed);
    // Facetas: manchas claras no alto-esquerda, escuras embaixo-direita.
    for (let i = 0; i < 40; i += 1) {
      const x = r.range(x0, x1); const y = r.range(y0, y1);
      const t = (x - x0) / (x1 - x0) * 0.6 + (y - y0) / (y1 - y0) * 0.8;
      ellipse(ctx, x, y, r.range(1.5, 4), r.range(1, 2.5), t < 0.45 ? pal.light : t < 0.8 ? pal.tones[1] : pal.shade);
    }
    for (let i = 0; i < 30; i += 1) px(ctx, Math.round(r.range(x0, x1)), Math.round(r.range(y0, y1)), r() < 0.5 ? pal.hi : pal.deep);
    for (let i = 0; i < 4; i += 1) { const x = r.range(x0 + 3, x1 - 3); const y = r.range(y0 + 3, y1 - 3); line(ctx, x, y, x + r.range(-3, 3), y + r.range(1, 4), pal.deep, 0.7); }
  });
  veil(ctx, pts, x0, y0, x1, y1, [[0, 'rgba(255,236,190,0.12)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(26,25,50,0.45)']]);
}

/** Bloco 3/4 de pedra (topo claro + face) para altares, pedestais e túmulos. */
function stoneBlock3(ctx, x, top, w, h, depth, opts = {}) {
  const pal = opts.pal ?? STONE;
  ctx.save(); ctx.translate(x, top + depth); stones(ctx, w, h, { pal, seed: opts.seed ?? 3, rowH: [3, 4], blockW: [4, 7], moss: opts.moss ?? 0.3 }); ctx.restore();
  rect(ctx, x, top, w, depth, pal.light); rect(ctx, x, top, w, 1, pal.hi);
  for (let k = x + 4; k < x + w; k += 5) rect(ctx, k, top + 1, 1, depth - 1, pal.shade);
  rect(ctx, x, top + depth, w, 1, pal.deep);
  veil(ctx, [[x, top + depth], [x + w, top + depth], [x + w, top + depth + h], [x, top + depth + h]], x, 0, x + w, 0, [[0, 'rgba(255,236,190,0.1)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(26,25,50,0.35)']]);
  baseShade(ctx, x, top + depth + h, w, 2);
}

function torchFlame(ctx, cx, base, s = 1) {
  for (const [color, wdt, hgt] of [[C.r3, 2.2, 6], [C.f1, 1.7, 4.8], [C.f3, 1.1, 3.4], [C.f4, 0.5, 1.8]]) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(cx - wdt * s, base);
    ctx.bezierCurveTo(cx - wdt * s, base - hgt * s * 0.5, cx - 0.3, base - hgt * s * 0.8, cx + 0.3, base - hgt * s);
    ctx.bezierCurveTo(cx + 0.6, base - hgt * s * 0.6, cx + wdt * s, base - hgt * s * 0.45, cx + wdt * s, base); ctx.fill();
  }
}

// ---------- Vila e estrada ----------

function well(ctx) {
  // Poço de pedra redondo com telhadinho, sarilho, corda e balde.
  const cx = 16; const base = 29;
  ellipse(ctx, cx, base - 9, 11, 4, C.g2);
  clip(ctx, [[cx - 11, base - 9], [cx + 11, base - 9], [cx + 11, base], [cx - 11, base]], () => { ctx.save(); ctx.translate(cx - 11, base - 10); stones(ctx, 22, 11, { seed: 4, rowH: [3, 4], blockW: [3, 5], moss: 0.5 }); ctx.restore(); });
  ellipse(ctx, cx, base - 1, 11, 2, 'rgba(26,25,50,0.0)');
  veil(ctx, [[cx - 11, base - 10], [cx + 11, base - 10], [cx + 11, base], [cx - 11, base]], cx - 11, 0, cx + 11, 0, [[0, 'rgba(255,236,190,0.15)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(26,25,50,0.45)']]);
  ellipse(ctx, cx, base - 10, 11, 3.6, C.g4); ellipse(ctx, cx, base - 10, 9, 2.6, C.navy); ellipse(ctx, cx - 1, base - 10.4, 6, 1.6, C.b1); px(ctx, cx - 4, base - 11, C.b4);
  for (const x of [cx - 10, cx + 8]) { rect(ctx, x, base - 24, 2, 15, C.w3); rect(ctx, x, base - 24, 1, 15, C.w5); }
  // Telhadinho.
  const roofPts = [[cx - 14, base - 22], [cx, base - 30], [cx + 14, base - 22], [cx + 12, base - 21], [cx, base - 28], [cx - 12, base - 21]];
  fillPoly(ctx, [[cx - 14, base - 21], [cx, base - 30], [cx + 14, base - 21]], C.r1);
  clip(ctx, [[cx - 14, base - 21], [cx, base - 30], [cx, base - 21]], () => { ctx.save(); ctx.translate(cx - 14, base - 30); tiles(ctx, 14, 9, { barrel: true, seed: 3 }); ctx.restore(); });
  clip(ctx, [[cx, base - 30], [cx + 14, base - 21], [cx, base - 21]], () => { ctx.save(); ctx.translate(cx, base - 30); tiles(ctx, 14, 9, { barrel: true, seed: 4 }); ctx.restore(); });
  veil(ctx, [[cx, base - 30], [cx + 14, base - 21], [cx, base - 21]], 0, 0, 1, 0, [[0, 'rgba(26,25,50,0.4)'], [1, 'rgba(26,25,50,0.4)']]);
  line(ctx, cx - 14, base - 21, cx, base - 30, C.r4, 0.8);
  void roofPts;
  // Sarilho, corda e balde.
  rect(ctx, cx - 8, base - 18, 16, 2, C.w4); rect(ctx, cx - 8, base - 18, 16, 1, C.w6);
  rect(ctx, cx + 8, base - 19, 1, 4, C.g2); rect(ctx, cx + 9, base - 16, 2, 1, C.g2);
  line(ctx, cx + 0.5, base - 16, cx + 0.5, base - 12, C.sand, 0.8);
  rect(ctx, cx - 1, base - 12, 3, 3, C.w4); rect(ctx, cx - 1, base - 12, 3, 1, C.g3);
  grassTufts(ctx, cx - 13, base + 1, 26, { seed: 7, flowers: 0.15 });
}

function crates(ctx) {
  crate(ctx, 3, 16, 11); crate(ctx, 15, 18, 10); crate(ctx, 9, 5, 10);
  sack(ctx, 27, 29, { w: 5, h: 7 });
  barrel(ctx, 6, 30, { w: 5, h: 5 });
  grassTufts(ctx, 1, 30, 30, { seed: 3 });
}

function wheel(ctx, cx, cy, r) {
  ellipse(ctx, cx, cy, r, r, C.w1); ellipse(ctx, cx, cy, r - 1, r - 1, C.w4); ellipse(ctx, cx, cy, r - 2, r - 2, C.w1);
  for (let i = 0; i < 6; i += 1) { const a = i * Math.PI / 3; line(ctx, cx, cy, cx + Math.cos(a) * (r - 1.5), cy + Math.sin(a) * (r - 1.5), C.w4, 0.9); }
  ellipse(ctx, cx, cy, 1.3, 1.3, C.g3);
  ctx.strokeStyle = C.w6; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(cx, cy, r - 0.7, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
}

function cart(ctx) {
  // Carroça de mercador com lona remendada, caixotes e sacos.
  ctx.save(); ctx.translate(4, 18); planks(ctx, 30, 8, { seed: 5, size: 4 }); ctx.restore();
  rect(ctx, 4, 17, 30, 2, C.w5); rect(ctx, 4, 17, 30, 1, C.w6); rect(ctx, 4, 26, 30, 1, C.w1);
  // Lona em arco.
  ctx.fillStyle = C.paper; ctx.beginPath(); ctx.moveTo(6, 18); ctx.bezierCurveTo(6, 4, 30, 4, 30, 18); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.moveTo(6, 18); ctx.bezierCurveTo(6, 4, 30, 4, 30, 18); ctx.clip();
  for (let x = 6; x < 31; x += 6) rect(ctx, x + 4, 4, 1, 15, C.sand);
  const g = ctx.createLinearGradient(6, 0, 30, 0); g.addColorStop(0, 'rgba(255,240,210,0.3)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(26,25,50,0.4)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 40, 40);
  rect(ctx, 20, 9, 4, 4, C.r3); rect(ctx, 20, 9, 4, 1, C.r4);
  ctx.restore();
  sack(ctx, 33, 17, { w: 4, h: 5 });
  line(ctx, 34, 23, 39, 27, C.w3, 1.2);
  wheel(ctx, 11, 29, 5); wheel(ctx, 28, 29, 5);
  grassTufts(ctx, 2, 36, 36, { seed: 4 });
}

function tentPaint(cloth, trim) {
  return (ctx) => {
    // Barraca de lona com aba aberta, estacas e cordas; luz quente lá dentro.
    const L = [3, 28]; const T = [16, 4]; const R = [29, 28];
    fillPoly(ctx, [L, T, R], cloth[1]);
    fillPoly(ctx, [L, T, [11, 28]], cloth[2]);
    fillPoly(ctx, [T, R, [22, 28]], cloth[0]);
    for (const [x0] of [[8], [12], [20], [24]]) line(ctx, 16, 5, x0, 28, 'rgba(26,25,50,0.25)', 0.6);
    // Entrada.
    fillPoly(ctx, [[12, 28], [16, 14], [20, 28]], C.w1);
    fillPoly(ctx, [[13.5, 28], [16, 19], [18.5, 28]], C.f1); fillPoly(ctx, [[15, 28], [16, 23], [17, 28]], C.f3);
    fillPoly(ctx, [[12, 28], [16, 14], [13, 28]], cloth[2]);
    if (trim) for (let x = 4; x < 29; x += 3) px(ctx, x, 27, trim);
    rect(ctx, 15.5, 2, 1, 4, C.w2); fillPoly(ctx, [[16.5, 2], [21, 3], [16.5, 4]], trim ?? C.red);
    line(ctx, 3, 28, 0, 30, C.sand, 0.6); line(ctx, 29, 28, 31, 30, C.sand, 0.6);
    grassTufts(ctx, 0, 30, 32, { seed: 5 });
  };
}

function bannerPost(ctx) {
  rect(ctx, 15, 2, 2, 27, C.w3); rect(ctx, 15, 2, 1, 27, C.w5);
  rect(ctx, 14, 3, 16, 1, C.w2);
  const pts = [[17, 4], [29, 4], [29, 18], [23, 15], [17, 18]];
  fillPoly(ctx, pts, C.r1);
  clip(ctx, pts, () => { for (let x = 17; x < 30; x += 3) rect(ctx, x, 4, 1, 15, C.r2); rect(ctx, 17, 4, 2, 15, C.r3); });
  rect(ctx, 17, 4, 12, 1, C.f2);
  ellipse(ctx, 23, 9.5, 2.5, 2.5, C.f2); ellipse(ctx, 22.6, 9, 1.6, 1.6, C.f3); px(ctx, 22, 8, C.f4);
  ellipse(ctx, 16, 2, 1.2, 1.2, C.f3);
  rect(ctx, 12, 27, 8, 2, C.g3); rect(ctx, 12, 27, 8, 1, C.g4);
  grassTufts(ctx, 10, 30, 12, { seed: 2 });
}

function signPost(ctx) {
  rect(ctx, 15, 8, 3, 21, C.w3); rect(ctx, 15, 8, 1, 21, C.w5); rect(ctx, 17, 8, 1, 21, C.w2);
  for (const [y, dir, len] of [[6, 1, 24], [14, 0, 20]]) {
    const x0 = dir ? 4 : 8; const pts = dir ? [[x0, y], [x0 + len - 4, y], [x0 + len, y + 3.5], [x0 + len - 4, y + 7], [x0, y + 7]] : [[x0 + 4, y], [x0 + len, y], [x0 + len, y + 6], [x0 + 4, y + 6], [x0, y + 3]];
    fillPoly(ctx, pts, C.w4);
    clip(ctx, pts, () => { ctx.save(); ctx.translate(x0, y); planks(ctx, len, 7, { seed: y, size: 7, nails: true }); ctx.restore(); });
    for (let k = 0; k < 4; k += 1) rect(ctx, x0 + 5 + k * 4, y + 3, 3, 1, C.w1);
  }
  grassTufts(ctx, 8, 30, 16, { seed: 3, flowers: 0.3 });
}

function cabin(ctx) {
  // Cabana do eremita: toras, telhado de ripas com musgo, janela acesa, varal de ervas.
  const x = 7; const base = 35; const w = 24; const h = 11; const d = 12;
  const { fy } = box(ctx, { x, base, w, h, d, front: (c, ww, hh) => logs(c, ww, hh, { seed: 2 }), side: (c, ww, hh) => logs(c, ww, hh, { seed: 3, ends: false }) });
  gableRoof(ctx, { x, wallTop: fy, w, d, rise: 10, over: 3, drop: 2, roof: (c, ww, hh) => tiles(c, ww, hh, { pal: { line: C.w1, dark: C.w2, tones: [C.wg2, C.w3, C.wg2], light: C.w4, hi: C.w5 }, seed: 3, moss: 0.9 }), gable: (c, ww, hh) => logs(c, ww, hh, { seed: 4, ends: false }) });
  door(ctx, x + 4, base - 9, 5, 9, { arch: false, step: false });
  windowLit(ctx, x + 14, base - 8, 5, 4, { shutters: false });
  rect(ctx, x + 12, base - 10, 9, 1, C.w2);
  for (let k = 0; k < 4; k += 1) { rect(ctx, x + 13 + k * 2, base - 10, 1, 2, C.m2); px(ctx, x + 13 + k * 2, base - 8, C.m3); }
  baseShade(ctx, x, base, w, 3);
  barrel(ctx, x + w + 3, base + 1, { w: 5, h: 6 });
  grassTufts(ctx, 2, base + 1, 36, { seed: 8, flowers: 0.2 });
}

function fountain(ctx) {
  // Chafariz de pedra: bacia octogonal, coluna com taça e jorros de água.
  const cx = 20; const base = 36;
  ellipse(ctx, cx, base - 6, 17, 6.5, C.g2);
  clip(ctx, [[cx - 17, base - 7], [cx + 17, base - 7], [cx + 17, base], [cx - 17, base]], () => { ctx.save(); ctx.translate(cx - 17, base - 8); stones(ctx, 34, 9, { seed: 6, rowH: [4, 4], blockW: [5, 7], moss: 0.5 }); ctx.restore(); });
  veil(ctx, [[cx - 17, base - 8], [cx + 17, base - 8], [cx + 17, base], [cx - 17, base]], cx - 17, 0, cx + 17, 0, [[0, 'rgba(255,236,190,0.12)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(26,25,50,0.45)']]);
  ellipse(ctx, cx, base - 8, 17, 6, C.g4); ellipse(ctx, cx, base - 8, 15, 4.8, C.b1); ellipse(ctx, cx - 2, base - 8.6, 10, 2.8, C.b2);
  for (const [x, y] of [[cx - 8, base - 9], [cx + 5, base - 7], [cx - 2, base - 6]]) { px(ctx, x, y, C.b4); px(ctx, x + 1, y, C.white); }
  // Coluna e taça.
  rect(ctx, cx - 2, base - 22, 4, 14, C.g3); rect(ctx, cx - 2, base - 22, 1, 14, C.g4); rect(ctx, cx + 1, base - 22, 1, 14, C.g2);
  ellipse(ctx, cx, base - 22, 6, 2, C.g4); ellipse(ctx, cx, base - 22, 4.5, 1.2, C.b2);
  // Jorros.
  for (const s of [-1, 1]) { ctx.strokeStyle = C.b4; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(cx + s * 4, base - 22); ctx.quadraticCurveTo(cx + s * 9, base - 22, cx + s * 10, base - 10); ctx.stroke(); }
  rect(ctx, cx - 0.5, base - 27, 1, 5, C.b4); px(ctx, cx, base - 28, C.white);
  grassTufts(ctx, cx - 18, base + 1, 36, { seed: 9, flowers: 0.25 });
}

// ---------- Ruínas e lugares antigos ----------

function ruins(ctx) {
  const r = rng(4);
  // Muro baixo quebrado com arco desabado, colunas de alturas diferentes e mato.
  ctx.save(); ctx.translate(3, 26); stones(ctx, 42, 17, { seed: 11, moss: 0.8, cracks: 0.4 }); ctx.restore();
  // Topo irregular (quebrado).
  for (let x = 3; x < 45; x += 1) { const hgt = Math.round(2 + Math.abs(Math.sin(x * 0.7)) * 3 + r() * 1.5); rect(ctx, x, 26, 1, hgt, 'rgba(0,0,0,0)'); }
  ctx.save(); ctx.globalCompositeOperation = 'destination-out';
  fillPoly(ctx, [[3, 25], [10, 25], [12, 28], [15, 27], [19, 30], [24, 29], [28, 31], [33, 28], [38, 29], [45, 26], [45, 24], [3, 24]], '#000');
  fillPoly(ctx, [[18, 44], [18, 36], [21, 33], [26, 33], [29, 36], [29, 44]], '#000');
  ctx.restore();
  rect(ctx, 19, 36, 10, 8, C.ink); ellipse(ctx, 23.5, 36, 5, 3, C.ink);
  for (const [x, top, w] of [[5, 6, 7], [33, 12, 7], [14, 18, 5]]) {
    ctx.save(); ctx.translate(x, top + 2); stones(ctx, w, 27 - top, { seed: x, rowH: [4, 5], blockW: [w, w + 1], moss: 0.6 }); ctx.restore();
    rect(ctx, x - 1, top, w + 2, 3, C.g4); rect(ctx, x - 1, top, w + 2, 1, C.slate4); rect(ctx, x + w, top, 1, 3, C.g2);
    veil(ctx, [[x, top], [x + w, top], [x + w, 30], [x, 30]], x, 0, x + w, 0, [[0, 'rgba(255,236,190,0.15)'], [1, 'rgba(26,25,50,0.35)']]);
  }
  // Hera subindo.
  for (const x of [7, 35, 26]) for (let y = 16 + (x % 5); y < 40; y += 1) if (r() < 0.75) px(ctx, x + Math.round(Math.sin(y * 0.8)), y, r() < 0.4 ? C.m3 : C.m1);
  // Blocos caídos.
  for (const [x, y] of [[40, 41], [2, 42], [30, 43]]) { rect(ctx, x, y, 5, 3, C.g3); rect(ctx, x, y, 5, 1, C.g4); rect(ctx, x + 4, y, 1, 3, C.g2); }
  grassTufts(ctx, 0, 44, 48, { seed: 5, density: 0.6, flowers: 0.15 });
}

function pillar(ctx, lit) {
  // Pilar rúnico: base, fuste com sulcos, capitel e a runa (acende quando ativado).
  stoneBlock3(ctx, 9, 24, 14, 3, 2, { seed: 2 });
  ctx.save(); ctx.translate(11, 6); stones(ctx, 10, 18, { pal: STONE_COOL, seed: 3, rowH: [6, 6], blockW: [10, 10], moss: 0.5 }); ctx.restore();
  for (const x of [13, 16, 19]) rect(ctx, x, 7, 1, 17, 'rgba(26,25,50,0.3)');
  veil(ctx, [[11, 6], [21, 6], [21, 24], [11, 24]], 11, 0, 21, 0, [[0, 'rgba(255,236,190,0.18)'], [1, 'rgba(26,25,50,0.45)']]);
  rect(ctx, 9, 3, 14, 3, C.slate3); rect(ctx, 9, 3, 14, 1, C.slate4); rect(ctx, 9, 5, 14, 1, C.slate);
  const glyph = lit ? C.f4 : C.navy;
  fillPoly(ctx, [[16, 11], [18.5, 14], [16, 18], [13.5, 14]], lit ? C.f2 : C.deep);
  rect(ctx, 15.5, 12, 1, 5, glyph); rect(ctx, 14.5, 14, 3, 1, glyph);
  if (lit) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(16, 14, 0, 16, 14, 9); g.addColorStop(0, 'rgba(255,200,80,0.5)'); g.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = g; ctx.fillRect(4, 4, 24, 22); ctx.restore();
    px(ctx, 16, 12, C.white);
  }
  grassTufts(ctx, 7, 30, 18, { seed: 6 });
}

function altar(ctx) {
  // Altar de pedra com toalha, velas acesas e a esfera dourada flutuando.
  stoneBlock3(ctx, 7, 20, 26, 11, 4, { seed: 4 });
  rect(ctx, 14, 24, 12, 8, C.r1); rect(ctx, 14, 24, 12, 1, C.r3); for (let x = 14; x < 26; x += 2) px(ctx, x, 31, C.f3);
  for (const x of [9, 30]) { rect(ctx, x, 17, 2, 4, C.paper); rect(ctx, x + 1, 17, 1, 4, C.cream); torchFlame(ctx, x + 1, 17, 0.6); }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(20, 11, 0, 20, 11, 11); g.addColorStop(0, 'rgba(255,220,120,0.45)'); g.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.fillStyle = g; ctx.fillRect(6, 0, 28, 24); ctx.restore();
  ellipse(ctx, 20, 11, 5, 5, GOLD.dark); ellipse(ctx, 19.6, 10.6, 4.2, 4.2, GOLD.mid); ellipse(ctx, 19, 10, 2.6, 2.6, GOLD.light); ellipse(ctx, 18.3, 9.2, 1, 1, C.white);
  for (const [x, y] of [[13, 6], [27, 8], [24, 3]]) px(ctx, x, y, C.f4);
  grassTufts(ctx, 5, 36, 30, { seed: 7 });
}

function bridge(ctx, fixed) {
  // Ponte de tábuas sobre o rio; quebrada no meio até ser consertada.
  const top = 21;
  for (let y = 25; y < 40; y += 1) for (let x = 0; x < 48; x += 1) {
    const v = Math.sin(x * 0.5 + y * 1.3) + Math.sin(x * 0.17 - y * 0.6);
    px(ctx, x, y, y < 27 || y > 37 ? C.b1 : v > 1.2 ? C.b3 : v > -0.4 ? C.b2 : C.b1);
  }
  for (let x = 2; x < 46; x += 7) { px(ctx, x, 30, C.b4); px(ctx, x + 1, 30, C.white); }
  rect(ctx, 0, 24, 48, 2, C.m1); rect(ctx, 0, 38, 48, 2, C.m1);
  const deck = (x0, x1) => {
    for (let x = x0; x < x1; x += 4) { rect(ctx, x, top, 3, 9, C.w4); rect(ctx, x, top, 3, 1, C.w6); rect(ctx, x + 2, top, 1, 9, C.w2); px(ctx, x + 1, top + 2, C.g1); }
    for (const px0 of [x0, x1 - 2]) { rect(ctx, px0, top + 6, 2, 12, C.w2); rect(ctx, px0, top + 6, 1, 12, C.w3); }
    rect(ctx, x0, top - 4, x1 - x0, 1, C.w4); rect(ctx, x0, top - 3, x1 - x0, 1, C.w2);
    for (let x = x0; x < x1; x += 8) rect(ctx, x, top - 4, 1, 4, C.w3);
    rect(ctx, x0, top + 9, x1 - x0, 1, 'rgba(26,25,50,0.5)');
  };
  if (fixed) { deck(1, 47); for (let x = 19; x < 29; x += 4) rect(ctx, x, top, 3, 9, C.w6); }
  else {
    deck(1, 20); deck(30, 47);
    line(ctx, 20, top + 2, 24, top + 12, C.w3, 1.5); line(ctx, 30, top + 1, 27, top + 10, C.w2, 1.5);
    rect(ctx, 22, 31, 3, 1, C.w4);
  }
}

function crypt(ctx) {
  // Cripta: mausoléu de pedra escura com frontão, colunas, porta de ferro e velas.
  const x = 6; const base = 43; const w = 36; const h = 22; const d = 10;
  const { fy } = box(ctx, { x, base, w, h, d, front: (c, ww, hh) => stones(c, ww, hh, { pal: STONE_DARK, seed: 21, moss: 0.7, cracks: 0.35 }), side: (c, ww, hh) => stones(c, ww, hh, { pal: STONE_DARK, seed: 22 }) });
  frontGable(ctx, { cx: x + w / 2, wallTop: fy + 1, w: w + 2, d, rise: 12, over: 2, drop: 1, roof: (c, ww, hh) => tiles(c, ww, hh, { pal: ROOF_SLATE, seed: 4, moss: 1 }), pediment: (c, ww, hh) => stones(c, ww, hh, { pal: STONE_DARK, seed: 23 }) });
  // Cruz/emblema no frontão.
  rect(ctx, x + w / 2 - 0.5, fy - 9, 1, 6, C.g4); rect(ctx, x + w / 2 - 2, fy - 7, 4, 1, C.g4);
  for (const cx of [x + 4, x + w - 7]) { rect(ctx, cx, fy + 2, 3, h - 2, C.g3); rect(ctx, cx, fy + 2, 1, h - 2, C.g4); rect(ctx, cx + 2, fy + 2, 1, h - 2, C.g1); rect(ctx, cx - 1, fy + 1, 5, 1, C.g4); }
  rect(ctx, x + 12, base - 14, 12, 14, C.ink); ellipse(ctx, x + 18, base - 14, 6, 3, C.ink);
  for (let k = x + 13; k < x + 24; k += 2) rect(ctx, k, base - 15, 1, 15, C.g1);
  rect(ctx, x + 12, base - 9, 12, 1, C.g2);
  for (const cx of [x + 9, x + 27]) { rect(ctx, cx, base - 3, 2, 3, C.paper); torchFlame(ctx, cx + 1, base - 3, 0.5); }
  veil(ctx, [[x, fy], [x + w, fy], [x + w, base], [x, base]], x, fy, x + w, base, [[0, 'rgba(255,236,190,0.08)'], [1, 'rgba(26,25,50,0.3)']]);
  grassTufts(ctx, 2, base + 1, 44, { seed: 9 });
}

function tomb(ctx) {
  // Lápide arredondada com rachadura, musgo, flores e vela.
  stoneBlock3(ctx, 4, 20, 24, 6, 3, { seed: 5 });
  const pts = [];
  for (let i = 0; i <= 12; i += 1) { const a = Math.PI + (i / 12) * Math.PI; pts.push([16 + Math.cos(a) * 8, 12 + Math.sin(a) * 9]); }
  pts.push([24, 21], [8, 21]);
  fillPoly(ctx, pts, C.g3);
  clip(ctx, pts, () => { ctx.save(); ctx.translate(8, 3); stones(ctx, 16, 18, { seed: 7, rowH: [18, 18], blockW: [16, 16], moss: 0.8 }); ctx.restore(); });
  veil(ctx, pts, 8, 0, 24, 0, [[0, 'rgba(255,236,190,0.18)'], [1, 'rgba(26,25,50,0.4)']]);
  rect(ctx, 15, 7, 2, 9, C.g1); rect(ctx, 12, 9, 8, 2, C.g1); rect(ctx, 15, 7, 1, 9, C.g2);
  line(ctx, 20, 5, 18.5, 12, C.wg0, 0.7);
  ellipse(ctx, 16, 2.5, 2.4, 2.4, GOLD.mid); ellipse(ctx, 15.6, 2.1, 1.3, 1.3, GOLD.hi);
  for (const [x, c] of [[7, C.red], [10, C.f3], [24, C.paper]]) { px(ctx, x, 28, C.m2); px(ctx, x, 27, c); }
  grassTufts(ctx, 3, 30, 26, { seed: 4 });
}

function mineSite(ctx) {
  // Boca de mina na encosta: rocha, escoras e lintel de madeira, trilhos, carrinho com minério e lampião.
  boulder(ctx, [[1, 36], [4, 18], [10, 8], [18, 4], [28, 6], [35, 14], [39, 36]], { seed: 3, pal: { ...STONE, tones: [C.wg3, C.g3], light: C.g4, shade: C.wg2, deep: C.wg1, hi: C.slate4 } });
  mossPatches(ctx, 40, 18, { seed: 4, count: 4 });
  rect(ctx, 11, 16, 18, 20, C.night); ellipse(ctx, 20, 16, 9, 3, C.night);
  const g = ctx.createLinearGradient(0, 16, 0, 36); g.addColorStop(0, 'rgba(14,7,27,1)'); g.addColorStop(1, 'rgba(57,31,33,1)');
  ctx.fillStyle = g; ctx.fillRect(12, 18, 16, 18);
  for (const [x, s] of [[9, 0], [28, 1]]) { rect(ctx, x, 14, 3, 22, s ? C.w2 : C.w3); rect(ctx, x, 14, 1, 22, s ? C.w3 : C.w5); }
  rect(ctx, 7, 12, 26, 3, C.w4); rect(ctx, 7, 12, 26, 1, C.w6); rect(ctx, 7, 14, 26, 1, C.w1);
  px(ctx, 9, 13, C.g1); px(ctx, 30, 13, C.g1);
  // Trilhos.
  for (let y = 30; y < 37; y += 2) rect(ctx, 13, y, 14, 1, C.w2);
  rect(ctx, 15, 28, 1, 9, C.g3); rect(ctx, 24, 28, 1, 9, C.g3);
  // Carrinho com minério.
  fillPoly(ctx, [[14, 26], [26, 26], [25, 31], [15, 31]], C.g2); rect(ctx, 14, 26, 12, 1, C.g4);
  for (const [x, y, c] of [[16, 25, C.f3], [19, 24, C.g4], [22, 25, C.f2], [24, 25, C.g3]]) ellipse(ctx, x, y, 1.5, 1.2, c);
  for (const x of [16, 24]) ellipse(ctx, x, 32, 1.3, 1.3, C.g1);
  lanternBox(ctx, 32, 18);
  rect(ctx, 33.5, 16, 1, 2, C.g1);
  grassTufts(ctx, 0, 37, 40, { seed: 5 });
}

function anvilSite(ctx) {
  // Bigorna lendária num toco, martelo apoiado e brasas.
  ellipse(ctx, 16, 25, 8, 2.5, C.w5);
  rect(ctx, 8, 25, 16, 4, C.w3); rect(ctx, 8, 25, 1, 4, C.w4); rect(ctx, 23, 25, 1, 4, C.w1);
  ellipse(ctx, 16, 25, 6, 1.6, C.w4); ellipse(ctx, 16, 25, 3, 0.8, C.w3);
  rect(ctx, 12, 19, 8, 5, C.g1); rect(ctx, 12, 19, 1, 5, C.g2);
  fillPoly(ctx, [[5, 14], [25, 14], [23, 19], [9, 19]], C.g2);
  rect(ctx, 5, 13, 22, 2, C.g4); rect(ctx, 5, 13, 22, 1, C.slate4);
  fillPoly(ctx, [[26, 13], [31, 15], [26, 16]], C.g3);
  rect(ctx, 5, 18, 18, 1, C.g1);
  line(ctx, 19, 13, 22, 4, C.w4, 1.4); rect(ctx, 19, 2, 7, 3, C.g2); rect(ctx, 19, 2, 7, 1, C.g4);
  for (const [x, y] of [[7, 28], [26, 29], [4, 30]]) { px(ctx, x, y, C.f2); px(ctx, x + 1, y, C.r3); }
  grassTufts(ctx, 3, 30, 26, { seed: 6 });
}

function fortress(ctx) {
  // Fortaleza sombria: muralha escura com ameias, duas torres, portão de ferro e janelas em brasa.
  const DARK = { ...STONE_DARK };
  ctx.save(); ctx.translate(4, 16); stones(ctx, 40, 28, { pal: DARK, seed: 31, moss: 0.3, cracks: 0.4 }); ctx.restore();
  rect(ctx, 4, 13, 40, 3, C.g2); rect(ctx, 4, 13, 40, 1, C.g3);
  for (let x = 4; x < 44; x += 7) { ctx.save(); ctx.translate(x, 8); stones(ctx, 4, 5, { pal: DARK, seed: x, rowH: [3, 3], blockW: [4, 4] }); ctx.restore(); rect(ctx, x, 8, 4, 1, C.g3); }
  for (const x of [1, 37]) {
    ctx.save(); ctx.translate(x, 6); stones(ctx, 10, 38, { pal: DARK, seed: x + 40, cracks: 0.3 }); ctx.restore();
    rect(ctx, x - 1, 3, 12, 3, C.g2); rect(ctx, x - 1, 3, 12, 1, C.g3);
    for (let k = x - 1; k < x + 11; k += 4) rect(ctx, k, 0, 2, 3, C.g2);
    rect(ctx, x + 4, 14, 2, 4, C.f1); px(ctx, x + 4, 14, C.f3);
    veil(ctx, [[x, 6], [x + 10, 6], [x + 10, 44], [x, 44]], x, 0, x + 10, 0, [[0, 'rgba(255,236,190,0.1)'], [1, 'rgba(26,25,50,0.45)']]);
  }
  rect(ctx, 18, 28, 12, 16, C.night); ellipse(ctx, 24, 28, 6, 3, C.night);
  for (let k = 19; k < 30; k += 2) rect(ctx, k, 26, 1, 18, C.g1);
  rect(ctx, 18, 33, 12, 1, C.g1);
  rect(ctx, 22, 19, 4, 3, C.f1); px(ctx, 22, 19, C.f3);
  rect(ctx, 23.5, 6, 1, 8, C.w1); fillPoly(ctx, [[24.5, 6], [31, 8], [24.5, 10]], C.r1);
  grassTufts(ctx, 0, 44, 48, { seed: 2, density: 0.2 });
}

function portal(ctx) {
  // Portal de brasa: dois pilares de rocha escura, arco com runas e o véu de fogo girando.
  const DARK = STONE_DARK;
  for (const x of [3, 36]) { ctx.save(); ctx.translate(x, 8); stones(ctx, 9, 36, { pal: DARK, seed: x, rowH: [5, 6], blockW: [9, 9], cracks: 0.4 }); ctx.restore(); veil(ctx, [[x, 8], [x + 9, 8], [x + 9, 44], [x, 44]], x, 0, x + 9, 0, [[0, 'rgba(255,200,150,0.12)'], [1, 'rgba(26,25,50,0.45)']]); }
  rect(ctx, 2, 3, 44, 6, C.g2); rect(ctx, 2, 3, 44, 1, C.g3); rect(ctx, 2, 8, 44, 1, C.ink);
  for (let x = 6; x < 44; x += 6) { rect(ctx, x, 5, 2, 2, C.f1); px(ctx, x, 5, C.f3); }
  ctx.save(); ctx.beginPath(); ctx.ellipse(24, 28, 12, 17, 0, 0, Math.PI * 2); ctx.rect(12, 9, 24, 35); ctx.clip();
  const g = ctx.createRadialGradient(24, 28, 1, 24, 28, 16);
  g.addColorStop(0, C.f4); g.addColorStop(0.25, C.f2); g.addColorStop(0.55, C.r3); g.addColorStop(0.85, C.r1); g.addColorStop(1, C.ink);
  ctx.fillStyle = g; ctx.fillRect(12, 9, 24, 35);
  ctx.strokeStyle = C.f3; ctx.lineWidth = 0.8;
  for (let i = 0; i < 3; i += 1) { ctx.beginPath(); ctx.arc(24, 28, 4 + i * 4, i, i + 2.4); ctx.stroke(); }
  ctx.restore();
  for (const [x, y] of [[14, 40], [33, 38], [20, 12], [30, 14]]) px(ctx, x, y, C.f4);
}

function books(ctx) {
  // Estante de pedra com livros antigos, vela e pergaminho.
  stoneBlock3(ctx, 3, 17, 26, 9, 3, { seed: 8 });
  const colors = [[C.r1, C.r3], [C.b1, C.b2], [C.m1, C.m2], [C.w2, C.w4], [C.wine, C.red]];
  colors.forEach(([d0, l0], i) => {
    const x = 6 + i * 4; const hgt = 9 + (i % 2);
    rect(ctx, x, 17 - hgt + 2, 3, hgt, d0); rect(ctx, x, 17 - hgt + 2, 1, hgt, l0);
    rect(ctx, x, 17 - hgt + 4, 3, 1, C.f3);
  });
  fillPoly(ctx, [[26, 17], [27, 9], [29, 10], [28, 17]], C.paper);
  rect(ctx, 3, 15, 2, 3, C.paper); torchFlame(ctx, 4, 15, 0.5);
  grassTufts(ctx, 2, 30, 28, { seed: 3 });
}

function mural(ctx) {
  // Muro com pintura antiga (dragão sobre a montanha) desbotada e rachada.
  ctx.save(); ctx.translate(2, 6); stones(ctx, 44, 37, { seed: 41, moss: 0.6, cracks: 0.3 }); ctx.restore();
  rect(ctx, 1, 3, 46, 3, C.g4); rect(ctx, 1, 3, 46, 1, C.slate4); rect(ctx, 1, 5, 46, 1, C.g2);
  rect(ctx, 6, 9, 36, 28, C.wg2); rect(ctx, 7, 10, 34, 26, C.cream);
  for (let i = 0; i < 60; i += 1) px(ctx, 7 + (i * 13) % 34, 10 + (i * 7) % 26, C.peach);
  fillPoly(ctx, [[7, 36], [18, 20], [26, 30], [33, 22], [41, 36]], C.wg3);
  fillPoly(ctx, [[18, 20], [21, 24], [15, 24]], C.white);
  fillPoly(ctx, [[20, 18], [28, 13], [35, 16], [30, 17], [26, 20]], C.r1);
  fillPoly(ctx, [[24, 15], [28, 9], [29, 14]], C.r3); px(ctx, 33, 15, C.f3);
  for (let i = 0; i < 5; i += 1) ellipse(ctx, 11 + i * 6, 13, 1.6, 1.6, [C.m2, C.b2, C.slate3, C.f3, C.f1][i]);
  line(ctx, 30, 10, 26, 36, C.wg1, 0.7);
  grassTufts(ctx, 0, 44, 48, { seed: 6, density: 0.5 });
}

function chest(ctx, { base = 28 } = {}) {
  // Baú de tesouro: tampa abaulada de tábuas, cantoneiras e ferragens douradas, fechadura.
  const x = 5; const w = 22; const lidY = base - 18;
  ctx.save(); ctx.translate(x, lidY + 7); planks(ctx, w, 11, { seed: 3, size: 4, pal: WOOD, nails: false }); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.ellipse(x + w / 2, lidY + 7, w / 2, 6, 0, Math.PI, 0); ctx.closePath(); ctx.clip();
  ctx.translate(x, lidY); planks(ctx, w, 8, { seed: 5, size: 3, pal: WOOD, nails: false }); ctx.restore();
  const g = ctx.createLinearGradient(0, lidY, 0, lidY + 7); g.addColorStop(0, 'rgba(255,240,200,0.25)'); g.addColorStop(1, 'rgba(26,25,50,0.2)');
  ctx.save(); ctx.beginPath(); ctx.ellipse(x + w / 2, lidY + 7, w / 2, 6, 0, Math.PI, 0); ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ctx.restore();
  rect(ctx, x, lidY + 7, w, 2, C.w1);
  for (const bx of [x + 2, x + w - 4]) {
    rect(ctx, bx, lidY + 1, 2, 17, GOLD.mid); rect(ctx, bx, lidY + 1, 1, 17, GOLD.light);
    for (const y of [lidY + 4, lidY + 11, lidY + 15]) px(ctx, bx + 1, y, C.r0);
  }
  rect(ctx, x, base - 2, w, 2, GOLD.mid); rect(ctx, x, base - 2, w, 1, GOLD.light);
  rect(ctx, x + w / 2 - 3, lidY + 6, 6, 7, GOLD.mid); rect(ctx, x + w / 2 - 3, lidY + 6, 6, 1, GOLD.hi); rect(ctx, x + w / 2 - 3, lidY + 6, 1, 7, GOLD.light);
  rect(ctx, x + w / 2 - 1, lidY + 9, 2, 3, C.w0); px(ctx, x + w / 2 - 1, lidY + 8, GOLD.dark);
  veil(ctx, [[x, lidY], [x + w, lidY], [x + w, base], [x, base]], x, 0, x + w, 0, [[0, 'rgba(255,236,190,0.08)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(26,25,50,0.35)']]);
  px(ctx, x + 3, lidY + 2, C.white);
}

function mineMarker(ctx) {
  // Mina do Vale (estrutura de coleta, 32 px): encosta, escoras, trilhos e lampião.
  boulder(ctx, [[1, 29], [3, 14], [9, 5], [16, 3], [24, 5], [29, 12], [31, 29]], { seed: 8, pal: { ...STONE, tones: [C.wg3, C.g3], light: C.g4, shade: C.wg2, deep: C.wg1, hi: C.slate4 } });
  mossPatches(ctx, 32, 12, { seed: 2, count: 3 });
  rect(ctx, 9, 13, 14, 16, C.night);
  const g = ctx.createLinearGradient(0, 13, 0, 29); g.addColorStop(0, C.night); g.addColorStop(1, C.w1);
  ctx.fillStyle = g; ctx.fillRect(10, 15, 12, 14);
  for (const [x, s] of [[7, 0], [22, 1]]) { rect(ctx, x, 11, 3, 18, s ? C.w2 : C.w3); rect(ctx, x, 11, 1, 18, s ? C.w3 : C.w5); }
  rect(ctx, 6, 9, 20, 3, C.w4); rect(ctx, 6, 9, 20, 1, C.w6); rect(ctx, 6, 11, 20, 1, C.w1);
  for (let y = 24; y < 30; y += 2) rect(ctx, 11, y, 10, 1, C.w2);
  rect(ctx, 12, 22, 1, 8, C.g3); rect(ctx, 19, 22, 1, 8, C.g3);
  lanternBox(ctx, 25, 13);
  for (const [x, y] of [[4, 27], [27, 26]]) { ellipse(ctx, x, y, 1.6, 1.2, C.g3); px(ctx, x - 1, y - 1, C.f3); }
}

function dungeonEntrance(ctx) {
  // Portal da masmorra do Dragão: rocha negra com runas vermelhas, escadaria descendo e brilho de brasa.
  const DARK = STONE_DARK;
  const pts = [[1, 30], [3, 9], [10, 3], [30, 3], [37, 9], [39, 30]];
  fillPoly(ctx, pts, C.g1);
  clip(ctx, pts, () => { ctx.save(); ctx.translate(0, 2); stones(ctx, 40, 28, { pal: DARK, seed: 5, cracks: 0.5 }); ctx.restore(); });
  veil(ctx, pts, 0, 0, 40, 30, [[0, 'rgba(255,200,150,0.1)'], [1, 'rgba(26,25,50,0.45)']]);
  ctx.save(); ctx.beginPath(); ctx.ellipse(20, 18, 9, 12, 0, 0, Math.PI * 2); ctx.rect(11, 18, 18, 12); ctx.clip();
  rect(ctx, 0, 0, 40, 30, C.night);
  for (let y = 20, k = 0; y < 30; y += 2, k += 1) { rect(ctx, 12 + k, y, 16 - 2 * k, 1, C.g1); }
  const g = ctx.createRadialGradient(20, 23, 0, 20, 23, 8); g.addColorStop(0, 'rgba(234,50,60,0.75)'); g.addColorStop(1, 'rgba(234,50,60,0)');
  ctx.fillStyle = g; ctx.fillRect(10, 12, 20, 18);
  ctx.restore();
  for (const [x, y] of [[6, 14], [6, 20], [33, 14], [33, 20], [20, 5]]) { rect(ctx, x, y, 2, 2, C.red); px(ctx, x, y, C.f4); }
  for (let i = 0; i <= 8; i += 1) { const a = Math.PI + (i / 8) * Math.PI; rect(ctx, 20 + Math.cos(a) * 10 - 1, 18 + Math.sin(a) * 13 - 1, 2, 2, i % 2 ? C.g2 : C.g3); }
}

const S = (size, paint) => ({ w: size, h: size, paint, shadow: [size / 2, Math.round(size * 0.9), size * 0.42, Math.max(1.6, size / 16)] });

export const SITE_PIECES = {
  'site-well': S(32, well),
  'site-crates': S(32, crates),
  'site-cart': S(40, cart),
  'site-tent': S(32, tentPaint([C.w3, C.w4, C.sand], C.r3)),
  'site-merchantTent': S(32, tentPaint([C.r0, C.wine, C.red], C.f3)),
  'site-banner': S(32, bannerPost),
  'site-sign': S(32, signPost),
  'site-cabin': S(40, cabin),
  'site-fountain': S(40, fountain),
  'site-ruins': S(48, ruins),
  'site-pillar': S(32, (c) => pillar(c, false)),
  'site-pillarLit': S(32, (c) => pillar(c, true)),
  'site-altar': S(40, altar),
  'site-bridge': { w: 48, h: 48, paint: (c) => bridge(c, false) },
  'site-bridgeFixed': { w: 48, h: 48, paint: (c) => bridge(c, true) },
  'site-crypt': S(48, crypt),
  'site-tomb': S(32, tomb),
  'site-mine': S(40, mineSite),
  'site-anvil': S(32, anvilSite),
  'site-fortress': S(48, fortress),
  'site-portal': S(48, portal),
  'site-books': S(32, books),
  'site-mural': S(48, mural),
  'site-chestSmall': S(32, chest),
  'harvest-chest': S(32, chest),
  'harvest-mineMarker': { w: 32, h: 32, shadow: [16, 29, 15, 2.4], paint: mineMarker },
  'dungeon-entrance': { w: 40, h: 30, shadow: [20, 28, 18, 2], paint: dungeonEntrance }
};
