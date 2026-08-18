# FPL Intelligence Development Guide

Status: initial engineering baseline

Owner: FPL-13

Last updated: 2026-08-18

## 1. Purpose

This guide defines the reproducible local-development baseline for FPL Intelligence. Linear remains the source of truth for issue scope and acceptance criteria. Detailed agent and pull-request workflow rules live in [AGENT_WORKFLOW.md](./AGENT_WORKFLOW.md).

## 2. Prerequisites

- Git
- Node.js 24.19.0 or newer within the Node.js 24 LTS line
- pnpm 10.33.4

The repository records the Node baseline in `.node-version`, the pnpm version in `package.json`, and both minimum versions in `package.json#engines`.

Enable the package manager shim once if needed:

```bash
corepack enable
```

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
packages/              Reserved for framework-independent packages
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
| `pnpm lint`         | Run ESLint with the Next.js and TypeScript rules.      |
| `pnpm typecheck`    | Run strict TypeScript checking without emitting files. |
| `pnpm test`         | Run deterministic Vitest unit tests once.              |
| `pnpm build`        | Create a production Next.js build.                     |
| `pnpm check`        | Run the complete local quality gate.                   |

The application workspace also exposes `lint:fix` and `test:watch` for focused local work.

## 6. Environment and secrets

The bootstrap has no runtime environment variables. Future configuration must follow these rules:

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
