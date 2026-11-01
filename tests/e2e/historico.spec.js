const { test, expect } = require('@playwright/test');

const importar = async (page, text) => {
  await page.fill('#rawText', text);
  await page.click('#processBtn');
};

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.jsdelivr.net/**', (route) => route.abort());
  await page.goto('/');
});

test('Teste 1: Preço anterior: lista com de R$ 10,00 por R$ 8,00 exibe <del class="old-price"> com R$ 10,00 e label "antes R$ 10,00"', async ({ page }) => {
  await importar(page, 'Abacate de R$ 10,00 por R$ 8,00 un');
  const oldPrice = page.locator('.item-row .old-price');
  await expect(oldPrice).toHaveCount(1);
  await expect(oldPrice).toHaveText('R$ 10,00');
  await expect(oldPrice).toHaveAttribute('aria-label', 'antes R$ 10,00');
  const price = page.locator('.item-row .item-price');
  await expect(price).toContainText('R$ 8,00/un');
});

test('Teste 2: Variação de preço: Tomate 5,99 kg seguido de Tomate 6,49 kg exibe badge ↑ 8% com acessibilidade', async ({ page }) => {
  await importar(page, 'Tomate 5,99 kg');
  await expect(page.locator('.price-diff')).toHaveCount(0);

  await importar(page, 'Tomate 6,49 kg');
  const badge = page.locator('.item-row .price-diff.price-up');
  await expect(badge).toHaveCount(1);
  await expect(badge).toHaveText('↑ 8%');
  await expect(badge).toHaveAttribute('aria-label', /subiu 8% desde/);
  await expect(badge).toHaveAttribute('title', /subiu 8% desde/);
});

test('Teste 3: Mudança de unidade não mostra variação: Morango 10,00 kg seguido de Morango 10,00 bdj', async ({ page }) => {
  await importar(page, 'Morango 10,00 kg');
  await expect(page.locator('.price-diff')).toHaveCount(0);

  await importar(page, 'Morango 10,00 bdj');
  await expect(page.locator('.price-diff')).toHaveCount(0);
});

test('Teste 4: Limite de 10 snapshots respeitado no storage ao importar 12 listas', async ({ page }) => {
  for (let i = 1; i <= 12; i++) {
    await importar(page, `Item ${i} R$ ${i},00 un`);
  }

  const history = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('hortifruti_history_v1_default') || '[]');
  });

  expect(Array.isArray(history)).toBe(true);
  expect(history.length).toBe(10);
  expect(history[0].prices['geral|item 12'].price).toBe(12);
  expect(history[9].prices['geral|item 3'].price).toBe(3);
});

test('Teste 5: Layout em 360px sem overflow horizontal com badges de preço e preço anterior', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await importar(page, 'Tomate italiano selecionado de R$ 12,00 por R$ 8,00 kg');
  await importar(page, 'Tomate italiano selecionado de R$ 12,00 por R$ 9,00 kg');

  const oldPrice = page.locator('.item-row .old-price');
  await expect(oldPrice).toHaveCount(1);
  const badge = page.locator('.item-row .price-diff');
  await expect(badge).toHaveCount(1);

  const noOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
  });
  expect(noOverflow).toBe(true);
});
