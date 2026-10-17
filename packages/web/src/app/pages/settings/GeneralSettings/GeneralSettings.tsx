import { HistoryIcon, SunMoonIcon } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router"

import {
  useAppSettingsGet,
  useAppSettingsUpdate,
} from "../../../../queries/appSettings"
import { useDataDeleteAll } from "../../../../queries/data"
import { paths } from "../../../../shared/routes"
import { Card } from "../../../components/Card"
import { ConfirmDialog } from "../../../components/ConfirmDialog"
import { SectionHeader } from "../../../components/SectionHeader"
import { Select } from "../../../components/Select"
import { SettingsRow } from "../../../components/SettingsRow"
import { toast } from "../../../components/ToastProvider"
import { actions, useStore } from "../../../store"
import { deleteAllConfirmText, themeSelectOptions } from "./const"
import s from "./GeneralSettings.module.css"
import { useDataCounts } from "./hooks/useDataCounts"
import {
  retentionSelectOptions,
  retentionToValue,
  valueToRetention,
  valueToTheme,
} from "./utils"

/** `/settings/general` — theme, chat retention and deleting all data. */
export function GeneralSettings() {
  const navigate = useNavigate()
  const { data: settings } = useAppSettingsGet()
  const { mutate: updateSettings } = useAppSettingsUpdate()
  const { isPending: isDeleting, mutate: deleteAll } = useDataDeleteAll()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const counts = useDataCounts()
  const theme = useStore((state) => state.theme)

  return (
    <div className={s.generalSettings}>
      <section aria-labelledby="settings-appearance" className={s.section}>
        <SectionHeader id="settings-appearance" title="Appearance" />
        <Card>
          <SettingsRow
            control={
              <Select
                aria-label="Theme"
                data-testid="theme-select"
                icon={<SunMoonIcon />}
                options={themeSelectOptions}
                value={theme}
                variant="chip"
                onChange={(event) => {
                  actions.setTheme(valueToTheme(event.target.value))
                }}
              />
            }
            description="System follows your device setting"
            title="Theme"
          />
        </Card>
      </section>

      <section aria-labelledby="settings-data" className={s.section}>
        <SectionHeader id="settings-data" title="Data" />
        <Card>
          <SettingsRow
            control={
              <Select
                aria-label="Chat history"
                data-testid="chat-retention-select"
                disabled={!settings}
                icon={<HistoryIcon />}
                options={retentionSelectOptions}
                value={retentionToValue(settings?.chatRetentionDays)}
                variant="chip"
                onChange={(event) => {
                  if (!settings) {
                    return
                  }

                  updateSettings(
                    {
                      ...settings,
                      chatRetentionDays: valueToRetention(event.target.value),
                    },
                    {
                      onError: (error) => {
                        toast(
                          `Failed to save settings: ${error.message}`,
                          "error",
                        )
                      },
                    },
                  )
                }}
              />
            }
            description="Pinned chats are always kept"
            title="Chat history"
          />
          <SettingsRow
            data-testid="delete-all-data"
            description="Removes every workspace and chat"
            title="Delete all data"
            tone="danger"
            onClick={() => setIsDeleteOpen(true)}
          />
        </Card>
      </section>

      <ConfirmDialog
        confirmLabel="Delete all data"
        confirmText={deleteAllConfirmText}
        isPending={isDeleting}
        open={isDeleteOpen}
        title="Delete all data?"
        onConfirm={() =>
          deleteAll(undefined, {
            onError: (error) => {
              toast(`Failed to delete data: ${error.message}`, "error")
            },
            onSuccess: (workspace) => {
              setIsDeleteOpen(false)
              actions.setLastSelectedWorkspaceId(workspace.id)
              toast("All workspaces and chats were deleted", "success")
              void navigate(paths.chat(workspace.id))
            },
          })
        }
        onOpenChange={setIsDeleteOpen}
      >
        <p>
          This permanently deletes {counts.workspaces}{" "}
          {counts.workspaces === 1 ? "workspace" : "workspaces"} and{" "}
          {counts.workspaces === 1 ? "its" : "their"} {counts.chats}{" "}
          {counts.chats === 1 ? "chat" : "chats"}, including pinned chats.
          Providers, MCP servers and prompts are kept. A new empty workspace is
          created.
        </p>
      </ConfirmDialog>
    </div>
  )
}
