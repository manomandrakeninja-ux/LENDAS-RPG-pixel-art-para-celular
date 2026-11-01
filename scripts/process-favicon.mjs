import fs from 'node:fs';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const source = 'C:/Users/Lucas Eduardo/.codex/generated_images/01a1952a-131e-7f10-8ca8-ad311549c526/exec-83a08c99-2ed1-47cb-b0bc-b30df2229f07.png';
const image = await loadImage(source);
for (const size of [512, 192, 32]) {
  const canvas = createCanvas(size, size);
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = true;
  context.fillStyle = '#071b13';
  context.fillRect(0, 0, size, size);
  context.drawImage(image, 0, 0, size, size);
  const name = size === 512 ? 'icon-512.png' : size === 192 ? 'icon-192.png' : 'favicon.png';
  fs.writeFileSync(`public/${name}`, canvas.toBuffer('image/png'));
}
console.log('favicon icons updated: 512, 192 and 32 px');
