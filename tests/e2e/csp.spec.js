const { test, expect } = require('@playwright/test');

test.describe('Content Security Policy (CSP)', () => {
  test('bloqueia injeção de script dinâmico e dispara securitypolicyviolation', async ({ page }) => {
    await page.route('https://cdn.jsdelivr.net/**', (route) => route.abort());
    await page.goto('/');

    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        let violated = false;
        document.addEventListener('securitypolicyviolation', () => {
          violated = true;
        }, { once: true });

        const script = document.createElement('script');
        script.textContent = 'window.__y=1';
        document.body.appendChild(script);

        setTimeout(() => {
          resolve({ y: window.__y, violated });
        }, 100);
      });
    });

    expect(result.y).toBeUndefined();
    expect(result.violated).toBe(true);
  });

  test('controle: executa script injetado quando sem CSP', async ({ page }) => {
    await page.route('https://cdn.jsdelivr.net/**', (route) => route.abort());
    await page.goto('/no-csp.html');

    const y = await page.evaluate(() => {
      const script = document.createElement('script');
      script.textContent = 'window.__y=1';
      document.body.appendChild(script);
      return window.__y;
    });

    expect(y).toBe(1);
  });
});
