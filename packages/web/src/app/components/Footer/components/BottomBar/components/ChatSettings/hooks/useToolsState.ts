import type { ModelTool } from "@pilot43/protocol"

import { useEffect, useRef } from "react"

import { useChatGetByWorkspace } from "../../../../../../../../queries/chat"
import {
  buildChatToolsState,
  buildDefaultToolsState,
  mergeToolsStateWithDefaults,
} from "../../../../../../../../shared/tool-state"
import {
  useCurrentChatId,
  useCurrentWorkspace,
} from "../../../../../../../../shared/useCurrentWorkspace"
import { footerActions, useFooterStore } from "../../../../../store"

/**
 * Per-chat tool switches. Loaded from the chat when it opens (defaults for a
 * new chat) and kept in the footer store so a new chat sends them with its
 * first message. `null` while loading.
 */
export function useToolsState(tools: ModelTool[] | undefined) {
  const workspace = useCurrentWorkspace()
  const chatId = useCurrentChatId()
  const { data: chats, isLoading } = useChatGetByWorkspace(workspace?.id)
  const toolsState = useFooterStore((state) => state.toolsState)
  const hydratedKeyRef = useRef<null | string>(null)
  const key = chatId ?? `new:${workspace?.id ?? ""}`
  const chat = chats?.find((item) => item.id === chatId)
  const isReady = !!tools && !(chatId && isLoading)

  useEffect(() => {
    if (!tools || !isReady || hydratedKeyRef.current === key) {
      return
    }

    hydratedKeyRef.current = key
    footerActions.setToolsState(
      chatId
        ? buildChatToolsState(tools, chat?.settings)
        : buildDefaultToolsState(tools),
    )
  }, [chat, chatId, isReady, key, tools])

  return tools && isReady
    ? mergeToolsStateWithDefaults(tools, toolsState)
    : null
}
