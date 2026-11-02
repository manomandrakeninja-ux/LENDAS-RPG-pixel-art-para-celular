import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

// Grama v06.2 EXPERIMENTAL (não substitui a oficial). Atlas 384 × 384, grade 8 × 8 de 48 px.
//
// Base (igual à v06.1): convenção Wang (quadro k → máscara k % 16, bits TL 1, TR 2, BL 4, BR 8, bit ligado = claro;
// variante floor(k / 16)); tom pelos cantos + ruído de 3 e 6 px com peso zero nas 6 px de borda.
// Quadros 48–63 são copiados da v05 sem alteração.
//
// Detalhes (novo na v06.2):
//  - a área do tile é dividida em células de 16 px com semente fixa; cada célula decide, por hash, se tem um
//    agrupamento. A chance vem de um campo de densidade de baixa frequência (24 px), então há regiões limpas
//    (áreas de descanso) e regiões com vegetação;
//  - 6 silhuetas de tufo (pequenas e médias), variando altura, largura, inclinação e quantidade de folhas;
//  - sombra discreta de 1 px sob cada tufo (cor sombra aprovada);
//  - flores pequenas só ocasionalmente, junto de tufos;
//  - pedrinhas em conjuntos de 2–3 pixels, nunca isoladas;
//  - os detalhes ficam dentro da margem de 3 px, então as bordas (emendas) não mudam;
//  - tudo determinístico (hash com semente fixa), sem blur, sem transparência parcial e sem antialiasing.

const SRC = path.resolve('public/assets/tiles/grass-sheet.png');
const OUT = path.resolve('art-pro/experiments/grass_v063/grass-sheet-v063.png');
const S = 48;
const MARGIN = 3;

// Cores (todas da PALETTE do projeto).
const COL = {
  d: [0x33, 0x98, 0x4b], // #33984b verde escuro (base)
  l: [0x5a, 0xc5, 0x4f], // #5ac54f verde claro (base)
  h: [0x99, 0xe6, 0x5f], // #99e65f folha em destaque
  s: [0x1e, 0x6f, 0x50], // #1e6f50 sombra / folha escura
  p: [0x85, 0x85, 0x85], // #858585 pedra
  q: [0x5d, 0x5d, 0x5d], // #5d5d5d pedra escura
  b: [0xb4, 0xb4, 0xb4], // #b4b4b4 pedra clara
  y: [0xff, 0xeb, 0x57], // #ffeb57 flor amarela
  r: [0xf6, 0x81, 0x87], // #f68187 flor rosa
  w: [0xff, 0xff, 0xff], // #ffffff centro da flor
};

// 6 silhuetas de tufo (linhas de mesmo comprimento). Chaves: h destaque, l claro, d escuro, s sombra-folha.
const TUFTS = [
  { name: 'pequeno-ereto', rows: [' h ', 'lhl', 'dld'] },
  { name: 'pequeno-inclinado', rows: ['  h', ' lh', 'lld'] },
  { name: 'medio-largo', rows: [' hl ', 'hlhl', 'dlld', 'dddd'] },
  { name: 'medio-duplo', rows: ['h  h', 'lhhl', 'dlld', 'dddd'] },
  { name: 'medio-folhas', rows: ['hl.h', 'lhlh', 'sddd'] },
  { name: 'medio-alto', rows: ['  ', 'lh', 'dl'] },
];
// Flor pequena: centro branco/colorido com pétalas em cruz.
const FLOWERS = [
  { petal: 'y', center: 'w' },
  { petal: 'r', center: 'w' },
];
// Conjunto de pedrinhas: pixels com cores de pedra, sempre em grupo.
const PEBBLE_SETS = [
  [[0, 0, 'p'], [1, 0, 'q'], [0, 1, 'q']],
  [[0, 0, 'b'], [1, 0, 'p'], [1, 1, 'q'], [2, 1, 'q']],
];

const src = PNG.sync.read(fs.readFileSync(SRC));
const out = new PNG({ width: src.width, height: src.height });
out.data.set(src.data); // quadros 48–63 iguais à v05

const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const hash = (x, y, seed) => {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b9);
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};
const noise = (x, y, cell, seed) => {
  const n = S / cell; const gx = x / cell; const gy = y / cell;
  const x0 = Math.floor(gx); const y0 = Math.floor(gy);
  const fx = smooth(gx - x0); const fy = smooth(gy - y0);
  const c = (i, j) => hash(((i % n) + n) % n, ((j % n) + n) % n, seed);
  const top = c(x0, y0) + (c(x0 + 1, y0) - c(x0, y0)) * fx;
  const bottom = c(x0, y0 + 1) + (c(x0 + 1, y0 + 1) - c(x0, y0 + 1)) * fx;
  return top + (bottom - top) * fy;
};
const interiorWeight = (x, y) => smooth(clamp01(Math.min(x, y, S - 1 - x, S - 1 - y) / 6));
const inside = (x, y) => x >= MARGIN && y >= MARGIN && x < S - MARGIN && y < S - MARGIN;

const put = (img, x0, y0, x, y, rgb) => {
  if (!inside(x, y)) return; // nada entra na margem: as emendas não mudam
  const d = ((y0 + y) * img.width + x0 + x) * 4;
  img.data[d] = rgb[0]; img.data[d + 1] = rgb[1]; img.data[d + 2] = rgb[2]; img.data[d + 3] = 255;
};
const readLight = (img, x0, y0, x, y) => img.data[((y0 + y) * img.width + x0 + x) * 4 + 1] >= 0xa0;

for (let k = 0; k < 48; k += 1) {
  const m = k % 16; const core = Math.floor(k / 16);
  const corner = [m & 1, (m >> 1) & 1, (m >> 2) & 1, (m >> 3) & 1];
  const x0 = (k % 8) * S; const y0 = Math.floor(k / 8) * S;
  const seedFine = 500 + core * 97; const seedMid = 900 + core * 131; const seedDens = 1700 + core * 41;

  // Base: tom pelos cantos + ruído de 3 e 6 px (peso zero na borda).
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const sx = smooth(x / (S - 1)); const sy = smooth(y / (S - 1));
      const top = corner[0] + (corner[1] - corner[0]) * sx;
      const bottom = corner[2] + (corner[3] - corner[2]) * sx;
      const base = top + (bottom - top) * sy;
      const fine = (noise(x, y, 3, seedFine) - 0.5) * 0.7;
      const mid = (noise(x, y, 6, seedMid) - 0.5) * 0.6;
      const value = base + (fine + mid) * interiorWeight(x, y);
      const d = ((y0 + y) * out.width + x0 + x) * 4;
      const tone = value >= 0.5 ? COL.l : COL.d;
      out.data[d] = tone[0]; out.data[d + 1] = tone[1]; out.data[d + 2] = tone[2]; out.data[d + 3] = 255;
    }
  }

  // Agrupamentos: células de 16 px, cada uma com chance dada pelo campo de densidade (regiões limpas e cheias).
  for (let cy = 0; cy < S / 16; cy += 1) {
    for (let cx = 0; cx < S / 16; cx += 1) {
      const cellX = cx * 16; const cellY = cy * 16;
      // Escalas irregulares (17 px e 29 px, não múltiplas de 24) e semente por região: sem período fixo.
      const regionSeed = hash(Math.floor((x0 + cellX) / 96), Math.floor((y0 + cellY) / 96), 5100 + core);
      const n1 = noise(cellX + 8 + regionSeed * 40, cellY + 8, 17, seedDens);
      const n2 = noise(cellX + 3, cellY + 11 + regionSeed * 30, 29, seedDens + 77);
      const density = 0.02 + 0.40 * (0.6 * n1 + 0.4 * n2); // ~2% a ~42%, com áreas de descanso
      const roll = hash(cx, cy, 4000 + core * 53 + m * 7);
      if (roll > density) continue;
      // posição do agrupamento dentro da célula (jitter determinístico)
      const ax = cellX - 2 + Math.floor(hash(cx, cy, 4100 + k) * 18);
      const ay = cellY - 2 + Math.floor(hash(cx, cy, 4200 + k) * 16);
      const kind = hash(cx, cy, 4300 + k);
      if (kind < 0.12) {
        // pedrinhas em conjunto
        const set = PEBBLE_SETS[Math.floor(hash(cx, cy, 4400 + k) * PEBBLE_SETS.length)];
        for (const [dx, dy, c] of set) put(out, x0, y0, ax + dx, ay + dy, COL[c]);
        continue;
      }
      // um ou dois tufos no agrupamento
      const count = hash(cx, cy, 4500 + k) < 0.35 ? 2 : 1;
      for (let t = 0; t < count; t += 1) {
        const tuft = TUFTS[Math.floor(hash(cx, cy, 4600 + k * 3 + t) * TUFTS.length)];
        const tx = ax + t * (5 + Math.floor(hash(cx, cy, 4950 + k + t) * 4)) - (count === 2 ? 3 : 0);
        const tyBase = ay + tuft.rows.length - 1;
        const rowsH = tuft.rows.length;
        // sombra de 1 px sob a base do tufo (só onde a base ainda é grama)
        const shadowY = tyBase + 1;
        for (let dx = 0; dx < tuft.rows[0].length; dx += 1) {
          if (tuft.rows[rowsH - 1][dx] !== ' ') put(out, x0, y0, tx + dx, shadowY, COL.s);
        }
        for (let r = 0; r < rowsH; r += 1) {
          for (let dx = 0; dx < tuft.rows[r].length; dx += 1) {
            const ch = tuft.rows[r][dx];
            if (ch === ' ') continue;
            const key = ch === 'h' ? 'h' : ch === 'l' ? 'l' : ch === 's' ? 's' : 'd';
            put(out, x0, y0, tx + dx, ay + r, COL[key]);
          }
        }
        // flor ocasional perto do tufo (cerca de 1 em 4)
        if (hash(cx, cy, 4700 + k * 3 + t) < 0.25) {
          const f = FLOWERS[Math.floor(hash(cx, cy, 4800 + k * 3 + t) * FLOWERS.length)];
          const fx = tx + tuft.rows[0].length + 1; const fy = ay - 2;
          // flor em grupo de 2–3 px: centro e uma pétala lateral (+ pétala acima em metade dos casos)
          put(out, x0, y0, fx, fy, COL[f.center]);
          put(out, x0, y0, fx + 1, fy, COL[f.petal]);
          put(out, x0, y0, fx, fy + 1, COL[f.petal]);
          if (hash(cx, cy, 4900 + k * 3 + t) < 0.5) put(out, x0, y0, fx - 1, fy, COL[f.petal]);
        }
      }
    }
  }
}
fs.writeFileSync(OUT, PNG.sync.write(out));
console.log('grass-sheet-v063.png gerada:', out.width, 'x', out.height);
