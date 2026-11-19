/** Saved prompts offered as suggestions in an empty chat. */
export const suggestedPromptCount = 3

/** Provider cards of the first-run empty state. */
export const providerChoices = [
  {
    detail: "GPT models with your OpenAI API key",
    name: "OpenAI",
    type: "openai",
  },
  {
    detail: "Hundreds of models from many labs with one key",
    name: "OpenRouter",
    type: "openrouter",
  },
  {
    detail: "Local models on this computer, no key",
    name: "Ollama",
    type: "ollama",
  },
] as const
