import { useRouteError } from "react-router"

import { ErrorFallback } from "../components/ErrorBoundary"

/** Error element for the router: errors thrown while rendering a route. */
export function RouteError() {
  const error = useRouteError()

  return <ErrorFallback error={error} />
}
