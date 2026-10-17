import { parseModelProviderModelId } from "@pilot43/protocol"
import { SparkleIcon } from "lucide-react"

import { useMcpServerGet } from "../../../../../queries/mcpServer"
import { usePromptGet } from "../../../../../queries/prompt"
import { cn } from "../../../../../shared/cn"
import { useCurrentWorkspace } from "../../../../../shared/useCurrentWorkspace"
import { Badge } from "../../../Badge"
import { footerActions, useFooterStore } from "../../../Footer/store"
import { PromptOption } from "../../../PromptOption"
import { suggestedPromptCount } from "./const"
import s from "./EmptyChat.module.css"
import { type EmptyChatProps } from "./types"

/** Start of a new chat: workspace context and prompt suggestions. */
export function EmptyChat({ className }: EmptyChatProps) {
  const workspace = useCurrentWorkspace()
  const selectedModelId = useFooterStore((state) => state.selectedModelId)
  const { data: servers = [] } = useMcpServerGet()
  const { data: prompts = [] } = usePromptGet()
  const modelName = selectedModelId
    ? parseModelProviderModelId(selectedModelId).modelName
    : undefined
  const workspaceServers = servers.filter(
    (server) =>
      !workspace?.mcpServers || workspace.mcpServers.includes(server.name),
  )

  return (
    <div className={cn(s.emptyChat, className)} data-testid="empty-chat">
      <div className={s.hero}>
        <span aria-hidden="true" className={s.mark}>
          <SparkleIcon />
        </span>
        <h2 className={s.title}>How can I help?</h2>
        <p className={s.context}>
          {[workspace?.name, modelName].filter(Boolean).join(" · ")}
        </p>
        {workspaceServers.length > 0 ? (
          <div className={s.servers}>
            {workspaceServers.map((server) => (
              <Badge key={server.name} dot tone="success">
                {server.name}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      {prompts.length > 0 ? (
        <section
          aria-labelledby="empty-chat-suggestions"
          className={s.suggestions}
        >
          <h3 className={s.label} id="empty-chat-suggestions">
            Try asking
          </h3>
          {prompts.slice(0, suggestedPromptCount).map((prompt) => (
            <button
              key={prompt.id}
              className={s.suggestion}
              type="button"
              onClick={() =>
                footerActions.setEditorValue(
                  { commands: [], text: prompt.text },
                  prompt.text.length,
                )
              }
            >
              <PromptOption preview={prompt.text} title={prompt.title} />
            </button>
          ))}
        </section>
      ) : null}
    </div>
  )
}
