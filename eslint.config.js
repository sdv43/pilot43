import eslintReact from "@eslint-react/eslint-plugin"
import js from "@eslint/js"
import perfectionist from "eslint-plugin-perfectionist"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import { defineConfig, globalIgnores } from "eslint/config"
import globals from "globals"
import tseslint from "typescript-eslint"
import tanstack from "@tanstack/eslint-plugin-query"

/* Глобальные объекты конкретных платформ, недоступные в платформенно-
   независимых пакетах (protocol, agent), которые должны работать и в
   браузере, и в Node. */
const platformGlobals = [
  "Buffer",
  "chrome",
  "document",
  "DOMParser",
  "indexedDB",
  "localStorage",
  "location",
  "process",
  "self",
  "sessionStorage",
  "window",
]

const nodeBuiltinsPattern = {
  group: ["node:*"],
  message: "Node built-ins are not allowed in platform-neutral packages.",
}

export default defineConfig([
  globalIgnores(["**/dist", "**/playwright-report", "**/test-results"]),
  {
    files: ["**/*.{ts,tsx}"],
    ignores: [
      "packages/chrome-ext/playwright.config.ts",
      "packages/chrome-ext/playwright/**/*",
    ],
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
      /* `react-hooks/exhaustive-deps` уже покрывает проверку зависимостей
         хуков; дублирующее правило из @eslint-react даёт ложные срабатывания
         и не учитывает существующие отключения для react-hooks. */
      "@eslint-react/exhaustive-deps": "off",
      "@eslint-react/use-state": "off",
    },
  },
  {
    files: ["packages/*/src/**/*.test.ts"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  /* Границы пакетов: каждый пакет может импортировать только те пакеты,
     от которых он зависит по архитектуре монорепозитория. */
  {
    files: ["packages/protocol/src/**/*.ts"],
    rules: {
      "no-restricted-globals": ["error", ...platformGlobals],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            nodeBuiltinsPattern,
            {
              group: ["@pilot43/*"],
              message: "protocol must not depend on other packages.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/agent/src/**/*.ts"],
    ignores: ["packages/agent/src/**/*.test.ts"],
    rules: {
      "no-restricted-globals": ["error", ...platformGlobals],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            nodeBuiltinsPattern,
            {
              group: [
                "@pilot43/agent-browser",
                "@pilot43/chrome-ext",
                "@pilot43/web",
              ],
              message: "agent may depend only on @pilot43/protocol.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/agent-browser/src/**/*.ts"],
    rules: {
      "no-restricted-globals": ["error", "chrome"],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            nodeBuiltinsPattern,
            {
              group: ["@pilot43/chrome-ext", "@pilot43/web"],
              message:
                "agent-browser may depend only on @pilot43/agent and @pilot43/protocol.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/web/src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": ["error", "chrome"],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@pilot43/agent",
                "@pilot43/agent-browser",
                "@pilot43/chrome-ext",
              ],
              message: "web may depend only on @pilot43/protocol.",
            },
          ],
        },
      ],
    },
  },
])
