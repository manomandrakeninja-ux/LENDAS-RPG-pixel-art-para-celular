import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { PALETTE } from '../../../src/art/palette.js';

// Compara v05, v06 e v06.1: emendas, cruzamento em 24/8 px, cores, opacidade e quadros 48–63.
const S = 48;
const load = (f) => PNG.sync.read(fs.readFileSync(path.resolve(f)));
const at = (img, k, x, y) => { const i = ((Math.floor(k / 8) * S + y) * img.width + (k % 8) * S + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]]; };
const cls = (p) => (p[1] >= 175 ? 1 : 0);
const corners = (m) => [m & 1, (m >> 1) & 1, (m >> 2) & 1, (m >> 3) & 1];
const master = new Set(PALETTE.map((h) => h.toLowerCase()));
const hexOf = (p) => '#' + p.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');
const measure = (file, v05) => {
  const img = load(file);
  let mism = 0, pairs = 0, seam = 0, inner = 0;
  for (let a = 0; a < 48; a += 1) for (let b = 0; b < 48; b += 1) {
    const ca = corners(a % 16), cb = corners(b % 16);
    if (ca[1] !== cb[0] || ca[3] !== cb[2]) continue;
    pairs += 1;
    for (let y = 0; y < S; y += 1) { const pa = at(img, a, S - 1, y), pb = at(img, b, 0, y); if (cls(pa) !== cls(pb)) mism += 1; seam += Math.abs(pa[1] - pb[1]); inner += Math.abs(at(img, a, S - 2, y)[1] - pa[1]); }
  }
  let c24 = 0, c8 = 0, alphaBad = 0, hist = new Map(), outside = new Map();
  for (let k = 0; k < 48; k += 1) for (let y = 0; y < S; y += 1) for (let x = 0; x < S - 1; x += 1) {
    const d = cls(at(img, k, x, y)) !== cls(at(img, k, x + 1, y));
    if (x === 23) c24 += d ? 1 : 0; if (x === 7) c8 += d ? 1 : 0;
  }
  for (let k = 0; k < 64; k += 1) for (let y = 0; y < S; y += 1) for (let x = 0; x < S; x += 1) {
    const p = at(img, k, x, y); if (p[3] !== 255 && p[3] !== 0) alphaBad += 1; if (p[3] === 0) continue;
    const h = hexOf(p); if (k < 48) hist.set(h, (hist.get(h) ?? 0) + 1); if (!master.has(h)) outside.set(h, (outside.get(h) ?? 0) + 1);
  }
  let diff48 = 0;
  if (v05) { const base = load(v05); for (let k = 48; k < 64; k += 1) for (let y = 0; y < S; y += 1) for (let x = 0; x < S; x += 1) { const a = at(img, k, x, y), b = at(base, k, x, y); if (a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2]) diff48 += 1; } }
  const total = 48 * S * S;
  return {
    emendas: { pares: pairs, linhasClasseDiferente: mism, diffCorBorda: +(seam / (pairs * S)).toFixed(2), diffCorDentro: +(inner / (pairs * S)).toFixed(2) },
    cruzamento24: +(c24 / (48 * S)).toFixed(3), cruzamento8: +(c8 / (48 * S)).toFixed(3),
    cores: [...hist.entries()].sort((a, b) => b[1] - a[1]).map(([c, v]) => `${c} ${(100 * v / total).toFixed(1)}%`),
    coresForaDaPaleta: [...outside.keys()], alphaNaoBinario: alphaBad, quadros48a63DiferentesDaV05: diff48,
  };
};
const v05 = 'public/assets/tiles/grass-sheet.png';
// Pixels de detalhe isolados: detalhe (cor fora de verde base) sem nenhum outro detalhe em volta (raio 1).
const isolated = (file) => {
  const img = load(file); const base = new Set(['#33984b', '#5ac54f']);
  let det = 0, iso = 0;
  for (let k = 0; k < 48; k += 1) for (let y = 1; y < S - 1; y += 1) for (let x = 1; x < S - 1; x += 1) {
    const h = hexOf(at(img, k, x, y)); if (base.has(h)) continue; det += 1;
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy += 1) for (let dx = -1; dx <= 1 && !near; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      if (!base.has(hexOf(at(img, k, x + dx, y + dy)))) near = true;
    }
    if (!near) iso += 1;
  }
  return { detalhePx: det, isoladosPx: iso, fracaoIsolados: +(iso / Math.max(1, det)).toFixed(3) };
};

console.log(JSON.stringify({
  v05: measure(v05, null),
  v06: measure('art-pro/experiments/grass_v06/grass-sheet-v06.png', v05),

  v062: measure('art-pro/experiments/grass_v062/grass-sheet-v062.png', v05),
  v063: measure('art-pro/experiments/grass_v063/grass-sheet-v063.png', v05),
  isolados: { v061: isolated('art-pro/experiments/grass_v061/grass-sheet-v061.png'), v062: isolated('art-pro/experiments/grass_v063/grass-sheet-v063.png') },
}, null, 1));
