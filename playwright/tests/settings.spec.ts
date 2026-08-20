import type {
  ApiClient,
  AppSettings,
  Command,
  McpServer,
  ModelProviderModel,
  OpenAIModelProvider,
} from "../../src/shared/api"
import { expect, test } from "../fixtures"
import { modelProviderTypes } from "./mocks/providers"
import {
  getSettingsDialog,
  openSettingsDialog,
  openSettingsSection,
  type SettingsSection,
} from "./utils/settings"
import { getLatestToast } from "./utils/toast"

const baseMocks = () => ({
  appSettingsGet: async () => ({
    id: "app",
    titleGenerationModel: "disabled",
    titleModel: null,
  }),
  chatGetByWorkspace: async () => [],
  chatTokenEstimateGet: async () => 0,
  commandGet: async () => [],
  mcpServerGet: async () => [],
  modelProviderGet: async () => [],
  modelProviderTypeGet: async () => modelProviderTypes,
  modelToolGet: async () => [],
  pageContentGet: async () => [],
  pageContentSelectionGet: async () => null,
  workspaceGet: async () => [],
})

function applyBaseMocks(sidepanelPage: { mocks: ApiClient }) {
  for (const [method, handler] of Object.entries(baseMocks())) {
    ;(sidepanelPage.mocks as unknown as Record<string, unknown>)[method] =
      handler
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
      apiKey: "sk-test",
      host: "https://api.openai.com",
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

function createCommand(overrides: Partial<Command> = {}): Command {
  return {
    id: "cmd-1",
    name: "explain",
    prompt: "Explain the following code:",
    description: "Explain code",
    builtin: false,
    ...overrides,
  }
}

test.describe("Settings", () => {
  test.beforeEach(async ({ sidepanelPage }) => {
    applyBaseMocks(sidepanelPage)

    await sidepanelPage.open()
    await openSettingsDialog(sidepanelPage.page)
  })

  test.describe("settings dialog navigation", () => {
    const sections: [SettingsSection, string][] = [
      ["Common", "Title Generation"],
      ["Providers", "Model Providers"],
      ["MCP Servers", "MCP Servers"],
      ["Commands", "Commands"],
    ]

    for (const [label, heading] of sections) {
      test(`opens the "${label}" section`, async ({ sidepanelPage }) => {
        await openSettingsSection(sidepanelPage.page, label)

        const dialog = getSettingsDialog(sidepanelPage.page)

        await expect(
          dialog.getByRole("heading", { name: heading }),
        ).toBeVisible()
      })
    }

    test("shows Common as the active section by default", async ({
      sidepanelPage,
    }) => {
      const dialog = getSettingsDialog(sidepanelPage.page)

      await expect(
        dialog.getByTestId("settings-section-common"),
      ).toHaveAttribute("aria-current", "page")
      await expect(
        dialog.getByTestId("settings-section-providers"),
      ).not.toHaveAttribute("aria-current", "page")
    })
  })

  test.describe("Title generation", () => {
    test("shows loading state while app settings are loading", async ({
      sidepanelPage,
    }) => {
      let resolveSettings!: (settings: AppSettings) => void

      sidepanelPage.mocks.appSettingsGet = async () =>
        await new Promise<AppSettings>((resolve) => {
          resolveSettings = resolve
        })

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)

      const dialog = getSettingsDialog(sidepanelPage.page)

      await expect(dialog.getByText("Loading...")).toBeVisible()

      resolveSettings({
        id: "app",
        titleGenerationModel: "disabled",
      })

      await expect(dialog.getByText("Loading...")).not.toBeVisible()
    })

    test("shows selection options when there are no models", async ({
      sidepanelPage,
    }) => {
      const dialog = getSettingsDialog(sidepanelPage.page)
      const selector = dialog.getByRole("button", {
        name: "Select title generation model",
      })

      await expect(selector).toHaveText("Disabled")

      await selector.click()

      await expect(
        dialog.getByRole("option", { name: "Disabled" }),
      ).toBeVisible()
      await expect(
        dialog.getByRole("option", { name: "Use chat model" }),
      ).toBeVisible()
    })

    test("shows model options grouped by provider", async ({
      sidepanelPage,
    }) => {
      sidepanelPage.mocks.modelProviderGet = async () => [createProvider()]
      sidepanelPage.mocks.modelProviderModelGet = async () => [
        createModel(),
        createModel({
          id: "provider-1::gpt-4o-mini",
          name: "gpt-4o-mini",
        }),
      ]

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)

      const dialog = getSettingsDialog(sidepanelPage.page)
      const selector = dialog.getByRole("button", {
        name: "Select title generation model",
      })

      await selector.click()

      await expect(dialog.getByText("OpenAI Primary")).toBeVisible()
      await expect(
        dialog.getByRole("option", { name: "gpt-4.1" }),
      ).toBeVisible()
      await expect(
        dialog.getByRole("option", { name: "gpt-4o-mini" }),
      ).toBeVisible()
    })

    test("shows a disabled placeholder for an unavailable saved model", async ({
      sidepanelPage,
    }) => {
      sidepanelPage.mocks.appSettingsGet = async () => ({
        id: "app",
        titleGenerationModel: "provider-2::gpt-3.5-turbo",
        titleModel: null,
      })
      sidepanelPage.mocks.modelProviderGet = async () => [createProvider()]
      sidepanelPage.mocks.modelProviderModelGet = async () => [createModel()]

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)

      const dialog = getSettingsDialog(sidepanelPage.page)
      const selector = dialog.getByRole("button", {
        name: "Select title generation model",
      })

      await selector.click()

      const unavailable = dialog.getByRole("option", {
        name: "gpt-3.5-turbo (unavailable)",
      })

      await expect(unavailable).toBeVisible()
      await expect(unavailable).toBeDisabled()
    })

    test("autosaves the selected title generation model", async ({
      sidepanelPage,
    }) => {
      let savedModel: string | null = null

      sidepanelPage.mocks.appSettingsUpdate = async (settings) => {
        savedModel = settings.titleGenerationModel
        return {
          ...settings,
          titleModel: null,
        }
      }
      sidepanelPage.mocks.modelProviderGet = async () => [createProvider()]
      sidepanelPage.mocks.modelProviderModelGet = async () => [createModel()]

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)

      const dialog = getSettingsDialog(sidepanelPage.page)
      const selector = dialog.getByRole("button", {
        name: "Select title generation model",
      })

      await selector.click()
      await dialog.getByRole("option", { name: "gpt-4.1" }).click()

      await expect.poll(() => savedModel).toBe("provider-1::gpt-4.1")
      await expect(getLatestToast(sidepanelPage.page)).toHaveText(
        "Title generation setting saved",
      )
    })

    test("shows an error toast when autosave fails", async ({
      sidepanelPage,
    }) => {
      sidepanelPage.mocks.appSettingsUpdate = async () => {
        throw new Error("Save failed")
      }
      sidepanelPage.mocks.modelProviderGet = async () => [createProvider()]
      sidepanelPage.mocks.modelProviderModelGet = async () => [createModel()]

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)

      const dialog = getSettingsDialog(sidepanelPage.page)
      const selector = dialog.getByRole("button", {
        name: "Select title generation model",
      })

      await selector.click()
      await dialog.getByRole("option", { name: "gpt-4.1" }).click()

      await expect(getLatestToast(sidepanelPage.page)).toHaveText("Save failed")
    })
  })

  test.describe("Model providers", () => {
    test.beforeEach(async ({ sidepanelPage }) => {
      await openSettingsSection(sidepanelPage.page, "Providers")
    })

    test("shows an empty state when there are no providers", async ({
      sidepanelPage,
    }) => {
      const dialog = getSettingsDialog(sidepanelPage.page)

      await expect(
        dialog.getByText("No model providers configured yet"),
      ).toBeVisible()
      await expect(
        dialog.getByRole("button", { name: "Provider" }),
      ).toBeVisible()
    })

    test("shows a loading state while providers are loading", async ({
      sidepanelPage,
    }) => {
      let resolveProviders!: (providers: OpenAIModelProvider[]) => void

      sidepanelPage.mocks.modelProviderGet = async () =>
        await new Promise<OpenAIModelProvider[]>((resolve) => {
          resolveProviders = resolve
        })

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "Providers")

      const dialog = getSettingsDialog(sidepanelPage.page)

      await expect(dialog.getByText("Loading providers...")).toBeVisible()

      resolveProviders([createProvider()])

      await expect(dialog.getByText("Loading providers...")).not.toBeVisible()
    })

    test("shows an inline error when providers fail to load", async ({
      sidepanelPage,
    }) => {
      sidepanelPage.mocks.modelProviderGet = async () => {
        throw new Error("Load failed")
      }

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "Providers")

      const dialog = getSettingsDialog(sidepanelPage.page)

      await expect(
        dialog.getByText("Cannot load providers: Load failed"),
      ).toBeVisible()
      await expect(
        sidepanelPage.page.getByRole("heading", {
          name: "Something went wrong.",
        }),
      ).toHaveCount(0)
    })

    test("lists configured providers with their type and actions", async ({
      sidepanelPage,
    }) => {
      const provider = createProvider()

      sidepanelPage.mocks.modelProviderGet = async () => [provider]

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "Providers")

      const dialog = getSettingsDialog(sidepanelPage.page)

      await expect(dialog.getByText(provider.name)).toBeVisible()
      await expect(
        dialog.getByRole("listitem").getByText(provider.type),
      ).toBeVisible()
      await expect(
        dialog.getByRole("button", { name: `Edit ${provider.name}` }),
      ).toBeVisible()
      await expect(
        dialog.getByRole("button", { name: `Delete ${provider.name}` }),
      ).toBeVisible()
    })

    test("adds an OpenAI provider", async ({ sidepanelPage }) => {
      const created: unknown[] = []
      let providers: OpenAIModelProvider[] = []

      sidepanelPage.mocks.modelProviderGet = async () => providers
      sidepanelPage.mocks.modelProviderCreate = async (formData) => {
        const provider: OpenAIModelProvider = {
          ...(formData as OpenAIModelProvider),
          id: "provider-new",
          type: "openai",
          settings: {
            apiKey:
              "apiKey" in formData.settings ? formData.settings.apiKey : "",
            host:
              "host" in formData.settings ? formData.settings.host : undefined,
          },
        }

        created.push(formData)
        providers = [...providers, provider]

        return provider
      }

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "Providers")

      const dialog = getSettingsDialog(sidepanelPage.page)

      await dialog.getByRole("button", { name: "Provider" }).click()

      const addDialog = sidepanelPage.page.getByRole("dialog", {
        name: "Add Provider",
      })

      await expect(addDialog).toBeVisible()

      await addDialog.getByLabel("Name").fill("New Provider")
      await addDialog.getByLabel("API Key").fill("sk-new")
      await addDialog
        .getByLabel("Host (Optional)")
        .fill("https://api.example.com")
      await addDialog.getByRole("button", { name: "Add Provider" }).click()

      await expect(dialog.getByText("New Provider")).toBeVisible()
      expect(created).toHaveLength(1)
    })

    test("adds an Ollama provider requiring a host", async ({
      sidepanelPage,
    }) => {
      const created: Array<{ name: string; type: string }> = []
      let providers: OpenAIModelProvider[] = []

      sidepanelPage.mocks.modelProviderGet = async () => providers
      sidepanelPage.mocks.modelProviderCreate = async (formData) => {
        created.push({ name: formData.name, type: formData.type })

        const provider: OpenAIModelProvider = {
          ...(formData as OpenAIModelProvider),
          id: "provider-ollama",
          type: "openai",
          settings: { apiKey: "", host: "http://localhost:11434" },
        }

        providers = [...providers, provider]

        return provider
      }

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "Providers")

      const dialog = getSettingsDialog(sidepanelPage.page)

      await dialog.getByRole("button", { name: "Provider" }).click()

      const addDialog = sidepanelPage.page.getByRole("dialog", {
        name: "Add Provider",
      })

      await addDialog.getByLabel("Name").fill("Local Ollama")

      // Selecting "ollama" switches the form to the host-based variant.
      await addDialog.getByRole("button", { name: "openai" }).click()
      await addDialog.getByRole("option", { name: "ollama" }).click()

      // The API key field is replaced by a required host field.
      await expect(addDialog.getByLabel("API Key")).toHaveCount(0)
      await expect(addDialog.getByLabel("Host")).toBeVisible()

      await addDialog.getByLabel("Host").fill("http://localhost:11434")

      await addDialog.getByRole("button", { name: "Add Provider" }).click()

      await expect(dialog.getByText("Local Ollama")).toBeVisible()
      expect(created).toEqual([{ name: "Local Ollama", type: "ollama" }])
    })

    test("disables submission and connection check until the form is complete", async ({
      sidepanelPage,
    }) => {
      sidepanelPage.mocks.modelProviderGet = async () => []

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "Providers")

      const dialog = getSettingsDialog(sidepanelPage.page)

      await dialog.getByRole("button", { name: "Provider" }).click()

      const addDialog = sidepanelPage.page.getByRole("dialog", {
        name: "Add Provider",
      })
      const submitButton = addDialog.getByRole("button", {
        name: "Add Provider",
      })
      const checkButton = addDialog.getByRole("button", {
        name: "Check Connection",
      })

      await expect(submitButton).toBeDisabled()
      await expect(checkButton).toBeDisabled()

      await addDialog.getByLabel("Name").fill("New Provider")
      await addDialog.getByLabel("API Key").fill("sk-new")

      await expect(submitButton).toBeEnabled()
      await expect(checkButton).toBeEnabled()
    })

    test("edits an existing provider", async ({ sidepanelPage }) => {
      const provider = createProvider()
      let providers: OpenAIModelProvider[] = [provider]

      sidepanelPage.mocks.modelProviderGet = async () => providers
      sidepanelPage.mocks.modelProviderUpdate = async (next) => {
        providers = providers.map((p) =>
          p.id === next.id ? (next as OpenAIModelProvider) : p,
        )

        return next as OpenAIModelProvider
      }

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "Providers")

      const dialog = getSettingsDialog(sidepanelPage.page)

      await dialog
        .getByRole("button", { name: `Edit ${provider.name}` })
        .click()

      const editDialog = sidepanelPage.page.getByRole("dialog", {
        name: "Edit Provider",
      })

      await expect(editDialog.getByLabel("Name")).toHaveValue(provider.name)
      await expect(editDialog.getByLabel("API Key")).toHaveValue(
        provider.settings.apiKey,
      )

      await editDialog.getByLabel("Name").fill("Updated Provider")
      await editDialog.getByRole("button", { name: "Save Changes" }).click()

      await expect(dialog.getByText("Updated Provider")).toBeVisible()
      await expect(dialog.getByText(provider.name)).not.toBeVisible()
    })

    test("shows an error inside the dialog when saving fails", async ({
      sidepanelPage,
    }) => {
      const provider = createProvider()

      sidepanelPage.mocks.modelProviderGet = async () => [provider]
      sidepanelPage.mocks.modelProviderUpdate = async () => {
        throw new Error("Update failed")
      }

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "Providers")

      const dialog = getSettingsDialog(sidepanelPage.page)

      await dialog
        .getByRole("button", { name: `Edit ${provider.name}` })
        .click()

      const editDialog = sidepanelPage.page.getByRole("dialog", {
        name: "Edit Provider",
      })

      await editDialog.getByRole("button", { name: "Save Changes" }).click()

      await expect(editDialog.getByText("Update failed")).toBeVisible()
    })

    test("checks the connection successfully", async ({ sidepanelPage }) => {
      const provider = createProvider()

      sidepanelPage.mocks.modelProviderGet = async () => [provider]
      sidepanelPage.mocks.modelProviderCheck = async () => ({
        success: true,
        message: "Connection succeeded",
      })

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "Providers")

      const dialog = getSettingsDialog(sidepanelPage.page)

      await dialog
        .getByRole("button", { name: `Edit ${provider.name}` })
        .click()

      const editDialog = sidepanelPage.page.getByRole("dialog", {
        name: "Edit Provider",
      })

      await editDialog.getByRole("button", { name: "Check Connection" }).click()

      await expect(editDialog.getByText("Connection succeeded")).toBeVisible()
    })

    test("shows a connection error inside the dialog", async ({
      sidepanelPage,
    }) => {
      const provider = createProvider()

      sidepanelPage.mocks.modelProviderGet = async () => [provider]
      sidepanelPage.mocks.modelProviderCheck = async () => {
        throw new Error("Connection failed")
      }

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "Providers")

      const dialog = getSettingsDialog(sidepanelPage.page)

      await dialog
        .getByRole("button", { name: `Edit ${provider.name}` })
        .click()

      const editDialog = sidepanelPage.page.getByRole("dialog", {
        name: "Edit Provider",
      })

      await editDialog.getByRole("button", { name: "Check Connection" }).click()

      await expect(editDialog.getByText("Connection failed")).toBeVisible()
    })

    test("deletes a provider after confirmation", async ({ sidepanelPage }) => {
      const provider = createProvider()
      let providers: OpenAIModelProvider[] = [provider]
      let deletedIds: string[] = []

      sidepanelPage.mocks.modelProviderGet = async () => providers
      sidepanelPage.mocks.modelProviderDelete = async (id) => {
        deletedIds.push(id)
        providers = providers.filter((p) => p.id !== id)
      }

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "Providers")

      const dialog = getSettingsDialog(sidepanelPage.page)

      sidepanelPage.page.once("dialog", async (confirmDialog) => {
        await confirmDialog.accept()
      })

      await dialog
        .getByRole("button", { name: `Delete ${provider.name}` })
        .click()

      await expect(dialog.getByText(provider.name)).not.toBeVisible()
      expect(deletedIds).toEqual([provider.id])
    })

    test("keeps the provider when deletion is dismissed", async ({
      sidepanelPage,
    }) => {
      const provider = createProvider()
      let deletedIds: string[] = []

      sidepanelPage.mocks.modelProviderGet = async () => [provider]
      sidepanelPage.mocks.modelProviderDelete = async (id) => {
        deletedIds.push(id)
      }

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "Providers")

      const dialog = getSettingsDialog(sidepanelPage.page)

      sidepanelPage.page.once("dialog", async (confirmDialog) => {
        await confirmDialog.dismiss()
      })

      await dialog
        .getByRole("button", { name: `Delete ${provider.name}` })
        .click()

      await expect(dialog.getByText(provider.name)).toBeVisible()
      expect(deletedIds).toHaveLength(0)
    })

    test("shows a toast when deleting a provider fails", async ({
      sidepanelPage,
    }) => {
      const provider = createProvider()

      sidepanelPage.mocks.modelProviderGet = async () => [provider]
      sidepanelPage.mocks.modelProviderDelete = async () => {
        throw new Error("Deletion failed")
      }

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "Providers")

      const dialog = getSettingsDialog(sidepanelPage.page)

      sidepanelPage.page.once("dialog", async (confirmDialog) => {
        await confirmDialog.accept()
      })

      await dialog
        .getByRole("button", { name: `Delete ${provider.name}` })
        .click()

      await expect(getLatestToast(sidepanelPage.page)).toHaveText(
        "Deletion failed",
      )
    })
  })

  test.describe("MCP servers", () => {
    test.beforeEach(async ({ sidepanelPage }) => {
      await openSettingsSection(sidepanelPage.page, "MCP Servers")
    })

    test("shows a loading state while MCP servers are loading", async ({
      sidepanelPage,
    }) => {
      let resolveServers!: (servers: McpServer[]) => void

      sidepanelPage.mocks.mcpServerGet = async () =>
        await new Promise<McpServer[]>((resolve) => {
          resolveServers = resolve
        })

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "MCP Servers")

      const dialog = getSettingsDialog(sidepanelPage.page)

      await expect(dialog.getByText("Loading...")).toBeVisible()

      resolveServers([])

      await expect(dialog.getByText("Loading...")).not.toBeVisible()
    })

    test("shows the server document in the JSON editor", async ({
      sidepanelPage,
    }) => {
      sidepanelPage.mocks.mcpServerGet = async () => [
        {
          name: "github",
          type: "http",
          url: "https://api.githubcopilot.com/mcp/",
        },
        { name: "db", type: "http", url: "https://mcp.example.com/db" },
      ]

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "MCP Servers")

      const editor = sidepanelPage.page.getByTestId("code-editor-textarea")

      await expect(editor).toHaveValue(/github/)
      await expect(editor).toHaveValue(/db/)
      await expect(editor).toHaveValue(/https:\/\/api\.githubcopilot\.com\/mcp/)
    })

    test("shows the help popover with a configuration example", async ({
      sidepanelPage,
    }) => {
      const dialog = getSettingsDialog(sidepanelPage.page)

      await dialog
        .getByRole("button", { name: "How to configure MCP servers" })
        .click()

      await expect(
        dialog.getByText(/https:\/\/api\.githubcopilot\.com\/mcp/),
      ).toBeVisible()
      await expect(dialog.getByText(/"servers"/)).toBeVisible()
    })

    test("autosaves valid changes to the server document", async ({
      sidepanelPage,
    }) => {
      let savedServers: McpServer[] | null = null

      sidepanelPage.mocks.mcpServerGet = async () => [
        {
          name: "github",
          type: "http",
          url: "https://api.githubcopilot.com/mcp/",
        },
      ]
      sidepanelPage.mocks.mcpServerUpdate = async (servers) => {
        savedServers = servers

        return servers
      }

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "MCP Servers")

      const editor = sidepanelPage.page.getByTestId("code-editor-textarea")

      // Append a second server to the document and let the debounced autosave
      // fire.
      await editor.fill(
        `{
  "servers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    },
    "db": {
      "type": "http",
      "url": "https://mcp.example.com/db"
    }
  }
}`,
      )

      await expect
        .poll(() => savedServers?.map((s) => s.name).sort())
        .toEqual(["db", "github"])
      await expect(getLatestToast(sidepanelPage.page)).toHaveText(
        "MCP servers saved",
      )
    })

    test("shows a validation error and does not save invalid JSON", async ({
      sidepanelPage,
    }) => {
      let updateCalls = 0

      sidepanelPage.mocks.mcpServerGet = async () => []
      sidepanelPage.mocks.mcpServerUpdate = async (servers) => {
        updateCalls += 1

        return servers
      }

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "MCP Servers")

      const dialog = getSettingsDialog(sidepanelPage.page)
      const editor = sidepanelPage.page.getByTestId("code-editor-textarea")

      // An empty `url` violates the `minLength: 1` schema rule, so the
      // document is invalid and must not autosave.
      await editor.fill(`{
  "servers": {
    "github": {
      "type": "http",
      "url": ""
    }
  }
}`)

      await expect(
        dialog.getByText("Fix the validation errors above before saving."),
      ).toBeVisible()

      // The exact schema violation (JSONPath without the `$.` prefix + message)
      // is surfaced too.
      await expect(
        dialog.getByText("servers.github.url:", { exact: false }),
      ).toBeVisible()
      await expect(
        dialog.getByText("String must be at least 1 characters", {
          exact: false,
        }),
      ).toBeVisible()

      // Give the debounced autosave plenty of time; it must not fire.
      await sidepanelPage.page.waitForTimeout(1500)

      expect(updateCalls).toBe(0)
    })

    test("shows a toast when autosave fails", async ({ sidepanelPage }) => {
      sidepanelPage.mocks.mcpServerGet = async () => [
        {
          name: "github",
          type: "http",
          url: "https://api.githubcopilot.com/mcp/",
        },
      ]
      sidepanelPage.mocks.mcpServerUpdate = async () => {
        throw new Error("MCP save failed")
      }

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "MCP Servers")

      const editor = sidepanelPage.page.getByTestId("code-editor-textarea")

      await editor.fill(`{
  "servers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    },
    "db": {
      "type": "http",
      "url": "https://mcp.example.com/db"
    }
  }
}`)

      await expect(getLatestToast(sidepanelPage.page)).toHaveText(
        "MCP save failed",
      )
    })

    test("formats the JSON document", async ({ sidepanelPage }) => {
      sidepanelPage.mocks.mcpServerGet = async () => [
        {
          name: "github",
          type: "http",
          url: "https://api.githubcopilot.com/mcp/",
        },
      ]

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "MCP Servers")

      const dialog = getSettingsDialog(sidepanelPage.page)
      const editor = sidepanelPage.page.getByTestId("code-editor-textarea")

      await editor.fill(
        `{"servers":{"github":{"type":"http","url":"https://api.githubcopilot.com/mcp/"}}}`,
      )

      await dialog.getByRole("button", { name: "Format JSON" }).click()

      await expect(editor).toHaveValue(/\n  "servers"/)
    })
  })

  test.describe("Commands", () => {
    test.beforeEach(async ({ sidepanelPage }) => {
      await openSettingsSection(sidepanelPage.page, "Commands")
    })

    test("shows an empty state when there are no commands", async ({
      sidepanelPage,
    }) => {
      const dialog = getSettingsDialog(sidepanelPage.page)

      await expect(dialog.getByText("No commands configured yet")).toBeVisible()
      await expect(
        dialog.getByRole("button", { name: "Command" }),
      ).toBeVisible()
      await expect(dialog.getByText(/Slash commands/)).toBeVisible()
    })

    test("shows a loading state while commands are loading", async ({
      sidepanelPage,
    }) => {
      let resolveCommands!: (commands: Command[]) => void

      sidepanelPage.mocks.commandGet = async () =>
        await new Promise<Command[]>((resolve) => {
          resolveCommands = resolve
        })

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "Commands")

      const dialog = getSettingsDialog(sidepanelPage.page)

      await expect(dialog.getByText("Loading commands...")).toBeVisible()

      resolveCommands([createCommand()])

      await expect(dialog.getByText("Loading commands...")).not.toBeVisible()
    })

    test("shows an inline error when commands fail to load", async ({
      sidepanelPage,
    }) => {
      sidepanelPage.mocks.commandGet = async () => {
        throw new Error("Load failed")
      }

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "Commands")

      const dialog = getSettingsDialog(sidepanelPage.page)

      await expect(
        dialog.getByText("Cannot load commands: Load failed"),
      ).toBeVisible()
      await expect(
        sidepanelPage.page.getByRole("heading", {
          name: "Something went wrong.",
        }),
      ).toHaveCount(0)
    })

    test("lists configured commands with their description and actions", async ({
      sidepanelPage,
    }) => {
      const command = createCommand()

      sidepanelPage.mocks.commandGet = async () => [command]

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "Commands")

      const dialog = getSettingsDialog(sidepanelPage.page)

      await expect(dialog.getByText(`/${command.name}`)).toBeVisible()
      await expect(dialog.getByText(command.description!)).toBeVisible()
      await expect(
        dialog.getByRole("button", { name: `Edit /${command.name}` }),
      ).toBeVisible()
      await expect(
        dialog.getByRole("button", { name: `Delete /${command.name}` }),
      ).toBeVisible()
    })

    test("adds a command", async ({ sidepanelPage }) => {
      const created: unknown[] = []
      let commands: Command[] = []

      sidepanelPage.mocks.commandGet = async () => commands
      sidepanelPage.mocks.commandCreate = async (formData) => {
        created.push(formData)

        const command: Command = {
          id: "cmd-new",
          builtin: false,
          ...formData,
        }

        commands = [...commands, command]

        return command
      }

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "Commands")

      const dialog = getSettingsDialog(sidepanelPage.page)

      await dialog.getByRole("button", { name: "Command" }).click()

      const addDialog = sidepanelPage.page.getByRole("dialog", {
        name: "Add Command",
      })

      await expect(addDialog).toBeVisible()

      await addDialog.getByLabel("Name").fill("review")
      await addDialog.getByLabel("Description").fill("Review the code")
      await addDialog.getByLabel("Prompt").fill("Please review this code:")
      await addDialog.getByRole("button", { name: "Add Command" }).click()

      await expect(dialog.getByText("/review")).toBeVisible()
      expect(created).toHaveLength(1)
    })

    test("shows a validation error when the name is empty", async ({
      sidepanelPage,
    }) => {
      sidepanelPage.mocks.commandGet = async () => []

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "Commands")

      const dialog = getSettingsDialog(sidepanelPage.page)

      await dialog.getByRole("button", { name: "Command" }).click()

      const addDialog = sidepanelPage.page.getByRole("dialog", {
        name: "Add Command",
      })

      await addDialog.getByLabel("Prompt").fill("Some prompt")
      await addDialog.getByRole("button", { name: "Add Command" }).click()

      await expect(
        addDialog.getByText("Command name is required"),
      ).toBeVisible()
    })

    test("shows a validation error when the prompt is empty", async ({
      sidepanelPage,
    }) => {
      sidepanelPage.mocks.commandGet = async () => []

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "Commands")

      const dialog = getSettingsDialog(sidepanelPage.page)

      await dialog.getByRole("button", { name: "Command" }).click()

      const addDialog = sidepanelPage.page.getByRole("dialog", {
        name: "Add Command",
      })

      await addDialog.getByLabel("Name").fill("review")
      await addDialog.getByRole("button", { name: "Add Command" }).click()

      await expect(
        addDialog.getByText("Command prompt is required"),
      ).toBeVisible()
    })

    test("sanitizes the command name", async ({ sidepanelPage }) => {
      sidepanelPage.mocks.commandGet = async () => []

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "Commands")

      const dialog = getSettingsDialog(sidepanelPage.page)

      await dialog.getByRole("button", { name: "Command" }).click()

      const addDialog = sidepanelPage.page.getByRole("dialog", {
        name: "Add Command",
      })

      const nameInput = addDialog.getByLabel("Name")

      await nameInput.fill("my review@code")
      await nameInput.press("Tab")

      await expect(nameInput).toHaveValue("myreviewcode")
    })

    test("edits an existing command", async ({ sidepanelPage }) => {
      const command = createCommand()
      let commands: Command[] = [command]

      sidepanelPage.mocks.commandGet = async () => commands
      sidepanelPage.mocks.commandUpdate = async (next) => {
        commands = commands.map((c) => (c.id === next.id ? next : c))

        return next
      }

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "Commands")

      const dialog = getSettingsDialog(sidepanelPage.page)

      await dialog
        .getByRole("button", { name: `Edit /${command.name}` })
        .click()

      const editDialog = sidepanelPage.page.getByRole("dialog", {
        name: "Edit Command",
      })

      await expect(editDialog.getByLabel("Name")).toHaveValue(command.name)
      await expect(editDialog.getByLabel("Prompt")).toHaveValue(command.prompt)

      await editDialog.getByLabel("Name").fill("revised")
      await editDialog.getByRole("button", { name: "Save Changes" }).click()

      await expect(dialog.getByText("/revised")).toBeVisible()
      await expect(dialog.getByText(`/${command.name}`)).not.toBeVisible()
    })

    test("shows an error inside the dialog when saving fails", async ({
      sidepanelPage,
    }) => {
      const command = createCommand()

      sidepanelPage.mocks.commandGet = async () => [command]
      sidepanelPage.mocks.commandUpdate = async () => {
        throw new Error("Update failed")
      }

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "Commands")

      const dialog = getSettingsDialog(sidepanelPage.page)

      await dialog
        .getByRole("button", { name: `Edit /${command.name}` })
        .click()

      const editDialog = sidepanelPage.page.getByRole("dialog", {
        name: "Edit Command",
      })

      await editDialog.getByRole("button", { name: "Save Changes" }).click()

      await expect(editDialog.getByText("Update failed")).toBeVisible()
    })

    test("deletes a command after confirmation", async ({ sidepanelPage }) => {
      const command = createCommand()
      let commands: Command[] = [command]
      let deletedIds: string[] = []

      sidepanelPage.mocks.commandGet = async () => commands
      sidepanelPage.mocks.commandDelete = async (id) => {
        deletedIds.push(id)
        commands = commands.filter((c) => c.id !== id)
      }

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "Commands")

      const dialog = getSettingsDialog(sidepanelPage.page)

      sidepanelPage.page.once("dialog", async (confirmDialog) => {
        await confirmDialog.accept()
      })

      await dialog
        .getByRole("button", { name: `Delete /${command.name}` })
        .click()

      await expect(dialog.getByText(`/${command.name}`)).not.toBeVisible()
      expect(deletedIds).toEqual([command.id])
    })

    test("keeps the command when deletion is dismissed", async ({
      sidepanelPage,
    }) => {
      const command = createCommand()
      let deletedIds: string[] = []

      sidepanelPage.mocks.commandGet = async () => [command]
      sidepanelPage.mocks.commandDelete = async (id) => {
        deletedIds.push(id)
      }

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "Commands")

      const dialog = getSettingsDialog(sidepanelPage.page)

      sidepanelPage.page.once("dialog", async (confirmDialog) => {
        await confirmDialog.dismiss()
      })

      await dialog
        .getByRole("button", { name: `Delete /${command.name}` })
        .click()

      await expect(dialog.getByText(`/${command.name}`)).toBeVisible()
      expect(deletedIds).toHaveLength(0)
    })

    test("shows a toast when deleting a command fails", async ({
      sidepanelPage,
    }) => {
      const command = createCommand()

      sidepanelPage.mocks.commandGet = async () => [command]
      sidepanelPage.mocks.commandDelete = async () => {
        throw new Error("Deletion failed")
      }

      await sidepanelPage.page.reload()
      await openSettingsDialog(sidepanelPage.page)
      await openSettingsSection(sidepanelPage.page, "Commands")

      const dialog = getSettingsDialog(sidepanelPage.page)

      sidepanelPage.page.once("dialog", async (confirmDialog) => {
        await confirmDialog.accept()
      })

      await dialog
        .getByRole("button", { name: `Delete /${command.name}` })
        .click()

      await expect(getLatestToast(sidepanelPage.page)).toHaveText(
        "Deletion failed",
      )
    })
  })
})
