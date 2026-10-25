import { PixelCanvas, dither, hash, lighten, ramp } from './pixel.js';

// Desenhos dos locais de missão da campanha (todos com contorno e volume).
const STONE = ['#3f454a', '#5d6569', '#7f878a', '#a7aeab', '#cfd0c4'];
const WOOD = ['#4a2f1e', '#6e4628', '#94633a', '#b98450'];

function stoneBlock(c, x, y, w, h, colors = STONE) {
  for (let py = y; py < y + h; py += 1) {
    for (let px = x; px < x + w; px += 1) {
      const seam = (py - y) % 5 === 4 || (px - x + (Math.floor((py - y) / 5) % 2) * 4) % 8 === 7;
      const tone = hash(Math.floor((px - x) / 8), Math.floor((py - y) / 5), 3) > 0.6 ? 3 : 2;
      c.pixel(px, py, seam ? colors[1] : colors[tone]);
    }
  }
  c.rect(x, y, w, 1, colors[4]);
  c.rect(x + w - 1, y, 1, h, colors[1]);
}

function tent(c, cloth = '#b8862f') {
  const colors = ramp(cloth);
  c.shadow(16, 29, 13, 2.4, 110);
  c.polygon([[3, 28], [16, 5], [29, 28]], colors[1]);
  c.polygon([[16, 5], [29, 28], [20, 28]], colors[0]);
  c.polygon([[3, 28], [16, 5], [10, 28]], colors[2]);
  c.polygon([[13, 28], [16, 17], [19, 28]], '#2a1c12');
  c.line(16, 3, 16, 6, WOOD[1]);
}

function crystalShape(c, cx, base, colors, height = 18) {
  c.polygon([[cx, base - height], [cx + 5, base - height + 6], [cx + 4, base], [cx - 4, base], [cx - 5, base - height + 6]], colors[1]);
  c.polygon([[cx, base - height], [cx, base], [cx - 4, base], [cx - 5, base - height + 6]], colors[2]);
  c.polygon([[cx, base - height + 1], [cx + 2, base - height + 6], [cx, base - height + 9]], colors[3]);
}

const ARTS = {
  mushrooms: { size: 32, draw: (c) => {
    c.shadow(16, 27, 13, 2, 90);
    for (const [x, y, s] of [[8, 22, 1], [16, 18, 1.4], [24, 23, 1], [12, 26, 0.8], [21, 27, 0.8]]) {
      c.rect(x - 1, y, 3, Math.round(4 * s), '#e9dcc0');
      c.forEllipse(x, y, 4 * s, 3 * s, (px, py) => { if (py <= y) c.pixel(px, py, py < y - 1 ? '#de6a52' : '#b8433a'); });
      c.pixel(x - 1, y - 2, '#fbeedd');
    }
  } },
  well: { size: 32, draw: (c) => {
    c.shadow(16, 29, 12, 2.2, 110);
    stoneBlock(c, 5, 16, 22, 12);
    c.ellipse(16, 16, 11, 3, STONE[1]);
    c.ellipse(16, 16, 8, 2, '#1f4f8a');
    c.pixel(13, 16, '#a9d4ff');
    c.rect(5, 4, 2, 13, WOOD[1]);
    c.rect(25, 4, 2, 13, WOOD[0]);
    c.polygon([[3, 6], [16, 0], [29, 6]], '#8a3a2a');
    c.line(16, 6, 16, 12, '#c9b27a');
    c.rect(14, 12, 4, 3, WOOD[2]);
  } },
  crates: { size: 32, draw: (c) => {
    c.shadow(16, 29, 13, 2.2, 110);
    for (const [x, y, w] of [[4, 16, 12], [16, 18, 11], [10, 6, 11]]) {
      c.rect(x, y, w, w - 1, WOOD[2]);
      c.rect(x, y, w, 1, WOOD[3]);
      c.rect(x + w - 1, y, 1, w - 1, WOOD[0]);
      c.line(x, y, x + w - 1, y + w - 2, WOOD[0]);
    }
  } },
  cart: { size: 40, draw: (c) => {
    c.shadow(20, 35, 17, 2.4, 110);
    c.rect(4, 16, 30, 10, WOOD[2]);
    for (let x = 4; x < 34; x += 5) c.rect(x, 16, 1, 10, WOOD[0]);
    c.rect(4, 15, 30, 2, WOOD[3]);
    c.polygon([[6, 15], [20, 5], [32, 15]], '#d9c8a0');
    c.polygon([[20, 5], [32, 15], [24, 15]], '#b8a580');
    c.line(34, 22, 39, 26, WOOD[1]);
    for (const x of [10, 28]) {
      c.ellipse(x, 28, 5, 5, WOOD[0]);
      c.ellipse(x, 28, 3, 3, WOOD[2]);
      c.pixel(x, 28, WOOD[0]);
    }
    c.rect(14, 12, 6, 4, '#b8473b');
  } },
  tent: { size: 32, draw: (c) => tent(c) },
  merchantTent: { size: 32, draw: (c) => {
    tent(c, '#5a3a7a');
    for (let x = 6; x < 27; x += 4) c.line(x, 27, 16, 6, '#e8c15a');
  } },
  redCrystal: { size: 32, draw: (c) => {
    c.shadow(16, 28, 11, 2.2, 100);
    c.ellipse(16, 18, 13, 12, '#ff6a4a', 40);
    const red = ['#6a1414', '#b8302a', '#ff6a4a', '#ffd0c0'];
    crystalShape(c, 16, 28, red, 24);
    crystalShape(c, 8, 28, red, 12);
    crystalShape(c, 24, 28, red, 14);
  } },
  den: { size: 40, draw: (c) => {
    c.shadow(20, 35, 18, 2.6, 120);
    c.forPolygon([[1, 36], [6, 14], [16, 4], [26, 6], [36, 16], [39, 36]], (x, y) => {
      const v = -(x - 20) / 20 * 0.6 - (y - 20) / 16 * 0.8 + (dither(x, y) - 0.5) * 0.3;
      c.pixel(x, y, STONE[v > 0.6 ? 3 : v > 0 ? 2 : 1]);
    });
    c.forEllipse(20, 30, 9, 9, (x, y) => { if (y <= 36) c.pixel(x, y, '#0d0b0c'); });
    for (const [x, y] of [[10, 33], [30, 34], [24, 36]]) c.rect(x, y, 3, 1, '#e8e2d0');
  } },
  banner: { size: 32, draw: (c) => {
    c.shadow(16, 29, 8, 2, 100);
    c.rect(15, 2, 2, 27, WOOD[1]);
    c.polygon([[17, 3], [29, 3], [29, 16], [23, 13], [17, 16]], '#c0483b');
    c.rect(17, 3, 12, 2, '#e06a4f');
    c.shadedEllipse(23, 8, 2.5, 2.5, ['#8a5a14', '#d99a2b', '#ffe08a', '#fff6c8']);
    c.rect(13, 27, 6, 2, WOOD[0]);
  } },
  sign: { size: 32, draw: (c) => {
    c.shadow(16, 29, 7, 1.8, 100);
    c.rect(15, 12, 3, 17, WOOD[1]);
    c.polygon([[4, 6], [26, 6], [30, 10], [26, 14], [4, 14]], WOOD[2]);
    c.rect(4, 6, 22, 1, WOOD[3]);
    c.line(7, 10, 22, 10, WOOD[0]);
  } },
  cabin: { size: 40, draw: (c) => {
    c.shadow(20, 36, 18, 2.4, 120);
    for (let y = 18; y < 34; y += 3) {
      c.rect(5, y, 30, 3, WOOD[2]);
      c.rect(5, y + 2, 30, 1, WOOD[0]);
    }
    c.polygon([[2, 19], [20, 5], [38, 19]], '#5a4a3a');
    c.line(2, 19, 20, 5, '#7a6a5a');
    c.rect(16, 24, 7, 10, '#2a1c12');
    c.rect(26, 22, 6, 5, '#3a2a1a');
    c.line(26, 22, 31, 26, WOOD[0]);
  } },
  roots: { size: 40, draw: (c) => {
    c.shadow(20, 36, 18, 2.4, 110);
    const bark = ramp('#5a3d29');
    for (const [x0, y0, x1, y1] of [[20, 10, 4, 34], [20, 10, 36, 32], [20, 10, 14, 36], [20, 10, 28, 36]]) {
      c.line(x0, y0, x1, y1, bark[1]);
      c.line(x0 + 1, y0, x1 + 1, y1, bark[0]);
    }
    c.shadedEllipse(20, 10, 9, 8, ramp('#3d7745'));
    c.pixel(17, 7, '#e8f07a');
    c.pixel(23, 7, '#e8f07a');
  } },
  fountain: { size: 40, draw: (c) => {
    c.shadow(20, 35, 17, 2.4, 110);
    c.ellipse(20, 28, 17, 7, STONE[2]);
    c.ellipse(20, 27, 14, 5, '#3f84c4');
    c.ellipse(17, 26, 5, 1.5, '#a9d4ff');
    stoneBlock(c, 17, 10, 6, 16);
    c.ellipse(20, 10, 6, 2, STONE[3]);
    for (const [x, y] of [[16, 8], [24, 9], [20, 5]]) c.pixel(x, y, '#a9d4ff');
  } },
  ruins: { size: 48, draw: (c) => {
    c.shadow(24, 44, 22, 3, 110);
    stoneBlock(c, 4, 26, 40, 16);
    for (const x of [6, 20, 36]) stoneBlock(c, x, 6 + (x % 3) * 4, 6, 22);
    c.rect(4, 4, 18, 4, STONE[3]);
    c.rect(4, 7, 18, 1, STONE[1]);
    for (const [x, y] of [[8, 30], [30, 34], [40, 28], [14, 40]]) c.pixel(x, y, '#5f9650');
    c.rect(18, 32, 12, 10, '#141014');
  } },
  pillar: { size: 32, draw: (c) => {
    c.shadow(16, 29, 8, 2, 100);
    stoneBlock(c, 11, 6, 10, 22);
    c.rect(9, 4, 14, 3, STONE[3]);
    c.rect(9, 27, 14, 2, STONE[1]);
    c.rect(14, 13, 4, 6, '#3a3337');
    c.pixel(15, 14, '#6f6469');
  } },
  pillarLit: { size: 32, draw: (c) => {
    ARTS.pillar.draw(c);
    c.ellipse(16, 16, 9, 12, '#ffe08a', 40);
    c.rect(14, 13, 4, 6, '#ffe08a');
    c.pixel(15, 14, '#ffffff');
  } },
  altar: { size: 40, draw: (c) => {
    c.shadow(20, 36, 16, 2.4, 110);
    stoneBlock(c, 8, 22, 24, 12);
    c.rect(6, 20, 28, 3, STONE[3]);
    c.ellipse(20, 14, 9, 9, '#ffe08a', 45);
    c.shadedEllipse(20, 14, 5, 5, ['#8a5a14', '#d99a2b', '#ffe08a', '#fff6c8']);
    for (const [x, y] of [[10, 26], [30, 26]]) c.rect(x, y, 2, 4, '#6a4a8a');
  } },
  chestSmall: { size: 32, draw: (c) => {
    c.shadow(16, 28, 10, 2, 110);
    c.rect(7, 16, 18, 11, WOOD[2]);
    c.forEllipse(16, 16, 9, 5, (x, y) => { if (y <= 16) c.pixel(x, y, WOOD[3]); });
    c.rect(7, 16, 18, 1, WOOD[0]);
    c.rect(14, 15, 4, 5, '#e8c15a');
    c.rect(8, 21, 16, 1, WOOD[0]);
  } },
  bridge: { size: 48, draw: (c) => {
    c.shadow(24, 42, 22, 2.4, 100);
    c.rect(0, 26, 48, 12, '#2f6ea8');
    for (let x = 0; x < 48; x += 6) c.pixel(x + 2, 30, '#a9d4ff');
    for (let x = 2; x < 20; x += 4) c.rect(x, 22, 3, 10, WOOD[2]);
    for (let x = 32; x < 46; x += 4) c.rect(x, 22, 3, 10, WOOD[1]);
    c.rect(2, 21, 18, 2, WOOD[0]);
    c.rect(32, 21, 14, 2, WOOD[0]);
    c.line(20, 24, 26, 34, WOOD[1]);
  } },
  bridgeFixed: { size: 48, draw: (c) => {
    c.shadow(24, 42, 22, 2.4, 100);
    c.rect(0, 26, 48, 12, '#2f6ea8');
    for (let x = 2; x < 46; x += 4) c.rect(x, 22, 3, 10, WOOD[2]);
    c.rect(2, 21, 44, 2, WOOD[0]);
    c.rect(2, 18, 2, 4, WOOD[1]);
    c.rect(44, 18, 2, 4, WOOD[1]);
  } },
  books: { size: 32, draw: (c) => {
    c.shadow(16, 29, 12, 2, 100);
    stoneBlock(c, 3, 18, 26, 10);
    for (const [x, color] of [[6, '#6b3a2a'], [10, '#2f5a8a'], [14, '#3f7a2e'], [18, '#8a3a2a'], [22, '#5a3a7a']]) {
      c.rect(x, 9, 4, 10, color);
      c.rect(x, 9, 1, 10, lighten(color, 0.3));
      c.pixel(x + 2, 12, '#e8c15a');
    }
  } },
  mural: { size: 48, draw: (c) => {
    c.shadow(24, 44, 22, 2.4, 110);
    stoneBlock(c, 2, 4, 44, 38);
    c.rect(6, 8, 36, 30, '#8a7a6a');
    for (let i = 0; i < 5; i += 1) c.shadedEllipse(12 + i * 6, 16, 2.2, 2.2, ramp(['#6a9a3c', '#3f84c4', '#8fb8b0', '#e8c13a', '#e0602a'][i]));
    c.polygon([[18, 34], [24, 22], [30, 34]], '#5a2418');
    c.rect(22, 20, 4, 3, '#ff8a3d');
  } },
  crypt: { size: 48, draw: (c) => {
    c.shadow(24, 44, 22, 2.4, 120);
    stoneBlock(c, 4, 14, 40, 28, ['#2a252a', '#3e373e', '#5a525a', '#766d76', '#9a909a']);
    c.polygon([[2, 16], [24, 2], [46, 16]], '#3e373e');
    c.rect(18, 26, 12, 16, '#0d0b0c');
    c.rect(22, 8, 4, 8, '#9a909a');
    c.rect(20, 10, 8, 2, '#9a909a');
  } },
  tomb: { size: 32, draw: (c) => {
    c.shadow(16, 29, 12, 2, 110);
    stoneBlock(c, 4, 18, 24, 10);
    c.forEllipse(16, 12, 8, 9, (x, y) => { if (y <= 18) c.pixel(x, y, y < 8 ? STONE[3] : STONE[2]); });
    c.rect(15, 7, 2, 8, STONE[1]);
    c.rect(12, 9, 8, 2, STONE[1]);
    c.shadedEllipse(16, 4, 2.5, 2.5, ['#8a5a14', '#d99a2b', '#ffe08a', '#fff6c8']);
  } },
  pond: { size: 48, draw: (c) => {
    c.shadow(24, 40, 22, 3, 70);
    c.ellipse(24, 30, 21, 10, '#d9e8f0');
    c.ellipse(24, 30, 18, 8, '#3f84c4');
    c.ellipse(20, 28, 7, 2, '#7fc0f0');
    c.rect(36, 18, 2, 12, WOOD[1]);
    c.line(37, 18, 30, 30, '#c9c1ad');
  } },
  iceCave: { size: 48, draw: (c) => {
    c.shadow(24, 44, 22, 2.6, 110);
    c.forPolygon([[1, 44], [6, 16], [18, 4], [32, 6], [44, 18], [47, 44]], (x, y) => {
      const v = -(x - 24) / 24 * 0.6 - (y - 24) / 20 * 0.8 + (dither(x, y) - 0.5) * 0.3;
      c.pixel(x, y, v > 0.5 ? '#ffffff' : v > -0.1 ? '#cfe8f5' : '#8fb8d0');
    });
    c.forEllipse(24, 36, 10, 11, (x, y) => { if (y <= 44) c.pixel(x, y, '#1a2a3a'); });
    const ice = ['#2f7fb0', '#4fa8d8', '#8fd6f5', '#e4fbff'];
    crystalShape(c, 10, 44, ice, 10);
    crystalShape(c, 38, 44, ice, 12);
  } },
  bones: { size: 32, draw: (c) => {
    c.shadow(16, 28, 13, 2, 80);
    c.ellipse(16, 24, 13, 4, '#c9a06a');
    for (const [x0, y0, x1, y1] of [[6, 22, 14, 26], [18, 21, 26, 25], [10, 26, 22, 22]]) {
      c.line(x0, y0, x1, y1, '#f4efe0');
      c.pixel(x0, y0 - 1, '#f4efe0');
      c.pixel(x1, y1 - 1, '#f4efe0');
    }
    c.shadedEllipse(22, 16, 4, 3.5, ramp('#e8e2d0'));
    c.pixel(21, 16, '#20211f');
    c.pixel(23, 16, '#20211f');
  } },
  mine: { size: 40, draw: (c) => {
    c.shadow(20, 36, 18, 2.4, 110);
    c.forPolygon([[1, 36], [5, 14], [14, 4], [26, 4], [35, 14], [39, 36]], (x, y) => {
      const v = -(x - 20) / 20 * 0.6 - (y - 20) / 16 * 0.8 + (dither(x, y) - 0.5) * 0.3;
      c.pixel(x, y, ['#7a5a3a', '#9a7a4a', '#c9a06a', '#e0c08a'][v > 0.6 ? 3 : v > 0 ? 2 : v > -0.5 ? 1 : 0]);
    });
    c.rect(11, 16, 18, 20, '#0d0b0c');
    c.rect(9, 14, 3, 22, WOOD[2]);
    c.rect(28, 14, 3, 22, WOOD[1]);
    c.rect(8, 12, 24, 3, WOOD[2]);
    c.rect(16, 30, 4, 3, '#e8b83a');
  } },
  nest: { size: 48, draw: (c) => {
    c.shadow(24, 42, 22, 2.6, 100);
    c.ellipse(24, 34, 20, 8, '#7a5a3a');
    for (let i = 0; i < 18; i += 1) {
      const a = (i / 18) * Math.PI * 2;
      c.line(24 + Math.cos(a) * 12, 34 + Math.sin(a) * 5, 24 + Math.cos(a) * 21, 34 + Math.sin(a) * 9, i % 2 ? '#9a7a4a' : '#5a3d29');
    }
    for (const x of [19, 26]) c.shadedEllipse(x, 32, 3, 3.6, ramp('#e8e2d0'));
  } },
  smoke: { size: 40, draw: (c) => {
    c.shadow(20, 37, 12, 2, 90);
    for (const [x, y, r, a] of [[20, 30, 7, 230], [17, 20, 8, 200], [23, 10, 9, 170], [18, 3, 6, 130]]) c.ellipse(x, y, r, r * 0.8, '#5a5550', a);
    c.polygon([[12, 38], [20, 28], [28, 38]], '#e0602a');
    c.polygon([[16, 38], [20, 31], [24, 38]], '#ffd76b');
  } },
  anvil: { size: 32, draw: (c) => {
    c.shadow(16, 29, 12, 2, 110);
    c.rect(8, 22, 16, 6, '#2f3237');
    c.rect(4, 16, 24, 6, '#5a5f66');
    c.rect(4, 16, 24, 1, '#9aa3ab');
    c.polygon([[28, 16], [31, 18], [28, 21]], '#5a5f66');
    c.rect(18, 6, 2, 10, WOOD[2]);
    c.rect(14, 4, 10, 4, '#7d858c');
  } },
  lavaBridge: { size: 48, draw: (c) => {
    c.shadow(24, 42, 22, 2.4, 100);
    for (let y = 26; y < 38; y += 1) {
      for (let x = 0; x < 48; x += 1) {
        const v = hash(Math.floor(x / 3), Math.floor(y / 2), 5);
        c.pixel(x, y, v > 0.7 ? '#ffd76b' : v > 0.35 ? '#e0602a' : '#8e2a14');
      }
    }
    stoneBlock(c, 0, 20, 10, 8, ['#2a2224', '#3e3437', '#5a4e52', '#6f6266', '#8a7c80']);
    stoneBlock(c, 38, 20, 10, 8, ['#2a2224', '#3e3437', '#5a4e52', '#6f6266', '#8a7c80']);
  } },
  magma: { size: 32, draw: (c) => {
    c.shadow(16, 28, 13, 2.2, 110);
    c.forPolygon([[3, 28], [6, 14], [14, 6], [24, 8], [30, 18], [28, 28]], (x, y) => {
      const v = hash(Math.floor(x / 3), Math.floor(y / 3), 9);
      c.pixel(x, y, v > 0.8 ? '#ffb04a' : v > 0.55 ? '#e0602a' : v > 0.25 ? '#4a3d38' : '#2e2624');
    });
    c.shadedEllipse(16, 18, 4, 4, ['#8e2a14', '#e0602a', '#ffb04a', '#fff0b0']);
  } },
  fortress: { size: 48, draw: (c) => {
    c.shadow(24, 45, 23, 2.6, 130);
    const dark = ['#1a1416', '#2a2224', '#3e3437', '#5a4e52', '#6f6266'];
    stoneBlock(c, 4, 14, 40, 30, dark);
    for (let x = 4; x < 44; x += 8) stoneBlock(c, x, 8, 5, 7, dark);
    stoneBlock(c, 2, 4, 9, 40, dark);
    stoneBlock(c, 37, 4, 9, 40, dark);
    c.rect(18, 28, 12, 16, '#0d0b0c');
    for (const [x, y] of [[6, 14], [41, 14], [22, 20]]) c.rect(x, y, 2, 3, '#ff8a3d');
  } },
  portal: { size: 48, draw: (c) => {
    c.shadow(24, 44, 22, 2.6, 120);
    const dark = ['#1a1416', '#2a2224', '#3e3437', '#5a4e52', '#6f6266'];
    stoneBlock(c, 4, 6, 8, 38, dark);
    stoneBlock(c, 36, 6, 8, 38, dark);
    c.rect(4, 2, 40, 6, dark[3]);
    c.forEllipse(24, 28, 12, 16, (x, y) => {
      if (y < 8) return;
      const v = hash(x, y, 4);
      c.pixel(x, y, v > 0.75 ? '#ffb04a' : v > 0.35 ? '#c0402a' : '#5a1410');
    });
  } },
  soldier: { size: 32, draw: (c) => {
    c.shadow(16, 29, 9, 2, 100);
    c.rect(8, 20, 16, 7, '#7a2a2a');
    c.rect(8, 20, 16, 1, '#a03a3a');
    c.shadedEllipse(12, 18, 4, 3.5, ramp('#d9a070'));
    c.rect(9, 14, 7, 3, '#8d8d8d');
    c.rect(20, 14, 6, 12, '#5a5f66');
    c.rect(20, 14, 6, 1, '#9aa3ab');
    c.rect(22, 18, 2, 4, '#e8c15a');
    c.rect(14, 24, 6, 1, '#f4efe0');
  } }
};

export const SITE_ART_NAMES = Object.keys(ARTS);

export function drawSiteArt(name) {
  const art = ARTS[name] ?? ARTS.sign;
  const canvas = new PixelCanvas(art.size, art.size);
  art.draw(canvas);
  return canvas.outline();
}
