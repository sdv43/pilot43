import path from "path"
import { defineConfig } from "vitest/config"

const srcDir = path.resolve(import.meta.dirname, "./src")

// https://vitest.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": srcDir,
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts"],
  },
})
