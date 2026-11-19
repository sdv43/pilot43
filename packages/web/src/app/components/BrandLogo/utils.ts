export type Brand =
  | "anthropic"
  | "figma"
  | "github"
  | "linear"
  | "ollama"
  | "openai"
  | "openrouter"

/** Brand of a model provider type. */
export function getProviderBrand(type: string): Brand | null {
  if (type === "openai" || type === "openrouter" || type === "ollama") {
    return type
  }

  return null
}

/**
 * Maker of a model, from its vendor prefix (`anthropic/claude-x`) or its
 * family name. Falls back to the provider's brand.
 */
export function getModelBrand(
  name: string,
  providerType: string,
): Brand | null {
  const lower = name.toLowerCase()
  const vendor = lower.includes("/") ? lower.slice(0, lower.indexOf("/")) : ""

  if (vendor === "anthropic" || lower.startsWith("claude")) return "anthropic"
  if (vendor === "openai" || /^(gpt|o\d|chatgpt)/.test(lower)) return "openai"
  if (providerType === "ollama") return "ollama"
  if (vendor) return null

  return getProviderBrand(providerType)
}

const hostBrands: [RegExp, Brand][] = [
  [/(^|\.)github(copilot)?\.com$/, "github"],
  [/(^|\.)linear\.app$/, "linear"],
  [/(^|\.)figma\.com$/, "figma"],
  [/(^|\.)openai\.com$/, "openai"],
  [/(^|\.)openrouter\.ai$/, "openrouter"],
  [/(^|\.)anthropic\.com$/, "anthropic"],
]

/**
 * Bundled logo for a well-known site (MCP servers, provider hosts). The
 * extension has no `favicon` permission, so other sites get a generic icon.
 */
export function getUrlBrand(url: string | undefined): Brand | null {
  if (!url) return null

  let host: string
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }

  return hostBrands.find(([pattern]) => pattern.test(host))?.[1] ?? null
}
