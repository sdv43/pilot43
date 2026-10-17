import { PlusIcon } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router"

import {
  type ModelProvider,
  useModelProviderDelete,
  useModelProviderGet,
} from "../../../../queries/modelProvider"
import { paths } from "../../../../shared/routes"
import { Button } from "../../../components/Button"
import { Card } from "../../../components/Card"
import { ConfirmDialog } from "../../../components/ConfirmDialog"
import { SectionHeader } from "../../../components/SectionHeader"
import { toast } from "../../../components/ToastProvider"
import { ProviderRow } from "./components/ProviderRow"
import s from "./ProvidersSettings.module.css"

/** `/settings/providers` — configured model providers. */
export function ProvidersSettings() {
  const navigate = useNavigate()
  const { data: providers = [] } = useModelProviderGet()
  const { isPending, mutate: deleteProvider } = useModelProviderDelete()
  const [deleting, setDeleting] = useState<ModelProvider | null>(null)

  return (
    <div className={s.providersSettings}>
      <section aria-labelledby="settings-providers" className={s.section}>
        <SectionHeader
          action={
            <Button
              data-testid="add-provider"
              icon={<PlusIcon />}
              size="small"
              variant="ghost"
              onClick={() => void navigate(paths.settingsNew("providers"))}
            >
              Add provider
            </Button>
          }
          id="settings-providers"
          title={`Providers · ${providers.length}`}
        />
        {providers.length > 0 ? (
          <Card>
            {providers.map((provider) => (
              <ProviderRow
                key={provider.id}
                provider={provider}
                onDelete={() => setDeleting(provider)}
                onEdit={() =>
                  void navigate(paths.settingsItem("providers", provider.id))
                }
              />
            ))}
          </Card>
        ) : (
          <p className={s.empty}>
            Add an OpenAI, OpenRouter or Ollama provider to start chatting.
          </p>
        )}
      </section>
      <ConfirmDialog
        confirmLabel="Delete provider"
        isPending={isPending}
        open={!!deleting}
        title={`Delete “${deleting?.name ?? ""}”?`}
        onConfirm={() => {
          if (!deleting) {
            return
          }

          deleteProvider(deleting.id, {
            onError: (error) => {
              toast(`Failed to delete provider: ${error.message}`, "error")
            },
            onSuccess: () => setDeleting(null),
          })
        }}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <p>Chats keep their history, but can no longer use its models.</p>
      </ConfirmDialog>
    </div>
  )
}
