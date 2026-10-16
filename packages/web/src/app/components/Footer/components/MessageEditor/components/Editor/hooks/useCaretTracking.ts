import { type RefObject, useCallback, useState } from "react"
import { shallow } from "zustand/shallow"

import type { CaretCoordinates } from "../types"

import { caretMeasureStyleProps } from "../const"

export function useCaretTracking(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
) {
  const [caretCoordinates, setCaretCoordinates] =
    useState<CaretCoordinates | null>(null)

  const updateCaretCoordinates = useCallback(
    (selectionStart: number) => {
      if (!textareaRef.current) return

      setCaretCoordinates((state) => {
        if (!textareaRef.current) return state

        const nextCoordinates = measureCaretCoordinates(
          textareaRef.current,
          selectionStart,
        )

        if (shallow(state, nextCoordinates)) {
          return state
        }

        return nextCoordinates
      })
    },
    [textareaRef],
  )

  return {
    caretCoordinates,
    updateCaretCoordinates,
  }
}

function measureCaretCoordinates(
  textarea: HTMLTextAreaElement,
  position: number,
) {
  const rect = textarea.getBoundingClientRect()
  const mirror = document.createElement("div")
  const marker = document.createElement("span")
  const computedStyle = window.getComputedStyle(textarea)

  mirror.style.position = "fixed"
  mirror.style.top = `${rect.top}px`
  mirror.style.left = `${rect.left}px`
  mirror.style.visibility = "hidden"
  mirror.style.pointerEvents = "none"
  mirror.style.overflow = "hidden"
  mirror.style.width = `${rect.width}px`
  mirror.style.height = `${rect.height}px`
  mirror.style.whiteSpace = "pre-wrap"
  mirror.style.wordBreak = "break-word"

  for (const property of caretMeasureStyleProps) {
    mirror.style.setProperty(property, computedStyle.getPropertyValue(property))
  }

  mirror.textContent = textarea.value.slice(0, position)
  marker.textContent = "\u200b"
  mirror.append(marker)
  mirror.append(document.createTextNode(textarea.value.slice(position) || " "))

  document.body.append(mirror)

  mirror.scrollLeft = textarea.scrollLeft
  mirror.scrollTop = textarea.scrollTop

  const markerRect = marker.getBoundingClientRect()

  mirror.remove()

  const lineHeight = Number.parseFloat(computedStyle.lineHeight)
  const fallbackHeight = Number.isFinite(lineHeight) ? lineHeight : 18

  return {
    height: markerRect.height || fallbackHeight,
    left: markerRect.left,
    top: markerRect.top,
  } satisfies CaretCoordinates
}
