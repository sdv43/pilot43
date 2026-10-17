import { PencilIcon, TrashIcon } from "lucide-react"

import { useChatGetByWorkspace } from "../../../../../../queries/chat"
import { useMcpServerGet } from "../../../../../../queries/mcpServer"
import { Badge } from "../../../../../components/Badge"
import { IconButton } from "../../../../../components/IconButton"
import { WorkspaceAvatar } from "../../../../../components/WorkspaceAvatar"
import { formatCount } from "../../../utils"
import { type WorkspaceRowProps } from "./types"
import s from "./WorkspaceRow.module.css"

export function WorkspaceRow({
  isActive,
  onDelete,
  onEdit,
  workspace,
}: WorkspaceRowProps) {
  const { data: chats } = useChatGetByWorkspace(workspace.id)
  const { data: servers = [] } = useMcpServerGet()
  const serverCount = workspace.mcpServers
    ? servers.filter((server) => workspace.mcpServers?.includes(server.name))
        .length
    : servers.length

  return (
    <div className={s.workspaceRow} data-testid="workspace-row">
      <WorkspaceAvatar size="large" workspace={workspace} />
      <div className={s.text}>
        <div className={s.titleRow}>
          <span className={s.title}>{workspace.name}</span>
          {isActive ? <Badge tone="accent">Active</Badge> : null}
        </div>
        <span className={s.detail}>
          {formatCount(serverCount, "server")}
          {chats ? ` · ${formatCount(chats.length, "chat")}` : null}
        </span>
      </div>
      <IconButton
        aria-label={`Edit ${workspace.name}`}
        icon={<PencilIcon />}
        size="small"
        onClick={onEdit}
      />
      <IconButton
        aria-label={`Delete ${workspace.name}`}
        icon={<TrashIcon />}
        size="small"
        onClick={onDelete}
      />
    </div>
  )
}
