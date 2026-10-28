// Prévia do padrão da Fase 22: cada quadro da folha (12 x 4) com a arma posta pelo esqueleto (heroRig.js).
// Colunas 0-4 e 11: arma nas costas (fora de combate); 5: mão a caminho (arma ainda nas costas);
// 6: mão no cabo (arma nas costas); 7-10: arma na mão. Linha de baixo da prévia: andar segurando a arma.
// Uso: node scripts/hero/preview-rig.mjs <folha.png> <saida.png> [textura] [aparencia] [escala]
import fs from 'node:fs';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { HERO_COLS, HERO_DIRS, HERO_FRAME, rigFor, weaponAngle } from '../../src/art/heroRig.js';
import { WEAPON_STYLE, drawWeaponSprite, weaponPose } from '../../src/art/weaponSprites.js';

const [,, sheetFile, out, texture = 'player', look = 'sword', scaleArg = '3'] = process.argv;
const S = Number(scaleArg);
const { width: FW, height: FH } = HERO_FRAME;
const img = await loadImage(fs.readFileSync(sheetFile));
const cols = Math.round(img.width / FW);
const rig = rigFor(texture);
const style = WEAPON_STYLE[look] ?? 'slash';
const wpx = drawWeaponSprite(look, '#5a3b26', '#a7b0b8');
const wc = createCanvas(32, 32);
wc.getContext('2d').putImageData(Object.assign(wc.getContext('2d').createImageData(32, 32), {}), 0, 0);
const id = wc.getContext('2d').createImageData(32, 32);
id.data.set(wpx.data);
wc.getContext('2d').putImageData(id, 0, 0);

const canvas = createCanvas(HERO_COLS * FW * S, (HERO_DIRS.length + 1) * FH * S);
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
for (let y = 0; y < canvas.height; y += 8 * S) for (let x = 0; x < canvas.width; x += 8 * S) {
  ctx.fillStyle = ((x + y) / (8 * S)) % 2 ? '#3f7a3c' : '#467f40';
  ctx.fillRect(x, y, 8 * S, 8 * S);
}

function drawWeapon(ox, oy, [hx, hy], angle) {
  const p = weaponPose(look, angle);
  ctx.save();
  ctx.translate(ox + (hx + 0.5) * S, oy + (hy + 0.5) * S);
  ctx.rotate((p.rotation * Math.PI) / 180);
  ctx.scale(p.flipX ? -S : S, p.flipY ? -S : S);
  const [gx, gy] = [p.flipX ? wpx.width - 1 - p.grip[0] : p.grip[0], p.flipY ? wpx.height - 1 - p.grip[1] : p.grip[1]];
  ctx.drawImage(wc, -gx - 0.5, -gy - 0.5);
  ctx.restore();
}

function frame(dir, row, col, slot, mode) {
  const ox = slot * FW * S;
  const oy = row * FH * S;
  const r = rig[dir];
  const c = col < cols ? col : 1;
  const inHand = mode === 'hand' || (col >= 7 && col <= 10);
  const layer = inHand ? r.layer[col] : r.back.layer;
  const weapon = () => (inHand ? drawWeapon(ox, oy, r.hands[col], weaponAngle(style, dir, col)) : drawWeapon(ox, oy, r.back.grip, r.back.angle));
  if (layer === 'back') weapon();
  ctx.drawImage(img, c * FW, HERO_DIRS.indexOf(dir) * FH, FW, FH, ox, oy, FW * S, FH * S);
  if (layer !== 'back') weapon();
  const [hx, hy] = r.hands[col];
  ctx.fillStyle = '#ff2bd6';
  ctx.fillRect(ox + hx * S + S / 2 - 1, oy + hy * S + S / 2 - 1, 3, 3);
}

HERO_DIRS.forEach((dir, row) => { for (let col = 0; col < HERO_COLS; col += 1) frame(dir, row, col, col, 'auto'); });
// Linha extra: andando com a arma na mão (3 primeiros quadros de cada direção).
HERO_DIRS.forEach((dir, i) => { for (let col = 0; col < 3; col += 1) frame(dir, HERO_DIRS.length, col, i * 3 + col, 'hand'); });
fs.writeFileSync(out, canvas.toBuffer('image/png'));
console.log('prévia', out);
