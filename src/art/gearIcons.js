import { PixelCanvas, darken, lighten, ramp } from './pixel.js';
import { GEAR_ITEMS } from '../data/gear.js';
import { bakedGearIcon } from './bakedGear.js';

// Ícones 32 x 32 do equipamento (painel de equipamento, loja e quedas).
// G-armas: o desenho de cada peça é pintado em 4x por scripts/bake-gear.mjs (src/art/gearSprites.js);
// aqui só entra a moldura da raridade. As funções de arma abaixo são o desenho antigo, de reserva.

export const GEAR_ICON_SIZE = 32;

const STEEL = ['#4a5058', '#7d8792', '#b8c2cc', '#eef3f6'];
const WOOD = ['#3e2618', '#6e4628', '#94633a', '#b8865a'];
const GOLD = ['#7a5410', '#c99a2b', '#ffd76b', '#fff6c8'];

/** Lâmina diagonal (canto inferior esquerdo → superior direito) com fio claro. */
function blade(c, x0, y0, x1, y1, width, colors) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const w = t > 0.85 ? width * (1 - (t - 0.85) / 0.15) : width;
    for (let o = -w; o <= w; o += 0.5) {
      const tone = o < -w * 0.3 ? 3 : o < w * 0.4 ? 2 : 1;
      c.pixel(Math.round(x + o * 0.7), Math.round(y + o * 0.7), colors[tone]);
    }
  }
}

function handle(c, x0, y0, x1, y1, colors = WOOD) {
  c.line(x0, y0, x1, y1, colors[1]);
  c.line(x0 + 1, y0, x1 + 1, y1, colors[2]);
}

function sparkle(c, x, y, color = '#fff6c8') {
  c.pixel(x, y, color);
  c.pixel(x - 1, y, lighten(color, 0.2));
  c.pixel(x + 1, y, lighten(color, 0.2));
  c.pixel(x, y - 1, lighten(color, 0.2));
  c.pixel(x, y + 1, lighten(color, 0.2));
}

// ---------- Armas ----------

function sword(c, main, accent) {
  blade(c, 9, 22, 26, 5, 2, ramp(accent));
  c.line(5, 19, 13, 27, ramp(main)[1]);
  c.line(5, 18, 13, 26, ramp(main)[2]);
  handle(c, 4, 27, 8, 23, ramp(main));
  c.shadedEllipse(4, 28, 1.6, 1.6, ramp(main));
}

function dagger(c, main, accent) {
  blade(c, 12, 20, 24, 8, 2, ramp(accent));
  c.line(8, 17, 15, 24, ramp(main)[1]);
  handle(c, 6, 26, 10, 22, ramp(main));
  c.pixel(5, 27, ramp(main)[2]);
}

function sabre(c, main, accent) {
  const edge = ramp(accent);
  for (let i = 0; i <= 18; i += 1) {
    const t = i / 18;
    const x = 9 + t * 17;
    const y = 22 - t * 17 + Math.sin(t * Math.PI) * -3;
    for (let o = -1.5; o <= 1.5; o += 0.5) c.pixel(Math.round(x + o * 0.6), Math.round(y + o * 0.8), o < 0 ? edge[3] : o < 1 ? edge[2] : edge[1]);
  }
  // Guarda curva.
  c.line(5, 20, 9, 25, ramp(main)[2]);
  c.line(9, 25, 13, 24, ramp(main)[1]);
  handle(c, 4, 27, 8, 23, WOOD);
}

function axe(c, main, accent) {
  handle(c, 6, 28, 21, 6, ramp(main).map((col) => col));
  const head = ramp(accent);
  c.polygon([[17, 4], [27, 6], [29, 13], [24, 17], [19, 11]], head[1]);
  c.polygon([[19, 6], [26, 7], [27, 11], [21, 10]], head[2]);
  c.line(27, 6, 29, 13, head[3]);
  c.polygon([[17, 9], [14, 7], [13, 11], [16, 12]], head[0]);
}

function spear(c, main, accent) {
  handle(c, 5, 28, 22, 9, ramp(main));
  const tip = ramp(accent);
  c.polygon([[21, 10], [27, 3], [29, 5], [23, 12]], tip[1]);
  c.polygon([[22, 9], [27, 3], [25, 9]], tip[3]);
  c.line(19, 11, 23, 13, tip[0]);
  c.pixel(20, 12, '#c8302a');
}

function trident(c, main, accent) {
  handle(c, 5, 28, 21, 11, ramp(main));
  const tip = ramp(accent);
  c.line(18, 12, 25, 6, tip[2]);
  c.line(18, 13, 26, 7, tip[1]);
  for (const [x, y] of [[20, 4], [25, 5], [27, 10]]) c.line(22, 9, x, y, tip[2]);
  c.pixel(20, 4, tip[3]);
  c.pixel(25, 5, tip[3]);
  c.pixel(27, 10, tip[3]);
}

function club(c, main, accent) {
  handle(c, 6, 28, 15, 18, WOOD);
  c.shadedEllipse(20, 11, 8, 7, ramp(main));
  for (const [x, y] of [[15, 6], [24, 5], [27, 13], [19, 18], [13, 12]]) {
    c.polygon([[x, y - 2], [x + 2, y], [x, y + 2], [x - 2, y]], ramp(accent)[2]);
  }
  c.pixel(17, 8, ramp(accent)[3]);
}

function staff(c, main, accent) {
  handle(c, 6, 29, 20, 9, ramp(main));
  c.line(20, 9, 23, 4, GOLD[2]);
  c.line(20, 9, 26, 8, GOLD[2]);
  c.shadedEllipse(23, 7, 3.5, 3.5, ramp(accent));
  c.pixel(22, 6, '#ffffff');
}

function claw(c, main, accent) {
  const bone = ramp(accent);
  for (const [x, lift] of [[9, 0], [15, -3], [21, -1]]) {
    for (let i = 0; i < 12; i += 1) {
      const t = i / 11;
      const px = x + t * 6;
      const py = 24 - t * 16 + lift + t * t * 4;
      c.pixel(Math.round(px), Math.round(py), bone[2]);
      c.pixel(Math.round(px) + 1, Math.round(py), bone[1]);
      if (t > 0.8) c.pixel(Math.round(px) + 1, Math.round(py) - 1, bone[3]);
    }
  }
  c.shadedEllipse(14, 25, 9, 4, ramp(main));
}

const WEAPONS = { sword, dagger, sabre, axe, spear, trident, club, staff, claw };

/** Desenho antigo da arma (reserva para aparências sem arte pintada), na diagonal: cabo embaixo à esquerda. */
export function drawWeaponArt(canvas, look, main, accent) {
  (WEAPONS[look] ?? sword)(canvas, main, accent);
  return canvas;
}

// ---------- Moldura de raridade (G-armas) ----------
// Cinza (comum), verde (incomum), azul (raro), roxo (lendário) e dourado (relíquia de chefe).
// Borda de tinta com cantos arredondados, aro chanfrado (luz em cima/esquerda), fundo escuro com
// um halo da cor da raridade no meio e, do raro para cima, brilhos nos cantos.
export const FRAME_RAMPS = Object.freeze({
  common: ['#1c121c', '#3d3d3d', '#5d5d5d', '#858585', '#b4b4b4'],
  uncommon: ['#0c2e44', '#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f'],
  rare: ['#03193f', '#00396d', '#0069aa', '#0098dc', '#00cdf9', '#94fdff'],
  legendary: ['#0e071b', '#3b1443', '#622461', '#93388f', '#ca52c9', '#fdd2ed'],
  relic: ['#391f21', '#5d2c28', '#8a4836', '#edab50', '#ffc825', '#ffeb57']
});

/** Qual moldura usar: relíquia de chefe vira dourada; o resto segue a raridade. */
export function frameTier(id, rarity = 'common') {
  if (GEAR_ITEMS[id]?.boss) return 'relic';
  return FRAME_RAMPS[rarity] ? rarity : 'common';
}

function drawFrame(canvas, tier) {
  const r = FRAME_RAMPS[tier];
  const n = r.length;
  const S = GEAR_ICON_SIZE;
  const ink = '#0e071b';
  const glowing = tier !== 'common';
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const edge = Math.min(x, y, S - 1 - x, S - 1 - y);
      const corner = (x < 2 || x > S - 3) && (y < 2 || y > S - 3);
      if (corner && (x === 0 || x === S - 1) && (y === 0 || y === S - 1)) continue; // canto arredondado
      if (edge === 0 || (corner && edge === 1 && (x === 1 || x === S - 2) && (y === 1 || y === S - 2))) { canvas.pixel(x, y, ink); continue; }
      if (edge === 1) { canvas.pixel(x, y, x + y < S - 1 ? r[n - 2] : r[Math.max(1, n - 4)]); continue; }
      if (edge === 2) { canvas.pixel(x, y, x + y < S - 1 ? r[1] : r[0]); continue; }
      // Fundo escuro e neutro; brilho sutil da raridade só por dentro do aro (1 faixa + pontilhado).
      const dither = ((x + y) & 1) === 0;
      let color = (x + y) < S - 4 ? '#1a1932' : '#0e071b';
      if (glowing && (edge === 3 || (edge === 4 && dither))) color = r[1];
      else if (!glowing && edge === 3 && dither) color = '#272727';
      canvas.pixel(x, y, color);
    }
  }
  if (tier === 'rare' || tier === 'legendary' || tier === 'relic') {
    // Brilho sutil: luz no aro de cima e cantos acesos.
    for (let x = 4; x < 12; x += 1) canvas.pixel(x, 1, r[n - 1]);
    for (const [x, y] of [[2, 2], [S - 3, 2], [2, S - 3], [S - 3, S - 3]]) canvas.pixel(x, y, r[n - 1]);
  }
  if (tier === 'legendary' || tier === 'relic') {
    for (const [x, y] of [[1, 3], [3, 1], [S - 2, 3], [S - 4, 1]]) canvas.pixel(x, y, r[n - 2]);
    for (const [x, y] of [[15, 0], [16, 0], [15, S - 1], [16, S - 1], [0, 15], [0, 16], [S - 1, 15], [S - 1, 16]]) canvas.pixel(x, y, r[n - 2]);
  }
}

/** Só o desenho pintado da peça, sem moldura (32 x 32, fundo transparente). */
export function drawGearArt(id) {
  return bakedGearIcon(id) ?? new PixelCanvas(GEAR_ICON_SIZE, GEAR_ICON_SIZE);
}

/** Ícone 32 x 32 de uma peça (`id` de GEAR_ITEMS) dentro da moldura da raridade. */
export function drawGearIcon(id, rarity = 'common', { frame = true } = {}) {
  const canvas = new PixelCanvas(GEAR_ICON_SIZE, GEAR_ICON_SIZE);
  if (!GEAR_ITEMS[id]) return canvas;
  if (frame) drawFrame(canvas, frameTier(id, rarity));
  const art = bakedGearIcon(id);
  if (art) canvas.blit(art, 0, 0);
  return canvas;
}
