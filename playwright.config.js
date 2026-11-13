const { defineConfig, devices } = require('@playwright/test');

const PORT = process.env.PORT || '8080';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const useGpu = process.platform === 'win32' && !process.env.CI && process.env.PW_GPU !== '0';
const gpuArgs = useGpu
  ? ['--use-gl=angle', '--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist']
  : [];

module.exports = defineConfig({
  testDir: './tests/e2e',
  testMatch: '*.spec.js',
  use: {
    baseURL: BASE_URL,
    headless: true,
    viewport: { width: 360, height: 740 },
    launchOptions: {
      args: gpuArgs
    }
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
