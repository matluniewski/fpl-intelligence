# FPL and Premier League data licensing review

Status: FPL-39 research baseline — not legal advice, provider approval, procurement authority, or a release decision

Reviewed: 2026-08-20

## Decision summary

**Commercial/public release: unresolved — no-go until the blockers below are closed.**

The repository currently uses only project-authored synthetic reference-data and
news fixtures. It has no live football-data or FPL-data provider, credential,
or commercial data right. This remains the only permitted runtime posture.

Public availability of Fantasy Premier League (FPL) or Premier League data is
not evidence of a licence. The product must not scrape, call unofficial FPL
endpoints, use FPL credentials/cookies, or infer commercial rights from an
ordinary game account.

## Current prototype inventory

| Data category                           | Fields/purpose                                                                                                                         | Freshness needed for a future product                                       | Current source/access path                                                 | Commercial-use state                                                            | Release implication                                                                                             |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| General football reference data         | Season, gameweeks, teams, players, positions, fixtures and scoring-rule-shaped inputs used by deterministic validation and projections | Season/gameweek updates; fixtures before recommendation evaluation          | Project-authored synthetic fixture through `PrototypeReferenceDataAdapter` | `permitted` only for the project-authored fixture                               | A licensed provider or separately approved first-party source is required before live use.                      |
| General football event/performance data | Results, minutes, goals, assists, cards, starts, event data and derived measures such as xG/xA                                         | Match/live or post-match, according to the evaluated recommendation horizon | Not implemented                                                            | `not_reviewed`                                                                  | Do not ingest or display in a public/commercial product without a reviewed contract.                            |
| Availability and lineup information     | Injury/availability, expected participation, suspensions, lineups and corrections                                                      | Time-sensitive; freshness and expiry must be explicit                       | No live source; synthetic/approved research-only news path                 | `not_reviewed`                                                                  | Requires a permitted source and the separate news-source review; it cannot be inferred from general match data. |
| FPL-specific public game state          | FPL player aliases/positions, prices, ownership, deadlines, scoring, chips and rules                                                   | At least per gameweek; some fields more frequent                            | Not implemented                                                            | `not_reviewed`                                                                  | A football-data feed does not automatically cover these fields or confer a right to use them.                   |
| Manager-specific state                  | Confirmed squad, selling prices, bank, free transfers, captain/vice-captain, bench, chips and prior transfers                          | User-confirmed at each decision                                             | Manual/screenshot flow is planned; no FPL account import                   | Not applicable to an external FPL feed; screenshot/privacy policy remains gated | Never obtain this through FPL credentials, cookies, unofficial endpoints, or automation.                        |

## Evidence and contact paths

| Subject                         | Primary evidence                                                                                                   | What it establishes                                                                                                                                            | What it does **not** establish                                                                                                                    | Required next action                                                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Premier League match data       | [Premier League business/data contact guidance](https://www.premierleague.com/en/news/102426)                      | The Premier League directs permission for match data, including fixture feeds, to Football DataCo; it also states that trademark use needs express permission. | Permission, pricing, territory, product coverage, derived-data rights, or an FPL-data right for this product.                                     | Contact Football DataCo with the field inventory and intended use; obtain a written scope before technical enablement.                                 |
| Official performance statistics | [Premier League statistics clarification](https://www.premierleague.com/en/stats/clarification)                    | Premier League states that Opta/Stats Perform collects and analyses its official performance data.                                                             | That Opta data is licensed to this product or that all displayed/derived data has the same rights.                                                | Treat provider and competition rights as separate contractual questions.                                                                               |
| Stats Perform / Opta            | [Stats Perform pricing and licensing FAQ](https://www.statsperform.com/faqs/stats-perform-faqs-pricing-licensing/) | Bespoke licences are available by competition, country and data level; the vendor offers commercial data/API products.                                         | Premier League coverage, permitted product use, redistribution/display, derived-data, retention, AI processing, price, SLA or territorial rights. | Request a written proposal limited to required fields, territories and product surfaces; subject it to legal/commercial review.                        |
| FPL game use                    | [FPL terms and conditions](https://fantasy.premierleague.com/help/terms)                                           | FPL is a governed game/service whose terms may change.                                                                                                         | Any developer, data-reuse, commercial, account-delegation, or automation permission.                                                              | Obtain an explicit FPL/Premier League business or data right for every required FPL-specific field; otherwise retain the manual-only product boundary. |

## Candidate providers and technical fit

These are procurement candidates only. No provider is selected or enabled by this
document.

| Candidate                          | Potential fit                                                                                                                           | Known gap/risk                                                                                                                                                                     | Migration impact                                                                                                     |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Football DataCo / authorised route | Rights enquiry path for Premier League match data and fixture feeds                                                                     | Product/API availability and commercial terms are not established by the public contact page. FPL-specific state remains separate.                                                 | Implement an adapter behind `FootballReferenceDataPort`; preserve provider aliases only at the boundary.             |
| Stats Perform / Opta               | General football statistics and possible licensed competition-level data                                                                | Contract must confirm exact Premier League scope, permitted outputs, derived metrics, retention, attribution and external-processor terms. Does not imply FPL game-state coverage. | Provider DTO mapping, identity-alias registry, source-policy record, freshness and cost telemetry; no domain change. |
| Sportradar                         | Potential football roster/lineup/transfer and availability-related data; already recorded as a candidate in `NEWS_SOURCE_COMPLIANCE.md` | Exact product, Premier League coverage, availability semantics and commercial rights are unreviewed.                                                                               | Separate canonical-status adapter; preserve source/provenance and conflict handling.                                 |
| Sportmonks                         | Potential injury/suspension context; already recorded as a candidate in `NEWS_SOURCE_COMPLIANCE.md`                                     | Exact plan, Premier League coverage, upstream provenance, rights and operational terms are unreviewed.                                                                             | Optional evidence/availability adapter only after policy approval; not a substitute for FPL-specific state.          |

## FPL-specific fields that general football data cannot replace

General football feeds may provide player identities, fixtures, results, minutes
and match statistics. They do not by themselves provide or authorise use of:

- FPL player identifiers and FPL position classifications;
- current and selling prices, ownership and price-change history;
- FPL scoring, bonus allocation and gameweek finalisation;
- manager squad composition, bank, free transfers, chips, transfer history and
  FPL deadlines; or
- an account-changing action path.

For the MVP, manager-specific state remains an explicitly user-confirmed
`TeamState`; the application must never substitute account access or unapproved
FPL state collection.

## Required contract and review checklist

Before a candidate can be marked `permitted` or `restricted`, record written
answers covering:

1. exact fields, competitions, territories, environments and freshness/SLA;
2. commercial decision-support, public-beta and monetised-use rights;
3. display, attribution, caching, storage, redistribution and derived-output
   rights;
4. model/LLM processing, training, retention, deletion, correction and audit
   requirements;
5. upstream provenance and sublicensing chain;
6. personal/health-data handling where availability data is involved;
7. credential, rate-limit, usage-reporting and variable-cost terms; and
8. termination, licence-expiry and migration obligations.

Qualified legal/privacy review must approve the resulting contract interpretation
and public release posture. This document intentionally does not make that
determination.

## Decision gates and owners

| Gate                                                                 | Owner/work item                                              | Current state                                                      |
| -------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| Keep internal prototype on synthetic data                            | FPL-39 / existing architecture                               | Satisfied.                                                         |
| Select or enable any live football/FPL provider                      | Separate approved provider issue and ADR where consequential | Blocked: no provider/right approved.                               |
| Enable live availability/news content                                | FPL-45 and `NEWS_SOURCE_COMPLIANCE.md` process               | Blocked pending source-specific review.                            |
| Process screenshots or manager state through external vision tooling | FPL-57 / FPL-58                                              | Gated by privacy/retention review.                                 |
| Public beta                                                          | FPL-46                                                       | Blocked by licensing, privacy, branding, source and cost gates.    |
| Monetised release                                                    | FPL-47                                                       | Blocked until public-beta gate and commercial rights are approved. |

## Architecture constraints preserved

- Keep provider DTOs, transport errors and IDs inside adapters; stable internal
  identities remain provider-independent.
- Carry provenance, licence/policy state, timestamps, freshness and deletion
  obligations through normalized data and derived recommendations.
- Fail closed when commercial use, retention, external processing or deletion
  rights are unknown.
- Do not make a provider selection, purchase, contract commitment or public
  release decision from this research record.

## Repository sources

- [`PRODUCT.md`](./PRODUCT.md) defines the separation between general football
  data and FPL-specific state.
- [`DATA_PROVENANCE.md`](./DATA_PROVENANCE.md) defines the fail-closed
  commercial-use and provider-replacement rules.
- [`NEWS_SOURCE_COMPLIANCE.md`](./NEWS_SOURCE_COMPLIANCE.md) records the
  currently unapproved availability/news candidates and their required reviews.
