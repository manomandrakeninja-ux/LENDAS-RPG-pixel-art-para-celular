// PROPOSTA VISUAL (não altera o jogo): renderiza os prédios atuais e uma versão
// "melhorada" (detalhes extras pintados por cima) em pranchas PNG para comparação.
// Uso: node output/proposta/predios-proposta.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { PixelCanvas } from '../../src/art/pixel.js';
import { nearestHex } from '../../src/art/palette.js';
import { CAMP_PIECES } from '../../scripts/building-paint/camp.mjs';
import { DEFENSE_PIECES } from '../../scripts/building-paint/defense.mjs';
import { C, rect, px, line, ellipse, fillPoly, scaled, smokeWisps, lanternBox, barrel, crate, woodpile, windowLit } from '../../scripts/building-paint/kit.mjs';

const PIECES = { ...CAMP_PIECES, ...DEFENSE_PIECES };
const SS = 4;

// ---- helpers copiados de scripts/bake-buildings.mjs (sem os efeitos colaterais) ----
function paintHiRes(spec, frame) {
  const canvas = createCanvas(spec.w * SS, spec.h * SS);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.scale(SS, SS);
  spec.paint(ctx, frame);
  return ctx.getImageData(0, 0, spec.w * SS, spec.h * SS).data;
}
const rgbKey = (r, g, b) => (r << 16) | (g << 8) | b;
const hexOf = (r, g, b) => `#${((1 << 24) | rgbKey(r, g, b)).toString(16).slice(1)}`;
const quantCache = new Map();
function quant(r, g, b) {
  const key = rgbKey(r, g, b);
  let hex = quantCache.get(key);
  if (!hex) { hex = nearestHex(hexOf(r, g, b)); quantCache.set(key, hex); }
  return hex;
}
function downscale(hi, w, h) {
  const W = w * SS;
  const out = new PixelCanvas(w, h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let alpha = 0; let n = 0; let sr = 0; let sg = 0; let sb = 0;
      const counts = new Map();
      for (let dy = 0; dy < SS; dy += 1) {
        for (let dx = 0; dx < SS; dx += 1) {
          const i = ((y * SS + dy) * W + x * SS + dx) * 4;
          const a = hi[i + 3];
          alpha += a;
          if (a < 128) continue;
          const r = hi[i]; const g = hi[i + 1]; const b = hi[i + 2];
          n += 1; sr += r; sg += g; sb += b;
          const hex = quant(r, g, b);
          counts.set(hex, (counts.get(hex) ?? 0) + 1);
        }
      }
      if (alpha / (SS * SS) < 255 * 0.45 || n === 0) continue;
      let best = null; let bestCount = 0;
      for (const [hex, count] of counts) if (count > bestCount) { best = hex; bestCount = count; }
      out.pixel(x, y, bestCount >= n * 0.4 ? best : quant(Math.round(sr / n), Math.round(sg / n), Math.round(sb / n)));
    }
  }
  return out;
}
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const N8 = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]];
function clean(c) {
  const solid = (x, y) => c.alphaAt(x, y) >= 200;
  const removals = []; const fills = [];
  for (let y = 0; y < c.height; y += 1) {
    for (let x = 0; x < c.width; x += 1) {
      const n4 = N4.filter(([dx, dy]) => solid(x + dx, y + dy)).length;
      if (solid(x, y)) {
        const n8 = N8.filter(([dx, dy]) => solid(x + dx, y + dy)).length;
        if (n4 === 0 && n8 <= 1) removals.push([x, y]);
      } else if (n4 >= 3) {
        const near = N4.filter(([dx, dy]) => solid(x + dx, y + dy)).map(([dx, dy]) => c.colorAt(x + dx, y + dy));
        fills.push([x, y, near[0]]);
      }
    }
  }
  for (const [x, y] of removals) c.clearPixel(x, y);
  for (const [x, y, hex] of fills) c.pixel(x, y, hex);
  return c;
}
function bakeFrame(spec, frame) {
  const sprite = clean(downscale(paintHiRes(spec, frame), spec.w, spec.h));
  if (spec.outline !== false) sprite.outline();
  sprite.quantize();
  const out = new PixelCanvas(spec.w, spec.h);
  if (spec.shadow) out.shadow(...spec.shadow, 120);
  out.blit(sprite, 0, 0);
  return out;
}

// ---- detalhes extras da PROPOSTA (desenhados por cima da arte atual) ----
const EXTRAS = {
  campfire(c) {
    ellipse(c, 12, 25, 7, 2.2, 'rgba(255,140,40,0.30)');
    for (const [x, y] of [[2, 20], [21, 19], [6, 27], [18, 27]]) { ellipse(c, x, y, 1.8, 1.4, C.g2); ellipse(c, x - 0.5, y - 0.5, 0.8, 0.6, C.g4); }
    px(c, 10, 18, C.f4); px(c, 14, 20, C.f2);
  },
  campfire4(c) {
    rect(c, 0, 27, 7, 2, C.w3); rect(c, 25, 27, 7, 2, C.w3); rect(c, 0, 29, 2, 3, C.w2); rect(c, 30, 29, 2, 3, C.w2);
    ellipse(c, 16, 27, 10, 2.6, 'rgba(255,140,40,0.35)');
    px(c, 13, 22, C.f4); px(c, 19, 24, C.f2);
  },
  campfire8(c) {
    line(c, 13, 36, 20, 9, C.w2, 1.6); line(c, 27, 36, 20, 9, C.w2, 1.6); line(c, 20, 36, 20, 7, C.w2, 1.6);
    rect(c, 14, 9, 12, 7, '#2f3237'); rect(c, 14, 9, 12, 1.5, C.g4); line(c, 20, 9, 20, 5, C.g2, 1.2);
    ellipse(c, 20, 33, 14, 3.2, 'rgba(255,140,40,0.40)');
    px(c, 16, 26, C.f4); px(c, 24, 28, C.f2);
  },
  'house-1'(c) {
    rect(c, 100, 24, 9, 18, C.g3); rect(c, 99, 22, 11, 3, C.g4);
    smokeWisps(c, 104, 18, { n: 4 });
    ellipse(c, 44, 78, 8, 9, 'rgba(255,195,90,0.30)');
    rect(c, 34, 90, 20, 4, C.w2);
    for (let k = 0; k < 5; k += 1) px(c, 36 + k * 4, 89, k % 2 ? C.r3 : C.f3);
  },
  house(c) {
    smokeWisps(c, 113, 2, { n: 5 });
    rect(c, 29, 100, 20, 4, C.w2); rect(c, 58, 100, 19, 4, C.w2);
    for (let k = 0; k < 5; k += 1) { px(c, 31 + k * 4, 99, k % 2 ? C.f3 : C.r3); px(c, 60 + k * 4, 99, k % 2 ? C.r3 : C.f3); }
    ellipse(c, 80, 100, 6, 10, 'rgba(255,190,80,0.25)');
  },
  'house-8'(c) {
    for (let x = 8; x <= 192; x += 9) rect(c, x, 156, 2.5, 12, C.paper);
    rect(c, 6, 158, 188, 2, C.paper); rect(c, 6, 163, 188, 1.5, C.g3);
    ellipse(c, 100, 140, 8, 14, 'rgba(255,190,80,0.25)');
    smokeWisps(c, 60, 2, { n: 5 });
  },
  'forge-1'(c) {
    smokeWisps(c, 42, 0, { n: 4 });
    woodpile(c, 120, 128, { cols: 3, rows: 2, r: 3 });
    scaled(c, 132, 122, 2, () => { rect(c, -1, -8, 2, 8, C.w2); rect(c, -6, -13, 12, 8, C.w4); ellipse(c, 0, -9, 3, 3, C.f3); px(c, -1, -10, C.f4); });
    ellipse(c, 36, 100, 14, 16, 'rgba(255,120,50,0.20)');
  },
  forge(c) {
    smokeWisps(c, 116, 2, { n: 5 });
    lanternBox(c, 88, 76);
    crate(c, 128, 140, 7);
    ellipse(c, 36, 112, 16, 18, 'rgba(255,120,50,0.22)');
  },
  'forge-8'(c) {
    smokeWisps(c, 151, -2, { n: 6 });
    lanternBox(c, 64, 60); lanternBox(c, 108, 60);
    for (const fx of [20, 116]) for (let k = 0; k < 4; k += 1) px(c, fx + 12 + (k % 3) * 6, 112 - Math.floor(k / 3) * 5, k % 2 ? C.f2 : C.f4);
  },
  'farm-1'(c) {
    for (let x = 72; x <= 138; x += 8) rect(c, x, 106, 2, 14, C.w3);
    rect(c, 70, 108, 70, 2, C.w2);
    rect(c, 56, 120, 7, 5, C.b2); line(c, 63, 121, 67, 118, C.b2, 1.5);
  },
  farm(c) {
    line(c, 14, 148, 14, 162, C.w2, 2); line(c, 7, 152, 21, 152, C.w2, 2);
    ellipse(c, 14, 146, 3, 3, C.sand); rect(c, 11, 141, 6, 2, C.r1); rect(c, 10, 152, 8, 7, C.b2);
    for (const x of [130, 140, 150]) { line(c, x, 158, x, 150, C.g3, 1.5); ellipse(c, x, 148, 2.2, 2.2, C.f3); }
  },
  'farm-8'(c) {
    rect(c, 4, 180, 192, 10, '#2e6ea6'); rect(c, 4, 180, 192, 2, '#7fb8e8');
    for (const x of [20, 60, 110, 150, 180]) px(c, x, 183, 'rgba(220,240,255,0.8)');
    fillPoly(c, [[20, 168], [34, 168], [31, 176], [23, 176]], C.w3); ellipse(c, 27, 177, 3, 3, C.ink); line(c, 34, 169, 39, 166, C.w2, 1.5);
  },
  'store-1'(c) {
    line(c, 29, 24, 110, 20, C.w1, 1.2);
    for (let k = 0; k < 10; k += 1) {
      const x = 29 + k * 9; const y = 24 - (k % 2);
      fillPoly(c, [[x, y], [x + 5, y - 1], [x + 2.5, y + 5]], k % 2 ? C.r3 : C.f3);
    }
  },
  store(c) {
    lanternBox(c, 78, 64);
    crate(c, 120, 142, 7);
    line(c, 30, 30, 140, 26, C.w1, 1.2);
    for (let k = 0; k < 12; k += 1) {
      const x = 30 + k * 9.5; const y = 30 - (k % 2) * 0.8;
      fillPoly(c, [[x, y], [x + 5, y - 1], [x + 2.5, y + 5]], k % 2 ? C.b3 : C.r3);
    }
  },
  'store-8'(c) {
    line(c, 20, 34, 180, 28, C.w1, 1.4);
    for (let k = 0; k < 18; k += 1) {
      const x = 20 + k * 9; const y = 34 - (k % 2) * 1.1;
      fillPoly(c, [[x, y], [x + 5, y - 1], [x + 2.5, y + 5]], [C.r3, C.f3, C.b3, C.m1][k % 4]);
    }
    scaled(c, 30, 178, 2.2, () => barrel(c, 0, 0));
    scaled(c, 168, 178, 2.2, () => barrel(c, 0, 0));
  },
  'gate-1'(c) {
    for (const x of [4.5, 48.5]) { ellipse(c, x, 2, 2, 3, C.f2); ellipse(c, x, 2.5, 1, 1.5, C.f4); }
    for (let x = 10; x <= 46; x += 6) line(c, x, 8, x, 36, 'rgba(30,20,14,0.55)', 2);
  },
  'gate-4'(c) {
    for (let x = 20; x <= 44; x += 5) line(c, x, 16, x, 46, C.g2, 2);
    for (const y of [22, 32, 42]) line(c, 18, y, 46, y, C.g2, 2);
    for (const x of [9, 55]) { ellipse(c, x, 6, 2.2, 3.2, C.f2); ellipse(c, x, 6.5, 1, 1.6, C.f4); }
  },
  'gate-8'(c) {
    for (const x of [8, 64]) { ellipse(c, x, 4, 2.4, 3.4, C.f2); ellipse(c, x, 4.5, 1.1, 1.7, C.f4); }
    rect(c, 31, 8, 10, 14, C.r1); ellipse(c, 36, 14, 3, 3, C.f3);
    for (let x = 12; x <= 60; x += 6) line(c, x, 24, x, 54, 'rgba(20,16,24,0.5)', 2);
  },
  'tower-1'(c) {
    for (let y = 26; y <= 44; y += 5) line(c, 23, y, 27, y, C.w3, 1.5);
    rect(c, 14, 2, 1.5, 10, C.w2); fillPoly(c, [[15.5, 2], [24, 4], [15.5, 6]], C.r3);
    ellipse(c, 15, 8, 2.5, 3.5, C.f2); ellipse(c, 15, 8.5, 1.2, 1.6, C.f4);
  },
  'tower-stone'(c) {
    rect(c, 13, 20, 3, 8, C.ink); rect(c, 13, 36, 3, 8, C.ink);
    rect(c, 14, 2, 1.5, 8, C.w2); fillPoly(c, [[15.5, 2], [23, 4], [15.5, 6]], C.b3);
    ellipse(c, 15, 9, 2.2, 3, C.f2);
  },
  'tower-8'(c) {
    rect(c, 17, 0, 1.5, 8, C.w2); fillPoly(c, [[18.5, 0], [28, 2.5], [18.5, 5]], C.r3);
    windowLit(c, 16, 30, 4, 6);
    ellipse(c, 18, 62, 5, 6, 'rgba(255,190,80,0.3)');
  },
};

// ---- pranchas ----
const ROWS = [
  ['Fogueira', ['campfire', 'campfire4', 'campfire8']],
  ['Casa', ['house-1', 'house', 'house-8']],
  ['Ferreiro', ['forge-1', 'forge', 'forge-8']],
  ['Fazenda', ['farm-1', 'farm', 'farm-8']],
  ['Mercado', ['store-1', 'store', 'store-8']],
  ['Muralha (portão)', ['gate-1', 'gate-4', 'gate-8']],
  ['Torre de Vigia', ['tower-1', 'tower-stone', 'tower-8']],
];
const HEADERS = ['Nível 1 (níveis 1–3)', 'Nível 4 (níveis 4–7)', 'Nível 8 (níveis 8–10)'];

function toNapi(pc) {
  const c = createCanvas(pc.width, pc.height);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(pc.width, pc.height);
  img.data.set(pc.data);
  ctx.putImageData(img, 0, 0);
  return c;
}

async function sheet(file, withExtras) {
  const M = 18; const LABEL = 190; const CELL = 224; const HEAD = 54; const ROWH = 236;
  const W = M * 2 + LABEL + 3 * CELL;
  const H = HEAD + ROWS.length * ROWH + M;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#141009';
  ctx.fillRect(0, 0, W, H);
  ctx.font = 'bold 24px monospace';
  ctx.fillStyle = '#f2d36b';
  ctx.textBaseline = 'middle';
  HEADERS.forEach((h, i) => ctx.fillText(h, M + LABEL + i * CELL + 8, HEAD / 2));
  ctx.font = 'bold 22px monospace';
  ROWS.forEach(([label, cells], r) => {
    const y0 = HEAD + r * ROWH;
    ctx.fillStyle = '#e8e0c8';
    ctx.fillText(label, M, y0 + ROWH / 2);
    cells.forEach((name, i) => {
      const spec = PIECES[name];
      const x0 = M + LABEL + i * CELL;
      ctx.fillStyle = '#1f1a12';
      ctx.fillRect(x0 + 4, y0 + 4, CELL - 8, ROWH - 8);
      ctx.strokeStyle = '#8a6d1f';
      ctx.strokeRect(x0 + 4.5, y0 + 4.5, CELL - 9, ROWH - 9);
      const wrapped = {
        ...spec,
        paint: (c, f) => { spec.paint(c, f); if (withExtras && EXTRAS[name]) EXTRAS[name](c); },
      };
      const baked = bakeFrame(wrapped, 0);
      const s = Math.max(1, Math.min(4, Math.floor((CELL - 24) / Math.max(spec.w, spec.h))));
      const img = toNapi(baked);
      const dw = spec.w * s; const dh = spec.h * s;
      ctx.drawImage(img, x0 + (CELL - dw) / 2, y0 + ROWH - 8 - dh, dw, dh);
    });
  });
  fs.writeFileSync(file, await canvas.encode('png'));
  console.log('gravou', file);
}

const outDir = path.resolve('output/proposta');
fs.mkdirSync(outDir, { recursive: true });
await sheet(path.join(outDir, 'evolucao-predios-ATUAL.png'), false);
await sheet(path.join(outDir, 'evolucao-predios-PROPOSTA.png'), true);
console.log('done');
