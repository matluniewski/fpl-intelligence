# Curated News Ingestion v0

Status: implemented synthetic and restricted first-party boundaries

Owner: FPL-22

Last updated: 2026-08-18

## Scope

FPL-22 provides the first central ingestion boundary for news-shaped source material. It exists so later extraction, evidence, projection, and recommendation work can consume normalized `RawNewsItem` records without selecting or calling a live news provider.

The implementation does not provide live coverage. It contains no HTTP client, browser automation, scraping, unofficial fallback, or third-party feed integration.

## Allowlist

| Policy ID                      | Decision   | Environments                           | Default state | Intended use                                       |
| ------------------------------ | ---------- | -------------------------------------- | ------------- | -------------------------------------------------- |
| `news.synthetic.fixture.v1`    | permitted  | `test`, `development`                  | enabled       | Project-authored tests, local work, labelled demos |
| `news.first-party.research.v1` | restricted | `internal_research`, `consented_pilot` | disabled      | Documented direct delivery with per-record rights  |

The coordinator accepts only these exact policy identifiers and fails closed for unknown policies. Every configured adapter must have one matching reviewed policy, and duplicate policies or adapters are rejected at construction.

## Trust and mapping boundary

Source-specific DTOs remain private to their adapters. Each adapter runtime-validates untrusted input and maps it to provider-independent domain records:

```text
private source DTO
  -> adapter validation and mapping
  -> RawNewsItem + ProvenanceRecord
  -> central lifecycle, deduplication and policy checks
```

Raw content is not retained. Synthetic and research records store only a non-content fingerprint/reference plus provenance and policy metadata. A normalized record cannot cross the coordinator when its content policy does not match the active reviewed policy.

## Runtime controls

Before every source read or cache response, the coordinator verifies:

- exact allowlist membership;
- policy enablement and effective dates;
- the approved runtime environment;
- the operational kill switch; and
- a matching source adapter.

The kill switch can be changed at runtime and immediately invalidates cached results. Source reads have an abort signal and bounded timeout. Rate limits, quota rejection, timeout, invalid payload, policy failure, and general source failure remain distinct typed outcomes. No failure triggers a fallback source.

## Central reuse, freshness, and lifecycle

The coordinator owns a short-lived shared cache keyed by policy, environment, and cursor. A cache hit avoids a source request and is recorded as avoided usage. Persistent deduplication uses the normalized ingestion key, so a repeated item is reused after cache expiry instead of being stored twice.

Each policy defines a maximum item age. Over-age records are stored as `stale` and cannot be sent to external processing. Correction, deletion, expiry, withdrawal, and policy-disable events update stored lifecycle state, invalidate cache entries, and block later external processing.

Restricted first-party research additionally requires a current per-record rights record matching both the source-provided rights reference and the environment. The rights record explicitly classifies commercial use, retention, display, and external processing; unclear or unreviewed classifications fail at configuration. External processing follows both the content policy and the per-record rights decision.

## Provenance and telemetry

Every newly stored item persists a separate provenance record describing the source chain, acquisition context, external reference, policy assessment, mapper version, and lifecycle. Shared ingestion telemetry records request outcome, returned/stored/reused counts, and cache avoidance without source text, summaries, URLs, player names, squads, or direct user identifiers.

If telemetry storage fails after a valid source read, the result carries `usage_telemetry_unavailable`. If both ingestion and telemetry fail, the typed ingestion error carries that visibility. Missing telemetry is never reported as zero usage.

## Deferred decisions

A live source, transport, persistence implementation, scheduler, queue, telemetry provider, and LLM are deliberately unselected. Each requires its owning issue, an updated compliance decision, and an ADR when the choice creates a consequential operational commitment.
