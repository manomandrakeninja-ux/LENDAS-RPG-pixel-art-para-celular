import { PixelCanvas } from './pixel.js';
import { BAKED_NATURE } from './natureSprites.js';

// Vegetação e pedras pintadas em alta resolução e convertidas para pixel art
// (geradas por scripts/bake-nature.mjs; já vêm com contorno, luz de borda, paleta e sombra).

const cache = new Map();

function decodeAll(name) {
  const entry = BAKED_NATURE[name];
  if (!entry) return null;
  const colors = entry.colors.split(',').map((key) => [
    Number.parseInt(key.slice(0, 2), 16), Number.parseInt(key.slice(2, 4), 16),
    Number.parseInt(key.slice(4, 6), 16), Number.parseInt(key.slice(6, 8), 16)
  ]);
  const binary = atob(entry.data);
  const size = entry.w * entry.h;
  const frames = Array.from({ length: entry.frames }, () => new PixelCanvas(entry.w, entry.h));
  let at = 0;
  for (let i = 0; i < binary.length; i += 2) {
    const [r, g, b, a] = colors[binary.charCodeAt(i)];
    const run = binary.charCodeAt(i + 1);
    for (let k = 0; k < run; k += 1, at += 1) {
      if (a === 0) continue;
      const frame = frames[Math.floor(at / size)];
      const o = (at % size) * 4;
      frame.data[o] = r; frame.data[o + 1] = g; frame.data[o + 2] = b; frame.data[o + 3] = a;
    }
  }
  return frames;
}

/** Existe arte pintada para este nome? */
export function hasBakedNature(name) {
  return Boolean(BAKED_NATURE[name]);
}

/** Cópia do quadro pintado (PixelCanvas) ou null se não houver. */
export function bakedNature(name, frame = 0) {
  if (!cache.has(name)) cache.set(name, decodeAll(name));
  const source = cache.get(name)?.[frame];
  if (!source) return null;
  const copy = new PixelCanvas(source.width, source.height);
  copy.data.set(source.data);
  return copy;
}
