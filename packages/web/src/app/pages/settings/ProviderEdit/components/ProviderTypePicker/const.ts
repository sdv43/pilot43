import type { ModelProvider } from "../../../../../../queries/modelProvider"

export const providerTypes: ModelProvider["type"][] = [
  "openai",
  "openrouter",
  "ollama",
]
