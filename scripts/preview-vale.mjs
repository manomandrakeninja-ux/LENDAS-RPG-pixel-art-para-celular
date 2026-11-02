import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { buildTerrainGrid, T } from '../src/data/worldRegions.js';
import { layoutTiles, underName } from '../src/data/terrainLayout.js';

// Prévia offline do Vale de Eldoria em volta do acampamento, com o layout real do jogo.
// Só a grama e a trilha vêm da folha candidata; franjas, decoração e terrenos vêm da folha atual.
// Não altera public/ nem o jogo. Uso: node scripts/preview-vale.mjs <folha-candidata.png> <saida-pasta>
const candidate = process.argv[2];
const outDir = path.resolve(process.argv[3] ?? '.tmp/capturas/previa-vale');
if (!candidate) {
  console.error('Uso: node scripts/preview-vale.mjs <folha-candidata.png> [pasta-saida]');
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });
const TILE = 48;
const tilesRoot = path.resolve('public/assets/tiles');
const terrainSheet = PNG.sync.read(fs.readFileSync(path.join(tilesRoot, 'terrain-sheet.png')));
const { columns, index } = JSON.parse(fs.readFileSync(path.join(tilesRoot, 'terrain-sheet.json'), 'utf8'));
const currentGrass = PNG.sync.read(fs.readFileSync(path.join(tilesRoot, 'grass-sheet.png')));
const candidateGrass = PNG.sync.read(fs.readFileSync(path.resolve(candidate)));
if (candidateGrass.width !== 384 || candidateGrass.height !== 384) throw new Error('A folha candidata precisa ser 384x384.');

const grid = buildTerrainGrid();
const camp = { x: 1440, y: 1080 };
const layout = layoutTiles(grid, camp);
const { cols, terrain } = grid;

// Janela de 40 x 24 tiles centrada no acampamento.
const CENTER_COL = Math.floor(camp.x / TILE);
const CENTER_ROW = Math.floor(camp.y / TILE);
const W = 40;
const H = 24;
const left = CENTER_COL - 20;
const top = CENTER_ROW - 12;

function blit(out, src, sx, sy, dx, dy) {
  for (let y = 0; y < TILE; y += 1) {
    for (let x = 0; x < TILE; x += 1) {
      const s = ((sy + y) * src.width + sx + x) * 4;
      const a = src.data[s + 3];
      if (!a) continue;
      const d = ((dy + y) * out.width + dx + x) * 4;
      const k = a / 255;
      for (let c = 0; c < 3; c += 1) out.data[d + c] = Math.round(src.data[s + c] * k + out.data[d + c] * (1 - k));
      out.data[d + 3] = 255;
    }
  }
}
function tile(out, name, dx, dy) {
  const p = index[name];
  if (p !== undefined) blit(out, terrainSheet, (p % columns) * TILE, Math.floor(p / columns) * TILE, dx, dy);
}

function render(grassSheet) {
  const out = new PNG({ width: W * TILE, height: H * TILE });
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const col = left + x;
      const row = top + y;
      if (col < 0 || row < 0 || col >= cols || row >= grid.rows) continue;
      const cell = row * cols + col;
      const dx = x * TILE;
      const dy = y * TILE;
      const uk = layout.under[cell];
      if (uk >= 0) tile(out, underName(uk, 0, (col % 3) + (row % 3) * 3), dx, dy);
      const g = layout.ground[cell];
      if (typeof g === 'number') blit(out, grassSheet, (g % 8) * TILE, Math.floor(g / 8) * TILE, dx, dy);
      else if (g) tile(out, g, dx, dy);
      for (const layer of [layout.overlay2, layout.overlay]) if (layer?.[cell]) tile(out, layer[cell], dx, dy);
    }
  }
  return out;
}

const before = render(currentGrass);
const after = render(candidateGrass);
fs.writeFileSync(path.join(outDir, 'vale-atual.png'), PNG.sync.write(before));
fs.writeFileSync(path.join(outDir, 'vale-candidata.png'), PNG.sync.write(after));

// Lado a lado (atual | candidata), reduzido a 50% para caber na tela.
const gap = 12;
const half = { w: W * TILE, h: H * TILE };
const side = new PNG({ width: half.w * 2 + gap, height: half.h, });
side.data.fill(0);
for (let i = 0; i < side.data.length; i += 4) { side.data[i] = 20; side.data[i + 1] = 20; side.data[i + 2] = 20; side.data[i + 3] = 255; }
const copy = (src, ox) => {
  for (let y = 0; y < half.h; y += 1) {
    for (let x = 0; x < half.w; x += 1) {
      const s = (y * half.w + x) * 4;
      const d = (y * side.width + ox + x) * 4;
      for (let c = 0; c < 4; c += 1) side.data[d + c] = src.data[s + c];
    }
  }
};
copy(before, 0);
copy(after, half.w + gap);
fs.writeFileSync(path.join(outDir, 'comparacao-lado-a-lado.png'), PNG.sync.write(side));
console.log(`Prévia gerada em ${outDir}`);
console.log(`Janela: colunas ${left}..${left + W - 1}, linhas ${top}..${top + H - 1} (acampamento em ${camp.x},${camp.y}).`);
