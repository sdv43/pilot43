import { Navigate, useParams } from "react-router"

import { usePromptGet } from "../../../../queries/prompt"
import { paths } from "../../../../shared/routes"
import { PromptForm } from "./components/PromptForm"

/** `/settings/prompts/new` and `/settings/prompts/:promptId`. */
export function PromptEdit() {
  const { promptId } = useParams()
  const { data: prompts } = usePromptGet()
  const prompt = prompts?.find((item) => item.id === promptId)

  if (!prompts) {
    return null
  }

  if (promptId && (!prompt || prompt.builtin)) {
    return <Navigate replace to={paths.settings("prompts")} />
  }

  return <PromptForm key={prompt?.id ?? "new"} prompt={prompt} />
}
