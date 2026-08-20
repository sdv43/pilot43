import { parseModelProviderModelId } from "@/shared/model-provider-utils"
import {
  useChatMessageRunGet,
  useChatMessageSend,
} from "@/sidepanel/queries/chat"
import { useModelToolGet } from "@/sidepanel/queries/model"
import {
  buildChatSettingsFromToolsState,
  buildDefaultToolsState,
  mergeToolsStateWithDefaults,
} from "@/sidepanel/shared/tool-state"
import { useCurrentWorkspace } from "@/sidepanel/shared/useCurrentWorkspace"

import { toast } from "../../ToastProvider"
import { buildMessagePayload } from "../components/BottomBar/utils"
import { footerActions, useFooterStore } from "../store"
import { getActiveMessageRun } from "../utils"

export function useSendMessage() {
  const workspace = useCurrentWorkspace()
  const { attachments, editorValue, selectedModelId, toolsState } =
    useFooterStore()
  const selectedChatId = workspace?.lastSelectedChatId

  const { data: messageRuns } = useChatMessageRunGet(selectedChatId)
  const { data: tools = [] } = useModelToolGet()

  const { isPending, mutate: sendMessageMutation } = useChatMessageSend()

  const hasBlockingAttachmentState = attachments.some(
    (attachment) => attachment.isLoading || attachment.isError,
  )
  const activeMessageRun = getActiveMessageRun(messageRuns)

  const isSendDisabled =
    isPending ||
    Boolean(activeMessageRun) ||
    !workspace?.id ||
    !selectedModelId ||
    !editorValue.text.trim() ||
    hasBlockingAttachmentState

  const sendMessage = () => {
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

    sendMessageMutation(
      {
        chatId: workspace?.lastSelectedChatId ?? "",
        workspaceId: workspace.id,
        message: buildMessagePayload(editorValue, attachments),
        model: {
          name: modelName,
          providerId,
        },
        initialSettings: buildChatSettingsFromToolsState(resolvedToolsState),
      },
      {
        onSuccess: () => {
          footerActions.reset()
        },
        onError: (error) => {
          toast(`Error sending message: ${error.message}`, "error")
        },
      },
    )
  }

  return {
    sendMessage,
    isSendDisabled,
  }
}
