import { defaultRunJsTimeoutMs, maxRunJsTimeoutMs } from "../const"
import { runJavaScriptInSandbox } from "../sandbox"

export async function executeRunJsTool(
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const code = args.code
  if (typeof code !== "string" || !code.trim()) {
    throw new Error("Parameter `code` must be a non-empty string.")
  }

  const timeoutMs =
    typeof args.timeout_ms === "number" && Number.isFinite(args.timeout_ms)
      ? Math.min(maxRunJsTimeoutMs, Math.max(100, args.timeout_ms))
      : defaultRunJsTimeoutMs

  return { ...(await runJavaScriptInSandbox(code, timeoutMs)) }
}
