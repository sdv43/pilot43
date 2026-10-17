import { ChevronRightIcon } from "lucide-react"

import {
  describeToolCall,
  formatToolName,
  getToolCallError,
  getToolCallState,
} from "../../../../../../../shared/tool-call"
import { stateIcons } from "./const"
import { useNow } from "./hooks/useNow"
import s from "./ToolCallRow.module.css"
import { type ToolCallRowProps } from "./types"

/** A tool call in the conversation; opens its input and output. */
export function ToolCallRow({ onOpen, tool }: ToolCallRowProps) {
  const state = getToolCallState(tool)
  const now = useNow(state === "running")
  const error = state === "failed" ? getToolCallError(tool) : undefined
  const StateIcon = stateIcons[state]

  return (
    <div
      className={s.toolCallRow}
      data-state={state}
      data-testid="assistant-tool"
    >
      <button className={s.header} type="button" onClick={onOpen}>
        <span aria-hidden="true" className={s.icon}>
          <StateIcon />
        </span>
        <span className={s.text}>
          <span className={s.name}>{formatToolName(tool.name)}</span>
          <span className={s.detail}>{describeToolCall(tool, now)}</span>
        </span>
        <ChevronRightIcon aria-hidden="true" className={s.chevron} />
      </button>
      {error ? <pre className={s.error}>{error}</pre> : null}
    </div>
  )
}
