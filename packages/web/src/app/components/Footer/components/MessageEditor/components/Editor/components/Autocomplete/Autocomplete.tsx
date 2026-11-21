import { PlusIcon, SettingsIcon } from "lucide-react"
import {
  Fragment,
  type MouseEvent,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react"
import { useNavigate } from "react-router"

import { paths } from "../../../../../../../../../shared/routes"
import { Popover } from "../../../../../../../Popover"
import { PromptOption } from "../../../../../../../PromptOption"
import s from "./Autocomplete.module.css"
import { AttachOption } from "./components/AttachOption"
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
  const navigate = useNavigate()
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

          // A chat command typed out in full is sent by Enter, not inserted
          // again.
          if (
            event.key === "Enter" &&
            selectedOption.description &&
            activeCommand.query === selectedOption.command
          ) {
            return
          }

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

  const isPromptMenu = activeCommand?.kind === "slash"
  // Chat commands head the "/" menu; the prompts follow under their own label.
  const startsWithCommands = !!filteredOptions[0]?.description
  const firstPromptIndex = filteredOptions.findIndex(({ prompt }) => prompt)

  return (
    <Popover
      ref={popoverRef}
      anchorName={anchorName}
      aria-label={isPromptMenu ? "Prompts" : "Attach"}
      className={s.autocomplete}
      id={id}
      popover="manual"
      role="listbox"
    >
      <div className={s.header}>
        <span className={s.headerLabel}>
          {isPromptMenu && startsWithCommands
            ? "Commands"
            : isPromptMenu
              ? activeCommand?.query
                ? `Prompts · ${filteredOptions.length} ${filteredOptions.length === 1 ? "match" : "matches"}`
                : "Prompts"
              : "Attach"}
        </span>
        <span className={s.keys}>↑↓ navigate · ↵ insert · esc</span>
      </div>
      {filteredOptions.map((option, index) => {
        const isSelected = index === selectedIndexBounded

        return (
          <Fragment key={`${option.key}`}>
            {startsWithCommands && index === firstPromptIndex ? (
              <div className={s.header}>
                <span className={s.headerLabel}>Prompts</span>
              </div>
            ) : null}
            <button
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
              {option.prompt ? (
                <PromptOption
                  highlight={activeCommand?.query}
                  isSelected={isSelected}
                  preview={option.prompt.text.replace(/\s+/g, " ")}
                  title={option.prompt.title}
                />
              ) : option.description ? (
                <PromptOption
                  data-testid="command-option"
                  highlight={activeCommand?.query}
                  isSelected={isSelected}
                  preview={option.description}
                  title={`/${option.command}`}
                />
              ) : (
                <AttachOption isSelected={isSelected} option={option} />
              )}
            </button>
          </Fragment>
        )
      })}
      {isPromptMenu ? (
        <div className={s.footer}>
          <button
            className={s.footerLink}
            type="button"
            onClick={() => void navigate(paths.settings("prompts"))}
            onMouseDown={handleMouseDownOption}
          >
            <SettingsIcon aria-hidden="true" />
            Manage prompts
          </button>
          <button
            className={s.footerAction}
            type="button"
            onClick={() => void navigate(paths.settingsNew("prompts"))}
            onMouseDown={handleMouseDownOption}
          >
            <PlusIcon aria-hidden="true" />
            New prompt
          </button>
        </div>
      ) : null}
    </Popover>
  )
}
