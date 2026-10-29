import { INVENTORY_CONFIG, RESOURCE_TYPES } from './config.js';

export class Inventory {
  constructor(saved = {}, options = {}) {
    const savedCapacityVersion = Number(saved.capacityVersion) || 0;
    const requestedSlots = options.maxSlots ?? (
      savedCapacityVersion >= INVENTORY_CONFIG.capacityVersion
        ? saved.maxSlots
        : INVENTORY_CONFIG.maxSlots
    );
    this.maxSlots = Math.min(
      INVENTORY_CONFIG.maxSlots,
      Math.max(1, Math.floor(Number(requestedSlots) || INVENTORY_CONFIG.maxSlots))
    );
    // Pilha da mochila: sempre o valor atual da config (saves antigos guardavam 12 por espaço).
    this.unitsPerSlot = Math.max(1, Math.floor(Number(options.unitsPerSlot) || INVENTORY_CONFIG.unitsPerSlot));
    this.items = Object.fromEntries(Object.keys(RESOURCE_TYPES).map((type) => [type, 0]));
    this.migrationOverflow = {};
    for (const [type, amount] of Object.entries(saved.items ?? {})) {
      if (type in this.items && Number.isFinite(Number(amount))) {
        this.items[type] = Math.max(0, Math.floor(Number(amount)));
      }
    }
    this.normalizeLoadedItems();
  }

  slotsFor(amount) {
    return Math.ceil(Math.max(0, amount) / this.unitsPerSlot);
  }

  normalizeLoadedItems() {
    let freeSlots = this.maxSlots;
    for (const [type, amount] of Object.entries(this.items)) {
      if (amount <= 0) continue;
      const kept = Math.min(amount, freeSlots * this.unitsPerSlot);
      if (amount > kept) this.migrationOverflow[type] = amount - kept;
      this.items[type] = kept;
      freeSlots -= this.slotsFor(kept);
    }
  }

  takeMigrationOverflow() {
    const overflow = { ...this.migrationOverflow };
    this.migrationOverflow = {};
    return overflow;
  }

  /** Espaços ocupados: cada tipo usa ceil(quantidade / pilha) espaços. */
  get usedSlots() {
    return Object.values(this.items).reduce((sum, amount) => sum + this.slotsFor(amount), 0);
  }

  get isFull() {
    return this.usedSlots >= this.maxSlots && Object.values(this.items).every((amount) => amount % this.unitsPerSlot === 0);
  }

  get total() {
    return Object.values(this.items).reduce((sum, amount) => sum + amount, 0);
  }

  get totalCapacity() {
    return this.maxSlots * this.unitsPerSlot;
  }

  /** Quantas unidades de `type` ainda cabem (conta o resto do espaço parcial). */
  freeUnitsFor(type) {
    if (this.items[type] === undefined) return 0;
    const current = this.items[type];
    const partial = current % this.unitsPerSlot === 0 ? 0 : this.unitsPerSlot - (current % this.unitsPerSlot);
    return partial + Math.max(0, this.maxSlots - this.usedSlots) * this.unitsPerSlot;
  }

  canAdd(type, amount = 1) {
    return this.items[type] !== undefined && amount <= this.freeUnitsFor(type);
  }

  add(type, amount = 1) {
    if (!this.canAdd(type, amount)) return false;
    this.items[type] += amount;
    return true;
  }

  canAddBundle(bundle = {}) {
    const projected = { ...this.items };
    let slots = this.usedSlots;
    for (const [type, rawAmount] of Object.entries(bundle)) {
      const amount = Math.max(0, Math.floor(Number(rawAmount) || 0));
      if (amount === 0) continue;
      if (projected[type] === undefined) return false;
      slots -= this.slotsFor(projected[type]);
      projected[type] += amount;
      slots += this.slotsFor(projected[type]);
    }
    return slots <= this.maxSlots;
  }

  addBundle(bundle = {}) {
    const accepted = {};
    const remaining = {};
    for (const [type, rawAmount] of Object.entries(bundle)) {
      const amount = Math.max(0, Math.floor(Number(rawAmount) || 0));
      if (amount === 0) continue;
      const acceptedAmount = Math.min(amount, this.freeUnitsFor(type));
      if (acceptedAmount > 0) {
        this.items[type] += acceptedAmount;
        accepted[type] = acceptedAmount;
      }
      if (acceptedAmount < amount) remaining[type] = amount - acceptedAmount;
    }
    return { accepted, remaining };
  }

  restore(type, amount = 1) {
    if (this.items[type] === undefined) return false;
    this.items[type] += Math.max(0, Math.floor(Number(amount) || 0));
    return true;
  }

  restoreBundle(bundle = {}) {
    for (const [type, amount] of Object.entries(bundle)) this.restore(type, amount);
    return true;
  }

  has(cost) {
    return Object.entries(cost).every(([type, amount]) => (this.items[type] ?? 0) >= amount);
  }

  remove(cost) {
    if (!this.has(cost)) return false;
    for (const [type, amount] of Object.entries(cost)) this.items[type] -= amount;
    return true;
  }

  removeFraction(ratio) {
    const removed = {};
    const safeRatio = Math.min(1, Math.max(0, ratio));
    for (const [type, amount] of Object.entries(this.items)) {
      const quantity = Math.floor(amount * safeRatio);
      if (quantity <= 0) continue;
      this.items[type] -= quantity;
      removed[type] = quantity;
    }
    return removed;
  }

  serialize() {
    return {
      capacityVersion: INVENTORY_CONFIG.capacityVersion,
      maxSlots: this.maxSlots,
      unitsPerSlot: this.unitsPerSlot,
      items: { ...this.items }
    };
  }
}
