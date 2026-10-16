import type { AppSettings } from "@pilot43/protocol"

import type { AgentContext } from "../context"

export function handleAppSettingsGet(ctx: AgentContext): Promise<AppSettings> {
  return ctx.store.getAppSettings()
}

export async function handleAppSettingsUpdate(
  ctx: AgentContext,
  settings: AppSettings,
): Promise<AppSettings> {
  return await ctx.store.saveAppSettings(settings)
}
