# Governança — Hortifruti Digital

**Status:** rascunho para revisão do dono do repositório. Itens marcados **[A decidir]** dependem de decisão dele.

Base: COBIT 2019 (governança e gestão de TI) e ITIL 4 (gestão de serviços), aplicados com proporcionalidade ao porte do projeto: SPA estática, sem backend, um dono, agentes de IA como principais executores. Só entram práticas que têm artefato real no repositório. Não há CAB, SLA nem catálogo de serviços.

## 1. Escopo e objetivo

- **Escopo:** código, testes, documentação e decisões deste repositório. Fora do escopo: o fornecedor, o WhatsApp e o dispositivo do usuário.
- **Valor entregue:** transformar a lista do fornecedor em um pedido **correto** e rápido de enviar.
- **Cascata de objetivos (COBIT):**

| Objetivo do dono | Objetivo de TI | Controle neste repositório |
|---|---|---|
| Pedido sai com preço, unidade e quantidade corretos | Qualidade da solução (BAI03) | Corpus do parser, selo "⚠ conferir", testes de regressão |
| Nenhum dado do usuário sai do navegador | Segurança e privacidade (APO13, DSS05) | CSP, `textContent`, dados só em `localStorage` |
| O projeto evolui sem regressão | Gestão de mudanças (BAI06) e liberações (BAI07) | PR por mudança, ADR por decisão, CI (ADR-006) |
| Custo de manutenção baixo | Simplicidade (princípio ITIL) | Zero dependências de runtime e zero build |

## 2. Princípios

1. **Foco no valor:** uma mudança só entra se melhora o pedido gerado, a segurança ou a manutenção.
2. **Comece de onde está:** reaproveitar o que existe (`AGENTS.md`, ADRs, corpus de testes) antes de criar processo.
3. **Progresso iterativo:** um PR por ADR, em rascunho, mudança pequena e reversível.
4. **Simples e prático:** documento curto, tabela em vez de texto corrido, sem burocracia que o dono não vá cumprir.
5. **Transparência:** decisões, riscos e exceções ficam por escrito no repositório.
6. **Automatizar depois de medir:** CI e métricas entram quando há o que medir.
7. **Quem implementa não aprova sozinho:** a decisão de direção e o aceite de risco são do dono.

## 3. Papéis (RACI)

R = executa, A = responde pelo resultado, C = consultado, I = informado.

| Atividade | Dono | Agente de IA | Fornecedor | Usuário final |
|---|---|---|---|---|
| Definir escopo e prioridade | A/R | C | — | C |
| Registrar decisão (ADR) | A | R | — | — |
| Implementar mudança | A | R | — | — |
| Revisar e fazer merge | A/R | R apenas sob instrução explícita (ver 4.3) | — | — |
| Aceitar risco | A/R | C | — | I |
| Fornecer amostras reais de lista | A/R | I | C | — |
| Apagar dados, branches ou histórico | A/R | R apenas sob instrução explícita | — | — |

## 4. Política de mudança (COBIT BAI06 / ITIL Change enablement)

### 4.1 Classes

| Classe | Exemplo | Exigências |
|---|---|---|
| Padrão (baixo risco) | Texto de documentação, caso novo no corpus | PR em rascunho; `node tests/parser.test.js` verde |
| Normal | Mudança de comportamento do parser, da mensagem ou da persistência | ADR (ou ADR existente citado); teste que reproduz o caso **antes** da correção; `AGENTS.md` e `README.md` atualizados; 360px conferido se mexer em CSS |
| Alto risco | Mudança de formato de `localStorage`, de CSP, de envio ao WhatsApp, de cálculo do total | Tudo da classe normal, mais migração testada, plano de reversão no PR e aprovação explícita do dono antes do merge |
| Emergência | Pedido sendo gerado errado em uso real | Correção mínima com teste de regressão; ADR ou nota registrada **depois**, no mesmo dia |

### 4.2 Regras do repositório (já vigentes nos ADRs)

- Mudança de comportamento do parser exige caso novo no corpus antes da correção; bug corrigido exige teste que o reproduz.
- Chave nova de `localStorage` usa prefixo `hortifruti_` e sufixo de versão; mudança de formato migra o anterior.
- A CSP só pode ser ampliada com justificativa no PR. Proibido `innerHTML` com dado do usuário, `eval`, `new Function`, script ou `style=""` inline.
- Mantém zero dependências de runtime e zero build.

### 4.3 Aprovação e merge

- Regra padrão: **o merge é do dono**. O agente abre o PR em rascunho e para.
- Exceção: o dono pode instruir o merge explicitamente, por PR ou por sessão. A instrução vale só para o que foi pedido e fica registrada na conversa ou no PR.
- **[A decidir]** Autorizar o agente a fazer merge sozinho em mudanças da classe "Padrão" quando a CI de testes estiver verde? Recomendação: sim, só depois de existir CI (ADR-006); antes disso, não.

## 5. Registro de riscos (COBIT APO12 / ITIL Risk)

Probabilidade (P) e impacto (I): A/M/B. São estimativas iniciais para o dono validar. Evidências vêm do inventário da `main` em `d0ec8bb`.

| ID | Risco | Evidência | P | I | Tratamento | Dono do tratamento |
|---|---|---|---|---|---|---|
| R1 | Reimportação sem produtos deixa a lista antiga na tela e zera o carrinho | `script.js:491-496` | M | M | Mitigar: ADR-005 | Dono |
| R2 | Nomes iguais em categorias diferentes colidem no carrinho | `script.js:44` (chave = nome) | M | M | Mitigar: ADR-008 | Dono |
| R3 | Item marcado com quantidade 0 some do pedido sem aviso | `script.js:419-420`, `getCartItems` | M | M | Mitigar: ADR-005 | Dono |
| R4 | Pedido errado chega ao fornecedor (preço ou unidade mal lidos; unidade ausente vira `un`) | `script.js:287`, parser heurístico | M | A | Mitigar: selo "⚠ conferir", corpus, ADR-009 e 015; aceitar o resíduo | Dono |
| R5 | Ícones dependem de CDN comunitária; sem rede somem | `script.js:146-153` | M | B | Mitigar: ADR-012 e 013 | Dono |
| R6 | Não há CI de testes; só o GitGuardian | PR #8: único check | A | M | Mitigar: ADR-006 | Dono |
| R7 | Testes de XSS e CSP não estão versionados | Executados à mão no PR #8 | M | A | Mitigar: ADR-006 | Dono |
| R8 | Taxa de entrega e pagamentos fixos no código | `script.js:23`, `index.html:82-85`, `:92`, `:95` | M | M | Mitigar: ADR-010 | Dono |
| R9 | Endereço e lista ficam no `localStorage` em computador compartilhado | `hortifruti_prefs`, `hortifruti_raw_text` | B | M | Mitigar: botão "Limpar dados salvos"; ADR-005 (limpeza por prefixo) | Dono |
| R10 | Total exibido deixa de ser exato com pedido por unidade em item por kg | ADR-016 (futuro) | M | M | Mitigar: rótulo "estimado" no total | Dono |
| R11 | Mudança feita por agente sem revisão humana | Uso corrente de agentes | M | A | Mitigar: política 4.3, PR em rascunho, CI | Dono |
| R12 | Dados pessoais de terceiros entram no repositório (exportação real do WhatsApp) | ADR-015 | B | A | Evitar: só linhas de produto no corpus; `tests/anonymize.js` (ADR-006) | Dono |

Revisar o registro a cada ADR implementado: fechar o risco tratado, reavaliar P e I dos demais e abrir os novos.

## 6. Dados e privacidade (COBIT APO14 / DSS05)

- **Princípio:** nenhum dado do usuário sai do navegador, exceto a mensagem que ele mesmo envia pelo WhatsApp.
- **Inventário atual:** endereço e forma de pagamento (`hortifruti_prefs`), texto da lista (`hortifruti_raw_text`), carrinho (`hortifruti_cart`), data e origem da importação.
- **Retenção:** até o usuário usar "Limpar dados salvos" ou limpar os dados do navegador.
- **Requisição externa hoje:** somente o download dos ícones em `cdn.jsdelivr.net`. Some com o ADR-012.
- **ADR-014 (histórico de preços)** passa a guardar mais dados locais: manter local, com limite de 10 snapshots por fornecedor.
- **[A decidir]** O app vai ser usado por outras pessoas além do dono? Se sim, avaliar com apoio jurídico as obrigações da LGPD (aviso de uso de dados, base legal, direito de exclusão). Este documento não faz parecer jurídico.

## 7. Incidentes e problemas (ITIL Incident / Problem management)

- **Incidente:** pedido gerado ou enviado com dado errado, ou falha que impede gerar o pedido.
  1. Contenção: se for lista específica, orientar a conferir manualmente; se for regressão, reverter o PR.
  2. Registro: issue com a entrada que reproduz (anonimizada), a saída obtida e a esperada.
  3. Correção: caso novo no corpus que reproduz o erro, depois a correção.
- **Problema (causa raiz):** erro que se repete ou que revela uma classe de falha (por exemplo, "unidade ausente vira `un`") vira ADR ou risco no registro.
- **Aprendizado:** o caso de teste e a linha no registro de riscos são o resultado obrigatório de todo incidente.

## 8. Melhoria contínua e métricas (COBIT MEA01 / ITIL Continual improvement)

| Métrica | Fonte | Uso |
|---|---|---|
| Cenários do corpus passando / total | `node tests/parser.test.js` | Regressão |
| % de linhas de produto em `unparsed` num corpus real | Corpus de fornecedor (ADR-006) | Gatilho do ADR-002 (reavaliar IA se > 5%) |
| Casos `PEND` no corpus | Saída dos testes | Dívida conhecida (ex.: ADR-015 regra 2) |
| Risco aberto de alta severidade | Seção 5 | Priorização |
| Tempo entre PR aberto e merge | GitHub | Fluxo |

Medir só o que a ferramenta já entrega. Métricas de uso real exigiriam coletar dados do usuário, o que contraria a seção 6.

## 9. Mapeamento COBIT e ITIL

| Prática | COBIT 2019 | ITIL 4 | Artefato |
|---|---|---|---|
| Direção e decisões | EDM01, EDM02 | Direct | Este documento, `docs/ADR.md` |
| Arquitetura | APO03 | Plan | `docs/ADR.md` |
| Conhecimento e padrões | APO01 | Knowledge management | `AGENTS.md`, `README.md` |
| Riscos | EDM03, APO12 | Risk (Direct/Plan) | Seção 5 |
| Segurança | APO13, DSS05 | Information security management | CSP, ADR-006 |
| Mudança e liberação | BAI06, BAI07 | Change enablement, Release management | PRs, seção 4 |
| Qualidade da solução | BAI03 | Software development and management | Corpus, e2e |
| Incidente e problema | DSS02, DSS03 | Incident, Problem management | Seção 7 |
| Monitoramento | MEA01 | Continual improvement | Seção 8 |

## 10. Revisão deste documento

- Revisar ao concluir cada fase da sequência dos ADRs (estabilidade, fundação de dados, produto) e ao mudar de dono ou de público.
- Alteração deste documento é mudança de classe normal: PR em rascunho, aprovação do dono.

## 11. Decisões pendentes

1. Política de merge pelo agente (4.3).
2. Público do app e obrigações de privacidade (6).
3. Validar as estimativas de P e I do registro de riscos (5).
