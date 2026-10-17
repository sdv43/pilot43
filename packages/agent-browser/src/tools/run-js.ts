import type { Tool } from "@pilot43/agent"

import { defaultRunJsTimeoutMs, maxRunJsTimeoutMs } from "./const"
import { createIframeSandbox } from "./sandbox"

export async function executeRunJsTool(
  args: Record<string, unknown>,
  sandbox: ReturnType<typeof createIframeSandbox>,
): Promise<Record<string, unknown>> {
  const code = args.code
  if (typeof code !== "string" || !code.trim()) {
    throw new Error("Parameter `code` must be a non-empty string.")
  }

  const timeoutMs =
    typeof args.timeout_ms === "number" && Number.isFinite(args.timeout_ms)
      ? Math.min(maxRunJsTimeoutMs, Math.max(100, args.timeout_ms))
      : defaultRunJsTimeoutMs

  return { ...(await sandbox.run(code, timeoutMs)) }
}

/**
 * Creates the `run_js` tool, which executes code in the sandboxed extension
 * page at `sandboxPageUrl`.
 */
export function createRunJsTool({
  sandboxPageUrl,
}: {
  sandboxPageUrl: string
}): Tool {
  const sandbox = createIframeSandbox(sandboxPageUrl)

  return {
    definition: {
      id: "run_js",
      name: "run_js",
      shortDescription: "Run JavaScript in a sandbox and return the result.",
      description:
        "Execute arbitrary JavaScript in a sandboxed runtime and return the final value plus captured console output. Use a `return` statement to produce the result value. Runs in a Web Worker with no DOM and limited host APIs; only JSON-serializable values are returned (strings are truncated to 8000 chars, arrays/objects to 200 entries). The optional `timeout_ms` (clamped to 100-30000) overrides the default 5000ms timeout; on timeout the run is aborted and reported as an error. Returned logs are capped at 200 entries.",
    },
    inputSchema: {
      additionalProperties: false,
      properties: {
        code: {
          description:
            "JavaScript source code to execute. Use return to produce the final value.",
          type: "string",
        },
        timeout_ms: {
          description: "Optional timeout in milliseconds. Defaults to 3000.",
          type: "number",
        },
      },
      required: ["code"],
      type: "object",
    },
    execute: (args) => executeRunJsTool(args, sandbox),
  }
}
