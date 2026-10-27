import { collectEffects } from './ActiveEffects.js';

// Ícones dos efeitos ativos perto da barra de vida. Tocar num ícone explica o efeito.
export class EffectsPanel {
  constructor(scene) {
    this.scene = scene;
    const host = document.getElementById('game') ?? document.body;
    this.root = document.createElement('div');
    this.root.id = 'effects-panel';
    this.root.className = 'effects-panel';
    this.root.hidden = true;
    this.tip = document.createElement('div');
    this.tip.id = 'effects-tip';
    this.tip.className = 'effects-tip';
    this.tip.hidden = true;
    host.append(this.root, this.tip);
    this.effects = [];
    this.signature = '';
    this.selected = null;
    this.elapsed = 0;

    this.handleClick = (event) => {
      const button = event.target.closest('button[data-effect]');
      if (!button) return;
      event.stopPropagation();
      this.selected = this.selected === button.dataset.effect ? null : button.dataset.effect;
      this.renderTip();
    };
    this.stopDown = (event) => event.stopPropagation();
    this.root.addEventListener('click', this.handleClick);
    for (const type of ['pointerdown', 'mousedown', 'touchstart']) this.root.addEventListener(type, this.stopDown);
    this.tip.addEventListener('click', () => {
      this.selected = null;
      this.renderTip();
    });
    scene.events.once('shutdown', () => this.destroy());
  }

  currentEffects() {
    const scene = this.scene;
    const hunts = scene.hunts;
    const hunt = hunts?.hunt
      ? { progress: `${hunts.active.progress}/${hunts.hunt.count}`, label: `Caçada: ${hunts.label()}` }
      : null;
    return collectEffects({
      buffs: scene.buffs?.list() ?? [],
      blessed: Boolean(scene.gear?.blessed),
      paralyzedMs: scene.player?.paralyzedMs ?? 0,
      hunt,
      dayCount: scene.timeState?.dayCount ?? 0
    });
  }

  /** Chamado a cada quadro; só mexe no DOM a cada 250 ms. */
  update(delta) {
    this.elapsed += delta;
    if (this.elapsed < 250) return;
    this.elapsed = 0;
    this.refresh();
  }

  refresh() {
    this.effects = this.currentEffects();
    const phone = Boolean(this.scene.ui?.metrics?.phone);
    this.root.classList.toggle('is-phone', phone);
    this.tip.classList.toggle('is-phone', phone);
    // Ao lado do painel de vida (a barra rápida fica embaixo dele).
    const bg = this.scene.ui?.hudBg;
    if (bg) {
      const left = Math.round(bg.x + bg.width / 2 + 8);
      const top = Math.round(bg.y - bg.height / 2);
      this.root.style.left = `${left}px`;
      this.root.style.top = `${top}px`;
      this.tip.style.left = `${left}px`;
      this.tip.style.top = `${top + 46}px`;
    }
    const signature = this.effects.map((effect) => effect.id).join(',');
    if (signature !== this.signature) {
      this.signature = signature;
      this.root.innerHTML = this.effects.map((effect) => `
        <button type="button" class="effects-panel__icon effects-panel__icon--${effect.kind}" data-effect="${effect.id}" aria-label="${effect.name}">
          <b>${effect.icon}</b><span data-time></span>
        </button>`).join('');
      this.root.hidden = this.effects.length === 0;
    }
    this.effects.forEach((effect, index) => {
      const time = this.root.children[index]?.querySelector('[data-time]');
      if (time && time.textContent !== effect.time) time.textContent = effect.time;
    });
    if (this.selected && !this.effects.some((effect) => effect.id === this.selected)) this.selected = null;
    this.renderTip();
  }

  renderTip() {
    const effect = this.effects.find((candidate) => candidate.id === this.selected);
    this.tip.hidden = !effect;
    if (effect) this.tip.innerHTML = `<strong>${effect.name}${effect.time ? ` • ${effect.time}` : ''}</strong><span>${effect.description}</span>`;
  }

  destroy() {
    this.root.remove();
    this.tip.remove();
  }
}
