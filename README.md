# Hortifruti Digital

Transforma a mensagem promocional de um hortifruti em um pedido pronto para enviar no WhatsApp.

Aplicação web estática em JavaScript puro: sem dependências, sem build, sem backend.

**Demo:** https://raphaelvsouza.github.io/pedido-hortifruti/ (instalável como PWA e funciona offline).

## Como funciona

1. **Importar:** cole o texto recebido do fornecedor, ou use "Ler da área de transferência".
2. **Selecionar:** os itens aparecem agrupados por categoria (Frutas, Legumes, Verduras etc.). Marque o que quer e ajuste a quantidade (kg aceita decimal; as demais unidades, números inteiros; quantidade vazia ou abaixo do mínimo desmarca o item ao sair do campo). Há busca, aba de promoções e filtro dos itens selecionados.
3. **Enviar:** informe endereço e forma de pagamento (PIX ou Cartão de Crédito), confira subtotal e total e copie a mensagem formatada.

Exemplo de entrada:

```
🍉 *FRUTAS*
Melancia Baby 8,00un.
Banana prata R$4,99kg

🎃 *LEGUMES*
Abóbora moranga R$4,99kg
```

Saída:

```
Bom dia, tudo bem? Gostaria de fazer um pedido:

*FRUTAS*
- Melancia Baby, 1un (R$ 8,00)
- Banana prata, 2kg (R$ 9,98)

Taxa de entrega: R$ 5,00
*Total Geral: R$ 22,98*

📍 *Endereço:* Rua Exemplo, 123
💳 *Pagamento:* PIX
```

## Recursos

- Parser tolerante a formatos variados: `8,00un.`, `R$4,99kg`, `kg R$ 4,99`, pontilhado, bullets, preço antes do nome, `5 reais`, "de X por Y", combos (`3 por R$ 10`), vários itens por linha e cabeçalhos de categoria com ou sem marcação. Ignora linhas operacionais (taxa, PIX, telefone) e avisa quantas linhas não reconheceu.
- Detecção de promoções (preço entre asteriscos) e da data da promoção (`dd/mm/aaaa`).
- Ícones próprios locais em SVG por produto (catálogo flat sem CDN) com fallback por categoria, e emojis nativos na mensagem do WhatsApp.
- Persistência local: texto importado, carrinho, endereço e forma de pagamento sobrevivem ao recarregar a página. O botão "Limpar dados salvos" apaga tudo que o app guardou. Reimportar um texto sem produtos mantém a lista e o carrinho anteriores.
- Busca sem diferenciar acentos ("maca" acha "Maçã") e saudação pela hora (Bom dia, Boa tarde, Boa noite).
- Layout responsivo, incluindo telas de 360px.
- PWA instalável com Service Worker (cache offline), conforme ADR-013.
- Perfis de fornecedor (telefone, taxa de entrega, formas de pagamento), histórico de variação de preços e envio direto pelo WhatsApp (`wa.me`).

## Uso

Abra `index.html` no navegador. Ou, com um servidor local:

```bash
python3 -m http.server 8080
```

Acesse `http://localhost:8080`.

A leitura da área de transferência exige HTTPS ou `localhost` e permissão do navegador. Os ícones são locais (SVG), funcionando 100% offline.

## Estrutura

```
index.html       marcação das 3 etapas
parser.js        parser de listas (testável em Node, sem acesso ao DOM)
script.js        estado, renderização e geração da mensagem
sw.js            Service Worker (suporte offline)
manifest.json    manifesto do PWA
data/            tabela de peso médio por unidade (itens vendidos por kg)
icons/           catálogo de ícones SVG locais e emojis do WhatsApp
tests/           testes do parser (Node) e testes de navegador (Playwright)
types/           declarações de tipos para a checagem estática (JSDoc + tsc)
docs/            decisões de arquitetura (ADR) e governança
style.css        estilos e tema (variáveis CSS em :root)
favicon.svg      ícone
AGENTS.md        guia técnico detalhado para contribuidores e agentes de IA
```

## Configuração

- **Taxa de entrega e formas de pagamento:** definidas por fornecedor, no painel de configuração do app (padrão: R$ 5,00, PIX e Cartão de Crédito). O valor padrão está em `DEFAULT_DELIVERY_FEE`, em `script.js`.
- **Ícones:** catálogo em `icons/catalog.json` e arquivos em `icons/custom/`. O casamento por palavra-chave é montado em `ITEM_ICON_RULES`, em `script.js`.

## Privacidade

Todos os dados ficam no `localStorage` do navegador. O app não tem backend nem faz chamadas a serviços externos; o envio pelo WhatsApp só ocorre quando você abre o link `wa.me`. Em computador compartilhado, use "Limpar dados salvos".

## Limitações

- Testes automáticos: parser e suíte ponta a ponta no navegador (`npm test`, ou `npm run test:parser` e `npm run test:e2e`). Validado continuamente no CI (GitHub Actions). O restante dos refinamentos visuais é conferido manualmente em 360px.
- Preço inteiro sem `R$` (`Alface 3`) só é aceito quando a lista toda é escrita assim; itens lidos com pouca certeza aparecem com o selo "⚠ conferir".
- O carrinho é associado ao nome do produto: se o fornecedor alterar a grafia, a seleção é perdida.
- Itens do carrinho ausentes na lista nova permanecem marcados como "indisponível nesta lista", fora do total e da mensagem, até você removê-los.
