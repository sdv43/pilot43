import type {
  Chat,
  ChatModelSelection,
  MessageRun,
  ModelRunSettings,
} from "@pilot43/protocol"

import {
  getModelProviderModelId,
  parseModelProviderModelId,
} from "@pilot43/protocol"

import type { ModelProviderModels } from "../../../queries/modelProvider"

import { getLastMessageRun } from "./utils"

/** Model of an existing chat: its saved choice, else its last run's model. */
export function getChatModelSelection(
  chat: Chat | undefined,
  runs: MessageRun[] | undefined,
): ChatModelSelection | undefined {
  if (chat?.settings.model) {
    return chat.settings.model
  }

  const run = getLastMessageRun(runs)

  return run
    ? {
        name: run.modelMeta.name,
        providerId: run.modelMeta.provider,
        settings: run.modelMeta.settings,
      }
    : undefined
}

/** Model for a new chat: that of the workspace's most recently active chat. */
export function getNewChatModelSelection(chats: Chat[] | undefined) {
  return (chats ?? [])
    .filter((chat) => chat.settings.model)
    .toSorted((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0]?.settings
    .model
}

/** The selection if its model is still available, else the first model. */
export function resolveAvailableModel(
  groups: ModelProviderModels[],
  selection: ChatModelSelection | undefined,
): ChatModelSelection | undefined {
  if (selection) {
    const id = getModelProviderModelId(selection.providerId, selection.name)

    if (groups.some((group) => group.models.some((model) => model.id === id))) {
      return selection
    }
  }

  const first = groups.find((group) => group.models.length > 0)?.models[0]

  return first ? { name: first.name, providerId: first.providerId } : undefined
}

/** The composer's current choice as a chat model selection. */
export function toChatModelSelection(
  selectedModelId: null | string,
  settings: ModelRunSettings,
): ChatModelSelection | undefined {
  const { modelName, providerId } = parseModelProviderModelId(
    selectedModelId ?? "",
  )

  return modelName && providerId
    ? { name: modelName, providerId, settings }
    : undefined
}

export function isSameModelSelection(
  a: ChatModelSelection | undefined,
  b: ChatModelSelection | undefined,
) {
  return (
    a?.name === b?.name &&
    a?.providerId === b?.providerId &&
    (a?.settings?.reasoningEffort ?? null) ===
      (b?.settings?.reasoningEffort ?? null) &&
    (a?.settings?.thinking ?? true) === (b?.settings?.thinking ?? true)
  )
}
