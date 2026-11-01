import fs from 'node:fs';
import { PNG } from 'pngjs';
import { PALETTE } from '../src/art/palette.js';

const sourceDir = 'C:/Users/Lucas Eduardo/.codex/generated_images/01a1952a-131e-7f10-8ca8-ad311549c526';
const outDir = 'public/assets/characters';
const frameW = 56;
const frameH = 64;
const cols = 12;
const rows = 4;
const jobs = {
  'player': 'exec-33fc6bdb-6ce7-42ff-a08d-4638c7036f56.png',
  'player-female': 'exec-dc7924a8-13a8-4084-8211-66ae7294e540.png',
  'player-swordsman': 'exec-5473694c-638d-4286-9b57-63c85d7d9c57.png',
  'player-warrior': 'exec-ec9da7fd-688e-42c4-82cf-a1e0c2f44ca4.png',
  'player-warrior-blue': 'exec-21155339-9fc4-4de2-b21c-5672bf5cfd64.png',
  'player-warrior-green': 'exec-95fd4aaa-b337-4122-a76d-cf98b997b4b6.png',
  'player-warrior-black': 'exec-3ab290f9-eaac-40cf-a44d-97875ea65397.png'
};

const nearest = (r, g, b) => {
  let best = PALETTE[0]; let score = Infinity;
  for (const hex of PALETTE) {
    const q = Number.parseInt(hex.slice(1), 16);
    const dr = r - (q >> 16); const dg = g - ((q >> 8) & 255); const db = b - (q & 255);
    const value = dr * dr + dg * dg + db * db;
    if (value < score) { score = value; best = hex; }
  }
  const q = Number.parseInt(best.slice(1), 16);
  return [q >> 16, (q >> 8) & 255, q & 255];
};

for (const [key, file] of Object.entries(jobs)) {
  const source = PNG.sync.read(fs.readFileSync(`${sourceDir}/${file}`));
  const cellW = source.width / cols;
  const cellH = source.height / rows;
  const out = new PNG({ width: frameW * cols, height: frameH * rows, colorType: 6 });
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      let minX = cellW; let minY = cellH; let maxX = -1; let maxY = -1;
      for (let y = 0; y < cellH; y += 1) for (let x = 0; x < cellW; x += 1) {
        if (source.data[((row * cellH + y) * source.width + col * cellW + x) * 4 + 3] > 20) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
      }
      if (maxX < 0) continue;
      const sw = maxX - minX + 1; const sh = maxY - minY + 1;
      const scale = Math.min(52 / sw, 60 / sh);
      const dw = Math.max(1, Math.round(sw * scale)); const dh = Math.max(1, Math.round(sh * scale));
      const dx = col * frameW + Math.round((frameW - dw) / 2);
      const dy = row * frameH + frameH - dh - 1;
      for (let y = 0; y < dh; y += 1) for (let x = 0; x < dw; x += 1) {
        const sx = Math.min(sw - 1, Math.floor(x * sw / dw));
        const sy = Math.min(sh - 1, Math.floor(y * sh / dh));
        const from = ((row * cellH + minY + sy) * source.width + col * cellW + minX + sx) * 4;
        const at = ((dy + y) * out.width + dx + x) * 4;
        out.data[at] = source.data[from]; out.data[at + 1] = source.data[from + 1]; out.data[at + 2] = source.data[from + 2]; out.data[at + 3] = source.data[from + 3];
      }
    }
  }
  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i + 3] > 0) {
      const [r, g, b] = nearest(out.data[i], out.data[i + 1], out.data[i + 2]);
      out.data[i] = r; out.data[i + 1] = g; out.data[i + 2] = b;
      out.data[i + 3] = out.data[i + 3] < 128 ? 0 : 255;
    }
  }
  fs.writeFileSync(`${outDir}/${key}-sheet.png`, PNG.sync.write(out));
  console.log(`${key}: ${out.width}x${out.height}`);
}
