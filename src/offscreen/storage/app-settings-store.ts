import type { AppSettings } from "@/shared/api"

import { APP_SETTINGS_KEY, getDB } from "./db"

const defaultAppSettings: AppSettings = {
  id: APP_SETTINGS_KEY,
  titleGenerationModel: "disabled",
  mcpServers: [],
}

/**
 * Returns the single app-settings record, persisting defaults on first access.
 * Backfills missing fields onto records persisted by older app versions.
 */
export async function getAppSettings(): Promise<AppSettings> {
  const db = await getDB()
  const existing = (await db.get("appSettings", APP_SETTINGS_KEY)) as
    | AppSettings
    | undefined

  if (!existing) {
    await db.put("appSettings", defaultAppSettings)
    return defaultAppSettings
  }

  // Merge with defaults so newly introduced optional settings are populated
  // for records created before they existed.
  const migrated: AppSettings = {
    ...defaultAppSettings,
    ...existing,
    titleGenerationModel:
      existing.titleGenerationModel ?? defaultAppSettings.titleGenerationModel,
    mcpServers: existing.mcpServers ?? defaultAppSettings.mcpServers,
  }

  return migrated
}

/**
 * Persists the full app-settings record.
 */
export async function saveAppSettings(
  settings: AppSettings,
): Promise<AppSettings> {
  const db = await getDB()
  await db.put("appSettings", settings)
  return settings
}
