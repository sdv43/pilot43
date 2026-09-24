import type { OpenAIModelProvider } from "../../../src/shared/api"
import { expect, test } from "../../fixtures"
import {
  getMessageEditor,
  getModelSearchInput,
  getModelSelector,
  getReasoningEffortSelector,
  getThinkingToggle,
  getTokenEstimation,
  openModelSelector,
  openReasoningEffortSelector,
  selectModel,
} from "../utils/footer"
import {
  createOllamaProvider,
  createMessageRun,
  createModel,
  createOpenRouterProvider,
  createProvider,
  openBottomBar,
  setupFooterMocks,
} from "./helpers"

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

  test("keeps the newest-by-createdAt run selected even if an older run updates later", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.messageRuns = [
      createMessageRun({
        id: "old-run",
        createdAt: 100,
        updatedAt: 400,
        modelMeta: {
          name: "gpt-4.1",
          provider: "provider-1",
          settings: {},
        },
      }),
      createMessageRun({
        id: "new-run",
        createdAt: 200,
        updatedAt: 300,
        modelMeta: {
          name: "claude-3-sonnet",
          provider: "provider-2",
          settings: {},
        },
      }),
    ]

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)

    await expect(getModelSelector(page)).toContainText("claude-3-sonnet")
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

  test("disables the selector when there are no models", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.modelProviders = [createProvider()]
    state.modelProviderModels = { "provider-1": [] }

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)

    await expect(getModelSelector(page)).toBeDisabled()
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

    await openBottomBar(sidepanelPage)
    await openModelSelector(page)

    await expect(page.getByRole("option")).toHaveText([
      "claude-3-haiku",
      "claude-3-sonnet",
      "gpt-4.1",
      "gpt-4o-mini",
    ])

    await getModelSearchInput(page).fill("GPT")

    await expect(page.getByRole("option")).toHaveText([
      "gpt-4.1",
      "gpt-4o-mini",
    ])

    await getModelSearchInput(page).fill("missing-model")

    await expect(page.getByText("No matching models")).toBeVisible()
  })

  test("adds an unavailable selected model as a disabled option", async ({
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
    await openModelSelector(page)

    await expect(
      page.getByRole("option", { name: "ghost-model" }),
    ).toBeDisabled()
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

    await expect(
      page.getByRole("listbox").last().getByText("Cannot load models"),
    ).toBeVisible()
  })

  test("collapses and re-expands a provider group", async ({
    sidepanelPage,
  }) => {
    setupFooterMocks(sidepanelPage)

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await openModelSelector(page)

    const listbox = page.getByRole("listbox").last()
    const anthropicToggle = listbox.getByRole("button", {
      name: "Anthropic",
    })

    await expect(
      listbox.getByRole("option", { name: "claude-3-haiku" }),
    ).toBeVisible()
    await expect(listbox.getByRole("option", { name: "gpt-4.1" })).toBeVisible()

    await anthropicToggle.click()

    await expect(
      listbox.getByRole("option", { name: "claude-3-haiku" }),
    ).toHaveCount(0)
    await expect(
      listbox.getByRole("option", { name: "claude-3-sonnet" }),
    ).toHaveCount(0)
    // Options from other providers stay visible.
    await expect(listbox.getByRole("option", { name: "gpt-4.1" })).toBeVisible()
    await expect(anthropicToggle).toHaveAttribute("aria-expanded", "false")

    await anthropicToggle.click()

    await expect(
      listbox.getByRole("option", { name: "claude-3-haiku" }),
    ).toBeVisible()
    await expect(anthropicToggle).toHaveAttribute("aria-expanded", "true")
  })

  test("keeps a collapsed provider group collapsed after reopening the selector", async ({
    sidepanelPage,
  }) => {
    setupFooterMocks(sidepanelPage)

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await openModelSelector(page)

    const listbox = page.getByRole("listbox").last()

    await listbox.getByRole("button", { name: "Anthropic" }).click()

    // Close the popover with Escape, then reopen it.
    await page.keyboard.press("Escape")
    await expect(getModelSelector(page)).toHaveAttribute(
      "aria-expanded",
      "false",
    )

    await openModelSelector(page)

    await expect(
      page
        .getByRole("listbox")
        .last()
        .getByRole("option", { name: "claude-3-haiku" }),
    ).toHaveCount(0)
    await expect(
      page.getByRole("listbox").last().getByRole("option", { name: "gpt-4.1" }),
    ).toBeVisible()
  })

  test("re-expands collapsed groups when the search query re-filters the list", async ({
    sidepanelPage,
  }) => {
    setupFooterMocks(sidepanelPage)

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await openModelSelector(page)

    const listbox = page.getByRole("listbox").last()

    await listbox.getByRole("button", { name: "Anthropic" }).click()

    await expect(
      listbox.getByRole("option", { name: "claude-3-haiku" }),
    ).toHaveCount(0)

    await getModelSearchInput(page).fill("claude")

    await expect(
      listbox.getByRole("option", { name: "claude-3-haiku" }),
    ).toBeVisible()
  })

  test("shows reasoning effort selector for openrouter models with reasoning capability", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.modelProviders = [createOpenRouterProvider()]
    state.modelProviderModels = {
      "provider-openrouter": [
        createModel({
          id: "provider-openrouter::deepseek-r1",
          name: "deepseek-r1",
          providerId: "provider-openrouter",
          reasoning: {
            defaultEffort: "medium",
            mandatory: false,
            supportedEfforts: ["low", "medium", "high"],
          },
        }),
      ],
    }

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await selectModel(page, "deepseek-r1")

    await expect(getReasoningEffortSelector(page)).toBeVisible()
    await expect(getThinkingToggle(page)).toHaveCount(0)

    await openReasoningEffortSelector(page)
    await expect(page.getByRole("option")).toHaveText([
      "Default",
      "Low",
      "Medium",
      "High",
    ])
  })

  test("does not show a reasoning control for openai models", async ({
    sidepanelPage,
  }) => {
    setupFooterMocks(sidepanelPage)

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await selectModel(page, "gpt-4.1")

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
    await selectModel(page, "llama3.2")

    await expect(getReasoningEffortSelector(page)).toHaveCount(0)
    await expect(getThinkingToggle(page)).toBeVisible()
    await expect(getThinkingToggle(page)).toBeChecked()
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

    await expect(getTokenEstimation(page)).toHaveText("120 tok")
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
    await expect(getTokenEstimation(page)).not.toHaveText("120 tok")
  })

  test("shows a placeholder when there is no stored estimate", async ({
    sidepanelPage,
  }) => {
    setupFooterMocks(sidepanelPage)

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)

    await expect(getTokenEstimation(page)).toHaveText("- tok")
  })
})
