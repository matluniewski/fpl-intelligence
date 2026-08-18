# FPL Intelligence Architecture

Status: initial architecture baseline

Owner: FPL-13

Last updated: 2026-08-18

## 1. Purpose and scope

This document defines the initial technical boundaries and dependency rules for FPL Intelligence. It is intentionally provider-neutral and deployment-neutral. It describes how future implementation must be shaped; it does not claim that the corresponding capabilities already exist.

The product definition lives in [PRODUCT.md](./PRODUCT.md). The provider-independent origin, lineage, and lifecycle contract for external data lives in [DATA_PROVENANCE.md](./DATA_PROVENANCE.md). The provider-independent variable-usage and cost-estimation contract lives in [COST_TELEMETRY.md](./COST_TELEMETRY.md). Linear owns implementation scope, dependencies, and acceptance criteria. Consequential architecture choices are recorded in [architecture decision records](./adr/README.md) when required.

## 2. Architectural goals

The architecture must make the following properties easy to preserve and test:

1. External providers are replaceable adapters.
2. Provider DTOs never enter domain logic.
3. Domain contracts exist before provider-specific implementations.
4. Projection, optimization, evidence resolution, and recommendation behavior is deterministic for the same versioned inputs.
5. LLM outputs are untrusted extraction or classification candidates, never evidence or canonical truth.
6. Every material recommendation is reproducible and explainable from normalized inputs, assumptions, provenance, and rules.
7. No real FPL action occurs without an approved integration and explicit human approval.
8. Personal data, screenshots, source content, and derived evidence follow purpose-specific retention and access boundaries.
9. Central ingestion is reused across users and exposes freshness, cost, failures, and policy state.
10. Hosting and provider choices remain deferred until the owning issue requires and approves them.

## 3. System context

At the logical level, the product closes this chain:

```text
user-confirmed team context
  + normalized football/FPL inputs
  + permitted claims and evidence
  -> current decision inputs
  -> transparent projections
  -> deterministic recommendation logic
  -> explainable recommendation snapshot
  -> human-reviewed manual action plan
```

Screenshot import and manual entry are two ways to build a provisional `TeamStateCandidate`. Only user confirmation creates durable `TeamState`. News providers produce normalized source material; they do not directly update a projection or recommendation.

## 4. Logical layers and dependency direction

```text
presentation (Next.js routes and UI)
              |
              v
application (use cases, orchestration, ports)
              |
              v
domain (contracts, invariants, deterministic policies)
              ^
              |
infrastructure (provider, persistence, queue, clock and telemetry adapters)
```

Dependencies point inward:

- **Domain** depends only on language-level and deliberately approved framework-independent libraries. It owns normalized concepts, invariants, value objects, deterministic policies, and decision outputs.
- **Application** coordinates domain behavior through use cases and defines ports required from external systems. It owns transactions and authorization decisions at the use-case boundary, not provider mechanics.
- **Infrastructure** implements application ports. It maps provider DTOs, database records, timestamps, failures, and policy state into internal contracts.
- **Presentation** invokes application use cases and renders approved states. Route components do not call provider SDKs or embed business rules.

Infrastructure and presentation may depend on application and domain contracts. Domain code must not import from Next.js, React, Drizzle, database drivers, LLM SDKs, analytics SDKs, or provider packages.

## 5. Planned module boundaries

The repository starts as a pnpm workspace with `apps/web` and a reserved `packages` area. Packages should be extracted only when an issue introduces a coherent, framework-independent boundary. Likely boundaries include:

| Boundary       | Responsibility                                                                                      | Must not own                                 |
| -------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `domain`       | Team state, evidence, availability, projection, recommendation, and action contracts and invariants | Provider DTOs, persistence schemas, UI state |
| `application`  | Use cases, ports, orchestration, transaction boundaries                                             | Provider-specific transport or parsing       |
| `projection`   | Versioned expected-minutes and expected-points calculations with reason codes                       | Source ingestion or UI formatting            |
| `optimization` | Deterministic lineup and later transfer-planning algorithms                                         | Account mutation or opaque LLM decisions     |
| `adapters`     | Provider access, DTO mapping, policy enforcement, persistence                                       | Domain policy hidden inside mapping code     |
| `web`          | App Router composition and approved user experience                                                 | Provider SDK calls or core decision rules    |

These names are a direction, not permission to create empty package scaffolding. FPL-17 owns initial domain contracts and precedes provider-specific FPL adapter work in FPL-16.

## 6. Core flows and trust boundaries

### 6.1 Team import

```text
ephemeral screenshot -> VisionImportProvider -> TeamStateCandidate
manual entry --------------------------------> TeamStateCandidate
TeamStateCandidate -> validation -> explicit user confirmation -> TeamState
```

- Screenshot bytes and equivalent derivatives stay inside the ephemeral processing boundary defined by [SCREENSHOT_PRIVACY.md](./SCREENSHOT_PRIVACY.md).
- A vision adapter returns a provisional candidate with uncertainty and validation information.
- User corrections override extraction output.
- Domain and recommendation logic accept confirmed `TeamState`, never a provider response or raw screenshot.
- Manual entry must remain a complete path when screenshot processing is disabled or fails.

### 6.2 News intelligence

```text
permitted source adapter
  -> normalized RawNewsItem + provenance + source policy
  -> deduplication
  -> Claim candidates
  -> deterministic validation
  -> Evidence Engine rules
  -> time-bounded NewsSignal
  -> PlayerAvailabilityState
```

- A source is fail-closed unless [NEWS_SOURCE_COMPLIANCE.md](./NEWS_SOURCE_COMPLIANCE.md) permits the exact access and processing path.
- Raw provider DTOs and disallowed content are stopped at the adapter/policy boundary.
- Extraction confidence, claim certainty, source reliability, signal confidence, projection uncertainty, and recommendation confidence remain distinct.
- Conflicting claims may coexist. Deterministic rules evaluate reliability, recency, corroboration, directness, expiry, correction, and withdrawal.
- An LLM may propose claims or classifications behind a replaceable port. Its output must pass schema and domain validation and can never become its own evidence.
- Source corrections, deletion, licence expiry, and kill switches propagate to current signals and affected recommendations without silently rewriting history.

### 6.3 Projection and recommendation

```text
versioned normalized inputs
  -> projection rules
  -> projection with adjustments and uncertainty
  -> deterministic decision policy or optimizer
  -> Recommendation
  -> immutable RecommendationSnapshot
```

A reproducible snapshot records, subject to minimization and retention rules:

- input and algorithm versions;
- normalized team and football state identifiers;
- active evidence and signal references;
- assumptions and uncertainty bands;
- material adjustments and reason codes;
- alternatives evaluated; and
- the resulting recommendation, expected impact, confidence, and risks.

The recommendation layer consumes normalized state. It does not inspect raw source content or provider-specific fields.

### 6.4 Action boundary

```text
Recommendation -> user review -> ActionPlan -> FplActionProvider
```

The initial implementation target is a `ManualFplActionProvider` that explains the steps and may open the official FPL interface. It does not store credentials, authenticate as the user, or mutate an FPL account. Any future official-action adapter requires a permitted integration, a dedicated approved issue, explicit approval UX, and a consequential ADR.

## 7. Data and persistence boundaries

Domain models and persistence models are separate contracts. A repository maps between them; database rows must not become the public domain API.

Persist only data required for an approved purpose and retention window. In particular:

- raw screenshots and equivalent artifacts are ephemeral and excluded from backups, logs, analytics, and fixtures;
- `TeamStateCandidate` and confirmed `TeamState` have different lifecycles;
- raw news content is not retained by default;
- raw provider records, normalized data, derived artifacts, and recommendation snapshots remain separate data classes;
- provenance, source policy, correction, deletion, expiry, and confidence dimensions remain traceable through derived records;
- logs and metrics use structured, content-free identifiers and categorized errors; and
- immutable recommendation history is still subject to data minimization and lifecycle rules.

The detailed conceptual provenance contract, lineage rules, provider-replacement boundary, and lifecycle propagation requirements are defined in [DATA_PROVENANCE.md](./DATA_PROVENANCE.md). Their exact persistence schema is intentionally deferred.

PostgreSQL and Drizzle ORM are the planned persistence technologies. Their schema and deployment topology will be introduced by separate issues; this bootstrap chooses no managed database provider.

## 8. Time, identity, and determinism

Time-sensitive behavior must receive an explicit clock through a port or function input. Tests must not depend on the machine clock. Store instants in UTC and apply user-facing timezone formatting only at the presentation boundary.

Use stable internal identifiers. Provider identifiers are aliases mapped at adapter boundaries and must not define domain identity. Version mapping, projection, extraction, and rule behavior when it affects reproducibility. Normalized material inputs cross the boundary with provenance references; derived artifacts retain lineage to those inputs rather than copying provider DTOs.

For identical normalized inputs, clock value, configuration, and algorithm version, deterministic modules must return the same result and ordered alternatives. Tie-breaking rules must be explicit and tested.

## 9. Errors and observability

Expected boundary failures use typed or categorized application errors. Provider errors are translated before crossing the adapter boundary. User-facing states distinguish at least invalid input, temporary failure, stale data, partial-provider failure, policy-disabled source, insufficient evidence, and deletion pending/failure where applicable.

Observability must expose freshness, latency, failures, retries, policy/kill-switch state, rate and cost budgets, and algorithm versions without logging screenshot content, raw provider payloads, personal data, or unnecessary health information. Production analytics and observability providers require separate approved work.

Actual metered usage, avoided usage from caching or deduplication, monetary estimates, and analytical cost allocations remain distinct. Shared ingestion is recorded once and is not duplicated for each consumer. Missing usage or pricing data remains visibly unknown rather than defaulting to zero. The conceptual event, attribution, aggregation, privacy, and downstream testing requirements are defined in [COST_TELEMETRY.md](./COST_TELEMETRY.md); exact persistence and provider instrumentation remain deferred to their owning issues.

## 10. Security, privacy, and compliance controls

- Validate all external input at the trust boundary.
- Isolate secrets by environment and grant least privilege.
- Use idempotency for ingestion, lifecycle, and deletion work.
- Fail closed when provider permission, external-LLM permission, retention, or deletion behavior is unknown.
- Keep real screenshots, FPL credentials, session cookies, provider content, and personal/health data out of source control and CI artifacts.
- Do not silently fall back to scraping or another source when an adapter is unavailable or disabled.
- Require explicit human approval before any external FPL account action.

Detailed controls live in the product-specific privacy and compliance documents and must be enforced by their owning issues.

## 11. Architecture decisions

Use an ADR when a decision is costly to reverse, constrains multiple modules, selects a provider or managed service, changes a trust/data boundary, or creates a meaningful operational commitment. Examples include deployment topology, managed PostgreSQL, authentication, vision processing, LLM routing, live news sources, scheduling, analytics, and any official FPL integration.

Do not create an ADR merely to restate an accepted stack item or local code convention. Do not select a provider speculatively. See [docs/adr/README.md](./adr/README.md) for the process and template.

## 12. Current implementation state

FPL-13 establishes:

- a pnpm workspace;
- a strict TypeScript Next.js App Router application;
- Tailwind CSS and checked-in shadcn/ui foundations;
- ESLint, Prettier, and Vitest quality tooling; and
- version-controlled product, development, and architecture documentation.

FPL-17 adds the framework-independent `@fpl-intelligence/domain` package with:

- normalized football reference, rules, provenance, and TeamState contracts;
- an explicitly provisional `TeamStateCandidate` model with per-field origin and confidence;
- deterministic candidate validation and explicit confirmation into `TeamState`;
- provider-independent reference-data, vision-import, candidate-import, and storage ports; and
- synthetic fixtures for adapter contract tests.

The package parameterizes versioned FPL rules rather than claiming that test values describe a current season. It does not implement team import adapters, provider access, persistence, projections, optimization, news processing, authentication, account actions, or UI.

FPL-41 defines the provider-independent usage and cost telemetry architecture for external requests, model processing, background work, meaningfully attributable storage/database usage, and cache or deduplication savings. It selects no provider or telemetry implementation and adds no billing, subscription, pricing-plan, or payment behavior.

FPL-16 adds `@fpl-intelligence/adapters` with a prototype reference-data implementation of the domain port. It runtime-validates a provider/file-shaped DTO, resolves external aliases through a trusted mapping into stable internal identities, maps normalized season, gameweek, rules, team, player, fixture, and provenance contracts, resolves exact normalized player names with explicit ambiguity, translates source failures into typed adapter errors, and emits content-free shared usage telemetry. Its only checked-in data is a project-authored synthetic fixture. Source policy and identity aliases are trusted adapter configuration rather than claims accepted from an untrusted payload. No live provider, FPL endpoint, credential, hosting service, persistence technology, or commercial right is selected.
