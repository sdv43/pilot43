import { Button } from "@/sidepanel/app/components/Button"
import { Dialog } from "@/sidepanel/app/components/Dialog"
import { Input } from "@/sidepanel/app/components/Input"

import type { ProviderSettingsProps } from "./types"

import { OllamaProviderForm } from "./components/OllamaProviderForm"
import { OpenAIProviderForm } from "./components/OpenAIProviderForm"
import { OpenRouterProviderForm } from "./components/OpenRouterProviderForm"
import { defaultMaxRequestPerMinute } from "./const"
import { useProviderFormState } from "./hooks/useProviderFormState"
import s from "./ProviderSettings.module.css"

export function ProviderSettings({
  open,
  onOpenChange,
  provider,
}: ProviderSettingsProps) {
  const {
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
  } = useProviderFormState({ onOpenChange, provider })

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

        {formData.type === "openrouter" && (
          <OpenRouterProviderForm
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
            disabled={isSubmitting || isChecking || !canSubmit}
            type="button"
            variant="secondary"
            onClick={() => void handleCheckConnection()}
          >
            {isChecking ? "Checking..." : "Check Connection"}
          </Button>
          <Button
            disabled={isSubmitting || isChecking || !canSubmit}
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
