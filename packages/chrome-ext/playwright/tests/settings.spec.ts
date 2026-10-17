import type {
  AppSettings,
  McpServer,
  ModelProviderModel,
  ModelTool,
  OpenAIModelProvider,
  Prompt,
  Workspace,
} from "@pilot43/protocol"
import type { Page } from "@playwright/test"
import { expect, type MockedApi, test } from "../fixtures"
import { modelProviderTypes } from "./mocks/providers"
import {
  confirmDialog,
  getConfirmDialog,
  openSettings,
  openSettingsTab,
  type SettingsTab,
  settingsTabs,
} from "./utils/settings"
import { getLatestToast } from "./utils/toast"

type ModelProvider = Awaited<ReturnType<MockedApi["modelProviderGet"]>>[number]

function createWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: "w1",
    lastSelectedChatId: null,
    name: "Workspace 1",
    ...overrides,
  }
}

function createProvider(
  overrides: Partial<OpenAIModelProvider> = {},
): OpenAIModelProvider {
  const { settings, ...restOverrides } = overrides

  return {
    id: "provider-1",
    type: "openai",
    name: "OpenAI Primary",
    ...restOverrides,
    settings: {
      apiKey: "sk-test-91c0",
      ...settings,
    },
  }
}

function createModel(
  overrides: Partial<ModelProviderModel> = {},
): ModelProviderModel {
  return {
    id: "provider-1::gpt-4.1",
    name: "gpt-4.1",
    providerId: "provider-1",
    ...overrides,
  }
}

function createPrompt(overrides: Partial<Prompt> = {}): Prompt {
  return {
    id: "prompt-1",
    title: "Explain code",
    text: "Explain the following code:",
    builtin: false,
    ...overrides,
  }
}

function createServer(overrides: Partial<McpServer> = {}): McpServer {
  return {
    name: "github",
    type: "http",
    url: "https://mcp.example.com/github",
    ...overrides,
  }
}

function createTool(name: string): ModelTool {
  return { defaultEnabled: true, description: `${name} tool`, id: name, name }
}

/** Mutable backend state behind the mocked api client. */
interface SettingsState {
  appSettings: AppSettings
  mcpServers: McpServer[]
  mcpServerTools: Record<string, ModelTool[]>
  prompts: Prompt[]
  providerModels: Record<string, ModelProviderModel[]>
  providers: ModelProvider[]
  tools: ModelTool[]
  workspaces: Workspace[]
}

function setupSettingsMocks(sidepanelPage: { mocks: MockedApi }) {
  const state: SettingsState = {
    appSettings: { id: "app" },
    mcpServers: [],
    mcpServerTools: {},
    prompts: [],
    providerModels: {},
    providers: [],
    tools: [],
    workspaces: [createWorkspace()],
  }
  const mocks = sidepanelPage.mocks

  mocks.appSettingsGet = async () => state.appSettings
  mocks.appSettingsUpdate = async (settings) => {
    state.appSettings = settings
    return settings
  }
  mocks.chatGetByWorkspace = async () => []
  mocks.chatMessageRunGet = async () => []
  mocks.chatTokenEstimateGet = async () => 0
  mocks.mcpServerGet = async () => state.mcpServers
  mocks.mcpServerUpdate = async (servers) => {
    state.mcpServers = servers
    return servers
  }
  mocks.mcpServerToolsGet = async (server) =>
    state.mcpServerTools[server.name] ?? []
  mocks.modelProviderGet = async () => state.providers
  mocks.modelProviderModelGet = async (providerId) =>
    state.providerModels[providerId] ?? []
  mocks.modelProviderTypeGet = async () => modelProviderTypes
  mocks.modelProviderCheck = async () => ({ message: "ok", success: true })
  mocks.modelProviderCreate = async (provider) => {
    const created = {
      ...provider,
      id: `provider-${state.providers.length + 1}`,
    }
    state.providers = [...state.providers, created as ModelProvider]
    return created as ModelProvider
  }
  mocks.modelProviderUpdate = async (provider) => {
    state.providers = state.providers.map((item) =>
      item.id === provider.id ? provider : item,
    )
    return provider
  }
  mocks.modelProviderDelete = async (id) => {
    state.providers = state.providers.filter((item) => item.id !== id)
  }
  mocks.modelToolGet = async () => state.tools
  mocks.pageContentGet = async () => []
  mocks.pageContentSelectionGet = async () => null
  mocks.promptGet = async () => state.prompts
  mocks.promptCreate = async (prompt) => {
    const created = { ...prompt, builtin: false, id: `prompt-new` }
    state.prompts = [...state.prompts, created]
    return created
  }
  mocks.promptUpdate = async (prompt) => {
    state.prompts = state.prompts.map((item) =>
      item.id === prompt.id ? prompt : item,
    )
    return prompt
  }
  mocks.promptDelete = async (id) => {
    state.prompts = state.prompts.filter((item) => item.id !== id)
  }
  mocks.workspaceGet = async () => state.workspaces
  mocks.workspaceUpdate = async (workspace) => {
    state.workspaces = state.workspaces.map((item) =>
      item.id === workspace.id ? workspace : item,
    )
    return workspace
  }

  return state
}

function getPermissionSelector(p: Page, name: string) {
  return p.getByRole("button", {
    name: new RegExp(`^Permission for ${name}: `),
  })
}

/** Opens a permission selector and picks a value from its menu. */
async function selectPermission(p: Page, name: string, value: string) {
  await getPermissionSelector(p, name).click()

  const menu = p.getByRole("menu").filter({ visible: true })

  await expect(menu.getByRole("menuitemradio", { checked: true })).toHaveCount(
    1,
  )
  await menu
    .getByRole("menuitemradio", { name: new RegExp(`^${value}`) })
    .click()
  await expect(getPermissionSelector(p, name)).toHaveText(value)
}

async function openRowAction(p: Page, rowName: string, action: string) {
  await p.getByRole("button", { name: `Actions for ${rowName}` }).click()
  await p.getByRole("menuitem", { name: action }).click()
}

test.describe("Settings", () => {
  test.describe("navigation", () => {
    test("opens General by default", async ({ sidepanelPage }) => {
      setupSettingsMocks(sidepanelPage)
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await page.getByRole("button", { name: "Settings" }).click()

      await expect(page).toHaveURL(/#\/settings\/general$/)
      await expect(page.getByTestId("settings-tab-general")).toHaveAttribute(
        "aria-current",
        "page",
      )
    })

    for (const tab of Object.keys(settingsTabs) as SettingsTab[]) {
      test(`opens the "${tab}" tab`, async ({ sidepanelPage }) => {
        setupSettingsMocks(sidepanelPage)
        const page = sidepanelPage.page

        await sidepanelPage.open()
        await openSettings(page, tab)

        await expect(page).toHaveURL(
          new RegExp(`#/settings/${settingsTabs[tab]}$`),
        )
      })
    }

    test("returns to the chat", async ({ sidepanelPage }) => {
      setupSettingsMocks(sidepanelPage)
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Prompts")
      await page.getByRole("button", { name: "Back to chat" }).click()

      await expect(page).toHaveURL(/#\/w\/w1$/)
    })
  })

  test.describe("General", () => {
    test("autosaves the chat retention", async ({ sidepanelPage }) => {
      const state = setupSettingsMocks(sidepanelPage)
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page)

      const select = page.getByTestId("chat-retention-select")

      await expect(select).toHaveValue("never")
      await select.selectOption("90")

      await expect.poll(() => state.appSettings.chatRetentionDays).toBe(90)
    })

    test("switches and remembers the theme", async ({ sidepanelPage }) => {
      setupSettingsMocks(sidepanelPage)
      const page = sidepanelPage.page
      const background = () =>
        page.evaluate(() => getComputedStyle(document.body).backgroundColor)

      await page.emulateMedia({ colorScheme: "light" })
      await sidepanelPage.open()
      await openSettings(page)

      const select = page.getByTestId("theme-select")

      await expect(select).toHaveValue("system")
      expect(await background()).toBe("rgb(255, 255, 255)")

      await page.emulateMedia({ colorScheme: "dark" })
      await expect.poll(background).toBe("rgb(23, 23, 26)")

      await select.selectOption("light")
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
      await expect.poll(background).toBe("rgb(255, 255, 255)")

      await page.emulateMedia({ colorScheme: "light" })
      await select.selectOption("dark")
      await expect.poll(background).toBe("rgb(23, 23, 26)")

      await page.reload()
      await expect(page.getByTestId("theme-select")).toHaveValue("dark")
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")

      await page.getByTestId("theme-select").selectOption("system")
      await expect(page.locator("html")).not.toHaveAttribute("data-theme")
      await expect.poll(background).toBe("rgb(255, 255, 255)")
    })

    test("shows a toast when saving fails", async ({ sidepanelPage }) => {
      setupSettingsMocks(sidepanelPage)
      sidepanelPage.mocks.appSettingsUpdate = async () => {
        throw new Error("Save failed")
      }
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page)
      await page.getByTestId("chat-retention-select").selectOption("30")

      await expect(getLatestToast(page)).toHaveText(
        "Failed to save settings: Save failed",
      )
      await expect(getLatestToast(page)).toHaveAttribute(
        "data-variant",
        "error",
      )

      await getLatestToast(page)
        .getByRole("button", { name: "Dismiss" })
        .click()
      await expect(page.getByRole("alert")).toHaveCount(0)
    })

    test("deletes all data and opens the new empty workspace", async ({
      sidepanelPage,
    }) => {
      const state = setupSettingsMocks(sidepanelPage)
      let deleteCalls = 0

      sidepanelPage.mocks.dataDeleteAll = async () => {
        deleteCalls += 1
        const workspace = createWorkspace({ id: "w-new", name: "Personal" })
        state.workspaces = [workspace]
        return workspace
      }
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page)
      await page.getByTestId("delete-all-data").click()

      await expect(
        getConfirmDialog(page).getByTestId("confirm-dialog-confirm"),
      ).toBeDisabled()
      await confirmDialog(page, "DELETE")

      await expect(page).toHaveURL(/#\/w\/w-new$/)
      await expect(getLatestToast(page)).toHaveText(
        "All workspaces and chats were deleted",
      )
      expect(deleteCalls).toBe(1)
    })

    test("shows a toast when deleting all data fails", async ({
      sidepanelPage,
    }) => {
      setupSettingsMocks(sidepanelPage)
      sidepanelPage.mocks.dataDeleteAll = async () => {
        throw new Error("Delete failed")
      }
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page)
      await page.getByTestId("delete-all-data").click()
      await confirmDialog(page, "DELETE")

      await expect(getLatestToast(page)).toHaveText(
        "Failed to delete data: Delete failed",
      )
      await expect(page).toHaveURL(/#\/settings\/general$/)
    })
  })

  test.describe("Providers", () => {
    test("shows an empty state", async ({ sidepanelPage }) => {
      setupSettingsMocks(sidepanelPage)
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Providers")

      await expect(page.getByText("Providers · 0")).toBeVisible()
      await expect(
        page.getByText(
          "Add an OpenAI, OpenRouter or Ollama provider to start chatting.",
        ),
      ).toBeVisible()
    })

    test("lists providers with their key, models and status", async ({
      sidepanelPage,
    }) => {
      const state = setupSettingsMocks(sidepanelPage)
      state.providers = [
        createProvider(),
        createProvider({
          id: "provider-2",
          name: "Broken",
          settings: { apiKey: "bad-key" },
        }),
      ]
      sidepanelPage.mocks.modelProviderCheck = async (provider) =>
        provider.id === "provider-1"
          ? { message: "ok", models: ["gpt-4.1", "o3"], success: true }
          : { message: "401 Unauthorized", success: false }
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Providers")

      const rows = page.getByTestId("provider-row")

      await expect(rows).toHaveCount(2)
      await expect(rows.nth(0)).toContainText("OpenAI Primary")
      await expect(rows.nth(0)).toContainText("•••• 91c0 · 2 models")
      await expect(rows.nth(0)).toContainText("Connected")
      await expect(rows.nth(1)).toContainText("Invalid key")
    })

    test("adds an OpenAI provider", async ({ sidepanelPage }) => {
      const state = setupSettingsMocks(sidepanelPage)
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Providers")
      await page.getByTestId("add-provider").click()

      await expect(
        page.getByRole("heading", { name: "Add provider" }),
      ).toBeVisible()
      await expect(page.getByTestId("provider-type-openai")).toHaveAttribute(
        "aria-checked",
        "true",
      )
      await expect(page.getByTestId("provider-name-input")).toHaveValue(
        "OpenAI",
      )
      await expect(page.getByTestId("provider-save")).toBeDisabled()

      await page.getByTestId("provider-api-key-input").fill("sk-new")
      await page
        .getByTestId("provider-base-url-input")
        .fill("https://proxy.example.com/v1")
      await page.getByTestId("provider-save").click()

      await expect(page.getByTestId("provider-row")).toHaveCount(1)
      expect(state.providers[0]).toMatchObject({
        name: "OpenAI",
        settings: { apiKey: "sk-new", host: "https://proxy.example.com/v1" },
        type: "openai",
      })
    })

    test("adds an Ollama provider requiring a host", async ({
      sidepanelPage,
    }) => {
      const state = setupSettingsMocks(sidepanelPage)
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Providers")
      await page.getByTestId("add-provider").click()
      await page.getByTestId("provider-type-ollama").click()

      const host = page.getByTestId("provider-host-input")

      await expect(host).toHaveValue("http://localhost:11434")
      await expect(page.getByTestId("provider-api-key-input")).toHaveCount(0)

      await host.fill("")
      await expect(page.getByTestId("provider-save")).toBeDisabled()
      await expect(page.getByTestId("provider-test")).toBeDisabled()

      await host.fill("http://192.168.1.4:11434")
      await page.getByTestId("provider-save").click()

      await expect.poll(() => state.providers.length).toBe(1)
      expect(state.providers[0]).toMatchObject({
        name: "Ollama",
        settings: { host: "http://192.168.1.4:11434" },
        type: "ollama",
      })
    })

    test("tests the connection", async ({ sidepanelPage }) => {
      setupSettingsMocks(sidepanelPage)
      sidepanelPage.mocks.modelProviderCheck = async () => ({
        latencyMs: 312,
        message: "ok",
        models: ["gpt-4.1", "o3"],
        success: true,
      })
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Providers")
      await page.getByTestId("add-provider").click()
      await page.getByTestId("provider-api-key-input").fill("sk-new")
      await page.getByTestId("provider-test").click()

      const result = page.getByTestId("connection-result")

      await expect(result).toContainText("Connected · 2 models · 312 ms")
      await expect(result).toHaveAttribute("data-success", "true")
      // OpenAI-compatible models get editable reasoning levels.
      await expect(page.getByTestId("model-levels-row")).toHaveCount(2)
    })

    test("shows a connection error", async ({ sidepanelPage }) => {
      setupSettingsMocks(sidepanelPage)
      sidepanelPage.mocks.modelProviderCheck = async () => ({
        message: "Invalid API key",
        success: false,
      })
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Providers")
      await page.getByTestId("add-provider").click()
      await page.getByTestId("provider-api-key-input").fill("sk-bad")
      await page.getByTestId("provider-test").click()

      const result = page.getByTestId("connection-result")

      await expect(result).toContainText("Invalid API key")
      await expect(result).toHaveAttribute("data-success", "false")
    })

    test("edits a provider and its reasoning levels", async ({
      sidepanelPage,
    }) => {
      const state = setupSettingsMocks(sidepanelPage)
      state.providers = [createProvider()]
      state.providerModels = { "provider-1": [createModel()] }
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Providers")
      await page.getByRole("button", { name: /^OpenAI Primary/ }).click()

      await expect(
        page.getByRole("heading", { name: "Edit provider · OpenAI Primary" }),
      ).toBeVisible()
      await expect(page.getByTestId("provider-type-ollama")).toBeDisabled()

      await page.getByTestId("provider-name-input").fill("Work OpenAI")

      const levels = page.getByLabel("Reasoning levels of gpt-4.1")

      await levels.fill("low")
      await levels.press("Enter")
      await levels.fill("max")
      await levels.press("Enter")
      await page.getByLabel("Default level of gpt-4.1").selectOption("max")
      await page.getByTestId("provider-save").click()

      await expect(page.getByTestId("provider-row")).toContainText(
        "Work OpenAI",
      )
      expect(state.providers[0]).toMatchObject({
        models: {
          "gpt-4.1": {
            reasoning: {
              defaultEffort: "max",
              supportedEfforts: ["low", "max"],
            },
          },
        },
        name: "Work OpenAI",
      })
    })

    test("shows a toast when saving fails", async ({ sidepanelPage }) => {
      const state = setupSettingsMocks(sidepanelPage)
      state.providers = [createProvider()]
      sidepanelPage.mocks.modelProviderUpdate = async () => {
        throw new Error("Update failed")
      }
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Providers")
      await openRowAction(page, "OpenAI Primary", "Edit")
      await page.getByTestId("provider-save").click()

      await expect(getLatestToast(page)).toHaveText(
        "Failed to save provider: Update failed",
      )
      await expect(
        page.getByRole("heading", { name: "Edit provider · OpenAI Primary" }),
      ).toBeVisible()
    })

    test("deletes a provider after confirmation", async ({ sidepanelPage }) => {
      const state = setupSettingsMocks(sidepanelPage)
      state.providers = [createProvider()]
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Providers")
      await openRowAction(page, "OpenAI Primary", "Delete")
      await confirmDialog(page)

      await expect(page.getByTestId("provider-row")).toHaveCount(0)
      expect(state.providers).toEqual([])
    })

    test("deletes a provider from its edit page", async ({ sidepanelPage }) => {
      const state = setupSettingsMocks(sidepanelPage)
      state.providers = [createProvider()]
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Providers")
      await openRowAction(page, "OpenAI Primary", "Edit")
      await page.getByRole("button", { name: "Delete", exact: true }).click()

      await expect(getConfirmDialog(page)).toContainText(
        "Chats keep their history, but can no longer use its models.",
      )
      await confirmDialog(page)

      await expect(page.getByText("Providers · 0")).toBeVisible()
      expect(state.providers).toEqual([])
    })

    test("adds an OpenRouter provider", async ({ sidepanelPage }) => {
      const state = setupSettingsMocks(sidepanelPage)
      sidepanelPage.mocks.modelProviderCheck = async () => ({
        message: "ok",
        models: ["openai/gpt-4.1"],
        success: true,
      })
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Providers")
      await page.getByTestId("add-provider").click()
      await page.getByTestId("provider-name-input").fill("Router")
      await page.getByTestId("provider-type-openrouter").click()

      await expect(
        page.getByTestId("provider-type-openrouter"),
      ).toHaveAttribute("aria-checked", "true")
      // A custom name is kept when switching the type.
      await expect(page.getByTestId("provider-name-input")).toHaveValue(
        "Router",
      )
      await expect(page.getByTestId("provider-api-key-input")).toHaveAttribute(
        "placeholder",
        "sk-or-…",
      )
      await expect(page.getByTestId("provider-base-url-input")).toHaveCount(0)

      await page.getByTestId("provider-api-key-input").fill("sk-or-new")
      await page.getByTestId("provider-test").click()

      await expect(page.getByTestId("connection-result")).toHaveAttribute(
        "data-success",
        "true",
      )
      // OpenRouter reports reasoning levels itself.
      await expect(page.getByTestId("model-levels-row")).toHaveCount(0)

      await page.getByTestId("provider-save").click()

      await expect(page.getByTestId("provider-row")).toHaveCount(1)
      expect(state.providers[0]).toMatchObject({
        name: "Router",
        settings: { apiKey: "sk-or-new" },
        type: "openrouter",
      })
    })

    test("collapses long model lists", async ({ sidepanelPage }) => {
      setupSettingsMocks(sidepanelPage)
      sidepanelPage.mocks.modelProviderCheck = async () => ({
        message: "ok",
        models: ["m1", "m2", "m3", "m4", "m5", "m6"],
        success: true,
      })
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Providers")
      await page.getByTestId("add-provider").click()
      await page.getByTestId("provider-api-key-input").fill("sk-new")
      await page.getByTestId("provider-test").click()

      const rows = page.getByTestId("model-levels-row")

      await expect(page.getByText("Models · 6")).toBeVisible()
      await expect(rows).toHaveCount(4)

      await page.getByRole("button", { name: "Show all 6 models" }).click()
      await expect(rows).toHaveCount(6)

      await page.getByRole("button", { name: "Show fewer models" }).click()
      await expect(rows).toHaveCount(4)
    })

    test("removes reasoning levels and picks a new default", async ({
      sidepanelPage,
    }) => {
      const state = setupSettingsMocks(sidepanelPage)
      state.providers = [
        createProvider({
          models: {
            "gpt-4.1": {
              reasoning: {
                defaultEffort: "high",
                supportedEfforts: ["low", "medium", "high"],
              },
            },
          },
        }),
      ]
      state.providerModels = { "provider-1": [createModel()] }
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Providers")
      await openRowAction(page, "OpenAI Primary", "Edit")

      const row = page.getByTestId("model-levels-row")
      const defaultLevel = page.getByLabel("Default level of gpt-4.1")

      await expect(row).toContainText("low, medium, high · default high")

      // Removing the default falls back to "medium".
      await row.getByRole("button", { name: "Remove high" }).click()
      await expect(row.getByTestId("tag")).toHaveText(["low", "medium"])
      await expect(defaultLevel).toHaveValue("medium")

      // Backspace in the empty input removes the last level.
      await page.getByLabel("Reasoning levels of gpt-4.1").press("Backspace")
      await expect(row.getByTestId("tag")).toHaveText(["low"])
      await expect(row).toContainText("low · default low")

      // Collapsing the row hides the editor.
      await row.getByRole("button", { name: /^gpt-4\.1/ }).click()
      await expect(page.getByLabel("Reasoning levels of gpt-4.1")).toHaveCount(
        0,
      )

      await page.getByTestId("provider-save").click()

      await expect
        .poll(() => state.providers[0]?.models)
        .toEqual({
          "gpt-4.1": {
            reasoning: { defaultEffort: "low", supportedEfforts: ["low"] },
          },
        })
    })

    test("keeps the provider when deletion is cancelled", async ({
      sidepanelPage,
    }) => {
      const state = setupSettingsMocks(sidepanelPage)
      state.providers = [createProvider()]
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Providers")
      await openRowAction(page, "OpenAI Primary", "Delete")
      await getConfirmDialog(page)
        .getByRole("button", { name: "Cancel" })
        .click()

      await expect(page.getByTestId("provider-row")).toHaveCount(1)
    })

    test("shows a toast when deleting fails", async ({ sidepanelPage }) => {
      const state = setupSettingsMocks(sidepanelPage)
      state.providers = [createProvider()]
      sidepanelPage.mocks.modelProviderDelete = async () => {
        throw new Error("Delete failed")
      }
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Providers")
      await openRowAction(page, "OpenAI Primary", "Delete")
      await confirmDialog(page)

      await expect(getLatestToast(page)).toHaveText(
        "Failed to delete provider: Delete failed",
      )
    })
  })

  test.describe("MCP", () => {
    test("shows an empty state", async ({ sidepanelPage }) => {
      setupSettingsMocks(sidepanelPage)
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "MCP")

      await expect(
        page.getByText(
          "Connect a remote MCP server over HTTP to give chats more tools.",
        ),
      ).toBeVisible()
    })

    test("lists servers with their connection status", async ({
      sidepanelPage,
    }) => {
      const state = setupSettingsMocks(sidepanelPage)
      state.mcpServers = [
        createServer(),
        createServer({ name: "docs", url: "https://mcp.example.com/docs" }),
      ]
      state.mcpServerTools = {
        github: [createTool("mcp__github__create_issue")],
      }
      sidepanelPage.mocks.mcpServerToolsGet = async (server) => {
        if (server.name === "docs") {
          throw new Error("401 Unauthorized")
        }

        return state.mcpServerTools[server.name] ?? []
      }
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "MCP")

      const rows = page.getByTestId("mcp-server-row")

      await expect(rows.nth(0)).toContainText("Connected · 1 tool")
      await expect(rows.nth(1)).toContainText("401 Unauthorized")
    })

    test("adds a server with a header", async ({ sidepanelPage }) => {
      const state = setupSettingsMocks(sidepanelPage)
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "MCP")
      await page.getByTestId("add-mcp-server").click()

      await expect(
        page.getByRole("heading", { name: "Add MCP server" }),
      ).toBeVisible()
      await page.getByTestId("mcp-server-name-input").fill("github")
      await page
        .getByTestId("mcp-server-url-input")
        .fill("https://mcp.example.com/github")
      await page.getByRole("button", { name: "Add header" }).click()
      await page.getByLabel("Header name").fill("Authorization")
      await page.getByLabel("Header value").fill("Bearer token")
      await page.getByTestId("mcp-server-save").click()

      await expect(page.getByTestId("mcp-server-row")).toHaveCount(1)
      expect(state.mcpServers).toEqual([
        {
          headers: { Authorization: "Bearer token" },
          name: "github",
          type: "http",
          url: "https://mcp.example.com/github",
        },
      ])
    })

    test("validates the name and URL", async ({ sidepanelPage }) => {
      const state = setupSettingsMocks(sidepanelPage)
      state.mcpServers = [createServer()]
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "MCP")
      await page.getByTestId("add-mcp-server").click()
      await page.getByTestId("mcp-server-save").click()

      await expect(page.getByText("Name is required")).toBeVisible()
      await expect(
        page.getByText(
          "Enter the full server URL, e.g. https://mcp.example.com/mcp",
        ),
      ).toBeVisible()

      await page.getByTestId("mcp-server-name-input").fill("github")
      await page.getByTestId("mcp-server-url-input").fill("ftp://example.com")
      await page.getByTestId("mcp-server-save").click()

      await expect(
        page.getByText("A server with this name already exists"),
      ).toBeVisible()
      await expect(page.getByText("Use an http(s) URL")).toBeVisible()
      expect(state.mcpServers).toHaveLength(1)
    })

    test("tests the connection and lists the tools", async ({
      sidepanelPage,
    }) => {
      const state = setupSettingsMocks(sidepanelPage)
      state.mcpServerTools = {
        test: [
          createTool("mcp__test__search"),
          createTool("mcp__test__create_issue"),
        ],
      }
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "MCP")
      await page.getByTestId("add-mcp-server").click()
      await page
        .getByTestId("mcp-server-url-input")
        .fill("https://mcp.example.com/github")
      await page.getByTestId("mcp-server-test").click()

      const result = page.getByTestId("connection-result")

      await expect(result).toContainText("Connected · 2 tools discovered")
      await expect(result).toContainText("search")
      await expect(result).toContainText("create_issue")
    })

    test("renames a server in every workspace", async ({ sidepanelPage }) => {
      const state = setupSettingsMocks(sidepanelPage)
      state.mcpServers = [createServer()]
      state.workspaces = [
        createWorkspace({
          mcpServers: ["github"],
          toolPermissions: { mcp: { github: { level: "allow" } } },
        }),
      ]
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "MCP")
      await openRowAction(page, "github", "Edit")
      await page.getByTestId("mcp-server-name-input").fill("gh")
      await page.getByTestId("mcp-server-save").click()

      await expect(page.getByTestId("mcp-server-row")).toContainText("gh")
      await expect
        .poll(() => state.workspaces[0])
        .toMatchObject({
          mcpServers: ["gh"],
          toolPermissions: { mcp: { gh: { level: "allow" } } },
        })
    })

    test("deletes a server after confirmation", async ({ sidepanelPage }) => {
      const state = setupSettingsMocks(sidepanelPage)
      state.mcpServers = [createServer()]
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "MCP")
      await openRowAction(page, "github", "Delete")
      await confirmDialog(page)

      await expect(page.getByTestId("mcp-server-row")).toHaveCount(0)
      expect(state.mcpServers).toEqual([])
    })

    test("deletes a server from its edit page", async ({ sidepanelPage }) => {
      const state = setupSettingsMocks(sidepanelPage)
      state.mcpServers = [createServer()]
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "MCP")
      await openRowAction(page, "github", "Edit")
      await page.getByRole("button", { name: "Delete", exact: true }).click()
      await confirmDialog(page)

      await expect(page.getByTestId("mcp-server-row")).toHaveCount(0)
      expect(state.mcpServers).toEqual([])
    })

    test("shows a toast when deleting from the edit page fails", async ({
      sidepanelPage,
    }) => {
      const state = setupSettingsMocks(sidepanelPage)
      state.mcpServers = [createServer()]
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "MCP")
      await openRowAction(page, "github", "Edit")
      sidepanelPage.mocks.mcpServerUpdate = async () => {
        throw new Error("Delete failed")
      }
      await page.getByRole("button", { name: "Delete", exact: true }).click()
      await confirmDialog(page)

      await expect(getLatestToast(page)).toHaveText(
        "Failed to delete server: Delete failed",
      )
      await expect(page.getByTestId("mcp-server-name-input")).toHaveValue(
        "github",
      )
    })

    for (const from of ["list", "edit page"]) {
      test(`removes a server deleted from the ${from} from every workspace`, async ({
        sidepanelPage,
      }) => {
        const state = setupSettingsMocks(sidepanelPage)
        state.mcpServers = [createServer(), createServer({ name: "docs" })]
        state.workspaces = [
          createWorkspace({
            mcpServers: ["github", "docs"],
            toolPermissions: {
              builtin: { level: "ask" },
              mcp: {
                docs: { level: "ask" },
                github: {
                  level: "allow",
                  tools: { mcp__github__search: "ask" },
                },
              },
            },
          }),
          createWorkspace({ id: "w2", name: "Workspace 2" }),
        ]
        const updated: string[] = []
        const updateWorkspace = sidepanelPage.mocks.workspaceUpdate
        sidepanelPage.mocks.workspaceUpdate = async (workspace) => {
          updated.push(workspace.id)
          return updateWorkspace(workspace)
        }
        const page = sidepanelPage.page

        await sidepanelPage.open()
        await openSettings(page, "MCP")

        if (from === "list") {
          await openRowAction(page, "github", "Delete")
        } else {
          await openRowAction(page, "github", "Edit")
          await page
            .getByRole("button", { name: "Delete", exact: true })
            .click()
        }

        await confirmDialog(page)

        await expect(page.getByTestId("mcp-server-row")).toHaveCount(1)
        await expect
          .poll(() => state.workspaces[0])
          .toMatchObject({
            mcpServers: ["docs"],
            toolPermissions: {
              builtin: { level: "ask" },
              mcp: { docs: { level: "ask" } },
            },
          })
        // Workspaces without settings for the server are left alone.
        expect(updated).toEqual(["w1"])
      })
    }

    test("shows a toast when deleting fails", async ({ sidepanelPage }) => {
      const state = setupSettingsMocks(sidepanelPage)
      state.mcpServers = [createServer()]
      sidepanelPage.mocks.mcpServerUpdate = async () => {
        throw new Error("Delete failed")
      }
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "MCP")
      await openRowAction(page, "github", "Delete")
      await confirmDialog(page)

      await expect(getLatestToast(page)).toHaveText(
        "Failed to delete server: Delete failed",
      )
      await expect(page.getByTestId("mcp-server-row")).toHaveCount(1)
    })

    test("shows a toast when saving fails", async ({ sidepanelPage }) => {
      setupSettingsMocks(sidepanelPage)
      sidepanelPage.mocks.mcpServerUpdate = async () => {
        throw new Error("Save failed")
      }
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "MCP")
      await page.getByTestId("add-mcp-server").click()
      await page.getByTestId("mcp-server-name-input").fill("github")
      await page
        .getByTestId("mcp-server-url-input")
        .fill("https://mcp.example.com/github")
      await page.getByTestId("mcp-server-save").click()

      await expect(getLatestToast(page)).toHaveText(
        "Failed to save MCP servers: Save failed",
      )
      await expect(page.getByTestId("mcp-server-name-input")).toHaveValue(
        "github",
      )
    })

    test("shows a failed connection test and tests again", async ({
      sidepanelPage,
    }) => {
      const state = setupSettingsMocks(sidepanelPage)
      let isReachable = false
      sidepanelPage.mocks.mcpServerToolsGet = async () => {
        if (!isReachable) {
          throw new Error("Connection refused")
        }
        return [createTool("mcp__test__search")]
      }
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "MCP")
      await page.getByTestId("add-mcp-server").click()
      await page
        .getByTestId("mcp-server-url-input")
        .fill("https://mcp.example.com/github")
      await page.getByTestId("mcp-server-test").click()

      const result = page.getByTestId("connection-result")

      await expect(result).toHaveAttribute("data-success", "false")
      await expect(result).toContainText("Connection refused")

      isReachable = true
      await result.getByRole("button", { name: "Test again" }).click()

      await expect(result).toHaveAttribute("data-success", "true")
      await expect(result).toContainText("Connected · 1 tool discovered")
      expect(state.mcpServers).toEqual([])
    })

    test("removes a header", async ({ sidepanelPage }) => {
      const state = setupSettingsMocks(sidepanelPage)
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "MCP")
      await page.getByTestId("add-mcp-server").click()
      await page.getByTestId("mcp-server-name-input").fill("github")
      await page
        .getByTestId("mcp-server-url-input")
        .fill("https://mcp.example.com/github")
      await page.getByRole("button", { name: "Add header" }).click()
      await page.getByRole("button", { name: "Add header" }).click()

      const rows = page.getByTestId("mcp-header-row")

      await rows.nth(0).getByLabel("Header name").fill("X-Old")
      await rows.nth(0).getByLabel("Header value").fill("old")
      await rows.nth(1).getByLabel("Header name").fill("Authorization")
      await rows.nth(1).getByLabel("Header value").fill("Bearer token")
      await rows.nth(0).getByRole("button", { name: "Remove header" }).click()

      await expect(rows).toHaveCount(1)
      await expect(rows.getByLabel("Header name")).toHaveValue("Authorization")

      await page.getByTestId("mcp-server-save").click()

      await expect.poll(() => state.mcpServers).toHaveLength(1)
      expect(state.mcpServers[0]?.headers).toEqual({
        Authorization: "Bearer token",
      })
    })
  })

  test.describe("Prompts", () => {
    test("shows an empty state", async ({ sidepanelPage }) => {
      setupSettingsMocks(sidepanelPage)
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Prompts")

      await expect(
        page.getByText(
          "Save prompts you use often and insert them by typing / in the message box.",
        ),
      ).toBeVisible()
    })

    test("lists and searches prompts; built-in prompts are read-only", async ({
      sidepanelPage,
    }) => {
      const state = setupSettingsMocks(sidepanelPage)
      state.prompts = [
        createPrompt(),
        createPrompt({
          builtin: true,
          id: "prompt-2",
          text: "Summarize this page.",
          title: "Summarize page",
        }),
      ]
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Prompts")

      const rows = page.getByTestId("prompt-row")

      await expect(rows).toHaveCount(2)
      await expect(rows.nth(1)).toContainText("Built-in")
      await expect(
        page.getByRole("button", { name: "Edit Summarize page" }),
      ).toHaveCount(0)

      await page.getByRole("searchbox", { name: "Search prompts" }).fill("sum")
      await expect(rows).toHaveCount(1)
      await expect(rows).toContainText("Summarize page")

      await page
        .getByRole("searchbox", { name: "Search prompts" })
        .fill("missing")
      await expect(page.getByText("No prompts match your search")).toBeVisible()
    })

    test("adds a prompt with a live preview", async ({ sidepanelPage }) => {
      const state = setupSettingsMocks(sidepanelPage)
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Prompts")
      await page.getByTestId("new-prompt").click()
      await page.getByTestId("prompt-title-input").fill("Review PR")
      await page
        .getByTestId("prompt-text-input")
        .fill("Review this pull request.")

      await expect(page.getByText("Preview in the / menu")).toBeVisible()
      await expect(page.getByText("Review this pull request.")).toHaveCount(2)

      await page.getByTestId("prompt-save").click()

      await expect(page.getByTestId("prompt-row")).toContainText("Review PR")
      expect(state.prompts).toEqual([
        {
          builtin: false,
          id: "prompt-new",
          text: "Review this pull request.",
          title: "Review PR",
        },
      ])
    })

    test("requires a title and text", async ({ sidepanelPage }) => {
      const state = setupSettingsMocks(sidepanelPage)
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Prompts")
      await page.getByTestId("new-prompt").click()
      await page.getByTestId("prompt-save").click()

      await expect(page.getByText("Title is required")).toBeVisible()
      await expect(page.getByText("Prompt text is required")).toBeVisible()
      expect(state.prompts).toEqual([])
    })

    test("edits a prompt", async ({ sidepanelPage }) => {
      const state = setupSettingsMocks(sidepanelPage)
      state.prompts = [createPrompt()]
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Prompts")
      await page.getByRole("button", { name: "Edit Explain code" }).click()

      await expect(page.getByTestId("prompt-text-input")).toHaveValue(
        "Explain the following code:",
      )
      await page.getByTestId("prompt-title-input").fill("Explain")
      await page.getByTestId("prompt-save").click()

      await expect(page.getByTestId("prompt-row")).toContainText("Explain")
      expect(state.prompts[0]?.title).toBe("Explain")
    })

    test("shows a toast when saving fails", async ({ sidepanelPage }) => {
      setupSettingsMocks(sidepanelPage)
      sidepanelPage.mocks.promptCreate = async () => {
        throw new Error("Save failed")
      }
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Prompts")
      await page.getByTestId("new-prompt").click()
      await page.getByTestId("prompt-title-input").fill("Review PR")
      await page.getByTestId("prompt-text-input").fill("Review it.")
      await page.getByTestId("prompt-save").click()

      await expect(getLatestToast(page)).toHaveText(
        "Failed to save prompt: Save failed",
      )
    })

    test("deletes a prompt after confirmation", async ({ sidepanelPage }) => {
      const state = setupSettingsMocks(sidepanelPage)
      state.prompts = [createPrompt()]
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Prompts")
      await page.getByRole("button", { name: "Delete Explain code" }).click()
      await confirmDialog(page)

      await expect(page.getByTestId("prompt-row")).toHaveCount(0)
      expect(state.prompts).toEqual([])
    })

    test("deletes a prompt from its edit page", async ({ sidepanelPage }) => {
      const state = setupSettingsMocks(sidepanelPage)
      state.prompts = [createPrompt()]
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Prompts")
      await page.getByRole("button", { name: "Edit Explain code" }).click()
      await page.getByRole("button", { name: "Delete", exact: true }).click()
      await confirmDialog(page)

      await expect(page.getByTestId("prompt-row")).toHaveCount(0)
      expect(state.prompts).toEqual([])
    })

    test("shows a toast when deleting fails", async ({ sidepanelPage }) => {
      const state = setupSettingsMocks(sidepanelPage)
      state.prompts = [createPrompt()]
      sidepanelPage.mocks.promptDelete = async () => {
        throw new Error("Delete failed")
      }
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Prompts")
      await page.getByRole("button", { name: "Delete Explain code" }).click()
      await confirmDialog(page)

      await expect(getLatestToast(page)).toHaveText(
        "Failed to delete prompt: Delete failed",
      )
      await expect(page.getByTestId("prompt-row")).toHaveCount(1)
    })
  })

  test.describe("Workspace permissions", () => {
    test("limits MCP servers and sets tool permissions", async ({
      sidepanelPage,
    }) => {
      const state = setupSettingsMocks(sidepanelPage)
      state.tools = [createTool("fetch"), createTool("run_js")]
      state.mcpServers = [
        createServer(),
        createServer({ name: "docs", url: "https://mcp.example.com/docs" }),
      ]
      state.mcpServerTools = {
        docs: [createTool("mcp__docs__search")],
        github: [createTool("mcp__github__create_issue")],
      }
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Workspaces")
      await page.getByRole("button", { name: "Edit Workspace 1" }).click()

      // Every server is available by default; hide "docs".
      await expect(page.getByTestId("workspace-mcp-github")).toBeChecked()
      await page.getByTestId("workspace-mcp-docs").uncheck()

      const groups = page.getByTestId("permission-group")

      await expect(groups).toHaveCount(2)
      // Defaults: built-in tools run, MCP tools ask first.
      await expect(getPermissionSelector(page, "Built-in tools")).toHaveText(
        "Allow",
      )
      await expect(getPermissionSelector(page, "github")).toHaveText("Ask")

      // One built-in tool asks first, another one is disabled.
      await page.getByRole("button", { name: "Expand Built-in tools" }).click()
      await selectPermission(page, "run_js", "Ask")
      await selectPermission(page, "fetch", "Disabled")
      await expect(groups.first()).toContainText(
        "2 tools · 2 custom · 1 disabled",
      )
      await expect(
        page.getByTestId("permission-tool").filter({ hasText: "fetch" }),
      ).toHaveAttribute("data-disabled", "true")

      await page.getByTestId("workspace-save").click()

      await expect(page.getByTestId("workspace-row")).toBeVisible()
      expect(state.workspaces[0]).toMatchObject({
        mcpServers: ["github"],
        toolPermissions: {
          builtin: {
            level: "allow",
            tools: { fetch: "disabled", run_js: "ask" },
          },
        },
      })
    })

    test("changing a group resets its tool overrides", async ({
      sidepanelPage,
    }) => {
      const state = setupSettingsMocks(sidepanelPage)
      state.tools = [createTool("fetch"), createTool("run_js")]
      state.workspaces = [
        createWorkspace({
          toolPermissions: {
            builtin: { level: "allow", tools: { run_js: "ask" } },
          },
        }),
      ]
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Workspaces")
      await page.getByRole("button", { name: "Edit Workspace 1" }).click()

      const group = page.getByTestId("permission-group").first()

      await expect(group).toContainText("2 tools · 1 custom")
      await selectPermission(page, "Built-in tools", "Ask")
      await expect(group).not.toContainText("custom")

      await page.getByTestId("workspace-save").click()

      await expect
        .poll(() => state.workspaces[0]?.toolPermissions)
        .toEqual({ builtin: { level: "ask", tools: {} } })
    })

    test("sets the permission of a single MCP tool", async ({
      sidepanelPage,
    }) => {
      const state = setupSettingsMocks(sidepanelPage)
      state.mcpServers = [createServer()]
      state.mcpServerTools = {
        github: [
          createTool("mcp__github__search"),
          createTool("mcp__github__create_issue"),
        ],
      }
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Workspaces")
      await page.getByRole("button", { name: "Edit Workspace 1" }).click()

      const group = page
        .getByTestId("permission-group")
        .filter({ hasText: "github" })

      await expect(group).toContainText("2 tools")
      await page.getByRole("button", { name: "Expand github" }).click()
      await expect(group.getByTestId("permission-tool")).toHaveText([
        /^search/,
        /^create_issue/,
      ])

      await selectPermission(page, "search", "Allow")
      await expect(group).toContainText("2 tools · 1 custom")
      await expect(
        group.getByTestId("permission-tool").filter({ hasText: "search" }),
      ).toContainText("Custom")

      await page.getByTestId("workspace-save").click()

      await expect
        .poll(() => state.workspaces[0]?.toolPermissions)
        .toEqual({
          mcp: {
            github: { level: "ask", tools: { mcp__github__search: "allow" } },
          },
        })
    })

    test("shows more tools of a large group", async ({ sidepanelPage }) => {
      const state = setupSettingsMocks(sidepanelPage)
      state.tools = ["t1", "t2", "t3", "t4", "t5", "t6"].map(createTool)
      const page = sidepanelPage.page

      await sidepanelPage.open()
      await openSettings(page, "Workspaces")
      await page.getByRole("button", { name: "Edit Workspace 1" }).click()
      await page.getByRole("button", { name: "Expand Built-in tools" }).click()

      const tools = page.getByTestId("permission-tool")

      await expect(tools).toHaveCount(4)
      await page.getByRole("button", { name: "Show 2 more tools" }).click()
      await expect(tools).toHaveCount(6)
      await page.getByRole("button", { name: "Show fewer tools" }).click()
      await expect(tools).toHaveCount(4)
    })
  })
})

test.describe("Settings tabs", () => {
  test("switches between tabs", async ({ sidepanelPage }) => {
    setupSettingsMocks(sidepanelPage)
    const page = sidepanelPage.page

    await sidepanelPage.open()
    await openSettings(page, "General")
    await openSettingsTab(page, "MCP")
    await openSettingsTab(page, "Workspaces")

    await expect(page.getByTestId("workspace-row")).toHaveCount(1)
  })
})
