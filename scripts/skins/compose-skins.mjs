// Monta as folhas das skins a partir das figuras reduzidas por extract-skins.mjs.
// Regras (aprovadas pelo autor):
// - Frente (baixo): o sprite extraído, pixel a pixel, sem retoque de rosto. Só sai o fundo branco preso
//   entre as pernas e a sombra do chão do Espadachim, que são fundo da referência.
// - Lados: a Guerreira usa a figura de lado da referência (o rosto já vem no estilo da frente); o
//   Espadachim usa a frente com a cabeça virada 1 px para o lado (mesmo rosto, mesmo cabelo).
// - Costas: desenhadas pixel a pixel em back-maps.mjs, com a paleta da frente.
// - Cores da capa: só os tons de vinho mudam; rosto, cabelo, pele e botas ficam iguais ao alvo.
// - Andar: cabeça e tronco ficam iguais; só as pernas (e a barra da capa, nas costas) se mexem.

import { SWORDSMAN_BACK, WARRIOR_BACK, SWORDSMAN_PALETTE, WARRIOR_PALETTE } from './back-maps.mjs';

/** Tons de vinho da capa no sprite da frente (os mesmos letras U V Y X S T a R W de WARRIOR_PALETTE). */
const WINE = ['#a6243b', '#8d1d34', '#6c142a', '#510f24', '#400b1e', '#300818', '#250915', '#1e0510', '#0f030a'];

/** Cor de capa nova para cada tom de vinho, mantendo a luz relativa e deslocando a matiz nas sombras. */
const CAPE_RAMPS = {
  blue: ['#3f6fd8', '#2f56b8', '#25428f', '#1d3170', '#19275a', '#141d46', '#111739', '#0f1230', '#090a1a'],
  green: ['#5c9a3e', '#467f33', '#35642c', '#284d27', '#1f3d22', '#18301d', '#132618', '#102015', '#08120b'],
  black: ['#5a5868', '#46444f', '#36343e', '#2a2831', '#222029', '#1b1a21', '#16151b', '#121117', '#09080c']
};

const hexOf = (c) => '#' + c.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');

export function compose(parts, k) {
  const { blank, put, px, clone, flipX, blit, parse, dbg, FW, FH, FEET } = k;
  const each = (im, fn) => { for (let y = 0; y < im.h; y += 1) for (let x = 0; x < im.w; x += 1) fn(x, y, px(im, x, y)); };

  /** Mapa de caracteres -> imagem. */
  function fromMap(rows, palette) {
    const im = blank(rows[0].length, rows.length);
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') return;
      if (!palette[ch]) throw new Error(`cor '${ch}' fora da paleta`);
      put(im, x, y, parse(palette[ch]));
    }));
    return im;
  }

  /**
   * Quadros de andar. 1 = parado (o sprite exato); 0 e 2 = uma perna sobe 2 px e o corpo sobe 1 px
   * (a perna de apoio estica 1 px para não abrir buraco); 3 = apoio, corpo desce 1 px.
   * `legs`: faixa das pernas { hip, x0, x1, mid }. `sway`: linha a partir da qual a capa balança 1 px.
   */
  function walk(sprite, { hip, x0, x1, mid, sway = null }) {
    let foot = 0;
    each(sprite, (x, y, c) => { if (c[3] > 127) foot = y; });
    const ox = Math.max(0, Math.min(FW - sprite.w, Math.round(FW / 2 - (x0 + x1 + 1) / 2)));
    const oy = FEET - foot;
    const isLeg = (x, y) => y >= hip && x >= x0 && x <= x1;
    const frames = [];
    for (let f = 0; f < 4; f += 1) {
      const frame = blank(FW, FH);
      const bob = f === 0 || f === 2 ? -1 : f === 3 ? 1 : 0;
      const lifted = f === 0 ? 'L' : f === 2 ? 'R' : null;
      const swing = sway == null ? 0 : f === 0 ? -1 : f === 2 ? 1 : 0;
      // pernas primeiro (o corpo cobre o topo da perna levantada)
      each(sprite, (x, y, c) => {
        if (c[3] < 128 || !isLeg(x, y)) return;
        const side = x < mid ? 'L' : 'R';
        const up = side === lifted ? 2 : 0;
        put(frame, ox + x, oy + y - up, c);
        if (y === hip && !up && bob < 0) put(frame, ox + x, oy + y - 1, c);
      });
      each(sprite, (x, y, c) => {
        if (c[3] < 128 || isLeg(x, y)) return;
        const dx = sway != null && y >= sway ? swing : 0;
        put(frame, ox + x + dx, oy + y + bob, c);
      });
      frames.push(frame);
    }
    return frames;
  }

  /** Junta 4 direções (baixo, esquerda, direita, cima) x 4 quadros numa folha. */
  function sheetOf(rows) {
    const sheet = blank(FW * 4, FH * 4);
    rows.forEach((frames, r) => frames.forEach((frame, f) => blit(sheet, frame, f * FW, r * FH)));
    return sheet;
  }

  const sheets = {};

  // ================= Espadachim =================
  const swFront = clone(parts.swordsman.front);
  // Fundo branco puro preso entre as pernas e a sombra cinza do chão (as 2 últimas linhas).
  const shadow = new Set(['#6b6c83', '#ffffff']);
  each(swFront, (x, y, c) => {
    if (c[3] < 128) return;
    if (hexOf(c) === '#ffffff' || (y >= swFront.h - 2 && shadow.has(hexOf(c)))) put(swFront, x, y, [0, 0, 0, 0]);
  });
  // Lado: a cabeça (linhas 0-13, da coluna 14 em diante) anda 1 px para a direita; a coluna 13 se repete.
  const swSide = clone(swFront);
  each(swFront, (x, y, c) => { if (y <= 13 && x >= 14) put(swSide, x, y, px(swFront, x - 1, y)); });
  const swBack = fromMap(SWORDSMAN_BACK, SWORDSMAN_PALETTE);
  const swLegs = { hip: 46, x0: 11, x1: 30, mid: 20 };
  const swLegsBack = { hip: 46, x0: 7, x1: 26, mid: 17 };
  sheets.swordsman = sheetOf([
    walk(swFront, swLegs),
    walk(flipX(swSide), { ...swLegs, x0: swSide.w - 1 - swLegs.x1, x1: swSide.w - 1 - swLegs.x0, mid: swSide.w - swLegs.mid }),
    walk(swSide, swLegs),
    walk(swBack, swLegsBack)
  ]);
  dbg('c-sw-front', swFront);
  dbg('c-sw-side', swSide);
  dbg('c-sw-back', swBack);

  // ================= Guerreira =================
  const W = parts.warrior;
  const wFront = W.down.original;
  const wSide = W.side;
  const wBack = fromMap(WARRIOR_BACK, WARRIOR_PALETTE);
  const wLegs = { hip: 42, x0: 17, x1: 42, mid: 31 };
  const sLegs = { hip: 44, x0: 12, x1: 47, mid: 29 };
  const bLegs = { hip: 47, x0: 2, x1: 23, mid: 13, sway: 36 };
  /** Troca os tons de vinho pela rampa da cor nova (só na capa: abaixo do rosto e acima das botas). */
  const recolor = (im, ramp, { top, bottom }) => {
    if (!ramp) return im;
    const out = clone(im);
    each(im, (x, y, c) => {
      if (c[3] < 128 || y > bottom) return;
      const i = WINE.indexOf(hexOf(c));
      // Acima do pescoço só os tons claros (gola da capa); os escuros ali são sombra do rosto e do cabelo.
      if (i >= 0 && (y >= top || i <= 3)) put(out, x, y, parse(ramp[i]));
    });
    return out;
  };
  const capes = { warrior: null, 'warrior-blue': 'blue', 'warrior-green': 'green', 'warrior-black': 'black' };
  for (const [id, color] of Object.entries(capes)) {
    const ramp = color && CAPE_RAMPS[color];
    const front = recolor(wFront, ramp, { top: 16, bottom: 50 });
    const side = recolor(wSide, ramp, { top: 17, bottom: 50 });
    const back = recolor(wBack, ramp, { top: 0, bottom: wBack.h });
    sheets[id] = sheetOf([
      walk(front, wLegs),
      walk(flipX(side), { ...sLegs, x0: side.w - 1 - sLegs.x1, x1: side.w - 1 - sLegs.x0, mid: side.w - sLegs.mid }),
      walk(side, sLegs),
      walk(back, bLegs)
    ]);
    dbg(`c-${id}-down`, front);
  }
  return sheets;
}
