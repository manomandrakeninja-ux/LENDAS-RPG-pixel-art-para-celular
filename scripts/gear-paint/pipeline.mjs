// G-armas: pipeline 4x dos equipamentos (o mesmo dos monstros/NPCs/prédios):
// pintura em alta resolução → redução por moda da paleta → limpeza → luz de borda → contorno que
// preserva o tom → quantização. Usado por scripts/bake-gear.mjs.
import { createCanvas, Path2D } from '@napi-rs/canvas';
import { PixelCanvas, hexToRgb, mix } from '../../src/art/pixel.js';
import { nearestHex } from '../../src/art/palette.js';

export const SS = 4;
const INK = '#120d12';

/** Pinta `paint(ctx)` num canvas 4x de `size` (o contexto já vem em pixels finais). */
export function paintHiRes(size, paint) {
  const S = size * SS;
  const canvas = createCanvas(S, S);
  const ctx = canvas.getContext('2d');
  ctx.Path2D = Path2D;
  ctx.scale(SS, SS);
  paint(ctx);
  return ctx.getImageData(0, 0, S, S).data;
}

const rgbKey = (r, g, b) => (r << 16) | (g << 8) | b;
export const hexOf = (r, g, b) => `#${((1 << 24) | rgbKey(r, g, b)).toString(16).slice(1)}`;
const quantCache = new Map();
function quant(r, g, b) {
  const key = rgbKey(r, g, b);
  let hex = quantCache.get(key);
  if (!hex) { hex = nearestHex(hexOf(r, g, b)); quantCache.set(key, hex); }
  return hex;
}

export function downscale(hi, size, { cover = 0.45 } = {}) {
  const S = size * SS;
  const out = new PixelCanvas(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let alpha = 0; let n = 0; let sr = 0; let sg = 0; let sb = 0;
      const counts = new Map();
      for (let dy = 0; dy < SS; dy += 1) {
        for (let dx = 0; dx < SS; dx += 1) {
          const i = ((y * SS + dy) * S + x * SS + dx) * 4;
          const a = hi[i + 3];
          alpha += a;
          if (a < 128) continue;
          const r = hi[i]; const g = hi[i + 1]; const b = hi[i + 2];
          n += 1; sr += r; sg += g; sb += b;
          const hex = quant(r, g, b);
          counts.set(hex, (counts.get(hex) ?? 0) + 1);
        }
      }
      if (alpha / (SS * SS) < 255 * cover || n === 0) continue;
      let best = null; let bestCount = 0;
      for (const [hex, count] of counts) if (count > bestCount) { best = hex; bestCount = count; }
      const hex = bestCount >= n * 0.4 ? best : quant(Math.round(sr / n), Math.round(sg / n), Math.round(sb / n));
      out.pixel(x, y, hex);
    }
  }
  return out;
}

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const N8 = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]];
function dist(a, b) {
  const [r1, g1, b1] = hexToRgb(a); const [r2, g2, b2] = hexToRgb(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

export function clean(c) {
  const solid = (x, y) => c.alphaAt(x, y) >= 200;
  const removals = []; const fills = []; const recolors = [];
  for (let y = 0; y < c.height; y += 1) {
    for (let x = 0; x < c.width; x += 1) {
      const n4 = N4.filter(([dx, dy]) => solid(x + dx, y + dy)).length;
      const n8 = N8.filter(([dx, dy]) => solid(x + dx, y + dy)).length;
      if (solid(x, y)) {
        if (n4 === 0 && n8 <= 1) { removals.push([x, y]); continue; }
        const own = c.colorAt(x, y);
        const near = N8.filter(([dx, dy]) => solid(x + dx, y + dy)).map(([dx, dy]) => c.colorAt(x + dx, y + dy));
        if (near.length >= 7 && !near.includes(own)) {
          const tally = new Map();
          for (const hex of near) tally.set(hex, (tally.get(hex) ?? 0) + 1);
          const [major, count] = [...tally].sort((a, b) => b[1] - a[1])[0];
          if (count >= 5 && dist(own, major) < 60) recolors.push([x, y, major]);
        }
      } else if (n4 >= 3) {
        const near = N4.filter(([dx, dy]) => solid(x + dx, y + dy)).map(([dx, dy]) => c.colorAt(x + dx, y + dy));
        fills.push([x, y, near[0]]);
      }
    }
  }
  for (const [x, y] of removals) c.clearPixel(x, y);
  for (const [x, y, hex] of [...fills, ...recolors]) c.pixel(x, y, hex);
  return c;
}

/** Contorno de 1 px que preserva o tom do vizinho (forte embaixo/direita, leve em cima/esquerda). */
export function paintedOutline(c, { dark = 0.84, lit = 0.62 } = {}) {
  const marks = [];
  for (let y = 0; y < c.height; y += 1) {
    for (let x = 0; x < c.width; x += 1) {
      if (c.alphaAt(x, y) >= 200) continue;
      const shadowSide = [[0, -1], [-1, 0], [-1, -1]].find(([dx, dy]) => c.alphaAt(x + dx, y + dy) >= 200);
      const litSide = [[0, 1], [1, 0], [1, 1], [1, -1], [-1, 1]].find(([dx, dy]) => c.alphaAt(x + dx, y + dy) >= 200);
      const [dx, dy] = shadowSide ?? litSide ?? [];
      if (dx === undefined) continue;
      if (dx !== 0 && dy !== 0 && !shadowSide) continue;
      marks.push([x, y, mix(c.colorAt(x + dx, y + dy), INK, shadowSide ? dark : lit)]);
    }
  }
  for (const [x, y, hex] of marks) c.pixel(x, y, hex);
  return c;
}

/** Brilho em cruz de 4 pontas (só onde já há pixel ou logo ao lado), feito depois da redução. */
export function twinkle(c, x, y, { color = '#ffffff', arm = 1, halo = '#ffeb57' } = {}) {
  c.pixel(x, y, color);
  for (let k = 1; k <= arm; k += 1) {
    const tone = k === 1 ? halo : mix(halo, '#ffffff', 0.3);
    for (const [dx, dy] of N4) c.pixel(x + dx * k, y + dy * k, tone, k === 1 ? 255 : 170);
  }
}

/** Uma peça final: pintura → redução → limpeza → luz de borda → contorno → quantização → pós (brilhos). */
export function bake(size, paint, { post = null, rim = true } = {}) {
  const sprite = clean(downscale(paintHiRes(size, paint), size));
  if (rim) sprite.rimLight({});
  paintedOutline(sprite).quantize();
  if (post) post(sprite);
  return sprite;
}

/** RLE de índices de cor (pares [índice, repetição]) em base64. */
export function encode(frames) {
  const colors = [];
  const index = new Map();
  const bytes = [];
  let last = -1; let run = 0;
  const push = () => { if (run > 0) bytes.push(last, run); };
  for (const f of frames) {
    for (let i = 0; i < f.data.length; i += 4) {
      const a = f.data[i + 3];
      const key = a === 0 ? '00000000' : hexOf(f.data[i], f.data[i + 1], f.data[i + 2]).slice(1) + a.toString(16).padStart(2, '0');
      let id = index.get(key);
      if (id === undefined) { id = colors.length; colors.push(key); index.set(key, id); }
      if (id === last && run < 255) { run += 1; } else { push(); last = id; run = 1; }
    }
  }
  push();
  if (colors.length > 255) throw new Error('cores demais');
  return { colors: colors.join(','), data: Buffer.from(bytes).toString('base64') };
}

/** Caixa (em pixels finais) do que `paint` desenha, medida num canvas folgado. */
export function measure(size, paint) {
  const pad = size;
  const W = (size + pad * 2) * SS;
  const canvas = createCanvas(W, W);
  const ctx = canvas.getContext('2d');
  ctx.Path2D = Path2D;
  ctx.scale(SS, SS);
  ctx.translate(pad, pad);
  paint(ctx);
  const d = ctx.getImageData(0, 0, W, W).data;
  let x0 = W; let y0 = W; let x1 = -1; let y1 = -1;
  for (let y = 0; y < W; y += 1) for (let x = 0; x < W; x += 1) {
    if (d[(y * W + x) * 4 + 3] < 60) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x: x0 / SS - pad, y: y0 / SS - pad, w: (x1 - x0 + 1) / SS, h: (y1 - y0 + 1) / SS };
}

/** Embrulha `paint` para que o desenho caiba centrado na caixa [m, m, size-2m] (sem passar de maxScale). */
export function fitted(size, paint, { margin = 2.5, maxScale = 1.6 } = {}) {
  const b = measure(size, paint);
  const box = size - margin * 2;
  const s = Math.min(maxScale, box / b.w, box / b.h);
  const ox = size / 2 - (b.x + b.w / 2) * s;
  const oy = size / 2 - (b.y + b.h / 2) * s;
  return { s, ox, oy, paint: (ctx) => { ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s); paint(ctx); ctx.restore(); } };
}
