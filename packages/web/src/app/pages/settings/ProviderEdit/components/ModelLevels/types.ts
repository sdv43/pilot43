import type { ModelProvider } from "../../../../../../queries/modelProvider"

export interface ModelLevelsProps {
  modelNames: string[]
  models: ModelProvider["models"]
  onChange: (models: NonNullable<ModelProvider["models"]>) => void
}
