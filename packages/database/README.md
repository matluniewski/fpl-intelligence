# `@fpl-intelligence/database`

Provider-neutral PostgreSQL infrastructure for FPL Intelligence. The package owns database configuration, connection lifecycle, Drizzle schema declarations, version-controlled SQL migrations, and database health checks.

FPL-15 reserves the `fpl_intelligence` PostgreSQL schema but deliberately creates no product, provider, authentication, tenant, subscription, entitlement, pricing, payment, or commercial tables. Future persistence issues must introduce explicit application-owned records and migrations rather than storing provider DTOs as domain state.

## Commands

Run from the repository root after copying `.env.example` to `.env.local`:

```bash
pnpm db:up
pnpm db:migrate
pnpm db:test
pnpm db:down
```

Use `pnpm --filter @fpl-intelligence/database db:generate --name=<migration-name>` after an approved schema change. Review generated SQL and metadata before committing them. Never use `drizzle-kit push` in shared or production environments because it bypasses version-controlled migration review.

The current setup selects no managed PostgreSQL provider or deployment topology. A later consequential selection requires its owning issue and an approved ADR.
