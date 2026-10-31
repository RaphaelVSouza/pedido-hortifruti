# AGENTS.md

Guia para agentes de IA (e humanos) que trabalham neste repositório.

## Visão geral

**Hortifruti Digital** é uma SPA em JavaScript puro, sem dependências e sem build. Converte o texto promocional de um fornecedor de hortifruti em uma mensagem de pedido formatada para WhatsApp.

## Executar

Abra `index.html` no navegador. Não há npm, bundler nem servidor obrigatório.

Servidor local opcional (necessário para testar a leitura da área de transferência, que exige contexto seguro; `localhost` serve):

```bash
python3 -m http.server 8080
```

Testes do parser (sem dependências, só Node):

```bash
node tests/parser.test.js
```

Não há linter nem CI. O resto (UI) é validado manualmente no navegador, incluindo em largura de 360px.

## Estrutura

| Arquivo | Conteúdo |
|---|---|
| `index.html` | Marcação das 3 etapas (Importar, Selecionar, Resumo) |
| `parser.js` | Parser de listas (UMD: `window.HortiParser` no navegador, `require` no Node). Sem acesso ao DOM |
| `script.js` | Estado, renderização e mensagem (~550 linhas), dentro de um único `DOMContentLoaded` |
| `tests/parser.test.js` | Testes por corpus do parser (`node tests/parser.test.js`) |
| `style.css` | Estilos, variáveis CSS em `:root`, responsivo (breakpoints 1080/900/760/480/360px) |
| `favicon.svg` | Ícone |

## Fluxo de dados

```
textarea / clipboard → parseProducts() (usa HortiParser.parse) → allProducts[] → renderTabs/renderItems → updateTotals → generateMessage
```

1. `processContent(text, {source, saveToStorage})` chama `parseProducts` (que devolve produtos, nº de linhas ignoradas e data da promoção), persiste o texto bruto e hidrata o carrinho a partir do `localStorage`.
2. `renderItems()` recria a lista de itens por completo a cada mudança (sem virtual DOM).
3. `updateTotals()` calcula subtotal e total e chama `generateMessage()`, que preenche o textarea `#finalMessage`.

Modelo de um produto: `{ id, nome, preco, precoAnterior, unidade, promocao, categoria, quantidade, selecionado }`.

## Persistência (`localStorage`)

| Chave | Conteúdo |
|---|---|
| `hortifruti_prefs` | `{ endereco, pagamento }` |
| `hortifruti_cart` | mapa `nome do produto → quantidade` (somente itens selecionados; regravado a cada `processContent`, descartando nomes que não estão na lista atual) |
| `hortifruti_raw_text` | último texto colado |
| `hortifruti_last_update_ts` | ISO timestamp da última importação |
| `hortifruti_last_update_source` | `manual` ou `clipboard` |

O carrinho é indexado pelo **nome** do produto. Mudar a grafia no texto do fornecedor desfaz a seleção, e nomes duplicados colidem.

## Parser (`parser.js`)

`HortiParser.parse(texto)` devolve `{ items, unparsed, promoDate, stats }`. Cada item: `{ name, price, unit, oldPrice, packQty, promo, category, confidence, source, raw }`. Fluxo por linha: normalizar → classificar (ruído, cabeçalho, texto, item) → extrair números candidatos → pontuar (R$, 2 casas decimais, unidade colada, "de/por") → mesclar nome e preço em linhas separadas.

- **Ruído:** `NOISE_RE` descarta linhas operacionais (taxa, pedido mínimo, PIX, telefone, saudação, links). Se um produto legítimo sumir, veja essa regex primeiro.
- **Categoria:** linha sem preço e sem dígitos que seja `*negrito*`, MAIÚSCULAS ou nome conhecido (`CATEGORY_RE`), ou cabeçalho inline (`FRUTAS: Banana 4,99 | ...`). Itens antes de qualquer cabeçalho ficam em `Geral`.
- **Preço:** o candidato de maior pontuação; em empate, o mais à direita (pega o preço novo em "de X por Y"). O antigo vai em `oldPrice`. Inteiros sem `R$` valem (`5 reais`, `Morango 2 por 15`), então um número solto em linha de texto pode virar item.
- **Unidades do parser:** `kg g un bandeja maco duzia caixa pacote penca litro ml`. `script.js` as converte em `UNIT_LABELS` (`bdj`, `maço`, `dz`, `cx`, `pc`, `lt`...). Unidade ausente vira `un`. Ao adicionar uma unidade, mexa em `UNIT_ALTS` (parser) e em `UNIT_LABELS` (app).
- **Combos** (`3 por R$ 10`): `packQty` preenchido. `toProduct` gera `Nome (combo 3un)` com unidade `combo` e o preço exato do combo.
- **Linhas com mais de 500 caracteres** vão para `unparsed` (evita custo quadrático). `unparsed` aparece no status como "N linha(s) ignorada(s)".
- **Templates aprendidos** (`createTemplateStore`, `induceTemplate`): motor pronto e testado, mas **sem interface** no app. Se ligar, o regex é induzido de texto do usuário; ele já é escapado, e `induceTemplate` valida que reproduz a anotação.
- Mudou o parser? Rode `node tests/parser.test.js` e acrescente o caso novo ao `CORPUS`.

## Ícones

`ITEM_ICON_RULES` mapeia palavras-chave (sem acento, minúsculas) para emoji, com ~50 regras. **A primeira regra que casa vence**, então a ordem importa. O match é por palavra inteira (`matchesKeyword`, aceita plural com `s`/`es`; hífen e pontuação viram espaço), logo `sal` não casa em `salada` nem `cha` em `chantilly`. Variantes que não são plural (`pao` vs `paozinho`) precisam de keyword própria. Sem match, usa `getCategoryIcon`. O emoji vira um PNG 3D de `cdn.jsdelivr.net/gh/shuding/fluentui-emoji-unicode` (`emojiToExternalIconUrl`), então os ícones exigem internet.

## Mensagem de pedido

- Taxa de entrega fixa: `DELIVERY_FEE = 5.00` em `script.js`. O valor "R$ 5,00" em `#deliveryFee` no `index.html` é **texto estático separado**; altere os dois juntos.
- Pagamento: `<select id="pagamento">` com `PIX` e `Cartão de Crédito`.
- Formato: saudação, blocos `*CATEGORIA*` com `- nome, QTDunidade (R$ total)`, taxa, `*Total Geral*`, endereço e pagamento. A saudação segue a hora local (`getGreeting`: Bom dia < 12h, Boa tarde < 18h, Boa noite).
- Só entram no pedido itens marcados **e** com quantidade > 0 (`getCartItems`). Nome, categoria e endereço passam por `toSingleLine` (remove quebras e caracteres de controle).
- O botão "Limpar dados salvos" (`#clearDataBtn`) apaga todas as chaves `hortifruti_*` e reinicia a interface.
- O app não contém chave PIX (removida no commit `8467424`). Não a reintroduza no código.

## Convenções

- Sem módulos ES e sem bundler. A UI fica em `script.js`, dentro do `DOMContentLoaded`; o parser é o único arquivo à parte (`parser.js`, carregado antes por `<script>`) para poder ser testado em Node.
- Seções delimitadas por comentários numerados (`// 1. Storage Helpers`, `// 2. Parser Logic`, `// 3. Rendering & UI Management`, `// 4. Main Actions`, `// 5. Initial Hydration`).
- pt-BR em textos de interface, comentários e nomes de domínio (`produto`, `preco`, `quantidade`, `selecionado`, `categoria`).
- Tema via variáveis CSS em `:root` (`--primary: #16a34a`, `--accent: #2563eb`). Altere cores só ali.
- Mantenha zero dependências e zero build.
- Commits em português, no estilo já usado no histórico (`Corrigir ...`, `Adicionar ...`, `refactor: ...`).

## Armadilhas conhecidas

- O texto importado não é confiável. `renderItems` monta o DOM com `createElement`/`textContent`; não volte a usar `innerHTML` com dados do parser. Há também uma CSP via `<meta>` em `index.html` (`script-src 'self'`, `style-src 'self'`, `img-src` só `self` e `cdn.jsdelivr.net`): não adicione `<script>`/`<style>` inline, atributos `on*` nem `style="..."` no HTML. Atribuir `el.style.x` por JS é permitido.
- O carrinho é indexado pelo nome: nomes duplicados em categorias diferentes colidem.
- Leia objetos do `localStorage` sempre via `readStoredObject(key, fallback)`: ele tolera valor ausente, corrompido ou de tipo errado. Não use `JSON.parse(localStorage.getItem(...))` direto. A quantidade restaurada do carrinho só é aceita se for número finito >= 0.
- Mexer no CSS exige conferir 360px; houve vários commits de correção de overflow nessa largura.
