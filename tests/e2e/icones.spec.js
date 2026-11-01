const { test, expect } = require('@playwright/test');

test.describe('ADR-012: Ícones próprios locais e emojis nativos no WhatsApp', () => {
  test('sem rede externa: nenhuma requisição externa, SVGs locais carregados, mensagem com emojis corretos e layout 360px sem overflow', async ({ page }) => {
    // 1. Bloqueia qualquer chamada para fora da origem local (ex: cdn.jsdelivr.net)
    const externalRequests = [];
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (!url.startsWith('http://localhost') && !url.startsWith('http://127.0.0.1')) {
        externalRequests.push(url);
        return route.abort();
      }
      return route.continue();
    });

    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/');

    expect(externalRequests).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);

    // 2. Importa lista contendo casos de teste da ADR-012
    const sampleText = [
      '🍉 *FRUTAS*',
      'Melancia Baby 8,00un.',
      'Banana prata R$ 4,99kg',
      'Maçã verde R$ 9,99kg',
      'Maçã gala R$ 7,99kg',
      '',
      '🥕 *LEGUMES*',
      'Batata doce R$ 5,99kg',
      'Batata inglesa R$ 4,99kg',
      'Chuchu R$ 2,99kg',
      'Alho R$ 24,99kg',
      'Legume Especial R$ 3,99kg'
    ].join('\n');

    await page.fill('#rawText', sampleText);
    await page.click('#processBtn');

    await expect(page.locator('#selectionSection')).toBeVisible();

    // 3. Verifica que nenhuma requisição externa foi feita após processar produtos
    expect(externalRequests).toHaveLength(0);

    // 4. Verifica ícones das abas
    const tabIcons = page.locator('.tabs-container .tab-icon');
    const tabCount = await tabIcons.count();
    expect(tabCount).toBeGreaterThan(0);
    for (let i = 0; i < tabCount; i++) {
      const src = await tabIcons.nth(i).getAttribute('src');
      expect(src).toMatch(/^icons\/custom\/cat-.*\.svg$/);
    }

    // 5. Verifica os ícones dos cards
    const itemRows = page.locator('.items-list .item-row');
    const rowCount = await itemRows.count();
    expect(rowCount).toBe(9);

    // Verifica regras específicas de correspondência de itens
    const getRowIconSrc = async (name) => {
      const row = itemRows.filter({ hasText: name });
      return await row.locator('.item-icon').getAttribute('src');
    };

    // Palavra composta mais longa primeiro
    expect(await getRowIconSrc('Batata doce')).toBe('icons/custom/batata-doce.svg');
    expect(await getRowIconSrc('Batata inglesa')).toBe('icons/custom/batata.svg');
    expect(await getRowIconSrc('Maçã verde')).toBe('icons/custom/maca-verde.svg');
    expect(await getRowIconSrc('Maçã gala')).toBe('icons/custom/maca.svg');
    expect(await getRowIconSrc('Melancia Baby')).toBe('icons/custom/melancia.svg');
    expect(await getRowIconSrc('Banana prata')).toBe('icons/custom/banana.svg');
    expect(await getRowIconSrc('Alho')).toBe('icons/custom/alho.svg');

    expect(await getRowIconSrc('Chuchu')).toBe('icons/custom/chuchu.svg');

    // Item sem ícone próprio no catálogo cai no ícone da categoria (cat-legumes.svg)
    expect(await getRowIconSrc('Legume Especial')).toBe('icons/custom/cat-legumes.svg');

    // Valida que todos os SVGs carregaram com sucesso no navegador (naturalWidth > 0)
    const allLoaded = await page.locator('.items-list .item-icon').evaluateAll(imgs =>
      imgs.every(img => /** @type {HTMLImageElement} */ (img).naturalWidth > 0)
    );
    expect(allLoaded).toBe(true);

    // 6. Seleciona itens e valida os emojis nativos na mensagem do WhatsApp
    await itemRows.filter({ hasText: 'Maçã verde' }).locator('.item-check').check();
    await itemRows.filter({ hasText: 'Maçã gala' }).locator('.item-check').check();
    await itemRows.filter({ hasText: 'Chuchu' }).locator('.item-check').check();
    await itemRows.filter({ hasText: 'Alho' }).locator('.item-check').check();

    const finalMessage = page.locator('#finalMessage');
    await expect(finalMessage).toBeVisible();
    const msg = await finalMessage.inputValue();

    // Cabeçalho de categorias com emoji nativo
    expect(msg).toContain('🍉 *FRUTAS*');
    expect(msg).toContain('🥕 *LEGUMES*');

    // Itens: prefixo com emoji nativo quando casa
    expect(msg).toContain('- 🍏 Maçã verde,');
    expect(msg).toContain('- 🍎 Maçã gala,');
    expect(msg).toContain('- 🧄 Alho,');

    // Item sem emoji correspondente (Chuchu) não deve ter prefixo de emoji
    expect(msg).toContain('- Chuchu,');
    expect(msg).not.toMatch(/-\s+\S+\s+Chuchu/);

    // 7. Teste de responsividade a 360px sem overflow horizontal
    await page.setViewportSize({ width: 360, height: 640 });
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });
});
