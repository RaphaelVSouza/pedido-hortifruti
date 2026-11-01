const { test, expect } = require('@playwright/test');

const cart = (page, id = 'default') => page.evaluate((supId) => JSON.parse(localStorage.getItem(`hortifruti_cart_v1_${supId}`) || localStorage.getItem('hortifruti_cart_v1') || 'null'), id);
const importar = async (page, text) => {
  await page.fill('#rawText', text);
  await page.click('#processBtn');
};

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.jsdelivr.net/**', (route) => route.abort());
  await page.goto('/');
});

test('Bug 1: reimportação sem produtos não derruba a lista anterior nem o carrinho', async ({ page }) => {
  page.on('dialog', (d) => d.dismiss());
  await importar(page, 'Banana prata R$4,99kg\nUva R$ 9,99kg');
  await page.locator('.item-row .item-check').nth(0).check();
  await importar(page, 'texto sem nenhum produto');

  await expect(page.locator('.item-row')).toHaveCount(2);
  await expect(page.locator('#updateStatus')).toContainText('lista anterior foi mantida');
  const rawText = await page.evaluate(() => localStorage.getItem('hortifruti_raw_text_default') || localStorage.getItem('hortifruti_raw_text'));
  expect(rawText).toContain('Banana prata');

  await page.locator('.item-row .item-check').nth(1).check();
  const c = await cart(page);
  expect(c).toEqual({
    'geral|banana prata': { qty: 1, name: 'Banana prata', unit: 'kg', price: 4.99, category: 'Geral' },
    'geral|uva': { qty: 1, name: 'Uva', unit: 'kg', price: 9.99, category: 'Geral' }
});
  await expect(page.locator('#finalMessage')).toHaveValue(/Banana prata, 1kg/);
});

test('Bug 3: quantidade inválida desmarca ao sair do campo (blur/change), não ao digitar', async ({ page }) => {
  await importar(page, 'Banana prata R$4,99kg\nMorango bandeja R$ 7,99');
  const checks = page.locator('.item-row .item-check');
  const qtys = page.locator('.item-row .item-qty');

  await checks.nth(0).check();
  await qtys.nth(0).fill('');
  await expect(checks.nth(0)).toBeChecked();

  await qtys.nth(0).fill('2');
  await qtys.nth(0).press('Tab');
  await expect(checks.nth(0)).toBeChecked();
  expect((await cart(page))['geral|banana prata'].qty).toBe(2);

  await qtys.nth(0).fill('');
  await qtys.nth(0).press('Tab');
  await expect(checks.nth(0)).not.toBeChecked();
  expect(await cart(page)).toEqual({});
  await expect(page.locator('#finalMessage')).toHaveValue(/Selecione pelo menos um item/);

  await checks.nth(1).check();
  await qtys.nth(1).fill('0');
  await qtys.nth(1).press('Tab');
  await expect(checks.nth(1)).not.toBeChecked();

  await checks.nth(1).check();
  await qtys.nth(1).fill('1.6');
  await qtys.nth(1).press('Tab');
  expect((await cart(page))['geral|morango'].qty).toBe(2);
  await expect(qtys.nth(0)).toHaveAttribute('step', '0.25');
  await expect(qtys.nth(1)).toHaveAttribute('step', '1');
});

test('Limpar dados salvos: remove por prefixo (hortifruti_* e hortifruti.*), preservando chaves de outros apps', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await importar(page, 'Banana prata R$4,99kg');
  await page.evaluate(() => {
    localStorage.setItem('hortifruti_extra_v1', '{}');
    localStorage.setItem('hortifruti.templates.v1', '[]');
    localStorage.setItem('outro_app', 'x');
});
  await page.click('#clearDataBtn');
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys).toEqual(['outro_app']);
});

test('bug 2 - Limão em FRUTAS e TEMPEROS não colide', async ({ page }) => {
  await importar(page, 'FRUTAS\nLimão R$ 3,00kg\nTEMPEROS\nLimão R$ 4,00kg');
  const checks = page.locator('.item-row .item-check');
  await checks.nth(0).check();
  await checks.nth(1).check();
  const c = await cart(page);
  expect(Object.keys(c)).toHaveLength(2);
  expect(c['frutas|limao'].qty).toBe(1);
  expect(c['temperos|limao'].qty).toBe(1);
});

test('ADR-008: Banana Prata -> banana prata kg mantém seleção e quantidade', async ({ page }) => {
  await importar(page, 'Banana Prata R$ 4,99 un');
  await page.locator('.item-row .item-check').first().check();
  await page.locator('.item-row .item-qty').first().fill('3');
  await page.locator('.item-row .item-qty').first().press('Tab');

  await importar(page, 'banana prata kg R$ 5,49');
  await expect(page.locator('.item-row .item-check').first()).toBeChecked();
  await expect(page.locator('.item-row .item-qty').first()).toHaveValue('3');
});

test('ADR-008: match único por itemKey em outra categoria preserva seleção', async ({ page }) => {
  await importar(page, 'Abacaxi R$ 5,00 un');
  await page.locator('.item-row .item-check').first().check();

  await importar(page, 'FRUTAS\nAbacaxi R$ 6,00 un');
  await expect(page.locator('.item-row .item-check').first()).toBeChecked();
  const c = await cart(page);
  expect(c['frutas|abacaxi'].qty).toBe(1);
});

test('ADR-008: Mamão formosa -> Mamao fermosa não aplica automaticamente e mantém indisponível com botão Remover', async ({ page }) => {
  await importar(page, 'Mamão formosa R$ 6,00 kg');
  await page.locator('.item-row .item-check').first().check();

  await importar(page, 'Mamao fermosa R$ 6,50 kg');
  const activeRow = page.locator('.item-row:not(.unavailable-item)');
  await expect(activeRow).toHaveCount(1);
  await expect(activeRow.locator('.item-check')).not.toBeChecked();

  const unavailRow = page.locator('.item-row.unavailable-item');
  await expect(unavailRow).toHaveCount(1);
  await expect(unavailRow.locator('.unavailable-badge')).toHaveText('indisponível nesta lista');
  await expect(page.locator('#subtotalValue')).toHaveText('R$ 0,00');
  await expect(page.locator('#finalMessage')).toHaveValue(/Selecione pelo menos um item/);

  await unavailRow.locator('.remove-unavailable-btn').click();
  await expect(page.locator('.item-row.unavailable-item')).toHaveCount(0);
  expect(await cart(page)).toEqual({});
});

test('ADR-008: migração de hortifruti_cart legado para hortifruti_cart_v1', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.removeItem('hortifruti_cart_v1_default');
    localStorage.removeItem('hortifruti_cart_v1');
    localStorage.setItem('hortifruti_cart', JSON.stringify({
      'Banana prata': 2,
      'Abacate (combo 3 un)': 2
    }));
});

  await importar(page, 'FRUTAS\nBanana prata R$ 4,99kg\nAbacate 3 por R$ 10,00');
  const checks = page.locator('.item-row .item-check');
  const qtys = page.locator('.item-row .item-qty');
  await expect(checks.nth(0)).toBeChecked();
  await expect(qtys.nth(0)).toHaveValue('2');
  await expect(checks.nth(1)).toBeChecked();
  await expect(qtys.nth(1)).toHaveValue('2');

  const legacy = await page.evaluate(() => localStorage.getItem('hortifruti_cart'));
  expect(legacy).toBeNull();

  const c = await cart(page);
  expect(c).toEqual({
    'frutas|banana prata': { qty: 2, name: 'Banana prata', unit: 'kg', price: 4.99, category: 'FRUTAS' },
    'frutas|abacate#combo3': { qty: 2, name: 'Abacate (combo 3 un)', unit: 'combo', price: 10, category: 'FRUTAS' }
});
});

test('ADR-010: migração de dados existentes para o perfil padrão "Meu hortifruti"', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('hortifruti_raw_text', 'FRUTAS\nJaca inteira ---> 15 conto\nBanana prata R$ 4,99kg');
    localStorage.setItem('hortifruti_cart_v1', JSON.stringify({
      'frutas|banana prata': { qty: 3, name: 'Banana prata', unit: 'kg', price: 4.99, category: 'FRUTAS' }
    }));
    const store = window.HortiParser.createTemplateStore(localStorage, 'hortifruti.templates.v1');
    store.learn('Jaca inteira ---> 15 conto', { name: 'Jaca inteira', price: '15' });
    localStorage.setItem('hortifruti_prefs', JSON.stringify({
      endereco: 'Av. Brasil, 100',
      pagamento: 'Dinheiro'
    }));
});

  await page.reload();

  await expect(page.locator('#supplierSelect')).toHaveValue('default');
  await expect(page.locator('#supplierSelect option:checked')).toHaveText('Meu hortifruti');
  await expect(page.locator('#deliveryFee')).toHaveText('R$ 5,00');
  await expect(page.locator('#endereco')).toHaveValue('Av. Brasil, 100');
  await expect(page.locator('#pagamento')).toHaveValue('PIX');

  await expect(page.locator('.item-row')).toHaveCount(2);
  const bananaRow = page.locator('.item-row').filter({ hasText: 'Banana prata' });
  await expect(bananaRow.locator('.item-check')).toBeChecked();
  await expect(bananaRow.locator('.item-qty')).toHaveValue('3');

  const legacyKeys = await page.evaluate(() => ({
    raw: localStorage.getItem('hortifruti_raw_text'),
    cart: localStorage.getItem('hortifruti_cart_v1'),
    tpl: localStorage.getItem('hortifruti.templates.v1'),
    migratedTpl: localStorage.getItem('hortifruti_templates_v1_default')
  }));
  expect(legacyKeys.raw).toBeNull();
  expect(legacyKeys.cart).toBeNull();
  expect(legacyKeys.tpl).toBeNull();
  expect(legacyKeys.migratedTpl).toBeTruthy();
});

test('ADR-010: criar segundo fornecedor, alternar entre perfis (carrinho, texto, templates, taxa, pagamentos e boldIsPromo) e voltar restaura', async ({ page }) => {
  await importar(page, 'FRUTAS\nBanana prata *R$ 5,00* kg');
  await page.locator('.item-row .item-check').first().check();
  await expect(page.locator('.item-row').first()).toHaveClass(/promo-item/);
  await expect(page.locator('#totalValue')).toHaveText('R$ 10,00');

  await page.click('#newSupplierBtn');
  await expect(page.locator('#supplierConfigPanel')).not.toHaveClass(/hidden/);
  await page.fill('#supplierName', 'Sítio Verde');
  await page.fill('#supplierWhatsapp', '5511988887777');
  await page.fill('#supplierDeliveryFee', '8.50');
  await page.fill('#supplierPayments', 'PIX, Vale Alimentação');
  await page.uncheck('#supplierBoldIsPromo');
  await page.click('#saveSupplierBtn');

  await expect(page.locator('#supplierConfigPanel')).toHaveClass(/hidden/);
  await expect(page.locator('#supplierSelect option:checked')).toHaveText('Sítio Verde');
  await expect(page.locator('#deliveryFee')).toHaveText('R$ 8,50');
  await expect(page.locator('#totalValue')).toHaveText('R$ 8,50');
  await expect(page.locator('#rawText')).toHaveValue('');
  await expect(page.locator('#selectionSection')).toHaveClass(/hidden/);
  await expect(page.locator('#pagamento option')).toHaveText(['PIX', 'Vale Alimentação']);

  await importar(page, 'LEGUMES\nCenoura *R$ 4,00* kg');
  const cenouraRow = page.locator('.item-row').first();
  await expect(cenouraRow).not.toHaveClass(/promo-item/);
  await cenouraRow.locator('.item-check').check();
  await expect(page.locator('#totalValue')).toHaveText('R$ 12,50');
  await expect(page.locator('#finalMessage')).toHaveValue(/Taxa de entrega: R\$ 8,50/);

  await page.selectOption('#supplierSelect', 'default');
  await expect(page.locator('#deliveryFee')).toHaveText('R$ 5,00');
  await expect(page.locator('.item-row')).toHaveCount(1);
  await expect(page.locator('.item-row').first()).toContainText('Banana prata');
  await expect(page.locator('.item-row').first()).toHaveClass(/promo-item/);
  await expect(page.locator('.item-row .item-check').first()).toBeChecked();
  await expect(page.locator('#totalValue')).toHaveText('R$ 10,00');
});

test('ADR-010: validação do formulário de fornecedor (taxa >= 0, WhatsApp 12-13 dígitos ou vazio, proibido excluir último)', async ({ page }) => {
  await page.click('#editSupplierBtn');
  await expect(page.locator('#supplierConfigPanel')).not.toHaveClass(/hidden/);
  await expect(page.locator('#deleteSupplierBtn')).toBeDisabled();

  await page.fill('#supplierDeliveryFee', '-1');
  await page.click('#saveSupplierBtn');
  await expect(page.locator('#supplierFormError')).not.toHaveClass(/hidden/);
  await expect(page.locator('#supplierConfigPanel')).not.toHaveClass(/hidden/);

  await page.fill('#supplierDeliveryFee', '6.00');
  await page.fill('#supplierWhatsapp', '11999998888');
  await page.click('#saveSupplierBtn');
  await expect(page.locator('#supplierFormError')).not.toHaveClass(/hidden/);

  await page.fill('#supplierWhatsapp', '+5511999998888');
  await page.click('#saveSupplierBtn');
  await expect(page.locator('#supplierFormError')).not.toHaveClass(/hidden/);

  await page.fill('#supplierWhatsapp', '5511999998888');
  await page.click('#saveSupplierBtn');
  await expect(page.locator('#supplierConfigPanel')).toHaveClass(/hidden/);
  await expect(page.locator('#deliveryFee')).toHaveText('R$ 6,00');

  const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(noOverflow).toBe(true);
});

test('ADR-016: alho a R$ 24,99/kg, 2 cabeças com 50 g cada (valor fictício de teste) exibe estimativa e total estimado', async ({ page }) => {
  await page.route('**/data/unit-weights.json', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      version: 1,
      items: [
        {
          keywords: ['alho'],
          unitLabel: 'cabeça',
          unitPlural: 'cabeças',
          grams: 50,
          min: 50,
          max: 50,
          source: 'IBGE POF 2008-2009, medidas referidas, código 6706201 (valor fictício de teste 50g)'
        }
      ]
    })
  }));
  await page.goto('/');

  await importar(page, 'LEGUMES\nAlho R$ 24,99kg\nCenoura R$ 3,98kg');
  const alhoRow = page.locator('.item-row').filter({ hasText: 'Alho' });
  const cenouraRow = page.locator('.item-row').filter({ hasText: 'Cenoura' });

  await expect(alhoRow.locator('.unit-mode-selector')).toBeVisible();
  await expect(cenouraRow.locator('.unit-mode-selector')).toHaveCount(0);

  await alhoRow.locator('.item-check').check();
  await alhoRow.locator('.unit-mode-btn[data-mode="unit"]').click();
  await alhoRow.locator('.item-qty').fill('2');
  await alhoRow.locator('.item-qty').press('Tab');

  await expect(alhoRow.locator('.unit-estimate')).toHaveText('2 cabeças ≈ 100 g · ≈ R$ 2,50');
  await expect(page.locator('#subtotalLabel')).toHaveText('Subtotal estimado');
  await expect(page.locator('#subtotalValue')).toHaveText('≈ R$ 2,50');
  await expect(page.locator('#totalLabel')).toHaveText('Total estimado');
  await expect(page.locator('#totalValue')).toHaveText('≈ R$ 7,50');
  await expect(page.locator('#estimatedNote')).not.toHaveClass(/hidden/);

  await cenouraRow.locator('.item-check').check();
  await cenouraRow.locator('.item-qty').fill('0.5');
  await cenouraRow.locator('.item-qty').press('Tab');

  const msg = await page.locator('#finalMessage').inputValue();
  expect(msg).toContain('- 🧄 Alho, 2 cabeças (≈ 100 g · ≈ R$ 2,50)');
  expect(msg).toContain('- 🥕 Cenoura, 0,5kg (R$ 1,99)');
  expect(msg).toContain('*Total estimado: ≈ R$ 9,49 (itens por unidade são pesados na separação)*');
});

test('ADR-016: item sem entrada na tabela não mostra seletor, recarregar preserva modo escolhido e cabe em 360px sem overflow', async ({ page }) => {
  await importar(page, 'FRUTAS\nBanana prata R$ 4,99kg\nPitaya R$ 19,90kg\nMorango bandeja R$ 7,99');

  const bananaRow = page.locator('.item-row').filter({ hasText: 'Banana prata' });
  const pitayaRow = page.locator('.item-row').filter({ hasText: 'Pitaya' });
  const morangoRow = page.locator('.item-row').filter({ hasText: 'Morango' });

  await expect(bananaRow.locator('.unit-mode-selector')).toBeVisible();
  await expect(pitayaRow.locator('.unit-mode-selector')).toHaveCount(0);
  await expect(morangoRow.locator('.unit-mode-selector')).toHaveCount(0);

  await bananaRow.locator('.item-check').check();
  await bananaRow.locator('.unit-mode-btn[data-mode="unit"]').click();
  await bananaRow.locator('.item-qty').fill('6');
  await bananaRow.locator('.item-qty').press('Tab');

  await expect(bananaRow.locator('.unit-estimate')).toContainText('6 unidades ≈ 450 g');

  const noOverflowBefore = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(noOverflowBefore).toBe(true);

  await page.reload();

  const bananaAfter = page.locator('.item-row').filter({ hasText: 'Banana prata' });
  await expect(bananaAfter.locator('.item-check')).toBeChecked();
  await expect(bananaAfter.locator('.unit-mode-btn[data-mode="unit"]')).toHaveClass(/active/);
  await expect(bananaAfter.locator('.item-qty')).toHaveValue('6');
  await expect(bananaAfter.locator('.unit-estimate')).toContainText('6 unidades ≈ 450 g');
  await expect(page.locator('#totalLabel')).toHaveText('Total estimado');

  const noOverflowAfter = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(noOverflowAfter).toBe(true);
});
