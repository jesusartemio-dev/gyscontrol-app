/**
 * 🎭 Configuración de Playwright para Tests E2E
 * 
 * Configuración optimizada para testing de flujos completos
 * del Sistema GYS.
 * 
 * @author TRAE - Agente Senior Fullstack
 * @version 1.0.0
 */

import { defineConfig, devices } from '@playwright/test'

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './src/__tests__/e2e',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }]
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Timeout for each action */
    actionTimeout: 10000,
    
    /* Timeout for navigation */
    navigationTimeout: 30000,
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
    
    /* Viewport size */
    viewport: { width: 1280, height: 720 },
    
    /* User agent */
    userAgent: 'GYS-App-E2E-Tests'
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    
    // ✅ Accessibility testing with specific configuration
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        // Enable accessibility tree in DevTools
        launchOptions: {
          args: [
            '--enable-accessibility-logging',
            '--enable-logging=stderr',
            '--vmodule=accessibility*=1'
          ]
        }
      },
      testMatch: '**/*.accessibility.e2e.test.ts'
    },
    
    // 📊 Performance testing
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        // Enable performance metrics
        launchOptions: {
          args: [
            '--enable-precise-memory-info',
            '--enable-memory-info'
          ]
        }
      },
      testMatch: '**/*.performance.e2e.test.ts'
    },
    
    // 📱 Tablet testing
    {
      name: 'Tablet',
      use: { ...devices['iPad Pro'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes
    env: {
      NEXT_PRIVATE_SKIP_TURBO: '1'
    }
  },
  
  /* Global setup and teardown */
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  globalTeardown: require.resolve('./e2e/global-teardown.ts'),
  
  /* Test timeout */
  timeout: 30 * 1000, // 30 seconds
  
  /* Expect timeout */
  expect: {
    timeout: 5000
  },
  
  /* Output directory for test results */
  outputDir: 'test-results/',
  
  /* Ignore certain files */
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**'
  ]
})