# Corpus Real — Hortifruti Digital

Diretório para armazenamento de mensagens promocionais reais recebidas de fornecedores de hortifruti (WhatsApp) e seus respectivos resultados esperados de parsing, conforme definido no [ADR-006](../../docs/ADR.md#adr-006--testes-de-navegador-versionados-e-ci).

## Convenção de nomenclatura

Cada caso de teste do corpus real é composto por um par de arquivos com o mesmo prefixo:

1. **Entrada textual bruta (higienizada):**
   `<fornecedor>-<aaaa-mm-dd>.txt`
   Exemplo: `hortifruti-vila-2026-10-31.txt`

2. **Resultado esperado da extração:**
   `<fornecedor>-<aaaa-mm-dd>.expected.json`
   Exemplo: `hortifruti-vila-2026-10-31.expected.json`

### Regras de nomenclatura
- `<fornecedor>`: identificador curto do estabelecimento em minúsculas, sem acentos, palavras separadas por hífen (kebab-case).
- `<aaaa-mm-dd>`: data da lista ou de vigência da promoção no padrão ISO.

## Privacidade e Higienização Obrigatória

Nenhum dado pessoal ou operacional sensível do fornecedor ou de clientes deve ser commitado no repositório (em conformidade com a política de privacidade da governança do projeto, COBIT APO14 / DSS05).

Antes de adicionar qualquer nova mensagem ao corpus, é **obrigatório** passar o texto original pelo script `tests/anonymize.js`.

### Como higienizar uma mensagem

Execute via CLI:

```bash
node tests/anonymize.js <caminho/arquivo-bruto.txt> tests/corpus/<fornecedor>-<aaaa-mm-dd>.txt
```

Ou diretamente no terminal (saída padrão):

```bash
node tests/anonymize.js <caminho/arquivo-bruto.txt>
```

### O que o script remove
- **Telefones:** números fixos ou móveis, com ou sem DDD, isolados ou precedidos por rótulos (`WhatsApp`, `Tel`, `Zap`).
- **Chaves PIX:** CPFs, CNPJs, e-mails, chaves aleatórias (UUID) e linhas com dados bancários/PIX.
- **E-mails:** quaisquer endereços eletrônicos.
- **Links:** URLs gerais, links diretos (`wa.me`) e links de convite para grupos de WhatsApp (`chat.whatsapp.com`).
- **Endereços:** logradouros (`Rua`, `Av.`, `Travessa`), números prediais e CEPs.

### Validação de segurança estrita
O script `tests/anonymize.js` executa uma verificação final após a remoção. Se for detectado qualquer telefone ou e-mail residual não tratado, o processo **lança erro imediatamente** e aborta sem gravar o arquivo, garantindo que nenhum PII escape inadvertidamente.

## Estrutura do arquivo `.expected.json`

O arquivo JSON descreve os itens que o parser deve reconhecer e as métricas esperadas:

```json
{
  "promoDate": "31/10/2026",
  "items": [
    {
      "name": "Banana prata",
      "price": 4.99,
      "unit": "kg",
      "category": "FRUTAS",
      "promo": true
    },
    {
      "name": "Morango",
      "price": 15.00,
      "unit": "bandeja",
      "category": "FRUTAS",
      "packQty": 2
    }
  ],
  "unparsedCount": 0
}
```
