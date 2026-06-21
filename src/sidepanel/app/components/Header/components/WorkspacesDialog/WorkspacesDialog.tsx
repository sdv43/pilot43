import {
  CheckIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { useState } from "react"

import {
  useWorkspaceCreate,
  useWorkspaceDelete,
  useWorkspaceGet,
  useWorkspaceUpdate,
} from "@/sidepanel/queries/workspace"

import type { WorkspacesDialogProps } from "./types"

import { Dialog } from "../../../Dialog"
import { IconButton } from "../../../IconButton"
import { Input } from "../../../Input"
import { toast } from "../../../ToastProvider"
import s from "./WorkspacesDialog.module.css"

export function WorkspacesDialog({
  onOpenChange,
  open,
}: WorkspacesDialogProps) {
  const { data: workspaces = [] } = useWorkspaceGet()

  const createMutation = useWorkspaceCreate()
  const updateMutation = useWorkspaceUpdate()
  const deleteMutation = useWorkspaceDelete()

  const [newName, setNewName] = useState("")
  const [editingId, setEditingId] = useState<null | string>(null)
  const [editingName, setEditingName] = useState("")

  function handleCreate() {
    const trimmed = newName.trim()

    if (!trimmed) {
      return
    }

    createMutation.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          setNewName("")
        },
        onError: (error) => {
          toast(`Failed to create workspace: ${error.message}`, "error")
        },
      },
    )
  }

  function handleDelete(id: string) {
    const workspace = workspaces.find((w) => w.id === id)

    if (!workspace) {
      return
    }

    if (
      !window.confirm(`Are you sure you want to delete "${workspace.name}"?`)
    ) {
      return
    }

    deleteMutation.mutate(id, {
      onError: (error) => {
        toast(`Failed to delete workspace: ${error.message}`, "error")
      },
    })
  }

  function handleStartEdit(id: string, currentName: string) {
    setEditingId(id)
    setEditingName(currentName)
  }

  function handleConfirmEdit() {
    if (!editingId) return
    const trimmed = editingName.trim()
    const workspace = workspaces.find((w) => w.id === editingId)

    if (trimmed && workspace) {
      updateMutation.mutate(
        { ...workspace, name: trimmed },
        {
          onSuccess: () => {
            setEditingId(null)
          },
          onError: (error) => {
            toast(`Failed to update workspace: ${error.message}`, "error")
          },
        },
      )
    } else {
      setEditingId(null)
    }
  }

  function handleCancelEdit() {
    setEditingId(null)
  }

  return (
    <Dialog open={open} title="Manage Workspaces" onOpenChange={onOpenChange}>
      <div className={s.workspacesList}>
        {workspaces.map((ws) => (
          <div key={ws.id} className={s.workspaceRow}>
            {editingId === ws.id ? (
              <>
                <Input
                  autoFocus
                  className={s.nameInput}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirmEdit()
                    if (e.key === "Escape") handleCancelEdit()
                  }}
                />
                <IconButton
                  aria-label="Confirm rename"
                  icon={<CheckIcon size={12} />}
                  variant="secondary"
                  onClick={handleConfirmEdit}
                />
                <IconButton
                  aria-label="Cancel rename"
                  icon={<XIcon size={12} />}
                  variant="secondary"
                  onClick={handleCancelEdit}
                />
              </>
            ) : (
              <>
                <span className={s.workspaceName}>{ws.name}</span>
                <IconButton
                  aria-label={`Rename ${ws.name}`}
                  icon={<PencilIcon size={12} />}
                  variant="secondary"
                  onClick={() => handleStartEdit(ws.id, ws.name)}
                />
                <IconButton
                  aria-label={`Delete ${ws.name}`}
                  icon={<Trash2Icon size={12} />}
                  variant="secondary"
                  onClick={() => handleDelete(ws.id)}
                />
              </>
            )}
          </div>
        ))}

        {workspaces.length === 0 && (
          <div className={s.emptyState}>No workspaces available</div>
        )}
      </div>

      <div className={s.createRow}>
        <Input
          className={s.nameInput}
          placeholder="New workspace name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate()
          }}
        />
        <IconButton
          aria-label="Add workspace"
          disabled={!newName.trim()}
          icon={<PlusIcon size={12} />}
          variant="secondary"
          onClick={handleCreate}
        />
      </div>
    </Dialog>
  )
}
