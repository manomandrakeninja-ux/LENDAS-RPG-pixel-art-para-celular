// Prancha antes/depois da vegetação: node scripts/nature-paint/compare.mjs [saida.png] [--scale 2] [--only a,b] [--after-only]
// "antes" = cópias de .tmp/capturas/terreno/_antes-*.png/json; "depois" = atlas atuais em public/assets/nature.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { PixelCanvas } from '../../src/art/pixel.js';
import { writePng } from '../png.js';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const out = path.resolve(args.find((a) => a.endsWith('.png')) ?? '.tmp/capturas/terreno/vegetacao-comparacao.png');
const scale = Number(opt('scale', 2));
const only = opt('only', null)?.split(',');
const afterOnly = args.includes('--after-only');
const dir = path.resolve('.tmp/capturas/terreno');
const pub = path.resolve('public/assets/nature');
const load = (png, json) => ({ img: PNG.sync.read(fs.readFileSync(png)), frames: JSON.parse(fs.readFileSync(json, 'utf8')).frames });
const before = { nature: load(`${dir}/_antes-nature.png`, `${dir}/_antes-nature.json`), biome: load(`${dir}/_antes-biome.png`, `${dir}/_antes-biome.json`) };
const after = { nature: load(`${pub}/nature-atlas.png`, `${pub}/nature-atlas.json`), biome: load(`${pub}/biome-atlas.png`, `${pub}/biome-atlas.json`) };
const NATURE = ['pine-0', 'pine-1', 'pine-2', 'oak-tree', 'autumn-tree', 'fruit-tree', 'bush', 'resource-stone', 'resource-herbs', 'detail-mushroom'];
const BIOME = 'ancient-oak-0 ancient-oak-1 mossy-pine-0 mossy-pine-1 giant-mushroom fern fallen-log bog-log mossy-rock willow dead-tree charred-tree reeds swamp-shroom snow-pine-0 snow-pine-1 snow-rock frozen-bush palm-0 palm-1 desert-rock dry-bush tropical-bush big-flower sea-rock obsidian ash-bush cactus cactus-small'.split(' ');
const items = [...NATURE.map((n) => ['nature', n]), ...BIOME.map((n) => ['biome', n])].filter(([, n]) => !only || only.includes(n));
const maxW = 1700; const gap = 8;
const cell = (set, kind, name) => { const f = set[kind].frames[name]?.frame; return f ? { set: set[kind], f } : null; };
const blocks = items.map(([kind, name]) => {
  const a = cell(after, kind, name); const b = afterOnly ? null : cell(before, kind, name);
  const w = ((b?.f.w ?? 0) + (a?.f.w ?? 0)) * scale + gap; const h = Math.max(b?.f.h ?? 0, a?.f.h ?? 0) * scale;
  return { a, b, w, h };
});
let x = gap; let y = gap; let rowH = 0; const spots = [];
for (const bl of blocks) { if (x + bl.w > maxW) { x = gap; y += rowH + gap; rowH = 0; } spots.push([bl, x, y]); x += bl.w + gap; rowH = Math.max(rowH, bl.h); }
const c = new PixelCanvas(maxW, y + rowH + gap);
for (let py = 0; py < c.height; py += 1) for (let px = 0; px < c.width; px += 1) {
  const n = ((px >> 3) * 7 + (py >> 3) * 13) % 9;
  c.pixel(px, py, n === 0 ? '#1e6f50' : n === 1 ? '#5ac54f' : '#33984b');
}
const hex = (r, g, b) => `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
const draw = (cl, ox, oy, hgt) => {
  if (!cl) return 0;
  const { set, f } = cl;
  for (let sy = 0; sy < f.h; sy += 1) for (let sx = 0; sx < f.w; sx += 1) {
    const i = ((f.y + sy) * set.img.width + f.x + sx) * 4; const d = set.img.data;
    if (d[i + 3] === 0) continue;
    for (let k = 0; k < scale * scale; k += 1) c.pixel(ox + sx * scale + (k % scale), oy + hgt - f.h * scale + sy * scale + Math.floor(k / scale), hex(d[i], d[i + 1], d[i + 2]), d[i + 3]);
  }
  return f.w * scale;
};
for (const [bl, ox, oy] of spots) { const w = draw(bl.b, ox, oy, bl.h); draw(bl.a, ox + w + (w ? 4 : 0), oy, bl.h); }
writePng(out, c, { quantize: false });
console.log('prancha', out, c.width, c.height);
