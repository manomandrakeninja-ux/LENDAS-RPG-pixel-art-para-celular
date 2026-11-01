// Multijogador LAN: conecta no servidor local (server/lan-server.mjs, `npm run lan`) e
// mostra os outros jogadores da mesma rede no mundo, cada um com o nome embaixo do avatar.
// Desligado por padrão; liga pelo painel 🌐 ou pelos parâmetros ?lan=ws://...&lanName=...
import { PixelCanvas } from '../art/pixel.js';

const LS_KEY = 'lendas-lan';
const SEND_HZ = 10;
const REMOTE_TIMEOUT_MS = 8000;

export function loadLanPrefs() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) ?? {};
  } catch {
    return {};
  }
}

export function saveLanPrefs(prefs) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs));
  } catch { /* sem localStorage: segue sem persistir */ }
}

export function sanitizeName(name) {
  const clean = String(name ?? '')
    .replace(/[<>&"'\\]/g, '')
    .replace(/[\x00-\x1f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return (clean || 'Viajante').slice(0, 16);
}

/** Cor do avatar derivada do nome (determinística). */
export function nameHue(name) {
  let hash = 0;
  for (const ch of String(name)) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  return hash % 360;
}

/** Descobre o IPv4 local via ICE host candidates (serve para mostrar "seu IP na rede"). */
export function detectLanIp(timeoutMs = 2500) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (value) => {
      if (!done) {
        done = true;
        resolve(value);
      }
    };
    try {
      const pc = new RTCPeerConnection();
      pc.createDataChannel('ip');
      pc.onicecandidate = (event) => {
        const candidate = event.candidate?.candidate ?? '';
        const match = candidate.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
        if (match && !match[1].startsWith('127.')) {
          finish(match[1]);
          try { pc.close(); } catch { /* */ }
        }
      };
      pc.createOffer().then((offer) => pc.setLocalDescription(offer)).catch(() => finish(null));
      setTimeout(() => {
        try { pc.close(); } catch { /* */ }
        finish(null);
      }, timeoutMs);
    } catch {
      finish(null);
    }
  });
}

/** Textura 12x16 de avatar pixel art para um jogador remoto. */
export function avatarTextureKey(name) {
  return `lan-avatar-${nameHue(name)}`;
}

function ensureAvatarTexture(scene, name) {
  const key = avatarTextureKey(name);
  if (scene.textures.exists(key)) return key;
  const hue = nameHue(name);
  const px = new PixelCanvas(12, 16);
  const body = `hsl(${hue} 60% 52%)`;
  const dark = `hsl(${hue} 55% 32%)`;
  const skin = '#e8b98a';
  px.rect(0, 0, 12, 16, '#000000', 0); // fundo transparente
  px.rect(3, 1, 6, 4, skin); // cabeça
  px.rect(3, 1, 6, 1, dark); // cabelo/faixa
  px.rect(4, 3, 1, 1, '#140f14'); // olho esq
  px.rect(7, 3, 1, 1, '#140f14'); // olho dir
  px.rect(2, 5, 8, 7, body); // tronco
  px.rect(2, 5, 1, 7, dark); // lateral
  px.rect(10, 5, 0 + 1, 7, dark); // lateral dir (1px)
  px.rect(3, 12, 2, 4, dark); // perna esq
  px.rect(7, 12, 2, 4, dark); // perna dir
  px.rect(2, 6, 1, 3, skin); // braço esq
  px.rect(9, 6, 1, 3, skin); // braço dir
  const canvas = document.createElement('canvas');
  canvas.width = 12;
  canvas.height = 16;
  canvas.getContext('2d').putImageData(new ImageData(px.data, 12, 16), 0, 0);
  scene.textures.addCanvas(key, canvas);
  return key;
}

export class LanSync {
  constructor(scene) {
    this.scene = scene;
    this.ws = null;
    this.id = null;
    this.remotes = new Map(); // id -> { name, x, y, a, hp, tx, ty, sprite, label, lastSeen }
    this.seenNames = new Set(); // nomes que já apareceram pra este cliente (sobrevive a reconexões)
    this.sendAcc = 0;
    this.connected = false;
    this.status = 'offline';
    this.lastError = '';
    const prefs = loadLanPrefs();
    this.name = sanitizeName(prefs.name ?? 'Viajante');
    this.address = prefs.address ?? '';
    this.root = null;
    this.button = null;
    this.statusEl = null;
    this.listEl = null;
  }

  /** Cria o botão 🌐 no HUD e o painel; auto-conecta se a URL pedir (?lan=...&lanName=...). */
  attach() {
    const params = new URLSearchParams(window.location.search);
    const autoLan = params.get('lan');
    if (autoLan) {
      this.name = sanitizeName(params.get('lanName') ?? this.name);
      this.address = autoLan;
      this.connect(autoLan, this.name);
    } else if (params.get('lan') === '') {
      // ?lan= (vazio) desliga explicitamente
    }
    this.buildHud();
    if (autoLan) this.refreshPanel();
  }

  buildHud() {
    const host = document.getElementById('game') ?? document.body;
    if (!this.button) {
      this.button = document.createElement('button');
      this.button.type = 'button';
      this.button.id = 'lan-button';
      this.button.className = 'lan-button';
      this.button.setAttribute('aria-label', 'Multijogador LAN');
      this.button.textContent = '🌐';
      this.button.addEventListener('pointerdown', (event) => event.stopPropagation());
      this.button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.togglePanel();
      });
    }
    if (!this.root) {
      this.root = document.createElement('div');
      this.root.id = 'lan-panel';
      this.root.className = 'item-info lan-panel';
      this.root.hidden = true;
      this.root.innerHTML = `
        <section class="item-info__card" role="dialog" aria-modal="true" aria-labelledby="lan-title">
          <header class="item-info__header">
            <div class="item-info__icon"><span class="lan-panel__globe">🌐</span></div>
            <div>
              <p class="item-info__kicker">LENDAS</p>
              <h2 class="item-info__name" id="lan-title">Multijogador LAN</h2>
            </div>
            <button type="button" class="panel-close" data-lan="close" aria-label="Fechar">✕</button>
          </header>
          <div class="item-info__body lan-panel__body">
            <p class="lan-panel__hint">Jogue com outras pessoas na <strong>mesma rede</strong>, sem internet.
              Quem hospeda roda <code>npm run lan</code> (ou <code>LENDAS-LAN.bat</code>) neste dispositivo e passa o endereço abaixo.</p>
            <label class="lan-panel__row">
              <span>Seu nome</span>
              <input type="text" data-lan="name" maxlength="16" autocomplete="off">
            </label>
            <label class="lan-panel__row">
              <span>Endereço do servidor</span>
              <input type="text" data-lan="address" placeholder="ws://192.168.1.10:8787" autocomplete="off" spellcheck="false">
            </label>
            <p class="lan-panel__ip" data-lan="ip">Descobrindo seu IP na rede…</p>
            <div class="lan-panel__actions">
              <button type="button" data-lan="connect">CONECTAR</button>
              <button type="button" data-lan="disconnect" disabled>DESCONECTAR</button>
            </div>
            <p class="lan-panel__status" data-lan="status">offline</p>
            <ul class="lan-panel__list" data-lan="list"></ul>
          </div>
          <footer class="item-info__footer"><button type="button" data-lan="close">VOLTAR AO JOGO</button></footer>
        </section>`;
      this.root.addEventListener('click', (event) => {
        if (event.target === this.root) this.closePanel();
      });
      this.root.addEventListener('pointerdown', (event) => event.stopPropagation());
      this.root.addEventListener('click', (event) => {
        const action = event.target.closest('button[data-lan]')?.dataset.lan;
        if (action === 'close') this.closePanel();
        else if (action === 'connect') this.connectFromPanel();
        else if (action === 'disconnect') this.disconnect();
      });
    }
    host.append(this.button, this.root);
    this.scene.events.once('shutdown', () => {
      this.disconnect();
      this.button?.remove();
      this.root?.remove();
    });
    this.refreshPanel();
    detectLanIp().then((ip) => {
      const el = this.root?.querySelector('[data-lan="ip"]');
      if (el) el.textContent = ip
        ? `Seu IP nesta rede: ${ip}  →  os outros entram em ws://${ip}:8787`
        : 'Não foi possível descobrir o IP local (Wi-Fi desligado?).';
    });
  }

  get isOpen() {
    return this.root && !this.root.hidden;
  }

  togglePanel() {
    if (this.isOpen) this.closePanel();
    else this.openPanel();
  }

  openPanel() {
    this.root.hidden = false;
    this.refreshPanel();
  }

  closePanel() {
    this.root.hidden = true;
  }

  refreshPanel() {
    if (!this.root) return;
    const nameInput = this.root.querySelector('[data-lan="name"]');
    const addressInput = this.root.querySelector('[data-lan="address"]');
    if (nameInput && document.activeElement !== nameInput) nameInput.value = this.name;
    if (addressInput && document.activeElement !== addressInput) addressInput.value = this.address;
    this.statusEl = this.root.querySelector('[data-lan="status"]');
    this.listEl = this.root.querySelector('[data-lan="list"]');
    if (this.statusEl) this.statusEl.textContent = this.status + (this.lastError ? ` (${this.lastError})` : '');
    if (this.listEl) {
      const names = [...this.remotes.values()].map((remote) => remote.name);
      this.listEl.innerHTML = names.length === 0
        ? '<li>Nenhum outro jogador conectado.</li>'
        : names.map((name) => `<li>${name.replace(/[<>&]/g, '')}</li>`).join('');
    }
    const connectBtn = this.root.querySelector('[data-lan="connect"]');
    const disconnectBtn = this.root.querySelector('[data-lan="disconnect"]');
    if (connectBtn) connectBtn.disabled = this.connected;
    if (disconnectBtn) disconnectBtn.disabled = !this.connected;
  }

  connectFromPanel() {
    const nameInput = this.root.querySelector('[data-lan="name"]');
    const addressInput = this.root.querySelector('[data-lan="address"]');
    this.name = sanitizeName(nameInput?.value ?? this.name);
    this.address = String(addressInput?.value ?? this.address).trim();
    saveLanPrefs({ name: this.name, address: this.address });
    this.connect(this.address, this.name);
  }

  connect(address, name) {
    this.disconnect();
    const url = String(address || '').trim();
    if (!/^wss?:\/\/.+/.test(url)) {
      this.status = 'offline';
      this.lastError = 'endereço inválido (use ws://IP:porta)';
      this.refreshPanel();
      return;
    }
    if (window.location.protocol === 'https:' && url.startsWith('ws://')) {
      this.status = 'offline';
      this.lastError = 'HTTPS bloqueia ws://; use wss:// com servidor seguro ou abra a versao local em http://';
      this.refreshPanel();
      return;
    }
    this.name = sanitizeName(name ?? this.name);
    this.address = url;
    saveLanPrefs({ name: this.name, address: this.address });
    this.status = 'conectando…';
    this.lastError = '';
    this.refreshPanel();
    let ws;
    try {
      ws = new WebSocket(url);
    } catch (error) {
      this.status = 'offline';
      this.lastError = String(error?.message ?? error);
      this.refreshPanel();
      return;
    }
    this.ws = ws;
    const timeout = setTimeout(() => {
      if (!this.connected) {
        this.status = 'offline';
        this.lastError = 'tempo esgotado';
        this.refreshPanel();
        try { ws.close(); } catch { /* */ }
      }
    }, 8000);
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ t: 'hello', name: this.name, skin: String(nameHue(this.name)) }));
    });
    ws.addEventListener('message', (event) => {
      let msg;
      try {
        msg = JSON.parse(String(event.data));
      } catch {
        return;
      }
      this.onMessage(msg);
    });
    ws.addEventListener('close', () => {
      clearTimeout(timeout);
      const wasConnected = this.connected;
      this.connected = false;
      this.ws = null;
      this.id = null;
      this.clearRemotes();
      this.status = 'offline';
      if (wasConnected) this.lastError = 'conexão encerrada';
      this.refreshPanel();
    });
    ws.addEventListener('error', () => {
      this.lastError = 'servidor LAN nÃ£o encontrado: execute npm run lan no computador anfitriÃ£o e permita a porta 8787 no Firewall';
      this.refreshPanel();
    });
  }

  disconnect() {
    if (this.ws) {
      try { this.ws.close(); } catch { /* */ }
    }
    this.ws = null;
    this.connected = false;
    this.id = null;
    this.clearRemotes();
    this.status = 'offline';
    this.refreshPanel();
  }

  onMessage(msg) {
    // Log circular das últimas mensagens (ajuda a depurar o servidor LAN).
    (this.log ??= []).push(msg);
    if (this.log.length > 50) this.log.shift();
    switch (msg?.t) {
      case 'welcome':
        this.id = msg.id;
        this.connected = true;
        this.status = `conectado como ${this.name} (id ${msg.id})`;
        this.lastError = '';
        this.clearRemotes();
        for (const player of msg.players ?? []) this.upsertRemote(player);
        break;
      case 'join':
        if (msg.p) this.upsertRemote(msg.p);
        break;
      case 'state':
        this.applyRemoteState(msg);
        break;
      case 'leave':
        this.removeRemote(msg.id);
        break;
      case 'full':
        this.status = 'offline';
        this.lastError = 'servidor cheio';
        break;
      default:
        break;
    }
    this.refreshPanel();
  }

  upsertRemote(player) {
    const name0 = sanitizeName(player.name);
    this.seenNames.add(name0);
    this.scene.achievements?.checkAchievements(); // conquista de jogar em LAN com amigos
    const existing = this.remotes.get(player.id);
    if (existing) {
      existing.name = sanitizeName(player.name);
      existing.tx = Number(player.x) || 0;
      existing.ty = Number(player.y) || 0;
      existing.a = String(player.a ?? 'idle');
      existing.hp = Number(player.hp) || 0;
      existing.lastSeen = Date.now();
      existing.label?.setText(existing.name);
      return existing;
    }
    const name = sanitizeName(player.name);
    const scene = this.scene;
    const key = ensureAvatarTexture(scene, name);
    const sprite = scene.add.sprite(Number(player.x) || 0, Number(player.y) || 0, key)
      .setDepth(5000)
      .setScale(2);
    const label = scene.add.text(0, 0, name, {
      fontFamily: '"Press Start 2P"',
      fontSize: '8px',
      color: '#ffffff',
      stroke: '#140f14',
      strokeThickness: 3
    }).setDepth(5001).setOrigin(0.5, 0);
    const remote = {
      name,
      x: Number(player.x) || 0,
      y: Number(player.y) || 0,
      tx: Number(player.x) || 0,
      ty: Number(player.y) || 0,
      a: String(player.a ?? 'idle'),
      hp: Number(player.hp) || 0,
      sprite,
      label,
      lastSeen: Date.now()
    };
    this.positionRemote(remote);
    this.remotes.set(player.id, remote);
    return remote;
  }

  applyRemoteState(msg) {
    const remote = this.remotes.get(msg.id);
    if (!remote) return;
    remote.tx = Number(msg.x) || 0;
    remote.ty = Number(msg.y) || 0;
    remote.a = String(msg.a ?? 'idle');
    remote.hp = Number(msg.hp) || 0;
    remote.lastSeen = Date.now();
  }

  removeRemote(id) {
    const remote = this.remotes.get(id);
    if (!remote) return;
    remote.sprite?.destroy();
    remote.label?.destroy();
    this.remotes.delete(id);
  }

  clearRemotes() {
    for (const id of [...this.remotes.keys()]) this.removeRemote(id);
  }

  positionRemote(remote) {
    remote.sprite?.setPosition(remote.x, remote.y - 8);
    remote.label?.setPosition(remote.x, remote.y + 14);
  }

  /** Chamado a cada frame pelo GameScene: envia o estado local (10 Hz) e interpola os remotos. */
  update(delta) {
    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.sendAcc += delta;
    if (this.sendAcc >= 1000 / SEND_HZ) {
      this.sendAcc = 0;
      this.sendState();
    }
    const now = Date.now();
    const lerp = Math.min(1, delta / 90);
    for (const [id, remote] of this.remotes) {
      remote.x += (remote.tx - remote.x) * lerp;
      remote.y += (remote.ty - remote.y) * lerp;
      this.positionRemote(remote);
      if (now - remote.lastSeen > REMOTE_TIMEOUT_MS) this.removeRemote(id);
    }
  }

  sendState() {
    const player = this.scene.player;
    if (!player) return;
    const anim = player.anims?.currentAnim?.key ?? 'idle';
    this.ws.send(JSON.stringify({
      t: 'state',
      x: Math.round(player.x),
      y: Math.round(player.y),
      a: anim,
      hp: Math.round(player.health ?? 0)
    }));
  }

  /** Força o envio imediato (usado pelos testes). */
  sendNow() {
    if (this.connected && this.ws?.readyState === WebSocket.OPEN) this.sendState();
  }
}
