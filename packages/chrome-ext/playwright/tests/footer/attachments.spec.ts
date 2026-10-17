import type { PageContent, PageContentSelection } from "@pilot43/protocol"
import { expect, test } from "../../fixtures"
import { getLatestToast } from "../utils/toast"
import {
  attachFiles,
  getAttachMenu,
  getAttachmentBadge,
  getAttachmentBadges,
  getAttachmentPreview,
  getEditorAutocompleteOption,
  getEditorCommandTokens,
  getMessageEditor,
  getSendMessageButton,
  openAttachMenu,
  openAttachmentPreview,
  pasteFiles,
  selectModel,
} from "../utils/footer"
import {
  openBottomBar,
  notifyPageContextUpdated,
  setupFooterMocks,
} from "./helpers"

test.describe("attachments", () => {
  test("loads #page attachments, blocks send while loading, and keeps the resolved snapshot", async ({
    sidepanelPage,
  }) => {
    setupFooterMocks(sidepanelPage)

    const snapshot: PageContent = {
      id: 42,
      url: "https://example.com/page",
      title: "Example page",
      content: "Initial page content",
      textContent: "Initial page text",
      excerpt: null,
      byline: null,
      siteName: null,
      lang: null,
      length: 0,
      publishedTime: null,
      dir: null,
    }

    let resolveSnapshot!: (value: PageContent) => void

    sidepanelPage.mocks.pageContentGetById = async () =>
      await new Promise<PageContent>((resolve) => {
        resolveSnapshot = resolve
      })

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("Check #page:42")
    await selectModel(page, "gpt-4.1")

    await expect(getAttachmentBadge(page, "loading...")).toBeVisible()
    await expect(getSendMessageButton(page)).toBeDisabled()

    resolveSnapshot(snapshot)

    await expect(getAttachmentBadge(page, "Example page")).toBeVisible()
    await openAttachmentPreview(page, "Example page")
    await expect(getAttachmentPreview(page)).toContainText("Initial page text")

    sidepanelPage.mocks.pageContentGetById = async () => ({
      ...snapshot,
      textContent: "Updated page text",
    })

    await notifyPageContextUpdated(sidepanelPage)
    await expect(getAttachmentPreview(page)).toContainText("Initial page text")
  })

  test("marks page attachments as errored and blocks sending", async ({
    sidepanelPage,
  }) => {
    setupFooterMocks(sidepanelPage)
    sidepanelPage.mocks.pageContentGetById = async () => {
      throw new Error("Cannot load page")
    }

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("Check #page:42")
    await selectModel(page, "gpt-4.1")

    await expect(getAttachmentBadge(page, "Page")).toHaveAttribute(
      "data-error",
      "true",
    )
    await expect(getSendMessageButton(page)).toBeDisabled()
    await expect(getEditorCommandTokens(page).first()).toHaveAttribute(
      "data-has-error",
      "true",
    )

    await openAttachmentPreview(page, "Page")
    await expect(getAttachmentPreview(page)).toContainText("Cannot load page")
  })

  test("shows a disabled #selection:no_selection option when there is no selection", async ({
    sidepanelPage,
  }) => {
    setupFooterMocks(sidepanelPage)

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("#")

    await expect(
      getEditorAutocompleteOption(page, "selection:no_selection"),
    ).toBeDisabled()
  })

  test("loads #selection attachments and keeps the resolved snapshot", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.selection = {
      id: 7,
      uniqueKey: "selection-1",
      url: "https://example.com/page",
      title: "Example page",
      description: "Selected text",
      content: "Original selection content",
    }

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("Keep #selection:quoted_text")

    await expect(getAttachmentBadge(page, "Example page")).toBeVisible()
    await openAttachmentPreview(page, "Example page")
    await expect(getAttachmentPreview(page)).toContainText(
      "Original selection content",
    )

    state.selection = {
      ...state.selection,
      content: "Updated selection content",
    } as PageContentSelection

    await notifyPageContextUpdated(sidepanelPage)
    await expect(getAttachmentPreview(page)).toContainText(
      "Original selection content",
    )
  })

  test("marks selection attachments as errored and blocks sending", async ({
    sidepanelPage,
  }) => {
    setupFooterMocks(sidepanelPage)
    sidepanelPage.mocks.pageContentSelectionGet = async () => {
      throw new Error("Cannot load selection")
    }

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("Check #selection:important_text")
    await selectModel(page, "gpt-4.1")

    await expect(getAttachmentBadge(page, "Selection")).toHaveAttribute(
      "data-error",
      "true",
    )
    await expect(getSendMessageButton(page)).toBeDisabled()

    await openAttachmentPreview(page, "Selection")
    await expect(getAttachmentPreview(page)).toContainText(
      "Cannot load selection",
    )
  })

  test("inserts pasted files at the cursor position and keeps the cursor after the command", async ({
    sidepanelPage,
  }) => {
    setupFooterMocks(sidepanelPage)

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("HelloWorld")
    await getMessageEditor(page).evaluate((textarea) => {
      const editor = textarea as HTMLTextAreaElement
      editor.setSelectionRange(5, 5)
    })

    await pasteFiles(page, [
      {
        name: "pasted.txt",
        mimeType: "text/plain",
        content: "Paste content",
      },
    ])

    await expect(getMessageEditor(page)).toHaveValue(
      "Hello #file:pasted.txt World",
    )
    await expect(getAttachmentBadge(page, "pasted.txt")).toBeVisible()

    // The caret is restored in requestAnimationFrame, after the value renders.
    await expect
      .poll(() =>
        getMessageEditor(page).evaluate((textarea) => {
          const editor = textarea as HTMLTextAreaElement

          return {
            start: editor.selectionStart,
            end: editor.selectionEnd,
          }
        }),
      )
      .toEqual({ start: 23, end: 23 })
  })

  test("renders image previews for image attachments", async ({
    sidepanelPage,
  }) => {
    setupFooterMocks(sidepanelPage)

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await attachFiles(page, {
      name: "diagram.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sY1koQAAAAASUVORK5CYII=",
        "base64",
      ),
    })

    await openAttachmentPreview(page, "diagram.png")
    await expect(page.getByTestId("attachment-preview-image")).toBeVisible()
  })

  test("sends binary attachments even when they have no preview", async ({
    sidepanelPage,
  }) => {
    const { recorders } = setupFooterMocks(sidepanelPage)

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("Attach a pdf")
    await attachFiles(page, {
      name: "spec.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("fake-pdf"),
    })
    await selectModel(page, "gpt-4.1")
    await getSendMessageButton(page).click()

    await expect.poll(() => recorders.sendCalls.length).toBe(1)
    expect(recorders.sendCalls[0]?.[1].attachments[0]).toMatchObject({
      mediaType: "application/pdf",
      name: "spec.pdf",
      type: "file",
    })
  })

  test("shows a toast when file reading fails", async ({ sidepanelPage }) => {
    await sidepanelPage.page.addInitScript(() => {
      const originalText = File.prototype.text

      File.prototype.text = function () {
        if (this.name === "broken.txt") {
          return Promise.reject(new Error("Cannot read broken.txt"))
        }

        return originalText.call(this)
      }
    })

    setupFooterMocks(sidepanelPage)

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await attachFiles(page, {
      name: "broken.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("broken"),
    })

    await expect(getLatestToast(page)).toHaveText(
      "Error attaching files: Cannot read broken.txt",
    )
  })

  test("removes an attachment and its token with the badge button", async ({
    sidepanelPage,
  }) => {
    setupFooterMocks(sidepanelPage)

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("Read ")
    await attachFiles(page, {
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Notes"),
    })
    await expect(getMessageEditor(page)).toHaveValue("Read #file:notes.txt ")

    await getAttachmentBadge(page, "notes.txt")
      .getByRole("button", { name: "Remove notes.txt" })
      .click()

    await expect(getAttachmentBadges(page)).toHaveCount(0)
    await expect(getMessageEditor(page)).toHaveValue("Read ")
  })

  test("removes an attachment from its preview", async ({ sidepanelPage }) => {
    setupFooterMocks(sidepanelPage)

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await attachFiles(page, {
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Notes"),
    })
    await openAttachmentPreview(page, "notes.txt")
    await getAttachmentPreview(page)
      .getByRole("button", { name: "Remove" })
      .click()

    await expect(getAttachmentPreview(page)).not.toBeVisible()
    await expect(getAttachmentBadges(page)).toHaveCount(0)
    await expect(getMessageEditor(page)).toHaveValue("")
  })

  test("refreshes a page attachment from its preview", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    const snapshot: PageContent = {
      id: 42,
      url: "https://example.com/page",
      title: "Example page",
      content: "Initial page content",
      textContent: "Initial page text",
      excerpt: null,
      byline: null,
      siteName: null,
      lang: null,
      length: 0,
      publishedTime: null,
      dir: null,
    }
    state.pageById[42] = snapshot

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("Check #page:42")
    await openAttachmentPreview(page, "Example page")
    await expect(getAttachmentPreview(page)).toContainText("Initial page text")

    state.pageById[42] = {
      ...snapshot,
      title: "Updated page",
      textContent: "Updated page text",
    }
    await getAttachmentPreview(page)
      .getByRole("button", { name: "Refresh" })
      .click()

    await expect(getAttachmentPreview(page)).toContainText("Updated page text")
    await expect(getAttachmentBadge(page, "Updated page")).toBeVisible()
  })

  for (const [failure, message] of [
    ["is no longer available", "it is no longer available"],
    ["throws", "Tab crashed"],
  ]) {
    test(`shows a toast when refreshing a page that ${failure}`, async ({
      sidepanelPage,
    }) => {
      const { state } = setupFooterMocks(sidepanelPage)
      state.pageById[42] = {
        id: 42,
        url: "https://example.com/page",
        title: "Example page",
        content: "Initial page content",
        textContent: "Initial page text",
        excerpt: null,
        byline: null,
        siteName: null,
        lang: null,
        length: 0,
        publishedTime: null,
        dir: null,
      }

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await getMessageEditor(page).fill("Check #page:42")
      await openAttachmentPreview(page, "Example page")
      await expect(getAttachmentPreview(page)).toContainText(
        "Initial page text",
      )

      sidepanelPage.mocks.pageContentGetById = async () => {
        if (failure === "throws") {
          throw new Error("Tab crashed")
        }

        return null
      }
      await getAttachmentPreview(page)
        .getByRole("button", { name: "Refresh" })
        .click()

      await expect(getLatestToast(page)).toHaveText(
        `Failed to refresh the page: ${message}`,
      )
      // The attached snapshot is kept.
      await expect(getAttachmentPreview(page)).toContainText(
        "Initial page text",
      )
    })
  }

  test("uploads files from the attach menu", async ({ sidepanelPage }) => {
    setupFooterMocks(sidepanelPage)

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await openAttachMenu(page)

    const fileChooserPromise = page.waitForEvent("filechooser")

    await getAttachMenu(page)
      .getByRole("menuitem", { name: /Upload files/ })
      .click()

    const fileChooser = await fileChooserPromise

    await expect(getAttachMenu(page)).not.toBeVisible()
    await fileChooser.setFiles({
      name: "upload.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Uploaded"),
    })

    await expect(getAttachmentBadge(page, "upload.txt")).toBeVisible()
    await expect(getMessageEditor(page)).toHaveValue("#file:upload.txt ")
  })

  test("offers the page selection in the attach menu only when there is one", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await openAttachMenu(page)
    await expect(getAttachMenu(page).getByRole("menuitem")).toHaveText([
      /^Upload files/,
    ])
    await page.keyboard.press("Escape")

    state.selection = {
      id: 7,
      uniqueKey: "selection-1",
      url: "https://example.com/page",
      title: "Example page",
      description: "Selected text",
      content: "Important selected sentence",
    }
    await notifyPageContextUpdated(sidepanelPage)
    await openAttachMenu(page)

    const selectionItem = getAttachMenu(page).getByRole("menuitem", {
      name: /Selected text/,
    })

    await expect(selectionItem).toContainText(
      "“Important selected sentence” on example.com",
    )
    await selectionItem.click()

    await expect(getAttachMenu(page)).not.toBeVisible()
    await expect(getEditorCommandTokens(page)).toHaveCount(1)
    await expect(getEditorCommandTokens(page)).toHaveText(/^#selection:/)
    await expect(getAttachmentBadge(page, "Example page")).toBeVisible()
  })

  test("attaches the open tabs picked in the attach menu", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    const createPage = (id: number, title: string): PageContent => ({
      id,
      url: `https://example.com/${id}`,
      title,
      content: `${title} content`,
      textContent: `${title} text`,
      excerpt: null,
      byline: null,
      siteName: null,
      lang: null,
      length: 0,
      publishedTime: null,
      dir: null,
    })
    state.pages = [
      { id: 1, title: "Docs", url: "https://example.com/1" },
      { id: 2, title: "Blog", url: "https://example.com/2" },
      { id: 3, title: "News", url: "https://example.com/3" },
    ]
    state.pageById = {
      1: createPage(1, "Docs"),
      2: createPage(2, "Blog"),
      3: createPage(3, "News"),
    }

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await openAttachMenu(page)

    const menu = getAttachMenu(page)
    const tabs = menu.getByRole("checkbox")
    const attach = menu.getByTestId("attach-menu-attach-tabs")

    await expect(menu).toContainText("Open tabs")
    await expect(tabs).toHaveCount(3)
    await expect(menu).toContainText("0 tabs selected")
    await expect(attach).toHaveText("Attach tabs")
    await expect(attach).toBeDisabled()

    await tabs.nth(0).check()
    await expect(menu).toContainText("1 tab selected")
    await expect(attach).toHaveText("Attach tab")

    await tabs.nth(2).check()
    await expect(menu).toContainText("2 tabs selected")
    await expect(attach).toHaveText("Attach 2 tabs")

    await attach.click()

    await expect(menu).not.toBeVisible()
    await expect(getEditorCommandTokens(page)).toHaveCount(2)
    await expect(getAttachmentBadge(page, "Docs")).toBeVisible()
    await expect(getAttachmentBadge(page, "News")).toBeVisible()
    await expect(getAttachmentBadge(page, "Blog")).toHaveCount(0)

    // The selection is reset when the menu opens again.
    await openAttachMenu(page)
    await expect(menu).toContainText("0 tabs selected")
  })
})
