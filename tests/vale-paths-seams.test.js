import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

// Caminhos do Vale (atlas dual-grid, 16 máscaras × 3 variantes): continuidade entre quadros vizinhos.
const ATLAS = path.resolve('public/assets/paths/vale-paths.png');
const META = path.resolve('public/assets/paths/vale-paths.json');
const BASE_PNG = path.resolve('art-pro/incoming/vale-paths/vale-paths__v01.png');
const BASE_JSON = path.resolve('art-pro/incoming/vale-paths/vale-paths__v01.json');
const img = PNG.sync.read(fs.readFileSync(ATLAS));
const meta = JSON.parse(fs.readFileSync(META, 'utf8'));
const base = PNG.sync.read(fs.readFileSync(BASE_PNG));
const baseMeta = JSON.parse(fs.readFileSync(BASE_JSON, 'utf8'));
const TL = 1; const TR = 2; const BL = 4; const BR = 8;
const px = (im, f, x, y) => { const i = ((f.y + y) * im.width + f.x + x) * 4; return [im.data[i], im.data[i + 1], im.data[i + 2], im.data[i + 3]]; };
const isDirt = (p) => p[0] > p[1] + 12 && p[0] > p[2] + 25;
const colDiff = (p, q) => (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2])) / 3;
const names = Object.keys(meta.frames);
const frameOf = (n) => meta.frames[n].frame;

test('atlas: dimensões, 48 quadros de 48 px, todos opacos e com nomes por máscara/variante', () => {
  assert.equal(img.width, 384); assert.equal(img.height, 288);
  assert.equal(names.length, 48);
  const count = new Map();
  for (const n of names) {
    const m = meta.frames[n].mask; count.set(m, (count.get(m) ?? 0) + 1);
    const f = frameOf(n); assert.equal(f.w, 48); assert.equal(f.h, 48);
    for (let y = 0; y < 48; y += 1) for (let x = 0; x < 48; x += 1) assert.equal(px(img, f, x, y)[3], 255, `${n} transparente em ${x},${y}`);
  }
  assert.equal(count.size, 16); for (const c of count.values()) assert.equal(c, 3);
});

test('bordas: terra continua terra e grama continua grama em relação à v01 aprovada', () => {
  let diff = 0;
  for (const n of names) {
    const f = frameOf(n); const fb = baseMeta.frames[n].frame;
    for (let y = 0; y < 48; y += 1) for (let x = 0; x < 48; x += 1) {
      if (x > 0 && y > 0 && x < 47 && y < 47) continue;
      const a = px(img, f, x, y); const b = px(base, fb, x, y);
      // Pode mudar o tom da terra (paleta), mas não a classe do pixel (terra/grama) nem a grama.
      if (isDirt(a) !== isDirt(b)) diff += 1;
      if (!isDirt(b) && (a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2])) diff += 1;
    }
  }
  assert.ok(diff <= 0, `${diff} pixels de borda com classe ou grama diferentes da v01`);
});

test('emendas: linhas em que a terra não casa na aresta não passam da referência aprovada', () => {
  const pairsH = []; const pairsV = [];
  for (const a of names) for (const b of names) {
    const ma = meta.frames[a].mask; const mb = meta.frames[b].mask;
    if (((ma & TR) > 0) === ((mb & TL) > 0) && ((ma & BR) > 0) === ((mb & BL) > 0)) pairsH.push([a, b]);
    if (((ma & BL) > 0) === ((mb & TL) > 0) && ((ma & BR) > 0) === ((mb & TR) > 0)) pairsV.push([a, b]);
  }
  const mism = (A, B, horizontal) => { let m = 0; let s = 0; for (let k = 0; k < 48; k += 1) { const pa = horizontal ? px(img, frameOf(A), 47, k) : px(img, frameOf(A), k, 47); const pb = horizontal ? px(img, frameOf(B), 0, k) : px(img, frameOf(B), k, 0); if (isDirt(pa) !== isDirt(pb)) m += 1; s += colDiff(pa, pb); } return { m, s: s / 48 }; };
  let worstH = 0; let worstV = 0; let seamH = 0; let seamV = 0;
  for (const [a, b] of pairsH) { const r = mism(a, b, true); worstH = Math.max(worstH, r.m); seamH += r.s; }
  for (const [a, b] of pairsV) { const r = mism(a, b, false); worstV = Math.max(worstV, r.m); seamV += r.s; }
  // Referência: a mesma medida na v01 aprovada (mesmas bordas).
  assert.ok(worstH <= 4 && worstV <= 4, `linhas de terra desencontradas: horizontal ${worstH}, vertical ${worstV}`);
  assert.ok(seamH / pairsH.length < 22 && seamV / pairsV.length < 22, `diferença de cor na aresta alta: ${(seamH / pairsH.length).toFixed(1)} / ${(seamV / pairsV.length).toFixed(1)}`);
});

test('sem linha artificial: a fronteira da terra varia ao longo do quadro (não é reta na grade)', () => {
  // Quadros com a terra à esquerda (máscara TL+BL = 5): a coluna de corte deve variar entre as linhas.
  for (const n of names.filter((x) => meta.frames[x].mask === 5)) {
    const f = frameOf(n); const cuts = new Set();
    for (let y = 0; y < 48; y += 1) { let last = -1; for (let x = 0; x < 48; x += 1) if (isDirt(px(img, f, x, y))) last = x; cuts.add(last); }
    assert.ok(cuts.size >= 4, `${n}: fronteira reta (${cuts.size} posições distintas)`);
  }
});

test('paleta: pixels de terra usam só cores da paleta de terra do projeto', () => {
  const dirtPalette = new Set(['#391f21', '#5d2c28', '#8a4836', '#ad7954', '#cba36f', '#e69c69', '#f6ca9f']);
  const hex = (p) => '#' + p.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');
  const strange = new Set();
  for (const n of names) { const f = frameOf(n); for (let y = 0; y < 48; y += 1) for (let x = 0; x < 48; x += 1) { const p = px(img, f, x, y); if (isDirt(p) && !dirtPalette.has(hex(p))) strange.add(hex(p)); } }
  assert.equal(strange.size, 0, `cores de terra fora da paleta: ${[...strange].join(' ')}`);
});
