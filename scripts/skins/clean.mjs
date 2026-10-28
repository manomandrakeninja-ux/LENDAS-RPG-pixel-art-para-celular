// Tira a espada das figuras extraídas (Espadachim e Guerreira) e reconstrói o que ficava atrás.
// Tudo em coordenadas do sprite recortado (extract-skins.mjs / back-maps.mjs).

const hexOf = (c) => '#' + c.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');
const lumOf = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
const satOf = (c) => Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]);

export function makeTools(k) {
  const { put, px, clone, blank } = k;
  const solid = (im, x, y) => x >= 0 && y >= 0 && x < im.w && y < im.h && im.d[(y * im.w + x) * 4 + 3] > 127;
  const clear = (im, x, y) => put(im, x, y, [0, 0, 0, 0]);
  /** Apaga os pixels de uma caixa [x0,y0,x1,y1] (inclusive) que passam no filtro (padrão: todos). */
  const erase = (im, [x0, y0, x1, y1], test = () => true) => {
    for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) if (solid(im, x, y) && test(px(im, x, y), x, y)) clear(im, x, y);
  };
  /** Ponto dentro de polígono (regra par-ímpar), testado no centro do pixel. */
  const inPoly = (poly, x, y) => {
    let inside = false;
    const X = x + 0.5, Y = y + 0.5;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > Y) !== (yj > Y) && X < ((xj - xi) * (Y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const erasePoly = (im, poly, test = () => true) => {
    for (let y = 0; y < im.h; y += 1) for (let x = 0; x < im.w; x += 1) if (solid(im, x, y) && inPoly(poly, x, y) && test(px(im, x, y), x, y)) clear(im, x, y);
  };
  /**
   * Preenche com cor vizinha (a mais próxima, em BFS) os pixels vazios dentro de `poly`.
   * `shade(x, y, color, edge)` pode ajustar a cor (edge = distância ao vazio de fora, 1 = borda).
   */
  const fillPoly = (im, poly, shade, usable = () => true) => {
    const todo = [];
    for (let y = 0; y < im.h; y += 1) for (let x = 0; x < im.w; x += 1) if (!solid(im, x, y) && inPoly(poly, x, y)) todo.push([x, y]);
    const isTodo = new Set(todo.map(([x, y]) => y * im.w + x));
    let pending = todo;
    for (let guard = 0; guard < 40 && pending.length; guard += 1) {
      const next = [], writes = [];
      for (const [x, y] of pending) {
        const votes = new Map();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
          const a = x + dx, b = y + dy;
          if (!solid(im, a, b) || isTodo.has(b * im.w + a) || !usable(px(im, a, b))) continue;
          const key = hexOf(px(im, a, b));
          votes.set(key, (votes.get(key) ?? 0) + (dx === 0 || dy === 0 ? 2 : 1));
        }
        if (!votes.size) { next.push([x, y]); continue; }
        const best = [...votes].sort((p, q) => q[1] - p[1])[0][0];
        writes.push([x, y, [1, 3, 5].map((i) => parseInt(best.slice(i, i + 2), 16)).concat(255)]);
      }
      for (const [x, y, c] of writes) { put(im, x, y, shade ? shade(x, y, c) : c); isTodo.delete(y * im.w + x); }
      pending = next;
    }
  };
  /** Tira pixels soltos (<= 1 vizinho de 4). */
  const despeckle = (im) => {
    for (let pass = 0; pass < 2; pass += 1) {
      const kill = [];
      for (let y = 0; y < im.h; y += 1) for (let x = 0; x < im.w; x += 1) {
        if (!solid(im, x, y)) continue;
        const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => solid(im, x + dx, y + dy)).length;
        if (n <= 1) kill.push([x, y]);
      }
      kill.forEach(([x, y]) => clear(im, x, y));
    }
  };
  /** Fecha buracos (vazio com >= 3 vizinhos opacos) dentro da caixa, com a cor vizinha mais comum. */
  const closeGaps = (im, [x0, y0, x1, y1], passes = 3) => {
    for (let p = 0; p < passes; p += 1) {
      const add = [];
      for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) {
        if (solid(im, x, y)) continue;
        const ns = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => solid(im, x + dx, y + dy)).map(([dx, dy]) => px(im, x + dx, y + dy));
        if (ns.length >= 3) add.push([x, y, ns.sort((a, b) => lumOf(b) - lumOf(a))[1]]);
      }
      add.forEach(([x, y, c]) => put(im, x, y, c));
    }
  };
  return { closeGaps, solid, clear, erase, erasePoly, inPoly, fillPoly, despeckle, hexOf, lumOf, satOf, px, put, clone, blank };
}

const isSteel = (c) => satOf(c) < 40 && lumOf(c) > 45;

/** Espadachim de frente: sem espada nas costas e sem bainha no quadril. */
export function cleanSwordsmanFront(src, k) {
  const t = makeTools(k);
  const im = t.clone(src);
  const white = (c) => t.hexOf(c) === '#ffffff';
  for (let y = 0; y < im.h; y += 1) for (let x = 0; x < im.w; x += 1) if (t.solid(im, x, y) && white(t.px(im, x, y))) t.clear(im, x, y);
  // punho, cabo e guarda atrás do ombro
  t.erase(im, [0, 0, 7, 24]);
  t.erase(im, [8, 0, 13, 15]);
  t.erase(im, [14, 11, 16, 16], (c) => t.lumOf(c) > 60 && t.satOf(c) < 60);
  t.erase(im, [0, 25, 5, 34]);
  // bainha do quadril (direita da tela)
  t.erase(im, [31, 40, 40, 56]);
  t.erase(im, [30, 43, 31, 56], (c) => t.lumOf(c) > 45);
  t.despeckle(im);
  return im;
}

/**
 * Espadachim de costas: o corpo é a frente limpa espelhada (mesma roupa, sem bainha); a cabeça vem do
 * mapa de back-maps.mjs (cabelo, nuca), deslocada para ficar sobre o corpo; o peito fica de túnica lisa.
 */
export function cleanSwordsmanBack(frontClean, backMap, k) {
  const t = makeTools(k);
  const im = t.blank(38, 57);
  const W1 = 38;
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(255);
  for (let y = 16; y < 57; y += 1) for (let x = 0; x < 38; x += 1) if (t.solid(frontClean, x, y)) t.put(im, W1 - x, y, t.px(frontClean, x, y));
  // peito liso: tudo o que não é contorno nem aço vira túnica
  for (let y = 16; y <= 36; y += 1) for (let x = 12; x <= 24; x += 1) {
    const c = t.px(im, x, y);
    if (!t.solid(im, x, y) || (t.lumOf(c) < 40 && (y < 17 || x < 13 || x > 22)) || (t.satOf(c) < 40 && t.lumOf(c) < 200 && x < 13)) continue;
    if (y >= 28) { if (t.satOf(c) < 40 && t.lumOf(c) > 60) t.put(im, x, y, rgb('#8d3d2d')); continue; }
    t.put(im, x, y, rgb(x <= 13 ? '#ddc8b3' : x >= 23 ? '#caa490' : (x * 7 + y * 3) % 11 === 0 ? '#ddc8b3' : '#f9f5e0'));
  }
  for (let y = 0; y <= 15; y += 1) for (let x = 0; x < 38; x += 1) {
    if (t.solid(backMap, x, y) && x <= 26 && (y <= 12 || (x >= 14 && x <= 21))) t.put(im, x + 3, y, t.px(backMap, x, y));
  }
  // pescoço: cobre o pescoço da frente (nuca com o tom da pele)
  t.despeckle(im);
  return im;
}

const redish = (c) => c[0] - c[1] >= 60 && lumOf(c) > 25;

/** Guerreira de frente: sem a espada (mão esquerda da tela); a capa é refeita onde a lâmina a cobria. */
export function cleanWarriorFront(src, k) {
  const t = makeTools(k);
  const im = t.clone(src);
  const blade = [[10, 33], [19, 33], [19, 43], [15, 47], [8, 53], [0, 55], [0, 49], [3, 45], [6, 41]];
  t.erasePoly(im, blade, (c) => !redish(c));
  t.erase(im, [12, 30, 16, 33], (c) => lumOf(c) > 120);
  const cape = [[14, 32], [12, 36], [11, 40], [10, 44], [10, 48], [12, 50], [15, 49], [19, 49], [19, 33], [16, 32]];
  t.erase(im, [0, 33, 9, 56]);
  t.erase(im, [10, 33, 11, 56], (c) => lumOf(c) > 20 && !redish(c));
  const ramp = ['#a6243b', '#8d1d34', '#6c142a', '#510f24', '#400b1e'].map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(255));
  const left = {};
  for (let y = 0; y < im.h; y += 1) for (let x = 0; x < im.w; x += 1) if (t.inPoly(cape, x, y) && left[y] === undefined) left[y] = x;
  t.fillPoly(im, cape, (x, y) => ramp[Math.min(4, Math.floor((x - left[y]) / 2.2))], redish);
  // contorno novo na borda da capa
  const out = t.clone(im);
  for (let y = 0; y < im.h; y += 1) for (let x = 0; x < 24; x += 1) {
    if (t.solid(im, x, y) || y < 30) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => t.solid(im, x + dx, y + dy) && t.inPoly(cape, x + dx, y + dy))) t.put(out, x, y, [30, 5, 16, 255]);
  }
  t.closeGaps(out, [10, 30, 20, 52], 4);
  t.erase(out, [0, 33, 8, 56]);
  t.despeckle(out);
  return out;
}

/** Guerreira de perfil (olhando para a direita): sem a espada que atravessava capa e pernas. */
export function cleanWarriorSide(src, k) {
  const t = makeTools(k);
  const im = t.clone(src);
  const pale = (c) => lumOf(c) > 85 && !(c[0] - c[2] > 110 && c[1] < 140 && satOf(c) > 100);
  t.erasePoly(im, [[24, 32], [26, 38], [22, 41], [14, 52], [8, 54], [0, 54], [0, 47], [5, 47], [12, 42], [19, 34]], pale);
  t.erase(im, [14, 38, 23, 47], (c) => lumOf(c) > 70 && satOf(c) < 70);
  const cape = [[6, 41], [9, 38], [14, 36], [21, 36], [21, 48], [14, 50], [8, 49], [5, 46]];
  const maroon = (c) => c[0] - c[1] >= 22 && lumOf(c) < 110 && lumOf(c) > 12;
  t.fillPoly(im, cape, null, maroon);
  t.erase(im, [0, 49, 9, 56]);
  t.erase(im, [11, 42, 15, 47], (c) => c[0] - c[2] > 100 || lumOf(c) > 120);
  t.closeGaps(im, [4, 34, 24, 52], 4);
  t.despeckle(im);
  return im;
}

/** Guerreira de costas: tira a ponta da espada que saía pela borda direita da capa. */
export function cleanWarriorBack(src, k) {
  const t = makeTools(k);
  const im = t.clone(src);
  t.erase(im, [36, 44, 42, 57]);
  t.despeckle(im);
  return im;
}
