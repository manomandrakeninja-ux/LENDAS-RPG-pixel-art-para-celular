import { ACCESSORIES, ANIMAL_PRODUCTS, ENCHANTMENTS, FARM_CROPS, FORGE_RECIPES, FORGE_SERVICES } from '../data/buildingSystems.js';
import {
  BUILDING_DEFS,
  BUILDING_ORDER,
  MAX_BUILDING_LEVEL,
  MAX_DURABILITY,
  availableFor,
  hasUnlock,
  levelDescription
} from '../data/buildings.js';
import { MARKET_CATALOG, findCatalogEntry, sellPriceOf } from '../data/economy.js';
import { TRAVELER_GOODS, questById } from '../data/travelers.js';
import { TORCH_RECIPE } from '../data/itemCatalog.js';
import { RESOURCE_TYPES } from './config.js';
import { resourceIconHtml, textureUrl } from './iconUrls.js';

// Desenho de cada prédio no cabeçalho e nos cartões (textura, quadro).
const PORTRAITS = {
  camp: ['buildings', 'campfire-0'],
  campfire: ['buildings', 'campfire-0'],
  farm: ['buildings', 'farm'],
  forge: ['buildings', 'forge'],
  house: ['buildings', 'house'],
  market: ['buildings', 'store'],
  wall: ['wall-door'],
  tower: ['tower-wood']
};

const UPGRADES_TAB = { id: 'upgrades', label: 'Níveis' };

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&#38;')
    .replaceAll('<', '&#60;')
    .replaceAll('>', '&#62;')
    .replaceAll('"', '&#34;')
    .replaceAll("'", '&#039;');
}

const resourceLabel = (type) => (type === 'coins' ? 'moedas' : RESOURCE_TYPES[type]?.label.toLowerCase() ?? type);

function formatBundle(bundle = {}) {
  return Object.entries(bundle).map(([type, amount]) => `${amount} ${resourceLabel(type)}`).join(' · ');
}

function formatSeconds(seconds) {
  const safe = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return minutes > 0 ? `${minutes}min ${remainder}s` : `${remainder}s`;
}

const disabled = (condition) => (condition ? 'disabled' : '');

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
    this.portrait = document.getElementById('building-menu-portrait');
    this.levelbar = document.getElementById('building-menu-levelbar');
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
      // Ícone/nome de um item: abre o painel de informações (não executa a ação).
      const item = event.target.closest('[data-item]');
      if (item) {
        this.scene.itemInfo?.open(item.dataset.item, { need: Number(item.dataset.need) || null });
        return;
      }
      const button = event.target.closest('button[data-action]');
      if (!button || button.disabled) return;
      if (button.dataset.action === 'open') {
        this.open(button.dataset.arg);
        return;
      }
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

  get camp() {
    return this.scene.camp;
  }

  get isOpen() {
    return Boolean(this.building && !this.root.hidden);
  }

  tabsFor(building) {
    const camp = this.camp;
    if (building === 'camp') return [{ id: 'overview', label: 'Prédios' }];
    const level = camp.levels[building];
    if (level === 0 || camp.durability[building] <= 0) return [UPGRADES_TAB];
    const unlocked = (unlock) => hasUnlock(building, unlock, level);
    const tabs = {
      campfire: [
        { id: 'fire', label: 'Fogueira' },
        ...(this.scene.travelers?.present || this.scene.travelers?.activeQuest ? [{ id: 'traveler', label: 'Viajante' }] : [])
      ],
      farm: [
        { id: 'planting', label: 'Plantio' },
        ...(this.scene.farm.unlockedAnimals.length > 0 ? [{ id: 'animals', label: 'Animais' }] : []),
        ...(this.scene.farm.barnCapacity > 0 ? [{ id: 'barn', label: 'Celeiro' }] : [])
      ],
      forge: [
        { id: 'craft', label: 'Criar' },
        { id: 'gear', label: 'Equipamento' }
      ],
      house: [
        { id: 'storage', label: 'Armazém' },
        ...(unlocked('secretChest') ? [{ id: 'secret', label: 'Baú secreto' }] : []),
        { id: 'rest', label: 'Descanso' }
      ],
      market: [
        { id: 'buy', label: 'Comprar' },
        ...(this.scene.market.canSell ? [{ id: 'sell', label: 'Vender' }] : []),
        ...(this.scene.market.travelerOffers.length > 0 ? [{ id: 'traveler', label: 'Viajante' }] : []),
        ...(this.scene.market.canOrder ? [{ id: 'orders', label: 'Encomendas' }] : []),
        ...(this.scene.market.hasAuctionToday ? [{ id: 'auction', label: 'Leilão' }] : [])
      ],
      wall: [{ id: 'wall', label: 'Muralha' }],
      tower: [{ id: 'tower', label: 'Torre' }]
    };
    return [...tabs[building], UPGRADES_TAB];
  }

  open(building) {
    if (building !== 'camp' && !BUILDING_DEFS[building]) return false;
    this.building = building;
    this.tab = this.tabsFor(building)[0].id;
    this.root.hidden = false;
    this.root.dataset.building = building;
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
    const tabs = this.tabsFor(this.building);
    if (!tabs.some((tab) => tab.id === this.tab)) this.tab = tabs[0].id;
    if (this.building === 'camp') {
      this.title.textContent = 'Acampamento';
      this.kicker.textContent = `Dia ${this.scene.timeState?.dayCount ?? 1} • LENDAS`;
    } else {
      const level = this.camp.levels[this.building];
      this.title.textContent = BUILDING_DEFS[this.building].name;
      this.kicker.textContent = level === 0 ? 'Não construído • LENDAS' : `Nível ${level}/${MAX_BUILDING_LEVEL} • LENDAS`;
    }
    this.portrait.src = this.portraitUrl(this.building);
    const level = this.building === 'camp' ? null : this.camp.levels[this.building];
    this.levelbar.innerHTML = level === null ? '' : Array.from({ length: MAX_BUILDING_LEVEL }, (_, index) =>
      `<span class="${index < level ? 'is-done' : index === level ? 'is-next' : ''}"></span>`).join('');
    this.tabs.innerHTML = tabs.map((tab) => `
      <button type="button" data-tab="${tab.id}" aria-selected="${tab.id === this.tab}">${escapeHtml(tab.label)}</button>
    `).join('');
    // Só troca o conteúdo quando algo mudou: redesenhar a cada meio segundo
    // trocava os botões no meio de um clique e o clique se perdia.
    const html = this.renderContent();
    if (html !== this.lastContentHtml || !this.content.firstChild) {
      const scrollTop = this.content.scrollTop;
      this.lastContentHtml = html;
      this.content.innerHTML = html;
      this.decorate();
      this.content.scrollTop = scrollTop;
    }
    this.footer.textContent = this.scene.lastBuildingMessage || 'Toque em um botão grande para executar a ação.';
  }

  renderContent() {
    if (this.building === 'camp') return this.renderOverview();
    if (this.tab === 'upgrades') return this.renderUpgrade(this.building);
    const renderers = {
      campfire: () => this.renderCampfire(),
      farm: () => this.renderFarm(),
      forge: () => this.renderForge(),
      house: () => this.renderHouse(),
      market: () => this.renderMarket(),
      wall: () => this.renderWall(),
      tower: () => this.renderTower()
    };
    return renderers[this.building]();
  }

  costHtml(cost) {
    const sources = this.camp.paymentSources();
    return Object.entries(cost).map(([type, amount]) => {
      const have = availableFor(type, sources);
      const ok = have >= amount;
      const inner = `${resourceIconHtml(this.scene, type, 16)}${amount} ${escapeHtml(resourceLabel(type))} <small>(${Math.min(have, 9999)})</small>`;
      if (type === 'coins') return `<span class="cost-chip ${ok ? 'cost-ok' : 'cost-missing'}" title="moedas">${inner}</span>`;
      return `<button type="button" class="cost-chip ${ok ? 'cost-ok' : 'cost-missing'}" data-item="${type}" data-need="${amount}" title="Ver ${escapeHtml(resourceLabel(type))}">${inner}</button>`;
    }).join('');
  }

  /** Itens entregues (mercado, viajante): botões que abrem o painel do item. */
  itemChips(bundle = {}) {
    return Object.entries(bundle).map(([type, amount]) =>
      `<button type="button" class="cost-chip item-chip" data-item="${type}" title="Ver ${escapeHtml(resourceLabel(type))}">${resourceIconHtml(this.scene, type, 16)}${amount} ${escapeHtml(resourceLabel(type))}</button>`).join('');
  }

  /** Ícone de recurso clicável nas listas (armazém, venda). */
  itemIcon(type) {
    return `<button type="button" class="item-icon-button" data-item="${type}" aria-label="Informações: ${escapeHtml(resourceLabel(type))}">${resourceIconHtml(this.scene, type, 24)}</button>`;
  }

  portraitUrl(key) {
    const [texture, frame] = PORTRAITS[key] ?? PORTRAITS.camp;
    return textureUrl(this.scene, texture, frame);
  }

  /** Transforma "Rótulo: valor" das fichas em rótulo pequeno + valor destacado. */
  decorate() {
    for (const stat of this.content.querySelectorAll('.building-menu__stat')) {
      const html = stat.innerHTML;
      const split = html.indexOf(': ');
      const tag = html.indexOf('<');
      if (split <= 0 || (tag >= 0 && tag < split)) continue;
      stat.innerHTML = `<span class="stat__label">${html.slice(0, split)}</span><span class="stat__value">${html.slice(split + 2)}</span>`;
    }
  }

  durabilityText(key) {
    const durability = this.camp.durability[key];
    if (durability <= 0) return 'DESTRUÍDO';
    if (durability < MAX_DURABILITY) return `DANIFICADO ${durability}%`;
    return 'INTACTO';
  }

  // ---------- Visão geral (tecla C) ----------

  renderOverview() {
    const camp = this.camp;
    const cards = BUILDING_ORDER.map((key) => {
      const definition = BUILDING_DEFS[key];
      const level = camp.levels[key];
      const cost = camp.upgradeCostFor(key);
      const repair = camp.repairCostFor(key);
      const canUpgrade = cost && camp.canPay(cost) && !repair;
      return `
        <article class="building-menu__card">
          <h2><img class="building-menu__card-art pixel-icon" src="${this.portraitUrl(key)}" alt="">${escapeHtml(definition.name)} • ${level === 0 ? 'não construído' : `nível ${level}/${MAX_BUILDING_LEVEL}`}</h2>
          <p>${escapeHtml(level === 0 ? levelDescription(key, 1) : levelDescription(key, level))}</p>
          ${level > 0 ? `<div class="building-menu__stat">${this.durabilityText(key)}</div>` : ''}
          <div class="building-menu__stat">${cost ? `Próximo: ${this.costHtml(cost)}` : 'NÍVEL MÁXIMO'}</div>
          <div class="building-menu__actions">
            <button type="button" data-action="open" data-arg="${key}">ABRIR</button>
            ${repair ? `<button type="button" data-action="repair" data-arg="${key}" ${disabled(!camp.canPay(repair))}>REPARAR (5 MADEIRAS)</button>` : ''}
            ${cost ? `<button type="button" class="button--primary" data-action="upgrade" data-arg="${key}" ${disabled(!canUpgrade)}>${level === 0 ? 'CONSTRUIR' : `MELHORAR PARA ${level + 1}`}</button>` : ''}
          </div>
        </article>
      `;
    }).join('');
    const complete = BUILDING_ORDER.filter((key) => camp.levels[key] >= MAX_BUILDING_LEVEL).length;
    const night = this.scene.timeState?.isNight;
    return `
      <div class="building-menu__stats">
        <div class="building-menu__stat">Prédios no nível 10: ${complete}/7</div>
        <div class="building-menu__stat">Missão local: ${Math.min(camp.questKills, 5)}/5 criaturas</div>
        <div class="building-menu__stat">Moedas: ${this.scene.economy.coins}</div>
      </div>
      <div class="building-menu__grid">
        ${cards}
        <article class="building-menu__card">
          <h2>Dormir</h2>
          <p>Pula a noite e salva. Requer Casa nível 2.</p>
          <div class="building-menu__actions">
            <button type="button" data-action="sleep-camp" ${disabled(!night)}>${night ? 'DORMIR ATÉ AMANHECER' : 'SOMENTE À NOITE'}</button>
          </div>
        </article>
      </div>
    `;
  }

  // ---------- Níveis (roteiro de 1 a 10) ----------

  renderUpgrade(building) {
    const camp = this.camp;
    const level = camp.levels[building];
    const definition = BUILDING_DEFS[building];
    const cost = camp.upgradeCostFor(building);
    const repair = camp.repairCostFor(building);
    const canUpgrade = cost && camp.canPay(cost) && !repair;
    const roadmap = Array.from({ length: MAX_BUILDING_LEVEL }, (_, index) => {
      const target = index + 1;
      const state = target <= level ? 'done' : target === level + 1 ? 'next' : 'locked';
      return `<li class="building-menu__level building-menu__level--${state}"><strong>${target}</strong> ${escapeHtml(levelDescription(building, target))}</li>`;
    }).join('');
    return `
      <div class="building-menu__grid">
        <article class="building-menu__card building-menu__card--wide">
          <h2>${escapeHtml(definition.name)} • ${level === 0 ? 'não construído' : `nível ${level}/${MAX_BUILDING_LEVEL}`}</h2>
          ${level > 0 ? `<div class="building-menu__stat">${this.durabilityText(building)}</div>` : ''}
          <div class="building-menu__stat">${cost ? `Custo: ${this.costHtml(cost)}` : 'Nível máximo alcançado.'}</div>
          <p>Os custos usam a mochila, depois o armazém da Casa e as moedas.</p>
          <div class="building-menu__actions">
            ${repair ? `<button type="button" data-action="repair" data-arg="${building}" ${disabled(!camp.canPay(repair))}>REPARAR (5 MADEIRAS)</button>` : ''}
            <button type="button" class="button--primary" data-action="upgrade" data-arg="${building}" ${disabled(!canUpgrade)}>
              ${cost ? (level === 0 ? 'CONSTRUIR' : `MELHORAR PARA NÍVEL ${level + 1}`) : 'NÍVEL MÁXIMO'}
            </button>
          </div>
          <ol class="building-menu__roadmap">${roadmap}</ol>
        </article>
      </div>
    `;
  }

  // ---------- Fogueira ----------

  renderCampfire() {
    const scene = this.scene;
    const camp = this.camp;
    if (this.tab === 'traveler') return this.renderCampfireTraveler();
    const cook = BUILDING_DEFS.campfire.cookRecipe;
    const canCook = camp.unlocked('campfire', 'cook');
    const revive = camp.unlocked('campfire', 'unlimitedRevive')
      ? 'ilimitada'
      : camp.unlocked('campfire', 'localRevive')
        ? (camp.lastLocalReviveNight === scene.timeState.dayCount ? 'usada esta noite' : 'disponível esta noite')
        : 'nível 7';
    return `
      <div class="building-menu__stats">
        <div class="building-menu__stat">Raio de proteção: ${camp.protectRadius}px</div>
        <div class="building-menu__stat">Cura perto do fogo: ${camp.campfireRegen}/s</div>
        <div class="building-menu__stat">Resistência ao fogo: ${Math.round(camp.fireResistance * 100)}%</div>
        <div class="building-menu__stat">Ressurreição local: ${revive}</div>
      </div>
      <div class="building-menu__grid">
        <article class="building-menu__card">
          <h2>Descansar junto ao fogo</h2>
          <p>Recupera a vida e salva.${camp.unlocked('campfire', 'warmth') ? ' Concede Calor da Fogueira: +10% ATQ por 3 min.' : ''}</p>
          <div class="building-menu__actions"><button type="button" class="button--primary" data-action="rest-fire">DESCANSAR</button></div>
        </article>
        <article class="building-menu__card">
          <h2>Fabricar tocha</h2>
          <p>2 madeiras + 1 tecido → 1 tocha (tecla 3 acende e amplia a luz).</p>
          <div class="building-menu__stat">${this.costHtml(TORCH_RECIPE.cost)}</div>
          <div class="building-menu__actions">
            <button type="button" data-action="craft-torch" ${disabled(!camp.canPay(TORCH_RECIPE.cost))}>FABRICAR TOCHA</button>
          </div>
        </article>
        <article class="building-menu__card">
          <h2>Cozinhar</h2>
          <p>${formatBundle(cook.cost)} → ${formatBundle(cook.yield)}. ${canCook ? '' : 'Requer Fogueira nível 3.'}</p>
          <div class="building-menu__stat">${this.costHtml(cook.cost)}</div>
          <div class="building-menu__actions">
            <button type="button" data-action="cook" ${disabled(!canCook || !camp.canPay(cook.cost))}>COZINHAR POÇÃO</button>
          </div>
        </article>
      </div>
    `;
  }

  renderCampfireTraveler() {
    const travelers = this.scene.travelers;
    const sources = this.camp.paymentSources();
    const offered = questById(travelers.offeredQuest);
    const active = questById(travelers.activeQuest?.id);
    const questCard = active
      ? `
        <article class="building-menu__card">
          <h2>Missão ativa</h2>
          <p>${escapeHtml(active.text)}</p>
          <div class="building-menu__stat">${active.kind === 'kill' ? `Progresso: ${travelers.activeQuest.progress}/${active.count}` : `Entrega: ${this.costHtml(active.items)}`}</div>
          <div class="building-menu__stat">Recompensa: ${active.reward.coins} moedas · ${formatBundle(active.reward.items)}</div>
          <div class="building-menu__actions">
            <button type="button" class="button--primary" data-action="claim-quest" ${disabled(!travelers.questReady(sources))}>ENTREGAR MISSÃO</button>
          </div>
        </article>`
      : offered
        ? `
        <article class="building-menu__card">
          <h2>Missão do viajante</h2>
          <p>${escapeHtml(offered.text)}</p>
          <div class="building-menu__stat">Recompensa: ${offered.reward.coins} moedas · ${formatBundle(offered.reward.items)}</div>
          <div class="building-menu__actions"><button type="button" class="button--primary" data-action="accept-quest">ACEITAR</button></div>
        </article>`
        : '<article class="building-menu__card"><h2>Sem missões</h2><p>O próximo viajante chega em alguns dias.</p></article>';
    const goods = travelers.goods.map((offer) => {
      const good = TRAVELER_GOODS.find((entry) => entry.id === offer.id);
      return `
        <article class="building-menu__card">
          <h2>${escapeHtml(good.name)}</h2>
          <p>Estoque: ${offer.quantity} • ${good.price} moedas</p>
          <div class="building-menu__stat">${this.itemChips(good.yield)}</div>
          <div class="building-menu__actions">
            <button type="button" data-action="traveler-buy" data-arg="${good.id}" ${disabled(offer.quantity <= 0 || this.scene.economy.coins < good.price)}>COMPRAR</button>
          </div>
        </article>`;
    }).join('');
    return `<div class="building-menu__grid">${questCard}${goods}</div>`;
  }

  // ---------- Fazenda ----------

  renderFarm() {
    const scene = this.scene;
    const farm = scene.farm;
    const now = Date.now();
    if (this.tab === 'animals') {
      const cards = farm.unlockedAnimals.map((type) => {
        const product = ANIMAL_PRODUCTS[type];
        const remaining = Math.max(0, (farm.animals[type].readyAt - now) / 1000);
        const ready = remaining <= 0;
        return `
          <article class="building-menu__card">
            <h2>${escapeHtml(product.animal)}</h2>
            <p>Produz ${escapeHtml(formatBundle(farm.animalBundle(type)))} a cada ${product.seconds}s.</p>
            <div class="building-menu__stat">${ready ? 'PRONTO PARA COLETAR' : `Faltam ${formatSeconds(remaining)}`}</div>
            <div class="building-menu__actions">
              <button type="button" data-action="collect-animal" data-arg="${type}" ${disabled(!ready)}>COLETAR</button>
            </div>
          </article>`;
      }).join('');
      return `<div class="building-menu__grid">${cards}</div>`;
    }
    if (this.tab === 'barn') {
      return `
        <div class="building-menu__grid">
          <article class="building-menu__card">
            <h2>Celeiro</h2>
            <p>Comida colhida automaticamente fica aqui (até ${farm.barnCapacity}).</p>
            <div class="building-menu__stat">Comida no celeiro: ${farm.barn}/${farm.barnCapacity}</div>
            <div class="building-menu__actions">
              <button type="button" data-action="barn-take" data-arg="5" ${disabled(farm.barn <= 0)}>PEGAR 5</button>
              <button type="button" data-action="barn-store" ${disabled(farm.barn <= 0)}>MOVER TUDO PARA O ARMAZÉM</button>
            </div>
          </article>
        </div>`;
    }
    const cards = farm.plots.map((plot) => {
      if (!plot.crop) {
        const choices = farm.availableCrops.map((type) => {
          const crop = FARM_CROPS[type];
          return `
            <button type="button" data-action="plant" data-arg="${plot.id}" data-arg2="${type}" ${disabled(!this.camp.canPay(crop.cost))}>
              ${escapeHtml(crop.name.toUpperCase())} • ${farm.cropSeconds(type)}s • ${escapeHtml(formatBundle(crop.cost))}
            </button>`;
        }).join('');
        return `
          <article class="building-menu__card">
            <h2>Canteiro ${plot.id + 1}</h2>
            <p>Vazio</p>
            <div class="building-menu__actions">${choices}</div>
          </article>`;
      }
      const crop = FARM_CROPS[plot.crop];
      const remaining = Math.max(0, (plot.readyAt - now) / 1000);
      const ready = remaining <= 0;
      return `
        <article class="building-menu__card">
          <h2>Canteiro ${plot.id + 1} • ${escapeHtml(crop.name)}</h2>
          <p>${ready ? 'Colheita pronta.' : `Crescimento: ${formatSeconds(remaining)}`}</p>
          <div class="building-menu__actions">
            <button type="button" class="button--primary" data-action="harvest" data-arg="${plot.id}" ${disabled(!ready)}>COLHER</button>
          </div>
        </article>`;
    }).join('');
    const efficiency = this.camp.efficiency('farm');
    return `
      <div class="building-menu__stats">
        <div class="building-menu__stat">Sementes: ${scene.inventory.items.seeds + this.camp.storage.seeds}</div>
        <div class="building-menu__stat">Canteiros: ${farm.plotCount}</div>
        <div class="building-menu__stat">Clima: ${scene.isRaining ? 'CHUVA' : 'seco'}${scene.isRaining && farm.rainGrowthBonus > 0 ? ' (+40%)' : ''}</div>
        ${efficiency < 1 ? '<div class="building-menu__stat cost-missing">Danificada: produção pela metade</div>' : ''}
      </div>
      <div class="building-menu__grid">${cards}</div>
    `;
  }

  // ---------- Ferreiro ----------

  renderForge() {
    const equipment = this.camp.equipment;
    if (this.tab === 'gear') return this.renderGear();
    const recipes = Object.entries(FORGE_RECIPES)
      .filter(([id, recipe]) => !recipe.requiresBoss || equipment.isRecipeUnlocked(id))
      .map(([id, recipe]) => {
        const crafted = equipment.has(id);
        const locked = this.camp.levels.forge < recipe.level;
        const affordable = this.camp.canPay(recipe.cost);
        const status = crafted ? 'CRIADO' : locked ? `REQUER NÍVEL ${recipe.level}` : affordable ? 'RECURSOS OK' : 'FALTAM RECURSOS';
        return `
          <article class="building-menu__card ${locked ? 'building-menu__card--locked' : ''}">
            <h2>${escapeHtml(recipe.name)}</h2>
            <p>${escapeHtml(recipe.description)}</p>
            <div class="building-menu__stat">${this.costHtml(recipe.cost)}</div>
            <div class="building-menu__stat">${status}</div>
            <div class="building-menu__actions">
              <button type="button" data-action="craft" data-arg="${id}" ${disabled(crafted || locked || !affordable)}>CRIAR</button>
            </div>
          </article>`;
      }).join('');
    const bonuses = equipment.getBonuses();
    return `
      <div class="building-menu__stats">
        <div class="building-menu__stat">ATQ equipamento: +${bonuses.attack}</div>
        <div class="building-menu__stat">DEF equipamento: +${bonuses.defense}</div>
        <div class="building-menu__stat">Picareta: ${equipment.pickaxeTier ?? 'NENHUMA'}</div>
      </div>
      <div class="building-menu__grid">${recipes}</div>
    `;
  }

  renderGear() {
    const equipment = this.camp.equipment;
    const level = this.camp.levels.forge;
    const equipped = new Set(Object.values(equipment.equipped).filter(Boolean));
    const cards = Object.keys(equipment.items).map((id) => {
      const recipe = FORGE_RECIPES[id];
      const state = equipment.items[id];
      const durable = state.durability !== null;
      const repairCost = equipment.repairCost(id);
      const upgradeCost = equipment.upgradeCost(id);
      const canRepair = level >= FORGE_SERVICES.repairLevel && repairCost && Object.keys(repairCost).length > 0;
      const canUpgrade = level >= FORGE_SERVICES.upgradeLevel && upgradeCost;
      return `
        <article class="building-menu__card">
          <h2>${escapeHtml(recipe.name)}${state.upgrade ? ` +${state.upgrade}` : ''}${equipped.has(id) ? ' • EQUIPADO' : ''}</h2>
          <p>${escapeHtml(recipe.description)}${durable ? ` Valor atual: +${equipment.itemValue(id)}.` : ''}</p>
          ${durable ? `<div class="building-menu__stat">Durabilidade: ${state.durability}/${recipe.durability}${state.durability === 0 ? ' (QUEBRADO: metade do bônus)' : ''}</div>` : ''}
          <div class="building-menu__actions">
            ${canRepair ? `<button type="button" data-action="repair-item" data-arg="${id}" ${disabled(!this.camp.canPay(repairCost))}>REPARAR • ${escapeHtml(formatBundle(repairCost))}</button>` : ''}
            ${canUpgrade ? `<button type="button" data-action="upgrade-item" data-arg="${id}" ${disabled(!this.camp.canPay(upgradeCost))}>MELHORAR +${state.upgrade + 1} • ${escapeHtml(formatBundle(upgradeCost))}</button>` : ''}
            ${level >= FORGE_SERVICES.dismantleLevel ? `<button type="button" data-action="dismantle" data-arg="${id}">DESMONTAR • ${escapeHtml(formatBundle(equipment.dismantleReturn(id)))}</button>` : ''}
          </div>
        </article>`;
    }).join('') || '<article class="building-menu__card"><h2>Nada criado ainda</h2><p>Use a aba Criar.</p></article>';
    const enchants = equipment.ownedEnchants;
    const enchantCard = enchants.length > 0 ? `
      <article class="building-menu__card building-menu__card--wide">
        <h2>Encantamento ativo: ${escapeHtml(equipment.activeEnchant ? ENCHANTMENTS[equipment.activeEnchant].name : 'nenhum')}</h2>
        <div class="building-menu__actions">
          ${enchants.map((enchant) => `<button type="button" data-action="enchant" data-arg="${enchant}" ${disabled(equipment.activeEnchant === enchant)}>${escapeHtml(ENCHANTMENTS[enchant].name.toUpperCase())}</button>`).join('')}
        </div>
      </article>` : '';
    const accessories = [...equipment.accessories].map((id) => `<div class="building-menu__stat">${escapeHtml(ACCESSORIES[id].name)}: ${escapeHtml(ACCESSORIES[id].description)}</div>`).join('');
    return `
      <div class="building-menu__stats">
        <div class="building-menu__stat">Reparar/desmontar: ${level >= FORGE_SERVICES.repairLevel ? 'ATIVO' : 'NÍVEL 4'}</div>
        <div class="building-menu__stat">Melhorias +1 a +5: ${level >= FORGE_SERVICES.upgradeLevel ? 'ATIVO' : 'NÍVEL 8'}</div>
        ${accessories}
      </div>
      <div class="building-menu__grid">${enchantCard}${cards}</div>
    `;
  }

  // ---------- Casa ----------

  renderHouse() {
    const scene = this.scene;
    const camp = this.camp;
    if (this.tab === 'rest') return this.renderRest();
    if (this.tab === 'secret') {
      const rows = Object.entries(RESOURCE_TYPES).filter(([type]) => scene.inventory.items[type] > 0 || camp.secretChest[type] > 0).map(([type, resource]) => `
        <div class="building-menu__resource">
          ${this.itemIcon(type)}
          <span>${escapeHtml(resource.label)}</span>
          <span>Mochila: ${scene.inventory.items[type]}</span>
          <span>Baú: ${camp.secretChest[type]}</span>
          <button type="button" data-action="secret-deposit" data-arg="${type}" ${disabled(scene.inventory.items[type] <= 0)}>GUARDAR 1</button>
          <button type="button" data-action="secret-withdraw" data-arg="${type}" ${disabled(camp.secretChest[type] <= 0)}>RETIRAR 1</button>
        </div>`).join('') || '<p>Mochila e baú vazios.</p>';
      return `
        <div class="building-menu__stats"><div class="building-menu__stat">Baú secreto: ${camp.secretChestSlotsUsed}/${camp.secretChestSlots} slots</div></div>
        <div class="building-menu__card building-menu__card--wide">
          <p>Um esconderijo separado do armazém para itens valiosos.</p>
          ${rows}
        </div>`;
    }
    const rows = Object.entries(RESOURCE_TYPES).filter(([type]) => scene.inventory.items[type] > 0 || camp.storage[type] > 0).map(([type, resource]) => `
      <div class="building-menu__resource">
        ${this.itemIcon(type)}
        <span>${escapeHtml(resource.label)}</span>
        <span>Mochila: ${scene.inventory.items[type]}</span>
        <span>Armazém: ${camp.storage[type]}</span>
        <button type="button" data-action="deposit" data-arg="${type}" ${disabled(scene.inventory.items[type] <= 0)}>GUARDAR 1</button>
        <button type="button" data-action="withdraw" data-arg="${type}" ${disabled(camp.storage[type] <= 0)}>RETIRAR 1</button>
      </div>`).join('') || '<p>Mochila e armazém vazios.</p>';
    return `
      <div class="building-menu__stats">
        <div class="building-menu__stat">Armazém: ${camp.storageLabel}</div>
        <div class="building-menu__stat">Mochila: ${scene.inventory.usedSlots}/${scene.inventory.maxSlots} slots</div>
        <div class="building-menu__stat">Guardar ao chegar: ${camp.unlocked('house', 'autoStore') ? 'AUTOMÁTICO' : 'NÍVEL 5'}</div>
      </div>
      <div class="building-menu__card building-menu__card--wide">
        <div class="building-menu__actions">
          <button type="button" class="button--primary" data-action="store-all" ${disabled(scene.inventory.total <= 0)}>GUARDAR TUDO DA MOCHILA</button>
        </div>
        ${rows}
      </div>`;
  }

  renderRest() {
    const scene = this.scene;
    const camp = this.camp;
    const resting = scene.restState;
    const healPercent = Math.round((camp.stat('house', 'restHealRatio') ?? 0.5) * 100);
    const canSleep = camp.unlocked('house', 'sleep');
    const dailyAvailable = camp.unlocked('house', 'dailyBuff');
    const dailyUsed = camp.dailyBuffDay === scene.timeState.dayCount;
    const buffs = scene.buffs.list().map((buff) => `<div class="building-menu__stat">${escapeHtml(buff.name)}${buff.remainingMs !== null ? ` • ${formatSeconds(buff.remainingMs / 1000)}` : ' • até o fim do dia'}</div>`).join('');
    const dailyCard = dailyAvailable ? `
      <article class="building-menu__card building-menu__card--wide">
        <h2>Buff diário</h2>
        <p>${dailyUsed ? 'Já escolhido hoje.' : 'Escolha um bônus que dura até o próximo amanhecer.'}</p>
        <div class="building-menu__actions">
          ${Object.entries(BUILDING_DEFS.house.dailyBuffs).map(([id, buff]) => `<button type="button" data-action="daily-buff" data-arg="${id}" ${disabled(dailyUsed)}>${escapeHtml(buff.label)}</button>`).join('')}
        </div>
      </article>` : '';
    return `
      ${buffs ? `<div class="building-menu__stats">${buffs}</div>` : ''}
      <div class="building-menu__grid">
        <article class="building-menu__card">
          <h2>Descansar</h2>
          <p>Restaura ${healPercent}% da vida${camp.stat('house', 'restStamina') ? ' e todo o vigor' : ''}; após 30 s reais avança 30 min de jogo.${camp.unlocked('house', 'wellRested') ? ' Concede Bem Descansado.' : ''}</p>
          <div class="building-menu__actions">
            <button type="button" class="button--primary" data-action="rest" ${disabled(Boolean(resting))}>
              ${resting ? `DESCANSANDO • ${Math.max(0, Math.ceil((resting.endsAt - Date.now()) / 1000))}s` : 'DESCANSAR 30s'}
            </button>
          </div>
        </article>
        <article class="building-menu__card">
          <h2>Dormir</h2>
          <p>${canSleep ? 'Pula para a manhã do próximo dia e salva.' : 'Requer Casa nível 2.'}${camp.unlocked('house', 'cook') ? ' A cozinheira prepara uma refeição ao acordar.' : ''}</p>
          <div class="building-menu__actions">
            <button type="button" data-action="sleep" ${disabled(Boolean(resting) || !canSleep)}>DORMIR ATÉ O PRÓXIMO DIA</button>
          </div>
        </article>
        ${dailyCard}
      </div>`;
  }

  // ---------- Mercado ----------

  offerCard(offer, source) {
    const market = this.scene.market;
    const definition = findCatalogEntry(offer.id);
    const price = market.priceOf(definition);
    return `
      <article class="building-menu__card">
        <h2>${escapeHtml(definition.name)}</h2>
        <p>Estoque: ${offer.quantity}</p>
        <div class="building-menu__stat">${this.itemChips(definition.yield)}</div>
        <div class="building-menu__stat">Preço: ${price} moedas${price < definition.price ? ` (era ${definition.price})` : ''}</div>
        <div class="building-menu__actions">
          <button type="button" data-action="buy" data-arg="${offer.id}" data-arg2="${source}" ${disabled(offer.quantity <= 0 || this.scene.economy.coins < price)}>COMPRAR 1</button>
        </div>
      </article>`;
  }

  renderMarket() {
    const scene = this.scene;
    const market = scene.market;
    if (this.tab === 'sell') {
      const rows = Object.entries(RESOURCE_TYPES).filter(([type]) => scene.inventory.items[type] > 0).map(([type, resource]) => `
        <div class="building-menu__resource">
          ${this.itemIcon(type)}
          <span>${escapeHtml(resource.label)}</span>
          <span>Quantidade: ${scene.inventory.items[type]}</span>
          <span>Preço: ${sellPriceOf(type)} ${sellPriceOf(type) === 1 ? 'moeda' : 'moedas'}</span>
          <button type="button" data-action="sell" data-arg="${type}">VENDER 1</button>
        </div>`).join('') || '<p>Nada na mochila para vender.</p>';
      return `
        <div class="building-menu__card building-menu__card--wide">
          <h2>Vender recursos</h2>
          <p>Preços definidos em economy.json. Recursos raros valem mais.</p>
          ${rows}
        </div>`;
    }
    if (this.tab === 'traveler') {
      return `
        <div class="building-menu__stats"><div class="building-menu__stat">Mercador viajante • só hoje</div></div>
        <div class="building-menu__grid">${market.travelerOffers.map((offer) => this.offerCard(offer, 'traveler')).join('')}</div>`;
    }
    if (this.tab === 'orders') {
      const pending = market.orders.map((order) => `<div class="building-menu__stat">${escapeHtml(findCatalogEntry(order.id).name)} • chega no dia ${order.readyDay}</div>`).join('');
      const cards = MARKET_CATALOG.map((entry) => {
        const price = market.orderPrice(entry);
        return `
          <article class="building-menu__card">
            <h2>${escapeHtml(entry.name)}</h2>
            <p>Entrega no armazém em 2 dias.</p>
            <div class="building-menu__stat">${this.itemChips(entry.yield)}</div>
            <div class="building-menu__actions">
              <button type="button" data-action="order" data-arg="${entry.id}" ${disabled(scene.economy.coins < price)}>ENCOMENDAR • ${price} MOEDAS</button>
            </div>
          </article>`;
      }).join('');
      return `${pending ? `<div class="building-menu__stats">${pending}</div>` : ''}<div class="building-menu__grid">${cards}</div>`;
    }
    if (this.tab === 'auction') {
      const auction = market.auction;
      return `
        <div class="building-menu__grid">
          <article class="building-menu__card building-menu__card--wide">
            <h2>Leilão: ${escapeHtml(market.auctionItemLabel)}</h2>
            <p>${auction.item ? escapeHtml(ACCESSORIES[auction.item].description) : 'Você já tem todos os acessórios: o prêmio é ouro.'} O leilão fecha na virada do dia.</p>
            <div class="building-menu__stat">Seu lance: ${auction.playerBid} • Rival: ${auction.rivalBid}</div>
            <div class="building-menu__stat">${market.playerLeads ? 'VOCÊ ESTÁ VENCENDO' : 'O RIVAL ESTÁ VENCENDO'}</div>
            <div class="building-menu__actions">
              <button type="button" class="button--primary" data-action="bid" ${disabled(market.playerLeads || scene.economy.coins < market.nextBid - auction.playerBid)}>DAR LANCE DE ${market.nextBid}</button>
            </div>
          </article>
        </div>`;
    }
    const discount = Math.round(market.discount * 100);
    return `
      <div class="building-menu__stats">
        <div class="building-menu__stat">Estoque do dia ${market.day}</div>
        <div class="building-menu__stat">Ofertas: ${market.offers.length}</div>
        <div class="building-menu__stat">Desconto: ${discount}%</div>
        <div class="building-menu__stat">Moedas: ${scene.economy.coins}</div>
      </div>
      <div class="building-menu__grid">${market.offers.map((offer) => this.offerCard(offer, 'daily')).join('')}</div>`;
  }

  // ---------- Muralha e Torre ----------

  renderWall() {
    const defense = this.camp.defense;
    const repairCost = defense.wallRepairCost();
    const stat = (name) => defense.wallStat(name);
    return `
      <div class="building-menu__stats">
        <div class="building-menu__stat">HP: ${Math.ceil(defense.wallHp)}/${defense.wallMaxHp}</div>
        <div class="building-menu__stat">Material: ${escapeHtml(stat('material'))}</div>
        <div class="building-menu__stat">Espinhos: ${stat('spikeDamage')} • Campo elétrico: ${stat('electricDamage')}</div>
        <div class="building-menu__stat">Portões automáticos: ${stat('gates') ? 'SIM' : 'NÍVEL 2'}</div>
      </div>
      <div class="building-menu__grid">
        <article class="building-menu__card">
          <h2>Reparar muralha</h2>
          <p>5 madeiras a cada 10% de HP perdido.</p>
          <div class="building-menu__actions">
            <button type="button" class="button--primary" data-action="repair-wall" ${disabled(!repairCost || !this.camp.canPay(repairCost))}>${repairCost ? `REPARAR • ${repairCost.wood} MADEIRAS` : 'INTACTA'}</button>
          </div>
        </article>
      </div>`;
  }

  renderTower() {
    const defense = this.camp.defense;
    const stat = (name) => defense.towerStat(name);
    return `
      <div class="building-menu__stats">
        <div class="building-menu__stat">Torres: ${stat('towers')} • Arqueiros por torre: ${stat('archers')}</div>
        <div class="building-menu__stat">Flecha: ${escapeHtml(stat('arrow'))} • Dano: ${stat('damage')}</div>
        <div class="building-menu__stat">Intervalo: ${stat('intervalMs') / 1000}s • Alcance: ${stat('range')}px</div>
        <div class="building-menu__stat">Radar no minimapa: ${stat('radar') ? 'ATIVO' : 'NÍVEL 4'}</div>
      </div>
      <p class="building-menu__note">As torres atiram sozinhas em qualquer inimigo dentro do alcance.${this.camp.efficiency('tower') < 1 ? ' Danificada: dispara na metade da velocidade.' : ''}</p>`;
  }
}

