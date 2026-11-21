import { expect, test } from "../../fixtures"
import { getLatestToast } from "../utils/toast"
import {
  getEditorAutocomplete,
  getEditorAutocompleteOption,
  getMessageEditor,
  getSendMessageButton,
} from "../utils/footer"
import {
  createChat,
  createMessageRun,
  openBottomBar,
  setupFooterMocks,
} from "./helpers"

test.describe("/compact", () => {
  test("heads the / menu, before the prompts", async ({ sidepanelPage }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.prompts = [
      { builtin: false, id: "prompt-1", text: "Alpha prompt", title: "alpha" },
    ]
    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("/")

    const menu = getEditorAutocomplete(page)

    await expect(menu.getByText("Commands", { exact: true })).toBeVisible()
    await expect(menu.getByText("Prompts", { exact: true })).toBeVisible()
    await expect(getEditorAutocompleteOption(page, "/compact")).toHaveAttribute(
      "aria-selected",
      "true",
    )

    await getMessageEditor(page).press("Enter")
    await expect(getMessageEditor(page)).toHaveValue("/compact ")
  })

  test("summarises the chat instead of sending a message", async ({
    sidepanelPage,
  }) => {
    const { recorders, state } = setupFooterMocks(sidepanelPage)
    state.messageRuns = [createMessageRun()]
    state.modelProviderModels["provider-1"][0].contextWindow = 128_000
    const compactCalls: unknown[][] = []
    // The summary is still being written while the input is checked.
    sidepanelPage.mocks.chatHistoryCompact = async (...args) => {
      compactCalls.push(args)
      await new Promise(() => {})
    }
    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("/compact")
    await getMessageEditor(page).press("Enter")

    // The command clears the input at once, like a sent message.
    await expect(getMessageEditor(page)).toHaveValue("")
    await expect
      .poll(() => compactCalls)
      .toEqual([
        [
          "c1",
          { contextWindow: 128_000, name: "gpt-4.1", providerId: "provider-1" },
        ],
      ])
    expect(recorders.sendCalls).toEqual([])
  })

  test("runs when picked from the / menu and sent", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.messageRuns = [createMessageRun()]
    let compactCalls = 0
    sidepanelPage.mocks.chatHistoryCompact = async () => {
      compactCalls += 1
    }
    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("/com")
    await getMessageEditor(page).press("Enter")
    await expect(getMessageEditor(page)).toHaveValue("/compact ")

    await getMessageEditor(page).press("Enter")

    await expect(getMessageEditor(page)).toHaveValue("")
    await expect.poll(() => compactCalls).toBe(1)
  })

  test("reports a chat with nothing to summarise", async ({
    sidepanelPage,
  }) => {
    const { recorders } = setupFooterMocks(sidepanelPage)
    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("/compact")
    await getSendMessageButton(page).click()

    await expect(getLatestToast(page)).toHaveText(
      "There is nothing to summarise yet",
    )
    // Information, not an error: it closes by itself.
    await expect(getLatestToast(page)).toHaveAttribute("data-variant", "info")
    expect(recorders.sendCalls).toEqual([])
  })

  test("keeps send disabled while the chat is being summarised", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.chats = [createChat({ isSummarisingHistory: true })]
    state.messageRuns = [createMessageRun()]
    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("Next question")

    await expect(getSendMessageButton(page)).toBeDisabled()
  })
})

test.describe("summarised history", () => {
  test("marks where the summarised runs end", async ({ sidepanelPage }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.chats = [
      createChat({
        historySummary: {
          content: "Summary",
          createdAt: 3,
          throughRunId: "mr1",
          tokenCount: 2,
        },
      }),
    ]
    state.messageRuns = [
      createMessageRun({ createdAt: 1, id: "mr1" }),
      createMessageRun({
        createdAt: 2,
        id: "mr2",
        userMessage: {
          attachments: [],
          content: "Next question",
          createdAt: 2,
          id: "um2",
          messageRunId: "mr2",
          role: "user",
        },
      }),
    ]
    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)

    const divider = page.getByTestId("summary-divider")

    await expect(divider).toHaveCount(1)
    await expect(divider).toHaveText("Earlier messages summarised")
    // It sits between the summarised run and the next one.
    await expect(
      page
        .getByTestId("message-run")
        .first()
        .locator("xpath=following-sibling::*[1]"),
    ).toHaveAttribute("data-testid", "summary-divider")
  })

  test("shows the summary being written", async ({ sidepanelPage }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.chats = [createChat({ isSummarisingHistory: true })]
    state.messageRuns = [createMessageRun()]
    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)

    await expect(page.getByTestId("summary-divider-working")).toHaveText(
      "Summarising earlier messages…",
    )
  })
})
