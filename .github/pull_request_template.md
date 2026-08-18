## Linear issue

- Issue: FPL-___
- Link: https://linear.app/fpl-intelligence/issue/FPL-___

## Summary

<!-- Explain the outcome and why it is in scope. -->

-

## Acceptance criteria

<!-- Map every Linear acceptance criterion to implementation or evidence. -->

- [ ] All acceptance criteria are satisfied or an explicit exception is recorded.
- [ ] The change contains no unrelated scope; follow-up work is tracked in Linear.

## Verification

<!-- List exact commands and results. Never mark a skipped check as passing. -->

- [ ] `pnpm format:check`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] Additional/manual verification (describe below or mark not applicable with reason)

Evidence:

<!-- Commands, scenarios, screenshots with mock/redacted data, or CI links. -->

## Documentation and decisions

- [ ] Canonical repository documentation is updated, or no documentation change is needed.
- [ ] ADR impact is documented; any consequential decision is approved, or no ADR is needed.
- [ ] Linear remains a concise summary linking to canonical repository docs where applicable.

Documentation/ADR notes:

## Risk and rollback

<!-- Describe material failure modes, disablement/rollback, migrations, and compatibility. -->

- Risk:
- Rollback or disablement:

## Data, providers, compliance, and cost

- [ ] No secrets, credentials, cookies, real screenshots, raw provider payloads, unnecessary personal data, or health/news content are present in code, fixtures, logs, CI, or review artifacts.
- [ ] External inputs are validated and AI/vision output is treated as untrusted, or not applicable.
- [ ] Provenance and provider restrictions survive normalization, or not applicable.
- [ ] Provider access, commercial rights, attribution, external processing, and terms are explicitly approved for the exact use, or no provider/source change is included.
- [ ] Retention, deletion, correction, expiry, backups, and logging are documented and approved, or no retained/processed data changes.
- [ ] Fixed and variable costs, quotas, limits, monitoring, and kill switches are documented and approved, or no cost-bearing service/change is included.
- [ ] No X/browser scraping, unofficial FPL endpoint, FPL credential/cookie, browser automation, unapproved fallback, or real FPL account action is introduced.

Notes and evidence:

## UI and Figma

- [ ] Approved Figma is followed, including required loading/empty/error/onboarding states, or no UI change is included.
- [ ] Illustrative mock data and internal branding remain distinguishable from real data and approved production assets, or not applicable.
- [ ] Any visual evidence uses only mock, synthetic, or properly redacted data, or no visual evidence is included.

Figma link and deviations:

## Review and approval

- [ ] Self-review completed against the final diff.
- [ ] Independent review completed and actionable findings resolved or tracked.
- [ ] Required CI checks pass.
- [ ] Critical product, architecture, security/privacy, compliance, provider, cost, deployment, release, destructive-data, secret-access, and real-FPL-action gates are approved or not applicable.
- [ ] Human merge approval is still required; this pull request must not be merged based on this checklist alone.
