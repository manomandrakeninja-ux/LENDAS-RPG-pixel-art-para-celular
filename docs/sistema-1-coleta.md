# Sistema 1 — estruturas de coleta

## Estruturas

| Tipo | Quantidade | Recompensa | Regeneração |
|---|---:|---|---|
| Árvore | 32 | 2–4 madeira | 2 dias |
| Rocha | 22 | 2–3 pedra | 3 dias |
| Arbusto de ervas | 26 | 1–2 ervas | 1 dia |
| Cogumelo | 16 | 1–3 comida | Somente à noite; volta na noite seguinte |
| Baú | 8 | Loot próprio por baú | Nunca |

## Interação

- Aproxime-se de uma estrutura e pressione **E**.
- O botão contextual do HUD também executa a coleta.
- A estrutura pisca, reduz seu tamanho e desaparece.
- A recompensa entra diretamente no inventário.
- Se a mochila não puder aceitar todo o loot, a coleta é cancelada e a estrutura não desaparece.

## ciclo de dias

- O contador de dias do ciclo dia/noite é a referência de regeneração.
- Uma árvore coletada no dia 1 volta no dia 3.
- Uma rocha coletada no dia 1 volta no dia 4.
- Um arbusto coletado no dia 1 volta no dia 2.
- Cogumelos ficam ocultos durante o dia e reaparecem na noite seguinte.
- Baús mantêm o estado coletado permanentemente.

## Persistência

O save v2 inclui a coleção opcional `harvestStructures`. Para cada estrutura são preservados:

- identificador e tipo;
- posição;
- disponibilidade;
- dia da coleta;
- dia previsto de regeneração;
- estado de um baú já aberto;
- loot do baú.

Saves antigos sem essa coleção recebem `harvestStructures: []` e usam a distribuição inicial determinística.

## Arquivos principais

- `src/data/harvestStructures.js`: configuração, loot e estado persistente.
- `src/game/HarvestStructures.js`: sprites em canvas, animação, hints e ciclo visual.
- `src/game/GameScene.js`: coleta, inventário, interação e save.
- `src/game/Inventory.js`: verificação atômica de espaço para loot de baús.
- `tests/harvestStructures.test.js`: regras de recompensa, regeneração e persistência.
- `scripts/harvest-runtime-check.mjs`: validação da tecla E e dos fluxos no navegador.
