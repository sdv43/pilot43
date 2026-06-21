import type { Page } from "@playwright/test"
import type { OpenAIModelProvider } from "../../src/shared/api"
import { expect, test } from "../fixtures"

const modelProviderTypes = [
  { name: "openai", type: "openai" as const },
  { name: "ollama", type: "ollama" as const },
]

function createOpenAIProvider(
  overrides: Partial<OpenAIModelProvider> = {},
): OpenAIModelProvider {
  const { settings, ...restOverrides } = overrides

  return {
    id: "provider-1",
    name: "OpenAI Primary",
    type: "openai",
    ...restOverrides,
    settings: {
      apiKey: "sk-test",
      host: "https://api.openai.com",
      ...settings,
    },
  }
}

async function openSettingsDialog(page: Page) {
  await page.getByRole("button", { name: "Settings" }).click()

  const dialog = page.getByRole("dialog", { name: "Settings" })

  await expect(dialog).toBeVisible()

  return dialog
}

test.describe.skip("Settings", () => {
  test.beforeEach(async ({ sidepanelPage }) => {
    sidepanelPage.mocks.workspaceGet = async () => []
    sidepanelPage.mocks.modelProviderTypeGet = async () => modelProviderTypes
  })

  test("opens and shows an empty provider state", async ({ sidepanelPage }) => {
    sidepanelPage.mocks.modelProviderGet = async () => []

    await sidepanelPage.open()
    await sidepanelPage.page.getByRole("button", { name: "Settings" }).click()

    const dialog = sidepanelPage.page.getByRole("dialog", { name: "Settings" })

    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByRole("heading", { name: "Model Providers" }),
    ).toBeVisible()
    await expect(
      dialog.getByText("No model providers configured yet"),
    ).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Provider" })).toBeVisible()
  })

  test("shows configured providers and provider actions", async ({
    sidepanelPage,
  }) => {
    const provider = createOpenAIProvider()

    sidepanelPage.mocks.modelProviderGet = async () => [provider]

    await sidepanelPage.open()

    const dialog = await openSettingsDialog(sidepanelPage.page)

    await expect(dialog.getByText(provider.name)).toBeVisible()
    await expect(
      dialog.getByRole("button", { name: `Edit ${provider.name}` }),
    ).toBeVisible()
    await expect(
      dialog.getByRole("button", { name: `Delete ${provider.name}` }),
    ).toBeVisible()
  })

  test("shows error message when provider fails to load", async ({
    sidepanelPage,
  }) => {
    sidepanelPage.mocks.modelProviderGet = async () => {
      throw new Error("Load failed")
    }

    await sidepanelPage.open()

    const dialog = await openSettingsDialog(sidepanelPage.page)

    await expect(
      dialog.getByText("Cannot load providers: Load failed"),
    ).toBeVisible()
  })

  test("shows loading state when provider is loading", async ({
    sidepanelPage,
  }) => {
    let resolveProviders!: (providers: OpenAIModelProvider[]) => void

    sidepanelPage.mocks.modelProviderGet = async () => {
      return await new Promise<OpenAIModelProvider[]>((resolve) => {
        resolveProviders = resolve
      })
    }

    await sidepanelPage.open()

    const dialog = await openSettingsDialog(sidepanelPage.page)

    await expect(dialog.getByText("Loading providers...")).toBeVisible()

    resolveProviders([])
  })

  test("shows confirmation dialog when deleting a provider", async ({
    sidepanelPage,
  }) => {
    const provider = createOpenAIProvider()
    let deleteCalls = 0

    sidepanelPage.mocks.modelProviderGet = async () => [provider]
    sidepanelPage.mocks.modelProviderDelete = async () => {
      deleteCalls += 1
    }

    await sidepanelPage.open()

    const settingsDialog = await openSettingsDialog(sidepanelPage.page)
    const confirmPromise = new Promise<{
      message: string
      type: string
    }>((resolve) => {
      sidepanelPage.page.once("dialog", async (confirmDialog) => {
        const data = {
          message: confirmDialog.message(),
          type: confirmDialog.type(),
        }

        await confirmDialog.dismiss()
        resolve(data)
      })
    })

    await settingsDialog
      .getByRole("button", { name: `Delete ${provider.name}` })
      .click()

    const confirmDialog = await confirmPromise

    expect(confirmDialog.type).toBe("confirm")
    expect(confirmDialog.message).toBe(
      `Are you sure you want to delete "${provider.name}"?`,
    )

    expect(deleteCalls).toBe(0)
    await expect(settingsDialog.getByText(provider.name)).toBeVisible()
  })

  test("shows error toast when deleting a provider fails", async ({
    sidepanelPage,
  }) => {
    const provider = createOpenAIProvider()

    sidepanelPage.mocks.modelProviderGet = async () => [provider]
    sidepanelPage.mocks.modelProviderDelete = async () => {
      throw new Error("Deletion failed")
    }

    await sidepanelPage.open()

    const settingsDialog = await openSettingsDialog(sidepanelPage.page)
    const confirmPromise = new Promise<void>((resolve) => {
      sidepanelPage.page.once("dialog", async (confirmDialog) => {
        await confirmDialog.accept()
        resolve()
      })
    })

    await settingsDialog
      .getByRole("button", { name: `Delete ${provider.name}` })
      .click()

    await confirmPromise

    await expect(sidepanelPage.page.getByRole("alert")).toHaveText(
      "Deletion failed",
    )
  })

  test("shows editing form when editing a provider", async ({
    sidepanelPage,
  }) => {
    const provider = createOpenAIProvider()

    sidepanelPage.mocks.modelProviderGet = async () => [provider]

    await sidepanelPage.open()

    const settingsDialog = await openSettingsDialog(sidepanelPage.page)

    await settingsDialog
      .getByRole("button", { name: `Edit ${provider.name}` })
      .click()

    const providerDialog = sidepanelPage.page.getByRole("dialog", {
      name: "Edit Provider",
    })

    await expect(providerDialog).toBeVisible()
    await expect(providerDialog.getByLabel("Name")).toHaveValue(provider.name)
    await expect(providerDialog.getByLabel("API Key")).toHaveValue(
      provider.settings.apiKey,
    )
    await expect(providerDialog.getByLabel("Host (Optional)")).toHaveValue(
      provider.settings.host ?? "",
    )
    await expect(
      providerDialog.getByRole("button", { name: "Save Changes" }),
    ).toBeVisible()
  })

  test("shows error message when editing a provider fails", async ({
    sidepanelPage,
  }) => {
    const provider = createOpenAIProvider()

    sidepanelPage.mocks.modelProviderGet = async () => [provider]
    sidepanelPage.mocks.modelProviderUpdate = async () => {
      throw new Error("Update failed")
    }

    await sidepanelPage.open()

    const settingsDialog = await openSettingsDialog(sidepanelPage.page)

    await settingsDialog
      .getByRole("button", { name: `Edit ${provider.name}` })
      .click()

    const providerDialog = sidepanelPage.page.getByRole("dialog", {
      name: "Edit Provider",
    })

    await providerDialog.getByLabel("Name").fill("Updated Provider")
    await providerDialog.getByRole("button", { name: "Save Changes" }).click()

    await expect(providerDialog.getByText("Update failed")).toBeVisible()
  })

  test("shows success message when provider is successfully connected", async ({
    sidepanelPage,
  }) => {
    const provider = createOpenAIProvider()

    sidepanelPage.mocks.modelProviderGet = async () => [provider]
    sidepanelPage.mocks.modelProviderCheck = async () => ({
      message: "Connection succeeded",
      success: true,
    })

    await sidepanelPage.open()

    const settingsDialog = await openSettingsDialog(sidepanelPage.page)

    await settingsDialog
      .getByRole("button", { name: `Edit ${provider.name}` })
      .click()

    const providerDialog = sidepanelPage.page.getByRole("dialog", {
      name: "Edit Provider",
    })

    await providerDialog
      .getByRole("button", { name: "Check Connection" })
      .click()

    await expect(providerDialog.getByText("Connection succeeded")).toBeVisible()
  })

  test("shows error message when provider fails to connect", async ({
    sidepanelPage,
  }) => {
    const provider = createOpenAIProvider()

    sidepanelPage.mocks.modelProviderGet = async () => [provider]
    sidepanelPage.mocks.modelProviderCheck = async () => {
      throw new Error("Connection failed")
    }

    await sidepanelPage.open()

    const settingsDialog = await openSettingsDialog(sidepanelPage.page)

    await settingsDialog
      .getByRole("button", { name: `Edit ${provider.name}` })
      .click()

    const providerDialog = sidepanelPage.page.getByRole("dialog", {
      name: "Edit Provider",
    })

    await providerDialog
      .getByRole("button", { name: "Check Connection" })
      .click()

    await expect(providerDialog.getByText("Connection failed")).toBeVisible()
  })

  test("editing existing provider updates the provider list", async ({
    sidepanelPage,
  }) => {
    let providers = [createOpenAIProvider()]

    sidepanelPage.mocks.modelProviderGet = async () => providers
    sidepanelPage.mocks.modelProviderUpdate = async (updatedProvider) => {
      const nextProvider = updatedProvider as OpenAIModelProvider

      providers = providers.map((provider) =>
        provider.id === nextProvider.id ? nextProvider : provider,
      )

      return nextProvider
    }

    await sidepanelPage.open()

    const settingsDialog = await openSettingsDialog(sidepanelPage.page)
    const originalProvider = providers[0]

    await settingsDialog
      .getByRole("button", { name: `Edit ${originalProvider.name}` })
      .click()

    const providerDialog = sidepanelPage.page.getByRole("dialog", {
      name: "Edit Provider",
    })

    await providerDialog.getByLabel("Name").fill("Updated Provider")
    await providerDialog.getByRole("button", { name: "Save Changes" }).click()

    await expect(settingsDialog.getByText("Updated Provider")).toBeVisible()
    await expect(
      settingsDialog.getByText(originalProvider.name),
    ).not.toBeVisible()
  })

  test("add new provider updates the provider list", async ({
    sidepanelPage,
  }) => {
    let providers: OpenAIModelProvider[] = []

    sidepanelPage.mocks.modelProviderGet = async () => providers
    sidepanelPage.mocks.modelProviderCreate = async (provider) => {
      const createdProvider: OpenAIModelProvider = {
        id: "provider-2",
        name: provider.name,
        settings: {
          apiKey: "apiKey" in provider.settings ? provider.settings.apiKey : "",
          host:
            "host" in provider.settings ? provider.settings.host : undefined,
        },
        type: "openai",
      }

      providers = [...providers, createdProvider]

      return createdProvider
    }

    await sidepanelPage.open()

    const settingsDialog = await openSettingsDialog(sidepanelPage.page)

    await settingsDialog.getByRole("button", { name: "Provider" }).click()

    const providerDialog = sidepanelPage.page.getByRole("dialog", {
      name: "Add Provider",
    })

    await providerDialog.getByLabel("Name").fill("New Provider")
    await providerDialog.getByLabel("API Key").fill("sk-new")
    await providerDialog
      .getByLabel("Host (Optional)")
      .fill("https://api.example.com")
    await providerDialog.getByRole("button", { name: "Add Provider" }).click()

    await expect(settingsDialog.getByText("New Provider")).toBeVisible()
  })
})
