// Item 19: entradas das masmorras (cavernas) e torres das regiões, na escala do herói (56x64).
// Antes eram o quadro `cave-<tema>` do atlas biome (boca de ~40 px) e a torre era a mesma caverna esticada.
// Origem no RegionWorld: (0.5, 0.92). Caverna 192x160 (base y=147, boca 80x88); torre 128x256 (base y=235,
// porta em arco de 34x76).
import {
  C, STONE, STONE_COOL, STONE_DARK, WOOD, WOOD_DARK,
  rng, rect, px, line, ellipse, fillPoly, clip, veil, stones, planks, tiles, mossBand, mossPatches,
  lanternBox, baseShade, grassTufts, scaled
} from './kit.mjs';
import { bigDoor, bigWindow } from './camp.mjs';

const SAND = { mortar: '#5d2c28', deep: '#8a4836', shade: '#ad7954', tones: ['#cba36f', '#e69c69', '#cba36f', '#f6ca9f'], light: '#f6ca9f', hi: '#f9e6cf' };
const ICE = { mortar: C.b0, deep: C.b1, shade: C.slate2, tones: [C.slate3, C.slate4, C.slate3, '#92a1b9'], light: C.slate4, hi: C.white };
const SWAMP = { mortar: '#0e071b', deep: '#1a1932', shade: C.wg1, tones: [C.wg2, C.wg1, C.olive, C.wg3], light: C.wg3, hi: C.g4 };
const OBSIDIAN = { mortar: C.night, deep: C.ink, shade: C.deep, tones: [C.navy, C.g1, C.deep, C.g1], light: C.slate, hi: C.slate2 };

const THEMES = {
  earth: { pal: STONE, roof: { line: C.m0, dark: C.m0, tones: [C.m1, C.m1, C.m2, C.wg1], light: C.m2, hi: C.m3 }, glow: null },
  swamp: { pal: SWAMP, roof: { line: C.night, dark: C.m0, tones: [C.m0, C.wg1, C.m1], light: C.m1, hi: C.m2 }, glow: 'rgba(90,197,79,0.35)' },
  ice: { pal: ICE, roof: { line: C.b0, dark: C.b1, tones: [C.b2, C.b2, C.b1, C.b2], light: C.b3, hi: C.b4 }, glow: 'rgba(0,205,249,0.35)' },
  tomb: { pal: SAND, roof: { line: '#5d2c28', dark: '#8a4836', tones: ['#cba36f', '#ad7954', '#cba36f'], light: '#f6ca9f', hi: '#f9e6cf' }, glow: 'rgba(255,200,37,0.25)' },
  sea: { pal: STONE_COOL, roof: { line: C.r0, dark: C.r1, tones: [C.r3, C.r3, C.r2], light: C.r4, hi: C.r5 }, glow: 'rgba(255,200,37,0.3)' },
  fire: { pal: OBSIDIAN, roof: { line: C.night, dark: C.ink, tones: [C.g1, C.deep, C.navy], light: C.slate, hi: C.slate2 }, glow: 'rgba(237,118,20,0.5)' }
};

/** Massa de rocha com facetas, rachaduras e luz de cima-esquerda (no pixel final). */
function rockMass(ctx, pts, pal, seed) {
  fillPoly(ctx, pts, pal.tones[0]);
  const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  clip(ctx, pts, () => {
    const r = rng(seed);
    const n = Math.round((x1 - x0) * (y1 - y0) / 40);
    for (let i = 0; i < n; i += 1) {
      const x = r.range(x0, x1); const y = r.range(y0, y1);
      const t = (x - x0) / (x1 - x0) * 0.55 + (y - y0) / (y1 - y0) * 0.75 + r.range(-0.12, 0.12);
      const rx = r.range(3, 9); const ry = r.range(2, 5);
      ellipse(ctx, x, y, rx, ry, t < 0.4 ? pal.light : t < 0.62 ? r.pick(pal.tones) : t < 0.85 ? pal.shade : pal.deep);
      if (t < 0.5 && r() < 0.5) rect(ctx, x - rx * 0.6, y - ry, rx, 1, pal.hi);
      else rect(ctx, x - rx * 0.5, y + ry - 1, rx, 1, pal.deep);
    }
    for (let i = 0; i < n / 2; i += 1) px(ctx, Math.round(r.range(x0, x1)), Math.round(r.range(y0, y1)), r() < 0.5 ? pal.hi : pal.deep);
    for (let i = 0; i < 10; i += 1) {
      let x = r.range(x0 + 8, x1 - 8); let y = r.range(y0 + 8, y1 - 8);
      for (let k = 0; k < 4; k += 1) { const nx = x + r.range(-5, 5); const ny = y + r.range(2, 7); line(ctx, x, y, nx, ny, pal.mortar, 1); x = nx; y = ny; }
    }
  });
  veil(ctx, pts, x0, y0, x1, y1, [[0, 'rgba(255,236,190,0.14)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(26,25,50,0.45)']]);
}

function caveMouth(ctx, cx, top, w, base, glow) {
  const pts = [];
  for (let i = 0; i <= 20; i += 1) {
    const a = Math.PI + (i / 20) * Math.PI;
    pts.push([cx + Math.cos(a) * w / 2, top + w * 0.45 + Math.sin(a) * w * 0.45 + (i % 3 === 1 ? 2 : 0)]);
  }
  pts.push([cx + w / 2 + 2, base], [cx - w / 2 - 2, base]);
  fillPoly(ctx, pts, C.night);
  clip(ctx, pts, () => {
    const g = ctx.createRadialGradient(cx, base - 10, 4, cx, base - 20, w * 0.75);
    g.addColorStop(0, glow ?? 'rgba(57,31,33,1)'); g.addColorStop(0.5, 'rgba(26,25,50,1)'); g.addColorStop(1, 'rgba(14,7,27,1)');
    ctx.fillStyle = g; ctx.fillRect(cx - w, top, w * 2, base - top);
    // Chão que desce para dentro (degraus/terra) e parede interna.
    for (let k = 0; k < 6; k += 1) rect(ctx, cx - w / 2 + 10 + k * 3, base - 6 - k * 5, w - 20 - k * 6, 2, k % 2 ? 'rgba(66,76,110,0.6)' : 'rgba(42,47,78,0.7)');
    rect(ctx, cx - w / 2, top, 6, base - top, 'rgba(66,76,110,0.4)');
  });
  return pts;
}

export function cave(theme) {
  return (ctx) => {
    const T = THEMES[theme];
    const pal = T.pal;
    const base = 147; const cx = 96;
    rockMass(ctx, [[4, base], [10, 100], [26, 64], [52, 38], [84, 24], [118, 22], [148, 34], [172, 62], [184, 100], [188, base]], pal, 11);
    if (theme === 'ice') for (let x = 20; x < 176; x += 3) { const y = 24 + Math.abs(x - 100) * 0.42 + Math.sin(x * 0.3) * 3; ellipse(ctx, x, y + 6, 3, 4, C.white); ellipse(ctx, x, y + 9, 2, 2, C.slate4); }
    if (theme === 'earth' || theme === 'swamp') mossPatches(ctx, 180, 70, { seed: 5, count: 14, size: 4 });
    const top = 58; const w = 82;
    caveMouth(ctx, cx, top, w, base, T.glow);
    rockMass(ctx, [[0, base], [2, 116], [18, 104], [36, 110], [44, base]], pal, 12);
    rockMass(ctx, [[148, base], [154, 108], [172, 100], [190, 112], [192, base]], pal, 13);
    if (theme === 'earth') {
      // Escoramento de madeira, lintel, trilhos e lampião.
      for (const [x, d] of [[cx - w / 2 + 2, 0], [cx + w / 2 - 10, 1]]) { ctx.save(); ctx.translate(x, top + 20); planks(ctx, 8, base - top - 20, { pal: d ? WOOD_DARK : WOOD, vertical: true, size: 8, nails: false }); ctx.restore(); }
      ctx.save(); ctx.translate(cx - w / 2 - 4, top + 12); planks(ctx, w + 8, 10, { seed: 7, size: 10 }); ctx.restore();
      rect(ctx, cx - w / 2 - 4, top + 12, w + 8, 1, C.w6);
      for (let y = base - 22; y < base; y += 5) rect(ctx, cx - 22, y, 44, 2, C.w2);
      rect(ctx, cx - 16, base - 26, 2, 26, C.g3); rect(ctx, cx + 14, base - 26, 2, 26, C.g3);
      scaled(ctx, cx + w / 2 + 4, top + 30, 2.4, () => lanternBox(ctx, 0, 0));
    } else if (theme === 'swamp') {
      // Cipós caindo sobre a boca, lama e cogumelos.
      const r = rng(4);
      for (let x = cx - w / 2; x < cx + w / 2; x += 5) { const len = r.int(10, 34); line(ctx, x, top + 4, x + r.range(-2, 2), top + 4 + len, r() < 0.5 ? C.m1 : C.m2, 2); ellipse(ctx, x, top + 4 + len, 2, 1.5, C.m3); }
      ellipse(ctx, cx, base - 2, 40, 6, C.wg1); ellipse(ctx, cx - 6, base - 3, 26, 3, C.olive);
      for (const [mx, my] of [[30, base - 2], [160, base - 4], [168, base - 1]]) { rect(ctx, mx - 1, my - 7, 3, 7, C.paper); ellipse(ctx, mx + 0.5, my - 8, 6, 3.5, C.wine); px(ctx, mx - 2, my - 9, C.white); }
    } else if (theme === 'ice') {
      // Pingentes na borda da boca e cristais.
      const r = rng(6);
      for (let x = cx - w / 2 + 4; x < cx + w / 2 - 2; x += 4) { const len = r.int(6, 18); fillPoly(ctx, [[x - 2, top + 8], [x + 2, top + 8], [x, top + 8 + len]], r() < 0.5 ? C.slate4 : C.white); }
      for (const [kx, ky, s] of [[24, base, 1], [168, base, 1.2]]) { fillPoly(ctx, [[kx - 6 * s, ky], [kx - 2 * s, ky - 30 * s], [kx + 3 * s, ky - 22 * s], [kx + 6 * s, ky]], C.b3); fillPoly(ctx, [[kx - 2 * s, ky - 30 * s], [kx, ky], [kx - 6 * s, ky]], C.b4); }
    } else if (theme === 'tomb') {
      // Moldura de arenito lavrado com colunas, lintel com o disco solar dourado e degraus.
      for (const x of [cx - w / 2 - 6, cx + w / 2 - 8]) { ctx.save(); ctx.translate(x, top + 10); stones(ctx, 14, base - top - 10, { pal: SAND, seed: x, rowH: [8, 8], blockW: [14, 14] }); ctx.restore(); rect(ctx, x, top + 10, 2, base - top - 10, SAND.light); }
      ctx.save(); ctx.translate(cx - w / 2 - 12, top); stones(ctx, w + 24, 14, { pal: SAND, seed: 9, rowH: [7, 7], blockW: [12, 18] }); ctx.restore();
      rect(ctx, cx - w / 2 - 12, top, w + 24, 2, SAND.hi);
      ellipse(ctx, cx, top - 4, 9, 9, C.f2); ellipse(ctx, cx, top - 4, 6, 6, C.f3); ellipse(ctx, cx - 2, top - 6, 2, 2, C.f4);
      for (let k = -2; k <= 2; k += 1) if (k) { rect(ctx, cx + k * 14 - 2, top + 4, 4, 6, '#8a4836'); px(ctx, cx + k * 14 - 1, top + 5, C.f3); }
      for (let k = 0; k < 3; k += 1) rect(ctx, cx - w / 2 + 2 - k * 3, base - 2 - k * 4, w - 4 + k * 6, 4, k % 2 ? SAND.tones[1] : SAND.tones[0]);
    } else if (theme === 'sea') {
      // Tábuas, cordas, caveira pintada, barril e lampião.
      ellipse(ctx, cx, top - 2, 10, 9, C.paper); ellipse(ctx, cx - 1, top - 3, 8, 7, C.white);
      ellipse(ctx, cx - 4, top - 3, 2.6, 3, C.ink); ellipse(ctx, cx + 4, top - 3, 2.6, 3, C.ink); fillPoly(ctx, [[cx - 1, top + 1], [cx + 1, top + 1], [cx, top - 1]], C.ink);
      line(ctx, cx - 14, top + 10, cx + 14, top - 14, C.paper, 3); line(ctx, cx - 14, top - 14, cx + 14, top + 10, C.paper, 3);
      line(ctx, cx - w / 2, top + 26, cx + w / 2, top + 20, C.sand, 2);
      scaled(ctx, cx + w / 2 + 14, base + 2, 3.2, () => { const e = { w: 6, h: 7 }; ellipse(ctx, 0, -0.5, e.w / 2, 1.2, C.w1); rect(ctx, -3, -6, 6, 5.5, C.w3); rect(ctx, -3, -5, 6, 1, C.g1); rect(ctx, -3, -2, 6, 1, C.g1); ellipse(ctx, 0, -6, 3, 1.2, C.w5); });
      scaled(ctx, cx - w / 2 - 12, top + 26, 2.4, () => lanternBox(ctx, 0, 0));
      ellipse(ctx, cx - 10, base + 1, 30, 4, 'rgba(0,105,170,0.55)');
    } else if (theme === 'fire') {
      // Rachaduras de lava brilhando e brasas.
      const r = rng(8);
      for (let i = 0; i < 14; i += 1) { let x = r.range(14, 178); let y = r.range(40, base - 4); for (let k = 0; k < 4; k += 1) { const nx = x + r.range(-6, 6); const ny = y + r.range(2, 8); line(ctx, x, y, nx, ny, C.f1, 2); line(ctx, x, y, nx, ny, C.f3, 0.8); x = nx; y = ny; } }
      for (let i = 0; i < 18; i += 1) px(ctx, Math.round(cx + r.range(-w / 2, w / 2)), Math.round(r.range(top + 20, base - 2)), r() < 0.5 ? C.f3 : C.f2);
    }
    grassTufts(ctx, 2, base + 1, 188, { seed: 3, density: theme === 'ice' || theme === 'fire' || theme === 'tomb' ? 0.05 : 0.35 });
  };
}

function tower(theme) {
  return (ctx) => {
    const T = THEMES[theme];
    const pal = T.pal;
    const base = 235; const cx = 64; const tw = 66; const bodyTop = 72;
    const x = cx - tw / 2;
    // Corpo de cantaria.
    ctx.save(); ctx.translate(x, bodyTop); stones(ctx, tw, base - bodyTop, { pal, seed: 21, rowH: [7, 9], blockW: [10, 16], moss: theme === 'earth' || theme === 'swamp' ? 0.6 : 0, cracks: 0.25 }); ctx.restore();
    veil(ctx, [[x, bodyTop], [x + tw, bodyTop], [x + tw, base], [x, base]], x, 0, x + tw, 0, [[0, 'rgba(255,236,190,0.16)'], [0.45, 'rgba(0,0,0,0)'], [1, 'rgba(26,25,50,0.5)']]);
    // Embasamento mais largo.
    ctx.save(); ctx.translate(x - 7, base - 26); stones(ctx, tw + 14, 26, { pal, seed: 22, rowH: [8, 9], blockW: [14, 20] }); ctx.restore();
    rect(ctx, x - 7, base - 27, tw + 14, 2, pal.hi); veil(ctx, [[x - 7, base - 26], [x + tw + 7, base - 26], [x + tw + 7, base], [x - 7, base]], x - 7, 0, x + tw + 7, 0, [[0, 'rgba(255,236,190,0.1)'], [1, 'rgba(26,25,50,0.45)']]);
    baseShade(ctx, x - 7, base, tw + 14, 6);
    // Janelas em arco subindo a torre.
    const frame = { gap: pal.mortar, dark: pal.deep, tones: [pal.shade], light: pal.light, hi: pal.hi };
    for (const [wx, wy] of [[cx - 5, 100], [cx - 18, 136], [cx + 8, 136]]) bigWindow(ctx, wx, wy, 10, 16, { arch: true, frame, curtain: false, seed: wx + wy });
    // Porta em arco (34x76, ~1,3x o herói) com batente de pedra e degraus.
    bigDoor(ctx, cx - 17, base - 76, 34, 76, { arch: true, jamb: 'stone', seed: 5, step: true });
    // Sacada com ameias.
    const deck = bodyTop - 14;
    ctx.save(); ctx.translate(x - 10, deck); stones(ctx, tw + 20, 14, { pal, seed: 23, rowH: [7, 7], blockW: [10, 14] }); ctx.restore();
    rect(ctx, x - 10, deck, tw + 20, 2, pal.hi);
    for (let k = x - 8; k < x + tw + 6; k += 10) { rect(ctx, k + 3, deck + 14, 3, 5, pal.shade); px(ctx, k + 3, deck + 18, pal.deep); }
    rect(ctx, x - 10, deck + 14, tw + 20, 3, 'rgba(26,25,50,0.45)');
    for (let k = x - 10; k < x + tw + 10; k += 12) { ctx.save(); ctx.translate(k, deck - 10); stones(ctx, 8, 10, { pal, seed: k, rowH: [5, 5], blockW: [8, 8] }); ctx.restore(); rect(ctx, k, deck - 10, 8, 1, pal.hi); }
    // Telhado temático.
    const roofBase = deck - 8;
    if (theme === 'tomb') {
      // Cúpula de arenito com remate dourado.
      ctx.save(); ctx.beginPath(); ctx.ellipse(cx, roofBase, 34, 40, 0, Math.PI, 0); ctx.clip();
      ctx.translate(cx - 34, roofBase - 40); stones(ctx, 68, 40, { pal: SAND, seed: 31, rowH: [6, 6], blockW: [10, 14] }); ctx.restore();
      veil(ctx, [[cx - 34, roofBase], [cx - 34, roofBase - 40], [cx + 34, roofBase - 40], [cx + 34, roofBase]], cx - 34, 0, cx + 34, 0, [[0, 'rgba(255,236,190,0.2)'], [1, 'rgba(26,25,50,0.45)']]);
      rect(ctx, cx - 1.5, roofBase - 54, 3, 14, C.f2); ellipse(ctx, cx, roofBase - 56, 4, 4, C.f3); px(ctx, cx - 2, roofBase - 58, C.f4);
    } else if (theme === 'sea') {
      // Farol: sala da lanterna envidraçada acesa e telhado vermelho.
      rect(ctx, cx - 18, roofBase - 30, 36, 30, C.g1);
      const g = ctx.createRadialGradient(cx, roofBase - 16, 2, cx, roofBase - 16, 18); g.addColorStop(0, C.white); g.addColorStop(0.35, C.f4); g.addColorStop(1, C.f2);
      ctx.fillStyle = g; ctx.fillRect(cx - 16, roofBase - 28, 32, 26);
      for (let k = cx - 16; k < cx + 16; k += 8) rect(ctx, k, roofBase - 28, 2, 26, C.g1);
      const cone = [[cx - 24, roofBase - 30], [cx, roofBase - 66], [cx + 24, roofBase - 30]];
      clip(ctx, cone, () => { ctx.save(); ctx.translate(cx - 24, roofBase - 66); tiles(ctx, 48, 36, { pal: T.roof, seed: 33, rowH: 5, tileW: 6 }); ctx.restore(); });
      veil(ctx, cone, cx - 24, 0, cx + 24, 0, [[0, 'rgba(255,240,200,0.22)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(14,7,27,0.5)']]);
      rect(ctx, cx - 1, roofBase - 72, 2, 7, C.g1);
      for (let k = 0; k < 4; k += 1) rect(ctx, x, bodyTop + 30 + k * 40, tw, 10, 'rgba(234,50,60,0.55)');
    } else {
      // Cone de telhas (musgo, gelo ou obsidiana) com bandeira.
      const cone = [[cx - 44, roofBase], [cx, roofBase - 62], [cx + 44, roofBase]];
      clip(ctx, cone, () => { ctx.save(); ctx.translate(cx - 44, roofBase - 62); tiles(ctx, 88, 62, { pal: T.roof, seed: 34, rowH: 5, tileW: 7, moss: theme === 'earth' || theme === 'swamp' ? 1.2 : 0 }); ctx.restore(); });
      veil(ctx, cone, cx - 44, 0, cx + 44, 0, [[0, 'rgba(255,240,200,0.22)'], [0.45, 'rgba(0,0,0,0)'], [1, 'rgba(14,7,27,0.5)']]);
      line(ctx, cx - 44, roofBase + 0.5, cx + 44, roofBase + 0.5, C.ink, 1);
      if (theme === 'ice') { for (let k = cx - 40; k < cx + 40; k += 5) fillPoly(ctx, [[k - 2, roofBase], [k + 2, roofBase], [k, roofBase + 6 + (k % 3) * 3]], C.slate4); fillPoly(ctx, [[cx - 12, roofBase - 46], [cx, roofBase - 62], [cx + 12, roofBase - 46]], C.white); }
      rect(ctx, cx - 1, roofBase - 78, 2, 18, C.w2);
      fillPoly(ctx, [[cx + 1, roofBase - 78], [cx + 20, roofBase - 73], [cx + 1, roofBase - 67]], theme === 'fire' ? C.red : theme === 'swamp' ? C.m3 : theme === 'ice' ? C.b3 : C.f3);
    }
    // Detalhes do tema no corpo.
    const r = rng(9);
    if (theme === 'earth' || theme === 'swamp') {
      for (let i = 0; i < 5; i += 1) { let vx = r.range(x + 2, x + tw - 2); let vy = bodyTop + r.range(0, 40); for (let k = 0; k < 8; k += 1) { const nx = vx + r.range(-3, 3); const ny = vy + r.range(5, 9); line(ctx, vx, vy, nx, ny, C.m1, 2); if (r() < 0.6) ellipse(ctx, nx + r.range(-2, 2), ny, 2.4, 1.6, r() < 0.5 ? C.m2 : C.m3); vx = nx; vy = ny; } }
    } else if (theme === 'tomb') {
      for (const y of [bodyTop + 10, bodyTop + 60]) { rect(ctx, x, y, tw, 6, '#8a4836'); for (let k = x + 3; k < x + tw - 3; k += 7) { rect(ctx, k, y + 1, 3, 4, C.f3); px(ctx, k + 1, y + 2, '#5d2c28'); } }
    } else if (theme === 'ice') {
      for (let k = x - 8; k < x + tw + 8; k += 4) fillPoly(ctx, [[k - 1.5, deck + 17], [k + 1.5, deck + 17], [k, deck + 23 + (k % 4) * 2]], C.white);
    } else if (theme === 'fire') {
      for (let i = 0; i < 9; i += 1) { let lx = r.range(x + 4, x + tw - 4); let ly = r.range(bodyTop + 4, base - 30); for (let k = 0; k < 4; k += 1) { const nx = lx + r.range(-4, 4); const ny = ly + r.range(3, 8); line(ctx, lx, ly, nx, ny, C.f1, 2); line(ctx, lx, ly, nx, ny, C.f3, 0.8); lx = nx; ly = ny; } }
    }
    grassTufts(ctx, 4, base + 1, 120, { seed: 5, density: theme === 'ice' || theme === 'fire' || theme === 'tomb' ? 0.05 : 0.4 });
  };
}

export const REGION_PIECES = Object.fromEntries(['earth', 'swamp', 'ice', 'tomb', 'sea', 'fire'].flatMap((theme) => [
  [`region-cave-${theme}`, { w: 192, h: 160, paint: cave(theme), shadow: [96, 148, 86, 7] }],
  [`region-tower-${theme}`, { w: 128, h: 256, paint: tower(theme), shadow: [64, 236, 48, 7] }]
]));
