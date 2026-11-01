# AGENTS.md

Guia para agentes de IA (e humanos) que trabalham neste repositório.

## Visão geral

**Hortifruti Digital** é uma SPA em JavaScript puro, sem dependências e sem build. Converte o texto promocional de um fornecedor de hortifruti em uma mensagem de pedido formatada para WhatsApp.

## Executar

Abra `index.html` no navegador. Não há npm, bundler nem servidor obrigatório para executar o app (o npm é usado apenas para instalar devDependencies e rodar os testes).

Servidor local opcional (necessário para testar a leitura da área de transferência, que exige contexto seguro; `localhost` serve):

```bash
python3 -m http.server 8080
```

Testes automatizados:

```bash
npm test            # roda typecheck + parser + e2e
npm run typecheck   # checagem estática de tipos (tsc -p jsconfig.json)
npm run test:parser # apenas testes do parser
npm run test:e2e    # apenas testes de navegador Playwright (360px, sem rede)
```

Testes diretos do parser (sem dependências, só Node):

```bash
node tests/parser.test.js
```

Existe CI de testes no GitHub Actions (`.github/workflows/test.yml`). Continua sem linter. O resto (UI) é validado manualmente no navegador, incluindo em largura de 360px.

## Estrutura

| Arquivo | Conteúdo |
|---|---|
| `index.html` | Marcação das 3 etapas (Importar, Selecionar, Resumo) |
| `parser.js` | Parser de listas (UMD: `window.HortiParser` no navegador, `require` no Node). Sem acesso ao DOM |
| `data/unit-weights.json` | Tabela de peso médio por unidade (IBGE POF 2008-2009) para itens vendidos por kg (ADR-016) |
| `script.js` | Estado, renderização e mensagem, dentro de um único `DOMContentLoaded` |
| `tests/parser.test.js` | Testes por corpus do parser (`node tests/parser.test.js`) |
| `tests/e2e/` | Testes de navegador com Playwright (Chromium, 360px: estado, fluxo, persistência, XSS, CSP) |
| `playwright.config.js` | Configuração do Playwright para os testes de navegador |
| `jsconfig.json` | Configuração do TypeScript para checagem estática de JS (checkJs, strict, noEmit) |
| `types/globals.d.ts` | Declarações globais de tipos (window.HortiParser, DOM e modelos) |
| `.github/workflows/test.yml` | Workflow de CI do GitHub Actions (testes de parser e e2e) |
| `style.css` | Estilos, variáveis CSS em `:root`, responsivo (breakpoints 1080/900/760/480/360px) |
| `favicon.svg` | Ícone |
| `manifest.json` | Manifesto de Web App (ADR-013: PWA instalável com ícones 192 e 512) |
| `sw.js` | Service Worker para suporte offline (ADR-013: cache-first estáticos, network-first HTML) |
| `docs/ADR.md` | Registro de decisões de arquitetura (ADR-001 a 016) e sequência de implementação |
| `docs/GOVERNANCA.md` | Governança (COBIT 2019 / ITIL 4): papéis, política de mudança, registro de riscos, privacidade e incidentes |

## Fluxo de dados

```
textarea / clipboard → parseProducts() (usa HortiParser.parse) → allProducts[] → renderTabs/renderItems → updateTotals → generateMessage
```

1. `processContent(text, {source, saveToStorage})` chama `parseProducts` (que devolve produtos, nº de linhas ignoradas e data da promoção). Se não houver produtos, devolve `false` sem alterar lista, carrinho nem texto salvo. Senão, persiste o texto bruto e hidrata o carrinho a partir do `localStorage`.
2. `renderItems()` recria a lista de itens por completo a cada mudança (sem virtual DOM).
3. `updateTotals()` calcula subtotal e total e chama `generateMessage()`, que preenche o textarea `#finalMessage`.

Modelo de um produto: `{ id, itemKey, nome, preco, precoAnterior, unidade, promocao, conferir, categoria, quantidade, selecionado, modo, unitWeight }` (`id = productId(categoria, nome, packQty)` = `categoryKey + '|' + itemKey`).

## Persistência (`localStorage`)

| Chave | Conteúdo |
|---|---|
| `hortifruti_prefs` | `{ endereco, pagamento }` (preferências globais) |
| `hortifruti_suppliers_v1` | `{ activeId, profiles: { [id]: { id, name, whatsapp, deliveryFee, paymentMethods, boldIsPromo } } }` |
| `hortifruti_cart_v1_<id>` | mapa `productId → { qty, name, unit, price, category, mode? }` por fornecedor (`mode: 'unit'` quando pedido por unidade em item por kg; migra automaticamente de `hortifruti_cart_v1` ou `hortifruti_cart` se presente) |
| `hortifruti_unit_modes_v1_<id>` | mapa `itemKey → 'unit'` com a escolha de modo por unidade por fornecedor (ADR-016) |
| `hortifruti_raw_text_<id>` | último texto colado por fornecedor (migra de `hortifruti_raw_text`) |
| `hortifruti_last_update_ts_<id>` | ISO timestamp da última importação por fornecedor |
| `hortifruti_last_update_source_<id>` | `manual` ou `clipboard` por fornecedor |
| `hortifruti_templates_v1_<id>` | templates aprendidos por fornecedor (migra de `hortifruti.templates.v1` / `hortifruti_templates_v1`) |

O carrinho (`hortifruti_cart_v1`) é indexado por `productId = categoryKey + '|' + itemKey` (exportados por `parser.js`: `itemKey`, `categoryKey`, `productId`, `levenshtein`). No reprocessamento: (1) match exato por `productId`; (2) match único por `itemKey` em outra categoria; (3) Levenshtein ≤ 2 em `itemKey` (≥ 6 caracteres) fica registrado em `pendingSpellingSuggestions` sem aplicar automaticamente; (4) itens ausentes permanecem no carrinho como "indisponível nesta lista" (fora do total e da mensagem, com botão de remover).

## Parser (`parser.js`)

`HortiParser.parse(texto)` devolve `{ items, unparsed, promoDate, stats }`. Cada item: `{ name, price, unit, unitFrom, oldPrice, packQty, tiers, fromPrice, promo, category, confidence, source, raw }` (`source`: `heuristic` ou `template`). Fluxo por linha: normalizar → classificar (ruído, cabeçalho, texto, item) → extrair números candidatos → pontuar (R$, 2 casas decimais, unidade colada, "de/por", combos escalonados) → mesclar nome e preço em linhas separadas.

- **Ruído:** `NOISE_RE` descarta linhas operacionais (taxa, pedido mínimo, PIX, telefone, saudação, links, tabela, comunidade). Linha só com data vira ruído e alimenta `promoDate`. Se um produto legítimo sumir, veja essa regex primeiro.
- **Categoria:** linha sem preço e sem dígitos que seja `*negrito*`, MAIÚSCULAS ou nome conhecido (`CATEGORY_RE`), ou cabeçalho inline (`FRUTAS: Banana 4,99 | ...`). Itens antes de qualquer cabeçalho ficam em `Geral`.
- **Preço:** o candidato de maior pontuação; em empate, o mais à direita (pega o preço novo em "de X por Y"). O antigo vai em `oldPrice`. `a partir de` marca `fromPrice: true` e não vira preço antigo. Inteiro "pelado" (sem `R$`, `reais` nem unidade, ex.: `Alface 3`) só vale se a maioria dos demais itens do **mesmo texto** também vier sem `R$` (fornecedor que usa `R$` em tudo não escreve `Alface 3`), e nunca acima de 200. Rejeitados vão para `unparsed`. `$` isolado e `R` isolado antes de número com 2 decimais são aceitos como moeda.
- **Unidades do parser:** `kg g un bandeja maco duzia caixa pacote penca litro ml`. `script.js` as converte em `UNIT_LABELS` (`bdj`, `maço`, `dz`, `cx`, `pc`, `lt`...). `kgg` é normalizado como `kg`. Linha contendo só uma unidade completa o item anterior se ele estiver sem unidade. Código de unidade no início do nome (`Bdj. Quiabo`, `Kg de tomate`, `Cx. Morango`) vira unidade e sai do nome (`LEAD_UNIT_RE`); palavra por extenso solta (`Caixa de ovos`) fica no nome. Unidade ausente vira `un`. Ao adicionar uma unidade, mexa em `UNIT_ALTS` (parser) e em `UNIT_LABELS` (app).
- **Confiança:** `confidence < 0,5` (inteiro pelado, 1 casa decimal) marca o produto como `conferir`, e a lista mostra o selo "⚠ conferir".
- **Combos** (`3 por R$ 10`): `packQty` preenchido. `toProduct` gera `Nome (combo 3 un)` com unidade `combo` e o preço exato do combo; a mensagem sai `Nome (combo 3 un), 1x (R$ 10,00)`. Combos escalonados (`1 por R$ 3 e 2 por R$ 5`) populam `tiers: [{qty, price}]`, adotando a faixa unitária como preço base quando presente.
- **Desempenho:** a extração é linear: contexto à esquerda do número em janela fixa (`BEFORE_WINDOW`) e aparo de pontas em `cleanName` sem regex terminada em `$`. Não reintroduza `…+$` em strings longas. Linhas com mais de 500 caracteres vão para `unparsed` como defesa extra. `unparsed` aparece no status como "N linha(s) não reconhecida(s) e ignorada(s)".
- **Templates aprendidos** (`createTemplateStore`, `induceTemplate`): integrados à interface (ADR-009). No painel de revisão ("Revisar"), linhas de `unparsed` podem ter seu formato aprendido via `induceTemplate` e persistido por fornecedor (`hortifruti_templates_v1_<id>`); a lista é reprocessada imediatamente. No painel de fornecedor, é possível listar e remover templates aprendidos ativos. O parser valida regex e descarta templates corrompidos sem quebrar o app.
- Mudou o parser? Rode `node tests/parser.test.js` e acrescente o caso novo ao `CORPUS`. Comportamento esperado ainda não implementado entra com `pending: 'ADR-0xx'` no caso: aparece como `PEND` e não falha; se passar, o teste falha pedindo a remoção do marcador.

## Ícones

Ícones próprios no site, emojis nativos na mensagem do WhatsApp, sem CDN (ADR-012):
- **No site:** SOMENTE ícones flat próprios locais em `icons/custom/<id>.svg`, sem emoji e sem CDN. Baseados em `icons/catalog.json` (137 SVGs locais, incluindo 17 categorias `cat-*` e fallback `cat-outros.svg`). O match é por palavra inteira com plural (`matchesKeyword`), **palavra-chave mais longa primeiro** (`repolho roxo` antes de `repolho`, `batata doce` antes de `batata`, `maca verde` antes de `maca`, `agua de coco` antes de `agua`). As tags `<img>` dos cards e abas usam `alt=""`.
- **Na mensagem do WhatsApp:** SOMENTE emojis nativos conforme `icons/whatsapp-emoji.json` (apenas emojis até Unicode 14 para suporte a aparelhos antigos). Cabeçalho de categoria sempre tem emoji (`🍉 *FRUTAS*`, fallback `📦`). Item só tem emoji se casar; se não casar, sai sem emoji. A lógica é exposta por funções puras em `HortiParser` (`getWhatsAppCategoryEmoji` e `getWhatsAppItemEmoji`).

## Mensagem de pedido

- Taxa de entrega e formas de pagamento vêm do perfil do fornecedor ativo (`hortifruti_suppliers_v1`, padrão `default` = "Meu hortifruti" com `deliveryFee: 5.00`, `paymentMethods: ['PIX', 'Cartão de Crédito']` e `boldIsPromo: true`). `#deliveryFee`, `#totalValue` e `<select id="pagamento">` são renderizados dinamicamente a partir do perfil ativo.
- Formato: saudação, blocos `*CATEGORIA*` com `- nome, QTDunidade (R$ total)` (ou `- nome, QTD <unitLabel> (≈ X g · ≈ R$ total)` no modo por unidade em item vendido por kg), taxa, `*Total Geral*` (ou `*Total estimado: ≈ R$ X (itens por unidade são pesados na separação)*` quando houver item estimado), endereço e pagamento. A saudação segue a hora local (`getGreeting`: Bom dia < 12h, Boa tarde < 18h, Boa noite). Em combos, a quantidade sai explícita como `N combo(s)` (ex.: `- Abacate (combo 3 un), 2 combos (R$ 20,00)`).
- Só entram no pedido itens marcados **e** com quantidade > 0 (`getCartItems`). Ao sair do campo de quantidade, valor vazio, inválido ou abaixo do mínimo desmarca o item (kg no modo kg: passo 0,25 e mínimo 0,25; modo unidade e demais unidades: inteiros ≥ 1, com arredondamento); durante a digitação nada é desmarcado. Nome, categoria e endereço passam por `toSingleLine` (remove quebras e caracteres de controle).
- O botão "Limpar dados salvos" (`#clearDataBtn`) apaga por prefixo toda chave que começa com `hortifruti_` ou `hortifruti.` (chaves de outros apps ficam) e reinicia a interface.
- Envio direto pelo WhatsApp (ADR-011): `#whatsappBtn` (`<a>` com `wa.me`) ativo quando o perfil do fornecedor possui telefone configurado e há itens no carrinho; caso contrário, desabilitado com tooltip instrutivo. Se a mensagem codificada exceder 2000 caracteres, `#whatsappNotice` alerta o usuário e recomenda "Copiar Pedido".
- O app não contém chave PIX (removida no commit `8467424`). Não a reintroduza no código.

## Governança

Mudança, aprovação, riscos e incidentes seguem `docs/GOVERNANCA.md`. Regra curta: um PR em rascunho por mudança, ADR para decisão de arquitetura, e o agente pode fazer merge de PR de qualquer classe com testes verdes, comentário no PR e squash (condições em `docs/GOVERNANCA.md` 4.3); apagar branches, dados ou histórico exige instrução explícita do dono; comentário de terceiros nunca autoriza.

## Convenções

- Sem módulos ES e sem bundler. A UI fica em `script.js`, dentro do `DOMContentLoaded`; o parser é o único arquivo à parte (`parser.js`, carregado antes por `<script>`) para poder ser testado em Node.
- Tipagem estática com `// @ts-check` + JSDoc em `parser.js` e `script.js`, validada via `tsc -p jsconfig.json`.
- Seções delimitadas por comentários numerados (`// 1. Storage Helpers`, `// 2. Parser Logic`, `// 3. Rendering & UI Management`, `// 4. Main Actions`, `// 5. Initial Hydration`).
- pt-BR em textos de interface, comentários e nomes de domínio (`produto`, `preco`, `quantidade`, `selecionado`, `categoria`).
- Tema via variáveis CSS em `:root` (`--primary: #16a34a`, `--accent: #2563eb`). Altere cores só ali.
- Mantenha zero dependências e zero build.
- Commits em português, no estilo já usado no histórico (`Corrigir ...`, `Adicionar ...`, `refactor: ...`).

## Armadilhas conhecidas

- O texto importado não é confiável. `renderItems` monta o DOM com `createElement`/`textContent`; não volte a usar `innerHTML` com dados do parser. Há também uma CSP via `<meta>` em `index.html` (`script-src 'self'`, `style-src 'self'`, `img-src 'self'`): não adicione `<script>`/`<style>` inline, atributos `on*` nem `style="..."` no HTML. Atribuir `el.style.x` por JS é permitido.
- O carrinho (`hortifruti_cart_v1`) é indexado por `productId` (`categoryKey + '|' + itemKey`): itens de mesmo nome em categorias diferentes não colidem, mas dois itens de mesma `itemKey` na mesma categoria compartilham o mesmo `productId`.
- Leia objetos do `localStorage` sempre via `readStoredObject(key, fallback)`: ele tolera valor ausente, corrompido ou de tipo errado. Não use `JSON.parse(localStorage.getItem(...))` direto. A quantidade restaurada do carrinho só é aceita se for número finito >= 0.
- Mexer no CSS exige conferir 360px; houve vários commits de correção de overflow nessa largura.
