# OpenHands PR Review Dashboard — Lightweight Plan

Purpose
- Provide a focused internal dashboard to ensure community PRs are reviewed promptly, review work is fairly distributed, and the team consistently uses GitHub’s Assigned Reviewers.
- Keep implementation lightweight while borrowing proven ideas from the existing github-dashboard-OH repo.

Primary Users
- Individual engineers/reviewers: See your review queue and SLAs.
- DevRel: Track community contributions and responsiveness.
- Team leads/EMs: Monitor fairness, bottlenecks, adoption of process.
- Sales/Leadership: Validate that community and prospect PRs receive timely responses.

Key Questions to Answer
- Which open PRs are from external contributors and need attention now?
- Are we meeting our time-to-first-review SLA on community PRs?
- Who is overloaded with review requests? Is work fairly distributed?
- Are Assigned Reviewers being used consistently across repos?
- Do we have unassigned PRs or PRs with no human response?
- What % and count of PRs are from non-employees (community contribution rate)?

Core KPIs (with suggested SLAs)
- Time to First Human Response (target: ≤ 24 business hours for community PRs)
- Time to First Review (target: ≤ 48 business hours)
- Open Community PRs by Age Bucket (0–24h, 24–48h, 48–96h, >96h)
- Community PR Coverage: % of open PRs authored by non-employees
- Assigned Review Compliance: % of open PRs with at least one assigned reviewer
- Reviewer Load Balance: distribution of active review assignments per engineer (flag outliers)
- Neglected Community PRs: count of PRs with no human comment/review after X hours

Feature Set (MVP → Phase 2)
- Overview (MVP)
  - KPI cards: Community PRs open, % community PRs, median time to first response, median time to first review
  - Trend: time-to-first-review over last 30/90 days
  - Fairness snapshot: reviewer load distribution indicator
- Community PRs Monitor (MVP)
  - Table of open PRs by non-employees with: repo, title/link, author, age, assigned reviewers, last human activity, needs-first-response badge
  - Filters: repo, age, author, labels (e.g., needs-review)
  - Quick actions: copy link, open in GitHub
- My Review Queue (Phase 2)
  - Personalized queue of PRs where the user is an assigned/requested reviewer
  - Sort by urgency (SLA breach first), age, community-priority
  - Indicators: first-response-needed, re-requested-changes, waiting-on-author
- Load Balance & Fairness (Phase 2)
  - Review load per reviewer over last 7/14/30 days
  - Outlier detector (e.g., top vs median, simple Gini index)
  - Suggested reassignment targets when someone exceeds threshold
- Assignment Health (Phase 2)
  - Missing Assigned Reviewers: PRs with none
  - Assignment Quality: PRs where only bots are requested/active
  - Repos without auto-assign workflow flagged for follow-up
- Notifications (Phase 2 optional, minimal)
  - Daily digest to a Slack channel with: new community PRs, overdue PRs, top overloaded reviewers
  - Optional personal DM digest (1x/day) summarizing your queue

Lightweight Architecture
- UI: Next.js + React + TypeScript; Tailwind for styling (matching github-dashboard-OH patterns)
- Data: GitHub GraphQL API for efficient aggregation; fallback to REST where simpler
- API routes (server-side only) to keep tokens secure, with short server cache and client SWR
- Caching: 60–300s server cache + client SWR revalidation (borrow approach from github-dashboard-OH)
- Deploy: Vercel or simple Node host; local dev uses .env.local with GITHUB_TOKEN


Data Sources for Employee Exclusion
- Prefer GraphQL: organization(login: "All-Hands-AI") { membersWithRole(first: 100) { nodes { login } } } with pagination to build an in-memory employee set.
- Fallback REST: GET https://api.github.com/orgs/All-Hands-AI/members (paginated) to build employees list.
- Augment with config/employees.json to include contractors or non-org maintainers. Final isEmployee = in(OrgMembers ∪ employees.json) with allowlist/denylist overrides.

- Optional Agent SDK: use OpenHands Agent SDK in a GitHub Action to auto-assign/massage reviewer queues (e.g., missing reviewers, stale PR nudges). Dashboard should surface compliance and outcomes, not perform writes by default.

Data Persistence (Neon optional)
- MVP: no database; rely on GitHub APIs plus short-lived server cache.
- If adopting Neon, add DATABASE_URL to env and use a lightweight ORM/query builder (Drizzle/Prisma) or direct pg; keep writes server-only.

- Add Neon Postgres when you need persistent history (30/90-day trends, SLA audits, Slack digests, reviewer fairness over time).
- Minimal schema:
  - pull_requests(repo, number, author_login, is_employee, created_at, first_human_response_at, first_review_at, state, updated_at)
  - reviews(pr_repo, pr_number, reviewer_login, state, submitted_at)
  - events(pr_repo, pr_number, type, actor_login, created_at)
  - snapshots(day, open_community_prs, median_tffr, median_ttfr, reviewer_load_json)
- Ingest cadence: cron (GitHub Actions or server) hits an /api/ingest endpoint; upsert by (repo, number); use ETags/If-Modified-Since to limit API calls.
- Cost/perf: Neon serverless is typically sufficient; use connection pooling and short transactions.

Configuration
- Orgs/Repos scope: configurable list (e.g., OpenHands, All-Hands-AI) and explicit repos to include/exclude
- Employees list: config/employees.json to identify internal vs community authors across org transitions
- SLA thresholds: configurable (e.g., first response 24h, first review 48h)
- Slack webhooks: optional per-team channel or DM mapping

Data Model (per PR)
- Identifiers: repo, number, title, url, createdAt, updatedAt
- Author: login, authorAssociation (GitHub field), isEmployee (derived from employees list or org membership)
- Assignment: requested_reviewers (users/teams), hasAssignedReviewer (bool)
- Reviews: list of reviews (author, state, submittedAt)
- Firsts: firstHumanResponseAt, firstReviewAt, time deltas from createdAt
- Status: needsFirstResponse, overdueFirstResponse, overdueFirstReview, waitingOnAuthor

Detection Rules
  - GET /orgs/{org}/teams (to map team reviewers if needed)
  - GET /orgs/{org}/members or use GraphQL org membership to exclude employees

- Community PR: authorAssociation != MEMBER or author not in employees list
- Human response: earliest of review submission, maintainer comment, label change by maintainer
- Overdue: createdAt + SLA threshold < now and no corresponding first event
- Overloaded reviewer: currently assigned PRs > configurable threshold or > 95th percentile

GitHub Data Sources
- GraphQL (preferred to batch data)
  - organization(login) -> repositories(...) -> pullRequests(...) with fields:
    - author { login }, authorAssociation
    - reviewRequests { nodes { requestedReviewer { ... on User { login } ... on Team { slug } } } }
    - reviews { nodes { author { login }, state, submittedAt } }
    - labels, participants, createdAt, updatedAt, url
- REST (where simpler)
  - GET /orgs/{org}/members (for membership snapshot if needed)
  - GET /repos/{owner}/{repo}/pulls?state=open&per_page=100
  - GET /repos/{owner}/{repo}/pulls/{number}/reviews
  - GET /rate_limit (monitor remaining and reset to inform caching and polling)

- Rate limiting: monitor GET /rate_limit; store remaining/reset in API responses

UI Outline
- Header: org/repo selector, search, theme toggle
- Overview: KPI cards + small charts
- Tabs: Community PRs, My Reviews, Load Balance, Assignment Health
- Tables: virtualized lists for performance, sticky filters
- Badges: community, overdue, needs-first-response, waiting-on-author

MVP Scope (2–3 days)
- Server route: /api/dashboard aggregates open PRs across configured repos
- Community PRs table with sorting and filters
- KPI cards: community PR count, % community, median time to first response (rolling), compliance rate
- Basic fairness indicator: active assignments per reviewer (current open PRs)
- Simple in-memory cache (per deploy) + SWR on client

- Leverage agent-sdk auto-assign workflow (assign-reviews.yml) in repos lacking auto-assign; dashboard should flag repos without it and link to workflow.
- Consider an optional "Run Agent" button for admins that triggers a workflow_dispatch event (no default writes from dashboard).
- Between MVP and Phase 2: Add OpenHands Co-Author Analysis (see OH-coauthor.md) to detect PRs co-authored by OpenHands (supports openhands@all-hands.dev and openhands@openhands.dev).


Phase 2 Scope (3–5 days)
- My Review Queue with SLA sorting
- Load balance chart + outlier detection
- Assignment Health (missing reviewers, repos without auto-assign)
- Slack daily digest (webhook)

Adoption Notes (from team conversation)
- Encourage daily pass through Assigned Reviews page; dashboard should reflect compliance transparently
- If using Neon, add DATABASE_URL

- Balance review load so no single person carries a disproportional number of reviews
- Emphasize visibility into community PRs; highlight those not originated by OpenHands employees
- Automatic assignment alone isn’t enough—pair with monitoring + digest to cut through GitHub notification noise
Excluding OpenHands Developers
- Source of truth: All-Hands-AI org members page (GraphQL or REST). Cache this list server-side for 5–15 minutes.
- Compute isEmployee(login): in OrgMembers or in employees.json overrides.
- Treat bots separately: exclude bot accounts from both community and employee tallies.
- Community PR = author not isEmployee and not bot.


Success Criteria
- 90%+ community PRs receive a human response within SLA over 4 weeks
- 0 PRs older than 72 hours without human response
- Reviewer assignment variance reduced (fewer outliers), visible in fairness panel
- Team adoption: daily usage and digest subscriptions

Risks and Mitigations
- Rate limits: use GraphQL batching + short caches, show remaining quota in debug
- Employee detection accuracy: combine org membership + employees.json, allow manual overrides
- Org transition: support multiple orgs concurrently via config
Agent SDK Integration (optional)
- Scope: Use agent-sdk jobs to auto-assign reviewers, nudge stale PRs, and suggest reassignment when overloaded.
- Separation of concerns: dashboard remains read-only; actions happen via GitHub Actions using agent-sdk. Link to logs and runs from dashboard.
- Safety: restrict agent actions to approved repos; require workflow_dispatch by admins for manual runs; scheduled run 1x/day for automation.

- Notification fatigue: single daily digest by default; allow opt-out and thresholds

Implementation Hints (reuse from github-dashboard-OH)
- SWR on client, short server cache, dark/light theme, KPI cards and charts
- Secure token in server routes only; never expose to client
- Add /api/test for quick verification
- Exclude employees using org membership set built at server start with periodic refresh; expose /api/config/employees for debugging.


Example API Shape (internal)
- GET /api/dashboard -> { kpis, prs: [...], reviewers: {...} }
- GET /api/review-queue?login=jane -> reviewer-specific queue
- GET /api/config -> orgs, repos, slas, employees

Environment
- GITHUB_TOKEN
- NEXT_PUBLIC_APP_URL (if deploying to Vercel)
- Optional: SLACK_WEBHOOK_URL, ORGS, REPOS_EXCLUDE, SLA_HOURS_FIRST_RESPONSE, SLA_HOURS_FIRST_REVIEW

Next Steps
- Confirm org/repo scope and SLA thresholds
- Provide initial employees.json
- Approve MVP features; schedule Phase 2 if needed
- Stand up skeleton Next.js app or adapt a minimal subset of github-dashboard-OH
