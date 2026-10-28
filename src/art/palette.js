// Paleta-mestre do jogo: Endesga 64 (lospec.com/palette-list/endesga-64), com 8 tons trocados:
// os violetas/ciano/rosa quase sem uso deram lugar a cinzas quentes, oliva, areia e gelo, que o mundo usa muito
// (escolhidos por agrupamento das cores mal representadas nos PNGs antigos).
// Toda a arte gerada (PNGs do gerador e sprites desenhados no navegador) termina nesta paleta,
// e as rampas puxam a sombra para roxo/azul e a luz para âmbar.
import { differenceCiede2000, modeLab65, modeOklch, modeRgb, useMode } from 'culori/fn';

const rgbMode = useMode(modeRgb);
const toOklch = useMode(modeOklch);
useMode(modeLab65);
const distance = differenceCiede2000();

export const PALETTE = [
  '#2d2e25', '#131313', '#918275', '#272727', '#3d3d3d', '#5d5d5d', '#858585', '#b4b4b4',
  '#ffffff', '#c7cfdd', '#92a1b9', '#657392', '#424c6e', '#2a2f4e', '#1a1932', '#0e071b',
  '#1c121c', '#391f21', '#5d2c28', '#8a4836', '#bf6f4a', '#e69c69', '#f6ca9f', '#f9e6cf',
  '#edab50', '#e07438', '#c64524', '#8e251d', '#ff5000', '#ed7614', '#ffa214', '#ffc825',
  '#ffeb57', '#d3fc7e', '#99e65f', '#5ac54f', '#33984b', '#1e6f50', '#134c4c', '#0c2e44',
  '#00396d', '#0069aa', '#0098dc', '#00cdf9', '#d5e8ef', '#94fdff', '#fdd2ed', '#9cc8e6',
  '#cba36f', '#ad7954', '#494834', '#775c5b', '#03193f', '#3b1443', '#622461', '#93388f',
  '#ca52c9', '#c85086', '#f68187', '#f5555d', '#ea323c', '#c42430', '#891e2b', '#571c27'
];

/** Rampas nomeadas (sombra → brilho), todas dentro da paleta. */
export const RAMPS = {
  grama: ['#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f', '#d3fc7e'],
  terra: ['#391f21', '#5d2c28', '#8a4836', '#bf6f4a', '#e69c69', '#f6ca9f'],
  pedra: ['#1a1932', '#2a2f4e', '#424c6e', '#657392', '#92a1b9', '#c7cfdd'],
  cinza: ['#918275', '#3d3d3d', '#5d5d5d', '#858585', '#b4b4b4', '#ffffff'],
  madeira: ['#1c121c', '#391f21', '#5d2c28', '#8a4836', '#bf6f4a'],
  pele: ['#8a4836', '#bf6f4a', '#e69c69', '#f6ca9f', '#f9e6cf'],
  metal: ['#2a2f4e', '#424c6e', '#657392', '#92a1b9', '#c7cfdd', '#ffffff'],
  vinho: ['#3b1443', '#571c27', '#891e2b', '#c42430', '#ea323c', '#f68187'],
  agua: ['#0c2e44', '#00396d', '#0069aa', '#0098dc', '#00cdf9', '#94fdff'],
  lava: ['#391f21', '#8e251d', '#c64524', '#e07438', '#ffa214', '#ffeb57'],
  neve: ['#424c6e', '#657392', '#9cc8e6', '#d5e8ef', '#ffffff'],
  areia: ['#8a4836', '#ad7954', '#cba36f', '#f6ca9f', '#f9e6cf'],
  cinzaQuente: ['#1c121c', '#2d2e25', '#494834', '#775c5b', '#918275'],
  roxo: ['#0e071b', '#3b1443', '#622461', '#93388f', '#ca52c9', '#9cc8e6']
};

const toKey = (red, green, blue) => (red << 16) | (green << 8) | blue;
const toColor = (red, green, blue) => ({ mode: 'rgb', r: red / 255, g: green / 255, b: blue / 255 });
const ENTRIES = PALETTE.map((hex) => {
  const color = rgbMode(hex);
  return { hex, rgb: [Math.round(color.r * 255), Math.round(color.g * 255), Math.round(color.b * 255)], color };
});
const cache = new Map();

/** Índice da cor da paleta mais próxima (CIEDE2000), com cache por cor. */
function nearestIndex(red, green, blue) {
  const key = toKey(red, green, blue);
  let index = cache.get(key);
  if (index !== undefined) return index;
  const color = toColor(red, green, blue);
  let best = Infinity;
  index = 0;
  ENTRIES.forEach((entry, at) => {
    const value = distance(color, entry.color);
    if (value < best) { best = value; index = at; }
  });
  cache.set(key, index);
  return index;
}

/** Cor da paleta mais próxima de `hex`. */
export function nearestHex(hex) {
  const value = Number.parseInt(hex.slice(1, 7), 16);
  return PALETTE[nearestIndex(value >> 16, (value >> 8) & 255, value & 255)];
}

/** Leva cada pixel visível de `{ data }` (RGBA) para a paleta. Alfa fica igual. Muda no lugar. */
export function quantizePixels(pixels) {
  const data = pixels.data;
  for (let at = 0; at < data.length; at += 4) {
    if (data[at + 3] === 0) continue;
    const [red, green, blue] = ENTRIES[nearestIndex(data[at], data[at + 1], data[at + 2])].rgb;
    data[at] = red;
    data[at + 1] = green;
    data[at + 2] = blue;
  }
  return pixels;
}

const hueToward = (hue, target, amount) => {
  const delta = ((((target - hue) % 360) + 540) % 360) - 180;
  return hue + delta * amount;
};

/** Cor da paleta mais próxima do tom deslocado em OKLCH (sombra → roxo, luz → âmbar), diferente de `avoid`. */
function shifted(base, lightness, hueTarget, hueAmount, chromaScale, avoid) {
  const target = { ...base, l: Math.max(0, Math.min(1, base.l + lightness)), c: (base.c || 0) * chromaScale };
  if (base.c > 0.02) target.h = hueToward(base.h || 0, hueTarget, hueAmount);
  const color = rgbMode(target);
  const clamp = (value) => Math.max(0, Math.min(255, Math.round(value * 255)));
  const ranked = ENTRIES
    .map((entry, at) => ({ at, value: distance(toColor(clamp(color.r), clamp(color.g), clamp(color.b)), entry.color) }))
    .sort((a, b) => a.value - b.value);
  return PALETTE[(ranked.find((item) => !avoid.includes(PALETTE[item.at])) || ranked[0]).at];
}

const rampCache = new Map();

/** Rampa de 4 tons da paleta (sombra, base, luz, brilho) a partir de uma cor qualquer. */
export function paletteRamp(hex) {
  if (rampCache.has(hex)) return rampCache.get(hex);
  const base = nearestHex(hex);
  const oklch = toOklch(base);
  const shadow = shifted(oklch, -0.16, 300, 0.25, 0.95, [base]);
  const light = shifted(oklch, 0.1, 80, 0.15, 1, [base, shadow]);
  const shine = shifted(oklch, 0.2, 85, 0.25, 0.8, [base, shadow, light]);
  const result = [shadow, base, light, shine];
  rampCache.set(hex, result);
  return result;
}
