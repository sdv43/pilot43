import { CheckIcon, LightbulbIcon, StarIcon } from "lucide-react"

import { BrandLogo } from "../../../../../../../BrandLogo"
import s from "./ModelOption.module.css"
import { type ModelOptionProps } from "./types"

/**
 * One-line model row: maker logo, name (full id on hover), reasoning bulb,
 * favourite star and the selection check.
 */
export function ModelOption({
  brand,
  detail,
  hasReasoning,
  isFavorite,
  isSelected,
  name,
  onSelect,
  onToggleFavorite,
}: ModelOptionProps) {
  return (
    <div className={s.row} data-selected={isSelected}>
      <button
        aria-checked={isSelected}
        className={s.modelOption}
        role="menuitemradio"
        title={detail ?? name}
        type="button"
        onClick={onSelect}
      >
        <BrandLogo brand={brand} />
        <span className={s.name}>{name}</span>
        {hasReasoning ? (
          <LightbulbIcon aria-label="Supports reasoning" className={s.bulb} />
        ) : null}
      </button>
      <button
        aria-label={isFavorite ? "Remove from favourites" : "Add to favourites"}
        aria-pressed={isFavorite}
        className={s.star}
        data-favorite={isFavorite}
        title={isFavorite ? "Remove from favourites" : "Add to favourites"}
        type="button"
        onClick={onToggleFavorite}
      >
        <StarIcon aria-hidden="true" />
      </button>
      {isSelected ? <CheckIcon aria-hidden="true" className={s.check} /> : null}
    </div>
  )
}
