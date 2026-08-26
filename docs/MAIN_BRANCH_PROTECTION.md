# Main Branch Protection Decision and Runbook

- Status: decision required; no GitHub settings changed
- Owning issue: FPL-63
- Exposure decision: FPL-86
- Last verified: 2026-08-26

## 1. Purpose

This document records the current enforcement gap, the available repository-plan
options, the proposed `main` protection, and the activation and verification
runbook. It is a decision package, not approval to change repository visibility,
purchase a plan, publish the project, alter deployment access, or apply the
proposed protection.

The exact proposed GitHub REST payload is stored in
[`main-branch-protection.proposed.json`](./main-branch-protection.proposed.json).
It must remain unapplied until the prerequisites in section 7 are satisfied.

## 2. Verified current state

The following state was verified through the GitHub API and an unauthenticated
HTTP request on 2026-08-26:

- `matluniewski/fpl-intelligence` is a public, user-owned repository.
- `main` is the default branch and has no classic branch protection or
  repository ruleset.
- the only collaborator is the repository owner, with administrator access;
- the repository homepage is `https://fpl-intelligence-web.vercel.app`, and that
  deployment returned HTTP 200 without authentication;
- GitHub reports secret scanning, push protection, non-provider pattern
  scanning, validity checks, and Dependabot security updates as disabled;
- no repository Actions secrets or variables are configured, and the CI
  workflow does not reference repository secrets;
- the repository has no declared license or `SECURITY.md`; and
- the current Git history contains two distinct commit-author email addresses
  that are not GitHub `noreply` addresses. Their values must not be copied into
  issues, pull requests, logs, or audit artifacts.

A limited current-tree scan found no high-confidence secret pattern, no tracked
environment file other than `.env.example`, and no tracked media or office
document. Gitleaks was not available locally, and this was not a full-history
secret or sensitive-data audit. These negative results do not establish public
release readiness.

This state conflicts with the original FPL-63 premise that the repository is
private and with the project rule that public release requires an explicit
security, privacy, compliance, and branding decision. FPL-86 owns resolution of
that active exposure. FPL-63 must not normalize the public state by silently
selecting the public-repository option.

## 3. Platform capability and cost comparison

GitHub documents protected branches as available for public repositories on
GitHub Free and for public or private repositories on GitHub Pro, Team,
Enterprise Cloud, and Enterprise Server. GitHub's plan documentation lists
protected branches among GitHub Pro's advanced private-repository tools.

The public GitHub pricing table reviewed on 2026-08-26 exposes a USD 4 per-user
monthly price for GitHub Team, but it does not expose an unambiguous GitHub Pro
purchase price in the retrieved public content. Team pricing must not be used as
a proxy for a personal-account Pro quote. Any Pro purchase therefore requires a
fresh quote from the authenticated billing screen and explicit approval of the
exact recurring amount and billing terms.

Primary references:

- [Managing protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [GitHub plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans)
- [GitHub pricing](https://github.com/pricing)
- [REST API endpoints for protected branches](https://docs.github.com/en/rest/branches/branch-protection)

| Option                                         | Technical enforcement                                                                       | Incremental plan cost                       | Material consequences                                                                                         | FPL-63 outcome                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Keep the repository public                     | Available on GitHub Free                                                                    | None for branch protection                  | Continues public code and history exposure; requires the FPL-86 public-readiness decision                     | Can satisfy FPL-63 only after FPL-86 approval          |
| Make the repository private and buy GitHub Pro | Available after the upgrade                                                                 | Recurring price must be quoted and approved | Reduces future anonymous repository access but does not erase prior exposure; creates a commercial commitment | Can satisfy FPL-63 after visibility and spend approval |
| Make the repository private on GitHub Free     | Not available according to the documented plan boundary and the prior FPL-14 `403` evidence | None                                        | Removes future anonymous repository access but leaves `main` protected only by process                        | Interim risk reduction only; does not satisfy FPL-63   |

Moving the repository to an organization or choosing Team/Enterprise would
expand ownership, billing, and administration scope and is not required to
solve the current single-owner case. It needs a separate approved issue if it
becomes desirable.

## 4. Security and workflow value

The proposed protection converts the existing operational policy into a
platform-enforced invariant:

- every `main` change must be associated with a pull request;
- the head branch must be current with `main`;
- all repository CI and GitGuardian checks must pass;
- unresolved review conversations block merge;
- administrators are subject to the checks during routine delivery; and
- force pushes and deletion of `main` are blocked.

This prevents accidental direct merges and stale or partially validated changes.
It does not replace independent review, owner merge approval, secret scanning,
source-rights review, deployment approval, or incident recovery.

## 5. Proposed protection

Use classic branch protection for the current user-owned repository. It provides
the required controls with a smaller configuration surface than a repository
ruleset and has a direct read/write API for verification and rollback.

Required checks and their sources were observed on the head of PR #49:

| Check                         | Required source  | GitHub App ID |
| ----------------------------- | ---------------- | ------------: |
| `Format`                      | `github-actions` |         15368 |
| `Lint`                        | `github-actions` |         15368 |
| `Typecheck`                   | `github-actions` |         15368 |
| `Test`                        | `github-actions` |         15368 |
| `Build`                       | `github-actions` |         15368 |
| `Database`                    | `github-actions` |         15368 |
| `GitGuardian Security Checks` | `gitguardian`    |         46505 |

FPL-63's older acceptance text omits `Database`; the current CI and
`DEVELOPMENT.md` define it as a separate quality boundary. Requiring it is an
explicit additive correction that keeps the platform gate aligned with the
canonical CI policy.

The initial pull-request review count is zero. GitHub explicitly supports zero
to require the pull-request path without requiring an approval. This preserves
the single-maintainer constraint because an author cannot approve their own pull
request. Independent review evidence and explicit owner merge approval remain
operational gates under `AGENT_WORKFLOW.md` and `INDEPENDENT_REVIEW.md`.

When a second eligible reviewer with repository write access is approved and
available, update the protection in a separately tracked change to require one
approval, dismiss stale approvals, and require approval of the latest reviewable
push. Do not enable that phase merely because a comment-only or external review
exists.

## 6. Proposed API payload controls

The proposed payload has these deliberate properties:

- `strict: true` requires the branch to be up to date;
- each status check is pinned to the observed GitHub App rather than accepting a
  same-named status from any writer;
- `enforce_admins: true` removes routine administrator bypass;
- a pull-request review object with zero approvals requires the PR path without
  creating an impossible self-approval gate;
- no user, team, app, or pull-request bypass allowance is configured;
- conversation resolution is required; and
- force pushes, deletion, branch locking, and unrelated creation restrictions
  remain disabled or blocked as appropriate.

GitHub App IDs and check names are external identifiers. Re-verify all seven on
a recent successful pull request immediately before activation. If an expected
check is absent or has changed source, stop rather than applying a partial gate.

## 7. Activation prerequisites

All of the following are required before applying the payload:

1. FPL-86 records the owner's repository-visibility decision and resolves
   whether the current public repository and deployment are approved.
2. If the selected path requires GitHub Pro, the authenticated billing screen
   provides the current recurring quote and the owner explicitly approves that
   exact spend and terms.
3. The owner explicitly approves applying the proposed protection to the
   selected repository state.
4. FPL-63's final diff receives independent review under
   `INDEPENDENT_REVIEW.md`, and all material findings are resolved.
5. A recent pull request has successful runs from the expected sources for all
   seven required checks.
6. The existing protection and ruleset state is captured for rollback.
7. The repository owner retains verified administrator recovery access.

Visibility, deployment, billing, and branch-protection approvals are separate.
Approval of one must not be inferred as approval of another.

## 8. Activation and verification runbook

After all prerequisites and immediately before mutation:

1. fetch repository visibility, collaborators, existing rulesets, current
   branch protection, and the seven check sources again;
2. compare the final payload with the reviewed file at the approved commit SHA;
3. apply the payload with the versioned GitHub branch-protection REST endpoint;
4. fetch `branches/main/protection` and compare every material field and check
   source with the payload;
5. open a dedicated, harmless test pull request owned by FPL-63 or an approved
   follow-up issue;
6. verify the test pull request cannot merge while its branch is stale, a
   required check is pending or failing, or a conversation is unresolved;
7. verify it becomes technically mergeable only when current and all required
   checks and conversations satisfy the rule; and
8. record the protection response, test pull request, commit SHAs, timestamps,
   and any deviations in FPL-63 without copying tokens or sensitive metadata.

Do not test force-push or deletion controls by issuing an operation that would
mutate `main` if the protection were misconfigured. Verify those fields through
the API response. The test pull request still requires the normal independent
review and owner merge approval before it may merge.

## 9. Rollback and failure handling

If activation unexpectedly blocks all safe delivery, the repository owner may,
after explicit approval for the exact rollback, restore the captured prior
protection state or remove the new rule through the GitHub API or settings UI.
Record who approved the rollback, the before/after state, and why the rule
failed. Do not weaken individual checks ad hoc to merge an unrelated pull
request.

If GitGuardian is unavailable, keep the pull request unmerged while the check is
required. A planned removal or replacement of that integration needs its own
security decision and an update to this document and the proposed payload.

## 10. Current decision record

No option has been selected. No plan purchase, visibility change, deployment
change, history rewrite, secret-security setting, ruleset, or branch protection
was performed by FPL-63 as of 2026-08-26.

Required owner decisions are:

1. resolve FPL-86: keep the repository public or make it private, and separately
   decide the deployment's visibility;
2. if private with technical enforcement, approve or reject the current GitHub
   Pro quote after it is captured; and
3. after the above, approve or reject applying the reviewed protection payload.
