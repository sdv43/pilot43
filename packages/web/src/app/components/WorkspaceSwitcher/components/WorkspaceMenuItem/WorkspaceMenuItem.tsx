import { CheckIcon } from "lucide-react"

import { WorkspaceAvatar } from "../../../WorkspaceAvatar"
import { useWorkspaceChatCount } from "../../hooks/useWorkspaceChatCount"
import { type WorkspaceMenuItemProps } from "./types"
import s from "./WorkspaceMenuItem.module.css"

export function WorkspaceMenuItem({
  isSelected,
  onSelect,
  workspace,
}: WorkspaceMenuItemProps) {
  const chatCount = useWorkspaceChatCount(workspace.id)

  return (
    <button
      aria-checked={isSelected}
      className={s.workspaceMenuItem}
      data-selected={isSelected}
      data-testid="workspace-menu-item"
      role="menuitemradio"
      type="button"
      onClick={onSelect}
    >
      <WorkspaceAvatar workspace={workspace} />
      <span className={s.label}>{workspace.name}</span>
      {chatCount !== undefined ? (
        <span className={s.meta}>
          {chatCount} {chatCount === 1 ? "chat" : "chats"}
        </span>
      ) : null}
      {isSelected ? <CheckIcon aria-hidden="true" className={s.check} /> : null}
    </button>
  )
}
