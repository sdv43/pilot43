import { WrenchIcon } from "lucide-react"
import { useEffect, useId, useMemo, useRef } from "react"

import { IconButton, Loader, Popover } from "@/sidepanel/app/components"
import {
  footerActions,
  useFooterStore,
} from "@/sidepanel/app/components/Footer/store"
import {
  useChatGetByWorkspace,
  useChatSettingsUpdate,
} from "@/sidepanel/queries/chat"
import { useMcpServerGet } from "@/sidepanel/queries/mcpServer"
import { useModelToolGet } from "@/sidepanel/queries/model"
import { cn } from "@/sidepanel/shared/cn"
import {
  buildChatSettingsFromToolsState,
  buildChatToolsState,
  buildDefaultToolsState,
  mergeToolsStateWithDefaults,
} from "@/sidepanel/shared/tool-state"
import { useCurrentWorkspace } from "@/sidepanel/shared/useCurrentWorkspace"

import s from "./ChatSettings.module.css"
import { ToolsList } from "./components/ToolsList"
import { type ChatSettingsProps } from "./types"

export function ChatSettings({ className }: ChatSettingsProps) {
  const popoverId = useId()
  const hydratedStateKeyRef = useRef<null | string>(null)
  const currentWorkspace = useCurrentWorkspace()
  const toolsState = useFooterStore((state) => state.toolsState)
  const selectedChatId = currentWorkspace?.lastSelectedChatId
  const { data: chats, isLoading: isChatsLoading } = useChatGetByWorkspace(
    currentWorkspace?.id,
  )
  const chatSettings = chats?.find(
    (chat) => chat.id === selectedChatId,
  )?.settings

  const { data: tools = [], isLoading: isToolsLoading } = useModelToolGet()
  const { data: mcpServers = [], isLoading: isMcpServersLoading } =
    useMcpServerGet()
  const { mutate: updateChatSettings } = useChatSettingsUpdate()
  const currentStateKey = selectedChatId ?? "__new__"

  const currentToolsState = useMemo(() => {
    if (isToolsLoading || (selectedChatId && isChatsLoading)) {
      return null
    }

    if (hydratedStateKeyRef.current !== currentStateKey) {
      if (selectedChatId) {
        return buildChatToolsState(tools, chatSettings)
      }

      return buildDefaultToolsState(tools)
    }

    return mergeToolsStateWithDefaults(tools, toolsState)
  }, [
    chatSettings,
    currentStateKey,
    isChatsLoading,
    isToolsLoading,
    selectedChatId,
    tools,
    toolsState,
  ])

  useEffect(() => {
    if (isToolsLoading || (selectedChatId && isChatsLoading)) {
      return
    }

    const nextStateKey = selectedChatId ?? "__new__"
    if (hydratedStateKeyRef.current === nextStateKey) {
      return
    }

    const nextToolsState = selectedChatId
      ? buildChatToolsState(tools, chatSettings)
      : buildDefaultToolsState(tools)

    hydratedStateKeyRef.current = nextStateKey
    footerActions.setToolsState(nextToolsState)
  }, [chatSettings, isChatsLoading, isToolsLoading, selectedChatId, tools])

  const persistToolsState = (nextToolsState: Record<string, boolean>) => {
    footerActions.setToolsState(nextToolsState)

    if (!selectedChatId) {
      return
    }

    updateChatSettings({
      chatId: selectedChatId,
      settings: buildChatSettingsFromToolsState(nextToolsState),
    })
  }

  return (
    <>
      <IconButton
        aria-label="Tools"
        disabled={isToolsLoading}
        icon={<WrenchIcon size={14} />}
        popoverTarget={popoverId}
        style={{
          anchorName: "--chat-settings-anchor",
        }}
        variant="secondary"
      />

      <Popover
        anchorName="--chat-settings-anchor"
        className={cn(s.popover, className)}
        id={popoverId}
        popover="auto"
      >
        {currentToolsState && !isMcpServersLoading ? (
          <ToolsList
            key={selectedChatId}
            mcpServers={mcpServers}
            tools={tools}
            toolsState={currentToolsState}
            onChange={persistToolsState}
          />
        ) : (
          <div className={s.loaderWrapper}>
            <Loader size={14} />
          </div>
        )}
      </Popover>
    </>
  )
}
