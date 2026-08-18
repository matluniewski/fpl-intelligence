# FPL Intelligence Domain

Owners: FPL-17 (core domain and team state), FPL-21 (news intelligence contracts)

This package contains framework-independent contracts, invariants, and deterministic validation for normalized football reference data, user-confirmed team state, and news intelligence artifacts.

## Boundaries

- Provider DTOs, SDK types, transport errors, persistence records, and UI state do not belong here.
- Provider identifiers are mapped to stable internal identifiers before entering these contracts.
- External facts carry provenance references and explicit commercial-use classification.
- `TeamStateCandidate` is always provisional. Only `confirmTeamState` can produce a `TeamState` after validation and explicit confirmation time are supplied.
- FPL rules are versioned inputs. The package does not claim that the synthetic test rules describe a current live season.
- Domain behavior receives time as a UTC value and never reads the machine clock.
- RawNewsItem, Claim, Evidence, NewsSignal, and PlayerAvailabilityState remain distinct provider-independent artifacts.

## Entry points

- `@fpl-intelligence/domain` exports production contracts and deterministic behavior.
- `@fpl-intelligence/domain/testing` exports synthetic, non-provider fixtures for adapter contract tests.
- `@fpl-intelligence/domain/testing/news-intelligence` exports focused synthetic news contract fixtures.

## Validation

`validateTeamStateCandidate` reports missing and uncertain fields without converting them into confirmed values. It also checks the supplied versioned squad rules, normalized player identities, prices, lineup and bench structure, captaincy, chips, provenance references, and fail-closed commercial-use states.

The validation context is deliberately supplied by the caller. This keeps the package network-free, provider-independent, reproducible, and suitable for contract tests.

## News intelligence

The news boundary runtime-validates untrusted extraction candidates before creating unresolved Claims. It preserves separate raw-item policy state, Evidence stances, deterministic NewsSignal lineage, and projection-facing PlayerAvailabilityState values. Unknown permissions fail closed, conflicting evidence can coexist, and no model output becomes truth by itself.

See [docs/NEWS_INTELLIGENCE_CONTRACTS.md](../../docs/NEWS_INTELLIGENCE_CONTRACTS.md) for layer boundaries, lifecycle, and compatibility expectations.
