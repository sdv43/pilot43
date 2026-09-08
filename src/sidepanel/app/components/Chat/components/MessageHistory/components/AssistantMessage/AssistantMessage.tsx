import { BrainIcon, WrenchIcon } from "lucide-react"

import { Markdown, Spoiler } from "@/sidepanel/app/components"
import { cn } from "@/sidepanel/shared/cn"

import type { AssistantMessageProps } from "./types"

import s from "./AssistantMessage.module.css"
import { GeneratedFileBadge } from "./components/GeneratedFileBadge"
import { getGeneratedFileToolResults } from "./utils"

export function AssistantMessage({
  message,
  className,
  ...props
}: AssistantMessageProps) {
  const files = getGeneratedFileToolResults(message.tools)

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

      {message.tools
        .filter((tool) => tool.name !== "generate_file")
        .map((tool) => (
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

      {files.length > 0 && (
        <div className={s.files}>
          {files.map((file) => (
            <GeneratedFileBadge key={file.fileId} {...file} />
          ))}
        </div>
      )}
    </div>
  )
}
