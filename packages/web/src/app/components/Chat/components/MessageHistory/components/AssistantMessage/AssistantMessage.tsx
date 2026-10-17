import { Markdown } from "../../../../../Markdown"
import { GeneratedFileCard } from "../GeneratedFileCard"
import { ThinkingBlock } from "../ThinkingBlock"
import { ToolApprovalCard } from "../ToolApprovalCard"
import { ToolCallRow } from "../ToolCallRow"
import s from "./AssistantMessage.module.css"
import { type AssistantMessageProps } from "./types"
import { getGeneratedFileToolResults, getVisibleTools } from "./utils"

export function AssistantMessage({
  isStreaming,
  message,
  messageRunId,
  onOpenTool,
}: AssistantMessageProps) {
  const files = getGeneratedFileToolResults(message.tools)

  return (
    <div className={s.assistantMessage} data-testid="assistant-message">
      {message.thoughts ? (
        <ThinkingBlock
          isThinking={isStreaming && !message.content}
          thoughts={message.thoughts}
        />
      ) : null}

      {message.content ? (
        <div className={s.content} data-testid="assistant-content">
          <Markdown>{message.content}</Markdown>
        </div>
      ) : null}

      {getVisibleTools(message.tools).map((tool, index) =>
        tool.status === "awaiting_approval" ? (
          <ToolApprovalCard
            // eslint-disable-next-line @eslint-react/no-array-index-key -- calls saved by older versions have no id; calls never reorder
            key={tool.id ?? index}
            messageRunId={messageRunId}
            tool={tool}
            onOpen={() => onOpenTool(tool)}
          />
        ) : (
          <ToolCallRow
            // eslint-disable-next-line @eslint-react/no-array-index-key -- calls saved by older versions have no id; calls never reorder
            key={tool.id ?? index}
            tool={tool}
            onOpen={() => onOpenTool(tool)}
          />
        ),
      )}

      {files.map((file) => (
        <GeneratedFileCard key={file.fileId} {...file} />
      ))}
    </div>
  )
}
