import { PixelCanvas, darken, lighten } from './pixel.js';

// Cavalo preto a galope (olhando para a direita; a cena espelha para a esquerda). 4 quadros.
export const HORSE_W = 48;
export const HORSE_H = 38;
export const HORSE_FRAMES = 4;

const COAT = '#1f2236';
const COAT_MID = '#2c3150';
const COAT_LIGHT = '#434d78';
const MANE = '#12141f';
const MANE_LIGHT = '#2a2f4a';
const HOOF = '#0c0d14';

// Pernas por quadro: [joelho x, joelho y, casco x, casco y] relativas ao ombro/quadril.
const LEGS = [
  // 0: estendido (frente alcança, trás empurra)
  { fFar: [4, 5, 8, 8], fNear: [5, 4, 10, 6], hFar: [-3, 5, -7, 9], hNear: [-4, 5, -9, 8], bob: 0 },
  // 1: reunido (pernas sob o corpo)
  { fFar: [2, 6, 3, 11], fNear: [3, 6, 5, 10], hFar: [-1, 6, -2, 11], hNear: [-2, 6, -4, 10], bob: -1 },
  // 2: suspenso (pernas dobradas)
  { fFar: [-1, 5, -3, 8], fNear: [0, 5, -2, 9], hFar: [2, 6, 3, 10], hNear: [1, 6, 1, 11], bob: -2 },
  // 3: pouso (frente toca o chão)
  { fFar: [4, 6, 6, 11], fNear: [5, 5, 8, 10], hFar: [-4, 5, -8, 8], hNear: [-5, 4, -10, 6], bob: -1 },
];

function leg(c, sx, sy, [kx, ky, fx, fy], shade) {
  c.line(sx, sy, sx + kx, sy + ky, shade);
  c.line(sx + 1, sy, sx + kx + 1, sy + ky, shade);
  c.line(sx + kx, sy + ky, sx + fx, sy + fy, shade);
  c.line(sx + kx + 1, sy + ky, sx + fx + 1, sy + fy, shade);
  c.rect(sx + fx, sy + fy, 3, 1, HOOF);
}

export function drawHorseFrame(frame) {
  const c = new PixelCanvas(HORSE_W, HORSE_H);
  const p = LEGS[frame % HORSE_FRAMES];
  const top = 17 + p.bob;
  const shoulder = [30, top + 8];
  const hip = [15, top + 8];
  // Sombra e pernas do lado de trás (mais escuras).
  leg(c, shoulder[0] - 1, shoulder[1], p.fFar, darken(COAT, 0.35));
  leg(c, hip[0] - 1, hip[1], p.hFar, darken(COAT, 0.35));
  // Cauda longa, esvoaçando para trás.
  const tail = [[13, top + 2], [8, top + 1], [3, top + 4], [0, top + 9], [2, top + 12], [6, top + 8], [10, top + 6], [13, top + 6]];
  c.polygon(tail, MANE);
  c.line(2, top + 10, 8, top + 5, MANE_LIGHT);
  c.line(5, top + 11, 11, top + 6, MANE_LIGHT);
  // Corpo: garupa, dorso, peito.
  c.polygon([[12, top + 1], [20, top - 1], [28, top], [34, top + 2], [35, top + 8], [31, top + 12], [22, top + 12], [14, top + 11], [11, top + 6]], COAT);
  c.polygon([[13, top + 3], [20, top + 1], [28, top + 2], [32, top + 4], [31, top + 7], [20, top + 7], [13, top + 7]], COAT_MID);
  c.line(14, top + 3, 23, top + 1, COAT_LIGHT);
  c.line(24, top + 2, 31, top + 4, COAT_LIGHT);
  c.line(31, top + 5, 33, top + 8, COAT_LIGHT);
  // Pescoço e cabeça.
  c.polygon([[30, top + 1], [34, top - 6], [38, top - 10], [42, top - 9], [41, top - 5], [36, top + 4], [34, top + 9]], COAT);
  c.polygon([[33, top - 2], [37, top - 8], [39, top - 8], [37, top - 2], [35, top + 3]], COAT_MID);
  c.polygon([[38, top - 11], [44, top - 7], [47, top - 3], [46, top - 1], [43, top - 2], [39, top - 5]], COAT);
  c.line(39, top - 8, 45, top - 4, COAT_LIGHT);
  c.polygon([[38, top - 12], [39, top - 15], [41, top - 11]], COAT);
  c.polygon([[40, top - 11], [42, top - 14], [43, top - 10]], COAT);
  c.pixel(42, top - 7, '#e8f0ff');
  c.pixel(46, top - 2, '#0a0b12');
  // Crina longa.
  c.polygon([[37, top - 12], [32, top - 11], [26, top - 6], [22, top - 3], [27, top - 2], [30, top - 4], [34, top - 5], [36, top - 8]], MANE);
  c.line(34, top - 10, 27, top - 5, MANE_LIGHT);
  c.line(35, top - 7, 30, top - 3, MANE_LIGHT);
  c.pixel(21, top - 2, MANE);
  c.pixel(24, top - 1, MANE);
  // Pernas do lado de perto.
  leg(c, shoulder[0] + 1, shoulder[1], p.fNear, COAT_MID);
  leg(c, hip[0] + 1, hip[1], p.hNear, COAT_MID);
  c.outline();
  return c;
}

export function drawHorseSheet() {
  const sheet = new PixelCanvas(HORSE_W * HORSE_FRAMES, HORSE_H);
  for (let f = 0; f < HORSE_FRAMES; f += 1) sheet.blit(drawHorseFrame(f), f * HORSE_W, 0);
  return sheet;
}
export { lighten };
