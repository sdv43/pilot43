import type { BackendApi } from "./api-client"

// Keyed by method so the compiler reports missing and unknown methods.
const backendApiMethodMap: Record<keyof BackendApi, true> = {
  appSettingsGet: true,
  appSettingsUpdate: true,
  workspaceGet: true,
  workspaceCreate: true,
  workspaceUpdate: true,
  workspaceDelete: true,
  chatGetByWorkspace: true,
  chatDelete: true,
  chatMessageSend: true,
  chatTokenEstimateGet: true,
  chatMessageRunGet: true,
  chatMessageRunRetry: true,
  chatMessageRunStop: true,
  chatMessageRunDelete: true,
  chatMessageRunDeleteAfter: true,
  chatMessageRunAnswer: true,
  chatSettingsUpdate: true,
  chatTitleUpdate: true,
  generatedFileGet: true,
  chatTodoListClear: true,
  modelProviderTypeGet: true,
  modelProviderGet: true,
  modelProviderCreate: true,
  modelProviderUpdate: true,
  modelProviderDelete: true,
  modelProviderModelGet: true,
  modelProviderCheck: true,
  modelToolGet: true,
  mcpServerGet: true,
  mcpServerUpdate: true,
  mcpServerToolsGet: true,
  promptGet: true,
  promptCreate: true,
  promptUpdate: true,
  promptDelete: true,
  dataDeleteAll: true,
}

/**
 * Names of all {@link BackendApi} methods, for transports that forward calls
 * by name (e.g. Chrome runtime messaging).
 */
export const backendApiMethods = Object.keys(
  backendApiMethodMap,
) as (keyof BackendApi)[]
