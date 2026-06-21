import type { Command } from "@/shared/api"

import {
  createCommand,
  deleteCommand,
  getAllCommands,
  updateCommand,
} from "../storage"

export async function handleCommandGet(): Promise<Command[]> {
  return await getAllCommands()
}

export async function handleCommandCreate(
  command: Pick<Command, "description" | "name" | "prompt">,
): Promise<Command> {
  return await createCommand(command)
}

export async function handleCommandUpdate(command: Command): Promise<Command> {
  return await updateCommand(command)
}

export async function handleCommandDelete(id: Command["id"]): Promise<void> {
  await deleteCommand(id)
}
