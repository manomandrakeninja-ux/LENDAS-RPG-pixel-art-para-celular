import test from 'node:test';
import assert from 'node:assert/strict';
import { HORSE_DIRS, HORSE_FRAMES, HORSE_GALLOP, HORSE_H, HORSE_IDLE, HORSE_LAYERS, HORSE_W, horseSeat, horseSheetPixels } from '../src/art/mountHorse.js';
import { POSE } from '../src/art/heroRig.js';

function framePixels(sheet, dirIndex, layer, frame) {
  const out = [];
  const row = dirIndex * HORSE_LAYERS.length + layer;
  for (let y = 0; y < HORSE_H; y += 1) {
    for (let x = 0; x < HORSE_W; x += 1) {
      const i = ((row * HORSE_H + y) * sheet.width + frame * HORSE_W + x) * 4;
      out.push(sheet.data[i + 3] ? (sheet.data[i] << 16) | (sheet.data[i + 1] << 8) | sheet.data[i + 2] : -1);
    }
  }
  return out;
}

test('galope tem o dobro dos quadros do andar do herói, em 4 direções com camadas de trás, da frente e da cabeça', () => {
  assert.equal(HORSE_GALLOP.length, POSE.walk.length * 2);
  assert.equal(HORSE_FRAMES, 16);
  assert.deepEqual(HORSE_DIRS, ['down', 'left', 'right', 'up']);
  const sheet = horseSheetPixels();
  assert.equal(sheet.width, HORSE_W * HORSE_FRAMES);
  assert.equal(sheet.height, HORSE_H * HORSE_DIRS.length * HORSE_LAYERS.length);
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

test('pose montada: as pernas sentadas saem dos pixels da própria skin (coxa deitada, joelho dobrado)', async () => {
  const { riderLegs, hipRow } = await import('../src/art/riderLegs.js');
  // Perna de teste 8 px de largura, do quadril (44) ao pé (62), cor única por linha.
  const W = 56; const H = 64; const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y += 1) for (let x = 24; x < 32; x += 1) if (y >= 20) data.set([y * 3, 90, 40, 255], (y * W + x) * 4);
  const side = riderLegs({ width: W, height: H, data }, 'right');
  const opaque = [];
  for (let y = 0; y < side.height; y += 1) for (let x = 0; x < side.width; x += 1) if (side.data[(y * side.width + x) * 4 + 3]) opaque.push([x + side.ox, y + side.oy]);
  const xs = opaque.map(([x]) => x); const ys = opaque.map(([, y]) => y);
  assert.equal(hipRow(H), 44);
  assert.ok(Math.max(...xs) - 31 >= 4, 'a coxa vai para a frente do corpo');
  assert.ok(Math.max(...ys) - 44 < 18, 'sentado fica mais curto que em pé');
  const front = riderLegs({ width: W, height: H, data }, 'down');
  assert.ok(front.width > 0 && front.ox < 24, 'de frente as pernas abrem para os lados');
});
