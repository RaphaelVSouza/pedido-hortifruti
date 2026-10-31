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

Não há testes automatizados, linter nem CI. Valide mudanças manualmente no navegador, incluindo em largura de 360px.

## Estrutura

| Arquivo | Conteúdo |
|---|---|
| `index.html` | Marcação das 3 etapas (Importar, Selecionar, Resumo) |
| `script.js` | Toda a lógica (~600 linhas), dentro de um único `DOMContentLoaded` |
| `style.css` | Estilos, variáveis CSS em `:root`, responsivo (breakpoints 1080/900/760/480/360px) |
| `favicon.svg` | Ícone |

## Fluxo de dados

```
textarea / clipboard → parseProducts() → allProducts[] → renderTabs/renderItems → updateTotals → generateMessage
```

1. `processContent(text, {source, saveToStorage})` chama `extractDate` e `parseProducts`, persiste o texto bruto e hidrata o carrinho a partir do `localStorage`.
2. `renderItems()` recria a lista de itens por completo a cada mudança (sem virtual DOM).
3. `updateTotals()` calcula subtotal e total e chama `generateMessage()`, que preenche o textarea `#finalMessage`.

Modelo de um produto: `{ id, nome, preco, unidade, promocao, categoria, quantidade, selecionado }`.

## Persistência (`localStorage`)

| Chave | Conteúdo |
|---|---|
| `hortifruti_prefs` | `{ endereco, pagamento }` |
| `hortifruti_cart` | mapa `nome do produto → quantidade` (somente itens selecionados; regravado a cada `processContent`, descartando nomes que não estão na lista atual) |
| `hortifruti_raw_text` | último texto colado |
| `hortifruti_last_update_ts` | ISO timestamp da última importação |
| `hortifruti_last_update_source` | `manual` ou `clipboard` |

O carrinho é indexado pelo **nome** do produto. Mudar a grafia no texto do fornecedor desfaz a seleção, e nomes duplicados colidem.

## Parser (`parseProducts`)

- **Categoria:** linha que casa com `categoryRegex` (`*FRUTAS*`, `#LEGUMES#`, `_VERDURAS_`). Itens antes de qualquer cabeçalho ficam em `Geral`.
- **Produto:** uma regex única, montada a partir de `UNIT_PATTERN`, que aceita a unidade antes ou depois do preço (`8,00un.`, `R$4,99kg`, `kg R$ 4,99`). Fallbacks: unidade após o preço, prefixo `Bdj` no nome, unidade colada no fim do nome.
- **Promoção:** trecho entre asteriscos contendo preço (`promoRegex`).
- **Preço:** formato brasileiro (`1,50` → `1.50`). Só entra produto com nome e preço > 0.
- **Unidades normalizadas** (`normalizeUnit`): `kg`, `un`, `bdj`, `pc`, `dz`, `lt`, `cx`, `maço`, `ml`.
- Linhas que começam com `http(s)://` são ignoradas.
- `UNIT_PATTERN` é duplicado como literal em um fallback dentro de `parseProducts`. Ao adicionar uma unidade, atualize os dois lugares e `normalizeUnit`.

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

- Sem módulos e sem imports. Tudo em `script.js`, dentro do `DOMContentLoaded`.
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
