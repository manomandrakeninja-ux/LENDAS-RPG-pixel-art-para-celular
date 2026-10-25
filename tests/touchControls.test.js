import test from 'node:test';
import assert from 'node:assert/strict';
import { detectTouchMode, stickVector } from '../src/game/TouchControls.js';

const fakeWindow = (search, coarse) => ({
  location: { search },
  matchMedia: () => ({ matches: coarse })
});

test('touch controls turn on for touch screens and can be forced from the URL', () => {
  assert.deepEqual(detectTouchMode(fakeWindow('', true)), { enabled: true, forced: false });
  assert.deepEqual(detectTouchMode(fakeWindow('', false)), { enabled: false, forced: false });
  assert.deepEqual(detectTouchMode(fakeWindow('?toque=1', false)), { enabled: true, forced: true });
  assert.deepEqual(detectTouchMode(fakeWindow('?toque=0', true)), { enabled: false, forced: true });
  assert.deepEqual(detectTouchMode(null), { enabled: false, forced: false });
});

test('joystick ignores tiny movements and caps strength at 1', () => {
  assert.deepEqual(stickVector(0, 0), { x: 0, y: 0, knobX: 0, knobY: 0 });
  const tiny = stickVector(4, 0);
  assert.equal(tiny.x, 0);
  const full = stickVector(200, 0);
  assert.equal(full.x, 1);
  assert.equal(full.y, 0);
  assert.equal(full.knobX, 44, 'o botãozinho do joystick não sai do círculo');
  const half = stickVector(0, -26);
  assert.ok(half.y < -0.4 && half.y > -0.6);
});
