import {
  ChevronDownIcon,
  ChevronRightIcon,
  LightbulbIcon,
  LoaderCircleIcon,
} from "lucide-react"
import { useState } from "react"

import {
  formatToolName,
  getToolCallError,
  getToolCallState,
} from "../../../../../../../../../shared/tool-call"
import { Markdown } from "../../../../../../../Markdown"
import { useNow } from "../../../../hooks/useNow"
import {
  getThinkingPreview,
  getThinkingSummary,
} from "../../../ThinkingBlock/utils"
import { stateIcons } from "../../const"
import { describeToolStep } from "../../utils"
import s from "./StepItem.module.css"
import { type StepItemProps } from "./types"

type ToolStep = Extract<StepItemProps["step"], { kind: "tool" }>
type ThoughtStep = Extract<StepItemProps["step"], { kind: "thought" }>

/** A row of the steps timeline: an icon on the rail and the step. */
export function StepItem({
  isClamped,
  isRunActive,
  onOpenTool,
  step,
}: StepItemProps) {
  switch (step.kind) {
    case "note":
      return (
        <li className={s.stepItem} data-kind="note">
          <span aria-hidden="true" className={s.rail}>
            <span className={s.dot} />
          </span>
          <div className={s.body}>
            <div className={s.note} data-clamped={isClamped}>
              <Markdown>{step.content}</Markdown>
            </div>
          </div>
        </li>
      )
    case "thought":
      return <ThoughtItem step={step} />
    case "tool":
      return (
        <ToolItem
          isRunActive={isRunActive}
          step={step}
          onOpen={() => onOpenTool(step.tool)}
        />
      )
  }
}

function ToolItem({
  isRunActive,
  onOpen,
  step,
}: {
  isRunActive: boolean
  onOpen: () => void
  step: ToolStep
}) {
  const state = getToolCallState(step.tool, isRunActive)
  const now = useNow(state === "running")
  const error = state === "failed" ? getToolCallError(step.tool) : undefined
  const StateIcon = stateIcons[state]

  return (
    <li
      className={s.stepItem}
      data-kind="tool"
      data-state={state}
      data-testid="assistant-tool"
    >
      <span aria-hidden="true" className={s.rail}>
        <StateIcon />
      </span>
      <div className={s.body}>
        <button className={s.row} type="button" onClick={onOpen}>
          <span className={s.toolName}>{formatToolName(step.tool.name)}</span>
          <span className={s.detail}>
            {describeToolStep(step.tool, now, isRunActive)}
          </span>
        </button>
        {error ? <pre className={s.error}>{error}</pre> : null}
      </div>
    </li>
  )
}

function ThoughtItem({ step }: { step: ThoughtStep }) {
  const [isOpen, setIsOpen] = useState(false)

  if (step.isThinking) {
    return (
      <li className={s.stepItem} data-kind="thought" data-state="thinking">
        <span aria-hidden="true" className={s.rail}>
          <LoaderCircleIcon />
        </span>
        <div className={s.body}>
          <span className={s.thinking}>Thinking…</span>
          <p aria-live="off" className={s.preview}>
            {getThinkingPreview(step.thoughts)}
          </p>
        </div>
      </li>
    )
  }

  return (
    <li className={s.stepItem} data-kind="thought">
      <span aria-hidden="true" className={s.rail}>
        <LightbulbIcon />
      </span>
      <div className={s.body}>
        <button
          aria-expanded={isOpen}
          className={s.row}
          type="button"
          onClick={() => setIsOpen((value) => !value)}
        >
          <span className={s.label}>{getThinkingSummary(step.thinkingMs)}</span>
          {isOpen ? (
            <ChevronDownIcon aria-hidden="true" className={s.chevron} />
          ) : (
            <ChevronRightIcon aria-hidden="true" className={s.chevron} />
          )}
        </button>
        {isOpen ? (
          <div className={s.thoughts}>
            <Markdown>{step.thoughts}</Markdown>
          </div>
        ) : null}
      </div>
    </li>
  )
}

/** Trailing row while the model works on its next step. */
export function WorkingItem() {
  return (
    <li className={s.stepItem} data-kind="working" data-state="thinking">
      <span aria-hidden="true" className={s.rail}>
        <LoaderCircleIcon />
      </span>
      <div className={s.body}>
        <span className={s.thinking} data-testid="agent-steps-working">
          Working…
        </span>
      </div>
    </li>
  )
}
