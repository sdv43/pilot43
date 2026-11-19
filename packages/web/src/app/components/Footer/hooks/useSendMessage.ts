import {
  encodeToolDenial,
  parseModelProviderModelId,
  toolApprovalAnswers,
} from "@pilot43/protocol"
import { useNavigate } from "react-router"

import {
  useChatMessageRunAnswer,
  useChatMessageRunGet,
  useChatMessageSend,
} from "../../../../queries/chat"
import { useModelToolGet } from "../../../../queries/model"
import { useModelProviderModelsGet } from "../../../../queries/modelProvider"
import { paths } from "../../../../shared/routes"
import {
  buildChatSettingsFromToolsState,
  buildDefaultToolsState,
  mergeToolsStateWithDefaults,
} from "../../../../shared/tool-state"
import {
  useCurrentChatId,
  useCurrentWorkspace,
} from "../../../../shared/useCurrentWorkspace"
import { toast } from "../../ToastProvider"
import {
  buildModelRunSettings as buildBottomBarModelRunSettings,
  buildMessagePayload,
} from "../components/BottomBar/utils"
import { toChatModelSelection } from "../model-selection"
import { footerActions, useFooterStore } from "../store"
import { getActiveMessageRun, getLastMessageRun } from "../utils"

export function useSendMessage() {
  const workspace = useCurrentWorkspace()
  const currentChatId = useCurrentChatId()
  const navigate = useNavigate()
  const {
    attachments,
    editorValue,
    selectedModelId,
    selectedReasoningEffort,
    thinkingEnabled,
    toolsState,
  } = useFooterStore()
  const selectedChatId = currentChatId

  const { data: messageRuns } = useChatMessageRunGet(selectedChatId)
  const { data: modelProviderGroups } = useModelProviderModelsGet()
  const { data: tools = [] } = useModelToolGet()

  const { isPending, mutate: sendMessageMutation } = useChatMessageSend()
  const { isPending: isAnswerPending, mutate: answerRun } =
    useChatMessageRunAnswer()

  const hasBlockingAttachmentState = attachments.some(
    (attachment) => attachment.isLoading || attachment.isError,
  )
  const activeMessageRun = getActiveMessageRun(messageRuns)
  const lastMessageRun = getLastMessageRun(messageRuns)
  // While the assistant waits on its questions, sending answers them.
  const questionRun =
    lastMessageRun?.status === "awaiting_input" &&
    lastMessageRun.followupQuestion
      ? lastMessageRun
      : null
  // While a tool call waits for approval, sending denies it with the text as
  // feedback for the model.
  const approvalRun =
    lastMessageRun?.status === "awaiting_input" && lastMessageRun.toolApproval
      ? lastMessageRun
      : null
  const isPausedOnOtherPrompt =
    lastMessageRun?.status === "awaiting_input" && !questionRun && !approvalRun

  const isSendDisabled =
    isPending ||
    isAnswerPending ||
    Boolean(activeMessageRun) ||
    isPausedOnOtherPrompt ||
    !workspace?.id ||
    !selectedModelId ||
    !editorValue.text.trim() ||
    hasBlockingAttachmentState

  /** Esc while a tool call waits: deny it without feedback. */
  const denyApproval = () => {
    if (!approvalRun) {
      return
    }

    answerRun(
      { answer: toolApprovalAnswers.deny, messageRunId: approvalRun.id },
      {
        onError: (error) => {
          toast(`Error denying the tool call: ${error.message}`, "error")
        },
      },
    )
  }

  const sendMessage = () => {
    if (approvalRun) {
      const feedback = editorValue.text.trim()

      if (!feedback) {
        return
      }

      answerRun(
        { answer: encodeToolDenial(feedback), messageRunId: approvalRun.id },
        {
          onError: (error) => {
            toast(`Error sending reply: ${error.message}`, "error")
          },
          onSuccess: () => footerActions.reset(),
        },
      )
      return
    }

    if (questionRun) {
      const answer = editorValue.text.trim()

      if (!answer) {
        return
      }

      answerRun(
        { answer, messageRunId: questionRun.id },
        {
          onError: (error) => {
            toast(`Error sending answer: ${error.message}`, "error")
          },
          onSuccess: () => footerActions.reset(),
        },
      )
      return
    }

    const { modelName, providerId } = parseModelProviderModelId(
      selectedModelId || "",
    )
    const resolvedToolsState =
      Object.keys(toolsState).length > 0
        ? mergeToolsStateWithDefaults(tools, toolsState)
        : buildDefaultToolsState(tools)

    if (
      activeMessageRun ||
      hasBlockingAttachmentState ||
      !workspace?.id ||
      !modelName ||
      !providerId ||
      !editorValue.text.trim()
    ) {
      return
    }

    const modelSettings = buildBottomBarModelRunSettings(
      modelProviderGroups,
      selectedModelId,
      selectedReasoningEffort,
      thinkingEnabled,
    )

    sendMessageMutation(
      {
        chatId: currentChatId ?? "",
        workspaceId: workspace.id,
        message: buildMessagePayload(editorValue, attachments),
        model: {
          name: modelName,
          providerId,
        },
        initialSettings: {
          ...buildChatSettingsFromToolsState(resolvedToolsState),
          model: toChatModelSelection(selectedModelId, modelSettings),
        },
        modelSettings,
      },
      {
        onSuccess: ({ chatId }) => {
          footerActions.reset()

          if (chatId !== currentChatId) {
            void navigate(paths.chat(workspace.id, chatId), { replace: true })
          }
        },
        onError: (error) => {
          toast(`Error sending message: ${error.message}`, "error")
        },
      },
    )
  }

  return {
    denyApproval,
    isAwaitingApproval: Boolean(approvalRun),
    sendMessage,
    isSendDisabled,
  }
}
