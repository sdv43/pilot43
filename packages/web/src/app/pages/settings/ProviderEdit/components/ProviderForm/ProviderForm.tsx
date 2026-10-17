import { PlugZapIcon, TrashIcon } from "lucide-react"
import { type FormEvent, useState } from "react"
import { useNavigate } from "react-router"

import {
  type ModelProvider,
  useModelProviderCreate,
  useModelProviderDelete,
  useModelProviderModelGet,
  useModelProviderUpdate,
} from "../../../../../../queries/modelProvider"
import { paths } from "../../../../../../shared/routes"
import { Button } from "../../../../../components/Button"
import { ConfirmDialog } from "../../../../../components/ConfirmDialog"
import { ConnectionResult } from "../../../../../components/ConnectionResult"
import { Field } from "../../../../../components/Field"
import { Input } from "../../../../../components/Input"
import { SecretInput } from "../../../../../components/SecretInput"
import { SettingsSubpage } from "../../../../../components/SettingsSubpage"
import { toast } from "../../../../../components/ToastProvider"
import { useProviderTest } from "../../hooks/useProviderTest"
import {
  changeProviderType,
  createProviderDraft,
  isProviderComplete,
} from "../../utils"
import { ModelLevels } from "../ModelLevels"
import { ProviderTypePicker } from "../ProviderTypePicker"
import s from "./ProviderForm.module.css"
import { type ProviderFormProps } from "./types"
import { formatTestMessage } from "./utils"

export function ProviderForm({ provider }: ProviderFormProps) {
  const navigate = useNavigate()
  const backTo = paths.settings("providers")
  const [draft, setDraft] = useState<ModelProvider>(
    () => provider ?? createProviderDraft("openai"),
  )
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const { isTesting, reset, result, test } = useProviderTest()
  const { data: savedModels } = useModelProviderModelGet(
    provider?.type === "openai" ? provider.id : undefined,
  )
  const { isPending: isCreating, mutate: createProvider } =
    useModelProviderCreate()
  const { isPending: isUpdating, mutate: updateProvider } =
    useModelProviderUpdate()
  const { isPending: isDeleting, mutate: deleteProvider } =
    useModelProviderDelete()
  const modelNames =
    result?.models ?? savedModels?.map((model) => model.name) ?? []
  const canSubmit = isProviderComplete(draft)

  function change(next: ModelProvider) {
    setDraft(next)
    reset()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    const options = {
      onError: (error: Error) => {
        toast(`Failed to save provider: ${error.message}`, "error")
      },
      onSuccess: () => void navigate(backTo),
    }
    const named = { ...draft, name: draft.name.trim() }

    if (provider) {
      updateProvider(named, options)
    } else {
      createProvider(named, options)
    }
  }

  return (
    <SettingsSubpage
      backTo={backTo}
      footer={
        <>
          {provider ? (
            <Button
              icon={<TrashIcon />}
              variant="danger-ghost"
              onClick={() => setIsDeleteOpen(true)}
            >
              Delete
            </Button>
          ) : null}
          <span className={s.spacer} />
          <Button variant="secondary" onClick={() => void navigate(backTo)}>
            Cancel
          </Button>
          <Button
            data-testid="provider-save"
            disabled={!canSubmit || isCreating || isUpdating}
            type="submit"
          >
            {provider ? "Save changes" : "Save provider"}
          </Button>
        </>
      }
      title={provider ? `Edit provider · ${provider.name}` : "Add provider"}
      onSubmit={handleSubmit}
    >
      <div className={s.group}>
        <span className={s.label}>Provider</span>
        <ProviderTypePicker
          disabled={!!provider}
          value={draft.type}
          onChange={(type) => change(changeProviderType(draft, type))}
        />
      </div>

      <Field label="Display name">
        {(control) => (
          <Input
            {...control}
            data-testid="provider-name-input"
            value={draft.name}
            onChange={(event) => change({ ...draft, name: event.target.value })}
          />
        )}
      </Field>

      {draft.type === "ollama" ? (
        <Field helper="Address of the Ollama server" label="Host">
          {(control) => (
            <Input
              {...control}
              className={s.mono}
              data-testid="provider-host-input"
              value={draft.settings.host}
              onChange={(event) =>
                change({ ...draft, settings: { host: event.target.value } })
              }
            />
          )}
        </Field>
      ) : (
        <Field helper="Stored locally" label="API key">
          {(control) => (
            <SecretInput
              {...control}
              data-testid="provider-api-key-input"
              placeholder={draft.type === "openai" ? "sk-…" : "sk-or-…"}
              value={draft.settings.apiKey}
              onChange={(event) =>
                change({
                  ...draft,
                  settings: { ...draft.settings, apiKey: event.target.value },
                })
              }
            />
          )}
        </Field>
      )}

      {draft.type === "openai" ? (
        <Field
          helper="Optional — for proxies and OpenAI-compatible gateways"
          label="Base URL"
        >
          {(control) => (
            <Input
              {...control}
              className={s.mono}
              data-testid="provider-base-url-input"
              placeholder="https://api.openai.com/v1"
              value={draft.settings.host ?? ""}
              onChange={(event) =>
                change({
                  ...draft,
                  settings: {
                    ...draft.settings,
                    host: event.target.value || undefined,
                  },
                })
              }
            />
          )}
        </Field>
      ) : null}

      {result ? (
        <ConnectionResult
          isTesting={isTesting}
          items={result.models}
          message={formatTestMessage(result)}
          success={result.success}
          onRetest={() => test(draft)}
        />
      ) : (
        <Button
          className={s.test}
          data-testid="provider-test"
          disabled={!canSubmit || isTesting}
          icon={<PlugZapIcon />}
          size="small"
          variant="secondary"
          onClick={() => test(draft)}
        >
          {isTesting ? "Testing…" : "Test connection"}
        </Button>
      )}

      {draft.type === "openai" && modelNames.length > 0 ? (
        <ModelLevels
          modelNames={modelNames}
          models={draft.models}
          onChange={(models) => setDraft({ ...draft, models })}
        />
      ) : null}

      <ConfirmDialog
        confirmLabel="Delete provider"
        isPending={isDeleting}
        open={isDeleteOpen}
        title={`Delete “${provider?.name ?? ""}”?`}
        onConfirm={() =>
          provider &&
          deleteProvider(provider.id, {
            onError: (error) => {
              toast(`Failed to delete provider: ${error.message}`, "error")
            },
            onSuccess: () => void navigate(backTo),
          })
        }
        onOpenChange={setIsDeleteOpen}
      >
        <p>Chats keep their history, but can no longer use its models.</p>
      </ConfirmDialog>
    </SettingsSubpage>
  )
}
