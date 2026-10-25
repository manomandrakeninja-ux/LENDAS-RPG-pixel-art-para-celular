import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY_NIGHT_CONFIG, DAY_NIGHT_TOTAL_SECONDS } from '../src/data/dayNight.js';
import { DayNightCycle, migrateLegacyDayTime } from '../src/game/DayNightCycle.js';

test('day and night use the configured real-time durations', () => {
  assert.equal(DAY_NIGHT_CONFIG.dayDurationSeconds, 240);
  assert.equal(DAY_NIGHT_CONFIG.nightDurationSeconds, 120);
  assert.equal(DAY_NIGHT_TOTAL_SECONDS, 360);
});

test('the warning starts exactly 30 real seconds before night', () => {
  const cycle = new DayNightCycle({ cycleTime: 209.9, dayCount: 1 });
  let state = cycle.getState();

  assert.equal(state.phase, 'day');
  assert.equal(state.warningActive, false);
  assert.equal(state.secondsUntilNight, null);

  cycle.cycleTime = 210;
  state = cycle.getState();
  assert.equal(state.warningActive, true);
  assert.equal(state.secondsUntilNight, 30);

  cycle.cycleTime = 239.9;
  state = cycle.getState();
  assert.equal(state.warningActive, true);
  assert.equal(state.secondsUntilNight, 1);
});

test('night starts at 18:00 and natural dawn increments the survived-day counter', () => {
  const cycle = new DayNightCycle({ cycleTime: 239.9, dayCount: 2 });
  assert.equal(cycle.getState().isNight, false);

  cycle.update(200);
  let state = cycle.getState();
  assert.equal(state.phase, 'night');
  assert.equal(state.isNight, true);
  assert.equal(state.clock, '18:00');

  cycle.cycleTime = DAY_NIGHT_TOTAL_SECONDS - 0.1;
  cycle.update(200);
  state = cycle.getState();
  assert.equal(state.phase, 'day');
  assert.equal(state.clock, '06:00');
  assert.equal(state.dayCount, 3);
});

test('sleeping skips the night, wakes at dawn and increments the day counter', () => {
  const cycle = new DayNightCycle({ cycleTime: 300, dayCount: 4 });
  assert.equal(cycle.getState().isNight, true);

  assert.equal(cycle.skipNight(), true);
  const state = cycle.getState();
  assert.equal(state.phase, 'day');
  assert.equal(state.clock, '06:00');
  assert.equal(state.dayCount, 5);
});

test('legacy normalized time migrates to the new cycle clock', () => {
  const morning = migrateLegacyDayTime(8 / 24);
  assert.ok(Math.abs(morning - 40) < 0.001);

  const midnight = migrateLegacyDayTime(0);
  assert.ok(Math.abs(midnight - 300) < 0.001);
});
