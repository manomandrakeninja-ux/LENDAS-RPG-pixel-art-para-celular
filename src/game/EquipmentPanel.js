import {
  GEAR_BAG_SIZE, GEAR_ITEMS, GEAR_SETS, RARITIES, SLOT_NAMES, describeStats, gearSellPrice, gearStats
} from '../data/gear.js';
import { gearIconHtml } from './gearIconUrl.js';
import { textureUrl } from './iconUrls.js';

// Painel de Equipamento (tecla V ou botão na mochila): boneco com os 8 espaços,
// sacola de peças e detalhes da peça escolhida (equipar, remover, vender).

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

// Posição de cada espaço em volta do boneco (coluna esquerda / direita).
const LEFT_SLOTS = ['helmet', 'chest', 'legs', 'boots'];
const RIGHT_SLOTS = ['weapon', 'shield', 'ring', 'amulet'];

function setBonusText(bonus = {}) {
  return describeStats(bonus);
}

export class EquipmentPanel {
  constructor(scene) {
    this.scene = scene;
    this.selected = null;
    this.confirmSell = null;
    this.lastHtml = '';
    this.message = '';
    this.root = document.createElement('div');
    this.root.className = 'equipment';
    this.root.hidden = true;
    (document.getElementById('game') ?? document.body).appendChild(this.root);

    this.handleClick = (event) => {
      if (event.target === this.root || event.target.closest('[data-eq-close]')) {
        this.close();
        return;
      }
      const button = event.target.closest('[data-eq]');
      if (!button || button.disabled) return;
      const action = button.dataset.eq;
      const uid = Number(button.dataset.uid);
      const scene = this.scene;
      let result = null;
      if (action === 'select') {
        this.selected = uid || null;
        this.confirmSell = null;
      } else if (action === 'slot') {
        const equipped = scene.gear?.equipped?.[button.dataset.slot];
        this.selected = equipped ?? null;
        this.confirmSell = null;
      } else if (action === 'equip') {
        result = scene.equipGear?.(uid);
      } else if (action === 'unequip') {
        result = scene.unequipGear?.(button.dataset.slot);
      } else if (action === 'sell') {
        if (this.confirmSell !== uid) {
          this.confirmSell = uid;
        } else {
          result = scene.sellGear?.(uid);
          this.confirmSell = null;
          if (result?.ok) this.selected = null;
        }
      }
      if (result) this.message = result.message ?? '';
      this.lastHtml = '';
      this.refresh();
    };
    this.root.addEventListener('click', this.handleClick);
    // Toques no painel não chegam ao mundo do jogo embaixo dele.
    this.stopDown = (event) => event.stopPropagation();
    for (const type of ['pointerdown', 'mousedown', 'touchstart']) this.root.addEventListener(type, this.stopDown);
    this.handleGearEvent = () => {
      this.lastHtml = '';
      this.refresh();
    };
    window.addEventListener('lendas:gear', this.handleGearEvent);
  }

  get isOpen() {
    return !this.root.hidden;
  }

  open() {
    this.root.hidden = false;
    this.message = '';
    this.confirmSell = null;
    this.lastHtml = '';
    this.refresh();
  }

  close() {
    this.root.hidden = true;
    this.confirmSell = null;
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  refresh() {
    if (!this.isOpen) return;
    const html = this.render();
    // Só troca o HTML quando algo mudou (assim nenhum clique se perde).
    if (html === this.lastHtml) return;
    const scroll = this.root.querySelector('.equipment__bag')?.scrollTop ?? 0;
    this.lastHtml = html;
    this.root.innerHTML = html;
    const bag = this.root.querySelector('.equipment__bag');
    if (bag) bag.scrollTop = scroll;
  }

  heroLevel() {
    return this.scene.progression?.level ?? 1;
  }

  slotHtml(slot) {
    const gear = this.scene.gear;
    const item = gear?.equippedItem?.(slot) ?? null;
    if (!item) {
      return `<button type="button" class="equipment__slot is-empty" data-eq="slot" data-slot="${slot}" aria-label="${SLOT_NAMES[slot]} vazio">
        <span class="equipment__slot-name">${SLOT_NAMES[slot]}</span></button>`;
    }
    const definition = GEAR_ITEMS[item.id];
    const color = RARITIES[item.rarity]?.color ?? '#e8e0cc';
    return `<button type="button" class="equipment__slot ${this.selected === item.uid ? 'is-selected' : ''}" style="--rarity:${color}" data-eq="slot" data-slot="${slot}" title="${escapeHtml(definition.name)}">
      ${gearIconHtml(item.id, item.rarity, 40)}
      <span class="equipment__slot-name">${SLOT_NAMES[slot]}</span></button>`;
  }

  bagHtml() {
    const gear = this.scene.gear;
    const loose = gear?.loose ?? [];
    const level = this.heroLevel();
    const cells = loose.map((item) => {
      const definition = GEAR_ITEMS[item.id];
      const color = RARITIES[item.rarity]?.color ?? '#e8e0cc';
      const tooLow = level < definition.level;
      return `<button type="button" class="equipment__item ${tooLow ? 'is-locked' : ''} ${this.selected === item.uid ? 'is-selected' : ''}" style="--rarity:${color}" data-eq="select" data-uid="${item.uid}" title="${escapeHtml(definition.name)}">
        ${gearIconHtml(item.id, item.rarity, 40)}
        <span class="equipment__level">Nv ${definition.level}</span></button>`;
    });
    const empty = Math.max(0, Math.min(GEAR_BAG_SIZE, Math.ceil(Math.max(loose.length, 12) / 6) * 6) - loose.length);
    for (let index = 0; index < empty; index += 1) cells.push('<span class="equipment__item is-empty"></span>');
    return cells.join('');
  }

  detailHtml() {
    const gear = this.scene.gear;
    const item = this.selected ? gear?.find?.(this.selected) : null;
    if (!item) return '<p class="equipment__hint">Toque numa peça para ver os detalhes. Monstros, chefes das cavernas e a loja do Ferreiro dão equipamentos.</p>';
    const definition = GEAR_ITEMS[item.id];
    const rarity = RARITIES[item.rarity] ?? RARITIES.common;
    const equipped = gear.isEquipped(item.uid);
    const level = this.heroLevel();
    const stats = describeStats(gearStats(item.id, item.rarity));
    const set = definition.set ? GEAR_SETS[definition.set] : null;
    const setCount = set ? (gear.setCounts?.()[definition.set] ?? 0) : 0;
    const setActive = setCount >= 4;
    const price = gearSellPrice(item.id, item.rarity);
    const confirming = this.confirmSell === item.uid;
    return `
      <div class="equipment__detail-head">
        ${gearIconHtml(item.id, item.rarity, 64)}
        <div>
          <h3 style="color:${rarity.color}">${escapeHtml(definition.name)}</h3>
          <p class="equipment__tag">${rarity.name} • ${SLOT_NAMES[definition.slot]} • <span class="${level < definition.level ? 'is-bad' : ''}">Nível ${definition.level}</span></p>
        </div>
      </div>
      <p class="equipment__stats">${escapeHtml(stats || 'Sem atributos')}</p>
      ${definition.description ? `<p class="equipment__desc">${escapeHtml(definition.description)}</p>` : ''}
      ${set ? `<p class="equipment__set ${setActive ? 'is-active' : ''}">Conjunto ${escapeHtml(set.name)} • ${setCount}/4 peças<br>4 peças: ${escapeHtml(setBonusText(set.bonus))}</p>` : ''}
      <div class="equipment__actions">
        ${equipped
          ? `<button type="button" data-eq="unequip" data-slot="${definition.slot}">REMOVER</button>`
          : `<button type="button" class="button--primary" data-eq="equip" data-uid="${item.uid}" ${level < definition.level ? 'disabled' : ''}>${level < definition.level ? `REQUER NÍVEL ${definition.level}` : 'EQUIPAR'}</button>`}
        <button type="button" class="${confirming ? 'is-danger' : ''}" data-eq="sell" data-uid="${item.uid}">${confirming ? `CONFIRMAR VENDA (+${price})` : `VENDER • +${price} MOEDAS`}</button>
      </div>`;
  }

  render() {
    const scene = this.scene;
    const gear = scene.gear;
    const player = scene.player;
    const sets = (gear?.activeSets?.() ?? []).map((set) => GEAR_SETS[set]?.name).filter(Boolean);
    const knight = textureUrl(scene, scene.player?.animPrefix ?? 'player', 0);
    const looseCount = gear?.loose?.length ?? 0;
    return `
      <div class="equipment__panel" role="dialog" aria-label="Equipamento">
        <header class="equipment__head">
          <h2>EQUIPAMENTO</h2>
          <div class="equipment__totals">
            <span>ATQ ${player?.attack ?? 0}</span>
            <span>DEF ${player?.defense ?? 0}</span>
            <span>VIDA ${player?.maxHealth ?? 0}</span>
            ${gear?.protectedOnDeath ? '<span class="equipment__ward">🛡 Protegido</span>' : ''}
          </div>
          <button type="button" class="equipment__close" data-eq-close aria-label="Fechar">×</button>
        </header>
        ${sets.length ? `<p class="equipment__sets">Conjuntos ativos: ${sets.map(escapeHtml).join(', ')}</p>` : ''}
        <div class="equipment__body">
          <section class="equipment__doll" aria-label="Peças vestidas">
            <div class="equipment__column">${LEFT_SLOTS.map((slot) => this.slotHtml(slot)).join('')}</div>
            <div class="equipment__figure">${knight ? `<img class="pixel-icon" src="${knight}" alt="">` : ''}</div>
            <div class="equipment__column">${RIGHT_SLOTS.map((slot) => this.slotHtml(slot)).join('')}</div>
          </section>
          <section class="equipment__side">
            <p class="equipment__bag-title">SACOLA • ${looseCount}/${GEAR_BAG_SIZE}<span class="equipment__key">Tecla V</span></p>
            <div class="equipment__bag">${this.bagHtml()}</div>
            <div class="equipment__detail">${this.detailHtml()}</div>
          </section>
        </div>
        ${this.message ? `<footer class="equipment__message">${escapeHtml(this.message)}</footer>` : ''}
      </div>`;
  }

  destroy() {
    window.removeEventListener('lendas:gear', this.handleGearEvent);
    this.root.removeEventListener('click', this.handleClick);
    this.root.remove();
  }
}

