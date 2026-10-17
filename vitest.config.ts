import { readdirSync } from "node:fs"
import { defineConfig } from "vitest/config"

const packages = readdirSync("packages", { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

// https://vitest.dev/config/
export default defineConfig({
  test: {
    // One project per workspace package, e.g. `vitest run --project agent`.
    projects: packages.map((name) => ({
      test: {
        environment: "node",
        globals: false,
        include: [`packages/${name}/src/**/*.test.ts`],
        name,
      },
    })),
  },
})
