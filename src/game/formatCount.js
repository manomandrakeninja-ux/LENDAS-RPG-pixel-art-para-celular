/** Quantidade legível: até 9999 inteira; a partir de 10000 vira 12k, 1,2M etc. */
export function formatCount(value) {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  if (n < 10000) return String(n);
  const short = (divisor, suffix) => {
    const scaled = n / divisor;
    const text = scaled >= 100 ? String(Math.floor(scaled)) : (Math.floor(scaled * 10) / 10).toString().replace('.', ',');
    return `${text}${suffix}`;
  };
  return n < 1000000 ? short(1000, 'k') : short(1000000, 'M');
}
