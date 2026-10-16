import type { Workspace } from "@pilot43/protocol"

import type { AgentContext } from "../context"

export async function handleWorkspaceGet(
  ctx: AgentContext,
): Promise<Workspace[]> {
  return await ctx.store.getAllWorkspaces()
}

export async function handleWorkspaceCreate(
  ctx: AgentContext,
  workspace: Pick<Workspace, "name">,
): Promise<Workspace> {
  return await ctx.store.createWorkspace(workspace)
}

export async function handleWorkspaceUpdate(
  ctx: AgentContext,
  workspace: Workspace,
): Promise<Workspace> {
  return await ctx.store.updateWorkspace(workspace)
}

export async function handleWorkspaceDelete(
  ctx: AgentContext,
  workspaceId: Workspace["id"],
): Promise<void> {
  await ctx.store.deleteWorkspace(workspaceId)
}
