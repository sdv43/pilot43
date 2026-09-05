import {
  test as base,
  type BrowserContext,
  chromium,
  expect,
  type Page,
} from "@playwright/test"
import { existsSync } from "node:fs"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { ApiClient } from "../src/shared/api"

interface Pilot43Fixtures {
  context: BrowserContext
  extensionId: string
  sidepanelPage: MockedSidepanelPage
  // sidepanelPage: Page
}

interface MockedSidepanelPage {
  mocks: ApiClient
  open: () => Promise<void>
  page: Page
  mockLocalStorage: (state: unknown) => Promise<void>
}

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const extensionPath = path.resolve(currentDir, "../dist")

export const test = base.extend<Pilot43Fixtures>({
  context: async ({ browserName: _browserName }, use, testInfo) => {
    assertBuiltExtension()

    const userDataDir = await mkdtemp(
      path.join(tmpdir(), "pilot43-playwright-"),
    )

    const context = await chromium.launchPersistentContext(userDataDir, {
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
      channel: "chromium",
      headless: testInfo.project.use.headless,
    })

    try {
      await use(context)
    } finally {
      await context.close()
      await rm(userDataDir, { force: true, recursive: true })
    }
  },

  extensionId: async ({ context }, use) => {
    let [serviceWorker] = context.serviceWorkers()

    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent("serviceworker")
    }

    await use(new URL(serviceWorker.url()).host)
  },

  sidepanelPage: async ({ context, extensionId }, use) => {
    const page = await context.newPage()
    const mocks = createApiClient()

    await page.exposeBinding(
      "__rpc",
      (_source, method: keyof ApiClient, ...args: any[]) => {
        return (mocks[method] as any)(...args)
      },
    )

    await page.addInitScript(() => {
      const apiClient = new Proxy({} as any, {
        get(_target, prop) {
          if (typeof prop !== "string") {
            return undefined
          }
          return (...args: any[]) => (globalThis as any).__rpc(prop, ...args)
        },
      })
      ;(
        globalThis as typeof globalThis & { __apiClient?: ApiClient }
      ).__apiClient = apiClient
    })

    const open = async () => {
      await page.goto(`chrome-extension://${extensionId}/sidepanel.html`)
      await page.waitForLoadState("domcontentloaded")
    }

    const mockLocalStorage = async (state: unknown) => {
      await page.addInitScript(() => {
        window.localStorage.setItem(
          "pilot43",
          JSON.stringify({
            state,
            version: 0,
          }),
        )
      })
    }

    try {
      await use({
        mocks,
        open,
        page,
        mockLocalStorage,
      })
    } finally {
      await page.close()
    }
  },
})

export { expect }

function assertBuiltExtension() {
  if (existsSync(path.join(extensionPath, "manifest.json"))) {
    return
  }

  throw new Error(
    "Built extension not found at ext/dist. Run `npm run build` or use `npm run e2e`.",
  )
}

function createApiClient(): ApiClient {
  return {
    appSettingsGet: function () {
      throw new Error("Function appSettingsGet not implemented.")
    },
    appSettingsUpdate: function (_settings) {
      throw new Error("Function appSettingsUpdate not implemented.")
    },
    workspaceGet: function () {
      throw new Error("Function workspaceGet not implemented.")
    },
    workspaceCreate: function (_workspace) {
      throw new Error("Function workspaceCreate not implemented.")
    },
    workspaceUpdate: function (_workspace) {
      throw new Error("Function workspaceUpdate not implemented.")
    },
    workspaceDelete: function (_workspaceId) {
      throw new Error("Function workspaceDelete not implemented.")
    },
    chatGetByWorkspace: function (_workspaceId) {
      throw new Error("Function chatGetByWorkspace not implemented.")
    },
    chatDelete: function (_chatId) {
      throw new Error("Function chatDelete not implemented.")
    },
    chatMessageSend: function (
      _chatId,
      _message,
      _model,
      _workspaceId,
      _initialSettings,
    ) {
      throw new Error("Function chatMessageSend not implemented.")
    },
    chatMessageRunGet: function (_chatId) {
      throw new Error("Function chatMessageRunGet not implemented.")
    },
    chatMessageRunRetry: function (_id) {
      throw new Error("Function chatMessageRunRetry not implemented.")
    },
    chatMessageRunStop: function (_id) {
      throw new Error("Function chatMessageRunStop not implemented.")
    },
    chatMessageRunDelete: function (_id) {
      throw new Error("Function chatMessageRunDelete not implemented.")
    },
    chatMessageRunAnswer: function (_id, _answer) {
      throw new Error("Function chatMessageRunAnswer not implemented.")
    },
    chatMessageRunDeleteAfter: function (_id) {
      throw new Error("Function chatMessageRunDeleteAfter not implemented.")
    },
    chatTokenEstimateGet: function (_chatId) {
      throw new Error("Function chatTokenEstimateGet not implemented.")
    },
    chatSettingsUpdate: function (_chatId, _settings) {
      throw new Error("Function chatSettingsUpdate not implemented.")
    },
    chatTitleUpdate: function (_chatId, _title) {
      throw new Error("Function chatTitleUpdate not implemented.")
    },
    chatTodoListClear: function (_chatId) {
      throw new Error("Function chatTodoListClear not implemented.")
    },
    modelToolGet: function () {
      throw new Error("Function modelToolGet not implemented.")
    },
    mcpServerGet: function () {
      throw new Error("Function mcpServerGet not implemented.")
    },
    mcpServerUpdate: function (_servers) {
      throw new Error("Function mcpServerUpdate not implemented.")
    },
    mcpServerToolsGet: function (_server) {
      throw new Error("Function mcpServerToolsGet not implemented.")
    },
    modelProviderTypeGet: function () {
      throw new Error("Function modelProviderTypeGet not implemented.")
    },
    modelProviderGet: function () {
      throw new Error("Function modelProviderGet not implemented.")
    },
    modelProviderModelGet: function (_providerId) {
      throw new Error("Function modelProviderModelGet not implemented.")
    },
    modelProviderCreate: function (_modelProvider) {
      throw new Error("Function modelProviderCreate not implemented.")
    },
    modelProviderUpdate: function (_modelProvider) {
      throw new Error("Function modelProviderUpdate not implemented.")
    },
    modelProviderDelete: function (_id) {
      throw new Error("Function modelProviderDelete not implemented.")
    },
    modelProviderCheck: function (_provider) {
      throw new Error("Function modelProviderCheck not implemented.")
    },
    commandGet: function () {
      throw new Error("Function commandGet not implemented.")
    },
    commandCreate: function (_command) {
      throw new Error("Function commandCreate not implemented.")
    },
    commandUpdate: function (_command) {
      throw new Error("Function commandUpdate not implemented.")
    },
    commandDelete: function (_id) {
      throw new Error("Function commandDelete not implemented.")
    },
    generatedFileGet: function (_fileId) {
      throw new Error("Function generatedFileGet not implemented.")
    },
    pageContentGet: function () {
      throw new Error("Function pageContentGet not implemented.")
    },
    pageContentGetById: function () {
      throw new Error("Function pageContentGetById not implemented.")
    },
    pageContentSelectionGet: function () {
      throw new Error("Function pageContentSelectionGet not implemented.")
    },
  }
}
