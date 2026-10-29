import assert from 'node:assert/strict';
import test from 'node:test';
import { GRAPHICS_MODES, GRAPHICS_PROFILES, frameStats, graphicsProfile, suggestGraphicsMode } from '../src/game/graphics.js';
import { DEFAULT_SETTINGS, loadSettings, normalizeSettings, saveSettings } from '../src/game/Settings.js';

test('os 3 modos existem e ficam do mais pesado para o mais leve', () => {
  assert.deepEqual([...GRAPHICS_MODES], ['high', 'balanced', 'light']);
  const [high, balanced, light] = GRAPHICS_MODES.map((mode) => GRAPHICS_PROFILES[mode]);
  assert.equal(high.renderScale, 1);
  assert.equal(high.lightSimple, false);
  assert.equal(high.backgroundAnimations, true);
  assert.equal(light.renderScale, 0.75);
  assert.equal(light.lightSimple, true);
  assert.equal(light.simpleShadows, true);
  assert.equal(light.backgroundAnimations, false);
  for (const key of ['particleScale', 'rainDrops', 'enemyLimitScale']) {
    assert.ok(high[key] > balanced[key] && balanced[key] > light[key], key);
  }
  assert.ok(light.lightInterval > balanced.lightInterval && balanced.lightInterval > high.lightInterval);
  assert.equal(graphicsProfile('invalido'), GRAPHICS_PROFILES.high);
});

test('sugestão automática usa núcleos, memória e fps medido', () => {
  assert.equal(suggestGraphicsMode({ cores: 8, memory: 8, fps: 60 }), 'high');
  assert.equal(suggestGraphicsMode({ cores: 8, memory: 8 }), 'high');
  assert.equal(suggestGraphicsMode({ cores: 4, memory: 2, fps: 25 }), 'light');
  assert.equal(suggestGraphicsMode({ cores: 8, memory: 4, fps: 38 }), 'balanced');
  assert.equal(suggestGraphicsMode({ cores: 4, memory: 4, fps: 58 }), 'high');
  assert.equal(suggestGraphicsMode({ cores: 8, memory: 8, fps: 20 }), 'light');
  assert.equal(suggestGraphicsMode({}), 'high');
});

test('frameStats dá fps médio e p95', () => {
  const stats = frameStats(Array(100).fill(20));
  assert.ok(Math.abs(stats.fps - 50) < 0.001);
  assert.equal(stats.p95, 20);
  assert.deepEqual(frameStats([]), { fps: 0, p95: 0 });
});

test('a escolha do modo gráfico fica salva e valores inválidos voltam ao padrão', () => {
  assert.equal(DEFAULT_SETTINGS.graphics, 'high');
  assert.equal(DEFAULT_SETTINGS.graphicsChosen, false);
  assert.equal(normalizeSettings({ graphics: 'ultra' }).graphics, 'high');
  assert.equal(normalizeSettings({ graphics: 'light', fpsCap30: true, fpsCounter: true }).fpsCap30, true);
  const data = new Map();
  const store = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  saveSettings({ ...DEFAULT_SETTINGS, graphics: 'light', graphicsChosen: true, fpsCounter: true }, store);
  const loaded = loadSettings(store);
  assert.equal(loaded.graphics, 'light');
  assert.equal(loaded.graphicsChosen, true);
  assert.equal(loaded.fpsCounter, true);
});
