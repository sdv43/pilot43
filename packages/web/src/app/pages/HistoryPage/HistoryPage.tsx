import type { Chat } from "@pilot43/protocol"

import { PlusIcon, SearchIcon } from "lucide-react"
import { useState } from "react"
import { Navigate, useNavigate, useParams } from "react-router"

import {
  useChatDelete,
  useChatGetByWorkspace,
  useChatSettingsUpdate,
} from "../../../queries/chat"
import { useWorkspaceGet } from "../../../queries/workspace"
import { paths } from "../../../shared/routes"
import { Button } from "../../components/Button"
import { ConfirmDialog } from "../../components/ConfirmDialog"
import { PageHeader } from "../../components/PageHeader"
import { SessionRow } from "../../components/SessionRow"
import { toast } from "../../components/ToastProvider"
import { WorkspaceAvatar } from "../../components/WorkspaceAvatar"
import { RenameChatDialog } from "./components/RenameChatDialog"
import s from "./HistoryPage.module.css"
import { formatChatTime, groupChats } from "./utils"

/** `/w/:workspaceId/history` — the chats of a workspace. */
export function HistoryPage() {
  const { workspaceId } = useParams()
  const navigate = useNavigate()
  const { data: workspaces, isLoading } = useWorkspaceGet()
  const { data: chats = [] } = useChatGetByWorkspace(workspaceId)
  const { mutate: updateChatSettings } = useChatSettingsUpdate()
  const { isPending: isDeleting, mutate: deleteChat } = useChatDelete()
  const [query, setQuery] = useState("")
  const [now] = useState(() => new Date())
  const [renamingChat, setRenamingChat] = useState<Chat | null>(null)
  const [deletingChat, setDeletingChat] = useState<Chat | null>(null)
  const workspace = workspaces?.find((item) => item.id === workspaceId)

  if (!isLoading && !workspace) {
    return <Navigate replace to={paths.home()} />
  }

  if (!workspace) {
    return null
  }

  const normalizedQuery = query.trim().toLowerCase()
  const visibleChats = normalizedQuery
    ? chats.filter((chat) =>
        `${chat.title} ${chat.preview ?? ""}`
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : chats
  const groups = groupChats(visibleChats, now)

  return (
    <div className={s.page}>
      <PageHeader
        action={
          <Button
            icon={<PlusIcon />}
            size="small"
            onClick={() => void navigate(paths.chat(workspace.id))}
          >
            New chat
          </Button>
        }
        backLabel="Back to chat"
        subtitle={
          <>
            <WorkspaceAvatar className={s.avatar} workspace={workspace} />
            <span className={s.subtitleText}>
              {workspace.name} · {chats.length}{" "}
              {chats.length === 1 ? "chat" : "chats"}
            </span>
          </>
        }
        title="Chats"
        onBack={() =>
          void navigate(paths.chat(workspace.id, workspace.lastSelectedChatId))
        }
      />

      <div className={s.toolbar}>
        <label className={s.search}>
          <SearchIcon aria-hidden="true" />
          <input
            aria-label="Search chats"
            className={s.searchInput}
            placeholder="Search chats"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <div aria-label="Chats" className={s.list} role="region">
        {groups.map((group) => (
          <section key={group.label} className={s.group}>
            <h2 className={s.groupLabel}>{group.label}</h2>
            {group.chats.map((chat) => (
              <SessionRow
                key={chat.id}
                chat={chat}
                isActive={chat.id === workspace.lastSelectedChatId}
                isGenerating={chat.isGenerating}
                time={formatChatTime(chat.updatedAt ?? 0, now)}
                onDelete={() => setDeletingChat(chat)}
                onOpen={() => void navigate(paths.chat(workspace.id, chat.id))}
                onRename={() => setRenamingChat(chat)}
                onTogglePin={() =>
                  updateChatSettings(
                    {
                      chatId: chat.id,
                      settings: {
                        ...chat.settings,
                        pinned: !chat.settings.pinned,
                      },
                    },
                    {
                      onError: (error) => {
                        toast(`Failed to pin chat: ${error.message}`, "error")
                      },
                    },
                  )
                }
              />
            ))}
          </section>
        ))}
        {groups.length === 0 ? (
          <p className={s.empty}>
            {normalizedQuery ? "No chats match your search" : "No chats yet"}
          </p>
        ) : null}
      </div>

      <footer className={s.footer}>
        Stored locally · pinned chats are kept
      </footer>

      <RenameChatDialog
        chat={renamingChat}
        onClose={() => setRenamingChat(null)}
      />
      <ConfirmDialog
        confirmLabel="Delete chat"
        isPending={isDeleting}
        open={!!deletingChat}
        title={`Delete “${deletingChat?.title ?? ""}”?`}
        onConfirm={() => {
          if (!deletingChat) {
            return
          }

          deleteChat(deletingChat.id, {
            onError: (error) => {
              toast(`Failed to delete chat: ${error.message}`, "error")
            },
            onSuccess: () => setDeletingChat(null),
          })
        }}
        onOpenChange={(open) => !open && setDeletingChat(null)}
      >
        <p>This permanently deletes the chat and its messages.</p>
      </ConfirmDialog>
    </div>
  )
}
