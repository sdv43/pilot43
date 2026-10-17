import { cn } from "../../../shared/cn"
import { type WorkspaceAvatarProps } from "./types"
import s from "./WorkspaceAvatar.module.css"

/** Coloured square with the workspace's initial. */
export function WorkspaceAvatar({
  className,
  size = "small",
  workspace,
}: WorkspaceAvatarProps) {
  const initial = workspace.name.trim().charAt(0).toUpperCase() || "?"

  return (
    <span
      aria-hidden="true"
      className={cn(s.avatar, className)}
      data-color={workspace.color ?? "violet"}
      data-size={size}
    >
      {initial}
    </span>
  )
}
