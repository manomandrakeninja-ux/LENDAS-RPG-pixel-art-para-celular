# Histórico — Experimento de Evolução Autônoma 30x (LENDAS RPG)

- Branch: `experimento-evolucao-30x` (criada sobre `main`).
- Checkpoint inicial: commit 25ba0ef (toda a SUPER ATUALIZAÇÃO já estava no working tree e foi commitada; `_backup_original/` excluído do índice via `.git/info/exclude`).
- Início: 2026-10-31 (America/Sao_Paulo).
- Estado inicial do jogo (antes do ciclo 01): 48 arquivos de teste passando (run-all-tests.ps1), mapa 400×300, 15 fotos em `SUPER ATUALIZAÇÃO/`.

## Ciclos

### Ciclo 01 — Fundação: bug da bússola + ajuda de teclas
- ETAPA A: arquitetura auditada (sem TODO/FIXME; streaming/hints já throttled; buildTerrainGrid ~96 ms só no boot; MAP_SCALE=16 → canvas do mapa 1200×900, sem risco de memória). Limitação: Chrome/Vite não rodam no sandbox (spawn EPERM) → testes visuais não executados aqui; só testes de unidade.
- ETAPA C: **bug corrigido** — `readSign` calculava a bússola com `+4 & 7`, apontando para o lado OPOSTO do destino. Nova função pura `compass8(dx, dy)` em worldRegions.js + teste (8 direções) + uso na placa.
- ETAPA C: painel de ajuda **"?" (Shift+/)**** — overlay DOM com todas as teclas fixas e configuráveis (via Keybinds.js).
- ETAPA D: world.test.js 14/14 (novo teste compass8); suite 48/48 arquivos. Sem regressões (ETAPA E vazia).
- Arquivos: src/data/worldRegions.js, src/game/RegionWorld.js, src/game/GameScene.js, index.html, src/visual.css, tests/world.test.js.
- Notas 0–100: visual 78 · código 85 · estabilidade 90 · desempenho 80 · jogabilidade 82 · mobile 70 · originalidade 80.

### Ciclo 02 — Fundação: texto de moedas + roundtrip de save
- **C:** `EconomySystem.addCoins` ganhou hook `onGain`; GameScene mostra texto flutuante dourado `+N` sobre o jogador ao ganhar moedas (reusa `Effects.spawnDamage`).
- **D:** novo teste de roundtrip v2 completo em tests/save.test.js (skills, waypoint, regions com chests/travelerGifts, economy) — save.test.js 9/9; economy 3/3; suite 48/48.
- **A:** updateFog já sai cedo quando a névoa não muda (falso alarme de performance).
- Notas 0–100: visual 78 · código 86 · estabilidade 92 · desempenho 80 · jogabilidade 82 · mobile 70 · originalidade 80.

### Ciclo 03 — UX do mapa: clima + vilarejos no cartão de região
- **C:** cartão da região (clique no mapa M) agora mostra o clima de hoje (☀️/🌧️/❄️/🌪️/🌋 via `weatherAt`) e os vilarejos daquela região.
- **D:** worldMap 2/2, weather 2/2, suite 48/48. Import de weather.js no overlay é puro (sem Phaser) — testes node continuam verdes.
- Notas 0–100: visual 78 · código 86 · estabilidade 92 · desempenho 80 · jogabilidade 83 · mobile 70 · originalidade 80.

### Ciclo 04 — Arte: sombra de contato nos NPCs de vilarejo/viajante
- **C:** ellipse de sombra (0.26 alpha) sob cada morador de vilarejo; nos viajantes a sombra acompanha o sprite no `updateTravelers` (antes ficavam "flutuando").
- **D:** suite 48/48; `node --check` ok. Sem teste visual (sandbox sem browser) — registrado como limitação.
- Notas 0–100: visual 79 · código 86 · estabilidade 92 · desempenho 80 · jogabilidade 83 · mobile 70 · originalidade 80.

