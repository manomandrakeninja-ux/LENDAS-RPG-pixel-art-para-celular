import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PALETTE, RAMPS, nearestHex, paletteRamp, quantizePixels } from '../src/art/palette.js';
import { readPng } from '../scripts/png.js';
import { MONSTER_SIZES, drawMonsterFrame, hasMonsterArt } from '../src/art/monsters.js';
import { REGION_MONSTER_SIZES } from '../src/art/monstersRegions.js';

const allowed = new Set(PALETTE.map((hex) => Number.parseInt(hex.slice(1), 16)));
const offPalette = (data) => {
  let count = 0;
  for (let at = 0; at < data.length; at += 4) if (data[at + 3] > 0 && !allowed.has((data[at] << 16) | (data[at + 1] << 8) | data[at + 2])) count += 1;
  return count;
};

test('paleta-mestre tem 64 cores distintas e as rampas ficam dentro dela', () => {
  assert.equal(new Set(PALETTE).size, 64);
  for (const [name, ramp] of Object.entries(RAMPS)) for (const hex of ramp) assert.ok(PALETTE.includes(hex), `${name}: ${hex}`);
});

test('ramp devolve 4 tons distintos da paleta', () => {
  for (const hex of ['#4a8448', '#9a3e35', '#3f5a8a', '#c9a24f', '#808080']) {
    const ramp = paletteRamp(hex);
    assert.equal(new Set(ramp).size, 4, `${hex}: ${ramp}`);
    for (const tone of ramp) assert.ok(PALETTE.includes(tone));
  }
  assert.ok(PALETTE.includes(nearestHex('#123456')));
});

test('quantizePixels leva para a paleta e preserva o alfa', () => {
  const pixels = { data: new Uint8ClampedArray([10, 200, 30, 255, 1, 2, 3, 0, 250, 120, 40, 128]) };
  quantizePixels(pixels);
  assert.equal(offPalette(pixels.data), 0);
  assert.deepEqual([pixels.data[3], pixels.data[4], pixels.data[11]], [255, 1, 128]);
});

test('todos os PNGs gerados (menos as skins aprovadas) usam só a paleta', () => {
  const root = path.resolve('public/assets');
  const files = fs.readdirSync(root, { recursive: true }).filter((file) => file.endsWith('.png') && !/swordsman|warrior/.test(file));
  assert.ok(files.length > 10);
  for (const file of files) assert.equal(offPalette(readPng(path.join(root, file)).data), 0, file);
});

test('monstros desenhados em tempo de execução usam só a paleta', () => {
  for (const kind of new Set([...Object.keys(MONSTER_SIZES), ...Object.keys(REGION_MONSTER_SIZES)])) {
    if (!hasMonsterArt(kind)) continue;
    const size = (MONSTER_SIZES[kind] || REGION_MONSTER_SIZES[kind]).size;
    assert.equal(offPalette(drawMonsterFrame(kind, size, 0).data), 0, kind);
  }
});
