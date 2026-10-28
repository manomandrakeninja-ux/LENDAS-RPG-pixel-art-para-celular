// Pinta a vegetação e as pedras em alta resolução (scripts/nature-paint/*.mjs) e converte para pixel art,
// no mesmo pipeline dos prédios (scripts/bake-buildings.mjs): 4x → moda da paleta → limpeza → contorno → sombra.
// Grava src/art/natureSprites.js, lido por src/art/bakedNature.js.
//
// Uso: node scripts/bake-nature.mjs [--only house,forge] [--preview arquivo.png] [--scale 3]
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { PixelCanvas } from '../src/art/pixel.js';
import { nearestHex } from '../src/art/palette.js';
import { writePng } from './png.js';
import { TREE_PIECES } from './nature-paint/trees.mjs';
import { PROP_PIECES } from './nature-paint/props.mjs';

const PIECES = { ...TREE_PIECES, ...PROP_PIECES };
const SS = 4;
const OUT = path.resolve('src/art/natureSprites.js');

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : null; };
const only = opt('only')?.split(',');
const previewFile = opt('preview');
const previewScale = Number(opt('scale') ?? 3);

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

/** Pixel de cor isolada (nenhum vizinho igual) cercado por uma cor dominante vira essa cor: tira o ruído granulado. */
function despeckle(c) {
  const edits = [];
  for (let y = 0; y < c.height; y += 1) {
    for (let x = 0; x < c.width; x += 1) {
      if (c.alphaAt(x, y) < 200) continue;
      const own = c.colorAt(x, y);
      const near = N4.filter(([dx, dy]) => c.alphaAt(x + dx, y + dy) >= 200).map(([dx, dy]) => c.colorAt(x + dx, y + dy));
      if (near.length < 3 || near.includes(own)) continue;
      const counts = new Map();
      for (const h of near) counts.set(h, (counts.get(h) ?? 0) + 1);
      for (const [h, k] of counts) if (k >= 2) edits.push([x, y, h]);
    }
  }
  for (const [x, y, h] of edits) c.pixel(x, y, h);
}

export function bakeFrame(spec, frame) {
  const sprite = clean(downscale(paintHiRes(spec, frame), spec.w, spec.h));
  if (spec.smooth !== false) despeckle(sprite);
  if (spec.outline !== false) sprite.outline();
  sprite.quantize();
  const out = new PixelCanvas(spec.w, spec.h);
  if (spec.shadow) out.shadow(...spec.shadow, 120);
  out.blit(sprite, 0, 0);
  return out;
}

function encode(frames) {
  const colors = []; const index = new Map(); const bytes = [];
  let last = -1; let run = 0;
  const push = () => { if (run > 0) bytes.push(last, run); };
  for (const f of frames) {
    for (let i = 0; i < f.data.length; i += 4) {
      const a = f.data[i + 3];
      const key = a === 0 ? '00000000' : hexOf(f.data[i], f.data[i + 1], f.data[i + 2]).slice(1) + a.toString(16).padStart(2, '0');
      let id = index.get(key);
      if (id === undefined) { id = colors.length; colors.push(key); index.set(key, id); }
      if (id === last && run < 255) run += 1; else { push(); last = id; run = 1; }
    }
  }
  push();
  if (colors.length > 255) throw new Error('cores demais');
  return { colors: colors.join(','), data: Buffer.from(bytes).toString('base64') };
}

async function loadExisting() {
  if (!fs.existsSync(OUT)) return {};
  const mod = await import(`file://${OUT.replace(/\\/g, '/')}?t=${Date.now()}`);
  return { ...mod.BAKED_NATURE };
}

const result = only ? await loadExisting() : {};
const preview = [];
for (const [name, spec] of Object.entries(PIECES)) {
  if (only && !only.some((o) => name === o || name.startsWith(`${o}`))) continue;
  const count = spec.frames ?? 1;
  const frames = [];
  for (let f = 0; f < count; f += 1) frames.push(bakeFrame(spec, f));
  result[name] = { w: spec.w, h: spec.h, frames: count, ...encode(frames) };
  preview.push({ name, frames });
}
const sorted = Object.fromEntries(Object.keys(result).sort().map((k) => [k, result[k]]));
const header = '// GERADO por scripts/bake-nature.mjs. Não editar à mão: repinte em scripts/nature-paint/.\n';
fs.writeFileSync(OUT, `${header}export const BAKED_NATURE = ${JSON.stringify(sorted, null, 0).replace(/\},"/g, '},\n"')};\n`);
console.log('vegetação:', Object.keys(sorted).length, 'bytes', fs.statSync(OUT).size);

if (previewFile) {
  const scale = previewScale; const gap = 6; const maxW = 1500;
  const cells = preview.flatMap(({ frames }) => frames.slice(0, 1));
  // Layout em linhas.
  let x = gap; let y = gap; let rowH = 0; const spots = [];
  for (const s of cells) {
    const w = s.width * scale; const h = s.height * scale;
    if (x + w + gap > maxW) { x = gap; y += rowH + gap; rowH = 0; }
    spots.push([s, x, y]); x += w + gap; rowH = Math.max(rowH, h);
  }
  const c = new PixelCanvas(maxW, y + rowH + gap);
  for (let py = 0; py < c.height; py += 1) for (let px = 0; px < c.width; px += 1) {
    const n = ((px >> 3) * 7 + (py >> 3) * 13) % 9;
    c.pixel(px, py, n === 0 ? '#1e6f50' : n === 1 ? '#5ac54f' : '#33984b');
  }
  for (const [s, ox, oy] of spots) {
    for (let sy = 0; sy < s.height; sy += 1) for (let sx = 0; sx < s.width; sx += 1) {
      const i = (sy * s.width + sx) * 4;
      if (s.data[i + 3] === 0) continue;
      const hex = hexOf(s.data[i], s.data[i + 1], s.data[i + 2]);
      for (let k = 0; k < scale * scale; k += 1) c.pixel(ox + sx * scale + (k % scale), oy + sy * scale + Math.floor(k / scale), hex, s.data[i + 3]);
    }
  }
  writePng(path.resolve(previewFile), c, { quantize: false });
  console.log('prévia', previewFile);
}
