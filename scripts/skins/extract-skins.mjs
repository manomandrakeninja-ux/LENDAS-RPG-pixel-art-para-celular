// Gera as folhas das skins Espadachim e Guerreira (4 cores) a partir das imagens de referência
// do autor (em .tmp/, fora do repositório). Uso: node scripts/skins/extract-skins.mjs [--debug]
//
// Método: recorta o personagem, tira o fundo (branco ou o painel escuro), reduz por moda de cor
// em cada bloco até a altura alvo, quantiza para uma paleta de 24 cores tirada da própria imagem,
// põe contorno escuro de 1 px e limpa pixels soltos. Andar = pernas deslocadas + balanço de 1 px.
// Saída: public/assets/characters/player-<id>-sheet.png (4 direções x 4 quadros de 48 x 64).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { SKIN_FRAME } from '../../src/art/skins.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REF = path.join(ROOT, '.tmp');
const OUT = path.join(ROOT, 'public/assets/characters');
const DEBUG = process.argv.includes('--debug');
const FW = SKIN_FRAME.width;
const FH = SKIN_FRAME.height;
const FEET = SKIN_FRAME.feet - 1; // última linha das botas (o contorno fica na linha de baixo)
const TARGET = 58; // altura do personagem em pixels
const INK = [24, 12, 16];

// ---------- imagem RGBA simples ----------
const blank = (w, h) => ({ w, h, d: new Uint8ClampedArray(w * h * 4) });
const idx = (im, x, y) => (y * im.w + x) * 4;
const inside = (im, x, y) => x >= 0 && y >= 0 && x < im.w && y < im.h;
const px = (im, x, y) => { const k = idx(im, x, y); return [im.d[k], im.d[k + 1], im.d[k + 2], im.d[k + 3]]; };
const alpha = (im, x, y) => (inside(im, x, y) ? im.d[idx(im, x, y) + 3] : 0);
function put(im, x, y, c) {
  if (!inside(im, x, y)) return;
  const k = idx(im, x, y);
  im.d[k] = c[0]; im.d[k + 1] = c[1]; im.d[k + 2] = c[2]; im.d[k + 3] = c[3] ?? 255;
}
const clone = (im) => ({ w: im.w, h: im.h, d: new Uint8ClampedArray(im.d) });
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
const hex = (c) => '#' + c.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');
const parse = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(255);

function load(file) {
  const png = PNG.sync.read(fs.readFileSync(file));
  return { w: png.width, h: png.height, d: new Uint8ClampedArray(png.data) };
}
function save(file, im) {
  const png = new PNG({ width: im.w, height: im.h });
  png.data = Buffer.from(im.d);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(png));
}
function crop(im, x0, y0, w, h) {
  const out = blank(w, h);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) if (inside(im, x0 + x, y0 + y)) put(out, x, y, px(im, x0 + x, y0 + y));
  return out;
}
function flipX(im) {
  const out = blank(im.w, im.h);
  for (let y = 0; y < im.h; y += 1) for (let x = 0; x < im.w; x += 1) put(out, im.w - 1 - x, y, px(im, x, y));
  return out;
}
function bbox(im) {
  let x0 = im.w, y0 = im.h, x1 = -1, y1 = -1;
  for (let y = 0; y < im.h; y += 1) for (let x = 0; x < im.w; x += 1) {
    if (alpha(im, x, y) > 127) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  }
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
const trim = (im) => { const b = bbox(im); return crop(im, b.x0, b.y0, b.w, b.h); };

// ---------- fundo ----------
/** Inunda a partir das bordas tudo o que é parecido com a cor do fundo e torna transparente. */
function removeBackground(im, tol, step = 0) {
  const border = [];
  for (let x = 0; x < im.w; x += 1) border.push(px(im, x, 0), px(im, x, im.h - 1));
  for (let y = 0; y < im.h; y += 1) border.push(px(im, 0, y), px(im, im.w - 1, y));
  const ref = [0, 1, 2].map((c) => border.map((p) => p[c]).sort((a, b) => a - b)[border.length >> 1]);
  const seen = new Uint8Array(im.w * im.h);
  const stack = [];
  const ok = (x, y, from) => {
    const c = px(im, x, y);
    return dist(c, ref) < tol || (step && from && dist(c, from) < step && dist(c, ref) < tol * 2.5);
  };
  for (let x = 0; x < im.w; x += 1) stack.push([x, 0, null], [x, im.h - 1, null]);
  for (let y = 0; y < im.h; y += 1) stack.push([0, y, null], [im.w - 1, y, null]);
  while (stack.length) {
    const [x, y, from] = stack.pop();
    if (!inside(im, x, y) || seen[y * im.w + x] || !ok(x, y, from)) continue;
    seen[y * im.w + x] = 1;
    const c = px(im, x, y);
    stack.push([x + 1, y, c], [x - 1, y, c], [x, y + 1, c], [x, y - 1, c]);
  }
  const out = clone(im);
  for (let i = 0; i < seen.length; i += 1) if (seen[i]) out.d[i * 4 + 3] = 0;
  return out;
}

// ---------- paleta ----------
/** k-means (k cores) sobre os pixels opacos; começa por amostras espalhadas em luminância. */
function paletteOf(images, k) {
  const samples = [];
  for (const im of images) for (let i = 0; i < im.d.length; i += 4) if (im.d[i + 3] > 127) samples.push([im.d[i], im.d[i + 1], im.d[i + 2]]);
  samples.sort((a, b) => lum(a) - lum(b));
  let centers = Array.from({ length: k }, (_, i) => samples[Math.floor(((i + 0.5) / k) * samples.length)].slice());
  for (let iter = 0; iter < 14; iter += 1) {
    const sum = centers.map(() => [0, 0, 0, 0]);
    for (const s of samples) {
      let best = 0, bd = Infinity;
      centers.forEach((c, i) => { const d = dist(s, c); if (d < bd) { bd = d; best = i; } });
      sum[best][0] += s[0]; sum[best][1] += s[1]; sum[best][2] += s[2]; sum[best][3] += 1;
    }
    centers = centers.map((c, i) => (sum[i][3] ? [0, 1, 2].map((j) => Math.round(sum[i][j] / sum[i][3])) : samples[Math.floor(Math.random() * samples.length)].slice()));
  }
  return centers;
}
const nearest = (c, pal) => { let best = 0, bd = Infinity; pal.forEach((p, i) => { const d = dist(c, p); if (d < bd) { bd = d; best = i; } }); return best; };
function quantize(im, pal) {
  const out = clone(im);
  for (let y = 0; y < im.h; y += 1) for (let x = 0; x < im.w; x += 1) {
    const c = px(im, x, y);
    if (c[3] < 128) { put(out, x, y, [0, 0, 0, 0]); continue; }
    put(out, x, y, pal[nearest(c, pal)]);
  }
  return out;
}

// ---------- redução ----------
/**
 * Reduz por blocos: o pixel alvo fica opaco se mais da metade do bloco é opaca, e sua cor é a
 * moda das cores (já quantizadas) do bloco; traços escuros finos ganham prioridade para não sumir.
 */
function downsample(im, scale, pal) {
  const q = quantize(im, pal);
  const w = Math.max(1, Math.round(im.w / scale));
  const h = Math.max(1, Math.round(im.h / scale));
  const out = blank(w, h);
  const darkLimit = 48;
  for (let ty = 0; ty < h; ty += 1) for (let tx = 0; tx < w; tx += 1) {
    const x0 = Math.floor(tx * scale), x1 = Math.max(x0 + 1, Math.floor((tx + 1) * scale));
    const y0 = Math.floor(ty * scale), y1 = Math.max(y0 + 1, Math.floor((ty + 1) * scale));
    const votes = new Map();
    let solid = 0, total = 0, dark = 0;
    for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) {
      if (!inside(q, x, y)) continue;
      total += 1;
      const c = px(q, x, y);
      if (c[3] < 128) continue;
      solid += 1;
      // O centro do bloco pesa mais (fica mais nítido que uma moda pura).
      const cx = (x + 0.5) / scale - tx - 0.5, cy = (y + 0.5) / scale - ty - 0.5;
      const weight = 1.6 - Math.hypot(cx, cy);
      const key = hex(c);
      votes.set(key, (votes.get(key) ?? 0) + weight);
      if (lum(c) < darkLimit) dark += 1;
    }
    if (!total || solid / total < 0.45) continue;
    let best = null, bv = -1;
    for (const [key, v] of votes) if (v > bv) { bv = v; best = key; }
    let color = parse(best);
    if (dark / solid > 0.5 && lum(color) >= darkLimit) {
      let bd = null, dv = -1;
      for (const [key, v] of votes) if (lum(parse(key)) < darkLimit && v > dv) { dv = v; bd = key; }
      color = parse(bd);
    }
    put(out, tx, ty, color);
  }
  return out;
}

/** Pixel art já em grade (espadachim): acha período e fase da grade e lê a moda de cada célula. */
function gridSample(im, pal) {
  const profile = (axis) => {
    const n = axis === 'x' ? im.w : im.h;
    const m = axis === 'x' ? im.h : im.w;
    const D = new Float64Array(n);
    for (let a = 1; a < n; a += 1) for (let b = 0; b < m; b += 1) {
      const p = axis === 'x' ? px(im, a, b) : px(im, b, a);
      const q = axis === 'x' ? px(im, a - 1, b) : px(im, b, a - 1);
      if (p[3] < 128 && q[3] < 128) continue;
      D[a] += Math.min(120, dist(p, q)) + Math.abs(p[3] - q[3]) / 4;
    }
    let best = { score: -1 };
    for (let period = 8; period <= 13; period += 0.01) {
      for (let phase = 0; phase < period; phase += 0.25) {
        let s = 0, c = 0;
        for (let t = phase; t < n; t += period) { s += D[Math.round(t)] ?? 0; c += 1; }
        const score = s / c;
        if (score > best.score) best = { score, period, phase };
      }
    }
    return best;
  };
  const gx = profile('x'), gy = profile('y');
  const q = quantize(im, pal);
  const cols = Math.floor((im.w - gx.phase) / gx.period), rows = Math.floor((im.h - gy.phase) / gy.period);
  const out = blank(cols, rows);
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) {
    const x0 = gx.phase + c * gx.period, y0 = gy.phase + r * gy.period;
    const votes = new Map();
    let solid = 0, total = 0;
    for (let y = Math.ceil(y0 + gy.period * 0.25); y < y0 + gy.period * 0.75; y += 1) {
      for (let x = Math.ceil(x0 + gx.period * 0.25); x < x0 + gx.period * 0.75; x += 1) {
        total += 1;
        const p = px(q, x, y);
        if (p[3] < 128) continue;
        solid += 1;
        votes.set(hex(p), (votes.get(hex(p)) ?? 0) + 1);
      }
    }
    if (!total || solid / total < 0.5) continue;
    put(out, c, r, parse([...votes].sort((a, b) => b[1] - a[1])[0][0]));
  }
  return { im: out, gx, gy };
}

// ---------- acabamento ----------
/** Contorno de 1 px por fora onde a borda ainda não é escura. */
function outline(im, ink = INK) {
  const out = clone(im);
  for (let y = 0; y < im.h; y += 1) for (let x = 0; x < im.w; x += 1) {
    if (alpha(im, x, y) > 127) continue;
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => alpha(im, x + dx, y + dy) > 127);
    if (!n.length) continue;
    if (n.every(([dx, dy]) => lum(px(im, x + dx, y + dy)) < 52)) continue;
    put(out, x, y, ink);
  }
  return out;
}
/** Remove pixels opacos soltos, tapa buracos de 1 px e troca pixels isolados pela cor vizinha mais comum. */
function cleanup(im) {
  const out = clone(im);
  for (let y = 0; y < im.h; y += 1) for (let x = 0; x < im.w; x += 1) {
    const n4 = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy]);
    const solid = n4.filter(([a, b]) => alpha(im, a, b) > 127);
    if (alpha(im, x, y) > 127 && solid.length <= 1) { put(out, x, y, [0, 0, 0, 0]); continue; }
    if (alpha(im, x, y) <= 127 && solid.length === 4) {
      const cs = solid.map(([a, b]) => px(im, a, b)).sort((a, b) => lum(a) - lum(b));
      put(out, x, y, cs[1]);
      continue;
    }
    if (alpha(im, x, y) > 127 && solid.length === 4) {
      const c = hex(px(im, x, y));
      const ns = solid.map(([a, b]) => hex(px(im, a, b)));
      if (!ns.includes(c)) {
        const counts = {};
        ns.forEach((k) => { counts[k] = (counts[k] ?? 0) + 1; });
        const [top, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        // Só troca se 3 vizinhos concordam e a diferença é pequena (ruído, não detalhe).
        if (count >= 3 && dist(parse(top), px(im, x, y)) < 70) put(out, x, y, parse(top));
      }
    }
  }
  return out;
}

/** Cola `src` em `dst` com (x, y) no canto. */
function blit(dst, src, ox, oy, { onlyEmpty = false } = {}) {
  for (let y = 0; y < src.h; y += 1) for (let x = 0; x < src.w; x += 1) {
    const c = px(src, x, y);
    if (c[3] < 128) continue;
    if (onlyEmpty && alpha(dst, ox + x, oy + y) > 127) continue;
    put(dst, ox + x, oy + y, c);
  }
}

/** Retoque à mão: cada letra é uma cor do mapa; '.' mantém, ' ' apaga. */
function paint(im, x0, y0, rows, map) {
  rows.forEach((row, dy) => [...row].forEach((ch, dx) => {
    if (ch === '.') return;
    if (ch === ' ') { put(im, x0 + dx, y0 + dy, [0, 0, 0, 0]); return; }
    put(im, x0 + dx, y0 + dy, map[ch]);
  }));
}

// ---------- animação ----------
/**
 * Põe o personagem (já reduzido) no quadro 48 x 64 com os pés na linha FEET e centrado pelos pés.
 * Quadros: 0 e 2 = passos (uma perna sobe 2 px, corpo sobe 1 px), 1 = parado, 3 = apoio (corpo desce 1 px).
 */
function walkFrames(sprite, { hip, legL, legR, mid, footY = bbox(sprite).y1, centerX = null }) {
  const cx = centerX ?? Math.round((legL + legR) / 2);
  const ox = Math.max(1, Math.min(FW - 1 - sprite.w, Math.round(FW / 2 - cx - 0.5))), oy = FEET - footY;
  const frames = [];
  for (let f = 0; f < 4; f += 1) {
    const frame = blank(FW, FH);
    const bob = f === 0 || f === 2 ? -1 : f === 3 ? 1 : 0;
    const lift = (side) => (f === 0 && side === 'L') || (f === 2 && side === 'R') ? 2 : 0;
    const back = (side) => (f === 0 && side === 'R') || (f === 2 && side === 'L') ? 1 : 0;
    // Corpo (acima do quadril e tudo fora da faixa das pernas).
    for (let y = 0; y < sprite.h; y += 1) for (let x = 0; x < sprite.w; x += 1) {
      const c = px(sprite, x, y);
      if (c[3] < 128) continue;
      const isLeg = y >= hip && x >= legL && x <= legR;
      if (isLeg) continue;
      put(frame, ox + x, oy + y + (y < hip ? bob : f === 3 ? 0 : 0), c);
    }
    // Pernas: cada metade se move separada.
    for (let y = hip; y < sprite.h; y += 1) for (let x = legL; x <= legR; x += 1) {
      const c = px(sprite, x, y);
      if (c[3] < 128) continue;
      const side = x < mid ? 'L' : 'R';
      const t = (y - hip) / Math.max(1, sprite.h - hip);
      const dy = -Math.round(lift(side) * t) + (f === 3 && t < 0.3 ? 1 : 0);
      const dx = side === 'L' ? -back(side) : back(side);
      put(frame, ox + x + (t > 0.5 ? dx : 0), oy + y + dy, c);
    }
    frames.push(cleanup(frame));
  }
  return frames;
}
/** Junta 4 direções (baixo, esquerda, direita, cima) x 4 quadros numa folha. */
function sheetOf(rows) {
  const sheet = blank(FW * 4, FH * 4);
  rows.forEach((frames, r) => frames.forEach((frame, f) => blit(sheet, frame, f * FW, r * FH)));
  return sheet;
}
/** Quantiza a folha inteira para no máximo `k` cores (paleta tirada dela mesma). */
function finalPalette(sheet, k = 24) {
  const pal = paletteOf([sheet], k);
  return quantize(sheet, pal);
}
/** Faixa das pernas: colunas opacas na linha dos pés (com folga) e o meio entre as duas botas. */
function legBand(sprite, hipFrac = 0.66) {
  const hip = Math.round(sprite.h * hipFrac);
  const rows = [sprite.h - 1, sprite.h - 2, sprite.h - 3, sprite.h - 4];
  const cols = [];
  for (let x = 0; x < sprite.w; x += 1) if (rows.some((y) => alpha(sprite, x, y) > 127)) cols.push(x);
  const legL = Math.max(0, cols[0] - 1), legR = Math.min(sprite.w - 1, cols.at(-1) + 1);
  // Meio: maior vão (ou a coluna mais vazia) entre as botas.
  let mid = Math.round((legL + legR) / 2), best = Infinity;
  for (let x = legL + 3; x <= legR - 3; x += 1) {
    let s = 0;
    for (let y = sprite.h - 8; y < sprite.h; y += 1) s += alpha(sprite, x, y) > 127 ? 1 : 0;
    if (s < best) { best = s; mid = x; }
  }
  return { hip, legL, legR, mid };
}

// ---------- referências ----------
const debugDir = path.join(REF, 'capturas', 'skin2-debug');
const dbg = (name, im, s = 4) => {
  if (!DEBUG) return;
  const big = blank(im.w * s, im.h * s);
  for (let y = 0; y < big.h; y += 1) for (let x = 0; x < big.w; x += 1) {
    const c = px(im, Math.floor(x / s), Math.floor(y / s));
    put(big, x, y, c[3] > 127 ? c : ((x >> 3) + (y >> 3)) % 2 ? [90, 120, 80, 255] : [100, 132, 90, 255]);
  }
  save(path.join(debugDir, `${name}.png`), big);
};

export const RECIPES = {};

// ===== Guerreira =====
const SHEET = path.join(REF, 'referencia-skin-guerreira.png');
// Recortes da folha (x, y, largura, altura), com o painel escuro em volta.
const W_CROPS = {
  original: [630, 700, 140, 168],
  blue: [775, 700, 140, 168],
  green: [920, 700, 140, 168],
  black: [1065, 700, 140, 168],
  idle: [640, 432, 112, 170],
  walk: [760, 432, 140, 170],
  back: [950, 992, 77, 112]
};

function warriorFigure(name) {
  const src = load(SHEET);
  const [x, y, w, h] = W_CROPS[name];
  let im = crop(src, x, y, w, h);
  im = removeBackground(im, name === 'back' ? 26 : 11, name === 'back' ? 7 : 3);
  return trim(im);
}

/** Separa só a figura principal (maior região conectada), tirando letras e restos do painel. */
function largestComponent(im) {
  const seen = new Int32Array(im.w * im.h).fill(-1);
  const sizes = [];
  for (let i = 0; i < im.w * im.h; i += 1) {
    if (seen[i] >= 0 || im.d[i * 4 + 3] < 128) continue;
    const id = sizes.length;
    let n = 0;
    const stack = [i];
    seen[i] = id;
    while (stack.length) {
      const j = stack.pop();
      n += 1;
      const x = j % im.w, y = Math.floor(j / im.w);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const a = x + dx, b = y + dy;
        if (!inside(im, a, b)) continue;
        const k = b * im.w + a;
        if (seen[k] >= 0 || im.d[k * 4 + 3] < 128) continue;
        seen[k] = id;
        stack.push(k);
      }
    }
    sizes.push(n);
  }
  const keep = sizes.indexOf(Math.max(...sizes));
  const out = clone(im);
  for (let i = 0; i < seen.length; i += 1) if (seen[i] !== keep) out.d[i * 4 + 3] = 0;
  return trim(out);
}

export function buildAll() {
  const result = {};
  // --- Guerreira: figuras recortadas ---
  const figs = Object.fromEntries(Object.keys(W_CROPS).map((name) => [name, largestComponent(warriorFigure(name))]));
  const basePal = paletteOf([figs.original, figs.walk, figs.idle, figs.back], 28);
  const reduce = (im, pal, height = TARGET) => cleanup(downsample(im, im.h / height, pal));
  const down = {};
  for (const color of ['original', 'blue', 'green', 'black']) {
    const pal = color === 'original' ? basePal : paletteOf([figs[color]], 28);
    down[color] = reduce(figs[color], pal);
    dbg(`w-down-${color}`, down[color]);
  }
  const side = reduce(figs.walk, basePal);
  dbg('w-side', side);
  const backTop = reduce(figs.back, basePal, Math.round(TARGET * 0.78));
  dbg('w-back-top', backTop);
  result.warrior = { down, side, backTop };

  // --- Espadachim: grade da imagem de frente (esquerda da primeira referência) ---
  const sw = load(path.join(REF, 'referencia-skin-espadachim.png'));
  let swCrop = crop(sw, 60, 50, 420, 580);
  swCrop = removeBackground(swCrop, 40, 0);
  const swPal = paletteOf([swCrop], 28);
  const grid = gridSample(swCrop, swPal);
  if (DEBUG) console.log('grade espadachim', grid.gx, grid.gy);
  const swFront = largestComponent(cleanup(grid.im));
  dbg('s-front', swFront);
  result.swordsman = { front: swFront };
  return result;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const parts = buildAll();
  const { compose } = await import('./compose-skins.mjs');
  const sheets = compose(parts, { blank, put, px, alpha, clone, flipX, blit, paint, outline, cleanup, walkFrames, legBand, sheetOf, finalPalette, trim, crop, lum, dist, hex, parse, dbg, FW, FH, FEET });
  for (const [id, sheet] of Object.entries(sheets)) {
    save(path.join(OUT, `player-${id}-sheet.png`), sheet);
    if (DEBUG) dbg(`sheet-${id}`, sheet, 3);
    console.log(`ok player-${id}-sheet.png (${sheet.w}x${sheet.h})`);
  }
}
