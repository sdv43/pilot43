import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react"

import { Popover } from "../../../../../../../Popover"
import s from "./Autocomplete.module.css"
import { type AutocompleteProps } from "./types"
import { filterOptions, getActiveAutocompleteCommand } from "./utils"

export const Autocomplete = ({
  id,
  isTextareaFocused,
  anchorName,
  text,
  commands,
  selectionStart,
  selectionEnd,
  options,
  textareaRef,
  onSelect,
}: AutocompleteProps) => {
  const popoverRef = useRef<HTMLDivElement | null>(null)

  const [isAutocompleteDismissed, setIsAutocompleteDismissed] = useState(false)
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0)
  const [prevIsFocused, setPrevIsFocused] = useState(false)

  if (isTextareaFocused && !prevIsFocused && isAutocompleteDismissed) {
    setIsAutocompleteDismissed(false)
    setPrevIsFocused(true)
  } else if (!isTextareaFocused && prevIsFocused) {
    setPrevIsFocused(false)
  }

  const activeCommand = getActiveAutocompleteCommand(
    text,
    commands,
    selectionStart,
    selectionEnd,
  )

  const filteredOptions = useMemo(
    () => (activeCommand ? filterOptions(options, activeCommand) : []),
    [options, activeCommand],
  )

  const isVisible =
    !isAutocompleteDismissed &&
    isTextareaFocused &&
    activeCommand !== null &&
    filteredOptions.length > 0

  const selectedIndexBounded = Math.min(
    selectedOptionIndex,
    Math.max(0, filteredOptions.length - 1),
  )

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    function handleKeyDown(event: KeyboardEvent) {
      if (!isVisible) return

      switch (event.key) {
        case "ArrowDown": {
          event.preventDefault()
          setSelectedOptionIndex(
            (current) => (current + 1) % filteredOptions.length,
          )
          break
        }
        case "ArrowUp": {
          event.preventDefault()
          setSelectedOptionIndex(
            (current) =>
              (current - 1 + filteredOptions.length) % filteredOptions.length,
          )
          break
        }
        case "Tab":
        case "Enter": {
          const selectedOption = filteredOptions[selectedIndexBounded]

          if (!selectedOption || !activeCommand) return

          event.preventDefault()
          onSelect(selectedOption, activeCommand)
          break
        }
        case "Escape": {
          if (!popoverRef.current) return

          event.preventDefault()
          setIsAutocompleteDismissed(true)
          popoverRef.current.hidePopover()
          break
        }
      }
    }

    textarea.addEventListener("keydown", handleKeyDown)

    return () => {
      textarea.removeEventListener("keydown", handleKeyDown)
    }
  }, [
    activeCommand,
    filteredOptions,
    isVisible,
    onSelect,
    selectedIndexBounded,
    setIsAutocompleteDismissed,
    setSelectedOptionIndex,
    textareaRef,
  ])

  function handleMouseDownOption(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
  }

  useEffect(() => {
    const popover = popoverRef.current
    if (!popover) return

    if (isVisible) {
      if (!popover.matches(":popover-open")) {
        popover.showPopover()
      }
    } else {
      if (popover.matches(":popover-open")) {
        popover.hidePopover()
      }
    }
  }, [isVisible])

  return (
    <Popover
      ref={popoverRef}
      anchorName={anchorName}
      id={id}
      popover="manual"
      role="listbox"
    >
      {filteredOptions.map((option, index) => {
        const isSelected = index === selectedIndexBounded

        return (
          <button
            key={`${option.key}`}
            aria-disabled={option.disabled}
            aria-selected={isSelected}
            className={s.option}
            data-selected={isSelected}
            disabled={option.disabled}
            role="option"
            type="button"
            onClick={() => activeCommand && onSelect(option, activeCommand)}
            onMouseDown={handleMouseDownOption}
          >
            <span className={s.optionLabel}>
              {option.type === "slash" ? "/" : "#"}
              {option.command}
            </span>
          </button>
        )
      })}
    </Popover>
  )
}
