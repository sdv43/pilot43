import type { Chat } from "@pilot43/protocol"

import { ChevronDownIcon } from "lucide-react"
import { useId, useRef, useState } from "react"
import { useNavigate } from "react-router"

import { useChatDelete, useChatSettingsUpdate } from "../../../queries/chat"
import { cn } from "../../../shared/cn"
import { paths } from "../../../shared/routes"
import { ConfirmDialog } from "../ConfirmDialog"
import { Menu } from "../Menu"
import { RenameChatDialog } from "../RenameChatDialog"
import { toast } from "../ToastProvider"
import s from "./ChatTitleBar.module.css"
import { type ChatTitleBarProps } from "./types"

/**
 * Title of the open chat under the header (Figma "Chat Title Bar"). Opens
 * Rename, Pin and Delete.
 */
export function ChatTitleBar({ chat, className }: ChatTitleBarProps) {
  const id = useId()
  const anchorName = `--chat-title-${id.replace(/:/g, "")}`
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [renaming, setRenaming] = useState<Chat | null>(null)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const { mutate: updateChatSettings } = useChatSettingsUpdate()
  const { isPending: isDeleting, mutate: deleteChat } = useChatDelete()
  const isPinned = !!chat.settings.pinned

  return (
    <div className={cn(s.chatTitleBar, className)}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={s.title}
        data-testid="chat-title"
        style={{ anchorName }}
        title={chat.title}
        type="button"
        onClick={(event) => {
          // The menu closes on document clicks outside it; keep this click
          // from reaching the document, or it would close right away.
          event.stopPropagation()
          menuRef.current?.togglePopover()
        }}
      >
        <span className={s.text}>{chat.title}</span>
        <ChevronDownIcon aria-hidden="true" className={s.chevron} />
      </button>
      <Menu
        ref={menuRef}
        anchorName={anchorName}
        className={s.menu}
        items={[
          { id: "rename", label: "Rename" },
          { id: "pin", label: isPinned ? "Unpin" : "Pin" },
          { id: "delete", label: "Delete", tone: "danger" },
        ]}
        onItemClick={(itemId) => {
          menuRef.current?.hidePopover()

          if (itemId === "rename") {
            setRenaming(chat)
          } else if (itemId === "pin") {
            updateChatSettings(
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
          } else {
            setIsConfirmingDelete(true)
          }
        }}
        onOpenChange={setIsOpen}
      />
      <RenameChatDialog chat={renaming} onClose={() => setRenaming(null)} />
      <ConfirmDialog
        confirmLabel="Delete chat"
        isPending={isDeleting}
        open={isConfirmingDelete}
        title={`Delete “${chat.title}”?`}
        onConfirm={() =>
          deleteChat(chat.id, {
            onError: (error) => {
              toast(`Failed to delete chat: ${error.message}`, "error")
            },
            onSuccess: () => {
              setIsConfirmingDelete(false)
              void navigate(paths.chat(chat.workspaceId), { replace: true })
            },
          })
        }
        onOpenChange={(open) => !open && setIsConfirmingDelete(false)}
      >
        <p>This permanently deletes the chat and its messages.</p>
      </ConfirmDialog>
    </div>
  )
}
