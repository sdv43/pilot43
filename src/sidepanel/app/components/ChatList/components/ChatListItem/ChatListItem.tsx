import { useQueryClient } from "@tanstack/react-query"
import { EllipsisVerticalIcon } from "lucide-react"
import { type FormEvent, type MouseEvent, useId, useRef, useState } from "react"

import { useApiClient } from "@/sidepanel/app/components/ApiClientProvider/context"
import {
  useChatDelete,
  useChatGetByWorkspace,
  useChatSettingsUpdate,
} from "@/sidepanel/queries/chat"
import { useWorkspaceUpdate } from "@/sidepanel/queries/workspace"
import { cn } from "@/sidepanel/shared/cn"
import { useCurrentWorkspace } from "@/sidepanel/shared/useCurrentWorkspace"

import { Button } from "../../../Button"
import { Dialog } from "../../../Dialog"
import { IconButton } from "../../../IconButton"
import { Input } from "../../../Input"
import { Menu } from "../../../Menu"
import { toast } from "../../../ToastProvider"
import { sortChats, twoLetters } from "../../utils"
import s from "./ChatListItem.module.css"
import { type ChatListItemProps } from "./types"

export function ChatListItem({ chat, className, expanded }: ChatListItemProps) {
  const popoverId = useId()
  const anchorId = popoverId.replace(/:/g, "")
  const chatAnchorName = `--chat-list-item-anchor-${anchorId}`
  const menuButtonAnchorName = `--chat-list-item-menu-anchor-${anchorId}`
  const menuAnchorName = expanded ? menuButtonAnchorName : chatAnchorName
  const renameInputId = `${anchorId}-rename-title`
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const [renameError, setRenameError] = useState<null | string>(null)
  const [renamePending, setRenamePending] = useState(false)
  const [renameTitle, setRenameTitle] = useState(chat.title)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)

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

  function handleContextMenu(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    popoverRef.current?.showPopover()
  }

  function handleMenuButtonClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    popoverRef.current?.showPopover()
  }

  function handleRenameDialogOpenChange(open: boolean) {
    setRenameDialogOpen(open)

    if (!open) {
      setRenameError(null)
    }
  }

  async function handleRenameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedTitle = renameTitle.trim()

    if (!trimmedTitle) {
      setRenameError("Chat title is required")
      return
    }

    setRenameError(null)
    setRenamePending(true)

    try {
      await apiClient.chatTitleUpdate(chat.id, trimmedTitle)
      void queryClient.invalidateQueries({
        queryKey: ["chatGetByWorkspace"],
      })
      toast("Chat title updated", "success")
      setRenameDialogOpen(false)
    } catch (error) {
      setRenameError(
        error instanceof Error ? error.message : "Failed to rename chat",
      )
    } finally {
      setRenamePending(false)
    }
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
    } else if (itemId === "edit-title") {
      setRenameTitle(chat.title)
      setRenameError(null)
      setRenameDialogOpen(true)
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
      {expanded ? (
        <div className={s.itemExpandedRow}>
          <Button
            className={cn(className, s.chatButtonExpanded)}
            data-active={isActive}
            data-pinned={isPinned}
            style={{ anchorName: chatAnchorName }}
            type="button"
            variant="secondary"
            onClick={handleSelect}
          >
            {chat.title}
          </Button>

          <IconButton
            aria-label={`Chat actions for ${chat.title}`}
            className={s.menuToggle}
            icon={<EllipsisVerticalIcon size={14} />}
            style={{ anchorName: menuButtonAnchorName }}
            variant="secondary"
            onClick={handleMenuButtonClick}
          />
        </div>
      ) : (
        <Button
          className={className}
          data-active={isActive}
          data-pinned={isPinned}
          style={{ anchorName: chatAnchorName }}
          type="button"
          variant="secondary"
          onClick={handleSelect}
          onContextMenu={handleContextMenu}
        >
          {twoLetters(chat.title)}
        </Button>
      )}

      <Menu
        ref={popoverRef}
        anchorName={menuAnchorName}
        className={cn(s.menu, expanded && s.menuExpanded)}
        id={popoverId}
        items={[
          { id: "pin", label: isPinned ? "Unpin chat" : "Pin chat" },
          { id: "edit-title", label: "Edit title" },
          { id: "delete", label: "Delete chat" },
        ]}
        onItemClick={handleMenuItemClick}
      />

      <Dialog
        aria-label="Edit chat title"
        open={renameDialogOpen}
        title="Edit chat title"
        onOpenChange={handleRenameDialogOpenChange}
      >
        <form
          className={s.renameForm}
          onSubmit={(event) => void handleRenameSubmit(event)}
        >
          <div className={s.renameField}>
            <label className={s.renameLabel} htmlFor={renameInputId}>
              Title
            </label>
            <Input
              autoFocus
              id={renameInputId}
              value={renameTitle}
              onChange={(event) => {
                setRenameTitle(event.target.value)
              }}
            />
          </div>

          {renameError ? (
            <div className={s.renameError}>{renameError}</div>
          ) : null}

          <div className={s.renameActions}>
            <Button
              disabled={renamePending}
              type="button"
              variant="secondary"
              onClick={() => {
                handleRenameDialogOpenChange(false)
              }}
            >
              Cancel
            </Button>
            <Button disabled={renamePending} type="submit" variant="primary">
              {renamePending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
