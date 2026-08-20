import { create } from "zustand"

import type {
  FileAttachment,
  MessageUser,
  PageContent,
  PageContentSelection,
} from "@/shared/api"

import type { EditorCommandAttachmentOption } from "./components/MessageEditor/components/Editor/types"

import { type EditorValue } from "./components/MessageEditor/components/Editor/types"
import { isCommandAttachable, isSelectionCommand } from "./utils"

export type EditorAttachment = {
  key: string
  label?: string
  isLoading?: boolean
  isError?: boolean
  errorMessage?: string
  command?: EditorValue["commands"][number]
  attachment: Partial<MessageUser["attachments"][number]>
}

function isPageContentSnapshot(
  attachment: EditorCommandAttachmentOption | undefined,
): attachment is PageContent {
  return (
    !!attachment &&
    "id" in attachment &&
    "url" in attachment &&
    ("content" in attachment || "textContent" in attachment)
  )
}

function isFileSnapshot(
  attachment: EditorCommandAttachmentOption | undefined,
): attachment is FileAttachment {
  return !!attachment && "type" in attachment && attachment.type === "file"
}

function isPageContentSelectionSnapshot(
  attachment: EditorCommandAttachmentOption | undefined,
): attachment is PageContentSelection {
  return (
    !!attachment &&
    "uniqueKey" in attachment &&
    "content" in attachment &&
    "description" in attachment
  )
}

export interface FooterStore {
  editorValue: EditorValue
  attachments: EditorAttachment[]
  selectedModelId: null | string
  /**
   * Per-tool enabled state (`toolName -> enabled`) used before a chat exists.
   * When the user sends the first message this state is persisted as the new
   * chat's initial tool settings. Once a chat exists, the state is kept in sync
   * with the chat's persisted settings and toggles write through to the chat.
   */
  toolsState: Record<string, boolean>
}

const defaultEditorValue: EditorValue = {
  commands: [],
  text: "",
}

export const useFooterStore = create<FooterStore>(() => ({
  editorValue: defaultEditorValue,
  attachments: [],
  selectedModelId: null,
  toolsState: {},
}))

export const footerActions = {
  setEditorValue: (editorValue: EditorValue) => {
    useFooterStore.setState((state) => {
      const attachableCommands = editorValue.commands.filter((command) =>
        isCommandAttachable(command.command),
      )
      const attachments = utils.resolveAttachments(
        attachableCommands,
        state.attachments,
      )

      return {
        attachments,
        editorValue: utils.syncEditorValueWithAttachments(
          editorValue,
          attachments,
        ),
      }
    })
  },
  updateAttachment: (
    key: string,
    updater: (attachment: EditorAttachment) => Partial<EditorAttachment>,
  ) => {
    useFooterStore.setState((state) => {
      const attachments = state.attachments.map((attachment) =>
        attachment.key === key
          ? { ...attachment, ...updater(attachment) }
          : attachment,
      )

      return {
        attachments,
        editorValue: utils.syncEditorValueWithAttachments(
          state.editorValue,
          attachments,
        ),
      }
    })
  },
  setSelectedModelId: (selectedModelId: null | string) => {
    useFooterStore.setState({ selectedModelId })
  },
  setToolsState: (toolsState: Record<string, boolean>) => {
    useFooterStore.setState({ toolsState })
  },
  reset: () => {
    useFooterStore.setState({
      editorValue: defaultEditorValue,
      attachments: [],
    })
  },
}

const utils = {
  canCreateAttachmentFromCommand(
    command: FooterStore["editorValue"]["commands"][number],
  ) {
    if (!isCommandAttachable(command.command)) {
      return false
    }

    if (command.option) {
      return true
    }

    if (command.key.startsWith("page:")) {
      const pageId = command.key.slice("page:".length).split(":")[0]
      return pageId !== undefined && /^\d+$/.test(pageId)
    }

    if (command.key.startsWith("selection:")) {
      return command.key.slice("selection:".length).trim().length > 0
    }

    return false
  },
  createAttachmentFromCommand(
    command: FooterStore["editorValue"]["commands"][number],
  ): EditorAttachment {
    const optionAttachment = command.option?.attachment

    if (isFileSnapshot(optionAttachment)) {
      return {
        key: command.key,
        command,
        isLoading: false,
        attachment: optionAttachment,
        label: optionAttachment.name,
      }
    }

    if (isPageContentSelectionSnapshot(optionAttachment)) {
      return {
        key: command.key,
        command,
        isLoading: false,
        attachment: {
          ...optionAttachment,
          type: "page-content-selection",
        },
        label: optionAttachment.title,
      }
    }

    if (isPageContentSnapshot(optionAttachment)) {
      return {
        key: command.key,
        command,
        isLoading: false,
        attachment: {
          ...optionAttachment,
          type: "page-content",
        },
        label: optionAttachment.title ?? undefined,
      }
    }

    return {
      key: command.key,
      command,
      isLoading: true,
      attachment: {
        type: isSelectionCommand(command.command)
          ? "page-content-selection"
          : "page-content",
      },
    }
  },
  syncEditorValueWithAttachments(
    editorValue: EditorValue,
    attachments: EditorAttachment[],
  ): EditorValue {
    const attachmentsByKey = new Map(
      attachments.map((attachment) => [attachment.key, attachment]),
    )
    let hasChanged = false

    const commands = editorValue.commands.map((command) => {
      const nextIsError =
        isCommandAttachable(command.command) &&
        attachmentsByKey.get(command.key)?.isError
          ? true
          : undefined

      if (command.isError === nextIsError) {
        return command
      }

      hasChanged = true

      return {
        ...command,
        isError: nextIsError,
      }
    })

    return hasChanged ? { ...editorValue, commands } : editorValue
  },
  resolveAttachments(
    commands: FooterStore["editorValue"]["commands"],
    currentAttachments: EditorAttachment[],
  ) {
    const attachmentsByKey = new Map(
      currentAttachments.map((attachment) => [attachment.key, attachment]),
    )
    const resolvedAttachmentKeys = new Set(attachmentsByKey.keys())

    const newAttachments: EditorAttachment[] = []

    commands.forEach((command) => {
      if (resolvedAttachmentKeys.has(command.key)) {
        return
      }

      if (utils.canCreateAttachmentFromCommand(command)) {
        newAttachments.push(utils.createAttachmentFromCommand(command))
        resolvedAttachmentKeys.add(command.key)
      }
    })

    const attachmentsToRemove = currentAttachments.filter(
      (attachment) =>
        !commands.some((command) => command.key === attachment.key),
    )

    if (attachmentsToRemove.length === 0 && newAttachments.length === 0) {
      return currentAttachments
    }

    return [
      ...currentAttachments.filter(
        (attachment) =>
          !attachmentsToRemove.some(
            (attachmentToRemove) => attachmentToRemove.key === attachment.key,
          ),
      ),
      ...newAttachments,
    ]
  },
}
