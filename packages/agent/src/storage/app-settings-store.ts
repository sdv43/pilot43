import type { AppSettings } from "@pilot43/protocol"

import { chatRetentionOptions } from "@pilot43/protocol"

import type { AgentStorage } from "./types"

export const APP_SETTINGS_KEY = "app"

const defaultAppSettings: AppSettings = {
  chatRetentionDays: null,
  id: APP_SETTINGS_KEY,
  mcpServers: [],
}

/**
 * Normalizes a record persisted by any app version: fills in defaults for
 * settings added later, drops removed ones (`titleGenerationModel`) and
 * resets unknown retention values.
 */
function migrateAppSettings(existing: AppSettings): AppSettings {
  const { titleGenerationModel: _titleGenerationModel, ...settings } =
    existing as AppSettings & { titleGenerationModel?: unknown }
  const chatRetentionDays = chatRetentionOptions.includes(
    settings.chatRetentionDays ?? null,
  )
    ? (settings.chatRetentionDays ?? null)
    : null

  return {
    ...defaultAppSettings,
    ...settings,
    chatRetentionDays,
    mcpServers: settings.mcpServers ?? defaultAppSettings.mcpServers,
  }
}

export function createAppSettingsStore(storage: AgentStorage) {
  return {
    /**
     * Returns the single app-settings record, persisting defaults on first
     * access.
     */
    getAppSettings: async (): Promise<AppSettings> => {
      const existing = await storage.appSettings.get()

      if (!existing) {
        await storage.appSettings.put(defaultAppSettings)
        return defaultAppSettings
      }

      return migrateAppSettings(existing)
    },

    /**
     * Persists the full app-settings record.
     */
    saveAppSettings: async (settings: AppSettings): Promise<AppSettings> => {
      const migrated = migrateAppSettings(settings)
      await storage.appSettings.put(migrated)
      return migrated
    },
  }
}
