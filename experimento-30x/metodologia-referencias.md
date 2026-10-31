# Metodologia — repositórios de referência (clonados em 2026-10-31)

Repositórios clonados (apenas referência, fora do jogo) em
`C:\Users\Lucas Eduardo\Downloads\referencias-github\`. Nenhuma dependência foi
adicionada ao jogo; nada foi instalado globalmente. O que está sendo **aplicado**
no desenvolvimento do LENDAS:

| Repositório | O que é | Como está sendo usado no experimento |
|---|---|---|
| `github/spec-kit` | Spec-Driven Development (templates spec/plan/tasks/constitution) | A partir do lote 681–690, **cada lote ganha uma mini-spec** em `experimento-30x/specs/lote-XXX-YYY.md` no formato do spec-kit (User Stories com Given/When/Then, critérios de aceite, verificação), escrita ANTES da implementação (ciclo B do experimento). |
| `obra/superpowers` | Skills de processo (TDD, verification-before-completion, systematic-debugging...) | Regra de ferro já seguida: **nenhuma alegação de "passou" sem rodar o comando de verificação na hora** (`node --check`, `node tests/simulacao.test.js`, suite 49/49). TDD leve: cada lote adiciona testes puros antes/depois da mudança de dados. |
| `nextlevelbuilder/ui-ux-pro-max-skill` | Regras de UI/UX (acessibilidade, contraste 4.5:1, texto ≥12px, alvos ≥44px no mobile, não depender só de cor) | Aplicado na **Splash** (lote 681–690): `.splash__status` 10px→12px, `.splash__version` 8px→10px com cor mais clara, `.splash__tip` ganhou fundo/contorno próprio (contraste alto sobre a arte). Próximos lotes: revisar HUD/menus com as mesmas regras (contraste, tamanho mínimo, alvos de toque no mobile). |
| `garrytan/gstack` | CLI de orquestração (plan/review/verify/ship) | Conceitos adotados sem instalar: checklist de **verify** antes de cada commit (sintaxe + testes + suite), **review** leve por lote (autocrítica no historico.md) e decisão registrada em `decisoes.md`. |
| `eyaltoledano/claude-task-master` | Gerenciador de tarefas com IA | Equivalente local já existe: `experimento-30x/proximas-acoes.md` funciona como a lista de tasks viva do experimento (1000 ciclos). |
| `oraios/serena` | Análise semântica de código (MCP) | Conceito aplicado manualmente: antes de mexer em qualquer módulo novo nos testes, inspeciono os exports reais com `node -e "import(...)"` (já evitou dezenas de erros de API assumida). |
| `Egonex-AI/Understand-Anything` | Gera árvore de conceitos do código | Ideia aplicada na documentação: `docs/mapa-400x300.md` + `experimento-30x/historico.md` funcionam como o "mapa de conceitos" do jogo, atualizados a cada lote. |
| `usestrix/strix` | Agente de pentest | Fora de escopo do jogo (sem deploy/rede); não aplicável — registrado para transparência. |
| `dietrichgebert/ponytail` | Projeto não relacionado a jogos/metodologia | Consultado; sem aplicação direta neste experimento. |
| `trailofbits` (organização) | Vários projetos de segurança | Não clonado (é organização, não repo). Se quiser, indico um projeto específico (ex. semgrep/echidna) — fora do escopo do jogo. |

## Regras de ouro derivadas (combinação dos repositórios)
1. **Spec antes de código** (spec-kit): lote só começa com spec em `specs/`.
2. **Evidência antes de alegação** (superpowers): rodo `node --check` + `simulacao.test.js` + suite antes de dizer "verde".
3. **UI acessível** (ui-ux-pro-max): contraste ≥4.5:1, texto ≥12px, não usar só cor para informar.
4. **Verify gate por lote** (gstack): commit só depois de sintaxe + testes + atlas regenerado.
