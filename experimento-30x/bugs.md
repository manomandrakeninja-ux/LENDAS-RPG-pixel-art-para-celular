# Bugs encontrados — 30x

## Ciclo 01
- **BUG CORRIGIDO:** placa de estrada mostrava a bússola invertida (`Math.round(angle/(π/4)) + 4 & 7` trocava L↔O, N↔S...). Corrigido com `compass8()` pura + teste unitário (tests/world.test.js).
- **Conflito de tecla (já corrigido antes do ciclo 01):** R tinha dois handlers (loot rápido + dormir); dormir virou N.
- Limitação: sem ambiente visual (Chrome headless não roda no sandbox) — bugs visuais não são pegos pelos testes de unidade.

