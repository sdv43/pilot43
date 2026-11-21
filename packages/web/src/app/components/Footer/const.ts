import type { ComposerMode } from "./hooks/useComposerMode"

export const composerPlaceholders: Record<ComposerMode, string> = {
  answer: "Or type a reply to skip the questions…",
  approval: "Reply to deny with feedback…",
  generating: "Reply…",
  idle: "Ask anything — # to attach a tab or selection, / for a prompt",
  paused: "Reply…",
}

export const composerHints: Record<ComposerMode, string> = {
  answer: "Answering continues the turn",
  approval: "Waiting for approval · Esc to deny",
  generating: "Esc to stop generating",
  idle: "Enter to send · Shift + Enter for new line",
  paused: "Answer the notice above to continue",
}
