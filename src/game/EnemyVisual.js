import Phaser from 'phaser';
import { emissiveMask } from '../art/emissive.js';
import { ENEMY_TYPES } from '../data/enemies.js';
import { PixelCanvas, darken, lighten, ramp } from '../art/pixel.js';
import { MONSTER_SIZES, drawMonsterFrame, hasMonsterArt, monsterAttackFrame, monsterFrameCount } from '../art/monsters.js';
import { isBakedMonster } from '../art/bakedMonsters.js';
import { quantizePixels } from '../art/palette.js';

// Inimigos desenhados em pixel art no navegador, com as cores de enemies.json.
// Os desenhos usam uma grade de 32 unidades; o elite (40 px) é desenhado na
// própria resolução maior, e não ampliado, para os pixels continuarem quadrados.
const LOGICAL_SIZE = 32;

/** Canvas com coordenadas em unidades de 32, convertidas para o tamanho real. */
function scaledCanvas(canvas, size) {
  const k = size / LOGICAL_SIZE;
  const p = (value) => value * k;
  const length = (value) => Math.max(1, Math.round(value * k));
  return {
    k,
    pixel: (x, y, color, alpha) => canvas.rect(Math.floor(p(x)), Math.floor(p(y)), length(1), length(1), color, alpha),
    rect: (x, y, width, height, color, alpha) => canvas.rect(Math.round(p(x)), Math.round(p(y)), length(width), length(height), color, alpha),
    line: (x0, y0, x1, y1, color, thickness = 1) => {
      const steps = Math.max(1, Math.round(thickness * k));
      for (let offset = 0; offset < steps; offset += 1) {
        canvas.line(p(x0) + offset * 0.5, p(y0) + offset * 0.5, p(x1) + offset * 0.5, p(y1) + offset * 0.5, color);
      }
    },
    ellipse: (cx, cy, rx, ry, color, alpha) => canvas.ellipse(p(cx), p(cy), p(rx), p(ry), color, alpha),
    shaded: (cx, cy, rx, ry, colors, options) => canvas.shadedEllipse(p(cx), p(cy), p(rx), p(ry), colors, options),
    polygon: (points, color, alpha) => canvas.polygon(points.map(([x, y]) => [p(x), p(y)]), color, alpha),
    shadow: (cx, cy, rx, ry, alpha) => canvas.shadow(p(cx), p(cy), p(rx), p(ry), alpha)
  };
}

function eye(g, x, y, color, glow = false) {
  g.rect(x, y, 2, 2, color);
  g.pixel(x, y, glow ? lighten(color, 0.6) : '#f4f1ff');
}

function drawSlime(g, palette, frame) {
  const squash = frame === 1;
  const colors = ramp(palette.color);
  g.shadow(16, 27, 11, 2.5, 110);
  g.shaded(16, squash ? 20 : 19, squash ? 12 : 11, squash ? 8 : 9, colors);
  // Gota no topo, brilho e pingos.
  g.shaded(16, squash ? 12 : 10.5, 3, 3, colors);
  g.rect(10, 14, 3, 2, colors[3]);
  g.pixel(9, 16, colors[3]);
  g.pixel(22, 25, darken(palette.color, 0.35));
  g.pixel(8, 24, darken(palette.color, 0.35));
  // Rosto.
  eye(g, 12, squash ? 18 : 17, palette.eye);
  eye(g, 18, squash ? 18 : 17, palette.eye);
  g.rect(15, squash ? 22 : 21, 2, 1, darken(palette.color, 0.55));
}

function drawWolf(g, palette, frame) {
  const step = frame === 1 ? 1 : -1;
  const colors = ramp(palette.color);
  const belly = palette.snout;
  g.shadow(15, 27, 12, 2.2, 110);
  // Patas de trás (mais escuras) e da frente.
  for (const [x, lift, back] of [[8, step, true], [19, -step, true], [10, -step, false], [21, step, false]]) {
    g.rect(x, 21, 2, 6 - Math.max(0, lift), back ? palette.shade : colors[1]);
    g.rect(x, 26 - Math.max(0, lift), 3, 1, darken(palette.shade, 0.3));
  }
  // Cauda.
  g.polygon([[6, 17], [1, 11 + step], [3, 10 + step], [8, 15]], palette.shade);
  g.pixel(2, 11 + step, belly);
  // Corpo e peito.
  g.shaded(15, 18, 10, 5.5, colors);
  g.ellipse(20, 20, 4, 3, belly);
  g.rect(10, 13, 8, 2, palette.shade);
  // Cabeça, focinho e orelhas.
  g.shaded(24, 13, 5, 4.5, colors);
  g.polygon([[26, 13], [31, 15], [30, 17], [25, 17]], colors[1]);
  g.polygon([[27, 16], [31, 16], [30, 17], [26, 18]], belly);
  g.pixel(30, 14, '#1a1418');
  g.polygon([[20, 10], [21, 4], [24, 9]], palette.shade);
  g.polygon([[23, 9], [25, 4], [27, 10]], colors[1]);
  g.pixel(24, 6, darken(palette.shade, 0.3));
  eye(g, 25, 11, '#f2c14e', true);
  g.pixel(26, 12, palette.eye);
  g.pixel(28, 18, '#f4f1e6');
}

function drawBoar(g, palette, frame) {
  const step = frame === 1 ? 1 : -1;
  const colors = ramp(palette.color);
  g.shadow(16, 27, 13, 2.4, 115);
  for (const [x, lift, back] of [[7, step, true], [20, -step, true], [10, -step, false], [23, step, false]]) {
    g.rect(x, 22, 3, 5 - Math.max(0, lift), back ? palette.shade : colors[1]);
    g.rect(x, 26 - Math.max(0, lift), 3, 1, '#2a1c16');
  }
  g.shaded(15, 18, 12, 7.5, colors);
  // Crina de cerdas no dorso.
  for (let x = 6; x <= 21; x += 2) g.polygon([[x, 12], [x + 1, 8 + (x % 4 === 0 ? 0 : 1)], [x + 2, 12]], palette.shade);
  // Cabeça e focinho.
  g.shaded(25, 18, 5.5, 5.5, colors);
  g.rect(28, 17, 3, 5, darken(palette.color, 0.1));
  g.rect(30, 18, 2, 3, '#d99a86');
  g.pixel(31, 19, '#5a2e28');
  // Presas.
  g.polygon([[27, 21], [30, 19], [29, 22]], '#f4efe0');
  g.pixel(29, 19, '#ffffff');
  g.polygon([[22, 13], [24, 9], [26, 13]], palette.shade);
  eye(g, 25, 15, palette.eye);
  g.pixel(3, 17, palette.shade);
  g.pixel(2, 16, palette.shade);
}

function drawSkeleton(g, palette, frame) {
  const step = frame === 1 ? 1 : 0;
  const bone = ramp(palette.color);
  const dark = darken(palette.shade, 0.25);
  const glow = '#e1554a';
  g.shadow(16, 28, 7, 2, 110);
  // Pernas.
  g.rect(13, 21, 2, 6 + step, bone[1]);
  g.rect(17, 21, 2, 7 - step, bone[0]);
  g.rect(12, 27 + step, 4, 1, bone[1]);
  g.rect(17, 28 - step, 4, 1, bone[0]);
  // Bacia, coluna e costelas.
  g.rect(12, 19, 8, 2, bone[1]);
  g.rect(15, 11, 2, 9, bone[0]);
  for (const y of [12, 14, 16]) {
    g.rect(12, y, 8, 1, bone[1]);
    g.pixel(12, y, bone[2]);
  }
  // Braços: um segura uma espada enferrujada.
  g.line(11, 12, 9, 18 - step, bone[1]);
  g.line(21, 12, 23, 17 + step, bone[0]);
  g.line(24, 18 + step, 28, 8 + step, '#8d8a80');
  g.line(25, 18 + step, 29, 8 + step, '#b6b0a0');
  g.rect(22, 17 + step, 4, 1, '#6a4a2e');
  g.pixel(28, 9 + step, '#a8673e');
  // Crânio com olhos brilhando.
  g.shaded(16, 7, 6, 5.5, bone);
  g.rect(13, 10, 6, 3, bone[1]);
  g.rect(12, 6, 3, 3, dark);
  g.rect(17, 6, 3, 3, dark);
  g.pixel(13, 7, glow);
  g.pixel(18, 7, glow);
  g.pixel(15, 9, dark);
  g.pixel(16, 9, dark);
  for (const x of [14, 16, 18]) g.pixel(x, 12, dark);
}

function drawGhost(g, palette, frame) {
  const wave = frame === 1 ? 1 : -1;
  const colors = ramp(palette.color);
  g.shadow(16, 28, 7, 1.8, 70);
  // Cauda ondulada.
  g.polygon([[7, 15], [25, 15], [25, 22], [22, 25 + wave], [19, 22], [16, 26 - wave], [13, 22], [10, 25 + wave], [7, 21]], colors[1], 235);
  g.polygon([[19, 18], [25, 15], [25, 22], [22, 25 + wave], [19, 22]], colors[0], 235);
  g.shaded(16, 13, 9, 9, colors);
  // Braços fantasmagóricos.
  g.polygon([[7, 15], [3, 18 + wave], [8, 19]], colors[1], 235);
  g.polygon([[25, 15], [29, 17 - wave], [24, 19]], colors[0], 235);
  // Rosto: olhos vazios e boca aberta.
  g.rect(11, 10, 3, 4, palette.eye);
  g.rect(18, 10, 3, 4, palette.eye);
  g.pixel(11, 10, lighten(palette.color, 0.6));
  g.pixel(18, 10, lighten(palette.color, 0.6));
  g.rect(15, 16, 2, 2 + (frame === 1 ? 1 : 0), palette.eye);
}

function drawSpider(g, palette, frame) {
  const step = frame === 1 ? 1 : -1;
  const colors = [darken(palette.color, 0.2), palette.color, lighten(palette.color, 0.18), lighten(palette.color, 0.36)];
  g.shadow(16, 27, 13, 2.5, 120);
  // Oito patas com joelho.
  const legs = [
    [12, 16, 5, 9, 2, 20], [12, 18, 4, 14, 1, 24], [13, 20, 6, 19, 4, 27], [14, 21, 9, 22, 8, 28],
    [20, 16, 27, 9, 30, 20], [20, 18, 28, 14, 31, 24], [19, 20, 26, 19, 28, 27], [18, 21, 23, 22, 24, 28]
  ];
  legs.forEach(([x0, y0, kx, ky, x1, y1], index) => {
    const lift = index % 2 ? step : -step;
    g.line(x0, y0, kx, ky + lift, palette.leg, 1);
    g.line(kx, ky + lift, x1, y1, palette.leg, 1);
    g.pixel(kx, ky + lift, lighten(palette.leg, 0.25));
  });
  // Abdômen com marca e cabeça.
  g.shaded(16, 14, 8, 7, colors);
  g.polygon([[16, 10], [18, 13], [16, 16], [14, 13]], '#c8423a');
  g.shaded(16, 21, 5, 4, colors);
  // Olhos vermelhos em grupo e presas.
  for (const [x, y] of [[13, 20], [18, 20], [14, 22], [17, 22]]) g.pixel(x, y, palette.eye);
  g.pixel(13, 20, lighten(palette.eye, 0.5));
  g.pixel(18, 20, lighten(palette.eye, 0.5));
  g.pixel(15, 25, '#e8e2d0');
  g.pixel(17, 25, '#e8e2d0');
}

function drawWerewolf(g, palette, frame) {
  const step = frame === 1 ? 1 : -1;
  const colors = ramp(palette.color);
  g.shadow(16, 28, 10, 2.5, 120);
  // Pernas dobradas.
  g.polygon([[10, 20], [14, 20], [13, 25 + Math.max(0, step)], [9, 27], [8, 25]], palette.shade);
  g.polygon([[17, 20], [21, 20], [23, 25 - Math.min(0, step)], [21, 27], [18, 25]], colors[1]);
  g.rect(7, 27, 4, 1, darken(palette.shade, 0.3));
  g.rect(20, 27, 4, 1, darken(palette.shade, 0.3));
  // Tronco curvado e peito claro.
  g.shaded(15, 15, 9, 8, colors);
  g.ellipse(17, 17, 4, 4, palette.snout);
  // Braços com garras.
  g.polygon([[8, 11], [5, 19 + step], [8, 21 + step], [10, 14]], palette.shade);
  g.polygon([[22, 11], [27, 18 - step], [24, 21 - step], [21, 15]], colors[1]);
  for (const [x, y] of [[5, 21 + step], [7, 22 + step], [24, 22 - step], [26, 21 - step]]) g.pixel(x, y, '#f4efe0');
  // Cabeça de lobo virada para a direita.
  g.shaded(20, 7, 5.5, 5, colors);
  g.polygon([[22, 7], [29, 9], [28, 11], [22, 11]], colors[1]);
  g.polygon([[23, 10], [28, 10], [27, 12], [23, 12]], palette.snout);
  g.pixel(28, 8, '#1a1418');
  g.polygon([[15, 4], [16, 0], [19, 3]], palette.shade);
  g.polygon([[19, 3], [21, 0], [23, 4]], colors[1]);
  eye(g, 21, 5, palette.eye, true);
  g.pixel(25, 12, '#f4efe0');
  g.pixel(27, 12, '#f4efe0');
}

// ---------- Variantes da campanha (só visual; os atributos vêm da espécie base) ----------

function drawRat(g, palette, frame) {
  const step = frame === 1 ? 1 : -1;
  const colors = ramp(palette.color);
  g.shadow(16, 26, 10, 2, 100);
  g.line(5, 20, 1, 15 + step, '#d99a86', 1);
  for (const [x, lift] of [[9, step], [13, -step], [19, step], [22, -step]]) g.rect(x, 23, 2, 3 - Math.max(0, lift), palette.shade);
  g.shaded(14, 20, 9, 5, colors);
  g.shaded(23, 18, 5, 4, colors);
  g.polygon([[26, 17], [31, 19], [26, 21]], colors[1]);
  g.pixel(30, 19, '#d97a8a');
  g.ellipse(21, 13, 2.5, 2.5, '#d99a86');
  g.ellipse(21, 13, 1.5, 1.5, '#b06a6a');
  eye(g, 24, 16, palette.eye, true);
  g.pixel(28, 21, '#ffffff');
}

function drawHumanoid(g, palette, frame, { helmet = false, plume = null, sword = '#b6b0a0', cape = null } = {}) {
  const step = frame === 1 ? 1 : 0;
  const armor = ramp(palette.color);
  g.shadow(16, 28, 7, 2, 110);
  if (cape) g.polygon([[10, 12], [22, 12], [24, 26], [8, 26]], cape);
  g.rect(12, 21, 3, 6 + step, palette.shade);
  g.rect(17, 21, 3, 6 - step, darken(palette.shade, 0.2));
  g.rect(11, 26 + step, 4, 2, '#2a1c16');
  g.rect(17, 26 - step, 4, 2, '#2a1c16');
  g.shaded(16, 17, 6, 6, armor);
  g.rect(11, 20, 10, 2, '#4a2f1e');
  g.line(10, 13, 8, 19 - step, armor[1], 2);
  g.line(22, 13, 24, 18 + step, armor[0], 2);
  g.line(25, 18 + step, 29, 6 + step, sword, 1);
  g.rect(23, 17 + step, 4, 1, '#6a4a2e');
  if (helmet) {
    g.shaded(16, 8, 6, 5.5, ramp(palette.shade));
    g.rect(11, 8, 10, 2, '#141014');
    g.pixel(13, 8, palette.eye);
    g.pixel(18, 8, palette.eye);
    if (plume) g.polygon([[15, 2], [18, 0], [17, 4]], plume);
  } else {
    g.shaded(16, 8, 5.5, 5, ramp('#d9a070'));
    g.rect(11, 4, 10, 3, palette.shade);
    g.rect(11, 9, 10, 2, '#3a2a2a');
    eye(g, 13, 7, palette.eye);
    eye(g, 17, 7, palette.eye);
  }
}

function drawBandit(g, palette, frame) {
  drawHumanoid(g, palette, frame, { cape: '#4a2a2a' });
}

function drawKnight(g, palette, frame) {
  drawHumanoid(g, palette, frame, { helmet: true, plume: '#8b3fb1', sword: '#9aa3ab' });
}

function drawEmberKnight(g, palette, frame) {
  drawHumanoid(g, palette, frame, { helmet: true, plume: '#ffb04a', sword: '#ff8a3d', cape: '#8e2a14' });
  g.pixel(10, 18, '#ffb04a');
  g.pixel(21, 15, '#ffb04a');
}

function drawTreant(g, palette, frame) {
  const sway = frame === 1 ? 1 : -1;
  const bark = ramp(palette.shade);
  g.shadow(16, 28, 11, 2.4, 120);
  g.rect(10, 20, 4, 8, bark[0]);
  g.rect(18, 20, 4, 8, bark[0]);
  g.shaded(16, 17, 8, 8, bark);
  for (const y of [13, 17, 21]) g.line(11, y, 21, y + 1, bark[0]);
  g.line(9, 12, 3, 6 + sway, bark[1], 2);
  g.line(23, 12, 29, 6 - sway, bark[1], 2);
  for (const [x, y, r] of [[16, 6, 7], [8, 8, 4], [24, 8, 4], [4, 5 + sway, 3], [28, 5 - sway, 3]]) g.shaded(x, y, r, r * 0.8, ramp(palette.color));
  eye(g, 13, 14, palette.eye, true);
  eye(g, 18, 14, palette.eye, true);
}

function drawBear(g, palette, frame) {
  const step = frame === 1 ? 1 : -1;
  const fur = ramp(palette.color);
  g.shadow(16, 27, 13, 2.6, 120);
  for (const [x, lift] of [[7, step], [11, -step], [19, step], [23, -step]]) {
    g.rect(x, 21, 4, 6 - Math.max(0, lift), fur[0]);
    g.rect(x, 26 - Math.max(0, lift), 4, 1, '#3a3337');
  }
  g.shaded(15, 17, 12, 8, fur);
  g.shaded(26, 14, 5.5, 5, fur);
  g.ellipse(23, 9, 2, 2, fur[1]);
  g.ellipse(23, 9, 1, 1, palette.shade);
  g.ellipse(29.5, 16, 2.5, 2, palette.shade);
  g.pixel(31, 15, '#141014');
  eye(g, 27, 12, palette.eye);
}

function drawWaterSpirit(g, palette, frame) {
  drawGhost(g, palette, frame);
  g.polygon([[12, 2], [16, -2], [20, 2]], lighten(palette.color, 0.4), 220);
  for (const [x, y] of [[6, 10], [26, 12], [8, 22], [24, 22]]) g.pixel(x, y + (frame ? 1 : 0), '#e4fbff');
}

function drawScorpion(g, palette, frame) {
  const step = frame === 1 ? 1 : -1;
  const shell = ramp(palette.color);
  g.shadow(16, 26, 13, 2.4, 110);
  for (const [x0, y0, x1, y1] of [[11, 21, 5, 25], [13, 22, 9, 27], [19, 22, 23, 27], [21, 21, 27, 25]]) g.line(x0, y0, x1, y1 + step, palette.shade, 1);
  g.shaded(16, 20, 7, 4.5, shell);
  // Pinças.
  g.line(10, 18, 5, 13, shell[1], 2);
  g.shaded(4, 11, 3, 2.4, shell);
  g.line(22, 18, 27, 13, shell[1], 2);
  g.shaded(28, 11, 3, 2.4, shell);
  // Cauda em arco com ferrão.
  for (const [x, y] of [[16, 16], [17, 12], [16, 8], [14, 5]]) g.shaded(x, y + step, 2.4, 2.2, shell);
  g.polygon([[12, 4 + step], [15, 1 + step], [14, 6 + step]], '#3a1a14');
  eye(g, 14, 18, palette.eye, true);
  eye(g, 17, 18, palette.eye, true);
}

function drawGriffin(g, palette, frame) {
  const flap = frame === 1 ? 3 : 0;
  const body = ramp(palette.color);
  const feather = ramp(palette.shade);
  g.shadow(16, 28, 12, 2.4, 110);
  g.polygon([[12, 14], [2, 4 + flap], [6, 14], [3, 16 + flap / 2], [12, 18]], feather[1]);
  g.polygon([[20, 14], [30, 4 + flap], [26, 14], [29, 16 + flap / 2], [20, 18]], feather[0]);
  for (const x of [11, 19]) g.rect(x, 22, 3, 5, body[0]);
  g.shaded(16, 18, 7, 6, body);
  g.shaded(20, 10, 4.5, 4.5, feather);
  g.polygon([[23, 10], [28, 11], [24, 13]], '#e8b83a');
  eye(g, 20, 8, palette.eye, true);
  g.polygon([[8, 21], [3, 24], [5, 20]], body[1]);
}

function drawGolem(g, palette, frame) {
  const rock = ['#2e2624', '#4a3d38', '#6a5850', '#8c776b'];
  const lava = ['#8e2a14', '#e0602a', '#ffb04a', '#fff0b0'];
  const step = frame === 1 ? 1 : 0;
  g.shadow(16, 29, 12, 2.6, 130);
  g.shaded(11, 25, 4, 4, rock);
  g.shaded(21, 25, 4, 4, rock);
  g.shaded(16, 16, 9, 8, rock);
  g.shaded(6, 13, 4, 4, rock);
  g.shaded(26, 13, 4, 4, rock);
  g.shaded(5, 21 + step, 3.5, 4, rock);
  g.shaded(27, 21 - step, 3.5, 4, rock);
  g.shaded(16, 6, 5, 4, rock);
  g.rect(13, 5, 2, 1, lava[2]);
  g.rect(18, 5, 2, 1, lava[2]);
  g.shaded(16, 16, 3, 3, lava);
  for (const [x0, y0, x1, y1] of [[16, 13, 12, 9], [16, 19, 13, 23], [18, 16, 23, 14]]) g.line(x0, y0, x1, y1, lava[1]);
}

// palette.color = cor principal; shade = sombra; eye = olhos.
const VARIANTS = {
  rat: { draw: drawRat, palette: { color: '#8a8580', shade: '#5a5550', eye: '#e15b55' } },
  bandit: { draw: drawBandit, palette: { color: '#6b4a30', shade: '#3a2a20', eye: '#20211f' } },
  knight: { draw: drawKnight, palette: { color: '#5a4a6b', shade: '#3a3045', eye: '#d06aff' } },
  emberKnight: { draw: drawEmberKnight, palette: { color: '#4a2a24', shade: '#2a1814', eye: '#ffb04a' } },
  treant: { draw: drawTreant, palette: { color: '#4a8a48', shade: '#5a3d29', eye: '#e8f07a' } },
  bear: { draw: drawBear, palette: { color: '#eef2f4', shade: '#3a3337', eye: '#20211f' } },
  waterSpirit: { draw: drawWaterSpirit, palette: { color: '#6cb8e8', shade: '#2f7fb0', eye: '#0f2a3a' } },
  scorpion: { draw: drawScorpion, palette: { color: '#c9933a', shade: '#7a5214', eye: '#20211f' } },
  griffin: { draw: drawGriffin, palette: { color: '#c9933a', shade: '#eef2f4', eye: '#20211f' } },
  golem: { draw: drawGolem, palette: { color: '#4a3d38', shade: '#2e2624', eye: '#ffb04a' } }
};

const DRAWERS = {
  slime: drawSlime,
  wolf: drawWolf,
  boar: drawBoar,
  skeleton: drawSkeleton,
  ghost: drawGhost,
  spider: drawSpider,
  werewolf: drawWerewolf
};

function paletteFor(kind) {
  if (VARIANTS[kind]) return { snout: '#d8d2b8', leg: '#3a2a20', ...VARIANTS[kind].palette };
  const placeholder = ENEMY_TYPES[kind]?.placeholder;
  return {
    color: placeholder?.color ?? '#83c96b',
    shade: placeholder?.shade ?? '#4f7d4b',
    eye: placeholder?.eye ?? '#20231f',
    snout: placeholder?.snout ?? '#d8d2b8',
    leg: placeholder?.leg ?? '#111217'
  };
}

/** Desenha um quadro do inimigo e devolve o buffer de pixels. */
export function drawEnemyFrame(kind, size, frame, elite = false) {
  // Monstros redesenhados (src/art/monsters.js); os demais usam os desenhos abaixo.
  if (hasMonsterArt(kind)) return drawMonsterFrame(kind, size, frame, { elite });
  const canvas = new PixelCanvas(size, size);
  (VARIANTS[kind]?.draw ?? DRAWERS[kind] ?? drawSlime)(scaledCanvas(canvas, size), paletteFor(kind), frame);
  return canvas.outline();
}

/** Tamanho do desenho do inimigo (px). */
export function enemyCanvasSize(kind, elite = false) {
  const placeholder = ENEMY_TYPES[kind]?.placeholder;
  const sizes = MONSTER_SIZES[kind];
  // Monstros pintados (Fase 20G) têm o tamanho do próprio desenho.
  if (isBakedMonster(kind)) return elite ? sizes.elite : sizes.size;
  if (elite) return placeholder?.eliteSize ?? sizes?.elite ?? 40;
  return placeholder?.size ?? sizes?.size ?? 32;
}

function ensureCanvasTexture(scene, kind, elite) {
  const size = enemyCanvasSize(kind, elite);
  const textureKey = `enemy-canvas-${kind}-${elite ? 'elite' : 'normal'}`;
  const animationKey = `enemy-canvas-${kind}-${elite ? 'elite' : 'normal'}-walk`;

  // Pintados: quadros 0..3 de andar + 1 de ataque; antigos: 2 quadros.
  const count = hasMonsterArt(kind) ? monsterFrameCount(kind) : 2;
  const attack = hasMonsterArt(kind) ? monsterAttackFrame(kind) : null;
  const walkFrames = attack === null ? count : attack;

  if (!scene.textures.exists(textureKey)) {
    const texture = scene.textures.createCanvas(textureKey, size * count, size);
    const context = texture.getContext();
    context.clearRect(0, 0, size * count, size);
    for (let frame = 0; frame < count; frame += 1) {
      const pixels = drawEnemyFrame(kind, size, frame, elite);
      context.putImageData(new ImageData(quantizePixels(pixels).data, size, size), frame * size, 0);
    }
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    texture.refresh();
    for (let frame = 0; frame < count; frame += 1) {
      texture.add(frame === attack ? 'frame-attack' : `frame-${frame}`, 0, frame * size, 0, size, size);
    }
  }

  if (!scene.anims.exists(animationKey)) {
    scene.anims.create({
      key: animationKey,
      frames: Array.from({ length: walkFrames }, (_, frame) => ({ key: textureKey, frame: `frame-${frame}` })),
      frameRate: walkFrames > 2 ? 8 : 5,
      repeat: -1
    });
  }

  return { textureKey, animationKey, size, attackFrame: attack === null ? null : 'frame-attack' };
}

/** Camada dos pontos que brilham sozinhos de um chefe (src/art/emissive.js), com os mesmos quadros. */
export function ensureEmissiveTexture(scene, textureKey) {
  const key = `${textureKey}-emissive`;
  if (scene.textures.exists(key)) return key;
  const source = scene.textures.get(textureKey);
  const image = source.getSourceImage();
  const width = image.width;
  const height = image.height;
  const pixels = image.getContext('2d').getImageData(0, 0, width, height);
  const data = pixels.data;
  const frameWidth = source.get(source.getFrameNames()[0])?.cutWidth ?? width;
  const keep = emissiveMask(data, width, height, { frameWidth });
  for (let k = 0; k < keep.length; k += 1) if (!keep[k]) data[k * 4 + 3] = 0;
  const texture = scene.textures.createCanvas(key, width, height);
  texture.getContext().putImageData(pixels, 0, 0);
  texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  for (const name of source.getFrameNames()) {
    const frame = source.get(name);
    texture.add(name, 0, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight);
  }
  texture.refresh();
  return key;
}

export function createEnemyCanvasTexture(scene, kind, elite = false) {
  return ensureCanvasTexture(scene, kind, elite).textureKey;
}

export function resolveEnemyVisual(scene, kind, elite = false) {
  const visual = ensureCanvasTexture(scene, kind, elite);
  return {
    texture: visual.textureKey,
    frame: 'frame-0',
    animation: visual.animationKey,
    attackFrame: visual.attackFrame,
    shape: ENEMY_TYPES[kind]?.placeholder?.shape ?? kind,
    size: visual.size,
    isPlaceholder: true,
    isFallback: false
  };
}
