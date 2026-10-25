# Sistema 3 — mochila pequena de verdade

## Limite e apresentação

- A mochila possui **12 slots visíveis**, organizados em uma grade de 4 × 3 no HUD.
- Cada slot ocupado mostra o ícone do recurso e sua quantidade.
- Cada tipo de recurso ocupa um slot. Depois que os 12 slots estiverem ocupados, nenhum item adicional entra na mochila, nem mesmo outro item do tipo que já está presente.
- A capacidade total é de **144 unidades** (`12 slots × 12 unidades por slot`).
- Saves antigos com 6 ou 8 slots são migrados para 12 slots sem remover os recursos já carregados.

## Mochila cheia

Quando a mochila se enche, o jogo apresenta exatamente:

> **Mochila cheia! Volte ao acampamento**

A mesma mensagem é usada quando uma coleta, compra, colheita ou retirada tenta ocupar um slot inexistente. O recurso que não coube permanece no mundo ou no baú; ele não é perdido.

## Guardar tudo rapidamente

Ao entrar no acampamento, o botão **GUARDAR TUDO** aparece no canto inferior esquerdo:

- Move todos os recursos da mochila para o armazém da Casa/Armazém em uma única ação.
- O botão fica desabilitado e mostra **MOCHILA VAZIA** quando não há recursos.
- Ao sair e voltar ao acampamento, o botão reaparece.
- O painel da Casa/Armazém também possui a ação **GUARDAR TUDO DA MOCHILA**.
- A transferência respeita a capacidade do armazém e nunca duplica recursos.

Para que a ação rápida funcione sem interrupção, o armazém começa com 320 unidades. Os upgrades da casa ampliam a capacidade para 480 e 640 unidades.

## Persistência

O save continua na versão canônica **2**. O campo opcional `inventory.capacityVersion: 3` distingue a mochila do Sistema 3 das capacities antigas.

O save da mochila preserva:

- `capacityVersion`;
- `maxSlots`;
- `unitsPerSlot`;
- as quantidades de todos os recursos.

## Arquivos principais

- `src/game/config.js`: capacidade, mensagem e versão da mochila;
- `src/game/Inventory.js`: limite de slots, capacidade e operações atômicas;
- `src/game/UI.js`: grade visual de 12 slots e aviso de mochila cheia;
- `src/game/Camp.js`: transferência rápida para o armazém;
- `src/game/GameScene.js`: detecção de entrada no acampamento e ação rápida;
- `src/style.css`: botão mobile **GUARDAR TUDO**;
- `tests/inventory.test.js`: limites, migração e recusa do 13º tipo;
- `scripts/system3-runtime-check.mjs`: teste completo em navegador mobile.
