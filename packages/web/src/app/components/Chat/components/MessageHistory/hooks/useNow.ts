import { useEffect, useState } from "react"

/** Current time, refreshed every `intervalMs` while `isActive`. */
export function useNow(isActive: boolean, intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!isActive) {
      return
    }

    const id = setInterval(() => setNow(Date.now()), intervalMs)

    return () => clearInterval(id)
  }, [intervalMs, isActive])

  return now
}
