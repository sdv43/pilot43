import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react"

import type { McpServer } from "@/shared/api"

import { toast } from "@/sidepanel/app/components/ToastProvider"
import { useMcpServerUpdate } from "@/sidepanel/queries/mcpServer"

import type { McpSettingsFormProps } from "./types"

import { autosaveDelayMs, mcpServersSchema } from "./const"
import s from "./McpSettingsForm.module.css"
import { documentToServers, serversToDocument } from "./utils"

// Load the JSON editor styles once. The component itself is lazy-loaded below
// so the relatively heavy `modern-json-react` bundle is only pulled in when the
// MCP settings form is actually rendered.
import "modern-json-react/styles.css"

const JsonEditor = lazy(() =>
  import("modern-json-react").then((mod) => ({ default: mod.JsonEditor })),
)

export function McpSettingsForm({ initialServers }: McpSettingsFormProps) {
  const updateMutation = useMcpServerUpdate()
  const [value, setValue] = useState<unknown>(() =>
    serversToDocument(initialServers),
  )
  const [isValid, setIsValid] = useState(true)
  // Track whether the user has edited the document since the last successful
  // save so we only persist when there are real changes.
  const dirtyRef = useRef(false)
  const saveTimerRef = useRef<null | number>(null)

  const handleSave = async (next: unknown) => {
    let servers: McpServer[]

    try {
      servers = documentToServers(next)
    } catch {
      // Malformed documents are blocked by validation, but guard anyway.
      return
    }

    try {
      await updateMutation.mutateAsync(servers)
      dirtyRef.current = false
      toast("MCP servers saved", "success")
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to save MCP servers",
        "error",
      )
    }
  }

  // Debounced autosave: persist `autosaveDelayMs` after the user stops editing,
  // but only when the document is valid and has changed.
  useEffect(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current)
    }

    if (!dirtyRef.current || !isValid) {
      return
    }

    saveTimerRef.current = window.setTimeout(() => {
      void handleSave(value)
    }, autosaveDelayMs)

    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isValid])

  const handleChange = (next: unknown, nextRawText: string) => {
    dirtyRef.current = nextRawText.trim() !== ""
    setValue(next)
  }

  const handleValidate = (errors: unknown[]) => {
    setIsValid(errors.length === 0)
  }

  const editor = useMemo(
    () => (
      <JsonEditor
        searchable
        className={s.editor}
        height="100%"
        indentation={2}
        lineNumbers={false}
        schema={mcpServersSchema}
        theme="auto"
        validationMode="onChange"
        value={value}
        onChange={handleChange}
        onValidate={handleValidate}
      />
    ),
    // Re-mount the editor only when the initial document changes; edits are
    // handled internally by the editor and surfaced via onChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialServers],
  )

  return (
    <section className={s.container}>
      <div className={s.header}>
        <h3 className={s.title}>MCP Servers</h3>
      </div>

      <div className={s.editorWrapper}>
        <Suspense fallback={<div className={s.loading}>Loading editor...</div>}>
          {editor}
        </Suspense>
      </div>

      {!isValid && (
        <div className={s.error}>
          Fix the validation errors above before saving.
        </div>
      )}
    </section>
  )
}
