# Hortifruti Digital

Transforma a mensagem promocional de um hortifruti em um pedido pronto para enviar no WhatsApp.

Aplicação web estática em JavaScript puro: sem dependências, sem build, sem backend.

## Como funciona

1. **Importar:** cole o texto recebido do fornecedor, ou use "Ler da área de transferência".
2. **Selecionar:** os itens aparecem agrupados por categoria (Frutas, Legumes, Verduras etc.). Marque o que quer e ajuste a quantidade. Há busca, aba de promoções e filtro dos itens selecionados.
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

- Parser tolerante a formatos variados de preço e unidade (`8,00un.`, `R$4,99kg`, `kg R$ 4,99`, bandejas, maços, dúzias, caixas, litros).
- Detecção de promoções (preço entre asteriscos) e da data da promoção (`dd/mm/aaaa`).
- Ícones por produto (emoji 3D Fluent) com fallback por categoria.
- Persistência local: texto importado, carrinho, endereço e forma de pagamento sobrevivem ao recarregar a página. O botão "Limpar dados salvos" apaga tudo.
- Busca sem diferenciar acentos ("maca" acha "Maçã") e saudação pela hora (Bom dia, Boa tarde, Boa noite).
- Layout responsivo, incluindo telas de 360px.

## Uso

Abra `index.html` no navegador. Ou, com um servidor local:

```bash
python3 -m http.server 8080
```

Acesse `http://localhost:8080`.

A leitura da área de transferência exige HTTPS ou `localhost` e permissão do navegador. Os ícones são carregados de `cdn.jsdelivr.net`, então precisam de internet; sem ela, o restante funciona normalmente.

## Estrutura

```
index.html   marcação das 3 etapas
script.js    parser, estado, renderização e geração da mensagem
style.css    estilos e tema (variáveis CSS em :root)
favicon.svg  ícone
AGENTS.md    guia técnico detalhado para contribuidores e agentes de IA
```

## Configuração

- **Taxa de entrega:** constante `DELIVERY_FEE` em `script.js` (R$ 5,00). Atualize também o texto de `#deliveryFee` em `index.html`.
- **Formas de pagamento:** opções do `<select id="pagamento">` em `index.html`.
- **Ícones:** lista `ITEM_ICON_RULES` em `script.js`.

## Privacidade

Todos os dados ficam no `localStorage` do navegador. Nada é enviado a servidores, exceto o download dos ícones pela CDN. Em computador compartilhado, use "Limpar dados salvos".

## Limitações

- Não há testes automatizados.
- O carrinho é associado ao nome do produto: se o fornecedor alterar a grafia, a seleção é perdida.
- Itens do carrinho ausentes na lista nova são descartados ao processar.
