# FPL Intelligence Domain

Owners: FPL-17 (core domain and team state), FPL-49 (recommendations)

This package contains framework-independent contracts, invariants, and deterministic validation for normalized football reference data, user-confirmed team state, and explainable recommendations.

## Boundaries

- Provider DTOs, SDK types, transport errors, persistence records, and UI state do not belong here.
- Provider identifiers are mapped to stable internal identifiers before entering these contracts.
- External facts carry provenance references and explicit commercial-use classification.
- `TeamStateCandidate` is always provisional. Only `confirmTeamState` can produce a `TeamState` after validation and explicit confirmation time are supplied.
- FPL rules are versioned inputs. The package does not claim that the synthetic test rules describe a current live season.
- Domain behavior receives time as a UTC value and never reads the machine clock.
- Recommendations are immutable decision-support snapshots with proposed actions only. This package cannot execute an FPL action.

## Entry points

- `@fpl-intelligence/domain` exports production contracts and deterministic behavior.
- `@fpl-intelligence/domain/testing` exports synthetic, non-provider fixtures for adapter contract tests.
- `@fpl-intelligence/domain/testing/recommendation` exports the focused synthetic recommendation scenario.

## Validation

`validateTeamStateCandidate` reports missing and uncertain fields without converting them into confirmed values. It also checks the supplied versioned squad rules, normalized player identities, prices, lineup and bench structure, captaincy, chips, provenance references, and fail-closed commercial-use states.

The validation context is deliberately supplied by the caller. This keeps the package network-free, provider-independent, reproducible, and suitable for contract tests.

## Recommendations

`createRecommendation` validates and deterministically ranks lineup, captaincy, or transfer-plan options. It retains gross and net impact, hits, horizons, assumptions, constraints, risks, confidence factors, structured explanations, conflicting evidence, provenance, commercial-use state, and material-change triggers.

Equal ranking values use an explicit tie-break key and stable option identifier. Overall confidence is the lowest explicit factor band; it is not presented as a probability. Unsupported values, unclear licensing, broken evidence references, inconsistent impact arithmetic, and invalid action combinations fail with typed validation issues.

The complete contract and compatibility policy are documented in [docs/RECOMMENDATIONS.md](../../docs/RECOMMENDATIONS.md).
