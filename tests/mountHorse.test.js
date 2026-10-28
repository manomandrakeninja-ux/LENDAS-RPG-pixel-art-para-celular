import test from 'node:test';
import assert from 'node:assert/strict';
import { HORSE_DIRS, HORSE_FRAMES, HORSE_GALLOP, HORSE_H, HORSE_IDLE, HORSE_W, horseSeat, horseSheetPixels } from '../src/art/mountHorse.js';
import { POSE } from '../src/art/heroRig.js';

function framePixels(sheet, dirIndex, layer, frame) {
  const out = [];
  const row = dirIndex * 2 + layer;
  for (let y = 0; y < HORSE_H; y += 1) {
    for (let x = 0; x < HORSE_W; x += 1) {
      const i = ((row * HORSE_H + y) * sheet.width + frame * HORSE_W + x) * 4;
      out.push(sheet.data[i + 3] ? (sheet.data[i] << 16) | (sheet.data[i + 1] << 8) | sheet.data[i + 2] : -1);
    }
  }
  return out;
}

test('galope tem o dobro dos quadros do andar do herói, em 4 direções com 2 camadas', () => {
  assert.equal(HORSE_GALLOP.length, POSE.walk.length * 2);
  assert.equal(HORSE_FRAMES, 16);
  assert.deepEqual(HORSE_DIRS, ['down', 'left', 'right', 'up']);
  const sheet = horseSheetPixels();
  assert.equal(sheet.width, HORSE_W * HORSE_FRAMES);
  assert.equal(sheet.height, HORSE_H * 8);
  HORSE_DIRS.forEach((dir, d) => {
    for (const f of HORSE_GALLOP) {
      const a = framePixels(sheet, d, 0, f);
      const b = framePixels(sheet, d, 0, (f + 1) % 8);
      const filled = a.filter((v) => v >= 0).length;
      const diff = a.filter((v, i) => v !== b[i]).length;
      assert.ok(filled > 900, `${dir} ${f} pintado`);
      assert.ok(diff / filled > 0.05, `${dir} ${f} muda para o próximo quadro`);
      assert.ok(framePixels(sheet, d, 1, f).some((v) => v >= 0), `${dir} ${f} tem camada da frente`);
    }
    const seats = HORSE_GALLOP.map((f) => horseSeat(dir, f)[1]);
    assert.ok(Math.max(...seats) - Math.min(...seats) >= 2, `${dir}: a sela sobe e desce`);
  });
  // esquerda é pintada de verdade, não o espelho da direita
  const left = framePixels(sheet, 1, 0, 0);
  const right = framePixels(sheet, 2, 0, 0);
  const mirrored = left.filter((v, i) => v !== right[Math.floor(i / HORSE_W) * HORSE_W + (HORSE_W - 1 - (i % HORSE_W))]).length;
  assert.ok(mirrored > 200);
  assert.ok(HORSE_IDLE.some(([f]) => f === 11) && HORSE_IDLE.some(([f]) => f === 13));
});
