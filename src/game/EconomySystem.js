export class EconomySystem {
  constructor(saved = {}) {
    this.coins = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(Number(saved?.coins) || 0)));
  }

  addCoins(amount) {
    const coins = Math.max(0, Math.floor(Number(amount) || 0));
    // Teto: evita Infinity (que vira null no JSON e corrompe o save silently).
    this.coins = Math.min(Number.MAX_SAFE_INTEGER, this.coins + coins);
    // Hook opcional (texto flutuante "+N" dourado no jogador, definido pela cena).
    if (coins > 0) this.onGain?.(coins);
    return coins;
  }

  spendCoins(amount) {
    const coins = Math.max(0, Math.floor(Number(amount) || 0));
    if (this.coins < coins) return false;
    this.coins -= coins;
    return true;
  }

  serialize() {
    return { coins: this.coins };
  }
}
