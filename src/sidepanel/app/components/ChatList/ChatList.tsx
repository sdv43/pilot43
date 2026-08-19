import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { useState } from "react"

import type { Chat } from "@/shared/api"

import { useChatGetByWorkspace } from "@/sidepanel/queries/chat"

import { cn } from "../../../shared/cn"
import { useStore } from "../../store"
import { IconButton } from "../IconButton"
import s from "./ChatList.module.css"
import { ChatListItem } from "./components/ChatListItem"
import { type ChatListProps } from "./types"
import { formatChatDateLabel, sortChats } from "./utils"

type ChatListEntry =
  | { kind: "chat"; chat: Chat; key: string }
  | { kind: "separator"; key: string; label: string }

export function ChatList({ className, ...props }: ChatListProps) {
  const [expanded, setExpanded] = useState(false)

  const lastSelectedWorkspaceId = useStore(
    (state) => state.lastSelectedWorkspaceId,
  )

  const { data } = useChatGetByWorkspace(lastSelectedWorkspaceId)

  const sortedChats = data ? sortChats(data) : []

  const items: ChatListEntry[] = []

  if (expanded) {
    let lastLabel: null | string = null

    for (const chat of sortedChats) {
      const label = formatChatDateLabel(chat.updatedAt ?? 0)

      if (label !== lastLabel) {
        items.push({ kind: "separator", key: `sep-${chat.id}`, label })
        lastLabel = label
      }

      items.push({ kind: "chat", key: chat.id, chat })
    }
  } else {
    for (const chat of sortedChats) {
      items.push({ kind: "chat", key: chat.id, chat })
    }
  }

  return (
    <div
      {...props}
      className={cn(s.chatList, className)}
      data-expanded={expanded}
    >
      <div aria-label="Chat List" className={s.list} role="region">
        {items.map((item) =>
          item.kind === "separator" ? (
            <div
              key={item.key}
              className={s.dateSeparator}
              data-testid="chat-list-date-separator"
            >
              {item.label}
            </div>
          ) : (
            <ChatListItem
              key={item.key}
              chat={item.chat}
              className={cn(s.chatItem, expanded && s.chatItemExpanded)}
              expanded={expanded}
            />
          ),
        )}
      </div>

      {sortedChats.length > 0 ? (
        <div className={s.toggleWrapper}>
          <span className={s.tr}></span>
          <IconButton
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse chat list" : "Expand chat list"}
            className={s.toggle}
            data-testid="chat-list-toggle"
            icon={
              expanded ? (
                <ChevronRightIcon size={14} />
              ) : (
                <ChevronLeftIcon size={14} />
              )
            }
            variant="secondary"
            onClick={() => setExpanded((value) => !value)}
          />
        </div>
      ) : null}
    </div>
  )
}
