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
import { cleanSwordsmanFront, cleanSwordsmanBack, cleanWarriorFront, cleanWarriorSide, cleanWarriorBack } from './clean.mjs';
import { buildPoses, drawLimb } from './poses.mjs';
import { SKIN_CFG } from './skin-cfg.mjs';

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

  /** Posição do sprite no quadro (mesma conta do andar). */
  function placement(sprite, { x0, x1 }) {
    let foot = 0;
    each(sprite, (x, y, c) => { if (c[3] > 127) foot = y; });
    return { ox: Math.max(0, Math.min(FW - sprite.w, Math.round(FW / 2 - (x0 + x1 + 1) / 2))), oy: FEET - foot };
  }
  const mirrorFrame = (f) => { const o = blank(f.w, f.h); each(f, (x, y, c) => { if (c[3] > 127) put(o, f.w - 1 - x, y, c); }); return o; };

  /** Junta 4 direções (baixo, esquerda, direita, cima) x 12 quadros numa folha. */
  function sheetOf(rows) {
    const sheet = blank(FW * 12, FH * 4);
    rows.forEach((frames, r) => frames.forEach((frame, f) => blit(sheet, frame, f * FW, r * FH)));
    return sheet;
  }


  const rigs = {};
  const rgb = (h) => parse(h);
  /** Uma direção: andar (0-3) + poses (4-11); devolve quadros e pontos da mão (em coordenadas do quadro). */
  function dirSet(base, armless, legs, cfg) {
    const { ox, oy } = placement(base, legs);
    const walkFrames = walk(base, legs);
    const frames = [...walkFrames];
    const style = { ...cfg.style, up: cfg.style.up.map(rgb), fore: cfg.style.fore.map(rgb), hand: cfg.style.hand.map(rgb), line: rgb(cfg.style.line) };
    const full = { ...cfg, style, hip: legs.hip, mid: legs.mid };
    const { frames: poses, hands } = buildPoses({ base, armless, cfg: full, ox, oy, k: { blank, put, px, clone }, FW, FH });
    for (let c = 4; c <= 11; c += 1) frames.push(poses[c]);
    const bob = [-1, 0, -1, 1];
    const hp = [0, 1, 2, 3].map((f) => [ox + cfg.hang[0], oy + cfg.hang[1] + bob[f]]).concat([4, 5, 6, 7, 8, 9, 10, 11].map((c) => hands[c]));
    const grip = [ox + cfg.J[0] - cfg.outward * 2, oy + cfg.neckY];
    return { frames, hands: hp, grip };
  }
  const flipSet = (set) => ({ frames: set.frames.map(mirrorFrame), hands: set.hands.map(([x, y]) => [FW - 1 - x, y]), grip: [FW - 1 - set.grip[0], set.grip[1]] });
  const rigOf = (id, sets) => {
    const out = {};
    for (const [dir, set] of Object.entries(sets)) {
      out[dir] = { hands: Object.fromEntries(set.hands.map((h, i) => [i, h])), back: { grip: set.grip } };
    }
    rigs[id] = out;
  };
  const sheets = {};
  const finish = (id, down, right, up) => {
    const left = flipSet(right);
    sheets[id] = sheetOf([down.frames, left.frames, right.frames, up.frames]);
    return { down, left, right, up };
  };

  // ================= Espadachim =================
  {
    const C = SKIN_CFG.swordsman;
    const raw = clone(parts.swordsman.front);
    const shadow = new Set(['#6b6c83', '#ffffff']);
    each(raw, (x, y, c) => { if (c[3] >= 128 && y >= raw.h - 2 && shadow.has(hexOf(c))) put(raw, x, y, [0, 0, 0, 0]); });
    const front = cleanSwordsmanFront(raw, { blank, put, px, clone });
    const side = clone(front);
    each(front, (x, y, c) => { if (y <= 13 && x >= 14) put(side, x, y, px(front, x - 1, y)); });
    const back = cleanSwordsmanBack(front, fromMap(SWORDSMAN_BACK, SWORDSMAN_PALETTE), { blank, put, px, clone });
    const mk = (img, cfg) => {
      const armless = clone(img);
      const [x0, y0, x1, y1] = cfg.mask;
      for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) put(armless, x, y, [0, 0, 0, 0]);
      return armless;
    };
    const down = dirSet(front, mk(front, C.down), C.legs.down, C.down);
    const right = dirSet(side, mk(side, C.right), C.legs.down, C.right);
    const up = dirSet(back, mk(back, C.up), C.legs.up, C.up);
    rigOf('player-swordsman', finish('swordsman', down, right, up));
    dbg('c-sw-front', front); dbg('c-sw-back', back);
  }

  // ================= Guerreira =================
  {
    const C = SKIN_CFG.warrior;
    const tools = { blank, put, px, clone };
    const wFront = cleanWarriorFront(parts.warrior.down.original, tools);
    const wSide = cleanWarriorSide(parts.warrior.side, tools);
    const wBack = cleanWarriorBack(fromMap(WARRIOR_BACK, WARRIOR_PALETTE), tools);
    /** Troca os tons de vinho pela rampa da cor nova (só na capa: abaixo do rosto e acima das botas). */
    const recolor = (im, ramp, { top, bottom }) => {
      if (!ramp) return im;
      const out = clone(im);
      each(im, (x, y, c) => {
        if (c[3] < 128 || y > bottom) return;
        const i = WINE.indexOf(hexOf(c));
        if (i >= 0 && (y >= top || i <= 3)) put(out, x, y, parse(ramp[i]));
      });
      return out;
    };
    const capes = { warrior: null, 'warrior-blue': 'blue', 'warrior-green': 'green', 'warrior-black': 'black' };
    const styleFor = (cfg) => cfg;
    for (const [id, color] of Object.entries(capes)) {
      const ramp = color && CAPE_RAMPS[color];
      const f = recolor(wFront, ramp, { top: 16, bottom: 50 });
      const s = recolor(wSide, ramp, { top: 17, bottom: 50 });
      const b = recolor(wBack, ramp, { top: 0, bottom: wBack.h });
      const withHang = (armless, legs, cfg) => {
        const base = clone(armless);
        if (cfg.drawHang) {
          const st = { ...cfg.style, up: cfg.style.up.map(rgb), fore: cfg.style.fore.map(rgb), hand: cfg.style.hand.map(rgb), line: rgb(cfg.style.line) };
          drawLimb(base, { put, px }, [cfg.J[0] + 0.5, cfg.J[1] + 0.5], [cfg.hang[0] + 0.5, cfg.hang[1] + 0.5], st, cfg.outward);
        }
        return base;
      };
      const down = dirSet(withHang(f, C.legs.down, C.down), f, C.legs.down, C.down);
      const right = dirSet(withHang(s, C.legs.right, C.right), s, C.legs.right, C.right);
      const up = dirSet(withHang(b, C.legs.up, C.up), b, C.legs.up, C.up);
      const sets = finish(id, down, right, up);
      if (id === 'warrior') rigOf('player-warrior', sets);
      dbg("c-" + id + "-down", f);
    }
  }
  return { sheets, rigs };
}
