// Teste de regressão por corpus (golden tests). Rodar: node tests/parser.test.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const P = require('../parser.js');

const CORPUS = [
  {
    id: 'A - formato do README (preço colado na unidade, promo em *)',
    text: `🍉 *FRUTAS*
Melancia Baby 8,00un.
Banana prata R$4,99kg
Mamão formosa *R$3,99kg*

🎃 *LEGUMES*
Abóbora moranga R$4,99kg
Batata inglesa kg R$ 4,99
Cebola 3,49 o kg`,
    expect: [
      ['Melancia Baby', 8, 'un', 'FRUTAS'],
      ['Banana prata', 4.99, 'kg', 'FRUTAS'],
      ['Mamão formosa', 3.99, 'kg', 'FRUTAS', { promo: true }],
      ['Abóbora moranga', 4.99, 'kg', 'LEGUMES'],
      ['Batata inglesa', 4.99, 'kg', 'LEGUMES'],
      ['Cebola', 3.49, 'kg', 'LEGUMES'],
    ],
  },
  {
    id: 'B - pontilhado, bullets, maço/bandeja, tamanho no nome',
    text: `*HORTIFRUTI DONA MARIA* 🥬
Ofertas válidas até 02/11/2026

*VERDURAS*
• Alface crespa .......... R$ 2,50 maço
• Couve manteiga ......... R$ 3,00 mç
• Cheiro verde ........... 2,00/maço
*FRUTAS*
• Morango bandeja ........ R$ 7,99
• Uva Thompson 500g ...... R$ 9,99
• Ovos brancos 30un ...... R$ 19,90`,
    promoDate: '02/11/2026',
    expect: [
      ['Alface crespa', 2.5, 'maco', 'VERDURAS'],
      ['Couve manteiga', 3, 'maco', 'VERDURAS'],
      ['Cheiro verde', 2, 'maco', 'VERDURAS'],
      ['Morango', 7.99, 'bandeja', 'FRUTAS'],
      ['Uva Thompson 500g', 9.99, null, 'FRUTAS'],
      ['Ovos brancos 30un', 19.9, null, 'FRUTAS'],
    ],
  },
  {
    id: 'C - de/por, riscado, combos',
    text: `🔥 PROMOÇÕES DE SÁBADO 🔥
Banana nanica de 5,99 por 3,99 o kg
Tomate italiano ~R$ 8,99~ *R$ 5,99* kg
Abacate 3 por R$ 10,00
Morango 2 bandejas por R$ 15
Limão tahiti R$ 2,99/kg`,
    expect: [
      ['Banana nanica', 3.99, 'kg', null, { oldPrice: 5.99, promo: true }],
      ['Tomate italiano', 5.99, 'kg', null, { oldPrice: 8.99, promo: true }],
      ['Abacate', 10, null, null, { packQty: 3 }],
      ['Morango', 15, 'bandeja', null, { packQty: 2 }],
      ['Limão tahiti', 2.99, 'kg', null, { promo: true }],
    ],
  },
  {
    id: 'D - vários itens por linha, cabeçalho inline',
    text: `FRUTAS: Banana 4,99 | Maçã gala 9,90 | Pera 12,90
Laranja pera 2,99kg  Mexerica 5,99kg`,
    expect: [
      ['Banana', 4.99, null, 'FRUTAS'],
      ['Maçã gala', 9.9, null, 'FRUTAS'],
      ['Pera', 12.9, null, 'FRUTAS'],
      ['Laranja pera', 2.99, 'kg', 'FRUTAS'],
      ['Mexerica', 5.99, 'kg', 'FRUTAS'],
    ],
  },
  {
    id: 'E - nome e preço em linhas separadas (estilo e-commerce copiado)',
    text: `Abacate 430g
‌
Peso médio 0.43 kg/un Valor do kg: R$ 4,49
Melancia Amarela 4,49kg
Peso médio 4.49 kg/un Valor do kg: R$ 6,99
Chuchu Unidade
Peso médio 0.37 kg/un Valor do kg: R$ 3,99`,
    expect: [
      ['Abacate 430g', 4.49, 'kg'],
      ['Melancia Amarela 4,49kg', 6.99, 'kg'],
      ['Chuchu Unidade', 3.99, 'kg'],
    ],
  },
  {
    id: 'F - preço antes do nome, "reais", numeração, dúzia',
    text: `Lista de hoje:
1. R$ 3,50 - Alface americana (pé)
2. 5 reais - Abacaxi pérola cada
3. Pimentão verde - 6,99 kg
4. Ovo caipira dz 15,00
5. Alho 400g (cabeça) 3,00 un`,
    expect: [
      ['Alface americana (pé)', 3.5, 'un'],
      ['Abacaxi pérola', 5, 'un'],
      ['Pimentão verde', 6.99, 'kg'],
      ['Ovo caipira', 15, 'duzia'],
      ['Alho 400g (cabeça)', 3, 'un'],
    ],
  },
  {
    id: 'G - emoji por item, barra, penca, combo sem R$',
    text: `🥕 Cenoura 3,99/kg
🥔 Batata doce 4,49/kg
🍌 Banana prata penca 6,99
🥬 Rúcula 3,50 o maço
🍓 Morango 2 por 15,00`,
    expect: [
      ['Cenoura', 3.99, 'kg'],
      ['Batata doce', 4.49, 'kg'],
      ['Banana prata', 6.99, 'penca'],
      ['Rúcula', 3.5, 'maco'],
      ['Morango', 15, null, null, { packQty: 2 }],
    ],
  },
  {
    id: 'H - "=" e "-" como separador, cabeçalho sem marcação',
    text: `LEGUMES
Abobrinha = 4,99 kg
Berinjela = 5,49 kg
Quiabo bdj = 6,00
VERDURAS
Espinafre - mç - 4,00
Salsinha/cebolinha 2,50 maço`,
    expect: [
      ['Abobrinha', 4.99, 'kg', 'LEGUMES'],
      ['Berinjela', 5.49, 'kg', 'LEGUMES'],
      ['Quiabo', 6, 'bandeja', 'LEGUMES'],
      ['Espinafre', 4, 'maco', 'VERDURAS'],
      ['Salsinha/cebolinha', 2.5, 'maco', 'VERDURAS'],
    ],
  },
  {
    id: 'I - ruído operacional (não pode virar item)',
    text: `Bom dia! Segue nossa lista 🍅
Pedidos até 10h pelo (11) 98765-4321
Taxa de entrega R$ 5,00
Chave PIX: hortifruti@email.com
Pedido mínimo R$ 30,00
Mandioca descascada R$ 7,90 kg`,
    expect: [['Mandioca descascada', 7.9, 'kg']],
  },
  {
    id: 'N - bandeja como unidade (grafias, posição e combo)',
    text: `*FRUTAS*
Morango bandeja R$ 7,99
Uva Bdj. 8,50
Amora 6,00 bdj
Framboesa R$ 9,90/bandeja
Mirtilo bj R$ 12,00
Cereja Band 5,00
Morango 2 bandejas por R$ 15
Tomate cereja 250g bandeja R$ 6,99`,
    expect: [
      ['Morango', 7.99, 'bandeja', 'FRUTAS'],
      ['Uva', 8.5, 'bandeja', 'FRUTAS'],
      ['Amora', 6, 'bandeja', 'FRUTAS'],
      ['Framboesa', 9.9, 'bandeja', 'FRUTAS'],
      ['Mirtilo', 12, 'bandeja', 'FRUTAS'],
      ['Cereja', 5, 'bandeja', 'FRUTAS'],
      ['Morango', 15, 'bandeja', 'FRUTAS', { packQty: 2 }],
      ['Tomate cereja 250g', 6.99, 'bandeja', 'FRUTAS'],
    ],
  },
  {
    id: 'O - palavra de unidade solta no nome: infere a unidade e mantém a palavra',
    text: `Bandeja de morango R$ 8,00
BANDEJA Rúcula R$ 4,50
Maço de cheiro verde R$ 2,00
Caixa de ovos R$ 12,00
Dúzia de ovos R$ 9,00
Pacote de cogumelo R$ 8,00
Morango bandeja R$ 8,00`,
    expect: [
      ['Bandeja de morango', 8, 'bandeja'],
      ['BANDEJA Rúcula', 4.5, 'bandeja'],
      ['Maço de cheiro verde', 2, 'maco'],
      ['Caixa de ovos', 12, 'caixa'],
      ['Dúzia de ovos', 9, 'duzia'],
      ['Pacote de cogumelo', 8, 'pacote'],
      ['Morango', 8, 'bandeja'],
    ],
  },
  {
    id: 'P - abreviação de unidade no início do nome (ADR-015 regra 2)',
    text: `Bdj. Quiabo R$ 7,99
Bdj Quiabo R$ 7,99
Cx. Morango R$ 20,00
Mç. Cheiro verde R$ 2,00
Pct. Cogumelo R$ 8,00
Kg quiabo R$ 7,99
Un. Abacaxi R$ 5,00
Kg de tomate R$ 5,00
Mc. Alface R$ 3,00`,
    expect: [
      ['Quiabo', 7.99, 'bandeja'],
      ['Quiabo', 7.99, 'bandeja'],
      ['Morango', 20, 'caixa'],
      ['Cheiro verde', 2, 'maco'],
      ['Cogumelo', 8, 'pacote'],
      ['quiabo', 7.99, 'kg'],
      ['Abacaxi', 5, 'un'],
      ['tomate', 5, 'kg'],
      ['Alface', 3, 'maco'],
    ],
  },
  {
    id: 'R1-1 - a partir de (ADR-015 regra 1)',
    text: 'Sucos variados a partir de R$ 10,00 (450ml)',
    expect: [
      ['Sucos variados (450ml)', 10, null, null, { fromPrice: true }],
    ],
  },
  {
    id: 'R1-3 - $ isolado e unidade na linha seguinte (ADR-015 regra 3)',
    text: 'Ameixa $ *10,99*\nkg',
    expect: [
      ['Ameixa', 10.99, 'kg', null, { promo: true }],
    ],
  },
  {
    id: 'R1-4 - combo escalonado com tiers (ADR-015 regra 4)',
    text: 'Abacaxi 1 por R$ 3,00 e 2 por R$ 5,00',
    expect: [
      ['Abacaxi', 3, null, null, { tiers: [{ qty: 1, price: 3 }, { qty: 2, price: 5 }] }],
    ],
  },
  {
    id: 'R1-5 - R isolado antes de 2 decimais (ADR-015 regra 5)',
    text: 'Couve R 2,99',
    expect: [
      ['Couve', 2.99, null],
    ],
  },
  {
    id: 'R1-6 - kgg aceito como kg (ADR-015 regra 6)',
    text: 'Abóbora moranga R$5,99kgg',
    expect: [
      ['Abóbora moranga', 5.99, 'kg'],
    ],
  },
  {
    id: 'R1-7 - data isolada e termos operacionais como ruído (ADR-015 regra 7)',
    text: `22/08/2025
Tabela de preços:
Entre na nossa comunidade pelo link:
Banana prata R$ 4,99kg`,
    promoDate: '22/08/2025',
    unparsed: 0,
    expect: [
      ['Banana prata', 4.99, 'kg'],
    ],
  },
  {
    id: 'R1-8 - remover de/por/a colados a parêntese (ADR-015 regra 8)',
    text: 'Suco de uva (1lt)de R$ 12,00',
    expect: [
      ['Suco de uva (1lt)', 12, null],
    ],
  },
];

// Carregamento automático de fixtures de corpus real (tests/corpus/*.txt + *.expected.json)
const corpusDir = path.join(__dirname, 'corpus');
if (fs.existsSync(corpusDir)) {
  for (const file of fs.readdirSync(corpusDir).sort()) {
    if (file.endsWith('.txt')) {
      const base = file.slice(0, -4);
      const expectedFile = path.join(corpusDir, `${base}.expected.json`);
      if (fs.existsSync(expectedFile)) {
        const text = fs.readFileSync(path.join(corpusDir, file), 'utf8');
        const data = JSON.parse(fs.readFileSync(expectedFile, 'utf8'));
        const items = data.items || data.expect || (Array.isArray(data) ? data : []);
        const entry = {
          id: `Corpus real: ${base}`,
          text,
          expect: items.map((it) => {
            if (Array.isArray(it)) return it;
            const { name, price, unit, category, ...extra } = it;
            return Object.keys(extra).length
              ? [name, price, unit, category, extra]
              : [name, price, unit, category];
          }),
        };
        if (data.promoDate !== undefined) entry.promoDate = data.promoDate;
        if (data.unparsedCount !== undefined) entry.unparsed = data.unparsedCount;
        if (data.unparsed !== undefined) entry.unparsed = data.unparsed;
        if (data.pending !== undefined) entry.pending = data.pending;
        CORPUS.push(entry);
      }
    }
  }
}

let fail = 0;
let total = 0;
for (const c of CORPUS) {
  const r = P.parse(c.text);
  const got = r.items.map((i) => [i.name, i.price, i.unit, i.category]);
  const errs = [];
  if (r.items.length !== c.expect.length) errs.push(`esperado ${c.expect.length} itens, obtido ${r.items.length}`);
  c.expect.forEach((e, k) => {
    const it = r.items[k];
    total++;
    if (!it) return;
    const [name, price, unit, cat, extra] = e;
    const bad = [];
    if (it.name !== name) bad.push(`nome "${it.name}"`);
    if (it.price !== price) bad.push(`preço ${it.price}`);
    if (it.unit !== unit) bad.push(`unidade ${it.unit}`);
    if (cat !== undefined && cat !== null && it.category !== cat) bad.push(`categoria ${it.category}`);
    if (extra) for (const [k2, v] of Object.entries(extra)) {
      if (typeof v === 'object' && v !== null) {
        if (JSON.stringify(it[k2]) !== JSON.stringify(v)) bad.push(`${k2}=${JSON.stringify(it[k2])}`);
      } else if (it[k2] !== v) bad.push(`${k2}=${it[k2]}`);
    }
    if (bad.length) errs.push(`  [${k}] ${name}: ${bad.join(', ')}`);
  });
  if (c.promoDate && r.promoDate !== c.promoDate) errs.push(`promoDate ${r.promoDate}`);
  if (c.unparsed !== undefined && r.unparsed.length !== c.unparsed) errs.push(`unparsed esperado ${c.unparsed}, obtido ${r.unparsed.length}`);
  if (c.pending) {
    // Falha esperada: não conta como erro. Se passar, o marcador está obsoleto e deve ser removido.
    if (errs.length) { console.log(`PEND ${c.id} [${c.pending}]`); continue; }
    fail++;
    console.log(`FAIL ${c.id} passou: remova "pending" (${c.pending})`);
    continue;
  }
  const ok = !errs.length;
  if (!ok) fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${c.id}`);
  if (!ok) { console.log(errs.join('\n')); console.log('  obtido:', JSON.stringify(got)); }
  if (r.unparsed.length) console.log('  não reconhecidas:', JSON.stringify(r.unparsed.map((u) => u.line)));
}

// ---- Aprendizado por exemplo (template induzido em tempo real)
{
  const store = P.createTemplateStore(null);
  const odd = `Jaca inteira ---> 15 conto
Pinha --> 12 conto
Caju (bdj) ----> 9 conto`;
  const before = P.parse(odd);
  store.learn('Jaca inteira ---> 15 conto', { name: 'Jaca inteira', price: '15' });
  const after = P.parse(odd, { templates: store.list() });
  const names = after.items.map((i) => `${i.name}=${i.price}`);
  const ok = JSON.stringify(names) === JSON.stringify(['Jaca inteira=15', 'Pinha=12', 'Caju (bdj)=9']) &&
    after.items.every((i) => i.source === 'template');
  if (!ok) fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} J - template induzido de 1 exemplo generaliza para o fornecedor`);
  console.log('  antes :', before.items.map((i) => `${i.name}=${i.price}`));
  console.log('  depois:', names);
  console.log('  regex :', store.list()[0].source);
}

// ---- Robustez: linha gigante não pode travar nem virar item
{
  const t0 = Date.now();
  const r = P.parse('a1,'.repeat(20000) + '\nBanana 4,99kg');
  const ms = Date.now() - t0;
  const ok = ms < 500 && r.items.length === 1 && r.items[0].name === 'Banana' && r.unparsed.length === 1;
  if (!ok) fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} K - linha gigante é descartada rápido (${ms}ms)`);
}

// ---- Inteiro sem moeda (D1): regra por documento, faixa plausível, baixa confiança
{
  const names = (txt) => { const r = P.parse(txt); return [r.items.map((i) => `${i.name}=${i.price}`), r.unparsed.length, r]; };
  const cases = [
    ['L1 - lista sem R$ aceita inteiros', 'Alface 3\nCoentro 2\nCouve 4', ['Alface=3', 'Coentro=2', 'Couve=4'], 0],
    ['L2 - fornecedor com R$ em tudo rejeita inteiro solto', 'Banana R$ 4,99\nMaçã R$ 5,99\nlinha sem nada 123', ['Banana=4.99', 'Maçã=5.99'], 1],
    ['L3 - inteiro > 200 sem moeda vai para unparsed', 'Alface 250\nCoentro 2', ['Coentro=2'], 1],
    ['L4 - "reais" e unidade tornam o inteiro válido', 'Banana R$ 4,99\nAbacaxi 5 reais\nCebola 3 un', ['Banana=4.99', 'Abacaxi=5', 'Cebola=3'], 0],
  ];
  for (const [id, txt, want, nUnp] of cases) {
    const [got, unp] = names(txt);
    const ok = JSON.stringify(got) === JSON.stringify(want) && unp === nUnp;
    if (!ok) { fail++; console.log('  obtido:', got, 'unparsed', unp); }
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${id}`);
  }
  const lo = P.parse('Alface 3\nCoentro 2').items[0].confidence;
  const hi = P.parse('Banana R$ 4,99kg').items[0].confidence;
  const ok = lo < 0.5 && hi >= 0.5;
  if (!ok) fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} L5 - confiança: inteiro pelado < 0,5 (${lo}); preço com R$ >= 0,5 (${hi})`);
}

// ---- Linearidade da extração, sem depender do limite de linha
{
  const time = (n) => { const l = 'a1,'.repeat(n); const t0 = Date.now(); P.analyzeLine(l); return Date.now() - t0; };
  time(2000); // aquece
  const small = Math.max(time(10000), 1);
  const big = time(40000);
  const ok = big < 1500 && big / small < 12; // linear ~4x; quadrático ~16x
  if (!ok) fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} M - extração linear (10k: ${small}ms, 40k: ${big}ms)`);
}

console.log(`\n${CORPUS.length + 2 + 6 - fail}/${CORPUS.length + 2 + 6} cenários OK, ${total} itens verificados`);
process.exitCode = fail ? 1 : 0;
