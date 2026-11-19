import { useModelProviderStatus } from "../../../../../../queries/modelProvider"
import { ActionMenu } from "../../../../../components/ActionMenu"
import { Badge } from "../../../../../components/Badge"
import {
  BrandLogo,
  getProviderBrand,
  getUrlBrand,
} from "../../../../../components/BrandLogo"
import { getProviderDetail, getProviderStatus } from "../../utils"
import s from "./ProviderRow.module.css"
import { type ProviderRowProps } from "./types"

export function ProviderRow({ onDelete, onEdit, provider }: ProviderRowProps) {
  const { data: status, isFetching } = useModelProviderStatus(provider)
  const badge = getProviderStatus(status, isFetching && !status)

  return (
    <div className={s.providerRow} data-testid="provider-row">
      <BrandLogo
        brand={
          provider.type === "openai" && provider.settings.host
            ? getUrlBrand(provider.settings.host)
            : getProviderBrand(provider.type)
        }
        size={32}
      />
      <button className={s.text} type="button" onClick={onEdit}>
        <span className={s.titleRow}>
          <span className={s.name}>{provider.name}</span>
          <Badge
            dot
            title={status?.success ? undefined : status?.message}
            tone={badge.tone}
          >
            {badge.label}
          </Badge>
        </span>
        <span
          className={s.detail}
          title={status?.success ? undefined : status?.message}
        >
          {getProviderDetail(provider, status)}
        </span>
      </button>
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
