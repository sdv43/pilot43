import { PlusIcon, XIcon } from "lucide-react"

import { Button } from "../../../../../components/Button"
import { IconButton } from "../../../../../components/IconButton"
import { Input } from "../../../../../components/Input"
import { createHeaderEntry } from "../../utils"
import s from "./HeadersEditor.module.css"
import { type HeadersEditorProps } from "./types"

/** Name/value rows for HTTP headers such as `Authorization`. */
export function HeadersEditor({ headers, onChange }: HeadersEditorProps) {
  function update(id: string, patch: { name?: string; value?: string }) {
    onChange(
      headers.map((header) =>
        header.id === id ? { ...header, ...patch } : header,
      ),
    )
  }

  return (
    <div className={s.headersEditor}>
      <span className={s.label}>Custom headers</span>
      {headers.map((header) => (
        <div key={header.id} className={s.row} data-testid="mcp-header-row">
          <Input
            aria-label="Header name"
            className={s.name}
            placeholder="Authorization"
            value={header.name}
            onChange={(event) =>
              update(header.id, { name: event.target.value })
            }
          />
          <Input
            aria-label="Header value"
            className={s.value}
            placeholder="Bearer …"
            value={header.value}
            onChange={(event) =>
              update(header.id, { value: event.target.value })
            }
          />
          <IconButton
            aria-label="Remove header"
            icon={<XIcon />}
            size="small"
            onClick={() =>
              onChange(headers.filter((item) => item.id !== header.id))
            }
          />
        </div>
      ))}
      <Button
        className={s.add}
        icon={<PlusIcon />}
        size="small"
        variant="ghost"
        onClick={() => onChange([...headers, createHeaderEntry()])}
      >
        Add header
      </Button>
    </div>
  )
}
