import type { Workspace } from "@/shared/api"

import {
  createWorkspace,
  deleteWorkspace,
  getAllWorkspaces,
  updateWorkspace,
} from "../storage"

export async function handleWorkspaceGet(): Promise<Workspace[]> {
  return await getAllWorkspaces()
}

export async function handleWorkspaceCreate(
  workspace: Pick<Workspace, "name">,
): Promise<Workspace> {
  return await createWorkspace(workspace)
}

export async function handleWorkspaceUpdate(
  workspace: Workspace,
): Promise<Workspace> {
  return await updateWorkspace(workspace)
}

export async function handleWorkspaceDelete(
  workspaceId: Workspace["id"],
): Promise<void> {
  await deleteWorkspace(workspaceId)
}
