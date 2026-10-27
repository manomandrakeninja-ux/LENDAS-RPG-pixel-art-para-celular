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
    frameWidth: 32,
    frameHeight: 40
  },
  playerFemale: {
    kind: 'spritesheet',
    key: 'player-female',
    file: 'assets/characters/player-female-sheet.png',
    frameWidth: 32,
    frameHeight: 40
  },
  ...Object.fromEntries(['swordsman', 'warrior', 'warrior-blue', 'warrior-green', 'warrior-black'].map((id) => [`player-${id}`, {
    kind: 'spritesheet',
    key: `player-${id}`,
    file: `assets/characters/player-${id}-sheet.png`,
    frameWidth: 32,
    frameHeight: 40
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

export function preloadGameAssets(scene) {
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
  const playerDirections = ['down', 'left', 'right', 'up'];
  // Cavaleiro ('player') e heroína ('player-female'): mesmas animações, uma folha cada.
  for (const prefix of ['player', 'player-female', 'player-swordsman', 'player-warrior', 'player-warrior-blue', 'player-warrior-green', 'player-warrior-black']) {
    playerDirections.forEach((direction, row) => {
      const first = row * 4;
      scene.anims.create({
        key: `${prefix}-walk-${direction}`,
        frames: scene.anims.generateFrameNumbers(prefix, { frames: [first, first + 1, first + 2, first + 3] }),
        frameRate: 9,
        repeat: -1
      });
      scene.anims.create({
        key: `${prefix}-idle-${direction}`,
        frames: [{ key: prefix, frame: first + 1 }],
        frameRate: 1,
        repeat: -1
      });
    });
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
