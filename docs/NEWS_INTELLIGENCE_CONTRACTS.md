# News Intelligence Contracts

Status: initial provider-independent contract

Owner: FPL-21

Last updated: 2026-08-18

## Purpose

These contracts separate source ingestion, extracted assertions, traceable evidence, deterministic evidence-engine output, and projection-facing availability state. They contain no X, publisher, provider SDK, persistence, browser, or LLM response types and approve no live source.

```text
provider-private record
  -> RawNewsItem
  -> runtime-validated untrusted claim candidate
  -> unresolved Claim + Evidence
  -> deterministic NewsSignal
  -> PlayerAvailabilityState
  -> projection input
```

Each transition retains stable internal identities, explicit times, provenance, policy state, and transformation versions. A model-assisted extraction is one replaceable transformation; it is never a source and never makes a claim true.

## RawNewsItem

`RawNewsItem` is a centrally reusable normalized ingestion record. Its stable ingestion key supports deduplication without exposing provider DTOs. Source and provider identities remain distinct, and the original external reference is optional.

`NewsSourcePort` returns cursor-based batches of normalized RawNewsItems at a caller-supplied request time. It exposes no browser session, scraping mechanism, provider pagination object, or transport error shape.

Raw content is not stored in the contract. `RawContentReference` records only whether content was not retained, policy-blocked, or retained behind a permitted reference. Retention, display, external-processing, and commercial-use decisions remain separate. `policyState` is `permitted`, `restricted`, or `blocked` and reflects commercial-use posture without implying that every content operation is allowed. Missing, unclear, or unreviewed policy is represented as blocked; it never defaults to permission. Retained content requires an affirmative reviewed retention decision.

## Claim boundary

An untrusted extraction result enters as `unknown` and must pass `validateClaimCandidate`. The validator selects only recognized provider-independent fields, validates enumerations, normalized assertion codes, availability semantics, and explicit-offset timestamps, and returns structured issues instead of accepting an SDK or model response object. Free-form generated prose cannot become a claimed state.

`createClaim` adds internal identity, subject identity, raw-item lineage, original reference, provenance, and extraction identity. It requires the validated RawNewsItem context and rejects policy-blocked input. Model-assisted extraction additionally requires an affirmative external-processing decision and must record implementation, schema, model, and prompt versions. Every created Claim remains `unresolved`; certainty and directness describe the assertion, not truth.

Directness distinguishes explicit quote, direct report, inference, and speculation. Source type is contextual metadata and not an automatic reliability score.

## Evidence

Evidence relates a Claim to permitted source metadata. It records supporting, contradicting, or contextual stance; observation, ingestion, and assessment times; source context; provenance; and lifecycle state. The contract stores reference or quote metadata, not raw news content. Contradictory Evidence remains as separate records until a versioned deterministic rule evaluates it.

## Source reputation

`SourceReputationCatalog` holds manually reviewed, versioned source tiers for a declared context. Its deterministic assessment retains the matched context, rationale, catalog version, and review time; an unknown source or context mismatch gets a conservative fallback. Source reputation remains separate from claim certainty, directness, corroboration, and final `NewsSignal` confidence. It does not learn from historical outcomes or infer authority from repetition.

## NewsSignal

`NewsSignal` is a decision-relevant Evidence Engine result at an explicit evaluation time. It includes availability state, confidence band, freshness, conflict state, effective window, rule identity, reason codes, Claim references, Evidence references, and provenance.

An unresolved conflict is a valid result. The contract does not silently choose truth, infer confidence from source type, or manufacture a probability. Future-dated effective windows are valid for scheduled events; inverted windows are rejected.

## PlayerAvailabilityState

`PlayerAvailabilityState` is the provider-independent boundary consumed by projection behavior. It contains availability, optional expected-start probability and expected minutes, explicit assumptions, confidence, freshness, conflict state, effective window, signal/evidence lineage, provenance, and rule version.

Expected-start probability is either unknown or between zero and one. Expected minutes is either unknown or between zero and 90 for the availability assumption represented by this state. Unknown values remain `null`; they are not converted to zero.

## Lifecycle and compatibility

- RawNewsItem, Claim, Evidence, NewsSignal, and PlayerAvailabilityState are distinct artifacts and must not be collapsed into one persistence or API model.
- Corrections, expiry, withdrawal, deletion, quarantine, and policy disablement remain explicit lifecycle data.
- Derived artifacts keep material lineage and cannot become more permissive than their inputs.
- Contract or semantic breaking changes require version review by the owning issue; extraction, evidence rules, and availability rules carry independent versions.
- Browser scraping is outside the NewsSource boundary and is not an approved fallback.

The checked-in examples are project-authored synthetic data. They do not reproduce or assert real news, player health information, source content, live permissions, or current FPL state.
