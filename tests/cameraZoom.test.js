import test from 'node:test';
import assert from 'node:assert/strict';
import { ZOOM_LEVELS, zoomFor, viewReach } from '../src/game/cameraZoom.js';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/game/Settings.js';

test('zoom da câmera: padrão normal e valores inválidos voltam ao padrão', () => {
  assert.equal(DEFAULT_SETTINGS.zoom, 'normal');
  assert.equal(normalizeSettings({ zoom: 'far' }).zoom, 'far');
  assert.equal(normalizeSettings({ zoom: 'xyz' }).zoom, 'normal');
});

test('celular em pé 390x844: padrão mostra o herói com ~7-8% da altura', () => {
  const normal = zoomFor('normal', 390, 844);
  const share = (64 * normal) / 844;
  assert.ok(share >= 0.07 && share <= 0.08, `herói ocupa ${share}`);
  const zooms = ZOOM_LEVELS.map((level) => zoomFor(level, 390, 844));
  for (let i = 1; i < zooms.length; i += 1) assert.ok(zooms[i] < zooms[i - 1], `níveis em ordem: ${zooms}`);
});

test('PC 1280x800: padrão perto do atual (2) e níveis em passos de 0,25', () => {
  const zooms = ZOOM_LEVELS.map((level) => zoomFor(level, 1280, 800));
  assert.ok(zooms[1] >= 1.5 && zooms[1] <= 2, `normal ${zooms[1]}`);
  for (const z of zooms) assert.equal(z * 4, Math.round(z * 4));
  for (let i = 1; i < zooms.length; i += 1) assert.ok(zooms[i] < zooms[i - 1]);
});

test('alcance da vista cresce quando a câmera se afasta', () => {
  assert.ok(viewReach(390, 844, 0.5) > viewReach(390, 844, 1));
});
