import { NPCS } from '../data/campaign.js';
import { SPEAKERS } from '../data/story.js';
import { VILLAGERS } from '../data/villagers.js';
import { drawKnightFrame } from './knight.js';
import { drawMonsterFrame } from './monsters.js';
import { Painter, clamp01, fbm, mixRgb, rgb } from './painter.js';
import { drawNpc, drawVillager } from './person.js';

// Ilustrações dos capítulos (400 x 225). Pintadas com luz, névoa e profundidade e
// convertidas para pixel art; os personagens, monstros e prédios são os do próprio jogo.

export const SCENE_SIZE = Object.freeze({ width: 400, height: 225 });
const W = SCENE_SIZE.width;
const H = SCENE_SIZE.height;
const SEAL_COLORS = ['#7ac04a', '#4aa0e0', '#e0e0ff', '#ffe27a', '#ff7a2a'];

// ---------- Personagens e objetos do jogo ----------

const knight = (direction = 0, frame = 1) => drawKnightFrame(direction, frame);
// Personagens pintados (G-npcs): quadros de public/assets/npcs entregues no atlas como `npc-<id>`
// (56 x 64, escala 1). Sem eles, o desenho antigo (24 x 32) na escala 2.
let PAINTED = {};
let S = 2;
const npc = (id) => PAINTED[`npc-${id}`] ?? drawNpc((NPCS[id] ?? SPEAKERS[id]).palette, 0);
const villager = (id) => {
  if (PAINTED[`npc-${id}`]) return PAINTED[`npc-${id}`];
  const def = VILLAGERS.find((entry) => entry.id === id);
  return drawVillager(def.palette, def.prop, 0);
};
const monster = (kind, size, elite = false) => drawMonsterFrame(kind, size, 0, { elite });

/** Chão com textura de ruído (grama, areia, neve, pedra). */
function ground(p, top, colors, { seed = 4, scale = 18, horizonFade = null } = {}) {
  const parsed = colors.map(rgb);
  const fade = horizonFade ? rgb(horizonFade) : null;
  for (let y = top; y < H; y += 1) {
    const depth = (y - top) / (H - top);
    for (let x = 0; x < W; x += 1) {
      const n = fbm(x / (scale * (0.4 + depth)), y / (scale * 0.35 * (0.4 + depth)), seed, 4);
      const index = Math.min(parsed.length - 2, Math.floor(n * (parsed.length - 1)));
      let color = mixRgb(parsed[index], parsed[index + 1], clamp01(n * (parsed.length - 1) - index));
      if (fade) color = mixRgb(color, fade, (1 - depth) * 0.45);
      p.set(x, y, color);
    }
  }
}

/** Fileira de árvores do jogo: silhueta ao longe ou coloridas de perto. */
function treeLine(p, atlas, y, { names = ['pine-0', 'pine-1', 'pine-2'], step = 14, scale = 2, silhouette = null, light = '#ffffff', lightAmount = 0, seed = 2, jitter = 6 } = {}) {
  for (let x = -10, index = 0; x < W + 20; x += step, index += 1) {
    const frame = atlas[names[index % names.length]];
    if (!frame) continue;
    const offset = Math.floor(fbm(index, seed, seed, 2) * jitter);
    p.sprite(frame, x + offset, y + offset / 2, { scale, silhouette, light, lightAmount });
  }
}

function fire(p, x, y, size = 1) {
  p.glow(x, y - 6 * size, 80 * size, '#ff7a2a', 0.32);
  p.glow(x, y - 6 * size, 22 * size, '#ffc06a', 0.3);
  p.polygon([[x - 7 * size, y], [x - 5 * size, y - 9 * size], [x - 2 * size, y - 16 * size], [x, y - 24 * size], [x + 2 * size, y - 15 * size], [x + 5 * size, y - 10 * size], [x + 7 * size, y]], '#d8401a');
  p.polygon([[x - 4 * size, y], [x - 1 * size, y - 11 * size], [x + 1 * size, y - 16 * size], [x + 4 * size, y]], '#ffb43a');
  p.polygon([[x - 2 * size, y], [x, y - 8 * size], [x + 2 * size, y]], '#fff0a0');
}

function smoke(p, x, y, height, seed = 3, hex = '#3a3436', alpha = 0.55) {
  for (let step = 0; step < height; step += 3) {
    const t = step / height;
    const drift = Math.sin(t * 5 + seed) * 10 * t + t * 30;
    p.ellipse(x + drift, y - step, 6 + t * 18, 5 + t * 10, hex, alpha * (1 - t));
  }
}

/** Símbolo do sol negro (Ordem do Eclipse). */
function blackSun(p, x, y, radius) {
  p.glow(x, y, radius * 3, '#ff5a2a', 0.5);
  p.rays(x, y, { count: 16, length: radius * 2.4, hex: '#ffb06a', intensity: 0.6, width: 0.05 });
  p.ellipse(x, y, radius + 2, radius + 2, '#ffcf8a');
  p.ellipse(x, y, radius, radius, '#07050a');
}

const stoneFill = (seed, dark = '#3a4a44', light = '#7a8a80', moss = null) => (x, y) => {
  const n = fbm(x / 6, y / 6, seed, 3);
  const color = mixRgb(rgb(dark), rgb(light), n);
  return moss && n > 0.62 ? rgb(moss) : color;
};

// ---------- Cenas ----------

/** Cap. 1 — sobrevivente sem memória junto à fogueira; Bram vigia; uma luz vermelha na mata. */
function sceneCampfire(p, atlas) {
  p.gradient([[0, '#03050c'], [0.5, '#0b1428'], [1, '#14203a']], 0, 150);
  p.particles(90, { area: [0, 0, W, 110], hex: '#e8f0ff', alpha: 0.7, seed: 11 });
  p.sphere(330, 34, 13, '#8a96b0', '#f4f6ff');
  p.glow(330, 34, 60, '#9ab0e0', 0.25);
  p.ridge({ base: 128, amplitude: 30, frequency: 0.012, seed: 3, color: '#0c1626', depth: 300 });
  treeLine(p, atlas, 152, { step: 12, scale: 2, silhouette: '#08101c', seed: 4 });
  p.fog(146, 14, '#24324a', 0.5);
  ground(p, 150, ['#0e140c', '#16200f', '#1e2a14', '#2a3418'], { seed: 6 });
  p.ellipse(200, 196, 150, 34, (x, y, d) => mixRgb(rgb('#3a2a1a'), rgb('#20180f'), d), 0.85);
  // A luz vermelha entre as árvores (o presságio).
  p.glow(330, 136, 70, '#ff2a2a', 0.8);
  p.glow(330, 136, 18, '#ff8a8a', 0.9);
  p.ellipse(330, 136, 3, 4, '#ffe0e0');
  treeLine(p, atlas, 176, { names: ['oak-tree', 'pine-1'], step: 70, scale: 2, light: '#2a3a6a', lightAmount: 0.75, seed: 8, jitter: 20 });
  for (let index = 0; index < 9; index += 1) {
    const angle = (index / 9) * Math.PI * 2;
    p.ellipse(200 + Math.cos(angle) * 16, 200 + Math.sin(angle) * 5, 4, 3, '#5a5450');
  }
  p.line(186, 202, 214, 196, '#5a3a20', 3);
  p.line(188, 196, 212, 202, '#6a4428', 3);
  fire(p, 200, 198, 1.2);
  // O herói, com o fragmento vermelho brilhando, e Bram do outro lado do fogo.
  p.sprite(knight(2, 1), 160, 214, { scale: 2, light: '#ffb080', lightAmount: 0.45, rim: '#ffcf8a', rimSide: -1 });
  p.glow(165, 184, 12, '#ff3030', 0.9);
  p.sprite(npc('vigia'), 240, 214, { scale: S, flip: true, light: '#ffb080', lightAmount: 0.45, rim: '#ffcf8a', rimSide: 1 });
  p.particles(40, { area: [175, 120, 50, 70], hex: '#ffcf6a', seed: 13, glowHex: '#ff8a3a' });
  p.particles(18, { area: [20, 140, 360, 60], hex: '#9aff8a', seed: 17, glowHex: '#5ae06a' });
  p.vignette(0.6);
}

/** Cap. 2 — a vila cresce ao entardecer; uma criança desenha cinco símbolos. */
function sceneVillage(p, atlas) {
  p.gradient([[0, '#1a2050'], [0.45, '#8a4a6a'], [0.75, '#ff9a5a'], [1, '#ffd08a']], 0, 140);
  p.clouds({ top: 10, bottom: 90, cover: 0.45, lit: '#ffc08a', shade: '#6a4a7a', seed: 21 });
  p.sphere(200, 118, 18, '#ff8a3a', '#fff0b0');
  p.glow(200, 118, 120, '#ffb060', 0.35);
  p.ridge({ base: 118, amplitude: 36, frequency: 0.01, seed: 22, color: '#4a3a6a', fogColor: '#c08a8a', fog: 0.5, depth: 300, rim: '#ffb07a' });
  p.ridge({ base: 134, amplitude: 22, frequency: 0.02, seed: 23, color: '#2a3a3a', fogColor: '#8a6a6a', fog: 0.3, depth: 250 });
  treeLine(p, atlas, 150, { step: 8, scale: 1, light: '#5a3a4a', lightAmount: 0.6, seed: 24 });
  ground(p, 148, ['#3a5a2a', '#4a6a30', '#5a7a38', '#6a8a40'], { seed: 25, horizonFade: '#c08a6a' });
  // Rio com o reflexo do pôr do sol.
  p.polygon([[176, 148], [212, 148], [250, H], [140, H]], (x) => mixRgb(rgb('#3a6a9a'), rgb('#ffb070'), clamp01(1 - Math.abs(x - 200) / 30) * 0.6));
  for (const [name, x, y] of [['house-8', 60, 178], ['store-8', 112, 172], ['house', 150, 166], ['forge-8', 270, 170], ['farm-8', 330, 180]]) {
    if (atlas[name]) p.sprite(atlas[name], x, y, { scale: 1, light: '#ffc090', lightAmount: 0.3 });
  }
  for (const [x, y] of [[56, 160], [108, 154], [266, 154], [148, 150]]) p.glow(x, y, 10, '#ffcf6a', 0.5);
  fire(p, 200, 206, 0.8);
  // A criança e os cinco símbolos desenhados no chão.
  p.sprite(villager('pipo'), 168, 214, { scale: S, light: '#ffc090', lightAmount: 0.3 });
  SEAL_COLORS.forEach((hex, index) => {
    const x = 128 + index * 9;
    p.ellipse(x, 218, 3, 2, hex);
    p.glow(x, 218, 8, hex, 0.5);
  });
  p.sprite(villager('marta'), 228, 212, { scale: S, flip: true, light: '#ffc090', lightAmount: 0.3 });
  p.sprite(knight(1, 1), 252, 216, { scale: 2, light: '#ffc090', lightAmount: 0.3 });
  p.sprite(npc('construtor'), 104, 214, { scale: S, light: '#ffc090', lightAmount: 0.3 });
  smoke(p, 312, 130, 50, 2, '#6a5a6a', 0.35);
  p.vignette(0.4);
}

/** Cap. 3 — os Saqueadores atacam a paliçada; o estandarte deles tem um sol negro. */
function sceneSiege(p, atlas) {
  p.gradient([[0, '#2a2026'], [0.6, '#6a3a2a'], [1, '#c0602a']], 0, 140);
  p.clouds({ top: 0, bottom: 100, cover: 0.65, lit: '#c07a4a', shade: '#2a2024', seed: 31 });
  smoke(p, 80, 120, 110, 1, '#2a2224', 0.6);
  smoke(p, 140, 126, 90, 4, '#2a2224', 0.5);
  p.ridge({ base: 132, amplitude: 18, frequency: 0.015, seed: 32, color: '#2a1a1a', fogColor: '#8a4a2a', fog: 0.4, depth: 300 });
  ground(p, 136, ['#2a3018', '#3a3a1e', '#4a4424', '#5a4a2a'], { seed: 33, horizonFade: '#8a4a2a' });
  for (const [x, y] of [[64, 168], [128, 160]]) {
    if (atlas['house-1']) p.sprite(atlas['house-1'], x, y, { scale: 2, light: '#c07a5a', lightAmount: 0.35 });
    fire(p, x - 10, y - 46, 0.9);
    fire(p, x + 12, y - 42, 0.7);
  }
  // Paliçada de troncos com o portão.
  for (let x = 190; x < W; x += 7) {
    const height = 40 + (x % 3) * 2;
    p.rect(x, 168 - height, 6, height, (px) => mixRgb(rgb('#6a4022'), rgb('#a0703a'), clamp01((px - x) / 6)));
    p.polygon([[x, 168 - height], [x + 3, 162 - height], [x + 6, 168 - height]], '#8a5a30');
  }
  p.rect(262, 138, 34, 30, '#1a1210');
  p.line(330, 130, 330, 70, '#2a1a12', 2);
  p.rect(331, 70, 30, 22, '#2a1418');
  blackSun(p, 346, 81, 6);
  const raider = PAINTED['npc-saqueador'] ?? drawNpc({ tunic: '#3a2a2a', scarf: '#1a1a1a', hair: '#1a1a1a', skin: '#a0704a', hat: '#2a2020' }, 0);
  for (const [x, y] of [[300, 200], [330, 186], [356, 208], [382, 192], [280, 178]]) p.sprite(raider, x, y, { scale: S, flip: true, light: '#ff9a5a', lightAmount: 0.45 });
  // Defensores: o herói, a Capitã e um sentinela.
  p.sprite(knight(2, 0), 220, 214, { scale: 2, light: '#ffb080', lightAmount: 0.35, rim: '#ffcf8a', rimSide: -1 });
  p.sprite(npc('capitao'), 182, 210, { scale: S, light: '#ffb080', lightAmount: 0.35 });
  p.sprite(villager('rui'), 248, 222, { scale: S, light: '#ffb080', lightAmount: 0.35 });
  p.particles(70, { area: [0, 40, W, 140], hex: '#ffb04a', seed: 34, glowHex: '#ff7a2a' });
  p.vignette(0.5);
}

/** Cap. 4 — o templo da Terra na floresta profunda; o Selo da Terra brilha no altar. */
function sceneForestTemple(p, atlas) {
  p.gradient([[0, '#0a1a1a'], [0.5, '#16363a'], [1, '#1e4a44']], 0, H);
  p.rays(200, -20, { count: 7, length: 260, hex: '#c0ffe0', intensity: 0.35, start: Math.PI * 0.25, spread: Math.PI * 0.5, width: 0.04 });
  treeLine(p, atlas, 128, { step: 18, scale: 2, silhouette: '#0c2626', seed: 41 });
  p.fog(120, 16, '#3a7a6a', 0.45);
  const stone = stoneFill(42, '#3a4a44', '#7a8a80', '#3c6e3c');
  p.rect(140, 110, 120, 50, stone);
  p.rect(160, 76, 80, 36, stone);
  p.rect(180, 46, 40, 32, stone);
  p.polygon([[176, 46], [200, 20], [224, 46]], stone);
  p.rect(190, 124, 20, 36, '#0a1414');
  p.glow(200, 140, 40, '#5ae0a0', 0.6);
  ground(p, 160, ['#14261a', '#1e3420', '#2a4426', '#36542e'], { seed: 43 });
  p.rect(186, 168, 28, 14, stone);
  p.sphere(200, 160, 6, '#2a6a2a', '#a0ff7a');
  p.glow(200, 160, 50, '#7aff7a', 0.6);
  for (const x of [0, 354]) p.rect(x, 0, 46, H, (px, py) => mixRgb(rgb('#1e1610'), rgb('#4a3a28'), fbm(px / 3, py / 20, 44, 3)));
  for (const [x, y, hex] of [[60, 200, '#5ab0ff'], [84, 214, '#ffb04a'], [320, 206, '#5ab0ff'], [340, 218, '#5ae0ff'], [130, 216, '#5ae0ff'], [270, 220, '#ffb04a']]) {
    p.rect(x - 1, y - 6, 2, 6, '#d0e0d8');
    p.ellipse(x, y - 7, 5, 3, hex);
    p.glow(x, y - 7, 18, hex, 0.55);
  }
  p.sprite(knight(3, 1), 130, 218, { scale: 2, light: '#80c0a0', lightAmount: 0.5, rim: '#a0ffd0', rimSide: 1 });
  p.sprite(npc('cacador'), 96, 214, { scale: S, light: '#80c0a0', lightAmount: 0.5 });
  p.particles(40, { area: [40, 40, 320, 170], hex: '#c0ffd0', seed: 45, glowHex: '#5ae0a0' });
  p.vignette(0.55);
}

/** Cap. 5 — as ruínas de Valdora sob a lua de sangue; o túmulo do último rei. */
function sceneBloodMoon(p) {
  p.gradient([[0, '#06080e'], [0.6, '#141a26'], [1, '#2a1a20']], 0, H);
  p.particles(60, { area: [0, 0, W, 100], hex: '#c0c8e0', alpha: 0.6, seed: 51 });
  p.glow(110, 60, 120, '#ff2a2a', 0.35);
  p.sphere(110, 60, 30, '#7a1010', '#ff5a3a', { highlight: '#ffb08a' });
  p.clouds({ top: 30, bottom: 110, cover: 0.38, lit: '#5a2a30', shade: '#14101a', seed: 52, alpha: 0.8 });
  const castle = '#1c1824';
  p.glow(286, 96, 140, '#5a2a3a', 0.35);
  p.rect(200, 100, 170, 70, castle);
  for (const [x, w, h] of [[200, 18, 110], [236, 22, 140], [276, 30, 170], [318, 22, 140], [352, 18, 110]]) {
    p.rect(x, 170 - h, w, h, castle);
    p.polygon([[x - 2, 170 - h], [x + w / 2, 170 - h - w * 1.4], [x + w + 2, 170 - h]], castle);
    for (let wy = 180 - h; wy < 160; wy += 14) {
      p.rect(x + w / 2 - 1, wy, 3, 5, '#ff2a2a');
      p.glow(x + w / 2, wy + 2, 6, '#ff2a2a', 0.4);
    }
  }
  p.fog(170, 14, '#3a2a34', 0.6);
  ground(p, 172, ['#0c0c12', '#16141c', '#201c24', '#2a2430'], { seed: 53 });
  for (const [x, h] of [[30, 80], [60, 50], [380, 70]]) p.rect(x, 200 - h, 14, h, stoneFill(54, '#3a3640', '#6a6470'));
  // Túmulo do rei com a coroa.
  p.rect(130, 186, 70, 20, stoneFill(55, '#4a4450', '#7a7480'));
  p.rect(136, 178, 58, 10, '#5a5460');
  for (const dx of [-8, -3, 2, 7]) p.polygon([[165 + dx, 178], [166 + dx, 170], [168 + dx, 178]], '#e8c15a');
  p.glow(166, 174, 16, '#ffd06a', 0.5);
  for (const [x, y] of [[250, 204], [286, 210], [322, 202]]) p.sprite(monster('skeleton', 40, true), x, y, { scale: 2, light: '#7a4a5a', lightAmount: 0.6, rim: '#ff4a3a', rimSide: -1 });
  p.sprite(knight(3, 1), 106, 222, { scale: 2, light: '#ff8a7a', lightAmount: 0.45, rim: '#ff6a5a', rimSide: -1 });
  p.vignette(0.6);
}

/** Cap. 6 — a Terra Congelada: o palácio de gelo, a aurora e o Guardião Adormecido. */
function sceneFrozen(p, atlas) {
  p.gradient([[0, '#020818'], [0.5, '#0c2448'], [1, '#2a5a8a']], 0, 150);
  p.particles(70, { area: [0, 0, W, 90], hex: '#ffffff', alpha: 0.7, seed: 61 });
  for (let x = 0; x < W; x += 1) {
    const center = 40 + Math.sin(x / 40) * 14 + fbm(x / 50, 1, 62, 3) * 20;
    for (let y = Math.floor(center - 26); y < center + 10; y += 1) {
      const t = 1 - Math.abs(y - center) / 26;
      p.add(x, y, rgb(x % 120 < 60 ? '#5affb0' : '#7ac0ff'), clamp01(t) * 0.35 * fbm(x / 8, y / 30, 63, 2));
    }
  }
  p.ridge({ base: 132, amplitude: 50, frequency: 0.012, seed: 64, color: '#5a7aa0', fogColor: '#9ac0e0', fog: 0.4, rim: '#ffffff', rimStrength: 0.7, sharp: 1.6, depth: 300 });
  for (const [x, h, w] of [[150, 70, 12], [180, 100, 16], [210, 124, 22], [240, 100, 16], [270, 70, 12]]) {
    p.polygon([[x - w / 2, 150], [x - w / 2, 150 - h * 0.6], [x, 150 - h], [x + w / 2, 150 - h * 0.6], [x + w / 2, 150]], (px) => mixRgb(rgb('#7ab0e0'), rgb('#d8f0ff'), clamp01((x - px) / w + 0.5)));
  }
  p.glow(210, 132, 60, '#7af0ff', 0.6);
  ground(p, 150, ['#a0c0d8', '#c0d8ea', '#dceaf4', '#f4fbff'], { seed: 65 });
  p.ellipse(210, 186, 110, 18, (x, y, d) => mixRgb(rgb('#5a8ab0'), rgb('#a0d0f0'), d), 0.9);
  for (const [x, name] of [[30, 'pine-2'], [372, 'pine-0'], [60, 'pine-1']]) if (atlas[name]) p.sprite(atlas[name], x, 190, { scale: 2, light: '#c0e0ff', lightAmount: 0.5 });
  // O Guardião Adormecido sobre o lago e o herói com uma tocha.
  p.glow(210, 160, 70, '#7ae0ff', 0.45);
  p.sprite(monster('ghost', 40), 210, 196, { scale: 3, light: '#a0e8ff', lightAmount: 0.3, alpha: 0.85 });
  p.sprite(knight(3, 1), 120, 222, { scale: 2, light: '#9ac0e0', lightAmount: 0.4, rim: '#ffffff', rimSide: 1 });
  fire(p, 140, 170, 0.4);
  p.particles(160, { area: [0, 0, W, H], hex: '#ffffff', alpha: 0.85, seed: 67 });
  p.vignette(0.45);
}

/** Cap. 7 — o Deserto dos Ossos: a caveira de areia, as pirâmides e o contrabandista do Eclipse. */
function sceneDesert(p) {
  p.gradient([[0, '#2a6aa0'], [0.55, '#8ac0d0'], [1, '#f8dca0']], 0, 140);
  p.clouds({ top: 8, bottom: 70, cover: 0.42, lit: '#ffffff', shade: '#8ab0c8', seed: 71, stretch: 4 });
  p.ellipse(250, 92, 90, 58, (x, y) => mixRgb(rgb('#c09060'), rgb('#f8dcb0'), fbm(x / 20, y / 14, 72, 4)), 0.9);
  p.ellipse(222, 86, 18, 20, '#4a2a24', 0.85);
  p.ellipse(278, 86, 18, 20, '#4a2a24', 0.85);
  p.polygon([[244, 108], [250, 98], [256, 108]], '#4a2a24', 0.85);
  for (let x = 224; x < 280; x += 8) p.rect(x, 124, 5, 12, '#4a2a24', 0.8);
  for (const [base, amp, seed, light, dark] of [[150, 18, 73, '#f0c888', '#c08a50'], [176, 22, 74, '#e8b878', '#a87040']]) {
    for (let x = 0; x < W; x += 1) {
      const top = base - fbm(x * 0.01, seed, seed, 3) * amp;
      const slope = fbm((x + 1) * 0.01, seed, seed, 3) - fbm(x * 0.01, seed, seed, 3);
      for (let y = Math.floor(top); y < H; y += 1) p.set(x, y, mixRgb(rgb(dark), rgb(light), clamp01(0.5 + slope * 40)));
    }
  }
  p.polygon([[300, 160], [348, 96], [396, 160]], '#d08a50');
  p.polygon([[348, 96], [396, 160], [366, 160]], '#9a5a30');
  p.ellipse(200, 168, 46, 7, '#3a8aa0');
  for (const x of [168, 230]) {
    p.line(x, 168, x + 4, 140, '#6a4a2a', 2);
    for (const angle of [-2.6, -2.2, -1.2, -0.6]) p.line(x + 4, 140, x + 4 + Math.cos(angle) * 18, 148 + Math.sin(angle) * 10, '#3a8a3a', 2);
  }
  // O contrabandista com o sol negro no peito, diante do herói e de Zeno.
  const smuggler = PAINTED['npc-contrabandista'] ?? drawNpc({ tunic: '#1a1a22', scarf: '#2a2a32', hair: '#1a1a1a', skin: '#a0704a', hat: '#101014' }, 0);
  p.sprite(smuggler, 300, 214, { scale: S, flip: true });
  blackSun(p, 296, 181, 3);
  p.sprite(knight(2, 1), 220, 218, { scale: 2, light: '#ffe0b0', lightAmount: 0.2 });
  p.sprite(npc('mercador'), 180, 216, { scale: S, light: '#ffe0b0', lightAmount: 0.2 });
  p.particles(80, { area: [0, 60, W, 160], hex: '#f8e0b0', alpha: 0.5, seed: 75 });
  p.vignette(0.35);
}

/** Cap. 8 — a Guerra das Cinzas: o exército do Eclipse marcha sob um sol negro. */
function sceneBlackFortress(p) {
  p.gradient([[0, '#1a0406'], [0.5, '#6a0e0c'], [1, '#c0301a']], 0, 150);
  p.clouds({ top: 0, bottom: 110, cover: 0.6, lit: '#a03020', shade: '#120808', seed: 81 });
  blackSun(p, 300, 48, 18);
  p.ridge({ base: 140, amplitude: 50, frequency: 0.015, seed: 82, color: '#1a0a0a', sharp: 1.4, depth: 300, rim: '#ff6a3a', rimStrength: 0.4 });
  const fortress = '#0e0808';
  p.rect(110, 90, 180, 70, fortress);
  for (const [x, w, h] of [[110, 20, 100], [150, 24, 130], [190, 26, 160], [234, 24, 130], [270, 20, 100]]) {
    p.rect(x, 160 - h, w, h, fortress);
    p.polygon([[x - 2, 160 - h], [x + w / 2, 160 - h - w], [x + w + 2, 160 - h]], fortress);
  }
  for (const [x, y] of [[132, 120], [204, 100], [262, 120], [170, 140], [232, 140]]) {
    p.rect(x - 1, y - 6, 3, 12, '#ffb04a');
    p.glow(x, y, 14, '#ff8a2a', 0.6);
  }
  ground(p, 160, ['#140a0a', '#201010', '#2a1612', '#341c14'], { seed: 83 });
  for (let x = 0; x < W; x += 1) {
    const y = 186 + Math.sin(x / 30) * 8 + fbm(x / 20, 1, 84, 3) * 8;
    for (let dy = -2; dy <= 2; dy += 1) p.set(x, y + dy, rgb(Math.abs(dy) < 1 ? '#ffd06a' : '#ff6a1e'));
    if (x % 6 === 0) p.glow(x, y, 14, '#ff5a1e', 0.18);
  }
  for (let index = 0; index < 9; index += 1) {
    p.sprite(monster('skeleton', 40, index % 3 === 0), 140 + index * 24, 178 + (index % 2) * 6, { scale: 2, silhouette: '#2a0e10', rim: '#ff7a3a', rimSide: -1 });
  }
  p.sprite(knight(3, 1), 120, 222, { scale: 2, light: '#ff8a5a', lightAmount: 0.45, rim: '#ffb06a', rimSide: 1 });
  p.sprite(npc('capitao'), 84, 220, { scale: S, light: '#ff8a5a', lightAmount: 0.45 });
  p.particles(90, { area: [0, 20, W, 200], hex: '#ffb04a', seed: 85, glowHex: '#ff6a2a' });
  p.vignette(0.55);
}

/** Cap. 9 — a forja dos selos: Doran e um anão ferreiro trabalham; os cinco selos brilham. */
function sceneForge(p) {
  p.gradient([[0, '#0a0610'], [0.6, '#160c1a'], [1, '#22141e']], 0, H);
  for (let y = 0; y < 170; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const mortar = (Math.floor(y / 10) % 2 ? x + 10 : x) % 20 < 1 || y % 10 < 1;
      p.set(x, y, mortar ? rgb('#0c0810') : mixRgb(rgb('#1e1620'), rgb('#3a2a34'), fbm(x / 8, y / 8, 91, 3)));
    }
  }
  p.rect(0, 14, W, 8, '#2a2430');
  for (const x of [60, 340]) p.line(x, 22, x, 90, '#3a3440', 2);
  p.ellipse(300, 110, 60, 64, (x, y, d) => mixRgb(rgb('#4a3a44'), rgb('#2a1e24'), d));
  p.ellipse(300, 118, 38, 44, (x, y, d) => mixRgb(rgb('#fff0a0'), rgb('#e0501e'), d));
  p.glow(300, 118, 160, '#ff8a3a', 0.5);
  for (const [x, y, s] of [[30, 120, 10], [48, 130, 6], [370, 70, 8], [24, 60, 6]]) {
    p.polygon([[x, y - s * 2], [x + s * 0.7, y], [x, y + s * 0.5], [x - s * 0.7, y]], '#a05aff');
    p.glow(x, y, s * 5, '#a05aff', 0.5);
  }
  ground(p, 170, ['#14100e', '#1e1814', '#2a2018', '#34281c'], { seed: 92 });
  p.rect(60, 176, 90, 8, '#5a3a20');
  SEAL_COLORS.forEach((hex, index) => {
    const x = 72 + index * 17;
    p.sphere(x, 170, 5, '#1a1a1a', hex);
    p.glow(x, 170, 16, hex, 0.55);
  });
  // Bigorna com metal em brasa.
  p.rect(184, 188, 50, 12, '#3a3a42');
  p.rect(196, 200, 26, 18, '#2a2a30');
  p.rect(176, 186, 14, 6, '#3a3a42');
  p.rect(196, 184, 22, 4, '#ff9a3a');
  p.glow(207, 186, 30, '#ffb04a', 0.7);
  p.sprite(npc('ferreiro'), 166, 220, { scale: S, light: '#ffb080', lightAmount: 0.4, rim: '#ffcf8a', rimSide: -1 });
  p.sprite(villager('borin'), 254, 220, { scale: S, flip: true, light: '#ffb080', lightAmount: 0.4, rim: '#ffcf8a', rimSide: 1 });
  p.particles(60, { area: [180, 140, 60, 50], hex: '#ffe27a', seed: 93, glowHex: '#ffb04a' });
  p.vignette(0.55);
}

/** Cap. 10 — o Golem de Fogo no cânion de lava, diante do portador. */
function sceneGolem(p) {
  p.gradient([[0, '#1a2224'], [0.5, '#4a4a3a'], [1, '#b0602a']], 0, 160);
  p.clouds({ top: 0, bottom: 80, cover: 0.55, lit: '#a07050', shade: '#1a1a1e', seed: 101 });
  for (const side of [0, 1]) {
    for (let y = 0; y < H; y += 1) {
      const edge = side === 0 ? 70 + fbm(y / 20, 1, 102, 3) * 40 : W - 70 - fbm(y / 20, 2, 103, 3) * 40;
      const from = side === 0 ? 0 : Math.floor(edge);
      const to = side === 0 ? edge : W;
      for (let x = from; x < to; x += 1) {
        const n = fbm(x / 10, y / 10, 104 + side, 4);
        p.set(x, y, Math.abs(n - 0.55) < 0.012 ? rgb('#ff7a2a') : mixRgb(rgb('#141a1c'), rgb('#3a4446'), n));
      }
    }
  }
  ground(p, 176, ['#141818', '#1e2222', '#2a2a2a', '#343232'], { seed: 105 });
  for (let x = 60; x < 340; x += 1) {
    const y = 200 + Math.sin(x / 24) * 6;
    for (let dy = -3; dy <= 3; dy += 1) p.set(x, y + dy, rgb(Math.abs(dy) < 2 ? '#ffd06a' : '#ff5a1e'));
  }
  p.glow(200, 200, 160, '#ff6a1e', 0.35);
  p.glow(200, 110, 110, '#ff6a2a', 0.3);
  p.sprite(monster('titan', 64), 200, 196, { scale: 3, light: '#ffc0a0', lightAmount: 0.25 });
  p.sprite(knight(3, 1), 200, 224, { scale: 2, light: '#ff9a6a', lightAmount: 0.45, rim: '#ffcf8a', rimSide: 1 });
  p.particles(110, { area: [0, 0, W, H], hex: '#ffb04a', seed: 106, glowHex: '#ff6a2a' });
  p.vignette(0.5);
}

/** Final — amanhecer sobre o novo povoado, com todos reunidos. */
function sceneDawn(p, atlas) {
  p.gradient([[0, '#2a3a7a'], [0.45, '#d08a7a'], [0.75, '#ffd08a'], [1, '#fff4c8']], 0, 150);
  p.clouds({ top: 10, bottom: 90, cover: 0.4, lit: '#fff0d0', shade: '#a07a9a', seed: 111 });
  p.glow(200, 96, 120, '#ffd08a', 0.45);
  p.sphere(200, 96, 22, '#ffb04a', '#fff8d0');
  p.rays(200, 96, { count: 14, length: 300, hex: '#fff0c0', intensity: 0.35, width: 0.05 });
  p.ridge({ base: 132, amplitude: 34, frequency: 0.01, seed: 112, color: '#6a5a8a', fogColor: '#e0b0a0', fog: 0.5, depth: 300, rim: '#ffe0a0' });
  treeLine(p, atlas, 154, { step: 8, scale: 1, light: '#7a5a6a', lightAmount: 0.5, seed: 113 });
  ground(p, 154, ['#4a7a3a', '#5a8a40', '#6a9a48', '#7aaa50'], { seed: 114, horizonFade: '#e0b090' });
  for (const [name, x, y] of [['house-8', 56, 184], ['store-8', 108, 178], ['forge-8', 296, 178], ['farm-8', 346, 188]]) {
    if (atlas[name]) p.sprite(atlas[name], x, y, { scale: 1, light: '#ffe0b0', lightAmount: 0.25 });
  }
  fire(p, 200, 214, 0.7);
  for (const [id, x] of [['vigia', 150], ['curandeira', 168], ['construtor', 232], ['capitao', 250], ['ferreiro', 268]]) p.sprite(npc(id), x, 222, { scale: S, light: '#ffe0b0', lightAmount: 0.2 });
  p.sprite(knight(0, 1), 200, 224, { scale: 2, light: '#ffe0b0', lightAmount: 0.2 });
  p.vignette(0.3);
}

/** Memória — Aurelian diante do Coração aberto, com os cinco selos girando. */
function sceneAurelian(p) {
  p.gradient([[0, '#10040a'], [0.6, '#2a0a14'], [1, '#3a0e18']], 0, H);
  for (const x of [50, 140, 260, 350]) {
    p.rect(x - 14, 0, 28, 170, (px, py) => mixRgb(rgb('#1a1016'), rgb('#3a2630'), fbm(px / 5, py / 10, 121, 3)));
    p.polygon([[x - 8, 40], [x, 18], [x + 8, 40], [x + 8, 90], [x - 8, 90]], '#c02a1a');
    p.glow(x, 60, 30, '#ff3a2a', 0.35);
  }
  ground(p, 170, ['#1a1014', '#24161c', '#2e1c24', '#38222a'], { seed: 122 });
  p.rays(200, 84, { count: 18, length: 220, hex: '#ff6a5a', intensity: 0.4, width: 0.05 });
  p.glow(200, 84, 120, '#ff3a3a', 0.5);
  p.sphere(200, 84, 22, '#8a0a1a', '#ff8a7a', { highlight: '#fff0e0' });
  SEAL_COLORS.forEach((hex, index) => {
    const angle = -Math.PI / 2 + (index / 5) * Math.PI * 2;
    const x = 200 + Math.cos(angle) * 50;
    const y = 84 + Math.sin(angle) * 34;
    p.sphere(x, y, 5, '#1a1a1a', hex);
    p.glow(x, y, 16, hex, 0.6);
  });
  p.sprite(npc('aurelian'), 200, 222, { scale: S + 1, light: '#ff9a8a', lightAmount: 0.45, rim: '#ffb0a0', rimSide: 1 });
  // Coroa dourada sobre a cabeça do rei.
  p.rect(184, 128, 32, 6, '#e8c15a');
  for (const dx of [0, 10, 20, 30]) p.polygon([[184 + dx - 2, 128], [184 + dx, 118], [184 + dx + 3, 128]], '#f2d27a');
  for (const dx of [5, 15, 25]) p.ellipse(184 + dx, 131, 2, 2, '#e0452f');
  p.glow(200, 126, 24, '#ffd06a', 0.4);
  p.particles(50, { area: [100, 20, 200, 160], hex: '#ffb0a0', seed: 123, glowHex: '#ff5a4a' });
  p.vignette(0.6);
}

/** Final secreto — o Golem se desfaz em luz e o Coração sobe livre. */
function sceneFreedHeart(p) {
  p.gradient([[0, '#1a2a5a'], [0.5, '#7a6aa0'], [0.8, '#f0b08a'], [1, '#fff4d0']], 0, 160);
  p.clouds({ top: 20, bottom: 100, cover: 0.38, lit: '#fff0e0', shade: '#7a6a9a', seed: 131 });
  p.ridge({ base: 150, amplitude: 50, frequency: 0.012, seed: 132, color: '#3a3050', fogColor: '#c0a0b0', fog: 0.3, depth: 300, rim: '#ffe0c0', sharp: 1.3 });
  ground(p, 172, ['#2a2a36', '#34343e', '#3e3e48', '#484852'], { seed: 133 });
  p.rays(200, 56, { count: 16, length: 260, hex: '#fff4c0', intensity: 0.45, width: 0.05 });
  p.glow(200, 56, 110, '#ffe08a', 0.6);
  p.sphere(200, 56, 14, '#e0a03a', '#fffbe0');
  p.sprite(monster('titan', 64), 200, 206, { scale: 2, light: '#c0c0e0', lightAmount: 0.5, alpha: 0.85 });
  for (const [x0, y0, x1, y1] of [[200, 110, 186, 170], [200, 110, 216, 172], [170, 140, 160, 190], [230, 140, 240, 190]]) p.line(x0, y0, x1, y1, '#fff8d0', 2, 0.9);
  p.particles(120, { area: [100, 20, 200, 180], hex: '#fff4c0', seed: 134, glowHex: '#ffe08a' });
  for (const [id, x] of [['vigia', 70], ['curandeira', 92], ['cacador', 308], ['capitao', 330]]) p.sprite(npc(id), x, 222, { scale: S, light: '#ffe0c0', lightAmount: 0.3 });
  p.sprite(knight(3, 1), 120, 224, { scale: 2, light: '#ffe0c0', lightAmount: 0.3 });
  p.vignette(0.35);
}

const SCENES = {
  1: sceneCampfire,
  2: sceneVillage,
  3: sceneSiege,
  4: sceneForestTemple,
  5: sceneBloodMoon,
  6: sceneFrozen,
  7: sceneDesert,
  8: sceneBlackFortress,
  9: sceneForge,
  10: sceneGolem,
  final: sceneDawn,
  aurelian: sceneAurelian,
  libertar: sceneFreedHeart
};

export const STORY_SCENE_KEYS = Object.freeze(Object.keys(SCENES));

/**
 * Desenha a ilustração do capítulo (1–10), do final ('final'), da memória de Aurelian ('aurelian')
 * ou do final secreto ('libertar'). atlas = quadros dos prédios e árvores do jogo (opcional).
 */
export function drawStoryScene(key, atlas = {}) {
  PAINTED = Object.fromEntries(Object.entries(atlas).filter(([name]) => name.startsWith('npc-')));
  S = PAINTED['npc-vigia'] ? 1 : 2;
  const painter = new Painter(W, H);
  (SCENES[key] ?? sceneCampfire)(painter, atlas);
  return painter.toPixelCanvas(20);
}
