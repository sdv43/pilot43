import { BrainIcon, CopyIcon, WrenchIcon } from "lucide-react"

import {
  IconButton,
  Markdown,
  Spoiler,
  toast,
} from "@/sidepanel/app/components"
import { cn } from "@/sidepanel/shared/cn"

import type { AssistantMessageProps } from "./types"

import s from "./AssistantMessage.module.css"

export function AssistantMessage({
  message,
  className,
  modelName,
  ...props
}: AssistantMessageProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      toast("Copied to clipboard")
    } catch (err) {
      toast(`Failed to copy text: ${String(err)}`)
    }
  }

  return (
    <div
      {...props}
      className={cn(s.assistantMessageContainer, className)}
      data-testid="assistant-message"
    >
      {message.thoughts && (
        <Spoiler
          className={cn(s.message, s.assistantThoughts)}
          data-testid="assistant-thoughts"
          labelOpen={
            <>
              <span className={s.label}>
                <BrainIcon size={12} />
              </span>{" "}
              <span className={s.spoilerLabel}>
                {message.thoughts.substring(0, 150)}
              </span>
            </>
          }
          maxHeight={100}
        >
          <Markdown>{message.thoughts}</Markdown>
        </Spoiler>
      )}

      {message.tools.map((tool) => (
        <Spoiler
          key={`${tool.name}-${tool.args ? JSON.stringify(tool.args) : ""}`}
          className={cn(s.message, s.assistantTools)}
          data-testid="assistant-tool"
          labelOpen={
            <>
              <span className={s.label}>
                <WrenchIcon size={12} />
              </span>{" "}
              Call {tool.name}
            </>
          }
          maxHeight={100}
        >
          <div>
            <div>
              Args:
              {tool.args ? (
                <pre>{JSON.stringify(tool.args, null, 2)}</pre>
              ) : (
                <em>No args</em>
              )}
            </div>
            <div>
              Result:
              {tool.result ? (
                <pre>{JSON.stringify(tool.result, null, 2)}</pre>
              ) : (
                <em>No result</em>
              )}
            </div>
          </div>
        </Spoiler>
      ))}

      {message.content && (
        <div
          className={cn(s.message, s.assistantMessage)}
          data-testid="assistant-content"
        >
          <Markdown>{message.content}</Markdown>
        </div>
      )}

      <div className={s.meta} data-testid="assistant-message-meta">
        {message.content && (
          <IconButton
            className={s.metaButton}
            icon={<CopyIcon size={12} />}
            title="Copy message"
            variant="secondary"
            onClick={() => void handleCopy()}
          />
        )}

        {modelName && (
          <span
            className={cn(s.metaItem, s.metaItemModel)}
            data-testid="assistant-message-model"
            title={modelName}
          >
            {modelName}
          </span>
        )}

        {message.tokenCount !== undefined && (
          <span className={s.metaItem} data-testid="assistant-message-tokens">
            {message.tokenCount.toLocaleString()} tok
          </span>
        )}
      </div>
    </div>
  )
}
