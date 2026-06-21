import { PlusIcon, SettingsIcon } from "lucide-react"
import { useState } from "react"

import { actions, useStore } from "@/sidepanel/app/store"
import {
  useWorkspaceGet,
  useWorkspaceUpdate,
} from "@/sidepanel/queries/workspace"
import { cn } from "@/sidepanel/shared/cn"
import { useCurrentWorkspace } from "@/sidepanel/shared/useCurrentWorkspace"

import { Button } from "../Button"
import { IconButton } from "../IconButton"
import { Selector } from "../Selector"
import { SettingsDialog } from "./components/SettingsDialog/SettingsDialog"
import { WorkspacesDialog } from "./components/WorkspacesDialog"
import s from "./Header.module.css"
import { useChatTitle } from "./hooks/useChatTitle"
import { type HeaderProps } from "./types"
import { useWorkspaceOptions } from "./utils"

export function Header({ className, ...props }: HeaderProps) {
  const [isWorkspacesDialogOpen, setIsWorkspacesDialogOpen] = useState(false)
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)
  const lastSelectedWorkspaceId = useStore((s) => s.lastSelectedWorkspaceId)
  const { data } = useWorkspaceGet()
  const title = useChatTitle()
  const { mutate: updateWorkspace } = useWorkspaceUpdate()
  const currentWorkspace = useCurrentWorkspace()

  const handleAddChat = () => {
    if (currentWorkspace) {
      updateWorkspace({ ...currentWorkspace, lastSelectedChatId: null })
    }
  }

  const options = useWorkspaceOptions(data)

  return (
    <header {...props} className={cn(s.header, className)}>
      <h1 className={s.title}>{title}</h1>

      <div className={s.actions}>
        <IconButton
          aria-label="Add chat"
          disabled={!lastSelectedWorkspaceId || !options.length}
          icon={<PlusIcon size={14} />}
          variant="secondary"
          onClick={handleAddChat}
        />
        <Selector
          data-testid="workspace-selector"
          defaultValue={lastSelectedWorkspaceId ?? undefined}
          footer={
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsWorkspacesDialogOpen(true)}
            >
              Manage workspaces
            </Button>
          }
          options={options}
          placeholder="Select workspace"
          popoverClassName={s.selectorPopover}
          variant="secondary"
          onValueChange={(value) => {
            actions.setLastSelectedWorkspaceId(value ?? null)
          }}
        />
        <span className={s.devider}></span>
        <IconButton
          aria-label="Settings"
          className={s.settingsButton}
          icon={<SettingsIcon size={14} />}
          variant="secondary"
          onClick={() => setIsSettingsDialogOpen(true)}
        />
      </div>

      <WorkspacesDialog
        open={isWorkspacesDialogOpen}
        onOpenChange={setIsWorkspacesDialogOpen}
      />
      <SettingsDialog
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
      />
    </header>
  )
}
