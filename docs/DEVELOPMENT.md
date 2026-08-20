# FPL Intelligence Development Guide

Status: initial engineering baseline

Owner: FPL-13

Last updated: 2026-08-20

## 1. Purpose

This guide defines the reproducible local-development baseline for FPL Intelligence. Linear remains the source of truth for issue scope and acceptance criteria. Detailed agent and pull-request workflow rules live in [AGENT_WORKFLOW.md](./AGENT_WORKFLOW.md).

## 2. Prerequisites

- Git
- Node.js 24.19.0 or newer within the Node.js 24 LTS line
- pnpm 10.33.4
- Docker Desktop or another Docker Compose-compatible runtime for database work

The repository records the Node baseline in `.node-version`, the pnpm version in `package.json`, and both minimum versions in `package.json#engines`.

Enable the package manager shim once if needed:

```bash
corepack enable
```

On Windows, open a new terminal after installing or updating Node.js so its
updated `PATH` is inherited. Confirm the pinned toolchain before installing
dependencies or running checks:

```powershell
node --version # v24.19.0 or another supported Node.js 24 LTS version
pnpm --version # 10.33.4
pnpm check
```

If `pnpm` reports that `node.exe` cannot be found, install the repository's
pinned Node.js 24 LTS release and reopen the terminal. Do not work around this
with a user-profile `PATH` override, a repository-specific Node binary, or npm
or Yarn.

Do not use npm or Yarn to modify dependencies. `pnpm-lock.yaml` is the only JavaScript dependency lockfile.

## 3. Initial setup

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

The web application is available at <http://localhost:3000>.

The clean-checkout path must remain valid. If a dependency change intentionally modifies the lockfile, run `pnpm install`, review the resulting lockfile, and commit it with the manifest change.

On Windows, pnpm cannot create hardlinks when its store and the repository are on different drive letters, even when both partitions share one physical SSD. If a clean install becomes I/O-heavy, use a repository-local ignored store:

```bash
pnpm install --frozen-lockfile --store-dir .pnpm-store
```

This is a local performance option, not a committed runtime or deployment dependency.

## 4. Workspace layout

```text
apps/
  web/                 Next.js App Router application
packages/
  domain/              Framework-independent domain contracts and invariants
  adapters/            External/file validation, mapping and adapter boundaries
  database/            Provider-neutral PostgreSQL and Drizzle infrastructure
docs/                  Product and engineering documentation
  adr/                  Consequential architecture decision records
```

Within `apps/web`, routing files live in `src/app`, reusable UI primitives live in `src/components`, and application-local helpers live in `src/lib`. New domain and application logic must follow the dependency boundaries in [ARCHITECTURE.md](./ARCHITECTURE.md); it must not accumulate in route components or generic utility folders.

The generated `apps/web/AGENTS.md` contains version-specific Next.js guidance. It does not replace the repository-wide `AGENTS.md` owned by FPL-23.

## 5. Commands

Run commands from the repository root unless a troubleshooting step explicitly requires a workspace path.

| Command             | Purpose                                                |
| ------------------- | ------------------------------------------------------ |
| `pnpm dev`          | Start the web development server.                      |
| `pnpm format`       | Apply Prettier formatting.                             |
| `pnpm format:check` | Verify formatting without changing files.              |
| `pnpm lint`         | Run workspace-specific ESLint and TypeScript rules.    |
| `pnpm typecheck`    | Run strict TypeScript checking without emitting files. |
| `pnpm test`         | Run deterministic Vitest unit tests once.              |
| `pnpm build`        | Create a production Next.js build.                     |
| `pnpm check`        | Run the complete local quality gate.                   |
| `pnpm db:up`        | Start the local PostgreSQL container.                  |
| `pnpm db:migrate`   | Apply version-controlled Drizzle migrations.           |
| `pnpm db:test`      | Run the PostgreSQL connection smoke test.              |
| `pnpm db:down`      | Stop the local PostgreSQL container.                   |

`pnpm check` always runs `pnpm typecheck` before `pnpm build`. The Next.js build
does not repeat this check, which keeps the production-build command compatible
with the Codex workspace sandbox while retaining the required type-safety gate.

The web workspace also exposes `lint:fix` and `test:watch`. The domain, adapter, and projection workspaces expose focused test commands; domain, adapter, and projection packages also expose synthetic-fixture entry points for contract work.

Vitest commands use the `threads` pool rather than process forks. Packages with a Vitest configuration also use Vitest's native config loader rather than Vite's process-spawning config bundler. This keeps unit tests compatible with Codex's `workspace-write` sandbox while retaining parallel test execution. Run `pnpm test` as the regression check; do not relax the sandbox merely to run unit tests.

## 6. Environment and secrets

The web bootstrap has no runtime environment variables. Local database commands use the non-production placeholders documented in `.env.example`; copy them to the ignored `.env.local` file before running migrations or integration tests.

All configuration must follow these rules:

1. Add a non-secret, documented placeholder to `.env.example`.
2. Keep local values in `.env.local`, which is ignored by Git.
3. Never commit credentials, tokens, cookies, private keys, screenshots, provider payloads, or real health/news content.
4. Validate required configuration at the application boundary and fail with a safe, actionable message.
5. Introduce a provider credential only through an approved issue and an adapter boundary.

Hosting and managed-service choices are deliberately unresolved. Record a consequential selection in `docs/adr/` when the decision is required and approved.

## 7. Branches and issue scope

Every implementation branch must correspond to a Linear issue and use:

```text
fpl-<issue-number>-<short-description>
```

Example: `fpl-13-bootstrap-application-repository`.

Keep a branch within the owning issue's acceptance criteria. If work reveals a material product, architecture, security, privacy, compliance, provider, or cost decision that the issue does not authorize, stop that path and record or escalate the decision instead of hiding it in implementation.

## 8. Code and dependency conventions

- Use TypeScript in strict mode.
- Prefer Server Components by default; add a client boundary only when browser state or interaction requires it.
- Keep provider DTOs inside their adapters and map them to internal contracts at the boundary.
- Keep domain behavior deterministic and independent of Next.js, databases, queues, LLM SDKs, and provider SDKs.
- Make recommendation inputs, assumptions, provenance, and material adjustments inspectable.
- Use shadcn/ui primitives through the checked-in component source; do not couple domain code to UI components.
- Add or update tests with behavior changes.
- Do not introduce a new framework, provider, or managed service without the owning issue and, when consequential, an ADR.

pnpm enforces an explicit dependency install-script policy in `pnpm-workspace.yaml`. Keep install scripts denied unless a specific package is understood and explicitly allowed. The repository trusts its committed lockfile, so CI must use `--frozen-lockfile` and every dependency change must include lockfile review.

## 9. Testing strategy

- Unit tests cover deterministic domain, projection, optimization, evidence, mapping, and validation behavior.
- Adapter contract tests prove normalized outputs without leaking provider DTOs downstream.
- Integration tests cover database and application boundaries once those components exist.
- Playwright tests will cover approved critical user journeys when introduced by its owning issue.
- Async Server Components should be exercised through integration or end-to-end tests rather than forced into an unsupported unit-test pattern.

Use synthetic fixtures by default. Real screenshots, provider content, personal data, or player health information must not be copied into tests or repository artifacts unless an explicit policy permits that exact use.

## 10. Before opening a pull request

Run:

```bash
pnpm check
```

Then review:

- the Linear acceptance criteria;
- the diff for unrelated or generated artifacts;
- provider and domain dependency direction;
- tests and failure paths;
- documentation and `.env.example` changes;
- privacy, compliance, and human-approval boundaries; and
- whether a consequential decision needs an ADR.

Then follow the draft pull request, CI, review, approval, merge, and Linear synchronization stages in [AGENT_WORKFLOW.md](./AGENT_WORKFLOW.md).

## 11. Continuous integration

The [`CI` workflow](../.github/workflows/ci.yml) runs for every pull request targeting `main` and for pushes to `main`. It uses the versions pinned by `.node-version`, `package.json#packageManager`, and `pnpm-lock.yaml`.

The workflow exposes six independent checks so a failure identifies the affected quality boundary:

| Displayed check  | Command                           |
| ---------------- | --------------------------------- |
| `CI / Format`    | `pnpm format:check`               |
| `CI / Lint`      | `pnpm lint`                       |
| `CI / Typecheck` | `pnpm typecheck`                  |
| `CI / Test`      | `pnpm test`                       |
| `CI / Build`     | `pnpm build`                      |
| `CI / Database`  | `pnpm db:migrate && pnpm db:test` |

Each job installs dependencies with `pnpm install --frozen-lockfile`, uses a lockfile-keyed pnpm store cache, has read-only repository permissions, and runs independently with a bounded timeout. Third-party and GitHub-maintained actions are pinned to immutable commit SHAs with their release tags recorded in comments. The workflow deliberately uses `pull_request`, not `pull_request_target`, and receives no project secrets.

### Required `main` protection

Configure a GitHub branch ruleset or classic branch protection for `main` after the first successful workflow run makes the check names selectable:

1. Require changes to arrive through a pull request.
2. Require branches to be up to date before merging.
3. Require `CI / Format`, `CI / Lint`, `CI / Typecheck`, `CI / Test`, `CI / Build`, and `CI / Database` to pass.
4. Keep `GitGuardian Security Checks` required while that repository integration is enabled.
5. Require all review conversations to be resolved.
6. Block force pushes and branch deletion.
7. Do not permit a failing, skipped, pending, or stale required check to be bypassed during routine delivery.

The current single-maintainer phase does not require an approving GitHub review because a pull request author cannot approve their own change. The explicit human merge-approval gate in [AGENT_WORKFLOW.md](./AGENT_WORKFLOW.md) remains mandatory. Add an independent required approval when a second eligible reviewer is available.

If API permissions prevent applying these settings while the repository plan supports them, configure them manually in **Settings → Rules → Rulesets** and verify them with a test pull request.

### Current enforcement limitation

As verified during FPL-14 on 2026-08-18, GitHub returns `403` for both branch protection and repository rulesets because the private repository's current plan does not provide those features. Enabling technical enforcement therefore requires either a plan upgrade or making the repository public. Both are separate commercial or public-release decisions and are not authorized by FPL-14.

Until that decision is approved and the rules are configured, the delivery workflow must enforce the same gate operationally: do not merge while any documented check is failing, skipped, pending, stale, or absent, and still require explicit human merge approval. Keep the missing platform enforcement visible as a repository risk and re-check it whenever the GitHub plan or repository visibility changes.
