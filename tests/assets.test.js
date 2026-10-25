import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSET_CONFIG } from '../src/game/assets.js';
import { ENEMY_TYPES } from '../src/data/enemies.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'public');

const REQUIRED_ATLAS_FRAMES = {
  nature: [
    'pine-0', 'pine-1', 'pine-2', 'autumn-tree', 'bush',
    'resource-wood', 'resource-stone', 'resource-herbs',
    'resource-moonherb', 'resource-ectoplasm', 'death-backpack',
    'detail-grass', 'detail-flowers', 'detail-pebbles', 'detail-leaves', 'detail-mushroom'
  ],
  buildings: [
    'house', 'forge', 'farm', 'store',
    'campfire-0', 'campfire-1', 'campfire-2', 'campfire-3',
    'smoke-0', 'smoke-1', 'smoke-2', 'smoke-3', 'fence', 'lamp', 'warm-glow'
  ],
  panel: ['panel'],
  vfx: [
    'slash-0', 'slash-1', 'slash-2',
    'spark-0', 'spark-1', 'ember-0', 'ember-1',
    'leaf-0', 'leaf-1', 'dust-0', 'dust-1',
    'firefly-0', 'firefly-1', 'ring-0', 'ring-1', 'fog-dither'
  ]
};

function pngSize(relativePath) {
  const filePath = path.isAbsolute(relativePath) ? relativePath : path.join(root, relativePath);
  const png = fs.readFileSync(filePath);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

test('centralized sprite sheets match their declared frame dimensions', () => {
  for (const asset of Object.values(ASSET_CONFIG).filter(({ kind }) => kind === 'spritesheet')) {
    const file = asset.file.replace(/^\//, '');
    const size = pngSize(path.join('public', file));
    assert.equal(size.width % asset.frameWidth, 0, `${file} width should contain whole frames`);
    assert.equal(size.height % asset.frameHeight, 0, `${file} height should contain whole frames`);
  }
});

test('atlas PNG files and metadata use the same named frames', () => {
  for (const asset of Object.values(ASSET_CONFIG).filter(({ kind }) => kind === 'atlas')) {
    const dataFile = asset.data.replace(/^\//, '');
    const atlas = JSON.parse(fs.readFileSync(path.join(publicRoot, dataFile), 'utf8'));
    const textureFile = path.join(path.dirname(dataFile), atlas.meta.image);
    const textureSize = pngSize(path.join(publicRoot, textureFile));
    assert.deepEqual(atlas.meta.size, { w: textureSize.width, h: textureSize.height });
    assert.ok(Object.keys(atlas.frames).length > 0, `${dataFile} should define frames`);

    for (const requiredFrame of REQUIRED_ATLAS_FRAMES[asset.key] ?? []) {
      assert.ok(atlas.frames[requiredFrame], `${dataFile} should define ${requiredFrame}`);
    }

    for (const [name, definition] of Object.entries(atlas.frames)) {
      const frame = definition.frame;
      assert.ok(frame.x >= 0 && frame.y >= 0, `${name} should start inside the atlas`);
      assert.ok(frame.x + frame.w <= textureSize.width, `${name} should fit the atlas width`);
      assert.ok(frame.y + frame.h <= textureSize.height, `${name} should fit the atlas height`);
    }
  }
});

test('enemy placeholders use canvas silhouettes instead of an external atlas', () => {
  const expectedShapes = {
    slime: 'slime',
    wolf: 'wolf',
    boar: 'boar',
    skeleton: 'skeleton',
    ghost: 'ghost',
    spider: 'spider',
    werewolf: 'werewolf'
  };

  // Tamanho do desenho (px): normal e elite. Os monstros redesenhados são maiores.
  const expectedSizes = { slime: [32, 40], wolf: [44, 52], boar: [44, 52], skeleton: [40, 48], ghost: [32, 40], spider: [40, 48], werewolf: [40, 48] };
  for (const [kind, definition] of Object.entries(ENEMY_TYPES)) {
    assert.equal(definition.placeholder.shape, expectedShapes[kind], `${kind} canvas silhouette`);
    assert.equal(definition.placeholder.size, expectedSizes[kind][0], `${kind} normal canvas size`);
    assert.equal(definition.placeholder.eliteSize, expectedSizes[kind][1], `${kind} elite canvas size`);
    assert.match(definition.placeholder.color, /^#[0-9a-f]{6}$/i, `${kind} silhouette color`);
  }

  assert.equal(ASSET_CONFIG.enemies, undefined);
  assert.equal(ASSET_CONFIG.creatures, undefined);
  assert.equal(fs.existsSync(path.join(publicRoot, 'assets/enemies/enemy-atlas.json')), false);
  assert.equal(fs.existsSync(path.join(publicRoot, 'assets/enemies/enemy-atlas.png')), false);
  assert.equal(fs.existsSync(path.join(publicRoot, 'assets/animals/creatures-sheet.png')), false);
});
