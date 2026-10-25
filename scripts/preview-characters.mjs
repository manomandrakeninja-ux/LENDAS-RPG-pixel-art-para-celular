import path from 'node:path';
import { PixelCanvas } from '../src/art/pixel.js';
import { drawKnightFrame } from '../src/art/knight.js';
import { MONSTER_PREVIEW, drawMonsterFrame } from '../src/art/monsters.js';
import { writePng } from './png.js';

// Gera prévias ampliadas do jogador e dos monstros em previa-personagens/.
// Rode com `npm run preview:characters`.
const outDir = path.resolve('previa-personagens');
const SCALE = 5;
const BACKGROUND = '#4f7a45';
const GRID = '#5a8650';

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

function board(width, height) {
  const canvas = new PixelCanvas(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) canvas.pixel(x, y, ((x >> 5) + (y >> 5)) % 2 ? GRID : BACKGROUND);
  }
  return canvas;
}

// Jogador: 4 direções x 4 quadros.
const knightCell = { width: 32 * SCALE + 20, height: 40 * SCALE + 20 };
const player = board(knightCell.width * 4, knightCell.height * 4);
for (let direction = 0; direction < 4; direction += 1) {
  for (let frame = 0; frame < 4; frame += 1) {
    player.blit(enlarge(drawKnightFrame(direction, frame)), frame * knightCell.width + 10, direction * knightCell.height + 10);
  }
}
writePng(path.join(outDir, 'jogador-cavaleiro.png'), player);

// Monstros: normal (2 quadros) e elite (1 quadro), cada um numa linha.
const rows = MONSTER_PREVIEW;
const cellSize = Math.max(...rows.map((entry) => entry.elite)) * SCALE + 20;
const monsters = board(cellSize * 3, cellSize * rows.length);
rows.forEach((entry, row) => {
  for (let frame = 0; frame < 2; frame += 1) {
    const sprite = enlarge(drawMonsterFrame(entry.kind, entry.size, frame, { elite: false }));
    monsters.blit(sprite, frame * cellSize + Math.round((cellSize - sprite.width) / 2), row * cellSize + Math.round((cellSize - sprite.height) / 2));
  }
  const elite = enlarge(drawMonsterFrame(entry.kind, entry.elite, 0, { elite: true }));
  monsters.blit(elite, 2 * cellSize + Math.round((cellSize - elite.width) / 2), row * cellSize + Math.round((cellSize - elite.height) / 2));
});
writePng(path.join(outDir, 'monstros.png'), monsters);
console.log(`Prévias salvas em ${outDir}`);
