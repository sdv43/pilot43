const PARSE_REPO_URL_REGEX =
  /^(?:https?:\/\/)?(?:[^/]+\.)?github\.com\/([^/]+)\/([^/?#]+)/i

/**
 * Parses a GitHub repository URL and returns the owner and repo segments.
 *
 * Accepts forms like:
 * - `https://github.com/owner/repo`
 * - `http://github.com/owner/repo`
 * - `github.com/owner/repo`
 * - `https://github.com/owner/repo.git`
 * - `https://github.com/owner/repo/anything/else?query=1#fragment`
 */
export function parseRepoUrl(url: string): { owner: string; repo: string } {
  if (typeof url !== "string" || !url.trim()) {
    throw new Error("Repository URL must be a non-empty string.")
  }

  const match = PARSE_REPO_URL_REGEX.exec(url.trim())
  if (!match || !match[1] || !match[2]) {
    throw new Error(
      `Invalid GitHub repository URL: \`${url}\`. Expected a URL like \`https://github.com/owner/repo\`.`,
    )
  }

  const owner = match[1]
  let repo = match[2]

  if (repo.endsWith(".git")) {
    repo = repo.slice(0, -".git".length)
  }

  if (!owner || !repo) {
    throw new Error(
      `Invalid GitHub repository URL: \`${url}\`. Missing owner or repository name.`,
    )
  }

  return { owner, repo }
}
