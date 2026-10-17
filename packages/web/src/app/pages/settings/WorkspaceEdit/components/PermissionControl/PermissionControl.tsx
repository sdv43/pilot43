import { SegmentedControl } from "../../../../../components/SegmentedControl"
import { compactPermissionOptions, permissionOptions } from "../../const"
import { type PermissionControlProps } from "./types"

/** "Always allow / Always ask" switch of a tool group or a single tool. */
export function PermissionControl({
  "aria-label": ariaLabel,
  onChange,
  size = "default",
  value,
}: PermissionControlProps) {
  return (
    <SegmentedControl
      aria-label={ariaLabel}
      options={
        size === "compact" ? compactPermissionOptions : permissionOptions
      }
      size="compact"
      value={value}
      onChange={onChange}
    />
  )
}
