import { useId, useRef } from "react"

import {
  useChatDelete,
  useChatGetByWorkspace,
  useChatSettingsUpdate,
} from "@/sidepanel/queries/chat"
import { useWorkspaceUpdate } from "@/sidepanel/queries/workspace"
import { cn } from "@/sidepanel/shared/cn"
import { useCurrentWorkspace } from "@/sidepanel/shared/useCurrentWorkspace"

import { Button } from "../../../Button"
import { Menu } from "../../../Menu"
import { toast } from "../../../ToastProvider"
import { sortChats, twoLetters } from "../../utils"
import s from "./ChatListItem.module.css"
import { type ChatListItemProps } from "./types"

export function ChatListItem({ chat, className, expanded }: ChatListItemProps) {
  const popoverId = useId()
  const anchorName = `--chat-list-item-anchor-${popoverId.replace(/:/g, "")}`
  const popoverRef = useRef<HTMLDivElement | null>(null)

  const currentWorkspace = useCurrentWorkspace()
  const { data: chats = [] } = useChatGetByWorkspace(currentWorkspace?.id)
  const workspaceUpdate = useWorkspaceUpdate()
  const chatSettingsUpdate = useChatSettingsUpdate()
  const chatDelete = useChatDelete()

  const isActive = chat.id === currentWorkspace?.lastSelectedChatId
  const isPinned = !!chat.settings.pinned
  const sortedChats = sortChats(chats)

  function getNextChatIdAfterDelete() {
    const currentIndex = sortedChats.findIndex((item) => item.id === chat.id)
    const remainingChats = sortedChats.filter((item) => item.id !== chat.id)

    if (remainingChats.length === 0) {
      return null
    }

    return (
      remainingChats[currentIndex]?.id ??
      remainingChats[currentIndex - 1]?.id ??
      remainingChats[0]?.id ??
      null
    )
  }

  function handleSelect() {
    if (!currentWorkspace) return

    workspaceUpdate.mutate(
      {
        ...currentWorkspace,
        lastSelectedChatId: chat.id,
      },
      {
        onError: (error) => {
          toast(`Failed to update workspace: ${error.message}`, "error")
        },
      },
    )
  }

  function handleContextMenu(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    popoverRef.current?.showPopover()
  }

  function handleMenuItemClick(itemId: string) {
    if (itemId === "pin") {
      chatSettingsUpdate.mutate(
        {
          chatId: chat.id,
          settings: { ...chat.settings, pinned: !isPinned },
        },
        {
          onError: (error) => {
            toast(`Failed to pin chat: ${error.message}`, "error")
          },
        },
      )
    } else if (itemId === "delete") {
      if (!window.confirm(`Are you sure you want to delete "${chat.title}"?`)) {
        return
      }

      const nextChatId = getNextChatIdAfterDelete()

      chatDelete.mutate(chat.id, {
        onSuccess: () => {
          if (isActive && currentWorkspace) {
            workspaceUpdate.mutate(
              {
                ...currentWorkspace,
                lastSelectedChatId: nextChatId,
              },
              {
                onError: (error) => {
                  toast(`Failed to update workspace: ${error.message}`, "error")
                },
              },
            )
          }
        },
        onError: (error) => {
          toast(`Failed to delete chat: ${error.message}`, "error")
        },
      })
    }
  }

  return (
    <>
      <Button
        className={className}
        data-active={isActive}
        data-pinned={isPinned}
        style={{ anchorName: anchorName }}
        type="button"
        variant="secondary"
        onClick={handleSelect}
        onContextMenu={handleContextMenu}
      >
        {expanded ? chat.title : twoLetters(chat.title)}
      </Button>

      <Menu
        ref={popoverRef}
        anchorName={anchorName}
        className={cn(s.menu, expanded && s.menuExpanded)}
        id={popoverId}
        items={[
          { id: "pin", label: isPinned ? "Unpin chat" : "Pin chat" },
          { id: "delete", label: "Delete chat" },
        ]}
        onItemClick={handleMenuItemClick}
      />
    </>
  )
}
