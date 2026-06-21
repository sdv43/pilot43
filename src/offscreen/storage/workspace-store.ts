import type { Workspace } from "@/shared/api"

import { getDB } from "./db"

export async function getAllWorkspaces(): Promise<Workspace[]> {
  const db = await getDB()
  return (await db.getAll("workspaces")) as Workspace[]
}

export async function getWorkspaceById(
  id: Workspace["id"],
): Promise<undefined | Workspace> {
  const db = await getDB()
  return (await db.get("workspaces", id)) as undefined | Workspace
}

export async function createWorkspace(
  workspace: Pick<Workspace, "name">,
): Promise<Workspace> {
  const db = await getDB()
  const newWorkspace: Workspace = {
    id: crypto.randomUUID(),
    name: workspace.name,
    lastSelectedChatId: null,
  }
  await db.put("workspaces", newWorkspace)
  return newWorkspace
}

export async function updateWorkspace(
  workspace: Workspace,
): Promise<Workspace> {
  const db = await getDB()
  await db.put("workspaces", workspace)
  return workspace
}

export async function deleteWorkspace(id: Workspace["id"]): Promise<void> {
  const db = await getDB()
  await db.delete("workspaces", id)
}
