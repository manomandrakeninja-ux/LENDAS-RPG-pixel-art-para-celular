# Expansão — moedas e economia

## Carteira e drops

- Inimigos comuns deixam **1–3 moedas**.
- Inimigos noturnos deixam **5–10 moedas**.
- O chefe do bioma deixa **50 moedas**.
- As moedas são drops físicos: caem no chão, são atraídas pelo jogador e podem ser coletadas pelo mesmo fluxo dos cristais de XP.

A carteira é independente da mochila de 12 slots. Moedas não ocupam slots nem capacidade de recursos.

## HUD e mercado

O HUD mostra um ícone dourado e o saldo atual. O mercado usa exclusivamente moedas:

| Item | Preço |
|---|---:|
| Sementes | 3 moedas |
| Poção de Vida | 8 moedas |
| Tocha | 2 moedas |
| Pacote de Ervas | 4 moedas |
| Pacote de Madeira | 4 moedas |
| Pacote de Pedra | 5 moedas |
| Pacote de Carvão | 6 moedas |
| Pacote de Ferro | 10 moedas |
| Ouro Bruto | 15 moedas |

Cada unidade vendida rende **1 moeda**. Compras e vendas são atômicas: uma compra bloqueada por falta de moedas ou espaço não altera estoque, mochila ou saldo.

## Persistência

O save v2 mantém o campo opcional `economy.coins`. Saves antigos começam com saldo zero e não perdem os demais dados.

## Arquivos principais

- `src/data/economy.js`: faixas de drop;
- `src/game/EconomySystem.js`: carteira e saldo;
- `src/game/CoinPickups.js`: drops físicos;
- `src/game/MarketSystem.js`: compra e venda em moedas;
- `src/game/BuildingMenu.js`: preços e disponibilidade;
- `src/game/UI.js`: contador de moedas;
- `tests/economy.test.js`: drops e carteira;
- `scripts/economy-runtime-check.mjs`: teste mobile do mercado.
