// Prancha com todos os ícones de equipamento (G-armas): uma linha por conjunto, armas lendárias no fim.
// Uso: node scripts/gear-paint/board.mjs <saída.png> [escala=3] [raridade|auto]
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { GEAR_ITEMS, GEAR_SETS } from '../../src/data/gear.js';
import { drawGearIcon } from '../../src/art/gearIcons.js';

const out = path.resolve(process.argv[2] ?? '.tmp/capturas/armas/icones.png');
const scale = Number(process.argv[3] ?? 3);
const rarityArg = process.argv[4] ?? 'auto';
const ORDER = ['weapon', 'weapon', 'shield', 'helmet', 'chest', 'legs', 'boots', 'ring', 'amulet'];
const rows = Object.keys(GEAR_SETS).map((set) => {
  const items = Object.values(GEAR_ITEMS).filter((i) => i.tierKey === set);
  const row = [];
  for (const slot of [...new Set(ORDER)]) row.push(...items.filter((i) => i.slot === slot));
  return { label: GEAR_SETS[set].name, items: row };
});
rows.push({ label: 'Arremesso / chefes', items: Object.values(GEAR_ITEMS).filter((i) => !i.tierKey) });
const RAR = ['common', 'uncommon', 'rare', 'legendary'];
const cell = 32 * scale + 8;
const labelW = 150;
const cols = Math.max(...rows.map((r) => r.items.length));
const canvas = createCanvas(labelW + cols * cell + 8, rows.length * (cell + 14) + 8);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#2a2730'; ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.imageSmoothingEnabled = false;
rows.forEach((row, r) => {
  const y = 8 + r * (cell + 14);
  ctx.fillStyle = '#e8e0cc'; ctx.font = '13px sans-serif'; ctx.fillText(row.label, 6, y + cell / 2);
  row.items.forEach((item, i) => {
    const x = labelW + i * cell;
    const rarity = rarityArg === 'auto' ? (item.boss ? 'legendary' : RAR[(r + i) % 3]) : rarityArg;
    const px = drawGearIcon(item.id, rarity);
    const small = createCanvas(px.width, px.height);
    const sctx = small.getContext('2d');
    const img = sctx.createImageData(px.width, px.height);
    img.data.set(px.data);
    sctx.putImageData(img, 0, 0);
    ctx.fillStyle = '#3a3640'; ctx.fillRect(x, y, cell - 4, cell - 4);
    ctx.drawImage(small, x + 2, y + 2, px.width * scale, px.height * scale);
    ctx.fillStyle = '#a8a0b0'; ctx.font = '10px sans-serif';
    ctx.fillText(item.name.slice(0, 16), x, y + cell + 8);
  });
});
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, canvas.toBuffer('image/png'));
console.log('prancha', out, Object.keys(GEAR_ITEMS).length, 'itens');
