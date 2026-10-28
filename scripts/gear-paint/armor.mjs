// G-armas: elmo, peitoral, calças, botas, escudo, anel e amuleto dos 18 conjuntos, pintados em 4x
// (32 x 32 unidades, de frente, luz do alto à esquerda). Cada conjunto tem material, enfeite e o
// glifo próprio (o mesmo dos ícones antigos), que aparece em todas as peças.
import { R, path, ellipse, fill, lin, vol, line, clip, gem, GLYPHS } from './kit.mjs';

const top = (r) => r[r.length - 1];
const mid = (r) => r[Math.floor(r.length / 2)];

/** main: metal/couro do corpo; trim: frisos; cloth: tecido; gem; glyph: [claro, escuro]; helm: forma do elmo. */
export const SETS = {
  couro: { main: R.leather, trim: R.bronze, cloth: R.leather, gem: null, glyph: ['#e69c69', '#391f21'], helm: 'hood', body: 'leather', legs: 'cloth', boots: 'leather', shield: 'buckler' },
  bosque: { main: R.wood, trim: R.leaf, cloth: R.green, gem: R.leaf, glyph: ['#99e65f', '#134c4c'], helm: 'bark', body: 'bark', legs: 'cloth', boots: 'leather', shield: 'round' },
  ferro: { main: R.iron, trim: R.iron, cloth: R.leather, gem: null, glyph: ['#c7cfdd', '#1a1932'], helm: 'great', body: 'plate', legs: 'plate', boots: 'plate', shield: 'heater' },
  malha: { main: R.steel, trim: R.steel, cloth: R.blue, gem: null, glyph: ['#ffffff', '#2a2f4e'], helm: 'coif', body: 'chain', legs: 'chain', boots: 'plate', shield: 'heater' },
  brejo: { main: R.bog, trim: R.paleWood, cloth: R.bog, gem: R.green, glyph: ['#99e65f', '#1c121c'], helm: 'hood', body: 'robe', legs: 'cloth', boots: 'leather', shield: 'round' },
  prata: { main: R.silver, trim: R.silver, cloth: R.blue, gem: R.mithril, glyph: ['#ffffff', '#424c6e'], helm: 'winged', body: 'plate', legs: 'plate', boots: 'plate', shield: 'heater' },
  corsario: { main: R.red, trim: R.gold, cloth: R.red, gem: null, glyph: ['#f9e6cf', '#1c121c'], helm: 'tricorn', body: 'coat', legs: 'cloth', boots: 'leather', shield: 'turtle' },
  coral: { main: R.teal, trim: R.coral, cloth: R.teal, gem: R.shell, glyph: ['#f68187', '#0c2e44'], helm: 'spiked', body: 'plate', legs: 'plate', boots: 'plate', shield: 'shell' },
  glacial: { main: R.ice, trim: R.white, cloth: R.blue, gem: R.ice, glyph: ['#ffffff', '#00396d'], helm: 'icy', body: 'plate', legs: 'plate', boots: 'plate', shield: 'crystal' },
  runico: { main: R.indigo, trim: R.silver, cloth: R.indigo, gem: R.rune, glyph: ['#94fdff', '#0e071b'], helm: 'horned', body: 'plate', legs: 'plate', boots: 'plate', shield: 'heater', glow: '#00cdf9' },
  mithril: { main: R.mithril, trim: R.silver, cloth: R.blue, gem: R.blue, glyph: ['#ffffff', '#0069aa'], helm: 'elven', body: 'plate', legs: 'plate', boots: 'plate', shield: 'heater' },
  faraonico: { main: R.gold, trim: R.lapis, cloth: R.linen, gem: R.lapis, glyph: ['#ffeb57', '#00396d'], helm: 'nemes', body: 'tunic', legs: 'kilt', boots: 'sandal', shield: 'sun' },
  adamante: { main: R.gunmetal, trim: R.violet, cloth: R.void, gem: R.violet, glyph: ['#ca52c9', '#0e071b'], helm: 'crystal', body: 'plate', legs: 'plate', boots: 'plate', shield: 'kite', glow: '#ca52c9' },
  vulcanico: { main: R.obsidian, trim: R.lava, cloth: R.red, gem: R.lava, glyph: ['#ffa214', '#0e071b'], helm: 'volcano', body: 'plate', legs: 'plate', boots: 'plate', shield: 'aegis', glow: '#ff5000' },
  demoniaco: { main: R.demon, trim: R.obsidian, cloth: R.demon, gem: R.lava, glyph: ['#ea323c', '#1c121c'], helm: 'demon', body: 'plate', legs: 'plate', boots: 'plate', shield: 'kite', glow: '#ea323c' },
  celestial: { main: R.white, trim: R.gold, cloth: R.white, gem: R.gold, glyph: ['#ffeb57', '#8a4836'], helm: 'halo', body: 'plate', legs: 'plate', boots: 'plate', shield: 'heater', glow: '#ffeb57' },
  abissal: { main: R.void, trim: R.abyss, cloth: R.void, gem: R.violet, glyph: ['#ca52c9', '#0e071b'], helm: 'abyss', body: 'plate', legs: 'plate', boots: 'plate', shield: 'kite', glow: '#ca52c9' },
  titanico: { main: R.bronze, trim: R.gold, cloth: R.red, gem: R.lava, glyph: ['#ffeb57', '#5d2c28'], helm: 'crown', body: 'plate', legs: 'plate', boots: 'plate', shield: 'heater', glow: '#ffc825' }
};

const glyph = (ctx, set, x, y, r, s = SETS[set]) => GLYPHS[set]?.(ctx, x, y, r, s.glyph[0], s.glyph[1]);

/** Medalhão do glifo (disco do friso com o glifo em cima). */
function medallion(ctx, set, x, y, r, s = SETS[set]) {
  vol(ctx, ellipse(ctx, x, y, r, r), s.trim, [x - r, y - r, 2 * r, 2 * r], { ao: 0.3 });
  fill(ctx, ellipse(ctx, x + 0.2, y + 0.2, r * 0.74, r * 0.74), s.glyph[1]);
  glyph(ctx, set, x, y, r * 0.6, s);
}

const rivets = (ctx, pts, ramp) => pts.forEach(([x, y]) => { fill(ctx, ellipse(ctx, x, y, 0.7, 0.7), top(ramp)); });

// ---------- Elmo ----------
function helmet(ctx, set) {
  const s = SETS[set];
  const m = s.main; const t = s.trim;
  const dome = (h = 0) => {
    const p = path(ctx, [[6, 22], [6.2, 14], [8.5, 8.6 - h], [12.4, 6 - h], [16, 5.4 - h], [19.6, 6 - h], [23.5, 8.6 - h], [25.8, 14], [26, 22], [23, 26.5], [16, 27.4], [9, 26.5]]);
    vol(ctx, p, m, [6, 5 - h, 20, 22.4], { lx: 0.3, ly: 0.2 });
    return p;
  };
  const visor = (y = 16) => {
    fill(ctx, path(ctx, [[9.4, y], [22.6, y], [22.2, y + 2.2], [9.8, y + 2.2]]), '#0e071b');
    line(ctx, [[16, y + 2.2], [16, y + 8]], 1.4, '#0e071b');
    line(ctx, [[9.4, y - 0.6], [22.6, y - 0.6]], 0.8, top(t));
  };
  switch (s.helm) {
    case 'hood': {
      const hood = path(ctx, [[5, 27], [5.6, 15], [9, 7.5], [16, 4.6], [23, 7.5], [26.4, 15], [27, 27], [21, 28.6], [16, 25.4], [11, 28.6]]);
      vol(ctx, hood, set === 'brejo' ? R.bog : R.leather, [5, 4.6, 22, 24]);
      fill(ctx, ellipse(ctx, 16, 18.6, 6.4, 7.2), '#1c121c');
      vol(ctx, ellipse(ctx, 16, 19.8, 4.8, 5.4), ['#391f21', '#5d2c28', '#8a4836', '#bf6f4a'], [11, 14, 10, 11], { lx: 0.4, ly: 0.3 });
      fill(ctx, path(ctx, [[10, 15], [22, 15], [21, 17.4], [11, 17.4]]), '#1c121c');
      for (const x of [13.4, 18.6]) fill(ctx, ellipse(ctx, x, 19.4, 0.8, 0.6), set === 'brejo' ? '#99e65f' : '#f6ca9f');
      line(ctx, [[7.6, 9.6], [16, 6], [24.4, 9.6]], 0.8, set === 'brejo' ? '#33984b' : '#bf6f4a');
      if (set === 'brejo') { line(ctx, [[8, 7], [6, 1.6]], 1, '#cba36f'); line(ctx, [[10, 6.4], [9.6, 2]], 0.9, '#ad7954'); fill(ctx, ellipse(ctx, 6, 2.2, 0.9, 1.6), '#5d2c28'); }
      line(ctx, [[8, 26.6], [16, 24.6], [24, 26.6]], 1.1, mid(t));
      glyph(ctx, set, 16, 26.4, 1.8);
      return;
    }
    case 'tricorn': {
      vol(ctx, path(ctx, [[2.6, 19], [9, 11], [16, 8], [23, 11], [29.4, 19], [23, 18], [16, 22], [9, 18]]), R.leather.slice(0, 4), [3, 8, 26, 14]);
      vol(ctx, path(ctx, [[9, 16], [10.4, 8.4], [16, 4.6], [21.6, 8.4], [23, 16], [16, 18]]), ['#1c121c', '#391f21', '#5d2c28', '#8a4836'], [9, 4.6, 14, 13]);
      line(ctx, [[3, 19], [9, 18], [16, 22], [23, 18], [29, 19]], 1.1, '#ffc825');
      line(ctx, [[12, 8], [9, 3], [14, 5]], 1.3, '#f9e6cf');
      fill(ctx, ellipse(ctx, 16, 13.5, 3.4, 3.2), '#f9e6cf');
      glyph(ctx, set, 16, 13.5, 2.6);
      // Rosto e barba sob o chapéu.
      vol(ctx, path(ctx, [[10.6, 20], [21.4, 20], [20.6, 26], [16, 28.6], [11.4, 26]]), R.leather.slice(2), [10, 20, 12, 9]);
      line(ctx, [[12.2, 22.6], [14.6, 22.6]], 0.9, '#1c121c');
      line(ctx, [[17.4, 22.6], [19.8, 22.6]], 1.4, '#1c121c');
      return;
    }
    case 'nemes': {
      // Nêmes listrado (ouro e lápis) com naja.
      const p = path(ctx, [[5, 29], [7, 12], [10, 6.6], [16, 4.6], [22, 6.6], [25, 12], [27, 29], [22, 27], [21.4, 18], [10.6, 18], [10, 27]]);
      fill(ctx, p, mid(R.gold));
      clip(ctx, p, () => {
        for (let y = 7; y < 30; y += 2.6) fill(ctx, path(ctx, [[0, y], [32, y], [32, y + 1.3], [0, y + 1.3]]), R.lapis[2]);
        fill(ctx, path(ctx, [[0, 0], [12, 0], [6, 30], [0, 30]]), 'rgba(255,235,87,0.35)');
        fill(ctx, path(ctx, [[22, 0], [32, 0], [32, 30], [25, 30]]), 'rgba(14,7,27,0.35)');
      });
      fill(ctx, path(ctx, [[9, 9.6], [23, 9.6], [23, 12], [9, 12]]), lin(ctx, 0, 9, 0, 12, R.gold));
      vol(ctx, path(ctx, [[11, 12.4], [21, 12.4], [20.4, 22], [16, 25], [11.6, 22]]), ['#391f21', '#5d2c28', '#8a4836', '#ad7954'], [11, 12, 10, 13], { lx: 0.35, ly: 0.2 });
      for (const x of [13.6, 18.4]) { line(ctx, [[x - 1.4, 16], [x + 1.4, 16]], 0.9, '#03193f'); fill(ctx, ellipse(ctx, x, 16.2, 0.7, 0.6), '#ffffff'); }
      line(ctx, [[16, 4], [16, 9]], 1.6, '#ffc825');
      fill(ctx, ellipse(ctx, 16, 4.4, 1.6, 1.3), '#ffc825');
      gem(ctx, 16, 11, 1.2, R.lapis);
      return;
    }
    default:
  }
  // Elmos de metal: casco + crista/enfeite do conjunto.
  dome(0);
  // Friso do conjunto e nasal/viseira.
  const crest = {
    great: () => { visor(15); rivets(ctx, [[8, 22], [24, 22], [8, 12], [24, 12]], m); line(ctx, [[16, 5.4], [16, 14]], 1.1, top(m)); },
    coif: () => {
      clip(ctx, path(ctx, [[5, 14], [27, 14], [27, 29], [5, 29]]), () => { for (let y = 14; y < 29; y += 1.6) for (let x = 5 + ((y * 0.625) % 2 ? 0.8 : 0); x < 27; x += 1.6) fill(ctx, ellipse(ctx, x, y, 0.55, 0.55), m[1]); });
      fill(ctx, ellipse(ctx, 16, 19, 5, 5.6), '#0e071b');
      vol(ctx, ellipse(ctx, 16, 20, 3.8, 4.2), ['#5d2c28', '#8a4836', '#bf6f4a', '#e69c69'], [12, 16, 8, 8]);
      line(ctx, [[16, 8], [16, 19]], 1.4, mid(m));
      line(ctx, [[7, 13], [25, 13]], 1, top(m));
    },
    winged: () => { visor(16); for (const sx of [-1, 1]) { fill(ctx, path(ctx, [[16 + sx * 9, 13], [16 + sx * 15, 3], [16 + sx * 14, 8], [16 + sx * 15.4, 9.6], [16 + sx * 12, 14.6]]), lin(ctx, 16 + sx * 9, 4, 16 + sx * 15, 14, R.white)); line(ctx, [[16 + sx * 10.4, 12], [16 + sx * 14.4, 5]], 0.5, '#ffffff'); } },
    spiked: () => { visor(16); for (const [x, h] of [[9, 6], [13, 8], [16, 10], [19, 8], [23, 6]]) line(ctx, [[x, 8], [x + (x - 16) * 0.2, 8 - h], [x + (x - 16) * 0.3 + 1, 6 - h]], 1.3, mid(R.coral)); },
    icy: () => { visor(16); for (const [x, h, w] of [[10, 7, 1.8], [16, 11, 2.4], [22, 7, 1.8]]) { const p = path(ctx, [[x - w, 8], [x, 8 - h], [x + w, 8]]); fill(ctx, p, lin(ctx, x - w, 0, x + w, 0, R.ice)); line(ctx, [[x - w * 0.4, 7], [x, 8 - h + 1]], 0.5, '#ffffff'); } },
    horned: () => { visor(16); for (const sx of [-1, 1]) line(ctx, [[16 + sx * 8, 10], [16 + sx * 12.6, 6], [16 + sx * 13, 1.4]], 2.1, mid(R.bone)); for (const sx of [-1, 1]) line(ctx, [[16 + sx * 12.4, 5], [16 + sx * 13, 1.4]], 1.2, top(R.bone)); glyph(ctx, set, 16, 10, 2.4); },
    elven: () => { visor(16); fill(ctx, path(ctx, [[13, 8], [16, -0.4], [19, 8]]), lin(ctx, 13, 0, 19, 0, R.silver)); line(ctx, [[16, 0.6], [16, 7]], 0.6, '#ffffff'); for (const sx of [-1, 1]) line(ctx, [[16 + sx * 7, 13], [16 + sx * 12, 9.6]], 1.1, top(R.silver)); },
    crystal: () => { visor(16); for (const [x, h, w] of [[10.5, 7, 1.6], [16, 10, 2.2], [21.5, 7, 1.6]]) { fill(ctx, path(ctx, [[x - w, 8], [x - w * 0.6, 8 - h * 0.7], [x, 8 - h], [x + w * 0.6, 8 - h * 0.7], [x + w, 8]]), lin(ctx, x - w, 0, x + w, 0, R.violet)); line(ctx, [[x - w * 0.3, 7], [x - w * 0.2, 8 - h * 0.8]], 0.5, '#fdd2ed'); } },
    volcano: () => { visor(16); fill(ctx, path(ctx, [[12, 7], [16, -0.6], [20, 7]]), lin(ctx, 12, 0, 20, 0, R.obsidian)); line(ctx, [[16, 1.6], [15.2, 4.4], [16.6, 6.6]], 0.9, '#ff5000'); for (const x of [9.4, 22.6]) line(ctx, [[x, 19.6], [x, 25]], 1, '#ffa214'); line(ctx, [[11, 9.6], [12.4, 12], [11.4, 14]], 0.7, '#ff5000'); },
    demon: () => { visor(16); for (const sx of [-1, 1]) { fill(ctx, path(ctx, [[16 + sx * 6, 9.4], [16 + sx * 13.6, 6.4], [16 + sx * 14.6, -0.4], [16 + sx * 11.6, 4.6], [16 + sx * 8.6, 6]]), lin(ctx, 16 + sx * 6, 0, 16 + sx * 14, 10, R.bone)); } for (const sx of [-1, 1]) fill(ctx, ellipse(ctx, 16 + sx * 3.4, 17.1, 1.1, 0.6), '#ffeb57'); },
    halo: () => { visor(16); ctx.save(); ctx.strokeStyle = '#ffc825'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(16, 3.4, 7.6, 2, 0, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = '#ffeb57'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(16, 3.2, 7.6, 2, 0, Math.PI * 1.05, Math.PI * 1.6); ctx.stroke(); ctx.restore(); for (const sx of [-1, 1]) fill(ctx, path(ctx, [[16 + sx * 9.4, 14], [16 + sx * 15.4, 6.4], [16 + sx * 14.4, 11], [16 + sx * 15.6, 12.4], [16 + sx * 11.6, 17]]), lin(ctx, 16 + sx * 9, 6, 16 + sx * 15, 17, R.white)); },
    abyss: () => { visor(16); for (const sx of [-1, 1]) { line(ctx, [[16 + sx * 7.6, 10], [16 + sx * 12.6, 6.4], [16 + sx * 11.4, 2.6], [16 + sx * 13.6, 0.8]], 1.6, '#622461'); line(ctx, [[16 + sx * 11.4, 2.6], [16 + sx * 13.6, 0.8]], 0.9, '#ca52c9'); } for (const sx of [-1, 1]) fill(ctx, ellipse(ctx, 16 + sx * 3.4, 17.1, 1.1, 0.6), '#fdd2ed'); },
    crown: () => { visor(16); fill(ctx, path(ctx, [[7.6, 9], [7.6, 1.6], [10.6, 5.2], [13.2, 0.6], [16, 4.4], [18.8, 0.6], [21.4, 5.2], [24.4, 1.6], [24.4, 9]]), lin(ctx, 8, 1, 24, 9, R.gold)); for (const x of [7.6, 13.2, 18.8, 24.4]) fill(ctx, ellipse(ctx, x, x === 7.6 || x === 24.4 ? 1.6 : 0.6, 0.8, 0.8), '#ffeb57'); gem(ctx, 16, 7, 1.3, R.lava); },
    bark: () => { visor(16); clip(ctx, dome(0), () => { for (let x = 8; x < 26; x += 2.6) line(ctx, [[x, 6], [x + 0.6, 15]], 0.6, R.wood[1]); }); visor(16); for (const sx of [-1, 1]) { line(ctx, [[16 + sx * 7, 9], [16 + sx * 11, 4], [16 + sx * 12, 0.6]], 1.3, R.paleWood[2]); line(ctx, [[16 + sx * 10.4, 4.8], [16 + sx * 13.6, 3.6]], 0.9, R.paleWood[2]); fill(ctx, ellipse(ctx, 16 + sx * 13, 6.2, 1.2, 0.8, sx * 0.5), '#5ac54f'); } }
  }[s.helm];
  crest?.();
  // Friso inferior com o glifo do conjunto ao centro (lado de baixo do elmo).
  line(ctx, [[7, 23.4], [16, 26.4], [25, 23.4]], 1.2, mid(t));
  if (s.helm !== 'horned') { fill(ctx, ellipse(ctx, 16, 25.6, 2.4, 2.2), s.glyph[1]); glyph(ctx, set, 16, 25.6, 1.7); }
}

// ---------- Peitoral ----------
function chest(ctx, set) {
  const s = SETS[set];
  const m = s.main; const t = s.trim;
  const torso = path(ctx, [[8.6, 8], [12, 5.4], [20, 5.4], [23.4, 8], [23.6, 16], [22.4, 28], [9.6, 28], [8.4, 16]]);
  const body = { leather: R.leather, bark: R.wood, robe: R.bog, coat: R.red, tunic: R.linen, chain: s.main }[s.body] ?? m;
  vol(ctx, torso, body, [8.4, 5.4, 15.2, 22.6], { lx: 0.3, ly: 0.2 });
  clip(ctx, torso, () => {
    if (s.body === 'chain') for (let y = 6; y < 29; y += 1.5) for (let x = 8 + ((Math.round(y / 1.5) % 2) ? 0.75 : 0); x < 24; x += 1.5) { ctx.save(); ctx.strokeStyle = m[1]; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.arc(x, y, 0.6, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    else if (s.body === 'plate') { line(ctx, [[16, 6], [16, 22]], 0.9, top(m)); line(ctx, [[16.8, 7], [16.8, 22]], 0.7, m[1]); for (const y of [21.5, 24.6]) line(ctx, [[9, y], [23, y]], 0.8, m[0]); }
    else if (s.body === 'leather') { for (let y = 10; y < 20; y += 2.4) { line(ctx, [[14.6, y], [17.4, y + 1.4]], 0.6, '#f6ca9f'); line(ctx, [[17.4, y], [14.6, y + 1.4]], 0.6, '#f6ca9f'); } line(ctx, [[10, 9], [10.4, 26]], 0.5, R.leather[1]); }
    else if (s.body === 'bark') { for (let x = 9; x < 24; x += 2.4) line(ctx, [[x, 6], [x + 0.8, 28]], 0.7, R.wood[0]); }
    else if (s.body === 'robe') { for (let x = 10; x < 23; x += 3) line(ctx, [[x, 12], [x - 0.6, 28]], 0.7, R.bog[1]); fill(ctx, ellipse(ctx, 12, 24, 2.2, 1.4), '#33984b'); }
  });
  // Ombreiras.
  const shoulder = (sx) => {
    const cx = 16 + sx * 9.6;
    const p = path(ctx, [[cx - 4.4, 13], [cx - 4.6, 8.6], [cx - 2, 5.4], [cx + 2, 5.4], [cx + 4.6, 8.6], [cx + 4.4, 13], [cx, 14.4]]);
    vol(ctx, p, s.body === 'robe' || s.body === 'coat' || s.body === 'tunic' ? t : s.body === 'leather' || s.body === 'bark' ? body : m, [cx - 4.6, 5.4, 9.2, 9], { lx: sx < 0 ? 0.25 : 0.4 });
    line(ctx, [[cx - 4.2, 12.4], [cx, 13.8], [cx + 4.2, 12.4]], 0.9, mid(t));
    const deco = {
      prata: () => fill(ctx, path(ctx, [[cx - 2, 6], [cx + sx * 2.6, 1.4], [cx + 2, 6]]), top(t)),
      bosque: () => { fill(ctx, ellipse(ctx, cx, 6, 2.4, 1.3, sx * 0.4), '#5ac54f'); line(ctx, [[cx - 2, 6], [cx + 2, 6]], 0.5, '#134c4c'); },
      corsario: () => { for (let i = -2; i <= 2; i += 1) line(ctx, [[cx + i * 1.2, 13], [cx + i * 1.3, 15.4]], 0.6, '#ffc825'); },
      coral: () => line(ctx, [[cx, 6], [cx + sx * 1.8, 2.2], [cx + sx * 3.2, 2.8]], 1, mid(R.coral)),
      glacial: () => fill(ctx, path(ctx, [[cx - 1.6, 6], [cx + sx * 1.4, 0.8], [cx + 1.8, 6]]), lin(ctx, cx - 2, 0, cx + 2, 0, R.ice)),
      adamante: () => fill(ctx, path(ctx, [[cx - 1.6, 6], [cx + sx * 1.6, 1], [cx + 1.6, 6]]), lin(ctx, cx - 2, 0, cx + 2, 0, R.violet)),
      demoniaco: () => fill(ctx, path(ctx, [[cx - 1.8, 6.2], [cx + sx * 3.2, 0.6], [cx + 1.8, 6.2]]), lin(ctx, cx - 2, 0, cx + 2, 6, R.bone)),
      vulcanico: () => line(ctx, [[cx - 2, 8.6], [cx, 10.4], [cx + 2, 8.4]], 0.8, '#ff5000'),
      celestial: () => fill(ctx, path(ctx, [[cx, 7], [cx + sx * 5, 1.6], [cx + sx * 4, 5.4], [cx + sx * 5.2, 6.6], [cx + sx * 2, 9.4]]), lin(ctx, cx, 1, cx + sx * 5, 9, R.white)),
      abissal: () => line(ctx, [[cx, 6], [cx + sx * 2.4, 2.4], [cx + sx * 1.4, 0.8]], 1.1, '#93388f'),
      titanico: () => rivets(ctx, [[cx - 2.4, 8.6], [cx, 7.2], [cx + 2.4, 8.6]], R.gold),
      ferro: () => rivets(ctx, [[cx - 2.6, 9], [cx + 2.6, 9]], R.iron),
      runico: () => line(ctx, [[cx - 1, 7.6], [cx + 0.6, 8.8], [cx - 0.6, 10.2]], 0.6, '#94fdff'),
      mithril: () => line(ctx, [[cx - 3.2, 7.4], [cx + 3.2, 7.4]], 0.6, '#ffffff')
    }[set];
    deco?.();
  };
  shoulder(-1); shoulder(1);
  // Gola, cinto e emblema.
  fill(ctx, path(ctx, [[12.4, 5.4], [16, 9.6], [19.6, 5.4]]), '#1c121c');
  if (s.body === 'coat') {
    for (const sx of [-1, 1]) fill(ctx, path(ctx, [[16, 9.6], [16 + sx * 4, 5.4], [16 + sx * 5.6, 13], [16 + sx * 1.2, 17]]), lin(ctx, 12, 6, 20, 16, R.gold));
    fill(ctx, path(ctx, [[14.6, 9.6], [17.4, 9.6], [17, 27.6], [15, 27.6]]), '#f9e6cf');
    for (const y of [14, 18, 22]) for (const sx of [-1, 1]) fill(ctx, ellipse(ctx, 16 + sx * 3.2, y, 0.8, 0.8), '#ffc825');
  }
  if (s.body === 'tunic') {
    // Colar largo (usekh) de ouro e lápis.
    for (const [r, c] of [[7.4, R.gold[3]], [6, R.lapis[2]], [4.6, R.gold[2]], [3.2, R.lapis[3]]]) { ctx.save(); ctx.beginPath(); ctx.ellipse(16, 5.6, r, r * 0.95, 0, 0, Math.PI); ctx.lineTo(16 - r, 5.6); ctx.fillStyle = c; ctx.fill(); ctx.restore(); }
    fill(ctx, path(ctx, [[12.4, 5.4], [16, 8], [19.6, 5.4]]), '#8a4836');
  }
  fill(ctx, path(ctx, [[9.4, 22.6], [22.6, 22.6], [22.4, 24.8], [9.6, 24.8]]), lin(ctx, 0, 22.6, 0, 24.8, s.body === 'tunic' ? R.gold : t === R.lava ? R.obsidian : R.leather.slice(1)));
  fill(ctx, path(ctx, [[14.6, 22.2], [17.4, 22.2], [17.4, 25.2], [14.6, 25.2]]), lin(ctx, 14, 22, 18, 25, s.body === 'leather' ? R.bronze : t));
  const glyphY = s.body === 'coat' ? 24 : 15;
  if (s.body === 'coat') glyph(ctx, set, 16, 18.6, 2.3);
  else medallion(ctx, set, 16, glyphY, 3.2);
  if (s.gem && s.body !== 'coat') gem(ctx, 16, 23.7, 0.9, s.gem);
  if (set === 'vulcanico') { line(ctx, [[11, 17], [12.4, 20], [11.6, 22]], 0.8, '#ff5000'); line(ctx, [[21, 11], [20, 13.6]], 0.7, '#ffa214'); }
  if (set === 'runico') for (const [x, y] of [[11, 18], [21, 18]]) line(ctx, [[x, y], [x + 1, y - 1.4], [x, y - 2.8]], 0.6, '#94fdff');
}

// ---------- Calças ----------
function legs(ctx, set) {
  const s = SETS[set];
  const cloth = { leather: R.leather, bark: R.wood, robe: R.bog, coat: R.red, tunic: R.linen, chain: s.main }[s.body] ?? s.cloth;
  const plate = s.legs === 'plate';
  const chain = s.legs === 'chain';
  const kilt = s.legs === 'kilt';
  for (const sx of [-1, 1]) {
    const x0 = sx < 0 ? 8.4 : 16.6; const x1 = sx < 0 ? 15.4 : 23.6;
    const p = path(ctx, [[x0, 9], [x1, 9], [sx < 0 ? x1 - 0.4 : x1 - 0.6, 29], [sx < 0 ? x0 + 1 : x0 + 0.6, 29]]);
    vol(ctx, p, plate ? s.main : chain ? s.main : set === 'corsario' ? R.white : cloth, [x0, 9, 7, 20], { lx: sx < 0 ? 0.25 : 0.1, ly: 0.2, spread: 1.3 });
    clip(ctx, p, () => {
      if (chain) for (let y = 9; y < 30; y += 1.5) for (let x = x0 + ((Math.round(y / 1.5) % 2) ? 0.75 : 0); x < x1; x += 1.5) { ctx.save(); ctx.strokeStyle = s.main[1]; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.arc(x, y, 0.6, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
      if (!plate && !chain) line(ctx, [[x0 + (sx < 0 ? 5 : 1.4), 12], [x0 + (sx < 0 ? 5.4 : 1), 27]], 0.6, (set === 'corsario' ? R.white : cloth)[0]);
    });
    // Joelheira.
    const kx = (x0 + x1) / 2;
    if (plate || chain) {
      vol(ctx, ellipse(ctx, kx, 19.4, 3.2, 2.6), s.main, [kx - 3, 17, 6, 5], { ao: 0.2 });
      fill(ctx, ellipse(ctx, kx, 19.4, 1.4, 1.1), mid(s.trim));
      line(ctx, [[x0 + 0.6, 24], [x1 - 0.6, 24]], 0.7, s.main[1]);
      if (set === 'glacial' || set === 'adamante' || set === 'demoniaco') fill(ctx, path(ctx, [[kx - 1, 18], [kx, 15.2], [kx + 1, 18]]), set === 'glacial' ? '#94fdff' : set === 'adamante' ? '#ca52c9' : '#f6ca9f');
      if (set === 'vulcanico') line(ctx, [[kx - 1.6, 26], [kx, 23], [kx + 1, 27]], 0.7, '#ff5000');
      if (set === 'runico' || set === 'abissal' || set === 'celestial') line(ctx, [[kx - 0.6, 22.4], [kx + 0.6, 26.4]], 0.6, s.glow);
    } else {
      line(ctx, [[x0 + 0.4, 27], [x1 - 0.4, 27]], 1.1, mid(s.trim));
    }
  }
  if (set === 'corsario') for (const sx of [-1, 1]) for (let y = 11; y < 28; y += 3) line(ctx, [[16 + sx * 5.4 - 1.6, y], [16 + sx * 5.4 + 1.6, y]], 0.9, '#c42430');
  if (kilt) {
    fill(ctx, path(ctx, [[7, 9], [25, 9], [26, 22], [16, 23.6], [6, 22]]), lin(ctx, 6, 9, 26, 23, R.linen));
    clip(ctx, path(ctx, [[7, 9], [25, 9], [26, 22], [16, 23.6], [6, 22]]), () => { for (let x = 7; x < 26; x += 1.8) line(ctx, [[x, 11], [x + (x - 16) * 0.12, 23]], 0.5, R.linen[1]); });
    fill(ctx, path(ctx, [[13.4, 11], [18.6, 11], [18, 23.6], [14, 23.6]]), lin(ctx, 13, 11, 19, 23, R.gold));
    for (let y = 13; y < 23; y += 2.4) line(ctx, [[14, y], [18, y]], 0.7, R.lapis[2]);
  }
  // Cinto com fivela e glifo.
  fill(ctx, path(ctx, [[7.6, 5.4], [24.4, 5.4], [24.4, 9.6], [7.6, 9.6]]), lin(ctx, 0, 5.4, 0, 9.6, kilt ? R.gold : s.body === 'plate' || s.body === 'chain' ? R.leather.slice(1) : R.leather));
  line(ctx, [[7.8, 5.8], [24.2, 5.8]], 0.6, kilt ? '#ffeb57' : '#bf6f4a');
  fill(ctx, path(ctx, [[13.2, 5], [18.8, 5], [18.8, 10], [13.2, 10]]), lin(ctx, 13, 5, 19, 10, s.trim === R.lava ? R.obsidian : s.trim));
  glyph(ctx, set, 16, 7.5, 1.9);
}

// ---------- Botas ----------
function boots(ctx, set) {
  const s = SETS[set];
  const kind = s.boots;
  for (const [x, far] of [[5.4, false], [17, true]]) {
    const ramp = kind === 'plate' ? s.main : kind === 'sandal' ? R.leather : set === 'bosque' ? R.green : set === 'brejo' ? R.bog : set === 'corsario' ? ['#0e071b', '#1c121c', '#391f21', '#5d2c28', '#8a4836'] : R.leather;
    if (kind === 'sandal') {
      vol(ctx, path(ctx, [[x + 1, 8], [x + 7, 8], [x + 7.4, 23], [x + 10.4, 25.6], [x + 10.4, 28.6], [x, 28.6], [x + 0.4, 23]]), R.leather.slice(2), [x, 8, 10, 21]);
      for (let y = 10; y < 24; y += 3.2) line(ctx, [[x + 0.6, y], [x + 7.2, y + 1.4]], 1, mid(R.gold));
      fill(ctx, path(ctx, [[x - 0.2, 27], [x + 10.6, 27], [x + 10.6, 29.2], [x - 0.2, 29.2]]), lin(ctx, 0, 27, 0, 29.2, R.gold));
      glyph(ctx, set, x + 4, 12.2, 1.6);
      continue;
    }
    const p = path(ctx, [[x, 6], [x + 8, 6], [x + 8.2, 20.6], [x + 11.4, 23.6], [x + 11.6, 28.8], [x - 0.2, 28.8], [x - 0.2, 20]]);
    vol(ctx, p, ramp, [x, 6, 11.6, 23], { lx: far ? 0.45 : 0.25, ly: 0.2, spread: 1.2 });
    clip(ctx, p, () => {
      if (kind === 'plate') { for (const y of [21, 23.6]) line(ctx, [[x, y], [x + 11, y + 0.6]], 0.7, s.main[1]); line(ctx, [[x + 1.2, 7], [x + 1.2, 19]], 0.7, top(s.main)); }
      else { line(ctx, [[x + 1, 8], [x + 1, 20]], 0.6, ramp[ramp.length - 2]); for (let y = 10; y < 19; y += 2.6) line(ctx, [[x + 2.6, y], [x + 5.4, y + 1]], 0.6, '#f6ca9f'); }
    });
    // Cano dobrado (couro) ou punho do conjunto e sola.
    fill(ctx, path(ctx, [[x - 0.8, 5], [x + 8.8, 5], [x + 8.6, 8.8], [x - 0.6, 8.8]]), lin(ctx, 0, 5, 0, 9, kind === 'plate' ? s.trim : ramp));
    fill(ctx, path(ctx, [[x - 0.2, 27.2], [x + 11.6, 27.2], [x + 11.6, 29.4], [x - 0.2, 29.4]]), '#1c121c');
    if (set === 'corsario') fill(ctx, path(ctx, [[x + 2, 20.6], [x + 6, 20.6], [x + 6, 23.4], [x + 2, 23.4]]), '#ffc825');
    if (set === 'bosque') { fill(ctx, ellipse(ctx, x + 2.2, 7, 2, 1.1, -0.4), '#99e65f'); }
    if (set === 'vulcanico') line(ctx, [[x + 3, 12], [x + 4.6, 15.4], [x + 3.4, 18]], 0.8, '#ff5000');
    if (set === 'celestial') fill(ctx, path(ctx, [[x + 8, 9], [x + 12.6, 5], [x + 11.6, 9], [x + 12.4, 10.6], [x + 8.4, 13]]), lin(ctx, x + 8, 5, x + 12, 13, R.white));
    if (set === 'demoniaco' || set === 'adamante') fill(ctx, path(ctx, [[x + 10.6, 24], [x + 13.4, 25.8], [x + 11, 27]]), set === 'adamante' ? '#ca52c9' : '#f6ca9f');
    medallion(ctx, set, x + 4, 14.4, 2.4);
  }
}

// ---------- Escudo ----------
function shield(ctx, set, id) {
  const s = SETS[set];
  const m = s.main; const t = s.trim;
  let p;
  let cy = 15.4;
  switch (s.shield) {
    case 'buckler': case 'round': case 'turtle': case 'sun': case 'aegis':
      p = ellipse(ctx, 16, 16, 12.6, 12.6); cy = 16; break;
    case 'kite':
      p = path(ctx, [[16, 2.6], [26, 6.6], [25, 15], [16, 30], [7, 15], [6, 6.6]]); cy = 13; break;
    case 'shell':
      p = path(ctx, [[16, 29], [4.4, 14], [6, 8], [10, 4.4], [16, 3], [22, 4.4], [26, 8], [27.6, 14]]); cy = 14; break;
    case 'crystal':
      p = path(ctx, [[16, 2.4], [25.6, 6.4], [27, 15], [16, 30], [5, 15], [6.4, 6.4]]); cy = 14; break;
    default:
      p = path(ctx, [[5.4, 4.4], [26.6, 4.4], [26.6, 15], [24, 22], [16, 29.6], [8, 22], [5.4, 15]]);
  }
  const face = { buckler: R.wood, round: R.wood, turtle: R.leaf, sun: R.gold, aegis: R.obsidian, shell: R.shell, crystal: R.ice }[s.shield] ?? m;
  // Borda (friso) e face interna.
  vol(ctx, p, s.shield === 'buckler' || s.shield === 'round' ? R.iron : t === R.leaf ? R.wood : t, [4, 2.4, 24, 28], { ao: 0.3 });
  ctx.save();
  ctx.translate(16, cy); ctx.scale(0.84, 0.86); ctx.translate(-16, -cy);
  vol(ctx, p, face, [4, 2.4, 24, 28], { lx: 0.3, ly: 0.2 });
  clip(ctx, p, () => {
    const st = s.shield;
    if (st === 'buckler' || st === 'round') { for (let x = 4; x < 30; x += 3.2) line(ctx, [[x, 2], [x, 30]], 0.7, R.wood[0]); }
    if (st === 'round' && set === 'bosque') for (let y = 6; y < 28; y += 3.6) line(ctx, [[4, y], [28, y + 1.4]], 0.6, R.wood[0]);
    if (st === 'turtle') for (const [x, y] of [[16, 16], [10, 11], [22, 11], [10, 21], [22, 21], [16, 6.6], [16, 25.4]]) { const hex = []; for (let i = 0; i < 6; i += 1) { const a = i * Math.PI / 3; hex.push([x + Math.cos(a) * 3.4, y + Math.sin(a) * 3.4]); } vol(ctx, path(ctx, hex), R.leaf, [x - 3, y - 3, 6, 6], { ao: 0.3 }); line(ctx, hex.concat([hex[0]]), 0.6, '#134c4c'); }
    if (st === 'shell') for (let i = -3; i <= 3; i += 1) line(ctx, [[16, 28], [16 + i * 3.8, 3]], 0.9, R.coral[2]);
    if (st === 'crystal') { line(ctx, [[16, 3], [16, 29]], 0.6, '#ffffff'); line(ctx, [[6, 7], [16, 14], [26, 7]], 0.6, '#94fdff'); }
    if (st === 'sun') for (let i = 0; i < 12; i += 1) { const a = i * Math.PI / 6; line(ctx, [[16 + Math.cos(a) * 5, 16 + Math.sin(a) * 5], [16 + Math.cos(a) * 12, 16 + Math.sin(a) * 12]], 1.1, i % 2 ? R.lapis[2] : '#ffeb57'); }
    if (st === 'aegis') { line(ctx, [[10, 6], [13, 13], [10.4, 20], [12.4, 26]], 1.1, '#ff5000'); line(ctx, [[22, 7], [19.6, 14], [22.4, 22]], 1, '#ffa214'); line(ctx, [[10, 6], [13, 13]], 0.5, '#ffeb57'); }
    if (st === 'heater' || st === 'kite') { line(ctx, [[16, 3], [16, 30]], 0.8, m[1]); fill(ctx, path(ctx, [[3, 3], [16, 3], [16, 31], [3, 31]]), 'rgba(255,255,255,0.08)'); }
  });
  ctx.restore();
  if (s.shield === 'heater' || s.shield === 'kite' || s.shield === 'crystal') rivets(ctx, [[8, 7], [24, 7], [16, 27]], t);
  if (s.shield === 'buckler' || s.shield === 'round') rivets(ctx, [[16, 4.6], [27.4, 16], [16, 27.4], [4.6, 16]], R.iron);
  // Bossa / emblema do conjunto ao centro.
  if (s.shield === 'sun') { vol(ctx, ellipse(ctx, 16, 16, 4.4, 4.4), R.gold, [11.6, 11.6, 8.8, 8.8]); glyph(ctx, set, 16, 16, 2.6); }
  else if (s.shield === 'turtle') glyph(ctx, set, 16, 16, 2.8);
  else medallion(ctx, set, 16, cy, s.shield === 'buckler' ? 3.6 : 4.4);
  if (id === 'magmaAegis' || s.glow) line(ctx, [[9, 6], [12, 4.6]], 0.6, '#ffffff');
}

// ---------- Anel ----------
function ring(ctx, set, item) {
  const s = SETS[set] ?? SETS.ferro;
  const band = item.id === 'kingRing' ? R.gold : s.trim === R.leaf ? R.paleWood : [R.gold, R.bronze, R.silver, R.white].includes(s.trim) ? s.trim : s.main === R.void || s.main === R.gunmetal || s.main === R.indigo ? R.silver : s.main;
  const stone = item.id === 'kingRing' ? R.lapis : item.id === 'pearlRing' ? R.shell : s.gem ?? s.trim;
  // Aro em perspectiva.
  ctx.save();
  ctx.lineWidth = 3.4; ctx.strokeStyle = band[1]; ctx.beginPath(); ctx.ellipse(16, 20.4, 8.6, 6.4, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = mid(band); ctx.beginPath(); ctx.ellipse(16, 20, 8.6, 6.2, 0, Math.PI * 0.95, Math.PI * 2.05); ctx.stroke();
  ctx.lineWidth = 0.8; ctx.strokeStyle = top(band); ctx.beginPath(); ctx.ellipse(16, 19.6, 8.4, 6, 0, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
  ctx.lineWidth = 1; ctx.strokeStyle = band[0]; ctx.beginPath(); ctx.ellipse(16, 21.6, 8.2, 5.8, 0, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
  ctx.restore();
  // Engaste com garras e pedra.
  vol(ctx, path(ctx, [[10.4, 14.6], [21.6, 14.6], [19.6, 9.2], [12.4, 9.2]]), band, [10, 9, 12, 6]);
  for (const x of [11.6, 20.4]) line(ctx, [[x, 13.6], [x + (x < 16 ? 0.8 : -0.8), 6.6]], 1, top(band));
  gem(ctx, 16, 9.4, 4.2, stone);
  glyph(ctx, set, 16, 25.4, 1.6, { ...s, glyph: [top(band), band[0]] });
}

// ---------- Amuleto ----------
function amulet(ctx, set, item) {
  const s = SETS[set] ?? SETS.ferro;
  const chain = [R.gold, R.bronze, R.silver, R.white].includes(s.trim) ? s.trim : item.deathWard ? R.gold : s.main === R.gold ? R.gold : R.silver;
  // Corrente (elos alternados).
  for (let i = 0; i <= 18; i += 1) {
    const a = Math.PI * (1.02 + i * 0.96 / 18);
    const x = 16 + Math.cos(a) * 8.6; const y = 12 + Math.sin(a) * 8.4;
    fill(ctx, ellipse(ctx, x, y, i % 2 ? 0.9 : 0.7, i % 2 ? 0.7 : 0.9), i % 2 ? chain[1] : mid(chain));
  }
  for (const sx of [-1, 1]) line(ctx, [[16 + sx * 8.6, 12.4], [16 + sx * 3.6, 18.4]], 1, mid(chain));
  ctx.save(); ctx.translate(16, 30); ctx.scale(1.35, 1.35); ctx.translate(-16, -30);
  if (item.deathWard) {
    vol(ctx, ellipse(ctx, 16, 23.4, 6.8, 6.8), R.gold, [9, 16.6, 13.6, 13.6]);
    fill(ctx, path(ctx, [[10.6, 23.4], [16, 19.4], [21.4, 23.4], [16, 27.4]]), '#f9e6cf');
    gem(ctx, 16, 23.4, 2.6, R.blue);
    fill(ctx, ellipse(ctx, 16, 23.4, 0.9, 0.9), '#0e071b');
    ctx.restore();
    return;
  }
  if (item.id === 'dragonHeart') {
    const p = path(ctx, [[16, 30.4], [9, 22.6], [9.6, 18.6], [12.6, 17], [16, 19.4], [19.4, 17], [22.4, 18.6], [23, 22.6]]);
    vol(ctx, p, R.lava, [9, 17, 14, 13.4], { lx: 0.3, ly: 0.3 });
    line(ctx, [[12, 20], [14, 24], [13, 27]], 0.7, '#8e251d');
    fill(ctx, ellipse(ctx, 12.4, 19.6, 1.2, 0.9), '#ffeb57');
    for (const sx of [-1, 1]) line(ctx, [[16 + sx * 5, 17.6], [16 + sx * 6.6, 15]], 1.2, mid(R.gold));
    ctx.restore();
    return;
  }
  if (item.id === 'scarabAmulet') {
    for (const sx of [-1, 1]) fill(ctx, path(ctx, [[16 + sx * 2, 22], [16 + sx * 10, 17.6], [16 + sx * 9.4, 22], [16 + sx * 4, 26]]), lin(ctx, 16, 18, 16 + sx * 10, 26, R.gold));
    vol(ctx, ellipse(ctx, 16, 24, 4.4, 5.4), R.lapis, [11.6, 18.6, 8.8, 10.8]);
    line(ctx, [[16, 19.6], [16, 29]], 0.7, '#03193f');
    vol(ctx, ellipse(ctx, 16, 18.6, 2.4, 1.8), R.gold, [13.6, 16.8, 4.8, 3.6]);
    ctx.restore();
    return;
  }
  // Pingente do conjunto: forma pela família e glifo no meio.
  const shape = {
    couro: () => ellipse(ctx, 16, 24, 5.4, 6), bosque: () => path(ctx, [[16, 17], [22, 23], [16, 30.4], [10, 23]]),
    coral: () => ellipse(ctx, 16, 24, 5.6, 5.6), glacial: () => path(ctx, [[16, 17], [21, 22], [16, 30.6], [11, 22]]),
    demoniaco: () => path(ctx, [[10, 18], [16, 20.6], [22, 18], [21, 25], [16, 30], [11, 25]]), celestial: () => ellipse(ctx, 16, 24, 5.8, 5.8)
  }[set]?.() ?? path(ctx, [[16, 17.4], [22.4, 21], [21.6, 27.4], [16, 30.4], [10.4, 27.4], [9.6, 21]]);
  const body = { couro: R.paleWood, bosque: R.wood, coral: R.coral, glacial: R.ice, brejo: R.bog }[set] ?? chain;
  vol(ctx, shape, body, [9.6, 17, 13, 13.6]);
  ctx.save(); ctx.translate(16, 24); ctx.scale(0.66, 0.66); ctx.translate(-16, -24);
  fill(ctx, shape, s.glyph[1]);
  ctx.restore();
  glyph(ctx, set, 16, 24, 2.7);
  if (s.gem) gem(ctx, 16, 18.6, 1.3, s.gem);
  ctx.restore();
}

export const ARMOR = { helmet, chest, legs, boots, shield, ring, amulet };

/** Pinta qualquer peça não-arma (`item` de GEAR_ITEMS). */
export function paintArmor(ctx, item) {
  const set = item.tierKey ?? item.set ?? (item.id === 'kingRing' ? 'faraonico' : item.id === 'dragonHeart' ? 'vulcanico' : item.deathWard ? 'celestial' : 'ferro');
  ARMOR[item.slot]?.(ctx, set, item.slot === 'shield' ? item.id : item);
}
