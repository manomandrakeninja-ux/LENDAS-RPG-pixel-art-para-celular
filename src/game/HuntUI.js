import { REGION_CENTERS, regionAt } from '../data/worldRegions.js';

const ARROW_KEY = 'lendas-seta';

function readArrowSetting() {
  try {
    return localStorage.getItem(ARROW_KEY) !== 'off';
  } catch {
    return true;
  }
}

/** Contador da caçada ativa, botão da seta e seta de navegação (HTML por cima do jogo). */
export class HuntUI {
  constructor(scene) {
    this.scene = scene;
    this.root = document.getElementById('game');
    this.arrowOn = readArrowSetting();
    const make = (tag, className, html = '') => {
      const element = document.createElement(tag);
      element.className = className;
      element.innerHTML = html;
      this.root.appendChild(element);
      return element;
    };
    this.hud = make('div', 'hunt-hud');
    this.counter = document.createElement('div');
    this.counter.className = 'hunt-counter';
    this.counter.hidden = true;
    this.toggle = document.createElement('button');
    this.toggle.type = 'button';
    this.toggle.className = 'nav-toggle';
    this.hud.append(this.counter, this.toggle);
    this.arrow = make('div', 'nav-arrow', '<span class="nav-arrow__shape"></span><span class="nav-arrow__label"></span>');
    this.arrow.hidden = true;
    this.handleToggle = (event) => {
      event.stopPropagation();
      this.setArrow(!this.arrowOn);
    };
    this.toggle.addEventListener('click', this.handleToggle);
    scene.events.once('shutdown', () => this.destroy());
    this.refresh();
  }

  setArrow(on) {
    this.arrowOn = Boolean(on);
    try {
      localStorage.setItem(ARROW_KEY, this.arrowOn ? 'on' : 'off');
    } catch {
      // Sem armazenamento: a escolha vale só até recarregar.
    }
    this.refresh();
    if (!this.arrowOn) this.arrow.hidden = true;
  }

  get hunts() {
    return this.scene.hunts;
  }

  refresh() {
    const hunts = this.hunts;
    this.toggle.textContent = `SETA: ${this.arrowOn ? 'LIGADA' : 'DESLIGADA'}`;
    this.toggle.classList.toggle('is-off', !this.arrowOn);
    this.toggle.setAttribute('aria-pressed', String(this.arrowOn));
    if (hunts?.hunt) {
      this.counter.hidden = false;
      this.counter.textContent = hunts.complete ? `${hunts.label()} - entregue na Fogueira!` : hunts.label();
      this.counter.classList.toggle('is-complete', hunts.complete);
    } else {
      this.counter.hidden = true;
      this.counter.classList.remove('is-complete');
    }
  }

  /** Alvo da seta: missão ativa da campanha; senão a região da caçada (ou a Fogueira ao concluir). */
  navTarget() {
    const scene = this.scene;
    const mission = scene.campaign?.trackedTarget?.();
    if (mission) return { kind: 'mission', name: mission.name, x: mission.x, y: mission.y };
    const hunts = this.hunts;
    const hunt = hunts?.hunt;
    if (!hunt) return null;
    const camp = scene.worldBounds?.camp ?? scene.camp;
    if (hunts.complete) return { kind: 'hunt', name: 'Fogueira', x: camp.x, y: camp.y };
    if (regionAt(scene.player.x, scene.player.y) === hunt.region) return null;
    const center = REGION_CENTERS[hunt.region] ?? camp;
    return { kind: 'hunt', name: hunts.regionName(), x: center.x, y: center.y };
  }

  update() {
    const scene = this.scene;
    if (!this.arrowOn || !scene.player) {
      this.arrow.hidden = true;
      return;
    }
    const target = this.navTarget();
    this.currentTarget = target;
    if (!target) {
      this.arrow.hidden = true;
      return;
    }
    const camera = scene.cameras.main;
    const view = camera.worldView;
    const width = this.root.clientWidth;
    const height = this.root.clientHeight;
    const toScreen = (x, y) => ({ x: ((x - view.x) / view.width) * width, y: ((y - view.y) / view.height) * height });
    const point = toScreen(target.x, target.y);
    const margin = 44;
    if (point.x > margin && point.x < width - margin && point.y > margin && point.y < height - margin) {
      this.arrow.hidden = true;
      return;
    }
    const center = toScreen(scene.player.x, scene.player.y);
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const scale = Math.min(
      dx === 0 ? Infinity : ((dx > 0 ? width - margin : margin) - center.x) / dx,
      dy === 0 ? Infinity : ((dy > 0 ? height - margin : margin) - center.y) / dy
    );
    const x = Math.min(width - margin, Math.max(margin, center.x + dx * scale));
    const y = Math.min(height - margin, Math.max(margin, center.y + dy * scale));
    const steps = Math.round(Math.hypot(target.x - scene.player.x, target.y - scene.player.y) / 10);
    this.arrow.hidden = false;
    this.arrow.style.left = `${x}px`;
    this.arrow.style.top = `${y}px`;
    this.arrow.querySelector('.nav-arrow__shape').style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    this.arrow.querySelector('.nav-arrow__label').textContent = `${target.name} • ${steps}`;
  }

  destroy() {
    this.toggle.removeEventListener('click', this.handleToggle);
    this.hud.remove();
    this.arrow.remove();
  }
}
