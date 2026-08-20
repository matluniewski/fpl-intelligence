# FPL Intelligence

FPL Intelligence is a transparent, data-driven decision-support application for engaged Fantasy Premier League managers. The initial product direction is Personalized FPL News Intelligence: connect fresh, permitted evidence to a user's confirmed team context and explain when that evidence changes a decision.

This repository currently contains the production application foundation, a framework-independent domain package for normalized football and user-confirmed TeamState contracts, a replaceable prototype reference-data adapter, and a deterministic expected-points projection baseline. Checked-in football data and projection values are project-authored synthetic fixtures. Product capabilities are delivered separately through approved Linear issues.

## Sources of truth

- Linear owns work status, priority, dependencies, and acceptance criteria.
- Figma owns approved UX and visual design.
- Repository documentation owns version-controlled product and engineering decisions.

Start with:

- [Product specification](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [External data provenance architecture](docs/DATA_PROVENANCE.md)
- [FPL and Premier League data licensing review](docs/FPL_DATA_LICENSING.md)
- [Provider usage and cost telemetry architecture](docs/COST_TELEMETRY.md)
- [Recommendation contract](docs/RECOMMENDATIONS.md)
- [Development guide](docs/DEVELOPMENT.md)
- [Agent delivery workflow](docs/AGENT_WORKFLOW.md)
- [MVP validation plan](docs/VALIDATION.md)
- [Screenshot privacy requirements](docs/SCREENSHOT_PRIVACY.md)
- [News source compliance register](docs/NEWS_SOURCE_COMPLIANCE.md)
- [News intelligence contracts](docs/NEWS_INTELLIGENCE_CONTRACTS.md)
- [Curated news ingestion v0](docs/NEWS_INGESTION.md)

## Technology baseline

- Node.js 24 LTS
- pnpm 10 workspace
- TypeScript
- Next.js App Router and React
- Tailwind CSS and shadcn/ui
- PostgreSQL and Drizzle ORM
- Vitest
- GitHub Actions

Playwright remains part of the planned stack and will be introduced by its owning issue. The PostgreSQL foundation is local and provider-neutral; no hosting, managed database, authentication, analytics, vision, LLM, news, or football-data provider has been selected.

## Getting started

Prerequisites:

- Node.js 24.19.0 or newer within the Node.js 24 LTS line
- pnpm 10.33.4
- Docker Desktop or another Docker Compose-compatible runtime for database work

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open <http://localhost:3000>.

The web application currently requires no runtime environment variables. Database commands require the documented local-only values:

```bash
Copy-Item .env.example .env.local # Windows PowerShell
pnpm db:up
pnpm db:migrate
pnpm db:test
pnpm db:down
```

On Unix-like systems, use `cp .env.example .env.local`. Never commit `.env.local` or real credentials.

## Quality commands

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run the complete local gate with `pnpm check`. See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for workspace conventions and [docs/AGENT_WORKFLOW.md](docs/AGENT_WORKFLOW.md) for the issue-to-merge delivery process.

Pull requests to `main` run independent GitHub Actions checks for formatting, linting, TypeScript, tests, and the production build. All required checks must pass before merge.

## Safety boundary

FPL Intelligence provides advice only. It must not store FPL credentials or perform a transfer, lineup, captaincy, bench, or chip action without a permitted integration and explicit human approval. The current MVP performs no official FPL account mutation.
