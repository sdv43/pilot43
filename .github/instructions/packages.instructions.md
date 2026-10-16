---
description: Load this instruction when adding code, moving code between packages, or adding dependencies. It describes the monorepo packages and the rules for what each package may import.
---

# Packages

| Package                  | Path                     | Contents                                                                                                                                                                                          |
| ------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@pilot43/protocol`      | `packages/protocol`      | `ApiClient` / `BackendApi` / `PageContextApi`, entities, notifications, shared pure helpers. Types and pure logic only.                                                                           |
| `@pilot43/agent`         | `packages/agent`         | `createAgent()`, the generation loop, handlers, model adapters, the tool runtime (`Tool`, `ToolProvider`, `ToolPolicy`), cross-platform tools, MCP, the `AgentStorage` port and the domain store. |
| `@pilot43/agent-browser` | `packages/agent-browser` | Browser implementations for the agent: IndexedDB storage, `read_webpage`, `run_js` (iframe sandbox).                                                                                              |
| `@pilot43/web`           | `packages/web`           | The React UI, mounted with `mountApp(root, { client })`.                                                                                                                                          |
| `@pilot43/chrome-ext`    | `packages/chrome-ext`    | The Chrome extension: manifest and Vite build, service worker, content script, offscreen document (creates the agent), side panel entry, Chrome messaging RPC, Playwright tests.                  |

# Import rules

Enforced by ESLint (`eslint.config.js`):

- `protocol` imports no other package.
- `agent` imports only `protocol`, and must stay platform-neutral: no `window`, `document`, `DOMParser`, `indexedDB`, `chrome`, `process`, `Buffer` or `node:*` imports. Platform-specific code is passed in through `createAgent()` options (storage, notifier, toolset, system prompt).
- `agent-browser` imports `agent` and `protocol`, and does not use `chrome`.
- `web` imports only `protocol` and does not use `chrome`.
- `chrome-ext` may import every package.

Inside a package use relative imports; import other packages by name (`@pilot43/<package>`) through their `src/index.ts` exports.

# Adding a tool

Implement the `Tool` interface from `@pilot43/agent`. Platform-neutral tools go to `packages/agent/src/tools`, browser-only tools to `packages/agent-browser/src/tools`. Tools are enabled for a platform in its toolset (`packages/chrome-ext/src/offscreen/toolset.ts` for the extension).
