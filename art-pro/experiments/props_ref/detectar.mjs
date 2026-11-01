import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

// Detecta objetos de uma faixa da prancha (recorte já salvo): máscara por brilho/saturação, dilatação de 3 px
// para juntar partes do mesmo objeto, caixas por componente. Só lista; o recorte final é feito em recortar.mjs.
const file = process.argv[2];
const TITLE = Number(process.argv[3] ?? 0);
const root = path.resolve('art-pro/experiments/props_ref');
const img = PNG.sync.read(fs.readFileSync(path.join(root, file)));
const W = img.width; const H = img.height; const M = 6;
const at = (x, y) => { const i = (y * W + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2]]; };
const on = (x, y) => {
  if (y < TITLE || x < M || x > W - M - 1 || y > H - M - 1) return false;
  const [r, g, b] = at(x, y);
  return (r + g + b) / 3 > 48 || Math.max(r, g, b) - Math.min(r, g, b) > 40;
};
const mask = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => on(x, y)));
const R = 3;
const dil = mask.map((row, y) => row.map((_, x) => { for (let dy = -R; dy <= R; dy += 1) for (let dx = -R; dx <= R; dx += 1) { const yy = y + dy; const xx = x + dx; if (yy >= 0 && xx >= 0 && yy < H && xx < W && mask[yy][xx]) return true; } return false; }));
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
  if (area > 120) boxes.push({ id, minX, maxX, minY, maxY, area });
}
boxes.sort((a, b) => a.minX - b.minX);
console.log(JSON.stringify({ W, H, objetos: boxes.length }));
for (const b of boxes) console.log(`id=${b.id} x=${b.minX}..${b.maxX} y=${b.minY}..${b.maxY} ${b.maxX - b.minX + 1}x${b.maxY - b.minY + 1} area=${b.area}`);
