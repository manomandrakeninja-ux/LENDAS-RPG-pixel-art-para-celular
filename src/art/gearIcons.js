import { PixelCanvas, darken, lighten, ramp } from './pixel.js';
import { GEAR_ITEMS } from '../data/gear.js';

// Ícones 32 x 32 do equipamento (painel de equipamento, loja e quedas).
// A forma vem do espaço/aparência da peça e a cor de `colors: [principal, detalhe]`.
// A raridade não muda o desenho (a interface mostra pela borda); lendários ganham brilhos.

export const GEAR_ICON_SIZE = 32;

const STEEL = ['#4a5058', '#7d8792', '#b8c2cc', '#eef3f6'];
const WOOD = ['#3e2618', '#6e4628', '#94633a', '#b8865a'];
const GOLD = ['#7a5410', '#c99a2b', '#ffd76b', '#fff6c8'];

/** Lâmina diagonal (canto inferior esquerdo → superior direito) com fio claro. */
function blade(c, x0, y0, x1, y1, width, colors) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const w = t > 0.85 ? width * (1 - (t - 0.85) / 0.15) : width;
    for (let o = -w; o <= w; o += 0.5) {
      const tone = o < -w * 0.3 ? 3 : o < w * 0.4 ? 2 : 1;
      c.pixel(Math.round(x + o * 0.7), Math.round(y + o * 0.7), colors[tone]);
    }
  }
}

function handle(c, x0, y0, x1, y1, colors = WOOD) {
  c.line(x0, y0, x1, y1, colors[1]);
  c.line(x0 + 1, y0, x1 + 1, y1, colors[2]);
}

function sparkle(c, x, y, color = '#fff6c8') {
  c.pixel(x, y, color);
  c.pixel(x - 1, y, lighten(color, 0.2));
  c.pixel(x + 1, y, lighten(color, 0.2));
  c.pixel(x, y - 1, lighten(color, 0.2));
  c.pixel(x, y + 1, lighten(color, 0.2));
}

// ---------- Armas ----------

function sword(c, main, accent) {
  blade(c, 9, 22, 26, 5, 2, ramp(accent));
  c.line(5, 19, 13, 27, ramp(main)[1]);
  c.line(5, 18, 13, 26, ramp(main)[2]);
  handle(c, 4, 27, 8, 23, ramp(main));
  c.shadedEllipse(4, 28, 1.6, 1.6, ramp(main));
}

function dagger(c, main, accent) {
  blade(c, 12, 20, 24, 8, 2, ramp(accent));
  c.line(8, 17, 15, 24, ramp(main)[1]);
  handle(c, 6, 26, 10, 22, ramp(main));
  c.pixel(5, 27, ramp(main)[2]);
}

function sabre(c, main, accent) {
  const edge = ramp(accent);
  for (let i = 0; i <= 18; i += 1) {
    const t = i / 18;
    const x = 9 + t * 17;
    const y = 22 - t * 17 + Math.sin(t * Math.PI) * -3;
    for (let o = -1.5; o <= 1.5; o += 0.5) c.pixel(Math.round(x + o * 0.6), Math.round(y + o * 0.8), o < 0 ? edge[3] : o < 1 ? edge[2] : edge[1]);
  }
  // Guarda curva.
  c.line(5, 20, 9, 25, ramp(main)[2]);
  c.line(9, 25, 13, 24, ramp(main)[1]);
  handle(c, 4, 27, 8, 23, WOOD);
}

function axe(c, main, accent) {
  handle(c, 6, 28, 21, 6, ramp(main).map((col) => col));
  const head = ramp(accent);
  c.polygon([[17, 4], [27, 6], [29, 13], [24, 17], [19, 11]], head[1]);
  c.polygon([[19, 6], [26, 7], [27, 11], [21, 10]], head[2]);
  c.line(27, 6, 29, 13, head[3]);
  c.polygon([[17, 9], [14, 7], [13, 11], [16, 12]], head[0]);
}

function spear(c, main, accent) {
  handle(c, 5, 28, 22, 9, ramp(main));
  const tip = ramp(accent);
  c.polygon([[21, 10], [27, 3], [29, 5], [23, 12]], tip[1]);
  c.polygon([[22, 9], [27, 3], [25, 9]], tip[3]);
  c.line(19, 11, 23, 13, tip[0]);
  c.pixel(20, 12, '#c8302a');
}

function trident(c, main, accent) {
  handle(c, 5, 28, 21, 11, ramp(main));
  const tip = ramp(accent);
  c.line(18, 12, 25, 6, tip[2]);
  c.line(18, 13, 26, 7, tip[1]);
  for (const [x, y] of [[20, 4], [25, 5], [27, 10]]) c.line(22, 9, x, y, tip[2]);
  c.pixel(20, 4, tip[3]);
  c.pixel(25, 5, tip[3]);
  c.pixel(27, 10, tip[3]);
}

function club(c, main, accent) {
  handle(c, 6, 28, 15, 18, WOOD);
  c.shadedEllipse(20, 11, 8, 7, ramp(main));
  for (const [x, y] of [[15, 6], [24, 5], [27, 13], [19, 18], [13, 12]]) {
    c.polygon([[x, y - 2], [x + 2, y], [x, y + 2], [x - 2, y]], ramp(accent)[2]);
  }
  c.pixel(17, 8, ramp(accent)[3]);
}

function staff(c, main, accent) {
  handle(c, 6, 29, 20, 9, ramp(main));
  c.line(20, 9, 23, 4, GOLD[2]);
  c.line(20, 9, 26, 8, GOLD[2]);
  c.shadedEllipse(23, 7, 3.5, 3.5, ramp(accent));
  c.pixel(22, 6, '#ffffff');
}

function claw(c, main, accent) {
  const bone = ramp(accent);
  for (const [x, lift] of [[9, 0], [15, -3], [21, -1]]) {
    for (let i = 0; i < 12; i += 1) {
      const t = i / 11;
      const px = x + t * 6;
      const py = 24 - t * 16 + lift + t * t * 4;
      c.pixel(Math.round(px), Math.round(py), bone[2]);
      c.pixel(Math.round(px) + 1, Math.round(py), bone[1]);
      if (t > 0.8) c.pixel(Math.round(px) + 1, Math.round(py) - 1, bone[3]);
    }
  }
  c.shadedEllipse(14, 25, 9, 4, ramp(main));
}

// ---------- Defesa ----------

function shield(c, main, accent, id) {
  const body = ramp(main);
  const rim = ramp(accent);
  const points = [[6, 5], [26, 5], [26, 15], [16, 29], [6, 15]];
  c.polygon(points, rim[1]);
  c.polygon([[8, 7], [24, 7], [24, 15], [16, 26], [8, 15]], body[1]);
  c.polygon([[8, 7], [16, 7], [16, 26], [8, 15]], body[2]);
  c.line(6, 5, 26, 5, rim[3]);
  // Emblema por escudo.
  if (id === 'turtleShield') {
    for (const [x, y] of [[12, 11], [20, 11], [16, 17]]) c.polygon([[x - 3, y], [x, y - 3], [x + 3, y], [x, y + 3]], rim[2]);
  } else if (id === 'sunShield') {
    c.shadedEllipse(16, 14, 4, 4, GOLD);
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      c.pixel(16 + Math.cos(a) * 6, 14 + Math.sin(a) * 6, GOLD[2]);
    }
  } else if (id === 'iceShield') {
    c.line(16, 9, 16, 22, '#ffffff');
    c.line(11, 12, 21, 19, rim[3]);
    c.line(21, 12, 11, 19, rim[3]);
  } else if (id === 'magmaAegis') {
    c.line(12, 9, 15, 15, '#ff8a2a');
    c.line(15, 15, 13, 21, '#ffb04a');
    c.line(20, 10, 18, 17, '#ff8a2a');
  } else if (id === 'barkShield') {
    for (let y = 9; y < 22; y += 3) c.line(9, y, 23, y + 1, body[0]);
    c.shadedEllipse(16, 14, 2.5, 2.5, rim);
  } else {
    c.shadedEllipse(16, 14, 3, 3, STEEL);
  }
}

function helmet(c, main, accent, set) {
  const metal = ramp(main);
  const trim = ramp(accent);
  if (set === 'couro') {
    // Capuz de couro.
    c.shadedEllipse(16, 16, 10, 11, metal);
    c.ellipse(16, 19, 6, 6, darken(main, 0.6));
    c.shadedEllipse(16, 20, 4, 4, ['#8a5a3a', '#d9a070', '#f0c08a', '#ffe0b0']);
    c.line(8, 22, 24, 22, trim[2]);
  } else if (set === 'corsario') {
    // Tricórnio.
    c.polygon([[3, 18], [16, 10], [29, 18], [16, 22]], metal[1]);
    c.polygon([[9, 15], [16, 5], [23, 15]], metal[2]);
    c.line(4, 18, 16, 22, trim[2]);
    c.line(16, 22, 28, 18, trim[2]);
    c.shadedEllipse(16, 13, 2, 2, ['#cfc6aa', '#ffffff', '#ffffff', '#ffffff']);
  } else if (set === 'faraonico') {
    // Coroa/nêmes listrada.
    c.polygon([[7, 26], [9, 8], [16, 5], [23, 8], [25, 26], [20, 20], [12, 20]], trim[1]);
    for (let y = 9; y < 26; y += 3) c.line(9, y, 23, y, metal[2]);
    c.shadedEllipse(16, 9, 3, 2.5, GOLD);
    c.pixel(16, 5, '#3aa0ff');
  } else {
    c.shadedEllipse(16, 15, 10, 10, metal);
    c.rect(6, 15, 20, 9, metal[1]);
    c.rect(6, 15, 4, 9, metal[2]);
    c.rect(11, 17, 10, 2, '#1a1418');
    c.line(16, 19, 16, 24, '#1a1418');
    c.line(6, 15, 26, 15, trim[2]);
    if (set === 'bosque') {
      // Chifres de galho.
      c.line(7, 9, 3, 3, WOOD[2]);
      c.line(4, 5, 2, 6, WOOD[1]);
      c.line(25, 9, 29, 3, WOOD[2]);
      c.line(28, 5, 30, 6, WOOD[1]);
      c.pixel(9, 8, trim[3]);
      c.pixel(22, 10, trim[3]);
    } else if (set === 'glacial') {
      for (const x of [10, 16, 22]) c.polygon([[x - 2, 8], [x, 1], [x + 2, 8]], trim[2]);
    } else if (set === 'vulcanico') {
      c.polygon([[13, 6], [16, 0], [19, 6]], trim[1]);
      c.line(9, 20, 9, 23, '#ff8a2a');
      c.line(23, 20, 23, 23, '#ff8a2a');
    } else if (set === 'brejo') {
      c.line(8, 10, 24, 10, trim[1]);
      for (let x = 8; x <= 24; x += 3) c.line(x, 10, x - 1, 14, trim[2]);
    }
  }
}

function chest(c, main, accent, set) {
  const body = ramp(main);
  const trim = ramp(accent);
  // Ombreiras, tronco e cintura.
  c.polygon([[5, 7], [12, 4], [20, 4], [27, 7], [27, 14], [23, 14], [23, 28], [9, 28], [9, 14], [5, 14]], body[1]);
  c.polygon([[9, 6], [13, 4], [16, 4], [16, 28], [9, 28], [9, 14], [5, 14], [5, 8]], body[2]);
  c.polygon([[13, 4], [16, 9], [19, 4]], darken(main, 0.6));
  c.rect(9, 22, 14, 2, trim[1]);
  c.pixel(16, 23, trim[3]);
  c.line(5, 7, 12, 4, trim[2]);
  c.line(20, 4, 27, 7, trim[2]);
  if (set === 'corsario') {
    for (const y of [11, 15, 19]) c.pixel(18, y, GOLD[2]);
    c.line(16, 9, 16, 21, trim[0]);
  } else if (set === 'faraonico') {
    c.polygon([[11, 9], [21, 9], [16, 16]], GOLD[2]);
    c.pixel(16, 11, '#3aa0ff');
  } else if (set === 'glacial') {
    c.line(12, 10, 20, 18, trim[3]);
    c.line(20, 10, 12, 18, trim[3]);
  } else if (set === 'vulcanico') {
    c.line(13, 10, 15, 16, '#ff8a2a');
    c.line(19, 11, 17, 18, '#ffb04a');
  } else if (set === 'bosque') {
    c.shadedEllipse(16, 14, 3, 3, ramp('#7aa84a'));
  } else {
    for (const y of [10, 14, 18]) c.line(11, y, 21, y, body[0]);
  }
}

function legs(c, main, accent) {
  const body = ramp(main);
  const trim = ramp(accent);
  c.rect(8, 4, 16, 5, trim[1]);
  c.rect(8, 4, 16, 1, trim[3]);
  c.polygon([[8, 9], [16, 9], [15, 29], [9, 29]], body[2]);
  c.polygon([[16, 9], [24, 9], [23, 29], [17, 29]], body[1]);
  c.line(16, 9, 16, 26, body[0]);
  c.rect(9, 17, 6, 2, trim[2]);
  c.rect(17, 17, 6, 2, trim[1]);
}

function boots(c, main, accent) {
  const body = ramp(main);
  const trim = ramp(accent);
  for (const [x, far] of [[5, false], [17, true]]) {
    const tone = far ? body[1] : body[2];
    c.rect(x, 6, 8, 16, tone);
    c.polygon([[x, 22], [x + 8, 22], [x + 11, 26], [x + 11, 29], [x, 29]], tone);
    c.rect(x, 27, 11, 2, body[0]);
    c.rect(x, 6, 8, 2, trim[2]);
    c.rect(x, 14, 8, 1, trim[1]);
  }
}

function ring(c, main, accent) {
  const band = ramp(main);
  for (let a = 0; a < Math.PI * 2; a += 0.05) {
    const x = 16 + Math.cos(a) * 9;
    const y = 19 + Math.sin(a) * 6;
    const lit = Math.sin(a) < 0 && Math.cos(a) < 0.3;
    c.pixel(x, y, lit ? band[3] : band[1]);
    c.pixel(x, y + 1, band[0]);
    c.pixel(x + (Math.cos(a) > 0 ? -1 : 1), y, band[2]);
  }
  // Pedra no topo.
  c.shadedEllipse(16, 11, 5, 4.5, ramp(accent));
  c.pixel(14, 9, '#ffffff');
  c.line(11, 13, 21, 13, band[1]);
}

function amulet(c, main, accent, item) {
  const chain = ramp(main);
  for (let a = Math.PI * 1.05; a < Math.PI * 1.95; a += 0.06) {
    c.pixel(16 + Math.cos(a) * 11, 14 + Math.sin(a) * 11, chain[2]);
  }
  c.line(5, 14, 12, 21, chain[1]);
  c.line(27, 14, 20, 21, chain[1]);
  if (item.deathWard) {
    // Amuleto de proteção: medalhão com olho azul.
    c.shadedEllipse(16, 23, 6.5, 6.5, GOLD);
    c.shadedEllipse(16, 23, 3.5, 3.5, ramp(accent));
    c.pixel(16, 23, '#ffffff');
  } else if (item.id === 'dragonHeart') {
    c.polygon([[10, 19], [16, 17], [22, 19], [20, 26], [16, 30], [12, 26]], ramp(accent)[1]);
    c.polygon([[11, 20], [16, 18], [16, 29], [12, 26]], ramp(accent)[2]);
    c.pixel(13, 21, '#ffd0a0');
  } else if (item.id === 'scarabAmulet') {
    c.shadedEllipse(16, 24, 5, 6, ramp(accent));
    c.line(16, 18, 16, 30, darken(accent, 0.5));
    c.line(10, 21, 7, 19, GOLD[2]);
    c.line(22, 21, 25, 19, GOLD[2]);
  } else {
    c.polygon([[16, 17], [22, 24], [16, 30], [10, 24]], chain[1]);
    c.polygon([[16, 19], [20, 24], [16, 28], [12, 24]], ramp(accent)[2]);
    c.pixel(15, 22, '#ffffff');
  }
}

const WEAPONS = { sword, dagger, sabre, axe, spear, trident, club, staff, claw };

/** Ícone 32 x 32 de uma peça (`id` de GEAR_ITEMS). */
export function drawGearIcon(id, rarity = 'common') {
  const canvas = new PixelCanvas(GEAR_ICON_SIZE, GEAR_ICON_SIZE);
  const item = GEAR_ITEMS[id];
  if (!item) return canvas;
  const [main, accent] = item.colors ?? ['#7d8792', '#c8a030'];
  if (item.slot === 'weapon') (WEAPONS[item.look] ?? sword)(canvas, main, accent);
  else if (item.slot === 'shield') shield(canvas, main, accent, id);
  else if (item.slot === 'helmet') helmet(canvas, main, accent, item.set);
  else if (item.slot === 'chest') chest(canvas, main, accent, item.set);
  else if (item.slot === 'legs') legs(canvas, main, accent);
  else if (item.slot === 'boots') boots(canvas, main, accent);
  else if (item.slot === 'ring') ring(canvas, main, accent);
  else if (item.slot === 'amulet') amulet(canvas, main, accent, item);
  canvas.outline({ strength: 0.85, ink: '#120d12' });
  if (rarity === 'legendary' || item.boss) {
    sparkle(canvas, 4, 5);
    sparkle(canvas, 27, 26, '#f0d0ff');
    canvas.pixel(28, 3, '#ffffff');
  }
  return canvas;
}
