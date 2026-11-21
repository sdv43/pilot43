import type { MessageAssistantTool } from "@pilot43/protocol"

import { PlayIcon, ScissorsIcon } from "lucide-react"
import { Fragment, useLayoutEffect, useRef, useState } from "react"

import type { MessageHistoryProps } from "./types"

import {
  useChatGetByWorkspace,
  useChatMessageRunDeleteAfter,
  useChatMessageRunEdit,
  useChatMessageRunGet,
  useChatMessageRunResume,
  useChatMessageRunRetry,
} from "../../../../../queries/chat"
import { cn } from "../../../../../shared/cn"
import {
  useCurrentChatId,
  useCurrentWorkspace,
} from "../../../../../shared/useCurrentWorkspace"
import { Button } from "../../../Button"
import { ChatNotice } from "../../../ChatNotice"
import { Loader } from "../../../Loader"
import { toast } from "../../../ToastProvider"
import { EmptyChat } from "../EmptyChat"
import {
  ActivityIndicator,
  AssistantLabel,
  ContinuationPrompt,
  ErrorMessage,
  FollowupQuestion,
  HistoryDivider,
  MessageActions,
  RunContent,
  SummaryDivider,
  ToolCallDetailsDialog,
  UserMessage,
} from "./components"
import s from "./MessageHistory.module.css"
import {
  canResumeRun,
  getRunActivity,
  getRunCopyText,
  getRunMeta,
  isRunActive,
  isRunTruncated,
} from "./utils"

export function MessageHistory({ className }: MessageHistoryProps) {
  const chatId = useCurrentChatId()
  const { data: messageRuns, isLoading } = useChatMessageRunGet(chatId)
  const workspace = useCurrentWorkspace()
  const { data: chats } = useChatGetByWorkspace(workspace?.id)
  const chat = chats?.find(({ id }) => id === chatId)
  const summaryThroughRunId = chat?.historySummary?.throughRunId
  const { isPending: isRetrying, mutate: retryMessageRun } =
    useChatMessageRunRetry()
  const { isPending: isDeletingAfter, mutate: deleteMessageRunAfter } =
    useChatMessageRunDeleteAfter()
  const { isPending: isEditing, mutate: editMessageRun } =
    useChatMessageRunEdit()
  const { isPending: isResuming, mutate: resumeMessageRun } =
    useChatMessageRunResume()
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
  }, [messageRuns, chat?.isSummarisingHistory])

  function retry(runId: string) {
    retryMessageRun(runId, {
      onError: (error) => {
        toast(`Failed to retry message: ${error.message}`, "error")
      },
    })
  }

  function resume(runId: string) {
    resumeMessageRun(runId, {
      onError: (error) => {
        toast(`Failed to continue: ${error.message}`, "error")
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
        const isBusy = isRetrying || isResuming
        const onResume = canResumeRun(run, isLastRun)
          ? () => resume(run.id)
          : undefined
        // The label repeats only when the model changes between replies.
        const showLabel =
          runIndex === 0 ||
          run.modelMeta?.name !== messageRuns[runIndex - 1]?.modelMeta?.name

        return (
          <Fragment key={run.id}>
            <div className={s.run} data-testid="message-run">
              <UserMessage
                hasLaterRuns={!isLastRun}
                isRetrying={isRetrying || isEditing || isActive}
                message={run.userMessage}
                onEdit={(content) =>
                  editMessageRun(
                    { content, id: run.id, isLastRun },
                    {
                      onError: (error) => {
                        toast(
                          `Failed to edit message: ${error.message}`,
                          "error",
                        )
                      },
                    },
                  )
                }
                onRetry={isLastRun ? () => retry(run.id) : undefined}
              />

              <div className={s.assistant}>
                {showLabel ? (
                  <AssistantLabel modelName={run.modelMeta?.name} />
                ) : null}

                <RunContent run={run} onOpenTool={setOpenTool} />

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
                    isRetrying={isBusy}
                    onResume={onResume}
                    onRetry={() => retry(run.id)}
                  />
                ) : null}

                {run.status === "stopped" ? (
                  <div className={s.stoppedRow}>
                    <span className={s.stopped} data-testid="run-stopped">
                      {run.interrupted
                        ? "Generation interrupted"
                        : "Generation stopped"}
                    </span>
                    {onResume ? (
                      <Button
                        data-testid="run-resume"
                        disabled={isBusy}
                        icon={<PlayIcon />}
                        size="small"
                        variant="ghost"
                        onClick={onResume}
                      >
                        Continue
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                {isRunTruncated(run) ? (
                  <ChatNotice
                    data-testid="run-truncated"
                    icon={<ScissorsIcon />}
                    message="The reply was cut off: the model reached its output token limit."
                    tone="warning"
                  />
                ) : null}

                {run.status === "completed" ? (
                  <MessageActions
                    copyText={getRunCopyText(run)}
                    isRetrying={isBusy}
                    meta={getRunMeta(run)}
                    onRetry={isLastRun ? () => retry(run.id) : undefined}
                  />
                ) : null}
              </div>
            </div>

            {run.id === summaryThroughRunId ? (
              <SummaryDivider />
            ) : isLastRun ? null : (
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

      {chat?.isSummarisingHistory ? <SummaryDivider isWorking /> : null}

      <ToolCallDetailsDialog
        tool={openTool}
        onClose={() => setOpenTool(null)}
      />
    </div>
  )
}
