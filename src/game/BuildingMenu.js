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
import { recipeItems, recipesFor } from '../data/craftRecipes.js';
import { availableHunts, huntReward } from './HuntSystem.js';
import { REGION_INFO } from '../data/worldRegions.js';
import { ENEMY_TYPES } from '../data/enemies.js';
import { GEAR_ITEMS, RARITIES, SLOT_NAMES, blessingPrice, describeStats, gearStats } from '../data/gear.js';
import { ENHANCE_RISK_FROM, JEWELS, JEWEL_TYPES, MAX_ENHANCE, describeJewel, enhanceChance } from '../data/enhance.js';
import { RESOURCE_TYPES } from './config.js';
import { gearIconHtml } from './gearIconUrl.js';
import { resourceIconHtml, textureUrl } from './iconUrls.js';
import { XP_EVENT_CONFIG, daysUntilDoubleXp, isDoubleXpDay } from './XpEvents.js';
import { formatRemaining } from './ActiveEffects.js';
import { formatCount } from './formatCount.js';
import { REBIRTH_CONFIG, canRebirth } from '../data/rebirth.js';
import { MOUNT_LEVEL, PETS, PET_IDS, mountUnlocked } from '../data/companions.js';

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
const RECIPES_TAB = { id: 'recipes', label: 'Receitas' };

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
    this.sell = { type: null, qty: 1, checked: new Set(), confirm: null };
    this.buyQty = {};

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
      if (this.handleMarketAction(button)) return;
      if (button.dataset.action === 'open') {
        this.open(button.dataset.arg);
        return;
      }
      // Loja de equipamentos e Bênção chamam a cena direto.
      const direct = {
        'buy-gear': () => this.scene.buyGear?.(button.dataset.arg),
        'buy-blessing': () => this.scene.buyBlessing?.(),
        'enhance-gear': () => this.scene.enhanceGear?.(button.dataset.arg),
        'socket-gear': () => this.scene.socketGear?.(button.dataset.arg, button.dataset.arg2),
        'unsocket-gear': () => this.scene.unsocketGear?.(button.dataset.arg, button.dataset.arg2),
        'pet-buy': () => this.scene.companions?.action('buy', button.dataset.arg),
        'pet-summon': () => this.scene.companions?.action('summon', button.dataset.arg),
        'pet-hatch': () => this.scene.companions?.action('hatch'),
        'mount-toggle': () => this.scene.companions?.action('mount'),
        'rebirth': () => this.scene.rebirthHero?.(),
        'arena-start': () => this.scene.arenaAction?.('start'),
        'arena-leave': () => this.scene.arenaAction?.('leave'),
        'respec-talents': () => this.scene.respecTalents?.(),
        'claim-xp-bonus': () => this.scene.claimXpBonus?.(),
        'hunt-accept': () => this.scene.huntAction?.('accept', button.dataset.arg),
        'hunt-turnin': () => this.scene.huntAction?.('turnin'),
        'hunt-abandon': () => this.scene.huntAction?.('abandon')
      }[button.dataset.action];
      const result = direct ? direct() : this.scene.buildingMenuAction?.(button.dataset.action, button.dataset.arg, button.dataset.arg2);
      this.scene.lastBuildingMessage = result?.message ?? this.scene.lastBuildingMessage ?? '';
      this.render();
    };

    this.closeButton.addEventListener('click', this.handleClose);
    this.tabs.addEventListener('click', this.handleTabs);
    this.content.addEventListener('click', this.handleContent);
    // Controle deslizante da venda: atualiza só os números (re-renderizar tiraria o dedo do controle).
    this.handleSlider = (event) => {
      if (!event.target.matches?.('input[data-sell-range]')) return;
      this.sell.qty = Number(event.target.value) || 1;
      this.sell.confirm = null;
      this.updateSellSummary();
    };
    this.content.addEventListener('input', this.handleSlider);
    scene.events.once('shutdown', () => {
      this.closeButton.removeEventListener('click', this.handleClose);
      this.tabs.removeEventListener('click', this.handleTabs);
      this.content.removeEventListener('click', this.handleContent);
      this.content.removeEventListener('input', this.handleSlider);
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
        { id: 'gear', label: 'Equipamento' },
        { id: 'enhance', label: 'Aprimorar' },
        { id: 'shop', label: 'Loja' }
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
    const recipes = recipesFor(building).length > 0 ? [RECIPES_TAB] : [];
    return [...tabs[building], ...recipes, UPGRADES_TAB];
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
    if (this.tab === 'recipes') return this.renderRecipes(this.building);
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

  // ---------- Receitas de itens ----------

  renderRecipes(building) {
    const level = this.camp.levels[building];
    const cards = recipesFor(building).map((recipe) => {
      const locked = level < recipe.level;
      const affordable = this.camp.canPay(recipe.cost);
      const extras = [
        recipe.yield.xp ? `+${recipe.yield.xp} XP` : '',
        recipe.yield.coins ? `+${recipe.yield.coins} moedas` : ''
      ].filter(Boolean).join(' • ');
      return `
        <article class="building-menu__card ${locked ? 'building-menu__card--locked' : ''}">
          <h2>${escapeHtml(recipe.name)}</h2>
          <p>${escapeHtml(recipe.description)}</p>
          <div class="building-menu__stat">Usa: ${this.costHtml(recipe.cost)}</div>
          <div class="building-menu__stat">Faz: ${this.itemChips(recipeItems(recipe))}${extras ? ` <span class="recipe-extra">${extras}</span>` : ''}</div>
          <div class="building-menu__actions">
            <button type="button" data-action="craft-item" data-arg="${recipe.id}" ${disabled(locked || !affordable)}>${locked ? `REQUER NÍVEL ${recipe.level}` : affordable ? 'CRIAR' : 'FALTAM MATERIAIS'}</button>
          </div>
        </article>`;
    }).join('');
    return `
      <p class="building-menu__note">Toque num material para ver onde conseguir. Os custos usam a mochila e o armazém.</p>
      <div class="building-menu__grid">${cards}</div>`;
  }

  // ---------- Fogueira ----------

  /** Bênção da Fogueira: protege a mochila na próxima morte. */
  blessingCard() {
    const scene = this.scene;
    const price = blessingPrice(scene.progression?.level ?? 1);
    const active = Boolean(scene.gear?.blessed);
    const coins = scene.economy?.coins ?? 0;
    return `
        <article class="building-menu__card">
          <h2>Bênção</h2>
          <p>Na próxima morte você não perde nada da mochila. A bênção se gasta nessa morte.</p>
          <div class="building-menu__stat">Situação: ${active ? 'ATIVA' : 'INATIVA'} • ${price} moedas</div>
          <div class="building-menu__actions">
            <button type="button" class="button--primary" data-action="buy-blessing" ${disabled(active || coins < price)}>${active ? 'JÁ ABENÇOADO' : coins < price ? 'FALTAM MOEDAS' : `RECEBER BÊNÇÃO • ${price}`}</button>
          </div>
        </article>`;
  }

  /** Refazer talentos e atributos: nível x 50 moedas (mínimo 100). */
  respecCard() {
    const scene = this.scene;
    const progression = scene.progression;
    if (!progression) return '';
    const cost = progression.respecCost;
    const coins = scene.economy?.coins ?? 0;
    const nothing = progression.spentChoices === 0;
    return `
        <article class="building-menu__card" data-respec>
          <h2>Refazer talentos</h2>
          <p>Devolve todos os pontos de atributo e talentos para você escolher de novo. Nível e equipamento não mudam.</p>
          <div class="building-menu__stat">Custo: ${cost} moedas • ${progression.spentChoices} escolhas feitas</div>
          <div class="building-menu__actions">
            <button type="button" class="button--primary" data-action="respec-talents" ${disabled(nothing || coins < cost)}>${nothing ? 'NADA PARA REFAZER' : coins < cost ? 'FALTAM MOEDAS' : `REFAZER • ${cost}`}</button>
          </div>
        </article>`;
  }

  /** Renascimento: no nível 150 volta ao 1 e ganha +5% de dano, vida e XP (até 10 vezes). */
  rebirthCard() {
    const progression = this.scene.progression;
    if (!progression) return '';
    const can = canRebirth(progression.level, progression.rebirths);
    return `
        <article class="building-menu__card" data-rebirth>
          <h2>Renascimento</h2>
          <p>No nível ${REBIRTH_CONFIG.level} você volta ao nível 1 e guarda o equipamento. Cada renascimento dá +5% de dano, vida e XP (máx. ${REBIRTH_CONFIG.max}).</p>
          <div class="building-menu__stat">Renascimentos: ${progression.rebirths}/${REBIRTH_CONFIG.max} • Nível ${progression.level}</div>
          <div class="building-menu__actions">
            <button type="button" class="button--primary" data-action="rebirth" ${disabled(!can)}>${progression.rebirths >= REBIRTH_CONFIG.max ? 'MÁXIMO' : can ? 'RENASCER' : `NÍVEL ${REBIRTH_CONFIG.level} NECESSÁRIO`}</button>
          </div>
        </article>`;
  }

  /** Arena de chefes ao lado da Fogueira. */
  arenaCard() {
    const arena = this.scene.arena;
    if (!arena) return '';
    return `
        <article class="building-menu__card" data-arena>
          <h2>Arena de chefes</h2>
          <p>Ondas de chefes cada vez mais fortes ao redor da Fogueira. A cada 5 ondas há moedas e XP. Se cair, a tentativa acaba.</p>
          <div class="building-menu__stat">Recorde: onda ${arena.record}${arena.active ? ` • agora: onda ${arena.wave}` : ''}</div>
          <div class="building-menu__actions">
            ${arena.active
              ? '<button type="button" data-action="arena-leave">DESISTIR</button>'
              : '<button type="button" class="button--primary" data-action="arena-start">ENTRAR NA ARENA</button>'}
          </div>
        </article>`;
  }

  /** Mascotes (comprar, chamar, chocar ovo) e montaria. */
  companionCard() {
    const scene = this.scene;
    const comp = scene.companions;
    if (!comp) return '';
    const state = comp.state;
    const coins = scene.economy?.coins ?? 0;
    const rows = PET_IDS.map((id) => {
      const pet = PETS[id];
      const own = state.has(id);
      let button;
      if (own) button = `<button type="button" data-action="pet-summon" data-arg="${id}">${state.active === id ? 'GUARDAR' : 'CHAMAR'}</button>`;
      else if (pet.egg) button = '<button type="button" disabled>SÓ POR OVO</button>';
      else button = `<button type="button" data-action="pet-buy" data-arg="${id}" ${disabled(coins < pet.price)}>COMPRAR • ${pet.price}</button>`;
      return `<div class="building-menu__stat" data-pet="${id}"><b>${escapeHtml(pet.name)}</b> — ${escapeHtml(pet.info)} ${button}</div>`;
    }).join('');
    const level = scene.progression.level;
    const mount = mountUnlocked(level)
      ? `<button type="button" class="button--primary" data-action="mount-toggle">${state.mounted ? 'DESMONTAR' : 'MONTAR'} (tecla G)</button>`
      : `<button type="button" disabled>MONTARIA NO NÍVEL ${MOUNT_LEVEL}</button>`;
    return `
        <article class="building-menu__card" data-companions>
          <h2>Mascotes e montaria</h2>
          <p>Mascotes seguem você e ajudam. Chefes podem deixar um ovo raro. A montaria dá +35% de velocidade e some ao levar dano.</p>
          ${rows}
          <div class="building-menu__actions">
            <button type="button" data-action="pet-hatch" ${disabled(state.eggs <= 0)}>CHOCAR OVO (${state.eggs})</button>
            ${mount}
          </div>
        </article>`;
  }

  /** Bônus de novato (primeiros 7 dias) e aviso do evento XP em dobro. */
  xpBonusCard() {
    const scene = this.scene;
    const boost = scene.xpBoost;
    if (!boost) return '';
    const day = scene.timeState?.dayCount ?? 1;
    const eventToday = isDoubleXpDay(day);
    const canClaim = boost.canClaim(day);
    const newbieWindow = day <= XP_EVENT_CONFIG.newbieDays;
    const status = boost.bonusActive
      ? `ATIVO • ${formatRemaining(boost.remainingMs)}`
      : eventToday ? 'EVENTO DE HOJE: XP EM DOBRO' : `Próximo evento em ${daysUntilDoubleXp(day)} dia(s)`;
    return `
        <article class="building-menu__card" data-xp-bonus>
          <h2>XP em dobro</h2>
          <p>Todo dia 7, 14, 21... o XP vale o dobro. Nos 7 primeiros dias você resgata 10 minutos de XP em dobro, uma vez por dia.</p>
          <div class="building-menu__stat">${status}</div>
          ${newbieWindow ? `<div class="building-menu__actions">
            <button type="button" class="button--primary" data-action="claim-xp-bonus" ${disabled(!canClaim)}>${canClaim ? 'RESGATAR 10 MIN' : 'JÁ RESGATADO HOJE'}</button>
          </div>` : ''}
        </article>`;
  }

  /** Mestre de Caça: quadro de caçadas por região e nível. */
  huntCard() {
    const scene = this.scene;
    const hunts = scene.hunts;
    if (!hunts) return '';
    const level = scene.progression?.level ?? 1;
    if (hunts.hunt) {
      const hunt = hunts.hunt;
      const reward = huntReward(hunt, hunts.timesDone(hunt.id));
      return `
        <article class="building-menu__card" data-hunt-board>
          <h2>Quadro de Caçadas</h2>
          <p>${hunts.label()} • ${REGION_INFO[hunt.region]?.name ?? hunt.region}</p>
          <div class="building-menu__stat">Recompensa: ${reward.xp} XP • ${reward.coins} moedas${hunts.timesDone(hunt.id) ? ' (repetida)' : ''}</div>
          <div class="building-menu__actions">
            <button type="button" class="button--primary" data-action="hunt-turnin" ${disabled(!hunts.complete)}>${hunts.complete ? 'ENTREGAR CAÇADA' : 'EM ANDAMENTO'}</button>
            <button type="button" data-action="hunt-abandon">ABANDONAR</button>
          </div>
        </article>`;
    }
    const list = availableHunts(level)
      .sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level) || a.level - b.level)
      .slice(0, 6);
    const rows = list.map((hunt) => {
      const reward = huntReward(hunt, hunts.timesDone(hunt.id));
      const times = hunts.timesDone(hunt.id);
      return `<div class="building-menu__stat">Derrote ${hunt.count} ${ENEMY_TYPES[hunt.kind].name} (nv ${hunt.level}) • ${REGION_INFO[hunt.region]?.name ?? hunt.region} • ${reward.xp} XP, ${reward.coins} moedas${times ? ' • repetida' : ''}
        <button type="button" data-action="hunt-accept" data-arg="${hunt.id}">ACEITAR</button></div>`;
    }).join('');
    return `
        <article class="building-menu__card" data-hunt-board>
          <h2>Quadro de Caçadas</h2>
          <p>Uma caçada por vez. Repetir a mesma paga menos.</p>
          ${rows}
        </article>`;
  }

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
        ${this.blessingCard()}
        ${this.respecCard()}
        ${this.rebirthCard()}
        ${this.arenaCard()}
        ${this.xpBonusCard()}
        ${this.huntCard()}
        ${this.companionCard()}
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
    if (this.tab === 'shop') return this.renderGearShop();
    if (this.tab === 'enhance') return this.renderEnhance();
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

  /** Loja do Ferreiro: peças básicas e o Amuleto de Proteção, compradas com moedas. */
  renderGearShop() {
    const scene = this.scene;
    const coins = scene.economy?.coins ?? 0;
    const level = scene.progression?.level ?? 1;
    const cards = Object.values(GEAR_ITEMS).filter((item) => item.shop).map((item) => {
      const stats = describeStats(gearStats(item.id, 'common'));
      const tooLow = level < item.level;
      return `
        <article class="building-menu__card">
          <span class="gear-shop__icon">${gearIconHtml(item.id, 'common', 64)}</span>
          <h2>${escapeHtml(item.name)}</h2>
          <p>${escapeHtml(SLOT_NAMES[item.slot])} • Nível ${item.level}${stats ? ` • ${escapeHtml(stats)}` : ''}</p>
          ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
          <div class="building-menu__stat">${item.price} moedas</div>
          <div class="building-menu__actions">
            <button type="button" data-action="buy-gear" data-arg="${item.id}" ${disabled(coins < item.price || scene.gear?.isFull)}>${scene.gear?.isFull ? 'SACOLA CHEIA' : coins < item.price ? 'FALTAM MOEDAS' : tooLow ? `COMPRAR (NÍVEL ${item.level})` : 'COMPRAR'}</button>
          </div>
        </article>`;
    }).join('');
    return `
      <div class="building-menu__stats">
        <div class="building-menu__stat">Moedas: ${coins}</div>
        <div class="building-menu__stat">Peças melhores caem dos monstros das regiões e dos chefes das cavernas.</div>
      </div>
      <div class="building-menu__grid">${cards}</div>
    `;
  }

  /** Aprimorar (+1 a +10) e encaixar joias nas peças da sacola de equipamentos. */
  renderEnhance() {
    const scene = this.scene;
    const gear = scene.gear;
    const jewelStock = JEWEL_TYPES.map((type) => `${JEWELS[type].short} ${gear.jewels[type]}`).join(' • ');
    const cards = [...gear.bag].sort((a, b) => Number(gear.isEquipped(b.uid)) - Number(gear.isEquipped(a.uid))).map((item) => {
      const definition = GEAR_ITEMS[item.id];
      const rarity = RARITIES[item.rarity] ?? RARITIES.common;
      const cost = gear.enhanceCostFor(item.uid);
      const target = item.upgrade + 1;
      const risky = cost && target >= ENHANCE_RISK_FROM;
      const stats = describeStats(gear.statsOf(item));
      const sockets = item.sockets.map((type, index) => type
        ? `<button type="button" data-action="unsocket-gear" data-arg="${item.uid}" data-arg2="${index}" style="color:${JEWELS[type].color}">${escapeHtml(JEWELS[type].short.toUpperCase())} (${escapeHtml(describeJewel(type, definition.level))}) • RETIRAR</button>`
        : '<span class="building-menu__stat">Encaixe vazio</span>').join('');
      const hasEmpty = item.sockets.includes(null);
      const insert = hasEmpty ? JEWEL_TYPES.filter((type) => gear.jewels[type] > 0).map((type) => `<button type="button" data-action="socket-gear" data-arg="${item.uid}" data-arg2="${type}">+ ${escapeHtml(JEWELS[type].short.toUpperCase())} (${gear.jewels[type]})</button>`).join('') : '';
      const canPay = cost && this.camp.canPay(cost);
      return `
        <article class="building-menu__card" data-enhance-uid="${item.uid}">
          <span class="gear-shop__icon">${gearIconHtml(item.id, item.rarity, 64)}</span>
          <h2 style="color:${rarity.color}">${escapeHtml(definition.name)}${item.upgrade ? ` +${item.upgrade}` : ''}${gear.isEquipped(item.uid) ? ' • EQUIPADO' : ''}</h2>
          <p>${escapeHtml(SLOT_NAMES[definition.slot])} • Nível ${definition.level}${stats ? ` • ${escapeHtml(stats)}` : ''}</p>
          ${item.sockets.length ? `<div class="building-menu__actions">${sockets}${insert}</div>` : '<p>Sem encaixes para joias.</p>'}
          ${cost ? `<div class="building-menu__stat">+${target}: ${Math.round(enhanceChance(target) * 100)}% de sucesso${risky ? ' (falha volta 1 nível)' : ''} • ${escapeHtml(formatBundle(cost))}</div>` : `<div class="building-menu__stat">Aprimoramento máximo (+${MAX_ENHANCE})</div>`}
          <div class="building-menu__actions">
            <button type="button" class="button--primary" data-action="enhance-gear" data-arg="${item.uid}" ${disabled(!cost || !canPay)}>${!cost ? 'NO MÁXIMO' : canPay ? `APRIMORAR +${target}` : 'FALTAM MATERIAIS'}</button>
          </div>
        </article>`;
    }).join('') || '<article class="building-menu__card"><h2>Nenhuma peça</h2><p>Equipamentos caem dos monstros e saem da loja.</p></article>';
    return `
      <div class="building-menu__stats">
        <div class="building-menu__stat">Cada +1 dá +6% nos atributos • do +5 em diante pode falhar (volta 1 nível, nunca quebra)</div>
        <div class="building-menu__stat">Joias soltas: ${escapeHtml(jewelStock)}</div>
      </div>
      <div class="building-menu__grid">${cards}</div>`;
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
        <span>Mochila: ${formatCount(scene.inventory.items[type])}</span>
        <span>Armazém: ${formatCount(camp.storage[type])}</span>
        <button type="button" data-action="deposit" data-arg="${type}" ${disabled(scene.inventory.items[type] <= 0)}>GUARDAR 1</button>
        <button type="button" data-action="deposit" data-arg="${type}" data-arg2="all" ${disabled(scene.inventory.items[type] <= 0)}>GUARDAR TUDO</button>
        <button type="button" data-action="withdraw" data-arg="${type}" ${disabled(camp.storage[type] <= 0)}>RETIRAR 1</button>
        <button type="button" data-action="withdraw" data-arg="${type}" data-arg2="all" ${disabled(camp.storage[type] <= 0)}>RETIRAR TUDO</button>
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
          ${this.buyControls(offer, source, price)}
        </div>
      </article>`;
  }

  // ---------- Compra e venda em quantidade ----------

  buyControls(offer, source, price) {
    const scene = this.scene;
    const max = scene.market.maxBuyable(offer.id, scene.inventory, scene.economy, source);
    const key = `${source}:${offer.id}`;
    const qty = Math.min(Math.max(1, this.buyQty[key] ?? 1), Math.max(1, max));
    const f = (arg2) => `data-action="buy-step" data-arg="${key}" data-arg2="${arg2}" data-focus="buy-step|${key}|${arg2}"`;
    return `
      <div class="qty-row">
        <button type="button" class="qty-btn" ${f(-1)} ${disabled(max <= 0)}>-1</button>
        <strong class="qty-value">${qty}</strong>
        <button type="button" class="qty-btn" ${f(1)} ${disabled(max <= 0)}>+1</button>
        <button type="button" class="qty-btn" ${f('max')} ${disabled(max <= 0)}>MÁX</button>
      </div>
      <button type="button" data-action="buy-n" data-arg="${offer.id}" data-arg2="${source}" data-qty="${qty}" ${disabled(max <= 0)}>COMPRAR ${qty} • ${formatCount(qty * price)} moedas</button>`;
  }

  protectedSellTypes() {
    return this.scene.protectedSellTypes?.() ?? new Set();
  }

  sellRowType() {
    const type = this.sell.type;
    if (!type) return null;
    const max = this.scene.market.sellableAmount(type, this.scene.inventory, this.protectedSellTypes());
    return max > 0 ? { type, max } : null;
  }

  /** Cliques de compra/venda em quantidade (tratados aqui até a confirmação). */
  handleMarketAction(button) {
    const { action, arg, arg2 } = button.dataset;
    const scene = this.scene;
    const sell = this.sell;
    const focusKey = `${action}|${arg ?? ''}|${arg2 ?? ''}`;
    const rerender = () => {
      this.render();
      this.content.querySelector(`[data-focus="${focusKey}"]`)?.focus?.({ preventScroll: true });
    };
    if (action === 'buy-step') {
      const [source, id] = arg.split(':');
      const max = scene.market.maxBuyable(id, scene.inventory, scene.economy, source);
      const current = this.buyQty[arg] ?? 1;
      this.buyQty[arg] = arg2 === 'max' ? Math.max(1, max) : Math.min(Math.max(1, current + Number(arg2)), Math.max(1, max));
      rerender();
      return true;
    }
    if (action === 'buy-n') {
      const result = scene.buildingMenuAction?.('buy-n', arg, arg2, Number(button.dataset.qty) || 1);
      this.buyQty[`${arg2}:${arg}`] = 1;
      scene.lastBuildingMessage = result?.message ?? scene.lastBuildingMessage ?? '';
      this.render();
      return true;
    }
    if (action === 'sell-pick') {
      sell.type = sell.type === arg ? null : arg;
      sell.qty = 1;
      sell.confirm = null;
      rerender();
      return true;
    }
    if (action === 'sell-step') {
      const row = this.sellRowType();
      if (row) sell.qty = arg === 'max' ? row.max : Math.min(row.max, Math.max(1, sell.qty + Number(arg)));
      sell.confirm = null;
      rerender();
      return true;
    }
    if (action === 'sell-toggle') {
      if (sell.checked.has(arg)) sell.checked.delete(arg);
      else sell.checked.add(arg);
      sell.confirm = null;
      rerender();
      return true;
    }
    if (action === 'sell-cancel') {
      sell.confirm = null;
      rerender();
      return true;
    }
    const sellNow = (selection) => {
      const result = scene.buildingMenuAction?.('sell-multi', JSON.stringify(selection));
      scene.lastBuildingMessage = result?.message ?? '';
      sell.confirm = null;
      if (!(scene.inventory.items[sell.type] > 0)) sell.type = null;
      this.render();
    };
    const protectedTypes = this.protectedSellTypes();
    if (action === 'sell-one') {
      const row = this.sellRowType();
      if (row) sellNow({ [row.type]: Math.min(sell.qty, row.max) });
      return true;
    }
    if (action === 'sell-all') {
      const row = this.sellRowType();
      if (row) sellNow({ [row.type]: row.max });
      return true;
    }
    if (action === 'sell-common' || action === 'sell-selected') {
      const selection = action === 'sell-common'
        ? scene.market.commonSelection(scene.inventory, protectedTypes)
        : this.selectedSelection(protectedTypes);
      if (Object.keys(selection).length === 0) return true;
      if (sell.confirm !== action) {
        sell.confirm = action;
        rerender();
        return true;
      }
      if (action === 'sell-selected') sell.checked.clear();
      sellNow(selection);
      return true;
    }
    return false;
  }

  selectedSelection(protectedTypes) {
    const market = this.scene.market;
    return Object.fromEntries([...this.sell.checked]
      .map((type) => [type, market.sellableAmount(type, this.scene.inventory, protectedTypes)])
      .filter(([, amount]) => amount > 0));
  }

  updateSellSummary() {
    const row = this.sellRowType();
    if (!row) return;
    const qty = Math.min(this.sell.qty, row.max);
    const total = this.scene.market.sellValue({ [row.type]: qty });
    const value = this.content.querySelector('[data-sell-qty]');
    if (value) value.textContent = formatCount(qty);
    const confirm = this.content.querySelector('[data-action="sell-one"]');
    if (confirm) confirm.textContent = `VENDER ${formatCount(qty)} • +${formatCount(total)} moedas`;
  }

  renderSell() {
    const scene = this.scene;
    const market = scene.market;
    const sell = this.sell;
    const protectedTypes = this.protectedSellTypes();
    const owned = Object.entries(RESOURCE_TYPES).filter(([type]) => scene.inventory.items[type] > 0);
    const f = (action, arg = '', arg2 = '') => `data-action="${action}" data-arg="${arg}" data-arg2="${arg2}" data-focus="${action}|${arg}|${arg2}"`;
    const rows = owned.map(([type, resource]) => {
      const locked = protectedTypes.has(type);
      const price = sellPriceOf(type);
      const checked = sell.checked.has(type) && !locked;
      return `
        <div class="sell-row ${sell.type === type ? 'sell-row--active' : ''}">
          <button type="button" class="sell-check" role="checkbox" aria-checked="${checked}" aria-label="Marcar ${escapeHtml(resource.label)}" ${f('sell-toggle', type)} ${disabled(locked)}>${checked ? '✔' : ''}</button>
          ${this.itemIcon(type)}
          <span class="sell-row__name">${escapeHtml(resource.label)}</span>
          <span>x${formatCount(scene.inventory.items[type])}</span>
          <span>${price} ${price === 1 ? 'moeda' : 'moedas'}</span>
          <button type="button" ${f('sell-pick', type)} ${disabled(locked)}>${locked ? 'DE MISSÃO' : sell.type === type ? 'FECHAR' : 'VENDER'}</button>
        </div>`;
    }).join('') || '<p>Nada na mochila para vender.</p>';

    let panel = '';
    const row = this.sellRowType();
    if (row) {
      const qty = Math.min(sell.qty, row.max);
      const label = escapeHtml(RESOURCE_TYPES[row.type].label);
      const step = (text, delta) => `<button type="button" class="qty-btn" ${f('sell-step', delta)}>${text}</button>`;
      panel = `
        <div class="sell-panel">
          <h3>${label}: quanto vender?</h3>
          <div class="qty-row">
            ${step('-10', -10)}${step('-1', -1)}
            <strong class="qty-value" data-sell-qty>${formatCount(qty)}</strong>
            ${step('+1', 1)}${step('+10', 10)}
            ${step('MÁX', 'max')}
          </div>
          <input type="range" class="sell-range" data-sell-range min="1" max="${row.max}" value="${qty}" aria-label="Quantidade a vender">
          <div class="building-menu__actions">
            <button type="button" class="button--primary" ${f('sell-one')}>VENDER ${formatCount(qty)} • +${formatCount(market.sellValue({ [row.type]: qty }))} moedas</button>
            <button type="button" ${f('sell-all')}>VENDER TUDO DESTE ITEM (${formatCount(row.max)} • +${formatCount(market.sellValue({ [row.type]: row.max }))})</button>
          </div>
        </div>`;
    }

    const bulk = (action, selection, text) => {
      const count = Object.values(selection).reduce((sum, value) => sum + value, 0);
      const total = market.sellValue(selection);
      if (count === 0) return `<button type="button" disabled>${text}</button>`;
      if (sell.confirm === action) {
        return `<button type="button" class="button--primary" ${f(action)}>CONFIRMAR: ${formatCount(count)} itens • +${formatCount(total)} moedas</button><button type="button" ${f('sell-cancel')}>CANCELAR</button>`;
      }
      return `<button type="button" ${f(action)}>${text} (+${formatCount(total)})</button>`;
    };
    return `
      <div class="building-menu__card building-menu__card--wide">
        <h2>Vender recursos</h2>
        <p>Toque em VENDER para escolher a quantidade. Equipamentos e itens de missão não são vendidos aqui.</p>
        <div class="building-menu__actions">
          ${bulk('sell-common', market.commonSelection(scene.inventory, protectedTypes), 'VENDER RECURSOS COMUNS')}
          ${bulk('sell-selected', this.selectedSelection(protectedTypes), 'VENDER MARCADOS')}
        </div>
        ${rows}
        ${panel}
      </div>`;
  }


  renderMarket() {
    const scene = this.scene;
    const market = scene.market;
    if (this.tab === 'sell') return this.renderSell();
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

