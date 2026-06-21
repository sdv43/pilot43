import type { AppSettings } from "@/shared/api"

import { getAppSettings, saveAppSettings } from "../storage"

export function handleAppSettingsGet(): Promise<AppSettings> {
  return getAppSettings()
}

export async function handleAppSettingsUpdate(
  settings: AppSettings,
): Promise<AppSettings> {
  return await saveAppSettings(settings)
}
