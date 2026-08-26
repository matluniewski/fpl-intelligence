# X research evidence-access decision proposal

Status: decision proposal; disabled pending explicit owner approval

Owning issue: FPL-85

Related research: FPL-76, FPL-67, FPL-68

Reviewed: 2026-08-26

This document is a technical and operational research record, not legal advice,
X approval, a provider selection, permission to create an account, permission to
accept terms, or authorization to spend or retrieve X Content.

## Decision summary

No reviewed path is currently approved for completing the unmet FPL-76 identity
and sample requirements.

Overall disposition: `needs_clarification`.

| Path                                        | Can meet immutable identity and recent-sample requirements? | Disposition                  | Reason                                                                                                                                                                  |
| ------------------------------------------- | ----------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Official X API                              | Technically yes                                             | `needs_clarification`        | Account/use-case approval, live console terms and prices, billing authority, retention in Git, compliance access, privacy role, and deletion evidence remain unresolved |
| Written licensed export                     | Potentially                                                 | `needs_clarification`        | No concrete licensor, export, rights grant, price, correction feed, or deletion terms exist                                                                             |
| Owner-performed manual review               | Partially                                                   | `ineligible_for_full_fpl_76` | It can support qualitative review but cannot reliably prove immutable X user IDs or a reproducible 90-day sample without prohibited automation                          |
| Public syndication or undocumented endpoint | No                                                          | `ineligible`                 | It is not an approved X API/export path and already returned HTTP 429; no retry, endpoint switching, or bypass is permitted                                             |

The recommended next decision is a tightly bounded, read-only official X API
research run using the proposed policy below. It remains disabled until the
owner explicitly approves the exact use-case wording, account authority,
current Developer Console terms and prices, a maximum total spend, credential
provisioning, retention/deletion treatment, and the listed unresolved points.

If those approvals are not granted, FPL-76 must be explicitly rescoped to a
discovery-only account list with qualitative manual observations and no claim
of immutable identity verification, complete sampling, or measured historical
reliability.

## Project constraints

The decision inherits the stricter requirements in
[PUBLIC_SOURCE_RESEARCH.md](../PUBLIC_SOURCE_RESEARCH.md),
[NEWS_SOURCE_COMPLIANCE.md](../NEWS_SOURCE_COMPLIANCE.md),
[DATA_PROVENANCE.md](../DATA_PROVENANCE.md), and
[X_API_COMPLIANCE_RESEARCH.md](../X_API_COMPLIANCE_RESEARCH.md):

- no HTML scraping, browser automation, unofficial endpoint, copied dataset,
  shared credential, user browser session, authentication bypass, rate-limit
  bypass, CAPTCHA bypass, private account, Direct Message, or non-public data;
- no account creation, terms acceptance, payment method, credit purchase,
  credentials, live request, runtime ingestion, public display, commercial use,
  or provider fallback without its own approved action;
- no raw post body, profile description, image, video, provider response,
  credential, cookie, token, or unnecessary health data in Git, Linear, logs,
  CI, pull requests, fixtures, analytics, or support tools;
- no external-LLM processing, embeddings, model training, or fine-tuning;
- no health diagnosis or inference; only explicitly published football
  availability statements may be classified as unverified research evidence;
- unknown terms, price, rights, retention, deletion, correction, geography,
  processor, or technical limit fail closed; and
- research eligibility does not authorize product or commercial use.

## Option 1: official X API

### Technical fit

The official user-lookup API can resolve up to 100 usernames in one request and
returns immutable user IDs. The user-posts timeline supports app-only access,
time filtering, exclusion of replies and reposts, pagination, and up to 3,200
recent posts. Those capabilities are sufficient in principle for the identity,
90-day screening, and shortlisted-account sampling required by FPL-76.

Only these read paths are proposed:

- `GET /2/users/by` for batched username-to-ID resolution;
- `GET /2/users/{id}/tweets` for bounded authored-post samples;
- `GET /2/tweets` only to revalidate selected evidence IDs; and
- X batch-compliance jobs only if the selected access level and current price
  sheet explicitly permit them.

Search, streaming, home timelines, mentions, likes, followers, engagement
profiling, media retrieval, location fields, private metrics, write actions, and
full-archive access are out of scope. There is no automatic fallback to another
endpoint or source.

### Proposed developer use-case wording

The following wording is decision-ready but must be approved by the owner before
it is submitted to X:

> Private development-only research for FPL Intelligence. Read public posts from
> a fixed allowlist of at most 121 public football/FPL source accounts to verify
> account identity and evaluate a fixed recent sample for relevance, source
> directness, correction behavior, and decision-support value. The run is
> read-only, bounded to a 90-day window, and uses no private content, user
> profiling, advertising, government use, or account actions. Raw X Content is
> processed locally and ephemerally, is not displayed, redistributed, or sent to
> an external model, and is deleted after structured research annotations are
> produced. Any retained IDs and derived annotations remain private and subject
> to approved correction, deletion, and termination controls. Runtime ingestion,
> public display, commercial use, and model training are excluded.

Any material change requires a new X use-case approval and project approval.

### Fixed research window and item budget

The proposed run starts with a caller-supplied UTC `runStartedAt`. Its evidence
window is `[runStartedAt - 90 days, runStartedAt]`. The candidate universe and
shortlist are frozen before the first request.

The maximum billable resources are:

| Stage                 |                       Maximum resources | Purpose                                                            |
| --------------------- | --------------------------------------: | ------------------------------------------------------------------ |
| Identity              |                          121 User reads | Resolve the frozen candidate handles to immutable user IDs         |
| Screening             |                        1,210 Post reads | At most 10 recent authored posts for each of 121 candidates        |
| Shortlist depth       |             1,000 additional Post reads | At most 20 additional posts for each of 50 shortlisted accounts    |
| Evidence revalidation |                          190 Post reads | Rehydrate selected IDs and verify availability before finalization |
| **Total**             | **121 User reads and 2,400 Post reads** | Hard resource ceiling                                              |

At the public prices reviewed on 2026-08-26—USD 0.010 per User read and
USD 0.005 per Post read—the maximum estimated resource charge is USD 13.21
before tax or other charges. This estimate is not spend approval.

The project-wide conditions are stricter:

- the live Developer Console price sheet and required minimum credit purchase
  must be captured immediately before approval;
- an owner-approved total spend ceiling of no more than USD 15, including tax
  and any other charge, is required;
- the runner must alert at USD 10 estimated usage and stop at or before
  USD 13.21 estimated resource usage and before the approved USD 15 total is
  reached;
- a missing balance, price, usage signal, tax treatment, or compliance-job price
  disables the run; and
- unused prepaid credits, refundability, expiry, and automatic-renewal behavior
  must be understood before any purchase.

The public pricing page says the API is credit-based pay-per-usage with no
subscription, while the current Developer Agreement still contains paid-service
and automatic-renewal language. This conflict must be resolved from the exact
Developer Console checkout and account terms before the owner approves payment.

Resource deduplication within one UTC day is described as a soft guarantee and
must not be used to justify the budget. Every returned resource is reserved at
full price before the request.

### Request and failure controls

- Maximum 200 successful data or compliance requests for the entire run.
- Maximum concurrency is one request.
- Response rate-limit headers are recorded as content-free numeric telemetry.
- No automatic retry after HTTP 401, 403, 402/payment, 429, or an ambiguous
  response whose billing state cannot be reconciled.
- A transport retry is allowed only after the usage ledger proves that no
  resource was returned or billed; otherwise manual owner review is required.
- Any handle-to-ID change, protected/suspended account, malformed response,
  missing field, price change, quota exhaustion, or deletion-control failure
  stops the affected account and records `insufficient_evidence`.
- Global and per-account kill switches default to disabled and are evaluated
  before each request.

The documented rate limits are comfortably above this request budget, but they
are ceilings rather than targets and may change. A 429 ends the run; it never
causes endpoint switching, delayed retry loops, browser fallback, or scraping.

### Content-minimized processing contract

The API adapter may request only:

- user: `id`, `username`, `name`, `created_at`, `protected`, and `verified`;
- post: `id`, `author_id`, `created_at`, `edit_history_tweet_ids`, and text
  needed ephemerally for local human/deterministic classification; and
- pagination and rate/usage metadata needed for the bounded run.

Profile description, location, public/private engagement metrics, entities,
media, polls, follower graph, following graph, mentions, likes, and geo fields
are prohibited.

Raw responses and post text exist only in process memory for the shortest time
needed to produce one structured annotation. They are never written to disk,
swap by design where controllable, temporary files, queues, caches, traces,
logs, crash reports, browser storage, Git, Linear, CI, an external model, or a
third-party service. The current item is zeroed/released before the next page is
requested.

The proposed retained research annotation is limited to:

- internal research run ID and policy version;
- immutable X user ID, current handle, canonical account URL, and retrieval
  timestamp, only if the retention decision below is approved;
- account category and club/context coverage;
- sample start/end timestamps and aggregate inspected/relevant counts;
- structured content class counts (`official_fact`, `reporting`, `analysis`,
  `prediction`, `rumour`);
- selected Post IDs/canonical URLs and timestamps needed for reproducibility,
  only if their retention is approved;
- content-free verification result, correction/deletion observation, score
  components, evidence sufficiency, limitations, and re-review trigger; and
- content-free request, resource, latency, outcome, rate-limit, and cost units.

No text excerpt or paraphrase should be stored merely to make review easier.
An annotation that reconstructs the post or preserves sensitive detail is raw
or derivative content and is prohibited.

### Retention, deletion, and correction

The following point is unresolved and blocks approval: FPL-76 currently requires
immutable X user IDs and selected post references in version-controlled
repository artifacts. Git history is intentionally durable, while the X terms
require stored X Content to track removals and require all Licensed Material to
be permanently deleted at termination. The public materials reviewed do not
establish that committing these IDs and derived annotations to immutable Git
history is compatible with those duties.

Before approval, the owner must choose one of these reviewed outcomes:

1. obtain written X confirmation that the proposed private retention of IDs and
   content-free annotations in the repository is permitted and define a history
   rewrite/deletion procedure; or
2. amend FPL-76 so deletable X IDs live in a separate approved research evidence
   register while Git retains only an internal opaque reference and aggregate
   conclusions; or
3. remove immutable-ID and post-reference retention from FPL-76 and accept a
   non-reproducible, discovery-only result.

Raw API content has a zero-persistence target and is deleted immediately after
annotation. Any approved ID register requires:

- a fixed research expiry;
- revalidation through Post/User lookup and, where available, batch compliance
  immediately before finalizing the report;
- deletion/change propagation to every controlled copy;
- a termination kill switch and permanent-deletion procedure;
- content-free deletion evidence; and
- no backup or Git-history copy unless explicitly covered by the decision.

Near-real-time compliance streams are documented as Enterprise-only. Batch
compliance jobs are documented but their availability and price must be
confirmed for the exact account. If neither is available, retained X IDs cannot
be treated as continuously current and must expire or be removed after the
bounded research purpose.

### Location, subprocessors, and privacy role

X's public privacy materials describe global processing and transfers involving
the United States, Ireland, other operating countries, affiliates, cloud
providers, and service providers. X publishes a service-partner/subprocessor
list and a global DPA, but the reviewed materials do not establish an EU-only
API processing location or conclusively define the parties' roles for this
specific retrieval of public X Content and developer-account data.

The exact account entity, DPA applicability, international-transfer basis,
subprocessor list, account/billing data retention, API request-log retention,
support access, and security controls therefore require explicit review before
account creation or live use. No EU-only processing guarantee is assumed.

### Security and credentials

If the owner later approves this path, credentials belong to FPL-69 and must be
provisioned separately. The minimum controls are:

- one development-only project/app and one app-only read credential;
- server-side approved secret storage with no browser, repository, CI output,
  Linear, logs, screenshots, or shared-account exposure;
- least-privilege read-only scope and no user-context token;
- environment isolation, explicit egress allowlist to `api.x.com`, and no
  provider SDK telemetry containing content;
- tested rotation and immediate revocation;
- global kill switch independent of credential revocation; and
- content-free audit events for operator, policy version, request counts,
  returned resource counts, estimated/actual cost, and outcome.

### Implementation fit

The official API should remain behind `NewsSourcePort` and a provider-specific
infrastructure adapter. Provider DTOs, pagination tokens, errors, headers, and
billing data must not enter domain or application contracts. The FPL-76 research
collector must be a separate development-only command; it must not enable the
runtime ingestion scheduler or generic external-LLM claim-extraction path.

## Option 2: written licensed export

A documented export from X or another party that demonstrably controls the
required rights could potentially provide immutable identities and a bounded
historical sample without live API requests. No such offer, contract, export,
or rights chain is currently available.

Before this option could become eligible, a concrete proposal must document:

- licensor identity and authority to sublicense X user/post identifiers,
  content, and derived research use;
- exact accounts, fields, time window, delivery format, completeness, and
  provenance;
- private research, Git retention, derived annotations, deletion, correction,
  termination, audit, and external-processing rights;
- privacy roles, location, subprocessors, security, incident handling, and
  access controls;
- price, tax, renewal, minimum term, refundability, quota, and support terms;
  and
- an upstream correction/deletion feed or a short expiry that makes one
  unnecessary.

An aggregator, purchased dataset, consumer download, search-result export, or
copy supplied without an explicit rights grant is not an authorized export.
Cost and latency are unknown. Disposition: `needs_clarification`; no procurement
or vendor contact is authorized by FPL-85.

## Option 3: owner-performed manual review

The owner may manually view public account pages and linked official/publisher
evidence using ordinary, non-automated access, subject to X's consumer terms and
the project research policy. This path may support affiliation checks,
qualitative signal categories, and limited observations.

It must not use browser automation, DOM extraction, developer tools to collect
hidden identifiers, copied page source, search-result scraping, session-cookie
reuse, bulk copy/paste, extensions, unofficial APIs, or scripts. Raw text and
screenshots remain prohibited project artifacts.

This path has no API resource charge but has substantial human-time cost and no
reliable machine-readable immutable user ID, completeness guarantee, stable
pagination, or reproducible 90-day sampling boundary. It therefore cannot meet
the current FPL-76 acceptance criteria. Disposition:
`ineligible_for_full_fpl_76`, but eligible for explicitly labelled qualitative
discovery if FPL-76 is formally rescoped.

## Required owner decision

The owner must choose one of the following; silence keeps every path disabled:

### A. Continue toward official API research

Approve only the proposed use-case and authorize a separate account/terms,
billing, retention, and credential-preparation sequence. This does not itself
authorize account creation, terms acceptance, payment, credentials, or live
requests.

Required follow-up order:

1. resolve the Git/ID retention decision and amend FPL-76 if needed;
2. capture the exact Developer Console account entity, terms, pricing, minimum
   credit purchase, tax, renewal, quota, batch-compliance availability, and
   support/security evidence;
3. obtain explicit owner approval for the account, agreement acceptance, and a
   total spend ceiling of at most USD 15;
4. complete FPL-69 credential controls without live requests;
5. implement and test the disabled bounded collector using synthetic fixtures;
6. obtain independent review and a final live-run approval; and
7. run once, stop at the policy limits, delete raw content, and report
   insufficient evidence rather than broadening the budget or access method.

### B. Rescope FPL-76 to manual discovery

Remove immutable-ID, reproducible sample, 20-relevant-item, five-claim, and
measured reliability requirements. Keep the current 50-account list explicitly
provisional and prohibit pilot/source approval until a later permitted evidence
path exists.

### C. Stop FPL-76

Close the research as incomplete, retain only policy-safe discovery artifacts,
and do not proceed to FPL-80 or FPL-69.

## Approval checklist

An approval for option A must explicitly record all of the following:

- approved developer use-case wording and account owner;
- legal/billing owner authorized to accept the exact current agreement;
- live Developer Console price sheet, credit minimum, tax, refund, expiry, and
  renewal evidence;
- USD 10 alert and total spend ceiling no greater than USD 15;
- exact allowed endpoints, fields, 90-day window, 121-user/2,400-post resource
  ceiling, 200-request ceiling, and one-request concurrency;
- content-minimized local processing and no external LLM/model training;
- approved treatment of immutable IDs, Git history, expiry, correction,
  deletion, termination, and compliance checks;
- privacy role, account/request-log retention, global location, subprocessors,
  DPA applicability, and security review;
- FPL-69 secret-management and revocation evidence;
- global and per-source kill switches; and
- a final approval immediately before the first live request.

Until every applicable item is recorded, the machine-readable policy remains
`disabled_pending_owner_approval`.

## Primary sources

- [X Developer Agreement](https://docs.x.com/developer-terms/agreement)
- [X Developer Policy](https://docs.x.com/developer-terms/policy)
- [Restricted uses of the X API](https://docs.x.com/developer-terms/restricted-use-cases)
- [X API pricing](https://docs.x.com/x-api/getting-started/pricing)
- [X API usage and billing](https://docs.x.com/x-api/fundamentals/post-cap)
- [X API rate limits](https://docs.x.com/x-api/fundamentals/rate-limits)
- [X user lookup](https://docs.x.com/x-api/users/lookup/introduction)
- [X user timelines](https://docs.x.com/x-api/posts/timelines/introduction)
- [X timeline integration guide](https://docs.x.com/x-api/posts/timelines/integrate)
- [X batch-compliance quickstart](https://docs.x.com/x-api/compliance/batch-compliance/quickstart)
- [X compliance streams](https://docs.x.com/x-api/compliance/streams/introduction)
- [X display requirements](https://docs.x.com/developer-terms/display-requirements)
- [X Privacy Policy](https://x.com/en/privacy)
- [X global operations and data transfer](https://help.x.com/en/rules-and-policies/global-operations-and-data-transfer)
- [X Global DPA](https://privacy.x.com/en/for-our-partners/global-dpa)
- [X subprocessors and service partners](https://privacy.x.com/en/subprocessors)
