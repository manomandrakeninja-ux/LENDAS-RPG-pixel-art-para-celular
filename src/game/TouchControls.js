// Controles de toque para celular: joystick virtual à esquerda e botões à direita.
// O teclado continua funcionando sempre; estes controles só aparecem em telas de toque.
// No computador, abra o jogo com ?toque=1 para ver e testar os controles com o mouse
// (?toque=0 esconde mesmo num celular).

import { STICK_SIZES, loadSettings } from './Settings.js';

const STICK_RADIUS = 44;
const DEAD_ZONE = 0.15;

export function detectTouchMode(win = typeof window === 'undefined' ? null : window) {
  if (!win) return { enabled: false, forced: false };
  const params = new URLSearchParams(win.location?.search ?? '');
  const flag = params.get('toque') ?? params.get('touch');
  if (flag === '1') return { enabled: true, forced: true };
  if (flag === '0') return { enabled: false, forced: true };
  // Escolha feita na engrenagem (Configurações → Interface).
  const choice = win.localStorage ? loadSettings().interface : 'auto';
  if (choice === 'mobile') return { enabled: true, forced: true };
  if (choice === 'pc') return { enabled: false, forced: true };
  const coarse = win.matchMedia?.('(pointer: coarse)')?.matches ?? false;
  return { enabled: coarse, forced: false };
}

// Converte o deslocamento do dedo em um vetor de -1 a 1, com zona morta no centro.
export function stickVector(dx, dy, radius = STICK_RADIUS, deadZone = DEAD_ZONE) {
  const length = Math.hypot(dx, dy);
  if (length === 0) return { x: 0, y: 0, knobX: 0, knobY: 0 };
  const clamped = Math.min(length, radius);
  const knobX = (dx / length) * clamped;
  const knobY = (dy / length) * clamped;
  const strength = clamped / radius;
  if (strength < deadZone) return { x: 0, y: 0, knobX, knobY };
  const scaled = (strength - deadZone) / (1 - deadZone);
  return { x: (dx / length) * scaled, y: (dy / length) * scaled, knobX, knobY };
}

export class TouchControls {
  constructor(scene) {
    this.scene = scene;
    this.root = document.getElementById('touch-controls');
    this.zone = document.getElementById('touch-stick-zone');
    this.base = document.getElementById('touch-stick-base');
    this.knob = document.getElementById('touch-stick-knob');
    this.campButton = document.getElementById('touch-camp');
    this.worldAction = document.getElementById('world-action');
    this.vector = { x: 0, y: 0 };
    this.stickPointer = null;
    this.dodgeQueued = false;
    this.suppressActionClickUntil = 0;
    this.visible = true;
    this.stickRadius = STICK_RADIUS;

    const mode = detectTouchMode();
    this.enabled = false;
    this.listeners = [];
    if (mode.enabled) this.enable();
    else if (!mode.forced) {
      // Liga sozinho no primeiro toque, por exemplo num notebook com tela de toque.
      this.listen(window, 'touchstart', () => this.enable(), { once: true, passive: true });
    }
  }

  listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this.listeners.push(() => target.removeEventListener(type, handler, options));
  }

  enable() {
    if (this.enabled || !this.root) return;
    this.enabled = true;
    document.body.classList.add('is-touch');
    this.root.hidden = false;
    this.applyLayout();

    this.listen(this.zone, 'pointerdown', (event) => this.onStickDown(event));
    this.listen(this.zone, 'pointermove', (event) => this.onStickMove(event));
    this.listen(this.zone, 'pointerup', (event) => this.onStickUp(event));
    this.listen(this.zone, 'pointercancel', (event) => this.onStickUp(event));
    this.listen(this.zone, 'lostpointercapture', (event) => this.onStickUp(event));

    for (const button of this.root.querySelectorAll('[data-touch]')) {
      this.listen(button, 'pointerdown', (event) => {
        event.preventDefault();
        this.scene.audio?.unlock();
        this.press(button.dataset.touch);
      });
    }

    // O botão de ação responde no toque (pointerdown), sem esperar o "click" do navegador,
    // para funcionar junto com o dedo que está no joystick.
    this.listen(this.worldAction, 'pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      this.suppressActionClickUntil = performance.now() + 700;
      this.scene.audio?.unlock();
      this.scene.performContextAction();
    });
    this.listen(window, 'click', (event) => {
      if (performance.now() < this.suppressActionClickUntil && event.target.closest?.('#world-action')) {
        event.stopPropagation();
        event.preventDefault();
      }
    }, true);

    this.listen(this.root, 'contextmenu', (event) => event.preventDefault());
    this.scene.ui?.resize?.();
  }

  /** Tamanho e lado do joystick (Configurações → Joystick). */
  applyLayout(settings = loadSettings()) {
    const size = STICK_SIZES[settings.stickSize] ?? STICK_SIZES.medium;
    const right = settings.stickSide === 'right';
    this.stickRadius = size.radius;
    this.base.style.width = `${size.base}px`;
    this.base.style.height = `${size.base}px`;
    this.root.classList.toggle('stick-right', right);
    document.body.classList.toggle('stick-right', right);
  }

  /** Volta para o modo computador (Configurações → Interface → Computador). */
  disable() {
    if (!this.enabled) return;
    for (const remove of this.listeners) remove();
    this.listeners = [];
    this.enabled = false;
    this.resetStick();
    this.dodgeQueued = false;
    document.body.classList.remove('is-touch', 'stick-right');
    this.root.hidden = true;
    this.root.classList.remove('is-hidden');
    this.visible = true;
    this.scene.ui?.resize?.();
  }

  press(action) {
    if (action === 'dodge') this.dodgeQueued = true;
    else if (action === 'special') this.scene.specialAttack();
    else if (action === 'map') this.scene.worldMap.toggle();
    else if (action === 'bag') this.scene.toggleBackpack();
    else if (action === 'journal') this.scene.toggleJournal();
    else if (action === 'camp') this.scene.toggleCampMenu();
    else if (action === 'fullscreen') this.toggleFullscreen();
  }

  consumeDodge() {
    const queued = this.dodgeQueued;
    this.dodgeQueued = false;
    return queued;
  }

  toggleFullscreen() {
    const doc = document;
    if (doc.fullscreenElement) {
      doc.exitFullscreen?.();
      return;
    }
    const request = doc.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
    request?.then?.(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch?.(() => {
      this.scene.ui?.showMessage('Tela cheia não disponível neste navegador.');
    });
    if (!request) this.scene.ui?.showMessage('No iPhone: Compartilhar → Adicionar à Tela de Início.');
  }

  onStickDown(event) {
    if (this.stickPointer !== null) return;
    event.preventDefault();
    this.scene.audio?.unlock();
    this.stickPointer = event.pointerId;
    this.zone.setPointerCapture?.(event.pointerId);
    const rect = this.zone.getBoundingClientRect();
    const half = this.base.offsetWidth / 2 || 56;
    const x = Math.min(Math.max(event.clientX - rect.left, half), rect.width - half);
    const y = Math.min(Math.max(event.clientY - rect.top, half), rect.height - half);
    this.origin = { x: rect.left + x, y: rect.top + y };
    this.base.style.left = `${x - half}px`;
    this.base.style.top = `${y - half}px`;
    this.base.style.bottom = 'auto';
    this.base.classList.add('is-active');
    this.onStickMove(event);
  }

  onStickMove(event) {
    if (event.pointerId !== this.stickPointer || !this.origin) return;
    const result = stickVector(event.clientX - this.origin.x, event.clientY - this.origin.y, this.stickRadius);
    this.vector = { x: result.x, y: result.y };
    this.knob.style.transform = `translate(${Math.round(result.knobX)}px, ${Math.round(result.knobY)}px)`;
  }

  onStickUp(event) {
    if (event.pointerId !== this.stickPointer) return;
    this.resetStick();
  }

  resetStick() {
    this.stickPointer = null;
    this.origin = null;
    this.vector = { x: 0, y: 0 };
    this.knob.style.transform = '';
    this.base.style.left = '';
    this.base.style.top = '';
    this.base.style.bottom = '';
    this.base.classList.remove('is-active');
  }

  // Chamado a cada quadro pela cena: esconde os controles quando um painel fullscreen está aberto.
  update({ hidden, nearCamp, campOpen }) {
    if (!this.enabled) return;
    const visible = !hidden;
    if (visible !== this.visible) {
      this.visible = visible;
      this.root.classList.toggle('is-hidden', !visible);
      if (!visible) {
        this.resetStick();
        this.dodgeQueued = false;
      }
    }
    this.campButton.hidden = !(nearCamp || campOpen);
    this.campButton.textContent = campOpen ? 'FECHAR' : 'ACAMP.';
  }

  destroy() {
    for (const remove of this.listeners) remove();
    this.listeners = [];
    document.body.classList.remove('is-touch');
  }
}
