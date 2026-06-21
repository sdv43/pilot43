import { useLayoutEffect, useRef } from "react"

import {
  useChatMessageRunDeleteAfter,
  useChatMessageRunGet,
  useChatMessageRunRetry,
} from "@/sidepanel/queries/chat"
import { cn } from "@/sidepanel/shared/cn"
import { useCurrentWorkspace } from "@/sidepanel/shared/useCurrentWorkspace"

import type { MessageHistoryProps } from "./types"

import { toast } from "../../../ToastProvider"
import {
  AssistantMessage,
  ContinuationPrompt,
  ErrorMessage,
  FollowupQuestion,
  HistoryDivider,
  UserAnswerMessage,
  UserMessage,
} from "./components"
import s from "./MessageHistory.module.css"

export function MessageHistory({ className, ...props }: MessageHistoryProps) {
  const workspace = useCurrentWorkspace()
  const { data: messageRuns, isLoading } = useChatMessageRunGet(
    workspace?.lastSelectedChatId,
  )
  const { isPending: isRetrying, mutate: retryMessageRun } =
    useChatMessageRunRetry()
  const { isPending: isDeletingAfter, mutate: deleteMessageRunAfter } =
    useChatMessageRunDeleteAfter()

  const scrollRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 50
  }

  useLayoutEffect(() => {
    if (isAtBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "instant",
      })
    }
  }, [messageRuns])

  const notice = isLoading
    ? "Loading..."
    : !workspace?.lastSelectedChatId
      ? "Send a message to start the chat"
      : !messageRuns || messageRuns.length === 0
        ? "Start the chat by sending a message"
        : null

  if (notice) {
    return (
      <div
        ref={scrollRef}
        className={cn(s.messageHistory, s.notice, className)}
        onScroll={handleScroll}
      >
        {notice}
      </div>
    )
  }

  const handleDeleteAfter = (runId: string) => {
    deleteMessageRunAfter(runId, {
      onError: (error) => {
        toast(`Failed to roll back history: ${error.message}`, "error")
      },
    })
  }

  return (
    <div
      {...props}
      ref={scrollRef}
      className={cn(s.messageHistory, className)}
      onScroll={handleScroll}
    >
      {(messageRuns ?? []).flatMap((run, runIndex, runs) => {
        const isLastRun = runIndex === runs.length - 1

        const runNode = (
          <div key={run.id} className={s.run}>
            {run.userMessage && (
              <UserMessage
                isRetrying={
                  isRetrying ||
                  run.status === "running" ||
                  run.status === "pending" ||
                  run.status === "awaiting_input"
                }
                message={run.userMessage}
                onRetry={
                  runIndex === (messageRuns?.length ?? 0) - 1
                    ? () => {
                        retryMessageRun(run.id, {
                          onError: (error) => {
                            toast(
                              `Failed to retry message: ${error.message}`,
                              "error",
                            )
                          },
                        })
                      }
                    : undefined
                }
              />
            )}

            {run.assistantMessages.map((msg) => {
              if (msg.role === "user_answer") {
                return <UserAnswerMessage key={msg.id} message={msg} />
              }

              return (
                <AssistantMessage
                  key={msg.id}
                  message={msg}
                  modelName={run.modelMeta.name}
                />
              )
            })}

            {run.error && (
              <ErrorMessage
                error={run.error}
                isRetrying={isRetrying}
                onRetry={() => {
                  retryMessageRun(run.id, {
                    onError: (error) => {
                      toast(
                        `Failed to retry message: ${error.message}`,
                        "error",
                      )
                    },
                  })
                }}
              />
            )}

            {run.followupQuestion && (
              <FollowupQuestion
                answered={run.status !== "awaiting_input"}
                messageRunId={run.id}
                question={run.followupQuestion}
              />
            )}

            {run.continuationPrompt && (
              <ContinuationPrompt
                answered={run.status !== "awaiting_input"}
                messageRunId={run.id}
              />
            )}

            {run.status === "pending" && (
              <div className={cn(s.message, s.waitingMessage)}>
                Waiting for the response...
              </div>
            )}

            {run.status === "running" && (
              <div className={cn(s.message, s.waitingMessage)}>
                Generating the response...
              </div>
            )}

            {run.status === "stopped" && (
              <div className={cn(s.message, s.waitingMessage)}>
                Generation stopped.
              </div>
            )}
          </div>
        )

        // Render a clickable divider after every run except the last one so the
        // user can roll the conversation back to that point and continue from
        // there. Clicking the divider deletes every message run below it.
        if (isLastRun) {
          return [runNode]
        }

        return [
          runNode,
          <HistoryDivider
            key={`divider-${run.id}`}
            isPending={isDeletingAfter}
            onDeleteAfter={() => handleDeleteAfter(run.id)}
          />,
        ]
      })}
    </div>
  )
}
