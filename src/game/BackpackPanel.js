import { CONSUMABLES, isConsumable } from '../data/consumables.js';
import { RESOURCE_TYPES } from './config.js';
import { resourceIconHtml, textureUrl } from './iconUrls.js';

const USE_LABEL = {
  potion: 'BEBER',
  staminaPotion: 'BEBER',
  elixir: 'BEBER',
  food: 'COMER',
  milk: 'BEBER',
  egg: 'COMER',
  torch: 'ACENDER',
  trap: 'ARMAR'
};

function describe(type) {
  const consumable = CONSUMABLES[type];
  if (!consumable) return 'Material';
  if (consumable.heal) return `+${consumable.heal} vida • tecla ${consumable.hotkey}`;
  if (consumable.stamina) return `Vigor cheio • tecla ${consumable.hotkey}`;
  if (consumable.trap) return `Armadilha • tecla ${consumable.hotkey}`;
  if (consumable.buff) return `+20% ATQ/DEF • tecla ${consumable.hotkey}`;
  return `Luz maior • tecla ${consumable.hotkey}`;
}

/**
 * Painel lateral da mochila (tecla B ou botão no HUD). Mostra os 12 espaços,
 * deixa usar comida e poções com um clique e guardar tudo no acampamento.
 * O jogo continua rodando com o painel aberto.
 */
export class BackpackPanel {
  constructor(scene) {
    this.scene = scene;
    this.root = document.getElementById('backpack-panel');
    this.grid = document.getElementById('backpack-grid');
    this.summary = document.getElementById('backpack-summary');
    this.footer = document.getElementById('backpack-footer');
    this.icon = document.getElementById('backpack-icon');
    this.closeButton = document.getElementById('backpack-close');
    this.lastKey = '';
    this.icon.src = textureUrl(scene, 'hud-backpack');

    this.handleClick = (event) => {
      const button = event.target.closest('button[data-bag]');
      if (!button || button.disabled) return;
      if (button.dataset.bag === 'info') {
        this.scene.itemInfo?.open(button.dataset.type);
        return;
      }
      if (button.dataset.bag === 'use') this.scene.useItem(button.dataset.type);
      if (button.dataset.bag === 'store-all') this.scene.storeAllAtCamp();
      this.lastKey = '';
      this.refresh();
    };
    this.handleClose = () => this.close();
    this.root.addEventListener('click', this.handleClick);
    // Toques na mochila não chegam ao mundo do jogo embaixo dela.
    this.stopDown = (event) => event.stopPropagation();
    for (const type of ['pointerdown', 'mousedown', 'touchstart']) this.root.addEventListener(type, this.stopDown);
    this.closeButton.addEventListener('click', this.handleClose);
    scene.events.once('shutdown', () => {
      this.root.removeEventListener('click', this.handleClick);
      this.closeButton.removeEventListener('click', this.handleClose);
      this.root.hidden = true;
    });
  }

  get isOpen() {
    return !this.root.hidden;
  }

  open() {
    this.root.hidden = false;
    this.lastKey = '';
    this.refresh();
  }

  close() {
    this.root.hidden = true;
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  refresh() {
    if (!this.isOpen) return;
    const scene = this.scene;
    const inventory = scene.inventory;
    const storeAll = Boolean(scene.ui?.storeAllAvailable);
    const occupied = Object.entries(inventory.items).filter(([, amount]) => amount > 0).slice(0, inventory.maxSlots);
    // Só redesenha quando algo muda (o HUD chama refresh a cada quadro).
    const key = JSON.stringify([occupied, storeAll, inventory.maxSlots]);
    if (key === this.lastKey) return;
    this.lastKey = key;

    const slots = Array.from({ length: inventory.maxSlots }, (_, index) => {
      const entry = occupied[index];
      if (!entry) return '<div class="bag-slot bag-slot--empty" aria-label="Espaço vazio"></div>';
      const [type, amount] = entry;
      const label = RESOURCE_TYPES[type]?.label ?? type;
      const usable = isConsumable(type);
      return `
        <div class="bag-slot ${usable ? 'bag-slot--usable' : ''}" title="${label}">
          <button type="button" class="bag-slot__look" data-bag="info" data-type="${type}" aria-label="Informações: ${label}">
            <span class="bag-slot__icon">${resourceIconHtml(scene, type, 32)}<span class="bag-slot__count">${amount}</span></span>
            <span class="bag-slot__name">${label}</span>
          </button>
          <div class="bag-slot__info">${describe(type)}</div>
          ${usable ? `<button type="button" data-bag="use" data-type="${type}">${USE_LABEL[type] ?? 'USAR'}</button>` : ''}
        </div>`;
    }).join('');
    this.grid.innerHTML = slots;
    this.summary.textContent = `${inventory.usedSlots}/${inventory.maxSlots} espaços • ${inventory.total}/${inventory.totalCapacity} itens`;
    this.footer.innerHTML = storeAll
      ? `<button type="button" class="button--primary" data-bag="store-all" ${inventory.total === 0 ? 'disabled' : ''}>GUARDAR TUDO NA CASA</button>`
      : '<p>Teclas rápidas: 1 poção • 2 comer • 3 tocha • 4 vigor/armadilha • 5 elixir</p>';
  }
}
