import { toolApprovalAnswers } from "@pilot43/protocol"
import { ChevronRightIcon, ShieldQuestionIcon } from "lucide-react"

import { useChatMessageRunAnswer } from "../../../../../../../queries/chat"
import {
  formatToolName,
  stringifyToolPayload,
} from "../../../../../../../shared/tool-call"
import { Button } from "../../../../../Button"
import { HighlightedCode } from "../../../../../Markdown/components/CodeBlock"
import { toast } from "../../../../../ToastProvider"
import s from "./ToolApprovalCard.module.css"
import { type ToolApprovalCardProps } from "./types"

/** A tool call waiting for the user to allow or deny it. */
export function ToolApprovalCard({
  messageRunId,
  onOpen,
  tool,
}: ToolApprovalCardProps) {
  const { isPending, mutate: answerRun } = useChatMessageRunAnswer()

  function answer(value: string) {
    answerRun(
      { answer: value, messageRunId },
      {
        onError: (error) => {
          toast(`Failed to answer: ${error.message}`, "error")
        },
      },
    )
  }

  return (
    <div className={s.toolApprovalCard} data-testid="tool-approval">
      <button className={s.header} type="button" onClick={onOpen}>
        <ShieldQuestionIcon aria-hidden="true" className={s.icon} />
        <span className={s.text}>
          <span className={s.name}>{formatToolName(tool.name)}</span>
          <span className={s.detail}>Set to “Ask” in this workspace</span>
        </span>
        <ChevronRightIcon aria-hidden="true" className={s.chevron} />
      </button>
      <div className={s.body}>
        <span className={s.label}>Arguments</span>
        <div className={s.code}>
          <HighlightedCode
            code={stringifyToolPayload(tool.args)}
            customStyle={{ background: "transparent", padding: 0 }}
            language="json"
          />
        </div>
      </div>
      <div className={s.actions}>
        <Button
          data-testid="tool-approval-deny"
          disabled={isPending}
          size="small"
          variant="secondary"
          onClick={() => answer(toolApprovalAnswers.deny)}
        >
          Deny
        </Button>
        <span className={s.spacer} />
        <Button
          data-testid="tool-approval-always"
          disabled={isPending}
          size="small"
          title="Allow this tool without asking in this workspace"
          variant="ghost"
          onClick={() => answer(toolApprovalAnswers.alwaysAllow)}
        >
          Always allow
        </Button>
        <Button
          data-testid="tool-approval-allow"
          disabled={isPending}
          size="small"
          onClick={() => answer(toolApprovalAnswers.allowOnce)}
        >
          Allow once
        </Button>
      </div>
    </div>
  )
}
