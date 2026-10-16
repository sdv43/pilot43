import type { AppSettings } from "@pilot43/protocol"

import type { AgentStorage } from "./types"

export const APP_SETTINGS_KEY = "app"

const defaultAppSettings: AppSettings = {
  id: APP_SETTINGS_KEY,
  titleGenerationModel: "disabled",
  mcpServers: [],
}

export function createAppSettingsStore(storage: AgentStorage) {
  return {
    /**
     * Returns the single app-settings record, persisting defaults on first
     * access. Backfills missing fields onto records persisted by older app
     * versions.
     */
    getAppSettings: async (): Promise<AppSettings> => {
      const existing = await storage.appSettings.get()

      if (!existing) {
        await storage.appSettings.put(defaultAppSettings)
        return defaultAppSettings
      }

      // Merge with defaults so newly introduced optional settings are
      // populated for records created before they existed.
      const migrated: AppSettings = {
        ...defaultAppSettings,
        ...existing,
        titleGenerationModel:
          existing.titleGenerationModel ??
          defaultAppSettings.titleGenerationModel,
        mcpServers: existing.mcpServers ?? defaultAppSettings.mcpServers,
      }

      return migrated
    },

    /**
     * Persists the full app-settings record.
     */
    saveAppSettings: async (settings: AppSettings): Promise<AppSettings> => {
      await storage.appSettings.put(settings)
      return settings
    },
  }
}
