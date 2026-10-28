// Mostra a pintura em alta resolução (antes da redução): node scripts/monster-paint/preview-hires.mjs <tipo> <quadro> → .tmp/hi-<tipo>.png
import fs from 'node:fs';
import { createCanvas, Path2D } from '@napi-rs/canvas';
import { MONSTERS_B } from './lote1b.mjs';
import { MONSTERS } from './lote1.mjs';
import { MONSTERS_C } from './lote1c.mjs';
import { MONSTERS_2A } from './lote2a.mjs';
import { MONSTERS_2B } from './lote2b.mjs';
import { MONSTERS_2C } from './lote2c.mjs';
import { MONSTERS_3A } from './lote3a.mjs';
import { MONSTERS_3B } from './lote3b.mjs';
import { MONSTERS_3C } from './lote3c.mjs';
const all = { ...MONSTERS, ...MONSTERS_B, ...MONSTERS_C, ...MONSTERS_2A, ...MONSTERS_2B, ...MONSTERS_2C, ...MONSTERS_3A, ...MONSTERS_3B, ...MONSTERS_3C };
const [kind, frame = '0'] = process.argv.slice(2);
const S = 512; const c = createCanvas(S, S); const ctx = c.getContext('2d'); ctx.Path2D = Path2D;
ctx.fillStyle = '#33984b'; ctx.fillRect(0, 0, S, S); ctx.scale(S / 64, S / 64);
all[kind].paint(ctx, Number(frame), { px: 64 / all[kind].size, attack: frame === '4', size: all[kind].size, normalSize: all[kind].size });
fs.writeFileSync(process.argv[4] ?? `.tmp/hi-${kind}.png`, c.toBuffer('image/png'));
