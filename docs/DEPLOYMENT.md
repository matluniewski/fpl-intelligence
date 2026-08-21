# Deployment guide

Status: deployment foundation

Owner: FPL-71

Last updated: 2026-08-21

## Scope and approval boundary

This guide defines the repeatable deployment path for the Next.js web application on Vercel with application-owned PostgreSQL migrations on Supabase. It does not authorize a production deployment, public release, provider spending, new credential acquisition, or a change to data-processing purposes. Each requires explicit owner approval.

The deployment does not add Supabase Auth, Storage, Realtime, Edge Functions, or client-side Supabase access. Do not add `NEXT_PUBLIC_SUPABASE_*` variables or a Supabase service key until an approved issue introduces that application boundary and security design.

## Architecture and configuration

`vercel.json` configures Vercel at the repository root. It installs from the committed pnpm lockfile and builds only `@fpl-intelligence/web`; Vercel detects the Next.js framework. The Vercel project must use the repository root as its Root Directory.

The database package remains provider-neutral. Its version-controlled Drizzle migrations in `packages/database/drizzle/` are the sole schema source of truth. Apply them to Supabase with `pnpm db:migrate`; do not use `drizzle-kit push` or edit application schema through the Supabase dashboard.

## Environments and secrets

Configure the following sensitive environment variables in Vercel project settings for each required environment. Never add their values to `vercel.json`, Git, Linear, CI output, or browser-exposed variables.

| Variable                           | Required when                                                | Value                                                                                                                |
| ---------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                     | A deployed route or worker uses `@fpl-intelligence/database` | Supabase PostgreSQL connection string with SSL required. Use the Supabase transaction pooler for serverless traffic. |
| `DATABASE_POOL_MAX`                | `DATABASE_URL` is set                                        | `1` for Vercel serverless execution, unless measured capacity planning approves another value.                       |
| `DATABASE_CONNECT_TIMEOUT_SECONDS` | `DATABASE_URL` is set                                        | Positive integer; start with `5`.                                                                                    |
| `DATABASE_IDLE_TIMEOUT_SECONDS`    | `DATABASE_URL` is set                                        | Positive integer; start with `20`.                                                                                   |

The current web application does not access the database at runtime, so it does not yet require these variables for a successful Vercel build. They become required before shipping a database-backed route.

Set the production database URL only in the production Vercel environment. Use a distinct Supabase project and distinct credentials for preview/staging when database-backed preview behavior is introduced. Never point a preview deployment at production data without a specifically approved exception.

## Provisioning and migration runbook

After explicit approval to create provider resources and credentials:

1. Create the approved Supabase project and obtain only its server-side PostgreSQL connection string. Enforce SSL, restrict network access as appropriate, enable MFA for provider administrators, and review the Supabase security advisor before production use.
2. Copy `.env.example` to `.env.local` and set the approved Supabase `DATABASE_URL` locally. Do not commit `.env.local`.
3. Apply reviewed migrations from a controlled environment:

   ```bash
   pnpm db:migrate
   pnpm db:test
   ```

4. Record the migration result in the deployment change record without including credentials or connection strings.
5. Configure the variables above in Vercel's matching environment and link the GitHub repository. Do not place secret values in Vercel build commands or repository configuration.

Supabase schema changes must be reviewed as ordinary repository changes, merged first, then applied in migration order. The production-ready Supabase workflow should use the provider's GitHub integration or an approved CI identity when separately authorized; this issue does not create an external integration or credential.

## Preview, production, and verification

For a preview after the Vercel project is linked and the owner authorizes a preview deployment:

1. Push the reviewed FPL-71 branch and let Vercel create its Git preview.
2. Confirm the build uses Node.js 24 and pnpm 10 from the repository pins.
3. Check deployment logs contain no secrets and the application shell loads over HTTPS.
4. Run the approved smoke journey. If a database-backed feature is present, run `pnpm db:test` against the intended non-production database first and verify preview has no production database access.

Production deployment requires separate explicit owner approval after preview, required CI checks, provider security review, migration plan, and rollback plan have been reviewed. Vercel production deployments should be triggered from protected `main`, never a local workstation.

## Rollback

If a Vercel release fails, promote the last known-good Vercel deployment and stop further deployments while investigating. Database migrations are not automatically reversible: do not run destructive down migrations in production. Use a separately reviewed forward migration or restore procedure, based on approved backup and recovery settings, and document the incident outcome.

## References

- [ADR-0001: Use Vercel and Supabase for the deployment foundation](adr/0001-vercel-and-supabase-deployment-foundation.md)
- [Development guide](DEVELOPMENT.md)
- [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json)
