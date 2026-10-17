# Pilot43

<div align="center">

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/bkklidgcaomnlpaenepbdjeogkippjkc)](https://chromewebstore.google.com/detail/pilot43/bkklidgcaomnlpaenepbdjeogkippjkc)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

Pilot43 is a modern AI-powered browser extension that brings intelligent assistance directly into your workflow. Open a sleek side panel to chat with your favorite AI models, get instant help while browsing, summarize web content, and organize your work in a clean and intuitive experience.

Whether you are researching, writing, planning, or working through tasks, Pilot43 helps you stay focused without switching tools or leaving the page.

## ✨ Key Features

- **AI Chat in Side Panel** — Chat with your favorite AI models in a convenient side panel while you browse
- **Page-Aware Assistance** — Get context-aware help using selected text and web content
- **Organized Conversations** — Keep your chats organized with workspaces and chat history
- **Multiple Model Providers** — Support for OpenAI, Ollama, and other model providers
- **Custom Commands** — Use custom commands to speed up your workflow and automate repetitive tasks

## 🔗 Installation

Install Pilot43 from the [Chrome Web Store](https://chromewebstore.google.com/detail/pilot43/bkklidgcaomnlpaenepbdjeogkippjkc)

## 🛠️ Development

Pilot43 is an npm workspaces monorepo:

| Package                                   | Description                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| [`protocol`](packages/protocol)           | API contract shared by the UI and the agent                              |
| [`agent`](packages/agent)                 | Platform-neutral LLM agent: generation loop, tools, model providers, MCP |
| [`agent-browser`](packages/agent-browser) | Browser storage and tools for the agent                                  |
| [`web`](packages/web)                     | React UI                                                                 |
| [`chrome-ext`](packages/chrome-ext)       | Chrome extension that runs the agent and the UI                          |

Requires Node.js 24.

```sh
npm install
npm run build      # type-check and build the extension into packages/chrome-ext/dist
npm run test:run   # unit tests
npm run e2e        # build and run the Playwright tests (first run: npm run e2e:install)
npm run lint:js && npm run lint:css
```

Load `packages/chrome-ext/dist` as an unpacked extension in `chrome://extensions` to try a build.

## 📜 License

[MIT License](LICENSE)
