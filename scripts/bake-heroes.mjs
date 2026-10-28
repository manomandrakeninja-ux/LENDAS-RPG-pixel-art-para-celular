// Fase 22: pinta o cavaleiro e a heroína em alta resolução (4x), reduz para a paleta e grava as folhas
// 12 colunas x 4 linhas de quadros 56 x 64 (src/art/heroRig.js): public/assets/characters/player-sheet.png
// (cavaleiro, textura 'player') e player-female-sheet.png (heroína, 'player-female').
// Sem arma desenhada e sem sombra no chão. A mão de arma cai em rigFor(textura)[dir].hands[coluna].
// Uso: node scripts/bake-heroes.mjs [--only knight|heroine]
import path from 'node:path';
import { createCanvas, Path2D } from '@napi-rs/canvas';
import { PixelCanvas } from '../src/art/pixel.js';
import { nearestHex } from '../src/art/palette.js';
import { writePng } from './png.js';
import { HERO_COLS, HERO_DIRS, HERO_FRAME, rigFor } from '../src/art/heroRig.js';
import { SPECS, paintHero } from './hero-paint/hero.mjs';

const SS = 4;
const { width: PW, height: PH } = HERO_FRAME;
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const HEROES = [
  { spec: SPECS.knight, texture: 'player', file: 'public/assets/characters/player-sheet.png' },
  { spec: SPECS.heroine, texture: 'player-female', file: 'public/assets/characters/player-female-sheet.png' }
];

function paintHiRes(draw, mirror) {
  const canvas = createCanvas(PW * SS, PH * SS);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.scale(SS, SS);
  if (mirror) { ctx.translate(PW, 0); ctx.scale(-1, 1); }
  ctx.Path2D = Path2D;
  draw(ctx);
  return ctx.getImageData(0, 0, PW * SS, PH * SS).data;
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
// Moda das 16 amostras (preserva viseira e mechas de 1 px); empate fraco cai na média quantizada.
function downscale(hi) {
  const W = PW * SS;
  const out = new PixelCanvas(PW, PH);
  for (let y = 0; y < PH; y += 1) for (let x = 0; x < PW; x += 1) {
    let alpha = 0; let n = 0; let sr = 0; let sg = 0; let sb = 0;
    const counts = new Map();
    for (let dy = 0; dy < SS; dy += 1) for (let dx = 0; dx < SS; dx += 1) {
      const i = ((y * SS + dy) * W + x * SS + dx) * 4;
      const a = hi[i + 3];
      alpha += a;
      if (a < 128) continue;
      n += 1; sr += hi[i]; sg += hi[i + 1]; sb += hi[i + 2];
      const hex = quant(hi[i], hi[i + 1], hi[i + 2]);
      counts.set(hex, (counts.get(hex) ?? 0) + 1);
    }
    if (alpha / (SS * SS) < 255 * 0.45 || n === 0) continue;
    let best = null; let bc = 0;
    for (const [hex, c] of counts) if (c > bc) { best = hex; bc = c; }
    out.pixel(x, y, bc >= n * 0.4 ? best : quant(Math.round(sr / n), Math.round(sg / n), Math.round(sb / n)));
  }
  return out;
}
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const N8 = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]];
function clean(c) {
  const solid = (x, y) => c.alphaAt(x, y) >= 200;
  const rem = []; const fills = [];
  for (let y = 0; y < c.height; y += 1) for (let x = 0; x < c.width; x += 1) {
    const near = N4.filter(([dx, dy]) => solid(x + dx, y + dy));
    if (solid(x, y)) {
      if (near.length === 0 && N8.filter(([dx, dy]) => solid(x + dx, y + dy)).length <= 1) rem.push([x, y]);
    } else if (near.length >= 3) fills.push([x, y, c.colorAt(x + near[0][0], y + near[0][1])]);
  }
  for (const [x, y] of rem) c.clearPixel(x, y);
  for (const [x, y, hex] of fills) c.pixel(x, y, hex);
  return c;
}
function bake(draw, mirror) {
  const sprite = clean(downscale(paintHiRes(draw, mirror)));
  sprite.outline();
  sprite.quantize();
  return sprite;
}

for (const { spec, texture, file } of HEROES) {
  if (only && only !== spec.id) continue;
  const rg = rigFor(texture);
  const sheet = new PixelCanvas(PW * HERO_COLS, PH * HERO_DIRS.length);
  HERO_DIRS.forEach((dir, row) => {
    const left = dir === 'left';
    const pdir = left ? 'right' : dir;
    for (let col = 0; col < HERO_COLS; col += 1) {
      const [hx, hy] = rg[dir].hands[col];
      const bob = col <= 3 ? rg[dir].walkBob[col] : 0;
      const draw = (ctx) => paintHero(ctx, spec, { dir: pdir, flip: left, col, hand: [left ? PW - 1 - hx : hx, hy], bob });
      sheet.blit(bake(draw, left), col * PW, row * PH);
    }
  });
  writePng(path.resolve(file), sheet, { quantize: false });
  console.log('folha', file);
}
