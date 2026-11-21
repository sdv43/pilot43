import type { AppSettings } from "@pilot43/protocol"

import { defaultHistorySummaryThreshold } from "@pilot43/protocol"
import { FoldVerticalIcon, HistoryIcon, SunMoonIcon } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router"

import {
  useAppSettingsGet,
  useAppSettingsUpdate,
} from "../../../../queries/appSettings"
import { useDataDeleteAll } from "../../../../queries/data"
import { paths } from "../../../../shared/routes"
import { Card } from "../../../components/Card"
import { Checkbox } from "../../../components/Checkbox"
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
  getRetentionSelectOptions,
  retentionToValue,
  summaryThresholdSelectOptions,
  valueToRetention,
  valueToSummaryThreshold,
  valueToTheme,
} from "./utils"

/**
 * `/settings/general` — theme, when long chats are summarised, chat
 * retention and deleting all data.
 */
export function GeneralSettings() {
  const navigate = useNavigate()
  const { data: settings } = useAppSettingsGet()
  const { mutate: updateSettings } = useAppSettingsUpdate()
  const { isPending: isDeleting, mutate: deleteAll } = useDataDeleteAll()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [includeConfig, setIncludeConfig] = useState(false)
  const counts = useDataCounts()
  const theme = useStore((state) => state.theme)

  function saveSettings(change: Partial<AppSettings>) {
    if (!settings) {
      return
    }

    updateSettings(
      { ...settings, ...change },
      {
        onError: (error) => {
          toast(`Failed to save settings: ${error.message}`, "error")
        },
      },
    )
  }

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

      <section aria-labelledby="settings-context" className={s.section}>
        <SectionHeader id="settings-context" title="Context" />
        <Card>
          <SettingsRow
            control={
              <Select
                aria-label="Summarise history"
                data-testid="summary-threshold-select"
                disabled={!settings}
                icon={<FoldVerticalIcon />}
                options={summaryThresholdSelectOptions}
                value={String(
                  settings?.historySummaryThreshold ??
                    defaultHistorySummaryThreshold,
                )}
                variant="chip"
                onChange={(event) => {
                  saveSettings({
                    historySummaryThreshold: valueToSummaryThreshold(
                      event.target.value,
                    ),
                  })
                }}
              />
            }
            description="Once a chat fills this much of the context"
            title="Summarise history"
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
                options={getRetentionSelectOptions(counts.chatList)}
                value={retentionToValue(settings?.chatRetentionDays)}
                variant="chip"
                onChange={(event) => {
                  saveSettings({
                    chatRetentionDays: valueToRetention(event.target.value),
                  })
                }}
              />
            }
            description="Pinned chats are always kept"
            title="Chat history"
          />
          <SettingsRow
            data-testid="delete-all-data"
            description="Removes every workspace and its chats"
            title="Delete chats & workspaces"
            tone="danger"
            onClick={() => setIsDeleteOpen(true)}
          />
        </Card>
      </section>

      <ConfirmDialog
        confirmLabel="Delete"
        confirmText={deleteAllConfirmText}
        isPending={isDeleting}
        open={isDeleteOpen}
        title="Delete all chats and workspaces?"
        onConfirm={() =>
          deleteAll(
            { includeConfig },
            {
              onError: (error) => {
                toast(`Failed to delete data: ${error.message}`, "error")
              },
              onSuccess: (workspace) => {
                setIsDeleteOpen(false)
                setIncludeConfig(false)
                actions.setLastSelectedWorkspaceId(workspace.id)
                toast("All workspaces and chats were deleted", "success")
                void navigate(paths.chat(workspace.id))
              },
            },
          )
        }
        onOpenChange={(open) => {
          setIsDeleteOpen(open)

          if (!open) {
            setIncludeConfig(false)
          }
        }}
      >
        <p>
          This permanently deletes {counts.workspaces}{" "}
          {counts.workspaces === 1 ? "workspace" : "workspaces"} and{" "}
          {counts.workspaces === 1 ? "its" : "their"} {counts.chats}{" "}
          {counts.chats === 1 ? "chat" : "chats"}, including pinned ones. A new
          empty workspace is created.
        </p>
        <Checkbox
          checked={includeConfig}
          data-testid="delete-all-include-config"
          label="Also remove providers, API keys and MCP servers"
          onChange={(event) => setIncludeConfig(event.target.checked)}
        />
      </ConfirmDialog>
    </div>
  )
}
