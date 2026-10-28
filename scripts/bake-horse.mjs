// Fase 23: pinta a montaria (cavalo preto-azulado) em 4x e converte para pixel art.
// Mesmo pipeline dos NPCs/monstros: pintura 4x (@napi-rs/canvas) → moda da paleta → limpeza → contorno
// seletivo + luz de borda (PixelCanvas.outline) → sombra. A poeira dos cascos entra sem contorno.
// Saída: src/art/horseSprites.js (RLE em base64), lido por src/art/mountHorse.js.
//
// Uso: node scripts/bake-horse.mjs [--preview pasta] [--scale 3] [--hires dir,quadro]
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, Path2D } from '@napi-rs/canvas';
import { PixelCanvas } from '../src/art/pixel.js';
import { nearestHex } from '../src/art/palette.js';
import { writePng } from './png.js';
import { W, H, G, FRAMES, GALLOP, paintHorse, paintDust } from './horse-paint/horse.mjs';

const SS = 4;
const DIRS = ['down', 'left', 'right', 'up'];
const LAYERS = ['back', 'front'];
const OUT = path.resolve('src/art/horseSprites.js');

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : null; };
const previewDir = opt('preview');
const scale = Number(opt('scale') ?? 3);
const hires = opt('hires');

function paintHiRes(draw) {
  const canvas = createCanvas(W * SS, H * SS);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.scale(SS, SS);
  ctx.Path2D = Path2D;
  const result = draw(ctx);
  return { canvas, result, data: ctx.getImageData(0, 0, W * SS, H * SS).data };
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

function downscale(hi) {
  const WW = W * SS;
  const out = new PixelCanvas(W, H);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      let alpha = 0; let n = 0; let sr = 0; let sg = 0; let sb = 0;
      const counts = new Map();
      for (let dy = 0; dy < SS; dy += 1) {
        for (let dx = 0; dx < SS; dx += 1) {
          const i = ((y * SS + dy) * WW + x * SS + dx) * 4;
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

const SHADOW = { right: [55, G + 0.5, 25, 3.4], left: [57, G + 0.5, 25, 3.4], down: [56, G - 1, 15, 4.2], up: [56, G - 1, 15, 4.2] };

function bakeFrame(dir, frame) {
  const back = paintHiRes((ctx) => paintHorse(ctx, dir, frame, 'back'));
  const front = paintHiRes((ctx) => paintHorse(ctx, dir, frame, 'front'));
  const dust = paintHiRes((ctx) => paintDust(ctx, back.result.hooves, dir));
  const horse = clean(downscale(back.data));
  horse.outline();
  horse.quantize();
  const rider = clean(downscale(front.data));
  rider.outline();
  rider.quantize();
  const puff = downscale(dust.data);
  const outBack = new PixelCanvas(W, H);
  outBack.shadow(...SHADOW[dir], 120);
  outBack.blit(horse, 0, 0);
  if (frame < GALLOP + 0 || frame >= FRAMES - 2) outBack.blit(puff, 0, 0);
  return {
    back: outBack,
    front: rider,
    seat: back.result.seat.map((v) => Math.round(v * 10) / 10),
    hits: back.result.hooves.filter((h) => h.landed > 0.75).map((h) => (h.hoof ?? h.foot).map((v) => Math.round(v)))
  };
}

function encode(frames) {
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
  if (colors.length > 255) throw new Error('cores demais no cavalo');
  return { colors: colors.join(','), data: Buffer.from(bytes).toString('base64') };
}

if (hires) {
  const [dir, f] = hires.split(',');
  const { canvas } = paintHiRes((ctx) => { paintHorse(ctx, dir, Number(f), 'back'); return paintHorse(ctx, dir, Number(f), 'front'); });
  fs.mkdirSync(path.resolve(previewDir ?? '.tmp'), { recursive: true });
  fs.writeFileSync(path.resolve(previewDir ?? '.tmp', `hires-${dir}-${f}.png`), canvas.toBuffer('image/png'));
  process.exit(0);
}

const baked = {};
const all = [];
const seats = {};
const hits = {};
for (const dir of DIRS) {
  baked[dir] = [];
  seats[dir] = [];
  hits[dir] = [];
  for (let f = 0; f < FRAMES; f += 1) {
    const r = bakeFrame(dir, f);
    baked[dir].push(r);
    seats[dir].push(r.seat);
    hits[dir].push(r.hits);
  }
}
for (const dir of DIRS) for (const layer of ['back', 'front']) for (const r of baked[dir]) all.push(r[layer]);
const enc = encode(all);
const header = '// GERADO por scripts/bake-horse.mjs (Fase 23). Não editar à mão: repinte em scripts/horse-paint/horse.mjs.\n'
  + '// Quadros 112x96 (cascos na linha 90). Ordem: direção (baixo, esquerda, direita, cima) x camada (back, front)\n'
  + '// x 16 quadros (0-7 galope, 8-13 parado, 14 arrancada, 15 parada). seats = assento [x, y] por quadro;\n'
  + '// hits = cascos que acabaram de tocar o chão (poeira).\n';
const body = {
  w: W, h: H, ground: G, frames: FRAMES, dirs: DIRS, layers: LAYERS,
  seats, hits, colors: enc.colors, data: enc.data
};
fs.writeFileSync(OUT, `${header}export const HORSE_SPRITES = ${JSON.stringify(body)};\n`);
console.log('cavalo:', all.length, 'quadros,', enc.colors.split(',').length, 'cores,', Math.round(enc.data.length / 1024), 'KB');

// ------------------------------------------------------------------ pranchas
function board(rows, cols, cell, file, bg = true) {
  const gap = 4;
  const c = new PixelCanvas(cols * (W * scale + gap) + gap, rows.length * (H * scale + gap) + gap);
  if (bg) for (let py = 0; py < c.height; py += 1) for (let px = 0; px < c.width; px += 1) {
    const n = ((px >> 3) * 7 + (py >> 3) * 13) % 9;
    c.pixel(px, py, n === 0 ? '#1e6f50' : n === 1 ? '#5ac54f' : '#33984b');
  }
  rows.forEach((row, ri) => row.forEach((sprites, ci) => {
    const ox = gap + ci * (W * scale + gap);
    const oy = gap + ri * (H * scale + gap);
    for (const s of sprites) {
      for (let sy = 0; sy < H; sy += 1) for (let sx = 0; sx < W; sx += 1) {
        const i = (sy * W + sx) * 4;
        if (s.data[i + 3] === 0) continue;
        const hex = hexOf(s.data[i], s.data[i + 1], s.data[i + 2]);
        for (let k = 0; k < scale * scale; k += 1) c.pixel(ox + sx * scale + (k % scale), oy + sy * scale + Math.floor(k / scale), hex, s.data[i + 3]);
      }
    }
  }));
  writePng(path.resolve(file), c, { quantize: false });
}

if (previewDir) {
  fs.mkdirSync(path.resolve(previewDir), { recursive: true });
  for (const dir of DIRS) {
    const frames = baked[dir].map((r) => [r.back, r.front]);
    board([frames.slice(0, 8), frames.slice(8, 16)], 8, null, path.join(previewDir, `prancha-${dir}.png`));
  }
  board(DIRS.map((dir) => baked[dir].slice(0, GALLOP).map((r) => [r.back, r.front])), GALLOP, null, path.join(previewDir, 'galope-sequencia.png'));
  console.log('pranchas em', previewDir);
}
