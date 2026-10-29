import { createCanvas } from '@napi-rs/canvas';
import { WEAPON_GRIPS } from './weaponGrips.js';
import { bakedWeaponHand } from './bakedGear.js';
import { bakedMonsterInfo } from './bakedMonsters.js';
import { drawMonsterFrame } from './monsters.js';
import { fbm, noise } from './painter.js';
import { PALETTE, nearestHex } from './palette.js';
import { PixelCanvas, hash, hexToRgb } from './pixel.js';
import { SKIN_RIGS } from './skinRigs.js';

// Ilustrações dos capítulos (400 x 225), refeitas no pipeline 4x (rodada 2 da arte):
//  1. cada cena é uma pilha de camadas pintadas com @napi-rs/canvas em 4x (o contexto já vem escalado,
//     então as coordenadas são as do pixel final): céu, serras com perspectiva atmosférica, chão;
//  2. cada camada é reduzida 4x: as opacas pela moda das amostras levadas à paleta (preserva linhas de
//     1 px), as de luz e névoa pela média (brilho suave que a paleta final transforma em faixas);
//  3. as camadas de objetos ("props") ganham limpeza, contorno seletivo e luz de borda (PixelCanvas.outline);
//  4. os personagens entram em escala 1, como no jogo: a Guerreira (folha 56 x 64, com a espada nas
//     costas ou na mão no padrão do herói), os moradores pintados e os monstros/chefes pintados, com
//     sombra de contato, luz de borda do lado da luz principal e um pouco da cor do ambiente;
//  5. luz aditiva (fogo, lua, selos), névoa, vinheta e quantização final na paleta-mestre (≤ 64 cores).

export const SCENE_SIZE = Object.freeze({ width: 400, height: 225 });
const W = SCENE_SIZE.width;
const H = SCENE_SIZE.height;
const SS = 4;

// ---------- Cor ----------

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function mixHex(a, b, t) {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}
const rgba = (hex, a = 1) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };
const quantCache = new Map();
function quant(r, g, b) {
  const key = (r << 16) | (g << 8) | b;
  let hex = quantCache.get(key);
  if (!hex) { hex = nearestHex(`#${((1 << 24) | key).toString(16).slice(1)}`); quantCache.set(key, hex); }
  return hex;
}

/**
 * Pontilhado ordenado (Bayer 4x4) entre as duas cores mais próximas da paleta: degradês de céu, luz e
 * névoa viram faixas com transição pontilhada, como em pixel art feita à mão, em vez de degraus secos.
 * Só pontilha quando a cor está mesmo entre as duas (fração > 0,3); perto de uma delas fica liso.
 */
const PAL_RGB = PALETTE.map(hexToRgb);
const BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const pairCache = new Map();
function nearestPair(r, g, b) {
  const key = (r << 16) | (g << 8) | b;
  let hit = pairCache.get(key);
  if (hit) return hit;
  let i1 = 0; let i2 = 0; let d1 = Infinity; let d2 = Infinity;
  PAL_RGB.forEach(([pr, pg, pb], i) => {
    const d = Math.sqrt(2 * (pr - r) ** 2 + 4 * (pg - g) ** 2 + 3 * (pb - b) ** 2);
    if (d < d1) { d2 = d1; i2 = i1; d1 = d; i1 = i; } else if (d < d2) { d2 = d; i2 = i; }
  });
  const exact = nearestHex(`#${((1 << 24) | key).toString(16).slice(1)}`);
  hit = { a: hexToRgb(exact), b: PAL_RGB[i1].join() === hexToRgb(exact).join() ? PAL_RGB[i2] : PAL_RGB[i1], f: d1 / (d1 + d2 + 0.001) };
  pairCache.set(key, hit);
  return hit;
}

// ---------- Pintura em 4x ----------

function layerCanvas() {
  const canvas = createCanvas(W * SS, H * SS);
  const ctx = canvas.getContext('2d');
  ctx.scale(SS, SS);
  return { canvas, ctx };
}

function poly(ctx, pts, fill) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}
const rect = (ctx, x, y, w, h, fill) => { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); };
function ell(ctx, cx, cy, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}
function line(ctx, x0, y0, x1, y1, color, width = 1) {
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.stroke();
}
/** Degradê vertical em faixa (y0 → y1). */
function vgrad(ctx, y0, y1, stops, x0 = 0, x1 = W) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([t, c, a = 1]) => g.addColorStop(t, rgba(c, a)));
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
}
/**
 * Céu em degradê com pontilhado ordenado (Bayer 4x4) entre as cores de parada vizinhas (da paleta), pixel a
 * pixel: sem as faixas duras que a redução para a paleta cria num degradê liso (capítulos 2 e 7).
 */
function skyGrad(ctx, y0, y1, stops) {
  const rgbStops = stops.map(([t, c]) => [t, hexToRgb(c)]);
  for (let y = y0; y < y1; y += 1) {
    const t = (y + 0.5 - y0) / (y1 - y0);
    let k = 1;
    while (k < rgbStops.length - 1 && rgbStops[k][0] < t) k += 1;
    const [ta, ca] = rgbStops[k - 1]; const [tb, cb] = rgbStops[k];
    const f = Math.min(1, Math.max(0, (t - ta) / Math.max(1e-6, tb - ta)));
    // Pontilhado direto entre as duas cores de parada vizinhas (da paleta): nenhuma cor intermediária
    // (ciano saturado, ouro apagado) aparece como faixa no meio do céu.
    for (let x = 0; x < W; x += 1) {
      const use = f > (BAYER4[y % 4][x % 4] + 0.5) / 16 ? cb : ca;
      ctx.fillStyle = `rgb(${use[0]},${use[1]},${use[2]})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}
/** Luz radial (camada aditiva ou de névoa). */
function glow(ctx, x, y, r, color, a = 0.6, squash = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, squash);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(0.35, rgba(color, a * 0.45));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
}
/** Raios de luz: cunhas que somem com a distância. */
function rays(ctx, x, y, { count = 7, from = 0.6, to = 2.5, length = 260, width = 0.06, color = '#fff0c0', a = 0.22, seed = 3 } = {}) {
  for (let i = 0; i < count; i += 1) {
    const ang = from + (to - from) * ((i + hash(i, 1, seed) * 0.6) / count);
    const w = width * (0.6 + hash(i, 2, seed));
    const g = ctx.createRadialGradient(x, y, 0, x, y, length);
    g.addColorStop(0, rgba(color, a));
    g.addColorStop(1, rgba(color, 0));
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang - w) * length, y + Math.sin(ang - w) * length);
    ctx.lineTo(x + Math.cos(ang + w) * length, y + Math.sin(ang + w) * length);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
  }
}

/** Estrelas de 1 px (algumas com cruz) no céu acima de `bottom`. */
function stars(ctx, count, bottom, seed = 1, color = '#ffffff') {
  for (let i = 0; i < count; i += 1) {
    const x = Math.floor(hash(i, 1, seed) * W);
    const y = Math.floor(hash(i, 2, seed) * bottom * (0.4 + 0.6 * hash(i, 3, seed)));
    const big = hash(i, 4, seed) > 0.93;
    rect(ctx, x, y, 1, 1, rgba(color, 0.55 + hash(i, 5, seed) * 0.45));
    if (big) { rect(ctx, x - 1, y, 3, 1, rgba(color, 0.6)); rect(ctx, x, y - 1, 1, 3, rgba(color, 0.6)); }
  }
}

/** Nuvens em pixel art: blocos de elipses, topo iluminado e base na sombra. */
function cloudBank(ctx, x, y, w, { lit = '#f6ca9f', mid = '#c7cfdd', dark = '#657392', seed = 2, a = 1 } = {}) {
  const n = Math.max(3, Math.round(w / 16));
  for (let i = 0; i < n; i += 1) {
    const cx = x + (i + 0.5) * (w / n) + (hash(i, 1, seed) - 0.5) * 8;
    const r = 7 + hash(i, 2, seed) * 9 * (1 - Math.abs(i / (n - 1) - 0.5));
    ell(ctx, cx, y + 2, r * 1.5, r * 0.7, rgba(dark, a));
  }
  for (let i = 0; i < n; i += 1) {
    const cx = x + (i + 0.5) * (w / n) + (hash(i, 1, seed) - 0.5) * 8;
    const r = 7 + hash(i, 2, seed) * 9 * (1 - Math.abs(i / (n - 1) - 0.5));
    ell(ctx, cx, y - 1, r * 1.35, r * 0.62, rgba(mid, a));
    ell(ctx, cx - r * 0.3, y - r * 0.32, r * 0.9, r * 0.36, rgba(lit, a));
  }
}

/**
 * Serra/colina: silhueta por ruído (ridged = picos), preenchida até embaixo; borda de cima clara nos
 * trechos virados para a luz (lightX: de onde vem a luz).
 */
function ridge(ctx, { base, amp = 40, freq = 0.012, seed = 1, color, rim = null, lightX = 0, ridged = false, shade = null, bottom = H }) {
  const top = [];
  // ridged: serra de picos (cada pico um triângulo de encostas tortas), com ruído miúdo na crista.
  const peaks = [];
  if (ridged) {
    const count = Math.max(3, Math.round(W * freq * 1.6));
    for (let i = 0; i < count; i += 1) {
      peaks.push({ x: ((i + 0.2 + hash(i, 1, seed) * 0.6) / count) * (W + 80) - 40, h: amp * (0.45 + hash(i, 2, seed) * 0.55), sl: 0.55 + hash(i, 3, seed) * 0.5, sr: 0.55 + hash(i, 4, seed) * 0.5 });
    }
  }
  for (let x = -2; x <= W + 2; x += 1) {
    let y;
    if (ridged) {
      let h = 0;
      for (const p of peaks) h = Math.max(h, p.h - (x < p.x ? (p.x - x) * p.sl : (x - p.x) * p.sr));
      y = base - h - (fbm(x * 0.08, seed, seed, 2) - 0.5) * amp * 0.12;
    } else y = base - fbm(x * freq, seed * 7.3, seed, 4) * amp;
    top.push([x, y]);
  }
  poly(ctx, [...top, [W + 2, bottom], [-2, bottom]], color);
  if (shade && ridged) {
    // Encosta da sombra de cada pico (o lado oposto à luz), com um sulco torto até a base.
    for (const p of peaks) {
      const away = lightX < W / 2 ? 1 : -1;
      const tipY = base - p.h;
      const foot = p.x + away * p.h / (away > 0 ? p.sr : p.sl);
      const gully = p.x + away * p.h * 0.25 + (hash(p.x | 0, 5, seed) - 0.5) * p.h * 0.3;
      poly(ctx, [[p.x, tipY], [foot, base], [gully, base]], rgba(shade, 0.6));
    }
  }
  if (rim) {
    for (let i = 1; i < top.length; i += 1) {
      const [x, y] = top[i];
      const slope = y - top[i - 1][1];
      const facing = lightX < W / 2 ? slope > -0.05 : slope < 0.05;
      if (facing) rect(ctx, x, y, 1, 1, rim);
    }
  }
  return top;
}

/** Pinheiro em silhueta (camadas irregulares); `lit` acende a borda do lado da luz. */
function pine(ctx, x, base, h, color, { lit = null, side = -1, seed = 1, trunk = null } = {}) {
  const tiers = 4 + Math.floor(h / 22);
  if (trunk) rect(ctx, x - 1, base - h * 0.18, 2, h * 0.18, trunk);
  for (let i = 0; i < tiers; i += 1) {
    const t = i / tiers;
    const y = base - h * 0.12 - t * h * 0.85;
    const w = (1 - t) * h * 0.32 + 2 + hash(i, 1, seed) * 2;
    const tip = y - h * 0.22;
    const jag = (hash(i, 2, seed) - 0.5) * 3;
    poly(ctx, [[x - w + jag, y], [x - w * 0.45, y - 2], [x, tip], [x + w * 0.5, y - 1.5], [x + w + jag, y + 1]], color);
    if (lit) poly(ctx, [[x + side * w * 0.95 + jag, y - 0.5], [x + side * w * 0.4, y - 2.3], [x, tip + 1], [x + side * w * 0.2, tip + 4]], lit);
  }
}
/** Fileira de pinheiros (floresta ao longe). */
function pineRow(ctx, y, { color, lit = null, step = 9, h = 34, seed = 4, jitter = 10, side = -1 } = {}) {
  for (let x = -6, i = 0; x < W + 10; x += step, i += 1) {
    const hh = h * (0.7 + hash(i, 3, seed) * 0.6);
    pine(ctx, x + hash(i, 4, seed) * step, y + hash(i, 5, seed) * jitter, hh, color, { lit, side, seed: seed + i });
  }
}
/** Árvore de copa redonda em cachos (luz do lado `side`). */
function leafTree(ctx, x, base, r, pal, { side = -1, seed = 3, trunk = '#391f21' } = {}) {
  poly(ctx, [[x - 2, base], [x - 1.5, base - r * 1.3], [x + 1.5, base - r * 1.3], [x + 2.5, base]], trunk);
  const cy = base - r * 1.6;
  const blobs = 6;
  for (let i = 0; i < blobs; i += 1) {
    const a = (i / blobs) * Math.PI * 2 + hash(i, 1, seed);
    ell(ctx, x + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.4, r * 0.55, r * 0.48, pal[0]);
  }
  for (let i = 0; i < blobs; i += 1) {
    const a = (i / blobs) * Math.PI * 2 + hash(i, 1, seed);
    const bx = x + Math.cos(a) * r * 0.55;
    const by = cy + Math.sin(a) * r * 0.4;
    ell(ctx, bx + side * r * 0.08, by - r * 0.08, r * 0.42, r * 0.36, pal[1]);
    ell(ctx, bx + side * r * 0.2, by - r * 0.2, r * 0.22, r * 0.18, pal[2]);
  }
}
/** Pedra com face de luz e de sombra. */
function rock(ctx, x, base, w, h, pal, { side = -1, seed = 1 } = {}) {
  const j = (k) => (hash(k, 7, seed) - 0.5) * w * 0.2;
  const pts = [[x - w / 2, base], [x - w * 0.45 + j(1), base - h * 0.6], [x - w * 0.15 + j(2), base - h], [x + w * 0.25 + j(3), base - h * 0.9], [x + w / 2, base - h * 0.35], [x + w / 2, base]];
  poly(ctx, pts, pal[1]);
  const litPts = side < 0 ? [pts[0], pts[1], pts[2], [x + j(4), base - h * 0.5], [x - w * 0.2, base]] : [[x + w * 0.1, base], [x + j(4), base - h * 0.5], pts[3], pts[4], pts[5]];
  poly(ctx, litPts, pal[2]);
  poly(ctx, [[x - w / 2, base], [x + w / 2, base], [x + w / 2, base - h * 0.18], [x - w / 2, base - h * 0.1]], pal[0]);
}
/** Chão: degradê + traços horizontais (perspectiva) em 2-3 tons. */
function groundPlane(ctx, top, colors, { seed = 5, strokes = 90, stroke = null } = {}) {
  vgrad(ctx, top, H, colors.map((c, i) => [i / (colors.length - 1), c]));
  if (!stroke) return;
  for (let i = 0; i < strokes; i += 1) {
    const t = hash(i, 1, seed);
    const y = top + 2 + t * t * (H - top - 2);
    const x = hash(i, 2, seed) * W;
    const len = 4 + t * 26;
    rect(ctx, x, y, len, 1, rgba(stroke[i % stroke.length], 0.6 + t * 0.4));
  }
}
/** Partículas de 1-2 px (brasas, neve, vagalumes). */
function specks(ctx, count, area, colors, { seed = 9, size = 1, a = 1 } = {}) {
  const [x0, y0, x1, y1] = area;
  for (let i = 0; i < count; i += 1) {
    const x = x0 + hash(i, 1, seed) * (x1 - x0);
    const y = y0 + hash(i, 2, seed) * (y1 - y0);
    const s = hash(i, 3, seed) > 0.8 ? size + 1 : size;
    rect(ctx, Math.round(x), Math.round(y), s, s, rgba(colors[i % colors.length], a));
  }
}
/** Silhueta de castelo/ruína: torres com ameias e janelas acesas opcionais. */
function castle(ctx, x, base, s, color, { lit = null, windows = null, seed = 8, broken = false } = {}) {
  const towers = [[-38, 52, 12], [-18, 40, 16], [0, 72, 14], [20, 46, 16], [40, 58, 11]];
  rect(ctx, x - 44 * s, base - 30 * s, 88 * s, 30 * s, color);
  for (const [dx, h, w] of towers) {
    const hh = h * s * (broken ? 0.6 + hash(dx, 1, seed) * 0.5 : 1);
    rect(ctx, x + (dx - w / 2) * s, base - hh, w * s, hh, color);
    for (let k = 0; k < w; k += 4) rect(ctx, x + (dx - w / 2 + k) * s, base - hh - 3 * s, 2 * s, 3 * s, color);
    if (!broken && h > 60) poly(ctx, [[x + (dx - w / 2 - 2) * s, base - hh - 2 * s], [x + dx * s, base - hh - 22 * s], [x + (dx + w / 2 + 2) * s, base - hh - 2 * s]], color);
    if (lit) rect(ctx, x + (dx - w / 2) * s, base - hh, 1, hh, lit);
    if (windows) for (let k = 0; k < 2; k += 1) if (hash(dx, k, seed) > 0.35) rect(ctx, x + (dx - 1) * s, base - hh + (8 + k * 12) * s, Math.max(1, 2 * s), Math.max(2, 3 * s), windows);
  }
}
/** Selo: anel com núcleo de cor (a luz vai na camada aditiva). */
function seal(ctx, x, y, r, color) {
  ell(ctx, x, y, r + 1.5, r + 1.5, '#1a1932');
  ell(ctx, x, y, r, r, mixHex(color, '#ffffff', 0.15));
  ell(ctx, x - r * 0.25, y - r * 0.3, r * 0.45, r * 0.4, '#ffffff');
}
const SEAL_COLORS = ['#5ac54f', '#0098dc', '#c7cfdd', '#ffc825', '#ff5000'];

// ---------- Redução 4x e composição ----------

/** Camada opaca → pixel art (moda das amostras na paleta; cobertura < 45% = vazio). */
function reduceSolid(canvas) {
  const hi = canvas.getContext('2d').getImageData(0, 0, W * SS, H * SS).data;
  const out = new PixelCanvas(W, H);
  const WW = W * SS;
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
          n += 1; sr += hi[i]; sg += hi[i + 1]; sb += hi[i + 2];
          const hex = quant(hi[i], hi[i + 1], hi[i + 2]);
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
/** Camada translúcida → média (cor pré-multiplicada + alfa) em ponto flutuante. */
function reduceSoft(canvas) {
  const hi = canvas.getContext('2d').getImageData(0, 0, W * SS, H * SS).data;
  const out = new Float32Array(W * H * 4);
  const WW = W * SS;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      let r = 0; let g = 0; let b = 0; let a = 0;
      for (let dy = 0; dy < SS; dy += 1) {
        for (let dx = 0; dx < SS; dx += 1) {
          const i = ((y * SS + dy) * WW + x * SS + dx) * 4;
          const al = hi[i + 3] / 255;
          r += hi[i] * al; g += hi[i + 1] * al; b += hi[i + 2] * al; a += al;
        }
      }
      const k = (y * W + x) * 4;
      out[k] = r / 16; out[k + 1] = g / 16; out[k + 2] = b / 16; out[k + 3] = a / 16;
    }
  }
  return out;
}
/** Limpeza da camada de objetos: pixel solto sai, furo de 1 px fecha. */
function cleanProps(c) {
  const solid = (x, y) => c.alphaAt(x, y) >= 200;
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const removals = []; const fills = [];
  for (let y = 0; y < c.height; y += 1) {
    for (let x = 0; x < c.width; x += 1) {
      const n4 = N4.filter(([dx, dy]) => solid(x + dx, y + dy));
      if (solid(x, y)) { if (n4.length === 0) removals.push([x, y]); }
      else if (n4.length >= 3) fills.push([x, y, c.colorAt(x + n4[0][0], y + n4[0][1])]);
    }
  }
  for (const [x, y] of removals) c.clearPixel(x, y);
  for (const [x, y, hex] of fills) c.pixel(x, y, hex);
  return c;
}
/** Recorte opaco de um quadro (bbox), para ancorar pelos pés. */
function bbox(frame) {
  let x0 = frame.width; let y0 = frame.height; let x1 = -1; let y1 = -1;
  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      if (frame.data[(y * frame.width + x) * 4 + 3] < 128) continue;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  }
  return { x0, y0, x1, y1 };
}
function toCanvas(frame, { flipX = false, flipY = false } = {}) {
  const c = new PixelCanvas(frame.width, frame.height);
  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      const sx = flipX ? frame.width - 1 - x : x;
      const sy = flipY ? frame.height - 1 - y : y;
      const from = (sy * frame.width + sx) * 4;
      c.data.set(frame.data.subarray(from, from + 4), (y * frame.width + x) * 4);
    }
  }
  return c;
}

/** Uma cena: pilha de passos (pintura em 4x ou personagem em 1x), executada em ordem. */
class Scene {
  constructor(atlas) {
    this.atlas = atlas;
    this.steps = [];
    this.key = { side: -1, color: '#ffe6b0', amount: 0.45 };
    this.ambient = null;
  }

  /** Luz principal (lado de onde vem: -1 esquerda, +1 direita) e cor do ambiente para os personagens. */
  light(side, color, amount = 0.45) { this.key = { side, color, amount }; return this; }
  tint(color, amount) { this.ambient = { color, amount }; return this; }

  /** mode: 'solid' (opaco), 'props' (opaco + contorno), 'add' (luz), 'soft' (névoa, sombra, vinheta). */
  paint(mode, fn) { this.steps.push({ type: 'paint', mode, fn }); return this; }

  sprite(frame, x, feet, { flip = false, flipY = false, shadow = true, rim = true, rimSide = null, under = null, over = null, anchor = 'feet' } = {}) {
    if (frame) this.steps.push({ type: 'sprite', frame, x, feet, flip, flipY, shadow, rim, rimSide, under, over, anchor });
    return this;
  }

  /** A Guerreira (skin do jogo). dir: down/left/right/up; pose: idle/windup/strike/hurt; arma nas costas ou na mão. */
  hero(x, feet, { dir = 'right', pose = 'idle', weapon = 'back', flip = false } = {}) {
    const sheet = this.atlas['hero-sheet'];
    if (!sheet) return this;
    const row = { down: 0, left: 1, right: 2, up: 3 }[dir];
    const col = { idle: 1, walk: 0, windup: 7, strike: 8, recover: 9, hurt: 10 }[pose] ?? 1;
    const frame = new PixelCanvas(56, 64);
    for (let y = 0; y < 64; y += 1) {
      const from = ((row * 64 + y) * sheet.width + col * 56) * 4;
      frame.data.set(sheet.data.subarray(from, from + 56 * 4), y * 56 * 4);
    }
    const rig = SKIN_RIGS['player-warrior']?.[dir];
    const blade = bakedWeaponHand('forge-steel');
    const fx = (px) => (flip ? 55 - px : px);
    const ox = x - 28;
    const oy = feet - 62;
    let under = null; let over = null;
    if (blade && rig && weapon) {
      // Mão: ângulo do golpe; costas: o cabo sai do ombro (padrão: arma nas costas fora do combate).
      const angle = weapon === 'hand'
        ? ({ strike: 45, windup: -135, recover: 45, idle: 45, hurt: 135 }[pose] ?? 45)
        : (rig.back?.angle ?? { down: 45, left: 45, right: 135, up: 135 }[dir]); // padrão do heroRig: lâmina para baixo
      const point = weapon === 'hand' ? rig.hands[col] : rig.back.grip;
      const variant = [{ a: -45, fx: false, fy: false }, { a: -135, fx: true, fy: false }, { a: 45, fx: false, fy: true }, { a: 135, fx: true, fy: true }]
        .sort((p, q) => Math.abs(((angle - p.a + 540) % 360) - 180) - Math.abs(((angle - q.a + 540) % 360) - 180))[0];
      const flipW = variant.fx !== flip;
      const sprite = toCanvas(blade, { flipX: flipW, flipY: variant.fy });
      const [gx, gy] = WEAPON_GRIPS.sword;
      const grip = [flipW ? 39 - gx : gx, variant.fy ? 39 - gy : gy];
      const placed = { canvas: sprite, x: ox + fx(point[0]) - grip[0], y: oy + point[1] - grip[1] };
      if (weapon === 'hand' || dir === 'up') over = placed; else under = placed;
    }
    return this.sprite(frame, x, feet, { flip, under, over, anchor: 'frame', rimSide: this.heroRim ?? null });
  }

  npc(id, x, feet, opts = {}) { return this.sprite(this.atlas[`npc-${id}`], x, feet, opts); }

  monster(kind, x, feet, { attack = false, flip = true, ...opts } = {}) {
    const info = bakedMonsterInfo(kind);
    const size = info?.size ?? 48;
    const frame = drawMonsterFrame(kind, size, attack ? info?.attackFrame ?? 4 : 0);
    return this.sprite(frame, x, feet, { flip, ...opts });
  }

  render() {
    const out = new PixelCanvas(W, H);
    const isSprite = new Uint8Array(W * H);
    const blend = (soft, add) => {
      for (let i = 0; i < W * H; i += 1) {
        const k = i * 4;
        const a = soft[k + 3];
        if (a <= 0.002) continue;
        for (let c = 0; c < 3; c += 1) {
          const v = add ? out.data[k + c] + soft[k + c] : out.data[k + c] * (1 - a) + soft[k + c];
          out.data[k + c] = clamp(Math.round(v), 0, 255);
        }
        out.data[k + 3] = 255;
      }
    };
    for (const step of this.steps) {
      if (step.type === 'paint') {
        const { canvas, ctx } = layerCanvas();
        step.fn(ctx);
        if (step.mode === 'add' || step.mode === 'soft') { blend(reduceSoft(canvas), step.mode === 'add'); continue; }
        const layer = reduceSolid(canvas);
        if (step.mode === 'props') { cleanProps(layer); layer.outline({ strength: 0.75 }); layer.quantize(); }
        out.blit(layer, 0, 0);
        continue;
      }
      // Personagem: ambiente + luz de borda do lado da luz, sombra de contato, arma atrás/na frente.
      const src = toCanvas(step.frame, { flipX: step.flip, flipY: step.flipY });
      const box = bbox(src);
      const byFrame = step.anchor === 'frame';
      const ox = Math.round(step.x - (byFrame ? 28 : (box.x0 + box.x1 + 1) / 2));
      const oy = Math.round(step.feet - (byFrame ? 62 : box.y1));
      const side = step.rimSide ?? this.key.side;
      const lit = (c) => {
        const solid = (x, y) => c.alphaAt(x, y) >= 128;
        const copy = new PixelCanvas(c.width, c.height);
        copy.blit(c, 0, 0);
        for (let y = 0; y < c.height; y += 1) {
          for (let x = 0; x < c.width; x += 1) {
            if (!solid(x, y)) continue;
            const k = (y * c.width + x) * 4;
            let col = [c.data[k], c.data[k + 1], c.data[k + 2]];
            if (this.ambient) col = col.map((v, i) => v + (hexToRgb(this.ambient.color)[i] - v) * this.ambient.amount);
            const lum = 0.3 * col[0] + 0.59 * col[1] + 0.11 * col[2];
            const edge = !solid(x + side, y) || (!solid(x + side * 2, y) && lum < 30) || (!solid(x, y - 1) && hash(x, y, 3) > 0.4);
            if (step.rim && edge && lum >= 22) col = col.map((v, i) => v + (hexToRgb(this.key.color)[i] - v) * this.key.amount);
            copy.data[k] = col[0]; copy.data[k + 1] = col[1]; copy.data[k + 2] = col[2];
          }
        }
        return copy;
      };
      if (step.shadow) {
        const w = Math.max(8, (box.x1 - box.x0) * 0.42);
        out.shadow(Math.round(step.x), Math.round(step.feet + 1), Math.round(w), 3, 150);
      }
      const put = (canvas, x, y) => {
        out.blit(canvas, x, y);
        for (let py = 0; py < canvas.height; py += 1) {
          for (let px = 0; px < canvas.width; px += 1) {
            if (canvas.alphaAt(px, py) < 128) continue;
            const tx = x + px; const ty = y + py;
            if (tx >= 0 && ty >= 0 && tx < W && ty < H) isSprite[ty * W + tx] = 1;
          }
        }
      };
      if (step.under) put(lit(step.under.canvas), step.under.x, step.under.y);
      put(lit(src), ox, oy);
      if (step.over) put(lit(step.over.canvas), step.over.x, step.over.y);
    }
    // Quantização final: personagens pela cor mais próxima; o resto com pontilhado ordenado.
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const k = (y * W + x) * 4;
        const { a, b, f } = nearestPair(out.data[k], out.data[k + 1], out.data[k + 2]);
        const pick = !isSprite[y * W + x] && f > 0.3 && (BAYER4[y % 4][x % 4] + 0.5) / 16 < f ? b : a;
        out.data[k] = pick[0]; out.data[k + 1] = pick[1]; out.data[k + 2] = pick[2]; out.data[k + 3] = 255;
      }
    }
    return out;
  }
}

/** Vinheta (camada 'soft'): escurece as bordas para o olho ir ao centro. */
function vignette(ctx, color = '#0e071b', a = 0.55, cx = W / 2, cy = H * 0.55) {
  const g = ctx.createRadialGradient(cx, cy, H * 0.35, cx, cy, W * 0.62);
  g.addColorStop(0, rgba(color, 0));
  g.addColorStop(1, rgba(color, a));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
/** Faixa de névoa horizontal. */
function fogBand(ctx, y, h, color, a = 0.5, seed = 3) {
  for (let x = 0; x < W; x += 2) {
    const n = noise(x * 0.02, seed, seed);
    const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    g.addColorStop(0, rgba(color, 0));
    g.addColorStop(0.5, rgba(color, a * (0.5 + n)));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x, y - h / 2, 2, h);
  }
}
/** Fogueira (pedras, toras e chamas sólidas). */
function campfire(ctx, x, y, s = 1) {
  for (let i = 0; i < 7; i += 1) {
    const a = (i / 7) * Math.PI * 2;
    ell(ctx, x + Math.cos(a) * 9 * s, y + Math.sin(a) * 3 * s, 3 * s, 2 * s, i % 2 ? '#5d5d5d' : '#858585');
  }
  line(ctx, x - 8 * s, y + 1, x + 7 * s, y - 3 * s, '#5d2c28', 3 * s);
  line(ctx, x + 8 * s, y + 1, x - 6 * s, y - 3 * s, '#8a4836', 3 * s);
  poly(ctx, [[x - 7 * s, y - 1], [x - 5 * s, y - 10 * s], [x - 2 * s, y - 17 * s], [x, y - 26 * s], [x + 2 * s, y - 16 * s], [x + 5 * s, y - 11 * s], [x + 7 * s, y - 1]], '#c64524');
  poly(ctx, [[x - 5 * s, y - 1], [x - 2 * s, y - 12 * s], [x + 1 * s, y - 18 * s], [x + 4 * s, y - 8 * s], [x + 5 * s, y - 1]], '#ffa214');
  poly(ctx, [[x - 2.5 * s, y - 1], [x, y - 9 * s], [x + 2.5 * s, y - 1]], '#ffeb57');
}
/** Tenda de lona (lado da luz `side`). */
function tent(ctx, x, base, w, h, { cloth = ['#5d2c28', '#8a4836', '#bf6f4a'], side = 1 } = {}) {
  poly(ctx, [[x - w / 2, base], [x, base - h], [x + w / 2, base]], cloth[1]);
  poly(ctx, side > 0 ? [[x, base - h], [x + w / 2, base], [x + w * 0.1, base]] : [[x, base - h], [x - w / 2, base], [x - w * 0.1, base]], cloth[2]);
  poly(ctx, [[x - w * 0.12, base], [x, base - h * 0.55], [x + w * 0.12, base]], '#1c121c');
  line(ctx, x, base - h, x, base - h - 4, '#391f21', 1);
}
/** Estandarte com o sol negro da Ordem do Eclipse. */
function eclipseBanner(ctx, x, top, h, cloth = '#571c27') {
  rect(ctx, x - 0.5, top - 4, 1.5, h + 8, '#391f21');
  poly(ctx, [[x + 1, top], [x + 15, top + 1], [x + 14, top + h], [x + 8, top + h - 5], [x + 1, top + h]], cloth);
  ell(ctx, x + 8, top + h * 0.4, 4.5, 4.5, '#ffa214');
  ell(ctx, x + 8, top + h * 0.4, 3, 3, '#0e071b');
}

// ---------- Cenas ----------

/** 1 — A fogueira na escuridão (noite, fogo como única luz). */
function scene1(sc) {
  sc.light(1, '#ffa214', 0.5).tint('#1a1932', 0.1);
  sc.paint('solid', (c) => {
    vgrad(c, 0, 150, [[0, '#0e071b'], [0.6, '#1a1932'], [1, '#2a2f4e']]);
    stars(c, 120, 120, 11);
    ell(c, 330, 34, 9, 9, '#c7cfdd'); ell(c, 334, 31, 8, 8, '#1a1932');
    ridge(c, { base: 128, amp: 34, freq: 0.01, seed: 2, color: '#2a2f4e', rim: '#424c6e', lightX: 400, ridged: true, shade: '#1a1932' });
    pineRow(c, 150, { color: '#0c2e44', step: 8, h: 40, seed: 5 });
    groundPlane(c, 150, ['#1c121c', '#2d2e25', '#391f21'], { stroke: ['#1c121c', '#494834'], strokes: 120 });
  });
  sc.paint('props', (c) => {
    tent(c, 70, 188, 64, 50, { side: 1 });
    tent(c, 330, 182, 50, 40, { side: -1 });
    line(c, 150, 205, 182, 210, '#5d2c28', 4); line(c, 222, 210, 254, 204, '#5d2c28', 4);
    rock(c, 22, 214, 30, 18, ['#1c121c', '#272727', '#3d3d3d'], { side: 1 });
    pine(c, 388, 225, 120, '#0c2e44', { lit: '#134c4c', side: -1, seed: 9 });
  });
  sc.hero(160, 206, { dir: 'right', weapon: 'back' });
  sc.npc('vigia', 250, 205, { flip: true, rimSide: -1 });
  sc.paint('solid', (c) => campfire(c, 205, 208, 1.1));
  sc.paint('soft', (c) => vignette(c, '#0e071b', 0.5, 205, 190));
  sc.paint('add', (c) => {
    glow(c, 205, 190, 150, '#e07438', 0.42, 0.7);
    glow(c, 205, 194, 40, '#ffc825', 0.5);
    glow(c, 166, 166, 4, '#ea323c', 0.7); // fragmento no pescoço
    specks(c, 40, [180, 90, 240, 185], ['#ffa214', '#ffeb57'], { seed: 4 });
  });
}

/** 2 — A vila começa a viver (amanhecer dourado, casas, crianças e os cinco símbolos). */
function scene2(sc) {
  sc.light(-1, '#ffeb57', 0.5).tint('#e69c69', 0.06);
  sc.paint('solid', (c) => {
    skyGrad(c, 0, 140, [[0, '#0069aa'], [0.45, '#0098dc'], [0.75, '#9cc8e6'], [1, '#f6ca9f']]);
    cloudBank(c, 40, 40, 110, { seed: 3 }); cloudBank(c, 250, 28, 120, { seed: 5 });
    ridge(c, { base: 118, amp: 30, freq: 0.008, seed: 3, color: '#657392', rim: '#c7cfdd', ridged: true });
    ridge(c, { base: 136, amp: 16, freq: 0.014, seed: 4, color: '#134c4c', rim: '#1e6f50' });
    pineRow(c, 140, { color: '#1e6f50', lit: '#33984b', step: 11, h: 26, seed: 8 });
    groundPlane(c, 140, ['#33984b', '#33984b', '#1e6f50'], { stroke: ['#5ac54f', '#1e6f50'], strokes: 70 });
    // trilha de terra
    poly(c, [[180, 140], [215, 140], [300, 225], [130, 225]], '#ad7954');
    poly(c, [[195, 140], [205, 140], [235, 225], [190, 225]], '#cba36f');
  });
  sc.paint('props', (c) => {
    leafTree(c, 18, 200, 26, ['#134c4c', '#33984b', '#5ac54f'], { seed: 2 });
    leafTree(c, 385, 205, 30, ['#134c4c', '#1e6f50', '#33984b'], { seed: 7 });
    // cerca
    for (let x = 300; x < 372; x += 12) rect(c, x, 178, 3, 16, '#8a4836');
    rect(c, 298, 182, 74, 2, '#bf6f4a'); rect(c, 298, 188, 74, 2, '#8a4836');
  });
  const house = sc.atlas['house-1'];
  if (house) sc.sprite(scaleHalf(house), 92, 172, { shadow: false });
  const farm = sc.atlas['farm-1'];
  if (farm) sc.sprite(scaleHalf(farm), 330, 170, { shadow: false });
  // Os cinco símbolos riscados no chão, brilhando.
  sc.paint('solid', (c) => SEAL_COLORS.forEach((col, i) => {
    const x = 178 + i * 14; const y = 206 + (i % 2) * 3;
    ell(c, x, y, 4, 1.8, '#391f21'); ell(c, x, y, 2.6, 1, col);
  }));
  sc.hero(130, 200, { dir: 'right', weapon: 'back' });
  sc.npc('nina', 196, 198);
  sc.npc('pipo', 236, 202, { flip: true });
  sc.npc('marta', 272, 192, { flip: true });
  sc.paint('add', (c) => {
    rays(c, 20, -20, { count: 6, from: 0.5, to: 1.2, length: 300, color: '#ffeb57', a: 0.08 });
    SEAL_COLORS.forEach((col, i) => glow(c, 178 + i * 14, 206 + (i % 2) * 3, 10, col, 0.45));
  });
  sc.paint('soft', (c) => vignette(c, '#391f21', 0.35));
}

/** 3 — Ferro, comércio e muralhas (crepúsculo, saqueadores atacando a paliçada). */
function scene3(sc) {
  sc.light(1, '#ffa214', 0.5).tint('#571c27', 0.12);
  sc.paint('solid', (c) => {
    vgrad(c, 0, 140, [[0, '#3b1443'], [0.5, '#891e2b'], [0.85, '#e07438'], [1, '#ffa214']]);
    ell(c, 300, 128, 22, 22, '#ffc825');
    ridge(c, { base: 128, amp: 22, freq: 0.01, seed: 6, color: '#571c27', rim: '#c64524', lightX: 400 });
    groundPlane(c, 150, ['#391f21', '#5d2c28', '#391f21'], { stroke: ['#1c121c', '#8a4836'], strokes: 100 });
  });
  sc.paint('soft', (c) => { [[60, 120], [120, 110], [330, 115]].forEach(([x, y], i) => { for (let k = 0; k < 10; k += 1) ell(c, x + k * 3 + i, y - k * 9, 10 + k * 2, 6 + k, rgba('#1c121c', 0.35 - k * 0.03)); }); });
  sc.paint('props', (c) => {
    // paliçada da vila à esquerda
    for (let x = 0; x < 120; x += 7) {
      const h = 58 + hash(x, 1, 3) * 10;
      poly(c, [[x, 170], [x, 170 - h], [x + 3, 166 - h], [x + 6, 170 - h], [x + 6, 170]], x % 14 ? '#5d2c28' : '#8a4836');
      rect(c, x + 5, 170 - h, 1, h, '#bf6f4a');
    }
    rect(c, 0, 140, 120, 3, '#391f21');
    eclipseBanner(c, 300, 80, 26);
    rock(c, 380, 220, 40, 22, ['#1c121c', '#391f21', '#5d2c28'], { side: 1 });
  });
  sc.monster('bandit', 270, 200);
  sc.monster('banditBoss', 340, 196);
  sc.npc('saqueador', 238, 190, { flip: true });
  sc.hero(170, 206, { dir: 'right', pose: 'strike', weapon: 'hand' });
  sc.npc('ferreiro', 96, 202);
  sc.paint('add', (c) => {
    glow(c, 300, 128, 120, '#ff5000', 0.35, 0.6);
    // flechas em chamas
    [[150, 60], [200, 40], [250, 70]].forEach(([x, y]) => { line(c, x, y, x - 22, y + 14, '#ffc825', 1); glow(c, x - 22, y + 14, 6, '#ff5000', 0.8); });
    specks(c, 50, [0, 40, 400, 200], ['#ffa214', '#ff5000'], { seed: 6 });
  });
  sc.paint('soft', (c) => vignette(c, '#1c121c', 0.6));
}

/** 4 — Os mistérios da floresta (ruína musgosa, raios verdes, vagalumes). */
function scene4(sc) {
  sc.light(-1, '#99e65f', 0.45).tint('#0c2e44', 0.18);
  sc.paint('solid', (c) => {
    vgrad(c, 0, 225, [[0, '#0c2e44'], [0.5, '#134c4c'], [1, '#0c2e44']]);
    pineRow(c, 120, { color: '#134c4c', step: 12, h: 90, seed: 2, jitter: 6 });
    pineRow(c, 150, { color: '#0c2e44', lit: '#134c4c', step: 16, h: 110, seed: 3, jitter: 8 });
    groundPlane(c, 165, ['#134c4c', '#1e6f50', '#0c2e44'], { stroke: ['#33984b', '#134c4c'], strokes: 90 });
  });
  sc.paint('props', (c) => {
    // templo em ruínas: escadas, colunas, arco com musgo
    const x = 205;
    rect(c, x - 60, 150, 120, 16, '#424c6e'); rect(c, x - 70, 162, 140, 8, '#2a2f4e');
    for (const dx of [-48, -22, 22, 48]) {
      const h = dx === 48 ? 46 : 78;
      rect(c, x + dx - 6, 150 - h, 12, h, '#657392'); rect(c, x + dx - 6, 150 - h, 3, h, '#92a1b9');
      rect(c, x + dx - 8, 150 - h - 4, 16, 5, '#424c6e');
      ell(c, x + dx - 2, 150 - h + 4, 6, 3, '#33984b'); ell(c, x + dx + 3, 150 - h * 0.4, 4, 6, '#1e6f50');
    }
    poly(c, [[x - 30, 72], [x, 54], [x + 30, 72], [x + 30, 78], [x - 30, 78]], '#424c6e');
    ell(c, x, 60, 16, 4, '#33984b');
    // altar com o selo da Terra
    rect(c, x - 10, 136, 20, 14, '#2a2f4e'); rect(c, x - 10, 136, 20, 3, '#657392');
    // raízes
    line(c, 120, 168, 150, 150, '#391f21', 4); line(c, 300, 172, 262, 152, '#391f21', 4);
    pine(c, 16, 225, 190, '#0c2e44', { lit: '#134c4c', side: 1, seed: 4, trunk: '#1c121c' });
    pine(c, 392, 225, 170, '#0c2e44', { lit: '#134c4c', side: -1, seed: 6, trunk: '#1c121c' });
    // cogumelos que brilham
    [[90, 210], [300, 214], [330, 206]].forEach(([mx, my]) => { rect(c, mx, my - 4, 2, 4, '#c7cfdd'); ell(c, mx + 1, my - 5, 4, 2.4, '#0098dc'); });
  });
  sc.paint('solid', (c) => seal(c, 205, 130, 5, SEAL_COLORS[0]));
  sc.hero(150, 210, { dir: 'right', weapon: 'back' });
  sc.npc('cacador', 112, 206);
  sc.paint('add', (c) => {
    rays(c, 230, -30, { count: 6, from: 1.4, to: 2.1, length: 260, color: '#99e65f', a: 0.16 });
    glow(c, 205, 130, 70, '#5ac54f', 0.5);
    glow(c, 205, 130, 16, '#d3fc7e', 0.7);
    [[90, 205], [300, 209], [330, 201]].forEach(([x, y]) => glow(c, x, y, 12, '#00cdf9', 0.5));
    specks(c, 30, [60, 90, 360, 200], ['#d3fc7e', '#99e65f'], { seed: 13, size: 1 });
  });
  sc.paint('soft', (c) => { fogBand(c, 170, 24, '#33984b', 0.18); vignette(c, '#0c2e44', 0.7); });
}

/** 5 — O reino perdido (Valdora sob a lua de sangue, soldados sem rei). */
function scene5(sc) {
  sc.light(1, '#f5555d', 0.5).tint('#3b1443', 0.2);
  sc.paint('solid', (c) => {
    vgrad(c, 0, 150, [[0, '#0e071b'], [0.55, '#3b1443'], [1, '#622461']]);
    stars(c, 60, 90, 21, '#f68187');
    ell(c, 290, 62, 34, 34, '#c42430'); ell(c, 282, 54, 26, 26, '#ea323c'); ell(c, 300, 70, 6, 4, '#891e2b'); ell(c, 278, 50, 4, 3, '#891e2b');
    castle(c, 290, 150, 1.1, '#1a1932', { lit: '#3b1443', broken: true, seed: 4 });
    ridge(c, { base: 156, amp: 12, freq: 0.02, seed: 8, color: '#1c121c', rim: '#571c27', lightX: 400 });
    groundPlane(c, 160, ['#1c121c', '#272727', '#1c121c'], { stroke: ['#3d3d3d', '#0e071b'], strokes: 90 });
  });
  sc.paint('props', (c) => {
    // túmulo de Aurelian
    rect(c, 50, 168, 70, 24, '#424c6e'); rect(c, 50, 168, 70, 4, '#92a1b9'); rect(c, 44, 190, 82, 8, '#2a2f4e');
    poly(c, [[85, 168], [72, 150], [98, 150]], '#657392'); ell(c, 85, 178, 7, 7, '#2a2f4e'); ell(c, 85, 178, 4, 4, '#ffc825');
    // colunas quebradas e lápides
    rect(c, 160, 140, 10, 50, '#424c6e'); rect(c, 160, 140, 3, 50, '#657392'); poly(c, [[158, 140], [172, 134], [172, 140]], '#424c6e');
    [[22, 206], [140, 212], [380, 210]].forEach(([x, y]) => { rect(c, x - 5, y - 14, 10, 14, '#3d3d3d'); ell(c, x, y - 14, 5, 4, '#3d3d3d'); rect(c, x - 5, y - 14, 2, 14, '#5d5d5d'); });
  });
  sc.monster('skeleton', 300, 206);
  sc.monster('skeleton', 352, 198, { attack: true });
  sc.monster('knight', 250, 196);
  sc.hero(180, 210, { dir: 'right', pose: 'windup', weapon: 'hand' });
  sc.paint('add', (c) => { glow(c, 290, 62, 140, '#ea323c', 0.35); glow(c, 85, 178, 18, '#ffc825', 0.6); specks(c, 20, [0, 120, 400, 200], ['#f68187'], { seed: 31 }); });
  sc.paint('soft', (c) => { fogBand(c, 186, 26, '#622461', 0.25, 5); vignette(c, '#0e071b', 0.7); });
}

/** 6 — A Terra Congelada (aurora sobre o vilarejo esquecido; lobos do gelo). */
function scene6(sc) {
  sc.light(-1, '#94fdff', 0.5).tint('#424c6e', 0.18);
  sc.paint('solid', (c) => {
    vgrad(c, 0, 150, [[0, '#03193f'], [0.6, '#00396d'], [1, '#424c6e']]);
    stars(c, 90, 110, 41);
    ridge(c, { base: 120, amp: 50, freq: 0.009, seed: 12, color: '#657392', rim: '#ffffff', ridged: true, shade: '#424c6e' });
    ridge(c, { base: 146, amp: 22, freq: 0.016, seed: 13, color: '#92a1b9', rim: '#d5e8ef', shade: '#657392' });
    groundPlane(c, 160, ['#9cc8e6', '#d5e8ef', '#c7cfdd'], { stroke: ['#ffffff', '#92a1b9'], strokes: 90 });
  });
  sc.paint('add', (c) => {
    for (let i = 0; i < 3; i += 1) {
      c.beginPath();
      for (let x = 0; x <= W; x += 4) c.lineTo(x, 40 + i * 12 + Math.sin(x * 0.02 + i) * 14);
      c.strokeStyle = rgba(['#5ac54f', '#00cdf9', '#93388f'][i], 0.28); c.lineWidth = 10 - i * 2; c.stroke();
    }
  });
  sc.paint('props', (c) => {
    // vilarejo coberto de neve
    for (const [x, w, h] of [[60, 40, 26], [110, 30, 20], [330, 44, 28]]) {
      rect(c, x - w / 2, 168 - h, w, h, '#5d2c28'); rect(c, x - w / 2, 168 - h, 3, h, '#8a4836');
      poly(c, [[x - w / 2 - 4, 170 - h], [x, 150 - h], [x + w / 2 + 4, 170 - h]], '#d5e8ef');
      poly(c, [[x, 150 - h], [x + w / 2 + 4, 170 - h], [x + w * 0.1, 170 - h]], '#9cc8e6');
      rect(c, x - 3, 160 - h * 0.4, 5, 6, '#0e071b');
    }
    pine(c, 385, 225, 120, '#134c4c', { lit: '#d5e8ef', side: -1, seed: 3, trunk: '#391f21' });
    rock(c, 20, 222, 36, 20, ['#424c6e', '#657392', '#d5e8ef']);
  });
  sc.monster('frostWolf', 290, 208);
  sc.monster('frostWolf', 340, 196, { attack: true });
  sc.npc('curandeira', 110, 204);
  sc.hero(180, 212, { dir: 'right', weapon: 'hand' });
  sc.paint('add', (c) => { glow(c, 60, 156, 10, '#ffc825', 0.6); glow(c, 330, 154, 10, '#ffc825', 0.6); });
  sc.paint('soft', (c) => {
    for (let i = 0; i < 90; i += 1) line(c, hash(i, 1, 7) * W, hash(i, 2, 7) * H, hash(i, 1, 7) * W - 6, hash(i, 2, 7) * H + 3, rgba('#ffffff', 0.7), 1);
    fogBand(c, 172, 20, '#d5e8ef', 0.25); vignette(c, '#03193f', 0.55);
  });
}

/** 7 — O Deserto dos Ossos (sol negro no céu, ossadas, escorpiões). */
function scene7(sc) {
  sc.light(-1, '#ffeb57', 0.5).tint('#e07438', 0.08);
  sc.paint('solid', (c) => {
    skyGrad(c, 0, 140, [[0, '#ed7614'], [0.5, '#ffa214'], [1, '#f6ca9f']]);
    ridge(c, { base: 128, amp: 18, freq: 0.006, seed: 21, color: '#e69c69', rim: '#f9e6cf' });
    ridge(c, { base: 150, amp: 24, freq: 0.009, seed: 22, color: '#cba36f', rim: '#f6ca9f', shade: '#ad7954' });
    groundPlane(c, 165, ['#cba36f', '#e69c69', '#ad7954'], { stroke: ['#f6ca9f', '#ad7954'], strokes: 120 });
  });
  sc.paint('props', (c) => {
    // ossada gigante (costelas)
    for (let i = 0; i < 6; i += 1) { c.beginPath(); c.arc(80 + i * 13, 196, 26 - i * 2, Math.PI, Math.PI * 1.75); c.strokeStyle = '#f9e6cf'; c.lineWidth = 3; c.stroke(); }
    line(c, 60, 196, 160, 200, '#f6ca9f', 3);
    ell(c, 50, 194, 12, 8, '#f9e6cf'); ell(c, 46, 192, 3, 2, '#391f21');
    // obelisco com o sol negro
    poly(c, [[318, 182], [324, 110], [336, 110], [342, 182]], '#ad7954'); poly(c, [[318, 182], [324, 110], [328, 110], [324, 182]], '#e69c69');
    poly(c, [[324, 110], [330, 100], [336, 110]], '#8a4836');
    ell(c, 330, 130, 5, 5, '#0e071b');
    rock(c, 390, 222, 30, 16, ['#8a4836', '#ad7954', '#e69c69']);
  });
  sc.monster('scorpion', 260, 210);
  sc.monster('mummy', 300, 200);
  sc.npc('contrabandista', 220, 196, { flip: true });
  sc.hero(170, 212, { dir: 'right', weapon: 'hand' });
  sc.paint('solid', (c) => { ell(c, 120, 46, 20, 20, '#ffeb57'); ell(c, 120, 46, 15, 15, '#0e071b'); });
  sc.paint('add', (c) => {
    rays(c, 120, 46, { count: 14, from: 0, to: Math.PI * 2, length: 90, color: '#ffeb57', a: 0.3, width: 0.05 });
    glow(c, 120, 46, 60, '#ff5000', 0.35);
  });
  sc.paint('soft', (c) => { fogBand(c, 152, 18, '#f9e6cf', 0.3); vignette(c, '#5d2c28', 0.4); });
}

/** 8 — A Guerra das Cinzas (o exército corrompido marcha; céu em brasa). */
function scene8(sc) {
  sc.light(1, '#ff5000', 0.55).tint('#3b1443', 0.15);
  sc.paint('solid', (c) => {
    vgrad(c, 0, 150, [[0, '#1c121c'], [0.5, '#571c27'], [1, '#c64524']]);
    castle(c, 330, 140, 0.9, '#1c121c', { windows: '#ff5000', seed: 9 });
    ridge(c, { base: 146, amp: 12, freq: 0.02, seed: 31, color: '#1c121c', rim: '#891e2b', lightX: 400 });
    // exército ao longe: lanças e estandartes
    for (let i = 0; i < 70; i += 1) {
      const x = 180 + hash(i, 1, 2) * 220; const y = 150 + hash(i, 2, 2) * 12;
      rect(c, x, y - 7, 3, 7, '#0e071b'); rect(c, x + 1, y - 15, 1, 8, '#391f21');
    }
    groundPlane(c, 160, ['#391f21', '#1c121c', '#0e071b'], { stroke: ['#5d2c28', '#0e071b'], strokes: 90 });
  });
  sc.paint('props', (c) => {
    eclipseBanner(c, 250, 100, 34); eclipseBanner(c, 372, 108, 30);
    // muralha do acampamento à esquerda, em chamas
    for (let x = 0; x < 90; x += 10) { rect(c, x, 130, 9, 60, '#424c6e'); rect(c, x, 130, 2, 60, '#657392'); rect(c, x + 2, 124, 5, 6, '#424c6e'); }
  });
  sc.monster('emberKnight', 280, 206);
  sc.monster('demon', 330, 198, { attack: true });
  sc.monster('emberKnightBoss', 380, 190);
  sc.npc('capitao', 120, 208);
  sc.hero(190, 212, { dir: 'right', pose: 'strike', weapon: 'hand' });
  sc.paint('solid', (c) => { campfire(c, 40, 132, 1.3); campfire(c, 75, 132, 1); });
  sc.paint('add', (c) => {
    glow(c, 330, 120, 160, '#ff5000', 0.35, 0.6); glow(c, 55, 120, 60, '#ffa214', 0.5);
    specks(c, 80, [0, 0, 400, 220], ['#ffa214', '#ff5000', '#ffeb57'], { seed: 8 });
  });
  sc.paint('soft', (c) => { for (let k = 0; k < 8; k += 1) ell(c, 60 + k * 8, 110 - k * 12, 18 + k * 4, 8 + k * 2, rgba('#1c121c', 0.35)); vignette(c, '#0e071b', 0.6); });
}

/** 9 — A Montanha das Cinzas (a forja original dos selos, rio de lava). */
function scene9(sc) {
  sc.light(1, '#ffa214', 0.6).tint('#391f21', 0.18);
  sc.paint('solid', (c) => {
    vgrad(c, 0, 225, [[0, '#0e071b'], [0.5, '#1c121c'], [1, '#391f21']]);
    // paredes da caverna
    ridge(c, { base: 40, amp: 30, freq: 0.02, seed: 41, color: '#1c121c', rim: '#5d2c28', ridged: true, bottom: 0 });
    poly(c, [[0, 0], [70, 0], [60, 80], [90, 160], [0, 225]], '#272727');
    poly(c, [[400, 0], [330, 0], [345, 90], [310, 170], [400, 225]], '#272727');
    groundPlane(c, 170, ['#272727', '#1c121c'], { stroke: ['#3d3d3d', '#0e071b'], strokes: 60 });
    // rio de lava em diagonal
    poly(c, [[260, 170], [300, 170], [400, 210], [400, 225], [330, 225]], '#c64524');
    poly(c, [[270, 172], [290, 172], [380, 210], [350, 216]], '#ffa214');
  });
  sc.paint('props', (c) => {
    // a forja: bigorna antiga sobre plataforma com cinco encaixes
    rect(c, 150, 160, 110, 14, '#3d3d3d'); rect(c, 150, 160, 110, 3, '#5d5d5d'); rect(c, 140, 172, 130, 8, '#272727');
    poly(c, [[180, 160], [186, 140], [176, 136], [236, 136], [226, 140], [232, 160]], '#424c6e');
    rect(c, 176, 136, 60, 4, '#92a1b9');
    rock(c, 40, 220, 60, 34, ['#0e071b', '#1c121c', '#3d3d3d'], { side: 1 });
    rock(c, 120, 92, 30, 20, ['#0e071b', '#1c121c', '#3d3d3d'], { side: 1 });
  });
  sc.paint('solid', (c) => SEAL_COLORS.forEach((col, i) => seal(c, 172 + i * 17, 120 - Math.sin((i / 4) * Math.PI) * 10, 4, col)));
  sc.monster('fireElemental', 300, 160, { flip: true });
  sc.monster('cinderGiant', 345, 182, { attack: true });
  sc.hero(130, 212, { dir: 'right', weapon: 'back' });
  sc.paint('add', (c) => {
    glow(c, 330, 200, 140, '#ff5000', 0.45, 0.6);
    SEAL_COLORS.forEach((col, i) => glow(c, 172 + i * 17, 120 - Math.sin((i / 4) * Math.PI) * 10, 14, col, 0.6));
    specks(c, 60, [150, 20, 400, 200], ['#ffa214', '#ffeb57'], { seed: 19 });
  });
  sc.paint('soft', (c) => vignette(c, '#0e071b', 0.7, 220, 150));
}

/** 10 — O destino de Eldoria (o Golem de Fogo diante dos cinco selos). */
function scene10(sc) {
  sc.light(1, '#ffa214', 0.6).tint('#391f21', 0.15);
  sc.paint('solid', (c) => {
    vgrad(c, 0, 160, [[0, '#0e071b'], [0.5, '#571c27'], [1, '#c64524']]);
    ridge(c, { base: 130, amp: 70, freq: 0.006, seed: 51, color: '#1c121c', rim: '#8e251d', ridged: true, lightX: 400 });
    // cratera / vulcão ao fundo
    poly(c, [[200, 160], [270, 60], [300, 60], [370, 160]], '#272727');
    poly(c, [[262, 70], [285, 52], [308, 70]], '#c64524');
    groundPlane(c, 165, ['#391f21', '#1c121c'], { stroke: ['#5d2c28', '#0e071b'], strokes: 80 });
    poly(c, [[0, 200], [120, 186], [180, 225], [0, 225]], '#8e251d');
  });
  sc.paint('props', (c) => {
    for (const [x, h] of [[40, 50], [370, 60]]) { poly(c, [[x - 8, 210], [x - 4, 210 - h], [x + 4, 210 - h - 6], [x + 9, 210]], '#272727'); rect(c, x - 4, 210 - h, 2, h, '#5d5d5d'); }
  });
  sc.monster('titan', 290, 196);
  sc.paint('solid', (c) => SEAL_COLORS.forEach((col, i) => seal(c, 120 + i * 40, 46 + (i % 2) * 10, 5, col)));
  sc.hero(150, 212, { dir: 'right', pose: 'windup', weapon: 'hand' });
  sc.paint('add', (c) => {
    glow(c, 285, 60, 120, '#ff5000', 0.4); glow(c, 290, 150, 90, '#ffa214', 0.3);
    SEAL_COLORS.forEach((col, i) => { glow(c, 120 + i * 40, 46 + (i % 2) * 10, 22, col, 0.6); line(c, 120 + i * 40, 46 + (i % 2) * 10, 290, 150, rgba(col, 0.25), 1); });
    specks(c, 90, [0, 0, 400, 225], ['#ffa214', '#ffeb57', '#ff5000'], { seed: 23 });
  });
  sc.paint('soft', (c) => vignette(c, '#0e071b', 0.6));
}

/** Final — a aurora sobre o vale (a heroína de costas, olhando o acampamento). */
function sceneFinal(sc) {
  sc.light(1, '#ffeb57', 0.55).tint('#e69c69', 0.08);
  sc.paint('solid', (c) => {
    vgrad(c, 0, 130, [[0, '#00396d'], [0.45, '#c85086'], [0.75, '#f68187'], [1, '#ffc825']]);
    ell(c, 250, 128, 28, 28, '#ffeb57');
    cloudBank(c, 30, 50, 140, { lit: '#ffc825', mid: '#f68187', dark: '#93388f', seed: 7 });
    cloudBank(c, 270, 70, 110, { lit: '#ffeb57', mid: '#f68187', dark: '#93388f', seed: 9 });
    ridge(c, { base: 126, amp: 30, freq: 0.008, seed: 61, color: '#622461', rim: '#f68187', ridged: true, lightX: 400 });
    ridge(c, { base: 146, amp: 18, freq: 0.012, seed: 62, color: '#134c4c', rim: '#33984b', lightX: 400 });
    groundPlane(c, 150, ['#1e6f50', '#33984b', '#134c4c'], { stroke: ['#5ac54f', '#134c4c'], strokes: 60 });
  });
  const camp = [['house-8', 175, 176], ['store-8', 315, 180]];
  sc.paint('props', (c) => {
    // penhasco em primeiro plano onde ela está
    poly(c, [[0, 225], [0, 190], [60, 182], [130, 192], [170, 225]], '#391f21');
    poly(c, [[0, 190], [60, 182], [130, 192], [128, 196], [60, 188], [0, 196]], '#33984b');
    leafTree(c, 380, 220, 28, ['#134c4c', '#1e6f50', '#33984b'], { side: 1, seed: 4 });
  });
  for (const [name, x, y] of camp) { const f = sc.atlas[name]; if (f) sc.sprite(scaleHalf(f), x, y, { shadow: false }); }
  sc.hero(80, 190, { dir: 'up', weapon: 'back' });
  sc.paint('add', (c) => {
    glow(c, 250, 128, 170, '#ffc825', 0.45, 0.6);
    rays(c, 250, 128, { count: 9, from: Math.PI, to: Math.PI * 2, length: 260, color: '#ffeb57', a: 0.14 });
  });
  sc.paint('soft', (c) => { fogBand(c, 160, 22, '#f68187', 0.2); vignette(c, '#3b1443', 0.35); });
}

/** Reduz um quadro do atlas pela metade (moda de 2x2), para prédios ao longe. */
function scaleHalf(frame) {
  const w = Math.floor(frame.width / 2); const h = Math.floor(frame.height / 2);
  const out = new PixelCanvas(w, h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const counts = new Map(); let solid = 0;
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const k = ((y * 2 + dy) * frame.width + x * 2 + dx) * 4;
        if (frame.data[k + 3] < 128) continue;
        solid += 1;
        const key = (frame.data[k] << 16) | (frame.data[k + 1] << 8) | frame.data[k + 2];
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      if (solid < 2) continue;
      const key = [...counts].sort((a, b) => b[1] - a[1])[0][0];
      out.pixel(x, y, `#${((1 << 24) | key).toString(16).slice(1)}`);
    }
  }
  return out;
}

/** Aurelian — a memória do rei (salão do trono em luz dourada e fantasmagórica). */
function sceneAurelian(sc) {
  sc.light(-1, '#ffeb57', 0.5).tint('#424c6e', 0.12);
  sc.paint('solid', (c) => {
    vgrad(c, 0, 225, [[0, '#1a1932'], [0.6, '#2a2f4e'], [1, '#1a1932']]);
    // colunas em perspectiva
    for (let i = 0; i < 5; i += 1) {
      const t = i / 4; const x = 30 + t * 110; const w = 22 - t * 10; const top = 10 + t * 30;
      rect(c, x, top, w, 180 - top, '#424c6e'); rect(c, x, top, w * 0.3, 180 - top, '#657392');
      rect(c, W - x - w, top, w, 180 - top, '#2a2f4e'); rect(c, W - x - w * 0.3, top, w * 0.3, 180 - top, '#424c6e');
    }
    // piso de pedra em perspectiva
    vgrad(c, 170, 225, [[0, '#2a2f4e'], [1, '#424c6e']]);
    for (let i = -8; i <= 8; i += 1) line(c, 200 + i * 6, 170, 200 + i * 40, 225, '#1a1932', 1);
    // tapete
    poly(c, [[190, 170], [210, 170], [250, 225], [150, 225]], '#891e2b'); poly(c, [[194, 170], [206, 170], [236, 225], [164, 225]], '#c42430');
  });
  sc.paint('props', (c) => {
    // trono
    rect(c, 180, 110, 40, 60, '#5d2c28'); poly(c, [[176, 110], [200, 84], [224, 110]], '#8a4836'); rect(c, 180, 110, 6, 60, '#bf6f4a');
    rect(c, 172, 150, 56, 20, '#391f21'); ell(c, 200, 98, 5, 5, '#ffc825');
    rect(c, 160, 168, 80, 6, '#424c6e'); rect(c, 150, 174, 100, 6, '#2a2f4e');
  });
  sc.npc('aurelian', 200, 168, { rim: true });
  sc.hero(130, 216, { dir: 'up', weapon: 'back' });
  sc.paint('add', (c) => {
    rays(c, 120, -40, { count: 5, from: 0.9, to: 1.3, length: 300, color: '#ffeb57', a: 0.2 });
    glow(c, 200, 130, 70, '#ffc825', 0.4);
    specks(c, 40, [140, 60, 260, 180], ['#ffeb57', '#ffffff'], { seed: 51 });
  });
  sc.paint('soft', (c) => vignette(c, '#0e071b', 0.65, 200, 130));
}

/** Final secreto — o Coração livre (o cristal sobe, os cinco selos em órbita). */
function sceneFree(sc) {
  sc.light(1, '#94fdff', 0.55).tint('#3b1443', 0.12);
  sc.paint('solid', (c) => {
    vgrad(c, 0, 170, [[0, '#0e071b'], [0.5, '#3b1443'], [1, '#93388f']]);
    stars(c, 140, 160, 61);
    ridge(c, { base: 150, amp: 40, freq: 0.008, seed: 71, color: '#1a1932', rim: '#ca52c9', ridged: true });
    groundPlane(c, 165, ['#1a1932', '#2a2f4e', '#1a1932'], { stroke: ['#424c6e', '#0e071b'], strokes: 60 });
  });
  sc.paint('props', (c) => {
    // o Coração: cristal facetado
    poly(c, [[200, 60], [222, 88], [200, 126], [178, 88]], '#c42430');
    poly(c, [[200, 60], [178, 88], [200, 96]], '#f5555d'); poly(c, [[200, 96], [222, 88], [200, 126]], '#891e2b');
    rect(c, 196, 72, 3, 6, '#fdd2ed');
    rock(c, 200, 190, 90, 22, ['#1a1932', '#2a2f4e', '#424c6e']);
  });
  sc.paint('solid', (c) => SEAL_COLORS.forEach((col, i) => { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; seal(c, 200 + Math.cos(a) * 52, 93 + Math.sin(a) * 30, 4, col); }));
  sc.hero(150, 212, { dir: 'up', weapon: 'back' });
  sc.npc('aurelian', 260, 208, { flip: true });
  sc.paint('add', (c) => {
    glow(c, 200, 93, 130, '#ea323c', 0.45); glow(c, 200, 93, 30, '#fdd2ed', 0.6);
    rays(c, 200, 93, { count: 16, from: 0, to: Math.PI * 2, length: 160, color: '#f68187', a: 0.18 });
    SEAL_COLORS.forEach((col, i) => { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; glow(c, 200 + Math.cos(a) * 52, 93 + Math.sin(a) * 30, 14, col, 0.7); });
    specks(c, 60, [100, 20, 300, 200], ['#fdd2ed', '#94fdff'], { seed: 71 });
  });
  sc.paint('soft', (c) => vignette(c, '#0e071b', 0.5, 200, 110));
}

/** 11 — Brejos e mares perdidos (a torre afogada na névoa e o navio pirata). */
function scene11(sc) {
  sc.light(-1, '#c7cfdd', 0.45).tint('#134c4c', 0.2);
  sc.paint('solid', (c) => {
    vgrad(c, 0, 140, [[0, '#1a1932'], [0.5, '#134c4c'], [1, '#657392']]);
    ell(c, 90, 44, 14, 14, '#d5e8ef');
    // mar ao fundo e navio pirata
    vgrad(c, 120, 150, [[0, '#0c2e44'], [1, '#134c4c']]);
    poly(c, [[300, 126], [360, 126], [352, 136], [306, 136]], '#1c121c');
    line(c, 330, 126, 330, 92, '#1c121c', 2); poly(c, [[331, 94], [350, 100], [331, 118]], '#272727'); poly(c, [[329, 96], [312, 104], [329, 118]], '#3d3d3d');
    rect(c, 330, 88, 8, 4, '#0e071b');
    // torre afogada
    rect(c, 150, 64, 26, 80, '#424c6e'); rect(c, 150, 64, 6, 80, '#657392'); poly(c, [[146, 66], [163, 40], [180, 66]], '#2a2f4e');
    rect(c, 160, 84, 5, 8, '#ffc825');
    groundPlane(c, 145, ['#2d2e25', '#494834', '#2d2e25'], { stroke: ['#1e6f50', '#1c121c'], strokes: 100 });
    // poças
    [[80, 180, 40], [260, 200, 60], [330, 168, 30]].forEach(([x, y, w]) => { ell(c, x, y, w, 5, '#134c4c'); ell(c, x - w * 0.2, y - 1, w * 0.5, 1.5, '#657392'); });
  });
  sc.paint('props', (c) => {
    // juncos e árvores mortas
    for (let i = 0; i < 40; i += 1) { const x = hash(i, 1, 81) * W; const y = 160 + hash(i, 2, 81) * 60; line(c, x, y, x + (hash(i, 3, 81) - 0.5) * 4, y - 8 - hash(i, 4, 81) * 8, '#494834', 1); if (i % 3 === 0) rect(c, x - 1, y - 14, 2, 4, '#5d2c28'); }
    line(c, 30, 225, 40, 120, '#1c121c', 5); line(c, 38, 150, 10, 120, '#1c121c', 2); line(c, 39, 140, 70, 110, '#1c121c', 2);
  });
  sc.monster('frog', 250, 206);
  sc.monster('witch', 300, 196);
  sc.monster('pirate', 350, 210, { attack: true });
  sc.npc('barqueiro', 110, 200);
  sc.hero(180, 214, { dir: 'right', weapon: 'hand' });
  sc.paint('add', (c) => { glow(c, 90, 44, 70, '#d5e8ef', 0.25); glow(c, 162, 88, 12, '#ffc825', 0.6); });
  sc.paint('soft', (c) => { fogBand(c, 140, 30, '#92a1b9', 0.4, 2); fogBand(c, 200, 30, '#657392', 0.25, 9); vignette(c, '#0c2e44', 0.55); });
}

/** 12 — O vento dos Picos Gelados (mamute e yeti na encosta, torre de gelo). */
function scene12(sc) {
  sc.light(-1, '#ffffff', 0.5).tint('#657392', 0.12);
  sc.paint('solid', (c) => {
    vgrad(c, 0, 150, [[0, '#0069aa'], [0.6, '#9cc8e6'], [1, '#d5e8ef']]);
    cloudBank(c, 220, 40, 150, { lit: '#ffffff', mid: '#d5e8ef', dark: '#92a1b9', seed: 12 });
    ridge(c, { base: 120, amp: 80, freq: 0.007, seed: 91, color: '#92a1b9', rim: '#ffffff', ridged: true, shade: '#657392' });
    // torre de gelo num pico
    poly(c, [[300, 80], [306, 30], [312, 24], [318, 30], [324, 80]], '#00cdf9'); poly(c, [[300, 80], [306, 30], [312, 24], [310, 80]], '#94fdff');
    ridge(c, { base: 150, amp: 30, freq: 0.012, seed: 92, color: '#c7cfdd', rim: '#ffffff', shade: '#92a1b9' });
    groundPlane(c, 168, ['#d5e8ef', '#ffffff', '#c7cfdd'], { stroke: ['#9cc8e6', '#ffffff'], strokes: 80 });
  });
  sc.paint('props', (c) => {
    rock(c, 30, 216, 50, 30, ['#424c6e', '#657392', '#ffffff']);
    pine(c, 380, 225, 110, '#134c4c', { lit: '#ffffff', side: -1, seed: 12, trunk: '#391f21' });
    pine(c, 352, 220, 70, '#134c4c', { lit: '#ffffff', side: -1, seed: 14, trunk: '#391f21' });
  });
  sc.monster('mammoth', 280, 204);
  sc.monster('yeti', 330, 210, { attack: true });
  sc.monster('snowOwl', 240, 120);
  sc.hero(170, 214, { dir: 'right', pose: 'windup', weapon: 'hand' });
  sc.paint('add', (c) => { glow(c, 312, 50, 40, '#94fdff', 0.4); rays(c, 0, 0, { count: 5, from: 0.3, to: 0.9, length: 300, color: '#ffffff', a: 0.12 }); });
  sc.paint('soft', (c) => {
    for (let i = 0; i < 70; i += 1) { const x = hash(i, 1, 9) * W; const y = hash(i, 2, 9) * H; line(c, x, y, x + 14, y + 2, rgba('#ffffff', 0.55), 1); }
    vignette(c, '#424c6e', 0.4);
  });
}

/** 13 — Os reis da areia (pirâmide, o Faraó desperto, a Torre dos Ventos). */
function scene13(sc) {
  sc.light(1, '#ffc825', 0.55).tint('#8a4836', 0.1);
  sc.paint('solid', (c) => {
    vgrad(c, 0, 150, [[0, '#622461'], [0.45, '#e07438'], [0.8, '#ffa214'], [1, '#ffc825']]);
    ell(c, 330, 124, 24, 24, '#ffeb57');
    // pirâmide com face de luz e de sombra
    poly(c, [[110, 150], [190, 52], [270, 150]], '#ad7954'); poly(c, [[190, 52], [270, 150], [210, 150]], '#e69c69');
    for (let k = 1; k < 12; k += 1) { const y = 52 + k * 8.2; const half = (y - 52) * 0.816; line(c, 190 - half, y, 190 + half, y, rgba('#8a4836', 0.6), 1); }
    rect(c, 182, 128, 16, 22, '#391f21');
    // torre dos ventos
    rect(c, 40, 70, 14, 80, '#8a4836'); rect(c, 40, 70, 4, 80, '#cba36f'); poly(c, [[36, 72], [47, 50], [58, 72]], '#5d2c28');
    ridge(c, { base: 160, amp: 18, freq: 0.01, seed: 101, color: '#cba36f', rim: '#f9e6cf', lightX: 400, shade: '#ad7954' });
    groundPlane(c, 170, ['#e69c69', '#cba36f', '#ad7954'], { stroke: ['#f6ca9f', '#8a4836'], strokes: 100 });
  });
  sc.paint('props', (c) => {
    for (const x of [150, 230]) { rect(c, x - 6, 150, 12, 40, '#ad7954'); rect(c, x - 6, 150, 3, 40, '#f6ca9f'); rect(c, x - 9, 146, 18, 5, '#8a4836'); }
    rock(c, 380, 222, 34, 18, ['#8a4836', '#ad7954', '#e69c69'], { side: 1 });
  });
  sc.monster('pharaoh', 270, 206);
  sc.monster('scarab', 320, 212);
  sc.monster('cobra', 220, 212);
  sc.hero(150, 214, { dir: 'right', pose: 'windup', weapon: 'hand' });
  sc.paint('add', (c) => { glow(c, 330, 124, 150, '#ff5000', 0.35, 0.6); glow(c, 190, 140, 30, '#ffc825', 0.35); });
  sc.paint('soft', (c) => { fogBand(c, 168, 16, '#f9e6cf', 0.3); vignette(c, '#391f21', 0.45); });
}

/** 14 — A ilha que respira fogo (vulcão em erupção, dragão e fênix). */
function scene14(sc) {
  sc.light(1, '#ffa214', 0.6).tint('#391f21', 0.15);
  sc.paint('solid', (c) => {
    vgrad(c, 0, 160, [[0, '#0e071b'], [0.45, '#571c27'], [1, '#c64524']]);
    poly(c, [[160, 160], [250, 50], [290, 50], [380, 160]], '#1c121c'); poly(c, [[250, 50], [270, 60], [262, 160], [160, 160]], '#272727');
    poly(c, [[244, 58], [270, 40], [296, 58]], '#ffa214');
    for (const [x, len] of [[262, 70], [280, 50]]) line(c, x, 60, x + (x - 270) * 2, 60 + len, '#c64524', 3);
    vgrad(c, 150, 170, [[0, '#0c2e44'], [1, '#00396d']]); // mar
    ridge(c, { base: 172, amp: 14, freq: 0.02, seed: 111, color: '#1c121c', rim: '#8e251d', lightX: 400 });
    groundPlane(c, 178, ['#272727', '#1c121c'], { stroke: ['#3d3d3d', '#8e251d'], strokes: 80 });
  });
  sc.paint('soft', (c) => { for (let k = 0; k < 12; k += 1) ell(c, 270 + k * 6, 40 - k * 4, 14 + k * 4, 8 + k * 2, rgba('#272727', 0.5 - k * 0.03)); });
  sc.paint('props', (c) => {
    // torre de cinzas
    rect(c, 60, 70, 18, 110, '#272727'); rect(c, 60, 70, 4, 110, '#3d3d3d'); poly(c, [[56, 72], [69, 46], [82, 72]], '#1c121c'); rect(c, 66, 100, 4, 6, '#ff5000');
    rock(c, 20, 222, 40, 24, ['#0e071b', '#1c121c', '#3d3d3d'], { side: 1 });
  });
  sc.monster('dragon', 300, 150);
  sc.monster('phoenix', 200, 90);
  sc.monster('salamander', 330, 212);
  sc.hero(170, 216, { dir: 'right', weapon: 'hand' });
  sc.paint('add', (c) => {
    glow(c, 270, 48, 120, '#ff5000', 0.5); glow(c, 200, 80, 30, '#ffa214', 0.5);
    specks(c, 100, [150, 0, 400, 160], ['#ffa214', '#ffeb57', '#ff5000'], { seed: 41 });
  });
  sc.paint('soft', (c) => vignette(c, '#0e071b', 0.55));
}

/** 15 — As portas do Abismo (escadaria que desce para o escuro, gárgulas e serpente de ossos). */
function scene15(sc) {
  sc.light(-1, '#ca52c9', 0.5).tint('#1a1932', 0.25);
  sc.paint('solid', (c) => {
    vgrad(c, 0, 225, [[0, '#0e071b'], [0.6, '#1a1932'], [1, '#0e071b']]);
    // portal em arco
    poly(c, [[120, 225], [120, 70], [200, 30], [280, 70], [280, 225]], '#272727');
    poly(c, [[146, 225], [146, 82], [200, 54], [254, 82], [254, 225]], '#0e071b');
    // escadas descendo (perspectiva)
    for (let i = 0; i < 9; i += 1) { const t = i / 9; const y = 225 - t * 110; const half = 60 - t * 40; rect(c, 200 - half, y - 6, half * 2, 6, i % 2 ? '#3d3d3d' : '#272727'); rect(c, 200 - half, y - 6, half * 2, 1, '#5d5d5d'); }
    groundPlane(c, 200, ['#1c121c', '#0e071b'], { stroke: ['#272727'], strokes: 30 });
  });
  sc.paint('props', (c) => {
    // estátuas guardiãs nas laterais
    for (const [x, s] of [[90, 1], [310, -1]]) {
      rect(c, x - 14, 170, 28, 40, '#272727'); rect(c, x - 14, 170, 4, 40, '#3d3d3d');
      poly(c, [[x - 10, 170], [x - 8, 130], [x + 8, 130], [x + 10, 170]], '#3d3d3d');
      ell(c, x, 124, 8, 8, '#3d3d3d'); poly(c, [[x - 6 * s, 118], [x - 18 * s, 100], [x - 4 * s, 124]], '#272727');
      ell(c, x + 3 * s, 123, 1.5, 1.5, '#ca52c9');
    }
  });
  sc.monster('gargoyle', 90, 120, { flip: false });
  sc.monster('boneWyrm', 290, 210);
  sc.monster('ghost', 240, 140);
  sc.hero(160, 216, { dir: 'right', weapon: 'hand' });
  sc.paint('add', (c) => {
    glow(c, 200, 120, 90, '#93388f', 0.5); glow(c, 200, 110, 24, '#ca52c9', 0.5);
    [[93, 123], [307, 123]].forEach(([x, y]) => glow(c, x, y, 8, '#ca52c9', 0.8));
    specks(c, 40, [140, 60, 260, 200], ['#ca52c9', '#9cc8e6'], { seed: 61 });
  });
  sc.paint('soft', (c) => { fogBand(c, 200, 30, '#3b1443', 0.35); vignette(c, '#0e071b', 0.65); });
}

/** 16 — O fim do Abismo de Brasa (o Senhor do Abismo no trono, a heroína ataca). */
function scene16(sc) {
  sc.light(1, '#ff5000', 0.6).tint('#3b1443', 0.15);
  sc.paint('solid', (c) => {
    vgrad(c, 0, 225, [[0, '#0e071b'], [0.55, '#3b1443'], [1, '#571c27']]);
    // salão: colunas de obsidiana com fendas de lava
    for (const x of [30, 90, 310, 370]) { rect(c, x - 10, 20, 20, 170, '#1c121c'); line(c, x - 2, 40, x + 3, 120, '#c64524', 1); line(c, x + 3, 120, x - 1, 170, '#ff5000', 1); }
    // trono
    poly(c, [[230, 170], [240, 60], [260, 40], [280, 60], [300, 70], [310, 170]], '#1c121c');
    poly(c, [[240, 60], [260, 40], [262, 170], [230, 170]], '#272727');
    groundPlane(c, 175, ['#1c121c', '#391f21', '#1c121c'], { stroke: ['#8e251d', '#0e071b'], strokes: 70 });
    // rio de lava diante do trono
    poly(c, [[0, 190], [400, 180], [400, 192], [0, 202]], '#c64524'); poly(c, [[0, 194], [400, 184], [400, 187], [0, 197]], '#ffa214');
  });
  sc.paint('props', (c) => {
    for (const [x, y] of [[200, 170], [340, 172]]) { ell(c, x, y, 6, 3, '#3d3d3d'); rect(c, x - 1, y - 18, 2, 16, '#3d3d3d'); ell(c, x, y - 20, 3, 3, '#ffa214'); }
  });
  sc.monster('abyssLord', 270, 176);
  sc.monster('soulReaper', 340, 214, { attack: true });
  sc.monster('abyssHound', 230, 216);
  sc.hero(130, 218, { dir: 'right', pose: 'strike', weapon: 'hand' });
  sc.paint('add', (c) => {
    glow(c, 200, 190, 220, '#ff5000', 0.35, 0.4); glow(c, 270, 110, 60, '#ca52c9', 0.3);
    [[200, 150], [340, 152]].forEach(([x, y]) => glow(c, x, y, 16, '#ffa214', 0.7));
    specks(c, 70, [0, 0, 400, 225], ['#ffa214', '#ff5000', '#ca52c9'], { seed: 71 });
  });
  sc.paint('soft', (c) => vignette(c, '#0e071b', 0.6));
}

const SCENES = {
  1: scene1,
  2: scene2,
  3: scene3,
  4: scene4,
  5: scene5,
  6: scene6,
  7: scene7,
  8: scene8,
  9: scene9,
  10: scene10,
  11: scene11,
  12: scene12,
  13: scene13,
  14: scene14,
  15: scene15,
  16: scene16,
  final: sceneFinal,
  aurelian: sceneAurelian,
  libertar: sceneFree
};

export const STORY_SCENE_KEYS = Object.freeze(Object.keys(SCENES));

/**
 * Desenha a ilustração do capítulo (1–16), do final ('final'), da memória de Aurelian ('aurelian')
 * ou do final secreto ('libertar'). atlas: prédios, árvores, moradores (`npc-<id>`) e a folha da
 * heroína (`hero-sheet`, skin Guerreira), lidos pelo gerador. Só roda no Node (@napi-rs/canvas).
 */
export function drawStoryScene(key, atlas = {}) {
  const scene = new Scene(atlas);
  (SCENES[key] ?? scene1)(scene);
  return scene.render();
}
