import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { createReviewServer } from './server.mjs';

test('servidor: fronteiras, validação, histórico e concorrência', async t => {
  const root = await mkdtemp(path.join(import.meta.dirname, '.test-'));
  const reviewRoot = path.join(root, 'review'), publicRoot = path.join(root, 'public');
  await mkdir(reviewRoot); await mkdir(publicRoot);
  await writeFile(path.join(reviewRoot, 'approvals.json'), JSON.stringify({ schemaVersion: 1, history: [] }));
  await writeFile(path.join(publicRoot, 'asset.png'), 'asset');
  await writeFile(path.join(root, 'secret.txt'), 'secret');
  const server = createReviewServer({ reviewRoot, publicRoot });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(root, { recursive: true, force: true }); });
  const port = server.address().port, origin = `http://127.0.0.1:${port}`;
  function request(url, { method = 'GET', body, headers = {} } = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request({ hostname: '127.0.0.1', port, path: url, method, headers }, res => { let text = ''; res.on('data', b => text += b); res.on('end', () => resolve({ status: res.statusCode, text })); });
      req.on('error', reject); req.end(body);
    });
  }
  assert.equal((await request('/api/proposals')).text, '[]');
  const proposal = { id: 'hero', version: 'v1', name: 'Herói', category: 'personagem', level: '1', date: '2026-11-01', original: '/public/asset.png', proposed: '/art-review/new.png', description: 'Teste', report: 'Relatório textual' };
  await writeFile(path.join(reviewRoot, 'proposals.json'), JSON.stringify([proposal]));
  const mutate = (data, extra = {}) => request('/api/approvals', { method: 'POST', body: JSON.stringify(data), headers: { Origin: origin, 'Content-Type': 'application/json', ...extra } });
  const decision = { id: 'hero', version: 'v1', status: 'approved', note: 'Ótimo' };
  assert.equal((await mutate(decision, { Origin: 'http://evil.test' })).status, 403);
  assert.equal((await mutate({ ...decision, id: 'unknown' })).status, 404);
  assert.equal((await mutate({ ...decision, version: 'v2' })).status, 404);
  assert.equal((await mutate({ ...decision, status: 'invalid' })).status, 400);
  assert.equal((await mutate({ ...decision, note: 'x'.repeat(17000) })).status, 413);
  const results = await Promise.all(['approved', 'rejected', 'revision', 'pending'].map(status => mutate({ ...decision, status })));
  assert.ok(results.every(r => r.status === 200));
  const data = JSON.parse(await readFile(path.join(reviewRoot, 'approvals.json'), 'utf8'));
  assert.equal(data.history.length, 4); assert.ok(data.history.every(e => e.date && e.note === 'Ótimo'));
  assert.equal((await request('/public/asset.png')).text, 'asset');
  for (const url of ['/public/../secret.txt', '/public/%2e%2e/secret.txt', '/public/%252e%252e/secret.txt', '/public/%2e%2e%5csecret.txt', '/public/C:/secret.txt', '/art-review/server.mjs', '/secret.txt', '/public/.hidden']) assert.ok((await request(url)).status >= 400, url);
  assert.equal((await request('/api/proposals', { headers: { Host: 'evil.test' } })).status, 403);
  await t.test('junction externa bloqueada', async st => {
    try { await symlink(root, path.join(publicRoot, 'escape'), 'junction'); }
    catch (e) { if (e.code === 'EPERM') { st.skip('Sistema não permite criar links'); return; } throw e; }
    assert.equal((await request('/public/escape/secret.txt')).status, 403);
  });
});
