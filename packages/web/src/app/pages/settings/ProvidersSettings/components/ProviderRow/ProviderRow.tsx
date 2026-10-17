import { useModelProviderStatus } from "../../../../../../queries/modelProvider"
import { ActionMenu } from "../../../../../components/ActionMenu"
import { Badge } from "../../../../../components/Badge"
import { getProviderDetail, getProviderStatus } from "../../utils"
import s from "./ProviderRow.module.css"
import { type ProviderRowProps } from "./types"

export function ProviderRow({ onDelete, onEdit, provider }: ProviderRowProps) {
  const { data: status, isFetching } = useModelProviderStatus(provider)
  const badge = getProviderStatus(status, isFetching && !status)

  return (
    <div className={s.providerRow} data-testid="provider-row">
      <span aria-hidden="true" className={s.initial}>
        {provider.name.charAt(0).toUpperCase()}
      </span>
      <button className={s.text} type="button" onClick={onEdit}>
        <span className={s.name}>{provider.name}</span>
        <span className={s.detail}>{getProviderDetail(provider, status)}</span>
      </button>
      <Badge
        dot
        title={status?.success ? undefined : status?.message}
        tone={badge.tone}
      >
        {badge.label}
      </Badge>
      <ActionMenu
        aria-label={`Actions for ${provider.name}`}
        items={[
          { id: "edit", label: "Edit" },
          { id: "delete", label: "Delete", tone: "danger" },
        ]}
        onSelect={(id) => (id === "edit" ? onEdit() : onDelete())}
      />
    </div>
  )
}
