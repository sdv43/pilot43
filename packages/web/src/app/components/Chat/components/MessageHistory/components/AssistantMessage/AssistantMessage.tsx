import { Markdown } from "../../../../../Markdown"
import s from "./AssistantMessage.module.css"
import { type AssistantMessageProps } from "./types"

/** The assistant's answer; the steps before it fold into AgentSteps. */
export function AssistantMessage({ message }: AssistantMessageProps) {
  return (
    <div data-testid="assistant-message">
      <div className={s.content} data-testid="assistant-content">
        <Markdown>{message.content}</Markdown>
      </div>
    </div>
  )
}
