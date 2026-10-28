import { PixelCanvas, hash, dither, mix } from './pixel.js';
import { T } from '../data/worldRegions.js';

// Chão das regiões novas, em ladrilhos de 48 px que se repetem sem emenda.
// Bordas com água/lava/lodo/gelo são recortadas por máscara (N=1, L=2, S=4, O=8):
// a parte "molhada" fica transparente e a camada animada de baixo aparece.

export const TILE_PX = 48;

const PALETTES = {
  [T.FOREST]: ['#142418', '#1b301e', '#233d25', '#2d4b2c', '#3d6136'],
  [T.JUNGLE]: ['#2c6428', '#377a2f', '#448f36', '#55a63f', '#79c254'],
  [T.SWAMP]: ['#262a1b', '#303623', '#3b432a', '#475232', '#596a3b'],
  [T.SNOW]: ['#9cb2c8', '#b9cbdd', '#d3e1ee', '#e7f0f8', '#fbfdff'],
  [T.SAND]: ['#ab8446', '#bf9a55', '#d1ad66', '#dfc07a', '#ecd495'],
  [T.DUNE]: ['#9f763c', '#b38a4b', '#c69d5b', '#d6b06c', '#e6c784'],
  [T.BEACH]: ['#c9b083', '#dbc596', '#e7d4a7', '#f1e2b9', '#fbf0d2'],
  [T.ASH]: ['#0e071b', '#1a1932', '#272727', '#3d3d3d', '#5d5d5d'],
  [T.CAVE]: ['#3a3230', '#4a403c', '#5a4e48', '#6c5e56', '#857464'],
  [T.VALLEY]: ['#3b6b3e', '#467a45', '#4f874a', '#5c9651', '#78ad5e']
};

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

function layered(x, y, seed) {
  return periodic(x, y, 3, seed) * 0.55 + periodic(x, y, 6, seed + 1) * 0.3 + periodic(x, y, 12, seed + 2) * 0.15;
}

/** Tom (0..4) a partir do ruído com dither, para volumes suaves em pixel art. */
function tone(value, x, y) {
  const v = value * 4 + (dither(x, y) - 0.5) * 0.9;
  return Math.max(0, Math.min(4, Math.round(v)));
}

function scatter(seed, count, callback, margin = 3) {
  for (let index = 0; index < count; index += 1) {
    const x = margin + Math.floor(hash(index, 1, seed) * (TILE_PX - margin * 2));
    const y = margin + Math.floor(hash(index, 2, seed) * (TILE_PX - margin * 2));
    callback(x, y, index);
  }
}

// ---------- Texturas base de cada terreno ----------

function base(canvas, kind, variant) {
  const palette = PALETTES[kind];
  const seed = kind * 10 + 3;
  for (let y = 0; y < TILE_PX; y += 1) {
    for (let x = 0; x < TILE_PX; x += 1) {
      let value = layered(x, y, seed);
      if (kind === T.DUNE || kind === T.SAND) {
        // Ondulações de vento na areia (diagonais suaves).
        // Frequências inteiras por ladrilho: as ondulações continuam no vizinho sem emenda.
        const ripple = Math.sin(((x * 2 + y * 5) / TILE_PX) * Math.PI * 2 + periodic(x, y, 3, seed + 9) * 2.4);
        value = value * 0.6 + (ripple * 0.5 + 0.5) * (kind === T.DUNE ? 0.4 : 0.22) + (kind === T.DUNE ? 0 : 0.1);
      }
      if (kind === T.SNOW) value = value * 0.7 + 0.32;
      if (kind === T.CAVE) value = value * 0.8 + 0.08;
      canvas.pixel(x, y, palette[tone(value, x, y)]);
    }
  }
  const s = seed * 7 + variant * 31;
  switch (kind) {
    case T.FOREST:
      // Folhas secas, musgo e raízes.
      scatter(s, 4 + variant * 2, (x, y, i) => {
        const leaf = ['#6b4a26', '#7d5a2c', '#4f3a20', '#8a6a34'][i % 4];
        canvas.pixel(x, y, leaf);
        canvas.pixel(x + 1, y, leaf);
        if (i % 3 === 0) canvas.pixel(x, y + 1, '#3a2a18');
      });
      scatter(s + 1, 2 + variant, (x, y) => {
        canvas.pixel(x, y, '#4f7a3e');
        canvas.pixel(x, y - 1, '#6a9a4a');
        canvas.pixel(x - 1, y, '#3d6136');
      });
      if (variant === 2) {
        for (let x = 6; x < 30; x += 1) canvas.pixel(x, 30 + Math.round(Math.sin(x / 4) * 2), '#3d2a1a');
      }
      if (variant === 3) {
        scatter(s + 2, 3, (x, y) => {
          canvas.pixel(x, y, '#e8e0c8');
          canvas.pixel(x + 1, y, '#c84a3a');
          canvas.pixel(x, y - 1, '#c84a3a');
        }, 8);
      }
      break;
    case T.JUNGLE:
      scatter(s, 3 + variant, (x, y) => {
        canvas.pixel(x, y, '#2c6428');
        canvas.pixel(x, y - 1, '#8ad860');
        canvas.pixel(x - 1, y - 2, '#a6e878');
        canvas.pixel(x + 1, y - 2, '#79c254');
      });
      if (variant >= 2) {
        scatter(s + 3, variant - 1, (x, y, i) => {
          const petal = ['#ff6a8a', '#ffd84a', '#ffffff', '#c86aff'][i % 4];
          canvas.pixel(x, y - 1, petal); canvas.pixel(x - 1, y, petal); canvas.pixel(x + 1, y, petal); canvas.pixel(x, y + 1, petal);
          canvas.pixel(x, y, '#ffe08a');
        }, 6);
      }
      break;
    case T.SWAMP:
      scatter(s, 2 + variant, (x, y, i) => {
        if (i % 2) {
          canvas.ellipse(x, y, 2.4, 1.3, '#24301e');
          canvas.pixel(x - 1, y - 1, '#5a7a4a');
        } else {
          canvas.pixel(x, y, '#6a8a3e');
          canvas.pixel(x, y - 1, '#7f9e48');
          canvas.pixel(x + 1, y - 2, '#7f9e48');
        }
      });
      if (variant === 3) {
        scatter(s + 5, 2, (x, y) => {
          canvas.rect(x, y, 1, 1, '#c8c890');
          canvas.rect(x - 1, y + 1, 3, 1, '#8a8a5a');
        }, 8);
      }
      break;
    case T.SNOW:
      // Brilhos de cristal na neve.
      scatter(s + 1, 2 + variant, (x, y) => {
        canvas.pixel(x, y, '#ffffff');
        if (hash(x, y, 4) > 0.6) {
          canvas.pixel(x - 1, y, '#e6f4ff');
          canvas.pixel(x + 1, y, '#e6f4ff');
        }
      });
      if (variant === 3) {
        scatter(s + 2, 2, (x, y) => {
          canvas.ellipse(x, y, 2.2, 1.4, '#7a8a96');
          canvas.pixel(x - 1, y - 1, '#e8f0f8');
          canvas.pixel(x, y - 1, '#ffffff');
        }, 8);
      }
      break;
    case T.SAND:
    case T.DUNE:
      scatter(s, 4 + variant, (x, y, i) => {
        canvas.pixel(x, y, i % 2 ? '#8f6a38' : '#f4e0a8');
      });
      if (variant === 3 && kind === T.SAND) {
        scatter(s + 6, 2, (x, y) => {
          canvas.ellipse(x, y, 2.5, 1.6, '#8a6a42');
          canvas.pixel(x - 1, y - 1, '#d8b880');
        }, 8);
      }
      break;
    case T.BEACH:
      scatter(s, 5 + variant, (x, y, i) => {
        const shell = ['#ffffff', '#f2b8a8', '#e8d0f0', '#c8a878'][i % 4];
        canvas.pixel(x, y, shell);
        if (i % 3 === 0) canvas.pixel(x + 1, y, shell);
      });
      if (variant === 2) {
        scatter(s + 7, 2, (x, y) => {
          canvas.ellipse(x, y, 2.6, 1.6, '#8a8478');
          canvas.pixel(x - 1, y - 1, '#c8c0b0');
        }, 8);
      }
      break;
    case T.ASH:
      // Rachaduras com brasa e pedrinhas de obsidiana.
      if (variant >= 2) {
        let cx = 6 + Math.floor(hash(variant, 1, s) * 30);
        let cy = 6 + Math.floor(hash(variant, 2, s) * 30);
        for (let step = 0; step < 18; step += 1) {
          canvas.pixel(cx, cy, step % 5 === 2 ? '#ffb03a' : '#c8401a');
          cx = Math.max(1, Math.min(46, cx + Math.round(hash(step, 3, s) * 2 - 1)));
          cy = Math.max(1, Math.min(46, cy + 1));
        }
      }
      scatter(s + 1, 7, (x, y, i) => {
        canvas.pixel(x, y, i % 3 ? '#0e0a0c' : '#6a5a5a');
        if (i % 4 === 0) canvas.pixel(x + 1, y, '#3a2a2a');
      });
      break;
    case T.CAVE:
      scatter(s, 2 + variant * 2, (x, y, i) => {
        if (i % 2) {
          canvas.ellipse(x, y, 1.8, 1.2, '#1c1719');
          canvas.pixel(x - 1, y - 1, '#6a5e58');
        } else canvas.pixel(x, y, '#5e5250');
      });
      if (variant === 3) {
        // Ossinhos esquecidos.
        canvas.rect(14, 30, 7, 1, '#cfc6aa');
        canvas.pixel(13, 29, '#cfc6aa');
        canvas.pixel(13, 31, '#cfc6aa');
        canvas.pixel(21, 29, '#cfc6aa');
        canvas.pixel(21, 31, '#cfc6aa');
      }
      break;
    default:
      break;
  }
}

export function drawBaseTile(kind, variant = 0) {
  const canvas = new PixelCanvas(TILE_PX, TILE_PX);
  base(canvas, kind, variant);
  return canvas;
}

// ---------- Paredes da caverna ----------

const ROCK = ['#0d0b0e', '#151216', '#1d191f', '#26212a', '#332c36', '#463d48'];

/** Topo da rocha (massa escura vista de cima) ou face do paredão (sul aberto). */
export function drawWallTile(face, variant = 0, rim = 0) {
  const canvas = new PixelCanvas(TILE_PX, TILE_PX);
  for (let y = 0; y < TILE_PX; y += 1) {
    for (let x = 0; x < TILE_PX; x += 1) {
      if (face) {
        // Face vertical: claro em cima, escurece para baixo, com estratos.
        const strata = Math.sin(y * 0.55 + periodic(x, y, 4, 61 + variant) * 3) * 0.5 + 0.5;
        const v = 0.85 - (y / TILE_PX) * 0.6 + strata * 0.18 + (layered(x, y, 62) - 0.5) * 0.3;
        canvas.pixel(x, y, ROCK[Math.max(1, Math.min(5, Math.round(v * 5 + (dither(x, y) - 0.5))))]);
      } else {
        const v = layered(x, y, 63 + variant) * 0.7;
        canvas.pixel(x, y, ROCK[Math.max(0, Math.min(3, Math.round(v * 4 + (dither(x, y) - 0.5) * 0.8)))]);
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

/** Água do mar, lava, lodo e gelo; quadros 0..3 animam ondas e brilhos. */
export function drawUnderTile(kind, frame = 0) {
  const canvas = new PixelCanvas(TILE_PX, TILE_PX);
  const phase = (frame / UNDER_FRAME_COUNT) * Math.PI * 2;
  for (let y = 0; y < TILE_PX; y += 1) {
    for (let x = 0; x < TILE_PX; x += 1) {
      const n = layered(x, y, 70 + kind);
      let color;
      if (kind === T.SEA) {
        const wave = Math.sin((x / TILE_PX) * Math.PI * 4 + (y / TILE_PX) * Math.PI * 2 + phase + n * 3);
        const v = n * 0.6 + wave * 0.18 + 0.2;
        const tones = ['#1c4670', '#225482', '#2a6292', '#3474a4', '#4a8cba'];
        color = tones[Math.max(0, Math.min(4, Math.round(v * 4 + (dither(x, y) - 0.5) * 0.8)))];
        // Cristas de onda brilhando.
        const crest = Math.sin((x / TILE_PX) * Math.PI * 6 - (y / TILE_PX) * Math.PI * 2 + phase * 2 + n * 4);
        if (crest > 0.93 && hash(x, y, 77 + frame) > 0.35) color = '#a8d8f0';
      } else if (kind === T.LAVA) {
        const flow = Math.sin((x / TILE_PX) * Math.PI * 2 + (y / TILE_PX) * Math.PI * 4 + phase + n * 5);
        const v = n * 0.55 + flow * 0.25 + 0.25;
        const tones = ['#7a1a0c', '#b8300e', '#e2531e', '#ff8a2a', '#ffd06a'];
        color = tones[Math.max(0, Math.min(4, Math.round(v * 4 + (dither(x, y) - 0.5) * 0.8)))];
        // Crosta escura boiando.
        if (periodic((x + frame * 3) % TILE_PX, y, 6, 79) > 0.8) color = '#4a1a10';
      } else if (kind === T.MURK) {
        const wave = Math.sin((x / TILE_PX) * Math.PI * 2 + phase * 0.5 + n * 3);
        const v = n * 0.6 + wave * 0.1 + 0.15;
        const tones = ['#16241f', '#1c2e27', '#22382f', '#2a4438', '#365446'];
        color = tones[Math.max(0, Math.min(4, Math.round(v * 4 + (dither(x, y) - 0.5) * 0.8)))];
        const glint = Math.sin((x / TILE_PX) * Math.PI * 4 + (y / TILE_PX) * Math.PI * 2 * 3 + phase);
        if (glint > 0.96 && hash(x, y, 83) > 0.5) color = '#5a7a68';
      } else {
        // Gelo: liso, com rachaduras e reflexos.
        const v = n * 0.5 + 0.35 + (x + y) / (TILE_PX * 8);
        const tones = ['#7ea8c8', '#92bad6', '#a8cce2', '#c2def0', '#e2f2fc'];
        color = tones[Math.max(0, Math.min(4, Math.round(v * 4 + (dither(x, y) - 0.5) * 0.6)))];
      }
      canvas.pixel(x, y, color);
    }
  }
  if (kind === T.ICE) {
    canvas.line(8, 10, 20, 18, '#e8f6ff');
    canvas.line(20, 18, 26, 16, '#e8f6ff');
    canvas.line(30, 34, 40, 30, '#6a90b0');
    canvas.pixel(12, 30, '#ffffff');
  }
  return canvas;
}

// ---------- Bordas (terra recortada sobre água/lava/lodo/gelo) ----------

// Distância (px) do ponto até a célula vizinha marcada.
function cellDistance(x, y, dx, dy) {
  const left = dx * TILE_PX;
  const top = dy * TILE_PX;
  const cx = Math.max(left, Math.min(x, left + TILE_PX));
  const cy = Math.max(top, Math.min(y, top + TILE_PX));
  return Math.hypot(x - cx, y - cy);
}

const EDGE_STYLE = {
  [T.SEA]: { inner: '#eaf6ff', band: '#c8e4f0', wet: 0.42, wetColor: '#6a5a40', sand: '#e7d4a7', width: 9 },
  [T.LAVA]: { inner: '#ffd06a', band: '#ff7a2a', wet: 0.6, wetColor: '#1a1012', sand: null, width: 8 },
  [T.MURK]: { inner: '#5a7a3a', band: '#2a2a1a', wet: 0.45, wetColor: '#1e2014', sand: null, width: 8 },
  [T.ICE]: { inner: '#ffffff', band: '#d8eaf8', wet: 0.25, wetColor: '#8aa8c8', sand: null, width: 7 }
};

/**
 * Ladrilho de terra (land) cuja borda encosta em `under` nos lados da máscara.
 * Lados: 1 = norte, 2 = leste, 4 = sul, 8 = oeste; diagonais entram quando os dois lados vizinhos são água.
 */
export function drawEdgeTile(land, under, mask, variant = 0) {
  const canvas = land === T.VALLEY ? new PixelCanvas(TILE_PX, TILE_PX) : drawBaseTile(land, variant);
  if (land === T.VALLEY) base(canvas, T.VALLEY, variant);
  const style = EDGE_STYLE[under];
  const n = mask & 1;
  const e = mask & 2;
  const s = mask & 4;
  const w = mask & 8;
  const cells = [];
  if (n) cells.push([0, -1]);
  if (e) cells.push([1, 0]);
  if (s) cells.push([0, 1]);
  if (w) cells.push([-1, 0]);
  if (n && e) cells.push([1, -1]);
  if (s && e) cells.push([1, 1]);
  if (s && w) cells.push([-1, 1]);
  if (n && w) cells.push([-1, -1]);
  for (let y = 0; y < TILE_PX; y += 1) {
    for (let x = 0; x < TILE_PX; x += 1) {
      let distance = Infinity;
      for (const [dx, dy] of cells) distance = Math.min(distance, cellDistance(x + 0.5, y + 0.5, dx, dy));
      // Borda ondulada (periódica nos dois eixos para casar com os vizinhos).
      const wobble = style.width + (periodic(x, y, 4, 90 + under) - 0.5) * 8;
      if (distance < wobble) {
        canvas.clearPixel(x, y);
      } else if (distance < wobble + 1.5) {
        canvas.pixel(x, y, style.inner);
      } else if (distance < wobble + 3) {
        canvas.pixel(x, y, style.band);
      } else if (distance < wobble + 8) {
        const current = canvas.colorAt(x, y);
        const fade = 1 - (distance - wobble - 3) / 5;
        canvas.pixel(x, y, mix(current, style.wetColor, style.wet * fade));
      } else if (style.sand && distance < wobble + 16 && land !== T.BEACH && land !== T.SAND && land !== T.DUNE) {
        // Faixa de areia entre a mata e o mar.
        const t = (distance - wobble - 8) / 8;
        if (hash(x, y, 91) > t * t) canvas.pixel(x, y, (x + y) % 7 === 0 ? '#f6e8c0' : style.sand);
      }
    }
  }
  return canvas;
}

// ---------- Manchas de transição entre terrenos ----------

export const BLOB_SIZE = Object.freeze({ width: 80, height: 60 });

/** Mancha irregular de um terreno (neve sobre grama, areia sobre mato...). */
export function drawBlob(kind, shape = 0) {
  const { width, height } = BLOB_SIZE;
  const canvas = new PixelCanvas(width, height);
  const source = new PixelCanvas(TILE_PX, TILE_PX);
  base(source, kind, shape % 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const nx = (x - width / 2) / (width / 2);
      const ny = (y - height / 2) / (height / 2);
      const radial = Math.hypot(nx, ny);
      const edge = 0.62 + (periodic(x % TILE_PX, y % TILE_PX, 4, 120 + shape) - 0.5) * 0.55;
      if (radial > edge + 0.18) continue;
      if (radial > edge && dither(x, y) > (edge + 0.18 - radial) / 0.18) continue;
      canvas.pixel(x, y, source.colorAt(x % TILE_PX, y % TILE_PX));
    }
  }
  return canvas;
}

export const BLOB_KINDS = Object.freeze([T.VALLEY, T.FOREST, T.SWAMP, T.SNOW, T.SAND, T.DUNE, T.JUNGLE, T.ASH, T.BEACH]);
export const BLOB_SHAPES = 3;
