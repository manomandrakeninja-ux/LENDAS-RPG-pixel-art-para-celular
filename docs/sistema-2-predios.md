# Prédios do acampamento (LENDAS, Sistema 1)

Esta página substitui a versão de 4 prédios com 3 níveis. A fonte de verdade é `src/data/buildings.json`: cada prédio tem nome, ícone, posição, nível inicial, **custo de cada nível**, **texto de cada nível** e uma tabela `stats` com 10 valores (um por nível).

## Prédios

| Prédio | Começa em | O que melhora |
|---|---|---|
| Fogueira | nível 1 | raio de proteção, cura, cozinha, viajantes, buffs, ressurreição e resistência ao fogo |
| Fazenda | nível 1 | canteiros, animais, celeiro, irrigação, produção e auto-colheita |
| Ferreiro | nível 1 | receitas, reparo, desmontagem, encantamentos, arco e melhorias +1 a +5 |
| Casa | nível 1 | armazém por slots, descanso, sono, buffs, baú secreto, cozinheira e ressurreição |
| Mercado | nível 1 | itens por dia, venda, descontos, mercador viajante, reputação, encomendas e leilão |
| Muralha | não construída | HP, material, portões, espinhos, fosso, campo elétrico e reparo automático |
| Torre de Vigia | não construída | arqueiros, alcance, flechas especiais, radar, segunda torre e canhão |

O texto completo de cada nível aparece no jogo, na aba **Níveis** do painel de cada prédio.

## Regras gerais

- **Pagamento**: mochila primeiro, depois armazém da Casa e, quando o custo pede, moedas.
- **Durabilidade**: só cai em ataques ao acampamento (2% por golpe, no máximo 2 golpes por segundo em cada prédio). Na muralha, cada golpe vale 15% do dano normal do monstro, e contra estruturas os monstros atacam na metade da velocidade (valores em `src/data/raids.js`). Danificado = produção pela metade; destruído = sem função. Reparo: 5 madeiras. É preciso reparar antes de melhorar.
- **Armazém da Casa**: slots de 25 unidades por tipo (20 slots no nível 1, ilimitado no 10). O baú secreto (nível 4) tem 5 slots separados.
- **Conclusão**: com os 7 prédios no nível 10 aparece a mensagem *"O acampamento está completo! O Dragão foi localizado. Prepare-se."* e a Masmorra do Dragão é marcada no mundo e no mapa.

## Evolução visual

Cada prédio tem 3 aparências. Níveis 1–3 usam o estágio 1 (simples), 4–7 o estágio 4 (melhorado) e 8–10 o estágio 8 (avançado). A troca acontece na hora da melhoria, com um brilho rápido, e ao carregar o save.

| Prédio | Estágio 1 | Estágio 4 | Estágio 8 |
|---|---|---|---|
| Fogueira | fogueira de pedras | anel largo com bancos de tora | braseiro de pedra com tochas |
| Casa | cabana de toras com palha | casa de madeira com janelas e chaminé | sobrado de pedra e madeira com varanda |
| Ferreiro | abrigo aberto com forja pequena | oficina de pedra com chaminé | grande forja com duas chaminés e armas |
| Fazenda | horta cercada com espantalho | celeiro e silo | celeiro, silo, moinho e irrigação |
| Mercado | banca simples | loja com toldo | mercado com três bancas e bandeiras |
| Muralha | estacas e portão de toras | guaritas de madeira e 5 torres de vigia | portão de pedra com estandartes e baluartes |
| Torre de Vigia | plataforma de madeira | torre de pedra | torre com telhado cônico e bandeira |

A configuração fica em `src/data/buildingVisuals.js`. As artes dos 5 primeiros prédios ficam no atlas `public/assets/buildings/camp-atlas` (`npm run assets:generate`); a Muralha e a Torre são desenhadas em `src/game/CampDefense.js`. Testes: `tests/buildingVisuals.test.js` e `npm run test:runtime:evolution`.

## Saves antigos

Os níveis antigos (1–3) da Fazenda, Ferraria, Casa e Mercado são mantidos; Fogueira começa no 1, Muralha e Torre no 0. Itens da Ferraria antiga viram as receitas novas (Espada de Ferro → Espada Simples, Peitoral de Aço → Armadura de Aço; encantamentos simples → melhoria +1).

## Testes

- `tests/buildingSystems.test.js`: regras dos 7 prédios, Fazenda, Ferreiro, Mercado, buffs e viajantes;
- `scripts/buildings-runtime-check.mjs`: construir, torre atirando, nível 10 e masmorra;
- `scripts/system2-runtime-check.mjs`: cada menu operado pelos botões, no celular.
