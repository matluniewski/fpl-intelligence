# FPL Intelligence

FPL Intelligence is a transparent, data-driven decision-support application for engaged Fantasy Premier League managers. The initial product direction is Personalized FPL News Intelligence: connect fresh, permitted evidence to a user's confirmed team context and explain when that evidence changes a decision.

This repository currently contains the production application foundation. Product capabilities are delivered separately through approved Linear issues.

## Sources of truth

- Linear owns work status, priority, dependencies, and acceptance criteria.
- Figma owns approved UX and visual design.
- Repository documentation owns version-controlled product and engineering decisions.

Start with:

- [Product specification](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Development guide](docs/DEVELOPMENT.md)
- [MVP validation plan](docs/VALIDATION.md)
- [Screenshot privacy requirements](docs/SCREENSHOT_PRIVACY.md)
- [News source compliance register](docs/NEWS_SOURCE_COMPLIANCE.md)

## Technology baseline

- Node.js 24 LTS
- pnpm 10 workspace
- TypeScript
- Next.js App Router and React
- Tailwind CSS and shadcn/ui
- Vitest

PostgreSQL, Drizzle ORM, Playwright, and GitHub Actions remain part of the planned stack and will be introduced by their owning issues. No hosting, database service, authentication, analytics, vision, LLM, news, or football-data provider is selected by this bootstrap.

## Getting started

Prerequisites:

- Node.js 24.19.0 or newer within the Node.js 24 LTS line
- pnpm 10.33.4

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open <http://localhost:3000>.

The repository currently requires no runtime environment variables. When configuration is introduced, copy `.env.example` to `.env.local` and provide only the values documented by the owning issue.

## Quality commands

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run the complete local gate with `pnpm check`. See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for workspace conventions and contribution details.

## Safety boundary

FPL Intelligence provides advice only. It must not store FPL credentials or perform a transfer, lineup, captaincy, bench, or chip action without a permitted integration and explicit human approval. The current MVP performs no official FPL account mutation.
