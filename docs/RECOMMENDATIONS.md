# Recommendation Contract

Status: initial provider-independent contract

Owner: FPL-49

Last updated: 2026-08-18

## Purpose

The recommendation contract is the shared boundary between deterministic decision logic and its consumers. It represents advice for a confirmed team state; it is not an instruction to mutate an FPL account. The contract contains no execution API, provider DTO, persistence record, UI state, or LLM response shape.

The same contract supports lineup, captaincy, and transfer-plan recommendations. Each recommendation contains one ranked primary option and at least one ranked alternative so that downstream experiences can explain both the preferred action and credible fallbacks such as rolling a transfer.

## Contract anatomy

A recommendation records:

- stable recommendation, team-state, option, and evidence identifiers;
- the contract, algorithm, scoring-rules, and source transformation versions;
- an explicit generation time and confidence evaluation time;
- its recommendation kind and planning horizon;
- proposed actions only, including transfer hits and chip activation where relevant;
- gross expected points, point costs, net expected points, baseline, and delta;
- assumptions, satisfied constraints, risks, and material-change triggers;
- structured reason codes and references to supporting and counter evidence;
- complete source, provenance, observation, ingestion, and transformation lineage; and
- explicit confidence factors and their conservative aggregate band.

All times and rule identities are caller-supplied. Contract creation does not read the machine clock, fetch data, inspect raw content, or call a provider.

## Deterministic ranking

Options are ordered by ranking value from highest to lowest. Equal values are resolved by the caller-supplied `tieBreakKey` using code-unit ordering, followed by the stable option identifier. Input array order therefore cannot affect the result.

Ranking values and basis codes are explicit domain inputs. The contract validates and orders them; it does not choose a projection or optimization algorithm. The primary option is rank 1 and every remaining option is retained as an ordered alternative.

## Expected impact and action consistency

Every option preserves the following arithmetic:

```text
net expected points = gross expected points - point cost
delta versus baseline = net expected points - baseline expected points
```

Point cost must be a non-negative safe integer and must equal the sum of proposed points-hit actions. A roll-transfer action is standalone. Lineup options cannot place the same player in the starting lineup and on the bench, and bench positions are unique. Captaincy options contain exactly one captain and one distinct vice-captain.

These are contract-level consistency checks, not a complete optimizer or live-season rules implementation. Versioned rules remain inputs to the producer.

## Confidence and uncertainty

Confidence is an explainable assessment, not an opaque probability. Each factor has a recognized dimension, an ordinal `confidenceBand`, a rationale code, and evidence references. The band is always positively oriented: a higher band means that the assessed dimension provides stronger support for the recommendation. For example, `high` for `projection_uncertainty` means the evaluated uncertainty is low enough to support high confidence; it never means "high uncertainty." The initial aggregate methodology is deliberately conservative: overall confidence is the lowest factor confidence band.

Projection uncertainty, freshness, news signals, evidence conflict, and scenario sensitivity remain separate dimensions. Conflicting evidence is retained with explicit `supports`, `contradicts`, or `context` stances and an optional conflict group. The contract does not silently select one conflicting item as truth.

## Evidence, provenance, and commercial use

Every evidence item retains source references, observation and ingestion times, provenance references, transformation lineage, and commercial-use classification. Evidence must precede recommendation generation and must be traceable through at least one transformation step.

Commercial-use handling fails closed. Only evidence explicitly classified as `permitted` or `restricted` can enter a recommendation; unclear, unreviewed, prohibited, or expired material is rejected. `restricted` means that a reviewed restriction exists and downstream use must continue to enforce it. The recommendation contract does not grant rights that the source policy does not provide.

## Explanations and material changes

An option explanation contains stable reason codes plus references to its assumptions, constraints, risks, supporting evidence, and counter evidence. Material-change triggers identify the facts that should cause the recommendation to be recomputed or reconsidered, such as a resolved availability conflict or a changed projection gap.

Consumer-facing prose is derived from this structure. Prose must not replace the structured reasons or introduce claims that are absent from referenced evidence.

## Identity, versioning, and compatibility

Recommendations are immutable snapshots. Recomputing after a material input change creates a new recommendation identifier and may identify the previous snapshot with `supersedesRecommendationId`; historical snapshots are not rewritten.

- `contractVersion` changes when the public shape or semantics become incompatible.
- Algorithm, confidence methodology, scoring rules, and transformation stages carry independent versions.
- Consumers must fail closed when they encounter an unsupported contract version or unrecognized contract member.
- Stable internal identities remain independent from provider identifiers.
- A recommendation cannot supersede itself.

Compatible additions still require consumer review when they change rendering, persistence, ranking, or safety behavior. Consequential changes to trust boundaries or account actions require an approved issue and, where applicable, an ADR.

## Snapshot persistence and comparison

The database boundary stores each validated recommendation as an immutable snapshot together with the confirmed `TeamState` version, baseline/current projection versions, projection-input version, rules and algorithm identities, news-signal/availability/Claim/Evidence references, confidence methodology, planning horizon, recording time, and retention-policy version.

Comparable history is keyed by confirmed team identity, recommendation kind, contract version, and primary planning horizon. A deterministic material fingerprint excludes recommendation identity, evaluation timestamps, supersession metadata, and retention policy: recomputing the same versioned inputs and structured output is therefore classified as an equivalent recalculation, while a changed input version, evidence set, confidence factor, action, impact, assumption, risk, or explanation is material. FPL-51 owns the user-facing explanation of those transitions.

Snapshots contain normalized references and structured recommendation output only. They do not persist screenshots, provider DTOs, credentials, or unnecessary raw news content. Expiry deletion requires an explicit caller-supplied evaluation time and a per-record `retainUntil` value; scheduling remains outside this persistence boundary.

## Synthetic examples

The domain testing entry point exposes project-authored synthetic examples covering:

- a primary multi-gameweek transfer with an explicit four-point hit;
- a ranked roll-transfer alternative;
- conflicting synthetic availability evidence;
- conservative confidence aggregation;
- deterministic tie-breaking;
- lineup and captaincy proposals; and
- invalid arithmetic, licensing, evidence, horizon, and action combinations.

The examples make no claim about current players, fixtures, prices, rules, news, or projected points.
