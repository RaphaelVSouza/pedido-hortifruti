// Testes de navegador do estado do app (ADR-005). Rodar: node tests/e2e/estado.test.js
// Requer o módulo `playwright` instalado (o ADR-006 formaliza package.json e CI). Sem rede: o CDN dos ícones é bloqueado.
const path = require('path');
const { chromium } = require('playwright');

const URL = 'file://' + path.resolve(__dirname, '../../index.html');
let fail = 0;
const ok = (cond, msg, extra) => { if (!cond) fail++; console.log(`${cond ? 'OK  ' : 'FAIL'} ${msg}${!cond && extra !== undefined ? ' -> ' + JSON.stringify(extra) : ''}`); };
const skip = (msg) => console.log(`SKIP ${msg}`);

(async () => {
  const browser = await chromium.launch();
  const open = async () => {
    const page = await (await browser.newContext({ viewport: { width: 360, height: 740 } })).newPage();
    await page.route('https://cdn.jsdelivr.net/**', (r) => r.abort());
    await page.goto(URL);
    return page;
  };
  const cart = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('hortifruti_cart') || 'null'));
  const importar = async (page, text) => { await page.fill('#rawText', text); await page.click('#processBtn'); };

  // Bug 1: reimportação sem produtos não derruba a lista nem o carrinho
  {
    const page = await open();
    page.on('dialog', (d) => d.dismiss());
    await importar(page, 'Banana prata R$4,99kg\nUva R$ 9,99kg');
    await (await page.$$('.item-row .item-check'))[0].check();
    await importar(page, 'texto sem nenhum produto');
    ok((await page.$$('.item-row')).length === 2, 'bug 1 - lista anterior continua na tela');
    ok(/lista anterior foi mantida/.test(await page.textContent('#updateStatus')), 'bug 1 - status informa que a lista foi mantida');
    ok((await page.evaluate(() => localStorage.getItem('hortifruti_raw_text'))).includes('Banana prata'), 'bug 1 - texto salvo não é sobrescrito');
    await (await page.$$('.item-row .item-check'))[1].check();
    const c = await cart(page);
    ok(JSON.stringify(c) === JSON.stringify({ 'Banana prata': 1, 'Uva': 1 }), 'bug 1 - carrinho {Banana prata:1, Uva:1}', c);
    ok(/Banana prata, 1kg/.test(await page.inputValue('#finalMessage')), 'bug 1 - mensagem continua gerada');
    await page.context().close();
  }

  // Bug 3: quantidade inválida desmarca ao sair do campo, não ao digitar
  {
    const page = await open();
    await importar(page, 'Banana prata R$4,99kg\nMorango bandeja R$ 7,99');
    const checks = await page.$$('.item-row .item-check');
    const qtys = await page.$$('.item-row .item-qty');
    await checks[0].check();
    await qtys[0].fill('');
    ok(await checks[0].isChecked(), 'bug 3 - apagar o campo não desmarca durante a digitação');
    await qtys[0].fill('2');
    await qtys[0].press('Tab');
    ok(await checks[0].isChecked() && (await cart(page))['Banana prata'] === 2, 'bug 3 - digitar outro número mantém o item');
    await qtys[0].fill('');
    await qtys[0].press('Tab');
    ok(!(await checks[0].isChecked()), 'bug 3 - campo vazio ao sair desmarca o item');
    ok(JSON.stringify(await cart(page)) === '{}', 'bug 3 - item desmarcado sai do carrinho', await cart(page));
    ok(/Selecione pelo menos um item/.test(await page.inputValue('#finalMessage')), 'bug 3 - item fora da mensagem');
    await checks[1].check();
    await qtys[1].fill('0');
    await qtys[1].press('Tab');
    ok(!(await checks[1].isChecked()), 'bug 3 - zero em unidade inteira desmarca');
    await checks[1].check();
    await qtys[1].fill('1.6');
    await qtys[1].press('Tab');
    ok((await cart(page))['Morango'] === 2, 'bug 3 - unidade inteira arredonda 1,6 para 2', await cart(page));
    ok((await qtys[0].getAttribute('step')) === '0.1' && (await qtys[1].getAttribute('step')) === '1', 'bug 3 - step 0,1 em kg e 1 nas demais unidades');
    await page.context().close();
  }

  // Limpar dados: remove por prefixo, preserva chaves alheias
  {
    const page = await open();
    page.on('dialog', (d) => d.accept());
    await importar(page, 'Banana prata R$4,99kg');
    await page.evaluate(() => {
      localStorage.setItem('hortifruti_extra_v1', '{}');
      localStorage.setItem('hortifruti.templates.v1', '[]');
      localStorage.setItem('outro_app', 'x');
    });
    await page.click('#clearDataBtn');
    const keys = await page.evaluate(() => Object.keys(localStorage));
    ok(JSON.stringify(keys) === '["outro_app"]', 'limpar - remove hortifruti_* e hortifruti.*, preserva chave alheia', keys);
    await page.context().close();
  }

  // Bug 2 (ADR-008): nomes duplicados colidem. Falha conhecida até o carrinho v1.
  skip('bug 2 - Limão em FRUTAS e TEMPEROS não colide (aguarda ADR-008)');

  await browser.close();
  console.log(fail ? `\n${fail} falha(s)` : '\ntodos os testes de navegador OK');
  process.exitCode = fail ? 1 : 0;
})();
