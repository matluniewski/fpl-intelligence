# X account source research

Status: research baseline for FPL-76; not a runtime source approval

Research date: 2026-08-26

## Decision summary

The candidate universe contains 121 public X accounts. The coverage-constrained shortlist contains exactly 50 accounts: 23 official league, FPL, communications, and club accounts; 12 club or football reporters; 5 dedicated availability specialists; and 10 FPL creators. Fantasy Football Scout supplies the sixth availability/news-specialist role while remaining classified primarily as an FPL creator.

The shortlist is suitable for identity, coverage, and pilot-policy review. It is **not** an accuracy leaderboard and does not authorize collection, runtime ingestion, display, redistribution, external-LLM processing, or commercial use. A proposed set of 10 accounts is recorded in [x-account-pilot-recommendation.md](./x-account-pilot-recommendation.md) for a later FPL-80 decision.

The public X profile-syndication path returned HTTP `429` during the recorded run. The collector stopped after the first rate-limit response and did not switch endpoints, authenticate, retry aggressively, or bypass the limit. Consequently, activity samples and non-official claim verification are incomplete. The CSV uses `insufficient_evidence` and conservative zeroes for unsupported dimensions rather than fabricating observations.

## Acceptance status

This artifact is intentionally not presented as complete FPL-76 delivery.

| Criterion                                                                   | Recorded status                                                                                                                             |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Candidate universe                                                          | Met: 121 documented candidates.                                                                                                             |
| Exactly 50 shortlisted accounts                                             | Met.                                                                                                                                        |
| Required category coverage                                                  | Met: 20 clubs, Premier League, Official FPL, 12 reporters, 6 availability/news roles including Fantasy Football Scout, and 10 FPL creators. |
| Pilot recommendation                                                        | Met: 10 provisional accounts, all deferred to FPL-80.                                                                                       |
| Immutable IDs for every shortlist row                                       | Not met: 18 of 50 resolved in the current content-free metadata record.                                                                     |
| At least 20 relevant items where available                                  | Not met: X returned a rate limit before a permitted sample could be completed.                                                              |
| Five independently verified claims per non-official account where available | Not met; all such rows report `insufficient_evidence`.                                                                                      |
| Raw-content and credential minimization                                     | Met: no raw post body, credential, cookie, screenshot, private content, or authenticated session is retained.                               |

The unresolved criteria require a permitted and stable identity/sample access path or a separately documented manual review. They must not be waived merely to mark the issue complete.

## Research questions and findings

### Which source roles are useful?

- Official league, game, and club accounts are the strongest paths for announcements attributable to the publishing organization. Their weaknesses are uneven FPL relevance, promotional noise, and the absence of any blanket downstream reuse right.
- Club reporters can add press-conference context, training observations, transfer reporting, and local specialization before or beyond a club announcement. Their value is account- and claim-specific; employment, beat, and handle changes require regular review.
- Availability specialists can consolidate press-conference and injury-status reporting, but their outputs are often correlated with the same primary statements. Repetition must not be treated as independent corroboration.
- FPL creators add interpretation, prioritization, deadline context, models, and community discovery. They remain analysis or prediction sources unless an item cites independently attributable evidence.
- Publisher and data-desk accounts are useful comparison candidates, but most add a noisier, less attributable signal path than a named reporter or primary account.

### What is missing from the evidence?

The research run did not establish five independently verified historical claims for any non-official shortlisted account. It also did not establish comparative publication latency, deletion history, or reliable correction rates. Those dimensions remain zero-scored or explicitly unavailable. They must be assessed through a separately permitted official API or documented manual protocol before reliability tiers are assigned.

No follower count, verification badge, engagement metric, or popularity signal affects the score.

## Candidate construction

Candidates were discovered from:

- the official list of 2026/27 Premier League clubs and the official promoted-club announcement;
- official club, league, game, competition, publisher, and creator sites;
- publisher author pages and professional affiliation profiles;
- established FPL tools, podcasts, analysts, and communities; and
- Wikidata `P2002` statements with the `P6552` X numeric-user-ID qualifier, used only as secondary identity metadata.

The current Premier League coverage is Arsenal, Aston Villa, Bournemouth, Brentford, Brighton, Chelsea, Coventry City, Crystal Palace, Everton, Fulham, Hull City, Ipswich Town, Leeds United, Liverpool, Manchester City, Manchester United, Newcastle United, Nottingham Forest, Sunderland, and Tottenham Hotspur. This was checked against the Premier League's [2026/27 club-kit list](https://www.premierleague.com/en/news/4672981/premier-league-club-kits-for-202627-season) and [promoted-club guide](https://www.premierleague.com/en/news/4365156/new-to-the-premier-league-heres-all-you-need-to-know).

The full universe is in [x-account-candidates.csv](./x-account-candidates.csv). Candidate inclusion means “worth comparing,” not “reliable,” “licensed,” or “recommended.” Accounts with an unresolved immutable identity are marked `needs_identity_review` and cannot advance to a pilot.

## Identity method

The canonical identity key is the immutable numeric X user ID. A handle is mutable display metadata.

Identity evidence has two separate parts:

1. public profile metadata or a Wikidata `P2002` statement carrying a `P6552` numeric-ID qualifier; and
2. an official club, publisher, employer, author, or creator-controlled page supporting the stated affiliation or ownership.

The identity evidence URL in the CSV supports affiliation; it is not evidence of posting accuracy or downstream rights. Handles, affiliations, and beats must be rechecked before FPL-80 and whenever a trigger in the CSV fires.

## Sampling and minimization

The reproducible collector is [research-x-accounts.mjs](../../scripts/research-x-accounts.mjs). It is intentionally narrow:

- no authentication, cookies, private accounts, direct messages, search endpoint, browser session, or unofficial FPL endpoint;
- one public profile at a time with a 250 ms minimum delay;
- immediate global stop after HTTP `429`;
- at most 25 public items per profile and a 90-day window;
- raw profile responses and post bodies exist only in process memory and are discarded;
- no post body is printed, logged, written to disk, committed, or sent to an external model; and
- retained observations are account/post IDs, canonical URLs, dates, deterministic keyword categories, and aggregate counts.

The recorded access string is descriptive, not a legal conclusion. The exact X access method remains `terms_review_required`; runtime use remains disabled. The run respects [PUBLIC_SOURCE_RESEARCH.md](../PUBLIC_SOURCE_RESEARCH.md), [NEWS_SOURCE_COMPLIANCE.md](../NEWS_SOURCE_COMPLIANCE.md), and [DATA_PROVENANCE.md](../DATA_PROVENANCE.md).

## Classification

The local classifier records only broad research categories:

- `availability`: explicit availability, injury, fitness, return, training, suspension, press-conference, or team-news language;
- `lineup`: starting team, squad, bench, rest, or rotation language;
- `transfer`: signing, loan, contract, bid, or transfer language;
- `fpl`: explicit FPL, chip, ownership, price, captaincy, or expected-points language; and
- `suspension`: card, ban, or suspension language.

Keyword matches indicate possible relevance, not truth, diagnosis, authority, or a player-health conclusion. Item-level content classification into `official_fact`, `reporting`, `analysis`, `prediction`, or `rumour` remains unavailable when the content sample cannot be lawfully and reliably reviewed.

## Scoring interpretation

The CSV implements the FPL-76 100-point model:

| Component                                      | Maximum | Recorded interpretation                                                                                                                                                                                                 |
| ---------------------------------------------- | ------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FPL relevance and materiality                  |      20 | Source-role prior adjusted by the proportion of locally classified relevant items.                                                                                                                                      |
| Historical verifiability and observed accuracy |      20 | `20` only for the account's own official organizational statements; `0` for non-official accounts until five claims are independently reviewed. This does not mean official statements are always complete or reusable. |
| Timeliness                                     |      15 | Conservative activity-sample proxy, capped at `10`; no comparative latency points are awarded.                                                                                                                          |
| Directness                                     |      15 | Role-based proximity: official account, reporter, specialist synthesis, creator analysis, or publisher.                                                                                                                 |
| Uniqueness                                     |      10 | Expected incremental role contribution, not a measured exclusivity claim.                                                                                                                                               |
| Consistency and coverage                       |      10 | Observed sample size proxy.                                                                                                                                                                                             |
| Correction and transparency                    |       5 | Only explicit correction-language observations; absence is not interpreted as poor behavior.                                                                                                                            |
| Signal-to-noise and classification suitability |       5 | Proportion of broad keyword-relevant items in the observed sample.                                                                                                                                                      |

`conservative_total_score_100` is therefore a lower-bound research score, not a reliability probability. A zero can mean “not evidenced,” not “demonstrably poor.” The shortlist is coverage-constrained and must not be sorted into an automated reputation tier from this score.

## Shortlist coverage

The exact shortlist is in [x-account-shortlist.csv](./x-account-shortlist.csv).

| Required role                                       | Count | Coverage decision                                                                                                                                                |
| --------------------------------------------------- | ----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current club accounts                               |    20 | One official account for every 2026/27 Premier League club.                                                                                                      |
| Premier League, Official FPL, and PL communications |     3 | League/game facts plus formal communications.                                                                                                                    |
| Reporters                                           |    12 | National coverage plus reporters spanning Aston Villa, Bournemouth, Brighton, Chelsea, Coventry, Crystal Palace, Everton, Fulham, Hull, Ipswich, and Sunderland. |
| Dedicated availability specialists                  |     5 | Injury, press-conference, lineup, and price-status synthesis.                                                                                                    |
| FPL creators                                        |    10 | Editorial team news, live-state data, projections, podcasts, and individual analysis.                                                                            |

Fantasy Football Scout overlaps the creator and availability/news-specialist requirements, yielding six availability-oriented sources without adding a 51st row.

## Correlation and corroboration risks

- Official club, reporter, specialist, and creator posts can all originate from one press conference. They are one evidence chain unless independent sourcing is shown.
- Reporter accounts can repeat colleagues or employer desks. A named byline does not prove original reporting.
- Availability sites and FPL editorial accounts often summarize official updates. Their speed and convenience do not raise source authority.
- FPL podcasts and creators frequently discuss the same models, bookmakers, and community reports. Consensus can be correlated analysis rather than corroboration.
- Transfer specialists are intentionally underweighted for availability decisions because transfer volume can dominate the feed and add deadline noise.

Any later ingestion design must preserve upstream attribution and an explicit `correlation_group` so repetitions do not increase confidence automatically.

## Gaps and re-review triggers

The following block any reliability or runtime decision:

- unresolved immutable IDs or affiliation evidence;
- fewer than 20 relevant items in the permitted sample;
- fewer than five independently verifiable claims for a non-official account;
- no measured earliest-source latency;
- no deletion, correction, or material-change history;
- an X terms, access-product, pricing, API, or compliance-path change;
- a handle, owner, employer, club beat, or editorial-policy change;
- inactivity, takeover, impersonation, or a material reliability incident;
- a change in intended use, retention, display, commercial environment, health-data handling, or external processor; or
- any move from internal research to a pilot or product source.

FPL-80 must resolve pilot identities and account-level source policies. It must not interpret this research artifact as approval to obtain credentials, incur spend, retrieve posts, or enable a source.

## Reproduction

From the repository root, using the pinned Node.js runtime:

```bash
node scripts/research-x-accounts.mjs --offline
pnpm check
```

The offline command regenerates the two CSV files from the content-free metadata cache. Live X access is disabled by default. It requires both `--live-x` and `--confirm-x-research-access-reviewed` after a current access-method and terms review; this document does not supply that review or approval. A permitted live rerun can change observations because profiles, handles, public availability, and rate-limit state change. Review the diff; do not treat generated changes as automatically trustworthy.
