import type { MessageUser } from "@/shared/api"
import type { ModelProviderModels } from "@/sidepanel/queries/modelProvider"

import { serializeUserMessageContent } from "@/shared/message-content"
import { parseModelProviderModelId } from "@/shared/model-provider-utils"

import type {
  SelectorEntry,
  SelectorOptionGroup,
} from "../../../Selector/types"
import type { useFooterStore } from "../../store"

import { isCommandAttachable } from "../../utils"

export function getSelectorOptions(
  modelProviderGroups: ModelProviderModels[] | undefined,
  selectedModelId: null | string,
): SelectorEntry[] {
  const options: SelectorEntry[] = (modelProviderGroups ?? [])
    .filter((group) => group.models.length > 0)
    .map((group) => ({
      id: group.provider.id,
      label: group.provider.name,
      options: group.models.map((model: { id: string; name: string }) => ({
        label: model.name,
        value: model.id,
      })),
    }))

  if (
    selectedModelId &&
    !options.some((group) => {
      if ("options" in group) {
        return group.options.some((option) => option.value === selectedModelId)
      }
      return false
    })
  ) {
    const { providerId, modelName } = parseModelProviderModelId(selectedModelId)

    if (providerId && modelName) {
      const group = options?.find(
        (group) => "id" in group && group.id === providerId,
      ) as SelectorOptionGroup | undefined

      if (group) {
        group.options.unshift({
          label: modelName,
          value: selectedModelId,
          disabled: true,
        })
      } else {
        options.unshift({
          label: modelName,
          value: selectedModelId,
          disabled: true,
        })
      }
    }
  }

  return options
}

export function buildMessagePayload(
  editorValue: ReturnType<typeof useFooterStore.getState>["editorValue"],
  attachments: ReturnType<typeof useFooterStore.getState>["attachments"],
): Pick<
  MessageUser,
  "attachmentReferences" | "attachments" | "commandReference" | "content"
> {
  const { attachmentReferences, resolvedAttachments } =
    getResolvedMessageAttachments(editorValue, attachments)

  const commandReference = editorValue.commands.find(
    (command) => command.type === "slash" && command.start === 0,
  )

  return {
    content: editorValue.text,
    attachments: resolvedAttachments,
    ...(attachmentReferences.length > 0 ? { attachmentReferences } : {}),
    ...(commandReference
      ? {
          commandReference: {
            command: commandReference.command,
            end: commandReference.end,
            id: commandReference.key,
            start: commandReference.start,
          },
        }
      : {}),
  }
}

export function estimateDraftMessageTokenCount(
  editorValue: ReturnType<typeof useFooterStore.getState>["editorValue"],
  attachments: ReturnType<typeof useFooterStore.getState>["attachments"],
): number {
  const serializedContent = serializeUserMessageContent(
    buildMessagePayload(editorValue, attachments),
  )

  return serializedContent.length > 0
    ? Math.ceil(serializedContent.length / 4)
    : 0
}

function getResolvedMessageAttachments(
  editorValue: ReturnType<typeof useFooterStore.getState>["editorValue"],
  attachments: ReturnType<typeof useFooterStore.getState>["attachments"],
): {
  attachmentReferences: NonNullable<MessageUser["attachmentReferences"]>
  resolvedAttachments: MessageUser["attachments"]
} {
  const attachmentsByKey = new Map(
    attachments.map((attachment) => [attachment.key, attachment]),
  )
  const resolvedAttachments: MessageUser["attachments"] = []
  const attachmentIndexByKey = new Map<string, number>()

  const attachmentReferences = editorValue.commands.flatMap((command) => {
    const attachment = attachmentsByKey.get(command.key)

    if (
      !isCommandAttachable(command.key) ||
      !attachment ||
      attachment.isError ||
      attachment.isLoading ||
      !attachment.attachment.type
    ) {
      return []
    }

    let attachmentIndex = attachmentIndexByKey.get(command.key)

    if (attachmentIndex === undefined) {
      attachmentIndex = resolvedAttachments.length
      attachmentIndexByKey.set(command.key, attachmentIndex)
      resolvedAttachments.push(
        attachment.attachment as MessageUser["attachments"][number],
      )
    }

    return [
      {
        attachmentIndex,
        end: command.end,
        id: command.key,
        start: command.start,
      },
    ]
  })

  return {
    attachmentReferences,
    resolvedAttachments,
  }
}
