import { EditIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { useId, useState } from "react"

import type { ModelProvider } from "@/sidepanel/queries/modelProvider"

import { Badge } from "@/sidepanel/app/components/Badge"
import { Button } from "@/sidepanel/app/components/Button"
import { IconButton } from "@/sidepanel/app/components/IconButton"
import { Loader } from "@/sidepanel/app/components/Loader"
import { toast } from "@/sidepanel/app/components/ToastProvider"
import {
  useModelProviderDelete,
  useModelProviderGet,
} from "@/sidepanel/queries/modelProvider"

import { ProviderSettings } from "./components/ProviderSettings"
import s from "./ModelProviderManager.module.css"

export function ModelProviderManager() {
  const {
    data: providers = [],
    isLoading,
    error: queryError,
  } = useModelProviderGet({ throwOnError: false })
  const deleteMutation = useModelProviderDelete()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<ModelProvider | null>(
    null,
  )

  const handleOpenDialog = (provider?: ModelProvider) => {
    setEditingProvider(provider ?? null)
    setIsDialogOpen(true)
  }

  const handleDelete = async (provider: ModelProvider) => {
    if (
      !window.confirm(`Are you sure you want to delete "${provider.name}"?`)
    ) {
      return
    }

    try {
      await deleteMutation.mutateAsync(provider.id)
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to delete provider",
        "error",
      )
    }
  }

  const titleId = useId()

  return (
    <section aria-labelledby={titleId} className={s.container}>
      <div className={s.header}>
        <h3 className={s.title} id={titleId}>
          Model Providers
        </h3>
        <Button
          icon={<PlusIcon size={14} />}
          variant="secondary"
          onClick={() => handleOpenDialog()}
        >
          Provider
        </Button>
      </div>

      {isLoading && (
        <div className={s.loading}>
          <Loader size={13} /> Loading providers...
        </div>
      )}

      {!isLoading && queryError && (
        <div className={s.error}>
          Cannot load providers: {queryError.message}
        </div>
      )}

      {!isLoading && !queryError && providers.length === 0 && (
        <div className={s.empty}>No model providers configured yet</div>
      )}

      {!isLoading && !queryError && providers.length > 0 && (
        <ul className={s.list}>
          {providers.map((provider) => (
            <li key={provider.id} className={s.item}>
              <div className={s.info}>
                <div className={s.name}>
                  {provider.name}
                  <Badge>{provider.type}</Badge>
                </div>
              </div>

              <div className={s.actions}>
                <IconButton
                  aria-label={`Edit ${provider.name}`}
                  icon={<EditIcon size={12} />}
                  variant="secondary"
                  onClick={() => handleOpenDialog(provider)}
                />
                <IconButton
                  aria-label={`Delete ${provider.name}`}
                  icon={<Trash2Icon size={12} />}
                  variant="secondary"
                  onClick={() => void handleDelete(provider)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <ProviderSettings
        key={isDialogOpen ? (editingProvider?.id ?? "new") : "closed"}
        open={isDialogOpen}
        provider={editingProvider}
        onOpenChange={setIsDialogOpen}
      />
    </section>
  )
}
