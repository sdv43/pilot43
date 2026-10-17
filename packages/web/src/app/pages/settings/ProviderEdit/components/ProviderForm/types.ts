import type { ModelProvider } from "../../../../../../queries/modelProvider"

export interface ProviderFormProps {
  /** Saved provider being edited; `undefined` when adding one. */
  provider: ModelProvider | undefined
}
