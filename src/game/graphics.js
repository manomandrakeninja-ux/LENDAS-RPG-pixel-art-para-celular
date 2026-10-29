// Modo gráfico (Ajustes > Gráficos). O modo "Alto" é o visual completo; os outros tiram só o que custa
// mais por quadro em celulares fracos. Funções puras: o jogo lê o perfil em `scene.gfx`.

export const GRAPHICS_MODES = Object.freeze(['high', 'balanced', 'light']);
export const GRAPHICS_LABELS = Object.freeze({
  high: 'Alto',
  balanced: 'Equilibrado',
  light: 'Leve (celulares antigos)'
});
export const GRAPHICS_NOTES = Object.freeze({
  high: 'Visual completo.',
  balanced: 'Luz da noite um pouco mais espaçada, menos chuva e partículas, inimigos distantes atualizados com menos frequência.',
  light: 'Resolução 75%, luz da noite simples, sombras simples, menos partículas, chuva e inimigos, sem animações de fundo.'
});

export const GRAPHICS_PROFILES = Object.freeze({
  high: Object.freeze({
    renderScale: 1,
    lightInterval: 90, // ms entre redesenhos da máscara de luz
    lightSimple: false, // true: gradiente fixo barato no lugar da máscara por fonte de luz
    particleScale: 1, // fração das partículas ambientais (folhas, vaga-lumes, poeira)
    rainDrops: 90,
    enemyLimitScale: 1,
    farUpdateEvery: 3, // inimigos bem fora da tela atualizam a cada N quadros
    farUpdateReach: 1.6, // "bem fora" = além de reach x este fator
    simpleShadows: false,
    backgroundAnimations: true
  }),
  balanced: Object.freeze({
    renderScale: 1,
    lightInterval: 130,
    lightSimple: false,
    particleScale: 0.6,
    rainDrops: 60,
    enemyLimitScale: 0.85,
    farUpdateEvery: 4,
    farUpdateReach: 1.25,
    simpleShadows: false,
    backgroundAnimations: true
  }),
  light: Object.freeze({
    renderScale: 0.75,
    lightInterval: 200,
    lightSimple: true,
    particleScale: 0.25,
    rainDrops: 30,
    enemyLimitScale: 0.6,
    farUpdateEvery: 6,
    farUpdateReach: 1,
    simpleShadows: true,
    backgroundAnimations: false
  })
});

export function graphicsProfile(mode) {
  return GRAPHICS_PROFILES[mode] ?? GRAPHICS_PROFILES.high;
}

/**
 * Modo sugerido a partir do aparelho: núcleos (navigator.hardwareConcurrency), memória
 * (navigator.deviceMemory, em GB, só no Chrome) e fps médio medido nos primeiros segundos.
 * Qualquer dado ausente (null/undefined) é ignorado.
 */
export function suggestGraphicsMode({ cores = null, memory = null, fps = null } = {}) {
  let hardware = 0; // quanto maior, mais fraco o aparelho
  if (Number.isFinite(cores)) hardware += cores <= 4 ? 2 : cores <= 6 ? 1 : 0;
  if (Number.isFinite(memory)) hardware += memory <= 2 ? 2 : memory <= 4 ? 1 : 0;
  const measured = Number.isFinite(fps) && fps > 0;
  // Rodando liso (>= 57 fps) o aparelho aguenta o visual completo, a não ser que seja bem fraco no papel.
  if (measured && fps >= 57) return hardware >= 4 ? 'balanced' : 'high';
  const score = hardware + (measured ? (fps < 30 ? 4 : fps < 45 ? 2 : 1) : 0);
  if (score >= 4) return 'light';
  if (score >= 2) return 'balanced';
  return 'high';
}

/** Mede o fps médio e o p95 do tempo de quadro a partir de uma lista de durações (ms). */
export function frameStats(frames) {
  const list = [...frames].filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (list.length === 0) return { fps: 0, p95: 0 };
  const sum = list.reduce((total, value) => total + value, 0);
  return { fps: 1000 / (sum / list.length), p95: list[Math.min(list.length - 1, Math.floor(list.length * 0.95))] };
}
