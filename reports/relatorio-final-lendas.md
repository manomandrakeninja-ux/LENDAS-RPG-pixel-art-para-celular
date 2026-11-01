# Relatório final — LENDAS RPG

Este relatório é incremental; a campanha completa ainda não foi concluída como jogador real.

- Missões existentes: 160.
- Missões realmente concluídas nesta partida: 1 (m001).
- Missão atual: m002 oferecida, aguardando aceite.
- Bloqueadas: nenhuma confirmada.
- Não testadas: m002–m160.
- Evidência: HUD mostrou “MISSÃO CONCLUÍDA • 1/100”, recompensa e nova missão “O Preço da Fome”.

## Verificações

- Framework: Phaser 3.90 + Vite 6.
- Execução: `npm run dev` em servidor local.
- Navegador real controlado por Playwright.
- W/A/S/D, setas e atalhos principais exercitados.
- Teste automatizado dos dados percorre 160 missões, mas não substitui esta jogatina.

## Bugs encontrados e correções

- Corrigido: captura de W/A/S/D e setas fora do canvas em [GameScene.js](../src/game/GameScene.js).
- Corrigido anteriormente: variável `time` ausente no loop principal.
- Corrigido e retestado: E era capturado pelo ponto de missão antes de coletar árvores sobrepostas; m001 avançou de 0/5 para 5/5 após a correção.

## Próximo checkpoint

Aceitar m002, colher três cogumelos com E, confirmar a recompensa e registrar a missão seguinte. Nenhuma missão será marcada por simulação ou apenas por teste unitário.
