// Prédios do acampamento (atlas "buildings"): casa, ferreiro, fazenda e mercado em 3 estágios,
// fogueira (3 estágios x 4 quadros), cerca e lampião. Item 19 (escala do herói, 56x64): estágio 1 em
// 144x150 (base y=126), estágio 4 em 168x176 (base 148), estágio 8 em 200x200 (base 168); origem 0.5, 0.84.
import {
  C, STONE, STONE_COOL, STONE_DARK, WOOD, WOOD_DARK, WOOD_RED, ROOF_RED, ROOF_SLATE, ROOF_BLUE, ROOF_WOOD, THATCH,
  rng, rect, px, line, ellipse, fillPoly, clip, veil, stones, planks, logs, tiles, thatch, mossBand, mossPatches,
  windowLit, windowDark, door, barrel, crate, sack, woodpile, hangingSign, lanternBox, chimney, box, gableRoof, frontGable,
  baseShade, grassTufts, mixHex, KX, KY, scaled, enlarge
} from './kit.mjs';

// ---------- Materiais compostos ----------

/** Reboco claro com manchas, rachaduras e reboco caído mostrando tijolo/pedra. */
function plaster(ctx, w, h, { seed = 21, tone = C.cream } = {}) {
  const r = rng(seed);
  rect(ctx, 0, 0, w, h, tone);
  for (let i = 0; i < w * h / 6; i += 1) px(ctx, r.int(0, w - 1), r.int(0, h - 1), r() < 0.6 ? C.peach : C.paper);
  for (let i = 0; i < Math.max(2, Math.round(w * h / 500)); i += 1) {
    const x = r.int(2, w - 6); const y = r.int(2, h - 4);
    rect(ctx, x, y, 4, 2, C.w5); rect(ctx, x, y, 4, 1, C.w4); px(ctx, x + 2, y + 1, C.w3);
  }
  rect(ctx, 0, h - 1, w, 1, C.peach);
}

/** Enxaimel: vigas de madeira escura sobre o reboco. */
function timber(ctx, w, h, posts, { diag = true, beam = 2, pw = 2, seed = 5 } = {}) {
  const P = WOOD_DARK;
  const r = rng(seed);
  rect(ctx, 0, 0, w, beam, P.tones[0]); rect(ctx, 0, 0, w, 1, P.light);
  rect(ctx, 0, h - beam, w, beam, P.tones[0]); rect(ctx, 0, h - beam, w, 1, P.light); rect(ctx, 0, h - 1, w, 1, P.gap);
  if (beam > 3) for (let x = r.int(2, 9); x < w; x += r.int(6, 14)) { rect(ctx, x, 2, r.int(3, 7), 1, P.dark); rect(ctx, x + 2, h - beam + 2, r.int(3, 6), 1, P.dark); }
  if (diag) {
    for (let i = 0; i < posts.length - 1; i += 1) {
      const a = posts[i] + pw; const b = posts[i + 1];
      if (b - a < 8 + pw * 2) continue;
      const lean = pw > 2 ? (b - a) * 0.35 : 4;
      line(ctx, a, beam, a + lean, h - beam, P.tones[0], pw > 2 ? pw - 1 : 1.6);
      line(ctx, b, beam, b - lean, h - beam, P.tones[0], pw > 2 ? pw - 1 : 1.6);
    }
  }
  for (const x of posts) {
    rect(ctx, x, 0, pw, h, P.tones[0]); rect(ctx, x, 0, 1, h, P.light); rect(ctx, x + pw, 0, 1, h, 'rgba(28,18,28,0.35)');
    if (pw > 2) { rect(ctx, x + pw - 1, 0, 1, h, P.dark); for (let y = r.int(2, 8); y < h; y += r.int(5, 11)) rect(ctx, x + 1 + r.int(0, pw - 3), y, 1, r.int(2, 5), P.dark); px(ctx, x + Math.floor(pw / 2), beam + 1, C.g1); px(ctx, x + Math.floor(pw / 2), h - beam - 2, C.g1); }
  }
}

function stonePainter(opts) { return (ctx, w, h) => stones(ctx, w, h, opts); }
function roofPainter(opts) { return (ctx, w, h) => tiles(ctx, w, h, opts); }

/** Parede da frente: base de pedra até `stoneH` e o resto por `upper`. */
function mixedWall(stoneOpts, stoneH, upper) {
  return (ctx, w, h) => {
    if (upper) { upper(ctx, w, h - stoneH); }
    ctx.save(); ctx.translate(0, h - stoneH); stones(ctx, w, stoneH, stoneOpts); ctx.restore();
    rect(ctx, 0, h - stoneH, w, 1, C.g4);
  };
}

/** Luz geral na fachada: um pouco mais clara à esquerda, escurece embaixo. */
function frontLight(ctx, x, fy, w, base) {
  veil(ctx, [[x, fy], [x + w, fy], [x + w, base], [x, base]], x, fy, x + w, base,
    [[0, 'rgba(255,236,190,0.10)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(26,25,50,0.22)']]);
  baseShade(ctx, x, base, w, 3);
}

/** Sombra do beiral sobre a parede. */
function eaveShadow(ctx, x, y, w) {
  rect(ctx, x, y, w, 2, 'rgba(26,25,50,0.45)');
  rect(ctx, x, y + 2, w, 1, 'rgba(26,25,50,0.2)');
}

// ---------- Item 19: peças na escala do herói (56x64, ~58 px de altura) ----------
// Porta ~1,3x o herói (72–76 px), casa 2–3x. Tudo pintado em pixels finais (materiais no pixel final);
// props pequenos (barril, caixote, saco, bigorna...) usam `scaled` sobre o desenho antigo.

/** Sombra do beiral mais funda (prédios grandes). */
export function eaveShade(ctx, x, y, w, depth = 5) {
  rect(ctx, x, y, w, depth, 'rgba(26,25,50,0.42)');
  rect(ctx, x, y + depth, w, 2, 'rgba(26,25,50,0.18)');
}

/** Luz na fachada grande e oclusão de 5 px na base. */
export function wallLight(ctx, x, fy, w, base) {
  veil(ctx, [[x, fy], [x + w, fy], [x + w, base], [x, base]], x, fy, x + w, base,
    [[0, 'rgba(255,236,190,0.12)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(26,25,50,0.24)']]);
  baseShade(ctx, x, base, w, 6);
}

/** Porta grande: batente, folha(s) de tábuas, ferragens com cravos, argola e degrau de pedra. */
export function bigDoor(ctx, x, y, w, h, { pal = WOOD_DARK, arch = true, seed = 11, step = true, jamb = 'wood', double = false } = {}) {
  const ah = arch ? Math.round(w * 0.32) : 0;
  if (jamb === 'stone') {
    ctx.save(); ctx.beginPath(); ctx.rect(x - 6, y - 2, w + 12, h + 2); if (arch) ctx.ellipse(x + w / 2, y, w / 2 + 6, ah + 6, 0, Math.PI, 0); ctx.clip();
    ctx.translate(x - 6, y - ah - 6); stones(ctx, w + 12, h + ah + 8, { seed: seed + 3, rowH: [5, 6], blockW: [6, 9] }); ctx.restore();
    if (arch) for (let i = 0; i <= 8; i += 1) {
      const a = Math.PI + (i / 8) * Math.PI;
      const ax = x + w / 2 + Math.cos(a) * (w / 2 + 3); const ay = y + Math.sin(a) * (ah + 3);
      ellipse(ctx, ax, ay, 3, 3, i % 2 ? C.g3 : C.g4); px(ctx, ax - 1, ay - 1, C.slate4);
    }
  } else {
    rect(ctx, x - 4, y - 2, w + 8, h + 2, C.w2); rect(ctx, x - 4, y - 2, 2, h + 2, C.w4); rect(ctx, x + w + 2, y - 2, 2, h + 2, C.w1);
    if (arch) { ellipse(ctx, x + w / 2, y, w / 2 + 4, ah + 4, C.w2); ellipse(ctx, x + w / 2, y - 1, w / 2 + 2, ah + 2, C.w3); }
    else { rect(ctx, x - 7, y - 7, w + 14, 5, C.w3); rect(ctx, x - 7, y - 7, w + 14, 1, C.w5); rect(ctx, x - 7, y - 3, w + 14, 1, C.w1); }
  }
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); if (arch) ctx.ellipse(x + w / 2, y, w / 2, ah, 0, Math.PI, 0); ctx.clip();
  rect(ctx, x, y - ah, w, h + ah, C.w0);
  ctx.save(); ctx.translate(x, y - ah); planks(ctx, w, h + ah, { pal, seed, vertical: true, size: 5, nails: false, worn: 0.06 }); ctx.restore();
  rect(ctx, x, y - ah, 2, h + ah, 'rgba(14,7,27,0.5)');
  rect(ctx, x, y - ah, w, 3, 'rgba(14,7,27,0.4)');
  if (double) { rect(ctx, x + w / 2 - 1, y - ah, 2, h + ah, C.w0); rect(ctx, x + w / 2 + 1, y - ah, 1, h + ah, pal.light); }
  ctx.restore();
  for (const hy of [y + Math.round(h * 0.15), y + Math.round(h * 0.75)]) {
    const segs = double ? [[x + 1, w / 2 - 3], [x + w / 2 + 2, w / 2 - 3]] : [[x, Math.round(w * 0.74)]];
    for (const [sx, sw] of segs) {
      rect(ctx, sx, hy, sw, 4, C.g1); rect(ctx, sx, hy, sw, 1, C.g3);
      for (let k = sx + 2; k < sx + sw - 1; k += 5) px(ctx, k, hy + 2, C.g4);
      ellipse(ctx, double && sx > x + w / 2 ? sx + sw : sx + sw, hy + 2, 2.5, 2.5, C.g1);
    }
  }
  const rx = double ? x + w / 2 - 6 : x + w - 7; const ry = y + Math.round(h * 0.52);
  ellipse(ctx, rx, ry, 3, 3, C.g1); ellipse(ctx, rx, ry, 1.6, 1.6, pal.tones[0]); px(ctx, rx - 2, ry - 2, C.f3);
  if (double) { ellipse(ctx, rx + 12, ry, 3, 3, C.g1); ellipse(ctx, rx + 12, ry, 1.6, 1.6, pal.tones[0]); }
  if (step) {
    rect(ctx, x - 8, y + h, w + 16, 6, C.g3); rect(ctx, x - 8, y + h, w + 16, 1, C.g4); rect(ctx, x - 8, y + h + 5, w + 16, 1, C.g2);
    for (let k = x - 4; k < x + w + 8; k += 11) rect(ctx, k, y + h + 1, 1, 4, C.g2);
  }
}

/** Janela grande: moldura grossa, vidro aceso (ou escuro), caixilho, cortina, peitoril, floreira e venezianas. */
export function bigWindow(ctx, x, y, w, h, { shutters = false, box = false, arch = false, frame = WOOD_DARK, lit = true, seed = 1, curtain = true } = {}) {
  const r = rng(seed);
  const ah = arch ? Math.round(w * 0.4) : 0;
  rect(ctx, x - 3, y - 3, w + 6, h + 6, frame.gap);
  if (arch) ellipse(ctx, x + w / 2, y, w / 2 + 3, ah + 3, frame.gap);
  rect(ctx, x - 2, y - 2, w + 4, h + 4, frame.tones[0]); rect(ctx, x - 2, y - 2, w + 4, 1, frame.light);
  if (arch) ellipse(ctx, x + w / 2, y, w / 2 + 2, ah + 2, frame.tones[0]);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); if (arch) ctx.ellipse(x + w / 2, y, w / 2, ah, 0, Math.PI, 0); ctx.clip();
  if (lit) {
    const g = ctx.createLinearGradient(x, y - ah, x + w * 0.5, y + h);
    g.addColorStop(0, C.f4); g.addColorStop(0.45, C.f3); g.addColorStop(1, C.f1);
    ctx.fillStyle = g; ctx.fillRect(x, y - ah, w, h + ah);
    rect(ctx, x, y + h - 4, w, 4, C.f1);
    if (curtain) { fillPoly(ctx, [[x, y - ah], [x + w * 0.3, y - ah], [x + 2, y + h * 0.6], [x, y + h * 0.6]], C.r1); fillPoly(ctx, [[x + w, y - ah], [x + w * 0.7, y - ah], [x + w - 2, y + h * 0.6], [x + w, y + h * 0.6]], C.r1); }
    if (r() < 0.6) { ellipse(ctx, x + w * 0.65, y + h - 5, 2.5, 2, C.w2); rect(ctx, x + w * 0.65 - 0.5, y + h - 9, 1, 4, C.m2); ellipse(ctx, x + w * 0.65, y + h - 10, 2, 1.5, C.m3); }
  } else {
    rect(ctx, x, y - ah, w, h + ah, C.navy); rect(ctx, x, y - ah, w, 3, C.slate);
  }
  rect(ctx, x + Math.floor(w / 2) - 1, y - ah, 2, h + ah, frame.dark);
  rect(ctx, x, y + Math.floor(h / 2) - 1, w, 2, frame.dark);
  line(ctx, x + 2, y + 5, x + 5, y + 2, C.white, 1); px(ctx, x + w / 2 + 2, y + h / 2 + 2, lit ? C.f4 : C.slate3);
  ctx.restore();
  rect(ctx, x - 5, y + h + 2, w + 10, 3, frame.light); rect(ctx, x - 5, y + h + 2, w + 10, 1, frame.hi ?? C.w6); rect(ctx, x - 5, y + h + 5, w + 10, 1, frame.gap);
  if (box) {
    ctx.save(); ctx.translate(x - 3, y + h + 6); planks(ctx, w + 6, 6, { seed: seed + 4, size: 3, nails: false }); ctx.restore();
    for (let i = 0; i < w + 6; i += 2) {
      const fx = x - 3 + i + r.range(-0.5, 0.5); const fy = y + h + 5 - r.range(0, 4);
      ellipse(ctx, fx, fy + 1, 1.6, 1.4, i % 4 ? C.m2 : C.m3);
      if (r() < 0.55) ellipse(ctx, fx, fy - 1, 1.1, 1.1, r.pick([C.red, C.f3, C.paper, C.wine]));
    }
  }
  if (shutters) {
    const sw = Math.max(6, Math.round(w * 0.42));
    for (const sx of [x - 4 - sw, x + w + 4]) {
      ctx.save(); ctx.translate(sx, y - 2); planks(ctx, sw, h + 4, { pal: { gap: C.m0, dark: C.m0, tones: [C.m1, C.m1, C.m2], light: C.m2, hi: C.m3 }, seed: sx, vertical: true, size: 3, nails: false, worn: 0.04 }); ctx.restore();
      line(ctx, sx + 1, y + h - 1, sx + sw - 1, y + 2, C.m0, 2);
      for (const hy of [y + 2, y + h - 3]) { rect(ctx, sx, hy, sw, 1.5, C.g1); }
    }
  }
}

/** Lampião grande na parede (braço de ferro e caixa acesa). */
export function wallLantern(ctx, x, y, side = 1) {
  rect(ctx, x, y - 2, 3, 6, C.g1); line(ctx, x + 1.5, y, x + 1.5 + side * 7, y, C.g1, 2);
  scaled(ctx, x + side * 7 - 4.4, y + 3, 2.2, () => lanternBox(ctx, 0, 0));
}

/** Escada de pedras do caminho na frente da porta. */
function pathStones(ctx, cx, base, n = 3, seed = 3) {
  const r = rng(seed);
  for (let i = 0; i < n; i += 1) {
    const sx = cx + r.range(-6, 6); const sy = base + 9 + i * 7;
    ellipse(ctx, sx, sy + 1, 7, 3, C.g2); ellipse(ctx, sx - 0.5, sy, 6.5, 2.6, r.pick([C.g3, C.wg3])); ellipse(ctx, sx - 2, sy - 1, 2.5, 1, C.g4);
  }
}

/** Banco de madeira encostado na parede. */
function bench(ctx, x, base, w = 24) {
  rect(ctx, x + 2, base - 10, 3, 10, C.w2); rect(ctx, x + w - 5, base - 10, 3, 10, C.w2);
  ctx.save(); ctx.translate(x, base - 13); planks(ctx, w, 4, { seed: x, size: 4, nails: true }); ctx.restore();
  rect(ctx, x, base - 13, w, 1, C.w6);
}

const BIG = { barrel: 3.4, crate: 3, sack: 3, anvil: 3 };
const bigBarrel = (ctx, cx, base, s = BIG.barrel, o = {}) => scaled(ctx, cx, base, s, () => barrel(ctx, 0, 0, { w: 6, h: 7, ...o }));
const bigCrate = (ctx, x, base, s = BIG.crate, size = 7) => scaled(ctx, x, base - size * s, s, () => crate(ctx, 0, 0, size));
const bigSack = (ctx, cx, base, s = BIG.sack) => scaled(ctx, cx, base, s, () => sack(ctx, 0, 0));

// ---------- Casa ----------

function house1(ctx) {
  // Cabana de toras com telhado de palha em "A", porta de tábuas, lenha, toco com machado e lampião.
  const x = 30; const base = 126; const w = 84; const h = 80; const d = 30;
  const { fy } = box(ctx, { x, base, w, h, d, kx: 0.08, front: (c, ww, hh) => logs(c, ww, hh, { seed: 3, size: 8 }), side: (c, ww, hh) => logs(c, ww, hh, { seed: 4, size: 8, ends: false }) });
  eaveShade(ctx, x, fy, w);
  frontGable(ctx, { cx: x + w / 2, wallTop: fy, w, d, rise: 28, over: 7, drop: 7,
    roof: (c, ww, hh) => thatch(c, ww, hh, { seed: 7 }),
    pediment: (c, ww, hh) => planks(c, ww, hh, { seed: 9, vertical: true, size: 5 }) });
  ellipse(ctx, x + w / 2, fy - 10, 6.5, 6.5, C.w1); ellipse(ctx, x + w / 2, fy - 10, 4.6, 4.6, C.f3); ellipse(ctx, x + w / 2 - 1.5, fy - 11.5, 1.8, 1.8, C.f4);
  rect(ctx, x + w / 2 - 0.5, fy - 15, 1.5, 10, C.w1); rect(ctx, x + w / 2 - 5, fy - 10.5, 10, 1.5, C.w1);
  bigWindow(ctx, x + 6, fy + 22, 16, 18, { seed: 2, box: true });
  bigWindow(ctx, x + 64, fy + 22, 14, 18, { seed: 3 });
  bigDoor(ctx, x + 28, base - 73, 28, 73, { arch: false, step: false, seed: 5 });
  wallLantern(ctx, x + 60, base - 62);
  // Ervas secando sob o beiral.
  for (let k = 0; k < 4; k += 1) { line(ctx, x + 8 + k * 4, fy + 2, x + 8 + k * 4, fy + 8, C.w2, 1); ellipse(ctx, x + 8 + k * 4, fy + 11, 1.8, 3.5, k % 2 ? C.m2 : C.m1); }
  wallLight(ctx, x, fy, w, base);
  woodpile(ctx, x + w + 3, base + 1, { cols: 3, rows: 3, r: 3.6 });
  scaled(ctx, x - 14, base + 1, 2.4, () => {
    ellipse(ctx, 0, -1, 2.6, 1.3, C.w5); rect(ctx, -2.5, -1, 5, 2, C.w3); ellipse(ctx, 0, -1, 1.6, 0.7, C.w4);
    line(ctx, 0, -2, 2, -6, C.w4, 1); rect(ctx, 1, -7, 2, 2, C.g3); px(ctx, 1, -7, C.g4);
  });
  pathStones(ctx, x + 42, base - 6, 2, 4);
  grassTufts(ctx, 4, base + 2, 136, { seed: 6, flowers: 0.15 });
}

function house4(ctx) {
  // Casa de enxaimel com embasamento de pedra, telha-canal com musgo, lucarna, chaminé e floreiras.
  const x = 22; const base = 148; const w = 114; const h = 92; const d = 36;
  const posts = [0, 30, 58, 99, w - 5];
  const wall = mixedWall({ seed: 12, moss: 0.35, rowH: [6, 8], blockW: [9, 15] }, 26, (c, ww, hh) => { plaster(c, ww, hh, { seed: 4 }); timber(c, ww, hh, posts, { pw: 5, beam: 5 }); });
  const { fy } = box(ctx, { x, base, w, h, d, front: wall,
    side: mixedWall({ seed: 13, rowH: [6, 8], blockW: [9, 15] }, 26, (c, ww, hh) => { plaster(c, ww, hh, { seed: 5 }); timber(c, ww, hh, [0, ww - 5], { diag: false, pw: 5, beam: 5 }); }) });
  chimney(ctx, x + w - 28, fy - 50, 14, 42, { seed: 3 });
  eaveShade(ctx, x, fy, w);
  gableRoof(ctx, { x, wallTop: fy, w, d, rise: 26, over: 7, drop: 6, roof: roofPainter({ seed: 7, moss: 0.5, barrel: true, rowH: 5, tileW: 6 }), gable: (c, ww, hh) => plaster(c, ww, hh, { seed: 9 }) });
  frontGable(ctx, { cx: x + 34, wallTop: fy + 4, w: 30, d: 18, rise: 22, over: 3, drop: 2, roof: roofPainter({ seed: 9, barrel: true, rowH: 5, tileW: 6 }),
    pediment: (c, ww, hh) => { plaster(c, ww, hh, { seed: 2 }); rect(c, 0, hh - 4, ww, 4, C.w2); rect(c, 0, hh - 4, ww, 1, C.w4); } });
  ellipse(ctx, x + 34, fy - 4, 5.5, 5.5, C.w1); ellipse(ctx, x + 34, fy - 4, 4, 4, C.f3); ellipse(ctx, x + 32.5, fy - 5.5, 1.5, 1.5, C.f4);
  rect(ctx, x + 33.5, fy - 9, 1.5, 10, C.w1); rect(ctx, x + 29, fy - 4.5, 10, 1.5, C.w1);
  bigWindow(ctx, x + 8, fy + 20, 18, 22, { box: true, seed: 3 });
  bigWindow(ctx, x + 37, fy + 20, 17, 22, { box: true, seed: 4 });
  bigDoor(ctx, x + 64, base - 74, 31, 74, { seed: 3, jamb: 'stone' });
  wallLantern(ctx, x + 101, base - 70);
  // Janela na lateral (parede em fuga).
  fillPoly(ctx, [[x + w + 3, fy + 26], [x + w + 9, fy + 22], [x + w + 9, fy + 40], [x + w + 3, fy + 44]], C.w1);
  fillPoly(ctx, [[x + w + 4, fy + 27], [x + w + 8, fy + 24.5], [x + w + 8, fy + 38.5], [x + w + 4, fy + 42]], C.f2);
  wallLight(ctx, x, fy, w, base);
  bigBarrel(ctx, x + w + 18, base + 2);
  bigCrate(ctx, x - 18, base + 1);
  bench(ctx, x + 6, base + 1, 26);
  pathStones(ctx, x + 80, base - 4, 2, 7);
  grassTufts(ctx, 2, base + 3, 164, { seed: 8, flowers: 0.22 });
}

function house8(ctx) {
  // Sobrado: térreo de pedra e andar de enxaimel, ardósia com 2 lucarnas, 2 chaminés, porta dupla, brasão.
  const x = 18; const base = 168; const w = 150; const h = 124; const d = 32;
  const up = 46;
  const posts = [0, 30, 58, 92, 120, w - 5];
  const front = (c, ww, hh) => {
    plaster(c, ww, up, { seed: 31 });
    timber(c, ww, up, posts, { pw: 5, beam: 5 });
    c.save(); c.translate(0, up); stones(c, ww, hh - up, { seed: 33, moss: 0.4, cracks: 0.2, rowH: [6, 8], blockW: [9, 16] }); c.restore();
    rect(c, 0, up - 2, ww, 7, C.w2); rect(c, 0, up - 2, ww, 2, C.w5); rect(c, 0, up + 4, ww, 1, C.w0);
    for (let k = 4; k < ww; k += 14) { rect(c, k, up + 5, 4, 4, C.w3); px(c, k, up + 5, C.w5); }
  };
  const side = (c, ww, hh) => { plaster(c, ww, up, { seed: 35 }); timber(c, ww, up, [0, ww - 5], { diag: false, pw: 5, beam: 5 }); c.save(); c.translate(0, up); stones(c, ww, hh - up, { seed: 34, rowH: [6, 8], blockW: [9, 16] }); c.restore(); };
  const { fy } = box(ctx, { x, base, w, h, d, front, side });
  chimney(ctx, x + 14, fy - 38, 13, 34, { seed: 5 });
  chimney(ctx, x + w - 26, fy - 40, 13, 36, { seed: 6 });
  eaveShade(ctx, x, fy, w);
  gableRoof(ctx, { x, wallTop: fy, w, d, rise: 24, over: 7, drop: 6, roof: roofPainter({ seed: 17, pal: ROOF_SLATE, moss: 0.6, tileW: 7, rowH: 5 }), gable: (c, ww, hh) => plaster(c, ww, hh, { seed: 3 }) });
  for (const cx of [x + 44, x + 108]) {
    frontGable(ctx, { cx, wallTop: fy + 3, w: 26, d: 16, rise: 20, over: 3, drop: 2, roof: roofPainter({ seed: cx, pal: ROOF_SLATE, tileW: 6, rowH: 5 }),
      pediment: (c, ww, hh) => plaster(c, ww, hh, { seed: cx }) });
    bigWindow(ctx, cx - 5, fy - 8, 10, 10, { arch: true, curtain: false, seed: cx });
  }
  for (const [wx, s] of [[x + 9, 1], [x + 37, 2], [x + 98, 3], [x + 126, 4]]) bigWindow(ctx, wx, fy + 10, 17, 22, { box: true, seed: s });
  // Brasão do sobrado entre as janelas de cima (lua dourada num escudo azul).
  fillPoly(ctx, [[x + 66, fy + 9], [x + 84, fy + 9], [x + 84, fy + 24], [x + 75, fy + 31], [x + 66, fy + 24]], C.b1);
  fillPoly(ctx, [[x + 66, fy + 9], [x + 75, fy + 9], [x + 75, fy + 31], [x + 66, fy + 24]], C.b2);
  ellipse(ctx, x + 75, fy + 18, 5, 5, C.f3); ellipse(ctx, x + 77, fy + 16.5, 4, 4, C.b2); rect(ctx, x + 65, fy + 8, 20, 2, C.f2);
  bigWindow(ctx, x + 12, base - 62, 26, 30, { shutters: true, seed: 6 });
  bigWindow(ctx, x + 112, base - 62, 26, 30, { shutters: true, seed: 7 });
  bigDoor(ctx, x + 55, base - 76, 40, 76, { seed: 8, double: true, jamb: 'stone' });
  wallLantern(ctx, x + 47, base - 70, -1);
  wallLantern(ctx, x + 101, base - 70, 1);
  wallLight(ctx, x, fy, w, base);
  bigBarrel(ctx, x + w + 14, base + 2);
  bigBarrel(ctx, x + w + 25, base + 6, 2.8);
  bigCrate(ctx, x - 14, base + 2);
  bigSack(ctx, x - 4, base + 8);
  pathStones(ctx, x + 75, base - 2, 3, 9);
  grassTufts(ctx, 2, base + 4, 196, { seed: 18, flowers: 0.25 });
}

// ---------- Ferreiro (grande) ----------

function forgeMouth(ctx, fx, base, fw, fh, { grate = false, seed = 1 } = {}) {
  const ftop = base - fh;
  const ah = Math.round(fw * 0.32);
  ctx.save(); ctx.beginPath(); ctx.rect(fx - 6, ftop, fw + 12, fh); ctx.ellipse(fx + fw / 2, ftop, fw / 2 + 6, ah + 6, 0, Math.PI, 0); ctx.clip();
  ctx.translate(fx - 6, ftop - ah - 6); stones(ctx, fw + 12, fh + ah + 6, { seed, pal: STONE, rowH: [5, 6], blockW: [6, 8] }); ctx.restore();
  for (let i = 0; i <= 9; i += 1) {
    const a = Math.PI + (i / 9) * Math.PI;
    const ax = fx + fw / 2 + Math.cos(a) * (fw / 2 + 3); const ay = ftop + Math.sin(a) * (ah + 3);
    ellipse(ctx, ax, ay, 3.2, 3.2, i % 2 ? C.g3 : C.g4); px(ctx, ax - 1, ay - 1, C.slate4);
  }
  ctx.save(); ctx.beginPath(); ctx.rect(fx, ftop, fw, fh); ctx.ellipse(fx + fw / 2, ftop, fw / 2, ah, 0, Math.PI, 0); ctx.clip();
  rect(ctx, fx, ftop - ah, fw, fh + ah, C.ink);
  const g = ctx.createRadialGradient(fx + fw / 2, base - 6, 0, fx + fw / 2, base - 6, fw * 0.62);
  g.addColorStop(0, C.f4); g.addColorStop(0.25, C.f3); g.addColorStop(0.5, C.f1); g.addColorStop(0.8, C.r1); g.addColorStop(1, C.ink);
  ctx.fillStyle = g; ctx.fillRect(fx, ftop - ah + 4, fw, fh + ah - 4);
  const r = rng(seed);
  for (let i = 0; i < fw / 2; i += 1) ellipse(ctx, fx + 2 + r() * (fw - 4), base - 2 - r() * 6, r.range(1, 2), r.range(0.8, 1.4), r.pick([C.f2, C.f3, C.r3, C.f4, C.g1]));
  if (grate) for (let k = 4; k < fw - 2; k += 5) rect(ctx, fx + k, ftop - ah + 2, 2, fh + ah - 6, 'rgba(28,18,28,0.8)');
  ctx.restore();
  rect(ctx, fx - 2, base - 2, fw + 4, 3, C.g2); rect(ctx, fx - 2, base - 2, fw + 4, 1, C.g4);
}

function forgeGlow(ctx, cx, cy, r, area) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
  glow.addColorStop(0, 'rgba(255,140,40,0.32)'); glow.addColorStop(1, 'rgba(255,140,40,0)');
  ctx.fillStyle = glow; ctx.fillRect(...area); ctx.restore();
}

function toolRack(ctx, x, base, n = 4) {
  rect(ctx, x, base - 30, 3, 30, C.w2); rect(ctx, x + 22, base - 30, 3, 30, C.w2);
  rect(ctx, x - 1, base - 27, 27, 3, C.w4); rect(ctx, x - 1, base - 27, 27, 1, C.w6); rect(ctx, x - 1, base - 12, 27, 2, C.w3);
  for (let i = 0; i < n; i += 1) {
    const sx = x + 4 + i * 5;
    line(ctx, sx, base - 2, sx, base - 36, i % 2 ? C.g4 : C.slate3, 2);
    line(ctx, sx - 0.5, base - 36, sx - 0.5, base - 4, C.white, 0.6);
    rect(ctx, sx - 3, base - 12, 6, 2, C.w1); rect(ctx, sx - 1, base - 10, 2, 7, C.w3);
  }
}

function forge1(ctx) {
  // Telheiro: 4 esteios, cobertura de tábuas, fornalha de pedra com chaminé, fole, bigorna, tina e ferramentas.
  const x = 14; const base = 126; const w = 110; const top = 44;
  const roofPts = [[x - 6, top + 4], [x + w + 6, top + 4], [x + w + 16, top - 18], [x + 4, top - 18]];
  for (const px0 of [x + w + 4, x + 12]) { rect(ctx, px0, top - 14, 5, base - top - 4, C.w2); rect(ctx, px0, top - 14, 1, base - top - 4, C.w3); }
  // Fornalha (fundo, à esquerda) com chaminé.
  const fx = x + 10; const fwid = 40;
  ctx.save(); ctx.translate(fx, base - 52); stones(ctx, fwid, 50, { seed: 3, rowH: [5, 6], blockW: [7, 10] }); ctx.restore();
  rect(ctx, fx - 2, base - 54, fwid + 4, 4, C.g4); rect(ctx, fx - 2, base - 51, fwid + 4, 1, C.g2);
  forgeMouth(ctx, fx + 10, base - 6, 20, 22, { seed: 4 });
  chimney(ctx, fx + 12, 4, 16, base - 56, { seed: 4 });
  // Cobertura.
  clip(ctx, roofPts, () => { ctx.save(); ctx.translate(x - 6, top - 18); tiles(ctx, w + 24, 24, { pal: ROOF_WOOD, seed: 4, tileW: 7, rowH: 5 }); ctx.restore(); });
  veil(ctx, roofPts, 0, top - 18, 0, top + 4, [[0, 'rgba(255,235,180,0.18)'], [1, 'rgba(26,25,50,0.28)']]);
  line(ctx, x - 6, top + 4.5, x + w + 6, top + 4.5, C.ink, 1);
  rect(ctx, x - 6, top + 5, w + 12, 3, C.w3); rect(ctx, x - 6, top + 5, w + 12, 1, C.w5); rect(ctx, x - 6, top + 8, w + 12, 2, 'rgba(26,25,50,0.5)');
  chimney(ctx, fx + 12, 4, 16, 18, { seed: 4 });
  // Esteios da frente com mão-francesa.
  for (const px0 of [x, x + w - 5]) { rect(ctx, px0, top + 8, 5, base - top - 8, C.w3); rect(ctx, px0, top + 8, 1, base - top - 8, C.w5); rect(ctx, px0 + 4, top + 8, 1, base - top - 8, C.w1); }
  line(ctx, x + 5, top + 26, x + 18, top + 10, C.w3, 3); line(ctx, x + w - 5, top + 26, x + w - 18, top + 10, C.w3, 3);
  // Fole de couro ao lado da fornalha.
  fillPoly(ctx, [[fx + fwid + 2, base - 30], [fx + fwid + 20, base - 26], [fx + fwid + 20, base - 18], [fx + fwid + 2, base - 22]], C.w2);
  fillPoly(ctx, [[fx + fwid + 4, base - 29], [fx + fwid + 18, base - 25.5], [fx + fwid + 18, base - 23], [fx + fwid + 4, base - 26]], C.w4);
  rect(ctx, fx + fwid + 20, base - 24, 8, 2, C.w3);
  // Ferramentas penduradas na viga.
  for (const [tx, len, head] of [[x + 62, 16, 'hammer'], [x + 70, 20, 'tongs'], [x + 78, 14, 'hammer']]) {
    line(ctx, tx, top + 10, tx, top + 10 + len, C.w2, 2);
    if (head === 'hammer') { rect(ctx, tx - 4, top + 8 + len, 8, 5, C.g2); rect(ctx, tx - 4, top + 8 + len, 8, 1, C.g4); }
    else { line(ctx, tx, top + 10 + len, tx - 3, top + 18 + len, C.g1, 1.5); line(ctx, tx, top + 10 + len, tx + 3, top + 18 + len, C.g1, 1.5); }
  }
  scaled(ctx, x + 68, base + 2, BIG.anvil, () => anvil(ctx, 0, 0));
  bigBarrel(ctx, x + 96, base + 2, 3.2);
  rect(ctx, x + 87, base - 22, 18, 3, C.b2); rect(ctx, x + 88, base - 22, 6, 1, C.b4);
  for (let i = 0; i < 8; i += 1) ellipse(ctx, x + 44 + (i % 4) * 4, base + 4 - Math.floor(i / 4) * 3, 2.4, 2, i % 3 ? C.g1 : C.ink);
  forgeGlow(ctx, fx + 20, base - 14, 34, [x, top, w, base - top]);
  grassTufts(ctx, x - 8, base + 3, w + 18, { seed: 2 });
}

function forge4(ctx) {
  // Ferraria de pedra: boca da forja em arco, chaminé alta, porta, placa do martelo e pátio com bigorna.
  const x = 16; const base = 148; const w = 118; const h = 90; const d = 32;
  const { fy } = box(ctx, { x, base, w, h, d, front: (c, ww, hh) => stones(c, ww, hh, { seed: 41, moss: 0.3, cracks: 0.25, rowH: [6, 8], blockW: [9, 15] }), side: (c, ww, hh) => stones(c, ww, hh, { seed: 42, rowH: [6, 8], blockW: [9, 15] }) });
  eaveShade(ctx, x, fy, w);
  gableRoof(ctx, { x, wallTop: fy, w, d, rise: 22, over: 7, drop: 5, roof: roofPainter({ seed: 43, pal: ROOF_SLATE, tileW: 7, rowH: 5, moss: 0.3 }), gable: (c, ww, hh) => stones(c, ww, hh, { seed: 44 }) });
  chimney(ctx, x + w - 24, 6, 16, 72, { seed: 45 });
  rect(ctx, x + w - 24, 6, 16, 3, C.g1); rect(ctx, x + w - 22, 5, 12, 1, C.ink);
  forgeMouth(ctx, x + 10, base, 36, 44, { seed: 46 });
  forgeGlow(ctx, x + 28, base - 12, 40, [x, fy, w, h]);
  bigWindow(ctx, x + 56, fy + 14, 14, 18, { seed: 5, curtain: false });
  bigDoor(ctx, x + 78, base - 74, 30, 74, { seed: 9 });
  scaled(ctx, x + 52, base - 52, 2.4, () => hangingSign(ctx, 0, 0, 7, 6, hammerIcon));
  wallLight(ctx, x, fy, w, base);
  scaled(ctx, x + 64, base + 16, BIG.anvil, () => anvil(ctx, 0, 0));
  bigBarrel(ctx, x + w + 16, base + 4, 3.2);
  rect(ctx, x + w + 7, base - 20, 18, 3, C.b2); rect(ctx, x + w + 8, base - 20, 6, 1, C.b4);
  for (let i = 0; i < 6; i += 1) ellipse(ctx, x + 52 + (i % 3) * 5, base + 10 - Math.floor(i / 3) * 3, 2.6, 2, i % 2 ? C.g1 : C.ink);
  grassTufts(ctx, x - 10, base + 4, w + 26, { seed: 4 });
}

function forge8(ctx) {
  // Grande forja: salão de pedra, duas bocas com grade, chaminé larga, estandarte, porta dupla e cavalete de armas.
  const x = 12; const base = 168; const w = 150; const h = 104; const d = 30;
  const { fy } = box(ctx, { x, base, w, h, d, front: (c, ww, hh) => stones(c, ww, hh, { seed: 51, moss: 0.3, cracks: 0.25, rowH: [6, 8], blockW: [9, 16] }), side: (c, ww, hh) => stones(c, ww, hh, { seed: 52, rowH: [6, 8], blockW: [9, 16] }) });
  chimney(ctx, x + 18, fy - 44, 12, 36, { seed: 56 });
  eaveShade(ctx, x, fy, w);
  gableRoof(ctx, { x, wallTop: fy, w, d, rise: 24, over: 7, drop: 5, roof: roofPainter({ seed: 53, pal: ROOF_SLATE, tileW: 7, rowH: 5, moss: 0.3 }), gable: (c, ww, hh) => stones(c, ww, hh, { seed: 54 }) });
  chimney(ctx, x + w - 22, 4, 22, 86, { seed: 55 });
  rect(ctx, x + w - 22, 4, 22, 3, C.g1); rect(ctx, x + w - 20, 3, 18, 1, C.ink);
  for (const fx of [x + 8, x + 104]) {
    forgeMouth(ctx, fx, base, 38, 48, { seed: fx, grate: true });
    forgeGlow(ctx, fx + 19, base - 14, 42, [x, fy, w, h]);
  }
  // Estandarte vermelho com martelo dourado sobre a porta.
  rect(ctx, x + 63, fy + 4, 24, 26, C.r1); rect(ctx, x + 63, fy + 4, 3, 26, C.r3); rect(ctx, x + 84, fy + 4, 3, 26, C.r0);
  fillPoly(ctx, [[x + 63, fy + 30], [x + 75, fy + 37], [x + 87, fy + 30]], C.r1);
  rect(ctx, x + 60, fy + 2, 30, 3, C.w4); rect(ctx, x + 60, fy + 2, 30, 1, C.w6);
  rect(ctx, x + 74, fy + 11, 3, 16, C.f3); rect(ctx, x + 68, fy + 9, 15, 6, C.f3); rect(ctx, x + 68, fy + 9, 15, 1, C.f4); px(ctx, x + 69, fy + 10, C.white);
  bigDoor(ctx, x + 57, base - 76, 36, 76, { seed: 4, double: true, jamb: 'stone' });
  wallLight(ctx, x, fy, w, base);
  scaled(ctx, x + 40, base + 20, 3.4, () => anvil(ctx, 0, 0));
  toolRack(ctx, x + w + 2, base + 4, 4);
  bigBarrel(ctx, x + 112, base + 16, 3);
  for (let i = 0; i < 9; i += 1) ellipse(ctx, x + 56 + (i % 3) * 5, base + 16 - Math.floor(i / 3) * 3, 2.6, 2, i % 2 ? C.g1 : C.ink);
  grassTufts(ctx, 2, base + 5, 196, { seed: 14 });
}

// ---------- Fazenda (grande) ----------

function bigBarnDoors(ctx, x, y, w, h) {
  rect(ctx, x - 3, y - 3, w + 6, h + 3, C.paper); rect(ctx, x - 3, y - 3, w + 6, 1, C.white);
  ctx.save(); ctx.translate(x, y); planks(ctx, w, h, { pal: WOOD_RED, vertical: true, seed: 2, size: 5, nails: false }); ctx.restore();
  rect(ctx, x + w / 2 - 1.5, y, 3, h, C.paper);
  for (const sx of [x, x + w / 2 + 1.5]) {
    const sw = w / 2 - 1.5;
    rect(ctx, sx, y, sw, 3, C.paper); rect(ctx, sx, y + h - 3, sw, 3, C.paper);
    line(ctx, sx + 1, y + 3, sx + sw - 1, y + h - 3, C.paper, 3); line(ctx, sx + sw - 1, y + 3, sx + 1, y + h - 3, C.paper, 3);
  }
  rect(ctx, x - 6, y - 7, w + 12, 3, C.g1); for (let k = x - 2; k < x + w + 4; k += 8) ellipse(ctx, k, y - 6, 1.6, 1.6, C.g3);
}

function hayBale(ctx, x, base, w = 22, h = 14) {
  rect(ctx, x, base - h, w, h, C.r5); rect(ctx, x, base - h, w, 2, C.cream); rect(ctx, x, base - 2, w, 2, C.w4);
  for (let k = 2; k < w; k += 3) rect(ctx, x + k, base - h + 2, 1, h - 4, C.sand);
  rect(ctx, x + Math.round(w * 0.3), base - h, 2, h, C.w3); rect(ctx, x + Math.round(w * 0.7), base - h, 2, h, C.w3);
}

function farm1(ctx) {
  // Galpão de tábuas, horta cercada com espantalho, ferramentas, sacos e repolhos.
  const x = 10; const base = 126; const w = 62; const h = 82; const d = 24;
  const { fy } = box(ctx, { x, base, w, h, d, front: (c, ww, hh) => planks(c, ww, hh, { vertical: true, seed: 6, size: 6 }), side: (c, ww, hh) => planks(c, ww, hh, { vertical: true, seed: 7, size: 6 }) });
  eaveShade(ctx, x, fy, w);
  gableRoof(ctx, { x, wallTop: fy, w, d, rise: 18, over: 5, drop: 4, roof: roofPainter({ seed: 3, pal: ROOF_WOOD, tileW: 7, rowH: 5 }), gable: (c, ww, hh) => planks(c, ww, hh, { seed: 8, vertical: true, size: 6 }) });
  bigDoor(ctx, x + 18, base - 72, 28, 72, { arch: false, step: false, seed: 2 });
  wallLight(ctx, x, fy, w, base);
  scaled(ctx, x - 2, base, 2.6, () => { line(ctx, -1.5, 0, -0.5, -10, C.w4, 1); rect(ctx, -3, -11, 3, 1, C.g3); });
  scaled(ctx, x + w + 6, base, 2.6, () => { line(ctx, 1.5, 0, 0.5, -9, C.w4, 1); rect(ctx, 0, -10, 2, 3, C.g3); });
  scaled(ctx, 86, 92, 2.2, () => crops(ctx, 0, 0, 6, 3, 'sprout', 3));
  scaled(ctx, 120, 102, 2.6, () => scarecrow(ctx, 0, 0));
  scaled(ctx, 80, 112, 2.2, () => fenceRun(ctx, 0, 0, 28));
  bigSack(ctx, 74, base + 6);
  scaled(ctx, 14, base + 8, 2.2, () => crops(ctx, 0, 0, 4, 1, 'cabbage', 4));
  grassTufts(ctx, 4, base + 14, 136, { seed: 9, flowers: 0.15 });
}

function farm4(ctx) {
  // Celeiro vermelho com portas em X, lucarna do palheiro, silo, fardos de feno e trigo.
  const x = 44; const base = 148; const w = 94; const h = 84; const d = 30;
  scaled(ctx, 10, base, 2.4, () => silo(ctx, 0, 0, 10, 50));
  const { fy } = box(ctx, { x, base, w, h, d, front: (c, ww, hh) => planks(c, ww, hh, { pal: WOOD_RED, vertical: true, seed: 4, size: 6, worn: 0.08 }), side: (c, ww, hh) => planks(c, ww, hh, { pal: WOOD_RED, vertical: true, seed: 5, size: 6, worn: 0.08 }) });
  eaveShade(ctx, x, fy, w);
  gableRoof(ctx, { x, wallTop: fy, w, d, rise: 26, over: 6, drop: 5, roof: roofPainter({ seed: 6, pal: ROOF_SLATE, tileW: 7, rowH: 5, moss: 0.4 }), gable: (c, ww, hh) => planks(c, ww, hh, { pal: WOOD_RED, vertical: true, seed: 7, size: 6 }) });
  frontGable(ctx, { cx: x + 47, wallTop: fy + 3, w: 34, d: 16, rise: 24, over: 3, drop: 2, roof: roofPainter({ seed: 8, pal: ROOF_SLATE, tileW: 6, rowH: 5 }),
    pediment: (c, ww, hh) => planks(c, ww, hh, { pal: WOOD_RED, vertical: true, seed: 9, size: 5 }) });
  rect(ctx, x + 39, fy - 14, 16, 13, C.w1); rect(ctx, x + 41, fy - 7, 12, 6, C.r5); rect(ctx, x + 41, fy - 8, 12, 1, C.cream);
  rect(ctx, x + 38, fy - 15, 18, 2, C.paper); rect(ctx, x + 46.5, fy - 24, 2, 9, C.g1); ellipse(ctx, x + 47.5, fy - 15, 2, 1.4, C.g1);
  bigBarnDoors(ctx, x + 25, base - 74, 44, 74);
  rect(ctx, x, fy + h - 3, w, 3, C.paper);
  for (const wx of [x + 6, x + 76]) bigWindow(ctx, wx, fy + 16, 12, 14, { frame: { gap: C.paper, dark: C.paper, tones: [C.paper], light: C.white, hi: C.white }, curtain: false, seed: wx });
  wallLight(ctx, x, fy, w, base);
  hayBale(ctx, x + w + 2, base + 2); hayBale(ctx, x + w + 6, base - 11, 18, 13);
  scaled(ctx, 6, 166, 2.2, () => crops(ctx, 0, 0, 8, 1, 'wheat', 5));
  scaled(ctx, 4, base - 4, 2.2, () => fenceRun(ctx, 0, 0, 16));
  grassTufts(ctx, 2, base + 4, 164, { seed: 11, flowers: 0.12 });
}

function farm8(ctx) {
  // Fazenda grande: moinho de vento atrás, silo, celeirão com palheiro, campos de trigo e repolho, cerca branca.
  const x = 70; const base = 168; const w = 100; const h = 92; const d = 28;
  scaled(ctx, 50, base - 6, 3, () => windmill(ctx, 0, 0));
  scaled(ctx, 172, base - 8, 2.6, () => silo(ctx, 0, 0, 9, 52));
  const { fy } = box(ctx, { x, base, w, h, d, front: (c, ww, hh) => planks(c, ww, hh, { pal: WOOD_RED, vertical: true, seed: 14, size: 6, worn: 0.08 }), side: (c, ww, hh) => planks(c, ww, hh, { pal: WOOD_RED, vertical: true, seed: 15, size: 6, worn: 0.08 }) });
  eaveShade(ctx, x, fy, w);
  gableRoof(ctx, { x, wallTop: fy, w, d, rise: 26, over: 6, drop: 5, roof: roofPainter({ seed: 16, pal: ROOF_SLATE, tileW: 7, rowH: 5, moss: 0.4 }), gable: (c, ww, hh) => planks(c, ww, hh, { pal: WOOD_RED, vertical: true, seed: 17, size: 6 }) });
  frontGable(ctx, { cx: x + 50, wallTop: fy + 3, w: 36, d: 14, rise: 24, over: 3, drop: 2, roof: roofPainter({ seed: 18, pal: ROOF_SLATE, tileW: 6, rowH: 5 }), pediment: (c, ww, hh) => planks(c, ww, hh, { pal: WOOD_RED, vertical: true, seed: 19, size: 5 }) });
  rect(ctx, x + 42, fy - 14, 16, 13, C.w1); rect(ctx, x + 44, fy - 7, 12, 6, C.r5); rect(ctx, x + 44, fy - 8, 12, 1, C.cream);
  rect(ctx, x + 41, fy - 15, 18, 2, C.paper); rect(ctx, x + 49.5, fy - 24, 2, 9, C.g1);
  bigBarnDoors(ctx, x + 27, base - 76, 46, 76);
  for (const wx of [x + 7, x + 80]) bigWindow(ctx, wx, fy + 16, 13, 16, { frame: { gap: C.paper, dark: C.paper, tones: [C.paper], light: C.white, hi: C.white }, curtain: false, seed: wx });
  rect(ctx, x, fy + h - 3, w, 3, C.paper);
  wallLight(ctx, x, fy, w, base);
  for (const [px0, py0] of [[x - 10, base + 2], [x - 4, base + 6], [x + w + 14, base + 4]]) { ellipse(ctx, px0, py0, 5, 4, C.r4); ellipse(ctx, px0 - 1.5, py0 - 1, 2, 1.5, C.r5); rect(ctx, px0 - 0.5, py0 - 6, 1.5, 3, C.m2); }
  bigCrate(ctx, x + w + 16, base - 4, 2.6);
  scaled(ctx, 4, 194, 2.2, () => crops(ctx, 0, 0, 10, 1, 'wheat', 7));
  scaled(ctx, 104, 194, 2.2, () => crops(ctx, 0, 0, 10, 1, 'cabbage', 8));
  scaled(ctx, 2, 176, 2.2, () => fenceRun(ctx, 0, 0, 89, { pal: { gap: C.g2, dark: C.g4, tones: [C.slate4], light: C.white, hi: C.white } }));
  grassTufts(ctx, 2, 199, 196, { seed: 19, flowers: 0.12 });
}

// ---------- Mercado (grande) ----------

function goods(ctx, x, y, w, seed) {
  const r = rng(seed);
  for (let i = 0; i < w - 6; i += 10) {
    ellipse(ctx, x + i + 5, y + 1, 5, 2.5, C.w2); ellipse(ctx, x + i + 5, y, 4.4, 2, C.w4);
    const color = r.pick([C.red, C.f2, C.m3, C.f3, C.r4, C.wine]);
    for (let k = 0; k < 4; k += 1) { ellipse(ctx, x + i + 2.5 + (k % 2) * 4 + (k > 1 ? 1 : 0), y - 1.5 - (k > 1 ? 2.5 : 0), 2, 1.8, color); px(ctx, x + i + 2 + (k % 2) * 4, y - 3 - (k > 1 ? 2.5 : 0), C.white); }
  }
}

function bigStall(ctx, x, base, w, colors, { seed = 1, height = 88 } = {}) {
  const top = base - height;
  for (const px0 of [x + 3, x + w - 8]) { rect(ctx, px0, top + 8, 5, base - top - 8, C.w2); rect(ctx, px0, top + 8, 1, base - top - 8, C.w4); }
  // Prateleira do fundo com potes e garrafas.
  ctx.save(); ctx.translate(x + 8, top + 18); planks(ctx, w - 16, height - 52, { seed, size: 5, pal: WOOD_DARK, nails: false }); ctx.restore();
  const r = rng(seed + 5);
  for (const sy of [top + 30, top + 46]) {
    if (sy > base - 38) continue;
    rect(ctx, x + 8, sy, w - 16, 2, C.w4);
    for (let k = x + 11; k < x + w - 12; k += 6) { const c = r.pick([C.b2, C.m2, C.r3, C.f2, C.slate3]); rect(ctx, k, sy - 7, 4, 7, c); rect(ctx, k + 1, sy - 9, 2, 2, C.w5); px(ctx, k, sy - 6, C.white); }
  }
  // Balcão.
  ctx.save(); ctx.translate(x, base - 32); planks(ctx, w, 32, { seed: seed + 1, size: 6 }); ctx.restore();
  rect(ctx, x - 3, base - 36, w + 6, 5, C.w5); rect(ctx, x - 3, base - 36, w + 6, 1, C.w6); rect(ctx, x - 3, base - 31, w + 6, 1, C.w1);
  goods(ctx, x + 2, base - 38, w - 4, seed + 2);
  awning(ctx, x - 7, top - 6, w + 14, 20, colors, 8);
}

function store1(ctx) {
  // Barraca de feira: toldo listrado, prateleira de potes, balcão com cestos de fruta, caixotes, sacos e placa.
  bigStall(ctx, 26, 124, 92, [C.red, C.paper], { seed: 3 });
  bigCrate(ctx, 2, 112, 2.8);
  bigCrate(ctx, 8, 128, 2.6);
  bigSack(ctx, 24, 132);
  bigBarrel(ctx, 128, 130, 3);
  rect(ctx, 124, 34, 4, 74, C.w2); rect(ctx, 124, 34, 1, 74, C.w4); rect(ctx, 100, 32, 28, 3, C.w3); rect(ctx, 100, 32, 28, 1, C.w5);
  scaled(ctx, 102, 42, 2.2, () => hangingSign(ctx, 0, 0, 10, 6, (c, sx, sy) => { ellipse(c, sx + 4, sy + 2, 2, 2, C.f3); px(c, sx + 3, sy + 1, C.f4); }));
  grassTufts(ctx, 2, 136, 140, { seed: 21, flowers: 0.15 });
}

function store4(ctx) {
  // Loja: tábuas, telha-canal, frontão com a placa da moeda, vitrines com toldo azul, balcões e porta.
  const x = 20; const base = 148; const w = 118; const h = 90; const d = 30;
  const { fy } = box(ctx, { x, base, w, h, d, front: (c, ww, hh) => planks(c, ww, hh, { seed: 61, size: 6, pal: WOOD }), side: (c, ww, hh) => planks(c, ww, hh, { seed: 62, size: 6 }) });
  eaveShade(ctx, x, fy, w);
  gableRoof(ctx, { x, wallTop: fy, w, d, rise: 24, over: 7, drop: 5, roof: roofPainter({ seed: 63, moss: 0.3, barrel: true, rowH: 5, tileW: 6 }), gable: (c, ww, hh) => planks(c, ww, hh, { seed: 64, size: 6, vertical: true }) });
  frontGable(ctx, { cx: x + 59, wallTop: fy + 3, w: 40, d: 18, rise: 28, over: 3, drop: 2, roof: roofPainter({ seed: 65, barrel: true, rowH: 5, tileW: 6 }),
    pediment: (c, ww, hh) => planks(c, ww, hh, { seed: 66, size: 5, vertical: true }) });
  rect(ctx, x + 47, fy - 16, 24, 13, C.w1); rect(ctx, x + 48, fy - 15, 22, 11, C.w5); rect(ctx, x + 48, fy - 15, 22, 1, C.w6);
  ellipse(ctx, x + 59, fy - 9.5, 4, 4, C.f2); ellipse(ctx, x + 59, fy - 9.5, 3, 3, C.f3); px(ctx, x + 57, fy - 12, C.f4); rect(ctx, x + 58.5, fy - 11.5, 1.5, 4, C.f1);
  for (const wx of [x + 8, x + 84]) {
    bigWindow(ctx, wx, fy + 26, 26, 24, { seed: wx, curtain: false });
    awning(ctx, wx - 6, fy + 10, 38, 11, [C.b2, C.paper], 6);
    ctx.save(); ctx.translate(wx - 4, base - 28); planks(ctx, 34, 28, { seed: wx + 1, size: 6 }); ctx.restore();
    rect(ctx, wx - 6, base - 31, 38, 4, C.w5); rect(ctx, wx - 6, base - 31, 38, 1, C.w6);
    goods(ctx, wx - 4, base - 33, 34, wx);
  }
  bigDoor(ctx, x + 44, base - 74, 30, 74, { seed: 6 });
  wallLight(ctx, x, fy, w, base);
  bigCrate(ctx, x - 18, base + 2, 2.8); bigSack(ctx, x + w + 14, base + 4); bigBarrel(ctx, x + w + 22, base + 8, 2.8);
  grassTufts(ctx, 2, base + 4, 164, { seed: 22, flowers: 0.2 });
}

function store8(ctx) {
  // Casa de comércio de dois andares, barracas coloridas nas pontas, bandeiras no telhado e lucarna.
  const x = 30; const base = 168; const w = 140; const h = 120; const d = 28;
  const up = 48;
  const front = (c, ww, hh) => { plaster(c, ww, up, { seed: 71 }); timber(c, ww, up, [0, 30, 58, 82, 110, ww - 5], { pw: 5, beam: 5 }); c.save(); c.translate(0, up); planks(c, ww, hh - up, { seed: 72, size: 6 }); c.restore(); rect(c, 0, up - 2, ww, 5, C.w5); rect(c, 0, up - 2, ww, 1, C.w6); };
  const side = (c, ww, hh) => { plaster(c, ww, up, { seed: 73 }); c.save(); c.translate(0, up); planks(c, ww, hh - up, { seed: 74, size: 6 }); c.restore(); };
  const { fy } = box(ctx, { x, base, w, h, d, front, side });
  chimney(ctx, x + w - 26, fy - 38, 12, 32, { seed: 75 });
  eaveShade(ctx, x, fy, w);
  gableRoof(ctx, { x, wallTop: fy, w, d, rise: 22, over: 7, drop: 5, roof: roofPainter({ seed: 76, moss: 0.4, barrel: true, rowH: 5, tileW: 6 }), gable: (c, ww, hh) => plaster(c, ww, hh, { seed: 77 }) });
  frontGable(ctx, { cx: x + 70, wallTop: fy + 3, w: 38, d: 16, rise: 26, over: 3, drop: 2, roof: roofPainter({ seed: 78, barrel: true, rowH: 5, tileW: 6 }), pediment: (c, ww, hh) => plaster(c, ww, hh, { seed: 79 }) });
  ellipse(ctx, x + 70, fy - 6, 7, 7, C.w1); ellipse(ctx, x + 70, fy - 6, 5.4, 5.4, C.f3); ellipse(ctx, x + 68, fy - 8, 1.6, 1.6, C.white);
  rect(ctx, x + 69.3, fy - 11.5, 1.5, 11, C.w1); rect(ctx, x + 64.5, fy - 6.7, 11, 1.5, C.w1);
  for (const [wx, s] of [[x + 9, 1], [x + 37, 2], [x + 89, 3], [x + 117, 4]]) bigWindow(ctx, wx, fy + 12, 16, 20, { box: true, seed: s });
  bigWindow(ctx, x + 12, base - 60, 26, 28, { box: true, seed: 5 });
  bigWindow(ctx, x + 102, base - 60, 26, 28, { box: true, seed: 6 });
  bigDoor(ctx, x + 53, base - 74, 34, 74, { seed: 7 });
  scaled(ctx, x + 90, base - 72, 2, () => hangingSign(ctx, 0, 0, 9, 6, (c, sx, sy) => { ellipse(c, sx + 3.5, sy + 2, 2, 2, C.f3); px(c, sx + 2.5, sy + 1, C.f4); }));
  wallLight(ctx, x, fy, w, base);
  for (const [fx, color] of [[x + 10, C.b2], [x + w - 12, C.red]]) {
    rect(ctx, fx, fy - 46, 2, 30, C.w2);
    fillPoly(ctx, [[fx + 2, fy - 46], [fx + 18, fy - 41], [fx + 2, fy - 35]], color);
    px(ctx, fx + 4, fy - 44, C.white);
  }
  bigStall(ctx, 2, 186, 46, [C.m1, C.paper], { seed: 11, height: 70 });
  bigStall(ctx, 152, 186, 46, [C.r1, C.paper], { seed: 12, height: 70 });
  bigCrate(ctx, 56, base + 14, 2.4); bigSack(ctx, 144, base + 16);
  grassTufts(ctx, 2, 196, 196, { seed: 24, flowers: 0.2 });
}





// ---------- Ferreiro ----------

function anvil(ctx, cx, base) {
  rect(ctx, cx - 2, base - 3, 4, 3, C.w2); rect(ctx, cx - 2, base - 3, 1, 3, C.w3);
  fillPoly(ctx, [[cx - 5, base - 6], [cx + 4, base - 6], [cx + 3, base - 4], [cx - 3, base - 4]], C.g1);
  rect(ctx, cx - 5, base - 7, 9, 1, C.g3); px(ctx, cx - 5, base - 7, C.g4);
  fillPoly(ctx, [[cx - 7, base - 7], [cx - 5, base - 7], [cx - 5, base - 5.5]], C.g2);
}

function hammerIcon(c, x, y, w, h) {
  rect(c, x + w / 2 - 0.5, y + 1, 1, h - 1, C.w2);
  rect(c, x, y, w, 2, C.g1); px(c, x, y, C.g3);
}


function forgeFront(seed) {
  return (c, w, h) => stones(c, w, h, { seed, moss: 0.3, cracks: 0.25, pal: STONE });
}



// ---------- Fazenda ----------

function crops(ctx, x, y, cols, rows, kind = 'wheat', seed = 1) {
  const r = rng(seed);
  for (let row = 0; row < rows; row += 1) {
    const ry = y + row * 4;
    rect(ctx, x, ry, cols * 4, 3, C.w2);
    rect(ctx, x, ry, cols * 4, 1, C.w3);
    for (let col = 0; col < cols; col += 1) {
      const cx = x + col * 4 + 1;
      if (kind === 'wheat') {
        for (let k = 0; k < 3; k += 1) { rect(ctx, cx + k, ry - 3, 1, 3, C.r5); px(ctx, cx + k, ry - 4, C.cream); }
        px(ctx, cx + 1, ry - 1, C.w5);
      } else if (kind === 'cabbage') {
        ellipse(ctx, cx + 1.2, ry - 1, 2, 1.6, C.m2); ellipse(ctx, cx + 0.8, ry - 1.5, 1, 0.8, C.m4);
      } else {
        rect(ctx, cx, ry - 3, 1, 3, C.m2); rect(ctx, cx + 2, ry - 2, 1, 2, C.m2); px(ctx, cx, ry - 4, C.m4);
        if (r() < 0.5) px(ctx, cx + 1, ry - 1, C.red);
      }
    }
  }
}

function fenceRun(ctx, x, y, len, { pal = WOOD } = {}) {
  rect(ctx, x, y + 2, len, 1, pal.light); rect(ctx, x, y + 3, len, 1, pal.dark);
  rect(ctx, x, y + 5, len, 1, pal.tones[0]); rect(ctx, x, y + 6, len, 1, pal.dark);
  for (let px0 = x; px0 <= x + len - 2; px0 += 6) {
    rect(ctx, px0, y, 2, 9, pal.tones[0]); rect(ctx, px0, y, 1, 9, pal.light); px(ctx, px0, y, pal.hi); px(ctx, px0 + 1, y + 8, pal.gap);
  }
}

function scarecrow(ctx, x, base) {
  rect(ctx, x, base - 13, 1, 13, C.w2);
  rect(ctx, x - 4, base - 10, 9, 1, C.w3);
  rect(ctx, x - 2, base - 10, 5, 5, C.r1); rect(ctx, x - 2, base - 10, 1, 5, C.r3);
  ellipse(ctx, x + 0.5, base - 12, 1.8, 1.8, C.sand);
  rect(ctx, x - 2.5, base - 15, 6, 1, C.w4); rect(ctx, x - 1, base - 17, 3, 2, C.w4);
  px(ctx, x, base - 12, C.ink); px(ctx, x + 1, base - 12, C.ink);
  for (const hx of [x - 5, x + 5]) px(ctx, hx, base - 10, C.r5);
}

function barnFront(seed) {
  return (c, w, h) => { planks(c, w, h, { pal: WOOD_RED, vertical: true, seed, size: 3, worn: 0.08 }); rect(c, 0, h - 4, w, 4, 'rgba(26,25,50,0.0)'); };
}

function barnDoors(ctx, x, y, w, h) {
  rect(ctx, x - 1, y - 1, w + 2, h + 1, C.paper);
  ctx.save(); ctx.translate(x, y); planks(ctx, w, h, { pal: WOOD_RED, vertical: true, seed: 2, size: 3, nails: false }); ctx.restore();
  rect(ctx, x + w / 2 - 0.5, y, 1, h, C.paper);
  for (const sx of [x, x + w / 2 + 0.5]) { line(ctx, sx + 0.5, y + 0.5, sx + w / 2 - 1, y + h - 0.5, C.paper, 1); line(ctx, sx + w / 2 - 1, y + 0.5, sx + 0.5, y + h - 0.5, C.paper, 1); }
}

function silo(ctx, x, base, w, h) {
  const top = base - h;
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, C.g3); g.addColorStop(0.3, C.slate4); g.addColorStop(0.6, C.g3); g.addColorStop(1, C.g1);
  ctx.fillStyle = g; ctx.fillRect(x, top, w, h);
  for (let y = top + 3; y < base; y += 4) rect(ctx, x, y, w, 1, 'rgba(28,18,28,0.35)');
  for (let y = top + 2; y < base; y += 8) for (let k = 1; k < w; k += 3) px(ctx, x + k, y, C.g4);
  ellipse(ctx, x + w / 2, top, w / 2 + 0.5, 3, C.r1);
  fillPoly(ctx, [[x - 0.5, top], [x + w / 2, top - 5], [x + w + 0.5, top]], C.r3);
  fillPoly(ctx, [[x + w / 2, top - 5], [x + w + 0.5, top], [x + w / 2 + 1, top]], C.r1);
  line(ctx, x, top + 0.5, x + w / 2, top - 4.5, C.r4, 1);
  baseShade(ctx, x, base, w, 3);
  rect(ctx, x + w / 2 - 1, top + 4, 2, 3, C.ink);
}



function windmill(ctx, cx, base) {
  // Torre de pedra cônica com pás de lona.
  const top = base - 30;
  fillPoly(ctx, [[cx - 6, base], [cx - 4, top], [cx + 4, top], [cx + 6, base]], C.g3);
  clip(ctx, [[cx - 6, base], [cx - 4, top], [cx + 4, top], [cx + 6, base]], () => { ctx.save(); ctx.translate(cx - 6, top); stones(ctx, 12, 30, { seed: 3, rowH: [3, 4], blockW: [3, 5], pal: STONE }); ctx.restore(); });
  veil(ctx, [[cx - 6, base], [cx - 4, top], [cx + 4, top], [cx + 6, base]], cx - 6, 0, cx + 6, 0, [[0, 'rgba(255,236,190,0.12)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(26,25,50,0.45)']]);
  fillPoly(ctx, [[cx - 6, top + 1], [cx, top - 6], [cx + 6, top + 1]], C.r3);
  fillPoly(ctx, [[cx, top - 6], [cx + 6, top + 1], [cx + 1, top + 1]], C.r1);
  rect(ctx, cx - 1.5, base - 7, 3, 7, C.w1);
  windowLit(ctx, cx - 1, top + 9, 2, 3);
  // Pás.
  const hub = [cx, top + 2];
  for (let i = 0; i < 4; i += 1) {
    const a = Math.PI / 4 + i * Math.PI / 2;
    const ex = hub[0] + Math.cos(a) * 15; const ey = hub[1] + Math.sin(a) * 15;
    line(ctx, hub[0], hub[1], ex, ey, C.w2, 1);
    const nx = -Math.sin(a) * 3; const ny = Math.cos(a) * 3;
    fillPoly(ctx, [[hub[0] + Math.cos(a) * 4, hub[1] + Math.sin(a) * 4], [ex, ey], [ex + nx, ey + ny], [hub[0] + Math.cos(a) * 4 + nx, hub[1] + Math.sin(a) * 4 + ny]], i % 2 ? C.paper : C.cream);
    line(ctx, hub[0] + Math.cos(a) * 9 + nx * 0.1, hub[1] + Math.sin(a) * 9, hub[0] + Math.cos(a) * 9 + nx, hub[1] + Math.sin(a) * 9 + ny, C.w4, 0.6);
  }
  ellipse(ctx, hub[0], hub[1], 1.6, 1.6, C.w1); px(ctx, hub[0] - 1, hub[1] - 1, C.w5);
}


// ---------- Mercado ----------

function awning(ctx, x, y, w, depth, colors = [C.red, C.paper], sw = 3) {
  // Toldo listrado inclinado com franja ondulada (sw = largura da listra).
  const n = (k) => Math.round(k / sw) % 2;
  const pts = [[x, y + depth], [x + sw * 0.7, y], [x + w - sw * 0.7, y], [x + w, y + depth]];
  clip(ctx, pts, () => {
    for (let k = 0; k < w; k += sw) {
      rect(ctx, x + k, y, sw, depth, colors[n(k)]);
      if (sw > 4) { rect(ctx, x + k, y, 1, depth, 'rgba(255,240,200,0.25)'); rect(ctx, x + k + sw - 1, y, 1, depth, 'rgba(26,25,50,0.22)'); }
    }
    if (sw > 4) for (let yy = y + 3; yy < y + depth; yy += 4) rect(ctx, x, yy, w, 1, 'rgba(26,25,50,0.08)');
  });
  veil(ctx, pts, 0, y, 0, y + depth, [[0, 'rgba(255,240,200,0.2)'], [1, 'rgba(26,25,50,0.24)']]);
  for (let k = 0; k < w; k += sw) {
    ellipse(ctx, x + k + sw / 2, y + depth, sw / 2, sw * 0.4, colors[n(k)]);
    px(ctx, x + k + sw / 2 - 0.5, y + depth + sw * 0.3, 'rgba(26,25,50,0.4)');
  }
  rect(ctx, x, y + depth + Math.max(2, sw * 0.55), w, Math.max(1, sw / 4), 'rgba(26,25,50,0.4)');
}

function produce(ctx, x, y, w) {
  const r = rng(x * 7 + y);
  for (let i = 0; i < w; i += 2) {
    const color = r.pick([C.red, C.f2, C.m3, C.f3, C.r4]);
    ellipse(ctx, x + i + 1, y, 1.1, 1, color); px(ctx, x + i, y - 1, C.white);
  }
}

function stall(ctx, x, base, w, colors) {
  rect(ctx, x + 1, base - 14, 1, 14, C.w2); rect(ctx, x + w - 2, base - 14, 1, 14, C.w2);
  ctx.save(); ctx.translate(x, base - 6); planks(ctx, w, 6, { seed: x, size: 3 }); ctx.restore();
  rect(ctx, x - 1, base - 7, w + 2, 2, C.w5); rect(ctx, x - 1, base - 7, w + 2, 1, C.w6);
  produce(ctx, x + 1, base - 8, w - 2);
  awning(ctx, x - 2, base - 17, w + 4, 5, colors);
}




// ---------- Fogueira ----------

function flame(ctx, cx, base, height, width, frame, seed = 1) {
  const r = rng(seed + frame * 13);
  // Línguas de fogo (deslocamento x, altura relativa, largura relativa), mudando a cada quadro.
  const sets = [
    [[-0.75, 0.5, 0.35], [-0.1, 1, 0.5], [0.55, 0.68, 0.38], [-0.4, 0.8, 0.35], [0.25, 0.6, 0.35]],
    [[-0.7, 0.66, 0.35], [0.1, 0.86, 0.5], [0.7, 0.5, 0.33], [0.4, 0.95, 0.35], [-0.3, 0.55, 0.35]],
    [[-0.8, 0.58, 0.33], [-0.15, 1.05, 0.48], [0.5, 0.8, 0.36], [-0.45, 0.66, 0.35], [0.15, 0.62, 0.4]],
    [[-0.6, 0.78, 0.35], [0.0, 0.84, 0.5], [0.75, 0.6, 0.33], [0.35, 1.0, 0.33], [-0.35, 0.5, 0.4]]
  ][frame % 4];
  const layers = [[1, C.r3], [0.8, C.f0], [0.68, C.f1], [0.5, C.f2], [0.32, C.f3], [0.16, C.f4]];
  for (const [k, color] of layers) {
    ctx.fillStyle = color;
    for (const [ox, hf, wf] of sets) {
      const hgt = height * hf * (0.25 + 0.75 * k);
      const wid = width * wf * (0.3 + 0.7 * k) + 0.4;
      const x0 = cx + ox * width * (0.4 + 0.6 * k);
      const lean = ox * 1.5 + (frame % 2 ? 0.6 : -0.6);
      ctx.beginPath();
      ctx.moveTo(x0 - wid, base);
      ctx.bezierCurveTo(x0 - wid * 1.2, base - hgt * 0.4, x0 - wid * 0.4 + lean * 0.4, base - hgt * 0.75, x0 + lean, base - hgt);
      ctx.bezierCurveTo(x0 + wid * 0.5 + lean * 0.3, base - hgt * 0.65, x0 + wid * 1.2, base - hgt * 0.35, x0 + wid, base);
      ctx.closePath(); ctx.fill();
    }
  }
  for (let i = 0; i < 3; i += 1) px(ctx, Math.round(cx + r.range(-width, width)), Math.round(base - height - 1 - r() * 5), r() < 0.5 ? C.f3 : C.f2);
}

function stoneRing(ctx, cx, cy, rx, ry, n, size = 2.2, pal = STONE) {
  const back = []; const frontS = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    (Math.sin(a) < 0 ? back : frontS).push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, i]);
  }
  const rock = ([sx, sy, i]) => {
    const tone = [pal.tones[0], pal.tones[1], pal.tones[2]][i % 3];
    ellipse(ctx, sx, sy, size, size * 0.78, pal.shade);
    ellipse(ctx, sx - 0.3, sy - 0.4, size - 0.5, size * 0.78 - 0.5, tone);
    ellipse(ctx, sx - 0.7, sy - 0.9, size * 0.4, size * 0.3, pal.light);
  };
  return { back: () => back.forEach(rock), front: () => frontS.forEach(rock) };
}

function campfire(ctx, frame, { w, h, base, rx, ry, n, flameH, flameW, logsN = 3, size = 2.2, extra }) {
  const cx = w / 2;
  const ring = stoneRing(ctx, cx, base - ry, rx, ry, n, size);
  ring.back();
  // Brasas e cinza.
  ellipse(ctx, cx, base - ry, rx - 1.5, ry - 1, C.g1);
  ellipse(ctx, cx, base - ry, rx - 3, ry - 2, C.r1);
  for (let i = 0; i < 6; i += 1) px(ctx, Math.round(cx - rx + 3 + i * (rx - 2) / 3), Math.round(base - ry + (i % 2 ? 0 : -1)), i % 2 ? C.f1 : C.r3);
  // Toras cruzadas.
  for (let i = 0; i < logsN; i += 1) {
    const a = -0.5 + i * (1 / Math.max(1, logsN - 1));
    const lx = Math.cos(a * 2.4) * (rx - 1); const ly = Math.sin(a * 2.4) * (ry - 1);
    line(ctx, cx - lx, base - ry + ly * 0.5, cx + lx * 0.4, base - ry - 2 - ly * 0.3, C.w2, 2.2);
    line(ctx, cx - lx, base - ry + ly * 0.5 - 0.6, cx + lx * 0.4, base - ry - 2.6 - ly * 0.3, C.w4, 0.8);
    ellipse(ctx, cx - lx, base - ry + ly * 0.5, 1.1, 1.1, C.w5);
  }
  flame(ctx, cx, base - ry + 1, flameH, flameW, frame, w);
  ring.front();
  extra?.(ctx, frame);
}

function brazier(ctx, cx, base, frame, s = 1) {
  // Braseiro de ferro com tigela e pés (estágio 8, nas laterais).
  rect(ctx, cx - 0.5, base - 6 * s, 1, 6 * s, C.g1);
  line(ctx, cx, base - 3 * s, cx - 2.5 * s, base, C.g1, 1); line(ctx, cx, base - 3 * s, cx + 2.5 * s, base, C.g1, 1);
  fillPoly(ctx, [[cx - 3 * s, base - 9 * s], [cx + 3 * s, base - 9 * s], [cx + 2 * s, base - 6 * s], [cx - 2 * s, base - 6 * s]], C.g2);
  rect(ctx, cx - 3 * s, base - 9 * s, 6 * s, 1, C.g4);
  flame(ctx, cx, base - 9 * s, 6 * s, 2 * s, (frame + 1) % 4, 7);
}

// ---------- Cerca e lampião ----------

function fence(ctx) {
  // Cerca rústica: 3 mourões e 2 travessas, com grama na base.
  const P = WOOD;
  for (const y of [5, 9]) {
    rect(ctx, 0, y, 32, 2, P.tones[0]); rect(ctx, 0, y, 32, 1, P.light); rect(ctx, 0, y + 2, 32, 1, 'rgba(26,25,50,0.35)');
    for (let x = 3; x < 32; x += 7) px(ctx, x, y + 1, P.dark);
  }
  for (const x of [1, 15, 29]) {
    rect(ctx, x, 2, 3, 13, P.tones[0]); rect(ctx, x, 2, 1, 13, P.light); rect(ctx, x + 2, 2, 1, 13, P.dark);
    rect(ctx, x, 2, 3, 1, P.hi); px(ctx, x + 1, 7, C.g1); px(ctx, x + 1, 11, C.g1);
    rect(ctx, x, 13, 3, 2, 'rgba(26,25,50,0.4)');
  }
  grassTufts(ctx, 0, 16, 32, { seed: 3, density: 0.4, flowers: 0.05 });
}

// Fase 22c: cerca correndo de norte a sul (lados do curral), vista de cima: mourões um atrás do outro e as
// travessas como duas tábuas em pé ligando os mourões (antes era a cerca horizontal girada 90°).
function fenceV(ctx) {
  const P = WOOD;
  // Duas travessas em pé (alta e baixa) correndo para o fundo, ao lado dos mourões.
  for (const [x, tone] of [[6, P.tones[0]], [8, P.dark]]) {
    rect(ctx, x, 4, 2, 25, tone); rect(ctx, x, 4, 1, 25, x === 6 ? P.light : P.tones[0]);
    for (let y = 7; y < 28; y += 5) px(ctx, x + 1, y, P.dark);
  }
  for (const y0 of [2, 19]) {
    rect(ctx, 3, y0, 3, 10, P.tones[0]); rect(ctx, 3, y0, 1, 10, P.light); rect(ctx, 5, y0, 1, 10, P.dark);
    rect(ctx, 3, y0, 3, 1, P.hi); px(ctx, 4, y0 + 4, C.g1);
    rect(ctx, 3, y0 + 8, 3, 2, 'rgba(26,25,50,0.4)');
  }
  grassTufts(ctx, 0, 32, 12, { seed: 4, density: 0.5, flowers: 0.05 });
}

function lamp(ctx) {
  // Poste de ferro com braço, lanterna acesa e base de pedra.
  const cx = 10;
  rect(ctx, cx - 3, 31, 6, 3, C.g3); rect(ctx, cx - 3, 31, 6, 1, C.g4); rect(ctx, cx - 3, 33, 6, 1, C.g2);
  rect(ctx, cx - 1, 9, 2, 22, C.g1); rect(ctx, cx - 1, 9, 1, 22, C.g2);
  rect(ctx, cx - 2, 28, 4, 1, C.g2);
  ellipse(ctx, cx, 8, 1.6, 1.4, C.g1);
  // Lanterna.
  rect(ctx, cx - 3, 10, 6, 1, C.g1); rect(ctx, cx - 2, 9, 4, 1, C.g2);
  rect(ctx, cx - 3, 11, 6, 7, C.f2);
  rect(ctx, cx - 2, 12, 4, 5, C.f3); rect(ctx, cx - 1, 13, 2, 3, C.f4); px(ctx, cx - 2, 12, C.white);
  rect(ctx, cx - 3, 11, 1, 7, C.g1); rect(ctx, cx + 2, 11, 1, 7, C.ink); rect(ctx, cx - 0.5, 11, 1, 7, 'rgba(28,18,28,0.6)');
  rect(ctx, cx - 4, 18, 8, 1, C.g1); rect(ctx, cx - 4, 18, 8, 0.5, C.g3);
  fillPoly(ctx, [[cx - 4, 10], [cx, 6], [cx + 4, 10]], C.g1);
  line(ctx, cx - 3.5, 9.8, cx, 6.5, C.g3, 0.7);
  px(ctx, cx, 5, C.g2);
  mossBand(ctx, cx - 3, 31, 6, { seed: 2, density: 0.5, reach: 2 });
  grassTufts(ctx, cx - 7, 35, 14, { seed: 5, density: 0.5 });
}

// ---------- Registro ----------

const S1 = (paint, shadow) => ({ w: 144, h: 150, paint, shadow });
const S4 = (paint, shadow) => ({ w: 168, h: 176, paint, shadow });
const S8 = (paint, shadow) => ({ w: 200, h: 200, paint, shadow });

const SMALL = {
  campfire: { w: 24, h: 30, frames: 4, shadow: [12, 26, 10, 2.5], paint: (ctx, f) => campfire(ctx, f, { w: 24, h: 30, base: 27, rx: 7, ry: 3.2, n: 9, flameH: 16, flameW: 4.2, size: 1.9 }) },
  campfire4: { w: 32, h: 32, frames: 4, shadow: [16, 28, 13, 3], paint: (ctx, f) => campfire(ctx, f, { w: 32, h: 32, base: 29, rx: 10, ry: 4.2, n: 11, flameH: 19, flameW: 5.6, logsN: 4, size: 2.3 }) },
  campfire8: { w: 40, h: 40, frames: 4, shadow: [20, 36, 17, 3.5], paint: (ctx, f) => campfire(ctx, f, { w: 40, h: 40, base: 36, rx: 11, ry: 4.6, n: 12, flameH: 23, flameW: 6.4, logsN: 5, size: 2.6, extra: (c, fr) => { brazier(c, 4, 38, fr, 0.9); brazier(c, 36, 38, fr, 0.9); } }) },
  fence: { w: 32, h: 16, paint: fence },
  'fence-v': { w: 12, h: 32, paint: fenceV },
  lamp: { w: 20, h: 36, shadow: [10, 34, 5, 1.5], paint: lamp }
};

/** Escala de cada peça pequena (fogueira ~0,8x o herói de largura, cerca na cintura, poste ~1,6x). */
export const CAMP_SCALE = { campfire: 1.6, campfire4: 1.6, campfire8: 1.6, fence: 2.25, 'fence-v': 2.25, lamp: 2.5 };

export const CAMP_PIECES = {
  'house-1': S1(house1, [72, 129, 54, 6]),
  house: S4(house4, [84, 151, 70, 7]),
  'house-8': S8(house8, [100, 171, 90, 8]),
  'forge-1': S1(forge1, [72, 129, 60, 6]),
  forge: S4(forge4, [84, 151, 70, 7]),
  'forge-8': S8(forge8, [100, 171, 90, 8]),
  'farm-1': S1(farm1, [44, 129, 38, 5]),
  farm: S4(farm4, [92, 151, 58, 6]),
  'farm-8': S8(farm8, [122, 171, 62, 7]),
  'store-1': S1(store1, [72, 127, 58, 6]),
  store: S4(store4, [80, 151, 70, 7]),
  'store-8': S8(store8, [100, 171, 92, 8]),
  ...Object.fromEntries(Object.entries(SMALL).map(([name, spec]) => [name, enlarge(spec, CAMP_SCALE[name])]))
};
