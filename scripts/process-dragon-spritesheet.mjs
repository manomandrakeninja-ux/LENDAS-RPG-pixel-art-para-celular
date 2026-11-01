import fs from 'node:fs';
import { PNG } from 'pngjs';
import { PALETTE } from '../src/art/palette.js';

const source = PNG.sync.read(fs.readFileSync('C:/Users/Lucas Eduardo/.codex/generated_images/01a1952a-131e-7f10-8ca8-ad311549c526/exec-f66baaa0-acc0-45b7-9033-620b844dfea4.png'));
const frames = 16;
const frameW = 192;
const frameH = 96;
const out = new PNG({ width: frameW * frames, height: frameH, colorType: 6 });
const cellW = source.width / frames;

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

for (let frame = 0; frame < frames; frame += 1) {
  let minX = cellW; let minY = source.height; let maxX = -1; let maxY = -1;
  for (let y = 0; y < source.height; y += 1) for (let x = 0; x < cellW; x += 1) {
    const at = (y * source.width + Math.floor(frame * cellW + x)) * 4;
    if (source.data[at + 3] > 20) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  }
  const sw = maxX - minX + 1; const sh = maxY - minY + 1;
  const scale = Math.min(180 / sw, 86 / sh);
  const dw = Math.max(1, Math.round(sw * scale)); const dh = Math.max(1, Math.round(sh * scale));
  const dx = frame * frameW + Math.round((frameW - dw) / 2);
  const dy = Math.round((frameH - dh) / 2);
  for (let y = 0; y < dh; y += 1) for (let x = 0; x < dw; x += 1) {
    const sx = Math.min(sw - 1, Math.floor(x * sw / dw)); const sy = Math.min(sh - 1, Math.floor(y * sh / dh));
    const from = ((minY + sy) * source.width + Math.floor(frame * cellW + minX + sx)) * 4;
    const at = ((dy + y) * out.width + dx + x) * 4;
    const [r, g, b] = nearest(source.data[from], source.data[from + 1], source.data[from + 2]);
    out.data[at] = r; out.data[at + 1] = g; out.data[at + 2] = b; out.data[at + 3] = source.data[from + 3] < 128 ? 0 : 255;
  }
}

fs.writeFileSync('public/assets/vfx/env-dragon.png', PNG.sync.write(out));
console.log(`env-dragon: ${out.width}x${out.height}, ${frames} frames`);
