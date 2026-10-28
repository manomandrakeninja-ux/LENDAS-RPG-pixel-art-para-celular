import Phaser from 'phaser';
import { NPC_SHEETS } from '../art/npcSheets.js';

// Arte pintada dos NPCs, animais e mascotes (Fase 20 G-npcs): folhas em public/assets/npcs/<id>.png,
// carregadas no preload (assets.js) e animadas aqui. Pessoas usam o quadro das skins (56 x 64, pés na
// linha 62, escala 1); animais e mascotes têm N quadros de lado olhando para a direita.

export const NPC_DIRECTIONS = ['down', 'left', 'right', 'up'];
const WALK_RATE = 7;

export const npcSheetKey = (id) => `npcsheet-${id}`;

/** Há folha pintada carregada para este id? */
export function hasNpcSheet(scene, id) {
  return Boolean(NPC_SHEETS[id]) && scene.textures.exists(npcSheetKey(id));
}

/** Origem vertical que põe os pés na posição do objeto. */
export function npcOriginY(id) {
  const info = NPC_SHEETS[id];
  return info ? (info.feet + 0.5) / info.h : 0.9;
}

/** Quadro "parado de frente" (retrato). */
export function npcIdleFrame(id) {
  return NPC_SHEETS[id]?.kind === 'walker' ? 16 : 0;
}

/** Altura do topo da cabeça acima dos pés (para nome, balão e barra de vida). */
export function npcTop(id) {
  const info = NPC_SHEETS[id];
  if (!info) return 32;
  if (info.kind === 'walker' || info.kind === 'still') return info.top ?? 58;
  return info.h - 2;
}

/** Cria as animações da folha (uma vez). Pessoas: idle + walk-<dir>; animais/mascotes: move. */
export function ensureNpcAnims(scene, id) {
  const info = NPC_SHEETS[id];
  const key = npcSheetKey(id);
  if (!info || !scene.textures.exists(key)) return false;
  const create = (name, frames, frameRate, repeat = -1) => {
    if (!scene.anims.exists(`${key}-${name}`)) scene.anims.create({ key: `${key}-${name}`, frames: frames.map((frame) => ({ key, frame })), frameRate, repeat });
  };
  if (info.kind === 'walker' || info.kind === 'still') {
    const base = npcIdleFrame(id);
    // Respira devagar e pisca de vez em quando.
    create('idle', [0, 0, 1, 1, 0, 0, 1, 1, 0, 3].map((f) => base + f), 4);
    if (info.kind === 'walker') NPC_DIRECTIONS.forEach((dir, row) => create(`walk-${dir}`, [0, 1, 2, 3].map((f) => row * 4 + f), WALK_RATE));
  } else {
    create('move', Array.from({ length: info.frames }, (_, f) => f), id === 'chicken' ? 8 : info.kind === 'pet' ? 8 : 6);
  }
  return true;
}

/**
 * Textura avulsa `npc-<id>-0` com o quadro parado (retrato do diário e dos diálogos).
 * Devolve false se a folha não estiver carregada (quem chama usa o desenho antigo).
 */
export function ensureNpcPortrait(scene, id, textureKey = `npc-${id}-0`) {
  if (scene.textures.exists(textureKey)) return true;
  if (!hasNpcSheet(scene, id)) return false;
  const info = NPC_SHEETS[id];
  const sheet = scene.textures.get(npcSheetKey(id));
  const frame = sheet.get(npcIdleFrame(id));
  const texture = scene.textures.createCanvas(textureKey, info.w, info.h);
  texture.getContext().drawImage(sheet.getSourceImage(), frame.cutX, frame.cutY, info.w, info.h, 0, 0, info.w, info.h);
  texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  texture.refresh();
  return true;
}

/** Direção da animação a partir da velocidade. */
export function directionOf(vx, vy) {
  if (Math.abs(vx) >= Math.abs(vy)) return vx < 0 ? 'left' : 'right';
  return vy < 0 ? 'up' : 'down';
}
