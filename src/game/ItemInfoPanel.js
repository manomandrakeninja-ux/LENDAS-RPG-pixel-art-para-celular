import { NO_SOURCE_MESSAGE, itemInfo, needText } from '../data/itemCatalog.js';
import { availableFor } from '../data/buildings.js';
import { findCatalogEntry } from '../data/economy.js';
import { resourceIconHtml } from './iconUrls.js';

const KIND_LABEL = {
  gather: 'COLETA',
  chest: 'BAÚ',
  enemy: 'COMBATE',
  farm: 'FAZENDA',
  craft: 'FABRICAR',
  market: 'COMPRA',
  quest: 'MISSÃO',
  site: 'MISSÃO'
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&#38;')
    .replaceAll('<', '&#60;')
    .replaceAll('>', '&#62;')
    .replaceAll('"', '&#34;')
    .replaceAll("'", '&#039;');
}

/**
 * Painel de informações de um item. Abre por cima da mochila e dos menus dos prédios
 * (clique ou toque no item) e fecha sem mexer no que estava aberto embaixo.
 * Não compra nada: no máximo leva até a tela normal do Mercado.
 */
export class ItemInfoPanel {
  constructor(scene) {
    this.scene = scene;
    this.type = null;
    this.need = null;
    this.returnFocus = null;
    this.root = document.createElement('div');
    this.root.id = 'item-info';
    this.root.className = 'item-info';
    this.root.hidden = true;
    this.root.innerHTML = `
      <section class="item-info__card" role="dialog" aria-modal="true" aria-labelledby="item-info-name">
        <header class="item-info__header">
          <div class="item-info__icon" id="item-info-icon"></div>
          <div>
            <p class="item-info__kicker" id="item-info-kicker"></p>
            <h2 class="item-info__name" id="item-info-name"></h2>
          </div>
          <button type="button" class="panel-close" data-info="close" aria-label="Fechar informações do item">✕</button>
        </header>
        <div class="item-info__body" id="item-info-body"></div>
        <footer class="item-info__footer">
          <button type="button" data-info="close">VOLTAR</button>
        </footer>
      </section>`;
    const host = document.getElementById('backpack-panel')?.parentElement ?? document.body;
    host.append(this.root);
    this.icon = this.root.querySelector('#item-info-icon');
    this.kicker = this.root.querySelector('#item-info-kicker');
    this.name = this.root.querySelector('#item-info-name');
    this.body = this.root.querySelector('#item-info-body');

    this.handleClick = (event) => {
      // Clique no fundo escuro também fecha.
      if (event.target === this.root) {
        this.close();
        return;
      }
      const button = event.target.closest('button[data-info]');
      if (!button || button.disabled) return;
      if (button.dataset.info === 'close') this.close();
      if (button.dataset.info === 'go') this.goToSource(Number(button.dataset.index));
    };
    this.handleKey = (event) => {
      if (event.key === 'Escape' && this.isOpen) {
        event.stopPropagation();
        this.close();
      }
    };
    this.root.addEventListener('click', this.handleClick);
    // O toque no painel não pode chegar ao jogo embaixo (abriria prédios ou atacaria).
    this.stopDown = (event) => event.stopPropagation();
    for (const type of ['pointerdown', 'mousedown', 'touchstart']) this.root.addEventListener(type, this.stopDown);
    window.addEventListener('keydown', this.handleKey, true);
    scene.events.once('shutdown', () => {
      this.root.removeEventListener('click', this.handleClick);
      window.removeEventListener('keydown', this.handleKey, true);
      this.root.remove();
    });
  }

  get isOpen() {
    return !this.root.hidden;
  }

  /** need: quanto a receita/melhoria pede (opcional). */
  open(type, { need = null } = {}) {
    const info = itemInfo(type);
    if (!info) return false;
    this.type = type;
    this.need = Number.isFinite(Number(need)) && Number(need) > 0 ? Number(need) : null;
    this.info = info;
    this.returnFocus = document.activeElement;
    this.root.hidden = false;
    this.render();
    this.root.querySelector('.panel-close')?.focus({ preventScroll: true });
    return true;
  }

  close() {
    if (!this.isOpen) return;
    this.root.hidden = true;
    this.type = null;
    // Volta o foco para onde o jogador estava (a tela de baixo continua igual).
    if (this.returnFocus?.isConnected) this.returnFocus.focus?.({ preventScroll: true });
    this.returnFocus = null;
  }

  counts() {
    const scene = this.scene;
    const backpack = scene.inventory?.items?.[this.type] ?? 0;
    const storage = scene.camp?.storage?.[this.type] ?? 0;
    const total = scene.camp ? availableFor(this.type, scene.camp.paymentSources()) : backpack;
    return { backpack, storage, total };
  }

  /** Para onde o botão "Ir até a fonte" leva, e se dá para ir agora. */
  sourceTarget(source) {
    const target = source.target;
    if (!target) return null;
    const scene = this.scene;
    if (target.building) {
      const built = (scene.camp?.levels?.[target.building] ?? 0) > 0;
      if (!built) return { enabled: false, label: 'Prédio não construído' };
      if (!scene.camp.isNear(scene.player.x, scene.player.y)) return { enabled: false, label: 'Volte ao acampamento' };
      return { enabled: true, label: 'Abrir' };
    }
    if (target.map === 'site') {
      const active = scene.campaign?.activeSiteIds?.().has(target.id);
      return active ? { enabled: true, label: 'Ver no mapa' } : { enabled: false, label: 'Só durante a missão' };
    }
    if (target.map === 'structure') {
      return this.nearestStructure(target.type) ? { enabled: true, label: 'Ver no mapa' } : { enabled: false, label: 'Nenhum disponível' };
    }
    if (target.map === 'point') return { enabled: true, label: 'Ver no mapa' };
    return null;
  }

  nearestStructure(type) {
    const scene = this.scene;
    const structures = scene.harvestStructures?.state?.byType(type) ?? [];
    let best = null;
    let bestDistance = Infinity;
    for (const structure of structures) {
      if (!structure.available || structure.collected) continue;
      const distance = Math.hypot(structure.x - scene.player.x, structure.y - scene.player.y);
      if (distance < bestDistance) {
        best = structure;
        bestDistance = distance;
      }
    }
    return best;
  }

  goToSource(index) {
    const source = this.info?.sources[index];
    const target = source?.target;
    const state = source ? this.sourceTarget(source) : null;
    if (!target || !state?.enabled) return false;
    const scene = this.scene;
    this.close();
    if (target.building) {
      scene.backpackPanel?.close();
      if (!scene.buildingMenu.isOpen || scene.buildingMenu.building !== target.building) scene.buildingMenu.open(target.building);
      if (scene.buildingMenu.tabsFor(target.building).some((tab) => tab.id === target.tab)) {
        scene.buildingMenu.tab = target.tab;
        scene.buildingMenu.render();
      }
      return true;
    }
    let point = null;
    if (target.map === 'point') point = { x: target.x, y: target.y, label: target.name };
    if (target.map === 'structure') {
      const structure = this.nearestStructure(target.type);
      if (structure) point = { x: structure.x, y: structure.y, label: this.info.name };
    }
    if (target.map === 'site') {
      const site = scene.campaign?.siteDef?.(target.id);
      if (site) point = { x: site.x, y: site.y, label: site.name };
    }
    if (!point) return false;
    scene.backpackPanel?.close();
    scene.buildingMenu?.close();
    scene.worldMap.showTarget(point);
    return true;
  }

  marketHtml() {
    const entries = this.info.market;
    if (entries.length === 0) return '';
    const market = this.scene.market;
    const marketLevel = this.scene.camp?.levels?.market ?? 0;
    const rows = entries.map((entry) => {
      const offer = market?.offers?.find((candidate) => candidate.id === entry.id);
      const definition = findCatalogEntry(entry.id);
      const price = market?.priceOf ? market.priceOf(definition) : entry.price;
      let status;
      if (marketLevel < entry.level) status = `Requer Mercado nível ${entry.level}`;
      else if (!offer) status = 'Fora do estoque de hoje';
      else status = offer.quantity > 0 ? `Hoje: ${offer.quantity} em estoque` : 'Esgotado hoje';
      return `<li><strong>${escapeHtml(entry.name)}</strong> • ${price} moedas${price < entry.price ? ` (era ${entry.price})` : ''}<br><span>${escapeHtml(status)}</span></li>`;
    }).join('');
    return `
      <h3>No Mercado</h3>
      <ul class="item-info__list item-info__list--market">${rows}</ul>
      <p class="item-info__hint">Para comprar, use a aba Comprar do Mercado.</p>`;
  }

  render() {
    if (!this.isOpen || !this.info) return;
    const info = this.info;
    const { backpack, storage, total } = this.counts();
    this.icon.innerHTML = resourceIconHtml(this.scene, this.type, 48);
    this.name.textContent = info.name;
    this.kicker.textContent = info.uses.some((use) => use.startsWith('Usar:')) ? 'CONSUMÍVEL' : 'MATERIAL';
    const need = this.need ? needText(total, this.need) : null;
    const enough = this.need ? total >= this.need : true;
    const sources = info.sources.length > 0
      ? info.sources.map((source, index) => {
        const target = this.sourceTarget(source);
        return `
          <li class="item-info__source">
            <span class="item-info__tag item-info__tag--${source.kind}">${KIND_LABEL[source.kind] ?? 'FONTE'}</span>
            <span class="item-info__source-text">${escapeHtml(source.text)}</span>
            ${target ? `<button type="button" data-info="go" data-index="${index}" ${target.enabled ? '' : 'disabled'}>${target.enabled ? `Ir até a fonte • ${target.label}` : target.label}</button>` : ''}
          </li>`;
      }).join('')
      : `<li class="item-info__source"><span class="item-info__source-text">${NO_SOURCE_MESSAGE}</span></li>`;
    this.body.innerHTML = `
      <p class="item-info__description">${escapeHtml(info.description)}</p>
      ${need ? `<p class="item-info__need ${enough ? 'is-ok' : 'is-missing'}" data-need-text>${escapeHtml(need)}</p>` : ''}
      <div class="item-info__counts">
        <span>Mochila <strong data-count="backpack">${backpack}</strong></span>
        <span>Armazém <strong data-count="storage">${storage}</strong></span>
        <span>Total <strong data-count="total">${total}</strong></span>
      </div>
      <h3>Para que serve</h3>
      <ul class="item-info__list">${info.uses.map((use) => `<li>${escapeHtml(use)}</li>`).join('') || '<li>Sem uso direto por enquanto.</li>'}</ul>
      <h3>Onde conseguir</h3>
      <ul class="item-info__list item-info__list--sources">${sources}</ul>
      ${this.marketHtml()}`;
  }
}
