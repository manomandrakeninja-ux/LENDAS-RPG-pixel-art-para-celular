import { MARKET_CATALOG, MARKET_STOCK_SIZE, sellPriceOf } from '../data/buildingSystems.js';
import { createSeededRandom } from '../data/harvestStructures.js';

function hashDay(day) {
  let hash = 2166136261;
  for (const character of String(day)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export class MarketSystem {
  constructor({ saved = {}, day = 1 } = {}) {
    this.day = Math.max(1, Number(day) || 1);
    this.offers = [];
    if (Number(saved?.day) === this.day && Array.isArray(saved?.offers) && saved.offers.length > 0) {
      this.offers = saved.offers
        .filter((offer) => MARKET_CATALOG.some((entry) => entry.id === offer.id))
        .map((offer) => ({ ...offer }));
      if (this.offers.length === 0) this.restock(this.day);
    } else {
      this.restock(this.day);
    }
  }

  restock(day = this.day) {
    this.day = Math.max(1, Number(day) || 1);
    const random = createSeededRandom(hashDay(this.day));
    const catalog = [...MARKET_CATALOG];
    for (let index = catalog.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      [catalog[index], catalog[target]] = [catalog[target], catalog[index]];
    }
    this.offers = catalog.slice(0, MARKET_STOCK_SIZE).map((entry) => ({
      id: entry.id,
      quantity: 1 + Math.floor(random() * entry.maxStock)
    }));
    return this.offers;
  }

  getOffer(offerId) {
    return this.offers.find((offer) => offer.id === offerId);
  }

  canAddAfterCost(inventory, cost = {}, yieldBundle = {}) {
    const projectedItems = { ...inventory.items };
    let projectedTotal = inventory.total;
    let projectedSlots = inventory.usedSlots;
    for (const [type, rawAmount] of Object.entries(cost)) {
      const amount = Math.max(0, Math.floor(Number(rawAmount) || 0));
      if (amount <= 0 || projectedItems[type] === undefined) continue;
      const removed = Math.min(amount, projectedItems[type]);
      projectedItems[type] -= removed;
      projectedTotal -= removed;
      if (projectedItems[type] === 0) projectedSlots -= 1;
    }
    if (projectedSlots >= inventory.maxSlots) return false;
    let newTypes = 0;
    for (const [type, rawAmount] of Object.entries(yieldBundle)) {
      const amount = Math.max(0, Math.floor(Number(rawAmount) || 0));
      if (amount <= 0 || projectedItems[type] === undefined) continue;
      if (projectedItems[type] === 0) newTypes += 1;
      projectedItems[type] += amount;
      projectedTotal += amount;
    }
    projectedSlots += newTypes;
    return projectedTotal <= inventory.totalCapacity && projectedSlots <= inventory.maxSlots;
  }

  buy(offerId, inventory, economy) {
    const offer = this.getOffer(offerId);
    const definition = MARKET_CATALOG.find((entry) => entry.id === offerId);
    if (!offer || !definition || offer.quantity <= 0) return { ok: false, reason: 'sold-out' };
    if (!economy || economy.coins < definition.price) return { ok: false, reason: 'coins' };
    if (!this.canAddAfterCost(inventory, {}, definition.yield)) return { ok: false, reason: 'inventory' };
    const result = inventory.addBundle(definition.yield);
    if (Object.keys(result.remaining).length > 0) {
      if (Object.keys(result.accepted).length > 0) inventory.remove(result.accepted);
      return { ok: false, reason: 'inventory' };
    }
    if (!economy.spendCoins(definition.price)) {
      inventory.remove(result.accepted);
      return { ok: false, reason: 'coins' };
    }
    offer.quantity -= 1;
    return { ok: true, accepted: result.accepted, remaining: result.remaining, spent: definition.price };
  }

  sell(type, inventory, economy, amount = 1) {
    const quantity = Math.max(1, Math.floor(Number(amount) || 1));
    if (!inventory.items[type] || inventory.items[type] < quantity) return { ok: false, reason: 'amount' };
    inventory.remove({ [type]: quantity });
    if (!economy) {
      inventory.restore(type, quantity);
      return { ok: false, reason: 'coins' };
    }
    const coins = economy.addCoins(quantity * sellPriceOf(type));
    return { ok: true, type, amount: quantity, coins };
  }

  serialize() {
    return { day: this.day, offers: this.offers.map((offer) => ({ ...offer })) };
  }
}
