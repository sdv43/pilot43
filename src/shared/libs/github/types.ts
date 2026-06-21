/**
 * Configuration for the GitHub REST API client.
 *
 * @example
 * ```ts
 * const client = createGitHubClient({ token: "ghp_...", timeoutMs: 15000 })
 * ```
 */
export interface GitHubClientOptions {
  /**
   * Optional GitHub personal access token. When omitted, requests are
   * anonymous and subject to GitHub's stricter unauthenticated rate limits
   * (60 requests/hour per IP vs 5000/hour with a token).
   */
  token?: string
  /**
   * Base URL of the GitHub REST API. Defaults to the public API endpoint
   * (`https://api.github.com`). Useful for GitHub Enterprise Server
   * (`https://<host>/api/v3`).
   */
  baseUrl?: string
  /**
   * Optional `fetch` implementation. Defaults to the global `fetch`. Useful
   * for testing or environments without a native `fetch`.
   */
  fetch?: typeof fetch
  /**
   * Request timeout in milliseconds. Defaults to `10000`. Clamped to a
   * minimum of `1000`. When exceeded the request is aborted and a
   * `GitHubError` with status `408` is thrown.
   */
  timeoutMs?: number
}

/**
 * Pagination parameters accepted by list endpoints.
 *
 * @example
 * ```ts
 * const page1 = await client.listIssues("facebook", "react", { pagination: { page: 1, perPage: 30 } })
 * ```
 */
export interface PaginationParams {
  /**
   * 1-based page number to retrieve. Defaults to `1` when omitted.
   */
  page?: number
  /**
   * Number of items per page. Clamped to the range `1`–`100`. Defaults to
   * `30` when omitted.
   */
  perPage?: number
}

/**
 * Generic paginated response wrapper returned by all list endpoints.
 *
 * @example
 * ```ts
 * const result = await client.listReleases("facebook", "react", { perPage: 10 })
 * if (result.hasNextPage) {
 *   const next = await client.listReleases("facebook", "react", { page: result.nextPage!, perPage: 10 })
 * }
 * ```
 */
export interface PaginatedResult<T> {
  /**
   * Items on the current page.
   */
  items: T[]
  /**
   * The page number that was requested.
   */
  page: number
  /**
   * The page size that was requested (clamped to 1–100).
   */
  perPage: number
  /**
   * The next page number, or `null` if there are no more pages. Derived from
   * GitHub's `Link` response header.
   */
  nextPage: null | number
  /**
   * Whether additional pages are available. Equivalent to `nextPage !== null`.
   */
  hasNextPage: boolean
}

/**
 * High-level repository information returned by
 * {@link GitHubClient.getRepository}.
 */
export interface RepositoryInfo {
  /**
   * Repository owner (user or organization login).
   */
  owner: string
  /**
   * Repository name.
   */
  name: string
  /**
   * Full name in `owner/repo` form.
   */
  fullName: string
  /**
   * Repository description, or `null` if none is set.
   */
  description: null | string
  /**
   * Number of stars (stargazers).
   */
  stargazersCount: number
  /**
   * Absolute URL of the repository on github.com.
   */
  htmlUrl: string
  /**
   * Number of `+1` ("thumbs up") reactions on the repository, if reactions
   * data is available; otherwise `0`.
   */
  likes: number
  /**
   * Total number of reactions on the repository, if reactions data is
   * available; otherwise `0`.
   */
  reactionsTotal: number
}

/**
 * Contributor summary used for maintainer ranking. Returned by
 * {@link GitHubClient.getTopMaintainers}.
 */
export interface Contributor {
  /**
   * GitHub login of the contributor.
   */
  login: string
  /**
   * Total number of contributions (commits) attributed to this contributor.
   */
  contributions: number
  /**
   * Absolute URL of the contributor's GitHub profile.
   */
  profileUrl: string
  /**
   * Absolute URL of the contributor's avatar image.
   */
  avatarUrl: string
}

/**
 * Release summary returned by {@link GitHubClient.listReleases}.
 */
export interface ReleaseInfo {
  /**
   * Unique numeric identifier of the release.
   */
  id: number
  /**
   * Git tag name the release was published from (e.g. `v1.2.3`).
   */
  tagName: string
  /**
   * Human-readable release title, or `null` if the release has no title
   * (in which case `tagName` is usually displayed).
   */
  name: null | string
  /**
   * Release notes / description body in Markdown, or `null` if empty.
   */
  body: null | string
  /**
   * Absolute URL of the release on github.com.
   */
  htmlUrl: string
  /**
   * ISO 8601 publication timestamp, or `null` for drafts that have not been
   * published.
   */
  publishedAt: null | string
  /**
   * Whether the release is marked as a pre-release.
   */
  isPrerelease: boolean
  /**
   * Whether the release is a draft (not visible to non-collaborators).
   */
  isDraft: boolean
}

/**
 * State filter accepted by {@link GitHubClient.listIssues}.
 *
 * - `"open"` — only open issues (default).
 * - `"closed"` — only closed issues.
 * - `"all"` — both open and closed issues.
 */
export type IssueListState = "all" | "closed" | "open"

/**
 * Issue summary returned by {@link GitHubClient.listIssues} and
 * {@link GitHubClient.getIssue}.
 */
export interface IssueInfo {
  /**
   * Issue number (unique within the repository).
   */
  number: number
  /**
   * Issue title.
   */
  title: string
  /**
   * Issue body in Markdown, or `null` if empty.
   */
  body: null | string
  /**
   * Login of the issue author.
   */
  author: string
  /**
   * Current state of the issue.
   */
  state: "closed" | "open"
  /**
   * ISO 8601 creation timestamp.
   */
  createdAt: string
  /**
   * ISO 8601 timestamp of the most recent update.
   */
  updatedAt: string
  /**
   * Total number of comments on the issue (across all pages).
   */
  commentsCount: number
  /**
   * Absolute URL of the issue on github.com.
   */
  htmlUrl: string
  /**
   * Names of labels attached to the issue.
   */
  labels: string[]
  /**
   * Number of `+1` ("thumbs up") reactions on the issue.
   */
  likes: number
  /**
   * Total number of reactions on the issue.
   */
  reactionsTotal: number
}

/**
 * Comment on an issue or pull request. Returned by
 * {@link GitHubClient.listIssueComments} and
 * {@link GitHubClient.listPullRequestComments}.
 */
export interface IssueComment {
  /**
   * Unique numeric identifier of the comment.
   */
  id: number
  /**
   * Login of the comment author.
   */
  author: string
  /**
   * Comment body in Markdown, or `null` if empty.
   */
  body: null | string
  /**
   * ISO 8601 creation timestamp.
   */
  createdAt: string
  /**
   * ISO 8601 timestamp of the most recent edit.
   */
  updatedAt: string
  /**
   * Number of `+1` ("thumbs up") reactions on the comment.
   */
  likes: number
  /**
   * Total number of reactions on the comment.
   */
  reactionsTotal: number
  /**
   * Absolute URL of the comment on github.com.
   */
  htmlUrl: string
}

/**
 * An issue together with one page of its comments. Returned by
 * {@link GitHubClient.getIssueConversation}.
 */
export interface IssueConversation {
  /**
   * The issue metadata.
   */
  issue: IssueInfo
  /**
   * One page of comments on the issue.
   */
  comments: PaginatedResult<IssueComment>
}

/**
 * State filter accepted by {@link GitHubClient.listPullRequests}.
 *
 * - `"open"` — only open pull requests (default).
 * - `"closed"` — only closed (merged or unmerged) pull requests.
 * - `"all"` — both open and closed pull requests.
 */
export type PullRequestListState = "all" | "closed" | "open"

/**
 * Pull request summary returned by {@link GitHubClient.listPullRequests} and
 * {@link GitHubClient.getPullRequest}.
 */
export interface PullRequestInfo {
  /**
   * Pull request number (unique within the repository).
   */
  number: number
  /**
   * Pull request title.
   */
  title: string
  /**
   * Pull request body in Markdown, or `null` if empty.
   */
  body: null | string
  /**
   * Login of the pull request author.
   */
  author: string
  /**
   * Current state of the pull request.
   */
  state: "closed" | "open"
  /**
   * ISO 8601 creation timestamp.
   */
  createdAt: string
  /**
   * ISO 8601 timestamp of the most recent update.
   */
  updatedAt: string
  /**
   * Total number of conversation comments on the pull request (across all
   * pages).
   */
  commentsCount: number
  /**
   * Absolute URL of the pull request on github.com.
   */
  htmlUrl: string
  /**
   * Names of labels attached to the pull request.
   */
  labels: string[]
  /**
   * Whether the pull request is in draft state.
   */
  draft: boolean
  /**
   * Whether the pull request has been merged.
   */
  merged: boolean
  /**
   * Number of `+1` ("thumbs up") reactions on the pull request.
   */
  likes: number
  /**
   * Total number of reactions on the pull request.
   */
  reactionsTotal: number
}

/**
 * A pull request together with one page of its conversation comments.
 * Returned by {@link GitHubClient.getPullRequestConversation}.
 */
export interface PullRequestConversation {
  /**
   * The pull request metadata.
   */
  pullRequest: PullRequestInfo
  /**
   * One page of conversation comments on the pull request.
   */
  comments: PaginatedResult<IssueComment>
}

/**
 * Input accepted by period-based filters such as the `since` option of
 * {@link GitHubClient.listIssues}. Either an ISO 8601 date string (e.g.
 * `"2024-01-01"`), a `Date` instance, or a human-readable duration string
 * such as `"3 months"`, `"2 weeks"`, `"10 days"`, or `"1 year"`.
 *
 * @example
 * ```ts
 * await client.listIssues("facebook", "react", { since: "3 months" })
 * await client.listIssues("facebook", "react", { since: new Date("2024-01-01") })
 * ```
 */
export type PeriodInput = Date | string

/**
 * Error thrown when a GitHub API request fails (non-2xx response, timeout,
 * or network failure).
 *
 * @example
 * ```ts
 * try {
 *   await client.getRepository("facebook", "react")
 * } catch (error) {
 *   if (error instanceof GitHubError) {
 *     console.error(error.status, error.message, error.rateLimitRemaining)
 *   }
 * }
 * ```
 */
export class GitHubError extends Error {
  /**
   * URL of the relevant GitHub documentation for the error, if GitHub
   * provided one in the response body.
   */
  public readonly documentationUrl: null | string
  /**
   * Remaining rate-limit quota reported by GitHub, or `null` if the
   * `X-RateLimit-Remaining` header was absent.
   */
  public readonly rateLimitRemaining: null | number
  /**
   * HTTP status code of the failed response. Timeouts use `408` and network
   * failures use `0`.
   */
  public readonly status: number

  /**
   * @param params.message - Human-readable error message.
   * @param params.status - HTTP status code.
   * @param params.documentationUrl - Optional GitHub docs URL.
   * @param params.rateLimitRemaining - Optional remaining rate-limit quota.
   */
  constructor(params: {
    message: string
    status: number
    documentationUrl?: null | string
    rateLimitRemaining?: null | number
  }) {
    super(params.message)
    this.name = "GitHubError"
    this.status = params.status
    this.documentationUrl = params.documentationUrl ?? null
    this.rateLimitRemaining = params.rateLimitRemaining ?? null
  }
}
