import { Navigate, useParams, useSearchParams } from "react-router"

import { useModelProviderGet } from "../../../../queries/modelProvider"
import { paths } from "../../../../shared/routes"
import { ProviderForm } from "./components/ProviderForm"
import { parseProviderType } from "./utils"

/** `/settings/providers/new[?type=…]` and `/settings/providers/:providerId`. */
export function ProviderEdit() {
  const { providerId } = useParams()
  const [searchParams] = useSearchParams()
  const { data: providers } = useModelProviderGet()
  const provider = providers?.find((item) => item.id === providerId)

  if (!providers) {
    return null
  }

  if (providerId && !provider) {
    return <Navigate replace to={paths.settings("providers")} />
  }

  return (
    <ProviderForm
      key={provider?.id ?? "new"}
      initialType={parseProviderType(searchParams.get("type"))}
      provider={provider}
    />
  )
}
