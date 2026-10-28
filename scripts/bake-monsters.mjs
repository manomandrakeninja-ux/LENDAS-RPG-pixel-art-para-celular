// Fase 20G: pinta os monstros em alta resolução e converte para pixel art.
//
// Pipeline (vale para os próximos lotes):
//  1. pintura: cada monstro de scripts/monster-paint/lote*.mjs pinta num canvas 2D (@napi-rs/canvas)
//     4x maior que o tamanho final, numa grade de 64 x 64 unidades, com curvas e degradês;
//  2. redução 4x: cada pixel final junta 16 amostras; cobertura < 45% vira transparente; a cor é a
//     moda das amostras já levadas à paleta (preserva traços finos) ou, se não houver moda clara,
//     a média quantizada;
//  3. limpeza: some pixel isolado, fecha furos de 1 px e tira "pontinhos" de tom quase igual ao vizinho;
//  4. contorno seletivo + luz de borda (PixelCanvas.outline de src/art/pixel.js) e quantização final;
//  5. sombra de contato (PixelCanvas.shadow) por baixo;
//  6. grava src/art/monsterSprites.js (cores RGBA + RLE em base64), lido por src/art/bakedMonsters.js.
//
// Uso: node scripts/bake-monsters.mjs [--only slime,wolf] [--preview arquivo.png] [--scale 3] [--no-write]
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, Path2D } from '@napi-rs/canvas';
import { PixelCanvas, hexToRgb, mix } from '../src/art/pixel.js';
import { nearestHex } from '../src/art/palette.js';
import { writePng } from './png.js';
import { MONSTERS as LOTE1 } from './monster-paint/lote1.mjs';
import { MONSTERS_B as LOTE1B } from './monster-paint/lote1b.mjs';
import { MONSTERS_C as LOTE1C } from './monster-paint/lote1c.mjs';
import { MONSTERS_2A as LOTE2A } from './monster-paint/lote2a.mjs';
import { MONSTERS_2B as LOTE2B } from './monster-paint/lote2b.mjs';
import { MONSTERS_2C as LOTE2C } from './monster-paint/lote2c.mjs';
import { MONSTERS_3A as LOTE3A } from './monster-paint/lote3a.mjs';
import { MONSTERS_3B as LOTE3B } from './monster-paint/lote3b.mjs';
import { MONSTERS_3C as LOTE3C } from './monster-paint/lote3c.mjs';
import { MONSTERS_4 as LOTE4 } from './monster-paint/lote4.mjs';
import { MONSTERS_5 as LOTE5 } from './monster-paint/lote5.mjs';

const PAINTERS = { ...LOTE1, ...LOTE1B, ...LOTE1C, ...LOTE2A, ...LOTE2B, ...LOTE2C, ...LOTE3A, ...LOTE3B, ...LOTE3C, ...LOTE4, ...LOTE5 };
const SS = 4; // superamostragem
const OUT = path.resolve('src/art/monsterSprites.js');
const INK = '#120d12';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : null; };
const only = opt('only')?.split(',');
const previewFile = opt('preview');
const previewScale = Number(opt('scale') ?? 3);
// --no-write: só gera a prévia, sem gravar src/art/monsterSprites.js (útil para pintar em paralelo).
const noWrite = args.includes('--no-write');

/** Pinta um quadro em alta resolução e devolve os pixels RGBA. */
function paintHiRes(spec, size, frame, normalSize) {
  const S = size * SS;
  const canvas = createCanvas(S, S);
  const ctx = canvas.getContext('2d');
  ctx.Path2D = Path2D;
  ctx.scale(S / 64, S / 64);
  spec.paint(ctx, frame, { px: 64 / size, attack: frame === 4, size, normalSize });
  return ctx.getImageData(0, 0, S, S).data;
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

/** Reduz 4x (moda da paleta, com média como reserva). */
function downscale(hi, size) {
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
          // Cor sem pré-multiplicar.
          const r = hi[i]; const g = hi[i + 1]; const b = hi[i + 2];
          n += 1; sr += r; sg += g; sb += b;
          const hex = quant(r, g, b);
          counts.set(hex, (counts.get(hex) ?? 0) + 1);
        }
      }
      if (alpha / (SS * SS) < 255 * 0.45 || n === 0) continue;
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

/** Limpeza: pixels soltos, furos de 1 px e pontinhos. */
function clean(c) {
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
          if (count >= 4 && dist(own, major) < 70) recolors.push([x, y, major]);
        }
      } else if (n4 >= 3) {
        const near = N4.filter(([dx, dy]) => solid(x + dx, y + dy)).map(([dx, dy]) => c.colorAt(x + dx, y + dy));
        fills.push([x, y, near.sort((a, b) => near.filter((h) => h === b).length - near.filter((h) => h === a).length)[0]]);
      }
    }
  }
  for (const [x, y] of removals) c.clearPixel(x, y);
  for (const [x, y, hex] of [...fills, ...recolors]) c.pixel(x, y, hex);
  return c;
}

/**
 * Contorno dos monstros pintados: 1 px fora da silhueta, no tom do vizinho puxado para a tinta
 * (forte embaixo/direita, mais leve em cima/esquerda), sem trocar o matiz.
 */
function paintedOutline(c, { dark = 0.86, lit = 0.6 } = {}) {
  const marks = [];
  for (let y = 0; y < c.height; y += 1) {
    for (let x = 0; x < c.width; x += 1) {
      if (c.alphaAt(x, y) >= 200) continue;
      const shadowSide = [[0, -1], [-1, 0], [-1, -1]].find(([dx, dy]) => c.alphaAt(x + dx, y + dy) >= 200);
      const litSide = [[0, 1], [1, 0], [1, 1], [1, -1], [-1, 1]].find(([dx, dy]) => c.alphaAt(x + dx, y + dy) >= 200);
      const [dx, dy] = shadowSide ?? litSide ?? [];
      if (dx === undefined) continue;
      const diagonal = dx !== 0 && dy !== 0;
      if (diagonal && !shadowSide) continue;
      marks.push([x, y, mix(c.colorAt(x + dx, y + dy), INK, shadowSide ? dark : lit)]);
    }
  }
  for (const [x, y, hex] of marks) c.pixel(x, y, hex);
  return c;
}

/** Um quadro final: pintura → redução → limpeza → contorno → sombra. */
export function bakeFrame(spec, size, frame, normalSize) {
  const sprite = clean(downscale(paintHiRes(spec, size, frame, normalSize), size));
  if (spec.rim !== false) sprite.rimLight({ strong: spec.rim === 'strong' });
  paintedOutline(sprite).quantize();
  const out = new PixelCanvas(size, size);
  if (spec.shadow) {
    const k = size / 64;
    const [cx, cy, rx, ry] = spec.shadow;
    out.shadow(cx * k, cy * k, rx * k, ry * k, 120);
  }
  out.blit(sprite, 0, 0);
  return out;
}

/** RLE de índices de cor (pares [índice, repetição]) em base64. */
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
  if (colors.length > 255) throw new Error('cores demais num monstro');
  return { colors: colors.join(','), data: Buffer.from(bytes).toString('base64') };
}

async function loadExisting() {
  if (!fs.existsSync(OUT)) return {};
  const mod = await import(`file://${OUT.replace(/\\/g, '/')}?t=${Date.now()}`);
  return { ...mod.BAKED_MONSTERS };
}

const FRAMES = 5; // 0..3 andar, 4 ataque
const result = await loadExisting();
const preview = [];
for (const [kind, spec] of Object.entries(PAINTERS)) {
  if (only && !only.includes(kind)) continue;
  const sizes = [...new Set([spec.size, spec.elite, ...(spec.extra ?? [])])];
  const sheets = {};
  for (const size of sizes) {
    const frames = [];
    for (let f = 0; f < FRAMES; f += 1) frames.push(bakeFrame(spec, size, f, spec.size));
    sheets[size] = encode(frames);
    if (size === spec.size) preview.push({ kind, frames });
  }
  result[kind] = { size: spec.size, elite: spec.elite, frames: FRAMES, attackFrame: 4, sheets };
  console.log(kind, sizes.join('/'), sheets[spec.size].data.length, 'b64');
}

const header = '// GERADO por scripts/bake-monsters.mjs (Fase 20G). Não editar à mão: repinte em scripts/monster-paint/.\n';
const body = `export const BAKED_MONSTERS = ${JSON.stringify(result, null, 0).replace(/\},"/g, '},\n"')};\n`;
if (!noWrite) fs.writeFileSync(OUT, header + body);

if (previewFile) {
  const scale = previewScale; const gap = 8;
  const width = Math.max(...preview.map((p) => (p.frames[0].width * scale + gap) * FRAMES + gap));
  const height = preview.reduce((h, p) => h + p.frames[0].height * scale + gap, gap);
  const c = new PixelCanvas(width, height);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const n = ((x >> 4) * 7 + (y >> 4) * 13) % 5;
    c.pixel(x, y, n === 0 ? '#134c4c' : n === 1 ? '#33984b' : '#1e6f50');
  }
  let oy = gap;
  for (const { frames } of preview) {
    let ox = gap;
    for (const s of frames) {
      for (let sy = 0; sy < s.height; sy += 1) for (let sx = 0; sx < s.width; sx += 1) {
        const i = (sy * s.width + sx) * 4;
        if (s.data[i + 3] === 0) continue;
        const hex = hexOf(s.data[i], s.data[i + 1], s.data[i + 2]);
        for (let k = 0; k < scale * scale; k += 1) c.pixel(ox + sx * scale + (k % scale), oy + sy * scale + Math.floor(k / scale), hex, s.data[i + 3]);
      }
      ox += s.width * scale + gap;
    }
    oy += frames[0].height * scale + gap;
  }
  writePng(path.resolve(previewFile), c, { quantize: false });
}
