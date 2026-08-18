# Agent Delivery Workflow

Status: active engineering workflow

Owner: FPL-23

Last updated: 2026-08-18

## 1. Purpose

This document defines how coding agents deliver reviewable, auditable work for FPL Intelligence. It expands the repository-wide rules in [`AGENTS.md`](../AGENTS.md) without changing the authority of Linear, Figma, repository documentation, or the project owner.

The default is autonomous progress through routine delivery steps. Human attention is reserved for decisions and actions with material product, technical, legal, commercial, security, privacy, financial, release, data-loss, authority, or real-account consequences.

## 2. Source-of-truth hierarchy

| Subject                                                    | Authoritative source                         | Working rule                                                                      |
| ---------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| Status, priority, dependencies, scope, acceptance criteria | Linear                                       | Read the issue and relations before starting; keep status synchronized.           |
| Approved UX and visual design                              | Figma                                        | Implement approved states; treat wireframe dates and player data as illustrative. |
| Product and engineering documentation                      | Repository `docs/` and `README.md`           | Update canonical documentation with the change.                                   |
| Repository agent rules                                     | Root and applicable nested `AGENTS.md` files | Read them before editing files in their scope.                                    |
| Consequential architecture decisions                       | Accepted records in `docs/adr/`              | Do not implement a new decision before approval.                                  |

When two authoritative sources materially conflict, stop only the affected path, report the evidence, and request a decision. Do not hide the conflict in implementation or choose the more convenient source.

## 3. Selecting the next issue

After synchronizing `main`, identify issues that are not completed, canceled, or blocked. Rank them by:

1. dependency enablement: work that unlocks other approved issues;
2. Linear priority;
3. execution value: risk reduction, feedback speed, foundational value, and efficient use of the current repository state; and
4. estimate and sequencing practicality when the preceding factors are equivalent.

Read the full issue, acceptance criteria, relations, and relevant linked documents before changing status. Do not start an issue whose blocking relations are incomplete. Briefly tell the owner which issue was selected and why, then continue without requesting routine confirmation.

## 4. Starting work

1. Confirm local `main` is clean and synchronized with `origin/main`.
2. Move the selected Linear issue to In Progress and assign it to the active owner/agent as appropriate.
3. Create a branch from `main` using:

   ```text
   fpl-<issue-number>-<short-description>
   ```

4. Ignore Linear-generated `matluniewski/...` branch suggestions.
5. Re-read applicable `AGENTS.md` files and canonical documentation.
6. Inspect the existing implementation, tests, and working tree before editing. Preserve unrelated user changes.

If the issue cannot be started safely, leave an evidence-based Linear update and select another unblocked issue when possible.

## 5. Implementing within scope

- Treat the issue description and acceptance criteria as the authorized boundary.
- Make safe, reversible assumptions only when they do not materially change scope or a critical decision.
- Prefer the smallest coherent implementation that fully satisfies the issue.
- Keep architecture dependencies pointing inward and external providers behind adapters.
- Keep provider DTOs, SDK types, persistence records, and transport failures out of domain contracts.
- Make deterministic logic independent of external state and pass clocks/configuration explicitly.
- Treat AI and vision output as untrusted candidates requiring runtime and domain validation.
- Preserve provenance, confidence dimensions, policy state, expiry, and versioning.
- Keep recommendations explainable and all real FPL actions behind explicit human approval.

When work reveals additional value outside scope, create or propose a follow-up Linear issue. Do not silently expand the active issue.

## 6. Safety and artifact hygiene

Never place the following in the repository, Linear, GitHub, CI, logs, screenshots, or review artifacts unless an approved policy explicitly permits that exact use:

- secrets, credentials, cookies, tokens, or private keys;
- real FPL account access data;
- raw screenshots or screenshot derivatives;
- raw provider payloads or disallowed source content;
- unnecessary personal data or player health/news content; or
- production records copied into tests.

Use synthetic or properly redacted fixtures. Screenshots are ephemeral by default and follow [`SCREENSHOT_PRIVACY.md`](./SCREENSHOT_PRIVACY.md). News and provider content follows [`NEWS_SOURCE_COMPLIANCE.md`](./NEWS_SOURCE_COMPLIANCE.md).

Unknown commercial rights, provider terms, external-processor terms, retention, deletion, or health-data requirements disable the affected path. Public availability, attribution, a paid subscription, technical access, or model summarization is not permission.

Prohibited shortcuts include:

- scraping X, public websites, search results, or a user's browser session;
- unofficial FPL endpoints, stored credentials, cookies, or browser automation;
- fallback to an unapproved source or provider;
- removing provenance or restrictions during normalization;
- retaining screenshots or raw content for debugging convenience; and
- bypassing approval, release, privacy, compliance, or kill-switch gates.

## 7. UX work

For a UI issue:

1. Confirm the relevant Figma screen/state is approved.
2. Separate illustrative mock dates, players, clubs, statistics, and internal branding from production data/assets.
3. Implement the owned loading, empty, error, stale, partial, unavailable, onboarding, confirmation, and recovery states.
4. Record intentional deviations in the issue and pull request; material deviations require approval.
5. Provide safe screenshots or recordings only when they contain mock or properly redacted data.

Figma is not authority for domain behavior, commercial rights, provider selection, or real data.

## 8. Testing and local verification

Run focused tests during implementation and add coverage proportional to risk:

- deterministic unit tests for domain, projection, optimization, evidence, and validation logic;
- adapter contract tests for normalization and provider error translation;
- integration tests for application, persistence, and external boundaries; and
- Playwright tests for approved critical user journeys.

Before opening or materially updating a pull request, run from the repository root:

```bash
pnpm check
```

The gate covers formatting, lint, TypeScript, automated tests, and the production build. If a check is genuinely not applicable or cannot run because of an external limitation, document the exact command, result, evidence, risk, and follow-up in the pull request. Do not report a check as passing when it was skipped.

## 9. Self-review

Review the complete diff against the Linear issue and ask:

- Are all acceptance criteria satisfied and no unrelated changes included?
- Are tests meaningful, deterministic, and inclusive of failure paths?
- Do provider or persistence details leak into domain or presentation code?
- Are inputs validated at trust boundaries and errors translated safely?
- Are provenance, confidence, expiry, retention, deletion, and version information preserved?
- Could logs, fixtures, screenshots, errors, or CI artifacts expose protected data?
- Has a provider, hosting, cost, privacy, security, product, or architecture decision been made implicitly?
- Do setup, behavior, operations, and canonical docs still agree?
- Is rollback or disablement clear for the risk introduced?

Fix in-scope findings before publishing. Record follow-up items in Linear.

## 10. Draft pull request and CI

1. Commit only intentional files using an English, issue-scoped message.
2. Push the approved branch.
3. Open a draft pull request linked to the Linear issue.
4. Complete every applicable section of the pull request template, including acceptance criteria, tests, documentation, risk/rollback, provider terms, retention, variable cost, and UI/Figma state.
5. Keep the pull request draft while CI and review are incomplete.
6. Monitor all required checks and fix failures caused by the change.
7. Re-run local checks and update the pull request evidence after revisions.
8. Keep the Linear issue In Progress and synchronize links/status with GitHub.

CI success is necessary evidence, not an approval to merge.

## 11. Independent review and revisions

Obtain a review pass distinct from the implementation/self-review pass. It may be performed through the approved code-review tooling or by a human reviewer, but it must examine the final diff and acceptance criteria rather than merely restating CI results.

Classify findings by impact, address actionable in-scope findings, and record intentionally deferred work in Linear. Re-run affected checks after every revision. Resolve or explicitly accept all material findings before requesting merge approval.

## 12. Critical human approval gates

Stop and request explicit owner approval before:

- merging into `main`;
- making a material product-scope, architecture, security, privacy, compliance, provider, or ADR decision not already authorized;
- making a legal/commercial commitment, incurring spend, starting procurement, deploying, or releasing publicly;
- performing a destructive or difficult-to-recover data operation;
- accessing new secrets or materially expanding external authority; or
- performing any real FPL account action.

Examples that remain blocked without separate approved work include selecting hosting or a managed database, enabling a live news source, choosing a vision/LLM provider, adding authentication or billing, changing retention, automating an FPL account, or publishing a beta.

Approval must be specific enough to identify the decision or action. Do not infer approval from silence, a passed check, an issue status, Figma access, technical capability, or a previous approval for a different gate.

## 13. Platform permissions versus project approval

Project approval answers whether an action is authorized. Platform permission answers whether the current environment allows it. Both must be satisfied.

- A sandbox or operating-system prompt may be needed for a routine authorized command and does not require a new product decision.
- Human approval of a product or merge gate does not authorize bypassing GitHub protection, credentials, filesystem restrictions, or provider policy.
- If a platform blocks an authorized action, use a safe alternative or report the exact blocker. Do not weaken controls.

## 14. Merge and continuation

After explicit merge approval:

1. Confirm the pull request head SHA, required checks, review state, and absence of unresolved material findings.
2. Mark the pull request ready when appropriate and merge using the repository's approved method.
3. Confirm the merged commit on GitHub.
4. Move or verify the Linear issue as Done and attach/update links as needed.
5. Switch local work to `main` and fast-forward from `origin/main`.
6. Confirm the working tree is clean.
7. Select the next unblocked issue using section 3 and continue automatically.

The owner should not need to repeat “continue” between these routine steps.

## 15. Pausing and recovery

Pause only the affected work when:

- a critical gate lacks approval;
- requirements or sources of truth conflict materially;
- a destructive target cannot be verified;
- required data, design, permission, or external state is unavailable; or
- no safe in-scope assumption can resolve the blocker.

Before pausing, exhaust safe read-only checks and in-scope alternatives. Report what is complete, the evidence for the blocker, its impact, and the smallest decision or external change needed. Keep Linear accurate; do not mark incomplete work Done.

## 16. Workflow summary

```text
Linear issue
  -> approved branch
  -> implementation and documentation
  -> automated tests
  -> self-review
  -> draft pull request
  -> CI
  -> independent review
  -> revisions
  -> human merge approval
  -> merge
  -> Linear Done
  -> sync main
  -> next unblocked issue
```
