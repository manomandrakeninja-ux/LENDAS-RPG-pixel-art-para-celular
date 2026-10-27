// Sombra do sol conforme a hora (usada pelo ShadowSystem).

/** Ângulo, comprimento e força da sombra para a hora do dia (0..24). */
export function sunShadow(hour) {
  if (hour < 6 || hour >= 18.5) return { angle: 0.15, length: 0.32, alpha: 0.1 };
  const t = Math.min(1, Math.max(0, (hour - 6) / 12));
  // t = 0 nascer (sol a leste: sombra para a esquerda), 1 pôr do sol.
  const angle = (0.5 - t) * 2.2;
  const length = 0.28 + Math.abs(t - 0.5) * 1.1;
  const alpha = hour < 6.6 || hour > 17.6 ? 0.16 : 0.28;
  return { angle, length, alpha };
}
