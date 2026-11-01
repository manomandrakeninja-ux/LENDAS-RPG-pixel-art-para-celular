import test from 'node:test';
import assert from 'node:assert/strict';
import { Companions, MOUNT_LEVEL, MOUNT_SPEED, PETS, petAbility } from '../src/data/companions.js';

test('compra desconta o preço e falha sem moedas ou repetida', () => {
  const c = new Companions();
  assert.equal(c.buy('wolfpup', 100).ok, false);
  const r = c.buy('wolfpup', 600);
  assert.ok(r.ok && r.cost === PETS.wolfpup.price);
  assert.equal(c.active, 'wolfpup');
  assert.equal(c.buy('wolfpup', 9999).ok, false);
  assert.equal(c.buy('dragonling', 9999).ok, false);
});

test('ovo: chance, choca mascote de ovo sem repetir', () => {
  const c = new Companions();
  assert.equal(c.rollEgg(() => 0.9), false);
  assert.equal(c.rollEgg(() => 0.1), true);
  assert.equal(c.eggs, 1);
  const h = c.hatch(() => 0);
  assert.ok(h.ok && PETS[h.id].egg && c.eggs === 0);
  c.eggs = 2;
  assert.notEqual(c.hatch(() => 0).id, h.id);
  assert.equal(c.hatch().ok, false);
  assert.equal(c.rollEgg(() => 0), false);
});

test('montaria: só no nível 20, +35%, desmonta ao levar dano', () => {
  const c = new Companions();
  assert.equal(c.toggleMount(MOUNT_LEVEL - 1).ok, false);
  assert.ok(c.toggleMount(MOUNT_LEVEL).ok);
  assert.equal(c.speedMultiplier(MOUNT_LEVEL), MOUNT_SPEED);
  assert.equal(c.onDamaged(), true);
  assert.equal(c.mounted, false);
  assert.equal(c.speedMultiplier(MOUNT_LEVEL), 1);
});

test('save ida e volta e saves inválidos/antigos', () => {
  const c = new Companions();
  c.buy('fairy', 1000);
  c.eggs = 3;
  c.mounted = true;
  assert.deepEqual(new Companions(c.serialize()).serialize(), c.serialize());
  const empty = new Companions(undefined);
  assert.deepEqual(empty.serialize(), { owned: [], active: null, eggs: 0, mounted: false, command: 'active', waitPoint: null });
  assert.equal(new Companions({ owned: ['x', 'fairy'], active: 'wolfpup' }).active, null);
  assert.ok(petAbility('magpie') && petAbility('phoenix').power > 0);
});

test('comando do mascote: agrupar (X) e esperar aqui (X segurado), com save', () => {
  const c = new Companions();
  assert.equal(c.command, 'active');
  const w = c.waitHere(100, 200);
  assert.ok(w.ok && c.command === 'wait' && c.waitPoint.x === 100 && c.waitPoint.y === 200);
  const r = c.rally();
  assert.ok(r.ok && c.command === 'active' && c.waitPoint === null);
  // Ida e volta pelo save preserva o comando.
  c.waitHere(50, 60);
  const restored = new Companions(c.serialize());
  assert.equal(restored.command, 'wait');
  assert.deepEqual(restored.waitPoint, { x: 50, y: 60 });
  // Save com waitPoint inválido: comando vale, ponto cai para null; sem command cai no padrão 'active'.
  const bad = new Companions({ owned: [], command: 'wait', waitPoint: { x: NaN, y: 1 } });
  assert.equal(bad.command, 'wait');
  assert.equal(bad.waitPoint, null);
  assert.equal(new Companions({ owned: [] }).command, 'active');
});
