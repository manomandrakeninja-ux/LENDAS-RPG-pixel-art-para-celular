import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
// Autocorrelação dos detalhes (pixel diferente de verde base) em deslocamentos horizontais de 8 a 40 px,
// dentro de cada tile. Pico alto em um deslocamento = padrão repetitivo naquele período.
const S = 48;
const img = PNG.sync.read(fs.readFileSync(path.resolve(process.argv[2])));
const base = new Set(['#33984b', '#5ac54f']);
const hex = (k, x, y) => { const i = ((Math.floor(k / 8) * S + y) * img.width + (k % 8) * S + x) * 4; return '#' + [img.data[i], img.data[i + 1], img.data[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join(''); };
const det = (k, x, y) => (base.has(hex(k, x, y)) ? 0 : 1);
const res = {};
for (let d = 8; d <= 40; d += 1) {
  let agree = 0, total = 0;
  for (let k = 0; k < 48; k += 1) for (let y = 0; y < S; y += 1) for (let x = 0; x + d < S; x += 1) {
    const a = det(k, x, y); const b = det(k, x + d, y);
    if (a || b) { total += 1; if (a && b) agree += 1; }
  }
  res[d] = +(agree / Math.max(1, total)).toFixed(3);
}
const sorted = Object.entries(res).sort((a, b) => b[1] - a[1]).slice(0, 5);
console.log(JSON.stringify({ arquivo: process.argv[2], topo5: sorted, pico24: res[24], media: +(Object.values(res).reduce((s, v) => s + v, 0) / Object.values(res).length).toFixed(3) }));
