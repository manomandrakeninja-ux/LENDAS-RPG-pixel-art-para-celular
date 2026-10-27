import {
  FORGE_SLOT, GEAR_BAG_SIZE, GEAR_ITEMS, GEAR_SETS, GEAR_SLOTS, RARITIES, SLOT_NAMES, gearSellPrice, gearStats
} from '../data/gear.js';

// Equipamento do jogador: sacola de peças (cada uma com raridade) e 8 espaços equipados.
// Sem Phaser: a cena recalcula os atributos do herói com bonuses() depois de cada mudança.

const EMPTY_BONUS = () => ({ attack: 0, defense: 0, maxHealth: 0, speedPercent: 0, fireResistance: 0 });

export class GearSystem {
  constructor(saved = {}) {
    this.bag = [];
    this.equipped = Object.fromEntries(GEAR_SLOTS.map((slot) => [slot, null]));
    this.nextUid = Math.max(1, Math.floor(Number(saved?.nextUid) || 1));
    this.blessed = Boolean(saved?.blessed);
    for (const entry of Array.isArray(saved?.bag) ? saved.bag : []) {
      if (!GEAR_ITEMS[entry?.id]) continue;
      const uid = Math.floor(Number(entry.uid)) || this.nextUid;
      this.bag.push({ uid, id: entry.id, rarity: RARITIES[entry.rarity] ? entry.rarity : 'common' });
      this.nextUid = Math.max(this.nextUid, uid + 1);
    }
    for (const [slot, uid] of Object.entries(saved?.equipped ?? {})) {
      const item = this.find(uid);
      if (item && GEAR_SLOTS.includes(slot) && GEAR_ITEMS[item.id].slot === slot) this.equipped[slot] = item.uid;
    }
  }

  find(uid) {
    return this.bag.find((item) => item.uid === Number(uid)) ?? null;
  }

  definition(item) {
    return item ? GEAR_ITEMS[item.id] : null;
  }

  isEquipped(uid) {
    return Object.values(this.equipped).includes(Number(uid));
  }

  /** Peças fora do corpo (ocupam espaço na sacola). */
  get loose() {
    return this.bag.filter((item) => !this.isEquipped(item.uid));
  }

  get isFull() {
    return this.loose.length >= GEAR_BAG_SIZE;
  }

  /** Guarda uma peça nova. Devolve a peça ou null se a sacola estiver cheia. */
  add(id, rarity = 'common') {
    if (!GEAR_ITEMS[id] || this.isFull) return null;
    const item = { uid: this.nextUid, id, rarity: RARITIES[rarity] ? rarity : 'common' };
    this.nextUid += 1;
    this.bag.push(item);
    return item;
  }

  equippedItem(slot) {
    return this.find(this.equipped[slot]);
  }

  /** Veste a peça (troca com a que estava no espaço). level = nível do herói. */
  equip(uid, level = 1) {
    const item = this.find(uid);
    if (!item) return { ok: false, message: 'Peça não encontrada.' };
    const definition = GEAR_ITEMS[item.id];
    if (level < definition.level) return { ok: false, message: `Requer nível ${definition.level}.` };
    this.equipped[definition.slot] = item.uid;
    return { ok: true, message: `${definition.name} equipado.`, slot: definition.slot };
  }

  unequip(slot) {
    if (!this.equipped[slot]) return { ok: false, message: 'Nada equipado aqui.' };
    if (this.isFull) return { ok: false, message: 'Sacola de equipamentos cheia.' };
    const item = this.equippedItem(slot);
    this.equipped[slot] = null;
    return { ok: true, message: `${GEAR_ITEMS[item.id].name} guardado.` };
  }

  /** Remove a peça (venda ou descarte) e devolve quantas moedas ela vale. */
  remove(uid) {
    const item = this.find(uid);
    if (!item) return null;
    for (const slot of GEAR_SLOTS) if (this.equipped[slot] === item.uid) this.equipped[slot] = null;
    this.bag = this.bag.filter((entry) => entry !== item);
    return { item, coins: gearSellPrice(item.id, item.rarity) };
  }

  /** Quantas peças de cada conjunto estão vestidas. */
  setCounts() {
    const counts = {};
    for (const slot of GEAR_SLOTS) {
      const set = this.definition(this.equippedItem(slot))?.set;
      if (set) counts[set] = (counts[set] ?? 0) + 1;
    }
    return counts;
  }

  activeSets() {
    return Object.entries(this.setCounts()).filter(([, count]) => count >= 4).map(([set]) => set);
  }

  /** Soma dos atributos das peças vestidas mais os bônus de conjunto completos. */
  bonuses() {
    const total = EMPTY_BONUS();
    for (const slot of GEAR_SLOTS) {
      const item = this.equippedItem(slot);
      if (!item) continue;
      for (const [stat, value] of Object.entries(gearStats(item.id, item.rarity))) total[stat] += value;
    }
    for (const set of this.activeSets()) {
      for (const [stat, value] of Object.entries(GEAR_SETS[set].bonus)) total[stat] += value;
    }
    return total;
  }

  /** Categorias da Forja (weapon/armor/shield) cobertas por peças vestidas. */
  forgeOverrides() {
    const overridden = new Set();
    for (const [slot, category] of Object.entries(FORGE_SLOT)) if (this.equipped[slot]) overridden.add(category);
    return overridden;
  }

  /**
   * Lança de arremesso: depois de um acerto, pode quebrar (chance da arma). Devolve a peça
   * quebrada (já removida da sacola) ou null.
   */
  rollThrownBreak(random = Math.random) {
    const item = this.equippedItem('weapon');
    const definition = this.definition(item);
    if (!definition?.thrown || random() >= (definition.breakChance ?? 0)) return null;
    this.remove(item.uid);
    return definition;
  }

  /** Arma vestida (para o desenho da espada na mão). */
  get weapon() {
    return this.definition(this.equippedItem('weapon'));
  }

  /**
   * Proteção na morte: a bênção é gasta primeiro; senão, o Amuleto de Proteção se quebra.
   * Devolve 'blessing', 'amulet' ou null (sem proteção).
   */
  consumeDeathProtection() {
    if (this.blessed) {
      this.blessed = false;
      return 'blessing';
    }
    const amulet = this.equippedItem('amulet');
    if (amulet && GEAR_ITEMS[amulet.id].deathWard) {
      this.remove(amulet.uid);
      return 'amulet';
    }
    return null;
  }

  get protectedOnDeath() {
    return this.blessed || Boolean(this.definition(this.equippedItem('amulet'))?.deathWard);
  }

  slotLabel(slot) {
    return SLOT_NAMES[slot] ?? slot;
  }

  serialize() {
    return {
      bag: this.bag.map((item) => ({ ...item })),
      equipped: { ...this.equipped },
      nextUid: this.nextUid,
      blessed: this.blessed
    };
  }
}
