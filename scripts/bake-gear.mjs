// G-armas: pinta os ícones de TODO o equipamento e os sprites da arma na mão/costas em 4x e converte
// para pixel art (mesmo pipeline dos monstros, NPCs e prédios: scripts/gear-paint/pipeline.mjs).
//
//  - ícones 32 x 32 (conteúdo dentro de 28 x 28; a moldura de raridade é posta em tempo de execução
//    por src/art/gearIcons.js), um por peça de GEAR_ITEMS;
//  - sprites de mão 32 x 32 (escala real para o herói 56 x 64, empunhadura em WEAPON_GRIPS), um por
//    arma de GEAR_ITEMS, espadas da Forja, ferramentas e o Arco Longo.
//
// Grava src/art/gearSprites.js (cores + RLE em base64), lido por src/art/bakedGear.js.
// Uso: node scripts/bake-gear.mjs [--only id1,id2] [--preview arquivo.png] [--no-write]
import fs from 'node:fs';
import path from 'node:path';
import { GEAR_ITEMS } from '../src/data/gear.js';
import { WEAPON_GRIPS } from '../src/art/weaponGrips.js';
import { bake, encode, twinkle, fitted } from './gear-paint/pipeline.mjs';
import { paintWeapon, weaponStyle, UNIQUE_STYLES } from './gear-paint/weapons.mjs';
import { paintArmor, SETS } from './gear-paint/armor.mjs';
import { mix } from '../src/art/pixel.js';

const OUT = path.resolve('src/art/gearSprites.js');
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : null; };
const only = opt('only')?.split(',');
const noWrite = args.includes('--no-write');

/** Aura de 1 px (brilho sutil) em volta da silhueta. */
function aura(c, color, alpha = 120) {
  const marks = [];
  for (let y = 0; y < c.height; y += 1) for (let x = 0; x < c.width; x += 1) {
    if (c.alphaAt(x, y) > 0) continue;
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => c.alphaAt(x + dx, y + dy) >= 200);
    if (near) marks.push([x, y]);
  }
  for (const [x, y] of marks) c.pixel(x, y, color, alpha);
}

/** Ponto sólido mais perto de (x, y) (para o brilho cair em cima da peça). */
function nearestSolid(c, x, y) {
  let best = null; let bd = Infinity;
  for (let yy = 0; yy < c.height; yy += 1) for (let xx = 0; xx < c.width; xx += 1) {
    if (c.alphaAt(xx, yy) < 200) continue;
    const d = (xx - x) ** 2 + (yy - y) ** 2;
    if (d < bd) { bd = d; best = [xx, yy]; }
  }
  return best;
}

export const HAND_SIZE = 40;

function weaponShape(item) { return item.look; }

function bakeWeapon(style, shape, mode, grip) {
  let tipRaw = null;
  const raw = (ctx) => { tipRaw = paintWeapon(ctx, shape, style, { mode: 'hand', grip: mode === 'icon' ? [0, 0] : grip, widen: mode === 'icon' ? 1.3 : 1 }).tip; };
  const size = mode === 'icon' ? 32 : HAND_SIZE;
  let paint = raw; let tip;
  if (mode === 'icon') {
    const f = fitted(32, raw, { margin: 2.2, maxScale: 1.7 });
    paint = f.paint;
    tip = () => [f.ox + tipRaw[0] * f.s, f.oy + tipRaw[1] * f.s];
  } else tip = () => tipRaw;
  return bake(size, paint, {
    post: (c) => {
      if (style.glow && style.rank >= 4) aura(c, style.glow, mode === 'icon' ? 110 : 80);
      if (style.rank >= 3) {
        const t = tip();
        const at = nearestSolid(c, t[0] - 2.2, t[1] + 2.2);
        if (at) twinkle(c, at[0], at[1], { halo: style.glow ?? '#ffeb57', arm: style.rank >= 5 ? 2 : 1 });
      }
    }
  });
}

function bakeArmorIcon(item) {
  const set = SETS[item.tierKey] ?? null;
  const level = item.level ?? 1;
  const f = fitted(32, (ctx) => paintArmor(ctx, item), { margin: 2.2, maxScale: 1.3 });
  return bake(32, f.paint, {
    post: (c) => {
      const glow = set?.glow ?? (item.boss ? '#ffa214' : null);
      if (glow && (level >= 100 || item.boss)) aura(c, glow, 100);
      if (level >= 64 || item.boss || item.deathWard) {
        const at = nearestSolid(c, 7, 6);
        if (at) twinkle(c, at[0], at[1], { halo: mix(glow ?? '#ffeb57', '#ffffff', 0.2), arm: level >= 120 || item.boss ? 2 : 1 });
      }
    }
  });
}

const icons = {};
const hands = {};
const preview = [];
for (const item of Object.values(GEAR_ITEMS)) {
  if (only && !only.includes(item.id)) continue;
  if (item.slot === 'weapon') {
    const style = weaponStyle(item);
    const shape = weaponShape(item);
    const icon = bakeWeapon(style, shape, 'icon');
    const hand = bakeWeapon(style, shape, 'hand', WEAPON_GRIPS[item.look] ?? WEAPON_GRIPS.sword);
    icons[item.id] = encode([icon]);
    hands[item.id] = encode([hand]);
    preview.push({ id: item.id, icon, hand });
  } else {
    const icon = bakeArmorIcon(item);
    icons[item.id] = encode([icon]);
    preview.push({ id: item.id, icon });
  }
}
// Espadas da Forja, ferramentas e Arco Longo (só na mão).
const EXTRA = {
  'forge-rusty': 'sword', 'forge-iron': 'sword', 'forge-steel': 'sword', 'forge-legendary': 'sword', 'forge-dragon': 'sword', 'forge-titan': 'sword',
  'tool-pickaxe-stone': 'pickaxe', 'tool-pickaxe-iron': 'pickaxe', 'tool-hatchet': 'hatchet', longbow: 'bow'
};
for (const [id, shape] of Object.entries(EXTRA)) {
  if (only && !only.includes(id)) continue;
  const style = { ...UNIQUE_STYLES[id], id };
  const hand = bakeWeapon(style, shape, 'hand', WEAPON_GRIPS[shape]);
  hands[id] = encode([hand]);
  preview.push({ id, hand });
}

if (!noWrite && !only) {
  const header = '// GERADO por scripts/bake-gear.mjs (G-armas). Não editar à mão: repinte em scripts/gear-paint/.\n';
  const dump = (o) => JSON.stringify(o).replace(/\},"/g, '},\n"');
  fs.writeFileSync(OUT, `${header}export const GEAR_ICON_SPRITES = ${dump(icons)};\n\nexport const WEAPON_HAND_SIZE = ${HAND_SIZE};

export const WEAPON_HAND_SPRITES = ${dump(hands)};\n`);
  console.log('gravado', OUT, Object.keys(icons).length, 'ícones,', Object.keys(hands).length, 'armas na mão');
}

const previewFile = opt('preview');
if (previewFile) {
  const { createCanvas } = await import('@napi-rs/canvas');
  const scale = Number(opt('scale') ?? 4);
  const cols = Number(opt('cols') ?? 10);
  const cell = 40 * scale + 6;
  const rows = Math.ceil(preview.length / cols);
  const canvas = createCanvas(cols * cell * 2, rows * cell);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2a2730'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  const put = (px, x, y) => {
    const small = createCanvas(px.width, px.height);
    const sctx = small.getContext('2d');
    const img = sctx.createImageData(px.width, px.height);
    img.data.set(px.data);
    sctx.putImageData(img, 0, 0);
    ctx.fillStyle = '#3a3640'; ctx.fillRect(x, y, px.width * scale, px.height * scale);
    ctx.drawImage(small, x, y, px.width * scale, px.height * scale);
  };
  preview.forEach((p, i) => {
    const x = (i % cols) * cell * 2; const y = Math.floor(i / cols) * cell;
    if (p.icon) put(p.icon, x, y);
    if (p.hand) put(p.hand, x + cell, y);
  });
  fs.mkdirSync(path.dirname(path.resolve(previewFile)), { recursive: true });
  fs.writeFileSync(path.resolve(previewFile), canvas.toBuffer('image/png'));
}
