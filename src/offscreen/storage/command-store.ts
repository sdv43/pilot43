import type { Command } from "@/shared/api"

import { getDB } from "./db"

/**
 * Returns all user-created commands ordered by name. Built-in commands are
 * hardcoded in code (see {@link builtinCommands}) and are never persisted to
 * or read from the database, so they are not included here.
 */
export async function getAllCommands(): Promise<Command[]> {
  const db = await getDB()
  const all = (await db.getAll("commands")) as Command[]

  return all.sort((a, b) => a.name.localeCompare(b.name))
}

export async function getCommandById(id: string): Promise<Command | undefined> {
  const db = await getDB()
  return (await db.get("commands", id)) as Command | undefined
}

export async function createCommand(
  command: Pick<Command, "description" | "name" | "prompt">,
): Promise<Command> {
  const db = await getDB()
  const newCommand: Command = {
    id: crypto.randomUUID(),
    name: command.name,
    prompt: command.prompt,
    description: command.description,
    builtin: false,
  }

  await db.put("commands", newCommand)
  return newCommand
}

export async function updateCommand(command: Command): Promise<Command> {
  const db = await getDB()
  await db.put("commands", command)
  return command
}

export async function deleteCommand(id: string): Promise<void> {
  const db = await getDB()
  await db.delete("commands", id)
}
