# FPL Intelligence Product Specification

Status: MVP product baseline

Owner: FPL-12

Last updated: 2026-08-18

## 1. Purpose and sources of truth

This document defines the product direction, MVP boundary, user flows, product language, and validation intent for FPL Intelligence.

The project uses three complementary sources of truth:

- Linear owns work status, priorities, dependencies, and issue acceptance criteria.
- Figma owns approved UX and visual design.
- Repository documentation owns version-controlled product and engineering decisions.

If these sources disagree, the conflict must be resolved explicitly. An implementation issue must not silently invent behavior that is absent from an approved Figma design or contradict this product specification.

The dates, deadlines, players, teams, prices, projected points, reliability scores, and other values in the current Figma wireframes are illustrative mock data.

## 2. Product vision

FPL Intelligence is a decision-support product for engaged Fantasy Premier League managers. Its purpose is to turn a user's team context, fresh permitted football information, and transparent analysis into an actionable recommendation that explains:

- what the user should consider doing;
- why the recommendation is being made;
- how confident the system is;
- what evidence supports it;
- what changed since the previous recommendation; and
- which assumptions or risks could change the outcome.

The long-term product direction is an **FPL Decision Agent**, not another statistics dashboard or opaque optimizer.

The first MVP validates a narrower wedge: **Personalized FPL News Intelligence**.

### Central promise

> Stop monitoring football news yourself. We monitor trusted sources and tell you only what changes your FPL decisions.

### Critical MVP question

> Can we save an FPL manager from manually monitoring news and reliably explain when new information changes what they should do?

Screenshot upload is an onboarding mechanism. It is neither the differentiator nor the durable source of truth.

## 3. Target user and job to be done

### Primary persona

The primary MVP user is an engaged FPL manager who:

- already has a team in the official game;
- checks injury, availability, press-conference, lineup, and rotation news before deadlines;
- uses judgment or existing planning tools but finds news monitoring fragmented and time-consuming;
- wants concise, squad-specific guidance rather than a generic football-news feed; and
- is willing to execute any selected action manually in the official FPL interface.

The MVP is not primarily designed for a first-time manager who needs the rules of FPL explained, nor for a power user seeking the market's most advanced multi-gameweek optimizer.

### Job to be done

When information changes before an FPL deadline, help me understand whether it matters to my team, what decision it affects, and why, so I can act confidently without monitoring every source myself.

### Desired experience

The product should compress a changing evidence trail into a clear decision history. For example:

1. Monday: a player is a `HOLD`, with high expected minutes and high confidence.
2. Thursday: the player trained separately and is now a late decision; expected minutes fall and the recommendation becomes `WAIT`.
3. Friday: a high-confidence report says the player did not travel; expected minutes fall materially and the recommendation becomes `SELL`, with a suggested alternative.

At each step, the user can see the source, freshness, confidence, changed values, and reasoning.

## 4. Strategic product principles

1. Explainability over opaque recommendations.
2. Fresh information must be able to change projections and recommendations.
3. Important recommendations expose evidence, provenance, confidence, assumptions, and risk.
4. Show what changed since the previous recommendation.
5. Personal relevance takes precedence over a generic news feed.
6. Raw provider data, normalized domain data, projections, optimization, and recommendations are separate concerns.
7. External providers are replaceable adapters; provider DTOs never enter domain logic.
8. Data provenance is preserved wherever it affects trust, compliance, or reproducibility.
9. LLMs may extract, classify, summarize, and identify possible conflicts; they are not authoritative sources of truth.
10. Deterministic rules, source context, recency, corroboration, and conflict handling resolve evidence into decision inputs.
11. Optimize for low fixed cost and observable variable cost.
12. Shared central ingestion is reused across users rather than repeated per user.
13. Do not build billing, subscriptions, or complex multi-tenancy before the MVP demonstrates value.
14. Every real FPL account-changing action requires explicit human approval and a permitted integration. The MVP performs no such action.
15. Commercial release is gated by licensing, provider compliance, branding, privacy, retention, terms, and operating-cost review.

## 5. MVP thesis and boundaries

### 5.1 The smallest useful MVP

The smallest useful product closes this loop:

```text
confirmed team context
  + fresh permitted source material
  + structured claims and evidence
  -> current player availability state
  -> transparent projection impact
  -> personalized recommendation impact
  -> evidence-backed explanation and manual action handoff
```

The MVP may use deliberately limited, transparent projection and recommendation rules sufficient to test this loop. It does not need to prove that its expected-points model is the best in the market.

### 5.2 In scope

#### A. Squad import

- Upload an FPL squad screenshot.
- Validate the file at a product-requirement level.
- Extract a provisional squad through a replaceable vision adapter.
- Show uncertainty, missing fields, and player-identity ambiguity.
- Require the user to confirm or correct the extracted result.
- Provide manual team entry as a complete, first-class fallback.
- Collect missing state such as bank, free transfers, available chips, and purchase or selling prices when required by a supported decision.
- Persist only the confirmed normalized `TeamState` as the durable team source of truth.
- Treat the source screenshot as ephemeral by default, subject to the detailed privacy decision in FPL-57.

#### B. Squad and watchlist context

- Show the confirmed squad and current player status relevant to supported decisions.
- Allow personalized monitoring to be scoped to squad players.
- Support an intentionally small watchlist if it is required to validate alerts for candidate players; its exact creation and persistence behavior remains an open product decision.
- Permit future inclusion of optimizer-suggested or strategically relevant players without changing the news domain model.

#### C. Curated news monitoring

- Ingest centrally from a small allowlist of permitted `NewsSource` implementations.
- Support official club sources, manager press-conference sources, trusted reporters, official X API access, and licensed sports/news providers only after the relevant access method is approved.
- Reuse normalized ingestion across relevant users.
- Preserve source reference, provenance, and freshness.

#### D. Structured claim extraction

- Convert relevant free-form material into structured `Claim` records.
- Extract the subject, claim type, claimed state, time, source, provider reference, supporting text or metadata, and the explicit/speculative/reported nature of the statement.
- Preserve the original evidence relationship so an extraction can be reviewed.
- Permit contradictory claims to coexist.

#### E. Evidence Engine v0

- Apply simple, transparent source tiers, recency, corroboration, and conflict rules.
- Produce a decision-relevant `NewsSignal` and update a normalized `PlayerAvailabilityState` when justified.
- Distinguish source reliability, extraction confidence, claim certainty, and signal confidence.
- Avoid learned source-reputation scoring in the MVP.

#### F. Personalized changes and alerts

- Surface only material changes relevant to the user's squad and, where supported, watchlist.
- Distinguish a new signal that changes a recommendation from one that does not.
- Show stale, partial, and conflicting evidence rather than hiding it.
- Avoid presenting an all-football or all-FPL news feed as the primary experience.

#### G. Recommendation impact

- Show previous and current expected-minutes or availability inputs when news changes them.
- Show whether supported projection and recommendation outputs changed.
- Explain the causal chain from evidence to player state to projection to recommendation.
- Show one primary recommendation, a conservative alternative where the supported model can provide one, expected impact, confidence, assumptions, and risk.
- Preserve a recommendation snapshot sufficient to support a user-facing "what changed?" history.

The first supported recommendation set may be intentionally narrow. Full multi-gameweek transfer optimization is not required to validate the news-to-decision proposition.

#### H. Manual execution

- Let the user approve or accept a plan inside FPL Intelligence.
- Make clear that approval records the user's decision in this product only.
- Offer a manual handoff such as `Open FPL` where appropriate.
- Require the user to perform transfers, captaincy, starting XI, bench order, and chip actions in the official FPL interface.

### 5.3 Explicitly outside the MVP

- FPL login, credentials, session cookies, or direct account integration.
- Dependency on a public manager entry ID.
- Scraping `fantasy.premierleague.com`, X, or arbitrary websites.
- Browser automation of FPL or X.
- Undocumented FPL endpoints.
- Automated transfers, captaincy, vice-captaincy, starting XI, bench order, or chip activation.
- Full multi-gameweek transfer planning, price-path optimization, chip strategy, and advanced scenario UX.
- A market-leading or advanced machine-learning projection model.
- Massive news ingestion or monitoring all of X.
- Learned or ML-based source-reputation scoring.
- Treating X as the canonical availability source by default.
- Billing, subscriptions, pricing pages, entitlements, or payment-provider integration.
- Authentication and complex multi-tenancy unless introduced by a later approved issue.
- Production analytics infrastructure without a dedicated approved issue.
- Public/commercial launch before the Commercial Readiness gates are satisfied.

These exclusions keep the MVP focused. They do not remove optimizer, scenario-planning, or commercial capabilities from the longer-term roadmap.

## 6. Domain language

The following terms are product contracts. Their exact technical representation belongs in architecture and domain-contract work.

### `TeamStateCandidate`

A provisional, editable interpretation of the user's team. It may be produced by screenshot extraction or assembled during manual entry. It can contain uncertainty, unresolved player identities, missing fields, and validation errors. It must not be used as confirmed truth without user review.

### `TeamState`

The normalized, user-confirmed state used by product logic. It includes the squad and only the additional game state needed by supported decisions, such as captaincy, bank, free transfers, chips, and price state. It is durable and independent of the screenshot or provider payload that helped create it.

### `NewsSource`

A replaceable adapter boundary for a permitted external news or availability provider. The rest of the product must not depend on whether a normalized item originated from X, a club source, a press-conference provider, or a licensed feed.

### `RawNewsItem`

A normalized record of newly ingested source material and its provenance. It is downstream of provider-specific DTO mapping but upstream of semantic claim extraction. Raw content is retained only when necessary and permitted.

### `Claim`

A structured assertion extracted from a `RawNewsItem`, such as a player training separately or a manager describing a player as available. Claim certainty describes what the source asserted and how explicitly; it does not establish that the assertion is true.

### `Evidence`

The source material and contextual metadata supporting or contradicting a claim, including source identity or tier, original reference, timestamp, freshness, quotation/reporting context, and corroboration relationships where available.

### `NewsSignal`

A normalized, time-bounded interpretation of one or more claims that is relevant to a decision, such as `availability_uncertain` or `rotation_risk_increased`. A signal exposes confidence, supporting and conflicting evidence, freshness, and expiry behavior.

### `PlayerAvailabilityState`

The current normalized availability and expected-participation input for a player. It may combine an approved canonical provider with time-sensitive `NewsSignal` evidence. It must not silently treat an LLM output or a single social-media post as truth.

### `Projection`

A transparent estimate derived from normalized football inputs, availability, expected minutes, and declared assumptions. A projection must be reproducible for the same inputs and must explain material adjustments.

### `Recommendation`

A decision-support output produced from normalized state and projections. It includes the proposed action, expected impact or relevant change, confidence, explanation, assumptions, evidence references, and risk. It is advice, not an account mutation.

### `RecommendationSnapshot`

An immutable record of the inputs and output necessary to compare a recommendation with an earlier one and explain what changed. Retention and data-minimization rules still apply.

### `ActionPlan`

A normalized set of user-reviewed FPL actions. In the MVP it is handed to a conceptual `ManualFplActionProvider`, which displays the steps and optionally opens the official FPL interface. A future `OfficialFplActionProvider` requires explicit product, legal, terms, and integration approval.

## 7. Core user flows

### 7.1 Screenshot-first onboarding

1. The user is told what a suitable screenshot contains and what will happen to the image.
2. The user uploads a supported file.
3. The product validates size, type, readability, and obvious completeness.
4. A replaceable vision adapter extracts a `TeamStateCandidate`.
5. The product shows extraction progress without implying success prematurely.
6. The user reviews the candidate, with uncertain and missing values called out.
7. The user resolves player ambiguity and corrects mistakes.
8. The user enters required non-visual state, including bank, free transfers, chips, and relevant prices.
9. Product validation confirms that the candidate is internally complete for supported decisions.
10. The user confirms it, creating the durable normalized `TeamState`.
11. The screenshot is deleted after extraction and confirmation by default, subject to FPL-57.
12. The user enters the personalized decision experience.

Failure and recovery requirements:

- An unreadable or unsupported image produces a specific, recoverable error.
- Partial extraction preserves useful candidate fields and highlights what remains unresolved.
- Provider failure offers retry and a direct switch to manual entry.
- Abandoned onboarding follows the screenshot deletion rule defined by FPL-57.
- No failure path makes screenshot upload mandatory.

### 7.2 Manual onboarding

1. The user chooses manual entry at the start or after an extraction problem.
2. The user selects each squad player and required squad attributes.
3. The user enters the same non-visual game state required by the supported decision set.
4. The product validates team completeness and constraints without requiring FPL credentials or a manager entry ID.
5. The user confirms the candidate, creating the same normalized `TeamState` produced by screenshot onboarding.

Manual entry is a complete fallback, not a reduced recovery mode.

### 7.3 Central news ingestion and interpretation

1. A scheduled or event-driven process retrieves material from a permitted curated `NewsSource`.
2. The adapter maps provider-specific data into normalized `RawNewsItem` records with provenance.
3. Deduplication prevents repeated processing and repeated user alerts.
4. AI-assisted extraction produces structured `Claim` candidates and links them to evidence.
5. Validation rejects malformed, unsupported, or unresolved claims without treating them as facts.
6. Evidence Engine v0 applies source tier, recency, corroboration, and conflict rules.
7. It creates, updates, expires, or supersedes `NewsSignal` records.
8. Valid signals update decision inputs such as `PlayerAvailabilityState`.
9. Operational freshness and partial-provider failure remain visible to downstream product surfaces.

### 7.4 Personalized relevance

1. The system matches a new or changed signal to confirmed squad context and any supported watchlist context.
2. Irrelevant signals do not create a primary user alert.
3. Relevant signals are evaluated against the last recommendation snapshot.
4. The user sees one of three outcomes:
   - new information changed a recommendation;
   - new information changed an input or confidence but not the recommendation; or
   - evidence is unresolved or conflicting, so the product recommends waiting or reviewing uncertainty.
5. The product records enough history to explain the transition without retaining unnecessary raw content.

### 7.5 Recommendation change and explanation

1. The user opens a squad-relevant change.
2. The product leads with the current decision and whether it changed.
3. It compares old and new material values, for example expected minutes, start probability, projection, recommendation, and confidence.
4. It shows the claims and evidence that caused the change, with source tier and freshness.
5. It shows contradictory or missing evidence.
6. It explains the causal chain and key assumptions in plain language.
7. It presents the primary action and a supported alternative, including expected impact and risk.
8. The user accepts, dismisses, or waits; none of these actions changes the official FPL account.

### 7.6 Manual action handoff

1. The user reviews the complete `ActionPlan`.
2. The product clearly labels that approval is internal acceptance only.
3. The user may choose `Approve plan` to record their choice.
4. The user may choose `Open FPL` as a convenience.
5. The user manually executes and verifies all actions in the official interface.

## 8. Confidence and explainability

Confidence must never be presented as unexplained precision. The product must keep these concepts separate:

- **Extraction confidence:** how likely the parser or vision model is to have interpreted content correctly.
- **Claim certainty:** whether the source made an explicit, quoted, reported, or speculative assertion.
- **Source reliability:** the source tier or context-specific historical reliability, when available.
- **Signal confidence:** how strongly the available evidence supports the current decision-relevant state.
- **Projection uncertainty:** uncertainty in expected minutes, performance, fixture, and model assumptions.
- **Recommendation confidence:** the robustness of the recommended decision to the above uncertainty and to alternatives.

The MVP may use understandable bands such as low, medium, and high. Any percentage displayed must have a documented meaning and calibration plan; visual precision must not exceed the evidence behind it.

Every material recommendation explanation should answer:

1. What is the proposed action?
2. What changed since the prior recommendation?
3. Which inputs changed?
4. Which claims and evidence support the change?
5. How fresh and reliable are the sources?
6. What evidence conflicts or remains missing?
7. What assumptions drive the projected impact?
8. What could make the alternative outperform the recommendation?

## 9. Product states

Approved future UX must cover the following states before implementation invents their behavior.

| Area | Required states |
| --- | --- |
| Screenshot import | initial, drag/drop or selection, validating, extracting, partial extraction, ambiguous player, unsupported file, unreadable image, provider failure, retry, abandoned flow |
| Manual import | initial, adding players, incomplete team, invalid team, missing game state, complete candidate |
| Confirmation | candidate review, corrected candidate, missing required field, confirmed `TeamState`, save failure |
| Personalized changes | loading, no relevant changes, recommendation changed, recommendation unchanged, confidence-only change, unresolved conflict |
| Evidence | fresh, stale, corroborated, contradictory, source unavailable, raw-content display restricted |
| Pipeline health | current, delayed, stale, partial-provider failure, no permitted source configured |
| Recommendation | current, recalculating, changed, unchanged, insufficient evidence, expired, no supported action |
| Manual handoff | review, approved internally, dismissed, open-FPL handoff, return without confirmation |

FPL-24 owns onboarding and general system-state designs. FPL-55 owns the personalized news decision workflow. Until those designs are approved, this table is a product requirement rather than permission to invent final UI.

## 10. Current Figma coverage and gaps

The Figma file currently contains one page, `MVP Wireframes`, with four desktop frames. All content is illustrative.

### Existing frames

#### Overview (`1:2`)

Shows navigation, sync and deadline status, one captain recommendation with reasons, recommended start/bench/hold actions, multi-gameweek projected points, and a risk/news summary.

Useful direction:

- leads with a recommendation;
- includes short reasons and risk signals;
- establishes a decision-centre layout.

Gap against the revised MVP:

- does not show onboarding or confirmed team provenance;
- does not compare current and previous recommendations;
- does not expose claims, evidence, freshness, conflicts, or causal impact;
- implies broad optimizer capability beyond the smallest MVP.

#### Squad optimizer (`1:80`)

Shows an optimized XI, bench order, captain, projected score, risk preference, horizon, and a short explanation for one selection.

Useful direction:

- demonstrates explainable lineup output;
- keeps model output and user controls visible.

Gap against the revised MVP:

- full XI/bench/captain optimization is roadmap capability, not required for the first validation loop;
- does not show how fresh evidence changed player state or the recommendation;
- does not cover uncertainty, stale inputs, or partial-provider failure.

#### Transfer planner (`1:177`)

Shows two multi-gameweek paths with free transfers, bank, chip availability, hits, rollover, expected value, and relative risk.

Useful direction:

- supports the long-term Decision Agent vision of direct plans, alternatives, expected impact, and risk.

Gap against the revised MVP:

- full multi-gameweek transfer planning is explicitly deferred;
- does not show evidence-driven changes or recommendation history;
- depends on game state that must first be confirmed during onboarding.

#### News intelligence (`1:267`)

Shows a filterable signal feed, player labels, confidence percentages, source-reliability scores, and a note that structured news affects expected minutes and risk rather than directly overriding the optimizer.

Useful direction:

- captures the separation between news signals and optimization;
- introduces source reliability and normalized decision inputs.

Gap against the revised MVP:

- is organized as a generic signal feed rather than a squad/watchlist change workflow;
- does not show claims, evidence, corroboration, freshness, expiry, or conflicts;
- does not distinguish extraction, source, signal, and recommendation confidence;
- does not answer what changed or whether a recommendation changed.

### Missing approved designs

The current file does not yet provide approved coverage for:

- screenshot upload, extraction, review, correction, and deletion disclosure;
- manual team entry and missing game-state entry;
- ambiguous, partial, failed, empty, stale, and recovery states;
- confirmed `TeamState` success and later correction;
- squad/watchlist-specific daily changes;
- recommendation changed versus recommendation unchanged;
- old/new expected minutes, projections, confidence, and actions;
- claims, evidence, source tiers, freshness, corroboration, expiry, and conflicts;
- recommendation history and the full "what changed?" view;
- internal approval versus manual `Open FPL` handoff; and
- a resolved product decision for the currently visible `Players` navigation item.

FPL-24 and FPL-55 must close or explicitly defer these gaps without silently overwriting the four existing frames.

## 11. Data, privacy, compliance, and commercial boundaries

### Screenshot data

The screenshot, extracted candidate, confirmed `TeamState`, audit metadata, and operational logs are different data categories.

- The screenshot is ephemeral by default.
- It should be deleted after extraction and user confirmation unless a separately approved product reason requires retention.
- Failed and abandoned flows also require defined deletion behavior.
- Logs and telemetry must not contain image content or unnecessary personal information.
- Any external vision processing requires explicit review of disclosure, consent, data-processing terms, provider reuse, and model-training behavior.
- FPL-57 owns the detailed privacy and retention decision and may impose stricter requirements.

### External sources

- Technical accessibility does not imply commercial-use permission.
- No source is enabled for production until its access, storage, display, attribution, redistribution, retention, and external-LLM processing constraints are understood.
- X access uses only an official or otherwise explicitly permitted method; no scraping fallback is allowed.
- Raw external content is retained only where necessary and permitted.
- Unresolved permissions disable that source rather than being treated as consent.
- FPL-45 owns the provider compliance review; engineering documentation must not claim a legal conclusion.

### FPL and football data

General football data and FPL-specific game state are distinct licensing and integration concerns.

- General football data includes fixtures, results, minutes, goals, assists, expected-goal data, cards, starting lineups, and player/team statistics.
- FPL-specific state includes FPL identifiers and positions, prices and selling prices, ownership, manager squad state, captaincy, bank, free transfers, chips, transfers, deadlines, and FPL scoring state.

Publicly accessible FPL endpoints are not assumed to grant commercial rights. Providers must remain replaceable, and commercial launch remains blocked until required rights and alternatives are reviewed.

### Branding and actions

- `FPL Intelligence` is an internal project name.
- Current Figma branding is internal/mock branding.
- No commercial right is assumed for Premier League or FPL branding, club crests, club trademarks, logos, or official visual identity.
- The MVP never stores FPL credentials or performs official-account mutations.
- Future automation requires both an officially permitted integration and explicit project approval.

## 12. Validation plan

FPL-54 owns thresholds and the execution plan. This document defines the product hypotheses and measurement concepts only; it does not authorize production analytics infrastructure.

| Hypothesis | Evidence concept |
| --- | --- |
| Users can establish an accurate team without direct FPL integration. | Import completion, extraction failure rate, correction effort, manual-fallback completion, time to confirmed `TeamState`. |
| Personalized monitoring is more useful than a generic feed. | Squad/watchlist relevance rate, dismissed irrelevant alerts, user-rated relevance. |
| The system finds important news early enough to help. | Important signals detected, detection latency against a defined comparison, missed-signal review. |
| Users understand whether and why a decision changed. | Correct comprehension of changed inputs and action, explanation usefulness, unresolved questions. |
| Evidence and honest uncertainty improve trust. | Evidence-detail opens, trust rating, confidence comprehension, behavior under conflicting evidence. |
| The workflow saves pre-deadline time. | User-reported time saved and time spent monitoring other sources. |
| Recommendations are useful enough to influence manual action. | Recommendation acceptance, manual follow-through where voluntarily reported, reason for rejection, counterfactual alternative choice. |
| The differentiated workflow may support a future paid product. | Qualitative willingness to pay and perceived replacement value, without billing implementation. |

Measurement must separate:

- import usability;
- source coverage and timeliness;
- extraction and evidence quality;
- personalization relevance;
- projection and recommendation utility;
- explanation and confidence comprehension;
- distribution and retention risk; and
- willingness to pay.

Any collected data must be minimized and aligned with the privacy, retention, and provider-compliance decisions. MVP results should support an explicit continue, change, or stop decision.

## 13. Roadmap positioning

The revised MVP changes sequence and emphasis; it does not discard the broader optimizer architecture.

### After the core MVP is validated

- richer expected-points projections and calibration;
- deterministic starting XI, bench, captain, and vice-captain optimization;
- full multi-gameweek transfer planning with bank, prices, free transfers, rollover, hits, chips, and horizon;
- conservative, balanced, and aggressive scenario comparison;
- broader watchlist and optimizer-suggested-player monitoring;
- context-specific source-reputation measurement from known outcomes;
- deeper recommendation history and realized-outcome evaluation;
- approved canonical availability and licensed football-data providers; and
- optional account-based persistence, distribution, and commercial capabilities introduced only through approved issues.

### Future action automation

The domain may support `ActionPlan -> FplActionProvider`, but the MVP implementation remains manual. An `OfficialFplActionProvider` is future work and is blocked on an officially permitted integration, terms clearance, human approval design, and a dedicated approved issue.

### Commercial progression

The product should remain commercially adaptable without becoming a premature SaaS platform. Authentication, entitlements, subscriptions, payments, and complex multi-tenancy stay deferred until value is demonstrated. Public or monetized release additionally requires the Commercial Readiness gates.

## 14. Open product and policy questions

These questions must be resolved by the owning Linear work before they become implementation assumptions:

1. Which vision-processing modes are acceptable for prototype and public use: local, external, or both?
2. What exact screenshot fields and image layouts are supported, and when is extraction considered too uncertain to continue?
3. What are the deletion deadlines for confirmed, failed, and abandoned screenshot flows?
4. How is a local user's confirmed `TeamState` identified and persisted before any approved authentication work exists?
5. Is a watchlist required in the first validation cohort, and if so, how is it created and maintained?
6. What is the narrowest recommendation set that can validly demonstrate news-driven decision impact without a full optimizer?
7. Which permitted sources form the initial curated allowlist, and which content may be stored, quoted, linked, or sent to an external LLM?
8. Should a licensed availability provider be the canonical state source while reporter and X evidence acts as early warning?
9. What manual source tiers and context rules are acceptable for Evidence Engine v0?
10. How are confidence bands defined and validated without false precision?
11. What constitutes a material change worthy of a user alert?
12. How long should claims, evidence, signals, and recommendation snapshots persist after they expire?
13. How should notifications be delivered during validation without prematurely selecting infrastructure?
14. Does the current `Players` navigation item belong in the revised MVP?
15. Which existing Figma patterns remain approved direction, and which require redesign around personalized changes?
16. Which FPL-specific and general football datasets can be used for prototype, public beta, and commercial release?
17. Which product name and visual assets are safe for public use?
18. What evidence would justify advancing from an internal prototype to a public beta, and from public beta to a commercial product?

## 15. Product risks

### Product risk

Fresh news may not improve decisions often enough, clearly enough, or earlier enough to justify a dedicated workflow. The MVP must measure material recommendation impact and time saved, not only ingestion volume.

### Technical risk

The causal chain from noisy source material to a trustworthy, timely, and explainable decision can fail at extraction, identity resolution, evidence reconciliation, expiry, projection adjustment, or recommendation comparison. Every stage needs observable, reviewable boundaries.

### Compliance risk

Required FPL, football, news, X, branding, or AI-processing rights may not support the intended public product. Unknown rights remain explicit gates, and provider replaceability prevents an unclear source from becoming an irreversible dependency.

### Trust risk

Confident presentation of weak or conflicting evidence could damage user trust faster than a missed alert. The product must expose uncertainty and must never imply that an LLM-generated claim is verified truth.

## 16. MVP completion outcome

The MVP succeeds as a product experiment when a small target cohort can:

1. establish an accurate confirmed `TeamState` without direct FPL integration;
2. receive timely changes relevant to their squad or supported watchlist;
3. understand the evidence and uncertainty behind each change;
4. see whether and why projections or recommendations changed;
5. make a manual decision with less monitoring effort; and
6. provide evidence strong enough for a continue, change, or stop decision.

It is not necessary for the MVP to automate an FPL action, operate a complete SaaS platform, cover every news source, or outperform mature optimizers across all planning features.
