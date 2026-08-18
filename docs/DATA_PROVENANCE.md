# External Data Provenance Architecture

Status: provider-independent architecture baseline

Owner: FPL-40

Last updated: 2026-08-18

## 1. Purpose and scope

This document defines how FPL Intelligence records the origin, permitted use, transformation, and lifecycle of externally sourced football data, FPL data, news content, and the decision inputs derived from them.

The design is deliberately independent of a provider, database schema, queue, hosting platform, or deployment topology. It establishes contracts that later domain, adapter, persistence, projection, news-intelligence, and recommendation work must preserve.

This baseline must make it possible to:

- replace a prototype data source with a licensed provider without rewriting domain, optimizer, or presentation logic;
- explain which material external inputs affected a projection or recommendation;
- reproduce a result from versioned normalized inputs and deterministic transformations;
- enforce source-specific access, use, retention, display, correction, and deletion restrictions;
- distinguish source evidence from model or rule output; and
- represent unknown commercial-use rights explicitly and fail closed.

The [product specification](./PRODUCT.md) defines the product language and trust promise. The [news source compliance register](./NEWS_SOURCE_COMPLIANCE.md) defines source enablement requirements. This document defines the technical provenance contract; it does not make a legal conclusion or enable a live source.

## 2. Non-goals

FPL-40 does not:

- select or approve a football-data, FPL-data, news, identity, LLM, hosting, or storage provider;
- authorize scraping, unofficial access, public use, redistribution, or commercial use;
- define database tables, indexes, event-bus topics, API payloads, or retention durations;
- make an external provider identifier the product's canonical identity;
- require full raw payload retention;
- define the detailed domain models owned by FPL-17; or
- create an ADR for a decision that has not yet become necessary.

## 3. Provenance vocabulary

The architecture uses the following terms consistently.

### Source

The origin that made the information available or made the underlying assertion, such as a league, club, publisher, reporter, or explicitly licensed research source. A source is not necessarily the technical provider that delivered the record.

### Provider

The external product, API, feed, or access path used to retrieve the record. An aggregator may be the provider while a league, club, or publisher remains an upstream source. The full known source chain must remain visible.

### Raw provider record

The provider-specific response, payload fragment, file, message, or content object received at the infrastructure boundary. Its schema, field names, identifiers, and transport semantics belong to the adapter. It is untrusted input and never a domain contract.

### Normalized data

A provider-independent domain value or application-boundary observation created after validation, identity resolution, policy enforcement, and mapping. It uses stable internal identities and carries provenance references for material external facts.

### Derived artifact

A claim, evidence assessment, signal, availability state, projection, optimization result, or other value produced from normalized inputs by a versioned transformation. It records lineage to its material inputs and transformation metadata. Being derived does not erase source rights, privacy duties, correction state, or uncertainty.

### Lineage

The directed relationship from an output to the inputs and transformation that produced it. Provenance describes origin and policy; lineage connects those provenance-bearing inputs through normalized and derived layers to a result.

### Material input

An input is material when changing or removing it could change the output, confidence, explanation, compliance state, or reproducibility of a user-visible decision. Materiality is determined by the owning deterministic rule, not by a provider adapter.

## 4. Data layers and allowed dependencies

```text
external system
  -> raw provider record                     adapter-private, untrusted
  -> validation + policy gate + mapping      infrastructure boundary
  -> normalized data + provenance references provider-independent
  -> derived artifact + lineage              versioned domain/application rule
  -> recommendation snapshot                 minimized explanation and audit trail
```

| Layer                   | Owns                                                                        | May reference                                                   | Must not expose                                                        |
| ----------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Raw provider record     | Provider fields, transport metadata, opaque provider IDs                    | Source policy and ingestion attempt                             | Provider DTOs outside the adapter, unapproved content, implicit rights |
| Normalized data         | Stable internal identity, validated provider-independent facts              | Provenance records and external aliases at the boundary         | Provider field names, SDK types, transport errors                      |
| Derived artifact        | Declared transformation, material input references, version, effective time | Normalized data, prior derived artifacts, provenance references | An LLM output as evidence, an invented source, lost restrictions       |
| Recommendation snapshot | Material inputs and outputs needed for explanation and comparison           | Normalized and derived references, versions, reason codes       | Raw provider payloads or unnecessary source content                    |

Dependencies continue to point inward as defined in [ARCHITECTURE.md](./ARCHITECTURE.md). An adapter may understand both a provider DTO and an internal input contract. Domain, projection, optimization, and presentation code understand only internal contracts.

## 5. Conceptual provenance contract

The exact TypeScript types belong to FPL-17 and the exact persistence mapping belongs to later database work. Those implementations must preserve at least the following conceptual information.

```text
ProvenanceRecord
  provenanceId
  dataCategory
  sourceChain[]
  provider
  acquisition
  externalReference?
  policyAssessment
  mapping
  lifecycle
```

### 5.1 Identity

- `provenanceId`: a stable internal identifier for this provenance record.
- `sourceChain[]`: ordered internal source references from the nearest known origin through any intermediary that matters to attribution or rights.
- `provider`: an internal reference to the exact provider product or access path used for acquisition.
- `externalReference`: an optional opaque provider namespace and external ID, retained only where permitted and useful for reconciliation, correction, or deletion.

Provider IDs are aliases, not domain identity. Alias mapping belongs at the adapter or identity-resolution boundary. The same player, club, fixture, manager entry, or content item may have several provider aliases while retaining one internal identity.

### 5.2 Classification

Every provenance record has a `dataCategory` sufficient to route policy and lifecycle behavior. The initial conceptual categories are:

- FPL game state;
- general football fact or statistic;
- team or player identity reference;
- news or source content;
- structured provider evidence;
- user-authorized external import; and
- other explicitly reviewed external data.

Implementations may refine these categories through their owning issue. They must not collapse materially different rights or retention rules into a single permissive category.

### 5.3 Acquisition facts

The acquisition portion records, where applicable:

- `fetchedAt`: when FPL Intelligence received the record, as a UTC instant;
- provider publication, observation, effective, and update times when supplied and semantically distinct;
- ingestion attempt or batch reference for operational traceability;
- access environment and purpose; and
- freshness or staleness information derived from declared rules rather than guessed from receipt time.

Provider timestamps retain their declared meaning. Mapping must not silently reinterpret a publication time as an effective time or `fetchedAt` as the time an event occurred.

### 5.4 Policy and commercial-use assessment

Provenance references the versioned source policy that governed acquisition and processing. The policy assessment must represent at least:

```text
commercialUse = permitted | restricted | unclear | not_reviewed
```

- `permitted` means the recorded review covers the exact product, purpose, environment, access path, and use.
- `restricted` means only the explicitly recorded uses and controls are allowed.
- `unclear` means relevant evidence was reviewed but does not establish permission.
- `not_reviewed` means no sufficient review exists for the exact path.

`unclear` and `not_reviewed` are blocking states. Missing data defaults to `not_reviewed`, never `permitted`. A boolean such as `commercialUseAllowed` is insufficient because it loses conditions, scope, evidence, version, reviewer, and expiry.

The referenced policy owns the detailed controls for access, storage, transformation, external processing, display, attribution, redistribution, retention, correction, deletion, geography, environment, and purpose. Provenance keeps the policy identifier and version used at processing time so a later policy change can be evaluated without rewriting history.

### 5.5 Mapping and reproducibility

The mapping portion records:

- adapter and adapter version;
- provider schema or contract version when known;
- normalization or mapping version;
- validation outcome and categorized warnings that remain material downstream; and
- a permitted content hash, fingerprint, or deduplication reference when needed.

A raw payload is not required to prove which mapper ran. Conversely, a mapping version is not a substitute for retaining a material normalized value needed to reproduce a recommendation.

### 5.6 Lifecycle

The lifecycle portion can represent:

- active, stale, expired, corrected, withdrawn, deleted, inaccessible, quarantined, or policy-disabled state;
- provider correction, deletion, retraction, embargo, or licence-expiry references;
- `effectiveFrom`, `effectiveUntil`, `correctedAt`, `withdrawnAt`, or `deletedAt` where relevant;
- the latest lifecycle evaluation time and rule version; and
- a content-free tombstone when source content must be removed but permitted traceability must remain.

Lifecycle state is data, not an in-place erasure of history. Current product state must exclude invalid inputs while a permitted historical snapshot can still explain that an earlier recommendation used information that was later corrected or withdrawn.

## 6. Boundary result and normalization rules

An external adapter conceptually returns a validated boundary result, not its DTO:

```text
BoundaryResult<TNormalized>
  value: TNormalized
  provenanceRefs[]
  sourcePolicyRef
  freshness
  warnings[]
```

This shape is illustrative, not a required public API. The invariant is that normalized data and the provenance needed to interpret it cross the boundary together.

Mapping follows these rules:

1. Validate structure, semantics, required policy, and expected provider version before producing normalized data.
2. Reject or quarantine records that cannot be safely interpreted; never fill missing permission with an optimistic default.
3. Resolve provider aliases to stable internal identities before domain or optimizer use.
4. Preserve conflicting observations as separate provenance-bearing inputs unless an authorized deterministic reconciliation rule resolves them.
5. Preserve missing, unknown, and not-applicable as distinct states where the difference can affect a decision.
6. Attach provenance at the smallest material aggregate boundary. Use field-level references when fields come from different sources, have different restrictions, or can conflict independently.
7. Keep provider response metadata only when it has a declared operational, policy, correction, reconciliation, or reproducibility purpose.
8. Do not copy a source's licence classification to data from a different upstream source merely because the same provider delivered both.

## 7. Derived-artifact lineage

Every material derived artifact records a conceptual lineage envelope:

```text
LineageRecord
  artifactId
  artifactKind
  inputRefs[]
  transformation
  producedAt
  effectiveAt
  clockValue?
  configurationVersion
  lifecycle
```

The transformation identifies a deterministic rule, mapping, model-assisted extraction step, projection algorithm, or optimizer version. For model-assisted work it also records the approved model, prompt, and schema versions without treating the output as evidence or retaining disallowed content.

Lineage has the following invariants:

- every material output is traceable to normalized or earlier derived inputs;
- a derived artifact never names itself, an LLM, or a rule as the external source of a claim;
- source policy and lifecycle restrictions propagate through lineage unless an approved policy explicitly says otherwise;
- a downstream artifact cannot become more permissive merely because data was summarized, aggregated, scored, or reworded;
- an expiry, correction, deletion, or policy disablement can identify affected current artifacts for deterministic re-evaluation; and
- identical versioned inputs, clock, configuration, and deterministic transformation produce the same ordered output.

Lineage may be stored as references rather than a deeply nested copy. The system must be able to traverse those references for an authorized explanation, lifecycle operation, or reproducibility check.

## 8. Recommendation traceability

A recommendation explanation starts from the immutable `RecommendationSnapshot` and traverses only material references:

```text
RecommendationSnapshot
  -> recommendation and projection lineage
  -> normalized decision inputs and active signals
  -> evidence and source observations
  -> provenance, policy version, freshness, and lifecycle state
```

Subject to minimization and retention rules, a snapshot records:

- the recommendation, alternatives, expected impact, confidence, risk, and reason codes;
- projection, optimizer, evidence-rule, mapping, and configuration versions that materially affected it;
- normalized team, football, price, fixture, availability, and signal values needed to reproduce or compare it;
- references to supporting and conflicting material evidence;
- source freshness and lifecycle state as evaluated at decision time;
- assumptions, uncertainty, clock value, and deterministic tie-breaking inputs; and
- policy and provenance references sufficient to explain permitted source use without embedding raw content.

The user-facing explanation may be intentionally smaller than the internal authorized trace. It must still distinguish source evidence, normalized facts, derived signals, projections, and recommendations. It must never expose provider-only fields, content that cannot be displayed, or policy/legal metadata that is unnecessary for the user.

When a correction or deletion changes a current recommendation, create a new snapshot and relate it to the prior snapshot. Do not rewrite the prior decision as though the earlier input never existed. Remove or restrict underlying content as required, retaining only permitted content-free trace metadata.

## 9. Retention and data minimization

Retention is assigned by data class and source policy, not by a single global duration.

| Data class                            | Default posture                                                                                   | Required separation                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Raw provider payload or content       | Do not retain by default; keep only for an approved purpose and duration                          | Adapter-controlled raw/quarantine boundary; excluded from normal domain reads, logs, fixtures, and analytics |
| Normalized external data              | Retain only values needed for the approved product purpose                                        | Provider-independent records with provenance references; no DTO copy                                         |
| Provenance and policy metadata        | Retain the minimum needed for rights, lifecycle, reconciliation, explanation, and reproducibility | Content-free where possible; independently deletable or tombstoned                                           |
| Derived artifact                      | Retain only while its product, explanation, evaluation, or audit purpose remains approved         | Lineage references, transformation version, lifecycle state                                                  |
| Recommendation snapshot               | Retain the minimum reproducible decision history promised to the user                             | No raw payload; material normalized values and references only                                               |
| Logs, traces, queues, caches, backups | Content-free identifiers and categorized state by default                                         | Explicit policy and deletion behavior for every copy                                                         |

Raw data, normalized data, provenance metadata, and derived artifacts may therefore have different retention windows and deletion mechanisms. Deleting raw content must not force the system to invent or discard permitted content-free provenance. Retaining a hash or external ID still requires an approved purpose and source policy.

Exact durations, storage locations, encryption, backup behavior, and deletion service levels are later decisions owned by the relevant data, privacy, provider, and persistence issues.

## 10. Correction, deletion, expiry, and policy changes

Lifecycle processing is idempotent and follows this conceptual sequence:

1. Receive or detect the provider, source-policy, or internal lifecycle event.
2. Resolve the affected external alias and provenance records.
3. Quarantine, restrict, or delete controlled raw content as required.
4. Update lifecycle metadata without silently rewriting prior states.
5. Invalidate or recompute affected current normalized and derived artifacts.
6. Re-evaluate material projections and recommendations deterministically.
7. Create a new recommendation snapshot if the user-visible decision or confidence changed.
8. Remove disallowed copies from caches, queues, indexes, logs, backups, or model replay paths according to the approved policy.

If propagation is incomplete, affected data is unavailable to current recommendation paths and the product exposes a categorized stale, policy-disabled, deletion-pending, or partial-provider state. It must not silently fall back to another unapproved source.

A policy version change does not retroactively claim that old processing was permitted. The system evaluates whether existing data can remain stored, displayed, transformed, or used and applies the resulting lifecycle action.

## 11. Provider replacement scenario

A prototype source and a later licensed provider implement the same application port and map into the same provider-independent contracts:

```text
PrototypeAdapter  --\
                    -> validated normalized input -> domain -> projection -> optimizer -> UI
LicensedAdapter   --/
```

Replacement is contained by:

- adapter-local DTOs and transport errors;
- provider alias mapping to existing internal identities;
- provider-specific source policy and provenance records;
- versioned normalization contract tests; and
- a cutover process that makes freshness, coverage, conflicts, and policy state explicit.

Domain behavior, projection rules, optimizer inputs, and UI view models do not branch on provider names. If a licensed source provides a genuinely new product concept, the domain contract changes through its owning issue; it is not smuggled through a provider-specific optional field.

A cutover may temporarily produce observations from both providers. They remain separate provenance-bearing inputs until a deterministic, versioned conflict or canonical-source policy resolves them. New rights do not retroactively authorize retention or display of old provider data.

## 12. Failure and observability requirements

Boundary and lineage failures use categorized internal errors. At minimum the system can distinguish:

- invalid or unsupported provider payload;
- unresolved internal identity;
- unknown or disabled policy;
- commercially restricted purpose or environment;
- stale, corrected, withdrawn, deleted, or expired source data;
- incomplete provenance or lineage;
- unsupported provider or mapping version; and
- lifecycle propagation pending or failed.

Operational telemetry exposes counts, freshness, lag, mapping version, categorized failures, policy status, and lifecycle progress using content-free internal identifiers. Logs must not contain raw provider payloads, credentials, personal data, unnecessary health information, display-restricted excerpts, or opaque errors copied from provider SDKs.

## 13. Downstream implementation obligations

- **FPL-17 — domain contracts:** define provider-independent identities, provenance references, material-input semantics, lifecycle states, and validation invariants before provider adapters.
- **FPL-16 reference data and FPL-18 later official integration:** keep DTOs and external IDs within adapter/identity boundaries; return normalized data with provenance and policy references.
- **FPL-21 — projections:** record versioned material inputs, assumptions, adjustments, uncertainty, and lineage needed for deterministic reproduction.
- **FPL-22 and FPL-28 through FPL-31 — News Intelligence:** enforce the approved source and external-processor policy, preserve upstream sources and lifecycle state, and keep extraction output distinct from evidence.
- **Persistence work:** map domain, provenance, lineage, raw/quarantine, lifecycle, and recommendation-history concerns separately; a database record must not become a domain contract.
- **Recommendation and optimization work:** accept only normalized inputs, preserve material lineage, and produce explainable reason codes and snapshots.
- **UI work:** render approved provenance, freshness, uncertainty, conflict, stale, disabled, and unavailable states without exposing restricted content or provider mechanics.

Tests introduced by those issues must include synthetic fixtures for DTO isolation, alias replacement, unknown-rights fail-closed behavior, multi-source conflict, lifecycle propagation, deterministic lineage, and recommendation trace reconstruction.

## 14. Future ADR triggers

This baseline does not require an ADR because it establishes the provider-independent contract already authorized by FPL-40. Create a focused ADR only when an owning issue must decide a consequential implementation choice, including:

- the first prototype, licensed, canonical, or fallback data provider and cutover strategy;
- canonical identity reconciliation when more than adapter-local aliases are required;
- multi-provider precedence, conflict resolution, or source-merging policy;
- the persistence topology for raw/quarantine data, normalized data, provenance, lineage, and recommendation history;
- exact retention durations, deletion guarantees, backup treatment, encryption, and audit access;
- event-driven or scheduled lifecycle propagation and its consistency guarantees;
- an external LLM processor and the content-minimization boundary;
- recommendation-snapshot storage and long-term evaluation strategy; or
- a change that makes a derived-data rights interpretation or trust boundary costly to reverse.

Provider evaluation, procurement, hosting, schema design, and legal conclusions remain deferred until their owning issues require them.
