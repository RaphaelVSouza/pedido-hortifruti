const { test, expect } = require('@playwright/test');

test.describe('Fluxo completo do pedido', () => {
  test('importa lista do README com combo, marca itens e gera mensagem com saudação matinal', async ({ page }) => {
    await page.route('https://cdn.jsdelivr.net/**', (route) => route.abort());
    await page.clock.setFixedTime(new Date('2026-10-31T10:00:00'));
    await page.goto('/');

    const sampleText = [
      '🍉 *FRUTAS*',
      'Melancia Baby 8,00un.',
      'Banana prata R$4,99kg',
      'Abacate 3 por R$ 10,00',
      '',
      '🎃 *LEGUMES*',
      'Abóbora moranga R$4,99kg'
    ].join('\n');

    await page.fill('#rawText', sampleText);
    await page.click('#processBtn');

    await page.locator('.item-row').filter({ hasText: 'Melancia Baby' }).locator('.item-check').check();
    await page.locator('.item-row').filter({ hasText: 'Banana prata' }).locator('.item-check').check();
    await page.locator('.item-row').filter({ hasText: 'Abacate' }).locator('.item-check').check();

    const finalMessage = page.locator('#finalMessage');
    await expect(finalMessage).toBeVisible();

    const message = await finalMessage.inputValue();
    expect(message).toContain('Bom dia');
    expect(message).toContain('Melancia Baby');
    expect(message).toContain('Banana prata');
    expect(message).toContain('Abacate (combo 3 un)');
    expect(message).toContain('3 un');
    expect(message).toContain('Total estimado');
    expect(message).toContain('R$ 27,99');
  });
});
