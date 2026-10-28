// Montaria (Fase 23): cavalo preto-azulado pintado (scripts/bake-horse.mjs → src/art/horseSprites.js).
// Quadros 112 x 96 com cascos na linha 90. Por direção (baixo, esquerda, direita, cima) há duas camadas:
// 'back' (cavalo inteiro, atrás do herói) e 'front' (sela, estribo e botas; de frente também a cabeça),
// por cima do herói. 16 quadros: 0-7 galope (o dobro dos 4 do andar do herói), 8-13 parado, 14 arrancada, 15 parada.
import { HORSE_SPRITES } from './horseSprites.js';

export const HORSE_W = HORSE_SPRITES.w;
export const HORSE_H = HORSE_SPRITES.h;
export const HORSE_GROUND = HORSE_SPRITES.ground;
export const HORSE_FRAMES = HORSE_SPRITES.frames;
export const HORSE_DIRS = HORSE_SPRITES.dirs;
export const HORSE_LAYERS = HORSE_SPRITES.layers;
export const HORSE_GALLOP = [0, 1, 2, 3, 4, 5, 6, 7];
export const HORSE_START = 14;
export const HORSE_STOP = 15;
// Parado: [quadro, ms] — respira, balança a cauda, pisca e de vez em quando bate o casco.
export const HORSE_IDLE = [[8, 900], [9, 700], [8, 500], [10, 380], [8, 260], [12, 380], [8, 700], [11, 110], [8, 900], [9, 700], [8, 400], [13, 200], [8, 160], [13, 160], [8, 600]];

/** Assento [x, y] do quadro (pixels do quadro), para o herói subir e descer junto. */
export function horseSeat(dir, frame) {
  return HORSE_SPRITES.seats[dir][frame];
}

/** Cascos que tocaram o chão neste quadro (pixels do quadro), para a poeira. */
export function horseHits(dir, frame) {
  return HORSE_SPRITES.hits[dir][frame];
}

let sheetCache = null;
/** Folha inteira em RGBA: colunas = quadros, linhas = direção x camada (back, front). */
export function horseSheetPixels() {
  if (sheetCache) return sheetCache;
  const colors = HORSE_SPRITES.colors.split(',').map((hex) => {
    const value = Number.parseInt(hex, 16);
    return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
  });
  const binary = atob(HORSE_SPRITES.data);
  const frameSize = HORSE_W * HORSE_H;
  const rows = HORSE_DIRS.length * HORSE_LAYERS.length;
  const width = HORSE_W * HORSE_FRAMES;
  const out = new Uint8ClampedArray(width * HORSE_H * rows * 4);
  let at = 0; // índice de pixel na sequência de quadros
  for (let i = 0; i < binary.length; i += 2) {
    const color = colors[binary.charCodeAt(i)];
    for (let run = binary.charCodeAt(i + 1); run > 0; run -= 1) {
      const frameIndex = Math.floor(at / frameSize);
      const local = at % frameSize;
      const row = Math.floor(frameIndex / HORSE_FRAMES);
      const col = frameIndex % HORSE_FRAMES;
      const x = col * HORSE_W + (local % HORSE_W);
      const y = row * HORSE_H + Math.floor(local / HORSE_W);
      out.set(color, (y * width + x) * 4);
      at += 1;
    }
  }
  sheetCache = { width, height: HORSE_H * rows, data: out };
  return sheetCache;
}

/** Nome do quadro na textura da montaria. */
export function horseFrameName(dir, layer, frame) {
  return `${dir}-${layer}-${frame}`;
}
