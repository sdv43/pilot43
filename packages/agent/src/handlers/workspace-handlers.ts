import type { Workspace } from "@pilot43/protocol"

import { workspaceSystemPromptMaxLength } from "@pilot43/protocol"

import type { AgentContext } from "../context"

import { deleteChatWithData } from "./chat-handlers"

type WorkspaceInput = Partial<
  Omit<Workspace, "id" | "lastSelectedChatId" | "name">
> &
  Pick<Workspace, "name">

function validateWorkspace(workspace: WorkspaceInput) {
  if (!workspace.name.trim()) {
    throw new Error("Workspace name is required")
  }

  if ((workspace.systemPrompt?.length ?? 0) > workspaceSystemPromptMaxLength) {
    throw new Error(
      `System prompt must be at most ${workspaceSystemPromptMaxLength} characters`,
    )
  }
}

export async function handleWorkspaceGet(
  ctx: AgentContext,
): Promise<Workspace[]> {
  return await ctx.store.getAllWorkspaces()
}

export async function handleWorkspaceCreate(
  ctx: AgentContext,
  workspace: WorkspaceInput,
): Promise<Workspace> {
  validateWorkspace(workspace)

  return await ctx.store.createWorkspace({
    ...workspace,
    name: workspace.name.trim(),
  })
}

export async function handleWorkspaceUpdate(
  ctx: AgentContext,
  workspace: Workspace,
): Promise<Workspace> {
  validateWorkspace(workspace)

  return await ctx.store.updateWorkspace({
    ...workspace,
    name: workspace.name.trim(),
  })
}

/** Deletes the workspace together with its chats and their data. */
export async function handleWorkspaceDelete(
  ctx: AgentContext,
  workspaceId: Workspace["id"],
): Promise<void> {
  const chats = await ctx.store.getChatsByWorkspace(workspaceId)

  for (const chat of chats) {
    await deleteChatWithData(ctx, chat.id)
  }

  await ctx.store.deleteWorkspace(workspaceId)
}
