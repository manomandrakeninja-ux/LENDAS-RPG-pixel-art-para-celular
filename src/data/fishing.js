// Pesca nos píeres (inspirado no laço cozy do Rowanmark: esperar a boia afundar e fisgar na hora).
// Lógica pura (roda no Node): a cena cuida dos timers e do sprite da boia.

export const FISH_WAIT_MS = Object.freeze([2000, 6000]);
export const FISH_BITE_WINDOW_MS = 1200;

/** Estados da pescaria: parado → esperando → fisgada (janela curta) → resultado. */
export const FISH_STATES = Object.freeze(['idle', 'waiting', 'bite']);

/** Tempo de espera até a próxima fisgada. */
export function nextWaitMs(rng = Math.random) {
  const [min, max] = FISH_WAIT_MS;
  return Math.round(min + rng() * (max - min));
}

/** Saque do dia: peixe (comum) e, às vezes, um bônus em moedas. */
export function rollCatch(rng = Math.random) {
  const amount = rng() < 0.2 ? 2 : 1;
  const bonusCoins = rng() < 0.1 ? 5 : 0;
  return { fish: amount, coins: bonusCoins };
}
