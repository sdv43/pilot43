---
description: Use this instruction when you need to format code, fix lint errors, fix sort order, or build the project.
---

All commands should be run from the project root. The repository is an npm workspaces monorepo (`packages/*`); root scripts run the tools for all packages or delegate to the right workspace.

# Important!!!

if you need to fix linting issues, always use `npm run lint:js -- --fix` and `npm run lint:css -- --fix` to automatically fix linting issues!!! Only if the issues cannot be fixed automatically, fix them manually.

# Formatting

- Run `npm run format` to format all files in the project.

# Linting, fixing issues

- Run `npm run lint:js` to check js errors and `npm run lint:js -- --fix` to fix linting issues.
- Run `npm run lint:css` to check css errors and `npm run lint:css -- --fix` to fix linting issues.

# Building

- Run `npm run build` to type-check all packages and create a production build of the extension in `packages/chrome-ext/dist`.

# Testing

- Run `npm run test:run` to run the unit tests of all packages, or `npx vitest run --project <package>` (e.g. `agent`) for one package.
- Run `npm run e2e` to build the extension and run the Playwright tests. Pass Playwright options through the workspace, e.g. `npm run e2e -w @pilot43/chrome-ext -- -g "test name"` (after `npm run build`).

# Dependencies

- Add a runtime dependency to the package that uses it: `npm install <dep> -w @pilot43/<package>`. Shared tooling (TypeScript, ESLint, Vite, Vitest, Playwright, type packages) stays in the root `devDependencies`.
