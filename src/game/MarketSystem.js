import { ACCESSORIES } from '../data/buildingSystems.js';
import { BUILDING_DEFS, buildingStat, clampLevel, hasUnlock } from '../data/buildings.js';
import {
  AUCTION_CONFIG,
  MARKET_CATALOG,
  TRAVELER_CATALOG,
  findCatalogEntry,
  resaleValue,
  sellPriceOf
} from '../data/economy.js';
import { createSeededRandom } from '../data/harvestStructures.js';

const MARKET = BUILDING_DEFS.market;

function hashDay(day, salt = '') {
  let hash = 2166136261;
  for (const character of `${salt}${day}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function shuffled(list, random) {
  const result = [...list];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

const toOffer = (entry, random) => ({ id: entry.id, quantity: 1 + Math.floor(random() * entry.maxStock) });

export class MarketSystem {
  // ownedAccessories(): acessórios que o jogador já tem, para o leilão não repetir item.
  constructor({ saved = {}, day = 1, level = 1, ownedAccessories = () => new Set() } = {}) {
    this.ownedAccessories = ownedAccessories;
    this.level = clampLevel('market', level);
    this.day = Math.max(1, Number(day) || 1);
    this.reputationSpent = Math.max(0, Math.floor(Number(saved?.reputationSpent) || 0));
    this.orders = (Array.isArray(saved?.orders) ? saved.orders : [])
      .filter((order) => findCatalogEntry(order?.id) && Number.isFinite(Number(order.readyDay)))
      .map((order) => ({ id: order.id, readyDay: Number(order.readyDay) }));
    this.auction = saved?.auction && Number(saved.auction.day) === this.day ? { ...saved.auction } : null;
    const sameDay = Number(saved?.day) === this.day && Number(saved?.level) === this.level;
    if (sameDay && Array.isArray(saved?.offers) && saved.offers.length > 0) {
      this.offers = saved.offers.filter((offer) => findCatalogEntry(offer.id)).map((offer) => ({ ...offer }));
      this.travelerOffers = (saved.travelerOffers ?? []).filter((offer) => findCatalogEntry(offer.id)).map((offer) => ({ ...offer }));
      if (this.offers.length === 0) this.restock(this.day);
    } else {
      this.restock(this.day);
    }
    this.openAuctionIfDue();
  }

  setLevel(level) {
    this.level = clampLevel('market', level);
    this.restock(this.day);
    this.openAuctionIfDue();
  }

  get unlockedCatalog() {
    return MARKET_CATALOG.filter((entry) => entry.level <= this.level);
  }

  get offersPerDay() {
    return buildingStat('market', 'offersPerDay', this.level);
  }

  get canSell() {
    return hasUnlock('market', 'sell', this.level);
  }

  get reputationDiscount() {
    if (!hasUnlock('market', 'reputation', this.level)) return 0;
    const { coinsPerPoint, discountPerPoint, maxDiscount } = MARKET.reputation;
    return Math.min(maxDiscount, Math.floor(this.reputationSpent / coinsPerPoint) * discountPerPoint);
  }

  get discount() {
    return (buildingStat('market', 'discount', this.level) ?? 0) + this.reputationDiscount;
  }

  /** Preço com desconto; nunca abaixo do valor de revenda + 1, para não haver lucro comprando e vendendo. */
  priceOf(entry, surcharge = 1) {
    const discounted = Math.ceil(entry.price * (1 - this.discount) * surcharge);
    return Math.max(resaleValue(entry.yield) + 1, discounted);
  }

  get travelerEveryDays() {
    return buildingStat('market', 'travelerEveryDays', this.level) ?? 0;
  }

  isTravelerDay(day = this.day) {
    const every = this.travelerEveryDays;
    return every > 0 && day % every === 0;
  }

  restock(day = this.day) {
    this.day = Math.max(1, Number(day) || 1);
    const random = createSeededRandom(hashDay(this.day));
    const unlocked = this.unlockedCatalog;
    const count = this.offersPerDay ?? unlocked.length;
    // Os itens básicos do nível 1 estão sempre à venda; o resto é sorteado.
    const basics = unlocked.filter((entry) => entry.basic);
    const others = shuffled(unlocked.filter((entry) => !entry.basic), random);
    this.offers = [...basics, ...others].slice(0, count).map((entry) => toOffer(entry, random));

    this.travelerOffers = [];
    if (this.isTravelerDay()) {
      const travelerRandom = createSeededRandom(hashDay(this.day, 'viajante'));
      const rare = shuffled(TRAVELER_CATALOG.rare, travelerRandom).slice(0, 3);
      const epic = hasUnlock('market', 'epicTraveler', this.level) ? TRAVELER_CATALOG.epic : [];
      this.travelerOffers = [...rare, ...epic].map((entry) => toOffer(entry, travelerRandom));
    }
    return this.offers;
  }

  /** Virada de dia: fecha o leilão anterior, renova o estoque e entrega encomendas prontas. */
  advanceDay(day, economy) {
    const auctionResult = this.auction && this.auction.day < day ? this.closeAuction(economy) : null;
    this.restock(day);
    if (this.auction && this.auction.day < this.day) this.auction = null;
    this.openAuctionIfDue();
    return { auctionResult, orders: this.takeReadyOrders(this.day) };
  }

  getOffer(offerId, source = 'daily') {
    const list = source === 'traveler' ? this.travelerOffers : this.offers;
    return list.find((offer) => offer.id === offerId);
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

  spend(economy, amount) {
    if (!economy.spendCoins(amount)) return false;
    this.reputationSpent += amount;
    return true;
  }

  buy(offerId, inventory, economy, source = 'daily') {
    const offer = this.getOffer(offerId, source);
    const definition = findCatalogEntry(offerId);
    if (!offer || !definition || offer.quantity <= 0) return { ok: false, reason: 'sold-out' };
    const price = this.priceOf(definition);
    if (!economy || economy.coins < price) return { ok: false, reason: 'coins' };
    if (!this.canAddAfterCost(inventory, {}, definition.yield)) return { ok: false, reason: 'inventory' };
    const result = inventory.addBundle(definition.yield);
    if (Object.keys(result.remaining).length > 0) {
      if (Object.keys(result.accepted).length > 0) inventory.remove(result.accepted);
      return { ok: false, reason: 'inventory' };
    }
    if (!this.spend(economy, price)) {
      inventory.remove(result.accepted);
      return { ok: false, reason: 'coins' };
    }
    offer.quantity -= 1;
    return { ok: true, accepted: result.accepted, remaining: result.remaining, spent: price };
  }

  sell(type, inventory, economy, amount = 1) {
    if (!this.canSell) return { ok: false, reason: 'locked' };
    const quantity = Math.max(1, Math.floor(Number(amount) || 1));
    if (!inventory.items[type] || inventory.items[type] < quantity) return { ok: false, reason: 'amount' };
    if (!economy) return { ok: false, reason: 'coins' };
    inventory.remove({ [type]: quantity });
    const coins = economy.addCoins(quantity * sellPriceOf(type));
    return { ok: true, type, amount: quantity, coins };
  }

  // ---- Encomendas (nível 8) ----
  get canOrder() {
    return hasUnlock('market', 'orders', this.level);
  }

  orderPrice(entry) {
    return this.priceOf(entry, MARKET.orderSurcharge);
  }

  placeOrder(entryId, economy) {
    if (!this.canOrder) return { ok: false, reason: 'locked' };
    const entry = MARKET_CATALOG.find((candidate) => candidate.id === entryId);
    if (!entry) return { ok: false, reason: 'invalid' };
    const price = this.orderPrice(entry);
    if (!this.spend(economy, price)) return { ok: false, reason: 'coins' };
    const order = { id: entryId, readyDay: this.day + MARKET.orderDelayDays };
    this.orders.push(order);
    return { ok: true, order, spent: price };
  }

  /** Entregas prontas no dia informado; o chamador guarda os pacotes no armazém. */
  takeReadyOrders(day = this.day) {
    const ready = this.orders.filter((order) => order.readyDay <= day);
    this.orders = this.orders.filter((order) => order.readyDay > day);
    return ready.map((order) => ({ id: order.id, bundle: { ...findCatalogEntry(order.id).yield } }));
  }

  // ---- Leilão semanal (nível 9) ----
  get hasAuctionToday() {
    return Boolean(this.auction && this.auction.day === this.day && !this.auction.closed);
  }

  openAuctionIfDue() {
    if (!hasUnlock('market', 'auction', this.level) || this.day % MARKET.auctionEveryDays !== 0) return null;
    if (this.auction?.day === this.day) return this.auction;
    const random = createSeededRandom(hashDay(this.day, 'leilao'));
    const owned = this.ownedAccessories();
    const pending = AUCTION_CONFIG.items.filter((id) => !owned.has(id));
    const week = Math.floor(this.day / MARKET.auctionEveryDays) - 1;
    const item = pending.length > 0 ? pending[week % pending.length] : null;
    const [minimum, maximum] = AUCTION_CONFIG.rivalMaxBid;
    this.auction = {
      day: this.day,
      item,
      playerBid: 0,
      rivalBid: AUCTION_CONFIG.startBid,
      rivalMax: minimum + Math.floor(random() * (maximum - minimum + 1)),
      closed: false
    };
    return this.auction;
  }

  get auctionItemLabel() {
    if (!this.auction) return '';
    return this.auction.item ? ACCESSORIES[this.auction.item].name : 'Baú lendário de ouro';
  }

  get nextBid() {
    if (!this.auction) return 0;
    return Math.max(this.auction.rivalBid, this.auction.playerBid) + AUCTION_CONFIG.bidStep;
  }

  get playerLeads() {
    return Boolean(this.auction && this.auction.playerBid > this.auction.rivalBid);
  }

  /** O jogador cobre o lance; as moedas ficam retidas e voltam se ele perder. */
  bid(economy) {
    if (!this.hasAuctionToday) return { ok: false, reason: 'closed' };
    if (this.playerLeads) return { ok: false, reason: 'leading' };
    const bid = this.nextBid;
    const extra = bid - this.auction.playerBid;
    if (!economy.spendCoins(extra)) return { ok: false, reason: 'coins' };
    this.auction.playerBid = bid;
    // O rival responde enquanto o lance couber no limite dele.
    const counter = bid + AUCTION_CONFIG.bidStep;
    if (counter <= this.auction.rivalMax) this.auction.rivalBid = counter;
    return { ok: true, bid, leading: this.playerLeads };
  }

  /** Fecha o leilão do dia. Devolve { won, item, fallback } ou o reembolso. */
  closeAuction(economy) {
    if (!this.auction || this.auction.closed) return null;
    this.auction.closed = true;
    if (this.playerLeads) {
      this.reputationSpent += this.auction.playerBid;
      return { won: true, item: this.auction.item, fallback: this.auction.item ? null : { ...AUCTION_CONFIG.fallbackYield } };
    }
    if (this.auction.playerBid > 0) economy?.addCoins(this.auction.playerBid);
    return { won: false, refunded: this.auction.playerBid };
  }

  serialize() {
    return {
      day: this.day,
      level: this.level,
      offers: this.offers.map((offer) => ({ ...offer })),
      travelerOffers: this.travelerOffers.map((offer) => ({ ...offer })),
      reputationSpent: this.reputationSpent,
      orders: this.orders.map((order) => ({ ...order })),
      auction: this.auction ? { ...this.auction } : null
    };
  }
}
