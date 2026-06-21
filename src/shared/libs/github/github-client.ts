import type {
  Contributor,
  GitHubClientOptions,
  IssueComment,
  IssueConversation,
  IssueInfo,
  IssueListState,
  PaginatedResult,
  PaginationParams,
  PeriodInput,
  PullRequestConversation,
  PullRequestInfo,
  PullRequestListState,
  ReleaseInfo,
  RepositoryInfo,
} from "./types"

import { normalizePagination, parseLinkHeader } from "./pagination"
import { parsePeriodToSince } from "./parse-period"
import { parseRepoUrl } from "./parse-repo-url"
import { GitHubError } from "./types"

const DEFAULT_BASE_URL = "https://api.github.com"
const DEFAULT_TIMEOUT_MS = 10000
const GITHUB_API_VERSION = "2026-03-10"
const ACCEPT_HEADER = "application/vnd.github+json"

interface RequestOptions {
  method?: string
  query?: Record<string, number | string | undefined>
  pagination?: PaginationParams
  body?: unknown
}

interface RequestResult<T> {
  data: T
  link: null | string
}

interface GitHubApiReactions {
  "+1": number
  "-1": number
  confused: number
  eyes: number
  heart: number
  hooray: number
  laugh: number
  rocket: number
  total_count: number
  url: string
}

/**
 * Public GitHub client. Construct an instance with {@link createGitHubClient}.
 */
export interface GitHubClient {
  /**
   * Fetches high-level information about a repository: name, description,
   * stars count, and reactions.
   *
   * @example
   * ```ts
   * const gh = createGitHubClient({ token: "ghp_..." })
   * const repo = await gh.getRepository("facebook", "react")
   * console.log(repo.fullName, repo.stargazersCount, repo.description)
   * ```
   */
  getRepository(owner: string, repo: string): Promise<RepositoryInfo>
  /**
   * Convenience wrapper around {@link GitHubClient.getRepository} that parses
   * the owner and repo directly from a GitHub URL.
   *
   * @example
   * ```ts
   * const gh = createGitHubClient()
   * const repo = await gh.getRepositoryFromUrl("https://github.com/facebook/react")
   * ```
   */
  getRepositoryFromUrl(url: string): Promise<RepositoryInfo>
  /**
   * Returns the most active maintainers (top contributors by commit count).
   * Defaults to the top 3; override with `options.limit`.
   *
   * @example
   * ```ts
   * const gh = createGitHubClient()
   * const top = await gh.getTopMaintainers("facebook", "react", { limit: 3 })
   * for (const c of top) console.log(c.login, c.contributions)
   * ```
   */
  getTopMaintainers(
    owner: string,
    repo: string,
    options?: { limit?: number },
  ): Promise<Contributor[]>
  /**
   * Lists repository releases, newest first. Use `per_page` to fetch a
   * specific number (e.g. `10` for the latest 10). Each release includes its
   * `body` (release notes/description).
   *
   * @example
   * ```ts
   * const gh = createGitHubClient()
   * const { items } = await gh.listReleases("facebook", "react", { perPage: 10 })
   * for (const r of items) console.log(r.tagName, r.body)
   * ```
   */
  listReleases(
    owner: string,
    repo: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<ReleaseInfo>>
  /**
   * Lists repository issues, automatically excluding pull requests which share
   * the issues endpoint. Optionally filter by `state`, a time window via
   * `since` (e.g. `"3 months"`, `"2 weeks"`, a `Date`, or an ISO string), and
   * one or more `labels`.
   *
   * @example
   * ```ts
   * const gh = createGitHubClient()
   * const { items } = await gh.listIssues("facebook", "react", {
   *   state: "open",
   *   since: "3 months",
   *   labels: ["bug"],
   *   perPage: 30,
   * })
   * ```
   */
  listIssues(
    owner: string,
    repo: string,
    options?: {
      state?: IssueListState
      since?: PeriodInput
      labels?: string[]
      pagination?: PaginationParams
    },
  ): Promise<PaginatedResult<IssueInfo>>
  /**
   * Fetches a single issue by its number. Throws `GitHubError` (status 404) if
   * the number refers to a pull request.
   *
   * @example
   * ```ts
   * const gh = createGitHubClient()
   * const issue = await gh.getIssue("facebook", "react", 12345)
   * console.log(issue.title, issue.body)
   * ```
   */
  getIssue(owner: string, repo: string, number: number): Promise<IssueInfo>
  /**
   * Lists comments on an issue (or pull request conversation), ordered
   * oldest-first. Paginated.
   *
   * @example
   * ```ts
   * const gh = createGitHubClient()
   * const page1 = await gh.listIssueComments("facebook", "react", 12345, { perPage: 30 })
   * const page2 = await gh.listIssueComments("facebook", "react", 12345, { perPage: 30, page: 2 })
   * ```
   */
  listIssueComments(
    owner: string,
    repo: string,
    number: number,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<IssueComment>>
  /**
   * Fetches an issue together with one page of its comments in a single call.
   *
   * @example
   * ```ts
   * const gh = createGitHubClient()
   * const { issue, comments } = await gh.getIssueConversation("facebook", "react", 12345)
   * console.log(issue.title)
   * for (const c of comments.items) console.log(c.author, c.body)
   * ```
   */
  getIssueConversation(
    owner: string,
    repo: string,
    number: number,
    pagination?: PaginationParams,
  ): Promise<IssueConversation>
  /**
   * Lists repository pull requests. Optionally filter by `state`
   * (`"open"` | `"closed"` | `"all"`).
   *
   * @example
   * ```ts
   * const gh = createGitHubClient()
   * const { items } = await gh.listPullRequests("facebook", "react", { state: "open", perPage: 20 })
   * for (const pr of items) console.log(pr.number, pr.title, pr.draft)
   * ```
   */
  listPullRequests(
    owner: string,
    repo: string,
    options?: {
      state?: PullRequestListState
      pagination?: PaginationParams
    },
  ): Promise<PaginatedResult<PullRequestInfo>>
  /**
   * Fetches a single pull request by its number.
   *
   * @example
   * ```ts
   * const gh = createGitHubClient()
   * const pr = await gh.getPullRequest("facebook", "react", 12345)
   * console.log(pr.title, pr.merged, pr.draft)
   * ```
   */
  getPullRequest(
    owner: string,
    repo: string,
    number: number,
  ): Promise<PullRequestInfo>
  /**
   * Lists the conversation comments on a pull request (issue-style comments,
   * excluding inline review comments). Paginated.
   *
   * @example
   * ```ts
   * const gh = createGitHubClient()
   * const { items } = await gh.listPullRequestComments("facebook", "react", 12345, { perPage: 30 })
   * for (const c of items) console.log(c.author, c.likes)
   * ```
   */
  listPullRequestComments(
    owner: string,
    repo: string,
    number: number,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<IssueComment>>
  /**
   * Fetches a pull request together with one page of its conversation
   * comments in a single call.
   *
   * @example
   * ```ts
   * const gh = createGitHubClient()
   * const { pullRequest, comments } = await gh.getPullRequestConversation("facebook", "react", 12345)
   * console.log(pullRequest.title)
   * for (const c of comments.items) console.log(c.author, c.body, c.likes)
   * ```
   */
  getPullRequestConversation(
    owner: string,
    repo: string,
    number: number,
    pagination?: PaginationParams,
  ): Promise<PullRequestConversation>
}

/**
 * Creates a configured GitHub REST API client.
 */
export function createGitHubClient(
  options: GitHubClientOptions = {},
): GitHubClient {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "")
  const fetchImpl = options.fetch ?? fetch
  const timeoutMs =
    typeof options.timeoutMs === "number" && Number.isFinite(options.timeoutMs)
      ? Math.max(1000, options.timeoutMs)
      : DEFAULT_TIMEOUT_MS

  function buildHeaders(hasBody: boolean): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: ACCEPT_HEADER,
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    }

    if (options.token) {
      headers.Authorization = `Bearer ${options.token}`
    }

    if (hasBody) {
      headers["Content-Type"] = "application/json"
    }

    return headers
  }

  function buildUrl(
    path: string,
    query: RequestOptions["query"],
    pagination: RequestOptions["pagination"],
  ): string {
    const searchParams = new URLSearchParams()
    const normalized = normalizePagination(pagination)
    searchParams.set("page", String(normalized.page))
    searchParams.set("per_page", String(normalized.perPage))

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          searchParams.set(key, String(value))
        }
      }
    }

    return `${baseUrl}${path}?${searchParams.toString()}`
  }

  async function parseErrorBody(
    response: Response,
  ): Promise<{ documentationUrl: null | string; message: string }> {
    try {
      const body = (await response.json()) as unknown
      if (isPlainObject(body)) {
        const message = typeof body.message === "string" ? body.message : ""
        const docUrl =
          typeof body.documentation_url === "string"
            ? body.documentation_url
            : null
        return { documentationUrl: docUrl, message }
      }
    } catch {
      // Body was not JSON; fall through to default message.
    }

    return { documentationUrl: null, message: "" }
  }

  function rateLimitRemaining(response: Response): null | number {
    const header = response.headers.get("x-ratelimit-remaining")
    if (header === null) {
      return null
    }
    const value = Number.parseInt(header, 10)
    return Number.isFinite(value) ? value : null
  }

  async function buildGitHubError(response: Response): Promise<GitHubError> {
    const { documentationUrl, message } = await parseErrorBody(response)
    const remaining = rateLimitRemaining(response)

    if (response.status === 404) {
      return new GitHubError({
        documentationUrl,
        message: message || "Resource not found.",
        rateLimitRemaining: remaining,
        status: 404,
      })
    }

    if (response.status === 403 && remaining === 0) {
      return new GitHubError({
        documentationUrl,
        message:
          "GitHub API rate limit exceeded. Provide a personal access token to increase the limit.",
        rateLimitRemaining: remaining,
        status: 403,
      })
    }

    return new GitHubError({
      documentationUrl,
      message:
        message || `GitHub API request failed with status ${response.status}.`,
      rateLimitRemaining: remaining,
      status: response.status,
    })
  }

  async function request<T>(
    path: string,
    requestOptions: RequestOptions = {},
  ): Promise<RequestResult<T>> {
    const method = requestOptions.method ?? "GET"
    const hasBody = requestOptions.body !== undefined
    const url = buildUrl(path, requestOptions.query, requestOptions.pagination)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, timeoutMs)

    let response: Response

    try {
      response = await fetchImpl(url, {
        body: hasBody ? JSON.stringify(requestOptions.body) : undefined,
        headers: buildHeaders(hasBody),
        method,
        signal: controller.signal,
      })
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === "AbortError") {
        throw new GitHubError({
          message: `GitHub API request timed out after ${timeoutMs} ms.`,
          status: 408,
        })
      }
      throw new GitHubError({
        message:
          error instanceof Error
            ? `GitHub API request failed: ${error.message}`
            : "GitHub API request failed.",
        status: 0,
      })
    }

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw await buildGitHubError(response)
    }

    if (response.status === 204) {
      return {
        data: undefined as unknown as T,
        link: response.headers.get("link"),
      }
    }

    const data = (await response.json()) as T
    return {
      data,
      link: response.headers.get("link"),
    }
  }

  async function requestList<T>(
    path: string,
    requestOptions: RequestOptions = {},
  ): Promise<PaginatedResult<T>> {
    const normalized = normalizePagination(requestOptions.pagination)
    const result = await request<T[]>(path, requestOptions)
    const links = parseLinkHeader(result.link)

    const nextPage =
      links.next !== undefined && links.next > normalized.page
        ? links.next
        : null

    return {
      items: Array.isArray(result.data) ? result.data : [],
      page: normalized.page,
      perPage: normalized.perPage,
      nextPage,
      hasNextPage: nextPage !== null,
    }
  }

  const client: GitHubClient = {
    async getRepository(owner, repo) {
      const result = await request<GitHubApiRepository>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      )
      return mapRepository(result.data)
    },

    async getRepositoryFromUrl(url) {
      const { owner, repo } = parseRepoUrl(url)
      return client.getRepository(owner, repo)
    },

    async getTopMaintainers(owner, repo, options) {
      const limit = options?.limit ?? 3
      const result = await requestList<GitHubApiContributor>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contributors`,
        {
          pagination: { perPage: Math.min(100, Math.max(1, limit)) },
        },
      )
      return result.items.slice(0, limit).map(mapContributor)
    },

    async listReleases(owner, repo, pagination) {
      const result = await requestList<GitHubApiRelease>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases`,
        { pagination },
      )
      return { ...result, items: result.items.map(mapRelease) }
    },

    async listIssues(owner, repo, options) {
      const state = options?.state ?? "open"
      const query: Record<string, number | string | undefined> = { state }

      if (options?.since !== undefined) {
        query.since = parsePeriodToSince(options.since)
      }

      if (options?.labels && options.labels.length > 0) {
        query.labels = options.labels.join(",")
      }

      const result = await requestList<GitHubApiIssue>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
        { pagination: options?.pagination, query },
      )

      const issues = result.items
        .filter((item) => !isPullRequestIssue(item))
        .map(mapIssue)

      return { ...result, items: issues }
    },

    async getIssue(owner, repo, number) {
      const result = await request<GitHubApiIssue>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${number}`,
      )
      if (isPullRequestIssue(result.data)) {
        throw new GitHubError({
          message: `Issue #${number} is a pull request.`,
          status: 404,
        })
      }
      return mapIssue(result.data)
    },

    async listIssueComments(owner, repo, number, pagination) {
      const result = await requestList<GitHubApiIssueComment>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${number}/comments`,
        { pagination },
      )
      return { ...result, items: result.items.map(mapIssueComment) }
    },

    async getIssueConversation(owner, repo, number, pagination) {
      const issue = await client.getIssue(owner, repo, number)
      const comments = await client.listIssueComments(
        owner,
        repo,
        number,
        pagination,
      )
      return { comments, issue }
    },

    async listPullRequests(owner, repo, options) {
      const state = options?.state ?? "open"
      const result = await requestList<GitHubApiPullRequest>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`,
        { pagination: options?.pagination, query: { state } },
      )
      return { ...result, items: result.items.map(mapPullRequest) }
    },

    async getPullRequest(owner, repo, number) {
      const result = await request<GitHubApiPullRequest>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}`,
      )
      return mapPullRequest(result.data)
    },

    async listPullRequestComments(owner, repo, number, pagination) {
      const result = await requestList<GitHubApiIssueComment>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${number}/comments`,
        { pagination },
      )
      return { ...result, items: result.items.map(mapIssueComment) }
    },

    async getPullRequestConversation(owner, repo, number, pagination) {
      const pullRequest = await client.getPullRequest(owner, repo, number)
      const comments = await client.listPullRequestComments(
        owner,
        repo,
        number,
        pagination,
      )
      return { comments, pullRequest }
    },
  }

  return client
}

/**
 * Convenience helper: fetch repository info directly from a repository URL
 * using a transient client. Equivalent to constructing a client with
 * {@link createGitHubClient} and calling
 * {@link GitHubClient.getRepositoryFromUrl}.
 *
 * @example
 * ```ts
 * const info = await getRepoInfoFromUrl("https://github.com/facebook/react", { token: "ghp_..." })
 * console.log(info.fullName, info.stargazersCount, info.description)
 * ```
 */
export async function getRepoInfoFromUrl(
  url: string,
  options?: GitHubClientOptions,
): Promise<RepositoryInfo> {
  const client = createGitHubClient(options ?? {})
  return client.getRepositoryFromUrl(url)
}

// --- Field accessors (strict-typed, no `any`) ---

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asObject(value: unknown): Record<string, unknown> {
  if (!isPlainObject(value)) {
    return {}
  }
  return value
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function asReactions(value: unknown): GitHubApiReactions | null {
  if (!isPlainObject(value)) {
    return null
  }
  return value as unknown as GitHubApiReactions
}

function asLabelNames(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .map((label) => asObject(label).name)
    .filter((name): name is string => typeof name === "string")
}

function extractAuthor(login: unknown): string {
  const loginValue = asObject(login).login
  return typeof loginValue === "string" ? loginValue : "unknown"
}

function likesFromReactions(reactions: GitHubApiReactions | null): number {
  return reactions ? asNumber(reactions["+1"]) : 0
}

function totalFromReactions(reactions: GitHubApiReactions | null): number {
  return reactions ? asNumber(reactions.total_count) : 0
}

function isPullRequestIssue(item: GitHubApiIssue): boolean {
  return Boolean(asObject(item.pull_request).url)
}

// --- GitHub API response shapes ---

interface GitHubApiRepository {
  full_name: string
  name: string
  description: null | string
  stargazers_count: number
  html_url: string
  owner: { login: string }
  reactions?: GitHubApiReactions
}

interface GitHubApiContributor {
  login: string
  contributions: number
  html_url: string
  avatar_url: string
  type: string
}

interface GitHubApiRelease {
  id: number
  tag_name: string
  name: null | string
  body: null | string
  html_url: string
  published_at: null | string
  prerelease: boolean
  draft: boolean
}

interface GitHubApiIssue {
  number: number
  title: string
  body: null | string
  user: { login: string }
  state: "closed" | "open"
  created_at: string
  updated_at: string
  comments: number
  html_url: string
  labels: unknown[]
  reactions?: GitHubApiReactions
  pull_request?: { url: string }
}

interface GitHubApiIssueComment {
  id: number
  user: { login: string }
  body: null | string
  created_at: string
  updated_at: string
  html_url: string
  reactions?: GitHubApiReactions
}

interface GitHubApiPullRequest {
  number: number
  title: string
  body: null | string
  user: { login: string }
  state: "closed" | "open"
  created_at: string
  updated_at: string
  comments: number
  html_url: string
  labels: unknown[]
  draft: boolean
  merged: boolean
  reactions?: GitHubApiReactions
}

// --- Mappers ---

function mapRepository(data: GitHubApiRepository): RepositoryInfo {
  const reactions = asReactions(
    (data as unknown as Record<string, unknown>).reactions,
  )
  return {
    owner: extractAuthor(data.owner),
    name: data.name,
    fullName: data.full_name,
    description: data.description,
    stargazersCount: data.stargazers_count,
    htmlUrl: data.html_url,
    likes: likesFromReactions(reactions),
    reactionsTotal: totalFromReactions(reactions),
  }
}

function mapContributor(data: GitHubApiContributor): Contributor {
  return {
    login: data.login,
    contributions: data.contributions,
    profileUrl: data.html_url,
    avatarUrl: data.avatar_url,
  }
}

function mapRelease(data: GitHubApiRelease): ReleaseInfo {
  return {
    id: data.id,
    tagName: data.tag_name,
    name: data.name,
    body: data.body,
    htmlUrl: data.html_url,
    publishedAt: data.published_at,
    isPrerelease: data.prerelease,
    isDraft: data.draft,
  }
}

function mapIssue(data: GitHubApiIssue): IssueInfo {
  const reactions = asReactions(data.reactions)
  return {
    number: data.number,
    title: data.title,
    body: data.body,
    author: extractAuthor(data.user),
    state: data.state,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    commentsCount: data.comments,
    htmlUrl: data.html_url,
    labels: asLabelNames(data.labels),
    likes: likesFromReactions(reactions),
    reactionsTotal: totalFromReactions(reactions),
  }
}

function mapIssueComment(data: GitHubApiIssueComment): IssueComment {
  const reactions = asReactions(data.reactions)
  return {
    id: data.id,
    author: extractAuthor(data.user),
    body: data.body,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    htmlUrl: data.html_url,
    likes: likesFromReactions(reactions),
    reactionsTotal: totalFromReactions(reactions),
  }
}

function mapPullRequest(data: GitHubApiPullRequest): PullRequestInfo {
  const reactions = asReactions(data.reactions)
  return {
    number: data.number,
    title: data.title,
    body: data.body,
    author: extractAuthor(data.user),
    state: data.state,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    commentsCount: data.comments,
    htmlUrl: data.html_url,
    labels: asLabelNames(data.labels),
    draft: data.draft,
    merged: data.merged,
    likes: likesFromReactions(reactions),
    reactionsTotal: totalFromReactions(reactions),
  }
}
