import type { MessageAssistantTool } from "@pilot43/protocol"

/** One step of the agent's work between the prompt and the answer. */
export type AgentStep =
  /** Text the model wrote before calling tools ("Let me check…"). */
  | { content: string; id: string; kind: "note" }
  | {
      id: string
      /** Reasoning still streaming. */
      isThinking: boolean
      kind: "thought"
      thinkingMs?: number
      thoughts: string
    }
  | { id: string; kind: "tool"; tool: MessageAssistantTool }

export interface AgentStepsProps {
  /**
   * The run is still working on these steps: they show as a rolling timeline
   * of the latest few instead of a one-line summary.
   */
  isLive: boolean
  /** False once the run ended (calls still running were stopped). */
  isRunActive: boolean
  /** Waiting for the model between steps: adds a trailing "Working…" row. */
  isWorking: boolean
  onOpenTool: (tool: MessageAssistantTool) => void
  steps: AgentStep[]
}
