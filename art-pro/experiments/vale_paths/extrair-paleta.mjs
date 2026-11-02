import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

// Extrai a paleta de cores dos arquivos existentes (sem tons novos). Só lê; não altera nada.
const hex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
const colorsOf = (file, filter = () => true) => {
  const img = PNG.sync.read(fs.readFileSync(path.resolve(file)));
  const counts = new Map();
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i + 3] !== 255) continue;
    const r = img.data[i]; const g = img.data[i + 1]; const b = img.data[i + 2];
    if (!filter(r, g, b)) continue;
    const h = hex(r, g, b);
    counts.set(h, (counts.get(h) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => ({ cor: c, pixels: n }));
};
const isDirt = (r, g, b) => r > g + 12 && r > b + 25;
const isGreen = (r, g, b) => g > r + 12 && g > b + 12;
// Constantes de pedra e detalhe lidas do código (src/art/terrain.js) — valores exatos do arquivo.
const src = fs.readFileSync(path.resolve('src/art/terrain.js'), 'utf8');
const constant = (name) => { const start = src.indexOf(`const ${name} = [`); if (start < 0) return []; const end = src.indexOf(']', start); return [...src.slice(start, end).matchAll(/#[0-9a-fA-F]{6}/g)].map((x) => x[0].toLowerCase()); };
const paletteSrc = fs.readFileSync(path.resolve('src/art/palette.js'), 'utf8');
const master = [...paletteSrc.matchAll(/#[0-9a-fA-F]{6}/g)].map((x) => x[0].toLowerCase());

const out = {
  note: 'Cores extraídas dos arquivos do projeto. Nenhum tom novo. Para o ChatGPT: use somente estas cores.',
  geradoEm: new Date().toISOString().slice(0, 10),
  grama_v05: {
    origem: 'public/assets/tiles/grass-sheet.png (todos os pixels opacos)',
    cores: colorsOf('public/assets/tiles/grass-sheet.png', (r, g, b) => !isDirt(r, g, b)),
  },
  terra_caminhos_v02: {
    origem: 'public/assets/paths/vale-paths.png (pixels de terra, após a correção de paleta da v02)',
    cores: colorsOf('public/assets/paths/vale-paths.png', isDirt),
    tonsDeTerraDaPaletaMestre: master.filter((c) => ['#391f21', '#5d2c28', '#8a4836', '#ad7954', '#cba36f', '#e69c69', '#f6ca9f'].includes(c)),
  },
  pedras_e_detalhes: {
    origem: 'src/art/terrain.js (constantes STONE, WARM_STONE, SNOW_STONE)',
    STONE: constant('STONE'),
    WARM_STONE: constant('WARM_STONE'),
    SNOW_STONE: constant('SNOW_STONE'),
  },
  paletaMestre: { origem: 'src/art/palette.js (PALETTE)', cores: master },
};
fs.writeFileSync(path.resolve('art-pro/incoming/vale-finish/PALETA-VALE.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify({ grama: out.grama_v05.cores.length, terra: out.terra_caminhos_v02.cores.length, pedras: Object.values(out.pedras_e_detalhes).filter(Array.isArray).map((a) => a.length), mestre: master.length }));
