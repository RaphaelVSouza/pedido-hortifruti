const { test, expect } = require('@playwright/test');

const cart = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('hortifruti_cart') || 'null'));
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
  const rawText = await page.evaluate(() => localStorage.getItem('hortifruti_raw_text'));
  expect(rawText).toContain('Banana prata');

  await page.locator('.item-row .item-check').nth(1).check();
  const c = await cart(page);
  expect(c).toEqual({ 'Banana prata': 1, 'Uva': 1 });
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
  expect((await cart(page))['Banana prata']).toBe(2);

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
  expect((await cart(page))['Morango']).toBe(2);
  await expect(qtys.nth(0)).toHaveAttribute('step', '0.1');
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
  test.skip(true, 'aguarda ADR-008');
  await importar(page, 'FRUTAS\nLimão R$ 3,00kg\nTEMPEROS\nLimão R$ 4,00kg');
  const checks = page.locator('.item-row .item-check');
  await checks.nth(0).check();
  await checks.nth(1).check();
  const c = await cart(page);
  expect(Object.keys(c)).toHaveLength(2);
});
