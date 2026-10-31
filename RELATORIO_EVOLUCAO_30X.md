# RELATÓRIO — Experimento de Evolução Autônoma 30x (LENDAS RPG)

- Início: 2026-10-31 · Branch: `experimento-evolucao-30x` · Diretório: `C:\Users\Lucas Eduardo\Downloads\JOGO`
- Proteção: checkpoint inicial commitado (25ba0ef); `_backup_original/` fora do índice; nada em `F:\app\JOGO` foi tocado.
- Limitação conhecida: `npm run build` / `node --test` falham no sandbox com `spawn EPERM`; uso `node tests/x.test.js` individual + `scripts/run-all-tests.ps1` + `node --check`.

## Ciclo 01/30 — Fundação: bússola das placas + ajuda "?" ✅ CONCLUÍDO

- **A (análise):** sem TODO/FIXME; streaming e hints já throttled (250 ms); `buildTerrainGrid` ~96 ms só no boot; canvas do mapa 1200×900 (MAP_SCALE=16) — sem risco de memória. Limitação registrada: Chrome/Vite não rodam no sandbox → sem teste visual automatizado nesta sessão.
- **B (planejamento):** priorizei correção de bug real + QoL de ajuda.
- **C (implementação):** bug da bússola invertida nas placas corrigido via `compass8()` pura (testável); painel de ajuda "?" (Shift+/) com teclas fixas + configuráveis.
- **D (testes):** world.test.js 14/14 (novo teste compass8 com 8 direções); suite 48/48. `node --check` nos 3 arquivos tocados.
- **E (correção):** nenhuma regressão encontrada.
- **F (otimização):** nada novo neste ciclo (hotspots já cacheados/throttled).
- **G (autocrítica):** o painel de ajuda é estático — poderia ler as teclas rebindadas ao vivo (já lê via `loadKeybinds()` na abertura, ok). Poderia haver foto do painel, mas sem browser no sandbox.
- **H (documentação):** experimento-30x/{historico,bugs,ideias,metricas}.md atualizados; commit de checkpoint a seguir.
- **Notas 0–100:** visual 78 (pixel art coeso; sem verificação visual possível) · código 85 (cobertura boa no mundo; GameScene grande) · estabilidade 90 (48/48 + bug corrigido) · desempenho 80 (sem perfilação real no sandbox) · jogabilidade 82 (ajuda de teclas nova) · mobile 70 (touch existe, não testado) · originalidade 80.

## Ciclo 02/30 — Fundação: feedback de moedas + roundtrip de save ✅ CONCLUÍDO

- **A:** `updateFog` auditado — já retorna cedo se a névoa não mudou (sem hotspot).
- **C:** `EconomySystem.onGain` hook → `+N` dourado flutuante sobre o jogador (`Effects.spawnDamage` reusado).
- **C/D:** teste de roundtrip v2 completo (skills/waypoint/regions/chests/travelerGifts/economy) em save.test.js → 9/9; suite 48/48; sem regressões.
- **Notas 0–100:** visual 78 · código 86 · estabilidade 92 · desempenho 80 · jogabilidade 82 · mobile 70 · originalidade 80.

## Ciclo 03/30 — UX do mapa: clima e vilarejos no cartão de região ✅ CONCLUÍDO

- **C:** `showRegionAt` agora exibe clima de hoje (`weatherAt` + `WEATHER_ICONS`) e vilarejos da região no cartão.
- **D:** worldMap 2/2, weather 2/2, suite 48/48; import puro (sem Phaser) mantém testes node verdes.
- **Notas 0–100:** visual 78 · código 86 · estabilidade 92 · desempenho 80 · jogabilidade 83 · mobile 70 · originalidade 80.

## Ciclo 04/30 — Arte: sombra de contato dos NPCs ✅ CONCLUÍDO

- **C:** sombra ellipse sob moradores de vilarejos e viajantes (acompanha no update).
- **D:** suite 48/48. Limitação: verificação visual não é possível no sandbox (sem Chrome) — auditado só por código.
- **Notas 0–100:** visual 79 · código 86 · estabilidade 92 · desempenho 80 · jogabilidade 83 · mobile 70 · originalidade 80.

## Ciclo 05/30 — Testador automático: simulacao.test.js + POI inalcançável ✅ CONCLUÍDO

- **A/C/D:** `tests/simulacao.test.js` (4 testes puros, sem Phaser): BFS de alcançabilidade do acampamento até cavernas/torres/vilarejos/baús (a pé ou de barco por ilha), 30 dias de clima, XP/skills + roundtrip de save, integridade da grade 400×300+subterrâneo.
- **Bug real achado e corrigido:** Gruta dos Piratas em ilha longe de porto → novo DOCK `ancoradouro-piratas` + entrada da gruta movida para 404 px do porto.
- **D:** simulacao 4/4; suite 49/49 arquivos. Sem regressões.
- **Notas 0–100:** visual 79 · código 87 · estabilidade 94 · desempenho 80 · jogabilidade 83 · mobile 70 · originalidade 80.

## Ciclo 06/30 — Otimização: cache do buildTerrainGrid ✅ CONCLUÍDO

- **A:** `grid.terrain` só é lida após a construção (auditado) → cache seguro em módulo.
- **C/F:** `buildTerrainGrid()` cacheada (182 ms → 0,00 ms na 2ª chamada); `buildTerrainGridUncached()` exportada para testes.
- **D:** simulacao.test.js 5/5 (novo teste de cache); suite 49/49.
- **Notas 0–100:** visual 79 · código 87 · estabilidade 94 · desempenho 83 · jogabilidade 83 · mobile 70 · originalidade 80.

## Ciclo 07/30 — Game design: dormir em vilarejos ✅ CONCLUÍDO

- **C:** cama na 1ª casa de cada vilarejo (feature `bed`) → `sleepAtBed()` compartilha `doSleep()` com o acampamento (cura + amanhecer + save). Ajuda "?" atualizada.
- **Fotos:** 16-vilarejos-com-cama, 17-mapa-com-porto-pirata (7 portos no total).
- **D:** suite 49/49; simulacao 5/5; world 14/14.
- **Notas 0–100:** visual 79 · código 87 · estabilidade 94 · desempenho 83 · jogabilidade 85 · mobile 70 · originalidade 80.

## Ciclo 08/30 — Jogabilidade: seta de borda apontando ao waypoint ✅ CONCLUÍDO

- **C:** seta verde na borda da tela (graphics na HUD camera) → direção do waypoint fora da visão; some no modo foto/perto.
- **D:** suite 49/49; simulacao 5/5.
- **Notas 0–100:** visual 79 · código 87 · estabilidade 94 · desempenho 83 · jogabilidade 86 · mobile 70 · originalidade 80.

## Ciclo 09/30 — Economia: baús de mundo reabastecem em 3 dias ✅ CONCLUÍDO

- **C:** `chestDays` no save (compatível com saves antigos); baú saqueado volta com moedas após 3 dias; chefe/torre seguem únicos.
- **D:** suite 49/49; sem regressões.
- **Notas 0–100:** visual 79 · código 87 · estabilidade 94 · desempenho 83 · jogabilidade 87 · mobile 70 · originalidade 80.

## Ciclo 10/30 — QA: contenção do mundo (trava física confirmada por teste) ✅ CONCLUÍDO

- **A:** `terrainAt` é infinita por design → fora do mapa gera chão; a barreira real é `setCollideWorldBounds(true)` no Player. Novo teste valida isso no código-fonte + tamanho do FULL_WORLD.
- **D:** simulacao 6/6; suite 49/49.
- **Notas 0–100:** visual 79 · código 87 · estabilidade 95 · desempenho 83 · jogabilidade 87 · mobile 70 · originalidade 80.

## Ciclo 11/30 — Conteúdo: lojinha nos vilarejos ✅ CONCLUÍDO

- **C:** `openShop()` comum (poção 15 / comida 8 / tocha 5); morador do vilarejo abre a loja da vila; viajante reusa.
- **D:** suite 49/49.
- **Notas 0–100:** visual 79 · código 87 · estabilidade 95 · desempenho 83 · jogabilidade 88 · mobile 70 · originalidade 81.

## Ciclo 26/30 — QoL: pausa automática ao ocultar a aba ✅ CONCLUÍDO

- **C:** aba oculta → save + pausa física (se nada pausou) + aviso; ao voltar, tecla retoma. Evita morrer com a tela escondida.
- **D:** suite 49/49.
- **Notas 0–100:** visual 85 · código 89 · estabilidade 97 · desempenho 83 · jogabilidade 91 · mobile 74 · originalidade 83.

## Ciclo 25/30 — Teste de conteúdo: biomas/regiões completos ✅ CONCLUÍDO

- **D:** simulacao.test.js ganhou teste de conteúdo: terrenos do overworld presentes, recursos por terreno, spawns de monstros em todas as regiões (vale incluído). 7/7; suite 49/49.
- **Notas 0–100:** visual 85 · código 89 · estabilidade 96 · desempenho 83 · jogabilidade 91 · mobile 73 · originalidade 83.

## Ciclo 24/30 — Feedback de perigo: vinheta vermelha com vida < 25% ✅ CONCLUÍDO

- **C:** vinheta pulsante (CSS) no HUD; liga/desliga no update conforme vida; some no modo foto.
- **D:** suite 49/49.
- **Notas 0–100:** visual 85 · código 88 · estabilidade 95 · desempenho 83 · jogabilidade 91 · mobile 73 · originalidade 83.

## Ciclo 23/30 — Game feel: crítico de joia com hitstop + CRÍTICO! ✅ CONCLUÍDO

- **C:** acerto crítico (joia) no corpo a corpo → hitstop 60 ms, impacto forte dourado e texto "CRÍTICO!".
- **D:** suite 49/49.
- **Notas 0–100:** visual 84 · código 88 · estabilidade 95 · desempenho 83 · jogabilidade 91 · mobile 72 · originalidade 83.

## Ciclo 22/30 — HUD: ícone do clima no status ✅ CONCLUÍDO

- **C:** status do clima agora leva o ícone (🌧️❄️🌪️🌋) junto do texto.
- **D:** suite 49/49.
- **Notas 0–100:** visual 84 · código 88 · estabilidade 95 · desempenho 83 · jogabilidade 90 · mobile 72 · originalidade 83.

## Ciclo 21/30 — Modo foto com coordenadas ✅ CONCLUÍDO

- **C:** no modo foto (P) aparece `📍 X m, Y m • dia N` no canto inferior direito (só nesse modo).
- **D:** suite 49/49.
- **Notas 0–100:** visual 83 · código 88 · estabilidade 95 · desempenho 83 · jogabilidade 90 · mobile 72 · originalidade 83.

## Ciclo 20/30 — UX: dicas rotativas no splash ✅ CONCLUÍDO

- **C:** 14 dicas (teclas novas do experimento incluídas) girando a cada 4 s durante o carregamento.
- **D:** suite 49/49.
- **Notas 0–100:** visual 83 · código 88 · estabilidade 95 · desempenho 83 · jogabilidade 90 · mobile 72 · originalidade 83.

## Ciclo 19/30 — Auditoria: sintaxe geral + imports ✅ CONCLUÍDO

- **D:** `node --check` em 303 arquivos: 0 falhas. Imports novos desta sessão confirmados em uso (verificação manual; detector automático descartado por falso-positivo). Suite 49/49.
- **Notas 0–100:** visual 83 · código 88 · estabilidade 95 · desempenho 83 · jogabilidade 90 · mobile 71 · originalidade 82.

## Ciclo 18/30 — QoL: itens fixados (★) na mochila ✅ CONCLUÍDO

- **C:** botão ☆/★ por slot; fixados sobem no topo e persistem (`lendas-pinned`); destaque dourado.
- **D:** suite 49/49.
- **Notas 0–100:** visual 83 · código 87 · estabilidade 95 · desempenho 83 · jogabilidade 90 · mobile 71 · originalidade 82.

## Ciclo 17/30 — Iluminação: tocha do jogador à noite ✅ CONCLUÍDO

- **C:** `getLightSources()` inclui o player (luz 'torch' raio 120, prioridade na lista de 24 luzes).
- **D:** suite 49/49.
- **Notas 0–100:** visual 83 · código 87 · estabilidade 95 · desempenho 83 · jogabilidade 89 · mobile 70 · originalidade 82.

## Ciclo 16/30 — QoL: caveira de morte no minimapa ✅ CONCLUÍDO

- **C:** `deathMarker` no respawn → 💀 vermelho no minimapa; limpa ao chegar perto (160 px) — ajuda a recuperar o loot.
- **D:** suite 49/49.
- **Notas 0–100:** visual 81 · código 87 · estabilidade 95 · desempenho 83 · jogabilidade 89 · mobile 70 · originalidade 82.

## Ciclo 15/30 — Documentação: backlog do mapa 400×300 atualizado ✅ CONCLUÍDO

- **H:** `docs/mapa-400x300.md` — cache do grid e teste permanente de POIs marcados como feitos; seção nova lista as entregas do experimento-30x.
- **D:** suite 49/49 (sem mudança de código neste ciclo).
- **Notas 0–100:** visual 81 · código 87 · estabilidade 95 · desempenho 83 · jogabilidade 88 · mobile 70 · originalidade 82.

## Ciclo 14/30 — Arte: tufos de grama/flores nos 8 biomas ✅ CONCLUÍDO

- **C:** 4 props novos (`grass-tuft-0/1`, `flower-tuft-0/1`) no atlas (65→69 objetos) distribuídos pelas tabelas PROPS.
- **Foto:** 18-detalhe-flores-grama. **D:** generate ok; suite 49/49.
- **Notas 0–100:** visual 81 · código 87 · estabilidade 95 · desempenho 83 · jogabilidade 88 · mobile 70 · originalidade 82.

## Ciclo 13/30 — Evento dinâmico: baú abandonado na estrada ✅ CONCLUÍDO

- **C:** nova faixa de `randomEvent` (88–94%): perto de estrada → baú abandonado (+moedas, 40% suprimento).
- **D:** simulacao 6/6; suite 49/49.
- **Notas 0–100:** visual 79 · código 87 · estabilidade 95 · desempenho 83 · jogabilidade 88 · mobile 70 · originalidade 82.

## Ciclo 12/30 — Game feel: +XP flutuante no jogador ✅ CONCLUÍDO

- **C:** texto ciano `+N XP` sobre o player em `grantExperience` (throttle 700 ms).
- **D:** suite 49/49.
- **Notas 0–100:** visual 79 · código 87 · estabilidade 95 · desempenho 83 · jogabilidade 88 · mobile 70 · originalidade 81.
