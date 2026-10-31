// Servidor LAN do LENDAS — WebSocket puro (RFC 6455) com node:http + node:crypto.
// Zero dependências: roda com `npm run lan` (ou LENDAS-LAN.bat) no dispositivo que hospeda.
// Os outros dispositivos da mesma rede entram pelo IP impresso no console (ex.: ws://192.168.1.10:8787).
import http from 'node:http';
import crypto from 'node:crypto';
import os from 'node:os';
import { pathToFileURL } from 'node:url';

export const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
export const DEFAULT_PORT = 8787;
export const MAX_PLAYERS = 24;
export const MAX_NAME = 16;
export const MAX_MSG = 2048;

/** Chave de resposta do handshake (vetor público do RFC 6455 §1.3). */
export function acceptKey(key) {
  return crypto.createHash('sha1').update(String(key) + WS_GUID).digest('base64');
}

/** Nome de jogador seguro e curto (sem HTML, sem controle, máx. 16). */
export function sanitizeName(name) {
  const clean = String(name ?? '')
    .replace(/[<>&"'\\]/g, '')
    .replace(/[\x00-\x1f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return (clean || 'Viajante').slice(0, MAX_NAME);
}

/** Estado de mundo enviado pelos clientes, limitado a números plausíveis. */
export function sanitizeState(msg = {}) {
  const num = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    x: Math.max(-1e6, Math.min(1e6, num(msg.x))),
    y: Math.max(-1e6, Math.min(1e6, num(msg.y))),
    a: String(msg.a ?? 'idle').slice(0, 16),
    hp: Math.max(0, Math.min(1e6, num(msg.hp, 100)))
  };
}

// ---------- codec de frames WebSocket ----------

/** Monta um frame servidor→cliente (sem máscara). */
export function encodeFrame(payload, opcode = 0x1) {
  const data = Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload));
  const len = data.length;
  let header;
  if (len < 126) {
    header = Buffer.from([0x80 | opcode, len]);
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, data]);
}

/** Separa frames completos de um buffer parcial; devolve o resto para a próxima leitura. */
export function parseFrames(buffer) {
  const frames = [];
  let offset = 0;
  while (buffer.length - offset >= 2) {
    const b0 = buffer[offset];
    const b1 = buffer[offset + 1];
    const fin = (b0 & 0x80) !== 0;
    const opcode = b0 & 0x0f;
    const masked = (b1 & 0x80) !== 0;
    let len = b1 & 0x7f;
    let headerLen = 2;
    if (len === 126) {
      if (buffer.length - offset < 4) break;
      len = buffer.readUInt16BE(offset + 2);
      headerLen = 4;
    } else if (len === 127) {
      if (buffer.length - offset < 10) break;
      len = Number(buffer.readBigUInt64BE(offset + 2));
      headerLen = 10;
    }
    const maskLen = masked ? 4 : 0;
    if (len > MAX_MSG * 4 || buffer.length - offset < headerLen + maskLen + len) break;
    let payload = buffer.subarray(offset + headerLen + maskLen, offset + headerLen + maskLen + len);
    if (masked) {
      const mask = buffer.subarray(offset + headerLen, offset + headerLen + 4);
      const unmasked = Buffer.alloc(len);
      for (let i = 0; i < len; i += 1) unmasked[i] = payload[i] ^ mask[i & 3];
      payload = unmasked;
    } else {
      payload = Buffer.from(payload);
    }
    frames.push({ fin, opcode, payload });
    offset += headerLen + maskLen + len;
  }
  return { frames, rest: buffer.subarray(offset) };
}

// ---------- lobby (lógica pura, coberta por testes) ----------

export function publicPlayer(p) {
  return { id: p.id, name: p.name, skin: p.skin, x: p.x, y: p.y, a: p.a, hp: p.hp };
}

export function createLobby(maxPlayers = MAX_PLAYERS) {
  const players = new Map(); // id -> { id, name, skin, x, y, a, hp, lastSeen, socket }
  let nextId = 1;
  return {
    players,
    get size() { return players.size; },
    add(socket, msg = {}) {
      if (players.size >= maxPlayers) return { ok: false, reason: 'full' };
      const id = nextId;
      nextId += 1;
      const player = {
        id,
        name: sanitizeName(msg.name),
        skin: String(msg.skin ?? '0').replace(/[^0-9a-z-]/gi, '').slice(0, 12) || '0',
        x: 0, y: 0, a: 'idle', hp: 100,
        lastSeen: Date.now(),
        socket
      };
      players.set(id, player);
      return {
        ok: true,
        player,
        roster: [...players.values()].filter((p) => p.id !== id).map(publicPlayer)
      };
    },
    remove(id) {
      return players.delete(id);
    },
    state(id, msg = {}) {
      const player = players.get(id);
      if (!player) return null;
      Object.assign(player, sanitizeState(msg));
      player.lastSeen = Date.now();
      return player;
    },
    touch(id) {
      const player = players.get(id);
      if (player) player.lastSeen = Date.now();
    },
    snapshot() {
      return [...players.values()].map(publicPlayer);
    }
  };
}

/**
 * Trata uma mensagem de um cliente já conectado.
 * Devolve [{ to: 'sender' | 'others', except?, msg }] para o servidor enviar.
 */
export function handleClientMessage(lobby, id, raw) {
  let msg;
  try {
    msg = JSON.parse(String(raw));
  } catch {
    return [];
  }
  if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') return [];
  if (msg.t === 'state') {
    const player = lobby.state(id, msg);
    if (!player) return [];
    const { x, y, a, hp } = sanitizeState(msg);
    return [{ to: 'others', except: id, msg: { t: 'state', id, x, y, a, hp } }];
  }
  if (msg.t === 'ping') {
    lobby.touch(id);
    return [{ to: 'sender', msg: { t: 'pong', ts: msg.ts ?? null } }];
  }
  return [];
}

/** Endereços ws:// pelos quais este dispositivo aparece na rede local. */
export function lanAddresses(port = DEFAULT_PORT) {
  const addresses = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const info of list ?? []) {
      if (info && (info.family === 'IPv4' || info.family === 4) && !info.internal) {
        addresses.push(`ws://${info.address}:${port}`);
      }
    }
  }
  return addresses;
}

// ---------- servidor ----------

export async function createLanServer({ port = DEFAULT_PORT, host = '0.0.0.0', lobby = createLobby() } = {}) {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`LENDAS LAN server na porta ${port}\n`);
  });
  const clients = new Set();

  const send = (client, msg) => {
    try {
      client.socket.write(encodeFrame(JSON.stringify(msg)));
    } catch { /* socket morto: o close limpa */ }
  };
  const broadcast = (msg, exceptId = null) => {
    const data = encodeFrame(JSON.stringify(msg));
    for (const player of lobby.players.values()) {
      if (player.id === exceptId) continue;
      try {
        player.socket.socket.write(data);
      } catch { /* idem */ }
    }
  };

  server.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key'];
    if (!key || String(req.headers.upgrade).toLowerCase() !== 'websocket') {
      socket.destroy();
      return;
    }
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${acceptKey(key)}\r\n\r\n`
    );
    socket.setNoDelay(true);
    const client = { socket, id: null, buffer: Buffer.alloc(0) };
    clients.add(client);

    socket.on('data', (chunk) => {
      client.buffer = Buffer.concat([client.buffer, chunk]);
      if (client.buffer.length > MAX_MSG * 8) {
        socket.destroy();
        return;
      }
      const { frames, rest } = parseFrames(client.buffer);
      client.buffer = rest;
      for (const frame of frames) {
        if (frame.opcode === 0x8) { // close
          socket.end();
          return;
        }
        if (frame.opcode === 0x9) { // ping -> pong
          socket.write(encodeFrame(frame.payload, 0xA));
          continue;
        }
        if (frame.opcode !== 0x1 && frame.opcode !== 0x0) continue;
        const text = frame.payload.toString('utf8');
        if (text.length > MAX_MSG) continue;
        if (!client.id) {
          // A primeira mensagem precisa ser o hello (entrada no lobby).
          let hello;
          try {
            hello = JSON.parse(text);
          } catch {
            socket.destroy();
            return;
          }
          if (hello?.t !== 'hello') {
            socket.destroy();
            return;
          }
          const joined = lobby.add(client, hello);
          if (!joined.ok) {
            send(client, { t: 'full', max: MAX_PLAYERS });
            socket.destroy();
            return;
          }
          client.id = joined.player.id;
          send(client, { t: 'welcome', id: client.id, you: publicPlayer(joined.player), players: joined.roster });
          broadcast({ t: 'join', p: publicPlayer(joined.player) }, client.id);
          continue;
        }
        for (const out of handleClientMessage(lobby, client.id, text)) {
          if (out.to === 'sender') send(client, out.msg);
          else broadcast(out.msg, out.except ?? null);
        }
      }
    });

    const drop = () => {
      if (client.id !== null) {
        lobby.remove(client.id);
        broadcast({ t: 'leave', id: client.id });
      }
      clients.delete(client);
    };
    socket.on('close', drop);
    socket.on('error', drop);
  });

  // Keepalive: ping a cada 15s; quem ficar 45s sem falar é derrubado.
  const keepalive = setInterval(() => {
    const now = Date.now();
    for (const client of clients) {
      const player = client.id !== null ? lobby.players.get(client.id) : null;
      if (player && now - player.lastSeen > 45000) {
        client.socket.destroy();
        continue;
      }
      try {
        client.socket.write(encodeFrame(Buffer.alloc(0), 0x9));
      } catch { /* o close limpa */ }
    }
  }, 15000);
  server.on('close', () => clearInterval(keepalive));

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      resolve({
        server,
        lobby,
        port: server.address().port,
        close: () => new Promise((done) => server.close(done))
      });
    });
  });
}

// ---------- main ----------

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT) || DEFAULT_PORT;
  createLanServer({ port }).then(({ port: actual }) => {
    console.log(`[LENDAS LAN] servidor no ar na porta ${actual}.`);
    console.log('[LENDAS LAN] outros dispositivos na MESMA rede entram por um destes endereços:');
    const addresses = lanAddresses(actual);
    if (addresses.length === 0) console.log('  (nenhum IPv4 de rede encontrado — verifique o Wi-Fi)');
    for (const address of addresses) console.log(`  ${address}`);
    console.log('[LENDAS LAN] no jogo, abra o painel 🌐 e cole o endereço. Ctrl+C para desligar.');
  }).catch((error) => {
    console.error('[LENDAS LAN] não foi possível subir o servidor:', error);
    process.exit(1);
  });
}
