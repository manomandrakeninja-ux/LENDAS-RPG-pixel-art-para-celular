import test from 'node:test';
import assert from 'node:assert/strict';
import { PixelCanvas } from '../src/art/pixel.js';

const luma = (canvas, x, y) => {
  const i = (y * canvas.width + x) * 4;
  return 0.299 * canvas.data[i] + 0.587 * canvas.data[i + 1] + 0.114 * canvas.data[i + 2];
};

test('contorno seletivo: escuro embaixo/direita, sem preto em cima/esquerda', () => {
  const canvas = new PixelCanvas(12, 12);
  canvas.rect(3, 3, 6, 6, '#33984b');
  canvas.selectiveOutline({ strength: 0.9 });
  assert.equal(canvas.alphaAt(5, 2), 255);
  assert.equal(canvas.alphaAt(5, 9), 255);
  assert.ok(luma(canvas, 5, 2) > luma(canvas, 5, 9) + 10, 'topo mais claro que a base');
  assert.ok(luma(canvas, 2, 5) > luma(canvas, 9, 5) + 10, 'esquerda mais clara que a direita');
  assert.ok(luma(canvas, 5, 2) > 25, 'lado da luz não é preto');
  assert.equal(canvas.alphaAt(2, 2), 0, 'cantos diagonais ficam vazios');
});

test('luz de borda: 1 px mais claro no topo e à esquerda, base intacta', () => {
  const canvas = new PixelCanvas(12, 12);
  canvas.rect(3, 3, 6, 6, '#33984b');
  const base = luma(canvas, 5, 5);
  canvas.rimLight();
  assert.ok(luma(canvas, 5, 3) > base, 'topo ganhou luz');
  assert.ok(luma(canvas, 3, 5) > base, 'esquerda ganhou luz');
  assert.equal(luma(canvas, 5, 5), base, 'miolo intacto');
  assert.equal(luma(canvas, 5, 8), base, 'base sem luz');
});
