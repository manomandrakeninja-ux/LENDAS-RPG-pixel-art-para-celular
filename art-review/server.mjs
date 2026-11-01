import http from 'node:http';
import { readFile, writeFile, rename, realpath, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
const statuses = new Set(['pending', 'approved', 'rejected', 'revision']);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };
const fail = (status, message) => Object.assign(new Error(message), { status });
const inside = (root, target) => { const rel = path.relative(root, target); return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel)); };

// Reject symlinks/junctions at every segment, then verify the canonical boundary.
async function safePath(root, relative) {
  const base = await realpath(root);
  let target = root;
  for (const part of relative.split('/').filter(Boolean)) {
    if (part === '.' || part === '..' || part.includes(':') || part.includes('\\')) throw fail(403, 'Caminho proibido');
    target = path.join(target, part);
    if ((await lstat(target)).isSymbolicLink()) throw fail(403, 'Links não são permitidos');
  }
  const actual = await realpath(target);
  if (!inside(base, actual)) throw fail(403, 'Caminho proibido');
  return actual;
}
function assetURL(value) {
  return typeof value === 'string' && /^\/(art-review|public)\//.test(value) && !/[\\\x00-\x1f]/.test(value) && !value.includes('..');
}
export function createReviewServer({ reviewRoot = here, publicRoot = path.resolve(here, '../public') } = {}) {
  let queue = Promise.resolve();
  async function proposals() {
    let list;
    try { list = JSON.parse(await readFile(await safePath(reviewRoot, 'proposals.json'), 'utf8')); }
    catch (e) { if (e.code === 'ENOENT') return []; throw e; }
    if (!Array.isArray(list)) throw fail(500, 'proposals.json deve ser um array');
    const keys = new Set();
    for (const p of list) {
      if (!p || !['id', 'version', 'name', 'category', 'level', 'date', 'description', 'report'].every(k => typeof p[k] === 'string') || !p.id || !p.version || !assetURL(p.original) || !assetURL(p.proposed) || (p.preview !== undefined && !assetURL(p.preview))) throw fail(500, 'Schema inválido em proposals.json');
      const key = JSON.stringify([p.id, p.version]);
      if (keys.has(key)) throw fail(500, 'id+version duplicado');
      keys.add(key);
    }
    return list;
  }
  async function approvals() {
    const data = JSON.parse(await readFile(await safePath(reviewRoot, 'approvals.json'), 'utf8'));
    if (data.schemaVersion !== 1 || !Array.isArray(data.history)) throw fail(500, 'Histórico inválido');
    return data;
  }
  return http.createServer(async (req, res) => {
    const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const expectedHost = `127.0.0.1:${req.socket.localPort}`;
      if (req.headers.host !== expectedHost) throw fail(403, 'Host inválido: use 127.0.0.1');
      const raw = req.url.split('?')[0];
      let route;
      try { route = decodeURIComponent(raw); } catch { throw fail(400, 'URL inválida'); }
      if (/[\\\x00-\x1f%]/.test(route) || route.split('/').some(p => p === '..' || p === '.')) throw fail(403, 'Caminho proibido');
      if (route === '/api/approvals' && req.method === 'POST') {
        if (req.headers.origin !== `http://${expectedHost}` || (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin')) throw fail(403, 'Origem inválida');
        if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) throw fail(415, 'Envie application/json');
        if (Number(req.headers['content-length']) > 16384) throw fail(413, 'Limite de 16KB');
        const chunks = []; let size = 0;
        for await (const chunk of req) { size += chunk.length; if (size > 16384) throw fail(413, 'Limite de 16KB'); chunks.push(chunk); }
        let input; try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw fail(400, 'JSON inválido'); }
        if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !['id', 'version', 'status', 'note'].includes(k)) || typeof input.id !== 'string' || typeof input.version !== 'string' || !statuses.has(input.status) || typeof input.note !== 'string' || input.note.length > 8000 || input.id.length > 200 || input.version.length > 200) throw fail(400, 'Decisão inválida');
        const operation = queue.then(async () => {
          if (!(await proposals()).some(p => p.id === input.id && p.version === input.version)) throw fail(404, 'Proposta desconhecida');
          const data = await approvals();
          data.history.push({ ...input, date: new Date().toISOString() });
          const target = await safePath(reviewRoot, 'approvals.json');
          const temp = path.join(reviewRoot, `.approvals-${randomUUID()}.tmp`);
          await writeFile(temp, JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
          await rename(temp, target);
          return data;
        });
        queue = operation.catch(() => {});
        send(200, await operation); return;
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') throw fail(405, 'Método não permitido');
      if (route === '/api/proposals') { send(200, await proposals()); return; }
      if (route === '/api/approvals') { send(200, await approvals()); return; }
      if (route === '/') route = '/art-review/index.html';
      const match = /^\/(art-review|public)\/(.+)$/.exec(route);
      if (!match) throw fail(404, 'Não encontrado');
      const relative = match[2];
      if (relative.split('/').some(p => p.startsWith('.')) || !mime[path.extname(relative).toLowerCase()]) throw fail(403, 'Arquivo não permitido');
      const target = await safePath(match[1] === 'public' ? publicRoot : reviewRoot, relative);
      if (!(await lstat(target)).isFile()) throw fail(404, 'Não encontrado');
      const bytes = await readFile(target);
      res.writeHead(200, { 'Content-Type': mime[path.extname(target).toLowerCase()], 'Content-Length': bytes.length });
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch (e) { send(e.status || (e.code === 'ENOENT' ? 404 : 500), { error: e.status ? e.message : 'Não foi possível ler ou salvar os dados' }); }
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createReviewServer().listen(4180, '127.0.0.1', () => console.log('LENDAS VISUAL STUDIO: http://127.0.0.1:4180'));
}
