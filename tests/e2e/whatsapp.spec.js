const { test, expect } = require('@playwright/test');

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} text
 */
async function importar(page, text) {
  await page.goto('/');
  await page.fill('#rawText', text);
  await page.click('#processBtn');
  await expect(page.locator('#selectionSection')).not.toHaveClass(/hidden/);
}

test.describe('ADR-011: Envio direto pelo WhatsApp (wa.me)', () => {
  test('com telefone no perfil: atualiza href com wa.me, query codificada idêntica à finalMessage e combo formatado com "combos"', async ({ page }) => {
    // Configura telefone no perfil padrão
    await page.goto('/');
    await page.click('#editSupplierBtn');
    await page.fill('#supplierWhatsapp', '5511999998888');
    await page.click('#saveSupplierBtn');

    // Importa lista contendo item comum e item combo
    const lista = [
      'FRUTAS',
      'Melancia Baby R$ 10,00un.',
      'Abacate 3 por R$ 10,00'
    ].join('\n');

    await page.fill('#rawText', lista);
    await page.click('#processBtn');

    const whatsappBtn = page.locator('#whatsappBtn');
    // Inicialmente carrinho vazio -> botão desabilitado
    await expect(whatsappBtn).toHaveAttribute('aria-disabled', 'true');
    await expect(whatsappBtn).toHaveClass(/disabled/);

    // Marca o combo e altera quantidade para 2 combos
    const abacateRow = page.locator('.item-row').filter({ hasText: 'Abacate' });
    await abacateRow.locator('.item-check').check();
    const qtyInput = abacateRow.locator('.item-qty');
    await qtyInput.fill('2');
    await qtyInput.dispatchEvent('change');

    // Verifica a mensagem gerada com combo
    const finalMsg = page.locator('#finalMessage');
    const msgText = await finalMsg.inputValue();
    expect(msgText).toContain('Abacate (combo 3 un), 2 combos (R$ 20,00)');

    // Botão agora deve estar ativo
    await expect(whatsappBtn).toHaveAttribute('aria-disabled', 'false');
    await expect(whatsappBtn).not.toHaveClass(/disabled/);
    await expect(whatsappBtn).not.toHaveAttribute('tabindex', '-1');

    const href = await whatsappBtn.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).toMatch(/^https:\/\/wa\.me\/5511999998888\?text=/);

    // Query decodificada exatamente igual ao valor de finalMessage
    const queryPart = href.split('?text=')[1];
    expect(decodeURIComponent(queryPart)).toBe(msgText);
  });

  test('sem telefone no perfil: botão fica desabilitado com aria-disabled e classe disabled, clique prevenido', async ({ page }) => {
    // Perfil default inicial não tem WhatsApp
    await importar(page, 'FRUTAS\nBanana prata R$ 5,00kg');
    await page.locator('.item-row .item-check').first().check();

    const whatsappBtn = page.locator('#whatsappBtn');
    await expect(whatsappBtn).toHaveAttribute('aria-disabled', 'true');
    await expect(whatsappBtn).toHaveClass(/disabled/);
    await expect(whatsappBtn).toHaveAttribute('tabindex', '-1');
    const href = await whatsappBtn.getAttribute('href');
    expect(href).toBeNull();
  });

  test('mensagem longa (> 2000 chars codificados): exibe #whatsappNotice', async ({ page }) => {
    await page.goto('/');
    await page.click('#editSupplierBtn');
    await page.fill('#supplierWhatsapp', '5511999998888');
    await page.click('#saveSupplierBtn');

    // Gera lista com muitos itens para ultrapassar 2000 chars
    const items = [];
    items.push('FRUTAS');
    for (let i = 1; i <= 60; i++) {
      items.push(`Item Fruta Extra Grande Especial Numero ${i} R$ 10,00un.`);
    }

    await page.fill('#rawText', items.join('\n'));
    await page.click('#processBtn');

    // Marca vários itens
    const checks = page.locator('.item-row .item-check');
    const count = await checks.count();
    for (let i = 0; i < Math.min(count, 45); i++) {
      await checks.nth(i).check();
    }

    const finalMsg = page.locator('#finalMessage');
    const msgText = await finalMsg.inputValue();
    expect(encodeURIComponent(msgText).length).toBeGreaterThan(2000);

    const notice = page.locator('#whatsappNotice');
    await expect(notice).toBeVisible();
    await expect(notice).not.toHaveClass(/hidden/);

    const whatsappBtn = page.locator('#whatsappBtn');
    await expect(whatsappBtn).toHaveAttribute('aria-disabled', 'false');
  });

  test('layout 360px sem overflow horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/');
    await page.click('#editSupplierBtn');
    await page.fill('#supplierWhatsapp', '5511999998888');
    await page.click('#saveSupplierBtn');

    await page.fill('#rawText', 'FRUTAS\nMaçã gala R$ 8,00kg\nBanana nanica R$ 5,00kg');
    await page.click('#processBtn');
    await page.locator('.item-row .item-check').first().check();

    await expect(page.locator('#summarySection')).toBeVisible();
    await expect(page.locator('#whatsappBtn')).toBeVisible();
    await expect(page.locator('#copyBtn')).toBeVisible();

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
  });
});
