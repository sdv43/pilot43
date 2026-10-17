import { useChatGetByWorkspace } from "../../../../../../queries/chat"
import { useWorkspaceDelete } from "../../../../../../queries/workspace"
import { ConfirmDialog } from "../../../../../components/ConfirmDialog"
import { toast } from "../../../../../components/ToastProvider"
import { actions, useStore } from "../../../../../store"
import { formatCount } from "../../../utils"
import { type DeleteWorkspaceDialogProps } from "./types"

/** Confirms deleting a workspace by typing its name. */
export function DeleteWorkspaceDialog({
  onClose,
  onDeleted,
  workspace,
}: DeleteWorkspaceDialogProps) {
  const { data: chats } = useChatGetByWorkspace(workspace?.id)
  const { isPending, mutate: deleteWorkspace } = useWorkspaceDelete()
  const activeWorkspaceId = useStore((state) => state.lastSelectedWorkspaceId)

  return (
    <ConfirmDialog
      confirmLabel="Delete workspace"
      confirmText={workspace?.name}
      isPending={isPending}
      open={!!workspace}
      title={`Delete “${workspace?.name ?? ""}”?`}
      onConfirm={() => {
        if (!workspace) {
          return
        }

        deleteWorkspace(workspace.id, {
          onError: (error) => {
            toast(`Failed to delete workspace: ${error.message}`, "error")
          },
          onSuccess: () => {
            if (workspace.id === activeWorkspaceId) {
              actions.setLastSelectedWorkspaceId(null)
            }

            onClose()
            onDeleted?.()
          },
        })
      }}
      onOpenChange={(open) => !open && onClose()}
    >
      <p>
        This permanently deletes the workspace and its{" "}
        {formatCount(chats?.length ?? 0, "chat")}. Providers and MCP servers
        stay available to other workspaces.
      </p>
    </ConfirmDialog>
  )
}
