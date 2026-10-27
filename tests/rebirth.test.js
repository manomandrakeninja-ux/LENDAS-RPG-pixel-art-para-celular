import test from 'node:test';
import assert from 'node:assert/strict';
import { Arena, arenaReward, arenaWave, canRebirth, rebirthMultiplier } from '../src/data/rebirth.js';
import { PlayerProgression } from '../src/data/progression.js';

test('renascimento: +5% por vez, máximo de 10', () => {
  assert.equal(rebirthMultiplier(0), 1);
  assert.equal(rebirthMultiplier(2), 1.1);
  assert.equal(rebirthMultiplier(99), 1.5);
  assert.equal(canRebirth(149, 0), false);
  assert.equal(canRebirth(150, 0), true);
  assert.equal(canRebirth(150, 10), false);
});

test('renascer volta ao nível 1, conta e dá bônus de vida e XP; save guarda', () => {
  const p = new PlayerProgression({ level: 150 });
  assert.equal(p.rebirth().ok, true);
  assert.equal(p.level, 1);
  assert.equal(p.rebirths, 1);
  assert.equal(p.rebirth().ok, false);
  assert.equal(p.maxHealth, Math.round(100 * 1.05));
  const gained = p.addXp(100).gained;
  assert.equal(gained, 105);
  const again = new PlayerProgression(p.serialize());
  assert.equal(again.rebirths, 1);
  assert.equal(new PlayerProgression({ level: 5 }).rebirths, 0);
});

test('arena: ondas mais fortes, recorde e recompensa a cada 5', () => {
  assert.equal(arenaWave(1, 10).length, 1);
  assert.ok(arenaWave(6, 10).length >= 2);
  assert.ok(arenaWave(10, 10)[0].health > arenaWave(1, 10)[0].health);
  assert.equal(arenaReward(4), null);
  assert.ok(arenaReward(5).coins > 0);
  const a = new Arena({ record: 3 });
  a.start();
  a.clear();
  assert.equal(a.record, 3);
  a.nextWave(); a.nextWave(); a.nextWave(); a.clear();
  assert.equal(a.record, 4);
  assert.equal(new Arena(a.serialize()).record, 4);
});
