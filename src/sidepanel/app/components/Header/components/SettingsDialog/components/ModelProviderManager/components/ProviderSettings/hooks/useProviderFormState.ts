import { useState } from "react"

import type { ModelProvider } from "@/sidepanel/queries/modelProvider"

import {
  useModelProviderCheck,
  useModelProviderCreate,
  useModelProviderUpdate,
} from "@/sidepanel/queries/modelProvider"

import type { ProviderSettingsProps } from "../types"

import { createDefaultProvider, isProviderComplete } from "../utils"

export function useProviderFormState({
  onOpenChange,
  provider,
}: Pick<ProviderSettingsProps, "onOpenChange" | "provider">) {
  const createMutation = useModelProviderCreate()
  const updateMutation = useModelProviderUpdate()
  const checkMutation = useModelProviderCheck()
  const [formData, setFormData] = useState<ModelProvider>(
    () => provider ?? createDefaultProvider(),
  )
  const [error, setError] = useState<null | string>(null)
  const [checkResult, setCheckResult] = useState<null | {
    success: boolean
    message: string
  }>(null)

  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const isChecking = checkMutation.isPending
  const canSubmit = isProviderComplete(formData)

  const handleClose = () => {
    onOpenChange(false)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    try {
      if (provider) {
        await updateMutation.mutateAsync(formData)
      } else {
        await createMutation.mutateAsync(formData)
      }

      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save provider")
    }
  }

  const handleCheckConnection = async () => {
    setCheckResult(null)
    setError(null)

    try {
      const result = await checkMutation.mutateAsync(formData)
      setCheckResult(result)
    } catch (err) {
      setCheckResult({
        success: false,
        message: err instanceof Error ? err.message : "Connection check failed",
      })
    }
  }

  return {
    canSubmit,
    checkResult,
    error,
    formData,
    handleCheckConnection,
    handleClose,
    handleSubmit,
    isChecking,
    isSubmitting,
    setFormData,
  }
}
