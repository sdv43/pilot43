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
  /**
   * Undo history. Each entry records an editor value plus the kind of edit it
   * represents. Consecutive single-character edits (insert or delete) are
   * coalesced into undo batches of at most `typingBatchSize` characters each,
   * while atomic multi-character edits (autocomplete insert, paste, file
   * attach) always create their own step.
   */
  historyPast: HistoryEntry[]
  historyFuture: HistoryEntry[]
  selectedModelId: null | string
  /**
   * Per-tool enabled state (`toolName -> enabled`) used before a chat exists.
   * When the user sends the first message this state is persisted as the new
   * chat's initial tool settings. Once a chat exists, the state is kept in sync
   * with the chat's persisted settings and toggles write through to the chat.
   */
  toolsState: Record<string, boolean>
}

type HistoryEntryKind = "atomic" | "delete" | "insert"

interface HistoryEntry {
  /**
   * How many single-character edits have been coalesced into this entry.
   * Meaningless for `atomic` entries (always 0).
   */
  count: number
  /**
   * Caret position to restore when this entry's value becomes active (the
   * value stored on `HistoryEntry.value`), so undo/redo land the caret at the
   * edit site like a native editor.
   */
  cursor: number
  kind: HistoryEntryKind
  value: EditorValue
}

/** Max characters grouped into a single undo step for consecutive typing. */
const typingBatchSize = 5

interface ChangeAnchor {
  /** Shared prefix length — start of the edited region in both texts. */
  start: number
  /** End of the edited region in the *next* (after) text. */
  nextEnd: number
}

function computeChangeAnchor(
  previousText: string,
  nextText: string,
): ChangeAnchor {
  const maxPrefix = Math.min(previousText.length, nextText.length)
  let start = 0

  while (start < maxPrefix && previousText[start] === nextText[start]) {
    start += 1
  }

  let suffix = 0
  while (
    suffix < previousText.length - start &&
    suffix < nextText.length - start &&
    previousText[previousText.length - 1 - suffix] ===
      nextText[nextText.length - 1 - suffix]
  ) {
    suffix += 1
  }

  // The edited range in the "after" text spans [start, nextText.length - suffix].
  return {
    nextEnd: nextText.length - suffix,
    start,
  }
}

const defaultEditorValue: EditorValue = {
  commands: [],
  text: "",
}

export const useFooterStore = create<FooterStore>(() => ({
  editorValue: defaultEditorValue,
  attachments: [],
  historyFuture: [],
  historyPast: [],
  selectedModelId: null,
  toolsState: {},
}))

function getEditKind(previousText: string, nextText: string): HistoryEntryKind {
  const delta = nextText.length - previousText.length

  if (delta === 1) {
    return "insert"
  }

  if (delta === -1) {
    return "delete"
  }

  return "atomic"
}

export const footerActions = {
  setEditorValue: (editorValue: EditorValue) => {
    useFooterStore.setState((state) => {
      const committed = utils.commitEditorValue(editorValue, state.attachments)

      if (editorValue.text === state.editorValue.text) {
        // Text did not change (only parsed commands refreshed), so this is not
        // an undoable edit.
        return committed
      }

      const kind = getEditKind(state.editorValue.text, editorValue.text)
      const lastEntry = state.historyPast.at(-1)
      // The new history entry stores the *pre-edit* value, so its caret is the
      // start of the edited range (where the change started).
      const anchor = computeChangeAnchor(
        state.editorValue.text,
        editorValue.text,
      )

      // Coalesce consecutive same-direction single-character edits (typing or
      // deleting a run of characters) into undo batches capped at
      // `typingBatchSize` each, so a long paste-free burst is undone in chunks.
      // Let the *current* entry absorb a subsequent edit: when the top entry
      // already holds the max batch size, start a new batch instead.
      if (
        lastEntry?.kind === kind &&
        (kind === "insert" || kind === "delete")
      ) {
        if (lastEntry.count >= typingBatchSize) {
          return {
            ...committed,
            historyFuture: [],
            historyPast: [
              ...state.historyPast,
              {
                count: 1,
                cursor: anchor.start,
                kind,
                value: state.editorValue,
              },
            ],
          }
        }

        // Grow the running batch (the batch's base is already recorded in the
        // top entry; the current value stays reachable as the next undo target).
        return {
          ...committed,
          historyFuture: [],
          historyPast: [
            ...state.historyPast.slice(0, -1),
            { ...lastEntry, count: lastEntry.count + 1 },
          ],
        }
      }

      return {
        ...committed,
        historyFuture: [],
        historyPast: [
          ...state.historyPast,
          {
            count: 1,
            cursor: anchor.start,
            kind,
            value: state.editorValue,
          },
        ],
      }
    })
  },
  undo: () => {
    const state = useFooterStore.getState()
    const previous = state.historyPast.at(-1)

    if (!previous) {
      return null
    }

    // The pushed future entry's value is the *post-edit* text
    // (state.editorValue), so its caret is the end of the edited range.
    const redoAnchor = computeChangeAnchor(
      previous.value.text,
      state.editorValue.text,
    )

    useFooterStore.setState({
      ...utils.commitEditorValue(previous.value, state.attachments),
      historyFuture: [
        {
          count: previous.count,
          cursor: redoAnchor.nextEnd,
          kind: previous.kind,
          value: state.editorValue,
        },
        ...state.historyFuture,
      ],
      historyPast: state.historyPast.slice(0, -1),
    })

    return previous.cursor
  },
  redo: () => {
    const state = useFooterStore.getState()
    const [next, ...historyFuture] = state.historyFuture

    if (!next) {
      return null
    }

    // The pushed past entry's value is the *pre-edit* text
    // (state.editorValue), so its caret is the start of the edited range.
    const undoAnchor = computeChangeAnchor(
      state.editorValue.text,
      next.value.text,
    )

    useFooterStore.setState({
      ...utils.commitEditorValue(next.value, state.attachments),
      historyFuture,
      // The pushed entry must carry the state *before* the redo so that a
      // subsequent undo restores exactly that state. `next.value` is the
      // post-edit target and would break undo-after-redo.
      historyPast: [
        ...state.historyPast,
        {
          count: next.count,
          cursor: undoAnchor.start,
          kind: next.kind,
          value: state.editorValue,
        },
      ],
    })

    return next.cursor
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
      attachments: [],
      editorValue: defaultEditorValue,
      historyFuture: [],
      historyPast: [],
    })
  },
}

const utils = {
  commitEditorValue(editorValue: EditorValue, attachments: EditorAttachment[]) {
    const attachableCommands = editorValue.commands.filter((command) =>
      isCommandAttachable(command.command),
    )
    const nextAttachments = utils.resolveAttachments(
      attachableCommands,
      attachments,
    )

    return {
      attachments: nextAttachments,
      editorValue: utils.syncEditorValueWithAttachments(
        editorValue,
        nextAttachments,
      ),
    }
  },
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
