import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioManager, musicTheme } from '../src/game/Audio.js';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/game/Settings.js';

test('cada região tem tema próprio e regiões desconhecidas caem no do Vale', () => {
  const names = ['vale', 'floresta', 'brejo', 'ilha', 'picos', 'deserto', 'brasa', 'abismo', 'caverna'];
  const themes = names.map((name) => JSON.stringify(musicTheme(name)));
  assert.equal(new Set(themes).size, names.length);
  assert.equal(JSON.stringify(musicTheme('xyz')), JSON.stringify(musicTheme('vale')));
  for (const name of names) assert.ok(musicTheme(name).notes.some((n) => n !== null));
});

test('sem AudioContext (testes/headless) nada toca nem quebra', () => {
  const audio = new AudioManager();
  for (const fx of ['playSwing', 'playCoin', 'playLevelUp', 'playHit', 'playDeath']) assert.doesNotThrow(() => audio[fx]());
  assert.doesNotThrow(() => audio.playEnhance(false));
  assert.doesNotThrow(() => audio.playMusic('vale'));
  assert.equal(audio.music, null);
});

test('música nos ajustes: padrão ligada e valor inválido volta ao padrão', () => {
  assert.equal(DEFAULT_SETTINGS.music, true);
  assert.equal(normalizeSettings({ music: false }).music, false);
  assert.equal(normalizeSettings({ music: 'x' }).music, true);
});
