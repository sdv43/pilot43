import type { OpenTab, Prompt } from "@pilot43/protocol"

import type { EditorCommandOption } from "./types"

import { isPageCommand, isSelectionCommand } from "../../../../utils"

/**
 * `#` tokens a prompt attaches when it is inserted (`Prompt.attach`): the
 * active tab and/or the page selection, when available. The tokens become
 * attachment chips the user can still remove.
 */
export function getPromptAttachmentTokens(
  prompt: Pick<Prompt, "attach">,
  commands: EditorCommandOption[],
): string[] {
  const tokens: string[] = []

  if (prompt.attach?.currentTab) {
    const tab = commands.find(
      (option) =>
        option.type === "hash" &&
        isPageCommand(option.key) &&
        (option.attachment as OpenTab | undefined)?.active,
    )

    if (tab) tokens.push(`#${tab.command}`)
  }

  if (prompt.attach?.selection) {
    const selection = commands.find(
      (option) =>
        option.type === "hash" &&
        isSelectionCommand(option.key) &&
        !option.disabled &&
        option.attachment,
    )

    if (selection) tokens.push(`#${selection.command}`)
  }

  return tokens
}
