# Provider Usage and Cost Telemetry Architecture

Status: provider-independent architecture baseline

Owner: FPL-41

Last updated: 2026-08-18

## 1. Purpose and scope

This document defines the provider-independent telemetry contract used to observe variable operating usage and estimate its cost. It covers external football and news requests, LLM and vision processing, background work, and meaningfully attributable database or storage activity.

The contract must support operational controls and product viability analysis without becoming a billing system. It keeps provider payloads, sensitive content, personal data, pricing implementation details, and vendor-specific telemetry types outside product and domain logic.

The broader system boundaries live in [ARCHITECTURE.md](./ARCHITECTURE.md). External-data lineage and lifecycle rules live in [DATA_PROVENANCE.md](./DATA_PROVENANCE.md). Source-specific rate, quota, and cost obligations remain governed by [NEWS_SOURCE_COMPLIANCE.md](./NEWS_SOURCE_COMPLIANCE.md).

## 2. Goals

The design must make it possible to:

1. Record what metered operation occurred, when it occurred, and which internal workflow caused it.
2. Preserve provider-neutral usage measurements such as requests, quota units, tokens, bytes, or processing time.
3. Estimate monthly cost and, where attribution is defensible, cost per active user and per recommendation or analysis.
4. Distinguish shared ingestion from user-triggered work without duplicating shared costs for every consumer.
5. Measure cache, deduplication, batching, and shared-ingestion savings separately from actual billable usage.
6. Represent estimated, unknown, and non-applicable cost honestly.
7. Support rate, quota, and variable-cost budgets without selecting a monitoring or billing vendor.
8. Keep telemetry content-free, low-cardinality, idempotent, and suitable for deterministic aggregation.

## 3. Non-goals

FPL-41 does not:

- select a football-data, news, LLM, vision, database, storage, analytics, observability, hosting, or billing provider;
- define provider prices, spending commitments, procurement decisions, or a launch budget;
- implement a billing ledger, invoices, payment collection, subscriptions, pricing plans, entitlements, or user-facing billing;
- reconcile estimates to a provider invoice or claim accounting-grade precision;
- define persistence tables, a telemetry transport, dashboards, alerting products, or deployment topology;
- authorize a provider, source, endpoint, model, or data-processing path;
- record prompts, responses, screenshots, provider payloads, news content, personal data, or credentials; or
- allocate a shared cost to users when no approved, explainable allocation policy exists.

## 4. Vocabulary and separation of concerns

### Usage event

An immutable observation that a metered operation was attempted or completed. It records measured resource consumption and categorized outcome, not provider content.

### Avoided-usage event

An immutable observation that a cache hit, deduplication decision, batch, or shared result prevented an operation that otherwise would have been eligible to run. Avoided usage is a counterfactual efficiency measurement and must never be counted as actual usage or spend.

### Cost estimate

A derived monetary estimate calculated from recorded usage and a versioned pricing reference. An estimate is not an invoice, settled charge, or billing ledger entry.

### Attribution

The relationship between usage and the internal workflow or scope that caused it. Attribution explains causality; allocation is a later, versioned rule that may distribute shared cost for analysis.

### Correlation

Content-free opaque identifiers that connect events belonging to the same request, ingestion run, background job, recommendation, or analysis. Correlation identifiers are not permission to store user identifiers or provider content.

### Coverage

The proportion of observed usage for which both meaningful measurement and cost-estimation inputs are available. Any aggregate cost must expose its coverage and unknown portion.

Actual usage, avoided usage, cost estimates, and analytical allocations are separate records or views. Updating pricing or allocation rules may recalculate estimates, but it must not rewrite the original measured usage event.

## 5. Conceptual contracts

The names below describe provider-independent semantics. Owning implementation issues may refine exact TypeScript types or persistence models without weakening these invariants.

### 5.1 UsageEvent

```text
UsageEvent
  eventId
  idempotencyKey
  occurredAt
  recordedAt
  serviceCategory
  providerRef
  operation
  measurements[]
  outcome
  attribution
  correlation
  provenanceRef?
  estimateMetadata?
  instrumentationVersion
```

- `eventId` is a stable internal identifier.
- `idempotencyKey` prevents duplicate recording when delivery or persistence is retried.
- `occurredAt` and `recordedAt` are UTC instants with distinct meanings.
- `serviceCategory` is a bounded internal classification such as `football_data`, `news`, `llm`, `vision`, `background_job`, `database`, `storage`, or `other`.
- `providerRef` identifies the exact configured provider product or internal service through a controlled registry. It is not a provider SDK type and must not contain credentials or a raw URL.
- `operation` is a bounded, adapter-owned semantic name such as `reference_data.fetch`, `news.poll`, `claim.extract`, or `recommendation.compute`. It must not include player names, entry IDs, URLs, prompts, or other high-cardinality content.
- `measurements` contain one or more normalized quantities and units.
- `outcome` is a bounded category such as `succeeded`, `failed`, `rate_limited`, `quota_rejected`, or `cancelled`.
- `attribution` distinguishes shared, user-triggered, mixed, and currently unallocated work.
- `correlation` carries only the opaque identifiers needed for permitted analysis.
- `provenanceRef` optionally connects an external acquisition event to its content-free ingestion provenance. Telemetry must not copy the provenance record or provider payload.
- `estimateMetadata` may capture the estimation state known when the event was recorded. The monetary estimate remains a derived view so pricing can be corrected without changing measured usage.
- `instrumentationVersion` identifies the event semantics and measurement rules.

### 5.2 UsageMeasurement

```text
UsageMeasurement
  metric
  quantity?
  unit
  measurementStatus
```

Supported metrics are controlled and documented by the owning adapter. Examples include:

| Category        | Example metrics and units                                                  |
| --------------- | -------------------------------------------------------------------------- |
| External data   | request count, provider quota units, records returned                      |
| LLM or vision   | input tokens, output tokens, image count, processing milliseconds          |
| Background work | jobs, attempts, items processed, processing milliseconds                   |
| Database        | queries or provider-reported compute units where meaningfully attributable |
| Storage         | bytes written, byte-hours, operations where meaningfully attributable      |

`measurementStatus` is one of `measured`, `provider_reported`, `estimated`, or `unknown`. Quantities must be non-negative and use an exact integer smallest unit where possible. An `unknown` measurement omits `quantity`; it must not be recorded as zero. An estimated measurement must be reproducible from the event's instrumentation version and documented adapter rule. Provider-specific meters are normalized at the adapter boundary while the original provider meter name may remain in controlled infrastructure metadata when needed for reconciliation.

### 5.3 AttributionContext

Every usage event has exactly one causal scope:

| Scope            | Meaning                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| `shared_global`  | Central ingestion, scheduled refresh, or other work intended for reuse by many consumers.                             |
| `user_triggered` | Work caused by one approved user or local-session workflow and not shared globally.                                   |
| `mixed`          | Work has both shared and user-triggered causality and requires an explicit allocation rule before per-user reporting. |
| `unallocated`    | Causality is known only at system level or attribution is not meaningful.                                             |

An optional opaque `actorScopeRef` may support permitted aggregation. It must not be an email address, account name, FPL entry identifier, IP address, or other direct personal identifier. Authentication and multi-tenancy remain outside the current scope.

### 5.4 CorrelationContext

Correlation may include opaque internal references such as:

- request or trace ID;
- ingestion-run or job-run ID;
- recommendation or analysis ID;
- cache or deduplication decision ID; and
- an approved opaque actor-scope reference.

Fields are optional because not every operation belongs to every flow. Adapters must not overload them with business content or concatenate raw external identifiers into them.

### 5.5 CostEstimate

```text
CostEstimate
  estimateId
  usageEventId
  status
  pricingReference?
  amountMinor?
  currency?
  basis
  estimatedAt
  estimatorVersion
```

`status` is one of:

- `estimated`: a versioned pricing rule can estimate the event;
- `unknown`: usage or pricing is missing, ambiguous, tier-dependent, or otherwise not defensibly estimable; or
- `not_applicable`: the event has no monetary cost under the declared model and this is known rather than assumed.

Money uses an integer minor unit and ISO currency code. Estimates retain the pricing reference, estimator version, and a controlled calculation-basis reference rather than arbitrary text. Free tiers, committed spend, tiered rates, bundles, credits, taxes, and currency conversion must be modeled explicitly or left unknown; they must not be flattened into false precision. Only a separately approved reconciliation system could distinguish provider-reported or invoiced amounts from estimates.

### 5.6 AvoidedUsageEvent

```text
AvoidedUsageEvent
  eventId
  idempotencyKey
  occurredAt
  recordedAt
  serviceCategory
  providerRef
  operation
  reason
  avoidedMeasurements[]
  attribution
  correlation
  baselineVersion
  instrumentationVersion
```

Reasons include `cache_hit`, `deduplicated`, `batched`, and `shared_result_reused`. Avoided-usage observations follow the same UTC, idempotency, controlled-dimension, and instrumentation-version rules as actual usage events. `baselineVersion` identifies the deterministic rule used to claim that an operation was avoided. If the counterfactual cannot be justified, record the cache or deduplication outcome operationally but do not estimate savings.

## 6. Instrumentation boundary and data flow

```text
application use case or infrastructure adapter
  -> provider/service operation
  -> measured usage observation
  -> validate + normalize + redact
  -> append UsageEvent
  -> aggregate by time, category, scope and correlation
  -> apply versioned pricing and allocation rules
  -> operational budgets and cost views
```

Provider SDK response types and billing metadata remain inside infrastructure. An adapter maps permitted metering fields into the telemetry contract. Application and domain logic may depend on a narrow usage-recorder port, but it must not branch on provider price tables or telemetry-vendor types.

Telemetry recording must not change the semantic result of deterministic domain behavior. If instrumentation is unavailable, the product operation follows its owning reliability policy and emits a visible telemetry coverage gap; it must not silently record zero usage. Critical quota controls may fail closed when an owning provider issue explicitly requires that behavior.

Retries are separate attempts when they can consume quota or money. They share a correlation ID but have distinct event IDs and outcomes. Delivery retries for the same observation reuse the idempotency key and do not create new usage.

## 7. Shared ingestion, caching, and deduplication

Central ingestion records one actual provider operation, even when its normalized result is later reused for many users or recommendations. Consumers reference the shared ingestion or usage event; they do not clone it.

The reporting model must distinguish:

1. actual metered usage;
2. avoided operations supported by a versioned baseline;
3. reuse count or cache-hit count; and
4. derived allocation of shared cost.

A cache hit does not create provider spend. A cache fill may create one actual usage event. A deduplication decision may create an avoided-usage event only when the would-be operation and units are defensible. Batched calls record the provider's actual measurements once and may later be allocated analytically without rewriting the event.

Shared cost remains `shared_global` until an approved allocation policy exists. A reporting view may allocate it by active user, recommendation, or another denominator only when that rule is versioned, reproducible, and displayed alongside unallocated cost. The product must not present the same shared call as fully incurred by every user.

## 8. Aggregation and cost views

All views use explicit UTC windows and preserve the underlying estimation state.

### Monthly operating cost

Group actual usage events by month, service category, provider reference, operation, attribution scope, and estimation status. Report:

- estimated amount by currency;
- unknown or uncovered event and unit counts;
- non-applicable events;
- pricing and estimator versions; and
- telemetry and pricing coverage.

Different currencies remain separate unless an approved, versioned conversion rule exists.

### Cost per active user

This metric is allowed only when "active user" and the allocation window have an approved definition. It includes directly attributable user-triggered cost plus only the shared-cost portion assigned by a versioned allocation rule. Report the denominator, unallocated shared cost, unknown cost, coverage, and allocation version with the result.

### Cost per recommendation or analysis

Correlate directly caused usage to the immutable recommendation or analysis identifier. Include shared ingestion only through a declared allocation rule. Recommendations with missing correlation or unknown pricing remain partially costed; they are never assigned a zero cost by default.

### Savings views

Report avoided usage and estimated savings separately from actual cost. Show the baseline version and coverage. Do not subtract speculative savings from an invoice-like total or count reuse as repeated avoided provider calls without evidence.

## 9. Privacy, security, and cardinality

Usage and cost telemetry must exclude:

- prompts, completions, screenshots, images, provider payloads, articles, posts, excerpts, claims, evidence, and recommendation text;
- player names, health or injury information, squad contents, FPL entry IDs, email addresses, IP addresses, user agents, and direct account identifiers;
- URLs, request bodies, response bodies, query strings, authorization headers, cookies, tokens, secrets, and provider credentials; and
- unrestricted exception messages or provider SDK objects.

Use controlled enums, opaque internal references, categorized errors, and bounded operation names. Do not add arbitrary labels or dynamic values that create high-cardinality metrics. Access to detailed events follows least privilege and environment separation. Retention, aggregation, deletion, backup, and export behavior must be defined by the owning persistence, privacy, and provider issues before production use.

Telemetry identifiers do not create new permission to retain related source or user data. If an identifier can be resolved to personal or restricted data, that lookup remains in the owning protected system and follows its lifecycle rules.

## 10. Validation, reliability, and test obligations

Downstream implementations must prove that:

- invalid events, negative quantities, unknown units, unbounded operation names, and prohibited content-bearing fields are rejected;
- provider DTOs and SDK errors do not cross the instrumentation boundary;
- idempotent redelivery records one event while a billable provider retry records a separate attempt;
- unknown measurement or pricing produces `unknown`, never zero;
- actual usage and avoided usage cannot be aggregated as the same quantity;
- one shared ingestion operation is not multiplied by consumer count;
- cost estimates are reproducible for the same usage, pricing reference, clock, allocation rule, and estimator version;
- changes to pricing recalculate estimates without mutating measured usage;
- mixed currencies are not added without a versioned conversion rule; and
- fixtures are synthetic and content-free.

Operational monitoring must make telemetry gaps, delayed event delivery, rejected events, quota exhaustion, rate limiting, and budget state visible. Telemetry failures must not be hidden inside a successful product metric.

## 11. Downstream requirements

- **FPL-16 and later external-data adapters:** map provider-specific request and quota observations into this contract and preserve shared-ingestion attribution.
- **FPL-22 and FPL-30:** instrument news ingestion, deduplication, scheduling, retries, quota, freshness, and kill-switch behavior without recording source content.
- **FPL-28 and later AI-assisted processing:** record provider/model reference, input/output token units, attempts, and categorized outcomes without prompts or completions.
- **FPL-58 and later screenshot import:** distinguish user-triggered vision usage from shared reference-data acquisition and never log image content or squad data.
- **Persistence and operations work:** choose the durable event path, aggregation cadence, retention, access controls, budgets, alerts, and dashboards under their owning issues.
- **Commercial-readiness work:** use coverage-aware aggregates as evidence for unit economics; do not treat them as billing records or provider invoices.

## 12. Deferred decisions and ADR triggers

This baseline does not require an ADR because it defines the provider-independent contract already authorized by FPL-41. Create a focused ADR only when an owning issue must decide a consequential implementation choice, including:

- a telemetry, analytics, billing-export, or cost-management provider;
- event persistence, transport, aggregation, or retention architecture;
- an allocation policy that materially affects product or commercial reporting;
- provider-specific pricing ingestion or invoice reconciliation;
- cross-currency conversion policy;
- production budget enforcement or a fail-open versus fail-closed quota strategy; or
- a trust-boundary change that permits correlation with identifiable users.

Provider selection, exact pricing, persistence schema, budgets, dashboards, billing, and payments remain deferred.
