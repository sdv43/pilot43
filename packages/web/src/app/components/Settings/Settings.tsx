import { cn } from "../../../shared/cn"
import s from "./Settings.module.css"
import { type SettingsProps } from "./types"

export function Settings({ className, ...props }: SettingsProps) {
  return (
    <div {...props} className={cn(s.settings, className)}>
      Settings
    </div>
  )
}
