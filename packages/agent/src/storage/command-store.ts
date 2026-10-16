import type { Command } from "@pilot43/protocol"

import type { AgentStorage } from "./types"

export function createCommandStore(storage: AgentStorage) {
  return {
    /**
     * Returns all user-created commands ordered by name. Built-in commands are
     * hardcoded in code (see {@link builtinCommands}) and are never persisted
     * to or read from the storage, so they are not included here.
     */
    getAllCommands: async (): Promise<Command[]> => {
      const all = await storage.commands.getAll()

      return all.sort((a, b) => a.name.localeCompare(b.name))
    },

    getCommandById: (id: string): Promise<Command | undefined> => {
      return storage.commands.getById(id)
    },

    createCommand: async (
      command: Pick<Command, "description" | "name" | "prompt">,
    ): Promise<Command> => {
      const newCommand: Command = {
        id: crypto.randomUUID(),
        name: command.name,
        prompt: command.prompt,
        description: command.description,
        builtin: false,
      }

      await storage.commands.put(newCommand)
      return newCommand
    },

    updateCommand: async (command: Command): Promise<Command> => {
      await storage.commands.put(command)
      return command
    },

    deleteCommand: async (id: string): Promise<void> => {
      await storage.commands.delete(id)
    },
  }
}
