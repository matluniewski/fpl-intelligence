# FPL Intelligence Agent Instructions

These instructions apply to the entire repository. A more specific `AGENTS.md` may add rules for its subtree but must not weaken the product, security, privacy, compliance, or approval boundaries defined here.

## Communication and project language

- Communicate with the project owner in Polish.
- Perform all project work in English, including code, tests, documentation, commits, branches, Linear content, pull requests, and review notes.
- Keep user-facing product copy in the language required by the owning issue and approved Figma design.

## Sources of truth

- Linear owns work status, priority, dependencies, scope, and acceptance criteria.
- Figma owns approved UX and visual design. Dates, players, clubs, statistics, branding, and similar content in wireframes are illustrative mock data unless explicitly approved as real product data.
- Repository documentation owns version-controlled product and engineering documentation.
- Consequential architecture decisions belong in `docs/adr/` after approval.
- When sources conflict, stop the affected path and surface the conflict. Do not silently choose one.

Linear documents should be concise summaries that link to canonical repository documentation once that documentation exists.

## Delivery authority

Agents may autonomously perform routine, reversible work authorized by an active Linear issue:

1. Select the next unblocked issue by dependency, priority, and execution value.
2. Move it to In Progress, assign it appropriately, and create the approved branch.
3. Implement the issue within its acceptance criteria.
4. Run proportionate automated tests and quality checks.
5. Self-review and make in-scope revisions.
6. Open and maintain a draft pull request.
7. Monitor CI, fix in-scope failures, and keep Linear and GitHub synchronized.
8. Obtain an independent review and address actionable findings.

Routine transitions do not require repeated owner confirmation. Follow [the agent workflow](docs/AGENT_WORKFLOW.md) for the complete lifecycle.

## Critical approval gates

Explicit human approval is required before:

- merging into `main`;
- making a material product-scope, architecture, security, privacy, compliance, provider, or ADR decision not already authorized;
- entering a legal or commercial commitment, incurring spend, starting procurement, deploying, or making a public release;
- performing destructive or difficult-to-recover data operations;
- obtaining new secrets or materially expanding external authority; or
- performing any real FPL account action.

Human approval and platform permission are separate requirements. An owner decision does not bypass a sandbox, operating-system, service, or repository permission prompt; a technical permission prompt is not itself a product approval gate.

Stop when required authority is missing, requirements conflict materially, or no safe in-scope assumption can resolve a decision.

## Issue and branch discipline

- Every change must belong to a Linear issue whose dependencies are complete.
- Use `fpl-<issue-number>-<short-description>`, for example `fpl-13-bootstrap-application-repository`.
- Do not use Linear-generated `matluniewski/...` branch names.
- Keep commits and the pull request scoped to the issue. Record follow-up work in Linear instead of silently expanding scope.
- Do not mark an issue Done until its changes are merged and Linear/GitHub state is synchronized.

## Architecture boundaries

- Define provider-independent domain contracts before provider-specific adapters.
- Keep provider DTOs, SDK types, transport errors, and persistence records inside infrastructure boundaries. Map them to internal contracts before they reach application or domain logic.
- Keep domain, projection, optimization, evidence-resolution, and recommendation behavior deterministic and testable for the same versioned inputs, clock, and configuration.
- Treat LLM and vision output as untrusted extraction or classification candidates. Apply runtime schema and domain validation.
- A `TeamStateCandidate` must remain visibly provisional. Only explicit user confirmation creates a durable `TeamState`.
- Preserve provenance, source policy, timestamps, uncertainty, confidence dimensions, and algorithm versions through normalization and recommendation generation.
- Every material recommendation must expose its inputs, assumptions, adjustments, uncertainty, alternatives, and reason codes.
- No provider or hosting choice may be inferred from the planned stack. Record consequential approved choices in an ADR when an owning issue requires them.
- Do not add authentication, billing, subscriptions, entitlements, or multi-tenancy without an approved issue.
- Never automate or conceal a real FPL transfer, lineup, captaincy, bench, or chip action. Advice remains human-reviewed and manually applied unless a separately approved permitted integration exists.

Read [the architecture](docs/ARCHITECTURE.md) before changing module boundaries, data flows, trust boundaries, or provider integrations.

## Security, privacy, and compliance

- Never commit or paste secrets, credentials, cookies, tokens, private keys, real screenshots, raw provider payloads, personal data, or unnecessary player health/news content into code, fixtures, logs, issues, CI artifacts, pull requests, or review comments.
- Treat screenshots and equivalent derivatives as ephemeral by default. Do not log, persist, back up, analyze, or retain them beyond the explicitly approved flow and retention rules in [SCREENSHOT_PRIVACY.md](docs/SCREENSHOT_PRIVACY.md).
- Use synthetic, redacted, or explicitly approved fixtures. Never turn a failed upload or production payload into a fixture by convenience.
- Validate all external inputs at the trust boundary and fail closed when permission, retention, deletion, commercial rights, or processing terms are unknown.
- Do not assume public availability, attribution, a subscription, technical API access, or LLM summarization grants commercial or reuse rights.
- Do not scrape X, websites, search results, or browser sessions. Do not use unofficial FPL endpoints, FPL credentials, session cookies, browser automation, or an unapproved fallback source.
- A private, development-only X API proof of concept is permitted only when an owning Linear issue defines the official API access path, current terms review, source allowlist, budget, retention/deletion controls, and manual kill switch. This owner policy decision is not a legal determination, commercial-use approval, or approval from X. Do not enable runtime ingestion, credentials, credit purchases, public access, or external-LLM processing unless a later approved issue authorizes the exact path.
- Preserve upstream provenance and source restrictions; never launder provider data through a normalized model.
- Follow [NEWS_SOURCE_COMPLIANCE.md](docs/NEWS_SOURCE_COMPLIANCE.md) for source enablement, external-LLM processing, retention, display, correction, deletion, and kill-switch requirements.
- Apply least privilege, environment isolation, content-free structured logging, and explicit rate, quota, and variable-cost budgets when an owning issue introduces external services.

## UX and design

- Implement UI only from an approved Figma state or an issue that explicitly authorizes a non-visual foundation.
- Distinguish internal or mock branding and data from approved production assets and real data.
- Include approved loading, empty, error, stale, partial, unavailable, onboarding, confirmation, and recovery states where relevant.
- Do not infer product behavior solely from illustrative wireframe content.

## Economical Codex usage

- Make the smallest change that satisfies the task and avoid unrelated refactors.
- Start with `git status`, `git diff`, `rg`, and the few relevant files instead of scanning the repository.
- Do not spawn subagents or run agents in parallel unless the owner explicitly requests it.
- Use the internet, MCP, and external tools only when required.
- Run the narrowest relevant test first, then broader checks only when needed; do not repeat checks without cause.
- Ask before broad exploration when ambiguous requirements cannot be resolved narrowly.
- Keep final responses concise: changed files, verification, and anything requiring attention.
- Minimize model calls, loaded context, and generated text without reducing correctness or safety.

## Development commands

Run commands from the repository root with the pinned Node.js and pnpm versions:

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

Use pnpm only. Commit `pnpm-lock.yaml` with intentional dependency changes. Follow [the development guide](docs/DEVELOPMENT.md) for workspace and environment details.

## Testing and self-review

- Add or update tests for every behavior change and important failure path.
- Prefer deterministic unit tests for domain behavior, contract tests for adapters, integration tests for boundaries, and Playwright for approved critical user journeys.
- Use an explicit clock in time-sensitive tests and stable tie-breaking in optimizers.
- Run focused checks while developing, then `pnpm check` before opening or updating the pull request unless the issue documents why a check is not applicable.
- Review the final diff for unrelated files, generated artifacts, secrets, dependency direction, unsafe logs, missing validation, retention/provenance loss, cost changes, and undocumented decisions.
- Treat CI success as necessary evidence, not a substitute for review.

## Documentation and ADRs

- Update canonical repository documentation in the same change when behavior, setup, operations, product rules, or architecture changes.
- Link documentation rather than duplicating long-lived rules across Linear and code comments.
- Create or update an ADR only when the owning issue requires a consequential decision and the critical approval gate has been satisfied.
- Do not rewrite accepted ADR history; supersede it with a new record.

## Definition of Done

Work is complete only when:

- the Linear acceptance criteria are satisfied and traceable in the pull request;
- implementation and documentation remain within the approved scope;
- applicable tests and `pnpm check` pass, or an explicit approved exception is recorded;
- self-review and independent review findings are resolved or explicitly accepted;
- privacy, security, compliance, provider-rights, retention, cost, and human-action boundaries are preserved;
- the pull request documents risks, rollback, tests, documentation, and any ADR impact;
- the owner has explicitly approved the merge;
- the pull request is merged, Linear is Done, and local `main` is synchronized; and
- the next unblocked Linear issue is selected automatically.
