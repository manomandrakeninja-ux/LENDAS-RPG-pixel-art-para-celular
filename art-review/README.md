# LENDAS VISUAL STUDIO

As três propostas v1 foram aprovadas pelo usuário e a integração foi autorizada separadamente. Consulte [integração e rollback](./reports/integracao-aprovada.md). Novas decisões no painel continuam sem aplicar arquivos automaticamente.

Aplicativo local independente, sem dependências externas. Requer Node.js 22 ou superior.

Na raiz do projeto, execute manualmente:

```sh
node art-review/server.mjs
```

Abra http://127.0.0.1:4180. O bind é exclusivamente 127.0.0.1; use esse endereço, não localhost. A aprovação registra uma decisão e **não integra nem altera o jogo**.

## Primeiro lote e manifest

O lote inicial já contém torre, ferreiro e vegetação, todos pendentes. Os relatórios estão em [reports](./reports/auditoria-grafica.md). As imagens de cenário são montagens de revisão, não screenshots do jogo modificado. Nenhuma aprovação autoriza integração automaticamente.

O preparador `prepare-proposals.mjs` recusa sobrescrever derivados existentes. Para uma revisão, criar novo diretório e nova versão no manifest. `export-originals.mjs` e `inventory.mjs` leem fontes existentes sem alterar o jogo; não execute os geradores originais do projeto para usar este painel.

O teste completo isolado é `node --test art-review/server.test.mjs art-review/assets.test.mjs`. Com o servidor ligado, `node art-review/browser-check.mjs` usa Chrome local e perfil descartável; nunca testa decisões nas propostas reais.

Crie `proposals.json` nesta pasta (não é gerado pelo aplicativo). É um array; cada entrada representa uma versão. Todos os campos abaixo são strings obrigatórias, exceto `preview`, opcional. A combinação `id` + `version` deve ser única; versões do mesmo id aparecem no seletor. Use até 200 caracteres em id/version. `report` é texto simples, assim como `description`; nenhum HTML é interpretado. `date` deve usar ISO 8601, por exemplo YYYY-MM-DD. `level` é um rótulo textual.

```json
[
  {
    "id": "guerreiro",
    "version": "v1",
    "name": "Guerreiro",
    "category": "Personagens",
    "level": "Nível 1",
    "date": "2026-11-01",
    "original": "/public/personagens/guerreiro.png",
    "proposed": "/art-review/images/guerreiro-v1.png",
    "description": "Nova proposta de paleta e silhueta.",
    "report": "Contorno revisado; animações ainda pendentes.",
    "preview": "/art-review/images/guerreiro-preview.png"
  }
]
```

URLs de imagens/preview devem ser locais, começando por `/art-review/` ou `/public/`. Coloque suas imagens na pasta correspondente. Preview pode apontar para imagem ou página HTML local (scripts inline são bloqueados). Manifest ausente mostra galeria vazia; inválido mostra erro. Recarregue a página após editar o manifest.

## Decisões

[approvals.json](./approvals.json) começa com `{"schemaVersion":1,"history":[]}`. Cada ação acrescenta `{id,version,status,note,date}` ao histórico. Status: `pending`, `approved`, `rejected`, `revision`; a última entrada por id+version define a decisão atual, inicialmente pending. Adicionar observação mantém o status atual. `date` é o instante UTC gerado pelo servidor. As gravações são serializadas e substituem o arquivo via rename atômico. Execute apenas uma instância e não edite o histórico durante gravações.

API: GET `/api/proposals`, GET `/api/approvals`, POST `/api/approvals` com JSON `{id,version,status,note}`. POST exige Origin exatamente igual à origem do servidor, Content-Type application/json, até 16 KiB e observação de até 8000 caracteres. Não aceita propostas/versões desconhecidas. O histórico não autentica uma identidade de revisor.

## Comparação e proteção

Lado a lado ou slider alinhado no canto superior esquerdo, zoom 1:1/2×/4×/8× sem suavização, dimensões naturais e fundos quadriculado/claro/escuro/cenário sintético. 1:1 corresponde a pixels CSS; use zoom do navegador em 100%. Imagens maiores permanecem roláveis.

Somente extensões de assets/documentos permitidas são servidas sob as duas pastas; não há listagem nem acesso ao restante do repositório. Caminhos relativos ascendentes, encoding duplo, barras invertidas, arquivos ocultos e symlinks/junctions são bloqueados. As raízes configuradas são confiáveis: não devem ser modificadas por outro processo durante o uso. Public é somente leitura; a única escrita da API é o histórico dentro desta pasta.

## Testes

```sh
node --test art-review/server.test.mjs
```

Os testes criam fixtures temporárias nesta pasta e um listener efêmero em loopback, removidos ao terminar. Não iniciam o servidor de uso na porta 4180.
