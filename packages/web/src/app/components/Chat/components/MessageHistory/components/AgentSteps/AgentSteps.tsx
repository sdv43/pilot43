import {
  ChevronDownIcon,
  ChevronRightIcon,
  LightbulbIcon,
  ListChecksIcon,
  ServerIcon,
  WrenchIcon,
} from "lucide-react"
import { useState } from "react"

import { BrandLogo, getNameBrand } from "../../../../../BrandLogo"
import { ThinkingBlock } from "../ThinkingBlock"
import s from "./AgentSteps.module.css"
import { StepItem, WorkingItem } from "./components/StepItem"
import { type AgentStepsProps } from "./types"
import {
  countFailedSteps,
  getStepSources,
  getStepsSummary,
  LIVE_STEP_COUNT,
  type StepSource,
} from "./utils"

/**
 * Reasoning, interim notes and tool calls between the prompt and the answer
 * (Figma "Agent steps — Rolling timeline"). While the agent works, a timeline
 * shows the latest few steps; then it folds into a one-line summary that
 * opens the whole chain.
 */
export function AgentSteps({
  isLive,
  isRunActive,
  isWorking,
  onOpenTool,
  steps,
}: AgentStepsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [first] = steps

  // A lone thought keeps the plain "Thought for N s" block.
  if (steps.length === 1 && first?.kind === "thought" && !isWorking) {
    return (
      <ThinkingBlock
        isThinking={first.isThinking}
        thinkingMs={first.thinkingMs}
        thoughts={first.thoughts}
      />
    )
  }

  // A single step has nothing to fold.
  const isFoldable = steps.length > 1
  const isExpanded = !isFoldable || isOpen
  const visibleSteps = isExpanded
    ? steps
    : isLive
      ? steps.slice(-LIVE_STEP_COUNT)
      : []
  const hiddenCount = steps.length - visibleSteps.length
  const failedCount = countFailedSteps(steps, isRunActive)

  return (
    <div className={s.agentSteps} data-live={isLive} data-testid="agent-steps">
      {isFoldable && (isOpen || !isLive) ? (
        <button
          aria-expanded={isOpen}
          className={s.toggle}
          data-testid="agent-steps-summary"
          type="button"
          onClick={() => setIsOpen((value) => !value)}
        >
          <span aria-hidden="true" className={s.sources}>
            {getStepSources(steps).map((source) => (
              <SourceLogo key={getSourceKey(source)} source={source} />
            ))}
          </span>
          <span>{getStepsSummary(steps)}</span>
          {failedCount > 0 ? (
            <span className={s.failed}>· {failedCount} failed</span>
          ) : null}
          {isOpen ? (
            <ChevronDownIcon aria-hidden="true" className={s.chevron} />
          ) : (
            <ChevronRightIcon aria-hidden="true" className={s.chevron} />
          )}
        </button>
      ) : hiddenCount > 0 ? (
        <button
          aria-expanded={false}
          className={s.toggle}
          data-testid="agent-steps-earlier"
          type="button"
          onClick={() => setIsOpen(true)}
        >
          <ListChecksIcon aria-hidden="true" className={s.listIcon} />
          <span>
            {hiddenCount} earlier {hiddenCount === 1 ? "step" : "steps"}
          </span>
          <ChevronDownIcon aria-hidden="true" className={s.chevron} />
        </button>
      ) : null}

      {visibleSteps.length > 0 || isWorking ? (
        <ol aria-live="off" className={s.timeline}>
          {visibleSteps.map((step) => (
            <StepItem
              key={step.id}
              isClamped={isLive && !isExpanded}
              isRunActive={isRunActive}
              step={step}
              onOpenTool={onOpenTool}
            />
          ))}
          {isWorking ? <WorkingItem /> : null}
        </ol>
      ) : null}
    </div>
  )
}

function getSourceKey(source: StepSource) {
  return source.kind === "server" ? `server:${source.name}` : source.kind
}

function SourceLogo({ source }: { source: StepSource }) {
  switch (source.kind) {
    case "server":
      return (
        <BrandLogo
          brand={getNameBrand(source.name)}
          className={s.sourceLogo}
          fallback={ServerIcon}
          size={16}
        />
      )
    case "thoughts":
      return (
        <BrandLogo
          brand={null}
          className={s.sourceLogo}
          fallback={LightbulbIcon}
          size={16}
        />
      )
    case "tools":
      return (
        <BrandLogo
          brand={null}
          className={s.sourceLogo}
          fallback={WrenchIcon}
          size={16}
        />
      )
  }
}
