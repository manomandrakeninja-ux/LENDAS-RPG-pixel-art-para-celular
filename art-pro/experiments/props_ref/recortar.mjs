import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { PALETTE, nearestHex } from '../../../src/art/palette.js';

// Experimento (não entra no jogo): recorta árvores, pedras, cercas e placas do painel "Props de Ambiente",
// remove o fundo (pixels escuros do painel), reduz por média de área até a altura-alvo e quantiza na paleta-mestre.
// Uso: node recortar.mjs <escala>  (1 = tamanho do jogo; 0.75 = menor)
const scale = Number(process.argv[2] ?? 1);
const root = path.resolve('art-pro/experiments/props_ref');
const src = PNG.sync.read(fs.readFileSync(path.join(root, 'recorte-props-ambiente.png')));
const W = src.width; const H = src.height;
const at = (x, y) => { const i = (y * W + x) * 4; return [src.data[i], src.data[i + 1], src.data[i + 2]]; };
const isObj = (x, y) => { const [r, g, b] = at(x, y); return (r + g + b) / 3 > 48 || Math.max(r, g, b) - Math.min(r, g, b) > 40; };
// Caixas (x0, y0, x1, y1) no recorte; objetos escolhidos pelo layout do painel.
const TARGET = { arvore: 112, pedra: 40, cerca: 32, placa: 32 };
const BOXES = [
  ['arvore-verde-1', 'arvore', 4, 22, 122, 142], ['arvore-verde-2', 'arvore', 124, 22, 206, 142],
  ['arvore-laranja', 'arvore', 206, 18, 288, 142], ['arvore-rosa', 'arvore', 300, 22, 368, 112],
  ['arvore-azul-verde', 'arvore', 366, 8, 442, 112], ['arvore-morta', 'arvore', 444, 14, 518, 112],
  ['pedra-1', 'pedra', 828, 28, 886, 86], ['pedra-2', 'pedra', 890, 40, 934, 80],
  ['pedra-3', 'pedra', 934, 26, 984, 76], ['pedra-4', 'pedra', 1088, 92, 1154, 142],
  ['cerca-1', 'cerca', 592, 92, 668, 142], ['cerca-2', 'cerca', 676, 92, 750, 142], ['cerca-3', 'cerca', 752, 92, 822, 142],
  ['placa-1', 'placa', 982, 80, 1020, 142], ['placa-2', 'placa', 1036, 80, 1084, 142]
];
const outDir = path.join(root, scale === 1 ? 'escala-jogo' : `escala-${String(scale).replace('.', '')}`);
fs.mkdirSync(outDir, { recursive: true });
const cache = new Map();
const q = (hex) => { if (!cache.has(hex)) cache.set(hex, nearestHex(hex)); return cache.get(hex); };
const manifest = [];
for (const [name, kind, x0, y0, x1, y1] of BOXES) {
  const w = x1 - x0; const h = y1 - y0;
  const target = TARGET[kind] * scale;
  const k = Math.max(w, h) / target;
  const ow = Math.max(1, Math.round(w / k)); const oh = Math.max(1, Math.round(h / k));
  const out = new PNG({ width: ow, height: oh });
  let opaque = 0;
  for (let oy = 0; oy < oh; oy += 1) for (let ox = 0; ox < ow; ox += 1) {
    let r = 0; let g = 0; let b = 0; let n = 0; let solid = 0;
    const sx0 = x0 + ox * k; const sy0 = y0 + oy * k;
    for (let sy = Math.floor(sy0); sy < Math.min(y1, Math.ceil(sy0 + k)); sy += 1) {
      for (let sx = Math.floor(sx0); sx < Math.min(x1, Math.ceil(sx0 + k)); sx += 1) {
        n += 1;
        if (isObj(sx, sy)) { const [pr, pg, pb] = at(sx, sy); r += pr; g += pg; b += pb; solid += 1; }
      }
    }
    const d = (oy * ow + ox) * 4;
    if (n && solid * 2 >= n) {
      const hex = q('#' + [r / solid, g / solid, b / solid].map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''));
      const v = parseInt(hex.slice(1), 16);
      out.data[d] = v >> 16; out.data[d + 1] = (v >> 8) & 255; out.data[d + 2] = v & 255; out.data[d + 3] = 255; opaque += 1;
    } else out.data[d + 3] = 0;
  }
  fs.writeFileSync(path.join(outDir, `${name}.png`), PNG.sync.write(out));
  manifest.push({ name, kind, w: ow, h: oh, opaque });
}
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
const master = new Set(PALETTE.map((h) => h.toLowerCase()));
console.log(manifest.map((m) => `${m.name} ${m.w}x${m.h} op${m.opaque}`).join(' | '));
console.log('fora da paleta:', [...cache.values()].filter((h) => !master.has(h)).length, 'de', cache.size, 'cores');
