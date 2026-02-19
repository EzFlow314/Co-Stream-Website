import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  retries: 2,
  use: {
    headless: true
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process']
        }
      }
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari']
      }
    }
  ]
});
