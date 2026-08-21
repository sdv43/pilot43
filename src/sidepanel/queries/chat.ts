import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { ChatSettings, Workspace } from "@/shared/api/entities"

import type { ApiClient, Args, Result } from "./types"

import { useApiClient } from "../app/components/ApiClientProvider/context"

export function useChatGetByWorkspace(workspaceId?: null | Workspace["id"]) {
  const apiClient = useApiClient()

  return useQuery({
    queryKey: ["chatGetByWorkspace", workspaceId],
    queryFn: async () => {
      if (!workspaceId) {
        throw new Error("Workspace ID is required")
      }

      return await apiClient.chatGetByWorkspace(workspaceId)
    },
    enabled: !!workspaceId,
  })
}

export function useChatDelete() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()

  return useMutation<Result<"chatDelete">, Error, Args<"chatDelete">>({
    mutationKey: ["chatDelete"],
    mutationFn: async (chatId) => {
      return await apiClient.chatDelete(chatId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["chatGetByWorkspace"],
      })
      void queryClient.invalidateQueries({ queryKey: ["workspaceGet"] })
      void queryClient.invalidateQueries({
        queryKey: ["chatTokenEstimateGet"],
      })
    },
  })
}

export function useChatMessageRunGet(chatId?: null | string) {
  const apiClient = useApiClient()

  return useQuery({
    queryKey: ["chatMessageRunGet", chatId],
    queryFn: async () => {
      if (!chatId) {
        throw new Error("Chat ID is required")
      }

      return await apiClient.chatMessageRunGet(chatId)
    },
    enabled: !!chatId,
  })
}

export function useChatMessageRunRetry() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()

  return useMutation<
    Result<"chatMessageRunRetry">,
    Error,
    Args<"chatMessageRunRetry">
  >({
    mutationKey: ["chatMessageRunRetry"],
    mutationFn: async (id) => {
      return await apiClient.chatMessageRunRetry(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chatMessageRunGet"] })
      void queryClient.invalidateQueries({ queryKey: ["chatGetByWorkspace"] })
      void queryClient.invalidateQueries({
        queryKey: ["chatTokenEstimateGet"],
      })
    },
  })
}

export function useChatMessageRunDeleteAfter() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()

  return useMutation<
    Result<"chatMessageRunDeleteAfter">,
    Error,
    Args<"chatMessageRunDeleteAfter">
  >({
    mutationKey: ["chatMessageRunDeleteAfter"],
    mutationFn: async (id) => {
      return await apiClient.chatMessageRunDeleteAfter(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chatMessageRunGet"] })
      void queryClient.invalidateQueries({ queryKey: ["chatGetByWorkspace"] })
      void queryClient.invalidateQueries({
        queryKey: ["chatTokenEstimateGet"],
      })
    },
  })
}

export function useChatMessageRunAnswer() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()

  return useMutation<
    Result<"chatMessageRunAnswer">,
    Error,
    { answer: string; messageRunId: string }
  >({
    mutationKey: ["chatMessageRunAnswer"],
    mutationFn: async ({ answer, messageRunId }) => {
      return await apiClient.chatMessageRunAnswer(messageRunId, answer)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chatMessageRunGet"] })
    },
  })
}

export function useChatMessageRunStop() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()

  return useMutation<
    Result<"chatMessageRunStop">,
    Error,
    Args<"chatMessageRunStop">
  >({
    mutationKey: ["chatMessageRunStop"],
    mutationFn: async (id) => {
      return await apiClient.chatMessageRunStop(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chatMessageRunGet"] })
      void queryClient.invalidateQueries({ queryKey: ["chatGetByWorkspace"] })
      void queryClient.invalidateQueries({
        queryKey: ["chatTokenEstimateGet"],
      })
    },
  })
}

export function useChatTokenEstimateGet(chatId?: null | string) {
  const apiClient = useApiClient()

  return useQuery({
    queryKey: ["chatTokenEstimateGet", chatId],
    queryFn: async () => {
      return await apiClient.chatTokenEstimateGet(chatId)
    },
  })
}

export function useChatMessageSend() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()

  return useMutation<
    Result<"chatMessageSend">,
    Error,
    {
      chatId: string
      message: Parameters<ApiClient["chatMessageSend"]>[1]
      model: Parameters<ApiClient["chatMessageSend"]>[2]
      workspaceId: Parameters<ApiClient["chatMessageSend"]>[3]
      initialSettings?: Parameters<ApiClient["chatMessageSend"]>[4]
    }
  >({
    mutationKey: ["chatMessageSend"],
    mutationFn: async ({
      chatId,
      message,
      model,
      workspaceId,
      initialSettings,
    }) => {
      return await apiClient.chatMessageSend(
        chatId,
        message,
        model,
        workspaceId,
        initialSettings,
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workspaceGet"] })
      void queryClient.invalidateQueries({ queryKey: ["chatGetByWorkspace"] })
      void queryClient.invalidateQueries({ queryKey: ["chatMessageRunGet"] })
      void queryClient.invalidateQueries({
        queryKey: ["chatTokenEstimateGet"],
      })
    },
  })
}

export function useChatSettingsUpdate() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()

  return useMutation<
    Result<"chatSettingsUpdate">,
    Error,
    { chatId: string; settings: ChatSettings }
  >({
    mutationKey: ["chatSettingsUpdate"],
    mutationFn: async ({ chatId, settings }) => {
      return await apiClient.chatSettingsUpdate(chatId, settings)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["chatGetByWorkspace"],
      })
    },
  })
}

export function useChatTitleUpdate() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()

  return useMutation<
    Result<"chatTitleUpdate">,
    Error,
    { chatId: string; title: string }
  >({
    mutationKey: ["chatTitleUpdate"],
    mutationFn: async ({ chatId, title }) => {
      return await apiClient.chatTitleUpdate(chatId, title)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["chatGetByWorkspace"],
      })
    },
  })
}

export function useChatTodoListClear() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()

  return useMutation<
    Result<"chatTodoListClear">,
    Error,
    Args<"chatTodoListClear">
  >({
    mutationKey: ["chatTodoListClear"],
    mutationFn: async (chatId) => {
      return await apiClient.chatTodoListClear(chatId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["chatGetByWorkspace"],
      })
    },
  })
}
