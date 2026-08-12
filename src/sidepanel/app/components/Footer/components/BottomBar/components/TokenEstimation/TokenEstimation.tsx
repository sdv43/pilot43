import { useChatTokenEstimateGet } from "@/sidepanel/queries/chat"
import { cn } from "@/sidepanel/shared/cn"
import { useCurrentWorkspace } from "@/sidepanel/shared/useCurrentWorkspace"

import { useFooterStore } from "../../../../store"
import { estimateDraftMessageTokenCount } from "../../utils"
import s from "./TokenEstimation.module.css"
import { formatEstimate } from "./utils"

export function TokenEstimation({ className }: { className?: string }) {
  const workspace = useCurrentWorkspace()
  const { data } = useChatTokenEstimateGet(workspace?.lastSelectedChatId)
  const editorValue = useFooterStore((state) => state.editorValue)
  const attachments = useFooterStore((state) => state.attachments)

  const storedEstimate = data ?? 0
  const draftEstimate = estimateDraftMessageTokenCount(editorValue, attachments)
  const estimate = storedEstimate + draftEstimate
  const formatted = formatEstimate(estimate, draftEstimate > 0)

  return (
    <span
      className={cn(s.tokenEstimate, className)}
      data-testid="token-estimation"
    >
      {storedEstimate ? formatted : "-"} tok
    </span>
  )
}
