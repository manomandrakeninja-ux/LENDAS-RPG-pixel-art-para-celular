# Progresso real da campanha — LENDAS RPG

Relatório de QA/jogatina real. Missões só entram como concluídas quando a interface e o save confirmarem a entrega.

## Ambiente e checkpoint

- Data: 2026-11-01
- Phaser 3.90 + Vite 6
- Servidor: `http://127.0.0.1:4173/?splash=0`
- Navegador real controlado por Playwright
- Save pessoal preservado
- Último checkpoint: `m001` concluída; `m002` oferecida para aceite
- Próxima ação: aceitar m002 e ir à Clareira de Cogumelos

## Registro por missão

| Nº | ID | Nome/objetivo | Ações reais e resultado observado | Erros | Status |
|---:|---|---|---|---|---|
| 1 | m001 | Uma Fogueira na Escuridão — cortar madeira em árvores e tocos (5) | W/A/S/D usados para chegar ao agrupamento de árvores; E coletou 3 e depois 3 madeiras; HUD mostrou 5/5, “MISSÃO CONCLUÍDA • 1/100”, +38 XP, +16 moedas e 2 comida; m002 foi oferecida | Prioridade da ação E corrigida durante o teste | CONCLUÍDA |

As missões 2–160 existem no conteúdo, mas ainda não foram testadas nesta partida e permanecem **NÃO TESTADAS**. Nomes e objetivos serão registrados junto com a observação real do HUD ao desbloqueá-las.

## Evidências

- HUD confirmou 3/5 e depois 5/5.
- Tela de recompensa confirmou “MISSÃO CONCLUÍDA • 1/100”.
- A tela abriu “Nova missão: O Preço da Fome”.
- [LISTA-MISSOES.md](../LISTA-MISSOES.md) é referência de conteúdo, não prova de conclusão.

## Histórico de correções

- W/A/S/D e setas: [GameScene.js](../src/game/GameScene.js), commit `9864551`.
- Loop principal: commit `3d7b05f`.
- Nesta sessão: a coleta próxima passou a ter prioridade sobre o texto de um ponto de missão sobreposto; m001 foi retestada e concluída.
