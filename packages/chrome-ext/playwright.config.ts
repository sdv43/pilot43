import { defineConfig } from "@playwright/test"

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  outputDir: "test-results",
  reporter: [["list"], ["html", { open: "never" }]],
  retries: process.env.CI ? 2 : 0,
  testDir: "./playwright/tests",
  timeout: 20_000,
  use: {
    trace: "on-first-retry",
    viewport: {
      height: 800,
      width: 500,
    },
  },
  workers: 3,
})
