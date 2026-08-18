# FPL Intelligence Domain

Owner: FPL-17

This package contains framework-independent contracts, invariants, and deterministic validation for normalized football reference data and user-confirmed team state.

## Boundaries

- Provider DTOs, SDK types, transport errors, persistence records, and UI state do not belong here.
- Provider identifiers are mapped to stable internal identifiers before entering these contracts.
- External facts carry provenance references and explicit commercial-use classification.
- `TeamStateCandidate` is always provisional. Only `confirmTeamState` can produce a `TeamState` after validation and explicit confirmation time are supplied.
- FPL rules are versioned inputs. The package does not claim that the synthetic test rules describe a current live season.
- Domain behavior receives time as a UTC value and never reads the machine clock.

## Entry points

- `@fpl-intelligence/domain` exports production contracts and deterministic behavior.
- `@fpl-intelligence/domain/testing` exports synthetic, non-provider fixtures for adapter contract tests.

## Validation

`validateTeamStateCandidate` reports missing and uncertain fields without converting them into confirmed values. It also checks the supplied versioned squad rules, normalized player identities, prices, lineup and bench structure, captaincy, chips, provenance references, and fail-closed commercial-use states.

The validation context is deliberately supplied by the caller. This keeps the package network-free, provider-independent, reproducible, and suitable for contract tests.
