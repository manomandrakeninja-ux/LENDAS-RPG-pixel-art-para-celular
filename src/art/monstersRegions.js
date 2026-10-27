import { hash } from './pixel.js';
import { DEEP_DRAWERS, DEEP_MONSTER_SIZES } from './monstersDeep.js';

// Monstros das regiões novas (vale, floresta antiga, brejo, picos gelados,
// deserto, ilha vulcânica e ilha esmeralda) e os chefes de cada região.
// Mesmo estilo de monsters.js: luz do alto à esquerda, rampas de 4 tons,
// virados para a direita, 2 quadros. O contorno escuro vem de drawMonsterFrame.

/** Membro grosso (braço, perna, galho) entre dois pontos. */
function limb(g, x0, y0, x1, y1, width, color) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length = Math.hypot(dx, dy) || 1;
  const nx = (-dy / length) * (width / 2);
  const ny = (dx / length) * (width / 2);
  g.polygon([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], color);
}

/** Olho brilhante: miolo claro e um ponto de luz. */
function glowEye(g, x, y, color, core = '#ffffff', width = 2) {
  g.rect(x, y, width, 1, color);
  g.pixel(x + width - 1, y, core);
}

// ======================= VALE =======================

// ---------- Rato (cinza-marrom, cauda e orelhas rosadas) ----------

function drawRat(g, frame, elite) {
  const fur = elite ? ['#2e2630', '#4e4250', '#6e6070', '#968a96'] : ['#463a3c', '#76665e', '#9a8878', '#c2b29e'];
  const pink = '#e09a9a';
  const step = frame === 1 ? 1 : -1;
  g.shadow(14, 25, 10, 2, 100);
  // Cauda longa e pelada.
  g.line(6, 21, 3, 20, pink);
  g.line(3, 20, 1, 17 + step, pink);
  g.line(1, 17 + step, 2, 14 + step, '#c07a7a');
  // Patas.
  for (const [x, lift, far] of [[7, step, true], [10, -step, false], [17, -step, true], [20, step, false]]) {
    const up = Math.max(0, lift);
    g.rect(x, 22, 2, 2 - up, far ? fur[0] : fur[1]);
    g.rect(x, 24 - up, 3, 1, pink);
  }
  // Corpo arredondado e barriga clara.
  g.shaded(12, 18, 8, 5.5, fur);
  g.line(7, 22, 16, 22, fur[2]);
  for (const x of [7, 10, 13]) g.pixel(x, 14 + (x % 2), fur[0]);
  // Cabeça e focinho pontudo.
  g.shaded(19, 17, 4.5, 4, fur);
  g.polygon([[21, 16], [27, 18.5], [26, 21], [20, 21]], fur[2]);
  g.line(21, 16, 26, 18, fur[3]);
  g.pixel(27, 19, pink);
  g.pixel(26, 18, '#f4c0c0');
  // Bigodes e dentes.
  g.pixel(25, 21, '#d8d0c0');
  g.pixel(23, 22, '#fff4e0');
  g.pixel(24, 22, '#fff4e0');
  // Orelha redonda rosada.
  g.shaded(17, 12.5, 2.6, 2.6, [fur[0], fur[1], pink, '#f6c8c8']);
  g.pixel(17, 13, '#c07a7a');
  // Olho vermelho.
  g.rect(21, 15, 2, 2, '#1a1014');
  g.pixel(21, 15, elite ? '#ffe04a' : '#e8403a');
  if (elite) {
    // Coleira de espinhos.
    g.line(15, 19, 17, 14, '#3a3036');
    for (const [x, y] of [[15, 19], [16, 17], [17, 15]]) g.pixel(x - 1, y, '#c9ccd2');
  }
}

// ---------- Cobra (verde, enrolada, cabeça erguida) ----------

function drawSnake(g, frame, elite) {
  const scale = elite ? ['#4a1426', '#8a2236', '#c0463e', '#f08a6a'] : ['#1c4424', '#357a36', '#5ea648', '#a6d67a'];
  const belly = elite ? '#f0c060' : '#e0d48a';
  const bob = frame === 1 ? 1 : 0;
  g.shadow(15, 28, 12, 2.4, 105);
  // Espiras do corpo, de baixo para cima.
  g.shaded(14, 25, 11, 3.8, scale);
  g.shaded(13, 21, 8.5, 3.4, scale);
  g.shaded(15, 18, 5, 2.6, scale);
  // Manchas em losango nas espiras.
  for (const [x, y] of [[6, 25], [11, 26], [16, 26], [21, 25], [8, 21], [13, 22], [18, 21]]) {
    g.pixel(x, y, scale[0]);
    g.pixel(x + 1, y - 1, scale[0]);
    g.pixel(x + 1, y, scale[3]);
  }
  g.line(4, 27, 24, 27, belly);
  // Pescoço em S até a cabeça.
  const neck = [[18, 17], [20, 15], [21, 13], [21, 11], [22, 9]];
  neck.forEach(([x, y], index) => {
    const lift = Math.round(bob * (index / 4));
    g.shaded(x, y - lift, 2.8, 2.4, scale);
    g.pixel(x + 2, y - lift, belly);
  });
  // Cabeça triangular.
  const hy = 7 - bob;
  g.shaded(24, hy, 4.5, 3, scale);
  g.polygon([[25, hy - 2], [30, hy], [29, hy + 2], [23, hy + 2.5]], scale[1]);
  g.line(25, hy - 2, 29, hy, scale[2]);
  g.line(24, hy + 2, 29, hy + 2, belly);
  // Olho de fenda.
  g.rect(25, hy - 1, 2, 1, '#f2d24a');
  g.pixel(26, hy - 1, '#141014');
  g.pixel(29, hy, '#1a1014');
  // Língua bifurcada (só num quadro, como se sibilasse).
  if (frame === 0) {
    g.line(30, hy + 1, 31, hy + 1, '#d8323a');
    g.pixel(31, hy, '#d8323a');
    g.pixel(31, hy + 2, '#d8323a');
  }
  if (elite) {
    // Capuz de naja aberto.
    g.polygon([[19, 6 - bob], [17, 12], [21, 15], [23, 9 - bob]], scale[0]);
    g.pixel(20, 10, '#f0c060');
    g.pixel(19, 12, '#f0c060');
  }
}

// ---------- Morcego (roxo-escuro, asas batendo) ----------

function drawBat(g, frame, elite) {
  const body = elite ? ['#2a0e14', '#4e1a24', '#7a2a36', '#a84a52'] : ['#1e1428', '#3a2648', '#5a3e6a', '#86669a'];
  const membrane = elite ? '#5a1a26' : '#3e2650';
  const bone = elite ? '#8a3a44' : '#6a4a7e';
  const up = frame === 0;
  const lift = up ? -2 : 1;
  g.shadow(16, 30, 6, 1.4, 55);
  // Asas: para cima num quadro, para baixo no outro.
  const left = up
    ? [[13, 12], [9, 5], [3, 2], [4, 7], [1, 10], [5, 11], [3, 15], [12, 16]]
    : [[13, 13], [8, 13], [2, 17], [6, 18], [4, 22], [9, 19], [10, 22], [13, 17]];
  const right = left.map(([x, y]) => [32 - x, y]);
  g.polygon(left, membrane);
  g.polygon(right, membrane);
  for (const wing of [left, right]) {
    g.line(wing[0][0], wing[0][1], wing[2][0], wing[2][1], bone);
    g.line(wing[0][0], wing[0][1], wing[4][0], wing[4][1], bone);
    g.line(wing[0][0], wing[0][1], wing[6][0], wing[6][1], bone);
  }
  // Corpo peludo.
  g.shaded(16, 14 + lift / 2, 4.5, 5.5, body);
  g.pixel(15, 18 + lift / 2, body[2]);
  // Orelhas pontudas.
  g.polygon([[12, 10], [12, 4 + lift / 2], [15, 9]], body[1]);
  g.polygon([[17, 9], [20, 4 + lift / 2], [20, 10]], body[2]);
  // Olhos e presas.
  g.rect(13, 12, 2, 1, '#ff4a4a');
  g.rect(17, 12, 2, 1, '#ff4a4a');
  g.pixel(14, 12, '#ffd0c0');
  g.pixel(18, 12, '#ffd0c0');
  g.pixel(15, 15, '#ffffff');
  g.pixel(17, 15, '#ffffff');
  // Pezinhos.
  g.pixel(14, 20, body[0]);
  g.pixel(17, 20, body[0]);
  if (elite) {
    g.pixel(3, up ? 2 : 17, '#ff8a6a');
    g.pixel(28, up ? 2 : 17, '#ff8a6a');
  }
}

// =================== FLORESTA ANTIGA ===================

// ---------- Goblin (verde, orelhonas, adaga enferrujada) ----------

function drawGoblin(g, frame, elite) {
  const skin = ['#2e5a24', '#4e8a34', '#78b44a', '#b0d878'];
  const rag = ['#4a2e1a', '#6e4626', '#8e6034', '#b07e4a'];
  const step = frame === 1 ? 1 : -1;
  g.shadow(16, 30, 7, 2, 105);
  // Pernas curtas e pés descalços.
  for (const [x, lift, far] of [[13, step, true], [17, -step, false]]) {
    const up = Math.max(0, lift);
    g.rect(x, 24, 2, 5 - up, far ? skin[0] : skin[1]);
    g.rect(x, 29 - up, 4, 1, far ? '#1e3a18' : skin[0]);
  }
  // Braço de trás.
  limb(g, 11, 18, 9, 24 - step, 2.4, skin[0]);
  g.pixel(9, 24 - step, skin[1]);
  // Trapo de couro e cinto de corda.
  g.polygon([[11, 16], [21, 16], [22, 25], [19, 24], [16, 26], [13, 24], [10, 25]], rag[1]);
  g.line(11, 16, 11, 24, rag[2]);
  g.line(12, 21, 21, 21, rag[0]);
  g.pixel(16, 21, '#c8a060');
  for (const [x, y] of [[13, 18], [18, 19], [15, 23]]) g.pixel(x, y, rag[3]);
  // Braço da frente com a adaga.
  limb(g, 20, 17, 24, 21 + step, 2.4, skin[1]);
  g.shaded(24.5, 21.5 + step, 1.6, 1.6, skin);
  g.line(25, 20 + step, 29, 14 + step, '#a8806a');
  g.line(26, 20 + step, 30, 14 + step, '#7a5a4a');
  g.pixel(30, 13 + step, '#d8c0a8');
  g.rect(23, 21 + step, 3, 1, '#4a2e1a');
  // Cabeça grande e orelhas compridas.
  g.polygon([[11, 10], [3, 6], [5, 9], [11, 14]], skin[1]);
  g.line(5, 8, 10, 11, '#d88a7a');
  g.shaded(16, 11, 5.5, 5, skin);
  g.polygon([[20, 9], [29, 5], [27, 8], [21, 13]], skin[2]);
  g.line(22, 10, 27, 7, '#e09a8a');
  // Nariz adunco, olhos amarelos e sorriso de dentes tortos.
  g.polygon([[19, 11], [24, 13], [20, 14]], skin[2]);
  g.pixel(23, 13, skin[0]);
  g.rect(16, 9, 2, 1, '#f0e04a');
  g.rect(19, 9, 2, 1, '#f0e04a');
  g.pixel(17, 9, '#1a1414');
  g.pixel(20, 9, '#1a1414');
  g.line(15, 8, 18, 8, skin[0]);
  g.line(16, 15, 20, 15, '#2a1a1a');
  g.pixel(17, 15, '#f4ecd0');
  g.pixel(19, 15, '#f4ecd0');
  if (elite) {
    // Panela de ferro como elmo e uma pena vermelha.
    g.each(16, 7, 6.5, 3.5, (x, y, nx, ny) => {
      if (ny < 0.3) g.raw.pixel(x, y, ny < -0.4 ? '#9aa0a8' : '#626870');
    });
    g.line(10, 8, 22, 8, '#3a3e44');
    g.line(13, 4, 9, 0, '#d8323a');
    g.pixel(10, 1, '#ff7a6a');
  }
}

// ---------- Orc (verde-acinzentado, presas, machado) ----------

function drawOrc(g, frame, elite) {
  const skin = ['#34442c', '#566a44', '#7a9062', '#a6ba86'];
  const leather = ['#3a2416', '#5e3a22', '#80522e', '#a8704a'];
  const metal = ['#4a4e56', '#7a808a', '#aab0b8', '#e4e8ec'];
  const step = frame === 1 ? 1 : -1;
  g.shadow(22, 42, 12, 2.6, 115);
  // Pernas grossas com calça escura e botas.
  for (const [x, lift, far] of [[17, step, true], [25, -step, false]]) {
    const up = Math.max(0, lift);
    limb(g, x, 31, x - (far ? 1 : -1), 39 - up, 4.4, far ? '#2a2420' : '#3e342c');
    g.rect(x - 3, 39 - up, 6, 2, far ? '#1a1410' : leather[0]);
    g.rect(x - 3, 39 - up, 6, 1, leather[1]);
  }
  // Braço de trás.
  limb(g, 14, 19, 10, 29 - step, 4, skin[0]);
  g.shaded(10, 30 - step, 2.6, 2.4, [skin[0], skin[0], skin[1], skin[2]]);
  // Tronco musculoso.
  g.shaded(22, 24, 9.5, 9, skin);
  // Armadura de couro: peitoral cruzado, cinto e saiote.
  g.polygon([[14, 22], [30, 22], [29, 31], [15, 31]], leather[1]);
  g.line(14, 22, 30, 22, leather[2]);
  g.line(15, 25, 29, 25, leather[0]);
  g.line(15, 28, 29, 28, leather[0]);
  for (const x of [18, 22, 26]) g.pixel(x, 23, metal[2]);
  g.rect(14, 31, 16, 2, leather[0]);
  g.rect(21, 31, 3, 2, '#c8a040');
  g.polygon([[15, 33], [29, 33], [30, 36], [14, 36]], leather[2]);
  g.line(19, 33, 19, 36, leather[0]);
  g.line(25, 33, 25, 36, leather[0]);
  // Ombreira de metal no ombro da frente.
  g.shaded(29, 17, 4.5, 3.5, metal);
  g.pixel(28, 15, metal[3]);
  // Braço da frente segurando o machado.
  limb(g, 30, 19, 34, 28 + step, 4.2, skin[1]);
  g.shaded(35, 29 + step, 2.6, 2.6, skin);
  g.line(33, 37 + step, 38, 12 + step, leather[0]);
  g.line(34, 37 + step, 39, 12 + step, leather[2]);
  g.polygon([[37, 10 + step], [43, 7 + step], [43, 20 + step], [38, 17 + step]], metal[1]);
  g.line(42, 8 + step, 42, 19 + step, metal[3]);
  g.line(38, 11 + step, 41, 9 + step, metal[2]);
  // Cabeça com mandíbula larga.
  g.shaded(24, 11, 6.5, 6, skin);
  g.rect(21, 14, 9, 3, skin[1]);
  g.line(21, 16, 29, 16, skin[0]);
  // Presas para cima.
  g.pixel(23, 14, '#f4ecd0');
  g.pixel(23, 13, '#ffffff');
  g.pixel(28, 14, '#f4ecd0');
  g.pixel(28, 13, '#ffffff');
  // Olhos vermelhos e testa franzida.
  g.line(23, 8, 29, 9, skin[0]);
  g.rect(25, 9, 2, 1, '#e8302a');
  g.pixel(26, 9, '#ffb0a0');
  g.pixel(29, 12, skin[0]);
  // Rabo de cavalo preto.
  g.polygon([[19, 6], [15, 8], [14, 14], [17, 11], [20, 9]], '#1a1418');
  g.pixel(17, 7, '#3a3036');
  if (elite) {
    // Pintura de guerra e brinco de osso.
    g.line(22, 11, 29, 11, '#c8302a');
    g.pixel(19, 13, '#f0e8d0');
    g.pixel(19, 14, '#f0e8d0');
  }
}

// ---------- Urso (marrom, grande, em quatro patas) ----------

function drawBear(g, frame, elite) {
  const fur = elite ? ['#2a2a30', '#4e4a4e', '#78726c', '#a49c90'] : ['#3a2216', '#6a4028', '#8e5a36', '#b07a50'];
  const snout = elite ? '#bcb0a0' : '#c49a6c';
  const step = frame === 1 ? 1 : -1;
  g.shadow(26, 48, 21, 3, 120);
  // Patas grossas com garras.
  for (const [x, lift, far] of [[11, step, true], [17, -step, false], [33, -step, true], [39, step, false]]) {
    const up = Math.max(0, lift);
    g.rect(x, 37, 5, 9 - up, far ? fur[0] : fur[1]);
    g.rect(x, 37, 1, 7 - up, far ? fur[0] : fur[2]);
    g.rect(x - 1, 45 - up, 6, 2, far ? '#1e120c' : fur[0]);
    for (const c of [0, 2, 4]) g.pixel(x + c, 46 - up, '#e8dcc4');
  }
  // Corpo enorme com corcova.
  g.shaded(25, 32, 18, 11, fur);
  g.shaded(31, 24, 9, 6, fur);
  g.line(10, 41, 38, 41, fur[0]);
  // Textura de pelo.
  for (let y = 24; y < 40; y += 3) {
    for (let x = 10; x < 40; x += 4) {
      if (hash(x, y, 31) > 0.55) g.line(x, y, x + 1, y + 1, fur[0]);
    }
  }
  g.pixel(9, 30, fur[1]);
  // Cabeça, orelhas redondas e focinho claro.
  g.shaded(42, 28, 7.5, 7, fur);
  g.shaded(38, 21, 2.6, 2.6, fur);
  g.shaded(44, 20.5, 2.6, 2.6, fur);
  g.pixel(38, 21, fur[0]);
  g.pixel(44, 21, fur[0]);
  g.polygon([[45, 28], [51, 30], [50, 34], [44, 34]], snout);
  g.line(46, 28, 50, 30, '#e0c098');
  g.rect(49, 29, 2, 2, '#1a1012');
  g.pixel(49, 29, '#6a5a5a');
  g.line(45, 34, 50, 34, '#2a1612');
  g.pixel(47, 35, '#ffffff');
  // Olho pequeno.
  g.rect(44, 25, 2, 2, '#1a1012');
  g.pixel(44, 25, '#fff0d0');
  if (elite) {
    // Cicatrizes de garra no ombro.
    for (const dx of [0, 2, 4]) g.line(28 + dx, 22, 31 + dx, 28, '#c86a5a');
  }
}

// ---------- Ent (árvore que anda, olhos brilhando) ----------

function drawTreant(g, frame, elite) {
  const bark = ['#2e1e14', '#4e3420', '#6e4a2e', '#8e6640'];
  const leaf = elite ? ['#4a2a10', '#8a4a1a', '#c8742a', '#f0b25a'] : ['#1e3e1e', '#2e6a2e', '#4e9a3e', '#8ac85a'];
  const step = frame === 1 ? 1 : -1;
  const sway = frame === 1 ? 1 : 0;
  g.shadow(28, 53, 17, 3, 125);
  // Raízes que servem de pernas.
  for (const [points, far] of [[[[20, 40], [25, 40], [21, 52], [15, 53]], true], [[[30, 40], [36, 40], [39, 53], [32, 52]], false]]) {
    const lift = far ? Math.max(0, step) : Math.max(0, -step);
    g.polygon(points.map(([x, y]) => [x, y - (y > 50 ? lift : 0)]), far ? bark[0] : bark[1]);
  }
  g.line(15, 53, 12, 54, bark[0]);
  g.line(39, 53, 43, 54, bark[1]);
  // Galho-braço de trás.
  limb(g, 20, 26, 10, 34, 4, bark[0]);
  limb(g, 10, 34, 7, 43 - step, 3, bark[0]);
  g.line(10, 34, 5, 32, bark[0]);
  g.line(7, 43 - step, 5, 46 - step, bark[0]);
  g.line(7, 43 - step, 9, 46 - step, bark[0]);
  // Tronco com veios.
  g.polygon([[18, 22], [38, 22], [37, 44], [19, 44]], bark[1]);
  g.polygon([[18, 22], [23, 22], [23, 44], [19, 44]], bark[2]);
  for (let x = 20; x < 37; x += 3) {
    for (let y = 23; y < 43; y += 2) {
      if (hash(x, y, 8) > 0.5) g.line(x, y, x, y + 1, hash(x, y, 9) > 0.5 ? bark[0] : bark[3]);
    }
  }
  // Musgo.
  for (const [x, y] of [[20, 41], [21, 42], [35, 30], [36, 31], [26, 24]]) g.pixel(x, y, '#5a8a3a');
  // Galho-braço da frente.
  limb(g, 36, 26, 46, 32 + step, 4, bark[1]);
  limb(g, 46, 32 + step, 51, 26 + step, 3, bark[2]);
  g.line(46, 32 + step, 50, 37 + step, bark[1]);
  g.shaded(51, 24 + step, 3.5, 3, leaf);
  // Copa de folhas.
  for (const [x, y, rx, ry] of [[28, 17, 11, 5], [16, 15, 7, 5.5], [40, 15, 7, 5.5], [22, 7, 7, 5], [35, 8, 7, 5], [28, 11, 9, 6], [11, 19, 4, 3], [45, 19, 4, 3], [29, 3, 4, 3]]) {
    g.shaded(x + sway, y, rx, ry, leaf);
  }
  // Sombra por baixo da copa e galhos aparecendo.
  g.line(19 + sway, 21, 37 + sway, 21, leaf[0]);
  g.line(24, 21, 21, 16, bark[1]);
  g.line(33, 21, 37, 15, bark[1]);
  for (let index = 0; index < 22; index += 1) {
    const x = 14 + Math.floor(hash(index, 1, 40) * 30) + sway;
    const y = 4 + Math.floor(hash(index, 2, 40) * 18);
    g.pixel(x, y, hash(index, 3, 40) > 0.5 ? leaf[3] : leaf[0]);
  }
  // Rosto no tronco: buracos de olhos brilhando e boca oca.
  g.rect(23, 27, 4, 3, '#140c08');
  g.rect(30, 27, 4, 3, '#140c08');
  glowEye(g, 24, 28, elite ? '#ff8a2a' : '#c8f05a', elite ? '#ffe0a0' : '#f4ffc0');
  glowEye(g, 31, 28, elite ? '#ff8a2a' : '#c8f05a', elite ? '#ffe0a0' : '#f4ffc0');
  g.line(22, 26, 27, 26, bark[0]);
  g.line(29, 26, 34, 26, bark[0]);
  g.polygon([[25, 34], [32, 34], [31, 38], [26, 38]], '#140c08');
  g.pixel(27, 34, bark[3]);
  g.pixel(30, 34, bark[3]);
}

// ======================= BREJO =======================

// ---------- Sapo-boi (enorme, cheio de verrugas) ----------

function drawFrog(g, frame, elite) {
  const skin = elite ? ['#3a1e3a', '#6a3a5a', '#9a5a7a', '#c88aa0'] : ['#2e3e1a', '#4e6a2a', '#728e3a', '#a2b85a'];
  const belly = elite ? '#e8c0a0' : '#d0c88a';
  const puff = frame === 1;
  g.shadow(18, 33, 14, 2.5, 115);
  // Perna de trás dobrada.
  g.shaded(8, 26, 5.5, 4.5, skin);
  g.rect(3, 30, 7, 2, skin[0]);
  for (const x of [3, 5, 7]) g.pixel(x, 32, skin[1]);
  // Corpo largo e barriga clara.
  g.shaded(16, 24, 12, 8.5, skin);
  g.each(16, 24, 12, 8.5, (x, y, nx, ny) => {
    if (ny > 0.35 && nx > -0.3) g.raw.pixel(x, y, ny > 0.75 ? '#a89a5a' : belly);
  });
  // Cabeça na frente.
  g.shaded(26, 20, 7.5, 6, skin);
  // Verrugas.
  for (let index = 0; index < 14; index += 1) {
    const x = 7 + Math.floor(hash(index, 1, 55) * 24);
    const y = 16 + Math.floor(hash(index, 2, 55) * 9);
    g.pixel(x, y, skin[0]);
    g.pixel(x, y - 1, skin[3]);
  }
  // Papo inflando.
  if (puff) g.shaded(28, 27, 4.5, 3.5, ['#a89a4a', '#e0d070', '#f4e8a0', '#ffffff']);
  // Olhos saltados.
  for (const x of [22, 28]) {
    g.shaded(x, 14, 3, 3, skin);
    g.rect(x - 1, 13, 3, 2, elite ? '#ff6a3a' : '#e8b83a');
    g.rect(x - 1, 14, 3, 1, '#141008');
    g.pixel(x - 1, 13, '#fff4c0');
  }
  // Boca larga.
  g.line(22, 24, 34, 21, skin[0]);
  g.line(33, 21, 34, 20, skin[0]);
  g.pixel(33, 19, '#141008');
  // Patas da frente.
  for (const x of [24, 29]) {
    g.rect(x, 29, 2, 3, skin[1]);
    g.rect(x - 1, 32, 4, 1, skin[0]);
  }
}

// ---------- Afogado (zumbi do brejo com algas) ----------

function drawZombie(g, frame, elite) {
  const skin = ['#2e4a46', '#4e7a6a', '#72a08a', '#a0c8b0'];
  const rag = ['#2e2a22', '#4e4636', '#6e624a', '#8e8060'];
  const weed = '#3a7a3a';
  const step = frame === 1 ? 1 : -1;
  const sway = frame === 1 ? 1 : 0;
  g.shadow(20, 38, 8, 2, 110);
  // Pernas arrastando, calça rasgada.
  for (const [x0, x1, lift, far] of [[17, 15, step, true], [22, 24, -step, false]]) {
    const up = Math.max(0, lift);
    limb(g, x0, 27, x1, 36 - up, 3, far ? skin[0] : skin[1]);
    limb(g, x0, 27, (x0 + x1) / 2, 31, 3.4, far ? '#2a3440' : '#3a4a5a');
    g.rect(x1 - 1, 36 - up, 4, 1, far ? '#1a2a28' : skin[0]);
  }
  // Braço de trás estendido.
  limb(g, 16, 17, 30, 20 + sway, 2.6, skin[0]);
  for (const dy of [-1, 0, 1]) g.pixel(31, 20 + sway + dy, skin[1]);
  // Tronco com trapos rasgados.
  g.polygon([[14, 15], [25, 15], [26, 27], [24, 25], [22, 28], [19, 25], [16, 28], [13, 26]], rag[1]);
  g.line(14, 15, 14, 25, rag[2]);
  for (const [x, y] of [[17, 18], [21, 21], [16, 23]]) {
    g.rect(x, y, 2, 2, skin[1]);
    g.pixel(x, y, skin[2]);
  }
  g.line(13, 21, 25, 21, rag[0]);
  // Braço da frente estendido.
  limb(g, 23, 17, 33, 22 - sway, 2.8, skin[1]);
  g.line(23, 16, 32, 21 - sway, skin[2]);
  for (const dy of [-1, 0, 1]) g.pixel(34, 22 - sway + dy, skin[2]);
  // Cabeça caída para a frente.
  g.shaded(20, 10 + sway, 5.5, 5.5, skin);
  g.rect(19, 13 + sway, 6, 2, '#1a1a14');
  g.pixel(20, 13 + sway, '#e8e0c0');
  g.pixel(23, 13 + sway, '#e8e0c0');
  g.rect(21, 8 + sway, 2, 2, '#141a18');
  g.pixel(22, 8 + sway, elite ? '#ff6a4a' : '#e8f0a0');
  g.rect(17, 8 + sway, 2, 2, '#141a18');
  // Cabelo ralo e algas penduradas.
  g.line(15, 7 + sway, 22, 4 + sway, '#1e2a20');
  g.line(16, 6 + sway, 14, 12 + sway, weed);
  g.line(15, 16, 13, 24, weed);
  g.line(25, 16, 26, 22, weed);
  g.pixel(12, 25, '#5aa04a');
  // Gotas de água.
  g.pixel(18, 30 + sway, '#7ac8e8');
  g.pixel(26, 26 - sway, '#7ac8e8');
  if (elite) {
    // Âncora enferrujada presa por corrente.
    g.line(24, 27, 28, 33, '#5a4a40');
    g.polygon([[26, 33], [31, 33], [28.5, 36]], '#8a5a3a');
  }
}

// ---------- Bruxa do brejo (curvada, chapéu, cajado verde) ----------

function drawWitch(g, frame, elite) {
  const cloak = elite ? ['#2a0a14', '#4e1424', '#7a2436', '#a8404e'] : ['#1e1428', '#3a2648', '#5a3e6a', '#7a5a8a'];
  const face = ['#2a5a2a', '#4a8a3a', '#6ab04a', '#9ad070'];
  const orb = elite ? ['#8a1a2a', '#e04a4a', '#ff9a8a', '#ffffff'] : ['#1e6a2a', '#4ad04a', '#a8ff8a', '#ffffff'];
  const wave = frame === 1 ? 1 : -1;
  const bob = frame === 1 ? 1 : 0;
  g.shadow(19, 38, 6, 1.4, 50);
  // Capa flutuante com barra rasgada.
  g.polygon([[11, 15 + bob], [24, 15 + bob], [27, 30 + bob], [24, 33 + wave + bob], [20, 30 + bob], [16, 34 - wave + bob], [11, 31 + bob], [9, 24 + bob]], cloak[1]);
  g.polygon([[11, 15 + bob], [15, 15 + bob], [14, 31 + bob], [11, 31 + bob], [9, 24 + bob]], cloak[2]);
  g.line(17, 18 + bob, 19, 30 + bob, cloak[0]);
  // Corcunda.
  g.shaded(15, 16 + bob, 6.5, 5, cloak);
  // Cabelo grisalho escorrido.
  g.polygon([[17, 9 + bob], [14, 12 + bob], [13, 19 + bob], [16, 16 + bob], [19, 12 + bob]], '#8a8a90');
  g.line(14, 13 + bob, 14, 18 + bob, '#b0b0b8');
  // Rosto verde, nariz comprido com verruga e queixo pontudo.
  g.shaded(22, 12 + bob, 3.8, 3.8, face);
  g.polygon([[24, 11 + bob], [29, 14 + bob], [24, 14 + bob]], face[2]);
  g.pixel(27, 13 + bob, face[0]);
  g.polygon([[21, 15 + bob], [24, 15 + bob], [23, 18 + bob]], face[1]);
  g.rect(23, 10 + bob, 2, 1, '#f0e04a');
  g.pixel(24, 10 + bob, '#1a1408');
  g.line(22, 16 + bob, 24, 16 + bob, '#1a2a14');
  // Chapéu pontudo com a ponta caída para trás.
  g.line(14, 9 + bob, 28, 8 + bob, cloak[0]);
  g.line(14, 8 + bob, 28, 7 + bob, cloak[1]);
  g.polygon([[16, 8 + bob], [25, 8 + bob], [20, 2 + bob], [14, 1 + bob], [12, 3 + bob], [17, 4 + bob]], cloak[1]);
  g.line(18, 7 + bob, 22, 3 + bob, cloak[2]);
  g.rect(17, 6 + bob, 8, 1, elite ? '#e8c040' : '#6a8a3a');
  // Cajado torto com orbe brilhando.
  g.line(28, 35 + bob, 31, 7 + bob, '#4a2e1a');
  g.line(29, 35 + bob, 32, 7 + bob, '#7a5232');
  g.ellipse(32, 5 + bob, 4.5, 4.5, orb[2], 70);
  g.shaded(32, 5 + bob, 2.5, 2.5, orb);
  g.pixel(35, 1 + bob + wave, orb[2]);
  g.pixel(28, 2 + bob - wave, orb[2]);
  // Mão ossuda no cajado.
  g.rect(28, 18 + bob, 3, 2, face[1]);
  g.pixel(28, 18 + bob, face[2]);
}

// =================== PICOS GELADOS ===================

// ---------- Lobo do gelo (branco-azulado, juba de cristais) ----------

function drawFrostWolf(g, frame, elite) {
  const fur = elite ? ['#4a5a8a', '#7a9ad0', '#b0ccf0', '#eaf4ff'] : ['#7890b0', '#b4c8de', '#dce8f4', '#ffffff'];
  const ice = ['#3a7ab0', '#6ab4e8', '#b8e8ff', '#ffffff'];
  const leg = ['#5a6e8a', '#8aa0bc', '#b0c4dc'];
  const step = frame === 1 ? 1 : -1;
  g.shadow(22, 40, 17, 2.5, 110);
  // Cauda.
  g.polygon([[10, 21], [5, 21], [2, 24], [1, 29], [3, 31], [5, 28], [7, 25], [10, 24]], fur[1]);
  g.line(5, 22, 2, 25, fur[3]);
  g.pixel(1, 29, ice[2]);
  // Patas de trás.
  for (const [x, lift, far] of [[10, step, true], [14, -step, false]]) {
    const up = Math.max(0, lift);
    const color = far ? leg[0] : leg[1];
    g.line(x + 1, 30, x - 1, 34 - up, color);
    g.line(x + 2, 30, x, 34 - up, color);
    g.line(x - 1, 34 - up, x, 38 - up, color);
    g.line(x, 34 - up, x + 1, 38 - up, color);
    g.rect(x - 1, 38 - up, 4, 1, far ? '#3a4a60' : leg[0]);
  }
  // Patas da frente.
  for (const [x, lift, far] of [[31, -step, true], [35, step, false]]) {
    const up = Math.max(0, lift);
    g.rect(x, 30, 2, 8 - up, far ? leg[0] : leg[1]);
    g.pixel(x, 31, far ? leg[1] : leg[2]);
    g.rect(x, 38 - up, 3, 1, far ? '#3a4a60' : leg[0]);
  }
  // Corpo.
  g.shaded(13, 26, 5.5, 5, fur);
  g.shaded(22, 24, 12, 6, fur);
  g.line(16, 29, 26, 28, fur[0]);
  g.shaded(31, 25, 5, 6, [fur[1], fur[2], fur[3], '#ffffff']);
  // Juba de cristais de gelo nas costas.
  for (const [x, h] of [[13, 4], [16, 6], [19, 7], [22, 8], [25, 7], [28, 6], [31, 5]]) {
    g.polygon([[x - 1.5, 19], [x, 19 - h], [x + 1.5, 19]], ice[1]);
    g.line(x, 19 - h, x, 18, ice[2]);
    g.pixel(x, 19 - h, ice[3]);
  }
  // Cabeça e focinho.
  g.shaded(36, 22, 5.5, 4.5, fur);
  g.polygon([[38, 21], [44, 23], [44, 25], [37, 26]], fur[2]);
  g.line(37, 21, 43, 23, fur[3]);
  g.line(38, 26, 43, 25, '#4a5a7a');
  g.pixel(44, 23, '#1a2030');
  g.pixel(40, 26, '#ffffff');
  g.pixel(42, 26, '#ffffff');
  // Orelhas e olho azul brilhante.
  g.polygon([[32, 19], [33, 13], [36, 18]], fur[1]);
  g.polygon([[35, 18], [37, 13], [39, 19]], fur[2]);
  g.rect(38, 20, 2, 1, '#4ad8ff');
  g.pixel(39, 20, '#ffffff');
  g.line(37, 19, 40, 19, '#5a6e8a');
  // Hálito gelado.
  if (frame === 0) {
    g.pixel(44, 27, ice[2]);
    g.pixel(43, 28, ice[3]);
  }
}

// ---------- Yeti (branco peludo, rosto azul, braços enormes) ----------

function drawYeti(g, frame, elite) {
  const fur = elite ? ['#6a6a8a', '#a8a8c8', '#d8d8ec', '#ffffff'] : ['#8a9ab0', '#c8d4e0', '#e8eff6', '#ffffff'];
  const face = ['#2a3e6a', '#4a6a9a', '#6a8ec0', '#9ab8e0'];
  const hand = '#4a5a7a';
  const step = frame === 1 ? 1 : -1;
  g.shadow(26, 49, 16, 3, 120);
  // Pernas curtas e grossas.
  for (const [x, lift, far] of [[18, step, true], [28, -step, false]]) {
    const up = Math.max(0, lift);
    g.rect(x, 38, 7, 9 - up, far ? fur[0] : fur[1]);
    g.rect(x - 1, 46 - up, 9, 2, hand);
    g.rect(x - 1, 46 - up, 9, 1, face[2]);
  }
  // Braço de trás até o chão.
  limb(g, 15, 20, 9, 40 - step, 6, fur[0]);
  g.rect(6, 40 - step, 6, 4, hand);
  for (const x of [6, 8, 10]) g.pixel(x, 44 - step, '#e8e0d0');
  // Corpo enorme.
  g.shaded(25, 29, 13, 13, fur);
  // Tufos de pelo.
  for (let index = 0; index < 26; index += 1) {
    const x = 14 + Math.floor(hash(index, 1, 61) * 22);
    const y = 18 + Math.floor(hash(index, 2, 61) * 22);
    g.line(x, y, x - 1, y + 2, hash(index, 3, 61) > 0.5 ? fur[0] : fur[3]);
  }
  // Barriga levemente azulada.
  g.shaded(29, 31, 6, 7, [fur[0], '#b8c8dc', '#d0dcec', fur[3]]);
  // Braço da frente até o chão.
  limb(g, 36, 20, 43, 40 + step, 6, fur[1]);
  g.line(35, 19, 42, 38 + step, fur[2]);
  g.rect(40, 40 + step, 7, 4, hand);
  for (const x of [40, 42, 44, 46]) g.pixel(x, 44 + step, '#f0e8d8');
  // Cabeça com rosto azul.
  g.shaded(30, 13, 8, 7, fur);
  g.polygon([[30, 10], [37, 10], [38, 18], [31, 19]], face[1]);
  g.line(31, 11, 37, 11, face[2]);
  // Chifres curtos.
  g.polygon([[24, 9], [21, 4], [26, 7]], '#c8b890');
  g.polygon([[34, 7], [37, 2], [38, 7]], '#e0d0a8');
  // Olhos amarelos, sobrancelha e boca com presas.
  g.line(31, 12, 37, 13, face[0]);
  g.rect(33, 13, 2, 1, '#ffe04a');
  g.pixel(34, 13, '#ffffff');
  g.rect(32, 16, 6, 2, '#1a1430');
  g.pixel(33, 16, '#ffffff');
  g.pixel(36, 16, '#ffffff');
  g.pixel(34, 18, '#ffffff');
  if (elite) {
    // Cristais de gelo nos ombros.
    for (const [x, y] of [[17, 18], [20, 16]]) {
      g.polygon([[x - 1.5, y], [x, y - 5], [x + 1.5, y]], '#6ab4e8');
      g.pixel(x, y - 5, '#ffffff');
    }
  }
}

// ---------- Elemental de gelo (cristais flutuando em volta de um núcleo) ----------

function drawIceElemental(g, frame, elite) {
  const ice = elite ? ['#3a2a7a', '#6a5ac0', '#a89af0', '#f0eaff'] : ['#2a5a8a', '#4a8ac0', '#8ac8f0', '#e0f8ff'];
  const core = elite ? ['#6a2ab0', '#b06aff', '#e0c0ff', '#ffffff'] : ['#1a8ac0', '#5ad0ff', '#c0f0ff', '#ffffff'];
  const bob = frame === 1 ? 1 : -1;
  g.shadow(22, 41, 8, 1.6, 55);

  const shard = (points, light) => {
    g.polygon(points, ice[1]);
    // Faceta clara do lado esquerdo.
    const [top, ...rest] = points;
    g.polygon([top, rest[rest.length - 1], rest[rest.length - 2] ?? rest[0]], light ? ice[2] : ice[0]);
    g.pixel(top[0], top[1], ice[3]);
  };
  // Estilhaços de baixo (cauda).
  shard([[22, 38 - bob], [20, 31], [24, 31]], false);
  shard([[18, 34 - bob], [16, 29], [20, 29]], true);
  shard([[26, 35 - bob], [24, 29], [28, 30]], false);
  // Tronco cristalino.
  g.polygon([[16, 13], [22, 6], [29, 13], [27, 29], [17, 29]], ice[1]);
  g.polygon([[16, 13], [22, 6], [22, 29], [17, 29]], ice[2]);
  g.line(22, 6, 22, 29, ice[3]);
  g.line(16, 13, 29, 13, ice[0]);
  g.line(17, 21, 27, 21, ice[0]);
  // Núcleo brilhando.
  g.ellipse(22, 18, 6, 6, core[2], 60);
  g.shaded(22, 18, 3, 3, core);
  // Cabeça de cristal com olhos.
  g.polygon([[18, 6], [22, 0], [26, 6], [22, 9]], ice[2]);
  g.polygon([[22, 0], [26, 6], [22, 9]], ice[1]);
  g.pixel(20, 5, '#ffffff');
  g.pixel(24, 5, '#ffffff');
  // Ombros flutuantes, sobem e descem ao contrário do corpo.
  shard([[11, 9 + bob], [7, 15 + bob], [10, 20 + bob], [14, 15 + bob]], true);
  shard([[33, 9 - bob], [30, 15 - bob], [34, 20 - bob], [37, 15 - bob]], false);
  // Mãos de gelo.
  shard([[6, 22 + bob], [4, 26 + bob], [7, 29 + bob], [9, 25 + bob]], true);
  shard([[38, 22 - bob], [35, 25 - bob], [38, 29 - bob], [41, 26 - bob]], false);
  // Flocos de neve.
  for (const [x, y] of [[3, 6], [40, 4], [42, 34], [2, 33]]) g.pixel(x, y + (frame ? 1 : 0), ice[3]);
}

// ======================= DESERTO =======================

// ---------- Escorpião (cor de areia, ferrão erguido) ----------

function drawScorpion(g, frame, elite) {
  const shell = elite ? ['#1a1218', '#3a2228', '#5a3238', '#8a4a50'] : ['#6a3a14', '#a8622a', '#d88a40', '#f0b870'];
  const sting = elite ? '#e8302a' : '#3a1a0a';
  const step = frame === 1 ? 1 : -1;
  g.shadow(20, 36, 15, 2.4, 110);
  // Oito patas finas.
  for (let index = 0; index < 4; index += 1) {
    const x = 12 + index * 4;
    const lift = index % 2 ? step : -step;
    g.line(x, 29, x - 3, 32 + lift, shell[0]);
    g.line(x - 3, 32 + lift, x - 4, 35, shell[0]);
    g.line(x + 1, 30, x - 1, 33 - lift, shell[1]);
    g.line(x - 1, 33 - lift, x - 1, 35, shell[1]);
  }
  // Cauda em arco sobre as costas.
  const tail = [[8, 26, 3], [5, 21, 2.8], [5, 16, 2.6], [7, 11, 2.5], [11, 8, 2.4], [15, 7, 2.2]];
  tail.forEach(([x, y, r]) => {
    g.shaded(x, y + (frame === 1 ? -1 : 0) * (y < 15 ? 1 : 0), r, r, shell);
  });
  const sy = frame === 1 ? -1 : 0;
  g.polygon([[16, 5 + sy], [21, 8 + sy], [17, 10 + sy]], sting);
  g.pixel(20, 8 + sy, '#ffe0a0');
  // Corpo segmentado.
  g.shaded(17, 28, 9, 4.5, shell);
  for (const x of [11, 15, 19]) g.line(x, 25, x, 31, shell[0]);
  // Cabeça e pinças abertas.
  g.shaded(26, 27, 4, 3, shell);
  for (const [x0, y0, far] of [[27, 25, true], [28, 28, false]]) {
    const color = far ? shell[0] : shell[1];
    const dy = far ? -2 : 0;
    g.line(x0, y0, 32, 22 + dy, color);
    g.line(x0 + 1, y0, 33, 22 + dy, color);
    g.polygon([[32, 19 + dy], [39, 17 + dy + step], [36, 21 + dy]], far ? shell[1] : shell[2]);
    g.polygon([[32, 22 + dy], [39, 23 + dy], [33, 25 + dy]], color);
    g.pixel(38, 18 + dy + step, shell[3]);
  }
  g.pixel(27, 25, '#141008');
  g.pixel(29, 25, '#141008');
}

// ---------- Múmia (ataduras, olhos verdes, braços para a frente) ----------

function drawMummy(g, frame, elite) {
  const wrap = ['#7a6a4a', '#c0b088', '#dcd0a8', '#f4ecd4'];
  const step = frame === 1 ? 1 : -1;
  g.shadow(20, 38, 8, 2, 110);
  // Atadura solta balançando atrás.
  g.line(13, 24, 8, 30 + step, wrap[1]);
  g.line(13, 25, 9, 31 + step, wrap[0]);
  // Pernas enfaixadas.
  for (const [x, lift, far] of [[16, step, true], [21, -step, false]]) {
    const up = Math.max(0, lift);
    g.rect(x, 27, 3, 10 - up, far ? wrap[0] : wrap[1]);
    for (let y = 28; y < 37 - up; y += 3) g.line(x, y, x + 2, y + 1, far ? '#5a4e36' : wrap[0]);
    g.rect(x - 1, 37 - up, 5, 1, '#5a4e36');
  }
  // Braço de trás estendido.
  limb(g, 15, 16, 30, 18, 3, wrap[0]);
  // Tronco.
  g.shaded(19, 21, 6.5, 8, wrap);
  for (let y = 15; y < 29; y += 3) g.line(13, y, 25, y + 1, wrap[0]);
  // Braço da frente.
  limb(g, 22, 17, 33, 20 + (frame === 1 ? 1 : 0), 3, wrap[1]);
  g.line(22, 16, 33, 19, wrap[2]);
  for (let x = 24; x < 33; x += 3) g.line(x, 17, x + 1, 20, wrap[0]);
  // Cabeça.
  g.shaded(19, 9, 5.5, 5.5, wrap);
  for (let y = 5; y < 15; y += 2) g.line(14, y, 24, y + 1, wrap[0]);
  // Fresta escura com olhos brilhando.
  g.rect(16, 8, 8, 2, '#1a1410');
  const eye = elite ? '#ff4a2a' : '#7aff5a';
  g.pixel(19, 8, eye);
  g.pixel(22, 8, eye);
  g.pixel(22, 9, elite ? '#ffb08a' : '#d0ffc0');
  if (elite) {
    // Escaravelho de ouro no peito.
    g.shaded(20, 19, 2, 2, ['#8a5a10', '#d0a030', '#f0d060', '#ffffff']);
    g.pixel(20, 21, '#2a6ab0');
  }
}

// ---------- Verme da areia (sai do chão com boca de dentes em anel) ----------

function drawSandworm(g, frame, elite) {
  const sand = ['#a07a3a', '#d0a85a', '#e8c880', '#f8e4b0'];
  const body = elite ? ['#2a1a3a', '#4a2e5a', '#6e4a7e', '#9a7aa8'] : ['#5a2e2a', '#8a4a3a', '#b06a4a', '#d8987a'];
  const sway = frame === 1 ? 1 : 0;
  g.shadow(26, 49, 19, 3, 110);
  // Monte de areia.
  g.shaded(26, 46, 19, 5.5, sand);
  for (let index = 0; index < 14; index += 1) {
    const x = 9 + Math.floor(hash(index, 1, 77) * 34);
    const y = 43 + Math.floor(hash(index, 2, 77) * 6);
    g.pixel(x, y, hash(index, 3, 77) > 0.5 ? sand[0] : sand[3]);
  }
  // Corpo em segmentos, curvando para a frente.
  const segments = [[22, 41, 7.5], [21, 35, 7], [22, 29, 6.6], [25, 23 + sway, 6.2], [29, 18 + sway, 6]];
  segments.forEach(([x, y, r], index) => {
    g.shaded(x + (index > 2 ? sway : 0), y, r, r * 0.8, body);
    g.line(x - r + 1, y + r * 0.6, x + r - 1, y + r * 0.6, body[0]);
  });
  // Placas claras na barriga.
  for (const [x, y] of [[27, 40], [26, 34], [27, 28], [30, 22 + sway]]) g.rect(x, y, 2, 2, body[3]);
  // Cabeça com a boca aberta em anel.
  const hx = 33 + sway;
  const hy = 12 + sway;
  g.shaded(hx, hy, 7.5, 7.5, body);
  g.ellipse(hx + 2, hy - 1, 4.5, 5.5, '#2a0a10');
  g.ellipse(hx + 2, hy - 1, 2.5, 3.5, '#5a0a1a');
  for (let index = 0; index < 10; index += 1) {
    const angle = (index / 10) * Math.PI * 2;
    g.pixel(hx + 2 + Math.cos(angle) * 4, hy - 1 + Math.sin(angle) * 5, '#f4ecd0');
  }
  // Areia caindo do corpo.
  g.pixel(17, 30 + sway * 2, sand[2]);
  g.pixel(16, 34 - sway, sand[1]);
  g.pixel(30, 30, sand[2]);
}

// ==================== ILHA VULCÂNICA ====================

// ---------- Diabrete (vermelho, asas de morcego, tridente) ----------

function drawImp(g, frame, elite) {
  const skin = elite ? ['#2a0a2a', '#5a1a4a', '#8a2a6a', '#c05a9a'] : ['#6a1410', '#b02a1a', '#e0503a', '#ff8a6a'];
  const wing = elite ? '#3a0a30' : '#5a1414';
  const flap = frame === 1 ? 2 : 0;
  const step = frame === 1 ? 1 : -1;
  g.shadow(16, 30, 6, 1.8, 100);
  // Asas atrás do corpo.
  g.polygon([[13, 14], [6, 6 + flap], [2, 10 + flap], [5, 12 + flap], [3, 16 + flap], [8, 15 + flap], [12, 18]], wing);
  g.line(13, 14, 6, 6 + flap, skin[0]);
  g.line(13, 15, 3, 16 + flap, skin[0]);
  // Cauda com ponta de flecha.
  g.line(13, 22, 9, 25, skin[0]);
  g.line(9, 25, 6, 24 + step, skin[0]);
  g.polygon([[4, 23 + step], [7, 22 + step], [6, 26 + step]], skin[1]);
  // Pernas de bode.
  for (const [x0, x1, lift] of [[14, 13, step], [18, 19, -step]]) {
    const up = Math.max(0, lift);
    g.line(x0, 23, x1, 28 - up, skin[1]);
    g.line(x0 + 1, 23, x1 + 1, 28 - up, skin[0]);
    g.rect(x1 - 1, 28 - up, 3, 1, '#1a0a0a');
  }
  // Corpo.
  g.shaded(16, 19, 4.5, 5, skin);
  g.line(15, 18, 17, 18, skin[0]);
  // Braço e tridente.
  limb(g, 19, 17, 23, 20, 2, skin[1]);
  g.line(24, 30, 26, 4, '#3a2a1a');
  g.line(25, 30, 27, 4, '#6a4a2a');
  g.line(23, 6, 29, 6, '#c8a040');
  for (const x of [23, 26, 29]) g.line(x, 6, x, 2, '#e8c860');
  g.pixel(26, 1, '#fff4c0');
  g.rect(22, 19, 3, 2, skin[2]);
  // Cabeça, chifres e sorriso.
  g.shaded(17, 11, 4.8, 4.5, skin);
  g.polygon([[13, 8], [11, 3], [15, 7]], '#e8d8b0');
  g.polygon([[19, 7], [22, 2], [21, 8]], '#f4ecd0');
  g.rect(18, 10, 2, 1, '#ffe04a');
  g.pixel(19, 10, '#ffffff');
  g.line(17, 13, 21, 13, '#2a0a0a');
  g.pixel(18, 14, '#ffffff');
  g.pixel(20, 14, '#ffffff');
  g.polygon([[21, 11], [23, 12], [21, 13]], skin[2]);
}

// ---------- Salamandra (lagarto de lava com manchas brilhantes) ----------

function drawSalamander(g, frame, elite) {
  const skin = elite ? ['#0e0e14', '#1e1e28', '#2e2e3e', '#4a4a5e'] : ['#3a0e0a', '#6a1a10', '#9a2a14', '#c8442a'];
  const glow = ['#e2531e', '#ff9a2a', '#ffe27a'];
  const step = frame === 1 ? 1 : -1;
  g.shadow(22, 38, 18, 2.2, 110);
  // Cauda longa curvada.
  g.polygon([[12, 28], [6, 27 + step], [1, 24 + step], [2, 27 + step], [6, 31], [13, 33]], skin[1]);
  g.line(2, 25 + step, 10, 29, skin[2]);
  g.pixel(1, 24 + step, glow[1]);
  // Patas abertas.
  for (const [x, dir, lift, far] of [[11, -1, step, true], [16, -1, -step, false], [27, 1, -step, true], [32, 1, step, false]]) {
    const up = Math.max(0, lift);
    const color = far ? skin[0] : skin[1];
    g.line(x, 31, x + dir * 2, 34 - up, color);
    g.line(x + 1, 31, x + dir * 2 + 1, 34 - up, color);
    g.rect(x + dir * 2 - 1, 35 - up, 4, 1, color);
  }
  // Corpo baixo.
  g.shaded(21, 30, 11.5, 5, skin);
  // Manchas de lava pelo dorso.
  for (const [x, y] of [[13, 28], [17, 27], [21, 26], [25, 27], [29, 28], [15, 31], [23, 30]]) {
    g.pixel(x, y, glow[0]);
    g.pixel(x + 1, y, glow[1]);
    g.pixel(x + 1, y - 1, glow[2]);
  }
  // Crista de chamas.
  for (const [x, h] of [[14, 2], [18, 3], [22, 3], [26, 2]]) {
    const flicker = (x + frame) % 2;
    g.polygon([[x - 1, 26], [x, 26 - h - flicker], [x + 1.5, 26]], glow[1]);
    g.pixel(x, 25, glow[2]);
  }
  // Cabeça achatada.
  g.shaded(34, 28, 6, 4, skin);
  g.polygon([[36, 27], [42, 29], [41, 31], [35, 31]], skin[2]);
  g.line(36, 31, 41, 30, skin[0]);
  g.rect(35, 26, 2, 1, '#ffe04a');
  g.pixel(36, 26, '#ffffff');
  g.pixel(41, 29, '#1a0a0a');
  // Língua de fogo.
  if (frame === 0) {
    g.pixel(43, 30, glow[1]);
    g.pixel(43, 29, glow[2]);
  }
}

// ---------- Demônio (vermelho-escuro, chifres, asas, fogo nas mãos) ----------

function drawDemon(g, frame, elite) {
  const skin = elite ? ['#1a0a1a', '#3a1430', '#5a2448', '#8a4070'] : ['#3a0a0a', '#7a1a14', '#a83020', '#d8603a'];
  const membrane = elite ? '#220a20' : '#3a0a14';
  const bone = '#e8d8b0';
  const fire = elite ? ['#4a1a8a', '#8a4aff', '#c8a8ff', '#ffffff'] : ['#8e2a14', '#e2531e', '#ff9a2a', '#ffe27a'];
  const step = frame === 1 ? 1 : -1;
  const flap = frame === 1 ? 2 : 0;
  g.shadow(26, 49, 13, 3, 120);
  // Asas grandes atrás.
  g.polygon([[19, 18], [8, 5 + flap], [2, 9 + flap], [5, 12 + flap], [1, 19 + flap], [6, 20 + flap], [4, 28 + flap], [17, 26]], membrane);
  for (const [x, y] of [[8, 5], [1, 19], [4, 28]]) g.line(19, 18, x, y + flap, '#6a1a24');
  g.polygon([[34, 18], [44, 7 + flap], [49, 11 + flap], [45, 22]], membrane);
  g.line(34, 18, 44, 7 + flap, '#6a1a24');
  // Pernas de bode com cascos.
  for (const [hip, knee, foot, lift, far] of [[[21, 35], [18, 41], [20, 47], step, true], [[30, 35], [33, 41], [32, 47], -step, false]]) {
    const up = Math.max(0, lift);
    const color = far ? skin[0] : skin[1];
    limb(g, hip[0], hip[1], knee[0], knee[1], 4.5, color);
    limb(g, knee[0], knee[1], foot[0], foot[1] - up, 3.4, color);
    g.rect(foot[0] - 2, foot[1] - up, 5, 2, '#140808');
  }
  // Braço de trás com chama.
  limb(g, 18, 21, 12, 31 - step, 4, skin[0]);
  g.ellipse(11, 32 - step, 4, 4, fire[2], 70);
  g.shaded(11, 32 - step, 2.2, 2.6, fire);
  // Tronco musculoso.
  g.shaded(26, 27, 9.5, 10, skin);
  g.line(24, 22, 28, 22, skin[0]);
  g.line(26, 23, 26, 34, skin[0]);
  for (const y of [27, 30]) g.line(23, y, 29, y, skin[0]);
  g.rect(19, 35, 15, 2, '#1a0a0a');
  // Braço da frente com bola de fogo.
  limb(g, 34, 21, 40, 29 + step, 4.4, skin[1]);
  g.line(33, 20, 39, 28 + step, skin[2]);
  g.ellipse(42, 30 + step, 6, 6, fire[2], 70);
  g.shaded(42, 30 + step, 3.5, 3.5, fire);
  g.polygon([[40, 28 + step], [42, 22 + step - flap / 2], [44, 28 + step]], fire[2]);
  g.pixel(42, 24 + step, fire[3]);
  // Cabeça e chifres curvos.
  g.shaded(28, 13, 5.5, 5.5, skin);
  g.polygon([[24, 10], [18, 7], [17, 1], [21, 5], [26, 8]], bone);
  g.polygon([[31, 9], [35, 4], [38, 3], [36, 7], [33, 11]], '#f4ecd0');
  g.pixel(17, 1, '#a89878');
  // Olhos e presas.
  g.rect(29, 12, 3, 1, fire[3]);
  g.pixel(31, 12, '#ffffff');
  g.line(28, 11, 32, 11, skin[0]);
  g.line(28, 16, 32, 16, '#140808');
  g.pixel(29, 17, '#ffffff');
  g.pixel(31, 17, '#ffffff');
}

// ==================== ILHA ESMERALDA ====================

// ---------- Caranguejo (vermelho, pinças erguidas) ----------

function drawCrab(g, frame, elite) {
  const shell = elite ? ['#1a2a4a', '#2a4a8a', '#4a7ac0', '#8ab0e8'] : ['#6a1410', '#b03020', '#e0603a', '#ff9a6a'];
  const open = frame === 1 ? 1 : 0;
  g.shadow(18, 32, 14, 2.2, 110);
  // Seis patas finas.
  for (let index = 0; index < 3; index += 1) {
    const lift = (index + frame) % 2;
    g.line(10 - index, 26, 5 - index * 2, 29 - lift, shell[0]);
    g.line(5 - index * 2, 29 - lift, 4 - index * 2, 31, shell[0]);
    g.line(26 + index, 26, 31 + index * 2, 29 - lift, shell[1]);
    g.line(31 + index * 2, 29 - lift, 32 + index * 2, 31, shell[1]);
  }
  // Braços erguidos.
  limb(g, 11, 22, 7, 14, 2.4, shell[0]);
  limb(g, 25, 22, 29, 13, 2.4, shell[1]);
  // Carapaça.
  g.shaded(18, 24, 11, 6, shell);
  g.line(8, 27, 28, 27, shell[0]);
  for (const [x, y] of [[13, 21], [18, 20], [23, 21], [16, 24], [21, 24]]) g.pixel(x, y, shell[3]);
  // Pinças grandes abrindo e fechando.
  for (const [cx, cy, far] of [[5, 10, true], [31, 9, false]]) {
    g.shaded(cx, cy, 4, 4.5, far ? [shell[0], shell[0], shell[1], shell[2]] : shell);
    g.polygon([[cx - 2, cy - 3], [cx, cy - 8 - open], [cx + 2, cy - 3]], far ? shell[1] : shell[2]);
    g.rect(cx - 1, cy - 4, 2, 2 + open, '#2a0a08');
    g.pixel(cx - 2, cy - 2, shell[3]);
  }
  // Olhos em hastes.
  for (const x of [15, 21]) {
    g.line(x, 19, x, 15, shell[0]);
    g.rect(x - 1, 13, 2, 2, '#141010');
    g.pixel(x - 1, 13, '#ffffff');
  }
  // Bolhas.
  if (frame === 0) {
    g.pixel(19, 28, '#c8f0ff');
    g.pixel(20, 30, '#e0faff');
  }
}

// ---------- Pirata esqueleto (chapéu tricórnio, bandana, sabre) ----------

function drawPirate(g, frame, elite) {
  const bone = ['#9a978c', '#d6d3c8', '#f1efe6', '#ffffff'];
  const coat = ['#2a0e0e', '#5a1a1a', '#7a2a24', '#a04438'];
  const dark = '#262030';
  const step = frame === 1 ? 1 : 0;
  g.shadow(20, 38, 8, 2, 110);
  // Pernas de osso e calça rasgada.
  for (const [x, lift] of [[17, step], [22, -step]]) {
    const up = Math.max(0, lift);
    g.rect(x, 27, 3, 4, '#2a3a5a');
    g.pixel(x + 2, 30, '#1a2a4a');
    g.rect(x, 31, 2, 6 - up, bone[1]);
    g.rect(x - 1, 37 - up, 4, 1, '#3a2a1a');
  }
  // Casaco aberto mostrando as costelas.
  g.polygon([[14, 15], [26, 15], [27, 28], [24, 27], [22, 28], [18, 28], [16, 27], [13, 28]], coat[1]);
  g.line(14, 15, 13, 27, coat[2]);
  g.polygon([[18, 15], [22, 15], [22, 26], [18, 26]], dark);
  for (const y of [17, 19, 21]) g.line(18, y, 21, y, bone[1]);
  g.rect(19, 16, 2, 8, bone[2]);
  g.rect(13, 23, 14, 2, '#3a2a1a');
  g.rect(19, 23, 2, 2, '#e8c040');
  for (const y of [17, 20]) g.pixel(23, y, '#e8c040');
  // Braço de trás.
  limb(g, 14, 16, 11, 23 - step, 2.4, coat[0]);
  g.pixel(11, 24 - step, bone[1]);
  // Braço da frente com sabre curvo.
  limb(g, 26, 16, 29, 22 + step, 2.4, coat[2]);
  if (elite) {
    g.line(29, 23 + step, 31, 25 + step, '#e8c040');
    g.pixel(32, 24 + step, '#e8c040');
  }
  const blade = [[30, 22], [32, 17], [34, 12], [35, 8], [35, 5]];
  for (let index = 0; index + 1 < blade.length; index += 1) {
    g.line(blade[index][0], blade[index][1] + step, blade[index + 1][0], blade[index + 1][1] + step, '#d8dbe0');
    g.line(blade[index][0] + 1, blade[index][1] + step, blade[index + 1][0] + 1, blade[index + 1][1] + step, '#8d929c');
  }
  g.line(28, 22 + step, 32, 23 + step, '#c8a040');
  // Crânio com tapa-olho e bandana.
  g.shaded(20, 9, 6, 5.5, bone);
  g.rect(16, 12, 8, 3, bone[1]);
  g.rect(21, 7, 3, 3, dark);
  g.pixel(22, 8, '#e8402a');
  g.rect(16, 7, 3, 2, '#141014');
  g.line(15, 6, 24, 9, '#141014');
  for (const x of [17, 19, 21, 23]) g.pixel(x, 14, dark);
  g.rect(14, 4, 12, 2, '#c8302a');
  g.line(14, 5, 11, 9, '#c8302a');
  // Chapéu tricórnio.
  g.polygon([[11, 4], [29, 4], [26, 1], [20, -1], [14, 1]], '#1a1418');
  g.line(11, 4, 29, 4, '#e8c040');
  g.pixel(20, 1, '#f1efe6');
  g.pixel(19, 2, '#f1efe6');
  g.pixel(21, 2, '#f1efe6');
}

// ======================= CHEFES =======================

// ---------- Grokk, o Chefe Orc (coroa de ossos, machado gigante, capa de pele) ----------

function drawOrcChief(g, frame) {
  const skin = ['#34442c', '#566a44', '#7a9062', '#a6ba86'];
  const fur = ['#3a2a1a', '#5e4228', '#86603a', '#a8805a'];
  const metal = ['#3e424a', '#6e747e', '#a4aab4', '#eef2f6'];
  const step = frame === 1 ? 1 : -1;
  const bob = frame === 1 ? 1 : 0;
  g.shadow(36, 69, 24, 4, 130);
  // Capa de pele atrás.
  g.polygon([[18, 24], [46, 22], [50, 58], [40, 62], [30, 59], [18, 62], [12, 42]], fur[1]);
  for (let index = 0; index < 30; index += 1) {
    const x = 14 + Math.floor(hash(index, 1, 91) * 34);
    const y = 28 + Math.floor(hash(index, 2, 91) * 32);
    g.line(x, y, x - 1, y + 2, hash(index, 3, 91) > 0.5 ? fur[0] : fur[2]);
  }
  // Pernas.
  for (const [x0, x1, lift, far] of [[29, 26, step, true], [42, 45, -step, false]]) {
    const up = Math.max(0, lift);
    limb(g, x0, 47, x1, 63 - up, 7, far ? '#241e1a' : '#3a302a');
    g.rect(x1 - 5, 62 - up, 11, 4, far ? '#1a1410' : '#4a3020');
    g.rect(x1 - 5, 61 - up, 11, 2, fur[2]);
  }
  // Braço de trás.
  limb(g, 23, 29, 16, 47 - step, 7, skin[0]);
  g.shaded(16, 49 - step, 4, 4, [skin[0], skin[0], skin[1], skin[2]]);
  // Tronco enorme.
  g.shaded(36, 38 + bob, 14.5, 13, skin);
  g.line(30, 33 + bob, 42, 33 + bob, skin[0]);
  g.line(36, 34 + bob, 36, 46 + bob, skin[0]);
  // Correias cruzadas e cinto com caveira.
  limb(g, 24, 28 + bob, 46, 48 + bob, 3, fur[0]);
  for (const t of [0.2, 0.45, 0.7]) g.pixel(24 + 22 * t, 28 + 20 * t + bob, metal[2]);
  g.rect(22, 48 + bob, 28, 4, fur[0]);
  g.shaded(36, 50 + bob, 3, 3, ['#9a978c', '#d6d3c8', '#f1efe6', '#ffffff']);
  g.pixel(35, 50 + bob, '#1a1414');
  g.pixel(37, 50 + bob, '#1a1414');
  // Ombreiras com espinhos.
  for (const cx of [24, 48]) {
    g.shaded(cx, 25 + bob, 7, 5, metal);
    for (const dx of [-4, 0, 4]) g.polygon([[cx + dx - 1.5, 22 + bob], [cx + dx, 16 + bob], [cx + dx + 1.5, 22 + bob]], metal[2]);
  }
  // Braço da frente com o machado de duas lâminas.
  limb(g, 49, 30 + bob, 55, 44 + step, 7, skin[1]);
  g.shaded(56, 46 + step, 4.2, 4.2, skin);
  limb(g, 52, 68, 61, 6, 2.6, '#4a2e1a');
  g.line(57, 40, 61, 10, '#7a5232');
  g.polygon([[60, 6], [70, 1], [71, 22], [62, 17]], metal[1]);
  g.polygon([[60, 6], [52, 2], [51, 17], [59, 15]], metal[0]);
  g.line(69, 2, 70, 21, metal[3]);
  g.line(53, 3, 52, 16, metal[2]);
  g.pixel(61, 5, '#c8302a');
  // Cabeça com mandíbula larga e presas grandes.
  g.shaded(38, 17 + bob, 9, 8, skin);
  g.rect(33, 21 + bob, 13, 4, skin[1]);
  g.line(33, 24 + bob, 45, 24 + bob, skin[0]);
  for (const x of [35, 43]) {
    g.rect(x, 19 + bob, 2, 3, '#f4ecd0');
    g.pixel(x, 18 + bob, '#ffffff');
  }
  g.line(34, 13 + bob, 45, 15 + bob, skin[0]);
  g.rect(40, 15 + bob, 3, 2, '#e8302a');
  g.pixel(42, 15 + bob, '#ffd0c0');
  g.line(30, 18 + bob, 33, 22 + bob, '#c8302a');
  // Coroa de ossos.
  g.rect(29, 9 + bob, 18, 2, '#c8b890');
  for (const [x, h] of [[30, 4], [34, 6], [38, 8], [42, 6], [46, 4]]) {
    g.polygon([[x - 1.5, 10 + bob], [x, 10 - h + bob], [x + 1.5, 10 + bob]], '#f1efe6');
    g.pixel(x, 10 - h + bob, '#ffffff');
  }
  g.pixel(38, 9 + bob, '#c8302a');
}

/** Ponto de uma curva quadrática (pescoços). */
function bezier(p0, p1, p2, t) {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
}

// ---------- Hidra do brejo (três cabeças) ----------

function drawHydra(g, frame) {
  const scale = ['#1a3a2a', '#2e5a3a', '#4a8a4a', '#7ab86a'];
  const belly = '#c8d08a';
  const water = ['#1a2a1a', '#2e4a2e', '#4a6a3a', '#6a8a4a'];
  g.shadow(40, 76, 32, 4, 110);
  // Poça do brejo.
  g.shaded(40, 70, 34, 7, water);
  for (const [x, y] of [[14, 70], [62, 72], [30, 74], [52, 67]]) g.line(x, y, x + 5, y, water[3]);
  // Corpo mergulhado.
  g.shaded(40, 60, 21, 12, scale);
  for (let x = 24; x < 58; x += 4) g.pixel(x, 52 + (x % 8 === 0 ? 0 : 1), scale[3]);
  // Três pescoços e cabeças.
  const necks = [
    { start: [30, 56], control: [16, 46], end: [16, 24], dir: -1, bob: frame === 1 ? 1 : 0 },
    { start: [50, 56], control: [66, 46], end: [64, 26], dir: 1, bob: frame === 1 ? 0 : 1 },
    { start: [40, 54], control: [44, 32], end: [42, 14], dir: 1, bob: frame === 1 ? 1 : 0 }
  ];
  for (const neck of necks) {
    const end = [neck.end[0], neck.end[1] - neck.bob];
    for (let step = 0; step <= 12; step += 1) {
      const t = step / 12;
      const [x, y] = bezier(neck.start, neck.control, end, t);
      const radius = 5.5 - t * 1.5;
      g.shaded(x, y, radius, radius, scale);
      if (step % 2 === 0) g.pixel(x + neck.dir * (radius - 1), y, belly);
    }
    // Espinhos no pescoço.
    for (const t of [0.3, 0.55, 0.8]) {
      const [x, y] = bezier(neck.start, neck.control, end, t);
      g.polygon([[x - neck.dir * 3, y - 1], [x - neck.dir * 6, y - 3], [x - neck.dir * 3, y + 2]], scale[0]);
    }
    // Cabeça com focinho para o lado de fora.
    const [hx, hy] = end;
    g.shaded(hx, hy - 2, 6.5, 5, scale);
    g.polygon([[hx + neck.dir * 3, hy - 4], [hx + neck.dir * 11, hy - 1], [hx + neck.dir * 10, hy + 1], [hx + neck.dir * 3, hy + 1]], scale[2]);
    // Boca aberta com presas.
    g.polygon([[hx + neck.dir * 3, hy + 1], [hx + neck.dir * 10, hy + 1], [hx + neck.dir * 9, hy + 4], [hx + neck.dir * 3, hy + 3]], '#3a0a10');
    g.pixel(hx + neck.dir * 6, hy + 2, '#ffffff');
    g.pixel(hx + neck.dir * 8, hy + 2, '#ffffff');
    // Olho amarelo e chifre.
    g.rect(hx + neck.dir * 2 - 1, hy - 4, 2, 1, '#ffe04a');
    g.pixel(hx + neck.dir * 2, hy - 4, '#1a1408');
    g.polygon([[hx - neck.dir * 2, hy - 5], [hx - neck.dir * 6, hy - 10], [hx - neck.dir * 1, hy - 7]], '#c8c090');
  }
  // Respingos.
  g.pixel(10, 64 - frame, '#8ac8a0');
  g.pixel(70, 63 + frame, '#8ac8a0');
}

// ---------- Gigante de gelo (armadura de gelo, clava congelada) ----------

function drawFrostGiant(g, frame) {
  const skin = ['#4a5a7a', '#6a80a8', '#90a8cc', '#c0d4ec'];
  const ice = ['#2a6aa0', '#5aa8e0', '#a8e0ff', '#ffffff'];
  const step = frame === 1 ? 1 : -1;
  const bob = frame === 1 ? 1 : 0;
  g.shadow(40, 77, 24, 4, 130);
  // Pernas e botas de gelo.
  for (const [x0, x1, lift, far] of [[32, 30, step, true], [48, 51, -step, false]]) {
    const up = Math.max(0, lift);
    limb(g, x0, 54, x1, 71 - up, 9, far ? skin[0] : skin[1]);
    g.shaded(x1, 72 - up, 7, 3.5, ice);
  }
  // Braço de trás.
  limb(g, 25, 30 + bob, 16, 52 - step, 8, skin[0]);
  g.shaded(15, 54 - step, 5, 4.5, [skin[0], skin[0], skin[1], skin[2]]);
  // Tronco e placas de gelo.
  g.shaded(40, 41 + bob, 16.5, 16, skin);
  g.polygon([[28, 30 + bob], [52, 30 + bob], [50, 46 + bob], [40, 52 + bob], [30, 46 + bob]], ice[1]);
  g.polygon([[28, 30 + bob], [40, 30 + bob], [40, 52 + bob], [30, 46 + bob]], ice[2]);
  g.line(40, 30 + bob, 40, 52 + bob, ice[3]);
  g.line(30, 38 + bob, 50, 38 + bob, ice[0]);
  g.rect(26, 54 + bob, 28, 3, '#3a4a6a');
  // Ombreiras de gelo pontiagudas.
  for (const cx of [26, 54]) {
    g.shaded(cx, 27 + bob, 7, 5, ice);
    g.polygon([[cx - 3, 24 + bob], [cx, 15 + bob], [cx + 3, 24 + bob]], ice[2]);
    g.pixel(cx, 15 + bob, ice[3]);
  }
  // Braço da frente com a clava de gelo.
  limb(g, 55, 30 + bob, 61, 47 + step, 8, skin[1]);
  g.shaded(62, 49 + step, 4.5, 4.5, skin);
  limb(g, 58, 56 + step, 70, 22, 3, '#5a4a3a');
  g.polygon([[66, 26], [64, 12], [70, 2], [78, 8], [76, 22]], ice[1]);
  g.polygon([[66, 26], [64, 12], [70, 2], [70, 24]], ice[2]);
  for (const [x, y, dx, dy] of [[64, 12, -4, -2], [78, 8, 2, -4], [76, 18, 3, 1], [70, 2, 0, -2]]) {
    g.polygon([[x - 1, y], [x + dx, y + dy], [x + 1, y + 1]], ice[3]);
  }
  // Cabeça, barba de gelo e coroa de pingentes.
  g.shaded(40, 16 + bob, 9, 9, skin);
  g.polygon([[33, 20 + bob], [47, 20 + bob], [45, 30 + bob], [40, 34 + bob], [35, 30 + bob]], ice[2]);
  for (const x of [35, 38, 41, 44]) g.line(x, 22 + bob, x + 1, 30 + bob, ice[3]);
  g.rect(42, 14 + bob, 3, 2, '#4af0ff');
  g.rect(36, 14 + bob, 3, 2, '#4af0ff');
  g.pixel(44, 14 + bob, '#ffffff');
  g.line(35, 12 + bob, 46, 13 + bob, skin[0]);
  g.rect(31, 8 + bob, 18, 2, ice[1]);
  for (const [x, h] of [[32, 4], [36, 6], [40, 8], [44, 6], [48, 4]]) {
    g.polygon([[x - 1.5, 9 + bob], [x, 9 - h + bob], [x + 1.5, 9 + bob]], ice[2]);
    g.pixel(x, 9 - h + bob, ice[3]);
  }
  // Neve caindo.
  for (const [x, y] of [[6, 10], [12, 30], [74, 40], [4, 60]]) g.pixel(x, y + frame, '#ffffff');
}

// ---------- Faraó amaldiçoado (toucado azul e ouro, cajado) ----------

function drawPharaoh(g, frame) {
  const wrap = ['#7a6a4a', '#c0b088', '#dcd0a8', '#f4ecd4'];
  const gold = ['#8a5a10', '#d0a030', '#f0d060', '#fff4c0'];
  const blue = '#2a5ab0';
  const magic = ['#1a6a2a', '#4ad04a', '#a8ff8a', '#ffffff'];
  const step = frame === 1 ? 1 : -1;
  const bob = frame === 1 ? 1 : 0;
  g.shadow(32, 61, 14, 3, 120);
  // Pernas enfaixadas e saiote dourado.
  for (const [x, lift, far] of [[27, step, true], [34, -step, false]]) {
    const up = Math.max(0, lift);
    g.rect(x, 44, 5, 15 - up, far ? wrap[0] : wrap[1]);
    for (let y = 46; y < 58 - up; y += 3) g.line(x, y, x + 4, y + 1, far ? '#5a4e36' : wrap[0]);
    g.rect(x - 1, 59 - up, 7, 2, gold[0]);
  }
  g.polygon([[23, 40], [41, 40], [44, 50], [20, 50]], gold[1]);
  for (const x of [25, 29, 33, 37, 41]) g.line(x, 41, x + 1, 49, blue);
  g.line(22, 40, 42, 40, gold[3]);
  // Braço de trás com magia verde.
  limb(g, 24, 26 + bob, 14, 34, 4, wrap[0]);
  g.ellipse(11, 34, 5, 5, magic[2], 70);
  g.shaded(11, 34, 2.5, 2.5, magic);
  g.pixel(8, 29 - frame, magic[2]);
  g.pixel(14, 28 + frame, magic[2]);
  // Tronco enfaixado.
  g.shaded(32, 33 + bob, 9.5, 10, wrap);
  for (let y = 26; y < 42; y += 3) g.line(23, y + bob, 41, y + 1 + bob, wrap[0]);
  // Colar largo de ouro e lápis-lazúli.
  g.each(32, 25 + bob, 11, 4.5, (x, y, nx, ny) => {
    if (ny > -0.2) g.raw.pixel(x, y, Math.abs(ny - 0.5) < 0.18 ? blue : ny > 0.75 ? gold[0] : gold[2]);
  });
  // Braço da frente com o cajado.
  limb(g, 40, 27 + bob, 46, 36, 4, wrap[1]);
  g.line(46, 60, 48, 8, gold[0]);
  g.line(47, 60, 49, 8, gold[2]);
  for (const y of [20, 30, 40, 50]) g.rect(46, y, 3, 1, blue);
  // Gancho no topo.
  g.line(49, 8, 52, 4, gold[2]);
  g.line(52, 4, 55, 5, gold[2]);
  g.line(55, 5, 56, 9, gold[2]);
  g.pixel(56, 10, gold[3]);
  g.rect(45, 35, 4, 3, wrap[2]);
  // Toucado (nemes) listrado.
  g.polygon([[22, 12 + bob], [42, 12 + bob], [44, 28 + bob], [38, 22 + bob], [26, 22 + bob], [20, 28 + bob]], gold[1]);
  for (let y = 14; y < 27; y += 3) {
    g.line(21, y + bob, 25, y + bob, blue);
    g.line(39, y + bob, 43, y + bob, blue);
  }
  g.shaded(32, 11 + bob, 9, 7, [gold[0], gold[1], gold[2], gold[3]]);
  for (let x = 25; x < 40; x += 3) g.line(x, 5 + bob, x, 9 + bob, blue);
  // Rosto enfaixado.
  g.shaded(33, 16 + bob, 5.5, 5.5, wrap);
  g.rect(30, 15 + bob, 8, 2, '#1a1410');
  g.pixel(32, 15 + bob, magic[2]);
  g.pixel(36, 15 + bob, magic[2]);
  g.line(29, 19 + bob, 37, 20 + bob, wrap[0]);
  // Barba cerimonial e naja na testa.
  g.rect(33, 21 + bob, 2, 4, blue);
  g.rect(33, 21 + bob, 2, 1, gold[2]);
  g.polygon([[31, 7 + bob], [33, 3 + bob], [35, 7 + bob]], gold[2]);
  g.pixel(33, 5 + bob, '#e8302a');
}

// ---------- Dragão de brasa (asas abertas, fogo na boca) ----------

function drawDragon(g, frame) {
  const scale = ['#3a0a0a', '#7a1810', '#b02a18', '#e0583a'];
  const belly = ['#a86a2a', '#e8b060', '#f8d890'];
  const membrane = '#6a1418';
  const fire = ['#8e2a14', '#e2531e', '#ff9a2a', '#ffe27a'];
  const step = frame === 1 ? 1 : -1;
  const flap = frame === 1 ? 3 : 0;
  g.shadow(48, 92, 36, 4, 130);
  // Asa de trás.
  g.polygon([[42, 40], [22, 8 + flap], [10, 6 + flap], [14, 16 + flap], [4, 24 + flap], [16, 28 + flap], [10, 38 + flap], [28, 42]], '#3a0a10');
  // Cauda com ponta de lança.
  for (let index = 0; index <= 14; index += 1) {
    const t = index / 14;
    const [x, y] = bezier([32, 64], [16, 64], [6, 81], t);
    g.shaded(x, y + (t > 0.5 ? step * (t - 0.5) * 2 : 0), 6.5 - t * 4.5, 5.5 - t * 3.8, scale);
  }
  g.polygon([[6, 78 + step], [0, 82 + step], [5, 86 + step], [8, 83 + step]], scale[0]);
  // Pernas de trás e da frente com garras.
  for (const [x0, x1, top, lift, far, width] of [[34, 31, 66, step, true, 10], [62, 64, 68, -step, false, 8]]) {
    const up = Math.max(0, lift);
    g.shaded(x0, top + 4, width * 0.8, width * 0.9, far ? [scale[0], scale[0], scale[1], scale[2]] : scale);
    limb(g, x0 + 2, top + 8, x1, 86 - up, width * 0.65, far ? scale[0] : scale[1]);
    g.rect(x1 - 5, 86 - up, 11, 3, far ? '#1a0a0a' : scale[0]);
    for (const dx of [-5, -1, 3]) g.pixel(x1 + dx + 2, 89 - up, '#f0e8d8');
  }
  // Corpo e placas da barriga.
  g.shaded(46, 62, 23, 15, scale);
  g.each(46, 62, 23, 15, (x, y, nx, ny) => {
    if (ny > 0.4 && nx > -0.4) g.raw.pixel(x, y, (y % 3 === 0) ? belly[0] : ny > 0.8 ? belly[0] : belly[1]);
  });
  // Espinhos nas costas.
  for (let x = 28; x <= 60; x += 5) g.polygon([[x - 2, 49], [x, 43 - ((x / 5) % 2)], [x + 2, 49]], '#1a0a0a');
  // Asa da frente com ossos.
  const tip = [[34, 10 - flap], [24, 2 - flap], [16, 20], [26, 30]];
  g.polygon([[50, 46], [34, 10 - flap], [24, 2 - flap], [28, 14 - flap / 2], [16, 20], [30, 24], [24, 34], [40, 42]], membrane);
  for (const [x, y] of tip) g.line(50, 46, x, y, '#1a0a0a');
  g.line(50, 46, 34, 10 - flap, scale[2]);
  // Pescoço.
  for (let step2 = 0; step2 <= 8; step2 += 1) {
    const t = step2 / 8;
    const [x, y] = bezier([62, 52], [70, 44], [76, 30], t);
    g.shaded(x, y, 6 - t * 1.5, 6 - t * 1.5, scale);
    g.pixel(x + 4 - t * 2, y + 1, belly[1]);
    if (step2 % 2 === 0) g.polygon([[x - 3, y - 4], [x - 6, y - 8], [x - 1, y - 5]], '#1a0a0a');
  }
  // Cabeça com chifres e mandíbula aberta.
  g.shaded(80, 26, 8.5, 6, scale);
  g.polygon([[84, 22], [94, 26], [93, 29], [84, 29]], scale[2]);
  g.line(84, 22, 93, 26, scale[3]);
  g.polygon([[83, 31], [93, 33], [90, 36], [82, 34]], scale[1]);
  g.polygon([[84, 29], [93, 29], [93, 33], [84, 31]], '#2a0606');
  for (const x of [86, 89, 92]) {
    g.pixel(x, 29, '#ffffff');
    g.pixel(x - 1, 32, '#ffffff');
  }
  g.polygon([[76, 21], [68, 14], [66, 16], [74, 23]], '#e8d8b0');
  g.polygon([[80, 20], [76, 12], [74, 14], [78, 21]], '#f4ecd0');
  g.rect(82, 23, 3, 2, '#ffe04a');
  g.pixel(84, 23, '#ffffff');
  g.line(81, 22, 86, 23, scale[0]);
  g.pixel(93, 26, '#1a0a0a');
  // Fogo na boca e brasas.
  g.ellipse(92, 31, 6, 4, fire[2], 70);
  g.shaded(92, 31, 2.5 + frame, 2, fire);
  for (const [x, y] of [[95, 26 - frame], [88, 38 + frame], [70, 10], [52, 30]]) g.pixel(x, y, frame ? fire[2] : fire[3]);
}

// ---------- Capitão fantasma (translúcido, casaco, chapéu, sabre) ----------

function drawGhostCaptain(g, frame) {
  const ghost = ['#2a6a7a', '#4aa0b0', '#8ad8e0', '#e0ffff'];
  const coat = ['#143a46', '#1e5a6a', '#2e7a8a', '#4a9aaa'];
  const wave = frame === 1 ? 1 : -1;
  const bob = frame === 1 ? 1 : 0;
  g.shadow(32, 62, 10, 1.8, 50);
  // Névoa espectral (semitransparente).
  for (let index = 0; index < 18; index += 1) {
    const x = 14 + Math.floor(hash(index, 1, 13) * 36);
    const y = 44 + Math.floor(hash(index, 2, 13) * 16);
    g.pixel(x, y + wave, ghost[2], 110);
  }
  // Casaco com cauda de fumaça.
  g.polygon([[22, 22 + bob], [42, 22 + bob], [46, 46 + bob], [41, 56 + wave + bob], [35, 50 + bob], [29, 57 - wave + bob], [23, 50 + bob], [18, 45 + bob]], coat[1]);
  g.polygon([[22, 22 + bob], [27, 22 + bob], [24, 50 + bob], [18, 45 + bob]], coat[2]);
  g.polygon([[30, 24 + bob], [35, 24 + bob], [36, 46 + bob], [29, 46 + bob]], ghost[1]);
  for (const y of [28, 33, 38]) {
    g.pixel(28, y + bob, '#e8c040');
    g.pixel(37, y + bob, '#e8c040');
  }
  g.rect(22, 40 + bob, 22, 3, '#6a1a2a');
  g.rect(31, 40 + bob, 3, 3, '#e8c040');
  // Braço de trás com gancho.
  limb(g, 23, 26 + bob, 16, 38 + bob, 4, coat[0]);
  g.line(15, 39 + bob, 13, 42 + bob, '#c8ccd2');
  g.line(13, 42 + bob, 15, 44 + bob, '#c8ccd2');
  // Braço da frente com sabre fantasma.
  limb(g, 42, 26 + bob, 48, 34 + bob, 4, coat[2]);
  g.shaded(49, 35 + bob, 2.5, 2.5, ghost);
  const blade = [[50, 33], [53, 26], [56, 19], [58, 13], [59, 8]];
  for (let index = 0; index + 1 < blade.length; index += 1) {
    g.line(blade[index][0], blade[index][1] + bob, blade[index + 1][0], blade[index + 1][1] + bob, ghost[3]);
    g.line(blade[index][0] + 1, blade[index][1] + bob, blade[index + 1][0] + 1, blade[index + 1][1] + bob, ghost[1]);
  }
  g.line(47, 35 + bob, 52, 36 + bob, '#e8c040');
  // Cabeça pálida e barba de fumaça.
  g.shaded(32, 15 + bob, 6.5, 6.5, ghost);
  g.polygon([[27, 18 + bob], [37, 18 + bob], [36, 26 + bob], [32, 30 + wave + bob], [28, 26 + bob]], ghost[2]);
  g.line(30, 20 + bob, 30, 27 + bob, ghost[1]);
  g.line(34, 20 + bob, 34, 27 + bob, ghost[1]);
  g.rect(29, 13 + bob, 3, 2, '#0a2a34');
  g.rect(34, 13 + bob, 3, 2, '#0a2a34');
  g.pixel(30, 13 + bob, '#ffffff');
  g.pixel(35, 13 + bob, '#ffffff');
  // Chapéu tricórnio com caveira.
  g.polygon([[20, 9 + bob], [44, 9 + bob], [40, 3 + bob], [32, 0 + bob], [24, 3 + bob]], coat[0]);
  g.line(20, 9 + bob, 44, 9 + bob, '#e8c040');
  g.shaded(32, 5 + bob, 1.8, 1.8, ['#9a978c', '#d6d3c8', '#f1efe6', '#ffffff']);
  g.line(29, 7 + bob, 35, 3 + bob, '#d6d3c8');
  // Brilhos ao redor.
  for (const [x, y] of [[8, 14], [56, 46], [12, 28], [60, 30]]) g.pixel(x, y + wave, ghost[3]);
}

// ======================= REGISTRO =======================

/** Tamanho normal e de elite (px). Chefes têm o mesmo tamanho nos dois. */
export const REGION_MONSTER_SIZES = Object.freeze({
  rat: { size: 28, elite: 34 },
  snake: { size: 32, elite: 40 },
  bat: { size: 32, elite: 40 },
  goblin: { size: 32, elite: 40 },
  orc: { size: 44, elite: 52 },
  bear: { size: 52, elite: 60 },
  treant: { size: 56, elite: 64 },
  frog: { size: 36, elite: 44 },
  zombie: { size: 40, elite: 48 },
  witch: { size: 40, elite: 48 },
  frostWolf: { size: 44, elite: 52 },
  yeti: { size: 52, elite: 60 },
  iceElemental: { size: 44, elite: 52 },
  scorpion: { size: 40, elite: 48 },
  mummy: { size: 40, elite: 48 },
  sandworm: { size: 52, elite: 60 },
  imp: { size: 32, elite: 40 },
  salamander: { size: 44, elite: 52 },
  demon: { size: 52, elite: 60 },
  crab: { size: 36, elite: 44 },
  pirate: { size: 40, elite: 48 },
  orcChief: { size: 72, elite: 72 },
  hydra: { size: 80, elite: 80 },
  frostGiant: { size: 80, elite: 80 },
  pharaoh: { size: 64, elite: 64 },
  dragon: { size: 96, elite: 96 },
  ghostCaptain: { size: 64, elite: 64 },
  ...DEEP_MONSTER_SIZES
});

/** Grade lógica de cada desenho (o tamanho normal). */
export const REGION_LOGICAL = Object.freeze(
  Object.fromEntries(Object.entries(REGION_MONSTER_SIZES).map(([kind, { size }]) => [kind, size]))
);

export const REGION_DRAWERS = Object.freeze({
  rat: drawRat,
  snake: drawSnake,
  bat: drawBat,
  goblin: drawGoblin,
  orc: drawOrc,
  bear: drawBear,
  treant: drawTreant,
  frog: drawFrog,
  zombie: drawZombie,
  witch: drawWitch,
  frostWolf: drawFrostWolf,
  yeti: drawYeti,
  iceElemental: drawIceElemental,
  scorpion: drawScorpion,
  mummy: drawMummy,
  sandworm: drawSandworm,
  imp: drawImp,
  salamander: drawSalamander,
  demon: drawDemon,
  crab: drawCrab,
  pirate: drawPirate,
  orcChief: drawOrcChief,
  hydra: drawHydra,
  frostGiant: drawFrostGiant,
  pharaoh: drawPharaoh,
  dragon: drawDragon,
  ghostCaptain: drawGhostCaptain,
  ...DEEP_DRAWERS
});
