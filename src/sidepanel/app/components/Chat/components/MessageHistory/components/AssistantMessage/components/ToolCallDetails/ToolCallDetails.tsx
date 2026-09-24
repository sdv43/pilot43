import { HighlightedCode } from "@/sidepanel/app/components/Markdown/components/CodeBlock"

import type { ToolCallDetailsProps, ToolJsonSectionProps } from "./types"

import s from "./ToolCallDetails.module.css"
import { stringifyToolPayload } from "./utils"

function ToolJsonSection({ title, value }: ToolJsonSectionProps) {
  return (
    <section className={s.section}>
      <h4 className={s.sectionTitle}>{title}</h4>
      <HighlightedCode code={stringifyToolPayload(value)} language="json" />
    </section>
  )
}

export function ToolCallDetails({ args, result }: ToolCallDetailsProps) {
  return (
    <div className={s.toolCallDetails}>
      <ToolJsonSection title="Args" value={args} />
      <ToolJsonSection title="Result" value={result} />
    </div>
  )
}
