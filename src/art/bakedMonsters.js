// Monstros pintados em alta resolução e reduzidos para pixel art (Fase 20G).
// Os quadros vêm prontos de src/art/monsterSprites.js (gerado por scripts/bake-monsters.mjs):
// 4 quadros de andar (0..3) e 1 de ataque (4), já na paleta, com contorno e sombra.
import { PixelCanvas } from './pixel.js';
import { BAKED_MONSTERS } from './monsterSprites.js';

const decoded = new Map();

function base64Bytes(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Todos os quadros de um tamanho, como um único buffer RGBA (quadros um após o outro). */
function decodeSheet(kind, size) {
  const key = `${kind}:${size}`;
  if (decoded.has(key)) return decoded.get(key);
  const sheet = BAKED_MONSTERS[kind].sheets[size];
  const colors = sheet.colors.split(',').map((hex) => {
    const value = Number.parseInt(hex, 16);
    return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
  });
  const bytes = base64Bytes(sheet.data);
  const out = new Uint8ClampedArray(BAKED_MONSTERS[kind].frames * size * size * 4);
  let at = 0;
  for (let i = 0; i < bytes.length; i += 2) {
    const color = colors[bytes[i]];
    for (let run = bytes[i + 1]; run > 0; run -= 1) {
      out.set(color, at);
      at += 4;
    }
  }
  decoded.set(key, out);
  return out;
}

export function isBakedMonster(kind) {
  return Boolean(BAKED_MONSTERS[kind]);
}

/** { size, elite, frames, attackFrame } do monstro pintado, ou null. */
export function bakedMonsterInfo(kind) {
  const entry = BAKED_MONSTERS[kind];
  if (!entry) return null;
  return { size: entry.size, elite: entry.elite, frames: entry.frames, attackFrame: entry.attackFrame };
}

/**
 * Quadro pronto do monstro. Usa o tamanho pintado mais próximo; se não for exato, amplia/reduz
 * pelo vizinho mais próximo (só acontece em cenas da história que pedem tamanhos antigos).
 */
export function drawBakedFrame(kind, size, frame) {
  const entry = BAKED_MONSTERS[kind];
  const sizes = Object.keys(entry.sheets).map(Number);
  const source = sizes.reduce((best, value) => (Math.abs(value - size) < Math.abs(best - size) ? value : best), sizes[0]);
  const all = decodeSheet(kind, source);
  const index = Math.max(0, Math.min(entry.frames - 1, frame));
  const offset = index * source * source * 4;
  const canvas = new PixelCanvas(size, size);
  if (source === size) {
    canvas.data.set(all.subarray(offset, offset + size * size * 4));
    return canvas;
  }
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sx = Math.min(source - 1, Math.floor((x * source) / size));
      const sy = Math.min(source - 1, Math.floor((y * source) / size));
      const from = offset + (sy * source + sx) * 4;
      canvas.data.set(all.subarray(from, from + 4), (y * size + x) * 4);
    }
  }
  return canvas;
}
