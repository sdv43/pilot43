import type { ToolPermission } from "@pilot43/protocol"

import { ChevronDownIcon } from "lucide-react"
import { useId, useRef, useState } from "react"

import { Menu } from "../../../../../components/Menu"
import { permissionOptions } from "../../const"
import { permissionIcons } from "./icons"
import s from "./PermissionControl.module.css"
import { type PermissionControlProps } from "./types"

/** Selector of a tool group's or a single tool's permission. */
export function PermissionControl({
  "aria-label": ariaLabel,
  onChange,
  value,
}: PermissionControlProps) {
  const id = useId()
  const anchorName = `--permission-control-${id.replace(/:/g, "")}`
  const menuRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const selected =
    permissionOptions.find((option) => option.value === value) ??
    permissionOptions[0]
  const Icon = permissionIcons[selected.value]

  return (
    <>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`${ariaLabel}: ${selected.label}`}
        className={s.permissionControl}
        data-value={selected.value}
        style={{ anchorName }}
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          menuRef.current?.togglePopover()
        }}
      >
        <Icon aria-hidden="true" className={s.icon} />
        <span className={s.label}>{selected.label}</span>
        <ChevronDownIcon aria-hidden="true" className={s.chevron} />
      </button>
      <Menu
        ref={menuRef}
        anchorName={anchorName}
        className={s.menu}
        items={permissionOptions.map((option) => ({
          checked: option.value === value,
          description: option.description,
          id: option.value,
          label: option.label,
        }))}
        onItemClick={(itemId) => onChange(itemId as ToolPermission)}
        onOpenChange={setIsOpen}
      />
    </>
  )
}
