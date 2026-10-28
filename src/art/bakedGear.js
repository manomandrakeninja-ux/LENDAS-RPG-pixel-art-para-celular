// G-armas: ícones e sprites de arma pintados em 4x e reduzidos para pixel art.
// Os dados vêm de src/art/gearSprites.js (gerado por scripts/bake-gear.mjs).
import { PixelCanvas } from './pixel.js';
import { GEAR_ICON_SPRITES, WEAPON_HAND_SIZE, WEAPON_HAND_SPRITES } from './gearSprites.js';

const cache = new Map();

function base64Bytes(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decode(key, entry, size) {
  if (cache.has(key)) return cache.get(key);
  const colors = entry.colors.split(',').map((hex) => {
    const value = Number.parseInt(hex, 16);
    return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
  });
  const bytes = base64Bytes(entry.data);
  const out = new Uint8ClampedArray(size * size * 4);
  let at = 0;
  for (let i = 0; i < bytes.length; i += 2) {
    const color = colors[bytes[i]];
    for (let run = bytes[i + 1]; run > 0; run -= 1) { out.set(color, at); at += 4; }
  }
  cache.set(key, out);
  return out;
}

function toCanvas(data, size) {
  const canvas = new PixelCanvas(size, size);
  canvas.data.set(data);
  return canvas;
}

/** Desenho pintado da peça (32 x 32, fundo transparente), ou null. */
export function bakedGearIcon(id) {
  const entry = GEAR_ICON_SPRITES[id];
  return entry ? toCanvas(decode(`icon:${id}`, entry, 32), 32) : null;
}

/** Sprite pintado da arma na mão/costas (WEAPON_HAND_SIZE, empunhadura em WEAPON_GRIPS), ou null. */
export function bakedWeaponHand(id) {
  const entry = id ? WEAPON_HAND_SPRITES[id] : null;
  return entry ? toCanvas(decode(`hand:${id}`, entry, WEAPON_HAND_SIZE), WEAPON_HAND_SIZE) : null;
}

export { WEAPON_HAND_SIZE };
