# Expansão — progressão do jogador

## XP e níveis

- Slime: 10 XP.
- Lobo: 20 XP.
- Javali: 25 XP.
- Esqueleto: 30 XP.
- Fantasma: 35 XP.
- Aranha: 40 XP.
- Lobisomem: 50 XP.

Inimigos deixam cristais de XP no chão. O jogador os atrai por proximidade e recebe o XP ao entrar no raio de coleta. O HUD mostra `NÍVEL`, XP atual e limite do próximo nível.

## Evolução

Cada nível:

1. concede **+10 de vida máxima**;
2. abre uma escolha obrigatória entre **+2 ataque** ou **+2 defesa**.

A escolha pausa movimento e combate. Um único drop que conceda vários níveis cria uma fila de escolhas, aplicada uma por vez. O limite máximo é **nível 20** e, nele, o jogador para de receber XP.

## Persistência

O save v2 preserva:

- nível e XP;
- vida máxima base;
- pontos de ataque e defesa;
- escolhas de nível ainda pendentes.

O nível e o XP exibidos no HUD são reconstruídos a partir desses dados ao recarregar.

## Arquivos principais

- `src/data/progression.js`: thresholds, limites e estado do jogador;
- `src/game/ExperiencePickups.js`: cristais de XP físicos;
- `src/game/LevelUpOverlay.js`: modal de escolha;
- `src/game/Player.js`: vida máxima e atributos;
- `src/game/UI.js`: barra de XP;
- `tests/progression.test.js`: regras de domínio;
- `scripts/progression-runtime-check.mjs`: teste mobile completo.
