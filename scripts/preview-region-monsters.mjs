import path from 'node:path';
import { PixelCanvas } from '../src/art/pixel.js';
import { drawMonsterFrame } from '../src/art/monsters.js';
import { REGION_MONSTER_SIZES } from '../src/art/monstersRegions.js';
import { writePng } from './png.js';

// Prévia dos monstros das regiões: cada linha = quadro 0, quadro 1 e elite.
// Rode com `node scripts/preview-region-monsters.mjs`.
const outDir = path.resolve('previa-personagens');
const SCALE = 3;
const BACKGROUND = '#7a7a7a';
const GRID = '#848484';

function enlarge(source, scale = SCALE) {
  const out = new PixelCanvas(source.width * scale, source.height * scale);
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const index = (y * source.width + x) * 4;
      const alpha = source.data[index + 3];
      if (!alpha) continue;
      const hex = `#${[0, 1, 2].map((offset) => source.data[index + offset].toString(16).padStart(2, '0')).join('')}`;
      out.rect(x * scale, y * scale, scale, scale, hex, alpha);
    }
  }
  return out;
}

const only = process.argv[2] ? process.argv[2].split(',') : null;
const kinds = Object.entries(REGION_MONSTER_SIZES).filter(([kind]) => !only || only.includes(kind));
const cell = Math.max(...kinds.map(([, sizes]) => sizes.elite)) * SCALE + 12;
// Duas colunas de monstros (3 células cada) para a imagem não ficar comprida demais.
const columns = 2;
const rows = Math.ceil(kinds.length / columns);
const sheet = new PixelCanvas(cell * 3 * columns, cell * rows);
for (let y = 0; y < sheet.height; y += 1) {
  for (let x = 0; x < sheet.width; x += 1) sheet.pixel(x, y, (Math.floor(x / cell) + Math.floor(y / cell)) % 2 ? GRID : BACKGROUND);
}
kinds.forEach(([kind, sizes], index) => {
  const row = Math.floor(index / columns);
  const baseX = (index % columns) * cell * 3;
  const sprites = [
    drawMonsterFrame(kind, sizes.size, 0),
    drawMonsterFrame(kind, sizes.size, 1),
    drawMonsterFrame(kind, sizes.elite, 0, { elite: true })
  ];
  sprites.forEach((sprite, column) => {
    const big = enlarge(sprite);
    sheet.blit(big, baseX + column * cell + Math.round((cell - big.width) / 2), row * cell + Math.round((cell - big.height) / 2));
  });
});
const file = path.join(outDir, only ? 'monstros-regioes-teste.png' : 'monstros-regioes.png');
writePng(file, sheet);
console.log(`Prévia salva em ${file}`);
