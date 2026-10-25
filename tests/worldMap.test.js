import test from 'node:test';
import assert from 'node:assert/strict';
import { collectWorldMapMarkers } from '../src/game/WorldMapOverlay.js';
import { WORLD } from '../src/game/config.js';

test('world map includes only discovered collection structures and uncollected chests', () => {
  const markers = collectWorldMapMarkers({
    structures: [
      { type: 'tree', x: 100, y: 120, discovered: true },
      { type: 'rock', x: 200, y: 220, discovered: false },
      { type: 'chest', x: 300, y: 320, discovered: true, collected: false },
      { type: 'chest', x: 400, y: 420, discovered: true, collected: true }
    ],
    enemies: [],
    player: { x: 500, y: 600 }
  });

  assert.equal(markers.camp.x, WORLD.camp.x);
  assert.equal(markers.camp.y, WORLD.camp.y);
  assert.equal(markers.structures.length, 1);
  assert.equal(markers.structures[0].structureType, 'tree');
  assert.equal(markers.chests.length, 1);
  assert.equal(markers.chests[0].x, 300);
  assert.equal(markers.player.x, 500);
});

test('world map marks elite and boss enemies as strong enemies only', () => {
  const markers = collectWorldMapMarkers({
    structures: [],
    enemies: [
      { x: 10, y: 20, isElite: false },
      { x: 30, y: 40, isElite: true },
      { x: 50, y: 60, isBoss: true }
    ],
    player: null
  });

  assert.equal(markers.strongEnemies.length, 2);
  assert.deepEqual(markers.strongEnemies.map((marker) => marker.x), [30, 50]);
  assert.equal(markers.player, null);
});
