import fs from 'node:fs';
import path from 'node:path';
import { PixelCanvas } from '../src/art/pixel.js';
import { DECOR_KINDS, TILE_PX, UNDER_FRAME_COUNT, UNDER_KINDS, drawBaseTile, drawDecorTile, drawEdgeTile, drawFringeTile, drawUnderTile, drawWallTile } from '../src/art/terrain.js';
import { BIOME_PROP_ENTRIES } from '../src/art/biomeProps.js';
import { T, buildTerrainGrid } from '../src/data/worldRegions.js';
import { BASE_VARIANTS, DECOR_VARIANTS, baseName, decorName, layoutTiles, underName } from '../src/data/terrainLayout.js';
import { writePng } from './png.js';

// Gera o chão das regiões novas (folha de ladrilhos) e o atlas de objetos dos biomas.
// Só desenha as bordas que o mapa realmente usa.

const root = path.resolve('public/assets');
const SHEET_COLUMNS = 16;

export function generateWorldAssets() {
  const tiles = new Map();
  const add = (name, draw) => {
    if (!tiles.has(name)) tiles.set(name, draw);
  };
  for (const kind of [T.FOREST, T.SWAMP, T.SNOW, T.SAND, T.DUNE, T.BEACH, T.JUNGLE, T.ASH, T.CAVE]) {
    for (let variant = 0; variant < BASE_VARIANTS; variant += 1) add(baseName(kind, variant), () => drawBaseTile(kind, variant));
  }
  for (const kind of UNDER_KINDS) for (let frame = 0; frame < UNDER_FRAME_COUNT; frame += 1) add(underName(kind, frame), () => drawUnderTile(kind, frame));

  // Bordas: só as combinações (terreno, vizinho, lados) que existem no mapa.
  const grid = buildTerrainGrid();
  const { ground, overlay } = layoutTiles(grid, { x: 1440, y: 1080 });
  for (const name of ground) {
    if (typeof name === 'string' && name.startsWith('wall')) {
      const [kind, variant, rim] = name.split('-');
      add(name, () => drawWallTile(kind === 'wallface', Number(variant), Number(rim)));
      continue;
    }
    if (typeof name !== 'string' || !name.startsWith('edge-')) continue;
    const [, land, under, mask] = name.split('-').map(Number);
    add(name, () => drawEdgeTile(land, under, mask, 0));
  }

  // Camada de cima: decoração solta de cada terreno e as franjas que o mapa usa.
  for (const kind of DECOR_KINDS) for (let n = 0; n < DECOR_VARIANTS; n += 1) add(decorName(kind, n), () => drawDecorTile(kind, n));
  for (const name of new Set(overlay)) {
    if (typeof name !== 'string' || !name.startsWith('fringe-')) continue;
    const [, kind, mask] = name.split('-').map(Number);
    add(name, () => drawFringeTile(kind, mask));
  }

  const names = [...tiles.keys()];
  const rows = Math.ceil(names.length / SHEET_COLUMNS);
  const sheet = new PixelCanvas(SHEET_COLUMNS * TILE_PX, rows * TILE_PX);
  const index = {};
  names.forEach((name, position) => {
    const tile = tiles.get(name)();
    sheet.blit(tile, (position % SHEET_COLUMNS) * TILE_PX, Math.floor(position / SHEET_COLUMNS) * TILE_PX);
    index[name] = position;
  });
  writePng(path.join(root, 'tiles/terrain-sheet.png'), sheet);
  fs.writeFileSync(path.join(root, 'tiles/terrain-sheet.json'), JSON.stringify({ columns: SHEET_COLUMNS, tile: TILE_PX, index }));

  // Atlas dos objetos dos biomas (as transições agora são franjas na folha de ladrilhos).
  const entries = BIOME_PROP_ENTRIES.map((entry) => ({ name: entry.name, canvas: entry.draw() }));
  const atlasWidth = 512;
  let x = 2;
  let y = 2;
  let rowHeight = 0;
  const placed = [];
  for (const entry of entries) {
    const { width, height } = entry.canvas;
    if (x + width + 2 > atlasWidth) {
      x = 2;
      y += rowHeight + 2;
      rowHeight = 0;
    }
    placed.push({ ...entry, x, y });
    x += width + 2;
    rowHeight = Math.max(rowHeight, height);
  }
  const atlas = new PixelCanvas(atlasWidth, y + rowHeight + 2);
  const frames = {};
  for (const entry of placed) {
    atlas.blit(entry.canvas, entry.x, entry.y);
    const { width: w, height: h } = entry.canvas;
    frames[entry.name] = {
      frame: { x: entry.x, y: entry.y, w, h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w, h },
      sourceSize: { w, h }
    };
  }
  writePng(path.join(root, 'nature/biome-atlas.png'), atlas);
  fs.writeFileSync(path.join(root, 'nature/biome-atlas.json'), JSON.stringify({
    frames,
    meta: { app: 'LENDAS asset generator', version: '2.0', image: 'biome-atlas.png', format: 'RGBA8888', size: { w: atlasWidth, h: atlas.height }, scale: '1' }
  }, null, 1));
  return { tiles: names.length, props: entries.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/generate-world-assets.js')) {
  const started = Date.now();
  const result = generateWorldAssets();
  console.log(`Mundo: ${result.tiles} ladrilhos, ${result.props} objetos (${Date.now() - started} ms).`);
}
