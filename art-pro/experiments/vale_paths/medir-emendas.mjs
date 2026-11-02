import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

// Mede emendas entre quadros dual-grid vizinhos: horizontal (A à esquerda, B à direita) e vertical (A em cima, B embaixo).
// Só é compatível o par cujos quadrantes da aresta coincidem (A.TR=B.TL e A.BR=B.BL, ou A.BL=B.TL e A.BR=B.TR).
// Métricas por par: linhas em que a terra não casa na aresta, e diferença média de cor na aresta vs. no miolo.
const file = process.argv[2];
const meta = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const img = PNG.sync.read(fs.readFileSync(file));
const tile = (name) => { const f = meta.frames[name].frame; return (x, y) => { const i = ((f.y + y) * img.width + f.x + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]]; }; };
const isDirt = (p) => p[3] === 255 && p[0] > p[1] + 12 && p[0] > p[2] + 25;
const names = Object.keys(meta.frames);
const byMask = (m) => names.filter((n) => meta.frames[n].mask === m);
const TL = 1; const TR = 2; const BL = 4; const BR = 8;
const pairs = { h: [], v: [] };
for (const a of names) for (const b of names) {
  const ma = meta.frames[a].mask; const mb = meta.frames[b].mask;
  if (((ma & TR) > 0) === ((mb & TL) > 0) && ((ma & BR) > 0) === ((mb & BL) > 0)) pairs.h.push([a, b]);
  if (((ma & BL) > 0) === ((mb & TL) > 0) && ((ma & BR) > 0) === ((mb & TR) > 0)) pairs.v.push([a, b]);
}
const result = { h: { pairs: pairs.h.length, mismatchRows: 0, worstRows: 0, seamDiff: 0, interiorDiff: 0 }, v: { pairs: pairs.v.length, mismatchRows: 0, worstRows: 0, seamDiff: 0, interiorDiff: 0 } };
const cache = new Map(); const get = (n) => { if (!cache.has(n)) cache.set(n, tile(n)); return cache.get(n); };
const colDiff = (p, q) => (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2])) / 3;
for (const [a, b] of pairs.h) {
  const A = get(a); const B = get(b); let mism = 0; let sd = 0; let id = 0;
  for (let y = 0; y < 48; y += 1) {
    if (isDirt(A(47, y)) !== isDirt(B(0, y))) mism += 1;
    sd += colDiff(A(47, y), B(0, y)); id += colDiff(A(46, y), A(47, y));
  }
  result.h.mismatchRows += mism; result.h.worstRows = Math.max(result.h.worstRows, mism);
  result.h.seamDiff += sd / 48; result.h.interiorDiff += id / 48;
}
for (const [a, b] of pairs.v) {
  const A = get(a); const B = get(b); let mism = 0; let sd = 0; let id = 0;
  for (let x = 0; x < 48; x += 1) {
    if (isDirt(A(x, 47)) !== isDirt(B(x, 0))) mism += 1;
    sd += colDiff(A(x, 47), B(x, 0)); id += colDiff(A(x, 46), A(x, 47));
  }
  result.v.mismatchRows += mism; result.v.worstRows = Math.max(result.v.worstRows, mism);
  result.v.seamDiff += sd / 48; result.v.interiorDiff += id / 48;
}
for (const k of ['h', 'v']) {
  const r = result[k]; r.seamDiff = +(r.seamDiff / r.pairs).toFixed(2); r.interiorDiff = +(r.interiorDiff / r.pairs).toFixed(2); r.mismatchRows = +(r.mismatchRows / r.pairs).toFixed(2);
}
console.log(JSON.stringify(result));
