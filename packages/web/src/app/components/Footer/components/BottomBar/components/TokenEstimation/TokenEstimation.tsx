import { useChatTokenEstimateGet } from "../../../../../../../queries/chat"
import { useModelProviderModelsGet } from "../../../../../../../queries/modelProvider"
import { cn } from "../../../../../../../shared/cn"
import { useCurrentChatId } from "../../../../../../../shared/useCurrentWorkspace"
import { useFooterStore } from "../../../../store"
import {
  estimateDraftMessageTokenCount,
  getModelProviderModel,
} from "../../utils"
import s from "./TokenEstimation.module.css"
import { formatEstimate, getContextUsage } from "./utils"

/**
 * Size of the next request; with a known context window it shows
 * "12.4k / 200k" and a ring that turns amber from 80%.
 */
export function TokenEstimation({ className }: { className?: string }) {
  const currentChatId = useCurrentChatId()
  const { data } = useChatTokenEstimateGet(currentChatId)
  const editorValue = useFooterStore((state) => state.editorValue)
  const attachments = useFooterStore((state) => state.attachments)
  const selectedModelId = useFooterStore((state) => state.selectedModelId)
  const { data: groups } = useModelProviderModelsGet()
  const contextWindow = getModelProviderModel(groups, selectedModelId)?.model
    .contextWindow

  const storedEstimate = data ?? 0
  const draftEstimate = estimateDraftMessageTokenCount(editorValue, attachments)
  const estimate = storedEstimate + draftEstimate
  const usage = getContextUsage(estimate, contextWindow)

  if (estimate <= 0) {
    return (
      <span
        className={cn(s.tokenEstimate, className)}
        data-testid="token-estimation"
      />
    )
  }

  return (
    <span
      className={cn(s.tokenEstimate, className)}
      data-level={usage?.isHigh ? "high" : "normal"}
      data-testid="token-estimation"
      title={
        usage?.isHigh
          ? "The context is almost full. Start a new chat to keep answers accurate."
          : "Approximate size of the next request: the chat as measured by the provider for the last reply, plus your draft (about 4 characters per token)"
      }
    >
      {usage ? (
        <svg aria-hidden="true" className={s.ring} viewBox="0 0 12 12">
          <circle className={s.track} cx="6" cy="6" r="4.5" />
          <circle
            className={s.used}
            cx="6"
            cy="6"
            pathLength="100"
            r="4.5"
            strokeDasharray={`${usage.percent} 100`}
          />
        </svg>
      ) : null}
      {usage
        ? `${formatEstimate(estimate, false)} / ${formatEstimate(contextWindow ?? 0, false)}`
        : `${formatEstimate(estimate, true)} tokens`}
    </span>
  )
}
