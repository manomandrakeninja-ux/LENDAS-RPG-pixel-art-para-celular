import { PixelCanvas, dither, hash, mix } from './pixel.js';

// Ilustrações dos capítulos (240 x 135, ampliadas na tela com pixels nítidos).
// Recriadas em pixel art a partir das referências: fogueira, vila, cerco, templo da floresta,
// castelo da lua de sangue, cidade de gelo, deserto da caveira, fortaleza negra, forja e o Golem.

export const SCENE_SIZE = Object.freeze({ width: 240, height: 135 });
const W = SCENE_SIZE.width;
const H = SCENE_SIZE.height;

// ---------- Ferramentas ----------

/** Céu em faixas com dither entre as cores (de cima para baixo). */
function sky(c, colors, bottom = H) {
  const steps = colors.length - 1;
  for (let y = 0; y < bottom; y += 1) {
    const t = (y / Math.max(1, bottom - 1)) * steps;
    const index = Math.min(steps - 1, Math.floor(t));
    const local = t - index;
    for (let x = 0; x < W; x += 1) {
      c.pixel(x, y, local > dither(x, y) ? colors[index + 1] : colors[index]);
    }
  }
}

function fill(c, x, y, w, h, color) {
  c.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), color);
}

/** Cordilheira: silhueta irregular do ponto baseY para baixo. */
function ridge(c, baseY, color, { seed = 1, height = 20, step = 6, top = null } = {}) {
  let previous = baseY - hash(0, 0, seed) * height;
  for (let x = 0; x <= W; x += step) {
    const next = baseY - hash(x, 1, seed) * height;
    for (let dx = 0; dx < step; dx += 1) {
      const y = Math.round(previous + ((next - previous) * dx) / step);
      for (let py = y; py < H; py += 1) c.pixel(x + dx, py, color);
      if (top) c.pixel(x + dx, y, top);
    }
    previous = next;
  }
}

function stars(c, count, seed, maxY = H * 0.6, color = '#fff6d8') {
  for (let index = 0; index < count; index += 1) {
    const x = Math.floor(hash(index, 3, seed) * W);
    const y = Math.floor(hash(index, 7, seed) * maxY);
    c.pixel(x, y, color, hash(index, 9, seed) > 0.5 ? 255 : 150);
  }
}

function moon(c, x, y, r, colors) {
  c.shadedEllipse(x, y, r, r, colors, { light: [-0.4, -0.5] });
}

function pine(c, x, baseY, height, colors) {
  const [dark, mid, light] = colors;
  for (let row = 0; row < height; row += 1) {
    const half = Math.max(0, Math.round((row / height) * height * 0.32) - (row % 4 === 0 ? 1 : 0));
    for (let dx = -half; dx <= half; dx += 1) {
      c.pixel(x + dx, baseY - height + row, dx < -half / 3 ? light : dx > half / 3 ? dark : mid);
    }
  }
  fill(c, x - 1, baseY, 2, 3, '#2a1a12');
}

function roundTree(c, x, baseY, size, colors) {
  fill(c, x - 1, baseY - size, 3, size, '#3a2416');
  c.shadedEllipse(x, baseY - size - size * 0.4, size * 0.75, size * 0.6, colors);
}

/** Casinha com telhado, janelas acesas e chaminé. */
function house(c, x, y, w, h, { wall = '#8a6a4a', beam = '#4a3020', roof = '#7a4a2a', roofLight = '#a06a3a', lit = '#ffcf6a', chimney = true } = {}) {
  fill(c, x, y, w, h, wall);
  for (let bx = x; bx < x + w; bx += 5) fill(c, bx, y, 1, h, beam);
  fill(c, x, y, w, 1, beam);
  const peak = Math.round(w * 0.55);
  for (let row = 0; row < peak; row += 1) {
    const inset = row;
    for (let px = x - 2 + inset; px < x + w + 2 - inset; px += 1) c.pixel(px, y - row, row % 2 ? roof : roofLight);
  }
  for (let wx = x + 2; wx < x + w - 2; wx += 6) fill(c, wx, y + Math.round(h * 0.35), 2, 2, lit);
  fill(c, x + Math.round(w / 2) - 1, y + h - 4, 3, 4, beam);
  if (chimney) fill(c, x + w - 4, y - peak + 2, 2, 5, '#5a5050');
}

/** Castelo: muralha, torres e pináculos, com janelas acesas. */
function castle(c, cx, baseY, width, height, { color = '#1a1418', light = '#2a2228', windows = '#e0452f', spires = true } = {}) {
  const left = cx - width / 2;
  fill(c, left, baseY - height * 0.45, width, height * 0.45, color);
  for (let x = left; x < left + width; x += 4) fill(c, x, baseY - height * 0.45 - 2, 2, 2, color);
  const towers = [[0.1, 0.7, 6], [0.3, 0.85, 8], [0.5, 1, 12], [0.7, 0.85, 8], [0.9, 0.7, 6]];
  for (const [fx, fh, tw] of towers) {
    const tx = left + width * fx - tw / 2;
    const th = height * fh;
    fill(c, tx, baseY - th, tw, th, color);
    fill(c, tx, baseY - th, 1, th, light);
    if (spires) c.polygon([[tx - 1, baseY - th], [tx + tw / 2, baseY - th - tw * 1.4], [tx + tw + 1, baseY - th]], color);
    for (let wy = baseY - th + 4; wy < baseY - 6; wy += 7) {
      if (hash(Math.round(tx), Math.round(wy), 5) > 0.35) fill(c, tx + tw / 2 - 1, wy, 2, 3, windows);
    }
  }
  fill(c, cx - 4, baseY - 10, 8, 10, '#0c080a');
}

/** Pessoa vista de longe (silhueta simples, 5 x 12). */
function person(c, x, baseY, { body = '#2a2026', head = '#3a2e30', weapon = null, scale = 1 } = {}) {
  const s = scale;
  fill(c, x - 1 * s, baseY - 12 * s, 3 * s, 3 * s, head);
  fill(c, x - 2 * s, baseY - 9 * s, 5 * s, 5 * s, body);
  fill(c, x - 2 * s, baseY - 4 * s, 2 * s, 4 * s, body);
  fill(c, x + 1 * s, baseY - 4 * s, 2 * s, 4 * s, body);
  if (weapon) c.line(x + 3 * s, baseY - 7 * s, x + 6 * s, baseY - 13 * s, weapon);
}

function fire(c, x, baseY, size) {
  c.shadedEllipse(x, baseY - size * 0.5, size * 0.6, size, ['#a0281a', '#e0501e', '#ff9a2a', '#ffe27a'], { light: [0, -1] });
  c.polygon([[x - size * 0.3, baseY - size], [x, baseY - size * 2.1], [x + size * 0.3, baseY - size]], '#ffb04a');
  c.pixel(x, baseY - size * 1.4, '#fff4c0');
}

/** Brilho suave em volta de um ponto (soma de cor). */
function glow(c, x, y, radius, color, strength = 0.5) {
  for (let py = Math.floor(y - radius); py <= y + radius; py += 1) {
    for (let px = Math.floor(x - radius); px <= x + radius; px += 1) {
      if (!c.inside(px, py) || c.alphaAt(px, py) === 0) continue;
      const d = Math.hypot(px - x, py - y) / radius;
      if (d > 1) continue;
      const amount = (1 - d) * strength;
      if (amount > dither(px, py) * 0.6) c.pixel(px, py, mix(c.colorAt(px, py), color, Math.min(1, amount)));
    }
  }
}

function lavaRiver(c, points, width = 3) {
  for (let index = 0; index + 1 < points.length; index += 1) {
    const [x0, y0] = points[index];
    const [x1, y1] = points[index + 1];
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let s = 0; s <= steps; s += 1) {
      const x = x0 + ((x1 - x0) * s) / steps;
      const y = y0 + ((y1 - y0) * s) / steps;
      fill(c, x - width / 2, y - 1, width, 2, '#e2531e');
      c.pixel(x, y, '#ffce5a');
    }
  }
}

// ---------- Cenas ----------

function sceneCampfire(c) {
  sky(c, ['#04060c', '#0a1220', '#101a24']);
  stars(c, 30, 11, 60, '#5fe08a');
  // Troncos grossos da floresta escura.
  for (const [x, w] of [[20, 14], [70, 18], [150, 20], [205, 16]]) {
    fill(c, x, 0, w, H, '#2a160e');
    fill(c, x, 0, 3, H, '#4a2a16');
    for (let y = 4; y < H; y += 9) fill(c, x + 4 + (y % 3), y, 2, 4, '#1a0c08');
  }
  fill(c, 0, 108, W, H - 108, '#140c0a');
  // Fogueira e luz quente.
  fire(c, 120, 112, 9);
  for (const dx of [-8, -3, 3, 8]) fill(c, 120 + dx - 2, 112, 4, 2, '#5a3018');
  glow(c, 120, 100, 70, '#ff8a3a', 0.55);
  // Sobrevivente encostado à esquerda e cão dormindo à direita.
  fill(c, 40, 100, 20, 10, '#3a5a7a');
  fill(c, 38, 92, 8, 8, '#d9a070');
  fill(c, 36, 89, 12, 4, '#5a3a20');
  fill(c, 60, 106, 22, 4, '#3a2a1a');
  // Fragmento vermelho brilhando no peito.
  c.pixel(46, 102, '#ff3a3a');
  glow(c, 46, 102, 8, '#ff3a3a', 0.6);
  c.shadedEllipse(180, 110, 14, 5, ['#4a3020', '#7a5030', '#9a6a40', '#c08a5a']);
  // Machado cravado no tronco.
  c.line(212, 70, 218, 78, '#6a4228');
  fill(c, 216, 68, 4, 5, '#9aa0a8');
  // Olhos na escuridão.
  for (const [x, y] of [[150, 90], [154, 90], [86, 96], [90, 96]]) c.pixel(x, y, '#ff5a3a');
}

function sceneVillage(c) {
  sky(c, ['#101836', '#2a2a5a', '#d06a3a', '#ffb04a'], 70);
  moon(c, 120, 58, 9, ['#ff9a3a', '#ffc45a', '#ffe08a', '#fff4c0']);
  stars(c, 25, 21, 35);
  ridge(c, 72, '#1a2a3a', { seed: 3, height: 14 });
  for (let x = 0; x < W; x += 7) pine(c, x + 3, 82 + (x % 3), 14 + (x % 5), ['#0e2018', '#16301e', '#204028']);
  fill(c, 0, 84, W, H - 84, '#2f5a2a');
  // Rio e ponte de pedra.
  c.polygon([[110, 84], [130, 84], [150, H], [96, H]], '#2a6aa0');
  c.polygon([[115, 90], [122, 90], [128, H], [110, H]], '#4a9ad0');
  fill(c, 96, 104, 60, 6, '#6a6a6a');
  for (let x = 98; x < 154; x += 8) fill(c, x, 110, 5, 5, '#4a4a4a');
  // Casas com janelas acesas e moinho.
  house(c, 18, 96, 30, 18);
  house(c, 56, 92, 26, 16, { roof: '#6a3a1a' });
  house(c, 166, 96, 28, 18);
  house(c, 200, 90, 24, 14, { roof: '#8a5a2a' });
  fill(c, 212, 64, 5, 26, '#5a4a3a');
  c.line(214, 66, 200, 54, '#8a7a6a');
  c.line(214, 66, 228, 78, '#8a7a6a');
  c.line(214, 66, 226, 52, '#8a7a6a');
  c.line(214, 66, 202, 80, '#8a7a6a');
  fire(c, 150, 122, 4);
  for (const x of [30, 70, 180]) glow(c, x, 100, 14, '#ffb04a', 0.35);
}

function sceneSiege(c) {
  sky(c, ['#2a2a32', '#4a4a50', '#8a6a5a'], 60);
  // Fumaça e telhados em chamas.
  for (let i = 0; i < 9; i += 1) c.shadedEllipse(30 + i * 9, 30 - i * 2, 10, 6, ['#3a3a3a', '#5a5a5a', '#7a7a7a', '#8a8a8a']);
  fill(c, 0, 60, W, H - 60, '#4a6a3a');
  house(c, 6, 62, 34, 22, { wall: '#9a8a7a', roof: '#a08040', roofLight: '#c0a050' });
  house(c, 44, 58, 28, 20, { wall: '#9a8a7a', roof: '#a08040', roofLight: '#c0a050' });
  for (const x of [16, 30, 52, 64]) fire(c, x, 50, 4);
  // Paliçada de madeira e portão aberto.
  for (let x = 100; x < W; x += 5) {
    fill(c, x, 46, 4, 26, '#8a5a30');
    fill(c, x, 46, 1, 26, '#b07a40');
    c.polygon([[x, 46], [x + 2, 42], [x + 4, 46]], '#8a5a30');
  }
  fill(c, 150, 52, 22, 20, '#3a2a18');
  // Exército inimigo no horizonte.
  for (let x = 176; x < W; x += 3) fill(c, x, 38 + (x % 4), 2, 6, '#2a2a30');
  // Caminho de pedra e defensores lutando.
  c.polygon([[110, 72], [140, 72], [170, H], [70, H]], '#8a8070');
  const fighters = [[60, 100, '#5a6a7a'], [80, 116, '#7a3a2a'], [104, 96, '#5a6a7a'], [128, 110, '#3a4a3a'], [150, 124, '#5a6a7a'], [176, 104, '#7a5a3a'], [196, 120, '#5a6a7a'], [40, 124, '#7a3a2a']];
  for (const [x, y, body] of fighters) person(c, x, y, { body, head: '#c0c4c8', weapon: '#d0d4d8', scale: 1.4 });
  for (const x of [20, 214]) {
    fill(c, x, 104, 10, 12, '#6a4a2a');
    fill(c, x, 106, 10, 1, '#3a2a18');
  }
}

function sceneForestTemple(c) {
  sky(c, ['#0a1420', '#123040', '#1e5060']);
  // Templo em espiral ao fundo, com luz azul.
  fill(c, 104, 30, 32, 60, '#2a4a4a');
  for (let y = 30; y < 90; y += 6) fill(c, 104, y, 32, 1, '#1a3434');
  c.polygon([[108, 30], [120, 6], [132, 30]], '#2a4a4a');
  fill(c, 116, 60, 8, 14, '#5ae0ff');
  glow(c, 120, 66, 30, '#5ae0ff', 0.5);
  fill(c, 90, 88, 60, 12, '#2a4040');
  // Árvores enormes nas laterais.
  for (const [x, w] of [[0, 34], [206, 34]]) {
    fill(c, x, 0, w, H, '#2a1e18');
    fill(c, x + (x ? 0 : w - 4), 0, 4, H, '#4a3a2a');
  }
  for (const [x, y] of [[40, 10], [190, 14], [60, 4], [170, 6]]) c.shadedEllipse(x, y, 30, 14, ['#0e2a24', '#16403a', '#1e5a4a', '#2a7a5a']);
  // Cachoeira e lago.
  fill(c, 112, 96, 16, 14, '#8ad0e0');
  fill(c, 70, 108, 100, 10, '#2a6a8a');
  fill(c, 0, 116, W, H - 116, '#1a2a1e');
  // Cogumelos que brilham.
  for (const [x, y, s, col] of [[30, 120, 5, '#5ab0ff'], [46, 126, 3, '#ffb04a'], [196, 122, 6, '#5ab0ff'], [212, 112, 3, '#ffb04a'], [80, 124, 3, '#5ae0ff'], [160, 126, 4, '#5ae0ff']]) {
    fill(c, x - 1, y - s, 2, s, '#d0e0e0');
    c.shadedEllipse(x, y - s, s, s * 0.6, ['#1a4a8a', col, '#a0e0ff', '#ffffff']);
    glow(c, x, y - s, s * 4, col, 0.4);
  }
  stars(c, 18, 31, 90, '#9ae0ff');
}

function sceneBloodMoon(c) {
  sky(c, ['#0a0e16', '#141c28', '#1e2a36']);
  moon(c, 60, 34, 20, ['#a0201a', '#d0302a', '#ff4a3a', '#ff8a6a']);
  glow(c, 60, 34, 36, '#ff4a3a', 0.25);
  castle(c, 150, 116, 100, 96, { windows: '#ff2a2a' });
  ridge(c, 118, '#0c1016', { seed: 8, height: 8 });
  fill(c, 0, 120, W, H - 120, '#0a0c10');
  // Árvores secas.
  for (const [x, dir] of [[14, 1], [226, -1]]) {
    c.line(x, H, x, 70, '#05070a');
    c.line(x, 90, x + dir * 20, 74, '#05070a');
    c.line(x, 80, x - dir * 12, 66, '#05070a');
    c.line(x + dir * 10, 84, x + dir * 26, 92, '#05070a');
  }
  // Silhuetas de guerreiros no caminho.
  for (const [x, s] of [[120, 1.6], [134, 2], [150, 2], [164, 1.6]]) person(c, x, 132, { body: '#05070a', head: '#05070a', scale: s });
  // Dragão no topo da torre.
  c.polygon([[146, 22], [152, 14], [158, 22], [164, 16], [160, 26], [150, 26]], '#05070a');
}

function sceneFrozen(c) {
  sky(c, ['#0a1838', '#1a3a6a', '#4a7ab0']);
  // Cidade de gelo com pináculos.
  for (const [x, h, w] of [[60, 60, 10], [86, 84, 14], [120, 104, 18], [154, 84, 14], [180, 60, 10], [40, 44, 8], [200, 44, 8]]) {
    c.polygon([[x - w / 2, 110], [x - w / 2, 110 - h * 0.6], [x, 110 - h], [x + w / 2, 110 - h * 0.6], [x + w / 2, 110]], '#7ab0e0');
    c.line(x - w / 2 + 1, 110 - h * 0.6, x - w / 2 + 1, 110, '#c0e8ff');
  }
  fill(c, 110, 84, 20, 26, '#2a5a8a');
  fill(c, 116, 92, 8, 12, '#7af0ff');
  glow(c, 120, 98, 26, '#7af0ff', 0.55);
  fill(c, 0, 108, W, H - 108, '#d8ecf8');
  // Caminho de pedras escuras.
  for (let i = 0; i < 8; i += 1) fill(c, 112 - i * 6, 112 + i * 3, 10 + i, 3, '#2a3a4a');
  // Árvores com neve.
  for (const x of [16, 224]) {
    c.line(x, H, x, 70, '#3a2a2a');
    c.line(x, 86, x + (x < 100 ? 14 : -14), 72, '#3a2a2a');
    fill(c, x - 6, 72, 12, 2, '#ffffff');
  }
  // Lobisomem de armadura com machado.
  c.shadedEllipse(170, 112, 10, 9, ['#1a1a24', '#2a2a36', '#3a3a4a', '#5a5a6a']);
  c.shadedEllipse(178, 100, 6, 5, ['#2a2a36', '#4a4a5a', '#6a6a7a', '#8a8a9a']);
  c.polygon([[176, 96], [178, 90], [181, 96]], '#2a2a36');
  c.pixel(181, 99, '#ffd84a');
  c.line(186, 120, 196, 100, '#5a4a3a');
  c.polygon([[192, 102], [202, 96], [200, 108]], '#c0d0e0');
  // Neve caindo.
  for (let i = 0; i < 70; i += 1) c.pixel(Math.floor(hash(i, 1, 61) * W), Math.floor(hash(i, 2, 61) * H), '#ffffff', 200);
}

function sceneDesert(c) {
  sky(c, ['#3a8ab0', '#7ac0c8', '#f0d8a0'], 70);
  for (let i = 0; i < 6; i += 1) c.shadedEllipse(40 + i * 40, 20 + (i % 2) * 8, 26, 7, ['#5aa0c0', '#8ac8d8', '#c0e4e8', '#ffffff']);
  // Nuvem de areia em forma de caveira.
  c.shadedEllipse(150, 66, 50, 34, ['#c09060', '#e0b880', '#f0d4a0', '#fff0c8']);
  c.shadedEllipse(132, 62, 10, 11, ['#3a2020', '#4a2a28', '#5a3430', '#6a4038']);
  c.shadedEllipse(168, 62, 10, 11, ['#3a2020', '#4a2a28', '#5a3430', '#6a4038']);
  c.polygon([[146, 76], [150, 70], [154, 76]], '#4a2a28');
  for (let x = 136; x < 166; x += 5) fill(c, x, 84, 3, 8, '#4a2a28');
  fill(c, 0, 92, W, H - 92, '#e8c080');
  // Oásis e pirâmides.
  c.shadedEllipse(140, 100, 26, 5, ['#2a6a2a', '#4a9a3a', '#6aba4a', '#8ad05a']);
  c.polygon([[176, 112], [204, 70], [232, 112]], '#c06a40');
  c.polygon([[204, 70], [232, 112], [214, 112]], '#8a4428');
  c.polygon([[200, 76], [204, 70], [208, 76]], '#2a1a1a');
  // Penhasco com dois exploradores.
  c.polygon([[0, 104], [70, 110], [90, H], [0, H]], '#6a6a6a');
  c.polygon([[0, 104], [70, 110], [72, 114], [0, 110]], '#8a8a8a');
  person(c, 26, 108, { body: '#4a3020', head: '#3a2418', weapon: '#2a2a2a', scale: 1.8 });
  person(c, 52, 110, { body: '#5a3a24', head: '#3a2418', scale: 1.8 });
}

function sceneBlackFortress(c) {
  sky(c, ['#3a0808', '#8a1a14', '#c02a1a']);
  for (let i = 0; i < 8; i += 1) c.shadedEllipse(30 + i * 12, 30 + (i % 3) * 6, 16, 9, ['#0a0606', '#161010', '#221818', '#2a2020']);
  ridge(c, 96, '#2a0e0c', { seed: 15, height: 30 });
  castle(c, 128, 104, 120, 100, { color: '#100a0a', light: '#2a1414', windows: '#ff7a2a' });
  // Runas brilhando na fachada.
  for (const [x, y] of [[96, 70], [160, 70], [104, 86], [152, 86], [128, 56]]) {
    fill(c, x - 1, y - 4, 2, 8, '#ffb04a');
    glow(c, x, y, 7, '#ff9a2a', 0.5);
  }
  fill(c, 0, 104, W, H - 104, '#1a0c0a');
  lavaRiver(c, [[128, 104], [126, 118], [110, 128], [80, 134]], 5);
  lavaRiver(c, [[20, 112], [60, 120], [100, 116], [140, 124], [200, 116], [240, 120]], 3);
  glow(c, 128, 116, 40, '#ff7a2a', 0.4);
}

function sceneForge(c) {
  sky(c, ['#0e0816', '#1a1024', '#24142e']);
  // Canos, correntes e cristais roxos.
  fill(c, 0, 10, W, 6, '#2a2430');
  fill(c, 0, 10, W, 1, '#4a4054');
  for (const x of [40, 200]) c.line(x, 16, x, 50, '#3a3440');
  for (const [x, y, s] of [[16, 60, 7], [30, 68, 4], [214, 58, 6], [226, 70, 4], [60, 30, 3]]) {
    c.polygon([[x, y - s * 2], [x + s * 0.7, y], [x, y + s * 0.5], [x - s * 0.7, y]], '#a05aff');
    glow(c, x, y, s * 4, '#a05aff', 0.45);
  }
  // Fornalha em arco.
  c.shadedEllipse(170, 64, 34, 40, ['#2a1e24', '#3a2e34', '#4a3e44', '#5a4e54']);
  c.shadedEllipse(170, 70, 20, 28, ['#c0401a', '#ff7a2a', '#ffb04a', '#ffe27a']);
  glow(c, 170, 70, 60, '#ff8a3a', 0.45);
  fill(c, 0, 104, W, H - 104, '#1a1418');
  // Bigorna e ferreiro de armadura com martelo.
  fill(c, 96, 96, 34, 8, '#3a3a42');
  fill(c, 104, 104, 18, 14, '#2a2a30');
  fill(c, 92, 94, 8, 4, '#3a3a42');
  c.shadedEllipse(80, 84, 12, 16, ['#1a1a20', '#2a2a32', '#3a3a44', '#4a4a56']);
  c.shadedEllipse(80, 64, 7, 7, ['#1a1a20', '#2a2a32', '#4a4a56', '#6a6a76']);
  fill(c, 76, 64, 8, 2, '#ff8a3a');
  c.line(88, 78, 104, 70, '#5a3a20');
  fill(c, 100, 64, 8, 8, '#5a5a62');
  fill(c, 104, 94, 12, 3, '#ff9a3a');
  glow(c, 110, 95, 12, '#ffb04a', 0.6);
  for (const [x, y] of [[114, 88], [120, 84], [108, 82], [124, 90]]) c.pixel(x, y, '#ffe27a');
  // Caixas de cristais laranja.
  for (const x of [30, 196]) {
    fill(c, x, 112, 20, 12, '#3a2a20');
    c.polygon([[x + 4, 112], [x + 8, 102], [x + 12, 112]], '#ff9a2a');
    c.polygon([[x + 10, 112], [x + 14, 104], [x + 18, 112]], '#ffb04a');
    glow(c, x + 10, 108, 14, '#ff9a2a', 0.4);
  }
}

function sceneGolem(c) {
  sky(c, ['#2a3a3a', '#4a5a50', '#a0703a']);
  // Paredes do cânion com rachaduras de lava.
  c.polygon([[0, 0], [50, 0], [64, H], [0, H]], '#1a2224');
  c.polygon([[190, 0], [W, 0], [W, H], [176, H]], '#1a2224');
  for (const [x0, y0, x1, y1] of [[20, 10, 30, 60], [30, 60, 24, 100], [210, 20, 200, 70], [200, 70, 214, 110]]) {
    c.line(x0, y0, x1, y1, '#ff7a2a');
  }
  // O Golem: corpo de pedra com rachaduras, olhos acesos e machado.
  const stone = ['#24302e', '#3a4a48', '#55686a', '#76898a'];
  c.shadedEllipse(120, 66, 40, 30, stone);
  c.shadedEllipse(84, 50, 16, 14, stone);
  c.shadedEllipse(156, 50, 16, 14, stone);
  c.shadedEllipse(76, 84, 12, 22, stone);
  c.shadedEllipse(164, 84, 12, 22, stone);
  c.shadedEllipse(120, 40, 14, 14, stone);
  c.shadedEllipse(104, 108, 12, 18, stone);
  c.shadedEllipse(136, 108, 12, 18, stone);
  for (const x of [114, 126]) {
    fill(c, x - 2, 38, 4, 3, '#ffb04a');
    glow(c, x, 39, 8, '#ff7a2a', 0.7);
  }
  for (let x = 112; x < 129; x += 3) fill(c, x, 46, 2, 3, '#1a1a1a');
  for (const pts of [[[100, 56], [112, 70], [104, 86]], [[140, 56], [128, 72], [138, 88]], [[120, 60], [120, 90]], [[70, 70], [78, 90]], [[170, 70], [162, 92]]]) {
    lavaRiver(c, pts, 1);
  }
  // Machado gigante.
  c.line(70, 100, 90, 90, '#4a3a2a');
  c.polygon([[52, 96], [74, 86], [80, 110], [58, 118]], '#a0a8a8');
  c.polygon([[52, 96], [74, 86], [76, 92], [56, 100]], '#c8d0d0');
  // Chão de lava e o herói pequeno.
  fill(c, 0, 118, W, H - 118, '#1e2426');
  lavaRiver(c, [[60, 124], [100, 130], [140, 122], [200, 128]], 4);
  glow(c, 120, 126, 50, '#ff7a2a', 0.35);
  person(c, 46, 126, { body: '#2a3440', head: '#3a4450', weapon: '#c0c4c8', scale: 1.6 });
}

function sceneDawn(c) {
  sky(c, ['#2a3a6a', '#d0805a', '#ffd08a', '#fff0c0'], 90);
  moon(c, 120, 82, 16, ['#ffb04a', '#ffd06a', '#ffe8a0', '#fffbe0']);
  glow(c, 120, 82, 60, '#ffd06a', 0.3);
  ridge(c, 92, '#5a4a6a', { seed: 41, height: 20 });
  ridge(c, 102, '#3a5a3a', { seed: 42, height: 10 });
  fill(c, 0, 104, W, H - 104, '#4a7a3a');
  house(c, 24, 108, 30, 16, { lit: '#ffe8a0' });
  house(c, 64, 104, 26, 16, { lit: '#ffe8a0' });
  house(c, 150, 106, 28, 16, { lit: '#ffe8a0' });
  house(c, 190, 104, 26, 16, { lit: '#ffe8a0' });
  fire(c, 118, 126, 5);
  for (const [x, body] of [[100, '#7a3a2a'], [110, '#3a5a7a'], [128, '#3a6a3a'], [138, '#7a6a3a']]) person(c, x, 132, { body, head: '#e0b080', scale: 1.3 });
  // Pássaros.
  for (const [x, y] of [[60, 40], [70, 34], [180, 30], [190, 38]]) {
    c.pixel(x - 1, y - 1, '#3a2a3a');
    c.pixel(x, y, '#3a2a3a');
    c.pixel(x + 1, y - 1, '#3a2a3a');
  }
}

const SCENES = {
  1: sceneCampfire,
  2: sceneVillage,
  3: sceneSiege,
  4: sceneForestTemple,
  5: sceneBloodMoon,
  6: sceneFrozen,
  7: sceneDesert,
  8: sceneBlackFortress,
  9: sceneForge,
  10: sceneGolem,
  final: sceneDawn
};

export const STORY_SCENE_KEYS = Object.freeze(Object.keys(SCENES));

/** Desenha a ilustração do capítulo (1–10) ou do final ('final'). */
export function drawStoryScene(key) {
  const c = new PixelCanvas(W, H);
  (SCENES[key] ?? sceneCampfire)(c);
  return c;
}
