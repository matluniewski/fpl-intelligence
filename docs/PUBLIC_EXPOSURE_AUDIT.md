# Public Repository and Deployment Exposure Audit

- Status: owner decision required; no exposure setting changed
- Owning issue: FPL-86
- Related gates: FPL-46 and FPL-63
- Last verified: 2026-08-26

## 1. Executive finding

FPL Intelligence is already externally accessible in two distinct ways:

1. the complete GitHub repository and its history are public; and
2. the Vercel production deployment responds without authentication.

This is not merely a configured future release path. Eight production
deployments have been created from `main`, and GitHub links the public repository
to the public production hostname.

The state conflicts with the current approval record:

- FPL-46, the urgent public-beta commercial-readiness gate, is in Backlog and
  blocked by six unresolved issues;
- FPL-46 states that no public deployment may occur without recorded human
  approval;
- `PRODUCT.md` identifies `FPL Intelligence` as an internal project name and
  records unresolved branding, licensing, privacy, terms, retention, analytics,
  and source-rights gates; and
- repository policy requires explicit approval before public release.

No evidence reviewed in this audit records approval for the current public
repository or production deployment. Silence and the technical existence of
those resources are not approval.

The risk-minimizing recommendation is to return both source and application to
an internal state until FPL-46 is satisfied: make the repository private and
make the production deployment unavailable on the current Hobby plan, or
access-controlled only after separately approving the required paid Vercel
protection. This recommendation is not authorization to perform either action.
Repository visibility and deployment visibility require two separate explicit
owner decisions. Private branch protection may require an approved GitHub Pro
purchase under FPL-63, while private Vercel production has its own separate plan
and add-on cost.

## 2. Scope and safety

The audit used read-only local inspection, GitHub APIs, the connected Vercel
integration, and anonymous HTTP requests. It did not:

- change GitHub or Vercel settings;
- download GitHub Actions artifacts or build/runtime logs;
- request, expose, or rotate a credential;
- authenticate to the public application;
- disable, promote, redeploy, or delete a Vercel deployment;
- change repository visibility or rewrite Git history; or
- copy commit-author email values into this report.

Potential secrets were handled only by a local scanner with full redaction. No
repository content was sent to a new scanning provider.

## 3. GitHub exposure inventory

### 3.1 Repository and collaboration

| Surface                       | Verified state                          |
| ----------------------------- | --------------------------------------- |
| Ownership                     | User-owned by the project owner         |
| Visibility                    | Public                                  |
| Default branch                | `main`                                  |
| Collaborators                 | One administrator: the repository owner |
| Branches                      | 47                                      |
| Protected branches            | 0                                       |
| Repository rulesets           | 0                                       |
| Forks, stars, subscribers     | 0, 0, 0 at audit time                   |
| Tags and releases             | 0 and 0                                 |
| GitHub Pages                  | Not enabled                             |
| Deploy keys and webhooks      | 0 and 0                                 |
| Declared license              | None                                    |
| Repository description/topics | None                                    |
| Public homepage               | The production Vercel hostname          |
| Community profile             | 28%                                     |

Making the repository private would prevent future anonymous GitHub access but
would not retract existing clones, caches, indexed content, copied pull-request
text, or previously exposed author metadata. There were no forks recorded by
GitHub at audit time, but that does not prove no external copy exists.

### 3.2 Pull requests and public metadata

The repository contained 50 pull requests, 39 issue/PR comments, seven submitted
reviews, no standalone issues, no review comments, and no commit comments in the
queried API collections.

A local pattern scan of titles, bodies, comments, and review bodies found:

- no email-address pattern;
- no high-confidence credential or private-key pattern; and
- 14 embedded-resource comments, all authored by `vercel[bot]` and containing
  Vercel deployment/status hosts rather than user-uploaded evidence.

Those comments make preview hostnames publicly discoverable. The sampled latest
preview was protected by Vercel authentication, so hostname disclosure did not
provide anonymous access to its page content.

Deleted or edited metadata, GitHub caches, external indexing, and content not
returned to the authenticated API caller were outside the scan.

### 3.3 Actions, deployments, and environments

| Surface                              | Verified state                                     |
| ------------------------------------ | -------------------------------------------------- |
| Workflow runs                        | 97 total: 95 successful, one failed, one cancelled |
| Trigger events                       | 59 pull-request runs and 38 push runs              |
| Actions artifacts                    | 0                                                  |
| GitHub deployment records            | 25                                                 |
| GitHub environments                  | 2                                                  |
| Default workflow token               | Read-only                                          |
| Workflows may approve PRs            | No                                                 |
| Allowed Actions policy               | All actions allowed                                |
| Repository Actions secrets/variables | 0 and 0                                            |
| Workflow secret references           | None                                               |

The CI workflow uses `pull_request`, not `pull_request_target`; gives the workflow
read-only repository access; and pins its actions to commit SHAs. Allowing all
Actions is a wider supply-chain policy than an allowlist, but the checked-in
workflow itself is currently constrained.

No workflow logs were downloaded. The absence of Actions artifacts and workflow
secret references reduces exposure but does not establish that historical logs
never contained sensitive text.

### 3.4 Security controls and scan evidence

GitHub's repository API reported these controls disabled:

- secret scanning;
- secret scanning push protection;
- non-provider secret patterns;
- secret validity checks; and
- Dependabot security updates.

The Dependabot alerts endpoint returned HTTP 403, while code-scanning and
secret-scanning alert endpoints returned HTTP 404. Their alert counts are
therefore unknown, not zero. The private security-advisory collection was
available and empty at audit time.

The following independent local checks were completed:

| Check                                | Scope                                             | Result                                                 |
| ------------------------------------ | ------------------------------------------------- | ------------------------------------------------------ |
| Tracked filename review              | Current tree                                      | Only `.env.example` matched sensitive filename classes |
| High-confidence pattern scan         | Current tree                                      | No candidate path                                      |
| Media/office-document inventory      | Current tree                                      | No tracked file                                        |
| Historical sensitive filename review | All reachable Git objects                         | Only `.env.example`                                    |
| Gitleaks 8.30.1                      | All reachable Git references (`--log-opts=--all`) | 0 findings                                             |

Gitleaks ran from the official container image pinned to digest
`sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f`.
The repository was mounted read-only, container networking was disabled, Linux
capabilities were dropped, the container filesystem was read-only, and the
temporary report used 100% secret redaction. The report was deleted from a
verified temporary directory after its finding count was recorded.

The latest Windows release archive was not used because
[an upstream issue records a checksum mismatch for that asset](https://github.com/gitleaks/gitleaks/issues/2164).
The pinned official container avoided relying on the disputed archive.

Zero scanner findings reduce the probability of a committed credential but do
not prove the absence of personal, confidential, proprietary, or otherwise
release-inappropriate information. Scanner results also do not replace
credential revocation if a secret is discovered later.

### 3.5 Commit identity exposure

The reachable history contains two distinct commit-author email addresses that
are not GitHub `noreply` addresses. This report intentionally does not reproduce
them.

The owner must explicitly choose one of these treatments:

1. accept the existing disclosure and configure future commits to use an
   approved `noreply` identity; or
2. approve a coordinated history rewrite after assessing clones, open pull
   requests, commit references, signatures, deployments, CI, and force-push
   consequences.

A visibility change alone does not remove addresses from copies made while the
repository was public. History rewriting is destructive and remains prohibited
without separate explicit approval and a recoverable backup.

## 4. Vercel exposure inventory

The connected Vercel integration identified a GitHub-linked Next.js project on
the Hobby plan, using Node.js 24.x.

| Surface                         | Verified state                           |
| ------------------------------- | ---------------------------------------- |
| FPL deployments                 | 26 across three result pages             |
| Production deployments          | 8, all from `main`                       |
| Preview deployments             | 18                                       |
| Deployment states               | 24 ready, 2 error                        |
| Distinct Git branches deployed  | 14                                       |
| Rollback candidates reported    | 2                                        |
| Project domains                 | 3 `vercel.app` domains, no custom domain |
| Production anonymous access     | HTTP 200, HTML, no redirect              |
| Latest preview anonymous access | HTTP 302 to `vercel.com/sso-api`         |

The public production path is therefore active. Preview deployment content is
protected in the sampled current configuration, although preview hostnames are
published by Vercel bot comments on pull requests.

This access split is consistent with Vercel's current plan boundary. On Hobby,
Standard Protection can protect preview deployments and generated deployment
URLs, but the production domain remains public. Protecting all deployments,
including production domains, requires Enterprise or a Pro plan with Advanced
Deployment Protection. Vercel currently lists that Pro add-on at USD 150 per
month and a minimum 30-day use period. Neither a Pro plan nor the add-on is
approved by this audit.

Primary references:

- [Vercel Deployment Protection](https://vercel.com/docs/deployment-protection)
- [Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication)

A no-new-spend internalization path on Hobby must therefore make the production
domain unavailable, for example by an approved alias/deployment removal or
disablement plan, and prevent automatic recreation. The exact reversible
mutation must be verified in the authenticated project settings before it is
approved. Merely enabling Standard Protection would leave the production domain
public.

The local Vercel CLI was not authenticated. The existing connected integration
provided project and deployment inventory without requesting a new token. The
available project response did not expose environment-variable inventory, and
the repository application currently declares no runtime environment variable,
application network call, or analytics/cookie dependency. This does not prove
that the Vercel project has no environment variables or integration-level
configuration.

No raw build logs or runtime logs were read. Aggregate runtime log/error queries
returned no structured result for this static application, so the audit makes no
claim about traffic volume or historical log content.

## 5. Public application content

The current production application is a static Next.js page. Repository
inspection shows:

- project-authored illustrative news, squad, and recommendation data;
- visible `Illustrative season`, `Illustrative gameweek and deadline`, and
  `Illustrative status` labels;
- no application network call in the checked-in page code;
- no active upload, authentication, billing, analytics, or account-action flow;
  and
- no runtime environment variable required by the application.

This materially limits current user-data and live-source exposure. It does not
make the release approved. The public page uses the internal `FPL Intelligence`
name and FPL-oriented product language while the repository records no approved
public branding/IP position. It also exposes no public privacy notice, terms,
support route, vulnerability-reporting route, release classification, or
non-affiliation disclaimer.

No live football, FPL, X, or news provider is enabled in the checked-in page.
All such sources remain separately gated.

## 6. Decision options

Repository visibility and deployment visibility must be decided separately.

| Option                                  | Repository            | Production deployment                        | Required gate                                                                                               | Consequence                                                             |
| --------------------------------------- | --------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| A. Internal prototype (recommended now) | Private               | Unavailable on Hobby, or paid access control | Explicit visibility/deployment approvals; FPL-63 plan decision; Vercel spend approval if protection is paid | Stops future anonymous access while public readiness remains incomplete |
| B. Public source, internal application  | Public                | Unavailable on Hobby, or paid access control | Open-source readiness and branch protection; Vercel spend approval if protection is paid                    | Keeps code/history public but prevents an unapproved product beta       |
| C. Private source, public beta          | Private               | Public                                       | FPL-46 go decision and all blockers; FPL-63 private enforcement path                                        | Public product remains gated even though source is private              |
| D. Public source and public beta        | Public                | Public                                       | Both B and C gates plus explicit approval of the combined state                                             | Broadest exposure and operational obligation                            |
| E. Time-bounded risk acceptance         | Unchanged temporarily | Unchanged temporarily                        | Explicit owner acceptance with expiry, owner, monitoring, and rollback                                      | Does not resolve missing public-readiness controls                      |

Option A is recommended because FPL-46 is incomplete and explicitly prohibits an
unapproved public deployment. Option B may be viable later if the owner wants an
open-source repository independently of a public product. Options C and D must
not proceed until FPL-46 reaches an approved go decision. On the current Hobby
plan, selecting A or B without new spend means making the production domain
unavailable rather than relying on Standard Protection.

## 7. Remediation plan after owner decision

### 7.1 Common preparation

1. Capture current GitHub and Vercel settings, aliases, protection state, and
   recovery access.
2. Confirm the exact repository and deployment decisions independently.
3. Confirm whether non-`noreply` commit-email disclosure is accepted or requires
   a separately approved rewrite.
4. Verify Vercel environment-variable and integration inventory through an
   approved authenticated administrative path without copying values.
5. If paid Vercel production protection is considered, capture and approve the
   full current plan/add-on quote and minimum commitment rather than relying on
   the public headline price alone.
6. Record the approved rollback owner and verification window.

### 7.2 If the repository becomes private

1. Review GitHub's visibility-change effects immediately before execution.
2. Obtain explicit approval for the visibility change.
3. Change visibility through GitHub and verify anonymously.
4. Decide under FPL-63 whether to purchase GitHub Pro for technical `main`
   protection or accept a time-bounded process-only gap.
5. Keep the repository's prior public exposure in the risk record.

### 7.3 If the repository remains public

1. Complete and approve licensing, branding/IP, privacy, security,
   contribution, support, and vulnerability-reporting requirements.
2. Add an approved license; do not infer one from public visibility.
3. Enable and verify available secret scanning, push protection, and dependency
   security controls.
4. Constrain the allowed Actions policy if compatible with the approved
   integration set.
5. Apply and verify the FPL-63 `main` protection after its independent review
   and explicit activation approval.

### 7.4 If production becomes internal

1. Choose between no-new-spend removal/disablement of the public production path
   and separately paid all-deployment protection.
2. For the no-new-spend path, verify how to remove or disable the production
   alias/deployment and prevent Git integration from recreating it while keeping
   a documented recovery route.
3. For paid protection, capture the exact Pro and Advanced Deployment Protection
   terms and obtain explicit spend approval.
4. Obtain explicit approval for the exact Vercel mutation.
5. Apply it without changing preview protection or unrelated projects.
6. Verify the production hostname anonymously and through the approved owner
   access path.
7. Remove or update the GitHub homepage only if separately approved.

### 7.5 If production remains public

1. Complete FPL-46 and all of its blockers.
2. Record an explicit go decision for the exact feature/data/provider scope.
3. Add approved public branding, privacy/terms, support, incident, retention,
   monitoring, and rollback surfaces.
4. Verify production from an unauthenticated context and label the release
   accurately.

## 8. Open decisions and blockers

The audit can proceed no further without owner decisions on:

1. Was the public GitHub repository intentional and approved?
2. Was the public production deployment intentional and approved?
3. Which option in section 6 should be executed?
4. Is the existing non-`noreply` commit-email exposure accepted, or should a
   destructive history-rewrite proposal be prepared?
5. May an authenticated Vercel administrative inventory verify environment
   variables, integrations, protection settings, and retention without copying
   values?
6. If production should remain deployed but access-controlled, is the owner
   willing to consider and explicitly approve the required Vercel paid plan and
   add-on after an exact quote is captured?

Until those decisions are recorded, no visibility, deployment, history,
security-control, billing, or branch-protection mutation is authorized.
