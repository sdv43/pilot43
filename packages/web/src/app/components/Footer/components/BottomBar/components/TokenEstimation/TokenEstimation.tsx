import { useChatTokenEstimateGet } from "../../../../../../../queries/chat"
import { cn } from "../../../../../../../shared/cn"
import { useCurrentChatId } from "../../../../../../../shared/useCurrentWorkspace"
import { useFooterStore } from "../../../../store"
import { estimateDraftMessageTokenCount } from "../../utils"
import s from "./TokenEstimation.module.css"
import { formatEstimate } from "./utils"

export function TokenEstimation({ className }: { className?: string }) {
  const currentChatId = useCurrentChatId()
  const { data } = useChatTokenEstimateGet(currentChatId)
  const editorValue = useFooterStore((state) => state.editorValue)
  const attachments = useFooterStore((state) => state.attachments)

  const storedEstimate = data ?? 0
  const draftEstimate = estimateDraftMessageTokenCount(editorValue, attachments)
  const estimate = storedEstimate + draftEstimate
  const formatted = formatEstimate(estimate, true)

  return (
    <span
      className={cn(s.tokenEstimate, className)}
      data-testid="token-estimation"
    >
      {estimate > 0 ? `${formatted} tokens` : null}
    </span>
  )
}
