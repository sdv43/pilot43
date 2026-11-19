import type { Brand } from "../../../../../../../BrandLogo"

export interface ModelOptionProps {
  /** Maker of the model, for the logo tile. */
  brand: Brand | null
  /** Full model id, shown as the tooltip (rows stay one line). */
  detail?: string
  hasReasoning: boolean
  isFavorite: boolean
  isSelected: boolean
  name: string
  onSelect: () => void
  onToggleFavorite: () => void
}
