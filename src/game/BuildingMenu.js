import {
  ANIMAL_PRODUCTS,
  FARM_CROPS,
  FORGE_RECIPES,
  MARKET_CATALOG,
  sellPriceOf
} from '../data/buildingSystems.js';
import { RESOURCE_TYPES } from './config.js';
import { BUILDINGS } from './Camp.js';

const BUILDING_TABS = {
  farm: [
    { id: 'planting', label: 'Plantio' },
    { id: 'animals', label: 'Animais' },
    { id: 'upgrades', label: 'Melhorias' }
  ],
  forge: [
    { id: 'craft', label: 'Criar' },
    { id: 'upgrades', label: 'Melhorias' }
  ],
  house: [
    { id: 'storage', label: 'Armazém' },
    { id: 'rest', label: 'Descanso' },
    { id: 'upgrades', label: 'Melhorias' }
  ],
  market: [
    { id: 'buy', label: 'Comprar' },
    { id: 'sell', label: 'Vender' }
  ]
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&#38;')
    .replaceAll('<', '&#60;')
    .replaceAll('>', '&#62;')
    .replaceAll('"', '&#34;')
    .replaceAll("'", '&#039;');
}

function formatCost(cost = {}) {
  return Object.entries(cost)
    .map(([type, amount]) => `${amount} ${RESOURCE_TYPES[type]?.label.toLowerCase() ?? type}`)
    .join(' · ');
}

function formatSeconds(seconds) {
  const safe = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return minutes > 0 ? `${minutes}min ${remainder}s` : `${remainder}s`;
}

export class BuildingMenu {
  constructor(scene) {
    this.scene = scene;
    this.root = document.getElementById('building-menu');
    this.title = document.getElementById('building-menu-title');
    this.kicker = document.getElementById('building-menu-kicker');
    this.tabs = document.getElementById('building-menu-tabs');
    this.content = document.getElementById('building-menu-content');
    this.footer = document.getElementById('building-menu-footer');
    this.closeButton = document.getElementById('building-menu-close');
    this.building = null;
    this.tab = null;

    this.handleClose = () => this.close();
    this.handleTabs = (event) => {
      const button = event.target.closest('button[data-tab]');
      if (!button) return;
      this.tab = button.dataset.tab;
      this.render();
    };
    this.handleContent = (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button || button.disabled) return;
      const result = this.scene.buildingMenuAction?.(button.dataset.action, button.dataset.arg, button.dataset.arg2);
      this.scene.lastBuildingMessage = result?.message ?? this.scene.lastBuildingMessage ?? '';
      this.render();
    };

    this.closeButton.addEventListener('click', this.handleClose);
    this.tabs.addEventListener('click', this.handleTabs);
    this.content.addEventListener('click', this.handleContent);
    scene.events.once('shutdown', () => {
      this.closeButton.removeEventListener('click', this.handleClose);
      this.tabs.removeEventListener('click', this.handleTabs);
      this.content.removeEventListener('click', this.handleContent);
      this.root.hidden = true;
    });
  }

  get isOpen() {
    return Boolean(this.building && !this.root.hidden);
  }

  open(building) {
    if (!BUILDING_TABS[building]) return false;
    this.building = building;
    this.tab = BUILDING_TABS[building][0].id;
    this.root.hidden = false;
    this.root.dataset.building = building;
    this.title.textContent = BUILDINGS[building].name;
    this.kicker.textContent = `Nível ${this.scene.camp.levels[building]} • LENDAS`;
    this.scene.onBuildingMenuStateChanged?.(true);
    this.render();
    this.closeButton.focus({ preventScroll: true });
    return true;
  }

  close() {
    if (!this.isOpen) return;
    this.root.hidden = true;
    this.building = null;
    this.tab = null;
    this.scene.onBuildingMenuStateChanged?.(false);
  }

  toggle(building) {
    if (this.isOpen && this.building === building) this.close();
    else this.open(building);
  }

  refresh() {
    if (this.isOpen) this.render();
  }

  render() {
    if (!this.isOpen) return;
    const definition = BUILDINGS[this.building];
    this.title.textContent = definition.name;
    this.kicker.textContent = `Nível ${this.scene.camp.levels[this.building]} • LENDAS`;
    this.tabs.innerHTML = BUILDING_TABS[this.building].map((tab) => `
      <button type="button" data-tab="${tab.id}" aria-selected="${tab.id === this.tab}">${escapeHtml(tab.label)}</button>
    `).join('');
    const scrollTop = this.content.scrollTop;
    this.content.innerHTML = this.renderContent();
    this.content.scrollTop = scrollTop;
    this.footer.textContent = this.scene.lastBuildingMessage ?? 'Toque em um botão grande para executar a ação.';
  }

  renderContent() {
    if (this.building === 'farm') return this.renderFarm();
    if (this.building === 'forge') return this.renderForge();
    if (this.building === 'house') return this.renderHouse();
    return this.renderMarket();
  }

  renderFarm() {
    const farm = this.scene.farm;
    if (this.tab === 'animals') {
      const cards = Object.entries(ANIMAL_PRODUCTS).map(([type, product]) => {
        const animal = farm.animals[type];
        const remaining = Math.max(0, (animal.readyAt - Date.now()) / 1000);
        const ready = remaining <= 0;
        return `
          <article class="building-menu__card">
            <h2>${escapeHtml(product.animal)}</h2>
            <p>Produto: ${escapeHtml(product.name)} • Available a cada 120 segundos.</p>
            <div class="building-menu__stat">${ready ? 'PRONTO PARA COLETAR' : `Faltam ${formatSeconds(remaining)}`}</div>
            <div class="building-menu__actions">
              <button type="button" data-action="collect-animal" data-arg="${type}" ${ready ? '' : 'disabled'}>COLETAR ${escapeHtml(product.name.toUpperCase())}</button>
            </div>
          </article>
        `;
      }).join('');
      return `<div class="building-menu__grid">${cards}</div>`;
    }
    if (this.tab === 'upgrades') return this.renderUpgrade('farm');
    const cards = farm.plots.map((plot) => {
      if (!plot.crop) {
        const choices = Object.entries(FARM_CROPS).map(([type, crop]) => `
          <button type="button" data-action="plant" data-arg="${plot.id}" data-arg2="${type}" ${this.scene.inventory.items.seeds > 0 ? '' : 'disabled'}>
            PLANTAR ${escapeHtml(crop.name.toUpperCase())} • ${crop.seconds}s
          </button>
        `).join('');
        return `
          <article class="building-menu__card">
            <h2>Canteiro ${plot.id + 1}</h2>
            <p>Vazio • 1 semente por plantio</p>
            <div class="building-menu__actions">${choices}</div>
          </article>
        `;
      }
      const crop = FARM_CROPS[plot.crop];
      const remaining = Math.max(0, (plot.readyAt - Date.now()) / 1000);
      const ready = remaining <= 0;
      return `
        <article class="building-menu__card">
          <h2>Canteiro ${plot.id + 1} • ${escapeHtml(crop.name)}</h2>
          <p>${ready ? 'Colheita pronta.' : `Crescimento: ${formatSeconds(remaining)}`}</p>
          <div class="building-menu__stat">${escapeHtml(crop.name)} • ${crop.seconds}s</div>
          <div class="building-menu__actions">
            <button type="button" class="building-menu__content button--primary" data-action="harvest" data-arg="${plot.id}" ${ready ? '' : 'disabled'}>COLHER</button>
          </div>
        </article>
      `;
    }).join('');
    return `
      <div class="building-menu__stats">
        <div class="building-menu__stat">Sementes: ${this.scene.inventory.items.seeds}</div>
        <div class="building-menu__stat">Canteiros: ${farm.plotCount}</div>
        <div class="building-menu__stat">Colheita automática: ${farm.level >= 3 ? 'ATIVA' : 'NÍVEL 3'}</div>
      </div>
      <div class="building-menu__grid">${cards}</div>
    `;
  }

  renderForge() {
    if (this.tab === 'upgrades') return this.renderUpgrade('forge');
    const recipes = Object.entries(FORGE_RECIPES)
      .filter(([id, recipe]) => !recipe.requiresBoss || this.scene.camp.equipment.isRecipeUnlocked(id))
      .map(([id, recipe]) => {
      const crafted = this.scene.camp.equipment.has(id);
      const locked = this.scene.camp.levels.forge < recipe.level;
      const missingBase = recipe.requires && !this.scene.camp.equipment.has(recipe.requires);
      const affordable = this.scene.inventory.has(recipe.cost);
      const disabled = crafted || locked || missingBase || !affordable;
      let status = crafted ? 'CRIADO' : locked ? `REQUER NÍVEL ${recipe.level}` : missingBase ? 'REQUER EQUIPAMENTO BASE' : affordable ? 'RECURSOS OK' : 'RECURSOS INSUFICIENTES';
      return `
        <article class="building-menu__card">
          <h2>${escapeHtml(recipe.name)}</h2>
          <p>${escapeHtml(recipe.description)}</p>
          <div class="building-menu__stat">${escapeHtml(formatCost(recipe.cost))}</div>
          <div class="building-menu__stat">${status}</div>
          <div class="building-menu__actions">
            <button type="button" data-action="craft" data-arg="${id}" ${disabled ? 'disabled' : ''}>CRIAR</button>
          </div>
        </article>
      `;
    }).join('');
    const equipment = this.scene.camp.equipment.getBonuses();
    return `
      <div class="building-menu__stats">
        <div class="building-menu__stat">ATQ equipamento: +${equipment.attack}</div>
        <div class="building-menu__stat">DEF equipamento: +${equipment.defense}</div>
        <div class="building-menu__stat">Picareta: ${this.scene.camp.pickaxeTier ?? 'NENHUMA'}</div>
      </div>
      <div class="building-menu__grid">${recipes}</div>
    `;
  }

  renderHouse() {
    if (this.tab === 'rest') {
      const resting = this.scene.restState;
      return `
        <div class="building-menu__grid">
          <article class="building-menu__card">
            <h2>Descansar</h2>
            <p>Restaura toda a vida e avança 30 minutos do relógio do jogo após 30 segundos reais.</p>
            <div class="building-menu__actions">
              <button type="button" class="building-menu__content button--primary" data-action="rest" ${resting ? 'disabled' : ''}>
                ${resting ? `DESCANSANDO • ${Math.max(0, Math.ceil((resting.endsAt - Date.now()) / 1000))}s` : 'DESCANSAR 30s'}
              </button>
            </div>
          </article>
          <article class="building-menu__card">
            <h2>Dormir</h2>
            <p>Pula diretamente para a manhã do próximo dia, restaura a vida e salva o progresso.</p>
            <div class="building-menu__actions">
              <button type="button" data-action="sleep" ${resting ? 'disabled' : ''}>DORMIR ATÉ O PRÓXIMO DIA</button>
            </div>
          </article>
        </div>
      `;
    }
    if (this.tab === 'upgrades') return this.renderUpgrade('house');
    const rows = Object.entries(RESOURCE_TYPES).map(([type, resource]) => `
      <div class="building-menu__resource">
        <span>${escapeHtml(resource.label)}</span>
        <span>Mochila: ${this.scene.inventory.items[type]}</span>
        <span>Armazém: ${this.scene.camp.storage[type]}</span>
        <button type="button" data-action="deposit" data-arg="${type}" ${this.scene.inventory.items[type] > 0 && this.scene.camp.storageUsed < this.scene.camp.storageCapacity ? '' : 'disabled'}>GUARDAR 1</button>
        <button type="button" data-action="withdraw" data-arg="${type}" ${this.scene.camp.storage[type] > 0 ? '' : 'disabled'}>RETIRAR 1</button>
      </div>
    `).join('');
    return `
      <div class="building-menu__stats">
        <div class="building-menu__stat">Capacidade: ${this.scene.camp.storageUsed}/${this.scene.camp.storageCapacity}</div>
        <div class="building-menu__stat">Nível da casa: ${this.scene.camp.levels.house}</div>
        <div class="building-menu__stat">Mochila: ${this.scene.inventory.usedSlots}/${this.scene.inventory.maxSlots} slots</div>
      </div>
      <div class="building-menu__card building-menu__card--wide">
        <div class="building-menu__actions">
          <button type="button" class="building-menu__content button--primary" data-action="store-all" ${this.scene.inventory.total > 0 ? '' : 'disabled'}>GUARDAR TUDO DA MOCHILA</button>
        </div>
        ${rows}
      </div>
    `;
  }

  renderMarket() {
    if (this.tab === 'sell') {
      const rows = Object.entries(RESOURCE_TYPES).map(([type, resource]) => `
        <div class="building-menu__resource">
          <span>${escapeHtml(resource.label)}</span>
          <span>Quantidade: ${this.scene.inventory.items[type]}</span>
          <span>Preço: ${sellPriceOf(type)} ${sellPriceOf(type) === 1 ? 'moeda' : 'moedas'}</span>
          <button type="button" data-action="sell" data-arg="${type}" ${this.scene.inventory.items[type] > 0 ? '' : 'disabled'}>VENDER 1</button>
          <span>${escapeHtml(resource.label)}</span>
        </div>
      `).join('');
      return `
        <div class="building-menu__card building-menu__card--wide">
          <h2>Vender recursos</h2>
          <p>Recursos raros e noturnos valem mais que os básicos.</p>
          ${rows}
        </div>
      `;
    }
    const cards = this.scene.market.offers.map((offer) => {
      const definition = MARKET_CATALOG.find((entry) => entry.id === offer.id);
      const affordable = this.scene.economy.coins >= definition.price;
      return `
        <article class="building-menu__card">
          <h2>${escapeHtml(definition.name)}</h2>
          <p>Estoque: ${offer.quantity} • Entrega: ${formatCost(definition.yield)}</p>
          <div class="building-menu__stat">Preço: ${definition.price} moedas</div>
          <div class="building-menu__actions">
            <button type="button" data-action="buy" data-arg="${offer.id}" ${offer.quantity > 0 && affordable ? '' : 'disabled'}>COMPRAR 1</button>
          </div>
        </article>
      `;
    }).join('');
    return `
      <div class="building-menu__stats">
        <div class="building-menu__stat">Estoque do dia ${this.scene.market.day}</div>
        <div class="building-menu__stat">Ofertas: ${this.scene.market.offers.length}/6</div>
      </div>
      <div class="building-menu__grid">${cards}</div>
    `;
  }

  renderUpgrade(building) {
    const level = this.scene.camp.levels[building];
    const definition = BUILDINGS[building];
    const nextLevel = level + 1;
    const cost = nextLevel <= 3 ? definition.costs[nextLevel - 2] : null;
    const affordable = cost && this.scene.inventory.has(cost);
    let description = 'Melhoria máxima já alcançada.';
    if (building === 'farm' && nextLevel === 2) description = 'Aumenta os canteiros de 4 para 6.';
    if (building === 'farm' && nextLevel === 3) description = 'Aumenta para 8 canteiros e ativa a colheita automática.';
    if (building === 'forge' && nextLevel === 2) description = 'Desbloqueia Espada de Aço e Peitoral de Aço.';
    if (building === 'forge' && nextLevel === 3) description = 'Desbloqueia encantamentos simples de ataque e defesa.';
    if (building === 'house' && nextLevel === 2) description = 'Aumenta a capacidade do armazém.';
    if (building === 'house' && nextLevel === 3) description = 'Aumenta novamente a capacidade do armazém.';
    if (building === 'market' && nextLevel === 2) description = 'Melhora o equipamento do mercado.';
    if (building === 'market' && nextLevel === 3) description = 'Melhora novamente o equipamento do mercado.';
    return `
      <div class="building-menu__grid">
        <article class="building-menu__card">
          <h2>${escapeHtml(definition.name)} • Nível ${level}/3</h2>
          <p>${escapeHtml(description)}</p>
          <div class="building-menu__stat">${cost ? `Próximo custo: ${escapeHtml(formatCost(cost))}` : 'Nível máximo'}</div>
          <div class="building-menu__actions">
            <button type="button" class="building-menu__content button--primary" data-action="upgrade" data-arg="${building}" ${cost && affordable ? '' : 'disabled'}>
              ${cost ? `MELHORAR PARA NÍVEL ${nextLevel}` : 'NÍVEL MÁXIMO'}
            </button>
          </div>
        </article>
      </div>
    `;
  }
}
