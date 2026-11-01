// Lógica pura do lock-on (tecla Tab): escolhe o próximo alvo entre os inimigos vivos no alcance.
// Sem Phaser: roda no Node para testes.

/** Candidatos: [{ x, y, active, dead, ... }]. Devolve o próximo alvo (cicla do mais próximo). */
export function nextLockTarget(candidates, current, px, py, range) {
  const list = (candidates ?? [])
    .filter((e) => e && e.active && !e.dead && Math.hypot(e.x - px, e.y - py) <= range)
    .sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py));
  if (!list.length) return null;
  if (!current || !list.includes(current)) return list[0];
  return list[(list.indexOf(current) + 1) % list.length];
}

/** Distância do herói até o alvo (0 se nenhum). */
export function lockDistance(target, px, py) {
  if (!target) return Infinity;
  return Math.hypot(target.x - px, target.y - py);
}
