import type { Prompt } from "@pilot43/protocol"

import type { AgentStorage } from "./types"

export function createPromptStore(storage: AgentStorage) {
  return {
    /**
     * Returns user prompts ordered by title. Built-in prompts live in code
     * (see `builtinPrompts`) and are never persisted.
     */
    getAllPrompts: async (): Promise<Prompt[]> => {
      const all = await storage.prompts.getAll()

      return all.sort((a, b) => a.title.localeCompare(b.title))
    },

    createPrompt: async (
      prompt: Pick<Prompt, "text" | "title">,
    ): Promise<Prompt> => {
      const newPrompt: Prompt = {
        builtin: false,
        id: crypto.randomUUID(),
        text: prompt.text,
        title: prompt.title,
      }

      await storage.prompts.put(newPrompt)
      return newPrompt
    },

    updatePrompt: async (prompt: Prompt): Promise<Prompt> => {
      await storage.prompts.put(prompt)
      return prompt
    },

    deletePrompt: async (id: Prompt["id"]): Promise<void> => {
      await storage.prompts.delete(id)
    },
  }
}
