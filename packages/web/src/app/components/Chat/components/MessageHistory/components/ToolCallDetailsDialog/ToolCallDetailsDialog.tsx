import { WrenchIcon } from "lucide-react"

import {
  getToolCallState,
  parseToolName,
  stringifyToolPayload,
} from "../../../../../../../shared/tool-call"
import { Badge } from "../../../../../Badge"
import { Button } from "../../../../../Button"
import { CodePanel } from "../../../../../CodePanel"
import { Dialog } from "../../../../../Dialog"
import s from "./ToolCallDetailsDialog.module.css"
import { type ToolCallDetailsDialogProps } from "./types"
import {
  describeOutputSize,
  describeToolRun,
  formatTime,
  getToolOutput,
  stateBadges,
} from "./utils"

/** Input and output of a tool call. */
export function ToolCallDetailsDialog({
  onClose,
  tool,
}: ToolCallDetailsDialogProps) {
  const { server, tool: toolName } = parseToolName(tool?.name ?? "")
  const badge = stateBadges[tool ? getToolCallState(tool) : "running"]
  const output = tool ? getToolOutput(tool) : undefined
  const argumentCount = Object.keys(tool?.args ?? {}).length

  return (
    <Dialog
      className={s.toolCallDetailsDialog}
      data-testid="tool-call-details"
      footer={
        <>
          <span className={s.called}>
            {tool?.startedAt ? `Called at ${formatTime(tool.startedAt)}` : null}
          </span>
          <Button size="small" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </>
      }
      open={!!tool}
      title={
        <span className={s.title}>
          <span aria-hidden="true" className={s.icon}>
            <WrenchIcon />
          </span>
          <span className={s.titleText}>
            <span className={s.tool}>{toolName}</span>
            <span className={s.source}>
              {server ? `${server} · MCP server` : "Built-in tool"}
            </span>
          </span>
        </span>
      }
      onOpenChange={(open) => !open && onClose()}
    >
      {tool ? (
        <div className={s.body}>
          <div className={s.status}>
            <Badge dot tone={badge.tone}>
              {badge.label}
            </Badge>
            <span className={s.statusText}>{describeToolRun(tool)}</span>
          </div>
          <CodePanel
            code={stringifyToolPayload(tool.args)}
            data-testid="tool-call-input"
            label="Input"
            meta={`${argumentCount} ${argumentCount === 1 ? "argument" : "arguments"}`}
          />
          {output?.text ? (
            <CodePanel
              code={output.text}
              data-testid="tool-call-output"
              label={output.isError ? "Error" : "Output"}
              maxLines={14}
              meta={
                output.isError ? undefined : describeOutputSize(output.text)
              }
              tone={output.isError ? "danger" : "default"}
            />
          ) : null}
        </div>
      ) : null}
    </Dialog>
  )
}
