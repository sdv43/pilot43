import { parseModelProviderModelId } from "@pilot43/protocol"
import { ChevronRightIcon, SparkleIcon } from "lucide-react"
import { useNavigate } from "react-router"

import { useMcpServerGet } from "../../../../../queries/mcpServer"
import { useModelProviderGet } from "../../../../../queries/modelProvider"
import { usePromptGet } from "../../../../../queries/prompt"
import { cn } from "../../../../../shared/cn"
import { paths } from "../../../../../shared/routes"
import { useCurrentWorkspace } from "../../../../../shared/useCurrentWorkspace"
import { Badge } from "../../../Badge"
import { BrandLogo } from "../../../BrandLogo"
import { getPromptAttachmentTokens } from "../../../Footer/components/MessageEditor/components/Editor/prompt-insertion"
import { prepareValue } from "../../../Footer/components/MessageEditor/components/Editor/utils"
import { useCommands } from "../../../Footer/components/MessageEditor/hooks/useCommands"
import { footerActions, useFooterStore } from "../../../Footer/store"
import { PromptOption } from "../../../PromptOption"
import { providerChoices, suggestedPromptCount } from "./const"
import s from "./EmptyChat.module.css"
import { type EmptyChatProps } from "./types"

/**
 * Start of a new chat: workspace context and prompt suggestions. Without any
 * provider (first run) it asks to connect one instead (Figma screen 39).
 */
export function EmptyChat({ className }: EmptyChatProps) {
  const navigate = useNavigate()
  const workspace = useCurrentWorkspace()
  const { data: providers } = useModelProviderGet({ throwOnError: false })
  const selectedModelId = useFooterStore((state) => state.selectedModelId)
  const { data: servers = [] } = useMcpServerGet()
  const { data: prompts = [] } = usePromptGet()
  const commands = useCommands()
  const modelName = selectedModelId
    ? parseModelProviderModelId(selectedModelId).modelName
    : undefined
  const workspaceServers = servers.filter(
    (server) =>
      !workspace?.mcpServers || workspace.mcpServers.includes(server.name),
  )

  if (providers && providers.length === 0) {
    return (
      <div className={cn(s.emptyChat, className)} data-testid="empty-chat">
        <div className={s.hero}>
          <span aria-hidden="true" className={s.mark}>
            <SparkleIcon />
          </span>
          <h2 className={s.title}>Connect a model to start</h2>
          <p className={s.context}>
            Pilot43 runs on your own API keys or a local Ollama. Keys stay in
            this browser.
          </p>
        </div>
        <section
          aria-labelledby="empty-chat-providers"
          className={s.suggestions}
        >
          <h3 className={s.label} id="empty-chat-providers">
            Choose a provider
          </h3>
          {providerChoices.map((choice) => (
            <button
              key={choice.type}
              className={s.provider}
              data-testid="empty-chat-provider"
              type="button"
              onClick={() =>
                void navigate(
                  `${paths.settingsNew("providers")}?type=${choice.type}`,
                )
              }
            >
              <BrandLogo brand={choice.type} size={28} />
              <span className={s.providerText}>
                <span className={s.providerName}>{choice.name}</span>
                <span className={s.providerDetail}>{choice.detail}</span>
              </span>
              <ChevronRightIcon aria-hidden="true" className={s.chevron} />
            </button>
          ))}
        </section>
      </div>
    )
  }

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
              onClick={() => {
                const text = [
                  ...getPromptAttachmentTokens(prompt, commands),
                  prompt.text,
                ].join(" ")

                footerActions.setEditorValue(
                  prepareValue({ commands: [], text }, commands),
                  text.length,
                )
              }}
            >
              <PromptOption preview={prompt.text} title={prompt.title} />
            </button>
          ))}
        </section>
      ) : null}
    </div>
  )
}
