const { test, expect } = require('@playwright/test');

test.describe('Proteção contra XSS', () => {
  test('importar payload não executa script e exibe produto na lista', async ({ page }) => {
    await page.route('https://cdn.jsdelivr.net/**', (route) => route.abort());
    await page.goto('/');

    await page.fill('#rawText', '<img src=x onerror=window.__x=1> Banana R$ 4,99kg');
    await page.click('#processBtn');

    const x = await page.evaluate(() => window.__x);
    expect(x).toBeUndefined();

    const listText = await page.textContent('#itemsList');
    expect(listText).toContain('Banana');
  });
});
