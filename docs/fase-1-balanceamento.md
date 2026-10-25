# Balanceamento — Fase 1

Os valores abaixo são um resumo dos arquivos de dados. Para balancear, edite `src/data/dayNight.js`, `src/data/enemies.js`, `src/data/spawning.js`, `src/data/biomes.js`, `src/data/resources.js`, `src/data/nightResources.js` e `src/data/combat.js`.

## Tempo

| Parâmetro | Valor |
|---|---:|
| Dia completo | 240 s reais |
| Noite completa | 120 s reais |
| Transição de entardecer/amanhecer | 30 s |
| Aviso antes da noite | 30 s |
| Hora inicial | 08:00 |
| Safe zone | 300 px |
| Raio de interação da fogueira | 165 px |

## Inimigos

| Espécie | Período | HP | Dano | Velocidade | Percepção | Comportamento | Fuga | Pack |
|---|---|---:|---:|---:|---:|---|---:|---:|
| Gosma | Dia | 30 | 7 | 62 | 250 | Perseguição | 20% | Não |
| Lobo | Dia | 48 | 12 | 88 | 340 | Patrulha/perseguição | 18% | 2 atacantes |
| Javali | Dia | 68 | 14 | 76 | 290 | Patrulha/perseguição | 12% | Não |
| Esqueleto | Noite | 58 | 15 | 70 | 350 | Perseguição em grupo | — | 2 atacantes |
| Fantasma | Noite | 44 | 12 | 94 | 430 | Perseguição; ignora obstáculos | — | Não |
| Aranha gigante | Noite | 76 | 17 | 108 | 370 | Emboscada/grupo | — | 3 atacantes |
| Lobisomem | Noite | 128 | 24 | 118 | 480 | Perseguição em grupo | 8% | 2 atacantes |

### Elites

| Parâmetro | Valor |
|---|---:|
| Chance diurna | 2,5% |
| Chance noturna | 14% |
| Multiplicador de HP | ×1,75 |
| Multiplicador de dano | ×1,35 |
| Multiplicador de velocidade | ×1,08 |
| Multiplicador de drop | ×2 |

Slime e lobo elites mantêm o sprite e o tamanho originais, recebem tint dourado e borda pixelada de 1 px. As outras espécies usam frames elite 40×40 com borda dourada.

## Drops

| Espécie | Tabela |
|---|---|
| Gosma | Ervas 55% (1–2); comida 15% (1) |
| Lobo | Comida 65% (1–2); ervas 30% (1) |
| Javali | Comida 85% (2–4); ervas 25% (1–2); pedra 18% (1) |
| Esqueleto | Ossos 78% (1–2); pedra 38% (1–2) |
| Fantasma | Ectoplasma 68% (1–2); erva lunar 30% (1–2) |
| Aranha gigante | Seda 72% (1–2); comida 28% (1–2) |
| Lobisomem | Comida 82% (2–4); ossos 34% (1); erva lunar 24% (1–2) |

À noite, a quantidade de drop recebe multiplicador **×1,35**. Elites usam **×2**. Quantidades remanescentes que não cabem na mochila ficam em uma mochila de morte no chão.

## Spawn

| Parâmetro | Dia | Noite |
|---|---:|---:|
| Limite ativo | 18 | 32 |
| Intervalo de spawn | 2200 ms | 850 ms |
| Quantidade inicial | 8 | 14 |
| Despawn por distância | 1500 px | 1900 px |
| Multiplicador de HP noturno | — | ×1,10 |
| Multiplicador de dano noturno | — | ×1,18 |
| Multiplicador de velocidade noturno | — | ×0,95 |

Os anéis de distância do acampamento são 340–680 px, 680–1080 px e 1080–1320 px. Os quatro pools provisórios (`field`, `forest`, `quarry`, `swamp`) ficam em `src/data/biomes.js`; a arte e os tiles desses biomas serão implementados na Fase 2.

## Recursos e combate

| Recurso | Quantidade por nó | Disponibilidade |
|---|---:|---|
| Madeira | 2–4 | Dia e noite |
| Pedra | 2–4 | Dia e noite |
| Ervas | 2–3 | Dia e noite |
| Erva lunar | 1–2 | Somente à noite |
| Ectoplasma | 1 | Somente à noite |

| Parâmetro | Valor |
|---|---:|
| Alcance básico | 75 px |
| Cadência básico | 420 ms |
| Alcance especial | 125 px |
| Multiplicador especial | ×2 |
| Custo de stamina do especial | 35 |
| Custo de stamina da esquiva | 22 |
| Invencibilidade da esquiva | 380 ms |
| Perda de recursos carregados ao morrer | 40% |

> Todos os inimigos usam silhuetas simples pixeladas geradas em canvas por código. As variantes elite mantêm a mesma silhueta e recebem borda dourada de 1 px. Consulte `assets-pendentes.md` para a arte final da Fase 7.
