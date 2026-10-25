export const COIN_DROP_RANGES = Object.freeze({
  day: Object.freeze([1, 3]),
  night: Object.freeze([5, 10]),
  boss: Object.freeze([20, 50])
});

export function rollCoinDrop(period = 'day', random = Math.random) {
  const range = COIN_DROP_RANGES[period] ?? COIN_DROP_RANGES.day;
  const minimum = range[0];
  const maximum = range[1];
  return minimum + Math.floor(random() * (maximum - minimum + 1));
}
