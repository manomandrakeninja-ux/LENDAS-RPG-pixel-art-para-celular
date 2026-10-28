import { PixelCanvas, hash } from './pixel.js';
import { T } from '../data/worldRegions.js';

// Chão do mundo em ladrilhos de 48 px que se repetem sem emenda (Fase 20B).
// - Base: manchas de cor em 3 escalas, quantizadas em degraus (sem dither: nada de quadriculado).
// - Detalhe: tufos de grama com luz em cima e sombra embaixo, flores em grupos, seixos, ondulações.
// - Transições: "franjas" (borda do terreno vizinho invadindo o ladrilho, com cantos arredondados)
//   numa camada própria, no lugar das antigas manchas 80x60.
// - Bordas com água/lava/lodo/gelo: recorte por máscara (N=1, L=2, S=4, O=8) com espuma/crosta de 2 px.
// Todas as cores vêm da paleta-mestre (src/art/palette.js).

export const TILE_PX = 48;

// Rampas do chão: [fundo, sombra, base, luz, brilho].
const GROUND = {
  [T.VALLEY]: ['#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f'],
  [T.FOREST]: ['#0c2e44', '#134c4c', '#1e6f50', '#33984b', '#5ac54f'],
  [T.JUNGLE]: ['#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f'],
  [T.SWAMP]: ['#1c121c', '#2d2e25', '#494834', '#1e6f50', '#33984b'],
  [T.SNOW]: ['#657392', '#9cc8e6', '#d5e8ef', '#ffffff', '#ffffff'],
  [T.SAND]: ['#8a4836', '#ad7954', '#cba36f', '#f6ca9f', '#f9e6cf'],
  [T.DUNE]: ['#5d2c28', '#8a4836', '#ad7954', '#cba36f', '#edab50'],
  [T.BEACH]: ['#ad7954', '#cba36f', '#f6ca9f', '#f9e6cf', '#ffffff'],
  [T.ASH]: ['#0e071b', '#1a1932', '#272727', '#3d3d3d', '#5d5d5d'],
  [T.CAVE]: ['#1c121c', '#3d3d3d', '#5d5d5d', '#775c5b', '#918275']
};
const DIRT = ['#5d2c28', '#8a4836', '#ad7954', '#cba36f', '#f6ca9f'];
const STONE = ['#3d3d3d', '#5d5d5d', '#858585', '#b4b4b4'];
const WARM_STONE = ['#5d2c28', '#775c5b', '#918275', '#cba36f'];
const GRASSY = new Set([T.VALLEY, T.FOREST, T.JUNGLE]);

/** Ruído periódico (repete a cada 48 px) para os ladrilhos encaixarem. */
function periodic(x, y, cells, seed) {
  const size = TILE_PX / cells;
  const gx = x / size;
  const gy = y / size;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = gx - x0;
  const fy = gy - y0;
  const corner = (cx, cy) => hash(((cx % cells) + cells) % cells, ((cy % cells) + cells) % cells, seed);
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const top = corner(x0, y0) + (corner(x0 + 1, y0) - corner(x0, y0)) * sx;
  const bottom = corner(x0, y0 + 1) + (corner(x0 + 1, y0 + 1) - corner(x0, y0 + 1)) * sx;
  return top + (bottom - top) * sy;
}

const wrap = (value) => ((value % TILE_PX) + TILE_PX) % TILE_PX;

/** Manchas em 3 escalas; o "tremor" vem em blocos de 2 px (aglomerados, não pixels soltos). */
function patches(x, y, seed, jitter = 0.1) {
  const n = periodic(x, y, 2, seed) * 0.5 + periodic(x, y, 4, seed + 1) * 0.32 + periodic(x, y, 8, seed + 2) * 0.18;
  return n + (hash(wrap(x) >> 1, wrap(y) >> 1, seed + 5) - 0.5) * jitter;
}

function scatter(seed, count, callback, margin = 5) {
  for (let index = 0; index < count; index += 1) {
    const x = margin + Math.floor(hash(index, 1, seed) * (TILE_PX - margin * 2));
    const y = margin + Math.floor(hash(index, 2, seed) * (TILE_PX - margin * 2));
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

// ---------- Detalhes ----------

const TUFTS = [
  ['...h.....', '.h.l..h..', '.l.lh.l.h', '.llll.l.l', '..lllll..', '.ddddddd.'],
  ['.h...h.', 'hl.h.lh', '.l.l.l.', '.lllll.', '..ddd..'],
  ['h.h.h', 'l.l.l', '.lll.', '.ddd.'],
  ['..h....h...', '.hl.h..lh.h', '.ll.l.hl..l', '..llllll.l.', '.lllllllll.', '..ddddddd..'],
  ['.h..h', 'hl.hl', 'l.ll.', '.lll.', 'ddd..']
];

function tuft(canvas, x, y, kind, shape, flip = false) {
  const ramp = GROUND[kind] ?? GROUND[T.VALLEY];
  const colors = kind === T.SWAMP
    ? { h: '#33984b', l: '#1e6f50', d: ramp[1] }
    : kind === T.SNOW
      ? { h: '#cba36f', l: '#ad7954', d: '#9cc8e6' }
      : kind === T.SAND || kind === T.DUNE || kind === T.BEACH
        ? { h: '#5ac54f', l: '#33984b', d: ramp[1] }
        : { h: ramp[4], l: ramp[3], d: ramp[1] };
  stamp(canvas, x, y, TUFTS[shape % TUFTS.length], colors, flip);
}

function flower(canvas, x, y, petal, center) {
  canvas.pixel(x, y - 1, petal);
  canvas.pixel(x - 1, y, petal);
  canvas.pixel(x + 1, y, petal);
  canvas.pixel(x, y + 1, petal);
  canvas.pixel(x, y, center);
}

const FLOWER_SETS = [
  [['#ffffff', '#ffc825'], ['#f9e6cf', '#ffc825']],
  [['#ffc825', '#e07438'], ['#ffeb57', '#e07438']],
  [['#f68187', '#ffeb57'], ['#fdd2ed', '#ffc825']],
  [['#9cc8e6', '#ffffff'], ['#ffffff', '#ffc825']]
];

/** Grupo de 3 a 5 flores com folhinhas, num raio de ~6 px. */
function flowerCluster(canvas, x, y, seed, set, leaf = '#1e6f50') {
  const count = 3 + Math.floor(hash(seed, 3, 7) * 3);
  for (let index = 0; index < count; index += 1) {
    const fx = x + Math.round((hash(seed, index, 11) - 0.5) * 12);
    const fy = y + Math.round((hash(seed, index, 12) - 0.5) * 8);
    canvas.pixel(fx + 1, fy + 2, leaf);
    canvas.pixel(fx - 1, fy + 2, leaf);
    const [petal, center] = FLOWER_SETS[set % FLOWER_SETS.length][index % 2];
    if (index % 3 === 2) {
      canvas.pixel(fx, fy, petal);
      canvas.pixel(fx, fy + 1, leaf);
    } else flower(canvas, fx, fy, petal, center);
  }
}

function pebble(canvas, x, y, size, colors, ground) {
  const [dark, mid, base, light] = colors;
  if (size === 0) {
    canvas.pixel(x, y, base);
    canvas.pixel(x + 1, y, mid);
    canvas.pixel(x, y - 1, light);
    canvas.pixel(x, y + 1, ground);
    canvas.pixel(x + 1, y + 1, ground);
    return;
  }
  stamp(canvas, x, y + 1, size === 1
    ? ['.lb.', 'lbbm', '.mmd', '.gg.']
    : ['..lb..', '.lbbb.', 'lbbbbm', '.bbmmd', '..mdd.', '.gggg.'], { l: light, b: base, m: mid, d: dark, g: ground });
}

/** Mancha irregular (raio ~r) de uma cor, com borda em blocos de 2 px. */
function blotch(canvas, cx, cy, r, color, seed, ry = r * 0.7) {
  for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 2; y += 1) {
    for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x += 1) {
      const d = Math.hypot((x - cx) / r, (y - cy) / ry);
      if (d < 0.75 + (hash(x >> 1, y >> 1, seed) - 0.5) * 0.5) canvas.pixel(x, y, color);
    }
  }
}

// ---------- Placas de pedra (caverna e cinza vulcânica) ----------

const voronoiCache = new Map();

/** Mapa periódico de placas (Voronoi em grade g x g): id da placa e rejunte de 1 px. */
function plates(seed, grid = 3) {
  const key = `${seed}-${grid}`;
  if (voronoiCache.has(key)) return voronoiCache.get(key);
  const cell = TILE_PX / grid;
  const points = [];
  for (let gy = 0; gy < grid; gy += 1) {
    for (let gx = 0; gx < grid; gx += 1) {
      points.push([(gx + 0.2 + hash(gx, gy, seed) * 0.6) * cell, (gy + 0.2 + hash(gx, gy, seed + 1) * 0.6) * cell]);
    }
  }
  const id = new Int16Array(TILE_PX * TILE_PX);
  for (let y = 0; y < TILE_PX; y += 1) {
    for (let x = 0; x < TILE_PX; x += 1) {
      let best = Infinity;
      points.forEach(([px, py], at) => {
        for (const ox of [-TILE_PX, 0, TILE_PX]) {
          for (const oy of [-TILE_PX, 0, TILE_PX]) {
            const d = Math.hypot(x + 0.5 - px - ox, (y + 0.5 - py - oy) * 1.15);
            if (d < best) { best = d; id[y * TILE_PX + x] = at; }
          }
        }
      });
    }
  }
  const at = (x, y) => id[wrap(y) * TILE_PX + wrap(x)];
  const grout = new Uint8Array(TILE_PX * TILE_PX);
  for (let y = 0; y < TILE_PX; y += 1) {
    for (let x = 0; x < TILE_PX; x += 1) {
      if (at(x, y) !== at(x + 1, y) || at(x, y) !== at(x, y + 1)) grout[y * TILE_PX + x] = 1;
    }
  }
  const result = { id, grout: (x, y) => grout[wrap(y) * TILE_PX + wrap(x)] === 1, at };
  voronoiCache.set(key, result);
  return result;
}

function plateFloor(canvas, ramp, seed, { grout = ramp[0], moss = null } = {}) {
  const map = plates(seed);
  for (let y = 0; y < TILE_PX; y += 1) {
    for (let x = 0; x < TILE_PX; x += 1) {
      if (map.grout(x, y)) {
        canvas.pixel(x, y, moss && periodic(x, y, 4, seed + 7) > 0.62 ? moss : grout);
        continue;
      }
      const plate = map.at(x, y);
      const n = patches(x, y, seed + plate, 0.12) + (hash(plate, 0, seed) - 0.5) * 0.25;
      let tone = n < 0.4 ? 1 : n > 0.68 ? 3 : 2;
      if (map.grout(x - 1, y) || map.grout(x, y - 1)) tone = Math.min(4, tone + 1);
      else if (map.grout(x + 1, y + 1) || map.grout(x + 1, y)) tone = 1;
      canvas.pixel(x, y, ramp[tone]);
    }
  }
}

// ---------- Texturas base ----------

/** Só as manchas de cor (sem detalhes): base dos ladrilhos e das franjas. */
function groundBase(canvas, kind) {
  const ramp = GROUND[kind];
  const seed = kind * 10 + 3;
  if (kind === T.CAVE) { plateFloor(canvas, ramp, 501); return; }
  if (kind === T.ASH) { plateFloor(canvas, ramp, 503, { grout: '#0e071b' }); return; }
  // Grão fino (manchinhas de 2 a 4 px): nenhuma forma grande que denuncie a repetição de 48 px.
  // As manchas maiores vêm das variantes (longe das bordas) e da camada de decoração.
  for (let y = 0; y < TILE_PX; y += 1) {
    for (let x = 0; x < TILE_PX; x += 1) {
      const v = periodic(x, y, 12, seed) * 0.55 + periodic(x, y, 24, seed + 1) * 0.45 + (hash(x >> 1, y >> 1, seed + 5) - 0.5) * 0.1;
      const calm = kind === T.SNOW || kind === T.SAND || kind === T.DUNE || kind === T.BEACH;
      const tone = v < (calm ? 0.24 : 0.3) ? 1 : v > (calm ? 0.76 : 0.72) ? 3 : 2;
      canvas.pixel(x, y, ramp[tone]);
    }
  }
  if (kind === T.SAND || kind === T.DUNE || kind === T.BEACH || kind === T.SNOW) ripples(canvas, kind, seed);
}

/** Ondulações de vento: crista clara com sombra de 1 px embaixo, em arcos interrompidos. */
function ripples(canvas, kind, seed) {
  const ramp = GROUND[kind];
  const spacing = kind === T.DUNE ? 12 : kind === T.SNOW ? 16 : kind === T.BEACH ? 16 : 12;
  for (let x = 0; x < TILE_PX; x += 1) {
    const bend = Math.sin((x / TILE_PX) * Math.PI * 2 * 2 + seed) * 2.2 + periodic(x, 0, 3, seed + 9) * 4;
    for (let y = 0; y < TILE_PX; y += 1) {
      const phase = ((((y + bend) % spacing) + spacing) % spacing);
      const keep = periodic(x, y, 4, seed + 11) > (kind === T.DUNE ? 0.4 : 0.55);
      if (!keep) continue;
      if (phase < 1) canvas.pixel(x, y, ramp[3]);
      else if (phase < 2 && kind !== T.BEACH) canvas.pixel(x, y, ramp[1]);
      else if (phase < 3 && kind === T.DUNE) canvas.pixel(x, y, ramp[1]);
    }
  }
}

function base(canvas, kind, variant) {
  groundBase(canvas, kind);
  const s = kind * 70 + variant * 31;
  const ramp = GROUND[kind];
  if (kind !== T.CAVE && kind !== T.ASH) {
    scatter(s + 50, 2 + (variant % 2), (x, y, i) => blotch(canvas, x, y, 5 + ((i + variant) % 4), (i + variant) % 2 ? ramp[3] : ramp[1], s + i), 12);
  }
  switch (kind) {
    case T.FOREST:
      scatter(s, 3 + variant, (x, y, i) => tuft(canvas, x, y, kind, i + variant, i % 2 === 1));
      scatter(s + 1, 2 + variant, (x, y, i) => {
        const leaf = ['#8a4836', '#bf6f4a', '#5d2c28', '#e07438'][(i + variant) % 4];
        canvas.pixel(x, y, leaf);
        canvas.pixel(x + 1, y, leaf);
        canvas.pixel(x + 1, y + 1, ramp[0]);
      });
      if (variant === 2) for (let x = 8; x < 30; x += 1) canvas.pixel(x, 32 + Math.round(Math.sin(x / 4) * 2), '#391f21');
      if (variant === 3) pebble(canvas, 30, 30, 1, STONE, ramp[0]);
      break;
    case T.JUNGLE:
      scatter(s, 4 + variant, (x, y, i) => tuft(canvas, x, y, kind, i, i % 2 === 0));
      if (variant >= 2) flowerCluster(canvas, 24, 26, s, 2 + (variant % 2), ramp[1]);
      break;
    case T.SWAMP:
      scatter(s, 2 + variant, (x, y, i) => {
        if (i % 2) {
          canvas.ellipse(x, y, 3.2, 1.6, '#134c4c');
          canvas.pixel(x - 1, y - 1, '#2a2f4e');
          canvas.pixel(x + 2, y, '#657392');
        } else tuft(canvas, x, y, kind, i);
      });
      if (variant === 3) for (const [x, y] of [[12, 34], [14, 36], [11, 37]]) { canvas.pixel(x, y, '#775c5b'); canvas.pixel(x, y - 1, '#918275'); }
      break;
    case T.SNOW:
      scatter(s + 1, 3 + variant, (x, y, i) => {
        canvas.pixel(x, y, '#ffffff');
        if (i % 2) { canvas.pixel(x, y + 1, '#9cc8e6'); canvas.pixel(x + 1, y + 1, '#9cc8e6'); }
      });
      if (variant === 2) tuft(canvas, 30, 30, kind, 2);
      if (variant === 3) pebble(canvas, 22, 28, 1, ['#424c6e', '#657392', '#92a1b9', '#ffffff'], '#9cc8e6');
      break;
    case T.SAND:
    case T.DUNE:
      scatter(s, 3 + variant, (x, y, i) => canvas.pixel(x, y, i % 2 ? ramp[1] : ramp[4]));
      if (variant === 3) pebble(canvas, 26, 30, 1, WARM_STONE, ramp[1]);
      if (variant === 2 && kind === T.SAND) tuft(canvas, 30, 24, kind, 2);
      break;
    case T.BEACH:
      scatter(s, 3 + variant, (x, y, i) => {
        const shell = ['#ffffff', '#f68187', '#fdd2ed', '#ad7954'][i % 4];
        canvas.pixel(x, y, shell);
        if (i % 3 === 0) { canvas.pixel(x + 1, y, shell); canvas.pixel(x, y + 1, ramp[0]); }
      });
      if (variant === 2) pebble(canvas, 24, 28, 1, STONE, ramp[0]);
      break;
    case T.ASH:
      if (variant >= 2) emberCrack(canvas, s, variant);
      scatter(s + 1, 3 + variant, (x, y, i) => {
        canvas.pixel(x, y, i % 3 ? '#0e071b' : '#5d5d5d');
        if (i % 3 === 0) canvas.pixel(x + 1, y + 1, '#0e071b');
      });
      break;
    case T.CAVE:
      scatter(s, 1 + variant, (x, y, i) => pebble(canvas, x, y, i % 2, STONE, ramp[0]), 8);
      if (variant === 3) {
        canvas.rect(14, 30, 7, 1, '#f9e6cf');
        for (const [x, y] of [[13, 29], [13, 31], [21, 29], [21, 31]]) canvas.pixel(x, y, '#f9e6cf');
        canvas.rect(15, 31, 6, 1, '#918275');
      }
      break;
    default:
      break;
  }
}

/** Rachadura com brasa: borda escura, miolo laranja e ponto amarelo. */
function emberCrack(canvas, s, variant) {
  let cx = 8 + Math.floor(hash(variant, 1, s) * 28);
  let cy = 6 + Math.floor(hash(variant, 2, s) * 14);
  for (let step = 0; step < 20; step += 1) {
    canvas.pixel(cx - 1, cy, '#0e071b');
    canvas.pixel(cx + 1, cy, '#391f21');
    canvas.pixel(cx, cy, step % 6 === 3 ? '#ffa214' : '#c64524');
    cx = Math.max(2, Math.min(45, cx + Math.round(hash(step, 3, s) * 2 - 1)));
    cy = Math.min(45, cy + 1);
  }
}

export function drawBaseTile(kind, variant = 0) {
  const canvas = new PixelCanvas(TILE_PX, TILE_PX);
  base(canvas, kind, variant);
  return canvas;
}

// ---------- Vale (folha 'grass': 16 quadros de 48 px) ----------

export const VALLEY_FRAMES = 16;
export const VALLEY_PATH_FRAMES = Object.freeze([4, 5, 8, 9, 12, 13, 14, 15]);

/**
 * Quadros: 0-3, 6, 7, 10, 11 = grama; trilha com grama à esquerda/direita: 4/5 e 12/13 (outra variação);
 * fim da trilha (grama em volta embaixo): 8/9 e 14/15.
 */
export function drawValleyTile(frame) {
  const canvas = new PixelCanvas(TILE_PX, TILE_PX);
  const kind = T.VALLEY;
  if (VALLEY_PATH_FRAMES.includes(frame)) {
    const left = frame % 2 === 0;
    const end = frame === 8 || frame === 9 || frame === 14 || frame === 15;
    dirt(canvas, left, frame >= 12 ? 1 : 0);
    applyFringe(canvas, kind, (left ? 8 : 2) | (end ? 4 : 0));
    return canvas;
  }
  const ramp = GROUND[kind];
  groundBase(canvas, kind);
  const s = frame * 37 + 5;
  // Manchas soltas longe das bordas (quebram a repetição sem criar emenda).
  scatter(s + 7, 2, (x, y, i) => blotch(canvas, x, y, 5 + (i + frame) % 4, i % 2 ? ramp[3] : ramp[1], s + i), 12);
  const tufts = { 0: 5, 1: 3, 2: 3, 3: 8, 6: 4, 7: 4, 10: 6, 11: 3 }[frame];
  scatter(s, tufts, (x, y, i) => tuft(canvas, x, y + 2, kind, i + frame, (i + frame) % 2 === 1), 7);
  if (frame === 1) flowerCluster(canvas, 24, 22, s, 0);
  if (frame === 2) { pebble(canvas, 30, 30, 2, STONE, ramp[1]); pebble(canvas, 18, 16, 0, STONE, ramp[1]); }
  if (frame === 7) scatter(s + 3, 3, (x, y, i) => flower(canvas, x, y, i % 2 ? '#ffffff' : '#ffc825', i % 2 ? '#ffc825' : '#e07438'), 8);
  if (frame === 10) flowerCluster(canvas, 28, 30, s, 2);
  return canvas;
}

/** Trilha de terra batida: manchas, seixos de vários tamanhos e um tufinho perdido. */
function dirt(canvas, left, variant) {
  for (let y = 0; y < TILE_PX; y += 1) {
    for (let x = 0; x < TILE_PX; x += 1) {
      const v = periodic(x, y, 6, 404) * 0.6 + periodic(x, y, 12, 405) * 0.4 + (hash(x >> 1, y >> 1, 406) - 0.5) * 0.14;
      canvas.pixel(x, y, DIRT[v < 0.27 ? 1 : v > 0.7 ? 3 : 2]);
    }
  }
  const s = (left ? 410 : 420) + variant * 5;
  const colors = ['#5d2c28', '#8a4836', '#cba36f', '#f6ca9f'];
  scatter(s, 3, (x, y, i) => pebble(canvas, left ? Math.max(18, x) : Math.min(30, x), y, (i + variant) % 3, (i + variant) % 2 ? colors : STONE, DIRT[1]), 7);
  scatter(s + 1, 4, (x, y) => { canvas.pixel(left ? Math.max(16, x) : Math.min(32, x), y, DIRT[4]); canvas.pixel(left ? Math.max(16, x) : Math.min(32, x), y + 1, DIRT[0]); }, 4);
  if (variant === 1) scatter(s + 2, 1, (x, y) => tuft(canvas, left ? Math.max(22, x) : Math.min(26, x), y, T.VALLEY, 2), 10);
}

// ---------- Franjas: o terreno vizinho invadindo a borda do ladrilho ----------

/**
 * Quanto o pixel está "dentro" da borda das células vizinhas marcadas: largura da borda (medida no ponto
 * mais próximo da célula, para a curva só variar ao longo da borda e nunca abrir buracos) menos a distância.
 */
function cellReach(x, y, cells, edgeAt) {
  let best = -Infinity;
  for (const [dx, dy] of cells) {
    const left = dx * TILE_PX;
    const top = dy * TILE_PX;
    const cx = Math.max(left, Math.min(x, left + TILE_PX));
    const cy = Math.max(top, Math.min(y, top + TILE_PX));
    best = Math.max(best, edgeAt(wrap(Math.round(cx)), wrap(Math.round(cy))) - Math.hypot(x - cx, y - cy));
  }
  return best;
}

/**
 * Ondulação da borda (-1..1): soma de senos com frequência inteira por ladrilho, então a borda
 * continua no vizinho; a fase muda com o terreno para cada borda ter o próprio desenho.
 */
function shoreWobble(x, y, kind) {
  const wave = (t, phase) => Math.sin(((2 * t) / TILE_PX) * Math.PI * 2 + phase) * 0.55
    + Math.sin(((3 * t) / TILE_PX) * Math.PI * 2 + phase * 2.3) * 0.35 + Math.sin(((5 * t) / TILE_PX) * Math.PI * 2 + phase * 3.7) * 0.06;
  return wave(x, kind * 1.7 + 0.4) + wave(y, kind * 2.9 + 1.1);
}

/** Células vizinhas da máscara: lados 1 N, 2 L, 4 S, 8 O; cantos 16 NE, 32 SE, 64 SO, 128 NO. */
function maskCells(mask) {
  const n = mask & 1;
  const e = mask & 2;
  const s = mask & 4;
  const w = mask & 8;
  const cells = [];
  if (n) cells.push([0, -1]);
  if (e) cells.push([1, 0]);
  if (s) cells.push([0, 1]);
  if (w) cells.push([-1, 0]);
  if ((n && e) || mask & 16) cells.push([1, -1]);
  if ((s && e) || mask & 32) cells.push([1, 1]);
  if ((s && w) || mask & 64) cells.push([-1, 1]);
  if ((n && w) || mask & 128) cells.push([-1, -1]);
  return cells;
}

const FRINGE_STYLE = {
  grass: { width: 14, wobble: 14, rim: 1, tips: true, shadow: 2, shadowColor: '#0e071b', shadowAlpha: 80 },
  snow: { width: 15, wobble: 14, rim: 3, tips: false, shadow: 2, shadowColor: '#2a2f4e', shadowAlpha: 70, light: true },
  swamp: { width: 12, wobble: 12, rim: 0, tips: true, shadow: 1, shadowColor: '#0e071b', shadowAlpha: 70 },
  sand: { width: 14, wobble: 14, rim: 1, tips: false, grains: true, shadow: 0 },
  ash: { width: 12, wobble: 12, rim: 0, tips: false, shadow: 1, shadowColor: '#0e071b', shadowAlpha: 90 }
};

const fringeStyle = (kind) => (GRASSY.has(kind) ? FRINGE_STYLE.grass
  : kind === T.SNOW ? FRINGE_STYLE.snow
    : kind === T.SWAMP ? FRINGE_STYLE.swamp
      : kind === T.ASH || kind === T.CAVE ? FRINGE_STYLE.ash : FRINGE_STYLE.sand);

const baseCache = new Map();
function baseOf(kind) {
  if (!baseCache.has(kind)) {
    const canvas = new PixelCanvas(TILE_PX, TILE_PX);
    groundBase(canvas, kind);
    baseCache.set(kind, canvas);
  }
  return baseCache.get(kind);
}

/** Pinta a borda de `kind` sobre `canvas` nos lados da máscara (curva suave, cantos arredondados). */
function applyFringe(canvas, kind, mask) {
  const source = baseOf(kind);
  const ramp = GROUND[kind];
  const style = fringeStyle(kind);
  const cells = maskCells(mask);
  const seed = 140 + kind;
  const reach = new Float32Array(TILE_PX * TILE_PX);
  for (let y = 0; y < TILE_PX; y += 1) {
    for (let x = 0; x < TILE_PX; x += 1) {
      // Curva larga + ondinha curta: borda orgânica, periódica para casar com o vizinho.
      reach[y * TILE_PX + x] = cellReach(x + 0.5, y + 0.5, cells, (ex, ey) => style.width + shoreWobble(ex, ey, kind) * style.wobble * 0.5 + (periodic(ex, ey, 6, seed + 2) - 0.5) * 2);
    }
  }
  for (let y = 0; y < TILE_PX; y += 1) {
    for (let x = 0; x < TILE_PX; x += 1) {
      const r = reach[y * TILE_PX + x];
      if (r >= 1) {
        canvas.pixel(x, y, source.colorAt(x, y));
      } else if (r >= 0) {
        canvas.pixel(x, y, style.light ? ramp[3] : ramp[style.rim]);
      } else if (style.tips && r > -2.5 && hash(x, y, seed + 3) > 0.62) {
        // Pontas de folha passando da borda.
        canvas.pixel(x, y, r > -1.2 ? ramp[3] : ramp[4]);
      } else if (style.grains && r > -2 && hash(x, y, seed + 4) > 0.7) {
        canvas.pixel(x, y, ramp[2]);
      } else if (style.shadow && r > -1 - style.shadow) {
        canvas.pixel(x, y, style.shadowColor, style.shadowAlpha);
      }
    }
  }
  // Grama: tufos em cima da borda, para a franja não parecer recortada.
  if (style.tips && GRASSY.has(kind)) {
    for (let y = 8; y < TILE_PX - 3; y += 1) {
      for (let x = 5; x < TILE_PX - 5; x += 1) {
        const r = reach[y * TILE_PX + x];
        if (r >= 0 && r < 1 && hash(x, y, seed + 6) > 0.94) tuft(canvas, x, y + 1, kind, hash(x, y, seed + 7) > 0.5 ? 2 : 4, x % 2 === 0);
      }
    }
  }
  // Neve: lado de baixo do monte em sombra azulada (volume).
  if (style.light) {
    for (let y = 1; y < TILE_PX; y += 1) {
      for (let x = 0; x < TILE_PX; x += 1) {
        const r = reach[y * TILE_PX + x];
        if (r >= 1 && r < 3 && reach[(y - 1) * TILE_PX + x] > r) canvas.pixel(x, y, ramp[1]);
      }
    }
  }
}

/** Ladrilho só com a franja (o resto transparente), para a camada de cima do chão. */
export function drawFringeTile(kind, mask) {
  const canvas = new PixelCanvas(TILE_PX, TILE_PX);
  applyFringe(canvas, kind, mask);
  return canvas;
}

// ---------- Decoração (camada própria, transparente) ----------

export const DECOR_COUNT = 6;
export const DECOR_KINDS = Object.freeze([T.VALLEY, T.FOREST, T.JUNGLE, T.SWAMP, T.SNOW, T.SAND, T.DUNE, T.BEACH, T.ASH, T.CAVE]);

/** Tufos, flores, seixos e manchas soltas por cima do chão (quebram a repetição dos ladrilhos). */
export function drawDecorTile(kind, n) {
  const canvas = new PixelCanvas(TILE_PX, TILE_PX);
  const ramp = GROUND[kind];
  const s = 900 + kind * 13 + n * 7;
  const cx = 14 + Math.floor(hash(n, kind, 1) * 20);
  const cy = 16 + Math.floor(hash(n, kind, 2) * 18);
  const tufts = (count) => scatter(s, count, (x, y, i) => tuft(canvas, cx - 10 + (x % 20), cy - 6 + (y % 14), kind, i + n, i % 2 === 0), 2);
  switch (kind) {
    case T.VALLEY:
    case T.JUNGLE:
      if (n === 0) tufts(3);
      else if (n === 1) { flowerCluster(canvas, cx, cy, s, kind === T.JUNGLE ? 2 : 0); tuft(canvas, cx + 8, cy + 6, kind, 1); }
      else if (n === 2) flowerCluster(canvas, cx, cy, s, kind === T.JUNGLE ? 1 : 1 + (s % 2));
      else if (n === 3) { pebble(canvas, cx, cy, 2, STONE, ramp[1]); tuft(canvas, cx - 7, cy + 3, kind, 2); }
      else if (n === 4) { blotch(canvas, cx, cy, 10, ramp[3], s); tufts(2); }
      else { blotch(canvas, cx, cy, 8, ramp[1], s); tuft(canvas, cx, cy + 2, kind, 0); }
      break;
    case T.FOREST:
      if (n === 0) tufts(3);
      else if (n === 1) scatter(s, 6, (x, y, i) => { const leaf = ['#bf6f4a', '#8a4836', '#e07438'][i % 3]; canvas.pixel(cx - 8 + (x % 16), cy - 5 + (y % 10), leaf); canvas.pixel(cx - 7 + (x % 16), cy - 5 + (y % 10), leaf); });
      else if (n === 2) { canvas.line(cx - 7, cy, cx + 6, cy - 2, '#5d2c28'); canvas.line(cx - 2, cy - 1, cx, cy - 4, '#5d2c28'); canvas.line(cx - 7, cy + 1, cx + 6, cy - 1, ramp[0]); }
      else if (n === 3) { pebble(canvas, cx, cy, 2, STONE, ramp[0]); blotch(canvas, cx - 2, cy - 3, 3, '#33984b', s); }
      else if (n === 4) blotch(canvas, cx, cy, 10, ramp[1], s);
      else { blotch(canvas, cx, cy, 8, ramp[3], s); tuft(canvas, cx, cy + 2, kind, 3); }
      break;
    case T.SWAMP:
      if (n === 0) { canvas.ellipse(cx, cy, 6, 3, '#134c4c'); canvas.ellipse(cx, cy - 1, 4, 1.5, '#0c2e44'); canvas.pixel(cx - 2, cy - 2, '#657392'); canvas.pixel(cx + 3, cy, '#2a2f4e'); }
      else if (n === 1) for (let i = 0; i < 4; i += 1) { const x = cx - 4 + i * 3; canvas.line(x, cy, x + (i % 2), cy - 7 - i % 2, '#494834'); canvas.rect(x + (i % 2), cy - 9 - i % 2, 1, 3, '#5d2c28'); canvas.pixel(x, cy + 1, ramp[0]); }
      else if (n === 2) tufts(3);
      else if (n === 3) { blotch(canvas, cx, cy, 7, ramp[1], s); canvas.pixel(cx, cy, '#657392'); canvas.pixel(cx + 3, cy + 1, '#657392'); }
      else if (n === 4) blotch(canvas, cx, cy, 9, '#1e6f50', s);
      else pebble(canvas, cx, cy, 1, WARM_STONE, ramp[0]);
      break;
    case T.SNOW:
      if (n === 0) { for (let x = -8; x <= 8; x += 1) { const y = cy + Math.round((x * x) / 18); canvas.pixel(cx + x, y, '#ffffff'); canvas.pixel(cx + x, y + 1, '#9cc8e6'); } }
      else if (n === 1) pebble(canvas, cx, cy, 2, ['#424c6e', '#657392', '#92a1b9', '#ffffff'], '#9cc8e6');
      else if (n === 2) { tuft(canvas, cx, cy, kind, 0); tuft(canvas, cx + 6, cy + 3, kind, 2); }
      else if (n === 3) { blotch(canvas, cx, cy, 7, '#9cc8e6', s); canvas.pixel(cx - 2, cy - 1, '#ffffff'); canvas.pixel(cx + 2, cy + 1, '#ffffff'); }
      else if (n === 4) for (let i = 0; i < 5; i += 1) { canvas.pixel(cx - 8 + i * 4, cy + (i % 2) * 2, '#9cc8e6'); canvas.pixel(cx - 7 + i * 4, cy + (i % 2) * 2, '#9cc8e6'); }
      else blotch(canvas, cx, cy, 10, '#ffffff', s);
      break;
    case T.SAND:
    case T.DUNE:
    case T.BEACH:
      if (n === 0) { pebble(canvas, cx, cy, 1, kind === T.BEACH ? STONE : WARM_STONE, ramp[1]); pebble(canvas, cx + 6, cy + 3, 0, kind === T.BEACH ? STONE : WARM_STONE, ramp[1]); }
      else if (n === 1) tuft(canvas, cx, cy, kind, 1);
      else if (n === 2) blotch(canvas, cx, cy, 10, ramp[1], s);
      else if (n === 3) blotch(canvas, cx, cy, 9, ramp[3], s);
      else if (n === 4 && kind === T.BEACH) { for (const [x, y, c] of [[0, 0, '#f68187'], [5, 3, '#ffffff'], [-4, 4, '#fdd2ed']]) { canvas.pixel(cx + x, cy + y, c); canvas.pixel(cx + x + 1, cy + y, c); canvas.pixel(cx + x, cy + y + 1, ramp[0]); } }
      else if (n === 4) { canvas.rect(cx - 3, cy, 7, 1, '#f9e6cf'); canvas.pixel(cx - 4, cy - 1, '#f9e6cf'); canvas.pixel(cx + 4, cy - 1, '#f9e6cf'); canvas.rect(cx - 3, cy + 1, 7, 1, ramp[1]); }
      else if (kind === T.BEACH) { canvas.line(cx - 6, cy, cx + 5, cy + 1, '#1e6f50'); canvas.line(cx - 4, cy + 1, cx + 2, cy - 1, '#33984b'); }
      else { pebble(canvas, cx, cy, 2, WARM_STONE, ramp[1]); }
      break;
    case T.ASH:
      if (n === 0) emberCrack(canvas, s, 2);
      else if (n === 1) { stamp(canvas, cx, cy, ['..h.', '.hbd', 'hbbd', '.dd.'], { h: '#424c6e', b: '#1a1932', d: '#0e071b' }); }
      else if (n === 2) blotch(canvas, cx, cy, 9, ramp[3], s);
      else if (n === 3) { for (const [x, y] of [[0, 0], [4, 2], [-3, 3]]) { canvas.pixel(cx + x, cy + y, '#ffa214'); canvas.pixel(cx + x + 1, cy + y, '#c64524'); } }
      else if (n === 4) blotch(canvas, cx, cy, 8, ramp[0], s);
      else pebble(canvas, cx, cy, 1, ['#0e071b', '#272727', '#3d3d3d', '#5d5d5d'], ramp[0]);
      break;
    case T.CAVE:
      if (n === 0) pebble(canvas, cx, cy, 2, STONE, ramp[0]);
      else if (n === 1) { pebble(canvas, cx, cy, 0, STONE, ramp[0]); pebble(canvas, cx + 5, cy + 2, 1, STONE, ramp[0]); }
      else if (n === 2) blotch(canvas, cx, cy, 6, '#1e6f50', s);
      else if (n === 3) { canvas.ellipse(cx, cy, 5, 2.5, '#1a1932'); canvas.pixel(cx - 2, cy - 1, '#657392'); }
      else if (n === 4) blotch(canvas, cx, cy, 9, ramp[1], s);
      else { canvas.line(cx - 6, cy - 3, cx, cy, ramp[0]); canvas.line(cx, cy, cx + 5, cy - 1, ramp[0]); }
      break;
    default:
      break;
  }
  return canvas;
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

// ---------- Camada de baixo (animada) ----------

export const UNDER_KINDS = Object.freeze([T.SEA, T.LAVA, T.MURK, T.ICE]);
export const UNDER_FRAME_COUNT = 4;

const UNDER_TONES = {
  [T.SEA]: ['#0c2e44', '#00396d', '#0069aa', '#0098dc', '#00cdf9'],
  [T.LAVA]: ['#8e251d', '#c64524', '#e07438', '#ffa214', '#ffeb57'],
  [T.MURK]: ['#0e071b', '#1a1932', '#134c4c', '#2d2e25', '#1e6f50'],
  [T.ICE]: ['#657392', '#92a1b9', '#9cc8e6', '#d5e8ef', '#ffffff']
};

/** Água do mar, lava, lodo e gelo; quadros 0..3 animam ondas e brilhos. */
export function drawUnderTile(kind, frame = 0) {
  const canvas = new PixelCanvas(TILE_PX, TILE_PX);
  const tones = UNDER_TONES[kind];
  const seed = 70 + kind;
  // Grão fino que "corre" 1 px por quadro (água e lava escorrem; gelo fica parado).
  const drift = kind === T.ICE ? 0 : frame * (kind === T.LAVA ? 2 : 3);
  for (let y = 0; y < TILE_PX; y += 1) {
    for (let x = 0; x < TILE_PX; x += 1) {
      const sx = wrap(x + drift);
      const v = periodic(sx, y, 12, seed) * 0.55 + periodic(sx, y, 24, seed + 1) * 0.45 + (hash(sx >> 1, y >> 1, seed + 2) - 0.5) * 0.1;
      let tone = v < 0.3 ? 1 : v > 0.72 ? 3 : 2;
      if (kind === T.MURK) tone = v < 0.3 ? 0 : v > 0.74 ? 4 : 2;
      if (kind === T.ICE) tone = v > 0.7 ? 3 : 2;
      canvas.pixel(x, y, tones[tone]);
    }
  }
  const phase = (index) => (frame + index) % UNDER_FRAME_COUNT;
  if (kind === T.SEA) {
    // Cristas de onda: traços curtos que acendem e apagam.
    scatter(seed + 10, 9, (x, y, index) => {
      const p = phase(index);
      if (p === 3) return;
      const length = p === 1 ? 5 : 3;
      for (let i = 0; i < length; i += 1) canvas.pixel(wrap(x + i - (length >> 1)), y, i === length >> 1 && p === 1 ? '#94fdff' : tones[4]);
      if (p === 1) canvas.pixel(wrap(x), y + 1, tones[1]);
    }, 2);
  } else if (kind === T.LAVA) {
    // Placas de crosta boiando (escuras, com borda acesa) e bolhas.
    scatter(seed + 10, 5, (x, y, index) => {
      blotch(canvas, x, y, 3 + (index % 3), '#8e251d', seed + index);
      blotch(canvas, x, y, 1.6 + (index % 2), '#391f21', seed + index + 9);
    }, 9);
    scatter(seed + 11, 4, (x, y, index) => {
      const p = phase(index);
      if (p === 0) { canvas.pixel(x, y, tones[4]); canvas.pixel(x + 1, y, tones[3]); }
      if (p === 1) { canvas.pixel(x, y - 1, tones[4]); canvas.pixel(x - 1, y, tones[4]); canvas.pixel(x + 1, y, tones[4]); canvas.pixel(x, y, '#ffffff'); }
    }, 4);
  } else if (kind === T.MURK) {
    scatter(seed + 10, 4, (x, y, index) => {
      if (phase(index) < 2) { canvas.pixel(x, y, '#657392'); canvas.pixel(x + 1, y, '#424c6e'); }
    }, 4);
  } else {
    // Gelo: reflexos em diagonal e rachaduras finas com luz de um lado.
    for (let i = 0; i < TILE_PX; i += 1) {
      for (const [offset, width] of [[6, 2], [31, 1]]) {
        for (let w = 0; w < width; w += 1) {
          const x = wrap(i + offset + w);
          if (periodic(x, i, 4, 88) > 0.42) canvas.pixel(x, wrap(TILE_PX - 1 - i), tones[4]);
        }
      }
    }
    for (const [x0, y0, x1, y1] of [[10, 16, 18, 20], [31, 36, 37, 34]]) {
      canvas.line(x0, y0, x1, y1, tones[3]);
      canvas.line(x0, y0 + 1, x1, y1 + 1, tones[4]);
    }
  }
  return canvas;
}

// ---------- Bordas (terra recortada sobre água/lava/lodo/gelo) ----------

const EDGE_STYLE = {
  // inner = 2 px colados na água (espuma/crosta), band = 1-2 px de transição, wet = faixa molhada na terra.
  [T.SEA]: { inner: '#ffffff', band: '#94fdff', wetColor: '#ad7954', wetWidth: 4, sand: '#f6ca9f', foam: '#d5e8ef', width: 9 },
  [T.LAVA]: { inner: '#ffa214', band: '#391f21', wetColor: '#1c121c', wetWidth: 4, sand: null, foam: '#ffeb57', width: 8 },
  [T.MURK]: { inner: '#1e6f50', band: '#2d2e25', wetColor: '#1c121c', wetWidth: 3, sand: null, foam: null, width: 8 },
  [T.ICE]: { inner: '#ffffff', band: '#9cc8e6', wetColor: '#9cc8e6', wetWidth: 2, sand: null, foam: null, width: 7 }
};

/**
 * Ladrilho de terra (land) cuja borda encosta em `under` nos lados da máscara.
 * Lados: 1 = norte, 2 = leste, 4 = sul, 8 = oeste; diagonais entram quando os dois lados vizinhos são água.
 */
export function drawEdgeTile(land, under, mask, variant = 0) {
  const canvas = drawBaseTile(land, variant);
  const style = EDGE_STYLE[under];
  const cells = maskCells(mask & 15);
  const sandy = land === T.BEACH || land === T.SAND || land === T.DUNE;
  for (let y = 0; y < TILE_PX; y += 1) {
    for (let x = 0; x < TILE_PX; x += 1) {
      // Borda ondulada suave (periódica nos dois eixos para casar com os vizinhos); d < 0 = água.
      const d = -cellReach(x + 0.5, y + 0.5, cells, (ex, ey) => style.width + shoreWobble(ex, ey, under) * 3.5 + (periodic(ex, ey, 12, 92 + under) - 0.5) * 2);
      if (d < 0) {
        canvas.clearPixel(x, y);
        // Espuma/brilho solto na água, a 2-3 px da margem.
        if (style.foam && d > -4 && d < -2.5 && periodic(x, y, 8, 95 + under) > 0.5) canvas.pixel(x, y, style.foam);
      } else if (d < 2) {
        canvas.pixel(x, y, style.inner);
      } else if (d < 3) {
        canvas.pixel(x, y, style.band);
      } else if (d < 3 + style.wetWidth) {
        if (!(d > 3 + style.wetWidth - 1.5 && hash(x >> 1, y >> 1, 93) > 0.5)) canvas.pixel(x, y, style.wetColor);
      } else if (style.sand && !sandy && d < 16) {
        // Faixa de areia entre a mata e o mar, com borda em blocos.
        if (d < 12 + (hash(x >> 1, y >> 1, 91) - 0.5) * 6) canvas.pixel(x, y, (hash(x, y, 94) > 0.9) ? '#f9e6cf' : style.sand);
      }
    }
  }
  return canvas;
}
