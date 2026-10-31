# Próximas ações — 30x (EXPERIMENTO CONCLUÍDO em 30/30 ciclos)

## Para continuar depois (fora deste experimento)
1. Rodar `npm run build` fora do sandbox (spawn EPERM aqui) e publicar se quiser.
2. Testar em celular real: tilemap do chão por chunk (só se pesar) — ver docs/mapa-400x300.md.
3. Save da névoa já é compacto (pares [col,row]); só trocar por bitset se o save pesar.
4. Mais conteúdo: novos chefes/eventos de invasão extras ainda são bem-vindos.

## Fila inicial (Fase 1 — Fundação) — todos feitos
1. Ciclo 01: análise de arquitetura + correção de bug real + 1 melhoria visual leve + docs.
2. Auditar warnings de `node --check` e imports não usados nos arquivos tocados.
3. Procurar TODO/FIXME pendentes no código.
4. Verificar performance do buildTerrainGrid (custo ~90 ms por teste; caching por chunk é backlog conhecido de docs/mapa-400x300.md).
5. Rodar `npm run build` está bloqueado no sandbox (spawn EPERM) — deixar anotado para o usuário rodar fora.
