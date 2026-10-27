import { HERO_GENDERS, HERO_LABELS, heroTexture } from './HeroStyle.js';
import { textureUrl } from './iconUrls.js';

/**
 * Escolha do personagem (masculino/feminino) no início de um jogo novo.
 * Nos testes automáticos (Chrome headless) ela não aparece, como a tela de início;
 * ?escolha=1 força a tela. A escolha também pode ser mudada depois em Ajustes.
 */
export function shouldAskHero() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('escolha') === '1') return true;
  if (params.get('escolha') === '0') return false;
  return !/HeadlessChrome/.test(navigator.userAgent);
}

export class HeroChoice {
  constructor(scene) {
    this.scene = scene;
    const host = document.getElementById('game') ?? document.body;
    this.root = document.createElement('div');
    this.root.id = 'hero-choice';
    this.root.className = 'item-info hero-choice';
    const cards = HERO_GENDERS.map((gender) => {
      const url = textureUrl(scene, heroTexture(gender), 1);
      return `
        <button type="button" class="hero-choice__card" data-gender="${gender}">
          <img class="pixel-icon" src="${url}" alt="" width="64" height="80">
          <span>${HERO_LABELS[gender].toUpperCase()}</span>
        </button>`;
    }).join('');
    this.root.innerHTML = `
      <section class="item-info__card" role="dialog" aria-modal="true" aria-labelledby="hero-choice-title">
        <header class="item-info__header">
          <div>
            <p class="item-info__kicker">NOVO JOGO</p>
            <h2 class="item-info__name" id="hero-choice-title">Escolha seu herói</h2>
          </div>
        </header>
        <div class="item-info__body hero-choice__body">${cards}</div>
        <footer class="item-info__footer"><span>Dá para mudar depois em Ajustes.</span></footer>
      </section>`;
    host.append(this.root);
    this.handleClick = (event) => {
      const button = event.target.closest('button[data-gender]');
      if (!button) return;
      this.scene.setHeroGender(button.dataset.gender);
      this.close();
    };
    this.stopDown = (event) => event.stopPropagation();
    this.root.addEventListener('click', this.handleClick);
    for (const type of ['pointerdown', 'mousedown', 'touchstart']) this.root.addEventListener(type, this.stopDown);
    scene.events.once('shutdown', () => this.root.remove());
  }

  get isOpen() {
    return Boolean(this.root) && !this.root.hidden && this.root.isConnected;
  }

  close() {
    this.root.hidden = true;
    this.root.remove();
  }
}
