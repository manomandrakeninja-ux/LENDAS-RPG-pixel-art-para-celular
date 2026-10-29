// Fase 20H: pintura do mapa em pergaminho (papel envelhecido, aguadas de tinta por terreno, relevo,
// bordas de tinta, símbolos pintados e nuvens no lugar da névoa preta). Usado por MapRenderer.
import { T } from '../data/worldRegions.js';
import { hash } from '../art/pixel.js';

// Cor da aguada de cada terreno, força da aguada e altura (para a sombra de encosta).
export const PARCHMENT = {
  [T.VALLEY]: { color: [138, 160, 92], wash: 0.42, lift: 0.18 },
  [T.FOREST]: { color: [82, 112, 70], wash: 0.56, lift: 0.3 },
  [T.JUNGLE]: { color: [98, 138, 74], wash: 0.5, lift: 0.26 },
  [T.SWAMP]: { color: [110, 116, 76], wash: 0.5, lift: 0.08 },
  [T.MURK]: { color: [86, 96, 70], wash: 0.56, lift: 0.06 },
  [T.SNOW]: { color: [238, 242, 240], wash: 0.62, lift: 0.95 },
  [T.ICE]: { color: [168, 200, 214], wash: 0.5, lift: 0.7 },
  [T.SAND]: { color: [214, 176, 108], wash: 0.48, lift: 0.22 },
  [T.DUNE]: { color: [204, 162, 92], wash: 0.52, lift: 0.34 },
  [T.BEACH]: { color: [236, 212, 156], wash: 0.36, lift: 0.04 },
  [T.ASH]: { color: [112, 88, 80], wash: 0.56, lift: 0.6 },
  [T.LAVA]: { color: [204, 78, 36], wash: 0.7, lift: 0.5 },
  [T.SEA]: { color: [102, 148, 160], wash: 0.5, lift: 0 },
  [T.CAVE]: { color: [146, 124, 104], wash: 0.42, lift: 0.3 },
  [T.WALL]: { color: [84, 68, 60], wash: 0.6, lift: 0.5 },
  [T.VOID]: { color: [168, 140, 104], wash: 0.4, lift: 0 }
};
export const INK = '#4a3424';

/** Ruído de valor suave (0..1), interpolado entre pontos de uma grade. */
export function smoothNoise(x, y, seed) {
  const x0 = Math.floor(x); const y0 = Math.floor(y);
  const fx = x - x0; const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx); const sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, seed); const b = hash(x0 + 1, y0, seed);
  const c = hash(x0, y0 + 1, seed); const d = hash(x0 + 1, y0 + 1, seed);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}

/**
 * Pinta o pergaminho em `context` (W x H pixels do mapa). `kindOf(x, y)` dá o terreno do pixel.
 * Devolve `kindAt` para quem quiser espalhar símbolos depois.
 */
export function paintParchment(context, W, H, kindOf) {
  const kinds = new Uint8Array(W * H);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) kinds[y * W + x] = kindOf(x, y);
  const kindAt = (x, y) => kinds[Math.max(0, Math.min(H - 1, y)) * W + Math.max(0, Math.min(W - 1, x))];
  const height = new Float32Array(W * H);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const n = smoothNoise(x / 26, y / 26, 3) * 0.6 + smoothNoise(x / 9, y / 9, 5) * 0.3 + smoothNoise(x / 4, y / 4, 9) * 0.1;
      height[y * W + x] = (PARCHMENT[kinds[y * W + x]]?.lift ?? 0.2) * (0.55 + n * 0.9);
    }
  }
  // Distância (até 7 px) da água até a costa, para as linhas de água em volta das ilhas.
  const coast = new Uint8Array(W * H).fill(255);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (kinds[y * W + x] !== T.SEA) continue;
      let best = 255;
      for (let r = 1; r <= 7 && best === 255; r += 1) {
        for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]]) {
          const k = kindAt(x + dx, y + dy);
          if (k !== T.SEA && k !== T.VOID) { best = r; break; }
        }
      }
      coast[y * W + x] = best;
    }
  }
  const image = context.createImageData(W, H);
  const data = image.data;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const at = y * W + x;
      const kind = kinds[at];
      const style = PARCHMENT[kind] ?? PARCHMENT[T.VOID];
      // Papel: fibras e manchas de idade.
      const fibre = hash(x, y, 31);
      const stain = smoothNoise(x / 40, y / 40, 13);
      let r = 228 - stain * 26 + (fibre - 0.5) * 10;
      let g = 208 - stain * 30 + (fibre - 0.5) * 10;
      let b = 162 - stain * 34 + (fibre - 0.5) * 8;
      // Aguada do terreno, granulada como tinta; o mar escurece longe da costa.
      const grain = smoothNoise(x / 6, y / 6, 21);
      let wash = style.wash * (0.82 + grain * 0.3);
      if (kind === T.SEA) wash = coast[at] === 255 ? style.wash + 0.12 : style.wash - 0.14 + coast[at] * 0.03;
      r += (style.color[0] - r) * wash;
      g += (style.color[1] - g) * wash;
      b += (style.color[2] - b) * wash;
      // Relevo: luz do noroeste.
      const slope = (height[at] - height[Math.min(H - 1, y + 1) * W + Math.min(W - 1, x + 1)]) * 260;
      const shade = Math.max(-26, Math.min(26, slope));
      r += shade; g += shade * 0.92; b += shade * 0.7;
      // Bordas: tinta na costa, traço suave entre biomas e linhas de água em volta da costa.
      const right = kindAt(x + 1, y); const down = kindAt(x, y + 1); const left = kindAt(x - 1, y); const up = kindAt(x, y - 1);
      const edge = right !== kind || down !== kind || left !== kind || up !== kind;
      const sea = kind === T.SEA;
      const touchesSea = right === T.SEA || down === T.SEA || left === T.SEA || up === T.SEA;
      if (edge && !sea && touchesSea) { r = 86; g = 62; b = 44; }
      else if (edge && !sea && kind !== T.VOID) { r *= 0.8; g *= 0.78; b *= 0.76; }
      else if (sea && (coast[at] === 3 || coast[at] === 6) && hash(x >> 1, y, 41) > 0.3) { r -= 22; g -= 16; b -= 8; }
      const index = at * 4;
      data[index] = Math.max(0, Math.min(255, r));
      data[index + 1] = Math.max(0, Math.min(255, g));
      data[index + 2] = Math.max(0, Math.min(255, b));
      data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  drawSymbols(context, W, H, kindAt);
  return kindAt;
}

/** Símbolos pintados espalhados pelo terreno (só onde o bioma é largo o bastante). */
function drawSymbols(context, W, H, kindAt) {
  const step = 15;
  for (let gy = 0; gy < H; gy += step) {
    for (let gx = 0; gx < W; gx += step) {
      const x = gx + Math.floor(hash(gx, gy, 51) * step * 0.8);
      const y = gy + Math.floor(hash(gx, gy, 52) * step * 0.8);
      if (x >= W || y >= H) continue;
      const kind = kindAt(x, y);
      const roomy = [[9, 0], [-9, 0], [0, 7], [0, -12], [6, 6], [-6, 6]].every(([dx, dy]) => kindAt(x + dx, y + dy) === kind);
      if (!roomy) continue;
      const roll = hash(gx, gy, 53);
      if (kind === T.FOREST) { drawTreeSymbol(context, x - 3, y, 'pine'); drawTreeSymbol(context, x + 3, y + 2, roll > 0.5 ? 'pine' : 'oak'); }
      else if (kind === T.JUNGLE && roll > 0.25) drawTreeSymbol(context, x, y, 'palm');
      else if ((kind === T.SNOW || kind === T.ICE) && roll > 0.3) drawMountain(context, x, y, roll > 0.75 ? 11 : 8, true);
      else if ((kind === T.SAND || kind === T.DUNE) && roll > 0.4) drawDune(context, x, y);
      else if (kind === T.ASH && roll > 0.35) { if (roll > 0.86) drawVolcano(context, x, y); else drawMountain(context, x, y, 8, false); }
      else if ((kind === T.SWAMP || kind === T.MURK) && roll > 0.4) drawReeds(context, x, y);
      else if (kind === T.SEA && roll > 0.8) drawWave(context, x, y);
    }
  }
}

/** Camada de nuvens do pergaminho (névoa do que não foi explorado). */
export function paintClouds(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const image = context.createImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const n = smoothNoise(x / 60, y / 44, 61) * 0.6 + smoothNoise(x / 22, y / 18, 62) * 0.28 + smoothNoise(x / 7, y / 7, 63) * 0.12;
      // Bandas de tom como nuvem pintada: miolo claro, base mais escura.
      const band = n > 0.62 ? 0 : n > 0.5 ? 1 : n > 0.4 ? 2 : 3;
      const tone = [[244, 236, 214], [226, 214, 188], [204, 190, 164], [186, 170, 146]][band];
      const index = (y * width + x) * 4;
      image.data[index] = tone[0];
      image.data[index + 1] = tone[1];
      image.data[index + 2] = tone[2];
      // Nuvem densa no miolo, véu fino nas bordas: o relevo do que não foi explorado aparece de leve.
      image.data[index + 3] = [222, 186, 140, 96][band];
    }
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

/** Árvore desenhada a tinta (pinheiro, carvalho, outono ou palmeira), base em (x, y). */
export function drawTreeSymbol(context, x, y, kind) {
  context.fillStyle = 'rgba(60, 40, 24, 0.35)';
  context.fillRect(x - 2, y, 6, 1);
  if (kind === 'pine') {
    context.fillStyle = INK;
    context.beginPath(); context.moveTo(x, y - 9); context.lineTo(x + 4, y); context.lineTo(x - 4, y); context.closePath(); context.fill();
    context.fillStyle = '#3f6a44';
    context.beginPath(); context.moveTo(x, y - 8); context.lineTo(x + 3, y - 1); context.lineTo(x - 3, y - 1); context.closePath(); context.fill();
    context.fillStyle = '#6f9a5a';
    context.fillRect(x - 1, y - 6, 1, 4);
  } else if (kind === 'palm') {
    context.fillStyle = INK;
    context.fillRect(x, y - 6, 1, 6);
    context.fillStyle = '#4f8a3e';
    context.fillRect(x - 3, y - 7, 7, 2);
    context.fillRect(x - 1, y - 8, 3, 1);
    context.fillStyle = INK;
    context.fillRect(x - 4, y - 6, 1, 1);
    context.fillRect(x + 4, y - 6, 1, 1);
  } else {
    const crown = kind === 'autumn' ? ['#8e4a2c', '#c9773f'] : ['#3d6a40', '#6f9a58'];
    context.fillStyle = INK;
    context.fillRect(x, y - 3, 1, 3);
    context.beginPath(); context.arc(x + 0.5, y - 5, 3.6, 0, Math.PI * 2); context.fill();
    context.fillStyle = crown[0];
    context.beginPath(); context.arc(x + 0.5, y - 5, 2.8, 0, Math.PI * 2); context.fill();
    context.fillStyle = crown[1];
    context.fillRect(x - 1, y - 7, 2, 2);
  }
}

/** Montanha com encosta clara, encosta na sombra e (opcional) pico nevado. */
function drawMountain(context, x, y, size, snow) {
  context.fillStyle = INK;
  context.beginPath(); context.moveTo(x - size - 1, y + 1); context.lineTo(x, y - size - 1); context.lineTo(x + size + 1, y + 1); context.closePath(); context.fill();
  context.fillStyle = snow ? '#c9d2d4' : '#9a8274';
  context.beginPath(); context.moveTo(x - size, y); context.lineTo(x, y - size); context.lineTo(x, y); context.closePath(); context.fill();
  context.fillStyle = snow ? '#7f93a0' : '#5e4a42';
  context.beginPath(); context.moveTo(x, y - size); context.lineTo(x + size, y); context.lineTo(x, y); context.closePath(); context.fill();
  if (snow) {
    context.fillStyle = '#ffffff';
    context.beginPath(); context.moveTo(x - size * 0.35, y - size * 0.62); context.lineTo(x, y - size); context.lineTo(x + size * 0.3, y - size * 0.66); context.lineTo(x, y - size * 0.55); context.closePath(); context.fill();
  }
}

function drawVolcano(context, x, y) {
  drawMountain(context, x, y, 11, false);
  context.fillStyle = '#e0552a';
  context.fillRect(x - 2, y - 11, 5, 2);
  context.fillStyle = '#ffc04a';
  context.fillRect(x - 1, y - 11, 2, 1);
  context.fillStyle = 'rgba(70, 60, 56, 0.55)';
  context.beginPath(); context.arc(x + 2, y - 15, 3, 0, Math.PI * 2); context.arc(x + 5, y - 19, 2.4, 0, Math.PI * 2); context.fill();
}

function drawDune(context, x, y) {
  context.lineWidth = 1;
  context.strokeStyle = '#8a6438';
  context.beginPath(); context.moveTo(x - 6, y); context.quadraticCurveTo(x - 1, y - 5, x + 6, y); context.stroke();
  context.strokeStyle = '#f2dcae';
  context.beginPath(); context.moveTo(x - 5, y - 1); context.quadraticCurveTo(x - 2, y - 4, x, y - 3); context.stroke();
}

function drawReeds(context, x, y) {
  context.fillStyle = INK;
  for (const [dx, h] of [[-2, 4], [0, 6], [2, 5]]) context.fillRect(x + dx, y - h, 1, h);
  context.fillStyle = '#8a6a3a';
  context.fillRect(x, y - 7, 1, 2);
  context.fillStyle = 'rgba(70, 90, 80, 0.5)';
  context.fillRect(x - 4, y + 1, 9, 1);
}

function drawWave(context, x, y) {
  context.strokeStyle = 'rgba(54, 92, 104, 0.7)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(x - 4, y); context.quadraticCurveTo(x - 2, y - 2, x, y); context.quadraticCurveTo(x + 2, y + 2, x + 4, y);
  context.stroke();
}

/**
 * Borda queimada e vinheta do pergaminho, do tamanho do canvas do mapa grande (feita uma vez).
 * Fora da queimadura fica transparente; na borda, carvão e marrom tostado.
 */
export function paintBurntEdge(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const image = context.createImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const edge = Math.min(x, y, width - 1 - x, height - 1 - y);
      if (edge > 60) continue;
      const along = x < 60 || x > width - 61 ? y : x;
      const ragged = smoothNoise(along / 22, edge / 30 + (x < y ? 7 : 3), 71) * 14 + smoothNoise(along / 6, 1, 72) * 5;
      const d = edge - ragged;
      let rgba = null;
      if (d < 0) rgba = [14, 15, 21, 255];
      else if (d < 2) rgba = [26, 16, 10, 255];
      else if (d < 4.5) rgba = [70, 38, 18, 235];
      else if (d < 9) rgba = [120, 74, 36, 150 - (d - 4.5) * 18];
      else if (d < 34) rgba = [90, 58, 30, Math.max(0, 70 - (d - 9) * 2.8)];
      if (!rgba) continue;
      const index = (y * width + x) * 4;
      image.data[index] = rgba[0];
      image.data[index + 1] = rgba[1];
      image.data[index + 2] = rgba[2];
      image.data[index + 3] = rgba[3];
    }
  }
  context.putImageData(image, 0, 0);
  return canvas;
}
