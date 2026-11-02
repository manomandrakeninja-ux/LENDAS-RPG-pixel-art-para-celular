import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

// v02 derivada da v01 (não substitui a incoming). Dois ajustes locais, pixel a pixel, sem blur:
// 1) fronteira terra/grama: desloca a fronteira de forma suave, zerando o deslocamento nas bordas do
//    quadro (assim as emendas com os vizinhos continuam iguais);
// 2) contorno escuro: pixel de terra escura (#391f21, #5d2c28) encostado na grama vira terra média (#8a4836).
const src = PNG.sync.read(fs.readFileSync(path.resolve('art-pro/incoming/vale-paths/vale-paths__v01.png')));
const meta = JSON.parse(fs.readFileSync(path.resolve('art-pro/incoming/vale-paths/vale-paths__v01.json'), 'utf8'));
const out = new PNG({ width: src.width, height: src.height });
out.data.set(src.data);
const DARK = new Set(['391f21', '5d2c28']);
const hexAt = (img, x, y) => { const i = (y * img.width + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]]; };
const isDirt = (p) => p[0] > p[1] + 12 && p[0] > p[2] + 25;
// Faixa de 6 px em cada borda do quadro onde o deslocamento é zero (suave): assim a costura com o vizinho não muda.
const edgeFade = (t) => { const d = Math.min(t, 47 - t) / 6; return d >= 1 ? 1 : d * d * (3 - 2 * d); };
const DX = 3.2; // deslocamento máximo, em pixels
const frames = Object.values(meta.frames);
for (const info of frames) {
  const f = info.frame; const seed = info.index * 0.71;
  // Cópia do quadro para amostragem.
  const tile = new PNG({ width: 48, height: 48 });
  for (let y = 0; y < 48; y += 1) for (let x = 0; x < 48; x += 1) {
    const s = ((f.y + y) * src.width + f.x + x) * 4; const d = (y * 48 + x) * 4;
    for (let c = 0; c < 4; c += 1) tile.data[d + c] = src.data[s + c];
  }
  const sample = (x, y) => { const cx = Math.min(47, Math.max(0, x)); const cy = Math.min(47, Math.max(0, y)); return hexAt(tile, cx, cy); };
  const warped = new PNG({ width: 48, height: 48 });
  for (let y = 0; y < 48; y += 1) for (let x = 0; x < 48; x += 1) {
    // Deslocamento horizontal depende da linha (fronteira vertical) e some nas bordas do quadro.
    // Periódico com o próprio quadro (sem zerar nas bordas): o deslocamento de linha y=47 casa com y=0 do vizinho.
    const dx = DX * (Math.sin((2 * Math.PI * y) / 48 + 0.6) + 0.5 * Math.sin((4 * Math.PI * y) / 48 + 1.9)) / 1.5 * edgeFade(x) * edgeFade(y);
    // Deslocamento vertical depende da coluna (fronteira horizontal).
    const dy = DX * (Math.sin((2 * Math.PI * x) / 48 + 1.1) + 0.5 * Math.sin((4 * Math.PI * x) / 48 + 0.4)) / 1.5 * edgeFade(x) * edgeFade(y);
    const p = sample(Math.round(x - dx), Math.round(y - dy));
    const d = (y * 48 + x) * 4;
    warped.data[d] = p[0]; warped.data[d + 1] = p[1]; warped.data[d + 2] = p[2]; warped.data[d + 3] = p[3];
  }
  // Contorno escuro: pixel escuro de terra com grama em volta vira terra média.
  const isGrass = (x, y) => { if (x < 0 || y < 0 || x > 47 || y > 47) return false; const p = hexAt(warped, x, y); return !isDirt(p); };
  for (let y = 0; y < 48; y += 1) for (let x = 0; x < 48; x += 1) {
    const p = hexAt(warped, x, y);
    const hex = ((p[0] << 16) | (p[1] << 8) | p[2]).toString(16).padStart(6, '0');
    if (isDirt(p) && DARK.has(hex) && (isGrass(x - 1, y) || isGrass(x + 1, y) || isGrass(x, y - 1) || isGrass(x, y + 1))) {
      const d = (y * 48 + x) * 4; warped.data[d] = 0x8a; warped.data[d + 1] = 0x48; warped.data[d + 2] = 0x36;
    }
  }
  for (let y = 0; y < 48; y += 1) for (let x = 0; x < 48; x += 1) {
    const s = (y * 48 + x) * 4; const d = ((f.y + y) * out.width + f.x + x) * 4;
    for (let c = 0; c < 4; c += 1) out.data[d + c] = warped.data[s + c];
  }
}
// Paleta de terra: pixel de terra fora dos 7 tons do projeto vai para o tom mais próximo (ajuste local).
const DIRT_PALETTE = [[0x39, 0x1f, 0x21], [0x5d, 0x2c, 0x28], [0x8a, 0x48, 0x36], [0xad, 0x79, 0x54], [0xcb, 0xa3, 0x6f], [0xe6, 0x9c, 0x69], [0xf6, 0xca, 0x9f]];
for (let i = 0; i < out.data.length; i += 4) {
  const r = out.data[i]; const g = out.data[i + 1]; const bl = out.data[i + 2];
  if (!(r > g + 12 && r > bl + 25)) continue;
  let best = DIRT_PALETTE[0]; let bd = Infinity;
  for (const c of DIRT_PALETTE) { const d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - bl) ** 2; if (d < bd) { bd = d; best = c; } }
  out.data[i] = best[0]; out.data[i + 1] = best[1]; out.data[i + 2] = best[2];
}
fs.writeFileSync(path.resolve('art-pro/experiments/vale_paths/v02/vale-paths__v02.png'), PNG.sync.write(out));
fs.writeFileSync(path.resolve('art-pro/experiments/vale_paths/v02/vale-paths__v02.json'), JSON.stringify({ ...meta, version: 'v02-derivada-da-v01' }, null, 2));
// Tiles de terra (alpha = terra) para a prévia, mesmo formato do v01.
const tilesDir = path.resolve('art-pro/experiments/vale_paths/v02/tiles');
const manifest = {};
for (const [name, info] of Object.entries(meta.frames)) {
  const f = info.frame; const o = new PNG({ width: 48, height: 48 });
  let dirt = 0;
  for (let y = 0; y < 48; y += 1) for (let x = 0; x < 48; x += 1) {
    const s = ((f.y + y) * out.width + f.x + x) * 4; const d = (y * 48 + x) * 4;
    const p = [out.data[s], out.data[s + 1], out.data[s + 2]];
    const isT = isDirt([...p, 255]);
    if (isT) dirt += 1;
    o.data[d] = p[0]; o.data[d + 1] = p[1]; o.data[d + 2] = p[2]; o.data[d + 3] = isT ? 255 : 0;
  }
  fs.writeFileSync(path.join(tilesDir, `${name}.png`), PNG.sync.write(o));
  (manifest[info.mask] ??= []).push({ name, dirtPixels: dirt });
}
fs.writeFileSync(path.resolve('art-pro/experiments/vale_paths/v02/manifest.json'), JSON.stringify(manifest, null, 2));
console.log('v02 gerada:', frames.length, 'quadros');
