import { PixelCanvas, hash } from './pixel.js';
import { REGION_DRAWERS, REGION_LOGICAL, REGION_MONSTER_SIZES } from './monstersRegions.js';

// Monstros no estilo das referências: contorno escuro forte, volumes com
// luz do alto à esquerda e detalhes desenhados pixel a pixel.
// Cada desenho usa uma grade lógica (o tamanho normal); o elite é a mesma
// arte desenhada numa grade maior.

/** Tamanho normal e de elite (px) de cada monstro redesenhado. */
export const MONSTER_SIZES = Object.freeze({
  slime: { size: 32, elite: 40 },
  wolf: { size: 44, elite: 52 },
  boar: { size: 44, elite: 52 },
  skeleton: { size: 40, elite: 48 },
  spider: { size: 40, elite: 48 },
  ghost: { size: 32, elite: 40 },
  werewolf: { size: 40, elite: 48 },
  golem: { size: 48, elite: 56 },
  titan: { size: 64, elite: 64 },
  ...REGION_MONSTER_SIZES
});

export const MONSTER_PREVIEW = [
  { kind: 'slime', ...MONSTER_SIZES.slime },
  { kind: 'wolf', ...MONSTER_SIZES.wolf },
  { kind: 'boar', ...MONSTER_SIZES.boar },
  { kind: 'skeleton', ...MONSTER_SIZES.skeleton },
  { kind: 'spider', ...MONSTER_SIZES.spider },
  { kind: 'ghost', ...MONSTER_SIZES.ghost },
  { kind: 'werewolf', ...MONSTER_SIZES.werewolf },
  { kind: 'golem', ...MONSTER_SIZES.golem }
];

const LOGICAL = { slime: 32, wolf: 44, boar: 44, skeleton: 40, spider: 40, ghost: 32, werewolf: 40, golem: 64, titan: 64, ...REGION_LOGICAL };

/** Canvas com coordenadas lógicas convertidas para o tamanho real. */
function grid(canvas, size, logical) {
  const k = size / logical;
  const p = (value) => value * k;
  const length = (value) => Math.max(1, Math.round(value * k));
  return {
    k,
    pixel: (x, y, color, alpha) => canvas.rect(Math.floor(p(x)), Math.floor(p(y)), length(1), length(1), color, alpha),
    rect: (x, y, width, height, color, alpha) => canvas.rect(Math.round(p(x)), Math.round(p(y)), length(width), length(height), color, alpha),
    line: (x0, y0, x1, y1, color) => {
      const steps = Math.max(1, Math.round(k));
      for (let ox = 0; ox < steps; ox += 1) {
        for (let oy = 0; oy < steps; oy += 1) canvas.line(p(x0) + ox, p(y0) + oy, p(x1) + ox, p(y1) + oy, color);
      }
    },
    ellipse: (cx, cy, rx, ry, color, alpha) => canvas.ellipse(p(cx), p(cy), p(rx), p(ry), color, alpha),
    shaded: (cx, cy, rx, ry, colors, options) => canvas.shadedEllipse(p(cx), p(cy), p(rx), p(ry), colors, options),
    each: (cx, cy, rx, ry, callback) => canvas.forEllipse(p(cx), p(cy), p(rx), p(ry), (x, y, nx, ny) => callback(x, y, nx, ny)),
    raw: canvas,
    polygon: (points, color, alpha) => canvas.polygon(points.map(([x, y]) => [p(x), p(y)]), color, alpha),
    shadow: (cx, cy, rx, ry, alpha) => canvas.shadow(p(cx), p(cy), p(rx), p(ry), alpha)
  };
}

const INK = '#120d12';

// ---------- Slime (gosma verde brilhante) ----------

function drawSlime(g, frame) {
  const squash = frame === 1;
  const body = ['#1f6a34', '#2f9447', '#4cc05d', '#a4ec9c'];
  const cy = squash ? 20 : 19;
  const rx = squash ? 13 : 12;
  const ry = squash ? 8 : 9;
  g.shadow(16, 28, 12, 2.5, 110);
  g.shaded(16, cy, rx, ry, body, { light: [-0.7, -0.9] });
  // Faixa mais escura embaixo (o "chão" da gosma).
  g.each(16, cy, rx, ry, (x, y, nx, ny) => {
    if (ny > 0.45) g.raw.pixel(x, y, ny > 0.78 ? '#1a5a2c' : '#24793b');
  });
  // Brilho curvo no alto à esquerda.
  g.rect(8, cy - 6, 2, 1, '#d8f8cc');
  g.rect(9, cy - 7, 4, 1, '#d8f8cc');
  g.pixel(7, cy - 4, '#d8f8cc');
  g.pixel(7, cy - 5, '#a4ec9c');
  // Olhos olhando para a direita.
  for (const x of [19, 23]) {
    g.rect(x, cy - 2, 2, 3, '#141a16');
    g.pixel(x, cy - 2, '#f4fff0');
  }
}

// ---------- Lobo (cinza claro, cabeça baixa) ----------

function drawWolf(g, frame) {
  const fur = ['#8a8592', '#bdb8bc', '#dedad3', '#f7f5ef'];
  const back = '#9a94a2';
  const leg = ['#4c5849', '#6f7d6a', '#8d9a86'];
  const step = frame === 1 ? 1 : -1;
  g.shadow(22, 40, 17, 2.5, 110);
  // Cauda peluda caída para trás, ponta amarelada.
  g.polygon([[10, 21], [5, 21], [2, 24], [1, 29], [3, 31], [5, 28], [7, 25], [10, 24]], fur[1]);
  g.line(5, 22, 2, 25, fur[2]);
  g.line(4, 27, 8, 24, fur[0]);
  g.pixel(1, 29, '#d9a43a');
  g.pixel(2, 30, '#d9a43a');
  // Patas de trás: coxa, jarrete dobrado e pata.
  for (const [x, lift, far] of [[10, step, true], [14, -step, false]]) {
    const up = Math.max(0, lift);
    const color = far ? leg[0] : leg[1];
    g.line(x + 1, 30, x - 1, 34 - up, color);
    g.line(x + 2, 30, x, 34 - up, color);
    g.line(x - 1, 34 - up, x, 38 - up, color);
    g.line(x, 34 - up, x + 1, 38 - up, color);
    g.rect(x - 1, 38 - up, 4, 1, far ? '#343c33' : leg[0]);
  }
  // Patas da frente: retas e finas.
  for (const [x, lift, far] of [[31, -step, true], [35, step, false]]) {
    const up = Math.max(0, lift);
    const color = far ? leg[0] : leg[1];
    g.rect(x, 30, 2, 8 - up, color);
    g.pixel(x, 31, far ? leg[1] : leg[2]);
    g.rect(x, 38 - up, 3, 1, far ? '#343c33' : leg[0]);
  }
  // Coxa traseira e corpo com dorso mais escuro e barriga recolhida.
  g.shaded(13, 26, 5.5, 5, fur);
  g.shaded(22, 24, 12, 6, fur);
  g.line(11, 18, 30, 18, back);
  g.line(12, 19, 29, 19, back);
  g.pixel(16, 17, back);
  g.pixel(22, 17, back);
  g.line(16, 29, 26, 28, fur[0]);
  // Peito claro e ombro.
  g.shaded(31, 25, 5, 6, [fur[1], fur[2], fur[3], '#ffffff']);
  g.line(32, 29, 35, 30, fur[3]);
  // Cabeça baixa e focinho comprido.
  g.shaded(36, 22, 5.5, 4.5, fur);
  g.polygon([[38, 21], [44, 23], [44, 25], [37, 26]], fur[2]);
  g.line(37, 21, 43, 23, fur[3]);
  g.line(38, 26, 43, 25, '#4a4048');
  g.pixel(44, 23, '#231c22');
  g.pixel(44, 24, '#231c22');
  g.pixel(40, 26, '#ffffff');
  g.pixel(42, 26, '#ffffff');
  // Orelhas em pé com ponta amarelada.
  g.polygon([[32, 19], [33, 13], [36, 18]], fur[1]);
  g.polygon([[35, 18], [37, 13], [39, 19]], fur[2]);
  g.pixel(33, 14, '#e0b04a');
  g.pixel(37, 14, '#e0b04a');
  g.pixel(34, 17, '#9a7a7a');
  // Olho amarelo-esverdeado e sobrancelha franzida.
  g.rect(38, 20, 2, 1, '#c9d94a');
  g.pixel(39, 20, '#2a2a20');
  g.line(37, 19, 40, 19, '#6a6470');
}

// ---------- Javali (laranja, crina escura, presas) ----------

function drawBoar(g, frame) {
  const hide = ['#a5441d', '#df7838', '#f29a55', '#f9c48c'];
  const mane = ['#5e1c10', '#86301a', '#b04a24'];
  const hoof = '#2e1f3a';
  const step = frame === 1 ? 1 : -1;
  g.shadow(22, 40, 17, 2.6, 115);
  for (const [x, lift, far] of [[10, step, true], [27, -step, true], [14, -step, false], [31, step, false]]) {
    const up = Math.max(0, lift);
    g.rect(x, 32, 4, 6 - up, far ? hide[0] : hide[1]);
    g.pixel(x, 32, far ? hide[1] : hide[2]);
    g.rect(x, 38 - up, 4, 1, hoof);
    g.pixel(x + 3, 37 - up, hoof);
  }
  // Rabo enrolado.
  g.pixel(5, 24, mane[1]);
  g.pixel(4, 23, mane[1]);
  g.pixel(4, 22, mane[2]);
  // Corpo.
  g.shaded(20, 26, 15, 9, hide);
  g.line(8, 33, 30, 33, hide[0]);
  // Crina de cerdas no dorso.
  for (let x = 9; x <= 31; x += 2) {
    const tall = (x % 4 === 1) ? 4 : 3;
    g.polygon([[x - 1, 19], [x + 1, 19 - tall + (x > 26 ? 1 : 0)], [x + 2, 19]], mane[1]);
    g.pixel(x, 19 - tall + 1, mane[2]);
  }
  g.rect(9, 18, 23, 2, mane[0]);
  g.line(10, 18, 30, 18, mane[1]);
  // Cabeça.
  g.shaded(34, 27, 7, 7, hide);
  g.polygon([[30, 19], [33, 15], [35, 21]], mane[1]);
  g.pixel(33, 17, '#e0a080');
  // Focinho e narinas.
  g.rect(39, 26, 5, 6, '#e98f68');
  g.rect(39, 26, 5, 1, '#f6b896');
  g.pixel(42, 28, '#5a2018');
  g.pixel(42, 30, '#5a2018');
  // Presas curvas.
  g.pixel(38, 33, '#fff4e0');
  g.pixel(39, 32, '#fff4e0');
  g.pixel(40, 31, '#ffffff');
  g.pixel(40, 30, '#e8d8c0');
  // Olho bravo.
  g.rect(35, 23, 2, 2, '#241418');
  g.pixel(35, 23, '#ffffff');
  g.line(34, 22, 37, 23, mane[0]);
  // Poeira levantada.
  if (frame === 0) {
    g.pixel(40, 38, '#e8b880');
    g.pixel(42, 37, '#e8b880');
  }
}

// ---------- Esqueleto (espada; elite com elmo e escudo redondo) ----------

function drawSkeleton(g, frame, elite) {
  const bone = ['#9a978c', '#d6d3c8', '#f1efe6', '#ffffff'];
  const dark = '#262030';
  const step = frame === 1 ? 1 : 0;
  g.shadow(20, 38, 8, 2, 110);
  // Pernas (fêmur, tíbia) e pés acinzentados.
  for (const [x, lift] of [[17, step], [22, -step]]) {
    const up = Math.max(0, lift);
    g.rect(x, 27, 2, 5, bone[1]);
    g.rect(x, 32, 2, 1, bone[2]);
    g.rect(x, 33, 2, 4 - up, bone[1]);
    g.rect(x - 1, 37 - up, 4, 1, '#a0a6b8');
  }
  // Bacia.
  g.rect(16, 25, 9, 2, bone[1]);
  g.rect(16, 25, 9, 1, bone[2]);
  g.pixel(20, 26, dark);
  // Coluna e costelas com vãos escuros.
  g.rect(19, 15, 2, 10, bone[1]);
  g.shaded(20, 19, 6, 4.5, bone);
  for (const y of [17, 19, 21]) {
    g.line(15, y, 18, y, dark);
    g.line(21, y, 24, y, dark);
  }
  g.rect(19, 16, 2, 7, bone[2]);
  for (const y of [17, 19, 21, 23]) g.pixel(19, y, bone[0]);
  // Braço esquerdo da tela (escudo no elite).
  g.line(14, 15, 12, 21 - step, bone[1]);
  g.line(12, 21 - step, 13, 26 - step, bone[2]);
  // Braço com a espada.
  g.line(26, 15, 28, 21 + step, bone[1]);
  g.line(28, 21 + step, 29, 25 + step, bone[2]);
  // Espada: lâmina inclinada, guarda e cabo.
  g.line(30, 24 + step, 36, 5 + step, '#d8dbe0');
  g.line(31, 24 + step, 37, 5 + step, '#8d929c');
  g.pixel(36, 4 + step, '#ffffff');
  g.line(28, 25 + step, 33, 27 + step, '#7a3a20');
  g.pixel(29, 27 + step, '#7a3a20');
  // Crânio.
  g.shaded(20, 9, 6.5, 6, bone);
  g.rect(16, 13, 8, 3, bone[1]);
  g.rect(16, 13, 8, 1, bone[2]);
  g.rect(16, 8, 3, 3, dark);
  g.rect(21, 8, 3, 3, dark);
  g.pixel(17, 9, '#5a5070');
  g.pixel(22, 9, '#5a5070');
  g.pixel(20, 11, dark);
  for (const x of [17, 19, 21, 23]) g.pixel(x, 15, dark);
  if (elite) {
    // Elmo de ferro avermelhado.
    const helm = ['#4a1e14', '#7a3420', '#a0502e', '#d08a60'];
    g.each(20, 7, 7.5, 5, (x, y, nx, ny) => {
      if (ny < 0.25) g.raw.pixel(x, y, ny < -0.6 ? helm[2] : nx < -0.3 ? helm[2] : helm[1]);
    });
    g.line(13, 8, 27, 8, helm[0]);
    g.pixel(18, 3, helm[3]);
    g.rect(19, 2, 2, 7, '#c9ccd2');
    // Escudo redondo de madeira com borda de ferro.
    const wood = ['#4a2414', '#7a3a20', '#9a5232', '#b8704a'];
    g.ellipse(11, 23, 6.5, 6.5, '#3a2a24');
    g.shaded(11, 23, 5.5, 5.5, wood);
    g.line(6, 23, 16, 23, wood[0]);
    g.ellipse(11, 23, 1.5, 1.5, '#c9ccd2');
    g.pixel(10, 22, '#ffffff');
  }
}

// ---------- Aranha (azul-acinzentada, patas longas) ----------

function drawSpider(g, frame, elite) {
  const shell = ['#262c3a', '#465066', '#69758e', '#9ba8c2'];
  const legColor = ['#2c3242', '#4a5468', '#7a869e'];
  const step = frame === 1 ? 1 : -1;
  g.shadow(20, 36, 15, 2.6, 120);
  // Oito patas: quadril, joelho alto, ponta no chão.
  const legs = [
    [16, 22, 7, 13, 2, 30], [16, 24, 6, 18, 3, 34], [18, 25, 11, 22, 8, 37], [19, 26, 15, 27, 13, 38],
    [24, 22, 33, 13, 38, 30], [24, 24, 34, 18, 37, 34], [22, 25, 29, 22, 32, 37], [21, 26, 25, 27, 27, 38]
  ];
  legs.forEach(([x0, y0, kx, ky, x1, y1], index) => {
    const lift = index % 2 ? step : -step;
    const far = index % 4 < 2;
    g.line(x0, y0, kx, ky + lift, far ? legColor[0] : legColor[1]);
    g.line(kx, ky + lift, x1, y1, far ? legColor[0] : legColor[1]);
    g.pixel(kx, ky + lift, legColor[2]);
  });
  // Abdômen grande atrás e cefalotórax na frente.
  g.shaded(20, 17, 9, 7.5, shell);
  g.line(13, 21, 27, 21, shell[0]);
  g.shaded(20, 25, 5.5, 4, shell);
  if (elite) {
    g.polygon([[20, 12], [22, 15], [20, 18], [18, 15]], '#c8423a');
    g.pixel(20, 13, '#ff8a7a');
  } else {
    g.pixel(17, 13, shell[3]);
    g.pixel(18, 12, shell[3]);
  }
  // Olhos e quelíceras.
  for (const [x, y] of [[18, 25], [21, 25], [19, 26], [20, 26]]) g.pixel(x, y, '#d8434a');
  g.pixel(18, 25, '#ffb0a8');
  g.pixel(18, 29, '#d8d2c0');
  g.pixel(21, 29, '#d8d2c0');
}

// ---------- Fantasma (lençol azul-claro com cauda ondulada) ----------

function drawGhost(g, frame) {
  const sheet = ['#4e93a6', '#86c8d6', '#c2eaf1', '#f2fdff'];
  const wave = frame === 1 ? 1 : -1;
  g.shadow(16, 30, 7, 1.6, 60);
  // Cauda ondulada.
  g.polygon([[7, 13], [25, 13], [26, 22], [23, 26 + wave], [20, 23], [17, 27 - wave], [14, 23], [11, 26 + wave], [8, 23], [6, 20]], sheet[1]);
  g.polygon([[20, 14], [25, 13], [26, 22], [23, 26 + wave], [20, 23]], sheet[0]);
  g.line(10, 16, 9, 22, sheet[2]);
  // Cabeça.
  g.shaded(16, 11, 9.5, 8.5, sheet);
  // Bracinhos.
  g.polygon([[8, 14], [3, 17 + wave], [4, 19 + wave], [9, 18]], sheet[1]);
  g.polygon([[24, 14], [29, 16 - wave], [28, 18 - wave], [23, 18]], sheet[0]);
  // Olhos grandes e boca aberta.
  for (const x of [11, 18]) {
    g.rect(x, 9, 3, 4, '#1c2e3a');
    g.pixel(x, 9, '#ffffff');
  }
  g.rect(15, 15, 2, 2 + (frame === 1 ? 1 : 0), '#1c2e3a');
  g.pixel(10, 14, '#e8a0b0');
  g.pixel(21, 14, '#e8a0b0');
  // Brilhos ao redor.
  g.pixel(3, 6 + wave, '#e4fbff');
  g.pixel(29, 9 - wave, '#e4fbff');
}

// ---------- Lobisomem (curvado, pelo roxo-acinzentado, olhos amarelos) ----------

function drawWerewolf(g, frame) {
  const fur = ['#2e2238', '#4e3a5c', '#6e5682', '#9a82ad'];
  const chest = ['#6e5682', '#8f719b', '#ab8fb8', '#c8b0d2'];
  const claw = '#f0e8d8';
  const step = frame === 1 ? 1 : -1;
  g.shadow(20, 38, 11, 2.4, 120);
  // Pernas dobradas (coxa, canela e pata).
  for (const [hip, knee, paw, lift, far] of [[[15, 27], [12, 32], [12, 37], step, true], [[25, 27], [27, 32], [26, 37], -step, false]]) {
    const up = Math.max(0, lift);
    g.shaded(hip[0], hip[1], 4, 4, far ? [fur[0], fur[0], fur[1], fur[2]] : fur);
    g.line(knee[0], knee[1] - 2, knee[0], knee[1] + 2, far ? fur[0] : fur[1]);
    g.line(knee[0] + 1, knee[1] - 2, knee[0] + 1, knee[1] + 2, far ? fur[0] : fur[1]);
    g.line(knee[0], knee[1] + 2, paw[0], paw[1] - up, far ? fur[0] : fur[1]);
    g.line(knee[0] + 1, knee[1] + 2, paw[0] + 1, paw[1] - up, far ? fur[0] : fur[1]);
    g.rect(paw[0] - 1, paw[1] - up, 4, 1, fur[0]);
    g.pixel(paw[0] + 3, paw[1] - up, claw);
  }
  // Tronco curvado e peito claro com músculos.
  g.shaded(20, 20, 8.5, 8, fur);
  g.shaded(22, 21, 4.5, 5.5, chest);
  g.line(20, 19, 24, 19, chest[0]);
  g.line(20, 22, 24, 22, chest[0]);
  g.line(22, 17, 22, 25, chest[0]);
  // Ombros e braços longos com garras.
  g.shaded(12, 14, 4.5, 4, fur);
  g.shaded(28, 14, 4.5, 4, fur);
  g.polygon([[9, 15], [6, 25 + step], [9, 28 + step], [12, 18]], fur[1]);
  g.polygon([[31, 15], [35, 24 - step], [32, 27 - step], [28, 18]], fur[2]);
  for (const [x, y] of [[6, 28 + step], [8, 29 + step], [32, 28 - step], [34, 27 - step]]) g.pixel(x, y, claw);
  // Juba nas costas do pescoço.
  g.polygon([[16, 6], [13, 9], [15, 10], [12, 13], [19, 12]], fur[0]);
  // Cabeça de lobo virada para a direita.
  g.shaded(24, 9, 5.5, 5, fur);
  g.polygon([[27, 8], [35, 10], [34, 13], [27, 13]], fur[2]);
  g.line(28, 8, 34, 10, fur[3]);
  g.line(28, 13, 34, 13, fur[0]);
  g.pixel(35, 10, '#140f14');
  g.pixel(29, 13, '#ffffff');
  g.pixel(31, 13, '#ffffff');
  g.pixel(33, 13, '#ffffff');
  // Orelhas pontudas.
  g.polygon([[19, 6], [20, 0], [23, 5]], fur[1]);
  g.polygon([[23, 5], [25, 0], [27, 6]], fur[2]);
  g.pixel(25, 2, '#c87a9a');
  // Olho amarelo brilhando e sobrancelha brava.
  g.rect(26, 7, 2, 1, '#ffd84a');
  g.pixel(27, 7, '#fff4b0');
  g.line(25, 6, 28, 7, fur[0]);
}

// ---------- Golem de lava (variante da campanha e o Titã do Bioma) ----------

const ROCK = ['#17151b', '#29262d', '#3b3840', '#55515a'];
const LAVA = ['#8e2a14', '#e2531e', '#ff9a2a', '#ffe27a'];

function block(g, x, y, width, height, seed) {
  g.rect(x, y, width, height, ROCK[1]);
  g.rect(x, y, width, 2, ROCK[3]);
  g.rect(x, y, 2, height, ROCK[2]);
  g.rect(x, y + height - 2, width, 2, ROCK[0]);
  g.rect(x + width - 2, y, 2, height, ROCK[0]);
  // Textura de pedra.
  for (let py = y + 2; py < y + height - 2; py += 2) {
    for (let px = x + 2; px < x + width - 2; px += 2) {
      const noise = hash(px, py, seed);
      if (noise > 0.82) g.rect(px, py, 2, 1, ROCK[2]);
      else if (noise < 0.12) g.rect(px, py, 1, 2, ROCK[0]);
    }
  }
}

function crack(g, points) {
  for (let index = 0; index + 1 < points.length; index += 1) {
    const [x0, y0] = points[index];
    const [x1, y1] = points[index + 1];
    g.line(x0, y0, x1, y1, LAVA[1]);
  }
  for (let index = 1; index + 1 < points.length; index += 1) g.pixel(points[index][0], points[index][1], LAVA[2]);
}

function drawGolem(g, frame) {
  const bob = frame === 1 ? 1 : 0;
  g.shadow(32, 61, 25, 3.5, 140);
  // Pernas e pés.
  block(g, 17, 45, 12, 14, 1);
  block(g, 35, 45, 12, 14, 2);
  block(g, 15, 55, 15, 7, 3);
  block(g, 34, 55, 15, 7, 4);
  // Quadril e tronco.
  block(g, 19, 38 + bob, 26, 10, 5);
  block(g, 13, 18 + bob, 38, 23, 6);
  // Ombros enormes.
  block(g, 4, 13 + bob, 16, 15, 7);
  block(g, 44, 13 + bob, 16, 15, 8);
  // Braços e punhos.
  block(g, 3, 27 + bob * 2, 11, 13, 9);
  block(g, 50, 27 + bob * 2, 11, 13, 10);
  block(g, 1, 39 + bob * 2, 14, 15, 11);
  block(g, 49, 39 + bob * 2, 14, 15, 12);
  // Cabeça quadrada afundada entre os ombros.
  block(g, 23, 3 + bob, 18, 18, 13);
  g.rect(23, 3 + bob, 18, 2, ROCK[3]);
  // Olhos em brasa.
  for (const x of [26, 34]) {
    g.rect(x - 1, 9 + bob, 6, 4, LAVA[0]);
    g.rect(x, 10 + bob, 4, 2, LAVA[2]);
    g.rect(x + 1, 10 + bob, 2, 2, LAVA[3]);
  }
  // Boca com dentes de pedra.
  g.rect(27, 16 + bob, 10, 2, ROCK[0]);
  for (const x of [28, 31, 34]) g.pixel(x, 16 + bob, ROCK[3]);
  // Rachaduras de lava pelo corpo.
  crack(g, [[32, 21 + bob], [30, 26 + bob], [33, 30 + bob], [31, 36 + bob], [32, 42 + bob]]);
  crack(g, [[16, 24 + bob], [21, 27 + bob], [26, 26 + bob], [30, 28 + bob]]);
  crack(g, [[48, 23 + bob], [43, 27 + bob], [38, 26 + bob], [34, 29 + bob]]);
  crack(g, [[20, 34 + bob], [25, 32 + bob], [30, 35 + bob]]);
  crack(g, [[44, 34 + bob], [39, 33 + bob], [35, 36 + bob]]);
  crack(g, [[8, 16 + bob], [11, 20 + bob], [9, 25 + bob]]);
  crack(g, [[56, 16 + bob], [53, 21 + bob], [55, 25 + bob]]);
  crack(g, [[4, 44 + bob * 2], [8, 47 + bob * 2], [6, 52 + bob * 2], [11, 50 + bob * 2]]);
  crack(g, [[60, 44 + bob * 2], [56, 47 + bob * 2], [58, 52 + bob * 2], [53, 50 + bob * 2]]);
  crack(g, [[20, 49], [24, 53], [21, 57]]);
  crack(g, [[44, 49], [40, 53], [43, 57]]);
  crack(g, [[18, 59], [28, 59]]);
  crack(g, [[36, 59], [46, 59]]);
  // Núcleo brilhando no peito.
  g.shaded(32, 29 + bob, 3, 3, LAVA);
  // Fagulhas.
  for (const [x, y] of [[10, 10], [58, 34], [2, 30], [47, 8]]) g.pixel(x, y - bob, frame ? LAVA[2] : LAVA[3]);
}

const DRAWERS = {
  slime: drawSlime,
  wolf: drawWolf,
  boar: drawBoar,
  skeleton: drawSkeleton,
  spider: drawSpider,
  ghost: drawGhost,
  werewolf: drawWerewolf,
  golem: drawGolem,
  titan: drawGolem,
  ...REGION_DRAWERS
};

export function hasMonsterArt(kind) {
  return Boolean(DRAWERS[kind]);
}

/** Desenha um quadro (0 ou 1) do monstro no tamanho pedido. */
export function drawMonsterFrame(kind, size, frame, { elite = false } = {}) {
  const canvas = new PixelCanvas(size, size);
  const draw = DRAWERS[kind];
  if (!draw) return canvas;
  draw(grid(canvas, size, LOGICAL[kind]), frame, elite);
  return canvas.outline({ strength: 0.9, ink: INK }).quantize();
}

