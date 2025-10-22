# OpenHands PR Review Dashboard — MVP Build Plan (Detailed)

Objective
- Build a lightweight, internal dashboard that highlights community PRs (non-employees), shows SLA-focused KPIs, a Community PRs table with filters, and a basic fairness snapshot (review assignment distribution). Read-only; no persistent DB for MVP.

Definition of Done (MVP)
- API: GET /api/dashboard returns KPIs + PRs + reviewer-load summary within <2s for typical org/repo set (with cache warm).
- UI: Landing page shows KPI cards, a Community PRs table with filters and sorting, and a basic fairness indicator.
- Employee exclusion: Uses All-Hands-AI org membership + employees.json overrides; bots excluded.
- Security: GITHUB_TOKEN used server-side only; no leakage to client; adequate error handling/rate-limit handling.
- Caching: Short-lived server cache (60–300s) + client SWR; API exposes rate limit info in debug mode.

Non-goals (for MVP)
- Persistent historical analytics (use Neon later)
- Notifications/digests (Phase 2)
- Automated actions (agent-sdk optional via workflow; dashboard remains read-only)

1) Architecture & Tech Choices
- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS for styling
- Data fetching: GitHub GraphQL API (preferred) with REST fallbacks
- Server-only API routes for GitHub access; no DB for MVP
- In-memory cache on server (TTL-based)
- SWR on client for caching/revalidation

2) Environment & Configuration
- Required env (local .env.local and Vercel env):
  - GITHUB_TOKEN: GitHub PAT with read public repo + read:org
  - ORGS: comma-separated orgs to scan (e.g., All-Hands-AI, OpenHands)
  - REPOS_INCLUDE: comma-separated list (owner/repo) to explicitly include; if empty, auto-discover top N repos
  - REPOS_EXCLUDE: comma-separated list to exclude from auto-discovery
  - SLA_HOURS_FIRST_RESPONSE: default 24
  - SLA_HOURS_FIRST_REVIEW: default 48
  - CACHE_TTL_SECONDS: default 120
- Files:
  - config/employees.json (optional overrides)
    - Format: { "allowlist": ["login1", ...], "denylist": ["login2", ...] }

3) Directory Structure (proposed)
- app/
  - api/
    - dashboard/route.ts
    - test/route.ts
    - config/employees/route.ts (optional debug)
    - review-stats/route.ts
    - workflow-status/route.ts
  - globals.css
  - layout.tsx
  - page.tsx
- components/
  - KpiCard.tsx
  - PrTable.tsx
  - Filters.tsx
  - Badge.tsx
  - FairnessSpark.tsx (simple bar/sparkline)
  - PendingReviewersCard.tsx (shows top pending reviewers summary)
- lib/
  - config.ts (env parsing, defaults)
  - cache.ts (in-memory TTL cache)
  - github.ts (GraphQL/REST helpers)
  - employees.ts (org members fetch + overrides)
  - compute.ts (derivations: KPIs, firsts, fairness)
  - types.ts (shared TS types)

4) Data Model (MVP Types)
- PR
  - repo: string ("owner/repo")
  - number: number
  - title: string
  - url: string
  - authorLogin: string
  - authorAssociation: string
  - isEmployeeAuthor: boolean
  - isDraft: boolean
  - createdAt: string (ISO)
  - updatedAt: string (ISO)
  - labels: string[]
  - requestedReviewers: { users: string[]; teams: string[] }
  - reviews: { authorLogin: string; state: "APPROVED"|"CHANGES_REQUESTED"|"COMMENTED"; submittedAt: string }[]
  - firstHumanResponseAt?: string
  - firstReviewAt?: string
  - ageHours: number (now - createdAt)
  - needsFirstResponse: boolean
  - overdueFirstResponse: boolean
  - overdueFirstReview: boolean

- DashboardResponse
  - kpis: {
      openCommunityPrs: number
      pctCommunityPrs: number
      medianTffrHours?: number
      medianTtfrHours?: number
      assignedReviewerCompliancePct: number
      reviewerLoad: { [login: string]: number } // open PRs where requested
    }
  - prs: PR[] // filtered to community authors by default
  - rateLimit?: { remaining: number; resetAt: string }

5) GraphQL Queries (MVP)
- Org Members (preferred for employee exclusion)
  - Query (paginated):
    query OrgMembers($login: String!, $cursor: String) {
      organization(login: $login) {
        membersWithRole(first: 100, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes { login }
        }
      }
      rateLimit { remaining resetAt }
    }

- Open PRs (per repo; paginated)
  - Query:
    query OpenPRs($owner: String!, $name: String!, $cursor: String) {
      repository(owner: $owner, name: $name) {
        pullRequests(states: OPEN, first: 50, after: $cursor, orderBy: {field: CREATED_AT, direction: DESC}) {
          pageInfo { hasNextPage endCursor }
          nodes {
            number title url createdAt updatedAt isDraft authorAssociation
            author { login }
            mergeable
            labels(first: 20) { nodes { name } }
            reviewRequests(first: 20) {
              nodes { requestedReviewer { __typename ... on User { login } ... on Team { slug } } }
            }
            reviews(first: 50) {
              nodes { author { login } state submittedAt }
            }
          }
        }
      }
      rateLimit { remaining resetAt }
    }

- REST fallbacks
  - GET /orgs/{org}/members (paginated) for employee exclusion
  - GET /repos/{owner}/{repo}/pulls?state=open&per_page=100
  - GET /repos/{owner}/{repo}/pulls/{number}/reviews
  - GET /rate_limit to expose rate info when needed

6) Derivation Rules (MVP)
- isEmployee(login): login in (OrgMembers ∪ employees.allowlist) and not in employees.denylist
- Community PR: !isEmployee(author) and not a bot
- First human response: earliest review submitted by any employee reviewer (approximation for MVP; Phase 2 can inspect comments/timeline)
- First review: earliest review by any reviewer (employee or not)
- Age buckets (for filters): 0–24h, 24–48h, 48–96h, >96h (compute via ageHours)
- SLA flags:
  - needsFirstResponse: firstHumanResponseAt undefined
  - overdueFirstResponse: needsFirstResponse && ageHours > SLA_HOURS_FIRST_RESPONSE
  - overdueFirstReview: firstReviewAt undefined && ageHours > SLA_HOURS_FIRST_REVIEW
- Assigned reviewer compliance: % of open PRs with requestedReviewers.users length > 0 (teams optional for MVP)
- Reviewer load (basic fairness): count open PRs where each user is in requestedReviewers.users

7) Caching Strategy (MVP)
- Server in-memory TTL cache (CACHE_TTL_SECONDS default 120) keyed by:
  - employees: org -> Set<string>
  - repo PRs: owner/repo -> { data, fetchedAt }
  - dashboard rollup: hash(orgs, repos, filters) -> response
- Cache invalidation: TTL expiry; Manual refresh by reloading page; Add query param ?debug=true to bypass cache optionally
- Expose rateLimit (remaining, resetAt) only when debug=true

8) API Design
- GET /api/test
  - Purpose: Validate token and basic GraphQL call
  - Response: { ok: true, viewer?: string, rateLimit?: { remaining, resetAt } }

- GET /api/config/employees (optional; debug)
  - Purpose: Inspect resolved employees set size and sample
  - Response: { org: string, count: number, sample: string[] }

- GET /api/dashboard
  - Query Params (all optional):
    - repos=owner1/repo1,owner2/repo2 (override configured list)
    - labels=needs-review,good-first-issue
    - age=0-24|24-48|48-96|96+
    - debug=true
  - Response: DashboardResponse (see types)
  - Behavior:
    - Build employees set (All-Hands-AI + overrides) with cache
    - For each repo, fetch open PRs (GraphQL paginated), compute derived fields
    - Filter to Community PRs by default; if labels provided, filter PRs with any label in list
    - Aggregate KPIs and reviewerLoad
    - Include rateLimit when debug=true

- GET /api/review-stats
  - Purpose: Parity with Graham's script; feed Overview accountability cards
  - Response: { totalOpenPRs, pendingReviewRequests, nonDraftPRsWithoutReviewers, topPendingReviewers: [{name, count}], uniqueReviewersWithPending }

- GET /api/workflow-status
  - Purpose: Show which repos have auto-assign workflow configured
  - Response: { repo: string, hasWorkflow: boolean, url?: string }[]

9) Implementation Steps (Code Skeletons)
- lib/config.ts
  - Parse env, provide defaults
  - Export obj: { orgs, reposInclude, reposExclude, slaFirstResponse, slaFirstReview, cacheTtl }

- lib/cache.ts
  - Simple Map<string, { data: any; expiry: number }>
  - get(key), set(key, data, ttl), withCache(key, ttl, fetcher)

- lib/github.ts
  - fetchGitHub(url, { method, body, headers }) with Authorization: Bearer
  - graphql<T>(query, variables): POST https://api.github.com/graphql
  - getOrgMembersGraphQL(org): paginate membersWithRole
  - getOrgMembersREST(org): paginate /orgs/{org}/members
  - getOpenPRsGraphQL(owner, repo): paginate pullRequests

- lib/employees.ts
  - loadOverrides(): read config/employees.json if present
  - buildEmployeesSet(orgs[]): try GraphQL (membersWithRole), fallback REST; merge allowlist/denylist

- lib/compute.ts
  - computeFirsts(pr, employeesSet)
  - computeFlags(pr, now, slaFirstResponse, slaFirstReview)
  - computeKpis(prs)
  - computeReviewerLoad(prs)

- lib/types.ts
  - Export PR, DashboardResponse, etc.

- app/api/test/route.ts
  - Calls a trivial GraphQL query (e.g., viewer.login or rateLimit)

- app/api/dashboard/route.ts
  - Parse filters from URLSearchParams
  - withCache("dashboard:...", ttl, async () => assemble response)

- app/page.tsx (client component or RSC + client parts)
  - useSWR('/api/dashboard?...')
  - Render KPI cards, FairnessSpark, Filters, PrTable
  - Overview Accountability Cards:
    - Show totalOpenPRs, pendingReviewRequests, nonDraftPRsWithoutReviewers
    - Highlight top 3 pending reviewers with counts


- components/KpiCard.tsx
- components/FairnessSpark.tsx (e.g., small horizontal bar list of top 5 reviewers)
- components/Filters.tsx (repo multi-select, label chips, age dropdown)
- components/PrTable.tsx (virtualized optional; simple table for MVP with sortable columns)

10) Error & Rate-limit Handling
- Central GitHub error handler: if 403 with rate-limit, return 429 with { message, resetAt }
- UI displays banner when API returns 429; show “Resets at …” and advise retry
- Log errors server-side with minimal PII; never log tokens
- Always include rateLimit info on debug=true for diagnostics

11) UI Details (MVP)
- Header: Title, theme toggle, repo selector (multiselect)
- KPI cards:
  - Community PRs Open (count)
  - % Community (of all open PRs in scope)
  - Median TFFR (hours; approximate via employee reviews only)
  - Assigned Reviewer Compliance (%)
- FairnessSpark: list top 5 reviewers by assigned open reviews ("login: count") + total distinct reviewers
- Community PRs Table columns:
  - Repo | Title | Author | Age | Assigned Reviewers | Last Human Activity | Badges
  - Badges: community, overdue-first-response, overdue-first-review, needs-first-response
- Filters: repo, age bucket, labels; text search on title/author optional (Phase 2)
- Sorting: age desc default; allow sort by repo, age, author

12) Testing Plan
- Unit tests (lib/compute.ts)
  - computeFirsts: scenarios with/without reviews, employee/non-employee
  - computeFlags: SLA edge boundaries (exactly 24h, 48h)
  - computeKpis: correctness on small fixtures
- Integration tests
  - app/api/dashboard: mock GitHub GraphQL/REST with fixed fixtures, verify response shape and filters
- Manual QA
  - Token misconfig produces clear 401/403 messages on /api/test
  - Debug mode shows rateLimit
  - Large repo set still responds within reasonable time with cache warm

13) Performance Considerations
- Fetch repos sequentially with small concurrency (e.g., 3–5) to be gentle on API
- GraphQL pagination: stop after N pages per repo for MVP (configurable MAX_PR_PAGES_PER_REPO)
- Trim reviews fetched to first 50 per PR for MVP
- Avoid fetching issue comments/timeline until Phase 2

14) Security & Privacy
- GITHUB_TOKEN only in server-side code
- Set Cache-Control headers for API responses to prevent CDN caching sensitive data
- Do not return employee set raw; only counts and debug samples in /api/config/employees (and only when NODE_ENV !== 'production' or debug=true)

15) Deployment (Vercel recommended)
- Set env vars (GITHUB_TOKEN, optional ORGS/REPOS/SLA/CACHE_TTL)
- Build and deploy; verify /api/test
- Configure Vercel project to not expose server logs publicly

16) Extensions (Post-MVP hooks)
- Neon + nightly cron to store snapshots for 30/90-day trends
- Agent SDK GitHub Action (assign-reviews.yml) with dashboard surfacing of compliance and workflow status
- My Review Queue tab; Assignment Health tab; Outlier detection and suggested reassignment

Appendix A: Example Types (TS)
```ts
// lib/types.ts
export type ReviewState = 'APPROVED'|'CHANGES_REQUESTED'|'COMMENTED';
export type Review = { authorLogin: string; state: ReviewState; submittedAt: string };
export type RequestedReviewers = { users: string[]; teams: string[] };
export type PR = {
  repo: string;
  number: number;
  title: string;
  url: string;
  authorLogin: string;
  authorAssociation: string;
  isEmployeeAuthor: boolean;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  labels: string[];
  requestedReviewers: RequestedReviewers;
  reviews: Review[];
  firstHumanResponseAt?: string;
  firstReviewAt?: string;
  ageHours: number;
  needsFirstResponse: boolean;
  overdueFirstResponse: boolean;
  overdueFirstReview: boolean;
};
export type DashboardResponse = {
  kpis: {
    openCommunityPrs: number;
    pctCommunityPrs: number;
    medianTffrHours?: number;
    medianTtfrHours?: number;
    assignedReviewerCompliancePct: number;
    reviewerLoad: Record<string, number>;
  };
  prs: PR[];
  rateLimit?: { remaining: number; resetAt: string };
};
```

Appendix B: Example API Response (abbreviated)
```json
{
  "kpis": {
    "openCommunityPrs": 12,
    "pctCommunityPrs": 0.46,
    "medianTffrHours": 18,
    "medianTtfrHours": 35,
    "assignedReviewerCompliancePct": 0.78,
    "reviewerLoad": { "alice": 4, "bob": 3, "carol": 2 }
  },
  "prs": [
    {
      "repo": "All-Hands-AI/OpenHands",
      "number": 1234,
      "title": "Fix edge case in planner",
      "url": "https://github.com/All-Hands-AI/OpenHands/pull/1234",
      "authorLogin": "external-dev",
      "authorAssociation": "CONTRIBUTOR",
      "isEmployeeAuthor": false,
      "isDraft": false,
      "createdAt": "2025-10-20T10:00:00Z",
      "updatedAt": "2025-10-21T14:20:00Z",
      "labels": ["needs-review"],
      "requestedReviewers": {"users": ["alice"], "teams": []},
      "reviews": [{"authorLogin": "alice", "state": "COMMENTED", "submittedAt": "2025-10-20T15:00:00Z"}],
      "firstHumanResponseAt": "2025-10-20T15:00:00Z",
      "firstReviewAt": "2025-10-20T15:00:00Z",
      "ageHours": 28,
      "needsFirstResponse": false,
      "overdueFirstResponse": false,
      "overdueFirstReview": false
    }
  ],
  "rateLimit": { "remaining": 4822, "resetAt": "2025-10-21T22:00:00Z" }
}
```

Appendix C: Example GraphQL Snippets
```graphql
query OrgMembers($login: String!, $cursor: String) {
  organization(login: $login) {
    membersWithRole(first: 100, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes { login }
    }
  }
  rateLimit { remaining resetAt }
}

query OpenPRs($owner: String!, $name: String!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    pullRequests(states: OPEN, first: 50, after: $cursor, orderBy: {field: CREATED_AT, direction: DESC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number title url createdAt updatedAt isDraft authorAssociation
        author { login }
        mergeable
        labels(first: 20) { nodes { name } }
        reviewRequests(first: 20) {
          nodes { requestedReviewer { __typename ... on User { login } ... on Team { slug } } }
        }
        reviews(first: 50) {
          nodes { author { login } state submittedAt }
        }
      }
    }
  }
  rateLimit { remaining resetAt }
}
```
