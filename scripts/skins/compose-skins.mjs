// Monta as folhas das skins a partir das figuras reduzidas por extract-skins.mjs.
// Regras (aprovadas pelo autor):
// - Frente (baixo): o sprite extraído, pixel a pixel, sem retoque de rosto. Só sai o fundo branco preso
//   entre as pernas e a sombra do chão do Espadachim, que são fundo da referência.
// - Lados: a Guerreira usa a figura de lado da referência (o rosto já vem no estilo da frente); o
//   Espadachim tem um perfil próprio desenhado pixel a pixel (back-maps.mjs, SWORDSMAN_SIDE).
// - Esquerda: não é só o espelho. A luz continua vindo do alto à esquerda (relightLeft): a borda da
//   silhueta virada para a esquerda (rosto, peito, frente das pernas) ganha o tom de luz da própria rampa
//   e a borda das costas, que no espelho ficaria iluminada, desce para a sombra.
// - Costas: desenhadas pixel a pixel em back-maps.mjs, com a paleta da frente.
// - Cores da capa: só os tons de vinho mudam; rosto, cabelo, pele e botas ficam iguais ao alvo.
// - Andar: cabeça e tronco ficam iguais; só as pernas (e a barra da capa, nas costas) se mexem.

import { SWORDSMAN_BACK, SWORDSMAN_SIDE, WARRIOR_BACK, SWORDSMAN_PALETTE, WARRIOR_PALETTE } from './back-maps.mjs';
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

/**
 * Guerreira no jogo (rodada 2 da auditoria): no chão verde o corset e a pele ficavam lamacentos.
 * Sobem um degrau de valor (só do pescoço para baixo: o rosto aprovado não muda).
 */
const WARRIOR_LIFT = {
  // Rodada 3: o corset vira a área clara contínua do peito/saiote (luminância >= 200).
  '#f0dac6': '#fbf0e2', '#cba290': '#f4e4d2', '#94726d': '#d9bfae', // corset e saiote
  '#e0845c': '#f0a476', '#d2704e': '#e2885e', '#a95542': '#c46a4c', '#844036': '#a0533e' // pele
};
const CORSET_FRONT = { '#d9bfae': '#ecdccb', '#b99a8c': '#e8d4c2', '#e8cdb6': '#f4e4d2' };
/** Cor para onde a luz de borda puxa (âmbar claro, como a luz da paleta). */
const RIM_TO = [255, 246, 216];

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


  /**
   * Acabamento das figuras extraídas: degrau de valor (lift, de neckY até maxY), limpeza de pixels soltos
   * (isolado no vazio sai; cercado por uma cor só vira ela) e 1 px de luz de borda clara no alto e na
   * esquerda da silhueta (luz do alto à esquerda). A cabeça (acima de neckY) fica intacta.
   */
  /**
   * Passe extra de limpeza (rodada 2): pixel cercado nos 4 lados por uma mesma cor (ou por duas cores que
   * se repetem) vira essa cor, com tolerância de valor maior. Deixa a Guerreira tão limpa quanto o
   * Cavaleiro e a Heroína (pixels isolados por mil opacos de ~161 para perto de 100). Rosto fica intacto.
   */
  function smoothBelow(im, neckY, tolerance = 80) {
    const out = clone(im);
    const solid = (x, y) => x >= 0 && y >= 0 && x < im.w && y < im.h && px(im, x, y)[3] > 127;
    const L = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
    const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
    each(im, (x, y, c) => {
      if (c[3] < 128 || y < neckY) return;
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (solid(x + dx, y + dy) ? px(im, x + dx, y + dy) : null));
      if (n.some((v) => !v) || n.some((v) => same(v, c))) return;
      const count = new Map();
      for (const v of n) count.set(hexOf(v), (count.get(hexOf(v)) ?? 0) + 1);
      const [top, times] = [...count].sort((a, b) => b[1] - a[1])[0];
      if (times >= 2 && Math.abs(L(parse(top)) - L(c)) < tolerance) put(out, x, y, parse(top));
    });
    return out;
  }

  const CAPE_KEEP = new Set([...WINE, ...Object.values(CAPE_RAMPS).flat()]);
  function polish(im, { neckY, maxY = im.h, lift = null, gain = 0, rim = 0.32, liftBox = null }) {
    const out = clone(im);
    const solid = (x, y) => x >= 0 && y >= 0 && x < im.w && y < im.h && px(im, x, y)[3] > 127;
    const L = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
    const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
    each(im, (x, y, c) => {
      if (c[3] < 128 || y < neckY) return;
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (solid(x + dx, y + dy) ? px(im, x + dx, y + dy) : null));
      if (n.every((v) => !v)) { put(out, x, y, [0, 0, 0, 0]); return; }
      let c2 = c;
      // Pixel solto: os 4 vizinhos são de outra cor. Vira a cor mais comum deles (se ela repete e tem
      // valor parecido), o que tira o "chuvisco" da redução sem apagar detalhe de contorno.
      if (n.every((v) => v && !same(v, c))) {
        const count = new Map();
        for (const v of n) count.set(hexOf(v), (count.get(hexOf(v)) ?? 0) + 1);
        const [top, times] = [...count].sort((a, b) => b[1] - a[1])[0];
        if (times >= 2 && Math.abs(L(parse(top)) - L(c)) < 45) c2 = parse(top);
      }
      const inBox = !liftBox || (x >= liftBox[0] && y >= liftBox[1] && x <= liftBox[2] && y <= liftBox[3]);
      if (CAPE_KEEP.has(hexOf(c2))) { put(out, x, y, c2); return; }
      if (lift && y <= maxY && inBox && lift[hexOf(c2)]) c2 = parse(lift[hexOf(c2)]);
      else if (gain && y <= maxY && L(c2) >= 28) c2 = c2.slice(0, 3).map((v, i) => Math.round(v + (RIM_TO[i] - v) * gain)).concat(255);
      put(out, x, y, c2);
    });
    if (rim > 0) {
      const base = clone(out);
      each(base, (x, y, c) => {
        if (c[3] < 128 || y < neckY || L(c) < 28) return;
        const edgeOf = (dx, dy) => !solid(x + dx, y + dy) || (L(px(im, x + dx, y + dy)) < 28 && !solid(x + 2 * dx, y + 2 * dy));
        if (CAPE_KEEP.has(hexOf(c))) return;
        if (edgeOf(-1, 0) || edgeOf(0, -1)) put(out, x, y, c.slice(0, 3).map((v, i) => Math.round(v + (RIM_TO[i] - v) * rim)).concat(255));
      });
    }
    // As cores novas (ganho e luz de borda) voltam para as cores que a folha já tem (as do sprite e as do
    // degrau): a mais próxima que não fique mais escura. Assim a folha segue com no máximo 64 cores.
    const known = new Map();
    each(im, (x, y, c) => { if (c[3] > 127) known.set(hexOf(c), c); });
    if (lift) for (const h of Object.values(lift)) known.set(h, parse(h));
    const pool = [...known.values()];
    const memo = new Map();
    each(out, (x, y, c) => {
      if (c[3] < 128 || known.has(hexOf(c))) return;
      const key = hexOf(c);
      if (!memo.has(key)) {
        const l = L(c);
        const dist = (d) => (d[0] - c[0]) ** 2 + (d[1] - c[1]) ** 2 + (d[2] - c[2]) ** 2;
        const brighter = pool.filter((d) => L(d) >= l - 4);
        memo.set(key, (brighter.length ? brighter : pool).reduce((a, b) => (dist(b) < dist(a) ? b : a)));
      }
      put(out, x, y, memo.get(key));
    });
    return out;
  }

  /**
   * Cachos (rodada 3): o cabelo era um bloco escuro. Em uma grade de ~5 px, onde o cabelo é contínuo e
   * longe da pele (o rosto aprovado não muda), desenha um cacho: arco de 3 px com luz âmbar no topo e
   * 1 px de sombra embaixo. Só cores que a folha já tem.
   */
  const HAIR = new Set(['#684443', '#1e131c', '#281922', '#352027', '#150d16', '#4d3032', '#472023', '#33151b', '#0b0710', '#06030a']);
  const SKIN = new Set(['#d2704e', '#a95542', '#e2885e', '#f0a476', '#c46a4c', '#844036', '#a0533e', '#e0845c']);
  function curls(im, { top = 0, bottom, step = 5, seed = 0, extra = [], minHair = 8, avoid = null }) {
    const hairSet = new Set([...HAIR, ...extra]);
    const out = clone(im);
    const at = (x, y) => (x >= 0 && y >= 0 && x < im.w && y < im.h ? px(im, x, y) : [0, 0, 0, 0]);
    const hair = (x, y) => { const c = at(x, y); return c[3] > 127 && hairSet.has(hexOf(c)); };
    const nearSkin = (x, y) => { for (let j = -2; j <= 2; j += 1) for (let i = -2; i <= 2; i += 1) { const c = at(x + i, y + j); if (c[3] > 127 && SKIN.has(hexOf(c))) return true; } return false; };
    const lit = parse('#c46a4c'); const mid = parse('#844036'); const dark = parse('#06030a');
    for (let gy = top + 2; gy <= bottom - 2; gy += step) {
      for (let gx = 2; gx < im.w - 2; gx += step) {
        const x = gx + ((gy * 7 + gx * 3 + seed) % 3) - 1; const y = gy + ((gx * 5 + seed) % 2);
        if ([[0, 0], [-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1], [0, 1], [-1, 1], [1, 1]].filter(([i, j]) => hair(x + i, y + j)).length < minHair) continue;
        if (!hair(x, y) || !hair(x, y - 1) || nearSkin(x, y)) continue;
        if (avoid && x >= avoid[0] - 2 && x <= avoid[2] + 2 && y >= avoid[1] - 2 && y <= avoid[3] + 2) continue;
        put(out, x - 1, y, mid); put(out, x, y - 1, lit); put(out, x + 1, y - 1, mid); put(out, x + 1, y, mid);
        put(out, x, y + 1, dark);
      }
    }
    return out;
  }

  const rigs = {};
  const rgb = (h) => parse(h);
  /** Uma direção: andar (0-3) + poses (4-11); devolve quadros e pontos da mão (em coordenadas do quadro). */
  function dirSet(base, armless, legs, cfg) {
    const { ox, oy } = placement(base, legs);
    const walkFrames = walk(base, legs);
    const frames = [...walkFrames];
    const style = { ...cfg.style, up: cfg.style.up.map(rgb), fore: cfg.style.fore.map(rgb), hand: cfg.style.hand.map(rgb), line: rgb(cfg.style.line) };
    const full = { ...cfg, style, hip: legs.hip, mid: legs.mid, isTrail: (c) => CAPE_KEEP.has(hexOf(c)) || HAIR.has(hexOf(c)) };
    const { frames: poses, hands } = buildPoses({ base, armless, cfg: full, ox, oy, k: { blank, put, px, clone }, FW, FH });
    for (let c = 4; c <= 11; c += 1) frames.push(poses[c]);
    const bob = [-1, 0, -1, 1];
    const hp = [0, 1, 2, 3].map((f) => [ox + cfg.hang[0], oy + cfg.hang[1] + bob[f]]).concat([4, 5, 6, 7, 8, 9, 10, 11].map((c) => hands[c]));
    // backGrip (coordenadas do sprite): cabo da arma nas costas onde ele aparece (ex.: acima do ombro, fora do cabelo).
    const grip = cfg.backGrip ? [ox + cfg.backGrip[0], oy + cfg.backGrip[1]] : [ox + cfg.J[0] - cfg.outward * 2, oy + cfg.neckY];
    return { frames, hands: hp, grip, backAngle: cfg.backAngle };
  }
  /** Relê a luz do espelho: luz do alto à esquerda (rampas tiradas das cores do próprio quadro). */
  function relightLeft(frame) {
    const out = clone(frame);
    const L = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
    const chrom = (c) => { const t = c[0] + c[1] + c[2] + 1; return [c[0] / t, c[1] / t, c[2] / t]; };
    const list = [];
    const seen = new Set();
    each(frame, (x, y, c) => { const h = hexOf(c); if (c[3] > 127 && !seen.has(h)) { seen.add(h); list.push(c); } });
    const memo = new Map();
    const step = (c, dir) => {
      const key = hexOf(c) + dir;
      if (memo.has(key)) return memo.get(key);
      const l = L(c); const ch = chrom(c);
      let best = c; let bl = dir > 0 ? Infinity : -Infinity;
      for (const d of list) {
        const ld = L(d);
        if (dir > 0 ? (ld <= l + 8 || ld > l + 80) : (ld >= l - 8 || ld < l - 80)) continue;
        const cd = chrom(d);
        if (Math.hypot(cd[0] - ch[0], cd[1] - ch[1], cd[2] - ch[2]) > 0.07) continue;
        if (dir > 0 ? ld < bl : ld > bl) { bl = ld; best = d; }
      }
      memo.set(key, best);
      return best;
    };
    const solid = (x, y) => x >= 0 && y >= 0 && x < frame.w && y < frame.h && px(frame, x, y)[3] > 127;
    const dark = (c) => L(c) < 30;
    // Borda de verdade: vizinho vazio, ou contorno escuro com o vazio logo depois.
    const edge = (x, y, dx) => !solid(x + dx, y) || (dark(px(frame, x + dx, y)) && !solid(x + 2 * dx, y));
    each(frame, (x, y, c) => {
      if (c[3] < 128 || dark(c)) return;
      const le = edge(x, y, -1); const re = edge(x, y, 1);
      if (le && !re) put(out, x, y, step(c, 1));
      else if (re && !le) put(out, x, y, step(c, -1));
    });
    return out;
  }
  const flipSet = (set) => ({ frames: set.frames.map((f) => relightLeft(mirrorFrame(f))), hands: set.hands.map(([x, y]) => [FW - 1 - x, y]), grip: [FW - 1 - set.grip[0], set.grip[1]] });
  const rigOf = (id, sets) => {
    const out = {};
    for (const [dir, set] of Object.entries(sets)) {
      out[dir] = { hands: Object.fromEntries(set.hands.map((h, i) => [i, h])), back: set.backAngle != null ? { grip: set.grip, angle: set.backAngle } : { grip: set.grip } };
    }
    rigs[id] = out;
  };
  const sheets = {};
  /** Fecha furos de 1-2 px dentro da silhueta (a capa de lado tinha pontos do chão aparecendo). */
  const fillHoles = (f) => {
    const out = clone(f);
    for (let pass = 0; pass < 2; pass += 1) {
      const src = clone(out);
      each(src, (x, y, c) => {
        if (c[3] > 127) return;
        const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (x + dx >= 0 && y + dy >= 0 && x + dx < f.w && y + dy < f.h ? px(src, x + dx, y + dy) : [0, 0, 0, 0])).filter((v) => v[3] > 127);
        if (n.length < 3) return;
        const dark = n.reduce((a, b) => (a[0] + a[1] + a[2] <= b[0] + b[1] + b[2] ? a : b));
        put(out, x, y, n.length === 4 ? n[1] : dark);
      });
    }
    return out;
  };
  const finish = (id, down, right, up) => {
    if (id.startsWith('warrior')) for (const set of [down, right, up]) set.frames = set.frames.map(fillHoles);
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
    // Perfil próprio; sem o braço, o tronco/cinto atrás dele é continuado com a cor da linha logo à frente.
    const side = fromMap(SWORDSMAN_SIDE, SWORDSMAN_PALETTE);
    const sideArmless = clone(side);
    for (let y = C.right.armRows[0]; y <= C.right.armRows[1]; y += 1) {
      for (let x = C.right.armCols[0]; x <= C.right.armCols[1]; x += 1) put(sideArmless, x, y, px(side, C.right.armCols[1] + 2, y));
    }
    const back = cleanSwordsmanBack(front, fromMap(SWORDSMAN_BACK, SWORDSMAN_PALETTE), { blank, put, px, clone });
    const mk = (img, cfg) => {
      const armless = clone(img);
      const [x0, y0, x1, y1] = cfg.mask;
      for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) put(armless, x, y, [0, 0, 0, 0]);
      return armless;
    };
    // Mesmo acabamento da Guerreira (limpeza + luz de borda), sem mudar o valor das cores.
    const pf = polish(front, { neckY: C.down.neckY, rim: 0.22 });
    const ps = polish(side, { neckY: C.right.neckY, rim: 0.22 });
    const psa = polish(sideArmless, { neckY: C.right.neckY, rim: 0.22 });
    const pb = polish(back, { neckY: 0, rim: 0.22 });
    const down = dirSet(pf, mk(pf, C.down), C.legs.down, C.down);
    const right = dirSet(ps, psa, C.legs.right, C.right);
    const up = dirSet(pb, mk(pb, C.up), C.legs.up, C.up);
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
      const f = curls(polish(smoothBelow(recolor(wFront, ramp, { top: 16, bottom: 50 }), C.down.neckY + 1), { neckY: C.down.neckY + 1, maxY: C.legs.down.hip + 7, lift: WARRIOR_LIFT, gain: 0.17 }), { bottom: 34, seed: 1, avoid: [25, 3, 40, 18] });
      // Peito e saiote da frente: os 3 tons do corset viram claros (área clara contínua).
      each(f, (x, y, c) => { if (x >= 21 && x <= 37 && y >= 20 && y <= 46 && CORSET_FRONT[hexOf(c)]) put(f, x, y, parse(CORSET_FRONT[hexOf(c)])); });
      const s = curls(polish(smoothBelow(recolor(wSide, ramp, { top: 17, bottom: 50 }), C.right.neckY + 1), { neckY: C.right.neckY + 1, maxY: C.legs.right.hip + 6, lift: WARRIOR_LIFT, gain: 0.17 }), { bottom: 34, seed: 2 });
      const b = curls(polish(smoothBelow(recolor(wBack, ramp, { top: 0, bottom: wBack.h }), C.up.neckY), { neckY: C.up.neckY, maxY: C.legs.up.hip + 4, lift: WARRIOR_LIFT, gain: 0.17 }), { bottom: 32, step: 4, seed: 3, minHair: 6, extra: ['#94726d', '#d9bfae', '#b99a8c'] });
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
