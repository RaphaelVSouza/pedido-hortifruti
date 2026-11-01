const { test, expect } = require('@playwright/test');

test.describe('Persistência e resiliência de dados', () => {
  test('preserva carrinho, endereço e pagamento após reload', async ({ page }) => {
    await page.route('https://cdn.jsdelivr.net/**', (route) => route.abort());
    await page.goto('/');

    const sampleText = [
      '🍉 *FRUTAS*',
      'Banana prata R$4,99kg',
      'Maçã gala R$ 8,99kg'
    ].join('\n');

    await page.fill('#rawText', sampleText);
    await page.click('#processBtn');

    await page.locator('.item-row').filter({ hasText: 'Banana prata' }).locator('.item-check').check();
    await page.fill('#endereco', 'Rua das Palmeiras, 456');
    await page.selectOption('#pagamento', 'Cartão de Crédito');

    await page.reload();

    const bananaCheck = page.locator('.item-row').filter({ hasText: 'Banana prata' }).locator('.item-check');
    await expect(bananaCheck).toBeChecked();
    await expect(page.locator('#endereco')).toHaveValue('Rua das Palmeiras, 456');
    await expect(page.locator('#pagamento')).toHaveValue('Cartão de Crédito');
  });

  test('recupera graciosamente quando localStorage possui JSON inválido em hortifruti_cart_v1 ou hortifruti_cart', async ({ page }) => {
    await page.route('https://cdn.jsdelivr.net/**', (route) => route.abort());
    await page.goto('/');

    const sampleText = [
      '🍉 *FRUTAS*',
      'Banana prata R$4,99kg'
    ].join('\n');

    await page.fill('#rawText', sampleText);
    await page.click('#processBtn');

    await page.evaluate(() => {
      localStorage.setItem('hortifruti_cart_v1_default', '{invalido-json: true');
      localStorage.setItem('hortifruti_cart_v1', '{invalido-json: true');
      localStorage.setItem('hortifruti_suppliers_v1', '{invalido-json: true');
      localStorage.setItem('hortifruti_cart', '{invalido-json: true');
    });

    await page.reload();

    await expect(page.locator('#selectionSection')).not.toHaveClass(/hidden/);
    const itemRows = page.locator('.item-row');
    await expect(itemRows).toHaveCount(1);
    await expect(itemRows.first()).toContainText('Banana prata');

    const check = itemRows.first().locator('.item-check');
    await expect(check).not.toBeChecked();
  });
});
