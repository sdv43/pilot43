import { useState } from "react"

export function useSelection() {
  const [selection, setSelection] = useState({ end: 0, start: 0 })

  function updateSelection(selectionStart: number, selectionEnd: number) {
    setSelection((current) => {
      if (current.start === selectionStart && current.end === selectionEnd) {
        return current
      }

      return { end: selectionEnd, start: selectionStart }
    })
  }

  return { selection, updateSelection }
}
