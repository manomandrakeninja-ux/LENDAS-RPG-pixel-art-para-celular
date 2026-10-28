import test from 'node:test';
import assert from 'node:assert/strict';
import { ARC_FRAMES, ARC_SIZE, ARC_TONES, HALO, LEVELS, lightBand, swingArcTone } from '../src/art/light.js';
import { PALETTE } from '../src/art/palette.js';

test('luz de cada fonte tem pelo menos 8 degraus em volta e zero de luz fora do alcance', () => {
  const levels = new Set();
  for (let distance = 0; distance <= 200; distance += 0.5) levels.add(lightBand(distance, 60, 80));
  assert.ok(levels.size >= 8, `degraus: ${levels.size}`);
  assert.equal(lightBand(0, 60, 80), 1);
  assert.equal(lightBand(141, 60, 80), 0);
  assert.ok(levels.size <= LEVELS + 1);
});

test('halos e rastro do golpe usam só cores da paleta-mestre', () => {
  const palette = new Set(PALETTE);
  for (const ramp of [...Object.values(HALO), ...Object.values(ARC_TONES)]) {
    for (const hex of ramp) assert.ok(palette.has(hex), hex);
  }
});

test('rastro do golpe: arco de pelo menos 90 graus com 3 tons no quadro cheio', () => {
  const frame = 2;
  const tones = new Set();
  const angles = [];
  for (let y = 0; y < ARC_SIZE; y += 1) {
    for (let x = 0; x < ARC_SIZE; x += 1) {
      const tone = swingArcTone(x, y, frame);
      if (tone < 0) continue;
      tones.add(tone);
      angles.push(Math.atan2(y + 0.5 - ARC_SIZE / 2, x + 0.5 - ARC_SIZE / 2));
    }
  }
  assert.ok(tones.size >= 3, `tons: ${[...tones]}`);
  const span = (Math.max(...angles) - Math.min(...angles)) * 180 / Math.PI;
  assert.ok(span >= 90, `arco: ${span.toFixed(0)}°`);
  // O arco cresce quadro a quadro.
  const count = (f) => { let n = 0; for (let i = 0; i < ARC_SIZE * ARC_SIZE; i += 1) if (swingArcTone(i % ARC_SIZE, Math.floor(i / ARC_SIZE), f) >= 0) n += 1; return n; };
  assert.ok(count(0) < count(1) && count(1) < count(2) && count(3) > 0 && ARC_FRAMES === 4);
});
