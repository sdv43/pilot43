import { type MouseEvent, useEffect, useMemo, useReducer, useRef } from "react"

import { Popover } from "../../../../../../../Popover"
import s from "./Autocomplete.module.css"
import { type AutocompleteProps } from "./types"
import { filterOptions, getActiveAutocompleteCommand } from "./utils"

interface AutocompleteState {
  isDismissed: boolean
  prevIsFocused: boolean
  prevIsVisible: boolean
  selectedOptionIndex: number
}

type AutocompleteAction =
  | {
      index: number
      type: "moveSelection"
    }
  | {
      isFocused: boolean
      type: "syncFocus"
    }
  | {
      isVisible: boolean
      type: "syncVisibility"
    }
  | {
      type: "dismiss"
    }

function autocompleteReducer(
  state: AutocompleteState,
  action: AutocompleteAction,
): AutocompleteState {
  switch (action.type) {
    case "dismiss": {
      return state.isDismissed ? state : { ...state, isDismissed: true }
    }
    case "moveSelection": {
      return state.selectedOptionIndex === action.index
        ? state
        : { ...state, selectedOptionIndex: action.index }
    }
    case "syncFocus": {
      if (action.isFocused === state.prevIsFocused) {
        return state
      }

      return action.isFocused
        ? { ...state, isDismissed: false, prevIsFocused: true }
        : { ...state, prevIsFocused: false }
    }
    case "syncVisibility": {
      if (action.isVisible === state.prevIsVisible) {
        return state
      }

      return action.isVisible
        ? { ...state, prevIsVisible: true, selectedOptionIndex: 0 }
        : { ...state, prevIsVisible: false }
    }
  }
}

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
  const [state, dispatch] = useReducer(autocompleteReducer, {
    isDismissed: false,
    prevIsFocused: false,
    prevIsVisible: false,
    selectedOptionIndex: 0,
  })

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
    !state.isDismissed &&
    isTextareaFocused &&
    activeCommand !== null &&
    filteredOptions.length > 0

  const selectedIndexBounded = Math.min(
    state.selectedOptionIndex,
    Math.max(0, filteredOptions.length - 1),
  )

  useEffect(() => {
    dispatch({ type: "syncFocus", isFocused: isTextareaFocused })
  }, [isTextareaFocused])

  useEffect(() => {
    dispatch({ type: "syncVisibility", isVisible })
  }, [isVisible])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    function handleKeyDown(event: KeyboardEvent) {
      if (!isVisible) return

      switch (event.key) {
        case "ArrowDown": {
          event.preventDefault()
          dispatch({
            type: "moveSelection",
            index: (selectedIndexBounded + 1) % filteredOptions.length,
          })
          break
        }
        case "ArrowUp": {
          event.preventDefault()
          dispatch({
            type: "moveSelection",
            index:
              (selectedIndexBounded - 1 + filteredOptions.length) %
              filteredOptions.length,
          })
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
          dispatch({ type: "dismiss" })
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
    dispatch,
    filteredOptions,
    isVisible,
    onSelect,
    selectedIndexBounded,
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
