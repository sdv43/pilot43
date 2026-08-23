import type { PageContent, PageContentSelection } from "../../../src/shared/api"
import { expect, test } from "../../fixtures"
import { getLatestToast } from "../utils/toast"
import {
  attachFiles,
  getAttachmentBadge,
  getAttachmentPreview,
  getEditorAutocompleteOption,
  getEditorCommandTokens,
  getMessageEditor,
  getSendMessageButton,
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
      "data-variant",
      "error",
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
      getEditorAutocompleteOption(page, "#selection:no_selection"),
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
      "data-variant",
      "error",
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

    const selectionRange = await getMessageEditor(page).evaluate((textarea) => {
      const editor = textarea as HTMLTextAreaElement

      return {
        start: editor.selectionStart,
        end: editor.selectionEnd,
      }
    })

    expect(selectionRange).toEqual({ start: 23, end: 23 })
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
})
