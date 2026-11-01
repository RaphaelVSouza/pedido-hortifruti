const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('ADR-013: PWA offline com Service Worker e Manifest', () => {
  test('Teste 1: PWA manifest e Service Worker registrados em 127.0.0.1:8080', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/');

    // 1. Verifica tags no head
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', 'manifest.json');

    const themeColorMeta = page.locator('meta[name="theme-color"]');
    await expect(themeColorMeta).toHaveAttribute('content', '#16a34a');

    const appleTouchIcon = page.locator('link[rel="apple-touch-icon"]');
    await expect(appleTouchIcon).toHaveAttribute('href', 'icons/icon-192.png');

    // 2. Valida manifest.json
    const manifestContent = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../manifest.json'), 'utf8'));
    expect(manifestContent.name).toBe('Hortifruti Digital - Pedido WhatsApp');
    expect(manifestContent.short_name).toBe('Hortifruti');
    expect(manifestContent.start_url).toBe('./');
    expect(manifestContent.display).toBe('standalone');
    expect(manifestContent.theme_color).toBe('#16a34a');
    expect(manifestContent.background_color).toBe('#ffffff');
    expect(manifestContent.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }),
        expect.objectContaining({ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }),
        expect.objectContaining({ src: 'favicon.svg', type: 'image/svg+xml' })
      ])
    );

    // 3. Verifica registro do Service Worker
    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.ready;
      return Boolean(reg && reg.active);
    });
    expect(swRegistered).toBe(true);

    // 4. Verifica existência física dos ícones PNG
    expect(fs.existsSync(path.resolve(__dirname, '../../icons/icon-192.png'))).toBe(true);
    expect(fs.existsSync(path.resolve(__dirname, '../../icons/icon-512.png'))).toBe(true);
    expect(pageErrors).toHaveLength(0);
  });

  test('Teste 2: Offline após carregamento inicial', async ({ page, context }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // 1. Carrega a página no servidor local
    await page.goto('/');

    // 2. Aguarda SW pronto
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });

    // 3. Processa texto para preencher carrinho e cachear ícones locais
    const sampleText = [
      '🍉 *FRUTAS*',
      'Banana prata R$ 4,99kg',
      'Maçã gala R$ 7,99kg'
    ].join('\n');
    await page.fill('#rawText', sampleText);
    await page.click('#processBtn');
    await expect(page.locator('#selectionSection')).toBeVisible();

    // Aguarda ícone carregar no DOM
    const bananaIcon = page.locator('.item-row').filter({ hasText: 'Banana prata' }).locator('.item-icon');
    await expect(bananaIcon).toBeVisible();

    // 4. Define offline
    await context.setOffline(true);

    // 5. Recarrega a página offline
    await page.reload();

    // 6. Valida que abre offline, exibe interface, não quebra e exibe ícones locais
    await expect(page.locator('#rawText')).toBeVisible();
    await expect(page.locator('#processBtn')).toBeVisible();
    await expect(page.locator('#selectionSection')).toBeVisible();

    const offlineBananaIcon = page.locator('.item-row').filter({ hasText: 'Banana prata' }).locator('.item-icon');
    await expect(offlineBananaIcon).toBeVisible();

    const iconLoaded = await offlineBananaIcon.evaluate((img) => img.complete && img.naturalWidth > 0);
    expect(iconLoaded).toBe(true);

    expect(pageErrors).toHaveLength(0);

    // Restaura online para testes subsequentes
    await context.setOffline(false);
  });

  test('Teste 3: file:// continua funcionando normalmente sem erros de Service Worker', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const htmlPath = path.resolve(__dirname, '../../index.html');
    const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

    await page.goto(fileUrl);

    await expect(page.locator('#rawText')).toBeVisible();
    await expect(page.locator('#processBtn')).toBeVisible();

    // Verifica que está no protocolo file:// e a página operou sem erros
    const isFileProtocol = await page.evaluate(() => location.protocol === 'file:');
    expect(isFileProtocol).toBe(true);

    // Processa conteúdo normalmente
    await page.fill('#rawText', 'Banana prata R$ 4,99kg');
    await page.click('#processBtn');
    await expect(page.locator('#selectionSection')).toBeVisible();

    expect(pageErrors).toHaveLength(0);
  });
});
