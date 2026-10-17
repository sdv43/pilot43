import {
  ChevronDownIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
} from "lucide-react"
import { useId, useRef, useState } from "react"
import { useNavigate } from "react-router"

import { useWorkspaceGet } from "../../../queries/workspace"
import { cn } from "../../../shared/cn"
import { paths } from "../../../shared/routes"
import { useCurrentWorkspace } from "../../../shared/useCurrentWorkspace"
import { Popover } from "../Popover"
import { WorkspaceAvatar } from "../WorkspaceAvatar"
import { WorkspaceMenuItem } from "./components/WorkspaceMenuItem"
import { type WorkspaceSwitcherProps } from "./types"
import s from "./WorkspaceSwitcher.module.css"

/** Header button showing the current workspace; opens a searchable menu. */
export function WorkspaceSwitcher({ className }: WorkspaceSwitcherProps) {
  const popoverId = useId()
  const anchorName = `--workspace-switcher-${popoverId.replace(/:/g, "")}`
  const popoverRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const workspace = useCurrentWorkspace()
  const { data: workspaces = [] } = useWorkspaceGet()

  const filtered = workspaces.filter((item) =>
    item.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  function go(path: string) {
    popoverRef.current?.hidePopover()
    void navigate(path)
  }

  return (
    <>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={cn(s.trigger, className)}
        data-testid="workspace-switcher"
        popoverTarget={popoverId}
        style={{ anchorName }}
        type="button"
      >
        {workspace ? <WorkspaceAvatar workspace={workspace} /> : null}
        <span className={s.name}>{workspace?.name ?? "Select workspace"}</span>
        <ChevronDownIcon aria-hidden="true" className={s.chevron} />
      </button>

      <Popover
        ref={popoverRef}
        anchorName={anchorName}
        aria-label="Workspaces"
        className={s.menu}
        id={popoverId}
        role="menu"
        onOpenChange={(open) => {
          setIsOpen(open)

          if (!open) {
            setQuery("")
          }
        }}
      >
        {isOpen ? (
          <>
            <label className={s.search}>
              <SearchIcon aria-hidden="true" />
              <input
                autoFocus
                aria-label="Search workspaces"
                className={s.searchInput}
                placeholder="Search workspaces"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className={s.label}>Workspaces</div>
            {filtered.map((item) => (
              <WorkspaceMenuItem
                key={item.id}
                isSelected={item.id === workspace?.id}
                workspace={item}
                onSelect={() =>
                  go(paths.chat(item.id, item.lastSelectedChatId))
                }
              />
            ))}
            {filtered.length === 0 ? (
              <div className={s.empty}>No workspaces found</div>
            ) : null}
            <div className={s.divider} role="separator" />
            <button
              className={s.item}
              role="menuitem"
              type="button"
              onClick={() => go(paths.settingsNew("workspaces"))}
            >
              <PlusIcon aria-hidden="true" className={s.itemIcon} />
              New workspace
            </button>
            <button
              className={s.item}
              role="menuitem"
              type="button"
              onClick={() => go(paths.settings("workspaces"))}
            >
              <SettingsIcon aria-hidden="true" className={s.itemIcon} />
              Manage workspaces
            </button>
          </>
        ) : null}
      </Popover>
    </>
  )
}
