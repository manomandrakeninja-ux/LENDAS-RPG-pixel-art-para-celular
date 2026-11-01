import path from 'node:path';
import { PixelCanvas } from '../src/art/pixel.js';
import { drawValleyTile } from '../src/art/terrain.js';
import { writePng } from './png.js';

// Regenera só a folha do Vale (grass-sheet.png: 8x8 quadros de 48 px) sem mexer nos outros assets.
const sheet = new PixelCanvas(48 * 8, 48 * 8);
for (let frame = 0; frame < 64; frame += 1) sheet.blit(drawValleyTile(frame), (frame % 8) * 48, Math.floor(frame / 8) * 48);
writePng(path.resolve(process.argv[2] ?? 'public/assets/tiles/grass-sheet.png'), sheet);
console.log('grass-sheet.png gerada');
