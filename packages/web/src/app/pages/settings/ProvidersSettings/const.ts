import type { ModelProvider } from "../../../../queries/modelProvider"

export const providerTypeLabels: Record<ModelProvider["type"], string> = {
  ollama: "Ollama",
  openai: "OpenAI",
  openrouter: "OpenRouter",
}

/** Letter shown in the provider type picker. */
export const providerTypeInitials: Record<ModelProvider["type"], string> = {
  ollama: "L",
  openai: "O",
  openrouter: "R",
}
