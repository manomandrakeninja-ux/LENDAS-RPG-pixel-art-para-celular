import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioManager, musicTheme, nightFreq } from '../src/game/Audio.js';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/game/Settings.js';

test('cada região tem tema próprio e regiões desconhecidas caem no do Vale', () => {
  const names = ['vale', 'floresta', 'brejo', 'ilha', 'picos', 'deserto', 'brasa', 'abismo', 'caverna'];
  const themes = names.map((name) => JSON.stringify(musicTheme(name)));
  assert.equal(new Set(themes).size, names.length);
  assert.equal(JSON.stringify(musicTheme('xyz')), JSON.stringify(musicTheme('vale')));
  for (const name of names) assert.ok(musicTheme(name).notes.some((n) => n !== null));
});

test('chaves reais de região do mundo caem no tema certo (não tudo no Vale)', () => {
  // regionAt/regionOf devolvem estas chaves; antes o substring match deixava 5 temas inalcançáveis.
  assert.equal(musicTheme('antiga').root, musicTheme('floresta').root);
  assert.equal(musicTheme('gelo').root, musicTheme('picos').root);
  assert.equal(musicTheme('areia').root, musicTheme('deserto').root);
  assert.equal(musicTheme('esmeralda').root, musicTheme('ilha').root);
  assert.equal(musicTheme('mar').root, musicTheme('ilha').root);
  assert.equal(musicTheme('brasa').root, musicTheme('brasa').root);
  assert.notEqual(musicTheme('antiga').root, musicTheme('vale').root);
  assert.notEqual(musicTheme('gelo').root, musicTheme('vale').root);
  assert.notEqual(musicTheme('areia').root, musicTheme('vale').root);
  assert.notEqual(musicTheme('esmeralda').root, musicTheme('vale').root);
});

test('cada tema tem 16 passos (duas frases por volta)', () => {
  for (const name of ['vale', 'floresta', 'brejo', 'ilha', 'picos', 'deserto', 'brasa', 'abismo', 'caverna']) {
    assert.equal(musicTheme(name).notes.length, 16, name);
  }
});

test('sem AudioContext (testes/headless) nada toca nem quebra', () => {
  const audio = new AudioManager();
  for (const fx of ['playSwing', 'playCoin', 'playLevelUp', 'playHit', 'playDeath', 'playChest', 'playCraft', 'playDodge', 'playBlock', 'playAchievement']) assert.doesNotThrow(() => audio[fx]());
  assert.doesNotThrow(() => audio.playEnhance(false));
  assert.doesNotThrow(() => audio.playMusic('vale'));
  assert.equal(audio.music, null);
});

test('modo noturno desce 2 semitons e volta ao dia (nightFreq/setNight)', () => {
  assert.equal(nightFreq(261.6, 0, false), 261.6);
  assert.ok(Math.abs(nightFreq(261.6, 0, true) - 261.6 * 2 ** (-2 / 12)) < 1e-9);
  assert.ok(nightFreq(261.6, 7, true) < nightFreq(261.6, 7, false));
  const audio = new AudioManager();
  assert.equal(audio.night, false);
  audio.setNight(true);
  assert.equal(audio.night, true);
  audio.setNight(false);
  assert.equal(audio.night, false);
});

test('música nos ajustes: padrão ligada e valor inválido volta ao padrão', () => {
  assert.equal(DEFAULT_SETTINGS.music, true);
  assert.equal(normalizeSettings({ music: false }).music, false);
  assert.equal(normalizeSettings({ music: 'x' }).music, true);
});
