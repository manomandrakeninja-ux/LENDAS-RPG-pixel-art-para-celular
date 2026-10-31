# Métricas por ciclo — 30x

Linha base (antes do ciclo 01):
- Testes: 48/48 arquivos passando (run-all-tests.ps1); world.test.js 13 testes.
- Assets: atlas terreno 3923 tiles; biome props 65 objetos.
- Fotos: 15 em SUPER ATUALIZAÇÃO/.
- Notas 0–100 (autoavaliação inicial, ver RELATORIO_EVOLUCAO_30X.md ciclo 01).

| Ciclo | Testes | Notas (visual/código/estabilidade/desempenho/jogabilidade/mobile/originalidade) |
|-------|--------|-----------------------------------------------------------------------------------|
| base | 48/48 arquivos; world 13 | — |
| 01 | 48/48 arquivos; world 14/14 | 78 / 85 / 90 / 80 / 82 / 70 / 80 |
| 02 | 48/48 arquivos; save 9/9 | 78 / 86 / 92 / 80 / 82 / 70 / 80 |
| 03 | 48/48 arquivos | 78 / 86 / 92 / 80 / 83 / 70 / 80 |
| 04 | 48/48 arquivos | 79 / 86 / 92 / 80 / 83 / 70 / 80 |
| 05 | 49/49 arquivos (novo simulacao.test.js 4/4) | 79 / 87 / 94 / 80 / 83 / 70 / 80 |
| 06 | 49/49 arquivos (simulacao 5/5); buildTerrainGrid 182ms→0ms cacheado | 79 / 87 / 94 / 83 / 83 / 70 / 80 |
| 07 | 49/49 arquivos; 17 fotos | 79 / 87 / 94 / 83 / 85 / 70 / 80 |
| 08 | 49/49 arquivos | 79 / 87 / 94 / 83 / 86 / 70 / 80 |
| 09 | 49/49 arquivos | 79 / 87 / 94 / 83 / 87 / 70 / 80 |
| 10 | 49/49 arquivos (simulacao 6/6) | 79 / 87 / 95 / 83 / 87 / 70 / 80 |
| 11 | 49/49 arquivos | 79 / 87 / 95 / 83 / 88 / 70 / 81 |
| 12 | 49/49 arquivos | 79 / 87 / 95 / 83 / 88 / 70 / 81 |
| 13 | 49/49 arquivos (simulacao 6/6) | 79 / 87 / 95 / 83 / 88 / 70 / 82 |
| 14 | 49/49 arquivos; atlas 69 objetos; 18 fotos | 81 / 87 / 95 / 83 / 88 / 70 / 82 |
| 15 | 49/49 arquivos (docs) | 81 / 87 / 95 / 83 / 88 / 70 / 82 |
| 16 | 49/49 arquivos | 81 / 87 / 95 / 83 / 89 / 70 / 82 |
| 17 | 49/49 arquivos | 83 / 87 / 95 / 83 / 89 / 70 / 82 |
| 18 | 49/49 arquivos | 83 / 87 / 95 / 83 / 90 / 71 / 82 |
| 19 | 49/49 arquivos; 303 arquivos com sintaxe OK | 83 / 88 / 95 / 83 / 90 / 71 / 82 |
| 20 | 49/49 arquivos | 83 / 88 / 95 / 83 / 90 / 72 / 83 |
| 21 | 49/49 arquivos | 83 / 88 / 95 / 83 / 90 / 72 / 83 |
| 22 | 49/49 arquivos | 84 / 88 / 95 / 83 / 90 / 72 / 83 |
| 23 | 49/49 arquivos | 84 / 88 / 95 / 83 / 91 / 72 / 83 |
| 24 | 49/49 arquivos | 85 / 88 / 95 / 83 / 91 / 73 / 83 |
| 25 | 49/49 arquivos (simulacao 7/7) | 85 / 89 / 96 / 83 / 91 / 73 / 83 |
| 26 | 49/49 arquivos | 85 / 89 / 97 / 83 / 91 / 74 / 83 |
| 27 | 49/49 arquivos; 19 fotos; atlas 69 objetos | 85 / 89 / 97 / 84 / 91 / 74 / 83 |
| 28 | 49/49 arquivos | 85 / 89 / 97 / 84 / 92 / 74 / 84 |
| 29 | 49/49 arquivos | 85 / 89 / 97 / 84 / 93 / 74 / 84 |
| 30 | 49/49 arquivos; 303 sintaxe OK; simulacao 7/7; 20 fotos | **86 / 89 / 97 / 84 / 93 / 74 / 84** |
| 31 | 49/49 arquivos | 86 / 89 / 97 / 84 / 93 / 74 / 84 |
| 32 | 49/49 arquivos | 86 / 89 / 97 / 84 / 93 / 74 / 85 |
| 33 | 49/49 arquivos | 86 / 89 / 97 / 84 / 94 / 74 / 85 |
| 34 | 49/49 arquivos (simulacao 8/8) | 86 / 90 / 97 / 84 / 94 / 74 / 85 |
| 35 | 49/49 arquivos; atlas 69 obj; simulacao 8/8 | 87 / 90 / 97 / 84 / 95 / 74 / 86 |
| 36 | 49/49 arquivos; 21 fotos | 87 / 90 / 97 / 84 / 95 / 74 / 86 |
| 37 | 49/49 arquivos (save 10/10) | 87 / 90 / 98 / 84 / 95 / 74 / 86 |
| 38 | 49/49 arquivos; atlas 71 obj; 22 fotos | 88 / 90 / 98 / 84 / 95 / 74 / 86 |
| 39 | 49/49 arquivos; atlas 73 obj | 88 / 90 / 98 / 84 / 95 / 74 / 86 |
| 40 | 49/49 arquivos; atlas 75 obj; 23 fotos | 89 / 90 / 98 / 84 / 95 / 74 / 86 |
| 41 | 49/49 arquivos; atlas 77 obj | 89 / 90 / 98 / 84 / 95 / 74 / 86 |
| 42 | 49/49 arquivos | 89 / 90 / 98 / 84 / 96 / 74 / 86 |
| 43 | 49/49 arquivos (simulacao 9/9) | 89 / 91 / 98 / 84 / 96 / 74 / 86 |
| 44 | 49/49 arquivos (simulacao 10/10) | 89 / 91 / 98 / 84 / 96 / 74 / 86 |
| 45 | 49/49 arquivos; atlas 79 obj; 24 fotos | 90 / 91 / 98 / 84 / 96 / 74 / 86 |
| 46 | 49/49; atlas 81 | 90 / 91 / 98 / 84 / 96 / 74 / 86 |
| 47 | 49/49; atlas 83; 25 fotos | 90 / 91 / 98 / 84 / 96 / 74 / 86 |
| 48 | 49/49; atlas 87 | 90 / 91 / 98 / 84 / 96 / 74 / 86 |
| 49 | 49/49 arquivos | 90 / 91 / 98 / 84 / 96 / 74 / 86 |
| 50–56 | 49/49; simulacao até 13/13; atlas 87; 25 fotos | 90 / 92 / 98 / 85 / 96 / 74 / 86 |
| 57–61 | 49/49; simulacao 15/15; atlas 90; 26 fotos | 90 / 92 / 98 / 85 / 96 / 74 / 86 |
| 62–64 | 49/49; simulacao 18/18 | 90 / 92 / 98 / 85 / 96 / 74 / 86 |
| 65 | 49/49 arquivos | 90 / 92 / 98 / 86 / 96 / 74 / 86 |
| 66–69 | 49/49; simulacao 19/19; 27 fotos | 90 / 92 / 98 / 86 / 97 / 74 / 86 |
| 70 | 303 sintaxe OK; 49/49; simulacao 19/19; atlas 90; 28 fotos | 90 / 92 / 98 / 86 / 97 / 74 / 86 |
| 71–97 | 49/49; simulacao 25/25; atlas 119 | 91 / 93 / 98 / 86 / 97 / 74 / 87 |
| 98–100 | 303 OK; 49/49; simulacao 27/27; atlas 129; 29 fotos | 92 / 93 / 98 / 86 / 97 / 74 / 87 |

## Início (base) vs fim
| Eixo | Base | Final |
|---|---|---|
| Visual | 78 | 86 |
| Código | 85 | 89 |
| Estabilidade | 90 | 97 |
| Desempenho | 80 | 84 |
| Jogabilidade | 82 | 93 |
| Mobile | 70 | 74 |
| Originalidade | 80 | 84 |
