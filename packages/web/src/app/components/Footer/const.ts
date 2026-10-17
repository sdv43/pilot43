import type { ComposerMode } from "./hooks/useComposerMode"

export const composerPlaceholders: Record<ComposerMode, string> = {
  answer: "Or reply in your own words…",
  generating: "Reply…",
  idle: "Ask anything — # to attach a tab, / for a prompt",
  paused: "Reply…",
}

export const composerHints: Record<ComposerMode, string> = {
  answer: "Answering continues the turn",
  generating: "Esc to stop generating",
  idle: "Enter to send · Shift + Enter for new line",
  paused: "Answer the notice above to continue",
}
