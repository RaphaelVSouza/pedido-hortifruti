const { defineConfig, devices } = require('@playwright/test');

const PORT = process.env.PORT || '8080';
const BASE_URL = `http://127.0.0.1:${PORT}`;

module.exports = defineConfig({
  testDir: './tests/e2e',
  testMatch: '*.spec.js',
  use: {
    baseURL: BASE_URL,
    headless: true,
    viewport: { width: 360, height: 740 }
  },
  webServer: {
    command: 'node tests/e2e/server.js',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 360, height: 740 }
      }
    }
  ]
});
