# Progressão do jogador (LENDAS, Sistema 4)

## XP por inimigo

Os valores ficam em `src/data/enemies.json` (campo `xp` de cada espécie). Elite vale o dobro (`eliteXpMultiplier: 2`).

| Inimigo | XP | Elite |
|---|---:|---:|
| Gosma | 10 | 20 |
| Lobo | 20 | 40 |
| Javali | 25 | 50 |
| Esqueleto | 30 | 60 |
| Aranha | 30 | 60 |
| Fantasma | 35 | 70 |
| Lobisomem | 50 | 100 |

Inimigos comuns deixam cristais de XP no chão, atraídos pelo jogador. Invasores de um ataque ao acampamento não deixam cristais: o XP deles é pago em dobro na vitória.

## Subir de nível

- XP necessário: **nível atual × 100** (nível 1 → 2 pede 100, nível 2 → 3 pede 200...).
- Ao subir, o jogo **pausa** (relógio, fazenda, ataques e inimigos) e abre a escolha: **+15 vida máxima**, **+3 ataque** ou **+2 defesa**.
- Vários níveis de uma vez criam uma fila de escolhas, aplicadas uma por vez.
- Nos níveis 5, 10, 15 e 20 vem também a escolha de um talento.
- Nível máximo: **20**.

A barra de XP fica logo abaixo da barra de vida no HUD.

## Persistência e saves antigos

O save guarda nível, XP, pontos de cada escolha, escolhas pendentes e talentos. Saves feitos antes desta versão (quando cada nível dava +10 de vida automática e ataque/defesa valiam +2 por ponto) são convertidos em um bônus de "legado" com os mesmos valores: ninguém perde atributos.

## Arquivos principais

- `src/data/enemies.json` e `src/data/enemies.js`: XP por inimigo e `enemyXp()`;
- `src/data/progression.js`: fórmula, escolhas, limites e migração;
- `src/game/ExperiencePickups.js`: cristais de XP físicos;
- `src/game/LevelUpOverlay.js`: modal com as três escolhas;
- `src/game/UI.js`: barra de XP;
- `tests/progression.test.js` e `scripts/progression-runtime-check.mjs`.
