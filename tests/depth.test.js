import test from 'node:test';
import assert from 'node:assert/strict';
import { PixelCanvas } from '../src/art/pixel.js';
import { sunShadow } from '../src/data/sunlight.js';

const rgbAt = (canvas, x, y) => {
  const i = (y * canvas.width + x) * 4;
  return [canvas.data[i], canvas.data[i + 1], canvas.data[i + 2], canvas.data[i + 3]];
};
const luma = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;

test('sombra de contato: 2 tons roxo-azulados (azul > verde), núcleo mais forte que a borda', () => {
  const canvas = new PixelCanvas(24, 10);
  canvas.shadow(12, 5, 10, 3, 105);
  const core = rgbAt(canvas, 12, 5);
  const edge = rgbAt(canvas, 3, 5);
  assert.ok(core[2] > core[1] && edge[2] > edge[1], `sem matiz azul/roxo: ${core} ${edge}`);
  assert.ok(core[3] > edge[3], 'núcleo deveria ser mais opaco que a borda');
  assert.ok(core[3] >= 95 && core[3] <= 115, `núcleo a ~40 %: ${core[3]}`);
});

test('oclusão: escurece a base das colunas que tocam o chão, não a copa suspensa', () => {
  const canvas = new PixelCanvas(20, 30);
  canvas.rect(2, 2, 16, 10, '#33984b'); // copa
  canvas.rect(8, 12, 4, 16, '#8a4836'); // tronco até o chão
  const before = [rgbAt(canvas, 9, 27), rgbAt(canvas, 9, 20), rgbAt(canvas, 3, 11)];
  canvas.baseOcclusion();
  assert.ok(luma(rgbAt(canvas, 9, 27)) < luma(before[0]), 'base do tronco deveria escurecer');
  assert.deepEqual(rgbAt(canvas, 9, 20), before[1], 'meio do tronco fica igual');
  assert.deepEqual(rgbAt(canvas, 3, 11), before[2], 'borda de baixo da copa fica igual');
});

test('sombra longa do sol nunca passa de 1,2x a altura do objeto', () => {
  for (let hour = 0; hour < 24; hour += 0.25) assert.ok(sunShadow(hour).length * 0.8 <= 1.2);
});
