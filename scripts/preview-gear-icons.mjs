import path from 'node:path';
import { PixelCanvas } from '../src/art/pixel.js';
import { GEAR_ITEMS } from '../src/data/gear.js';
import { GEAR_ICON_SIZE, drawGearIcon } from '../src/art/gearIcons.js';
import { drawIcon } from '../src/art/icons.js';
import { writePng } from './png.js';

// Prévia dos ícones de equipamento (e das poções novas) em previa-personagens/equipamentos.png.
// Rode com `node scripts/preview-gear-icons.mjs`.
const SCALE = 3;
const CELL = GEAR_ICON_SIZE * SCALE + 12;
const COLUMNS = 8;

function enlarge(source, scale) {
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

const icons = Object.values(GEAR_ITEMS).map((item) => drawGearIcon(item.id, item.boss ? 'legendary' : 'common'));
for (const potion of ['potion', 'potionStrong', 'potionGreat']) {
  const small = drawIcon(potion);
  const holder = new PixelCanvas(GEAR_ICON_SIZE, GEAR_ICON_SIZE);
  holder.blit(enlarge(small, 2), 0, 0);
  icons.push(holder);
}
const rows = Math.ceil(icons.length / COLUMNS);
const board = new PixelCanvas(COLUMNS * CELL, rows * CELL);
board.rect(0, 0, board.width, board.height, '#3a3a40');
icons.forEach((icon, index) => {
  const x = (index % COLUMNS) * CELL;
  const y = Math.floor(index / COLUMNS) * CELL;
  board.rect(x + 2, y + 2, CELL - 4, CELL - 4, '#55555c');
  board.blit(enlarge(icon, SCALE), x + 6, y + 6);
});
writePng(path.resolve('previa-personagens/equipamentos.png'), board);
console.log(`${icons.length} ícones em previa-personagens/equipamentos.png`);
