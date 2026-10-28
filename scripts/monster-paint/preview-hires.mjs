// Mostra a pintura em alta resolução (antes da redução): node scripts/monster-paint/preview-hires.mjs <tipo> <quadro> → .tmp/hi-<tipo>.png
import fs from 'node:fs';
import { createCanvas, Path2D } from '@napi-rs/canvas';
import { MONSTERS_B } from './lote1b.mjs';
import { MONSTERS } from './lote1.mjs';
import { MONSTERS_C } from './lote1c.mjs';
const all = { ...MONSTERS, ...MONSTERS_B, ...MONSTERS_C };
const [kind, frame = '0'] = process.argv.slice(2);
const S = 512; const c = createCanvas(S, S); const ctx = c.getContext('2d'); ctx.Path2D = Path2D;
ctx.fillStyle = '#33984b'; ctx.fillRect(0, 0, S, S); ctx.scale(S / 64, S / 64);
all[kind].paint(ctx, Number(frame), { px: 1, attack: frame === '4' });
fs.writeFileSync(`.tmp/hi-${kind}.png`, c.toBuffer('image/png'));
