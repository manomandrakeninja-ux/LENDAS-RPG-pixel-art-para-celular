# Moedas e economia (LENDAS, Sistema 5)

Todos os números ficam em `src/data/economy.json`.

## De onde vêm as moedas

| Fonte | Moedas |
|---|---:|
| Inimigo comum (diurno) | 1–3 |
| Inimigo noturno | 3–8 |
| Inimigo elite | 10–20 |
| Baú no mapa | 10–30 (fixo por baú) |
| Chefe do bioma | 50 |
| Vitória num ataque ao acampamento | 60 por dezena de dias |
| Missões dos viajantes da Fogueira | 20–45 |

As moedas caem no chão e são atraídas pelo jogador. A carteira é separada da mochila e aparece no HUD com ícone dourado.

## Onde gastar

- **Mercado**: compras com moedas. Nível 1 vende sementes (5), poção de vida (10), tocha (3) e madeira (2); cada nível acrescenta itens e descontos (até 50% no nível 10).
- **Melhorias dos prédios** a partir do nível 5 também pedem moedas.
- **Encomendas**, **leilão** e **mercador viajante** (Mercado 4, 8 e 9).
- Melhorias +1 a +5 no Ferreiro.

## Venda

A partir do Mercado nível 2, qualquer recurso pode ser vendido pelo preço de `sellPrices` (madeira 1, ferro 4, ouro 6, Núcleo do Titã 25...). Nenhum desconto deixa o preço de compra abaixo do valor de revenda, então comprar e revender nunca dá lucro.

## Arquivos principais

- `src/data/economy.json` e `src/data/economy.js`: faixas de drop, moedas de baú, catálogo e preços;
- `src/game/EconomySystem.js`: carteira;
- `src/game/CoinPickups.js`: moedas no chão;
- `src/game/MarketSystem.js`: compra, venda, descontos, encomendas e leilão;
- `tests/economy.test.js`, `tests/buildingSystems.test.js` e `scripts/economy-runtime-check.mjs`.
