import { defineConfig } from "vitest/config"

// https://vitest.dev/config/
export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["packages/*/src/**/*.test.ts"],
  },
})
