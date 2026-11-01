const { test, expect } = require('@playwright/test');

const cart = (page, id = 'default') =>
  page.evaluate((supId) => JSON.parse(localStorage.getItem(`hortifruti_cart_v1_${supId}`) || localStorage.getItem('hortifruti_cart_v1') || 'null'), id);

const importar = async (page, text) => {
  await page.fill('#rawText', text);
  await page.click('#processBtn');
};

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.jsdelivr.net/**', (route) => route.abort());
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('ADR-009: critério E2E principal - importar texto, aprender template via HortiParser.induceTemplate via templateStore.learn e reconhecer Jaca inteira e Pinha', async ({ page }) => {
  const texto = `Jaca inteira ---> 15 conto
Pinha --> 12 conto
Banana prata 5,99 kg`;

  // 1. Importar texto com formato não padronizado
  await importar(page, texto);

  // 2. Aprender a partir de 'Jaca inteira ---> 15 conto' (name: 'Jaca inteira', price: 15, unit: 'un') usando HortiParser.induceTemplate via templateStore.learn
  await page.evaluate(() => {
    const store = window.HortiParser.createTemplateStore(localStorage, 'hortifruti_templates_v1_default');
    store.learn('Jaca inteira ---> 15 conto', { name: 'Jaca inteira', price: 15, unit: 'un' });
  });

  // Reprocessa
  await page.click('#processBtn');

  // 3. Ambas (Jaca inteira e Pinha) viram produtos reconhecidos!
  await expect(page.locator('.item-row')).toHaveCount(3);
  const itemNames = await page.locator('.item-row .item-name').allTextContents();
  expect(itemNames.some((n) => n.includes('Banana prata'))).toBe(true);
  expect(itemNames.some((n) => n.includes('Jaca inteira') && !n.includes('conto'))).toBe(true);
  expect(itemNames.some((n) => n.includes('Pinha') && !n.includes('conto'))).toBe(true);

  // Sem selo "conferir"
  await expect(page.locator('.badge-conferir')).toHaveCount(0);
});

test('ADR-009: painel de revisão - aprender formato a partir de linha não reconhecida na interface', async ({ page }) => {
  const texto = `Jaca inteira ---> 15 conto
Pinha --> 12 conto
Banana prata R$ 5,99kg`;

  await importar(page, texto);
  await expect(page.locator('.item-row')).toHaveCount(1);
  await expect(page.locator('#openReviewBtn')).toBeVisible();

  await page.click('#openReviewBtn');
  await expect(page.locator('#reviewPanel')).toBeVisible();
  await expect(page.locator('#unparsedCount')).toHaveText('2');

  const cards = page.locator('#reviewUnparsedList .review-card');
  await expect(cards).toHaveCount(2);

  const firstCard = cards.first();
  await firstCard.locator('.review-input-name').fill('Jaca inteira');
  await firstCard.locator('.review-input-price').fill('15');
  await firstCard.locator('.review-input-unit').selectOption('un');
  await firstCard.locator('.btn-learn-template').click();

  await expect(page.locator('#reviewFeedback')).toContainText('Formato aprendido');
  await expect(page.locator('.item-row')).toHaveCount(3);
  await expect(page.locator('#unparsedCount')).toHaveText('0');
});

test('ADR-009: templates corrompidos em localStorage não quebram o app', async ({ page }) => {
  // Injeta JSON inválido e templates inválidos no localStorage
  await page.evaluate(() => {
    localStorage.setItem('hortifruti_templates_v1_default', 'invalid-json{{{');
    localStorage.setItem('hortifruti_templates_v1', JSON.stringify([null, 123, { source: '[unclosed', flags: 'iu' }]));
  });

  await page.reload();

  // O app carrega normalmente e processa produtos
  await importar(page, 'Banana prata R$ 4,99kg\nMaçã R$ 5,99kg');
  await expect(page.locator('.item-row')).toHaveCount(2);
  await page.locator('.item-row .item-check').first().check();
  await expect(page.locator('#totalValue')).toHaveText('≈ R$ 9,99');
});

test('ADR-009: gerenciador de templates do fornecedor lista e remove templates', async ({ page }) => {
  // Salva template no storage do fornecedor ativo
  await page.evaluate(() => {
    const store = window.HortiParser.createTemplateStore(localStorage, 'hortifruti_templates_v1_default');
    store.learn('Jaca inteira ---> 15 conto', { name: 'Jaca inteira', price: 15, unit: 'un' });
  });

  await page.reload();

  // Abre configuração do fornecedor
  await page.click('#editSupplierBtn');
  await expect(page.locator('#supplierConfigPanel')).toBeVisible();

  // Seção de templates lista o template aprendido
  const tplCards = page.locator('#supplierTemplatesList .supplier-template-card');
  await expect(tplCards).toHaveCount(1);
  await expect(tplCards.first()).toContainText('conto');

  // Remove o template
  await tplCards.first().locator('.delete-template-btn').click();
  await expect(page.locator('#supplierTemplatesList')).toContainText('Nenhum formato aprendido');

  // Verifica que o storage foi atualizado
  const stored = await page.evaluate(() => localStorage.getItem('hortifruti_templates_v1_default'));
  expect(JSON.parse(stored || '[]')).toHaveLength(0);
});

test('ADR-009: adicionar item manual e descartar linha no painel de revisão', async ({ page }) => {
  await importar(page, 'Melancia gigante\nBanana prata 4,99 kg');
  await expect(page.locator('.item-row')).toHaveCount(1);

  await page.click('#openReviewBtn');
  await expect(page.locator('#reviewUnparsedList .review-card')).toHaveCount(1);

  // Adicionar item manual
  const card = page.locator('#reviewUnparsedList .review-card').first();
  await card.locator('.review-input-name').fill('Melancia gigante');
  await card.locator('.review-input-price').fill('15.50');
  await card.locator('.review-input-unit').selectOption('un');
  await card.locator('.btn-add-item').click();

  // Agora são 2 produtos
  await expect(page.locator('.item-row')).toHaveCount(2);
  await expect(page.locator('#unparsedCount')).toHaveText('0');
});

test('ADR-009: sugestões de grafia (ADR-008) podem ser aceitas ou recusadas no painel de revisão', async ({ page }) => {
  // Salva carrinho anterior com Mamão formosa
  await page.evaluate(() => {
    const cartData = {
      'geral|mamao formosa': { qty: 2, name: 'Mamão formosa', unit: 'kg', price: 6.99, category: 'Geral' }
    };
    localStorage.setItem('hortifruti_cart_v1_default', JSON.stringify(cartData));
  });

  // Importa lista com nova grafia levemente diferente (Levenshtein <= 2)
  await importar(page, 'Mamao fermosa R$ 7,99kg');

  // Abre painel de revisão
  await page.click('#openReviewBtn');
  await expect(page.locator('#spellingCount')).toHaveText('1');

  const suggCard = page.locator('#reviewSpellingList .review-card').first();
  await expect(suggCard).toContainText('Mamão formosa');
  await expect(suggCard).toContainText('Mamao fermosa');

  // Aceita a sugestão
  await suggCard.locator('.btn-accept-spelling').click();
  await expect(page.locator('#spellingCount')).toHaveText('0');

  // Produto é selecionado com quantidade 2 do carrinho anterior
  const row = page.locator('.item-row').first();
  await expect(row.locator('.item-check')).toBeChecked();
  await expect(row.locator('.item-qty')).toHaveValue('2');
});

test('ADR-009: tela de revisão em 360px sem overflow horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await importar(page, 'Jaca inteira ---> 15 conto\nBanana prata 5,99 kg');
  await page.click('#openReviewBtn');
  await expect(page.locator('#reviewPanel')).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
