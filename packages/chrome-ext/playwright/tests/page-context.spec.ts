import type { BrowserContext, Page } from "@playwright/test"
import { expect, test } from "../fixtures"
import {
  callBackend,
  createArticlePage,
  startFakeOpenAIServer,
  startStaticServer,
} from "./utils/backend"
import {
  getAttachMenu,
  getAttachmentBadge,
  getAttachmentPreview,
  getMessageEditor,
  getSendMessageButton,
  openAttachMenu,
  openAttachmentPreview,
} from "./utils/footer"

// These tests run the side panel against the real backend, content script and
// service worker, with web pages served from a local server.
test.describe("Page context", () => {
  const gardenText =
    "Growing herbs on a windowsill needs light, water and patience."
  let site: Awaited<ReturnType<typeof startStaticServer>>

  test.beforeEach(async () => {
    site = await startStaticServer({
      "/garden": {
        body: createArticlePage("Kitchen Garden Guide", gardenText),
      },
    })
  })

  test.afterEach(async () => {
    await site.close()
  })

  /**
   * Opens the side panel with a workspace in the real backend and, with
   * `modelHost`, an OpenAI-compatible provider.
   */
  async function openSidepanel(
    context: BrowserContext,
    extensionId: string,
    modelHost?: string,
  ) {
    const panel = await context.newPage()

    await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`)
    await callBackend(panel, "workspaceCreate", { name: "Pages" })

    if (modelHost) {
      await callBackend(panel, "modelProviderCreate", {
        name: "Fake",
        settings: { apiKey: "key", host: modelHost },
        type: "openai",
      })
    }

    await panel.reload()
    await expect(panel.getByTestId("message-editor")).toBeVisible()

    return panel
  }

  async function openTab(context: BrowserContext, path: string) {
    const tab = await context.newPage()

    await tab.goto(`${site.origin}${path}`)

    return tab
  }

  /**
   * Content scripts are injected once the page is idle, which can be after
   * `goto` resolves; waits until the one of `tab` answers the side panel.
   */
  async function waitForContentScript(panel: Page, tab: Page) {
    await expect
      .poll(() =>
        panel.evaluate(async (url) => {
          const [{ id }] = await chrome.tabs.query({ url })

          return chrome.tabs
            .sendMessage(id!, {
              action: "pageContentSelectionGet",
              payload: [],
              target: "content",
            })
            .then(
              () => true,
              () => false,
            )
        }, tab.url()),
      )
      .toBe(true)
  }

  function getTabs(panel: Page) {
    return getAttachMenu(panel).getByRole("checkbox")
  }

  test("lists open tabs as they open, change and close", async ({
    context,
    extensionId,
  }) => {
    const panel = await openSidepanel(context, extensionId)

    await openAttachMenu(panel)
    await expect(getAttachMenu(panel)).not.toContainText("Open tabs")

    // The menu stays open; the service worker reports every tab change.
    const tab = await openTab(context, "/garden")

    await expect(getAttachMenu(panel)).toContainText("Kitchen Garden Guide")
    await expect(getTabs(panel)).toHaveCount(1)

    await tab.evaluate(() => {
      document.title = "Herb Garden Guide"
    })
    await expect(getAttachMenu(panel)).toContainText("Herb Garden Guide")

    await tab.close()
    await expect(getTabs(panel)).toHaveCount(0)
    await expect(getAttachMenu(panel)).not.toContainText("Open tabs")
  })

  test("attaches the readable content of an open tab", async ({
    context,
    extensionId,
  }) => {
    const tab = await openTab(context, "/garden")
    const panel = await openSidepanel(context, extensionId)

    await waitForContentScript(panel, tab)
    await openAttachMenu(panel)
    await getTabs(panel).first().check()
    await getAttachMenu(panel).getByTestId("attach-menu-attach-tabs").click()

    await expect(
      getAttachmentBadge(panel, "Kitchen Garden Guide"),
    ).toBeVisible()
    await openAttachmentPreview(panel, "Kitchen Garden Guide")
    await expect(getAttachmentPreview(panel)).toContainText(gardenText)
    // Readability drops the page chrome and keeps the article.
    await expect(getAttachmentPreview(panel)).toContainText(
      "Section 6 explains the topic",
    )
  })

  test("attaches the text selected on the active tab", async ({
    context,
    extensionId,
  }) => {
    const panel = await openSidepanel(context, extensionId)
    const tab = await openTab(context, "/garden")

    await tab.bringToFront()
    await waitForContentScript(panel, tab)
    await openAttachMenu(panel)

    const selectionItem = getAttachMenu(panel).getByRole("menuitem", {
      name: /Selected text/,
    })

    await expect(selectionItem).toHaveCount(0)

    // The content script reports the selection while the menu is open.
    await tab.evaluate(() => {
      const paragraph = document.querySelector("p")!
      const range = document.createRange()

      range.selectNodeContents(paragraph)
      window.getSelection()!.removeAllRanges()
      window.getSelection()!.addRange(range)
    })

    await expect(selectionItem).toContainText(
      `“${gardenText.slice(0, 40)}” on 127.0.0.1`,
    )
    await selectionItem.click()

    await expect(
      getAttachmentBadge(panel, "Kitchen Garden Guide"),
    ).toBeVisible()
    await openAttachmentPreview(panel, "Kitchen Garden Guide")
    await expect(getAttachmentPreview(panel)).toContainText(gardenText)
    await expect(getAttachmentPreview(panel)).not.toContainText("Section 2")
  })

  test("sends the selection with the id of its tab", async ({
    context,
    extensionId,
  }) => {
    const server = await startFakeOpenAIServer([{ content: "Noted." }])

    try {
      const panel = await openSidepanel(context, extensionId, server.host)
      const tab = await openTab(context, "/garden")

      await tab.bringToFront()
      await waitForContentScript(panel, tab)
      await tab.evaluate(() => {
        const range = document.createRange()

        range.selectNodeContents(document.querySelector("p")!)
        window.getSelection()!.removeAllRanges()
        window.getSelection()!.addRange(range)
      })
      await openAttachMenu(panel)
      await getAttachMenu(panel)
        .getByRole("menuitem", { name: /Selected text/ })
        .click()
      await getMessageEditor(panel).pressSequentially(" Summarize")
      await getSendMessageButton(panel).click()

      const tabId = await panel.evaluate(
        async (url) => (await chrome.tabs.query({ url }))[0]?.id,
        tab.url(),
      )
      const [workspace] = await callBackend(panel, "workspaceGet")

      await expect
        .poll(async () => {
          const [chat] = await callBackend(
            panel,
            "chatGetByWorkspace",
            workspace.id,
          )
          const [run] = chat
            ? await callBackend(panel, "chatMessageRunGet", chat.id)
            : []

          return run?.userMessage.attachments
        })
        .toEqual([
          expect.objectContaining({
            content: expect.stringContaining(gardenText),
            id: tabId,
            type: "page-content-selection",
          }),
        ])
    } finally {
      await server.close()
    }
  })
})
