// Fase 22: sprite da arma/ferramenta que o herói leva nas costas e na mão.
// Usa o mesmo desenho dos ícones (src/art/gearIcons.js): 32 x 32, na diagonal, cabo embaixo à esquerda
// e ponta em cima à direita (-45 graus). Assim, nas costas e nas poses principais a arma fica nítida
// (só espelhada), e só gira de verdade no meio do golpe.
import { PixelCanvas, ramp } from './pixel.js';
import { drawWeaponArt } from './gearIcons.js';
import { GEAR_ITEMS } from '../data/gear.js';
import { SWORD_TIERS, swordTierFor } from './gear.js';

export const WEAPON_SPRITE_SIZE = 32;
/** Ângulo (graus, tela) do cabo para a ponta no desenho original. */
export const WEAPON_NATIVE_ANGLE = -45;

/** Ponto de empunhadura (onde fica a mão) em cada aparência. */
export const WEAPON_GRIPS = Object.freeze({
  sword: [7, 24], dagger: [9, 22], sabre: [7, 24], axe: [9, 25], spear: [11, 22], trident: [11, 23],
  club: [9, 25], staff: [10, 24], claw: [12, 23], bow: [15, 16], pickaxe: [9, 23], hatchet: [9, 25]
});

/** Jeito de atacar: corte, estocada (lança), conjuração (cajado), tiro (arco), pancada (maça/machado). */
export const WEAPON_STYLE = Object.freeze({
  sword: 'slash', dagger: 'slash', sabre: 'slash', claw: 'slash', axe: 'heavy', club: 'heavy',
  spear: 'thrust', trident: 'thrust', staff: 'cast', bow: 'bow', pickaxe: 'tool', hatchet: 'tool'
});

const WOOD = ['#3e2618', '#6e4628', '#94633a', '#b8865a'];

function bow(c, main, accent) {
  // Arco: madeira curva da ponta de baixo (4, 27) à de cima (27, 4), barriga para cima/esquerda; corda reta.
  const wood = ramp(main);
  const pts = [];
  for (let i = 0; i <= 24; i += 1) {
    const t = i / 24;
    const x = 4 + 23 * t - Math.sin(t * Math.PI) * 6;
    const y = 27 - 23 * t - Math.sin(t * Math.PI) * 6;
    pts.push([x, y]);
  }
  for (let i = 1; i < pts.length; i += 1) {
    c.line(Math.round(pts[i - 1][0]), Math.round(pts[i - 1][1]), Math.round(pts[i][0]), Math.round(pts[i][1]), wood[1]);
    c.line(Math.round(pts[i - 1][0]) + 1, Math.round(pts[i - 1][1]), Math.round(pts[i][0]) + 1, Math.round(pts[i][1]), wood[2]);
  }
  c.line(5, 26, 26, 5, '#e8e0c8');
  // Empunhadura enrolada no meio.
  const [gx, gy] = [Math.round(pts[12][0]), Math.round(pts[12][1])];
  c.rect(gx - 1, gy - 1, 3, 3, ramp(accent)[1]);
  c.pixel(gx, gy - 1, ramp(accent)[2]);
  c.pixel(4, 27, wood[3]);
  c.pixel(27, 4, wood[3]);
}

function pickaxe(c, main, accent) {
  // Cabo de madeira na diagonal e cabeça curva de metal atravessada no topo.
  c.line(6, 28, 19, 9, WOOD[1]);
  c.line(7, 28, 20, 9, WOOD[2]);
  const head = ramp(accent);
  const arc = [];
  for (let i = 0; i <= 16; i += 1) {
    const t = i / 16;
    arc.push([11 + 16 * t, 3 + 15 * t - Math.sin(t * Math.PI) * 4]);
  }
  for (let i = 1; i < arc.length; i += 1) {
    const [x0, y0] = arc[i - 1];
    const [x1, y1] = arc[i];
    c.line(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), head[1]);
    c.line(Math.round(x0), Math.round(y0) + 1, Math.round(x1), Math.round(y1) + 1, head[0]);
  }
  c.line(13, 3, 22, 7, head[2]);
  c.pixel(11, 3, head[3]);
  c.pixel(27, 18, head[3]);
  c.rect(18, 8, 3, 3, ramp(main)[0]);
}

const EXTRA = { bow, pickaxe };

/** Desenha a arma/ferramenta (PixelCanvas 32 x 32, já com contorno). */
export function drawWeaponSprite(look, main = '#7d8792', accent = '#c8a030') {
  const canvas = new PixelCanvas(WEAPON_SPRITE_SIZE, WEAPON_SPRITE_SIZE);
  if (EXTRA[look]) EXTRA[look](canvas, main, accent);
  else drawWeaponArt(canvas, look === 'hatchet' ? 'axe' : look, main, accent);
  canvas.outline({ strength: 0.85, ink: '#120d12', rim: false });
  return canvas.quantize();
}

/**
 * Qual arma mostrar: a peça vestida (gear.js) tem prioridade; senão a espada da Forja (cor do tier);
 * sem nenhuma, a espada enferrujada. `hasBow` sozinho não troca a arma: o arco aparece só no tiro.
 */
export function weaponLookFor({ lootId = null, forgeWeapon = null } = {}) {
  const item = lootId ? GEAR_ITEMS[lootId] : null;
  if (item?.slot === 'weapon') {
    const [main, accent] = item.colors ?? ['#7d8792', '#c8a030'];
    return { key: `hero-weapon-${lootId}`, look: item.look ?? 'sword', main, accent };
  }
  const tier = swordTierFor(forgeWeapon);
  const palette = SWORD_TIERS[tier] ?? SWORD_TIERS.rusty;
  return { key: `hero-weapon-forge-${tier}`, look: 'sword', main: palette.guard, accent: palette.blade[1] };
}

/** Ferramenta da coleta: picareta (pedra/ferro) ou machadinha. */
export function toolLookFor(tool = 'pickaxe', tier = 'stone') {
  if (tool === 'hatchet') return { key: 'hero-tool-hatchet', look: 'hatchet', main: '#6e4628', accent: '#a7b0b8' };
  const accent = tier === 'iron' ? '#9fc0dc' : '#8d9298';
  return { key: `hero-tool-pickaxe-${tier}`, look: 'pickaxe', main: '#4a2f1e', accent };
}

/**
 * Variante nítida mais próxima do ângulo pedido: o desenho original e seus espelhos apontam para as
 * 4 diagonais; o resto vira uma rotação pequena (|delta| <= 45 graus).
 * Devolve { flipX, flipY, rotation (graus), grip: [x, y] já espelhado }.
 */
export function weaponPose(look, angle) {
  const variants = [
    { a: -45, flipX: false, flipY: false },
    { a: -135, flipX: true, flipY: false },
    { a: 45, flipX: false, flipY: true },
    { a: 135, flipX: true, flipY: true }
  ];
  const norm = (d) => ((d + 540) % 360) - 180;
  let best = variants[0];
  let bestDelta = Infinity;
  for (const v of variants) {
    const d = Math.abs(norm(angle - v.a));
    if (d < bestDelta) { bestDelta = d; best = v; }
  }
  const [gx, gy] = WEAPON_GRIPS[look] ?? WEAPON_GRIPS.sword;
  const S = WEAPON_SPRITE_SIZE - 1;
  return {
    flipX: best.flipX,
    flipY: best.flipY,
    rotation: norm(angle - best.a),
    grip: [best.flipX ? S - gx : gx, best.flipY ? S - gy : gy]
  };
}

/** Arco Longo da Forja: aparece na mão só no tiro (a arma das costas continua a equipada). */
export const BOW_LOOK = Object.freeze({ key: 'hero-weapon-longbow', look: 'bow', main: '#6e4628', accent: '#c8a030' });
