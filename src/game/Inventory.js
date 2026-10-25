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
    const requestedUnits = options.unitsPerSlot ?? (
      savedCapacityVersion >= INVENTORY_CONFIG.capacityVersion
        ? saved.unitsPerSlot
        : INVENTORY_CONFIG.unitsPerSlot
    );
    this.unitsPerSlot = Math.min(
      INVENTORY_CONFIG.unitsPerSlot,
      Math.max(1, Math.floor(Number(requestedUnits) || INVENTORY_CONFIG.unitsPerSlot))
    );
    this.items = Object.fromEntries(Object.keys(RESOURCE_TYPES).map((type) => [type, 0]));
    this.migrationOverflow = {};
    for (const [type, amount] of Object.entries(saved.items ?? {})) {
      if (type in this.items && Number.isFinite(Number(amount))) {
        this.items[type] = Math.max(0, Math.floor(Number(amount)));
      }
    }
    this.normalizeLoadedItems();
  }

  normalizeLoadedItems() {
    const occupiedTypes = Object.entries(this.items)
      .filter(([, amount]) => amount > 0)
      .map(([type]) => type);
    const keptTypes = new Set(occupiedTypes.slice(0, this.maxSlots));
    let remainingCapacity = this.totalCapacity;
    for (const [type, amount] of Object.entries(this.items)) {
      if (amount <= 0) continue;
      if (!keptTypes.has(type)) {
        this.migrationOverflow[type] = amount;
        this.items[type] = 0;
        continue;
      }
      const kept = Math.min(amount, remainingCapacity);
      if (amount > kept) this.migrationOverflow[type] = amount - kept;
      this.items[type] = kept;
      remainingCapacity -= kept;
      if (remainingCapacity <= 0) remainingCapacity = 0;
    }
  }

  takeMigrationOverflow() {
    const overflow = { ...this.migrationOverflow };
    this.migrationOverflow = {};
    return overflow;
  }

  get usedSlots() {
    return Object.values(this.items).filter((amount) => amount > 0).length;
  }

  get isFull() {
    return this.usedSlots >= this.maxSlots || this.total >= this.totalCapacity;
  }

  get total() {
    return Object.values(this.items).reduce((sum, amount) => sum + amount, 0);
  }

  get totalCapacity() {
    return this.maxSlots * this.unitsPerSlot;
  }

  canAdd(type, amount = 1) {
    return this.items[type] !== undefined &&
      this.usedSlots < this.maxSlots &&
      this.total + amount <= this.totalCapacity;
  }

  add(type, amount = 1) {
    if (!this.canAdd(type, amount)) return false;
    this.items[type] += amount;
    return true;
  }

  canAddBundle(bundle = {}) {
    if (this.usedSlots >= this.maxSlots) return false;
    const normalized = [];
    let addedTotal = this.total;
    let newTypes = 0;
    for (const [type, rawAmount] of Object.entries(bundle)) {
      const amount = Math.max(0, Math.floor(Number(rawAmount) || 0));
      if (amount === 0) continue;
      if (this.items[type] === undefined) return false;
      if (this.items[type] === 0) newTypes += 1;
      addedTotal += amount;
      normalized.push({ type, amount });
    }
    if (addedTotal > this.totalCapacity) return false;
    return this.usedSlots + newTypes <= this.maxSlots;
  }

  addBundle(bundle = {}) {
    const accepted = {};
    const remaining = {};
    for (const [type, rawAmount] of Object.entries(bundle)) {
      let amount = Math.max(0, Math.floor(Number(rawAmount) || 0));
      if (amount === 0) continue;
      const available = Math.max(0, this.totalCapacity - this.total);
      const slotAvailable = this.usedSlots < this.maxSlots;
      const acceptedAmount = slotAvailable ? Math.min(amount, available) : 0;
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
