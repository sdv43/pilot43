import type { Prompt } from "@pilot43/protocol"

/** Prompts whose title or text contains the query (case-insensitive). */
export function filterPrompts(prompts: Prompt[], query: string) {
  const normalized = query.trim().toLowerCase()

  if (!normalized) {
    return prompts
  }

  return prompts.filter((prompt) =>
    `${prompt.title}\n${prompt.text}`.toLowerCase().includes(normalized),
  )
}
