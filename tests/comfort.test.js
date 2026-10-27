import test from 'node:test';
import assert from 'node:assert/strict';
import { isNewbieProtected, shouldShowWardTip, NEWBIE_MAX_LEVEL } from '../src/game/NewbieProtection.js';
import {
  DEFAULT_KEYBINDS, actionForCode, keyCodeFor, keyLabel, loadKeybinds, normalizeKeybinds, rebind, saveKeybinds
} from '../src/game/Keybinds.js';
import { collectEffects, formatRemaining } from '../src/game/ActiveEffects.js';
import { regionCard, regionCardAt } from '../src/game/RegionCard.js';
import { DEFAULT_SETTINGS, STICK_SIZES, normalizeSettings } from '../src/game/Settings.js';
import { CAVES } from '../src/data/worldRegions.js';

test('newbie protection ends after level 5 and the tip shows once at level 6', () => {
  assert.equal(NEWBIE_MAX_LEVEL, 5);
  for (const level of [1, 3, 5]) assert.equal(isNewbieProtected(level), true);
  for (const level of [6, 20, 150]) assert.equal(isNewbieProtected(level), false);
  assert.equal(shouldShowWardTip(5, 6), true);
  assert.equal(shouldShowWardTip(4, 6), true);
  assert.equal(shouldShowWardTip(6, 7), false);
  assert.equal(shouldShowWardTip(3, 4), false);
});

test('keybinds: defaults match the old keys, rebinding rejects conflicts and reserved keys', () => {
  assert.deepEqual({ ...DEFAULT_KEYBINDS }, { attack: 'KeyJ', special: 'KeyQ', dodge: 'Space', interact: 'KeyE', potion: 'Digit1' });
  assert.equal(actionForCode(DEFAULT_KEYBINDS, 'KeyJ'), 'attack');
  assert.equal(actionForCode(DEFAULT_KEYBINDS, 'KeyZ'), null);
  const ok = rebind(DEFAULT_KEYBINDS, 'attack', 'KeyZ');
  assert.equal(ok.ok, true);
  assert.equal(actionForCode(ok.binds, 'KeyZ'), 'attack');
  assert.equal(actionForCode(ok.binds, 'KeyJ'), null);
  assert.equal(rebind(DEFAULT_KEYBINDS, 'attack', 'KeyQ').ok, false); // já é o especial
  assert.equal(rebind(DEFAULT_KEYBINDS, 'attack', 'KeyW').ok, false); // movimento
  assert.equal(rebind(DEFAULT_KEYBINDS, 'attack', 'KeyM').ok, false); // mapa
  assert.equal(rebind(DEFAULT_KEYBINDS, 'attack', 'F5').ok, false);
  assert.equal(keyCodeFor('Space'), 32);
  assert.equal(keyCodeFor('KeyZ'), 90);
  assert.equal(keyCodeFor('Digit1'), 49);
  assert.equal(keyLabel('Space'), 'ESPAÇO');
});

test('keybinds: invalid or colliding saved data falls back to defaults and persists', () => {
  assert.deepEqual(normalizeKeybinds({ attack: 'KeyW' }), { ...DEFAULT_KEYBINDS });
  assert.deepEqual(normalizeKeybinds({ attack: 'KeyQ' }), { ...DEFAULT_KEYBINDS });
  assert.equal(normalizeKeybinds({ attack: 'KeyX' }).attack, 'KeyX');
  const data = {};
  const store = { getItem: (key) => data[key] ?? null, setItem: (key, value) => { data[key] = value; } };
  assert.deepEqual(loadKeybinds(store), { ...DEFAULT_KEYBINDS });
  saveKeybinds({ ...DEFAULT_KEYBINDS, dodge: 'ShiftLeft' }, store);
  assert.equal(loadKeybinds(store).dodge, 'ShiftLeft');
});

test('active effects: buffs, blessing, paralysis and hunt with remaining time', () => {
  assert.equal(formatRemaining(65000), '1:05');
  assert.equal(formatRemaining(4200), '5s');
  assert.equal(formatRemaining(null), '');
  assert.deepEqual(collectEffects(), []);
  const effects = collectEffects({
    buffs: [
      { id: 'elixir', name: 'Elixir de Força', remainingMs: 120000, untilDay: null },
      { id: 'dailyAttack', name: 'Bênção: Ataque', remainingMs: null, untilDay: 3 },
      { id: 'inexistente', remainingMs: 1, untilDay: null }
    ],
    blessed: true,
    paralyzedMs: 800,
    hunt: { progress: '3/8', label: 'Caçada: Lobo 3/8' },
    dayCount: 3
  });
  assert.deepEqual(effects.map((effect) => effect.id), ['paralysis', 'elixir', 'dailyAttack', 'blessing', 'hunt']);
  assert.equal(effects[1].time, '2:00');
  assert.equal(effects[2].time, 'hoje');
  assert.ok(effects.every((effect) => effect.description.length > 5 && effect.icon));
});

test('region card lists level range, monsters, caves and docks', () => {
  const forest = regionCard('antiga');
  assert.equal(forest.name, 'Floresta Antiga');
  assert.equal(forest.levels, '12-30');
  assert.ok(forest.monsters.includes('Goblin'));
  assert.ok(forest.caves.includes('Toca dos Orcs'));
  assert.deepEqual(regionCard('brejo').docks, ['Porto do Brejo']);
  assert.ok(regionCard('vale').monsters.length > 0);
  assert.equal(regionCard('mar'), null);
  assert.equal(regionCardAt(1440, 1080).region, 'vale');
  for (const cave of CAVES) assert.ok(regionCard(cave.region).caves.includes(cave.name));
});

test('joystick settings: three sizes, two sides, invalid values fall back', () => {
  assert.equal(DEFAULT_SETTINGS.stickSize, 'medium');
  assert.equal(DEFAULT_SETTINGS.stickSide, 'left');
  assert.deepEqual(Object.keys(STICK_SIZES), ['small', 'medium', 'large']);
  assert.ok(STICK_SIZES.small.base < STICK_SIZES.medium.base && STICK_SIZES.medium.base < STICK_SIZES.large.base);
  const value = normalizeSettings({ stickSize: 'large', stickSide: 'right' });
  assert.equal(value.stickSize, 'large');
  assert.equal(value.stickSide, 'right');
  assert.equal(normalizeSettings({ stickSize: 'giant', stickSide: 'up' }).stickSize, 'medium');
});
