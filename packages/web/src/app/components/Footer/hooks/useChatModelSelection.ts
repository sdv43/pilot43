import { getModelProviderModelId } from "@pilot43/protocol"
import { useEffect, useRef } from "react"

import {
  useChatGetByWorkspace,
  useChatMessageRunGet,
  useChatSettingsUpdate,
} from "../../../../queries/chat"
import { useModelProviderModelsGet } from "../../../../queries/modelProvider"
import {
  useCurrentChatId,
  useCurrentWorkspace,
} from "../../../../shared/useCurrentWorkspace"
import { buildModelRunSettings } from "../components/BottomBar/utils"
import {
  getChatModelSelection,
  getNewChatModelSelection,
  isSameModelSelection,
  resolveAvailableModel,
  toChatModelSelection,
} from "../model-selection"
import { footerActions, useFooterStore } from "../store"

/**
 * Keeps the composer's model in step with the chat: an open chat uses the
 * model last picked in it, a new chat the model of the workspace's most
 * recently active chat (or the first model). Picking a model in an existing
 * chat saves it on the chat.
 */
export function useChatModelSelection() {
  const chatId = useCurrentChatId()
  const workspace = useCurrentWorkspace()
  const { data: chats } = useChatGetByWorkspace(workspace?.id)
  const { data: runs } = useChatMessageRunGet(chatId)
  const { data: groups } = useModelProviderModelsGet()
  const { mutate: updateChatSettings } = useChatSettingsUpdate()
  const { selectedModelId, selectedReasoningEffort, thinkingEnabled } =
    useFooterStore()
  const hydratedKeyRef = useRef<null | string>(null)
  const key = chatId ?? `new:${workspace?.id ?? ""}`
  const chat = chats?.find((item) => item.id === chatId)

  useEffect(() => {
    if (hydratedKeyRef.current === key || !groups || !chats) {
      return
    }

    if (chatId && (!chat || !runs)) {
      return
    }

    const selection = resolveAvailableModel(
      groups,
      chatId
        ? getChatModelSelection(chat, runs)
        : getNewChatModelSelection(chats),
    )

    hydratedKeyRef.current = key
    footerActions.setSelectedModel(
      selection
        ? getModelProviderModelId(selection.providerId, selection.name)
        : null,
      selection?.settings?.reasoningEffort ?? null,
      selection?.settings?.thinking ?? true,
    )
  }, [chat, chatId, chats, groups, key, runs])

  useEffect(() => {
    if (!chatId || !chat || hydratedKeyRef.current !== key) {
      return
    }

    const next = toChatModelSelection(
      selectedModelId,
      buildModelRunSettings(
        groups,
        selectedModelId,
        selectedReasoningEffort,
        thinkingEnabled,
      ),
    )

    if (next && !isSameModelSelection(next, chat.settings.model)) {
      updateChatSettings({
        chatId,
        settings: { ...chat.settings, model: next },
      })
    }
  }, [
    chat,
    chatId,
    groups,
    key,
    selectedModelId,
    selectedReasoningEffort,
    thinkingEnabled,
    updateChatSettings,
  ])
}
