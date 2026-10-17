import { Badge } from "../../../../../components/Badge"
import { PermissionControl } from "../PermissionControl"
import s from "./PermissionToolRow.module.css"
import { type PermissionToolRowProps } from "./types"

export function PermissionToolRow({
  description,
  isCustom,
  name,
  onChange,
  value,
}: PermissionToolRowProps) {
  return (
    <div
      className={s.permissionToolRow}
      data-disabled={value === "disabled"}
      data-testid="permission-tool"
    >
      <div className={s.text}>
        <span className={s.name}>{name}</span>
        {description ? (
          <span className={s.description}>{description}</span>
        ) : null}
      </div>
      {isCustom ? <Badge>Custom</Badge> : null}
      <PermissionControl
        aria-label={`Permission for ${name}`}
        value={value}
        onChange={onChange}
      />
    </div>
  )
}
