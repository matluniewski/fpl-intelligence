# Personalized news relevance

Status: FPL-61 implementation contract

The relevance policy converts centrally produced `NewsSignal` and optional
`PlayerAvailabilityState` values into a deterministic, team-context-specific
view. It does not fetch providers, retain raw content, or mutate a confirmed
`TeamState`.

## Relevance order and threshold

For each effective, non-expired signal, the policy records every applicable
reason in this order:

1. `squad_member` — player appears in the confirmed `TeamState`.
2. `watchlist_member` — player appears in a manually maintained watchlist
   scoped to the same confirmed `TeamState`.
3. `suggested_player` — player appears in a supplied recommendation candidate
   set.
4. `strategic_player` — player is enabled by explicit, versioned configuration.

The versioned `minimumReasonCount` rule is the relevance threshold. The MVP
uses `1`: a signal must have at least one explicit reason, so unrelated football
news is excluded. Raising it is a deterministic configuration change and must
be recorded with its rule version.

## Conservative behaviour

Signals that are expired or outside their effective interval are suppressed.
Repeated signal IDs are suppressed. When several valid signals apply to the
same player, the newest evaluation wins with signal ID as the stable tie-break.
Unresolved conflicts, unknown player state, and low confidence remain visible
but are marked `requiresReview`; they do not become a recommendation.

Identity ambiguity is not coerced into a player ID. Upstream extraction and
evidence resolution must quarantine such input rather than emit a `NewsSignal`.
The matcher returns supplied ambiguous/unresolved candidate references in a
separate quarantine result, so they remain visible without being accidentally
matched to a squad or watchlist.

## Boundaries

The output retains the selected signal and optional availability state, whose
claim, evidence, provenance, freshness, and rule references remain available
to downstream consumers. It carries no provider DTO or raw source content.
The same central signals may be evaluated for multiple `TeamState` contexts;
the `Watchlist` contract provides only add/remove membership and is scoped to
one team state. No per-user provider collection, authentication, profile, or
subscription mechanism is introduced.
