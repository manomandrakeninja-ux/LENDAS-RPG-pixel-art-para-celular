import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { PALETTE, nearestHex } from '../../../src/art/palette.js';

// Experimento: construções do painel inferior da prancha, sem fundo, tamanho nativo (1:1), quantizadas.
// Só referência de estilo: não são posicionadas no jogo (são prédios, não decoração).
const root = path.resolve('art-pro/experiments/props_ref');
const src = PNG.sync.read(fs.readFileSync(path.join(root, 'recorte-construcoes.png')));
const W = src.width; const H = src.height;
const at = (x, y) => { const i = (y * W + x) * 4; return [src.data[i], src.data[i + 1], src.data[i + 2]]; };
const isObj = (x, y) => { const [r, g, b] = at(x, y); return (r + g + b) / 3 > 48 || Math.max(r, g, b) - Math.min(r, g, b) > 40; };
const BOXES = [
  ['casa-azul', 4, 17, 184, 160], ['casa-vermelha', 186, 17, 334, 160], ['celeiro', 336, 22, 482, 160],
  ['ferreiro', 490, 17, 680, 160], ['banca', 686, 50, 826, 160], ['castelo', 828, 20, 1062, 160], ['poco', 1066, 46, 1160, 160]
];
const outDir = path.join(root, 'construcoes-nativo');
fs.mkdirSync(outDir, { recursive: true });
const cache = new Map();
const q = (hex) => { if (!cache.has(hex)) cache.set(hex, nearestHex(hex)); return cache.get(hex); };
const manifest = [];
for (const [name, x0, y0, x1, y1] of BOXES) {
  const w = x1 - x0; const h = y1 - y0;
  const out = new PNG({ width: w, height: h });
  let opaque = 0;
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const sx = x0 + x; const sy = y0 + y; const d = (y * w + x) * 4;
    if (isObj(sx, sy)) {
      const hex = q('#' + at(sx, sy).map((v) => v.toString(16).padStart(2, '0')).join(''));
      const v = parseInt(hex.slice(1), 16);
      out.data[d] = v >> 16; out.data[d + 1] = (v >> 8) & 255; out.data[d + 2] = v & 255; out.data[d + 3] = 255; opaque += 1;
    } else out.data[d + 3] = 0;
  }
  fs.writeFileSync(path.join(outDir, `${name}.png`), PNG.sync.write(out));
  manifest.push({ name, w, h, opaque });
}
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
const master = new Set(PALETTE.map((h) => h.toLowerCase()));
console.log(manifest.map((m) => `${m.name} ${m.w}x${m.h}`).join(' | '));
console.log('fora da paleta:', [...cache.values()].filter((h) => !master.has(h)).length);
