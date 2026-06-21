import eslintReact from "@eslint-react/eslint-plugin"
import js from "@eslint/js"
import perfectionist from "eslint-plugin-perfectionist"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import { defineConfig, globalIgnores } from "eslint/config"
import globals from "globals"
import tseslint from "typescript-eslint"
import tanstack from "@tanstack/eslint-plugin-query"

export default defineConfig([
  globalIgnores(["dist", "playwright-report", "test-results"]),
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["playwright.config.ts", "playwright/**/*"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      eslintReact.configs["strict-type-checked"],
      perfectionist.configs["recommended-natural"],
      tanstack.configs["flat/recommended"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@tanstack/query/exhaustive-deps": [
        "error",
        { allowlist: { variables: ["apiClient", "fetch"] } },
      ],
      "@typescript-eslint/no-floating-promises": [
        "error",
        { ignoreVoid: true },
      ],
      "@typescript-eslint/no-empty-object-type": [
        "error",
        { allowInterfaces: "with-single-extends" },
      ],
      "prefer-template": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
        },
      ],
      "perfectionist/sort-jsx-props": [
        "error",
        {
          type: "natural",
          order: "asc",
          ignoreCase: true,
          // В perfectionist группы определяются в массиве groups
          // Чем выше группа в списке, тем выше она в коде
          groups: [
            "key", // key, ref
            "ref", // key, ref
            "shorthand", // булевы пропы (disabled)
            "unknown", // всё остальное
            "callback", // хендлеры (on*)
          ],
          customGroups: [
            { groupName: "shorthand", modifiers: ["shorthand"] },
            { groupName: "callback", elementNamePattern: "^on.+" },
            {
              groupName: "key",
              elementNamePattern: "key",
            },
            {
              groupName: "ref",
              elementNamePattern: { pattern: "^ref" },
            },
          ],
        },
      ],
      "perfectionist/sort-classes": "off",
      "perfectionist/sort-decorators": "off",
      "perfectionist/sort-interfaces": "off",
      "perfectionist/sort-modules": "off",
      "perfectionist/sort-object-types": "off",
      "perfectionist/sort-objects": "off",
      "perfectionist/sort-switch-case": "off",
      "perfectionist/sort-variable-declarations": "off",
    },
  },
  {
    files: ["src/**/*.test.ts"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
])
