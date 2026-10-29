import { PixelCanvas, hash } from './pixel.js';
import { T } from '../data/worldRegions.js';
import { UNDER_SUBTILES, VALLEY_PATH_END_START, VALLEY_PATH_START, WANG_INTERIORS } from '../data/terrainLayout.js';

// Chão do mundo em ladrilhos de 48 px (G-terreno, refeito no nível das skins).
// - Base em "Wang de cantos": variante = 4 bits de canto (classe clara/escura vinda de um ruído do
//   mundo) + 3 miolos. A borda de cada ladrilho só depende dos 2 cantos dela, então qualquer vizinho
//   encaixa e as manchas atravessam ladrilhos: some a repetição de 48 px.
// - Grama: lâminas finas de 1 px (2 a 5 de altura), raiz escura, ponta clara, tufos com luz do alto
//   à esquerda; lâminas que passam da borda continuam no vizinho (posições periódicas, cor pelo campo local).
// - Transições e margens: contorno por interpolação dos cantos (marching squares) + ondulação suave,
//   então diagonais viram curvas e não degraus; a grama passa por cima da terra com pontas soltas.
// Todas as cores vêm da paleta-mestre (src/art/palette.js).

export const TILE_PX = 48;
const S = TILE_PX;
const LAST = S - 1;

// Rampas: [fundo, sombra, base, luz, brilho, faísca].
const RAMP = {
  [T.VALLEY]: ['#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f', '#d3fc7e'],
  [T.FOREST]: ['#0c2e44', '#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f'],
  [T.JUNGLE]: ['#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f', '#d3fc7e'],
  [T.SWAMP]: ['#2d2e25', '#494834', '#1e6f50', '#33984b', '#5ac54f', '#99e65f'],
  [T.SNOW]: ['#657392', '#92a1b9', '#9cc8e6', '#d5e8ef', '#ffffff', '#ffffff'],
  [T.SAND]: ['#8a4836', '#ad7954', '#cba36f', '#f6ca9f', '#f9e6cf', '#ffffff'],
  [T.DUNE]: ['#5d2c28', '#8a4836', '#ad7954', '#cba36f', '#e69c69', '#f6ca9f'],
  [T.BEACH]: ['#ad7954', '#cba36f', '#f6ca9f', '#f9e6cf', '#ffffff', '#ffffff'],
  [T.ASH]: ['#0e071b', '#1c121c', '#272727', '#2d2e25', '#3d3d3d', '#5d5d5d'],
  [T.CAVE]: ['#1c121c', '#272727', '#3d3d3d', '#5d5d5d', '#775c5b', '#918275']
};
const DIRT = ['#391f21', '#5d2c28', '#8a4836', '#ad7954', '#cba36f', '#e69c69', '#f6ca9f'];
const STONE = ['#272727', '#3d3d3d', '#5d5d5d', '#858585', '#b4b4b4'];
const WARM_STONE = ['#391f21', '#5d2c28', '#775c5b', '#918275', '#cba36f'];
const SNOW_STONE = ['#2a2f4e', '#424c6e', '#657392', '#92a1b9', '#ffffff'];
const GRASSY = new Set([T.VALLEY, T.FOREST, T.JUNGLE]);
const BLADED = new Set([T.VALLEY, T.FOREST, T.JUNGLE, T.SWAMP]);

const wrap = (value) => ((value % S) + S) % S;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = (t) => t * t * (3 - 2 * t);

/** Ruído de valor periódico (período `period`, em `cells` células). */
function periodic(x, y, cells, seed, period = S) {
  const size = period / cells;
  const gx = x / size;
  const gy = y / size;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = smooth(gx - x0);
  const fy = smooth(gy - y0);
  const corner = (cx, cy) => hash(((cx % cells) + cells) % cells, ((cy % cells) + cells) % cells, seed);
  const top = corner(x0, y0) + (corner(x0 + 1, y0) - corner(x0, y0)) * fx;
  const bottom = corner(x0, y0 + 1) + (corner(x0 + 1, y0 + 1) - corner(x0, y0 + 1)) * fx;
  return top + (bottom - top) * fy;
}

/** Peso do miolo: 0 nas bordas (iguais em todas as variantes), 1 a partir de 12 px para dentro. */
function inner(x, y) {
  const edge = Math.min(x, y, LAST - x, LAST - y);
  return smooth(clamp((edge - 2) / 6, 0, 1));
}

/** Classe interpolada dos cantos (0..1) no pixel: TL 1, TR 2, BL 4, BR 8. */
function wangAt(wang, x, y) {
  const fx = smooth(x / LAST);
  const fy = smooth(y / LAST);
  const top = (wang & 1) + (((wang >> 1) & 1) - (wang & 1)) * fx;
  const bottom = ((wang >> 2) & 1) + (((wang >> 3) & 1) - ((wang >> 2) & 1)) * fx;
  return top + (bottom - top) * fy;
}

/** Campo de tom (0..1) de um terreno: manchas em 3 escalas + classe dos cantos + miolo da variante. */
function toneField(kind, variant) {
  const wang = variant & 15;
  const core = Math.floor(variant / 16);
  const seed = kind * 31 + 7;
  const bladed = GRASSY.has(kind);
  const rocky = kind === T.ASH || kind === T.CAVE || kind === T.SWAMP;
  // Grama: tufos de 8-16 px. Chão macio e rocha: só grão fino (2-6 px); as manchas grandes vêm dos
  // cantos Wang (ruído do mundo), então nada de 'figura' que se repita a cada ladrilho.
  const [c1, c2, c3] = bladed ? [4, 6, 12] : rocky ? [4, 8, 16] : kind === T.SNOW ? [4, 8, 16] : [6, 12, 24];
  const [o1, o2] = bladed ? [5, 8] : rocky ? [6, 12] : [8, 16];
  const contrast = bladed ? 1.6 : rocky ? 1.1 : 0.62;
  const macro = bladed ? 0.38 : rocky ? 0.42 : 0.55;
  const field = new Float32Array(S * S);
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const shared = periodic(x, y, c1, seed) * 0.4 + periodic(x, y, c2, seed + 1) * 0.35 + periodic(x, y, c3, seed + 2) * 0.25;
      const own = periodic(x, y, o1, seed + 11 + core * 5) * 0.55 + periodic(x, y, o2, seed + 12 + core * 5) * 0.45;
      const w = inner(x, y);
      // Mistura que preserva o contraste (média simples achataria a faixa da emenda e desenharia uma moldura).
      const a = 1 - w * 0.9;
      const b = w * 0.9;
      const n = 0.5 + ((shared - 0.5) * a + (own - 0.5) * b) / Math.hypot(a, b);
      field[y * S + x] = clamp(0.5 + (n - 0.5) * contrast + (wangAt(wang, x, y) - 0.5) * macro, 0, 1);
    }
  }
  return field;
}

function scatterInner(seed, count, callback, margin = 8) {
  for (let index = 0; index < count; index += 1) {
    const x = margin + Math.floor(hash(index, 1, seed) * (S - margin * 2));
    const y = margin + Math.floor(hash(index, 2, seed) * (S - margin * 2));
    callback(x, y, index);
  }
}

/** Carimbo: linhas de texto, cada letra uma cor de `colors` ('.' = vazio). (x, y) = canto de baixo, no meio. */
function stamp(canvas, x, y, rows, colors, flip = false) {
  const height = rows.length;
  const width = rows[0].length;
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < width; rx += 1) {
      const char = row[flip ? width - 1 - rx : rx];
      if (char === '.' || !colors[char]) continue;
      canvas.pixel(x - (width >> 1) + rx, y - height + 1 + ry, colors[char]);
    }
  });
}

// ---------- Grama calma: manchas largas + tufos agrupados ----------

/**
 * Campo de tom "calmo" (0..1): só manchas de 24-48 px (ruído de 2 células + classe dos cantos Wang),
 * sem grão fino. Quantizado em 2-3 valores dá áreas lisas, como o chão da referência.
 */
function calmField(kind, variant) {
  const wang = variant & 15;
  const core = Math.floor(variant / 16);
  const seed = kind * 31 + 7;
  const field = new Float32Array(S * S);
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      // As manchas vêm dos cantos Wang (ruído do mundo, 48 px ou mais); o ruído do miolo só entorta a
      // divisa (amplitude pequena: ladrilho de cantos iguais fica liso, sem ilha repetida a cada 48 px).
      const own = periodic(x, y, 2, seed + 11 + core * 5) * 0.6 + periodic(x, y, 4, seed + 12 + core * 5) * 0.4;
      const w = smooth(clamp((Math.min(x, y, LAST - x, LAST - y) - 1) / 10, 0, 1));
      field[y * S + x] = clamp(0.5 + (wangAt(wang, x, y) - 0.5) * 0.8 + (own - 0.5) * 0.6 * w, 0, 1);
    }
  }
  return field;
}

/** Tom do chão de grama (índice da rampa) em 2 valores: manchas largas, como na referência. */
const GRASS_LEVELS = { [T.VALLEY]: [2, 3], [T.JUNGLE]: [2, 3], [T.FOREST]: [1, 2], [T.SWAMP]: [1, 2] };
const grassLevel = (kind, t) => GRASS_LEVELS[kind][t < 0.5 ? 0 : 1];

function calmGrassFloor(canvas, kind, field) {
  const ramp = RAMP[kind];
  for (let y = 0; y < S; y += 1) for (let x = 0; x < S; x += 1) canvas.pixel(x, y, ramp[grassLevel(kind, field[y * S + x])]);
}

/**
 * Tufo agrupado (touceira de 3-7 px de largura, 3-6 de altura): um monte de lâminas coladas com
 * pontas alternadas, sombra embaixo, corpo um tom acima do chão e ponta clara do lado da luz (alto à
 * esquerda). `level` = tom do chão onde nasce; `size` 0..2.
 */
function clump(cx, cy, ramp, level, seed, size, put) {
  const half = 1 + Math.floor(hash(seed, 1, 7) * 2) + (size > 1 ? 1 : 0);
  const tall = 2 + size + Math.floor(hash(seed, 2, 7) * 2);
  const dark = ramp[Math.max(0, level - 1)];
  const mid = ramp[level];
  const body = ramp[Math.min(4, level + 1)];
  const tip = ramp[Math.min(5, level + 2)];
  for (let i = -half; i <= half + 1; i += 1) put(cx + i, cy + 1, dark);
  for (let off = -half; off <= half; off += 1) {
    const round = 1 - (Math.abs(off) / (half + 1)) ** 2;
    // Colunas alternadas mais baixas: lê como lâminas separadas, não como bolha.
    const h = Math.max(1, Math.round(tall * round) - ((off + half) % 2 ? 1 : 0) + (hash(seed, off, 9) > 0.8 ? 1 : 0));
    for (let k = 0; k < h; k += 1) {
      const lvl = k / Math.max(1, h - 1);
      // Base escura, corpo um tom acima do chão; do lado da sombra (direita) a base sobe um pouco.
      let color = k === 0 || (off > 0 && lvl < 0.4) ? dark : body;
      if (k === h - 1 && h > 2 && off < 0 && level >= 2) color = tip;
      put(cx + off, cy - k, color);
    }
  }
}

/**
 * Tufos numa grade de 8 px com desvio, mais densos nas "touceiras" (ruído largo) e na divisa entre as
 * manchas de tom (esconde a linha da divisa), e raros no resto: áreas lisas entre os grupos.
 * Perto das bordas a posição e a cor são iguais em todas as variantes e o tufo dá a volta no vizinho.
 */
function calmTufts(canvas, kind, field, core, { density = 0.6, size = 1 } = {}) {
  const ramp = RAMP[kind];
  const seed = kind * 13 + 5;
  const cell = 8;
  const put = (x, y, hex) => canvas.pixel(wrap(x), wrap(y), hex);
  for (let gy = 0; gy < S; gy += cell) {
    for (let gx = 0; gx < S; gx += cell) {
      const x = gx + 1 + Math.floor(hash(gx, gy, seed + 1) * (cell - 2));
      const y = gy + 1 + Math.floor(hash(gx, gy, seed + 2) * (cell - 2));
      const interior = x > 6 && x < S - 7 && y > 7 && y < S - 3;
      const s = interior ? seed + 101 * (core + 1) : seed;
      let chance = periodic(x, y, 3, seed + 40 + (interior ? core * 3 : 0)) > 0.55 ? 0.7 : 0.06;
      if (interior) {
        const t = field[y * S + x];
        if (Math.abs(t - 0.5) < 0.08) chance = Math.max(chance, 0.7);
      }
      if (hash(gx, gy, s) > density * chance) continue;
      const level = interior ? grassLevel(kind, field[y * S + x]) : GRASS_LEVELS[kind][0];
      clump(x, y, ramp, level, hash(gx, gy, s + 3) * 1e6 | 0, size + (hash(gx, gy, s + 4) > 0.7 ? 1 : 0), put);
    }
  }
}

// ---------- Detalhes pequenos ----------

/** Seixo com luz no alto à esquerda, sombra embaixo à direita e sombra de contato. size 0..2. */
function pebble(canvas, x, y, size, colors, ground) {
  const [dark, mid, base, light, glint] = colors;
  if (size === 0) {
    canvas.pixel(x, y, base);
    canvas.pixel(x + 1, y, mid);
    canvas.pixel(x, y + 1, ground);
    canvas.pixel(x + 1, y + 1, dark);
    return;
  }
  stamp(canvas, x, y + 1, size === 1
    ? ['.lb.', 'lbbm', 'bbmd', '.gg.']
    : ['..lbb..', '.gllbm.', 'lbbbbmd', 'bbbbmmd', '.mmmdd.', '..ggg..'], { l: light, b: base, m: mid, d: dark, g: size === 2 ? glint : ground });
  if (size === 2) { canvas.pixel(x - 2, y - 3, glint); canvas.pixel(x - 1, y + 2, ground); canvas.pixel(x, y + 2, ground); canvas.pixel(x + 1, y + 2, ground); }
}

const FLOWERS = [['#ffffff', '#ffc825'], ['#ffeb57', '#e07438'], ['#f68187', '#ffeb57'], ['#9cc8e6', '#ffffff'], ['#fdd2ed', '#ffc825']];

/** Florzinha de 3 a 5 px com caule e folha. */
function flower(canvas, x, y, set, leaf) {
  const [petal, center] = FLOWERS[set % FLOWERS.length];
  canvas.pixel(x, y + 1, leaf);
  canvas.pixel(x - 1, y + 2, leaf);
  canvas.pixel(x, y - 1, petal);
  canvas.pixel(x - 1, y, petal);
  canvas.pixel(x + 1, y, petal);
  canvas.pixel(x, y, center);
}

/** Rachadura fina (passeio aleatório) com borda clara do lado da luz. */
function crack(canvas, x, y, length, seed, dark, light, { glow = null, core = null } = {}) {
  let cx = x;
  let cy = y;
  let dir = hash(seed, 0, 3) < 0.5 ? 1 : -1;
  for (let step = 0; step < length; step += 1) {
    canvas.pixel(cx, cy, glow && step % 5 !== 0 ? glow : dark);
    if (core && step % 4 === 2) canvas.pixel(cx, cy, core);
    if (light) canvas.pixel(cx, cy - 1, light);
    const roll = hash(step, seed, 5);
    if (roll < 0.55) cx += dir;
    else if (roll < 0.85) cy += 1;
    else { cy -= 1; cx += dir; }
    if (hash(step, seed, 6) > 0.86) dir = -dir;
    cx = clamp(cx, 4, S - 5);
    cy = clamp(cy, 4, S - 5);
  }
}

/** Tufo de grama: lâminas num leque, sombra embaixo. Para a decoração e a trilha. */
function tuftAt(canvas, cx, cy, ramp, seed, { count = 7, min = 3, max = 6, spread = 3 } = {}) {
  for (let i = -spread; i <= spread; i += 1) canvas.pixel(cx + i, cy + 1, ramp[0], 150);
  const list = [];
  for (let i = 0; i < count; i += 1) {
    const offset = Math.round((hash(i, 1, seed) - 0.5) * spread * 2);
    list.push({ x: cx + offset, y: cy - (hash(i, 2, seed) < 0.3 ? 1 : 0), h: min + Math.floor(hash(i, 3, seed) * (max - min + 1)), lean: Math.sign(offset) });
  }
  list.sort((a, b) => a.h - b.h);
  for (const blade of list) {
    for (let k = 0; k < blade.h; k += 1) {
      const lvl = k / (blade.h - 1);
      const px = blade.x + (lvl > 0.6 ? blade.lean : 0);
      const index = clamp(Math.round(1 + lvl * 2.6 + (blade.x < cx ? 0.4 : -0.3)), 1, 4);
      canvas.pixel(px, cy - k, ramp[k === blade.h - 1 && blade.x <= cx && hash(blade.x, k, seed) > 0.5 ? Math.min(5, index + 1) : index]);
    }
  }
}

// ---------- Texturas base ----------

const calmCache = new Map();
function calmOf(kind, variant) {
  const key = `${kind}-${variant}`;
  if (!calmCache.has(key)) calmCache.set(key, calmField(kind, variant));
  return calmCache.get(key);
}

const fieldCache = new Map();
function fieldOf(kind, variant) {
  const key = `${kind}-${variant}`;
  if (!fieldCache.has(key)) fieldCache.set(key, toneField(kind, variant));
  return fieldCache.get(key);
}

/** Chão macio (neve, areia, duna, praia): tom suave em 3-4 degraus + grão esparso. */
function softGround(canvas, kind, field, seed) {
  const r = RAMP[kind];
  const steps = {
    [T.SNOW]: [[0.5, r[3]], [2, r[4]]],
    [T.SAND]: [[0.5, r[2]], [2, r[3]]],
    [T.DUNE]: [[0.5, r[2]], [2, r[3]]],
    [T.BEACH]: [[0.5, r[2]], [2, r[3]]]
  }[kind];
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const t = field[y * S + x];
      canvas.pixel(x, y, steps.find(([limit]) => t < limit)[1]);
      const g = hash(x, y, seed);
      if (g > 0.997) canvas.pixel(x, y, kind === T.SNOW ? '#ffffff' : t > 0.5 ? r[4] : r[0]);
      else if (g < 0.002 && kind !== T.SNOW) canvas.pixel(x, y, r[1]);
    }
  }
}

/** Ondulações de vento: crista clara com sombra embaixo, em arcos que somem e voltam. */
function ripples(canvas, kind, field, seed, variant) {
  const r = RAMP[kind];
  const spacing = kind === T.DUNE ? 11 : kind === T.SNOW ? 16 : 15;
  const wang = variant & 15;
  for (let x = 0; x < S; x += 1) {
    const bend = Math.sin((x / S) * Math.PI * 2 + seed) * 2.4 + Math.sin((x / S) * Math.PI * 4 + seed * 1.7) * 1.2;
    for (let y = 0; y < S; y += 1) {
      const phase = (((y + bend) % spacing) + spacing) % spacing;
      const keep = periodic(x, y, 4, seed + 11) + (wangAt(wang, x, y) - 0.5) * 0.3 > (kind === T.DUNE ? 0.6 : 0.66);
      if (!keep) continue;
      const t = field[y * S + x];
      if (phase < 1) canvas.pixel(x, y, t > 0.4 ? r[3] : r[2]);
      else if (phase < 2) canvas.pixel(x, y, r[1]);
          }
  }
}

/** Chão de pedra/cinza: tom em degraus, grão e marcas. */
function rockGround(canvas, kind, field, seed) {
  const r = RAMP[kind];
  const steps = kind === T.CAVE
    ? [[0.3, r[2]], [0.7, r[3]], [0.9, r[4]], [2, r[5]]]
    : [[0.22, r[1]], [0.55, r[2]], [0.82, r[3]], [2, r[4]]];
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const t = field[y * S + x];
      canvas.pixel(x, y, steps.find(([limit]) => t < limit)[1]);
      // Luz do alto à esquerda nas "lombadas" do chão.
      if (kind === T.CAVE && x > 0 && y > 0 && field[y * S + x] - field[(y - 1) * S + x - 1] > 0.075) canvas.pixel(x, y, kind === T.CAVE ? r[5] : r[4]);
      const g = hash(x, y, seed);
      if (g > 0.99) canvas.pixel(x, y, kind === T.CAVE ? r[1] : r[0]);
      else if (g < 0.005) canvas.pixel(x, y, kind === T.CAVE ? r[5] : r[5]);
    }
  }
}

function base(canvas, kind, variant) {
  const ramp = RAMP[kind];
  const field = fieldOf(kind, variant);
  const tone = (x, y) => field[y * S + x];
  const core = Math.floor(variant / 16);
  const s = kind * 70 + core * 31 + (variant & 15) * 3;
  if (BLADED.has(kind)) {
    const calm = calmOf(kind, variant);
    calmGrassFloor(canvas, kind, calm);
    const options = {
      [T.VALLEY]: { density: 0.68, size: 1 },
      [T.FOREST]: { density: 0.55, size: 1 },
      [T.JUNGLE]: { density: 0.64, size: 2 },
      [T.SWAMP]: { density: 0.7, size: 0 }
    }[kind];
    calmTufts(canvas, kind, calm, core, options);
    if (kind === T.FOREST) {
      // Folhas caídas e gravetos no miolo.
      scatterInner(s + 1, 2 + core, (x, y, i) => {
        const leaf = ['#8a4836', '#bf6f4a', '#5d2c28', '#e07438'][(i + core) % 4];
        canvas.pixel(x, y, leaf); canvas.pixel(x + 1, y, leaf); canvas.pixel(x + 1, y + 1, ramp[0]);
      });
      if (core === 2) { canvas.line(16, 30, 26, 27, '#391f21'); canvas.line(16, 31, 26, 28, ramp[0]); canvas.pixel(21, 28, '#5d2c28'); }
    } else if (kind === T.SWAMP) {
      // Poça de lama com brilho (só num dos miolos; o resto vem da decoração).
      scatterInner(s + 2, core === 1 ? 1 : 0, (x, y) => {
        canvas.ellipse(x, y, 4, 1.8, '#1c121c');
        canvas.ellipse(x, y, 3, 1.2, '#2a2f4e');
        canvas.pixel(x - 1, y - 1, '#657392');
        canvas.pixel(x + 2, y, '#424c6e');
      }, 10);
    }
    return;
  }
  if (kind === T.SNOW || kind === T.SAND || kind === T.DUNE || kind === T.BEACH) {
    softGround(canvas, kind, calmOf(kind, variant), s);
    if (kind === T.SAND || kind === T.DUNE) ripples(canvas, kind, calmOf(kind, variant), kind * 3 + 1, variant);
    if (kind === T.SNOW) {
      // Montinhos de neve (luz em cima, lado de baixo azulado) e brilhos.
      scatterInner(s + 3, 1 + (core % 2), (x, y) => {
        for (let dx = -4; dx <= 4; dx += 1) {
          const h = Math.round(Math.sqrt(Math.max(0, 1 - (dx / 4.5) ** 2)) * 2);
          for (let dy = -h; dy <= 0; dy += 1) canvas.pixel(x + dx, y + dy, dy === -h ? '#ffffff' : '#d5e8ef');
          canvas.pixel(x + dx, y + 1, '#9cc8e6');
        }
      }, 10);
      if (core === 2) pebble(canvas, 26, 28, 1, SNOW_STONE, '#9cc8e6');
    } else if (kind === T.BEACH) {
      scatterInner(s + 4, 2 + core, (x, y, i) => {
        const shell = ['#ffffff', '#f68187', '#fdd2ed', '#ad7954'][(i + core) % 4];
        canvas.pixel(x, y, shell); canvas.pixel(x + 1, y, shell); canvas.pixel(x, y + 1, RAMP[T.BEACH][1]);
      });
    } else if (core === 1) pebble(canvas, 26, 30, 1, WARM_STONE, ramp[1]);
    return;
  }
  // Cinza vulcânica e caverna: chão de rocha/cinza sem placas (nada de cara de muro).
  rockGround(canvas, kind, field, s);
  if (kind === T.ASH) {
    scatterInner(s + 5, 3 + core, (x, y, i) => {
      if (i % 3 === 0) { canvas.pixel(x, y, '#c64524'); canvas.pixel(x + 1, y, '#391f21'); }
      else { canvas.pixel(x, y, '#5d5d5d'); canvas.pixel(x + 1, y + 1, '#0e071b'); }
    }, 6);
    if (core === 2) crack(canvas, 12, 18, 18, s, '#0e071b', null, { glow: '#8e251d', core: '#ffa214' });
    if (core === 1) pebble(canvas, 30, 28, 1, ['#0e071b', '#1c121c', '#272727', '#3d3d3d', '#5d5d5d'], '#0e071b');
  } else {
    crack(canvas, 10 + core * 6, 14 + core * 5, 10 + core * 3, s, '#272727', '#918275');
    scatterInner(s + 6, 2 + core, (x, y, i) => pebble(canvas, x, y, i % 2, STONE, RAMP[T.CAVE][1]), 8);
  }
}

export function drawBaseTile(kind, variant = 0) {
  const canvas = new PixelCanvas(S, S);
  base(canvas, kind, variant);
  return canvas;
}

// ---------- Vale (folha 'grass') e trilha de terra ----------

// Curvas da borda da trilha: senos com zero em y = 0 e y = 48, então qualquer variante encaixa
// em cima e embaixo, mas cada ladrilho tem o próprio desenho (sem zigue-zague repetido).
const PATH_WAVES = [[3.2, -1.4, 0.8], [-2.6, 1.8, -0.7], [1.6, 2.2, 1.1], [-3.4, -1.0, 1.3]];
const PATH_EDGE = 13;

/** Quadros: 0..47 grama Wang; 48..55 trilha (lado x 4 variantes); 56..59 fim da trilha (lado x 2). */
export function drawValleyTile(frame) {
  const canvas = new PixelCanvas(S, S);
  if (frame < VALLEY_PATH_START) {
    base(canvas, T.VALLEY, frame % (16 * WANG_INTERIORS));
    return canvas;
  }
  const end = frame >= VALLEY_PATH_END_START;
  const side = end ? Math.floor((frame - VALLEY_PATH_END_START) / 2) % 2 : Math.floor((frame - VALLEY_PATH_START) / 4) % 2;
  const v = end ? (frame - VALLEY_PATH_END_START) % 2 : (frame - VALLEY_PATH_START) % 4;
  base(canvas, T.VALLEY, 0);
  drawPath(canvas, side, v, end);
  return canvas;
}

/** Distância (px, > 0 = dentro da terra) até a borda da trilha. */
function pathDistance(x, y, side, v, end) {
  const wave = PATH_WAVES[v];
  const edge = PATH_EDGE + wave.reduce((sum, a, k) => sum + a * Math.sin(((k + 1) * Math.PI * y) / S), 0)
    + Math.sin((Math.PI * y) / S) * (periodic(x, y, 4, 77 + v) - 0.5) * 2;
  let d = (side === 0 ? x : LAST - x) - edge;
  if (end) {
    // Fim arredondado: elipse sobre os dois ladrilhos (centro na emenda entre eles).
    const X = side === 0 ? x : x + S;
    const rx = S - PATH_EDGE;
    const ry = 26 + (v ? 3 : 0);
    if (y > 2) {
      const r = Math.hypot((X - S) / rx, (y - 2) / ry);
      d = Math.min(d, (1 - r) * Math.min(rx, ry));
    }
  }
  return d;
}

function drawPath(canvas, side, v, end) {
  const grass = RAMP[T.VALLEY];
  const grassCopy = new PixelCanvas(S, S);
  grassCopy.blit(canvas, 0, 0);
  const dist = new Float32Array(S * S);
  for (let y = 0; y < S; y += 1) for (let x = 0; x < S; x += 1) dist[y * S + x] = pathDistance(x, y, side, v, end);
  const seed = 404;
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const d = dist[y * S + x];
      if (d <= 0) {
        // Beirada da grama um tom mais clara (o barranco pega luz).
        if (d > -1.2 && grassCopy.colorAt(x, y) !== grass[0]) canvas.pixel(x, y, grass[3]);
        continue;
      }
      // Terra batida: manchas em 3 tons, grão fino e duas marcas de roda/pé gastas.
      const X = side === 0 ? x : x + S;
      // Manchas largas (12-24 px) em 2 tons + poucas luzes: terra batida calma, sem chiado.
      const n = periodic(x, y, 2, seed) * 0.6 + periodic(x, y, 4, seed + 1) * 0.4;
      let color = DIRT[n < 0.36 ? 2 : n < 0.72 ? 3 : 4];
      const rut = Math.min(Math.abs(X - 33), Math.abs(X - 63));
      if (rut < 1.5 && periodic(x, y, 4, seed + 3) > 0.45) color = n < 0.36 ? DIRT[1] : DIRT[2];
      const g = hash(x, y, seed + 4);
      if (g > 0.998) color = DIRT[5];
      else if (g < 0.002) color = DIRT[1];
      // Sombra que a grama faz na terra, logo abaixo do barranco.
      if (d < 1.3) color = DIRT[1];
      else if (d < 2.6) color = DIRT[2];
      canvas.pixel(x, y, color);
    }
  }
  // Pedrinhas e marcas no miolo da terra (posições diferentes em cada variante).
  for (let i = 0; i < 3; i += 1) {
    const x = 6 + Math.floor(hash(i, v, 410 + side) * 36);
    const y = 6 + Math.floor(hash(i, v, 411 + side) * 36);
    if (dist[y * S + x] < 5) continue;
    if (i % 3 === 0) pebble(canvas, x, y, 1, i % 2 ? WARM_STONE : STONE, DIRT[1]);
    else if (i % 3 === 1) pebble(canvas, x, y, 0, STONE, DIRT[1]);
    else { canvas.pixel(x, y, DIRT[1]); canvas.pixel(x + 1, y, DIRT[1]); canvas.pixel(x + 2, y + 1, DIRT[1]); canvas.pixel(x, y - 1, DIRT[5]); }
  }
  // Grama passando por cima da beirada: lâminas com raiz na grama, inclinadas para a terra.
  const lean = side === 0 ? 1 : -1;
  for (let y = 2; y < S - 1; y += 1) {
    for (let x = 1; x < S - 1; x += 1) {
      const d = dist[y * S + x];
      if (d > -0.5 || d < -3 || hash(x, y, 420 + v) > 0.22) continue;
      const height = 2 + Math.floor(hash(x, y, 421) * 3);
      for (let k = 0; k < height; k += 1) {
        const lvl = k / (height - 1);
        const px = x + (lvl > 0.5 ? lean : 0) + (lvl > 0.9 && height > 3 ? lean : 0);
        if (px < 0 || px > LAST || y - k < 0) continue;
        canvas.pixel(px, y - k, grass[clamp(Math.round(1.6 + lvl * 2.4), 1, 4)]);
      }
    }
  }
  // Um tufinho perdido no meio da terra em algumas variantes.
  if (v === 2 || (end && v === 1)) {
    const x = side === 0 ? 30 : 17;
    if (dist[30 * S + x] > 6) tuftAt(canvas, x, 30, grass, 430 + v, { count: 6, min: 2, max: 4, spread: 2 });
  }
}

// ---------- Contorno pelos cantos (franjas entre terrenos e margens de água) ----------

/**
 * Fração das 4 células em volta de cada canto que estão marcadas na máscara (bits N 1, L 2, S 4,
 * O 8, NE 16, SE 32, SO 64, NO 128; 256 = o próprio ladrilho). Ordem: TL, TR, BL, BR.
 */
function cornerFractions(mask) {
  const bit = (b) => ((mask & b) ? 1 : 0);
  const self = bit(256);
  return [
    (bit(128) + bit(1) + bit(8) + self) / 4,
    (bit(1) + bit(16) + bit(2) + self) / 4,
    (bit(8) + bit(64) + bit(4) + self) / 4,
    (bit(2) + bit(32) + bit(4) + self) / 4
  ];
}

/** Interpolação bilinear dos cantos (marching squares): diagonal em degrau vira curva. */
function bilinear(c, x, y) {
  const fx = (x + 0.5) / S;
  const fy = (y + 0.5) / S;
  const top = c[0] + (c[1] - c[0]) * fx;
  const bottom = c[2] + (c[3] - c[2]) * fx;
  return top + (bottom - top) * fy;
}

/** Arredonda a ponta de um canto que só encosta na diagonal (as 3 telhas em volta fazem o mesmo). */
function cornerFillet(c, x, y, radius = 20) {
  const points = [[0, 0], [S, 0], [0, S], [S, S]];
  let bump = 0;
  c.forEach((value, i) => {
    if (value !== 0.25) return;
    const d = Math.hypot(x + 0.5 - points[i][0], y + 0.5 - points[i][1]);
    bump = Math.max(bump, 0.2 * Math.max(0, 1 - d / radius));
  });
  return bump;
}

/** Ondulação suave da borda (periódica: igual dos dois lados da emenda). */
const edgeWobble = (x, y, seed) => (periodic(x, y, 2, seed) - 0.5) * 0.16 + (periodic(x, y, 3, seed + 3) - 0.5) * 0.14 + (periodic(x, y, 5, seed + 1) - 0.5) * 0.07 + (periodic(x, y, 12, seed + 2) - 0.5) * 0.02;

const FRINGE_THRESHOLD = 0.34;

const baseCache = new Map();
function baseOf(kind) {
  if (!baseCache.has(kind)) baseCache.set(kind, drawBaseTile(kind, 0));
  return baseCache.get(kind);
}

/** Pinta a borda de `kind` invadindo este ladrilho onde a máscara (8 vizinhos) marca `kind`. */
function applyFringe(canvas, kind, mask) {
  const source = baseOf(kind);
  const ramp = RAMP[kind];
  const c = cornerFractions(mask & 255);
  const seed = 140 + kind;
  const value = (x, y) => bilinear(c, x, y) + cornerFillet(c, x, y) + edgeWobble(x, y, seed);
  const dist = new Float32Array(S * S);
  for (let y = 0; y < S; y += 1) for (let x = 0; x < S; x += 1) dist[y * S + x] = (value(x, y) - FRINGE_THRESHOLD) * 96;
  const at = (x, y) => dist[clamp(y, 0, LAST) * S + clamp(x, 0, LAST)];
  const snow = kind === T.SNOW;
  const grass = GRASSY.has(kind) || kind === T.SWAMP;
  const sandy = kind === T.SAND || kind === T.DUNE || kind === T.BEACH;
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const d = dist[y * S + x];
      // Para onde a borda "olha": dUp > 0 = o terreno invasor está embaixo (borda de cima dele).
      const dUp = at(x, y + 2) - at(x, y - 2);
      if (d >= 0) {
        let color = source.colorAt(x, y);
        if (snow) {
          if (d < 1.3) color = dUp > 0 ? ramp[4] : ramp[3];
          else if (d < 4 && dUp < 0) color = d < 2.5 ? ramp[1] : ramp[2];
        } else if (grass) {
          if (d < 1.1) color = dUp >= 0 ? ramp[3] : ramp[1];
        } else if (sandy) {
          if (d < 1) color = ramp[1];
        } else if (d < 1.2) color = ramp[1];
        canvas.pixel(x, y, color);
      } else if (d > -2.6) {
        if (sandy) {
          if (d > -2 && hash(x, y, seed + 4) > 0.72) canvas.pixel(x, y, ramp[2]);
        } else if (dUp < 0 || !grass) {
          // Sombra do barranco no terreno de baixo (mais forte embaixo do invasor).
          canvas.pixel(x, y, '#0e071b', dUp < 0 ? (d > -1.3 ? 90 : 50) : 40);
        }
      }
    }
  }
  if (!grass) return;
  // Lâminas na beirada, com raiz dentro e ponta passando para fora (nada de serrilhado).
  for (let y = 1; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const d = dist[y * S + x];
      if (d < 0.3 || d > 3 || hash(x, y, seed + 6) > 0.24) continue;
      const dx = at(x + 2, y) - at(x - 2, y);
      const lean = dx > 0.8 ? -1 : dx < -0.8 ? 1 : 0;
      const height = 2 + Math.floor(hash(x, y, seed + 7) * 3);
      for (let k = 0; k < height; k += 1) {
        const lvl = k / (height - 1);
        const px = x + (lvl > 0.5 ? lean : 0);
        if (px < 0 || px > LAST || y - k < 0) continue;
        canvas.pixel(px, y - k, ramp[clamp(Math.round(1.5 + lvl * 2.5), 1, 4)]);
      }
    }
  }
}

/** Ladrilho só com a franja (o resto transparente), para a camada de cima do chão. */
export function drawFringeTile(kind, mask) {
  const canvas = new PixelCanvas(S, S);
  applyFringe(canvas, kind, mask);
  return canvas;
}

// ---------- Margens (terra sobre água/lava/lodo/gelo) ----------

const EDGE_STYLE = {
  [T.SEA]: { lip: '#ffffff', band: '#d5e8ef', wet: '#ad7954', wetWidth: 3.5, sand: '#f6ca9f', sandLight: '#f9e6cf', foam: '#ffffff', foam2: '#94fdff' },
  [T.LAVA]: { lip: '#ffa214', band: '#8e251d', wet: '#1c121c', wetWidth: 4, sand: null, foam: '#ffeb57', foam2: '#ffa214' },
  [T.MURK]: { lip: '#1e6f50', band: '#134c4c', wet: '#1c121c', wetWidth: 3, sand: null, foam: null },
  [T.ICE]: { lip: '#ffffff', band: '#d5e8ef', wet: '#9cc8e6', wetWidth: 1.5, sand: null, foam: null }
};

/**
 * Ladrilho de terra (land) sobre `under`. A máscara marca a água entre os 8 vizinhos (bits como em
 * cornerFractions) e 256 quando o próprio quadrado é água: a terra então só aparece nos cantos.
 */
export function drawEdgeTile(land, under, mask, core = 0) {
  const canvas = drawBaseTile(land, 16 * (core % WANG_INTERIORS));
  const style = EDGE_STYLE[under];
  const c = cornerFractions(mask);
  const sandy = land === T.BEACH || land === T.SAND || land === T.DUNE;
  const seed = 92 + under;
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      // d = px de terra até a margem (< 0 = água).
      const water = bilinear(c, x, y);
      const d = (0.5 - water) * 96 + edgeWobble(x, y, seed) * 48;
      if (d < 0) {
        canvas.clearPixel(x, y);
        if (style.foam && d > -4.5 && d < -2.2 && periodic(x, y, 8, seed + 3) > 0.48) canvas.pixel(x, y, d > -3.2 ? style.foam : style.foam2, 210);
        continue;
      }
      if (d < 1.4) canvas.pixel(x, y, style.lip);
      else if (d < 2.4) canvas.pixel(x, y, style.band);
      else if (d < 2.4 + style.wetWidth + (periodic(x, y, 6, seed + 5) - 0.5) * 2.5) canvas.pixel(x, y, style.wet);
      else if (style.sand && !sandy) {
        // Faixa de areia entre a mata e o mar, com borda ondulada (a grama passa por cima).
        const limit = 13 + (periodic(x, y, 4, seed + 7) - 0.5) * 7;
        if (d < limit) canvas.pixel(x, y, hash(x, y, seed + 8) > 0.93 ? style.sandLight : d > limit - 1.2 ? '#cba36f' : style.sand);
        else if (d < limit + 1.2 && GRASSY.has(land)) canvas.pixel(x, y, RAMP[land][3]);
      }
    }
  }
  return canvas;
}

// ---------- Decoração (camada própria, transparente) ----------

export const DECOR_COUNT = 6;
export const DECOR_KINDS = Object.freeze([T.VALLEY, T.FOREST, T.JUNGLE, T.SWAMP, T.SNOW, T.SAND, T.DUNE, T.BEACH, T.ASH, T.CAVE]);

/** Tufos, flores, seixos e marcas soltas por cima do chão (quebram ainda mais a repetição). */
export function drawDecorTile(kind, n) {
  const canvas = new PixelCanvas(S, S);
  const ramp = RAMP[kind];
  const s = 900 + kind * 13 + n * 7;
  const cx = 14 + Math.floor(hash(n, kind, 1) * 20);
  const cy = 16 + Math.floor(hash(n, kind, 2) * 18);
  const tufts = (count, options) => {
    for (let i = 0; i < count; i += 1) {
      tuftAt(canvas, cx - 9 + Math.floor(hash(i, 1, s) * 18), cy - 5 + Math.floor(hash(i, 2, s) * 10), ramp, s + i * 3, options);
    }
  };
  const flowers = (count, set) => {
    for (let i = 0; i < count; i += 1) flower(canvas, cx + Math.round((hash(i, 3, s) - 0.5) * 14), cy + Math.round((hash(i, 4, s) - 0.5) * 8), set + (i % 2) * 2, ramp[1]);
  };
  switch (kind) {
    case T.VALLEY:
    case T.JUNGLE:
      if (n === 0) tufts(3);
      else if (n === 1) { tufts(1); flowers(4, kind === T.JUNGLE ? 2 : 0); }
      else if (n === 2) flowers(5, kind === T.JUNGLE ? 2 : 1);
      else if (n === 3) { pebble(canvas, cx, cy, 2, STONE, ramp[0]); tuftAt(canvas, cx - 6, cy + 2, ramp, s, { count: 5, spread: 2 }); }
      else if (n === 4) tufts(2, { count: 9, min: 4, max: 7, spread: 4 });
      else { flowers(2, 4); pebble(canvas, cx + 6, cy + 3, 0, STONE, ramp[0]); }
      break;
    case T.FOREST:
      if (n === 0) tufts(2, { count: 8, min: 3, max: 6 });
      else if (n === 1) for (let i = 0; i < 6; i += 1) { const leaf = ['#bf6f4a', '#8a4836', '#e07438'][i % 3]; const x = cx - 8 + Math.floor(hash(i, 5, s) * 16); const y = cy - 5 + Math.floor(hash(i, 6, s) * 10); canvas.pixel(x, y, leaf); canvas.pixel(x + 1, y, leaf); canvas.pixel(x + 1, y + 1, ramp[0]); }
      else if (n === 2) { canvas.line(cx - 7, cy, cx + 6, cy - 2, '#5d2c28'); canvas.line(cx - 2, cy - 1, cx, cy - 4, '#5d2c28'); canvas.line(cx - 7, cy + 1, cx + 6, cy - 1, ramp[0]); canvas.pixel(cx - 5, cy - 1, '#8a4836'); }
      else if (n === 3) { pebble(canvas, cx, cy, 2, STONE, ramp[0]); for (let i = -2; i <= 1; i += 1) canvas.pixel(cx + i, cy - 3, '#33984b'); }
      else if (n === 4) { // cogumelinhos
        for (const [dx, dy] of [[0, 0], [3, 1], [-3, 2]]) { canvas.pixel(cx + dx, cy + dy, '#f9e6cf'); canvas.pixel(cx + dx, cy + dy - 1, '#c42430'); canvas.pixel(cx + dx - 1, cy + dy - 1, '#ea323c'); canvas.pixel(cx + dx + 1, cy + dy - 1, '#891e2b'); canvas.pixel(cx + dx, cy + dy - 2, '#f68187'); canvas.pixel(cx + dx, cy + dy + 1, ramp[0]); }
      } else tufts(1, { count: 10, min: 4, max: 7, spread: 4 });
      break;
    case T.SWAMP:
      if (n === 0) { canvas.ellipse(cx, cy, 6, 2.6, '#1c121c'); canvas.ellipse(cx, cy, 5, 1.8, '#2a2f4e'); canvas.pixel(cx - 2, cy - 1, '#657392'); canvas.pixel(cx + 3, cy, '#424c6e'); }
      else if (n === 1) for (let i = 0; i < 4; i += 1) { const x = cx - 4 + i * 3; canvas.line(x, cy, x + (i % 2), cy - 7 - (i % 2), '#494834'); canvas.rect(x + (i % 2), cy - 9 - (i % 2), 1, 3, '#5d2c28'); canvas.pixel(x, cy + 1, ramp[0]); }
      else if (n === 2) tufts(3, { count: 6, min: 3, max: 6 });
      else if (n === 3) { canvas.ellipse(cx, cy, 4, 2, '#1e6f50'); canvas.pixel(cx - 1, cy - 1, '#33984b'); canvas.pixel(cx + 2, cy, '#134c4c'); }
      else if (n === 4) tufts(2);
      else pebble(canvas, cx, cy, 1, WARM_STONE, ramp[0]);
      break;
    case T.SNOW:
      if (n === 0) for (let x = -7; x <= 7; x += 1) { const y = cy + Math.round((x * x) / 22); canvas.pixel(cx + x, y, '#ffffff'); canvas.pixel(cx + x, y + 1, '#9cc8e6'); }
      else if (n === 1) pebble(canvas, cx, cy, 2, SNOW_STONE, '#9cc8e6');
      else if (n === 2) tuftAt(canvas, cx, cy, ['#391f21', '#5d2c28', '#8a4836', '#ad7954', '#cba36f', '#f6ca9f'], s, { count: 6, min: 2, max: 5 });
      else if (n === 3) { pebble(canvas, cx, cy, 0, SNOW_STONE, '#9cc8e6'); pebble(canvas, cx + 5, cy + 2, 1, SNOW_STONE, '#9cc8e6'); }
      else if (n === 4) for (let i = 0; i < 4; i += 1) { canvas.pixel(cx - 8 + i * 5, cy + (i % 2) * 2, '#92a1b9'); canvas.pixel(cx - 7 + i * 5, cy + (i % 2) * 2 + 1, '#9cc8e6'); }
      else for (let i = 0; i < 5; i += 1) canvas.pixel(cx + Math.round((hash(i, 7, s) - 0.5) * 16), cy + Math.round((hash(i, 8, s) - 0.5) * 10), '#ffffff');
      break;
    case T.SAND:
    case T.DUNE:
    case T.BEACH:
      if (n === 0) { pebble(canvas, cx, cy, 1, kind === T.BEACH ? STONE : WARM_STONE, ramp[1]); pebble(canvas, cx + 6, cy + 3, 0, kind === T.BEACH ? STONE : WARM_STONE, ramp[1]); }
      else if (n === 1) tuftAt(canvas, cx, cy, ['#2d2e25', '#494834', '#775c5b', '#918275', '#cba36f', '#f6ca9f'], s, { count: 7, min: 3, max: 6 });
      else if (n === 2) pebble(canvas, cx, cy, 2, kind === T.BEACH ? STONE : WARM_STONE, ramp[1]);
      else if (n === 3) for (let i = 0; i < 6; i += 1) canvas.pixel(cx + Math.round((hash(i, 7, s) - 0.5) * 16), cy + Math.round((hash(i, 8, s) - 0.5) * 10), ramp[0]);
      else if (n === 4 && kind === T.BEACH) { for (const [x, y, col] of [[0, 0, '#f68187'], [5, 3, '#ffffff'], [-4, 4, '#fdd2ed']]) { canvas.pixel(cx + x, cy + y, col); canvas.pixel(cx + x + 1, cy + y, col); canvas.pixel(cx + x, cy + y + 1, ramp[0]); } }
      else if (n === 4) { canvas.rect(cx - 3, cy, 7, 1, '#f9e6cf'); canvas.pixel(cx - 4, cy - 1, '#f9e6cf'); canvas.pixel(cx + 4, cy - 1, '#f9e6cf'); canvas.rect(cx - 3, cy + 1, 7, 1, ramp[1]); }
      else if (kind === T.BEACH) { canvas.line(cx - 6, cy, cx + 5, cy + 1, '#1e6f50'); canvas.line(cx - 4, cy + 1, cx + 2, cy - 1, '#33984b'); }
      else pebble(canvas, cx, cy, 1, WARM_STONE, ramp[1]);
      break;
    case T.ASH:
      if (n === 0) crack(canvas, cx - 6, cy - 4, 14, s, '#0e071b', null, { glow: '#8e251d', core: '#ffa214' });
      else if (n === 1) pebble(canvas, cx, cy, 2, ['#0e071b', '#1c121c', '#272727', '#3d3d3d', '#5d5d5d'], '#0e071b');
      else if (n === 2) for (let i = 0; i < 5; i += 1) { const x = cx + Math.round((hash(i, 7, s) - 0.5) * 14); const y = cy + Math.round((hash(i, 8, s) - 0.5) * 8); canvas.pixel(x, y, '#5d5d5d'); canvas.pixel(x + 1, y, '#3d3d3d'); }
      else if (n === 3) for (const [x, y] of [[0, 0], [4, 2], [-3, 3]]) { canvas.pixel(cx + x, cy + y, '#ffa214'); canvas.pixel(cx + x + 1, cy + y, '#c64524'); canvas.pixel(cx + x, cy + y + 1, '#391f21'); }
      else if (n === 4) tuftAt(canvas, cx, cy, ['#0e071b', '#1c121c', '#391f21', '#5d2c28', '#775c5b', '#918275'], s, { count: 5, min: 2, max: 5 });
      else pebble(canvas, cx, cy, 1, ['#0e071b', '#1c121c', '#272727', '#3d3d3d', '#5d5d5d'], '#0e071b');
      break;
    case T.CAVE:
      if (n === 0) pebble(canvas, cx, cy, 2, STONE, ramp[1]);
      else if (n === 1) { pebble(canvas, cx, cy, 0, STONE, ramp[1]); pebble(canvas, cx + 5, cy + 2, 1, STONE, ramp[1]); }
      else if (n === 2) { canvas.ellipse(cx, cy, 4, 2, '#134c4c'); canvas.pixel(cx - 1, cy - 1, '#1e6f50'); canvas.pixel(cx + 2, cy, '#33984b'); }
      else if (n === 3) { canvas.ellipse(cx, cy, 5, 2.2, '#1a1932'); canvas.ellipse(cx, cy, 3.6, 1.4, '#2a2f4e'); canvas.pixel(cx - 2, cy - 1, '#657392'); }
      else if (n === 4) crack(canvas, cx - 5, cy - 3, 12, s, '#272727', '#918275');
      else { canvas.rect(cx - 3, cy, 7, 1, '#f9e6cf'); canvas.pixel(cx - 4, cy - 1, '#f9e6cf'); canvas.pixel(cx + 4, cy - 1, '#f9e6cf'); canvas.rect(cx - 3, cy + 1, 7, 1, '#918275'); }
      break;
    default:
      break;
  }
  return canvas;
}

// ---------- Camada de baixo (animada), em blocos de 3x3 ladrilhos ----------

export const UNDER_KINDS = Object.freeze([T.SEA, T.LAVA, T.MURK, T.ICE]);
export const UNDER_FRAME_COUNT = 4;

const UNDER_TONES = {
  [T.SEA]: ['#03193f', '#00396d', '#0069aa', '#0098dc', '#00cdf9', '#94fdff'],
  [T.LAVA]: ['#391f21', '#8e251d', '#c64524', '#e07438', '#ffa214', '#ffeb57'],
  [T.MURK]: ['#0e071b', '#1a1932', '#134c4c', '#2d2e25', '#1e6f50', '#424c6e'],
  [T.ICE]: ['#657392', '#92a1b9', '#9cc8e6', '#d5e8ef', '#ffffff', '#ffffff']
};
const BIG = S * UNDER_SUBTILES;
const bigWrap = (v) => ((v % BIG) + BIG) % BIG;
const underCache = new Map();

/** Bloco inteiro (144 px, periódico) de um quadro; os ladrilhos são recortes dele. */
function underBlock(kind, frame) {
  const key = `${kind}-${frame}`;
  if (underCache.has(key)) return underCache.get(key);
  const canvas = new PixelCanvas(BIG, BIG);
  const tones = UNDER_TONES[kind];
  const seed = 70 + kind;
  const drift = kind === T.ICE ? 0 : frame * (kind === T.LAVA ? 2 : 3);
  const noise = (x, y, cells, s) => periodic(x, y, cells, s, BIG);
  for (let y = 0; y < BIG; y += 1) {
    for (let x = 0; x < BIG; x += 1) {
      const sx = bigWrap(x + drift);
      // Ruído esticado na horizontal (ondas deitadas), sem manchas redondas de camuflagem.
      const v = noise(sx, (y * 3) % BIG, 8, seed) * 0.5 + noise(sx, (y * 2) % BIG, 16, seed + 1) * 0.3 + noise(x, y, 6, seed + 2) * 0.2;
      let tone;
      if (kind === T.SEA) tone = v < 0.2 ? 1 : v < 0.7 ? 2 : 3;
      else if (kind === T.LAVA) tone = v < 0.3 ? 2 : v < 0.66 ? 3 : 4;
      else if (kind === T.MURK) tone = v < 0.24 ? 1 : v < 0.78 ? 2 : 4;
      else tone = v < 0.16 ? 1 : v < 0.68 ? 2 : 3;
      canvas.pixel(x, y, tones[tone]);
    }
  }
  const put = (x, y, hex, alpha) => canvas.pixel(bigWrap(x), bigWrap(y), hex, alpha);
  const phase = (index) => (frame + index) % UNDER_FRAME_COUNT;
  const spots = (count, s) => Array.from({ length: count }, (_, i) => [Math.floor(hash(i, 1, s) * BIG), Math.floor(hash(i, 2, s) * BIG)]);
  if (kind === T.SEA) {
    // Cristas de onda em arco (acendem e apagam) e brilhos de sol.
    spots(46, seed + 10).forEach(([x, y], index) => {
      const p = phase(index);
      if (p === 3) return;
      const length = p === 1 ? 7 : 4;
      for (let i = 0; i < length; i += 1) {
        const arc = Math.round(Math.abs(i - (length - 1) / 2) * 0.5);
        put(x + i, y + arc, i === Math.floor(length / 2) && p === 1 ? tones[5] : tones[4]);
        put(x + i, y + arc + 1, tones[1]);
      }
    });
    spots(20, seed + 12).forEach(([x, y], index) => { if (phase(index) === 0) put(x, y, '#ffffff'); });
  } else if (kind === T.LAVA) {
    // Placas de crosta boiando (escuras, borda acesa) e bolhas.
    spots(16, seed + 10).forEach(([x, y], index) => {
      const rx = 3 + (index % 4);
      for (let dy = -rx; dy <= rx; dy += 1) {
        for (let dx = -rx - 2; dx <= rx + 2; dx += 1) {
          const r = Math.hypot(dx / (rx + 1.5), dy / (rx * 0.7)) + (hash(dx + x, dy + y, seed) - 0.5) * 0.25;
          if (r < 0.7) put(x + dx + drift, y + dy, r < 0.45 ? tones[0] : tones[1]);
          else if (r < 0.85) put(x + dx + drift, y + dy, tones[4]);
        }
      }
    });
    spots(14, seed + 11).forEach(([x, y], index) => {
      const p = phase(index);
      if (p === 0) { put(x, y, tones[5]); put(x + 1, y, tones[4]); }
      if (p === 1) { put(x, y - 1, tones[5]); put(x - 1, y, tones[5]); put(x + 1, y, tones[5]); put(x, y, '#ffffff'); }
    });
  } else if (kind === T.MURK) {
    spots(14, seed + 10).forEach(([x, y], index) => { if (phase(index) < 2) { put(x, y, '#657392'); put(x + 1, y, '#424c6e'); } });
    spots(10, seed + 13).forEach(([x, y]) => { for (let i = -2; i <= 2; i += 1) put(x + i, y + (Math.abs(i) > 1 ? 1 : 0), '#1e6f50'); put(x, y - 1, '#33984b'); });
  } else {
    // Gelo: reflexos longos na diagonal (poucos, irregulares) e rachaduras finas com luz.
    for (const [offset, width, s] of [[18, 2, 1], [70, 1, 2], [111, 3, 3]]) {
      for (let i = 0; i < BIG; i += 1) {
        for (let w = 0; w < width; w += 1) {
          if (noise(i, offset, 12, 88 + s) > 0.46) put(i + offset + w, BIG - 1 - i, w === 0 ? tones[4] : tones[3]);
        }
      }
    }
    spots(7, seed + 20).forEach(([x, y], index) => {
      let cx = x; let cy = y;
      for (let step = 0; step < 14 + (index % 3) * 6; step += 1) {
        put(cx, cy, tones[0]);
        put(cx, cy + 1, tones[4]);
        const roll = hash(step, index, seed);
        cx += roll < 0.7 ? 1 : 0;
        cy += roll < 0.35 ? 1 : roll > 0.85 ? -1 : 0;
      }
    });
    spots(18, seed + 21).forEach(([x, y]) => put(x, y, '#ffffff'));
  }
  underCache.set(key, canvas);
  return canvas;
}

/** Água do mar, lava, lodo e gelo; quadros 0..3 animam; `sub` 0..8 = posição no bloco 3x3. */
export function drawUnderTile(kind, frame = 0, sub = 0) {
  const block = underBlock(kind, frame);
  const canvas = new PixelCanvas(S, S);
  const ox = (sub % UNDER_SUBTILES) * S;
  const oy = Math.floor(sub / UNDER_SUBTILES) * S;
  for (let y = 0; y < S; y += 1) for (let x = 0; x < S; x += 1) canvas.pixel(x, y, block.colorAt(ox + x, oy + y));
  return canvas;
}

// ---------- Paredes da caverna (sem mudança) ----------

function patches(x, y, seed, jitter = 0.1) {
  const n = periodic(x, y, 2, seed) * 0.5 + periodic(x, y, 4, seed + 1) * 0.32 + periodic(x, y, 8, seed + 2) * 0.18;
  return n + (hash(wrap(x) >> 1, wrap(y) >> 1, seed + 5) - 0.5) * jitter;
}

function scatter(seed, count, callback, margin = 5) {
  for (let index = 0; index < count; index += 1) {
    const x = margin + Math.floor(hash(index, 1, seed) * (S - margin * 2));
    const y = margin + Math.floor(hash(index, 2, seed) * (S - margin * 2));
    callback(x, y, index);
  }
}

// ---------- Paredes da caverna ----------

const ROCK = ['#0e071b', '#1c121c', '#1a1932', '#272727', '#3d3d3d', '#5d5d5d'];

/** Topo da rocha (massa escura vista de cima) ou face do paredão (sul aberto). */
export function drawWallTile(face, variant = 0, rim = 0) {
  const canvas = new PixelCanvas(TILE_PX, TILE_PX);
  for (let y = 0; y < TILE_PX; y += 1) {
    for (let x = 0; x < TILE_PX; x += 1) {
      const jitter = (hash(x >> 1, y >> 1, 60 + variant) - 0.5) * 0.12;
      if (face) {
        // Face vertical: clara em cima, escurece para baixo, com estratos.
        const strata = Math.sin(y * 0.55 + periodic(x, y, 4, 61 + variant) * 3) * 0.5 + 0.5;
        const v = 0.85 - (y / TILE_PX) * 0.6 + strata * 0.18 + (patches(x, y, 62) - 0.5) * 0.3 + jitter;
        canvas.pixel(x, y, ROCK[Math.max(1, Math.min(5, Math.round(v * 5)))]);
      } else {
        const v = patches(x, y, 63 + variant) * 0.7 + jitter;
        canvas.pixel(x, y, ROCK[Math.max(0, Math.min(3, Math.round(v * 4)))]);
      }
    }
  }
  if (face) {
    // Aresta de cima iluminada e pé do paredão em sombra.
    for (let x = 0; x < TILE_PX; x += 1) {
      canvas.pixel(x, 0, ROCK[5]);
      if (hash(x, 0, 64) > 0.4) canvas.pixel(x, 1, ROCK[4]);
      canvas.pixel(x, TILE_PX - 1, ROCK[0]);
      canvas.pixel(x, TILE_PX - 2, ROCK[1]);
    }
    scatter(65 + variant, 4, (x, y) => {
      canvas.line(x, y, x + 3, y + 6, ROCK[1]);
      canvas.pixel(x - 1, y, ROCK[5]);
    }, 6);
  } else {
    scatter(66 + variant, 5, (x, y) => {
      canvas.pixel(x, y, ROCK[4]);
      canvas.pixel(x + 1, y + 1, ROCK[0]);
    });
  }
  // Aresta clara onde a rocha encontra o chão da caverna (1 = norte, 2 = leste, 8 = oeste).
  for (let i = 0; i < TILE_PX; i += 1) {
    const wobble = Math.round(periodic(i, 0, 4, 67) * 2);
    if (rim & 1) { canvas.pixel(i, wobble, ROCK[5]); canvas.pixel(i, wobble + 1, ROCK[4]); }
    if (rim & 2) { canvas.pixel(TILE_PX - 1 - wobble, i, ROCK[5]); canvas.pixel(TILE_PX - 2 - wobble, i, ROCK[3]); }
    if (rim & 8) { canvas.pixel(wobble, i, ROCK[5]); canvas.pixel(wobble + 1, i, ROCK[4]); }
  }
  return canvas;
}
