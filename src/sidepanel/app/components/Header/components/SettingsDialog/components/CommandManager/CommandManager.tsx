import { EditIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { useId, useState } from "react"

import type { Command } from "@/shared/api"

import { Button } from "@/sidepanel/app/components/Button"
import { IconButton } from "@/sidepanel/app/components/IconButton"
import { Loader } from "@/sidepanel/app/components/Loader"
import { toast } from "@/sidepanel/app/components/ToastProvider"
import { useCommandDelete, useCommandGet } from "@/sidepanel/queries/command"

import s from "./CommandManager.module.css"
import { CommandSettings } from "./components/CommandSettings"

export function CommandManager() {
  const { data: commands = [], isLoading, error: queryError } = useCommandGet()
  const deleteMutation = useCommandDelete()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCommand, setEditingCommand] = useState<Command | null>(null)

  const handleOpenDialog = (command?: Command) => {
    setEditingCommand(command ?? null)
    setIsDialogOpen(true)
  }

  const handleDelete = async (command: Command) => {
    if (
      !window.confirm(`Are you sure you want to delete "/${command.name}"?`)
    ) {
      return
    }

    try {
      await deleteMutation.mutateAsync(command.id)
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to delete command",
        "error",
      )
    }
  }

  const titleId = useId()

  return (
    <section aria-labelledby={titleId} className={s.container}>
      <div className={s.header}>
        <h3 className={s.title} id={titleId}>
          Commands
        </h3>
        <Button
          icon={<PlusIcon size={14} />}
          variant="secondary"
          onClick={() => handleOpenDialog()}
        >
          Command
        </Button>
      </div>

      <p className={s.helpText}>
        Slash commands (<code>/name</code>) expand into a prompt when the
        message is sent. They can only be used at the start of a message.
      </p>

      {isLoading && (
        <div className={s.loading}>
          <Loader size={13} /> Loading commands...
        </div>
      )}

      {!isLoading && queryError && (
        <div className={s.error}>
          Cannot load commands: {queryError.message}
        </div>
      )}

      {!isLoading && !queryError && commands.length === 0 && (
        <div className={s.empty}>No commands configured yet</div>
      )}

      {!isLoading && !queryError && commands.length > 0 && (
        <ul className={s.list}>
          {commands.map((command) => (
            <li key={command.id} className={s.item}>
              <div className={s.info}>
                <div className={s.name}>/{command.name}</div>
                {command.description && (
                  <div className={s.description}>{command.description}</div>
                )}
              </div>

              <div className={s.actions}>
                <IconButton
                  aria-label={`Edit /${command.name}`}
                  icon={<EditIcon size={12} />}
                  variant="secondary"
                  onClick={() => handleOpenDialog(command)}
                />
                <IconButton
                  aria-label={`Delete /${command.name}`}
                  icon={<Trash2Icon size={12} />}
                  variant="secondary"
                  onClick={() => void handleDelete(command)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <CommandSettings
        key={isDialogOpen ? (editingCommand?.id ?? "new") : "closed"}
        command={editingCommand}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </section>
  )
}
