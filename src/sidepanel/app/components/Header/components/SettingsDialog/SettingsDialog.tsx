import {
  CommandIcon,
  type LucideIcon,
  PlugIcon,
  ServerIcon,
  SettingsIcon,
} from "lucide-react"
import { useId, useState } from "react"

import type { SettingsDialogProps } from "./types"

import { Dialog } from "../../../Dialog"
import { CommandManager } from "./components/CommandManager"
import { McpSettings } from "./components/McpSettings"
import { ModelProviderManager } from "./components/ModelProviderManager"
import { TitleGenerationSettings } from "./components/TitleGenerationSettings"
import s from "./SettingsDialog.module.css"

interface SettingsSection {
  id: string
  label: string
  icon: LucideIcon
  render: () => React.ReactNode
}

const sections: SettingsSection[] = [
  {
    id: "common",
    label: "Common",
    icon: SettingsIcon,
    render: () => <TitleGenerationSettings />,
  },
  {
    id: "providers",
    label: "Providers",
    icon: ServerIcon,
    render: () => <ModelProviderManager />,
  },
  {
    id: "mcp",
    label: "MCP Servers",
    icon: PlugIcon,
    render: () => <McpSettings />,
  },
  {
    id: "commands",
    label: "Commands",
    icon: CommandIcon,
    render: () => <CommandManager />,
  },
]

export function SettingsDialog({ onOpenChange, open }: SettingsDialogProps) {
  const [activeSectionId, setActiveSectionId] = useState(sections[0].id)
  const titleId = useId()
  const activeSection =
    sections.find((section) => section.id === activeSectionId) ?? sections[0]

  return (
    <Dialog
      className={s.dialog}
      open={open}
      title="Settings"
      onOpenChange={onOpenChange}
    >
      <div className={s.body}>
        <nav aria-label="Settings sections" className={s.sidebar}>
          <ul className={s.navList}>
            {sections.map((section) => {
              const Icon = section.icon
              const isActive = section.id === activeSectionId

              return (
                <li key={section.id}>
                  <button
                    aria-current={isActive ? "page" : undefined}
                    className={s.navItem}
                    data-active={isActive}
                    data-testid={`settings-section-${section.id}`}
                    type="button"
                    onClick={() => setActiveSectionId(section.id)}
                  >
                    <Icon aria-hidden="true" className={s.navIcon} size={16} />
                    <span className={s.navLabel}>{section.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div aria-labelledby={titleId} className={s.content}>
          <div className={s.contentBody}>{activeSection.render()}</div>
        </div>
      </div>
    </Dialog>
  )
}
