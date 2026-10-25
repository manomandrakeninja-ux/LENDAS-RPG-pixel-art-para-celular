# Sistema 2 — menus dos quatro prédios

## Interação e interface

- Clique ou toque diretamente no prédio para abrir seu painel.
- O painel ocupa toda a viewport, respeita áreas seguras do dispositivo e permite rolagem vertical.
- Abas e botões têm no mínimo 48 px de altura para uso mobile.
- Enquanto um painel está aberto, movimento, ataques e ações do mundo ficam bloqueados.
- `Esc` fecha o painel.

## Fazenda

| Melhoria | Efeito |
|---|---|
| Nível 1 | 4 canteiros e animais disponíveis |
| Nível 2 | 6 canteiros |
| Nível 3 | 8 canteiros e colheita automática para o armazém |

| Plantio | Tempo real | Resultado |
|---|---:|---|
| Trigo | 60 s | 2–3 comidas |
| Abóbora | 90 s | 3–5 comidas |
| Erva | 45 s | 2–3 ervas |

Cada plantio consome uma semente. A colheita manual exige espaço na mochila. A coleta automática só remove um cultivo quando o produto cabe no armazém.

Galinha, ovelha e vaca produzem ovo, lã e leite. Cada produto fica disponível a cada 120 segundos.

## Ferraria

| Item | Nível | Custo | Efeito |
|---|---:|---|---|
| Picareta de Pedra | 1 | 3 pedras, 2 madeiras | Permite minerar |
| Espada de Ferro | 1 | 3 ferros, 1 madeira | ATQ +5 |
| Armadura de Ferro | 1 | 5 ferros, 2 pedras | DEF +3 |
| Machado | 1 | 2 ferros, 2 madeiras | +1 unidade em coletas de plantas e minérios |
| Picareta de Ferro | 1 | 5 ferros | Mineração 40% mais rápida e +1 unidade |
| Espada de Aço | 2 | 6 ferros, 2 carvões, 1 madeira | ATQ +9 |
| Peitoral de Aço | 2 | 8 ferros, 3 pedras | DEF +6 |
| Encantamento de Nitidez | 3 | 1 ouro, 2 ervas lunares, 2 ferros | ATQ +2 |
| Encantamento de Barreira | 3 | 1 ouro, 2 ectoplasmas, 2 ferros | DEF +2 |
| Lâmina do Titã | 1 | 1 Núcleo do Titã, 4 ferros, 1 ouro | ATQ +12; desbloqueada pelo chefe |

Os atributos do jogador são derivados de atributos-base e equipamentos. O save preserva ambos, evitando cumulativos ao recarregar.

## Casa e Armazém

- A mochila é limitada a 12 slots pelo Sistema 3.
- O armazém é independente e começa com capacidade para 320 unidades, suficiente para receber a mochila completa do Sistema 3.
- Os níveis 2 e 3 ampliam a capacidade para 480 e 640 unidades.
- Guardar ou retirar é atômico: uma falha não remove nem duplica itens.
- **Descansar** restaura vida/stamina imediatamente. Após 30 segundos reais, avança 30 minutos no relógio do jogo.
- **Dormir** salta para a manhã do próximo dia, remove inimigos noturnos, atualiza o estoque e grava o save.

## Mercado

Cada dia sorteia seis ofertas determinísticas entre:

- sementes: 3 moedas;
- poção de vida: 8 moedas;
- tocha: 2 moedas;
- pacotes de ferro, carvão, ouro, ervas, pedra e madeira entre 4 e 15 moedas.

A quantidade restante de cada oferta é persistida. A venda troca uma unidade de qualquer recurso por uma moeda. A carteira de moedas é separada da mochila e preservada pelo save v2.

## Veios, mineração e mina

- 18 veios de ferro aparecem entre 600 e 1300 px do acampamento.
- Veios rende 2–4 ferro e retornam quatro dias depois.
- A mina é um ponto de interesse único em `MINE_CONFIG` e possui marcador visual especial.
- A concentração da mina contém 6–10 veios de ferro, 2–3 de carvão e até um de ouro.
- Rochas, veios e os nós de pedra do mundo exigem picareta.
- A picareta de pedra leva 2,2 segundos; a de ferro, 1,4 segundo.
- A picareta de ferro acrescenta uma unidade ao resultado.
- A área da mina possui inimigos mais fortes: javais durante o dia e lobisomens/esqueletos durante a noite.

## Persistência

O save v2 continua sendo canônico e recebe estas coleções opcionais:

- `farm`: canteiros, cultivos e próximo horário de cada produto animal;
- `market`: dia e quantidades restantes das ofertas;
- `camp.crafted`: equipamentos e ferramentas criados;
- `camp.storage`: recursos do armazém;
- `camp.buildingLevelsVersion`: marcador que distingue níveis novos de saves antigos;
- `player.baseAttack` e `player.baseDefense`: atributos sem bônus de equipamento.

Saves anteriores são aceitos sem perder inventário, jogador ou acampamento.

## Arquivos principais

- `src/data/buildingSystems.js`: tabelas do Sistema 2;
- `src/game/FarmSystem.js`: estado da fazenda;
- `src/game/EquipmentSystem.js`: equipamentos e atributos;
- `src/game/MarketSystem.js`: economia do mercado;
- `src/game/BuildingMenu.js`: interface dos quatro painéis;
- `src/game/Camp.js`: prédios, níveis e armazém;
- `src/game/GameScene.js`: integração, mineração, descanso, sono e save;
- `tests/buildingSystems.test.js`: testes de domínio;
- `scripts/system2-runtime-check.mjs`: teste completo em navegador mobile.
