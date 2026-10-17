import { XIcon } from "lucide-react"
import { useState } from "react"

import { cn } from "../../../shared/cn"
import s from "./TagInput.module.css"
import { type TagInputProps } from "./types"
import { addTag } from "./utils"

/**
 * Free-form list of short values: type and press Enter (or comma) to add,
 * × or Backspace on an empty input to remove.
 */
export function TagInput({
  "aria-label": ariaLabel,
  className,
  onChange,
  placeholder = "Add…",
  tags,
}: TagInputProps) {
  const [value, setValue] = useState("")

  function commit() {
    onChange(addTag(tags, value))
    setValue("")
  }

  return (
    <div className={cn(s.tagInput, className)}>
      {tags.map((tag) => (
        <span key={tag} className={s.tag} data-testid="tag">
          {tag}
          <button
            aria-label={`Remove ${tag}`}
            className={s.remove}
            type="button"
            onClick={() => onChange(tags.filter((item) => item !== tag))}
          >
            <XIcon />
          </button>
        </span>
      ))}
      <input
        aria-label={ariaLabel}
        className={s.input}
        placeholder={tags.length === 0 ? placeholder : undefined}
        value={value}
        onBlur={commit}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault()
            commit()
          } else if (event.key === "Backspace" && !value && tags.length > 0) {
            onChange(tags.slice(0, -1))
          }
        }}
      />
    </div>
  )
}
