import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { PALETTE, nearestHex } from '../../../src/art/palette.js';

// Experimento (não entra no jogo): recorta cada objeto do painel "Detalhes de Chão (decor)" da prancha,
// remove o fundo, reduz para no máximo 32 px (BOX), quantiza na paleta-mestre e salva um arquivo por objeto.
const root = path.resolve('art-pro/experiments/decor_ref');
const src = PNG.sync.read(fs.readFileSync(path.resolve('art/source/3.png')));
const X0 = 672; const Y0 = 428; const W = 252; const H = 210;
const TITLE_BAND = 28; // título "Detalhes de Chão (decor)" fica acima
const MAX = Number(process.argv[2] ?? 32);
const OBJ_DIR = MAX === 32 ? path.join(root, 'objetos') : path.join(root, `${MAX}px`);
fs.mkdirSync(OBJ_DIR, { recursive: true });
const MANIFEST = MAX === 32 ? path.join(root, 'manifest.json') : path.join(OBJ_DIR, 'manifest.json');
const at = (x, y) => { const i = ((Y0 + y) * src.width + X0 + x) * 4; return [src.data[i], src.data[i + 1], src.data[i + 2]]; };
const isObj = (x, y) => {
  if (y < TITLE_BAND || x < 8 || x > W - 9 || y > H - 9) return false; // título e moldura do painel ficam fora
  const [r, g, b] = at(x, y);
  const lum = (r + g + b) / 3;
  return lum > 62 || Math.max(r, g, b) - Math.min(r, g, b) > 45;
};
// Máscara + dilatação de 2 px para juntar as partes de um mesmo objeto.
const mask = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => isObj(x, y)));
const dil = mask.map((row, y) => row.map((_, x) => { for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) { const yy = y + dy; const xx = x + dx; if (yy >= 0 && xx >= 0 && yy < H && xx < W && mask[yy][xx]) return true; } return false; }));
const label = Array.from({ length: H }, () => new Array(W).fill(-1));
const boxes = [];
for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
  if (!dil[y][x] || label[y][x] >= 0) continue;
  const id = boxes.length; const stack = [[x, y]]; label[y][x] = id;
  let minX = x; let maxX = x; let minY = y; let maxY = y; let area = 0;
  while (stack.length) {
    const [cx, cy] = stack.pop(); area += 1;
    minX = Math.min(minX, cx); maxX = Math.max(maxX, cx); minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
    for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || !dil[ny][nx] || label[ny][nx] >= 0) continue;
      label[ny][nx] = id; stack.push([nx, ny]);
    }
  }
  boxes.push({ id, minX, maxX, minY, maxY, area });
}
const objects = boxes.filter((b) => b.area > 150).sort((a, b) => (Math.round(a.minY / 40) - Math.round(b.minY / 40)) || a.minX - b.minX);
console.log('objetos detectados:', objects.length, objects.map((o) => `${o.minX},${o.minY} ${o.maxX - o.minX + 1}x${o.maxY - o.minY + 1}`).join(' | '));

const names = ['pedra', 'flor-amarela-1', 'flor-roxa-rosa', 'flor-amarela-rosa', 'flor-amarela-pequena', 'cogumelos-1', 'arbusto-amarelo', 'cogumelos-2', 'toco', 'arbusto-verde-1', 'arbusto-verde-2', 'arbusto-verde-3'];
const pal = new Map();
const quant = (hex) => { if (!pal.has(hex)) pal.set(hex, nearestHex(hex)); return pal.get(hex); };
const manifest = [];
const sprites = [];
objects.forEach((o, index) => {
  const w = o.maxX - o.minX + 1; const h = o.maxY - o.minY + 1;
  const scale = Math.max(w, h) / MAX;
  const ow = Math.max(1, Math.round(w / scale)); const oh = Math.max(1, Math.round(h / scale));
  const out = new PNG({ width: ow, height: oh });
  for (let oy = 0; oy < oh; oy += 1) for (let ox = 0; ox < ow; ox += 1) {
    // BOX: média dos pixels de origem que caem nesta célula, só entre os que são objeto (fundo fica transparente).
    let r = 0; let g = 0; let b = 0; let n = 0; let solid = 0;
    const sx0 = o.minX + ox * scale; const sy0 = o.minY + oy * scale;
    for (let sy = Math.floor(sy0); sy < Math.min(o.maxY + 1, Math.ceil(sy0 + scale)); sy += 1) {
      for (let sx = Math.floor(sx0); sx < Math.min(o.maxX + 1, Math.ceil(sx0 + scale)); sx += 1) {
        n += 1;
        if (mask[sy][sx] && label[sy][sx] === o.id) { const [pr, pg, pb] = at(sx, sy); r += pr; g += pg; b += pb; solid += 1; }
      }
    }
    const d = (oy * ow + ox) * 4;
    if (solid * 2 >= n && solid > 0) {
      const hex = '#' + [Math.round(r / solid), Math.round(g / solid), Math.round(b / solid)].map((v) => v.toString(16).padStart(2, '0')).join('');
      const q = quant(hex).slice(1);
      out.data[d] = parseInt(q.slice(0, 2), 16); out.data[d + 1] = parseInt(q.slice(2, 4), 16); out.data[d + 2] = parseInt(q.slice(4, 6), 16); out.data[d + 3] = 255;
    } else { out.data[d + 3] = 0; }
  }
  const name = `decor-ref-${String(index + 1).padStart(2, '0')}`;
  fs.writeFileSync(path.join(OBJ_DIR, `${name}.png`), PNG.sync.write(out));
  manifest.push({ file: `${name}.png`, label: names[index] ?? name, w: ow, h: oh, origem: [X0 + o.minX, Y0 + o.minY, w, h] });
  sprites.push({ name, png: out });
});
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
console.log('salvos:', sprites.length, 'tamanhos:', manifest.map((m) => `${m.w}x${m.h}`).join(' '));
const master = new Set(PALETTE.map((h) => h.toLowerCase()));
const off = [...pal.values()].filter((h) => !master.has(h)).length;
console.log('cores quantizadas:', pal.size, 'fora da paleta-mestre:', off);
