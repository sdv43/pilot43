import { type Locator, type Page } from "@playwright/test"
import { expect } from "../../fixtures"

type AttachFilesInput = Parameters<Locator["setInputFiles"]>[0]
type PastedFile = {
  content: string
  mimeType: string
  name: string
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function getMessageEditor(p: Page): Locator {
  return p.getByPlaceholder("Type a message...")
}

export function getEditorCommandTokens(p: Page): Locator {
  return p.getByTestId("editor-command-token")
}

export function getEditorAutocomplete(p: Page): Locator {
  return p.getByRole("listbox").last()
}

export function getEditorAutocompleteOption(p: Page, name: string): Locator {
  return getEditorAutocomplete(p).getByRole("option", { name })
}

export function getModelSelector(p: Page): Locator {
  return p.getByRole("button", { name: "Select model" })
}

export function getModelSearchInput(p: Page): Locator {
  return p.getByRole("textbox", { name: "Search models" })
}

export async function openModelSelector(p: Page) {
  const selector = getModelSelector(p)

  if ((await selector.getAttribute("aria-expanded")) !== "true") {
    await selector.click()
  }

  await expect(selector).toHaveAttribute("aria-expanded", "true")
}

export async function selectModel(p: Page, name: string) {
  await openModelSelector(p)
  await p.getByRole("option", { name }).click()
  // Selecting an option closes the popover itself. Wait for it to fully close
  // so the next interaction isn't intercepted by the closing popover.
  await expect(getModelSelector(p)).toHaveAttribute("aria-expanded", "false")
}

export function getSendMessageButton(p: Page): Locator {
  return p.getByRole("button", { name: "Send message" })
}

export function getStopGeneratingButton(p: Page): Locator {
  return p.getByRole("button", { name: "Stop generating" })
}

export function getAttachFilesButton(p: Page): Locator {
  return p.getByRole("button", { name: "Attach files" })
}

export function getAttachFilesInput(p: Page): Locator {
  return p.getByTestId("message-editor-file-input")
}

export async function attachFiles(p: Page, files: AttachFilesInput) {
  await getAttachFilesInput(p).setInputFiles(files)
}

export async function pasteFiles(p: Page, files: PastedFile[]) {
  await getMessageEditor(p).evaluate((textarea, payloads) => {
    const dataTransfer = new DataTransfer()

    for (const payload of payloads) {
      dataTransfer.items.add(
        new File([payload.content], payload.name, { type: payload.mimeType }),
      )
    }

    const event = new Event("paste", { bubbles: true, cancelable: true })

    Object.defineProperty(event, "clipboardData", {
      value: dataTransfer,
    })

    textarea.dispatchEvent(event)
  }, files)
}

export function getAttachmentBadges(p: Page): Locator {
  return p.getByTestId("attachment-badge")
}

export function getAttachmentBadge(p: Page, label: string): Locator {
  return p.getByTestId("attachment-badge").filter({ hasText: label })
}

export function getAttachmentPreview(p: Page): Locator {
  return p.getByTestId("attachment-preview")
}

export async function openAttachmentPreview(p: Page, label: string) {
  await getAttachmentBadge(p, label).click()
}

export function getTokenEstimation(p: Page): Locator {
  return p.getByTestId("token-estimation")
}

export function getToolsButton(p: Page): Locator {
  return p.getByRole("button", { name: "Tools" })
}

export async function openToolsPopover(p: Page) {
  const title = p.getByRole("heading", { name: "Tools" })

  if (!(await title.isVisible())) {
    await getToolsButton(p).click()
  }
}

export function getToolCheckbox(p: Page, toolName: string): Locator {
  return p.getByRole("checkbox", {
    name: new RegExp(escapeRegExp(toolName), "i"),
  })
}

export function getMcpServerCheckbox(p: Page, serverName: string): Locator {
  return p.getByRole("checkbox", {
    name: new RegExp(`^${escapeRegExp(serverName)}\\s+mcp$`, "i"),
  })
}

export function getTodoList(p: Page): Locator {
  return p.getByTestId("todo-list")
}

export function getTodoListTrigger(p: Page): Locator {
  return p.getByTestId("todo-list-trigger")
}

export function getTodoListItems(p: Page): Locator {
  return p.getByTestId("todo-list-item")
}

export function getTodoListClearButton(p: Page): Locator {
  return p.getByTestId("todo-list-clear")
}

export async function openTodoList(p: Page) {
  if (!(await p.getByTestId("todo-list-item").first().isVisible())) {
    await getTodoListTrigger(p).click()
  }
}
