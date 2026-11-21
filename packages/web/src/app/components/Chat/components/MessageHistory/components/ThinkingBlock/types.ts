export interface ThinkingBlockProps {
  isThinking: boolean
  /** Thinking time, when the agent recorded it. */
  thinkingMs?: number
  thoughts: string
}
