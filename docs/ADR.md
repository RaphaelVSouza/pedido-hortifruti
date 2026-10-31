# ADRs — Hortifruti Digital

Registro de decisões de arquitetura para a próxima fase do projeto. Cada ADR é uma unidade de implementação: **um PR draft por ADR**, na ordem da seção "Sequência". O agente não faz merge.

Revisado em 31/10/2026 com base no inventário técnico da `main` (`d0ec8bb`). Referências `script.js:NNN` apontam para esse commit.

Correções da revisão 2 (mesma data): teste de CSP do ADR-006 (script injetado por `innerHTML` nunca executa, então não prova a CSP); passo mínimo de quantidade coerente entre ADR-005 e ADR-016; tamanho (gramatura) passa a fazer parte do `itemKey` no ADR-008; ADR-015 declara o patch e o caso R1 como entradas que o dono precisa fornecer; ADR-006 lista as frases do `AGENTS.md` que mudam; `alt` dos ícones no ADR-012.

## Restrições globais

- **Sem dependências de runtime e sem build.** O site continua sendo `index.html` + JS/CSS estáticos, carregados como scripts clássicos. Ferramentas de desenvolvimento (TypeScript para checagem, Playwright) ficam só em `devDependencies` e na CI.
- **Sem backend.** Nenhum dado do usuário sai do navegador, exceto o que o próprio usuário enviar pelo WhatsApp.
- **CSP.** A política em `index.html:6` só pode ser ampliada com justificativa no PR. Proibido: `innerHTML` com dado do usuário, `eval`, `new Function`, script ou `style=""` inline.
- **Mobile primeiro.** Todo recurso novo funciona em 360px.
- **Testes.** Todo PR mantém `node tests/parser.test.js` verde. Mudança de comportamento do parser exige caso novo no corpus **antes** da correção. Bug corrigido exige teste que reproduz o bug.
- **Persistência versionada.** Toda chave nova de `localStorage` usa o prefixo `hortifruti_` e sufixo de versão (`_v1`). Mudança de formato incrementa a versão e migra o anterior. Dado ilegível é descartado com `console.error`, sem quebrar a página (reusar `readStoredObject`).
- **Documentação.** Cada PR atualiza `AGENTS.md` e, se mudar comportamento visível, o `README.md`.

## Índice

| ADR | Título | Status | Depende de |
|---|---|---|---|
| 001 | Parser local com regex componíveis e pontuação | Aceito, implementado (PR #8) | — |
| 002 | Não adotar IA remota (Jev/LLM) nesta fase | Aceito | — |
| 003 | Inteiro sem moeda: regra por documento, faixa e revisão | Aceito, implementado (`a4fe095`) | 001 |
| 004 | Extração linear com janela fixa de contexto | Aceito, implementado (`a4fe095`) | 001 |
| 005 | Correção de bugs de estado | Proposto | — |
| 006 | Testes de navegador versionados e CI | Proposto | — |
| 007 | Tipagem com `// @ts-check` + JSDoc | Proposto | 006 |
| 008 | Identidade de item e carrinho v1 | Proposto | 005 |
| 009 | Tela de revisão e templates aprendidos | Proposto | 008, 010 |
| 010 | Perfis de fornecedor | Proposto | 008 |
| 011 | Envio direto pelo WhatsApp (`wa.me`) | Proposto | 010 |
| 012 | Ícones próprios no site, emojis nativos na mensagem | Proposto | — |
| 013 | PWA offline | Proposto | 012 |
| 014 | Preço anterior e histórico de preços | Proposto | 008, 010 |
| 015 | Ajustes do parser a partir do fornecedor real | Proposto | — |
| 016 | Pedido por unidade em itens vendidos por kg | Proposto | 008, 010 |

## Sequência

1. **Estabilidade:** 015 → 005 → 006 → 007
2. **Fundação de dados:** 008 → 010
3. **Produto:** 016 → 009 → 011 → 012 → 013 → 014

---

## ADR-001 — Parser local com regex componíveis e pontuação

**Status:** Aceito, implementado (PR #8)

Pipeline em `parser.js`: normalizar → classificar linha → extrair candidatos numéricos → pontuar por contexto → mesclar linhas → itens + `unparsed`. Regras de unidade e categoria em tabelas. Templates aprendidos têm precedência sobre a heurística. Cada item carrega `confidence` e `source`. Nada a implementar.

---

## ADR-002 — Não adotar IA remota (Jev/LLM) nesta fase

**Status:** Aceito

O Jev (TypeSafe) responde perguntas tipadas sobre um estado (escolha, nota, verdadeiro/falso) e não extrai valores de texto livre, que é o problema do parser. Qualquer API com chave exige servidor intermediário.

Reavaliar só se, depois do ADR-009, mais de 5% das linhas de produto de um corpus real continuarem em `unparsed`. Se reavaliado: fallback opt-in, só para `unparsed`, via backend próprio, LLM com saída estruturada (JSON Schema) e consentimento explícito na UI.

---

## ADR-003 — Inteiro sem moeda

**Status:** Aceito, implementado (`a4fe095`)

Implementado com `MAX_BARE_INT = 200` (`parser.js:97`), campo `bare` (`parser.js:274`) e regra por documento (`parser.js:504-519`). Cobertura: casos L1–L5. Itens com `confidence < 0.5` recebem o selo "⚠ conferir" (`script.js:299`, `:381-386`).

Ajuste pendente, a fazer no ADR-009: os itens do corpus G saem com `confidence` exatamente 0,5 e não recebem o selo. Não alterar o limiar agora; reavaliar com dados reais.

---

## ADR-004 — Extração linear com janela fixa de contexto

**Status:** Aceito, implementado (`a4fe095`)

`BEFORE_WINDOW = 60` (`parser.js:95`). Medido: sem o limite de linha, 240 mil caracteres em ~360 ms (antes: 60 mil em ~10 s). `MAX_LINE = 500` (`parser.js:92`) fica como defesa extra. Cobertura: caso M.

Ajuste pendente: o caso M mede tempo absoluto e varia entre execuções (56–94 ms para 10k). Na CI (ADR-006), trocar a asserção por razão entre tamanhos (dobrar a entrada aumenta o tempo em no máximo 3×) para não gerar falha intermitente.

---

## ADR-005 — Correção de bugs de estado

**Status:** Proposto

### Contexto
O inventário encontrou três bugs reproduzíveis.

### Decisão

**Bug 1 — reimportação sem produtos apaga o carrinho.**
`processContent` atribui `allProducts = parsed.products` (`script.js:491`) antes de checar se há produtos e retorna `false` em `:494-496` sem renderizar. A lista antiga fica na tela apontando para objetos que não existem mais; marcar um item zera o carrinho.
- Correção: validar o resultado **antes** de mutar estado. Se `parsed.products.length === 0`, não alterar `allProducts`, carrinho nem texto salvo; mostrar a mensagem de erro e manter a lista anterior funcional.
- Teste: os passos do inventário (importar, marcar Banana, reimportar `texto sem nenhum produto`, marcar Uva) terminam com o carrinho `{"Banana prata":1, "Uva":1}` (ou equivalente no formato do ADR-008, se já mergeado).

**Bug 2 — nomes duplicados colidem no carrinho.**
Resolvido estruturalmente no ADR-008. Neste ADR, só adicionar o teste que reproduz (`Limão` em FRUTAS e em TEMPEROS), marcado como falha esperada (`skip` com referência ao ADR-008).

**Bug 3 — quantidade 0 com item marcado some do pedido sem aviso.**
- Correção: quantidade ≤ 0 ou inválida em item marcado desmarca o item ao perder o foco (`blur`/`change`), e não durante a digitação, para permitir apagar e digitar outro número. O campo usa `min`/`step` conforme a unidade: kg mantém o passo atual (`min=0.1`, `step=0.1`, `script.js:~408`); demais unidades, inteiros ≥ 1. O ADR-016 muda o passo de kg para 0,25.
- Teste: marcar item, apagar a quantidade e sair do campo → item desmarcado e fora do carrinho.

**"Limpar dados salvos" por prefixo.**
`script.js:589-595` remove 5 chaves fixas e o `AGENTS.md` afirma que remove todas as `hortifruti_*`. Trocar por remoção de toda chave que comece com `hortifruti_` ou `hortifruti.` (a segunda cobre `hortifruti.templates.v1`, usada pelo `createTemplateStore`).

### Critérios de aceite
- Testes de navegador dos bugs 1 e 3 versionados (estrutura do ADR-006; se o 006 ainda não existir, este PR cria o mínimo necessário).
- `localStorage` vazio após "Limpar dados salvos" mesmo com chaves extras inseridas pelo teste.

---

## ADR-006 — Testes de navegador versionados e CI

**Status:** Proposto

### Contexto
Não existe CI de testes, só o GitGuardian. Os testes de XSS e CSP citados no PR #8 rodaram por Playwright mas não foram commitados. O bloqueio de `<script>` inline pela CSP não foi verificado.

### Decisão
- `package.json` só com `devDependencies` (`@playwright/test`, `typescript` para o ADR-007) e scripts `test:parser`, `test:e2e`, `test`.
- `AGENTS.md`: reescrever "Não há npm, bundler nem servidor obrigatório" (o app continua sem npm; npm passa a existir só para testes) e "Não há linter nem CI" (passa a haver CI de testes; continua sem linter). Acrescentar os comandos `npm test`, `npm run test:parser` e `npm run test:e2e`.
- `tests/e2e/` com Playwright (Chromium), servindo a raiz por servidor estático local, viewport 360×740:
  - **XSS:** importar `<img src=x onerror=window.__x=1> Banana R$ 4,99kg` → `window.__x` indefinido e nome renderizado como texto.
  - **CSP:** criar o script com `document.createElement('script')`, `textContent = 'window.__y=1'` e `document.body.appendChild`. **Não** usar `innerHTML`/`insertAdjacentHTML`: `<script>` inserido assim nunca executa, com ou sem CSP, e o teste passaria mesmo sem a política. Esperado: `window.__y` indefinido e um evento `securitypolicyviolation` registrado. Como controle, o mesmo teste numa página sem a meta CSP deve executar o script (`window.__y === 1`), provando que o teste detecta a diferença.
  - **Fluxo principal:** importar o exemplo do README, marcar itens, gerar mensagem e comparar com a saída esperada (incluindo combo). Fixar a hora para a saudação ser determinística.
  - **Persistência:** recarregar e verificar carrinho, endereço e pagamento; JSON inválido em `hortifruti_cart` não quebra a página.
  - Bugs do ADR-005.
- Requests para `cdn.jsdelivr.net` bloqueados nos testes (`page.route`) para não depender de rede.
- `.github/workflows/test.yml`: Node 20, `npm ci`, `npx playwright install --with-deps chromium`, `npm test`, em todo PR e push na `main`.
- Estrutura para corpus real: `tests/corpus/<fornecedor>-<aaaa-mm-dd>.txt` + `.expected.json`, carregados por `tests/parser.test.js`. `tests/anonymize.js` remove telefones, PIX, e-mails, nomes e endereços e falha se ainda encontrar telefone ou e-mail. O agente **não** inventa mensagens "reais"; sem material do dono do repositório, cria só a estrutura e um README do diretório.

### Critérios de aceite
- Workflow verde no PR.
- `npm test` roda parser + e2e localmente.
- O site servido não muda (nenhum arquivo de runtime novo).

---

## ADR-007 — Tipagem com `// @ts-check` + JSDoc

**Status:** Proposto

- `// @ts-check` em `parser.js` e `script.js`.
- Tipos em JSDoc: `ParsedItem`, `ParseResult`, `UnparsedLine`, `Template`, `Product` (o objeto de `toProduct`), `CartV1` e, depois do ADR-010, `SupplierProfile`.
- Declaração de `window.HortiParser` em `types/globals.d.ts`.
- `jsconfig.json` com `checkJs`, `strict`, `noEmit`. `tsc -p jsconfig.json` na CI.

**Aceite:** `tsc` sem erros na CI; arquivos servidos só ganham comentários.

---

## ADR-008 — Identidade de item e carrinho v1

**Status:** Proposto

### Contexto
O carrinho é `hortifruti_cart = { nome: quantidade }`, sem versão. A chave é o nome exibido, que inclui o sufixo de combo (`"Abacate (combo 3 un)"`). Problemas: grafia nova do fornecedor perde a seleção; nomes iguais em categorias diferentes colidem; itens ausentes na lista nova são descartados em silêncio por `saveCart()` (`script.js:523`).

### Decisão
- **`itemKey(name, packQty)`**: remove acentos, minúsculas, emojis, palavras de unidade **soltas** (`unidade`, `bandeja`, `maço`, `kg`...) e pontuação; colapsa espaços. **Tamanho com número (`500g`, `1kg`, `30un`) é mantido**, normalizado sem espaço (`500 g` → `500g`), porque gramaturas diferentes são produtos diferentes (`Uva Thompson 500g` ≠ `Uva Thompson 1kg`, `Ovos brancos 30un` ≠ `Ovos brancos 20un`). Se `packQty`, acrescenta `#combo<packQty>`. Usar o **nome do parser**, nunca o nome exibido. Palavra de unidade por extenso no início do nome (`Bandeja de morango`) permanece na chave, então `Morango bandeja` e `Bandeja de morango` geram chaves diferentes; o caso fica coberto pelo passo 3 do reprocessamento (sugestão de grafia) ou por remoção manual, e é aceito como limitação.
- **`productId = categoryKey + '|' + itemKey`**, com `categoryKey` normalizado da mesma forma (categoria ausente → `geral`). Resolve o bug 2 do ADR-005.
- **Nova chave** `hortifruti_cart_v1`: `{ [productId]: { qty, name, unit, price, category } }`. Os campos além de `qty` permitem mostrar itens que sumiram da lista.
- **Migração:** ao carregar, se existe `hortifruti_cart` e não existe `_v1`, converter cada nome antigo (remover sufixo `" (combo N un)"` e usar N como `packQty`), casar com os produtos atuais por `itemKey` sem categoria, gravar `_v1` e remover a chave antiga.
- **Reprocessamento:**
  1. Match exato por `productId`.
  2. Sem match: match por `itemKey` em outra categoria, se único → aplicar.
  3. Sem match: Levenshtein ≤ 2 sobre `itemKey`, nomes com ≥ 6 caracteres → **não aplicar**; enviar ao painel de revisão (ADR-009) como "Era X, agora é Y?". Até o ADR-009 existir, tratar como ausente.
  4. Ausente: manter no carrinho como "indisponível nesta lista", fora do total e da mensagem, com botão de remover.

### Critérios de aceite
- Testes unitários de `itemKey` e `productId` (acentos, tamanhos, unidades, emojis, combo). `Uva Thompson 500g` e `Uva Thompson 1kg` geram chaves diferentes; `Uva Thompson 500g` e `uva thompson 500 g` geram a mesma.
- `Banana Prata` → `banana prata kg` mantém a seleção.
- Bug 2 do ADR-005 passa (remover o `skip`).
- `Mamão formosa` → `Mamao fermosa` não aplica automaticamente.
- Migração de `{"Banana prata":2,"Abacate (combo 3 un)":2}` testada.

---

## ADR-009 — Tela de revisão e templates aprendidos

**Status:** Proposto

### Contexto
`unparsed` só aparece como contagem no status (`script.js:502-504`). `source` e `unitFrom` não são usados. O motor de templates existe em `parser.js` (`createTemplateStore`, chave `hortifruti.templates.v1`) mas `script.js` nunca passa `templates` para `parse` (`script.js:306-312`).

### Decisão

**Etapa A — revisão (PR próprio):**
- O texto "N linha(s) ignorada(s)" vira botão que abre o painel "Revisar".
- O painel lista: linhas de `unparsed` com o motivo; itens com selo "⚠ conferir"; sugestões de grafia do ADR-008.
- Ações: editar nome, preço, unidade e categoria e adicionar; descartar; confirmar/recusar sugestão de grafia.
- Itens adicionados manualmente valem só para a importação atual e são marcados `source: 'manual'`.

**Etapa B — aprender formato (PR próprio):**
- Na edição de uma linha de `unparsed`, "Aprender este formato" mostra a linha original como tokens clicáveis; o usuário toca o início e o fim do nome e depois o preço.
- Chamar `induceTemplate`; em erro, mostrar a mensagem e manter a edição manual.
- Templates passam a ser por fornecedor (ADR-010), chave `hortifruti_templates_v1` (`createTemplateStore` já aceita a chave como parâmetro). Migrar `hortifruti.templates.v1` se existir.
- `parseProducts` passa `{ templates }` para `parse`.
- Após aprender, reprocessar e informar quantas linhas passaram a ser reconhecidas.
- Configurações: listar e remover templates.

### Critérios de aceite
- E2E: importar texto com `Jaca inteira ---> 15 conto` e `Pinha --> 12 conto`, aprender a partir da primeira → as duas viram itens.
- Template corrompido no `localStorage` é descartado sem quebrar.
- Nenhum texto da linha inserido via `innerHTML`.

---

## ADR-010 — Perfis de fornecedor

**Status:** Proposto

### Contexto
`DELIVERY_FEE = 5.00` (`script.js:23`), texto estático `R$ 5,00` em `index.html:92` e `:95`, pagamentos fixos em `index.html:82-85`. Não existe número de WhatsApp.

### Decisão
- `SupplierProfile`: `id`, `name`, `whatsapp` (dígitos com DDI), `deliveryFee`, `paymentMethods[]`, `boldIsPromo` (padrão `true`, ver ADR-015).
- Chave `hortifruti_suppliers_v1`: `{ activeId, profiles: { [id]: SupplierProfile } }`.
- Dados por fornecedor: texto importado, carrinho v1 e templates. Chaves com sufixo do id (`hortifruti_cart_v1_<id>` etc.) ou objeto aninhado; escolher uma forma e documentar no `AGENTS.md`.
- Migração: criar o perfil "Meu hortifruti" com taxa 5,00 e `["PIX", "Cartão de Crédito"]`, movendo texto, carrinho e templates existentes para ele. `hortifruti_prefs` (endereço, pagamento) continua global; se o pagamento salvo não existir no perfil ativo, usar o primeiro.
- `#deliveryFee`, `#totalValue` inicial e o `<select id="pagamento">` passam a ser renderizados a partir do perfil; remover os valores fixos do HTML.
- Seletor de fornecedor no topo da etapa 1; tela de configuração para criar, editar e excluir perfis (não permitir excluir o último).

### Critérios de aceite
- Usuário existente abre a página e encontra tudo preservado no perfil migrado.
- Trocar de fornecedor troca carrinho, texto e templates; voltar restaura.
- Validação: taxa ≥ 0; WhatsApp só dígitos, 12–13 caracteres, ou vazio.

---

## ADR-011 — Envio direto pelo WhatsApp (`wa.me`)

**Status:** Proposto

### Contexto
Hoje só há cópia (`copyBtn.onclick`, `script.js:619-633`).

### Decisão
- Botão "Enviar no WhatsApp" ao lado de "Copiar", ativo quando o perfil tem `whatsapp`; sem número, desabilitado com dica para configurar.
- Elemento `<a>` com `href = https://wa.me/<dígitos>?text=<encodeURIComponent(mensagem)>`, `target="_blank"`, `rel="noopener noreferrer"`. Não usar `window.open`.
- A CSP atual não restringe navegação; não alterar.
- Mensagem acima de ~2000 caracteres codificados: manter o link e avisar que mensagens longas podem ser cortadas em alguns navegadores, sugerindo "Copiar".
- Combo na mensagem: trocar `2x` por formato explícito, ex.: `- Abacate (combo 3 un), 2 combos (R$ 20,00)`, para o fornecedor não ler como 2 abacates.

### Critérios de aceite
- Teste unitário da URL com acentos, emojis, quebras de linha, `&`, `#` e `*`.
- E2E: com número configurado, o `href` decodificado é igual à mensagem gerada.

---

## ADR-012 — Catálogo de ícones próprio no site, emojis nativos na mensagem

**Status:** Proposto (decisão do dono do repositório: no site, só os ícones flat próprios; na mensagem do WhatsApp, só emojis nativos)

### Contexto
Os ícones são PNGs 3D remotos de um espelho comunitário (`cdn.jsdelivr.net/gh/shuding/fluentui-emoji-unicode`), gerados por `emojiToExternalIconUrl` (`script.js:146-153`), com 50 regras em `ITEM_ICON_RULES` (`script.js:93-143`) e fallback por categoria (`getCategoryIcon`, `script.js:79-90`). Sem rede, os ícones somem. O Unicode não tem emoji para boa parte do hortifruti brasileiro.

### Decisão

**Site — ícones próprios, sem emoji e sem CDN:**
- Pacote `icones-hortifruti.zip` → `icons/`: 137 SVGs flat em `icons/custom/` (`viewBox="0 0 64 64"`, cores sólidas, sem texto, sem script, sem referência externa; maior arquivo 6 KB, total 130 KB).
  - Hortifruti: frutas, legumes, verduras e temperos, incluindo os que têm emoji (banana, tomate, alho...) e os que não têm (chuchu, jiló, maxixe, mandioca...).
  - Mercadinho: arroz, feijão, café, massa, molho, enlatado, biscoito, chocolate, leite, queijo, manteiga, refrigerante, água, limpeza e higiene.
  - Prontos: suco, salada de frutas, legumes picados.
  - 17 categorias genéricas (`cat-*`).
- `icons/catalog.json`: `id`, `file`, `group`, `keywords` (minúsculas, sem acento). `ITEM_ICON_RULES` passa a ser gerado a partir dele e a apontar para arquivo, não para emoji. Casar contra o nome normalizado (mesma normalização do `itemKey`, ADR-008), **palavra-chave mais longa primeiro** (`repolho roxo` antes de `repolho`, `batata doce` antes de `batata`, `maca verde` antes de `maca`, `agua de coco` antes de `agua`).
- `getCategoryIcon` usa os `cat-*`. Sem correspondência: `cat-outros`.
- `icons/build_icons.py` regenera tudo; ícone novo ou ajuste entra pelo script, não por edição manual do SVG.
- Renderização: `<img src="icons/custom/<id>.svg" alt="" width height>` (alt vazio: o nome está ao lado). Hoje o código usa `icon.alt = itemEmoji` (`script.js:376`); passa a `alt = ''` junto com a remoção do emoji. Sem sprite com `<use>` externo (falha em `file://`).
- Remover `emojiToExternalIconUrl` e a dependência do CDN. CSP: `img-src 'self'`.
- Teste que falha se algum SVG tiver `<script>`, `on*=`, `href`, `<foreignObject>`, `url(` ou mais de 8 KB.
- Cobertura medida no fornecedor real: 100% dos 133 produtos de hortifruti e 100% de geladeira e limpeza com ícone específico; no mercadinho, 146 de 149 (palito, carvão e papel alumínio caem em `cat-mercadinho`).

**Mensagem do WhatsApp — emojis nativos:**
- `icons/whatsapp-emoji.json`: `items` (palavras-chave → emoji) e `categories` (categoria → emoji). Só emojis até Unicode 14, para aparecerem em aparelhos antigos.
- Cabeçalho de categoria sempre com emoji (`🍉 *FRUTAS*`).
- Item com emoji só quando houver correspondência em `items`; sem correspondência, sem emoji (nunca o emoji de outra coisa).
- Mesma regra de palavra-chave mais longa primeiro.

### Critérios de aceite
- Nenhuma requisição externa ao abrir o app (e2e com rede bloqueada).
- Corpus R1 e cenários A–M: todo item com ícone específico ou de categoria; nenhum `<img>` quebrado.
- Teste unitário da escolha de emoji: `Maçã verde` → 🍏, `Maçã gala` → 🍎, `Chuchu` → sem emoji, cabeçalho `LEGUMES` → 🥕.
- Mensagem gerada continua igual nos testes existentes, exceto pelos emojis acrescentados.

---

## ADR-013 — PWA offline

**Status:** Proposto

- `manifest.json` (nome, ícones 192/512 a partir do `favicon.svg`, `display: standalone`, `theme_color` das variáveis de `:root`).
- `sw.js`: cache-first para assets (incluindo `icons/`), network-first para `index.html`, versão de cache incrementada a cada release.
- Registrar o service worker só em `https:` ou `localhost`; em `file://` o app funciona como hoje.
- CSP: acrescentar `worker-src 'self'` e `manifest-src 'self'`.

**Aceite:** e2e offline após o primeiro carregamento (página e ícones aparecem); `file://` continua funcionando; Lighthouse "instalável" em `localhost`.

---

## ADR-014 — Preço anterior e histórico de preços

**Status:** Proposto

### Contexto
`oldPrice` é mapeado para `precoAnterior` (`script.js:298`) mas nunca exibido. Toda lista importada é descartada na seguinte.

### Decisão
- **Preço anterior:** quando `precoAnterior` existir, mostrar riscado ao lado do preço, com texto acessível "antes R$ X".
- **Histórico:** ao processar uma lista, salvar snapshot por fornecedor em `hortifruti_history_v1_<id>`: `{ importedAt, promoDate, prices: { [productId]: { price, unit } } }`. Manter os 10 mais recentes.
- Mostrar variação em relação ao snapshot anterior **com a mesma unidade**: `↑ 12%`, `↓ 8%`; nada se igual, sem histórico ou unidade diferente. Texto acessível: "subiu 12% desde 28/10".
- "Limpar dados salvos" já cobre pelo prefixo (ADR-005).

### Critérios de aceite
- Tomate de 5,99 para 6,49 entre duas importações → `↑ 8%`.
- kg → bandeja não mostra variação.
- Limite de 10 snapshots respeitado; 10 snapshots de 100 itens ocupam menos de 200 KB.

---

## ADR-015 — Ajustes do parser a partir do fornecedor real

**Status:** Proposto

### Contexto
Análise da exportação do WhatsApp de um fornecedor real: 44 listas de preço entre 08/2025 e 08/2026, 8.112 linhas com preço, 344 produtos distintos, categorias LEGUMES, VERDURAS, FRUTAS, MERCADINHO, GELADEIRA e PRODUTO DE LIMPEZA.

Com o parser original: 98,5% das linhas viraram item e **nenhum preço divergiu** do valor após `R$` na linha. As falhas eram de forma, não de preço. Com os ajustes abaixo: 99,6% e zero linhas de produto em `unparsed`.

### Decisão
Portar para o `parser.js` do repositório as regras abaixo. O arquivo `parser-fornecedor-real.patch` mostra a implementação de referência, feita sobre o parser original (antes do PR #8); **não aplicar o patch direto**, porque o parser do repositório mudou (`BEFORE_WINDOW`, `bare`, `trimEdges`). Usar o caso R1 de `parser.test.js` como critério.

**Entradas que o dono do repositório precisa fornecer** (não vieram com o ADR): `parser-fornecedor-real.patch` e as linhas do caso R1. Enquanto faltarem, o PR é implementado só pela tabela abaixo, com um caso sintético por regra (1 a 8) montado a partir da coluna "Padrão real" (as linhas já estão no ADR), nomeado `R1-<n>` e marcado como provisório. Quando o dono entregar o R1 real, os casos provisórios são substituídos. O agente não inventa linhas além das da tabela.

| # | Padrão real | Antes | Regra |
|---|---|---|---|
| 1 | `Sucos variados a partir de R$ 10,00 (450ml)` | linha ignorada: `de` marcava o preço como antigo, e o único preço "depois" era o `450ml` | Preço só é antigo se houver **preço válido** (score ≥ 0) depois. `a partir de` nunca é preço antigo: marca `fromPrice: true` e sai do nome. |
| 2 | `Bdj. Quiabo R$ 7,99`, `Kg quiabo R$ 7,99` | nome `Bdj. Quiabo`, sem unidade (hoje só a unidade colada ao preço é reconhecida: `parser.js:46`; `NAME_UNIT_RE` só aceita palavra por extenso) | Abreviação ou código de unidade no **início** do nome (`bdj`, `cx`, `pct`, `mç`, `dz`, `penca`, `kg`, `un`...) vira unidade e sai do nome. Palavra por extenso solta no nome (`Bandeja de morango`, `Caixa de ovos`, `Maço de cheiro verde`) **continua no nome**: descreve o produto e o corpus O fixa esse comportamento. Critério: caso P do corpus (hoje `pending`; remover o marcador ao implementar). |
| 3 | `Ameixa $ *10,99*` + linha seguinte `kg` | sem moeda; `kg` ia para `unparsed` | `$` sozinho é moeda, com qualquer quantidade de espaço depois. Linha que contém **só** uma unidade completa a unidade do item anterior, se ele não tiver. |
| 4 | `Abacaxi 1 por R$ 3,00 e 2 por R$ 5,00` | nome `Abacaxi 3,00 e 2`, preço 5 | Combo escalonado: cada `N por` se liga ao preço **imediatamente seguinte** (comparar pelo fim do número, não pelo início do `R$`). Se existir faixa de 1 unidade, ela é o preço; as faixas vão em `tiers: [{qty, price}]`. O nome termina antes do primeiro combo. |
| 5 | `Couve R 2,99` | inteiro/preço fraco | `R` isolado antes de número com 2 decimais é moeda. |
| 6 | `Abóbora moranga R$5,99kgg` | nome `Abóbora moranga kgg` | Aceitar `kgg` como `kg`. |
| 7 | `22/08/2025` sozinho na linha, `Tabela de preços:`, convite para comunidade com link | `unparsed` | Linha só com data é ruído (e alimenta `promoDate`). Acrescentar `tabela`, `link` e `comunidade` ao `NOISE_RE`. |
| 8 | `(1lt)de` (quebra de linha do fornecedor) | `de` no nome | Remover `de`/`por`/`a` finais também quando colados a `)`. |

### Observações que não são do parser (decisões para o ADR-010)
- **Negrito como promoção:** este fornecedor põe em negrito 31% das frutas, 38% dos legumes e 48% das verduras de cada lista. Tratar negrito como promoção lota a aba de promoções. **Decidido:** negrito é promoção (é a convenção comum). Manter `boldIsPromo` no perfil de fornecedor com padrão `true`, só como escape para fornecedores que usem negrito como destaque.
- **Unidade ausente:** 97% das verduras e ~100% de MERCADINHO, GELADEIRA e LIMPEZA vêm sem unidade; nas frutas, 25%. O padrão `un` está correto para esses grupos. Itens sem unidade **em FRUTAS e LEGUMES** (ex.: `Alho R$ 24,99`, `Abacaxi`, `Morango`) devem permitir trocar kg/un no item, com `un` como padrão.
- **Mercadinho:** 37% dos itens são de mercearia, limpeza e geladeira (marcas, gramaturas). Os ícones `cat-mercadinho`, `cat-limpeza`, `cat-congelados` e `cat-laticinios` do ADR-012 cobrem esses grupos.
- **Pedidos do cliente:** os pedidos enviados manualmente usam `- 1kg de abóbora` e `- Tomate *1kg*`. O formato gerado pelo app (`- Tomate, 1kg (R$ 5,99)`) é compatível; o fornecedor confirma o total respondendo "Confere por gentileza".

### Critérios de aceite
- Caso R1 passa no `tests/parser.test.js` do repositório, sem quebrar os casos existentes (A–M).
- Rodando a exportação completa localmente (fora do repositório), zero linhas de produto em `unparsed`.
- A exportação bruta **não** entra no repositório; só o caso R1, que contém apenas linhas de produto.

---

## ADR-016 — Pedido por unidade em itens vendidos por kg

**Status:** Proposto

### Contexto
No Brasil é comum pedir por unidade um item tabelado por kg: "1 cabeça de alho", "6 bananas", "2 tomates", "1 abacaxi". Os pedidos reais do dono do repositório misturam os dois (`2 cabeças de alho`, `0,5kg de cenoura`, `Mamão Papaia 6un`). Hoje o app só aceita a unidade do preço.

### Fontes de peso médio
| Fonte | Cobertura | Acesso | Uso |
|---|---|---|---|
| IBGE, *Tabela de Medidas Referidas para os Alimentos Consumidos no Brasil* (POF 2008-2009, 2011, 548 p.) | Gramas por medida caseira (unidade, cabeça, dente, maço, fatia...) por alimento e forma de preparo | Download gratuito na biblioteca do IBGE **com login**; também em CD-ROM com planilha. O PDF público `liv50000.pdf` traz só a metodologia. | **Fonte principal.** O dono do repositório baixa o arquivo; o agente extrai só as linhas de frutas, legumes e verduras na forma de preparo "cru". |
| CEAGESP, cartilhas *A medida das frutas* e *A medida das hortaliças* (2017) | Faixas de classificação do atacado; em gramas só para alguns itens (maçã, mamão, manga, carambola, caju, ameixa, pera, alface, couve) | PDF público | **Validação de faixa** (mín./máx.) e itens que faltarem no IBGE. |
| Peso médio informado pelo fornecedor | Alguns fornecedores publicam "peso médio 0,35 kg/un" | Na própria lista | Tem precedência quando existir. |
| Histórico de pedidos confirmados | Por fornecedor | Local | Calibração futura (fora deste ADR). |

O agente **não** deve preencher pesos de memória. Cada linha da tabela registra `source` e, quando não houver fonte, o item fica sem conversão (só kg).

### Decisão
**Dados:** `data/unit-weights.json`, versionado:
```json
{ "version": 1, "items": [
  { "keywords": ["alho"], "unitLabel": "cabeça", "unitPlural": "cabeças", "grams": 0, "min": 0, "max": 0, "source": "IBGE POF 2008-2009, medidas referidas, código X" }
]}
```
- `keywords` casam com o `itemKey` (ADR-008), compostas antes das simples (`banana nanica` antes de `banana`, `tomate cereja` antes de `tomate`).
- `unitLabel` é o nome natural: cabeça (alho, repolho, couve-flor), pé (alface), maço (temperos), penca (banana, opcional), unidade (frutas, legumes).
- Itens sem entrada não oferecem conversão.

**Interação:**
- Item tabelado por kg **com** entrada na tabela mostra um seletor `kg | <unitLabel>`. Padrão `kg`; o app lembra a última escolha por item no carrinho.
- Modo kg: passo de 0,25 kg (mínimo 0,25), substituindo o `min=0.1`/`step=0.1` atual (ADR-005). Modo unidade: inteiros ≥ 1.
- Modo unidade mostra a estimativa ao lado da quantidade: `2 cabeças ≈ 100 g · ≈ R$ 2,50`. Sempre com `≈`.
- Subtotal e total passam a distinguir exato e estimado: `Total estimado: ≈ R$ 42,10 (itens por unidade são pesados na separação)`. Se não houver item estimado, o texto é o atual.
- Itens tabelados por unidade, bandeja, maço etc. não mudam.

**Mensagem:**
```
- Alho, 2 cabeças (≈ 100 g · ≈ R$ 2,50)
- Banana prata, 6 unidades (≈ 720 g · ≈ R$ 3,59)
- Cenoura, 0,5kg (R$ 1,99)
```
O fornecedor recebe a quantidade como o cliente pediria e a estimativa só como referência.

### Consequências
- Modelo do carrinho v1 (ADR-008) ganha `mode: 'kg' | 'unit'`; migração: itens existentes ficam em `kg`.
- O total deixa de ser exato quando há item por unidade; a UI precisa deixar isso claro sem esconder o valor.
- A tabela é um arquivo de dados, não código; atualização não exige mudança no parser.

### Critérios de aceite
- `data/unit-weights.json` com fonte em todas as linhas, cobrindo pelo menos os 40 itens de hortifruti mais frequentes no corpus real.
- Teste: alho a R$ 24,99/kg, 2 cabeças com 50 g cada (valor fictício de teste) → `≈ 100 g · ≈ R$ 2,50`, e o total exibe "estimado".
- Teste: item sem entrada na tabela não mostra o seletor.
- Teste: recarregar a página preserva o modo escolhido.
- E2E em 360px: seletor e estimativa cabem na linha do item sem quebrar o layout.
