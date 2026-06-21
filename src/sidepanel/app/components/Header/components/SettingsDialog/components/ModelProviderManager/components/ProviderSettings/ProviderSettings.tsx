import { useState } from "react"

import type { ModelProvider } from "@/sidepanel/queries/modelProvider"

import { Button } from "@/sidepanel/app/components/Button"
import { Dialog } from "@/sidepanel/app/components/Dialog"
import { Input } from "@/sidepanel/app/components/Input"
import {
  useModelProviderCheck,
  useModelProviderCreate,
  useModelProviderUpdate,
} from "@/sidepanel/queries/modelProvider"

import { OllamaProviderForm } from "./components/OllamaProviderForm"
import { OpenAIProviderForm } from "./components/OpenAIProviderForm"
import s from "./ProviderSettings.module.css"

const defaultMaxRequestPerMinute = 40

interface ProviderSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider: ModelProvider | null
}

function createDefaultProvider(): ModelProvider {
  return {
    id: "",
    maxRequestPerMinute: defaultMaxRequestPerMinute,
    name: "",
    type: "openai",
    settings: { apiKey: "" },
  }
}

export function ProviderSettings({
  open,
  onOpenChange,
  provider,
}: ProviderSettingsProps) {
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

  const handleClose = () => {
    onOpenChange(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <Dialog
      open={open}
      title={provider ? "Edit Provider" : "Add Provider"}
      onOpenChange={onOpenChange}
    >
      <form className={s.form} onSubmit={(e) => void handleSubmit(e)}>
        {formData.type === "ollama" && (
          <OllamaProviderForm
            provider={formData}
            onProviderChange={setFormData}
          />
        )}

        {formData.type === "openai" && (
          <OpenAIProviderForm
            provider={formData}
            onProviderChange={setFormData}
          />
        )}

        <div className={s.field}>
          <label className={s.label} htmlFor="maxRequestPerMinute">
            Max requests per minute
          </label>
          <Input
            id="maxRequestPerMinute"
            max={10000}
            min={1}
            name="maxRequestPerMinute"
            placeholder={`${defaultMaxRequestPerMinute}`}
            type="number"
            value={String(
              formData.maxRequestPerMinute ?? defaultMaxRequestPerMinute,
            )}
            onChange={(e) => {
              const parsed = Number(e.target.value)
              setFormData({
                ...formData,
                maxRequestPerMinute:
                  Number.isFinite(parsed) && parsed > 0
                    ? Math.floor(parsed)
                    : undefined,
              })
            }}
          />
          <p className={s.helpText}>
            Maximum number of requests this provider can process per minute.
            Defaults to {defaultMaxRequestPerMinute}.
          </p>
        </div>

        {error && <div className={s.error}>{error}</div>}

        {checkResult && (
          <div
            className={`${s.checkResult} ${checkResult.success ? s.success : s.error}`}
          >
            {checkResult.message}
          </div>
        )}

        <div className={s.formActions}>
          <Button
            disabled={isSubmitting || isChecking}
            type="button"
            variant="secondary"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            disabled={
              isSubmitting || isChecking || !formData.name || !formData.settings
            }
            type="button"
            variant="secondary"
            onClick={() => void handleCheckConnection()}
          >
            {isChecking ? "Checking..." : "Check Connection"}
          </Button>
          <Button
            disabled={isSubmitting || isChecking}
            type="submit"
            variant="primary"
          >
            {isSubmitting
              ? "Saving..."
              : provider
                ? "Save Changes"
                : "Add Provider"}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
