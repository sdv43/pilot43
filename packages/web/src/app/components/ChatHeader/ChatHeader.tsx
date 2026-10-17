import { HistoryIcon, MessageSquarePlusIcon, SettingsIcon } from "lucide-react"
import { useNavigate } from "react-router"

import { cn } from "../../../shared/cn"
import { paths } from "../../../shared/routes"
import { useCurrentWorkspaceId } from "../../../shared/useCurrentWorkspace"
import { IconButton } from "../IconButton"
import { WorkspaceSwitcher } from "../WorkspaceSwitcher"
import s from "./ChatHeader.module.css"
import { type ChatHeaderProps } from "./types"

export function ChatHeader({ className }: ChatHeaderProps) {
  const navigate = useNavigate()
  const workspaceId = useCurrentWorkspaceId()

  return (
    <header className={cn(s.header, className)}>
      <WorkspaceSwitcher />
      <span className={s.spacer} />
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
