import type { OpenAIModelProvider } from "@pilot43/protocol"
import { expect, test } from "../../fixtures"
import {
  getMessageEditor,
  getModelMenu,
  getModelOption,
  getModelSearchInput,
  getModelSelector,
  getReasoningEffortSelector,
  getThinkingToggle,
  getTokenEstimation,
  openModelSelector,
  selectModel,
  selectReasoningEffort,
} from "../utils/footer"
import {
  createChat,
  createModel,
  createMessageRun,
  createOllamaProvider,
  createOpenRouterProvider,
  createProvider,
  openBottomBar,
  setupFooterMocks,
} from "./helpers"

const openRouterModels = {
  "provider-openrouter": [
    createModel({
      id: "provider-openrouter::deepseek/deepseek-r1",
      name: "deepseek/deepseek-r1",
      providerId: "provider-openrouter",
      reasoning: {
        defaultEffort: "medium",
        mandatory: false,
        supportedEfforts: ["low", "medium", "high"],
      },
    }),
  ],
}

test.describe("model selector", () => {
  test("hydrates the selected model from the latest message run", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.messageRuns = [
      createMessageRun({
        modelMeta: {
          name: "gpt-4o-mini",
          provider: "provider-1",
          settings: {},
        },
      }),
    ]

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)

    await expect(getModelSelector(page)).toContainText("gpt-4o-mini")
  })

  test("prefers the model saved on the chat over its last run", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.chats = [
      createChat({
        settings: {
          model: { name: "claude-3-sonnet", providerId: "provider-2" },
          tools: [],
        },
      }),
    ]
    state.messageRuns = [createMessageRun()]

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)

    await expect(getModelSelector(page)).toContainText("claude-3-sonnet")
  })

  test("uses the model of the most recently active chat for a new chat", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.workspaces = [
      { id: "w1", name: "Workspace 1", lastSelectedChatId: null },
    ]
    state.chats = [
      createChat({
        id: "c1",
        settings: {
          model: { name: "gpt-4o-mini", providerId: "provider-1" },
          tools: [],
        },
        updatedAt: 100,
      }),
      createChat({
        id: "c2",
        settings: {
          model: { name: "claude-3-haiku", providerId: "provider-2" },
          tools: [],
        },
        updatedAt: 200,
      }),
    ]

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)

    await expect(getModelSelector(page)).toContainText("claude-3-haiku")
  })

  test("falls back to the first model when the chat's model is unavailable", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.messageRuns = [
      createMessageRun({
        modelMeta: {
          name: "ghost-model",
          provider: "provider-3",
          settings: {},
        },
      }),
    ]

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)

    await expect(getModelSelector(page)).toContainText("gpt-4.1")
  })

  test("saves the picked model on the open chat", async ({ sidepanelPage }) => {
    const { recorders } = setupFooterMocks(sidepanelPage)

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await expect(getModelSelector(page)).toContainText("gpt-4.1")
    await selectModel(page, "claude-3-haiku")

    await expect(getModelSelector(page)).toContainText("claude-3-haiku")
    await expect
      .poll(() => recorders.chatSettingsUpdateCalls.at(-1)?.[1].model)
      .toEqual({
        name: "claude-3-haiku",
        providerId: "provider-2",
        settings: {},
      })
  })

  test("disables the selector while models are loading", async ({
    sidepanelPage,
  }) => {
    setupFooterMocks(sidepanelPage)
    sidepanelPage.mocks.modelProviderGet = async () =>
      await new Promise<OpenAIModelProvider[]>(() => undefined)

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)

    await expect(getModelSelector(page)).toBeDisabled()
  })

  test("links to the new provider page when there are no providers", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.modelProviders = []

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await page.getByRole("button", { name: "Add a provider" }).click()

    await expect(page).toHaveURL(/#\/settings\/providers\/new$/)
  })

  test("shows an empty list when the providers have no models", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.modelProviders = [createProvider()]
    state.modelProviderModels = { "provider-1": [] }

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await expect(getModelSelector(page)).toHaveText("Select model")
    await openModelSelector(page)

    await expect(getModelMenu(page)).toContainText("No models available")
  })

  test("filters models case-insensitively, keeps them sorted and shows no matches", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.modelProviders = [
      createProvider({ id: "provider-2", name: "Anthropic" }),
      createProvider({ id: "provider-1", name: "OpenAI" }),
    ]
    state.modelProviderModels = {
      "provider-1": [
        createModel({ id: "provider-1::gpt-4o-mini", name: "gpt-4o-mini" }),
        createModel({ id: "provider-1::gpt-4.1", name: "gpt-4.1" }),
      ],
      "provider-2": [
        createModel({
          id: "provider-2::claude-3-sonnet",
          name: "claude-3-sonnet",
          providerId: "provider-2",
        }),
        createModel({
          id: "provider-2::claude-3-haiku",
          name: "claude-3-haiku",
          providerId: "provider-2",
        }),
      ],
    }

    const page = sidepanelPage.page
    const options = getModelMenu(page).getByRole("menuitemradio")

    await openBottomBar(sidepanelPage)
    await openModelSelector(page)

    await expect(getModelMenu(page).getByRole("group")).toHaveText([
      /^Anthropic/,
      /^OpenAI/,
    ])
    await expect(options).toHaveText([
      /claude-3-haiku$/,
      /claude-3-sonnet$/,
      /gpt-4\.1$/,
      /gpt-4o-mini$/,
    ])

    await getModelSearchInput(page).fill("GPT")

    await expect(options).toHaveText([/gpt-4\.1$/, /gpt-4o-mini$/])

    await getModelSearchInput(page).fill("missing-model")

    await expect(getModelMenu(page)).toContainText("No matching models")
  })

  test("shows a provider load error inside the selector", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.modelProviders = [createProvider()]
    sidepanelPage.mocks.modelProviderModelGet = async () => {
      throw new Error("Cannot load models")
    }

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await openModelSelector(page)

    await expect(getModelMenu(page).getByRole("group")).toHaveText(
      "OpenAIUnavailable",
    )
  })

  test("shows the reasoning effort of models with reasoning levels", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.modelProviders = [createOpenRouterProvider()]
    state.modelProviderModels = openRouterModels

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await selectModel(page, "deepseek-r1", { keepOpen: true })

    const levels = getReasoningEffortSelector(page).getByRole("radio")

    await expect(levels).toHaveText(["Low", "Medium", "High"])
    await expect(
      getReasoningEffortSelector(page).getByRole("radio", { name: "Medium" }),
    ).toHaveAttribute("aria-checked", "true")
    await expect(getThinkingToggle(page)).toHaveCount(0)
  })

  test("saves the picked reasoning effort on the chat", async ({
    sidepanelPage,
  }) => {
    const { recorders, state } = setupFooterMocks(sidepanelPage)
    state.modelProviders = [createOpenRouterProvider()]
    state.modelProviderModels = openRouterModels

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await selectReasoningEffort(page, "High")

    // The composer chip shows the model only.
    await expect(getModelSelector(page)).toHaveText("deepseek-r1")
    await expect
      .poll(() => recorders.chatSettingsUpdateCalls.at(-1)?.[1].model)
      .toEqual({
        name: "deepseek/deepseek-r1",
        providerId: "provider-openrouter",
        settings: { reasoningEffort: "high" },
      })
  })

  test("does not show a reasoning control for openai models", async ({
    sidepanelPage,
  }) => {
    setupFooterMocks(sidepanelPage)

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await selectModel(page, "gpt-4.1", { keepOpen: true })

    await expect(getReasoningEffortSelector(page)).toHaveCount(0)
    await expect(getThinkingToggle(page)).toHaveCount(0)
  })

  test("shows an Ollama thinking toggle instead of a reasoning selector", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.modelProviders = [createOllamaProvider()]
    state.modelProviderModels = {
      "provider-ollama": [
        createModel({
          id: "provider-ollama::llama3.2",
          name: "llama3.2",
          providerId: "provider-ollama",
        }),
      ],
    }

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await selectModel(page, "llama3.2", { keepOpen: true })

    await expect(getReasoningEffortSelector(page)).toHaveCount(0)
    await expect(getThinkingToggle(page)).toBeVisible()
    await expect(getThinkingToggle(page)).toBeChecked()
    await expect(getModelOption(page, "llama3.2")).toHaveAttribute(
      "aria-checked",
      "true",
    )
  })
})

test.describe("token estimation", () => {
  test("shows the stored token estimate for the selected chat", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.tokenEstimate = 120

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)

    await expect(getTokenEstimation(page)).toHaveText("~120 tokens")
  })

  test("adds an approximate draft estimate while typing", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.tokenEstimate = 120

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("hello")

    await expect(getTokenEstimation(page)).toContainText("~")
    await expect(getTokenEstimation(page)).not.toHaveText("~120 tokens")
  })

  test("shows nothing when there is no stored estimate", async ({
    sidepanelPage,
  }) => {
    setupFooterMocks(sidepanelPage)

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)

    await expect(getTokenEstimation(page)).toBeEmpty()
  })
})
