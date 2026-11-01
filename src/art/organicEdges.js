import { PixelCanvas, hash } from './pixel.js';
import { T } from '../data/worldRegions.js';
import { drawBaseTile, drawValleyTile, TILE_PX } from './terrain.js';

// Bordas orgânicas entre estrada (T.ROAD) e grama do Vale (VALLEY plana).
// Cada aresta compartilhada tem UMA curva de fronteira, deslocada de s(lane, lado) pixels em relação ao
// meio da aresta. As duas células da aresta leem a mesma curva (mesma linha/coluna de pixels e mesma lane),
// então a fronteira emenda sem degrau. A lane é a linha (para arestas verticais) ou a coluna (horizontais)
// do mapa mod 5: a mesma aresta tem sempre a mesma lane nos dois lados, e lanes diferentes dão curvas diferentes.
//
// Nome do tile: orgr-<v>-<mask>-<rc>-<cc> (célula de estrada que vê grama)  ou  orgg-<v>-<mask>-<rc>-<cc>
//   v    = variante do ladrilho base (0..47)
//   mask = lados com vizinho do outro tipo: N 1, L 2, S 4, O 8
//   rc   = linha mod 5 (lane das arestas verticais);  cc = coluna mod 5 (lane das horizontais)

const S = TILE_PX;
const LAST = S - 1;
const SHIFT_AMP = 8;
const SHIFT_FINE = 2;
const N_BIT = 1; const E_BIT = 2; const S_BIT = 4; const W_BIT = 8;

function smooth(t) { return t * t * (3 - 2 * t); }
// Ruído de valor 1D determinístico (período `period` pixels), em [0, 1).
function valueNoise(t, period, seed) {
  const i = Math.floor(t / period);
  const f = smooth((t - i * period) / period);
  const a = hash(i, 0, seed);
  const b = hash(i + 1, 0, seed);
  return a + (b - a) * f;
}

/** Deslocamento (inteiro, pixels) da fronteira numa aresta: `t` = posição ao longo da aresta, `lane` = lane. */
export function edgeShift(t, lane, vertical) {
  const seed = (vertical ? 101 : 211) + lane * 37;
  const coarse = valueNoise(t + lane * 13, 10, seed) * 2 - 1;
  const fine = valueNoise(t, 4, seed + 9) * 2 - 1;
  return Math.round(coarse * SHIFT_AMP + fine * SHIFT_FINE);
}

/** Pixel (x, y) pertence ao tipo oposto ao do ladrilho (grama numa estrada, ou estrada numa grama)? */
export function otherSideAt(x, y, mask, rc, cc) {
  if (mask & E_BIT && x >= S + edgeShift(y, rc, true)) return true;
  if (mask & W_BIT && x < edgeShift(y, rc, true)) return true;
  if (mask & S_BIT && y >= S + edgeShift(x, cc, false)) return true;
  if (mask & N_BIT && y < edgeShift(x, cc, false)) return true;
  return false;
}

const GRASS_TUFT = ['#33984b', '#5ac54f', '#99e65f'];
const ROAD_PEBBLE = ['#8a4836', '#cba36f', '#5d2c28'];

/** Tufos e pedrinhas só dentro da própria região (nunca cruzam a fronteira). */
function decorate(canvas, road, mask, rc, cc, seedBase) {
  for (let y = 4; y < LAST - 3; y += 1) {
    for (let x = 4; x < LAST - 3; x += 1) {
      const roll = hash(x, y, seedBase);
      if (roll > 0.035) continue;
      const other = otherSideAt(x, y, mask, rc, cc);
      // Região do pixel: estrada quando (ladrilho é estrada) XOR (pixel é do outro lado).
      const onRoad = road !== other;
      // Nada perto de 2 px da fronteira: o detalhe fica inteiro dentro da sua região.
      if (otherSideAt(x + 2, y, mask, rc, cc) !== other || otherSideAt(x - 2, y, mask, rc, cc) !== other) continue;
      if (onRoad) canvas.pixel(x, y, ROAD_PEBBLE[Math.floor(hash(x, y, seedBase + 3) * 3)]);
      else {
        const c = GRASS_TUFT[Math.floor(hash(x, y, seedBase + 5) * 3)];
        canvas.pixel(x, y, c);
        if (hash(x, y, seedBase + 7) > 0.5) canvas.pixel(x, y - 1, c);
      }
    }
  }
}

/** Monta o ladrilho de uma borda orgânica pelo nome (ver cabeçalho). Determinístico. */
export function drawOrganicTile(name) {
  const [prefix, v, mask, rc, cc] = name.split('-');
  const road = prefix === 'orgr';
  const variant = Number(v);
  const base = road ? drawBaseTile(T.ROAD, variant) : drawValleyTile(variant);
  const other = road ? drawValleyTile(variant) : drawBaseTile(T.ROAD, variant);
  const canvas = new PixelCanvas(S, S);
  canvas.blit(base, 0, 0);
  const m = Number(mask); const lr = Number(rc); const lc = Number(cc);
  if (m) {
    for (let y = 0; y < S; y += 1) {
      for (let x = 0; x < S; x += 1) {
        if (otherSideAt(x, y, m, lr, lc)) canvas.pixel(x, y, other.colorAt(x, y));
      }
    }
    decorate(canvas, road, m, lr, lc, 700 + variant * 13 + m * 7);
  }
  return canvas;
}

/** Nome do ladrilho de borda para uma célula (ou null se a célula não precisa). */
export function organicName(road, variant, mask, row, col) {
  return `${road ? 'orgr' : 'orgg'}-${variant}-${mask}-${row % 5}-${col % 5}`;
}

export { N_BIT, E_BIT, S_BIT, W_BIT };
