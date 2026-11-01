import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acceptKey,
  encodeFrame,
  parseFrames,
  sanitizeName,
  sanitizeState,
  createLobby,
  handleClientMessage,
  publicPlayer,
  lanAddresses
} from '../server/lan-server.mjs';
import { nameHue, sanitizeName as sanitizeClientName } from '../src/game/LanSync.js';

test('acceptKey bate com o vetor público do RFC 6455', () => {
  assert.equal(acceptKey('dGhlIHNhbXBsZSBub25jZQ=='), 's3pPLMBiTxaQ9kYGzzhZRbK+xOo=');
});

test('frame: ida e volta com payload curto', () => {
  const frame = encodeFrame('olá');
  const { frames, rest } = parseFrames(frame);
  assert.equal(rest.length, 0);
  assert.equal(frames.length, 1);
  assert.equal(frames[0].opcode, 0x1);
  assert.equal(frames[0].payload.toString('utf8'), 'olá');
});

test('frame: payload de 126+ usa cabeçalho estendido e sobrevive a leitura partida', () => {
  const big = 'x'.repeat(300);
  const frame = encodeFrame(big);
  assert.equal(frame[1], 126);
  // entrega em dois pedaços: a primeira chamada não deve consumir o frame incompleto
  const first = parseFrames(frame.subarray(0, 100));
  assert.equal(first.frames.length, 0);
  assert.ok(first.rest.length > 0);
  const second = parseFrames(Buffer.concat([first.rest, frame.subarray(100)]));
  assert.equal(second.frames.length, 1);
  assert.equal(second.frames[0].payload.toString(), big);
});

test('frame: cliente mascarado é desmascarado corretamente', () => {
  const payload = Buffer.from('mascarado!');
  const mask = Buffer.from([1, 2, 3, 4]);
  const masked = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length; i += 1) masked[i] = payload[i] ^ mask[i & 3];
  const frame = Buffer.concat([Buffer.from([0x81, 0x80 | payload.length]), mask, masked]);
  const { frames } = parseFrames(frame);
  assert.equal(frames[0].payload.toString(), 'mascarado!');
});

test('sanitizeName limpa HTML/controle e limita a 16', () => {
  assert.equal(sanitizeName('<b>Lucas</b>'), 'bLucas/b');
  assert.equal(sanitizeName('  Ana   Maria '), 'Ana Maria');
  assert.equal(sanitizeName(''), 'Viajante');
  assert.equal(sanitizeName('x'.repeat(40)).length, 16);
  assert.equal(sanitizeClientName('<img src=x>'), 'img src=x');
});

test('sanitizeState limita números e devolve padrão para porcaria', () => {
  assert.deepEqual(sanitizeState({ x: 10, y: -5, a: 'walk', hp: 80 }), { x: 10, y: -5, a: 'walk', hp: 80 });
  assert.deepEqual(sanitizeState({ x: 'abc', y: NaN, a: null, hp: 1e9 }), { x: 0, y: 0, a: 'idle', hp: 1e6 });
  assert.ok(sanitizeState({ x: 1e12 }).x <= 1e6);
});

test('lobby: entra, recebe roster, estado é retransmitido só para os outros, sai', () => {
  const lobby = createLobby(2);
  const fakeSocketA = { socket: { write() {} } };
  const fakeSocketB = { socket: { write() {} } };
  const a = lobby.add(fakeSocketA, { name: 'Alice', skin: '12' });
  assert.equal(a.ok, true);
  assert.equal(a.roster.length, 0);
  const b = lobby.add(fakeSocketB, { name: 'Bella' });
  assert.equal(b.roster.length, 1);
  assert.equal(b.roster[0].name, 'Alice');
  // lobby cheio
  const c = lobby.add({ socket: { write() {} } }, { name: 'Caio' });
  assert.equal(c.ok, false);
  // state da Alice chega como broadcast para os outros
  lobby.state(a.player.id, { x: 100, y: 200, a: 'walk', hp: 55 });
  const out = handleClientMessage(lobby, a.player.id, JSON.stringify({ t: 'state', x: 100, y: 200, a: 'walk', hp: 55 }));
  assert.equal(out.length, 1);
  assert.equal(out[0].to, 'others');
  assert.equal(out[0].except, a.player.id);
  assert.deepEqual(out[0].msg, { t: 'state', id: a.player.id, x: 100, y: 200, a: 'walk', hp: 55 });
  // ping volta pong para o próprio remetente
  const pong = handleClientMessage(lobby, a.player.id, JSON.stringify({ t: 'ping', ts: 7 }));
  assert.deepEqual(pong, [{ to: 'sender', msg: { t: 'pong', ts: 7 } }]);
  // lixo não quebra
  assert.deepEqual(handleClientMessage(lobby, a.player.id, 'não é json'), []);
  assert.deepEqual(handleClientMessage(lobby, a.player.id, '{"t":999}'), []);
  assert.deepEqual(handleClientMessage(lobby, 999, '{"t":"state"}'), []);
  // remove e snapshot
  lobby.remove(a.player.id);
  assert.equal(lobby.snapshot().map(publicPlayer).length, 1);
  assert.equal(lobby.snapshot()[0].name, 'Bella');
});

test('nameHue é determinístico e no intervalo de matiz', () => {
  assert.equal(nameHue('Alice'), nameHue('Alice'));
  assert.notEqual(nameHue('Alice'), nameHue('Bella'));
  for (const n of ['a', 'b', 'Viajante', 'Ézio']) {
    const hue = nameHue(n);
    assert.ok(hue >= 0 && hue < 360);
  }
});

test('lanAddresses devolve só ws:// com IPv4 não interno', () => {
  const addresses = lanAddresses(8787);
  assert.ok(Array.isArray(addresses));
  for (const address of addresses) assert.match(address, /^ws:\/\/\d{1,3}(\.\d{1,3}){3}:8787$/);
});
