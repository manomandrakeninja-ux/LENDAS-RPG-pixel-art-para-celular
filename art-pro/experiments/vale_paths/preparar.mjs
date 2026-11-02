import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

// Prévia (não substitui o atlas): lê a folha dual-grid v01 e gera um PNG por quadro em que só a TERRA é opaca.
// A grama do próprio atlas é descartada, para a grama v05 do jogo continuar aparecendo.
const root = path.resolve('art-pro/experiments/vale_paths');
const src = PNG.sync.read(fs.readFileSync(path.resolve('art-pro/incoming/vale-paths/vale-paths__v01.png')));
const meta = JSON.parse(fs.readFileSync(path.resolve('art-pro/incoming/vale-paths/vale-paths__v01.json'), 'utf8'));
const isDirt = (r, g, b) => r > g + 12 && r > b + 25; // terra tem vermelho dominante; grama tem verde dominante
const manifest = {};
for (const [name, info] of Object.entries(meta.frames)) {
  const f = info.frame;
  const out = new PNG({ width: 48, height: 48 });
  let dirt = 0;
  for (let y = 0; y < 48; y += 1) for (let x = 0; x < 48; x += 1) {
    const s = ((f.y + y) * src.width + f.x + x) * 4; const d = (y * 48 + x) * 4;
    const isT = isDirt(src.data[s], src.data[s + 1], src.data[s + 2]);
    if (isT) dirt += 1;
    out.data[d] = src.data[s]; out.data[d + 1] = src.data[s + 1]; out.data[d + 2] = src.data[s + 2];
    out.data[d + 3] = isT ? 255 : 0;
  }
  fs.writeFileSync(path.join(root, 'tiles', `${name}.png`), PNG.sync.write(out));
  (manifest[info.mask] ??= []).push({ name, dirtPixels: dirt });
}
fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(Object.entries(manifest).map(([m, list]) => `${m}:${list.map((e) => e.dirtPixels).join('/')}`).join(' '));
