// Armazém por slots: cada tipo ocupa ceil(quantidade / pilha) slots.
// `slots` null significa armazém ilimitado (Casa nível 10).

export function slotsUsed(items = {}, stackSize) {
  return Object.values(items).reduce((sum, amount) => sum + Math.ceil(Math.max(0, amount) / stackSize), 0);
}

/** Quantas unidades de `type` ainda cabem. */
export function freeUnitsFor(items = {}, type, slots, stackSize) {
  if (slots === null || slots === undefined) return Infinity;
  const current = Math.max(0, items[type] ?? 0);
  const partialRoom = current % stackSize === 0 ? 0 : stackSize - (current % stackSize);
  const freeSlots = Math.max(0, slots - slotsUsed(items, stackSize));
  return partialRoom + freeSlots * stackSize;
}

/** Guarda o que couber, na ordem do pacote. Altera `items` e devolve o que entrou e o que sobrou. */
export function storeBundle(items, bundle = {}, slots, stackSize) {
  const stored = {};
  const remaining = {};
  for (const [type, rawAmount] of Object.entries(bundle)) {
    if (!(type in items)) continue;
    const quantity = Math.max(0, Math.floor(Number(rawAmount) || 0));
    if (quantity === 0) continue;
    const accepted = Math.min(quantity, freeUnitsFor(items, type, slots, stackSize));
    if (accepted > 0) {
      items[type] += accepted;
      stored[type] = accepted;
    }
    if (accepted < quantity) remaining[type] = quantity - accepted;
  }
  return { stored, remaining };
}

export function canStoreBundle(items, bundle = {}, slots, stackSize) {
  const projected = { ...items };
  const { remaining } = storeBundle(projected, bundle, slots, stackSize);
  return Object.keys(remaining).length === 0;
}
