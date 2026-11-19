import type { ModelProvider } from "../../../../../../queries/modelProvider"

export interface ProviderFormProps {
  /** Type preselected for a new provider (`?type=` of the URL). */
  initialType?: ModelProvider["type"]
  /** Saved provider being edited; `undefined` when adding one. */
  provider: ModelProvider | undefined
}
