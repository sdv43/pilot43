import type { Prompt } from "@pilot43/protocol"

import { PlusIcon, SearchIcon } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router"

import { usePromptDelete, usePromptGet } from "../../../../queries/prompt"
import { paths } from "../../../../shared/routes"
import { Button } from "../../../components/Button"
import { Card } from "../../../components/Card"
import { ConfirmDialog } from "../../../components/ConfirmDialog"
import { SectionHeader } from "../../../components/SectionHeader"
import { toast } from "../../../components/ToastProvider"
import { PromptRow } from "./components/PromptRow"
import s from "./PromptsSettings.module.css"
import { filterPrompts } from "./utils"

/** `/settings/prompts` — saved prompts offered in the `/` menu. */
export function PromptsSettings() {
  const navigate = useNavigate()
  const { data: prompts = [] } = usePromptGet()
  const { isPending, mutate: deletePrompt } = usePromptDelete()
  const [query, setQuery] = useState("")
  const [deleting, setDeleting] = useState<null | Prompt>(null)
  const visible = filterPrompts(prompts, query)

  return (
    <div className={s.promptsSettings}>
      <label className={s.search}>
        <SearchIcon aria-hidden="true" />
        <input
          aria-label="Search prompts"
          className={s.searchInput}
          placeholder="Search prompts"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <section aria-labelledby="settings-prompts" className={s.section}>
        <SectionHeader
          action={
            <Button
              data-testid="new-prompt"
              icon={<PlusIcon />}
              size="small"
              variant="ghost"
              onClick={() => void navigate(paths.settingsNew("prompts"))}
            >
              New prompt
            </Button>
          }
          id="settings-prompts"
          title={`Prompts · ${prompts.length}`}
        />
        {visible.length > 0 ? (
          <Card>
            {visible.map((prompt) => (
              <PromptRow
                key={prompt.id}
                prompt={prompt}
                onDelete={() => setDeleting(prompt)}
                onEdit={() =>
                  void navigate(paths.settingsItem("prompts", prompt.id))
                }
              />
            ))}
          </Card>
        ) : (
          <p className={s.empty}>
            {query
              ? "No prompts match your search"
              : "Save prompts you use often and insert them by typing / in the message box."}
          </p>
        )}
      </section>
      <ConfirmDialog
        confirmLabel="Delete prompt"
        isPending={isPending}
        open={!!deleting}
        title={`Delete “${deleting?.title ?? ""}”?`}
        onConfirm={() =>
          deleting &&
          deletePrompt(deleting.id, {
            onError: (error) => {
              toast(`Failed to delete prompt: ${error.message}`, "error")
            },
            onSuccess: () => setDeleting(null),
          })
        }
        onOpenChange={(open) => !open && setDeleting(null)}
      />
    </div>
  )
}
