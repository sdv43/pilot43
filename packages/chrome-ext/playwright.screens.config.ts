import { defineConfig } from "@playwright/test"

/**
 * Renders the side panel with seeded mock data and saves screenshots to
 * `test-results/screens` for visual comparison with the Figma design.
 * Run with `npx playwright test -c playwright.screens.config.ts` after
 * building the extension.
 */
export default defineConfig({
  outputDir: "test-results/screens-artifacts",
  reporter: [["list"]],
  testDir: "./playwright/screens",
  timeout: 30_000,
  use: {
    deviceScaleFactor: 2,
    viewport: { height: 720, width: 400 },
  },
  workers: 2,
})
