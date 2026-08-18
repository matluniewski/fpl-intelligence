# FPL Intelligence Projection

Owner: FPL-19

This package implements the deterministic, provider-independent expected-points baseline used before lineup or transfer optimization. It does not fetch data, inspect provider DTOs, apply news, or perform FPL actions.

## Model v0

The caller supplies a versioned scoring ruleset, one or more explicitly weighted per-90 performance signals, one or more fixture contexts, an evaluation time, and a freshness limit. The model blends rates using the supplied weights and calculates each fixture independently:

- appearance points use appearance and 60-minute probabilities;
- goals and assists use blended per-90 rates, unconditional expected minutes, an explicit attacking multiplier, and position-specific rules;
- clean-sheet points use clean-sheet and 60-minute probabilities;
- goals-conceded points use a documented continuous-expectation approximation for configured positions;
- saves, penalty events, cards, own goals, expected bonus, and expected defensive-contribution points use explicit rate components; and
- double-gameweek fixtures are summed, while an empty fixture list produces an explicit zero-point blank-gameweek result.

All values are rounded to six decimal places at component boundaries. The output contains formulas, assumptions, input timestamps, fixture breakdowns, warnings, rules/model versions, and deduplicated provenance references.

## Deliberate boundaries

- The checked-in rules and test values are fictional deterministic fixtures, not a claim about a live FPL season.
- The model has no hidden current date; freshness is evaluated against the supplied UTC time.
- Rate weights must sum to one. Invalid, future, stale, inconsistent, duplicate, or untraceable inputs fail with typed validation issues.
- Reward rules must be non-negative and penalty rules non-positive; scoring categories not represented by model v0 are explicitly assumed to contribute zero.
- `news_adjustments_excluded` is an explicit baseline assumption. A later signal layer may create a separate adjusted projection without rewriting this baseline.
- Exact live scoring rules, input calibration, and source/provider selection remain external versioned inputs.
