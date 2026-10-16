import type { Command } from "@pilot43/protocol"

import type { AgentContext } from "../context"

export async function handleCommandGet(ctx: AgentContext): Promise<Command[]> {
  return await ctx.store.getAllCommands()
}

export async function handleCommandCreate(
  ctx: AgentContext,
  command: Pick<Command, "description" | "name" | "prompt">,
): Promise<Command> {
  return await ctx.store.createCommand(command)
}

export async function handleCommandUpdate(
  ctx: AgentContext,
  command: Command,
): Promise<Command> {
  return await ctx.store.updateCommand(command)
}

export async function handleCommandDelete(
  ctx: AgentContext,
  id: Command["id"],
): Promise<void> {
  await ctx.store.deleteCommand(id)
}
