import type {
  MessageUser,
  ModelProviderModel,
  ModelReasoningCapability,
  ModelRunSettings,
  ReasoningEffort,
} from "@pilot43/protocol"

import { serializeUserMessageContent } from "@pilot43/protocol"

import type { ModelProviderModels } from "../../../../../queries/modelProvider"
import type { useFooterStore } from "../../store"

import { isCommandAttachable } from "../../utils"

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
  if (editorValue.text.trim().length === 0 && attachments.length === 0) {
    return 0
  }

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

export function getModelProviderModel(
  modelProviderGroups: ModelProviderModels[] | undefined,
  selectedModelId: null | string,
):
  | undefined
  | {
      provider: ModelProviderModels["provider"]
      model: ModelProviderModel
    } {
  if (!selectedModelId) {
    return undefined
  }

  for (const group of modelProviderGroups ?? []) {
    const model = group.models.find((item) => item.id === selectedModelId)

    if (model) {
      return {
        provider: group.provider,
        model,
      }
    }
  }

  return undefined
}

export function getSupportedReasoningEfforts(
  reasoning: ModelReasoningCapability,
): ReasoningEffort[] {
  if (
    reasoning.supportedEfforts === null ||
    reasoning.supportedEfforts === undefined
  ) {
    return []
  }

  return reasoning.supportedEfforts
}

export function buildModelRunSettings(
  modelProviderGroups: ModelProviderModels[] | undefined,
  selectedModelId: null | string,
  selectedReasoningEffort: null | ReasoningEffort,
  thinkingEnabled: boolean,
): ModelRunSettings {
  const selectedModel = getModelProviderModel(
    modelProviderGroups,
    selectedModelId,
  )

  if (!selectedModel) {
    return {}
  }

  if (selectedModel.provider.type === "ollama") {
    return { thinking: thinkingEnabled }
  }

  const reasoning = selectedModel.model.reasoning
  const levels = reasoning ? getSupportedReasoningEfforts(reasoning) : []

  if (!reasoning || levels.length === 0) {
    return {}
  }

  // The picker always shows a level, so the effort is sent explicitly.
  if (selectedReasoningEffort && levels.includes(selectedReasoningEffort)) {
    return { reasoningEffort: selectedReasoningEffort }
  }

  return reasoning.defaultEffort
    ? { reasoningEffort: reasoning.defaultEffort }
    : {}
}
