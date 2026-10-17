import type { MessageAssistantTool } from "@pilot43/protocol"

import { Fragment, useLayoutEffect, useRef, useState } from "react"

import type { MessageHistoryProps } from "./types"

import {
  useChatMessageRunDeleteAfter,
  useChatMessageRunGet,
  useChatMessageRunRetry,
} from "../../../../../queries/chat"
import { cn } from "../../../../../shared/cn"
import { useCurrentChatId } from "../../../../../shared/useCurrentWorkspace"
import { Loader } from "../../../Loader"
import { toast } from "../../../ToastProvider"
import { EmptyChat } from "../EmptyChat"
import {
  ActivityIndicator,
  AssistantLabel,
  AssistantMessage,
  ContinuationPrompt,
  ErrorMessage,
  FollowupQuestion,
  HistoryDivider,
  MessageActions,
  ToolCallDetailsDialog,
  UserAnswerMessage,
  UserMessage,
} from "./components"
import s from "./MessageHistory.module.css"
import {
  getRunActivity,
  getRunCopyText,
  getRunMeta,
  isRunActive,
} from "./utils"

export function MessageHistory({ className }: MessageHistoryProps) {
  const chatId = useCurrentChatId()
  const { data: messageRuns, isLoading } = useChatMessageRunGet(chatId)
  const { isPending: isRetrying, mutate: retryMessageRun } =
    useChatMessageRunRetry()
  const { isPending: isDeletingAfter, mutate: deleteMessageRunAfter } =
    useChatMessageRunDeleteAfter()
  const [openTool, setOpenTool] = useState<MessageAssistantTool | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

  useLayoutEffect(() => {
    if (isAtBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTo({
        behavior: "instant",
        top: scrollRef.current.scrollHeight,
      })
    }
  }, [messageRuns])

  function retry(runId: string) {
    retryMessageRun(runId, {
      onError: (error) => {
        toast(`Failed to retry message: ${error.message}`, "error")
      },
    })
  }

  if (chatId && isLoading) {
    return (
      <div className={cn(s.messageHistory, s.loading, className)}>
        <Loader size={20} />
      </div>
    )
  }

  if (!chatId || !messageRuns || messageRuns.length === 0) {
    return <EmptyChat className={className} />
  }

  return (
    <div
      ref={scrollRef}
      className={cn(s.messageHistory, className)}
      data-testid="message-history"
      onScroll={() => {
        const element = scrollRef.current

        if (element) {
          isAtBottomRef.current =
            element.scrollHeight - element.scrollTop - element.clientHeight < 50
        }
      }}
    >
      {messageRuns.map((run, runIndex) => {
        const isLastRun = runIndex === messageRuns.length - 1
        const isActive = isRunActive(run)
        const activity = getRunActivity(run)
        const isAwaiting = run.status === "awaiting_input"

        return (
          <Fragment key={run.id}>
            <div className={s.run} data-testid="message-run">
              <UserMessage
                isRetrying={isRetrying || isActive}
                message={run.userMessage}
                onRetry={isLastRun ? () => retry(run.id) : undefined}
              />

              <div className={s.assistant}>
                <AssistantLabel modelName={run.modelMeta?.name} />

                {run.assistantMessages.map((message, index) =>
                  message.role === "user_answer" ? (
                    <UserAnswerMessage key={message.id} message={message} />
                  ) : (
                    <AssistantMessage
                      key={message.id}
                      isStreaming={
                        isActive && index === run.assistantMessages.length - 1
                      }
                      message={message}
                      messageRunId={run.id}
                      onOpenTool={setOpenTool}
                    />
                  ),
                )}

                {run.followupQuestion && isAwaiting ? (
                  <FollowupQuestion
                    key={run.followupQuestion.question}
                    messageRunId={run.id}
                    question={run.followupQuestion}
                  />
                ) : null}

                {run.continuationPrompt && isAwaiting ? (
                  <ContinuationPrompt
                    messageRunId={run.id}
                    prompt={run.continuationPrompt}
                  />
                ) : null}

                {activity ? <ActivityIndicator {...activity} /> : null}

                {run.error ? (
                  <ErrorMessage
                    error={run.error}
                    isRetrying={isRetrying}
                    onRetry={() => retry(run.id)}
                  />
                ) : null}

                {run.status === "stopped" ? (
                  <span className={s.stopped} data-testid="run-stopped">
                    Generation stopped
                  </span>
                ) : null}

                {run.status === "completed" ? (
                  <MessageActions
                    copyText={getRunCopyText(run)}
                    isRetrying={isRetrying}
                    meta={getRunMeta(run)}
                    onRetry={isLastRun ? () => retry(run.id) : undefined}
                  />
                ) : null}
              </div>
            </div>

            {isLastRun ? null : (
              <HistoryDivider
                isPending={isDeletingAfter}
                onDeleteAfter={() =>
                  deleteMessageRunAfter(run.id, {
                    onError: (error) => {
                      toast(
                        `Failed to roll back history: ${error.message}`,
                        "error",
                      )
                    },
                  })
                }
              />
            )}
          </Fragment>
        )
      })}

      <ToolCallDetailsDialog
        tool={openTool}
        onClose={() => setOpenTool(null)}
      />
    </div>
  )
}
