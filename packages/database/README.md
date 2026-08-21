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

Supabase is selected as the managed PostgreSQL host for the deployment foundation in [ADR-0001](../../docs/adr/0001-vercel-and-supabase-deployment-foundation.md). This package remains provider-neutral: it uses only `DATABASE_URL` and does not import a Supabase SDK or expose provider records beyond its infrastructure boundary. See the [deployment guide](../../docs/DEPLOYMENT.md) for migration and environment controls.

## Recommendation history

`RecommendationHistoryRepository` persists immutable, validated recommendation contracts with the exact normalized input versions and references needed for audit and comparison. It classifies adjacent comparable snapshots as an initial recommendation, an equivalent recalculation, or a material change without storing provider DTOs, screenshots, credentials, user accounts, or unnecessary raw content.

Retention is explicit and versioned. Records without a `retainUntil` value are not removed by the repository; records with a deadline are deleted only through `deleteExpired(asOf)` using a caller-supplied evaluation time. The package does not run an implicit retention scheduler.

## News intelligence state

FPL-28 persists `RawNewsItem`, `Claim`, `Evidence`, `NewsSignal`, and
`PlayerAvailabilityState` as distinct provider-independent records. Stored
values are validated domain artifacts and content-minimized metadata only;
provider DTOs and raw news content remain outside this package.

Lifecycle, expiry, supersession, and retention are separate fields. Current
availability reads require a caller-supplied UTC evaluation time and preserve
conflicting historical states rather than selecting or deleting one silently.
Retention deletion is explicit through `deleteExpired(asOf)`; no scheduler or
database/hosting provider is selected here.
