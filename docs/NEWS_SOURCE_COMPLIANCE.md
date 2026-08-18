# News Source Compliance Register

Status: Engineering and product compliance baseline; not legal advice

Owner: FPL-45

Last updated: 2026-08-18

## 1. Purpose

This document defines which news and player-availability source paths FPL Intelligence may use, the conditions attached to each path, and the evidence required before a path can be enabled.

It is the version-controlled compliance input for `NewsSource` implementation, AI-assisted extraction, storage, display, and operations. It does not make a legal conclusion and does not replace review by qualified counsel. Provider contracts, current terms, applicable law, and the exact deployed processing determine whether a source may be used.

The governing product boundary is in [PRODUCT.md](./PRODUCT.md). Linear owns issue status and acceptance criteria. Any consequential provider or architecture selection belongs in `docs/adr/` when the decision is required.

## 2. Decision rules

### 2.1 Default deny

A live external source is disabled unless this register identifies:

- the exact provider and access product;
- an authorized access method;
- the terms or contract version reviewed;
- the intended commercial environment and processing purpose;
- permitted raw-content and metadata retention;
- display, quotation, linking, attribution, and redistribution rules;
- whether content may be sent to an external LLM;
- health, injury, profiling, or other sensitive-data restrictions;
- deletion and change-propagation duties; and
- rate-limit, cost, monitoring, and incident obligations.

Technical accessibility, public visibility, a robots allowance, a search result, or the ability to purchase API access is not permission for the planned use.

### 2.2 Status vocabulary

| Status | Meaning | Runtime behavior |
| --- | --- | --- |
| `permitted` | Evidence explicitly covers the exact access and planned processing. | May be enabled only inside the recorded constraints. |
| `restricted` | The path is allowed only under stated constraints, or a stated restriction prohibits the planned path. | Fail closed outside the allowed subset. |
| `unclear` | Material terms conflict, are ambiguous, or do not cover the exact use. | Disabled until written clarification and required review. |
| `not reviewed` | The exact provider, product, contract, or terms have not been reviewed. | Disabled. |

An unresolved source blocks only that source. It must not cause an unapproved fallback to scraping, another provider, or a broader content path.

### 2.3 Approval record

Every enabled source must have a durable policy record containing:

- source policy ID and adapter ID;
- provider, product, account or contract owner, and access method;
- environment: synthetic test, internal research, consented pilot, public beta, or commercial;
- approved purposes and prohibited purposes;
- terms/contract URL or controlled reference, version, and review date;
- raw-content, derived-data, metadata, cache, log, and backup rules;
- external-LLM policy;
- display and attribution policy;
- deletion, correction, expiry, and provenance rules;
- rate, cost, quota, freshness, and health-monitoring limits;
- reviewer, decision date, expiry/re-review date, and kill-switch owner; and
- qualified legal reviewer and decision where required.

Policy records expire on a material use-case, provider, product, contract, terms, jurisdiction, model-processing, or display change.

## 3. Initial allowlist for FPL-22

FPL-22 may implement the `NewsSource` boundary and the ingestion mechanics using only these paths:

| Policy ID | Source path | Allowed environment and purpose | Status |
| --- | --- | --- | --- |
| `news.synthetic.fixture.v1` | Project-authored synthetic fixtures | Automated tests, local development, demonstrations clearly labelled as synthetic, and non-user-facing pipeline verification. No real person or copied provider content. | `permitted` |
| `news.first-party.research.v1` | Project-authored material, or a minimal item entered under documented per-record rights | Internal research or a consented pilot only. Each real item requires a rights record covering the intended processing, retention, LLM path, and display. No bulk collection. | `restricted` |

No live third-party automated source is approved by this review. FPL-22 may prove normalization, provenance, deduplication, extraction, expiry, and kill-switch behavior with the two paths above, but it must not claim live news coverage.

The `news.first-party.research.v1` path must be disabled by default. Enabling it requires a per-record rights reference and an environment-level approval. A manually copied public post or article is not first-party material and does not qualify.

## 4. Source register

### 4.1 Project-authored synthetic fixtures

| Field | Decision |
| --- | --- |
| Provider and access | FPL Intelligence repository; project-authored fixture files. |
| Terms reference | Project-owned content; contributor rights governed by repository contribution terms when introduced. |
| Commercial use | Permitted for project-authored synthetic content, subject to contributor rights and without implying real-source endorsement. |
| Planned processing | Normalize, deduplicate, classify, persist, expire, reconcile, display, and send to approved development LLM tooling if the fixture contains no real personal data. |
| Retention | Version-controlled fixtures may be retained. Generated run artifacts follow development-log retention. |
| Display and redistribution | Must be labelled synthetic; do not present as an actual report or endorsement. |
| External LLM | Permitted for synthetic content under the approved development AI configuration. No production provider is selected by this decision. |
| Health/injury restrictions | Use fictional or unmistakably synthetic scenarios. Do not encode an unverified real person's health information. |
| Deletion and operations | Ordinary repository lifecycle; no external deletion propagation. |
| Status | `permitted` for tests and development only. |

### 4.2 First-party or expressly licensed research items

| Field | Decision |
| --- | --- |
| Provider and access | FPL Intelligence/operator, contributor, or rights holder identified per record; direct creation or delivery only. |
| Terms reference | Per-record consent, licence, assignment, or contract reference is mandatory. |
| Commercial use | Not approved by this category-level decision. It must be explicitly granted by the per-record rights evidence and environment approval. |
| Planned processing | Only the purposes expressly covered by the rights record. |
| Retention | Minimum necessary duration recorded per item and environment. Raw content is not retained by default after structured review data is produced. |
| Display and redistribution | Only as expressly authorized; otherwise store a private reference and minimal derived fields. |
| External LLM | Disabled unless the rights record and approved processor terms explicitly permit the transfer and use. |
| Health/injury restrictions | Qualified privacy review is required before processing real injury or health information in a pilot. |
| Deletion and operations | Per-record expiry/deletion date; deletion must reach controlled raw copies, caches, queues, logs, and processor copies. |
| Status | `restricted`; disabled by default. |

### 4.3 X official API

| Field | Decision |
| --- | --- |
| Provider and access | X Corp.; official X API product and approved developer account only. Browser automation, HTML scraping, unofficial APIs, copied datasets, or credential sharing are prohibited fallbacks. |
| Terms reference | [Developer Agreement](https://docs.x.com/developer-terms/agreement), [Developer Policy](https://docs.x.com/developer-terms/policy), [Restricted Use Cases](https://docs.x.com/developer-terms/restricted-use-cases), [Display Requirements](https://docs.x.com/developer-terms/display-requirements), [Developer Guidelines](https://docs.x.com/developer-guidelines), and [Compliance Streams](https://docs.x.com/x-api/compliance/streams/introduction). Agreement page reviewed as updated 2026-04-27; all terms require re-check before approval. |
| Commercial use | Not approved for this use case. X requires the disclosed use to be approved and may require a different access tier; payment alone is not commercial-use approval. |
| Planned processing | Retrieve allowlisted football posts; normalize; extract availability, injury, training, selection, and rotation claims; combine evidence; store references and minimal evidence; display source-linked explanations. |
| Retention | X rules restrict redistribution and require stored X Content to reflect deletion or modification. A future implementation must use the relevant compliance mechanism and action deletion/change events within the required window. Storage must be minimized and separately approved. |
| Display and redistribution | Any post display must remain unmodified and satisfy current author, profile, timestamp, X branding, action/link, and attribution requirements. X does not grant rights to third-party content. Bulk redistribution is not approved. |
| External LLM | Not approved. Sending X Content to a model provider is a third-party transfer that needs explicit coverage. Foundation/frontier-model training is prohibited by X's restricted-use rules except where X states otherwise. A no-training processor contract alone does not resolve the health-inference restriction. |
| Health/injury restrictions | Material blocker. X states that developers must never derive, infer, or store information about an X user's health. The planned extraction of player injury or availability claims may do exactly that when the subject is an X user. Public status or professional-athlete status is not treated as an exception. |
| Deletion and operations | Requires content deletion/change propagation, provenance, approved-use-case control, attribution checks, rate/cost telemetry, quota handling, terms-change review, and an immediate kill switch. |
| Status | `unclear`; disabled for ingestion, extraction, persistence, display, and external-LLM processing until X gives written approval for the exact use case and qualified legal review approves it. |

An approval limited to reading posts, or a paid API plan, is not sufficient. The written use-case decision must cover player health/availability extraction, derived structured signals, storage, multi-source reconciliation, commercial decision support, display, and any external processor.

### 4.4 X scraping or unofficial access

| Field | Decision |
| --- | --- |
| Provider and access | X website or content reached through browser scraping, browser automation, reverse-engineered endpoints, unofficial APIs, copied exports, or third-party datasets without a verified upstream licence. |
| Terms reference | X Developer Guidelines and applicable X terms; no approved access grant exists for this path. |
| Commercial use | Prohibited for this project because the access path is not authorized. |
| Planned processing | None. This path must not be implemented, even as a fallback when the official API is unavailable, unaffordable, rate-limited, or unapproved. |
| Retention/display/LLM | Prohibited because acquisition is not approved. |
| Health/injury restrictions | The same health-inference concern applies in addition to the access problem. |
| Deletion and operations | Block at configuration and code-review boundaries; alert if an adapter attempts this path. |
| Status | `restricted`: prohibited for FPL Intelligence. |

### 4.5 Official club websites, feeds, and social accounts

| Field | Decision |
| --- | --- |
| Provider and access | Each club, website operator, feed provider, and social platform is a separate provider. No exact provider/product allowlist has been proposed. Public HTML, RSS, video, transcript, press release, or social access is not a single reusable permission category. |
| Terms reference | Provider-specific website/API/feed terms, platform terms, copyright notice, robots policy, commercial licence, and press/media conditions must be recorded before enablement. No blanket terms reference is approved. |
| Commercial use | Not reviewed per provider; disabled. Public or editorial access is not assumed to include commercial reuse. |
| Planned processing | Potentially retrieve official availability or press-conference statements, normalize them, extract claims, retain minimal evidence, and link to the original. |
| Retention | Unknown until each provider is reviewed. Prefer external ID, URL, provider, author/speaker, timestamps, content hash, and a minimal permitted excerpt over full content. |
| Display and redistribution | Unknown per provider. Linking, quotation, thumbnails, crests, video, transcript reuse, and attribution require separate review. |
| External LLM | Disabled unless both source rights and the selected processor terms cover the transfer and purpose. |
| Health/injury restrictions | Requires privacy review for real health information; source authority does not remove data-protection duties. Record whether the statement is first-party, quoted, or reported. |
| Deletion and operations | Provider-specific corrections/removals, content change detection, rate limits, caching, attribution, cost, and outage behavior are required. No scraping fallback. |
| Status | `not reviewed`; every club/provider path is disabled until added as its own reviewed row or policy record. |

### 4.6 Press-conference providers and rights holders

| Field | Decision |
| --- | --- |
| Provider and access | Club, league, broadcaster, agency, transcript service, or licensed press-conference feed; none selected. The speaker, publisher, recording owner, transcript owner, and platform may be different rights holders. |
| Terms reference | Exact feed contract, media accreditation terms, transcript/video rights, API terms, and display/attribution schedule are required. |
| Commercial use | Not reviewed; disabled. Each recording, transcript, feed, and derived-data purpose requires contractual coverage. |
| Planned processing | Identify manager/player statements; extract availability and selection claims; retain provenance and minimal evidence; reconcile with other sources. |
| Retention/display/redistribution | Unknown until contract review. A right to watch or attend does not imply a right to automate, transcribe, store, or redistribute. |
| External LLM | Disabled until transcription, semantic processing, processor disclosure, retention, and training/reuse are expressly covered. |
| Health/injury restrictions | Qualified privacy review required; distinguish direct quote, paraphrase, publisher report, and model inference. |
| Deletion and operations | Contract-specific correction, takedown, embargo, rate, attribution, geographic, and expiry controls. |
| Status | `not reviewed`; disabled. |

### 4.7 Individual reporters and publishers

| Field | Decision |
| --- | --- |
| Provider and access | Every reporter, publisher, syndicator, newsletter, podcast, website, and hosting platform is a separate source chain; none selected. |
| Terms reference | Direct licence or publisher/platform API and content terms, plus proof that the licensor controls the relevant rights. Public availability, a subscription, or reporter trustworthiness is not reuse permission. |
| Commercial use | Not reviewed; disabled. A consumer subscription or public account does not authorize incorporation into a commercial decision-support product. |
| Planned processing | Potential extraction of reported availability, training, travel, lineup, and rotation claims. |
| Retention/display/redistribution | Unknown. Prefer a licensed structured reference and minimal permitted evidence. Do not reproduce articles, paywalled content, posts, audio, or transcripts without approval. |
| External LLM | Disabled until source and processor terms explicitly permit it. |
| Health/injury restrictions | Qualified privacy review required. Reliability is an evidence question and does not resolve rights or privacy. |
| Deletion and operations | Provider-specific corrections, retractions, removals, embargoes, attribution, rate limits, and subscription-access controls. |
| Status | `not reviewed`; disabled. |

### 4.8 Aggregators

| Field | Decision |
| --- | --- |
| Provider and access | News, injury, lineup, rumor, or social-content aggregator; none selected. |
| Terms reference | Exact API/feed contract and a documented upstream provenance and sublicensing chain are required. A reseller's API availability is not evidence that every upstream item is licensed for the planned use. |
| Commercial use | Not reviewed; disabled. Both the aggregator grant and upstream sublicensing chain must cover the product and territories. |
| Planned processing | Potential discovery, structured availability intake, or evidence references. An aggregator must not erase upstream provider identity or certainty. |
| Retention/display/redistribution | Contract-specific. Store upstream provenance and restrictions per item where required. |
| External LLM | Disabled unless both aggregator and upstream rights cover external processing. |
| Health/injury restrictions | Qualified privacy review required, including inferred and conflicting health information. |
| Deletion and operations | Must propagate upstream corrections, deletions, licence expiry, embargoes, and source restrictions. Requires completeness/freshness and outage monitoring. |
| Status | `not reviewed`; disabled. |

### 4.9 Licensed canonical availability-data candidates

The following are procurement candidates, not selected providers and not approved news sources.

| Candidate | Public product/terms reference | Intended role under evaluation | Commercial status | Missing approval evidence | Status |
| --- | --- | --- | --- | --- | --- |
| Stats Perform / Opta | [Opta Data](https://www.statsperform.com/products/opta-data/) and [Stats Perform developer portal](https://developers.statsperform.com/) | Possible licensed canonical football/player-availability baseline. | Contract required; no commercial right is inferred from the public product page. | Exact product and Premier League coverage; injury/availability fields; commercial contract; derived-data rights; storage, cache, display, attribution, territories, LLM processing, deletion, SLA, rate, and cost terms. | `not reviewed`; disabled. |
| Sportradar | [Soccer rosters, lineups and transfers documentation](https://developer.sportradar.com/soccer/docs/soccer-ig-rosters-lineups-transfers), which publicly describes missing-player and injury-related data. | Possible licensed canonical availability or missing-player feed. | Contract required; no commercial right is inferred from documentation access. | Exact package/competition coverage and a reviewed commercial agreement covering all planned processing, retention, display, attribution, external LLM use, deletion, rate/cost limits, and outputs. | `not reviewed`; disabled. |
| Sportmonks | [Injuries and Suspensions product description](https://www.sportmonks.com/glossary/injuries-and-suspensions/) | Possible licensed injury/suspension baseline. | Contract/API plan required; the public description is not approval. | Exact API plan, Premier League coverage, provenance, contract, derived-data, retention, display, attribution, LLM, deletion, SLA, rate, and cost terms. | `not reviewed`; disabled. |

Licensed canonical availability data and breaking evidence serve different roles:

- a canonical provider may supply a normalized current status, roster, or missing-player field under contract;
- a breaking source may supply the evidence that explains why a state is changing;
- neither automatically validates the other;
- provenance and timestamps remain visible when the two disagree; and
- a canonical feed must not be described as breaking news unless its contract and product actually provide that service.

No hosting, data-provider, LLM-provider, or procurement choice is made by this document.

## 5. External LLM processing gate

An external LLM is a separate processor and disclosure path. Approval to access or display source content does not automatically permit sending it to a model provider.

Each source policy must set one of:

- `disabled`: no content or content-derived payload may leave the approved application boundary for LLM processing;
- `synthetic_only`: only unmistakably synthetic, non-personal fixtures may be sent;
- `restricted`: only recorded fields/excerpts, environment, model service, region, and purpose are allowed; or
- `permitted`: the exact source and processor terms cover the planned transfer and use.

Before any real external content is sent, record and approve:

- the source right to transmit content to the processor;
- the exact model/API product and controller/processor roles;
- data-processing agreement, subprocessors, regions, and transfer mechanism;
- request/response retention, abuse monitoring, human access, logs, caches, and backups;
- no-training, no-product-improvement, and no-unrelated-reuse controls;
- deletion and rights-request behavior;
- minimum-necessary input and output fields;
- prompt, model, schema, and rule versioning without content leakage;
- cost, rate, latency, outage, and retry behavior; and
- treatment of personal, health, inferred, and conflicting information.

An LLM output is an extraction or classification candidate. It is never evidence, a canonical availability source, or the source of truth. Deterministic validation and provenance must survive provider replacement.

## 6. Health and injury information

Player injury, illness, rehabilitation, medical treatment, and inferred physical availability may reveal health information about an identifiable person. UK ICO guidance expressly treats injury information as health data and states that intentional health inferences can be special-category processing regardless of confidence.

Before processing real health or injury information in a consented pilot, public beta, or commercial environment, qualified review must document:

- launch jurisdictions and applicable privacy regimes;
- controller/processor roles;
- lawful basis and any separate condition required for health data;
- whether a public statement or manifestly public information condition applies to the exact processing;
- necessity, proportionality, transparency, minimization, accuracy, retention, and rights handling;
- treatment of incorrect, speculative, outdated, conflicting, and retracted claims;
- age/minor implications;
- international transfers and external processors; and
- whether a data-protection impact assessment is required or advisable.

Product and model language must describe football availability evidence, not diagnose a person. The system must preserve whether a statement was explicit, quoted, reported, speculative, or inferred. It must not turn uncertainty into an asserted medical fact.

The X-specific restriction in section 4.3 remains independently blocking even if a general data-protection basis is later identified.

## 7. Data minimization and retention

The preferred record for an approved source contains:

- stable external item ID where permitted;
- source policy ID, provider, author/speaker, and upstream provider;
- source URL or licensed reference;
- publication, update, ingestion, extraction, and evaluation timestamps;
- permitted minimal excerpt or structured provider fields;
- content hash or deduplication key where permitted;
- normalized claims and their extraction provenance;
- source, claim, extraction, signal, and recommendation confidence kept separate;
- deletion, correction, embargo, licence-expiry, and display restrictions; and
- adapter, schema, model, prompt, and deterministic-rule versions.

Full articles, posts, transcripts, audio, video, images, and provider payloads are not retained by default. Derived records are not assumed free of source rights or privacy duties merely because wording changed.

Every approved source needs explicit retention for raw content, structured evidence, derived claims/signals, caches, queues, logs, backups, and model-provider copies. Unknown retention disables the affected path.

## 8. Display, quotation, and attribution

- Prefer a source link and a short permitted excerpt over reproducing source material.
- Do not display provider logos, club crests, thumbnails, photos, video, audio, or brand elements without recorded permission.
- Preserve the distinction between a direct quote, publisher paraphrase, project summary, model extraction, and deterministic signal.
- Do not remove author, publisher, timestamp, sponsorship, correction, or context where the provider requires it.
- Respect embargoes, paywalls, audience restrictions, geography, and contract-specific display surfaces.
- A link does not cure an unauthorized copy, and attribution does not create a licence.
- X post rendering, if ever approved, must follow the current X Display Requirements exactly.

## 9. Correction, deletion, expiry, and conflict handling

An approved adapter must support the provider's applicable lifecycle:

1. Detect provider changes, corrections, retractions, deletions, embargo changes, and licence expiry.
2. Quarantine or remove controlled raw content as required.
3. Mark affected evidence and claims corrected, withdrawn, expired, or inaccessible; do not silently rewrite history.
4. Recompute current signals and availability state deterministically.
5. Re-evaluate personalized recommendations and explain material changes.
6. Prevent deleted or no-longer-licensed content from reappearing through cache, queue, backup restore, search index, or model-output replay.
7. Retain only content-free compliance/audit metadata where permitted and necessary.

Conflicting claims may coexist. Reliability, recency, corroboration, directness, and provider context influence a transparent signal; they do not grant content rights or erase uncertainty.

## 10. Operational controls

All future live sources require:

- centralized ingestion reused across users;
- adapter-level policy enforcement before content enters the domain;
- explicit allowlist and per-source kill switch;
- no unapproved fallback provider or scraping route;
- rate-limit, quota, and cost budgets with alerts;
- freshness, lag, completeness, error, correction, deletion, and terms-version monitoring;
- idempotent ingestion and deletion;
- provenance through every normalized and derived record;
- content-free operational logs;
- secret isolation and least-privilege credentials;
- environment separation; and
- scheduled re-review and immediate review on material terms changes.

If a provider becomes unavailable or non-compliant, the product shows that source as stale or unavailable. It must not quietly substitute a lower-quality or unauthorized source.

## 11. Provider review checklist

Before adding a provider row with `permitted` or `restricted` status, answer and evidence:

1. What exact legal entity, product, endpoint/feed, account tier, and contract are used?
2. Is commercial decision-support use permitted in every intended environment and territory?
3. Is automated access permitted? Are scraping, caching, indexing, or derived outputs restricted?
4. What content and metadata may be stored, for how long, and in which systems?
5. What derived data may be retained after raw content expires or is deleted?
6. What may be displayed, quoted, summarized, linked, attributed, or redistributed?
7. May content be sent to the exact external LLM or other processor? Under what retention and training terms?
8. Are health, injury, sensitive inference, profiling, minors, or automated-decision uses restricted?
9. How are corrections, deletions, retractions, expiry, embargoes, and rights requests propagated?
10. What rate, quota, cost, freshness, SLA, geographic, branding, and attribution obligations apply?
11. Does the provider have the upstream rights it purports to sublicense?
12. What monitoring, incident response, terms-change detection, kill switch, and exit plan exist?
13. Who performed product, engineering, security/privacy, procurement, and qualified legal review?
14. When does the approval expire, and what change triggers immediate re-review?

Answers such as "publicly available", "industry standard", "fair use", "we only summarize", or "the LLM does not train" are not sufficient evidence by themselves.

## 12. Alternative paths

If a live source remains unavailable, permitted alternatives are:

- continue development and automated verification with synthetic fixtures;
- use project-authored or expressly licensed research items within the recorded rights;
- negotiate a direct licence with a club, publisher, rights holder, or reporter;
- procure a licensed structured availability feed after contract review;
- run a consented manual evidence study without automated collection, subject to privacy and rights approval; or
- disable the affected feature and show a transparent freshness/coverage limitation.

The project must not solve a permissions gap by copying from a different public page, using a user browser session, scraping search results, routing through an aggregator with unknown upstream rights, or sending content to an unapproved model.

## 13. Public-use gate and open blockers

This engineering review is complete when its restricted initial allowlist is enforced and all other paths fail closed. It does not authorize public use of real health/news content.

Before a consented pilot, public beta, or commercial release using live sources, resolve:

- the exact first live source and contract;
- qualified review of health/injury processing and launch jurisdictions;
- processor and external-LLM terms for the exact model path;
- privacy notice, rights, retention, deletion, and incident workflows under FPL-44;
- source display and attribution designs approved in Figma;
- provider credentials, rate/cost limits, terms monitoring, and kill switches;
- evidence that deletion/correction propagation and source disablement work; and
- recorded legal reviewer, decision, conditions, date, and re-review trigger.

For X specifically, written X approval of the exact health/availability extraction and storage use case is required in addition to qualified legal review. Until then, X is not a candidate for the first live source.

## 14. Downstream requirements

- FPL-22 implements only the initial allowlist in section 3 unless this register is updated by an approved source review.
- FPL-28 extraction/classification must enforce the per-source external-LLM policy before dispatch and treat outputs as candidates.
- FPL-29 must preserve source policy, provenance, corrections, deletion, expiry, and conflict state.
- FPL-30 must schedule only enabled source policies and monitor cost, freshness, failures, and kill switches.
- FPL-31 may apply only valid, unexpired, provenance-preserving signals to projections.
- FPL-44 owns the broader public-beta privacy, terms, retention, rights, analytics, and cookie readiness gate.
- FPL-46 must verify that every enabled source has current qualified approval and operational controls before public beta.
- FPL-23 must ensure agent and PR workflows never paste provider content or personal health information into repository, issue, CI, or review artifacts without explicit permission.

## 15. Reference baseline

These official and primary sources informed this engineering review. Their current versions, the provider contract, and the exact use case must be re-checked before enablement.

### X

- [X Developer Agreement](https://docs.x.com/developer-terms/agreement)
- [X Developer Policy](https://docs.x.com/developer-terms/policy)
- [X Restricted Use Cases](https://docs.x.com/developer-terms/restricted-use-cases)
- [X Display Requirements](https://docs.x.com/developer-terms/display-requirements)
- [X Developer Guidelines](https://docs.x.com/developer-guidelines)
- [X Compliance Streams](https://docs.x.com/x-api/compliance/streams/introduction)
- [X developer access and pricing overview](https://developer.x.com/)

### Privacy and health information

- [UK ICO: What is special category data?](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-is-special-category-data/)
- [Regulation (EU) 2016/679 (GDPR)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679)

### Licensed-provider candidates

- [Stats Perform: Opta Data](https://www.statsperform.com/products/opta-data/)
- [Stats Perform developer portal](https://developers.statsperform.com/)
- [Sportradar soccer rosters, lineups and transfers](https://developer.sportradar.com/soccer/docs/soccer-ig-rosters-lineups-transfers)
- [Sportmonks injuries and suspensions](https://www.sportmonks.com/glossary/injuries-and-suspensions/)
