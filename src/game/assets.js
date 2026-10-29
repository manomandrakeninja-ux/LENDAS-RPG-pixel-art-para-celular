import { SKIN_FRAME } from '../art/skins.js';
import { createHeroAnimations } from './HeroAnimator.js';
import { NPC_SHEETS } from '../art/npcSheets.js';

export const ASSET_CONFIG = {
  grass: {
    kind: 'spritesheet',
    key: 'grass',
    file: 'assets/tiles/grass-sheet.png',
    frameWidth: 48,
    frameHeight: 48
  },
  player: {
    kind: 'spritesheet',
    key: 'player',
    file: 'assets/characters/player-sheet.png',
    frameWidth: SKIN_FRAME.width,
    frameHeight: SKIN_FRAME.height
  },
  playerFemale: {
    kind: 'spritesheet',
    key: 'player-female',
    file: 'assets/characters/player-female-sheet.png',
    frameWidth: SKIN_FRAME.width,
    frameHeight: SKIN_FRAME.height
  },
  ...Object.fromEntries(['swordsman', 'warrior', 'warrior-blue', 'warrior-green', 'warrior-black'].map((id) => [`player-${id}`, {
    kind: 'spritesheet',
    key: `player-${id}`,
    file: `assets/characters/player-${id}-sheet.png`,
    frameWidth: SKIN_FRAME.width,
    frameHeight: SKIN_FRAME.height
  }])),
  // NPCs, animais e mascotes pintados (Fase 20 G-npcs; scripts/bake-npcs.mjs).
  ...Object.fromEntries(Object.entries(NPC_SHEETS).map(([id, info]) => [`npc-${id}`, {
    kind: 'spritesheet',
    key: `npcsheet-${id}`,
    file: `assets/npcs/${id}.png`,
    frameWidth: info.w,
    frameHeight: info.h
  }])),
  livestock: {
    kind: 'spritesheet',
    key: 'livestock',
    file: 'assets/animals/livestock-sheet.png',
    frameWidth: 24,
    frameHeight: 24
  },
  resourceIcons: {
    kind: 'spritesheet',
    key: 'resource-icons',
    file: 'assets/ui/resource-icons.png',
    frameWidth: 16,
    frameHeight: 16
  },
  nature: {
    kind: 'atlas',
    key: 'nature',
    texture: 'assets/nature/nature-atlas.png',
    data: 'assets/nature/nature-atlas.json'
  },
  buildings: {
    kind: 'atlas',
    key: 'buildings',
    texture: 'assets/buildings/camp-atlas.png',
    data: 'assets/buildings/camp-atlas.json'
  },
  panel: {
    kind: 'atlas',
    key: 'panel',
    texture: 'assets/ui/panel-atlas.png',
    data: 'assets/ui/panel-atlas.json'
  },
  vfx: {
    kind: 'atlas',
    key: 'vfx',
    texture: 'assets/vfx/vfx-atlas.png',
    data: 'assets/vfx/vfx-atlas.json'
  }
};

// Fase 20H: pele da interface (scripts/bake-ui.mjs → src/ui-skin/). O Vite empacota pelo new URL.
export const UI_SKIN_IMAGES = {
  'ui-panel': new URL('../ui-skin/panel.png', import.meta.url).href,
  'ui-slot': new URL('../ui-skin/slot.png', import.meta.url).href,
  'ui-icon-heart': new URL('../ui-skin/icon-heart.png', import.meta.url).href,
  'ui-icon-sword': new URL('../ui-skin/icon-sword.png', import.meta.url).href,
  'ui-icon-shield': new URL('../ui-skin/icon-shield.png', import.meta.url).href,
  'ui-icon-coin': new URL('../ui-skin/icon-coin.png', import.meta.url).href,
  'ui-icon-ore': new URL('../ui-skin/icon-ore.png', import.meta.url).href,
  'ui-icon-star': new URL('../ui-skin/icon-star.png', import.meta.url).href,
  'ui-icon-stamina': new URL('../ui-skin/icon-stamina.png', import.meta.url).href,
  'ui-icon-bag': new URL('../ui-skin/icon-bag.png', import.meta.url).href,
  'ui-icon-journal': new URL('../ui-skin/icon-journal.png', import.meta.url).href,
  'ui-icon-food': new URL('../ui-skin/icon-food.png', import.meta.url).href,
  'ui-icon-potion': new URL('../ui-skin/icon-potion.png', import.meta.url).href,
  'ui-icon-compass': new URL('../ui-skin/icon-compass.png', import.meta.url).href
};

export function preloadGameAssets(scene) {
  for (const [key, url] of Object.entries(UI_SKIN_IMAGES)) scene.load.image(key, url);
  for (const asset of Object.values(ASSET_CONFIG)) {
    if (asset.kind === 'spritesheet') {
      scene.load.spritesheet(asset.key, asset.file, {
        frameWidth: asset.frameWidth,
        frameHeight: asset.frameHeight
      });
    } else {
      scene.load.atlas(asset.key, asset.texture, asset.data);
    }
  }
}

export function createGameAnimations(scene) {
  // Herói (todas as skins): folha 12 x 4 do padrão da Fase 22 (src/art/heroRig.js); andar, respirar e piscar.
  for (const prefix of ['player', 'player-female', 'player-swordsman', 'player-warrior', 'player-warrior-blue', 'player-warrior-green', 'player-warrior-black']) {
    createHeroAnimations(scene, prefix);
  }

  for (const [name, start] of [['sheep', 0], ['pig', 4], ['chicken', 8]]) {
    scene.anims.create({
      key: `${name}-walk`,
      frames: scene.anims.generateFrameNumbers('livestock', { frames: [start, start + 1, start + 2, start + 3] }),
      frameRate: name === 'chicken' ? 7 : 5,
      repeat: -1
    });
  }

  const atlasAnimation = (key, texture, frames, frameRate, repeat = -1) => scene.anims.create({
    key,
    frames: frames.map((frame) => ({ key: texture, frame })),
    frameRate,
    repeat
  });
  atlasAnimation('campfire-loop', 'buildings', ['campfire-0', 'campfire-1', 'campfire-2', 'campfire-3'], 9);
  atlasAnimation('campfire-loop-4', 'buildings', ['campfire4-0', 'campfire4-1', 'campfire4-2', 'campfire4-3'], 9);
  atlasAnimation('campfire-loop-8', 'buildings', ['campfire8-0', 'campfire8-1', 'campfire8-2', 'campfire8-3'], 9);
  atlasAnimation('forge-smoke', 'buildings', ['smoke-0', 'smoke-1', 'smoke-2', 'smoke-3'], 5);
  atlasAnimation('pine-sway', 'nature', ['pine-0', 'pine-1', 'pine-2', 'pine-1'], 2);
  atlasAnimation('slash-swing', 'vfx', ['slash-0', 'slash-1', 'slash-2'], 18, 0);
  atlasAnimation('special-ring', 'vfx', ['ring-0', 'ring-1'], 10, 0);
  atlasAnimation('spark-hit', 'vfx', ['spark-0', 'spark-1'], 14, 0);

}
