// Monstros do fim de jogo (níveis 60-150): picos gelados, deserto, ilha de brasa e Abismo de Brasa.
// Mesmo formato de monstersRegions.js: 2 quadros, virados para a direita, contorno vindo de drawMonsterFrame.
// Cada desenho usa uma grade de 32 unidades; `sized` converte para o tamanho real do monstro.

function limb(g, x0, y0, x1, y1, width, color) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length = Math.hypot(dx, dy) || 1;
  const nx = (-dy / length) * (width / 2);
  const ny = (dx / length) * (width / 2);
  g.polygon([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], color);
}

function eyes(g, x, y, color, count = 1, gap = 3) {
  for (let i = 0; i < count; i += 1) {
    g.rect(x + i * gap, y, 2, 1, color);
    g.pixel(x + i * gap + 1, y, '#ffffff');
  }
}


// ---------- Arquétipos ----------

function quad(g, f, pal, o = {}) {
  const s = f === 1 ? 1 : -1;
  g.shadow(16, 29, 12, 2, 100);
  for (const [x, lift, back] of [[8, s, true], [20, -s, true], [11, -s, false], [23, s, false]]) {
    const up = Math.max(0, lift);
    g.rect(x, 21, 3, 8 - up, back ? pal[0] : pal[1]);
    g.rect(x - 1, 28 - up, 5, 1, o.claw ?? pal[0]);
  }
  g.polygon([[6, 17], [1, 12 + s], [3, 11 + s], [8, 15]], pal[1]);
  if (o.tailColor) g.pixel(2, 12 + s, o.tailColor);
  g.shaded(15, 18, 10, 6, pal);
  if (o.spikes) for (const x of [9, 13, 17, 21]) g.polygon([[x, 13], [x + 1, 9], [x + 2, 13]], o.spikes);
  g.shaded(24, 14, 5, 4.5, pal);
  g.polygon([[26, 14], [31, 16], [30, 19], [25, 18]], pal[1]);
  g.rect(27, 18, 4, 1, o.mouth ?? '#1a0a0a');
  if (o.horns) {
    g.polygon([[21, 10], [20, 4], [24, 9]], o.horns);
    g.polygon([[25, 9], [26, 3], [28, 10]], o.horns);
  }
  eyes(g, 26, 12, o.eye ?? '#ffe04a');
  if (o.glow) for (const [x, y] of [[10, 17], [15, 19], [19, 16], [13, 21]]) g.pixel(x, y - (f ? 1 : 0), o.glow);
}

function biped(g, f, pal, o = {}) {
  const s = f === 1 ? 1 : 0;
  g.shadow(16, 30, 8, 1.8, 100);
  g.rect(12, 22, 3, 8 - s, pal[0]);
  g.rect(17, 22, 3, 7 + s, pal[1]);
  g.rect(11, 30 - s, 5, 1, o.boot ?? pal[0]);
  g.rect(16, 29 + s, 5, 1, o.boot ?? pal[0]);
  g.shaded(16, 17, 6.5, 7, pal);
  if (o.belt) g.rect(10, 22, 12, 2, o.belt);
  limb(g, 21, 13, 25, 19 + s, 3, pal[1]);
  limb(g, 11, 13, 8, 19 - s, 3, pal[0]);
  g.shaded(16, 9, 4.5, 4.5, pal);
  if (o.helm) {
    g.polygon([[11, 8], [12, 3], [20, 3], [21, 8]], o.helm);
    if (o.crest) g.polygon([[14, 3], [16, 0], [18, 3]], o.crest);
  }
  if (o.horns) {
    g.polygon([[11, 7], [8, 1], [14, 5]], o.horns);
    g.polygon([[21, 7], [24, 1], [18, 5]], o.horns);
  }
  eyes(g, 15, 9, o.eye ?? '#ffe04a', 2, 3);
  if (o.weapon === 'sword') {
    g.line(27, 22, 28, 3, '#c8d0d8');
    g.line(28, 22, 29, 3, '#f4f8fc');
    g.rect(25, 21, 5, 1, '#6a4a2a');
  } else if (o.weapon === 'scythe') {
    g.line(26, 30, 26, 2, '#4a3a4a');
    g.polygon([[26, 2], [18, 3], [14, 8], [20, 5], [26, 5]], o.weaponColor ?? '#c8d0f0');
  } else if (o.weapon === 'mace') {
    g.line(26, 28, 26, 10, '#3a2a1a');
    g.shaded(26, 9, 3.5, 3.5, o.weaponPal ?? pal);
  } else if (o.weapon === 'club') {
    g.line(26, 28, 26, 10, '#3a2a1a');
    g.shaded(26, 9, 3.2, 3.2, pal);
  }
  if (o.glow) for (const [x, y] of [[14, 15], [18, 17], [16, 20]]) g.pixel(x, y, o.glow);
}

function flier(g, f, pal, o = {}) {
  const flap = f === 1 ? 3 : 0;
  g.shadow(16, 30, 6, 1.5, 70);
  g.polygon([[14, 14], [4, 5 + flap], [1, 12 + flap], [6, 13 + flap], [4, 19 + flap], [11, 18]], o.wing ?? pal[1]);
  g.polygon([[17, 14], [23, 5 + flap], [28, 8 + flap], [24, 13 + flap], [27, 18 + flap], [19, 18]], o.wing2 ?? pal[0]);
  g.shaded(16, 17, 5, 6, pal);
  g.shaded(21, 10, 4, 3.8, pal);
  g.polygon([[23, 10], [28, 12], [24, 14]], o.beak ?? '#e8b040');
  eyes(g, 21, 9, o.eye ?? '#ffe04a');
  if (o.tail) g.polygon([[13, 22], [10, 30 + flap], [15, 28], [18, 30 - flap], [17, 22]], o.tail);
  if (o.crest) g.polygon([[19, 7], [18, 2], [22, 6]], o.crest);
}

function serpent(g, f, pal, o = {}) {
  const w = f === 1 ? 1.5 : -1.5;
  g.shadow(16, 29, 13, 1.8, 90);
  for (let i = 0; i < 7; i += 1) {
    const x = 3 + i * 3.4;
    const y = 24 + Math.sin(i * 1.1 + (f ? 1 : 0)) * 3;
    const r = 3.3 - i * 0.12;
    g.shaded(x, y, r + 0.8, r, pal);
    if (o.spikes && i % 2 === 0) g.polygon([[x - 1, y - r], [x, y - r - 3], [x + 1, y - r]], o.spikes);
  }
  limb(g, 24, 22, 26, 14 + w, 5, pal[1]);
  g.shaded(27, 11 + w, 4.5, 3.8, pal);
  g.rect(28, 13 + w, 4, 1, o.mouth ?? '#1a0a0a');
  eyes(g, 27, 9 + w, o.eye ?? '#ffe04a');
  if (o.horns) {
    g.polygon([[24, 9 + w], [22, 4 + w], [27, 8 + w]], o.horns);
  }
  if (o.glow) for (const x of [6, 12, 18]) g.pixel(x, 23, o.glow);
}

function blob(g, f, pal, o = {}) {
  const sq = f === 1;
  g.shadow(16, 28, 11, 2.4, 100);
  g.shaded(16, sq ? 20 : 19, sq ? 12 : 11, sq ? 8 : 9, pal);
  g.shaded(16, sq ? 13 : 11, 4, 3.5, pal);
  eyes(g, 12, sq ? 18 : 17, o.eye ?? '#ffe04a', 2, 5);
  g.rect(14, sq ? 22 : 21, 4, 1, pal[0]);
  if (o.glow) for (const [x, y] of [[10, 21], [20, 22], [16, 14]]) g.pixel(x, y, o.glow);
  if (o.horns) g.polygon([[13, 8], [16, 2], [19, 8]], o.horns);
}

function floater(g, f, pal, o = {}) {
  const b = f === 1 ? 1 : -1;
  g.shadow(16, 30, 6, 1.4, 60);
  g.polygon([[8, 12 + b], [24, 12 + b], [26, 28 + b], [22, 25], [18, 29 + b], [14, 25], [10, 29 + b], [6, 28 + b]], pal[1]);
  g.shaded(16, 14 + b, 7, 8, pal);
  limb(g, 22, 15 + b, 28, 19 + b, 3, pal[1]);
  limb(g, 10, 15 + b, 5, 20 - b, 3, pal[0]);
  eyes(g, 15, 12 + b, o.eye ?? '#9affff', 2, 4);
  g.rect(15, 17 + b, 4, 1, '#0a0a14');
  if (o.hood) g.polygon([[8, 12 + b], [12, 3], [20, 3], [24, 12 + b]], o.hood);
  if (o.glow) for (const [x, y] of [[12, 22], [20, 21], [16, 26]]) g.pixel(x, y + b, o.glow);
}

// ---------- Espécies ----------

const sets = {
  snow: ['#8a98b0', '#b4c2d6', '#dce6f2', '#ffffff'],
  mammoth: ['#3a2a22', '#5e4838', '#86684c', '#b08c68'],
  cobra: ['#5a4a1a', '#8a7228', '#c0a040', '#e8d070'],
  scarab: ['#0a2a2a', '#16505a', '#2a8a8a', '#6adad0'],
  sand: ['#6a5230', '#957a48', '#c0a468', '#e4cc90'],
  djinn: ['#1a2a6a', '#2a4ab0', '#5a82e0', '#a0c4ff'],
  lava: ['#2a0e0a', '#5a1a10', '#8a2a14', '#c8442a'],
  magma: ['#4a0a0a', '#a02a0a', '#e05a14', '#ffb040'],
  fire: ['#8a1a0a', '#d04a14', '#ff8a24', '#ffe070'],
  obsidian: ['#0a0a12', '#1c1c2a', '#34344a', '#5a5a7a'],
  phoenix: ['#3a3a42', '#5e5e6a', '#8a8a98', '#b8b8c6'],
  wraith: ['#1a1a20', '#34343e', '#52525e', '#7a7a8a'],
  garg: ['#34303a', '#524c5c', '#746c82', '#9a92aa'],
  bone: ['#8a806a', '#b4aa90', '#d8ceb4', '#f4ecd8'],
  void: ['#0a0414', '#1e0a34', '#3a1a5e', '#6a3aa0'],
  giant: ['#3a0e0a', '#7a1e10', '#b8381a', '#f06a30'],
  warden: ['#14141c', '#2a2a3a', '#444458', '#6a6a82'],
  reaper: ['#0e0a18', '#24183a', '#3e2c62', '#6a52a0'],
  abyss: ['#08040a', '#240a14', '#4a1424', '#8a2a3a']
};
const eliteSets = {
  snow: ['#4a5a7a', '#6a7c9e', '#94a8c8', '#c8d8ec'],
  mammoth: ['#1e1814', '#3a2c24', '#584434', '#7a6048'],
  cobra: ['#1a3a1a', '#2e6a2e', '#52a052', '#90e090'],
  scarab: ['#2a0a2a', '#5a1a5a', '#9a3a9a', '#e07ae0'],
  sand: ['#3a3a42', '#5a5a68', '#80808e', '#a8a8b8'],
  djinn: ['#3a1a5a', '#6a2a9a', '#a05ad8', '#d8a0ff'],
  lava: ['#0e1a2a', '#1a3a5a', '#2a5a8a', '#5a9ad0'],
  magma: ['#0a2a4a', '#1a5a9a', '#3a8ae0', '#80d0ff'],
  fire: ['#0a3a6a', '#1a6ad0', '#4a9aff', '#c0e8ff'],
  obsidian: ['#2a0a0a', '#4a1414', '#7a2424', '#a84444'],
  phoenix: ['#1a3a6a', '#2a62b0', '#5a96e0', '#a0ccff'],
  wraith: ['#0e2a22', '#1a4a3c', '#2a7a62', '#5ac0a0'],
  garg: ['#2a1a1a', '#4e2c2c', '#785050', '#a07878'],
  bone: ['#2a2a34', '#4a4a5a', '#70708a', '#a0a0c0'],
  void: ['#04140e', '#0a3a28', '#1a6a4a', '#3ab080'],
  giant: ['#0e1a3a', '#1e3a7a', '#3a62b8', '#6a9af0'],
  warden: ['#3a2a0a', '#6a4a14', '#a07a24', '#d8b04a'],
  reaper: ['#2a0a0a', '#5a1414', '#9a2424', '#e05050'],
  abyss: ['#0a0a2a', '#1a1a5a', '#2a2a9a', '#5a5ae0']
};
const pal = (key, elite) => (elite ? eliteSets[key] : sets[key]);

const snowOwl = (g, f, e) => flier(g, f, pal('snow', e), { beak: '#f0a030', eye: '#ffd040', wing: '#a8b8cc', wing2: '#c8d6e6', crest: '#ffffff' });
const mammoth = (g, f, e) => {
  const p = pal('mammoth', e);
  quad(g, f, p, { claw: '#2a1a14' });
  limb(g, 28, 15, 30, 25, 3, p[2]);
  g.polygon([[26, 17], [31, 19], [30, 15]], '#f4ecd8');
  g.polygon([[24, 17], [29, 22], [28, 18]], '#f4ecd8');
  for (const x of [8, 12, 16, 20]) g.line(x, 22, x - 1, 26, p[2]);
};
const cobra = (g, f, e) => serpent(g, f, pal('cobra', e), { eye: '#ff3030', mouth: '#c02020', spikes: e ? '#90e090' : '#e8d070' });
const scarab = (g, f, e) => {
  const p = pal('scarab', e);
  const s = f === 1 ? 1 : -1;
  g.shadow(16, 28, 11, 2, 90);
  for (const x of [8, 13, 18, 23]) g.line(x, 22, x - 2, 27 + (x % 2 ? s : -s) * 0.5, p[0]);
  g.shaded(15, 18, 10, 7, p);
  g.line(15, 12, 15, 24, p[0]);
  g.shaded(25, 17, 4, 3.5, p);
  g.polygon([[27, 14], [30, 9], [29, 15]], p[3]);
  g.polygon([[25, 14], [26, 8], [28, 14]], p[3]);
  eyes(g, 26, 16, '#ffe04a');
  g.pixel(11, 15, p[3]);
  g.pixel(19, 14, p[3]);
};
const sandGolem = (g, f, e) => {
  const p = pal('sand', e);
  biped(g, f, p, { eye: '#ffb030', weapon: 'club', belt: p[0] });
  for (const [x, y] of [[13, 15], [19, 19], [15, 22]]) g.rect(x, y, 2, 2, p[0]);
};
const djinn = (g, f, e) => floater(g, f, pal('djinn', e), { eye: '#ffe04a', hood: pal('djinn', e)[0], glow: '#ffffff' });
const lavaHound = (g, f, e) => quad(g, f, pal('lava', e), { eye: '#ffa030', glow: pal('magma', e)[3], mouth: '#ff6a1a', tailColor: '#ff8a2a', spikes: pal('magma', e)[2], claw: '#1a0a08' });
const magmaSlime = (g, f, e) => blob(g, f, pal('magma', e), { eye: '#ffffff', glow: '#fff0a0' });
const fireElemental = (g, f, e) => {
  const p = pal('fire', e);
  const b = f === 1 ? 1 : -1;
  g.shadow(16, 30, 7, 1.5, 70);
  g.polygon([[16, 0 + b], [8, 14], [6, 24], [11, 30], [21, 30], [26, 24], [24, 13]], p[1]);
  g.polygon([[16, 5 + b], [11, 15], [10, 24], [14, 28], [19, 28], [22, 23], [21, 14]], p[2]);
  g.polygon([[16, 12], [13, 20], [14, 26], [18, 26], [19, 20]], p[3]);
  eyes(g, 13, 17, '#2a0a00', 2, 4);
  limb(g, 23, 16, 29, 12 + b, 3, p[2]);
  limb(g, 9, 16, 3, 13 - b, 3, p[1]);
};
const obsidianKnight = (g, f, e) => biped(g, f, pal('obsidian', e), { helm: pal('obsidian', e)[1], crest: '#d83a1a', eye: '#ff5a2a', weapon: 'sword', belt: '#d83a1a', glow: '#ff6a2a' });
const phoenix = (g, f, e) => flier(g, f, pal('phoenix', e), { wing: '#ff8a2a', wing2: '#ffd040', tail: '#ff5a1a', crest: '#ffd040', beak: '#ffb040', eye: '#ff3030' });
const ashWraith = (g, f, e) => floater(g, f, pal('wraith', e), { eye: '#ff6a3a', hood: pal('wraith', e)[0], glow: '#c8c8d0' });
const gargoyle = (g, f, e) => {
  const p = pal('garg', e);
  g.polygon([[10, 12], [1, 4], [2, 14], [8, 18]], p[0]);
  g.polygon([[22, 12], [31, 4], [30, 14], [24, 18]], p[1]);
  biped(g, f, p, { horns: '#e8d8b0', eye: '#ff4a2a' });
};
const boneWyrm = (g, f, e) => serpent(g, f, pal('bone', e), { eye: '#ff4a2a', spikes: pal('bone', e)[3], horns: pal('bone', e)[3], glow: '#ff6a2a' });
const voidStalker = (g, f, e) => {
  const p = pal('void', e);
  quad(g, f, p, { eye: e ? '#ff4aff' : '#c8ff4a', horns: p[3], mouth: p[3], glow: p[3], claw: p[3] });
};
const cinderGiant = (g, f, e) => {
  const p = pal('giant', e);
  biped(g, f, p, { eye: '#ffe04a', weapon: 'mace', weaponPal: pal('lava', e), glow: pal('magma', e)[3], belt: pal('lava', e)[0] });
  g.polygon([[12, 6], [10, 0], [14, 4]], pal('magma', e)[2]);
  g.polygon([[20, 6], [22, 0], [18, 4]], pal('magma', e)[2]);
};
const hellWarden = (g, f, e) => biped(g, f, pal('warden', e), { helm: pal('warden', e)[1], horns: '#c8b890', eye: '#ff3a2a', weapon: 'mace', belt: '#8a1a1a', glow: '#ff3a2a' });
const lavaWorm = (g, f, e) => serpent(g, f, pal('giant', e), { eye: '#ffffff', mouth: '#ffb040', spikes: pal('magma', e)[2], glow: pal('magma', e)[3] });
const soulReaper = (g, f, e) => floater(g, f, pal('reaper', e), { eye: e ? '#ffe04a' : '#7aff9a', hood: pal('reaper', e)[0], glow: '#c8b0ff' });
const abyssHound = (g, f, e) => quad(g, f, pal('abyss', e), { eye: e ? '#9affff' : '#ff3a3a', horns: pal('abyss', e)[3], spikes: pal('abyss', e)[3], glow: pal('abyss', e)[3], mouth: '#ff3a3a', claw: pal('abyss', e)[3] });

const abyssLord = (g, f) => {
  const p = sets.abyss;
  const s = f === 1 ? 1 : 0;
  g.shadow(16, 30, 12, 2, 110);
  g.polygon([[8, 14], [0, 2 + s], [3, 16], [1, 24], [9, 21]], p[1]);
  g.polygon([[24, 14], [32, 2 + s], [29, 16], [31, 24], [23, 21]], p[0]);
  g.rect(10, 22, 4, 8 - s, p[0]);
  g.rect(18, 22, 4, 7 + s, p[1]);
  g.shaded(16, 17, 8, 8, p);
  g.polygon([[12, 14], [16, 10], [20, 14], [16, 24]], '#5a1018');
  g.shaded(16, 9, 5, 5, p);
  g.polygon([[10, 7], [6, 0], [13, 5]], '#d8c8a0');
  g.polygon([[22, 7], [26, 0], [19, 5]], '#d8c8a0');
  g.polygon([[14, 4], [16, 0], [18, 4]], '#ff4a2a');
  eyes(g, 13, 9, '#ff3a3a', 2, 4);
  g.rect(14, 13, 4, 1, '#ff6a3a');
  limb(g, 23, 14, 28, 20 + s, 3, p[2]);
  g.line(29, 28, 29, 4, '#3a2a3a');
  g.polygon([[29, 4], [24, 6], [27, 10]], '#ff4a2a');
  g.polygon([[29, 4], [31, 8], [29, 12]], '#c8c8d8');
  for (const [x, y] of [[13, 19], [19, 20], [16, 23]]) g.pixel(x, y, '#ff6a3a');
};

// ---------- Registro ----------

export const DEEP_MONSTER_SIZES = Object.freeze({
  snowOwl: { size: 32, elite: 40 },
  mammoth: { size: 56, elite: 64 },
  cobra: { size: 40, elite: 48 },
  scarab: { size: 40, elite: 48 },
  sandGolem: { size: 52, elite: 60 },
  djinn: { size: 44, elite: 52 },
  lavaHound: { size: 44, elite: 52 },
  magmaSlime: { size: 36, elite: 44 },
  fireElemental: { size: 44, elite: 52 },
  obsidianKnight: { size: 48, elite: 56 },
  phoenix: { size: 44, elite: 52 },
  ashWraith: { size: 44, elite: 52 },
  gargoyle: { size: 48, elite: 56 },
  boneWyrm: { size: 56, elite: 64 },
  voidStalker: { size: 44, elite: 52 },
  cinderGiant: { size: 60, elite: 68 },
  hellWarden: { size: 52, elite: 60 },
  lavaWorm: { size: 56, elite: 64 },
  soulReaper: { size: 52, elite: 60 },
  abyssHound: { size: 48, elite: 56 },
  abyssLord: { size: 96, elite: 96 }
});

// Converte a grade de 32 unidades dos desenhos para o tamanho lógico real do monstro.
// O elite é a mesma grade lógica desenhada em resolução maior (feito por drawMonsterFrame).
const wrap = (size, draw) => (g, frame, elite) => {
  const k = size / 32;
  const wrapped = {
    pixel: (x, y, c, a) => g.rect(x * k, y * k, k, k, c, a),
    rect: (x, y, w, h, c, a) => g.rect(x * k, y * k, w * k, h * k, c, a),
    line: (x0, y0, x1, y1, c) => g.line(x0 * k, y0 * k, x1 * k, y1 * k, c),
    ellipse: (cx, cy, rx, ry, c, a) => g.ellipse(cx * k, cy * k, rx * k, ry * k, c, a),
    shaded: (cx, cy, rx, ry, c, o) => g.shaded(cx * k, cy * k, rx * k, ry * k, c, o),
    polygon: (pts, c, a) => g.polygon(pts.map(([x, y]) => [x * k, y * k]), c, a),
    shadow: (cx, cy, rx, ry, a) => g.shadow(cx * k, cy * k, rx * k, ry * k, a)
  };
  draw(wrapped, frame, elite);
};

const DRAW = { snowOwl, mammoth, cobra, scarab, sandGolem, djinn, lavaHound, magmaSlime, fireElemental, obsidianKnight, phoenix, ashWraith, gargoyle, boneWyrm, voidStalker, cinderGiant, hellWarden, lavaWorm, soulReaper, abyssHound, abyssLord };

export const DEEP_DRAWERS = Object.freeze(
  Object.fromEntries(Object.entries(DRAW).map(([kind, draw]) => [kind, wrap(DEEP_MONSTER_SIZES[kind].size, draw)]))
);
