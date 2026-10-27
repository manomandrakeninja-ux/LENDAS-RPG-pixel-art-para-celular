import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeBackup, encodeBackup, exportSaveCode, importSaveCode, BACKUP_PREFIX } from '../src/game/saveBackup.js';
import { SAVE_KEY_V2, createSaveEnvelope } from '../src/game/save.js';

const fakeStore = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
};
const sample = () => JSON.stringify(createSaveEnvelope({ progression: { level: 42, xp: 7 }, inventory: { items: { madeira: 5 } } }));

test('ida e volta do backup preserva o save', async () => {
  const a = fakeStore({ [SAVE_KEY_V2]: sample() });
  const code = await exportSaveCode(a);
  assert.ok(code.startsWith(BACKUP_PREFIX));
  const b = fakeStore();
  const data = await importSaveCode(`  ${code.slice(0, 20)}\n${code.slice(20)} `, b);
  assert.equal(data.progression.level, 42);
  assert.equal(JSON.parse(b.getItem(SAVE_KEY_V2)).inventory.items.madeira, 5);
});

test('importação rejeita códigos inválidos sem gravar', async () => {
  const b = fakeStore();
  await assert.rejects(importSaveCode('oi', b), /inválido/);
  await assert.rejects(importSaveCode(`${BACKUP_PREFIX}@@@`, b), /corrompido/);
  await assert.rejects(decodeBackup(await encodeBackup('{"a":1}')), /save válido/);
  await assert.rejects(decodeBackup(await encodeBackup('[1]')), /save válido/);
  assert.equal(b.m.size, 0);
  await assert.rejects(exportSaveCode(fakeStore()), /não há save/);
});
