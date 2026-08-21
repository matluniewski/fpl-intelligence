# ADR-0001: Use Vercel and Supabase for the deployment foundation

Status: Accepted

Date: 2026-08-21

Owners: FPL-71

## Context

FPL Intelligence needs a repeatable path to deploy its Next.js web application and application-owned PostgreSQL migrations. The project owner explicitly selected Vercel for hosting and Supabase for managed PostgreSQL. This decision is limited to the deployment foundation; it does not select Supabase products beyond PostgreSQL or authorize a production release.

## Decision drivers

- Preserve the pnpm workspace and Next.js App Router deployment path.
- Retain provider-independent domain, application, and database contracts.
- Keep credentials server-side and out of version control.
- Make schema changes reproducible through reviewed Drizzle migrations.
- Permit preview validation without exposing production data.

## Options considered

### Vercel with Supabase PostgreSQL

Host the Next.js application on Vercel and use Supabase only as the managed PostgreSQL host through the existing `DATABASE_URL` contract.

### Continue with local-only PostgreSQL

Retains the existing development baseline but cannot provide the requested managed deployment path.

### Another hosting or managed PostgreSQL provider

Could satisfy the technical requirements but is outside the owner's explicit provider selection for FPL-71.

## Decision

Adopt Vercel for the Next.js deployment foundation and Supabase for the managed PostgreSQL deployment foundation. Use repository-owned Drizzle migrations as the schema source of truth. Keep the database behind the existing server-side configuration contract.

This decision does not authorize Supabase Auth, Storage, Realtime, Edge Functions, public client keys, service-role keys, provider-to-provider integrations, production deployment, spending, or public release. Those actions require their own approved scope and explicit owner approval.

## Consequences

### Positive

- The Vercel configuration is version controlled and uses the pinned pnpm lockfile.
- Supabase connection details remain a server-side environment variable rather than a domain or presentation dependency.
- Existing migrations can be applied consistently to an approved Supabase project.

### Negative or accepted trade-offs

- Deployment configuration spans repository configuration and provider project settings, so secrets and provider resource creation cannot be fully version-controlled.
- Database schema rollback requires a separately reviewed forward migration or restore plan.
- Preview database isolation requires a distinct non-production Supabase environment before database-backed previews are enabled.

## Security, privacy, compliance, and cost impact

- `DATABASE_URL` is a secret and must be stored only in approved environment settings or a local ignored environment file.
- No client receives a Supabase secret, service-role key, or direct database credential.
- Every exposed Supabase table must have reviewed RLS enabled and policies matching the approved access model before client access is introduced.
- Provider terms, data-processing agreements, regional configuration, backup settings, cost, and production-readiness controls must be reviewed before a production release.
- No screenshot, FPL credential, provider payload, personal data, or raw news content is added to deployment configuration or logs.

## Verification and rollback

- Run `pnpm check` before the pull request.
- Validate a Vercel preview only after owner approval and verify it does not access production data.
- Apply Supabase migrations with `pnpm db:migrate`, then run `pnpm db:test` against the intended non-production database.
- Roll back a failed application release by promoting the previous Vercel deployment. Do not attempt an unreviewed destructive database rollback.

## References

- Linear FPL-71
- [Deployment guide](../DEPLOYMENT.md)
- [Architecture](../ARCHITECTURE.md)
- [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
