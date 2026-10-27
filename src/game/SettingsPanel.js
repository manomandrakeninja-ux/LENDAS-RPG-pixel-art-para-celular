import { PixelCanvas } from '../art/pixel.js';
import { detectTouchMode } from './TouchControls.js';
import { loadSettings, saveSettings } from './Settings.js';
import { exportSaveCode, importSaveCode } from './saveBackup.js';
import { ACTION_LABELS, KEY_ACTIONS, DEFAULT_KEYBINDS, keyLabel, loadKeybinds, rebind, saveKeybinds } from './Keybinds.js';

/** Ícone de engrenagem em pixel art (16 x 16) como data URL. */
function gearIconUrl() {
  const size = 16;
  const pixels = new PixelCanvas(size, size);
  const metal = ['#6b5038', '#c9a76b', '#f2c45c', '#fff1ce'];
  // Dentes.
  for (const [x, y, w, h] of [[6, 0, 4, 3], [6, 13, 4, 3], [0, 6, 3, 4], [13, 6, 3, 4], [2, 2, 3, 3], [11, 2, 3, 3], [2, 11, 3, 3], [11, 11, 3, 3]]) {
    pixels.rect(x, y, w, h, metal[1]);
  }
  pixels.shadedEllipse(8, 8, 6, 6, metal);
  pixels.ellipse(8, 8, 2.3, 2.3, '#24190f');
  pixels.outline({ strength: 0.8 });
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas.getContext('2d').putImageData(new ImageData(pixels.data, size, size), 0, 0);
  return canvas.toDataURL();
}

const OPTIONS = {
  interface: [['auto', 'Automática'], ['pc', 'Computador'], ['mobile', 'Celular']],
  sound: [[true, 'Ligado'], [false, 'Desligado']],
  music: [[true, 'Ligada'], [false, 'Desligada']],
  shake: [[true, 'Ligado'], [false, 'Desligado']],
  labels: [['auto', 'Automático'], ['always', 'Sempre'], ['near', 'Só de perto']],
  stickSize: [['small', 'Pequeno'], ['medium', 'Médio'], ['large', 'Grande']],
  stickSide: [['left', 'Esquerda'], ['right', 'Direita']],
  // Fica no save do jogo (não nas configurações do aparelho).
  gender: [['male', 'Cavaleiro'], ['female', 'Heroína']]
};

/**
 * Engrenagem ao lado do minimapa: interface (computador/celular), som, volume,
 * tremor da tela, nomes dos prédios, tela cheia e salvar agora.
 */
export class SettingsPanel {
  constructor(scene) {
    this.scene = scene;
    this.settings = loadSettings();
    this.keybinds = loadKeybinds();
    this.listening = null;
    this.keyMessage = '';
    const host = document.getElementById('game') ?? document.body;

    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.id = 'settings-button';
    this.button.className = 'settings-button';
    this.button.setAttribute('aria-label', 'Configurações');
    this.button.innerHTML = `<img class="pixel-icon" src="${gearIconUrl()}" alt="" width="32" height="32">`;

    this.root = document.createElement('div');
    this.root.id = 'settings-panel';
    this.root.className = 'item-info settings-panel';
    this.root.hidden = true;
    this.root.innerHTML = `
      <section class="item-info__card" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header class="item-info__header">
          <div class="item-info__icon"><img class="pixel-icon" src="${gearIconUrl()}" alt="" width="40" height="40"></div>
          <div>
            <p class="item-info__kicker">LENDAS</p>
            <h2 class="item-info__name" id="settings-title">Configurações</h2>
          </div>
          <button type="button" class="panel-close" data-settings="close" aria-label="Fechar configurações">✕</button>
        </header>
        <div class="item-info__body settings-panel__body" id="settings-body"></div>
        <footer class="item-info__footer"><button type="button" data-settings="close">VOLTAR AO JOGO</button></footer>
      </section>`;
    host.append(this.button, this.root);
    this.body = this.root.querySelector('#settings-body');

    this.handleOpen = (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.toggle();
    };
    this.handleClick = (event) => {
      if (event.target === this.root) {
        this.close();
        return;
      }
      const button = event.target.closest('button[data-settings]');
      if (!button || button.disabled) return;
      const { settings: action, value } = button.dataset;
      if (action === 'close') this.close();
      else if (action === 'restart') {
        this.confirmRestart = true;
        this.render();
      } else if (action === 'restart-cancel') {
        this.confirmRestart = false;
        this.render();
      } else if (action === 'restart-confirm') this.scene.restartFromScratch();
      else if (action === 'backup-export') this.backupExport(false);
      else if (action === 'backup-file') this.backupExport(true);
      else if (action === 'backup-import') this.backupImport(this.root.querySelector('[data-backup-text]')?.value);
      else if (action === 'backup-pick') this.root.querySelector('[data-backup-file]')?.click();
      else if (action === 'key') this.startListening(value);
      else if (action === 'keys-reset') {
        this.keybinds = { ...DEFAULT_KEYBINDS };
        this.commitKeybinds('Teclas padrão restauradas.');
      } else if (action === 'gender') {
        this.scene.setHeroGender?.(value);
        this.render();
      } else if (action === 'fullscreen') this.scene.touch?.toggleFullscreen();
      else if (action === 'save') {
        this.scene.save();
        this.scene.ui?.showMessage('Jogo salvo.');
      } else if (action === 'volume') this.set('volume', this.settings.volume + Number(value));
      else this.set(action, value === 'true' ? true : value === 'false' ? false : value);
    };
    this.handleChange = async (event) => {
      const input = event.target.closest?.('[data-backup-file]');
      const file = input?.files?.[0];
      if (file) this.backupImport(await file.text());
    };
    this.handleKey = (event) => {
      if (this.listening && this.isOpen) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.key === 'Escape') {
          this.listening = null;
          this.keyMessage = '';
          this.render();
          return;
        }
        const result = rebind(this.keybinds, this.listening, event.code);
        if (result.ok) {
          this.keybinds = result.binds;
          this.commitKeybinds('');
        } else {
          this.keyMessage = result.message;
          this.render();
        }
        return;
      }
      if (event.key === 'Escape' && this.isOpen) {
        event.stopPropagation();
        this.close();
      }
    };
    this.stopDown = (event) => event.stopPropagation();
    // pointerdown abre na hora (toque e mouse); o clique do teclado (Enter) também.
    this.button.addEventListener('pointerdown', this.handleOpen);
    this.button.addEventListener('click', (event) => {
      if (event.detail === 0) this.handleOpen(event);
    });
    for (const type of ['pointerdown', 'mousedown', 'touchstart']) {
      this.button.addEventListener(type, this.stopDown);
      this.root.addEventListener(type, this.stopDown);
    }
    this.root.addEventListener('click', this.handleClick);
    this.root.addEventListener('change', this.handleChange);
    window.addEventListener('keydown', this.handleKey, true);
    scene.events.once('shutdown', () => {
      window.removeEventListener('keydown', this.handleKey, true);
      this.button.remove();
      this.root.remove();
    });
    this.apply({ initial: true });
  }

  get isOpen() {
    return !this.root.hidden;
  }

  open() {
    this.root.hidden = false;
    this.render();
    this.root.querySelector('.panel-close')?.focus({ preventScroll: true });
  }

  close() {
    this.root.hidden = true;
    this.confirmRestart = false;
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  set(key, value) {
    this.settings = { ...this.settings, [key]: value };
    saveSettings(this.settings);
    this.settings = loadSettings();
    this.apply();
    this.render();
  }

  /** Aplica as configurações no jogo (som, interface, tremor, nomes dos prédios). */
  apply({ initial = false } = {}) {
    const scene = this.scene;
    const { sound, volume } = this.settings;
    scene.audio?.setVolume?.(volume / 100);
    scene.audio?.setMuted?.(!sound);
    scene.audio?.setMusicOn?.(this.settings.music);
    if (!initial && scene.touch) {
      const mode = detectTouchMode();
      if (mode.enabled) scene.touch.enable();
      else scene.touch.disable();
    }
    if (scene.touch?.enabled) scene.touch.applyLayout(this.settings);
    scene.ui?.resize?.();
  }

  startListening(action) {
    this.listening = action;
    this.keyMessage = 'Aperte a nova tecla (ESC cancela).';
    this.render();
  }

  commitKeybinds(message) {
    this.listening = null;
    this.keyMessage = message;
    saveKeybinds(this.keybinds);
    this.scene.applyKeybinds?.(this.keybinds);
    this.render();
  }

  get shake() {
    return this.settings.shake;
  }

  get labels() {
    return this.settings.labels;
  }

  choiceRow(key, title, description) {
    const buttons = OPTIONS[key].map(([value, label]) => {
      const current = key === 'gender' ? this.scene.heroGender : this.settings[key];
      const active = current === value;
      return `<button type="button" data-settings="${key}" data-value="${value}" aria-pressed="${active}" class="${active ? 'is-active' : ''}">${label}</button>`;
    }).join('');
    return `
      <div class="settings-panel__row">
        <h3>${title}</h3>
        ${description ? `<p>${description}</p>` : ''}
        <div class="settings-panel__choices">${buttons}</div>
      </div>`;
  }

  async backupExport(asFile) {
    try {
      this.backupText = await exportSaveCode();
      this.backupMsg = 'Código gerado. Copie e guarde em lugar seguro.';
      if (asFile) {
        const url = URL.createObjectURL(new Blob([this.backupText], { type: 'text/plain' }));
        const a = Object.assign(document.createElement('a'), { href: url, download: 'lendas-backup.txt' });
        a.click();
        URL.revokeObjectURL(url);
        this.backupMsg = 'Arquivo lendas-backup.txt baixado.';
      }
    } catch (error) {
      this.backupMsg = error.message;
    }
    this.render();
  }

  async backupImport(code) {
    this.backupText = code ?? '';
    try {
      await importSaveCode(code);
      if (this.scene) this.scene.skipSave = true;
      this.backupMsg = 'Backup importado! Recarregando...';
      this.render();
      setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      this.backupMsg = error.message;
      this.render();
    }
  }

  backupSection() {
    const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return `
      <div class="settings-panel__row">
        <h3>Backup do save</h3>
        <p>Gere um código (ou arquivo) para guardar seu progresso. Para restaurar, cole o código e importe: isso substitui o save atual.</p>
        <textarea data-backup-text rows="3" style="width:100%" placeholder="Código LENDAS1:...">${esc(this.backupText ?? '')}</textarea>
        <p class="settings-panel__keymsg">${esc(this.backupMsg ?? '')}</p>
        <div class="settings-panel__choices">
          <button type="button" data-settings="backup-export">GERAR CÓDIGO</button>
          <button type="button" data-settings="backup-file">BAIXAR ARQUIVO</button>
          <button type="button" data-settings="backup-pick">IMPORTAR ARQUIVO</button>
          <button type="button" data-settings="backup-import">IMPORTAR CÓDIGO</button>
        </div>
        <input type="file" data-backup-file accept=".txt,text/plain" hidden>
      </div>`;
  }

  keysSection() {
    const rows = KEY_ACTIONS.map((action) => `
        <button type="button" data-settings="key" data-value="${action}" class="${this.listening === action ? 'is-listening' : ''}">${ACTION_LABELS[action]}: ${this.listening === action ? '...' : keyLabel(this.keybinds[action])}</button>`).join('');
    return `
      <div class="settings-panel__row settings-panel__keys">
        <h3>Teclas (computador)</h3>
        <p>Toque numa ação e aperte a nova tecla.</p>
        <div class="settings-panel__choices">${rows}</div>
        <p class="settings-panel__keymsg">${this.keyMessage}</p>
        <div class="settings-panel__choices"><button type="button" data-settings="keys-reset">TECLAS PADRÃO</button></div>
      </div>`;
  }

  render() {
    if (!this.isOpen) return;
    const touch = this.scene.touch?.enabled;
    const forcedByUrl = /[?&](toque|touch)=/.test(window.location.search);
    this.body.innerHTML = `
      ${this.choiceRow('interface', 'Interface', `Agora: ${touch ? 'celular (controles de toque)' : 'computador (teclado e mouse)'}.${forcedByUrl ? ' O endereço da página está forçando um modo.' : ''}`)}
      ${this.choiceRow('gender', 'Personagem', 'Escolha o visual do seu herói. As animações são as mesmas.')}
      ${this.choiceRow('sound', 'Som', '')}
      ${this.choiceRow('music', 'Música', 'Melodia simples de cada região.')}
      <div class="settings-panel__row">
        <h3>Volume</h3>
        <div class="settings-panel__choices settings-panel__volume">
          <button type="button" data-settings="volume" data-value="-10" ${this.settings.volume <= 0 ? 'disabled' : ''} aria-label="Diminuir volume">−</button>
          <span data-volume>${this.settings.volume}%</span>
          <button type="button" data-settings="volume" data-value="10" ${this.settings.volume >= 100 ? 'disabled' : ''} aria-label="Aumentar volume">+</button>
        </div>
      </div>
      ${this.choiceRow('shake', 'Tremor da tela', 'Balanço da câmera nos golpes e explosões.')}
      ${this.choiceRow('labels', 'Nomes dos prédios', 'Automático: no celular só aparecem perto do personagem.')}
      ${this.choiceRow('stickSize', 'Tamanho do joystick', 'Controles de toque.')}
      ${this.choiceRow('stickSide', 'Lado do joystick', 'Os botões de ação ficam do outro lado.')}
      ${touch ? '' : this.keysSection()}
      <div class="settings-panel__row settings-panel__actions">
        <button type="button" data-settings="fullscreen">TELA CHEIA</button>
        <button type="button" data-settings="save">SALVAR AGORA</button>
      </div>
      ${this.backupSection()}
      <div class="settings-panel__row settings-panel__danger">
        <h3>Recomeçar do zero</h3>
        ${this.confirmRestart
          ? `<p class="settings-panel__warning">Tem certeza? Todo o progresso (prédios, itens, missões e nível) será apagado e não dá para desfazer.</p>
        <div class="settings-panel__choices">
          <button type="button" data-settings="restart-cancel">CANCELAR</button>
          <button type="button" class="is-danger" data-settings="restart-confirm">SIM, APAGAR TUDO</button>
        </div>`
          : `<p>Começa um jogo novo. As configurações continuam.</p>
        <div class="settings-panel__choices"><button type="button" class="is-danger" data-settings="restart">RECOMEÇAR</button></div>`}
      </div>`;
  }
}
