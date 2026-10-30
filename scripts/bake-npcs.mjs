// Fase 20 G-npcs: pinta NPCs, animais e mascotes em alta resolução e converte para pixel art.
//
// Pipeline (o mesmo dos monstros e prédios):
//  1. pintura em 4x com @napi-rs/canvas (scripts/npc-paint/person.mjs, animals.mjs), em "pixels finais";
//  2. redução 4x: moda das 16 amostras levadas à paleta (preserva olhos e mechas de 1 px) ou média quantizada;
//  3. limpeza de pixels soltos e furos; 4. contorno seletivo + luz de borda (PixelCanvas.outline); 5. sombra.
//  6. grava as folhas em public/assets/npcs/<id>.png e o índice src/art/npcSheets.js.
//
// Folhas de pessoas (quadro 56 x 64, pés na linha 62, como as skins):
//  - quem anda: 4 colunas x 5 linhas = baixo, esquerda, direita, cima (4 quadros de andar) + parado
//    de frente [repouso, respira, repouso, pisca];
//  - quem fica parado: 4 colunas x 1 linha [repouso, respira, repouso, pisca].
// Animais e mascotes: 4 quadros de lado (olhando para a direita; o jogo espelha).
//
// Uso: node scripts/bake-npcs.mjs [--only vigia,tiao] [--preview arquivo.png] [--scale 3] [--hires id]
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, Path2D } from '@napi-rs/canvas';
import { PixelCanvas } from '../src/art/pixel.js';
import { nearestHex } from '../src/art/palette.js';
import { writePng } from './png.js';
import { PEOPLE } from './npc-paint/people.mjs';
import { BUILDS, paintPerson } from './npc-paint/person.mjs';
import { CREATURES } from './npc-paint/animals.mjs';

const SS = 4;
const PW = 56;
const PH = 64;
const OUT_DIR = path.resolve('public/assets/npcs');
const INDEX = path.resolve('src/art/npcSheets.js');

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : null; };
const only = opt('only')?.split(',');
const previewFile = opt('preview');
const previewScale = Number(opt('scale') ?? 3);
const hires = opt('hires');

function paintHiRes(w, h, draw, mirror = false) {
  const canvas = createCanvas(w * SS, h * SS);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.scale(SS, SS);
  if (mirror) { ctx.translate(w, 0); ctx.scale(-1, 1); }
  ctx.Path2D = Path2D;
  draw(ctx);
  return { canvas, data: ctx.getImageData(0, 0, w * SS, h * SS).data };
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

function bake(w, h, draw, { mirror = false, shadow = null } = {}) {
  const sprite = clean(downscale(paintHiRes(w, h, draw, mirror).data, w, h));
  sprite.outline();
  sprite.quantize();
  const out = new PixelCanvas(w, h);
  if (shadow) out.shadow(...shadow, 120);
  out.blit(sprite, 0, 0);
  return out;
}

// ---------------------------------------------------------------- folhas

const PERSON_SHADOW = [28, 61.5, 10, 2.4];

function personFrames(spec) {
  const shadow = spec.build === 'child' ? [28, 61.5, 7, 2] : spec.build === 'dwarf' ? [28, 61.5, 11.5, 2.4] : PERSON_SHADOW;
  const draw = (o) => (ctx) => paintPerson(ctx, spec, o);
  const idle = [
    bake(PW, PH, draw({ dir: 'down' }), { shadow }),
    bake(PW, PH, draw({ dir: 'down', breath: 1 }), { shadow }),
    bake(PW, PH, draw({ dir: 'down' }), { shadow }),
    bake(PW, PH, draw({ dir: 'down', blink: true }), { shadow })
  ];
  if (!spec.walks) return { cols: 4, rows: 1, frames: idle };
  const frames = [];
  for (const dir of ['down', 'left', 'right', 'up']) {
    for (let phase = 0; phase < 4; phase += 1) {
      frames.push(bake(PW, PH, draw({ dir: dir === 'left' ? 'right' : dir, phase }), { shadow, mirror: dir === 'left' }));
    }
  }
  return { cols: 4, rows: 5, frames: [...frames, ...idle] };
}

// Rodada 3: animais do curral 1,25x maiores (vaca 1,6x: >= 0,8 da altura do herói) (pintados no tamanho novo, sem esticar pixel no jogo).
const GROW = { chicken: 1.25, sheep: 1.25, pig: 1.25, cow: 1.6 };
const grown = (id, spec) => {
  const k = GROW[id] ?? 1;
  if (k === 1) return spec;
  return { ...spec, w: Math.round(spec.w * k), h: Math.round(spec.h * k), feet: Math.round((spec.feet + 0.5) * k - 0.5), shadow: spec.shadow?.map((v) => v * k), paint: (ctx, f) => { ctx.scale(k, k); spec.paint(ctx, f); } };
};

function creatureFrames(spec) {
  const frames = [];
  for (let f = 0; f < spec.frames; f += 1) frames.push(bake(spec.w, spec.h, (ctx) => spec.paint(ctx, f), { shadow: spec.shadow }));
  return { cols: spec.frames, rows: 1, frames };
}

function sheetOf({ cols, rows, frames }) {
  const fw = frames[0].width;
  const fh = frames[0].height;
  const sheet = new PixelCanvas(fw * cols, fh * rows);
  frames.forEach((frame, i) => sheet.blit(frame, (i % cols) * fw, Math.floor(i / cols) * fh));
  return sheet;
}

if (hires) {
  // Prévia da pintura em alta resolução (antes da redução), para conferir detalhes.
  const spec = PEOPLE[hires];
  const shots = ['down', 'right', 'up'].map((dir) => paintHiRes(PW, PH, (ctx) => paintPerson(ctx, spec, { dir, phase: dir === 'down' ? null : 0 })).canvas);
  const out = createCanvas(PW * SS * 3, PH * SS);
  const octx = out.getContext('2d');
  octx.fillStyle = '#33984b'; octx.fillRect(0, 0, out.width, out.height);
  shots.forEach((c, i) => octx.drawImage(c, i * PW * SS, 0));
  fs.writeFileSync(path.resolve(previewFile ?? '.tmp/npc-hires.png'), out.toBuffer('image/png'));
  console.log('alta resolução', hires);
  process.exit(0);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const index = {};
const preview = [];
const all = [
  ...Object.entries(PEOPLE).map(([id, spec]) => [id, 'person', spec]),
  ...Object.entries(CREATURES).map(([id, spec]) => [id, 'creature', grown(id, spec)])
];
for (const [id, kind, spec] of all) {
  const want = !only || only.includes(id);
  if (want) {
    const baked = kind === 'person' ? personFrames(spec) : creatureFrames(spec);
    writePng(path.join(OUT_DIR, `${id}.png`), sheetOf(baked), { quantize: false });
    preview.push({ id, baked });
  }
  const w = kind === 'person' ? PW : spec.w;
  const h = kind === 'person' ? PH : spec.h;
  index[id] = kind === 'person'
    ? { kind: spec.walks ? 'walker' : 'still', w, h, feet: 62, top: Math.round(62 - (BUILDS[spec.build ?? 'normal'].headY - BUILDS[spec.build ?? 'normal'].ry - 1.6)) }
    : { kind: spec.kind, w, h, frames: spec.frames, feet: spec.feet };
}
const header = '// GERADO por scripts/bake-npcs.mjs (Fase 20 G-npcs). Não editar à mão: repinte em scripts/npc-paint/.\n'
  + '// Folhas em public/assets/npcs/<id>.png. walker: 4x5 (baixo, esquerda, direita, cima, parado); still: 4x1;\n'
  + '// animal/pet: N quadros de lado, olhando para a direita.\n';
fs.writeFileSync(INDEX, `${header}export const NPC_SHEETS = ${JSON.stringify(index, null, 0).replace(/\},"/g, '},\n"')};\n`);
console.log('folhas:', preview.length, '/', all.length);

if (previewFile) {
  const scale = previewScale; const gap = 4; const maxW = 1800;
  const cells = preview.flatMap(({ baked }) => baked.frames.length > 4 ? [baked.frames[16], baked.frames[0], baked.frames[4], baked.frames[8], baked.frames[12]] : baked.frames.slice(0, 2));
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
