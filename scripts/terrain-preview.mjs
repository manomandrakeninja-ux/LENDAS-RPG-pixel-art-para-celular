import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { T, buildTerrainGrid } from '../src/data/worldRegions.js';
import { layoutTiles, underName } from '../src/data/terrainLayout.js';

// Prévia do chão sem navegador: monta ground + overlay a partir da folha de ladrilhos e do layout real do mapa.
// Uso: node scripts/terrain-preview.mjs [sheet.png] [sheet.json] [pastaSaida]
const root = path.resolve('public/assets/tiles');
const sheetPath = process.argv[2] ?? path.join(root, 'terrain-sheet.png');
const indexPath = process.argv[3] ?? path.join(root, 'terrain-sheet.json');
const outDir = path.resolve(process.argv[4] ?? '.tmp/capturas/terreno');
fs.mkdirSync(outDir, { recursive: true });
const TILE = 48;
const sheet = PNG.sync.read(fs.readFileSync(sheetPath));
const { columns, index } = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const grass = PNG.sync.read(fs.readFileSync(path.join(root, 'grass-sheet.png')));
const grid = buildTerrainGrid();
const layout = layoutTiles(grid, { x: 1440, y: 1080 });
const { cols, rows, terrain } = grid;

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
const tile = (out, name, col, row, dx, dy) => {
  const p = index[name];
  if (p !== undefined) blit(out, sheet, (p % columns) * TILE, Math.floor(p / columns) * TILE, dx, dy);
};

// Cenários: cada um pede dois terrenos na mesma janela para mostrar a transição entre eles.
const SCENES = {
  vale: [T.VALLEY, T.ROAD], floresta: [T.FOREST, T.VALLEY], praia: [T.BEACH, T.SEA], brejo: [T.SWAMP, T.MURK],
  deserto: [T.SAND, T.DUNE], gelo: [T.SNOW, T.ICE], vulcanico: [T.ASH, T.LAVA], caverna: [T.CAVE, T.WALL]
};
const W = 27;
const H = 15;
function findWindow([a, b]) {
  let best = null;
  for (let row = 0; row + H <= rows; row += 3) {
    for (let col = 0; col + W <= cols; col += 3) {
      let ca = 0;
      let cb = 0;
      for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) { const t = terrain[(row + y) * cols + col + x]; if (t === a) ca += 1; else if (t === b) cb += 1; }
      const score = Math.min(ca, cb);
      if (!best || score > best.score) best = { score, col, row };
    }
  }
  return best;
}
for (const [name, kinds] of Object.entries(SCENES)) {
  const win = name === 'vale' ? { col: 18, row: 15 } : findWindow(kinds);
  const out = new PNG({ width: W * TILE, height: H * TILE });
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const col = win.col + x;
      const row = win.row + y;
      const cell = row * cols + col;
      const dx = x * TILE;
      const dy = y * TILE;
      const uk = layout.under[cell];
      if (uk >= 0) tile(out, underName(uk, 0, (col % 3) + (row % 3) * 3), col, row, dx, dy);
      const g = layout.ground[cell];
      if (typeof g === 'number') blit(out, grass, (g % 8) * TILE, Math.floor(g / 8) * TILE, dx, dy);
      else if (g) tile(out, g, col, row, dx, dy);
      for (const layer of [layout.overlay2, layout.overlay]) if (layer?.[cell]) tile(out, layer[cell], col, row, dx, dy);
    }
  }
  fs.writeFileSync(path.join(outDir, `${name}.png`), PNG.sync.write(out));
  console.log(name, JSON.stringify(win));
}
