import { HistoryIcon, MessageSquarePlusIcon, SettingsIcon } from "lucide-react"
import { useId } from "react"
import { useNavigate } from "react-router"

import { cn } from "../../../shared/cn"
import { paths } from "../../../shared/routes"
import { useCurrentWorkspaceId } from "../../../shared/useCurrentWorkspace"
import { IconButton } from "../IconButton"
import { WorkspaceSwitcher } from "../WorkspaceSwitcher"
import s from "./ChatHeader.module.css"
import { type ChatHeaderProps } from "./types"

/**
 * One-row chat header (Figma "Chat Header"): the workspace switcher with the
 * chat name under the workspace name, then New chat, History and Settings.
 */
export function ChatHeader({ className, title }: ChatHeaderProps) {
  const navigate = useNavigate()
  const workspaceId = useCurrentWorkspaceId()
  // The workspace menu opens under the whole block, not just the first row.
  const id = useId()
  const anchorName = `--chat-header-${id.replace(/:/g, "")}`

  return (
    <header className={cn(s.header, className)}>
      <div className={s.identity} style={{ anchorName }}>
        <WorkspaceSwitcher anchorName={anchorName} className={s.switcher} />
        <span
          className={s.title}
          data-placeholder={title ? undefined : ""}
          data-testid="chat-title"
          title={title || undefined}
        >
          {title || "New chat"}
        </span>
      </div>
      <IconButton
        aria-label="New chat"
        disabled={!workspaceId}
        icon={<MessageSquarePlusIcon />}
        title="New chat"
        onClick={() => workspaceId && void navigate(paths.chat(workspaceId))}
      />
      <IconButton
        aria-label="Chat history"
        disabled={!workspaceId}
        icon={<HistoryIcon />}
        title="Chats"
        onClick={() => workspaceId && void navigate(paths.history(workspaceId))}
      />
      <IconButton
        aria-label="Settings"
        icon={<SettingsIcon />}
        title="Settings"
        onClick={() => void navigate(paths.settings())}
      />
    </header>
  )
}
