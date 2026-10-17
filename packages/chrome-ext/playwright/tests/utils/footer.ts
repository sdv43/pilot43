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
  return p.getByTestId("message-editor")
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

export function getModelMenu(p: Page): Locator {
  return p.getByRole("menu", { name: "Models" })
}

export function getModelSearchInput(p: Page): Locator {
  return p.getByRole("textbox", { name: "Search models" })
}

/** A model of the picker, by its display name. */
export function getModelOption(p: Page, name: string): Locator {
  return getModelMenu(p).getByRole("menuitemradio", {
    name: new RegExp(`^${escapeRegExp(name)}(\\s|$)`),
  })
}

export function getReasoningEffortSelector(p: Page): Locator {
  return getModelMenu(p).getByRole("radiogroup", { name: "Reasoning effort" })
}

export function getThinkingToggle(p: Page): Locator {
  return getModelMenu(p).getByRole("switch", { name: "Thinking" })
}

export async function openModelSelector(p: Page) {
  const selector = getModelSelector(p)

  if ((await selector.getAttribute("aria-expanded")) !== "true") {
    await selector.click()
  }

  await expect(getModelMenu(p)).toBeVisible()
}

export async function closeModelSelector(p: Page) {
  if (await getModelMenu(p).isVisible()) {
    await p.keyboard.press("Escape")
  }

  await expect(getModelSelector(p)).toHaveAttribute("aria-expanded", "false")
}

/** Picks a model; the picker stays open for the reasoning controls. */
export async function selectModel(
  p: Page,
  name: string,
  options?: { keepOpen?: boolean },
) {
  await openModelSelector(p)
  await getModelOption(p, name).click()
  await expect(getModelOption(p, name)).toHaveAttribute("aria-checked", "true")

  if (!options?.keepOpen) {
    await closeModelSelector(p)
  }
}

export async function selectReasoningEffort(p: Page, name: string) {
  await openModelSelector(p)
  await getReasoningEffortSelector(p).getByRole("radio", { name }).click()
  await closeModelSelector(p)
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

export function getToolsPopover(p: Page): Locator {
  return p.getByRole("dialog", { name: "Tools for this chat" })
}

export async function openToolsPopover(p: Page) {
  if (!(await getToolsPopover(p).isVisible())) {
    await getToolsButton(p).click()
  }

  await expect(getToolsPopover(p)).toBeVisible()
}

/** A tool group of the tools popover: "Built-in" or an MCP server. */
export function getToolGroup(p: Page, name: string): Locator {
  return getToolsPopover(p)
    .getByTestId("tool-group")
    .filter({ has: p.getByRole("switch", { name, exact: true }) })
}

/** Expands a tool group so its tools can be toggled one by one. */
export async function expandToolGroup(p: Page, name: string) {
  const expand = getToolGroup(p, name).getByRole("button", {
    name: `Expand ${name} tools`,
  })

  if (await expand.isVisible()) {
    await expand.click()
  }
}

export function getToolCheckbox(p: Page, toolName: string): Locator {
  return getToolsPopover(p).getByRole("checkbox", {
    name: toolName,
    exact: true,
  })
}

export function getToolGroupSwitch(p: Page, name: string): Locator {
  return getToolsPopover(p).getByRole("switch", { name, exact: true })
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
