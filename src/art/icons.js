import { PixelCanvas, ramp } from './pixel.js';

// Ícones 16 x 16 dos itens desenhados por código (os outros vêm de resource-icons.png).
// Cada função recebe um PixelCanvas 16 x 16; o contorno é aplicado depois.

function bottle(canvas, liquid, cork = '#c9a46a') {
  const glass = ['#7d8c94', '#b8c8cf', '#e3eef2', '#ffffff'];
  canvas.rect(7, 1, 3, 3, cork);
  canvas.pixel(7, 1, '#e6c98f');
  canvas.rect(6, 4, 5, 2, glass[1]);
  canvas.shadedEllipse(8.5, 10, 5, 4.6, ramp(liquid));
  canvas.rect(6, 5, 5, 2, ramp(liquid)[1]);
  canvas.pixel(6, 8, '#ffffff');
  canvas.pixel(6, 9, glass[2]);
  canvas.rect(5, 6, 1, 1, glass[0]);
}

/** Frasco grande e redondo (poções fortes): gargalo curto, corpo maior. */
function bigFlask(canvas, liquid, cork = '#c9a46a', band = null) {
  const glass = ['#7d8c94', '#b8c8cf', '#e3eef2', '#ffffff'];
  canvas.rect(6, 0, 5, 2, cork);
  canvas.pixel(6, 0, '#fff0b0');
  canvas.rect(7, 2, 3, 2, glass[1]);
  canvas.shadedEllipse(8.5, 9.5, 6.4, 6, ramp(liquid));
  canvas.rect(7, 3, 3, 1, ramp(liquid)[1]);
  if (band) canvas.rect(5, 2, 7, 1, band);
  canvas.pixel(5, 7, '#ffffff');
  canvas.pixel(5, 8, glass[2]);
  canvas.pixel(4, 9, glass[2]);
  canvas.pixel(11, 12, ramp(liquid)[0]);
}

/** Selo elemental: disco de pedra com a gema do elemento no centro. */
function seal(canvas, gem) {
  canvas.shadedEllipse(8, 8, 7, 7, ['#4a4146', '#6f6469', '#9a8f94', '#c8bfc4']);
  canvas.ellipse(8, 8, 5, 5, '#3a3337');
  canvas.shadedEllipse(8, 8, 3.6, 3.6, gem);
  for (const [x, y] of [[8, 1], [15, 8], [8, 15], [1, 8]]) canvas.pixel(x, y, gem[2]);
}

const DRAW = {
  seeds: (c) => {
    for (const [x, y, color] of [[4, 9, '#c9a24f'], [8, 6, '#d9b45c'], [11, 10, '#b8913f'], [7, 11, '#d9b45c']]) {
      c.shadedEllipse(x, y, 2, 2.6, ramp(color));
    }
    c.line(8, 4, 9, 2, '#5f9e45');
    c.pixel(10, 2, '#8cc55c');
  },
  iron: (c) => {
    // Lingote de ferro com faces.
    c.polygon([[2, 11], [5, 6], [14, 6], [12, 11]], '#9aa6ad');
    c.polygon([[5, 6], [14, 6], [13, 8], [6, 8]], '#d4dde1');
    c.polygon([[2, 11], [12, 11], [12, 13], [2, 13]], '#5f6b72');
    c.pixel(7, 7, '#ffffff');
  },
  coal: (c) => {
    c.shadedEllipse(8, 9, 6, 5, ['#0d0f12', '#1f2328', '#3a4048', '#6a727c']);
    c.pixel(6, 6, '#9aa3ad');
    c.pixel(10, 10, '#2e3339');
  },
  gold: (c) => {
    c.polygon([[2, 11], [5, 6], [14, 6], [12, 11]], '#e0a92e');
    c.polygon([[5, 6], [14, 6], [13, 8], [6, 8]], '#ffe07a');
    c.polygon([[2, 11], [12, 11], [12, 13], [2, 13]], '#9a6a12');
    c.pixel(7, 7, '#fff6c8');
    c.pixel(13, 3, '#fff6c8');
    c.pixel(12, 2, '#fff6c8');
  },
  potion: (c) => bottle(c, '#c7334f'),
  staminaPotion: (c) => bottle(c, '#3f9a5b'),
  potionStrong: (c) => {
    bigFlask(c, '#e0552a');
    c.pixel(10, 8, '#ffc08a');
  },
  potionGreat: (c) => {
    bigFlask(c, '#a0204a', '#e8c15a', '#c99a2b');
    c.pixel(10, 8, '#ff8ac0');
    c.pixel(13, 4, '#fff6c8');
  },
  elixir: (c) => {
    bottle(c, '#8b3fb1', '#d6c27a');
    c.pixel(11, 3, '#f0a6ff');
  },
  torch: (c) => {
    c.line(5, 14, 9, 7, '#6e4628');
    c.line(6, 14, 10, 7, '#94633a');
    c.rect(8, 6, 3, 2, '#5a5f66');
    c.polygon([[9, 0], [6, 4], [8, 6], [11, 6], [12, 3]], '#e0602a');
    c.polygon([[9, 2], [8, 4], [9, 6], [11, 5], [11, 3]], '#ffd76b');
    c.pixel(9, 4, '#fff4c8');
  },
  egg: (c) => {
    c.shadedEllipse(8, 9, 4.5, 5.5, ['#c9b48e', '#efe2c4', '#fbf4e2', '#ffffff']);
    c.pixel(10, 11, '#c9b48e');
  },
  wool: (c) => {
    const wool = ['#b3ab98', '#e3dccb', '#f4efe2', '#ffffff'];
    c.shadedEllipse(8, 9, 6, 4.5, wool);
    for (const [x, y] of [[4, 7], [8, 5.5], [12, 7]]) c.shadedEllipse(x, y, 2.5, 2.2, wool);
    c.line(3, 10, 13, 8, '#c9c1ad');
  },
  milk: (c) => {
    // Garrafa de leite com tampa azul.
    c.rect(5, 5, 7, 9, '#e9eef0');
    c.rect(5, 5, 2, 9, '#ffffff');
    c.rect(10, 5, 2, 9, '#b9c6cc');
    c.rect(6, 2, 5, 3, '#e9eef0');
    c.rect(6, 1, 5, 2, '#4f84c4');
    c.rect(5, 9, 7, 3, '#79a7dc');
    c.pixel(6, 10, '#d9e8f7');
  },
  trap: (c) => {
    c.ellipse(8, 11, 7, 3, '#3c3f45');
    c.ellipse(8, 11, 5, 2, '#5a5f66');
    for (let x = 3; x <= 13; x += 2) {
      c.line(x, 10, x, 6 + (x % 4 === 1 ? 0 : 1), '#d4dde1');
      c.pixel(x, 6 + (x % 4 === 1 ? 0 : 1), '#ffffff');
    }
    c.rect(7, 11, 3, 1, '#8b2f2f');
  },
  titanCore: (c) => {
    c.shadedEllipse(8, 8, 6, 6, ['#2e2624', '#4a3d38', '#6a5850', '#8c776b']);
    c.shadedEllipse(8, 8, 3, 3, ['#8e2a14', '#e0602a', '#ffb04a', '#fff0b0']);
    c.line(3, 6, 6, 8, '#e0602a');
    c.line(10, 9, 13, 11, '#e0602a');
  },
  coin: (c) => {
    c.shadedEllipse(8, 8, 6, 6, ['#9a6a12', '#e8b83a', '#ffe07a', '#fff6c8']);
    c.ellipse(8, 8, 3.4, 3.4, '#c9932a');
    c.rect(7, 5, 2, 6, '#ffe07a');
    c.pixel(5, 4, '#ffffff');
  },
  water: (c) => {
    // Cantil de couro com água.
    c.shadedEllipse(8, 10, 5, 4.5, ['#5a3c26', '#8a5a32', '#b07a48', '#c98d55']);
    c.rect(7, 2, 3, 4, '#c9a46a');
    c.rect(4, 8, 9, 2, '#4f84c4');
    c.pixel(5, 8, '#a9d4ff');
    c.line(3, 6, 6, 3, '#4a2f1e');
  },
  fabric: (c) => {
    // Rolo de tecido vermelho.
    c.rect(2, 5, 12, 7, '#b8473b');
    c.rect(2, 5, 12, 2, '#e06a4f');
    for (let x = 4; x < 14; x += 3) c.line(x, 7, x, 11, '#8e2f2c');
    c.ellipse(2, 8.5, 1.5, 3.5, '#e8b0a0');
    c.pixel(2, 8, '#8e2f2c');
  },
  leather: (c) => {
    c.polygon([[2, 4], [6, 3], [10, 4], [14, 3], [13, 8], [14, 13], [9, 12], [5, 13], [2, 12], [3, 8]], '#8a5a32');
    c.polygon([[4, 5], [9, 5], [11, 8], [6, 9]], '#b07a48');
    for (let x = 4; x < 13; x += 3) c.pixel(x, 11, '#c98d55');
  },
  fish: (c) => {
    c.shadedEllipse(7, 8, 5.5, 3.2, ['#3f6b8a', '#6c9cc4', '#a9cbe6', '#e8f4ff']);
    c.polygon([[11, 8], [15, 4], [15, 12]], '#4f84c4');
    c.pixel(4, 7, '#141014');
    c.line(6, 6, 6, 10, '#3f6b8a');
  },
  crystal: (c) => {
    c.polygon([[8, 1], [12, 6], [10, 14], [6, 14], [4, 6]], '#4fa8d8');
    c.polygon([[8, 1], [8, 14], [6, 14], [4, 6]], '#8fd6f5');
    c.polygon([[8, 2], [10, 6], [8, 9]], '#e4fbff');
    c.polygon([[12, 9], [15, 11], [13, 14], [11, 13]], '#2f7fb0');
  },
  magmaCore: (c) => {
    c.shadedEllipse(8, 8, 6, 6, ['#2e2624', '#4a3d38', '#6a5850', '#8c776b']);
    c.shadedEllipse(8, 8, 3.5, 3.5, ['#8e2a14', '#e0602a', '#ffb04a', '#fff0b0']);
    for (const [x0, y0, x1, y1] of [[3, 5, 5, 7], [11, 10, 13, 12], [9, 3, 10, 5]]) c.line(x0, y0, x1, y1, '#ffb04a');
  },
  book: (c) => {
    c.rect(3, 2, 10, 12, '#6b3a2a');
    c.rect(3, 2, 2, 12, '#4a2418');
    c.rect(12, 3, 2, 10, '#f4e6c6');
    c.rect(7, 5, 4, 3, '#e8c15a');
    c.pixel(7, 5, '#fff0a6');
    c.rect(5, 11, 7, 1, '#8a5a32');
  },
  mapPiece: (c) => {
    c.polygon([[2, 3], [9, 2], [14, 4], [13, 13], [7, 14], [3, 12]], '#e6d2a0');
    c.line(4, 6, 9, 9, '#b03a2e');
    c.line(9, 9, 12, 7, '#b03a2e');
    c.pixel(12, 6, '#b03a2e');
    c.pixel(11, 7, '#b03a2e');
    c.line(3, 10, 7, 12, '#8a6440');
    c.pixel(5, 4, '#8a6440');
  },
  // Diário de missões (24 x 24): livro de couro com fita e selo.
  journal: (c) => {
    c.shadow(12, 22, 9, 1.5, 110);
    c.rect(4, 3, 16, 18, '#7a3a24');
    c.rect(4, 3, 3, 18, '#5a2618');
    c.rect(18, 4, 2, 16, '#f4e6c6');
    c.rect(19, 5, 1, 14, '#d9c08c');
    c.rect(9, 6, 7, 1, '#c98d55');
    c.rect(9, 17, 7, 1, '#c98d55');
    c.shadedEllipse(12.5, 11.5, 3.5, 3.5, ['#8a5a14', '#d99a2b', '#ffe08a', '#fff6c8']);
    c.pixel(12, 11, '#7a3a24');
    c.rect(15, 18, 2, 5, '#c0483b');
    c.pixel(15, 22, '#8e2f2c');
  },
  sealEarth: (c) => seal(c, ['#3f6b2e', '#6a9a3c', '#9cc95a', '#d6f0a0']),
  sealWater: (c) => seal(c, ['#1f4f8a', '#3f84c4', '#7fc0f0', '#d8f0ff']),
  sealWind: (c) => seal(c, ['#5a7a7a', '#8fb8b0', '#c8e8de', '#ffffff']),
  sealLight: (c) => seal(c, ['#9a7a14', '#e8c13a', '#ffe88a', '#fffbe0']),
  sealFire: (c) => seal(c, ['#8e2a14', '#e0602a', '#ffb04a', '#fff0b0']),
  // Mochila de couro com saco de dormir enrolado, bolso e fivela (24 x 24).
  backpack: (c) => {
    const leather = ['#4a2a18', '#7a4a2a', '#a06838', '#c98d55'];
    c.shadow(12, 22, 9, 1.5, 110);
    // Alças laterais atrás do corpo.
    c.rect(3, 9, 2, 10, leather[0]);
    c.rect(19, 9, 2, 10, leather[0]);
    // Corpo arredondado.
    c.forEllipse(12, 15, 8, 7, (x, y) => c.pixel(x, y, leather[1]));
    c.rect(4, 8, 16, 8, leather[1]);
    c.rect(4, 8, 3, 13, leather[2]);
    c.rect(18, 8, 2, 12, leather[0]);
    // Saco de dormir enrolado em cima.
    c.rect(3, 3, 18, 5, '#b8473b');
    c.rect(3, 3, 18, 1, '#e06a4f');
    c.rect(3, 6, 18, 1, '#8e2f2c');
    for (const x of [7, 12, 17]) c.rect(x, 3, 1, 4, '#d9644f');
    c.ellipse(3, 5, 1.5, 2.5, '#8e2f2c');
    c.ellipse(21, 5, 1.5, 2.5, '#e06a4f');
    c.pixel(21, 5, '#8e2f2c');
    // Tiras que prendem o saco.
    c.rect(8, 2, 2, 7, leather[0]);
    c.rect(15, 2, 2, 7, leather[0]);
    // Aba com fivela dourada.
    c.rect(5, 8, 14, 5, leather[2]);
    c.rect(5, 12, 14, 1, leather[0]);
    c.rect(5, 8, 14, 1, leather[3]);
    c.rect(11, 11, 3, 3, '#e8c15a');
    c.pixel(11, 11, '#fff0a6');
    c.pixel(12, 12, leather[0]);
    // Bolso da frente com costura.
    c.rect(7, 15, 10, 5, leather[2]);
    c.rect(7, 15, 10, 1, leather[3]);
    for (let x = 8; x < 16; x += 2) c.pixel(x, 19, leather[3]);
    c.rect(11, 15, 2, 2, '#e8c15a');
    // Caneca pendurada do lado.
    c.rect(19, 15, 3, 3, '#8d9496');
    c.pixel(19, 15, '#cfd0c4');
    c.pixel(22, 16, '#8d9496');
  }
};

export const ICON_SIZES = { backpack: 24, journal: 24 };

/** Desenha o ícone e devolve o PixelCanvas (com contorno). */
export function drawIcon(name) {
  const size = ICON_SIZES[name] ?? 16;
  const canvas = new PixelCanvas(size, size);
  DRAW[name]?.(canvas);
  return canvas.outline().quantize();
}

export const CODE_ICON_NAMES = Object.keys(DRAW);
