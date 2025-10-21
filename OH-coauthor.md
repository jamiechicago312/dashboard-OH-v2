# OpenHands Co-Author Analysis — Design (Between MVP and Phase 2)

Purpose
- Provide a robust, auditable way to detect and analyze PRs co-authored by OpenHands across all public All-Hands-AI repositories.
- Support domain transition: detect both openhands@all-hands.dev and openhands@openhands.dev co-author footers.
- Enable breakdowns by time, repo, and outcomes for community PRs.

Scope
- Repos: All public repos in the All-Hands-AI org (optionally exclude forks/archived)
- PR set: OPEN, MERGED, CLOSED (time window configurable, e.g., 60–90 days initially)
- Community PR definition: author NOT in All-Hands-AI org membership and NOT a bot
- OpenHands co-author definition: any PR where at least one commit contains a valid Co-authored-by footer matching OpenHands emails (see below). Squash merge footers count.

Co-author Detection (Core)
- Primary method: Parse Co-authored-by footers in commit messages.
  - Footer format (GitHub standard): `Co-authored-by: Name <email>`
  - Emails to match (case-insensitive):
    - openhands@all-hands.dev
    - openhands@openhands.dev
  - Regex (robust example, case-insensitive, multiline):
    - `(?mi)^Co-authored-by:\s*.*?<\s*(?:openhands@all-hands\.dev|openhands@openhands\.dev)\s*>\s*$`
- Secondary signals (optional, lower priority):
  - Commit author/committer email equals one of the OpenHands emails
  - Commit author/committer user login equals a known OpenHands service account
- Evidence model captured per PR:
  - `hasOpenHandsCoauthor: boolean`
  - `coauthorEvidence: { kind: 'footer'|'merge_footer'|'author_email'|'committer_email'; email: string; sha?: string }[]` (distinct entries)

Data Acquisition
- Enumerate repos (GraphQL):
  - `organization(login: "All-Hands-AI") { repositories(privacy: PUBLIC, isFork: false, first: 100, after: $cursor) { nodes { name } } }`
- Build employee set (for community classification):
  - Preferred GraphQL: `organization.membersWithRole`
  - Fallback REST: `GET /orgs/All-Hands-AI/members`
- Pull PRs (GraphQL preferred):
  - `repository(owner: $owner, name: $name) { pullRequests(states: [OPEN, MERGED, CLOSED], first: 50, after: $cursor, orderBy: {field: CREATED_AT, direction: DESC}) { nodes { ... } } }`
  - Fields needed on PR nodes:
    - `number title url createdAt updatedAt merged mergedAt isDraft authorAssociation author { login }`
    - `mergeCommit { oid message }` (squash/merge footer check)
    - `commits(first: 100, after: $cursor) { nodes { commit { oid message author { email user { login } } committer { email user { login } } } pageInfo { hasNextPage endCursor } } }`
    - `reviewRequests`, `reviews` as already defined in MVP
- Processing order for co-author detection:
  1) If merged and `mergeCommit` exists, scan `mergeCommit.message` for co-author footers (fast path for squash merges)
  2) If not found, paginate `pullRequest.commits` and scan each `commit.message` for a match
     - Early stop: once a match is detected, stop paginating further
  3) Optionally record author/committer email/user signals if they match OpenHands

Classification & Derivations
- `isEmployee(login)`: derived from org membership ∪ employees.json allowlist minus denylist
- `isCommunity(pr)`: `!isEmployee(pr.author.login)` and `!isBot(pr.author.login)`
- `hasOpenHandsCoauthor(pr)`: true if any evidence item recorded
- SLA fields (reuse MVP rules): `firstHumanResponseAt`, `firstReviewAt`, overdue flags

Breakdown Metrics (Outputs)
- Volume
  - Count of community PRs with OpenHands co-author (last 30/60/90 days)
  - % of community PRs co-authored by OpenHands
- By repo
  - Top repos by (count, share) of community PRs with OpenHands co-author
- Outcomes
  - Merge rate (merged / closed) for co-authored vs non-co-authored community PRs
  - Median TFFR/TTFR for co-authored vs non-co-authored community PRs
- Effort proxy (optional)
  - Number of commits per PR carrying OpenHands co-author footers

API Additions
- Extend existing `/api/dashboard` to include co-author slice when `include=coauthor` or always include a minimal summary.
  - Response additions under `kpis`:
    - `communityPrsWithOH: number`
    - `pctCommunityWithOH: number`
  - Optional new route `/api/coauthor/summary` returning repo/time-bucketed stats
- PR object additions:
  - `hasOpenHandsCoauthor: boolean`
  - `coauthorEvidence?: { kind: string; email: string; sha?: string }[]` (only when `debug=true`)

UI Additions
- Community PRs table: add badge "OH co-authored"; add filter `coauthored=oh|not|any`
- Overview KPIs: show count and % of community PRs with OpenHands co-author
- Optional chart: weekly bars for community PRs co-authored vs not

Rate Limit & Performance
- Default time window: last 60–90 days to bound commit scanning volume
- Early stop commit pagination once a match is found per PR
- Cache per-repo PR lists and per-PR co-author results (TTL aligned with dashboard cache)
- Respect `rateLimit { remaining resetAt }`; degrade gracefully (skip co-author scan if low and return partial)

Edge Cases & Safeguards
- Squash or rebase can drop or consolidate footers — checking `mergeCommit.message` first mitigates this for squash merges
- Hidden/no-reply emails: rely on footers rather than author/committer email
- Variations in footer formatting: regex is email-driven and case-insensitive to tolerate name changes
- Bots: exclude bot accounts from community metrics and co-author credit
- Aliases: keep an optional config `config/coauthor_aliases.json` with `emails: []` to add future addresses safely

Testing Strategy
- Unit: footer parsing (multiple footers, different casing, leading/trailing spaces), email alias coverage, early-stop logic
- Integration: fixture PRs with/without squash merges; ensure metrics match expectations; rate-limit fallback
- Manual: spot-check a sample of merged PRs where OpenHands participated and validate detected evidence

Rollout Plan
- Step 1: Implement detection + KPIs in API, behind a feature flag (e.g., `COAUTHOR_ENABLED=true`)
- Step 2: Add UI badges, KPIs, and a basic weekly chart
- Step 3: Validate with a 60–90 day window; widen as needed or move to Neon if historical retention required

Configuration
- Env:
  - `COAUTHOR_ENABLED=true|false` (default true once stable)
  - `COAUTHOR_EMAILS=openhands@all-hands.dev,openhands@openhands.dev`
  - `COAUTHOR_TIME_WINDOW_DAYS=90`
- Optional files:
  - `config/coauthor_aliases.json` → `{ "emails": ["openhands@all-hands.dev", "openhands@openhands.dev"], "names": ["OpenHands", "openhands"] }`

Example Regexes
- Footer line (email-driven):
  - `(?mi)^Co-authored-by:\s*.*?<\s*(?:openhands@all-hands\.dev|openhands@openhands\.dev)\s*>\s*$`
- Alternative (tolerant of multiple spaces and mixed case):
  - `(?mi)^\s*Co-authored-by\s*:\s*[^<]*<\s*(?:openhands@all-hands\.dev|openhands@openhands\.dev)\s*>\s*$`

Notes
- This analysis sits between MVP and Phase 2: it enriches MVP data without requiring a database, and it informs Phase 2 fairness/assignment features.
- If long-range historical trends are needed, enable Neon and persist per-PR co-author evidence (sha + kind + email) to avoid re-scanning.
