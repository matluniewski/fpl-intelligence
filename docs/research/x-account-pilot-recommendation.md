# X pilot account recommendation

Status: recommendation for FPL-80 review; not an approved allowlist

Research date: 2026-08-26

## Recommendation

Use the following 10-account set only as the input to FPL-80's account-level policy and identity review. No account is approved for retrieval or runtime use by this document.

| Account           | Primary contribution                 | Incremental value                                                  | Main overlap and risk                                                                           |
| ----------------- | ------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `@PremierLeague`  | Official league facts                | League-wide announcements and competition context                  | Promotional noise; not a substitute for club availability statements.                           |
| `@OfficialFPL`    | Official FPL game facts              | Deadlines, game rules, prices, chips, and service notices          | FPL announcements can overlap league and creator commentary.                                    |
| `@PLComms`        | Formal league communications         | Rules, scheduling, discipline, and operational context             | Lower posting volume; may overlap `@PremierLeague`.                                             |
| `@David_Ornstein` | National reporting                   | High-value cross-club reporting path                               | Claims require item-level attribution and independent verification.                             |
| `@BenDinnery`     | Availability specialization          | Cross-club availability and press-conference synthesis             | Correlated with clubs, press conferences, and Premier Injuries.                                 |
| `@FFScout`        | FPL editorial and team news          | Deadline-focused synthesis and classification-friendly FPL framing | Aggregates upstream evidence; also overlaps creator analysis.                                   |
| `@LiveFPLnet`     | Live FPL state and community context | Distinct live-rank and ownership context                           | Primarily a data/analysis role, not factual football reporting.                                 |
| `@fplreview`      | Projection analysis                  | Model-based expected-value context                                 | Prediction, model assumptions, and possible paywalled features must remain distinct from facts. |
| `@TheFPLWire`     | Multi-analyst FPL discussion         | Diverse analytical viewpoints and deadline narratives              | Podcast promotion and correlated community consensus add noise.                                 |
| `@FPL__Raptor`    | FPL analysis and decision psychology | Distinct behavioral and strategic interpretation                   | Analysis/opinion; never a primary availability source.                                          |

## Why this set

The set deliberately spans official facts, formal communications, national reporting, availability synthesis, editorial aggregation, live FPL state, projections, multi-person analysis, and behavioral strategy. It avoids selecting multiple reporters from the same club beat or multiple dedicated injury aggregators in the first experiment.

It does not provide complete 20-club coverage. The pilot's purpose would be to validate access controls, provenance, classification, correlation handling, deletion/change operations, cost limits, and measurable signal value before considering broader coverage.

## Preconditions owned by FPL-80

Before any retrieval, FPL-80 must:

1. resolve and recheck each immutable X user ID, current handle, owner, and affiliation;
2. review the exact official X API product, current terms, intended use, retention, deletion/compliance path, display restrictions, and commercial environment;
3. approve an account-level source policy and one global plus per-account kill switch;
4. retain the default prohibition on external-LLM processing unless separately approved in writing;
5. define a read and cost budget, alert threshold, hard pre-request cutoff, and accountable billing owner without authorizing spend merely by documenting it;
6. define a permitted item-level evaluation protocol with factual/reporting/analysis/prediction/rumour labels and correlation groups;
7. confirm that no protected account, direct message, cookie, authenticated browser session, or private content is used; and
8. establish deletion, correction, terms-change, affiliation-change, and inactivity re-review triggers.

Any failed precondition keeps the global X switch off.

## Suggested bounded evaluation

If all gates are later approved, use a private, read-only, time-boxed evaluation:

- maximum 10 immutable account IDs;
- no search, historical bulk backfill, public display, embeds, redistribution, or product recommendations;
- minimal post IDs, account IDs, URLs, timestamps, source role, structured labels, correlation group, and content-free aggregate metrics;
- deterministic/local processing only;
- pre-registered measures for relevant-signal yield, attributable-primary-source rate, duplication rate, deadline-period latency, correction/deletion handling, and analyst review effort; and
- immediate disablement on terms ambiguity, budget uncertainty, deletion/control failure, unexpected sensitive-data processing, or source-identity mismatch.

## Rollback and disablement

Rollback means disabling the global source policy and all account policies, stopping retrieval, draining or discarding queued work, applying required deletion/change actions, removing controlled raw copies, and retaining only content-free audit metadata where permitted. No alternate scraping, browser automation, unofficial API, copied dataset, or authenticated-session fallback is allowed.

The broader 50-account shortlist remains a research comparison set. Expansion beyond 10 accounts requires a new approved scope and evidence that the pilot's policy, quality, cost, and operational controls worked.
