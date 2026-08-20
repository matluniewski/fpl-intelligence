# Development-only provider research

Status: FPL-66 research baseline — not a provider selection, procurement
decision, legal advice, or authorisation to create accounts, obtain credentials,
make API calls, or enable a runtime integration.

Reviewed: 2026-08-20

## Decision summary

Two candidates have published terms that can support a narrowly isolated,
development-only evaluation after a separately approved credential request:

1. **API-Football (API-Sports)** for general football reference and event data.
2. **NewsAPI Developer** for development-only testing of news-ingestion
   boundaries.

Neither candidate is approved for staging, production, public beta, commercial
use, FPL-specific data, or automatic promotion into a deployed product. No
candidate in this review resolves the Premier League/FPL commercial-rights gate
in `FPL_DATA_LICENSING.md`.

An API key is external authority and a secret. Creating an account, accepting
provider terms, obtaining a key, or making any request remains outside this
research issue and requires explicit approval.

## Minimum evaluation boundary

An approved follow-up evaluation must:

- use a provider-specific adapter behind existing provider-independent ports;
- keep the adapter disabled by default and limit it to a local development
  environment;
- apply a hard request quota below the provider allowance and record
  content-free usage/cost telemetry;
- retain only permitted, minimal normalized fields and preserve provider,
  retrieval time, source URL and policy version as provenance;
- not commit provider responses or article content as fixtures;
- provide an immediate kill switch; and
- end access and delete cached provider content when the evaluation ends or a
  provider term requires it.

## General football/reference data

| Candidate                 | Published evaluation evidence                                                                                                                                                                                                                                          | FPL fit                                                                                                                 | Decision                                                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API-Football (API-Sports) | Its published free plan advertises 100 requests/day and endpoints for fixtures, line-ups, injuries, player data and statistics. Its terms warn that use for fantasy-sports platforms may require additional rights-holder licences.                                    | Technically broad football coverage; does not establish any FPL-specific data right or Premier League commercial right. | **Eligible only for isolated local adapter evaluation after explicit credential approval.** Do not expose, publish, or use its data to support an FPL product. |
| football-data.org         | The free tier advertises Premier League fixtures, schedules and tables, with delayed scores and 10 calls/minute. Published pricing/coverage pages do not, by themselves, state the rights needed for this project's downstream display, persistence or LLM processing. | Limited baseline reference-data candidate; no FPL-specific state.                                                       | **Needs written clarification.** Do not obtain a key or integrate until the provider confirms the intended private prototype use and downstream restrictions.  |
| Sportmonks                | A free football plan exists, but its published free coverage is Scottish Premiership and Danish Superliga, not the English Premier League. Paid plans/trials are outside this no-spend research scope.                                                                 | Does not meet the EPL prototype need on the no-spend tier.                                                              | **Ineligible for the present no-spend evaluation.**                                                                                                            |

Primary sources: [API-Football plans](https://www.api-football.com/),
[API-Football terms](https://www.api-football.com/terms),
[football-data.org pricing](https://www.football-data.org/pricing),
[football-data.org coverage](https://www.football-data.org/coverage), and
[Sportmonks plans](https://www.sportmonks.com/soccer-data/).

## News and availability data

| Candidate                        | Published evaluation evidence                                                                                                                                                                                                                        | Project restriction                                                                                                                                                                                                                                                    | Decision                                                                                                                                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NewsAPI Developer                | Published terms allow development and testing only in a development environment, not staging or production (including internal). The plan provides delayed articles and 100 requests/day.                                                            | Returned third-party content may have separate rights; NewsAPI prohibits reproduction or republication of copyrighted material through its service. No full article text should be fetched, retained, displayed, or sent to an LLM without a source-specific approval. | **Eligible only to test a local ingestion boundary with metadata-only, short-lived synthetic/mocked handling after explicit credential approval.** It is not a permitted runtime news source. |
| Guardian Open Platform Developer | The provider advertises free, non-commercial developer access, but its current terms require deletion/replacement within 24 hours and expressly prohibit machine-learning, AI, text/data-mining, analysis, aggregation and use with AI technologies. | The project's planned claim-extraction and evidence workflow requires analysis and may use LLM processing.                                                                                                                                                             | **Ineligible for this project workflow.** It must not be used as a workaround for a news source or LLM input.                                                                                 |
| GNews                            | Published terms license access according to the subscription plan, but this review did not establish the exact free-plan retention, downstream display and external-LLM rights needed by the project.                                                | Unknown answers must block a source under `NEWS_SOURCE_COMPLIANCE.md`.                                                                                                                                                                                                 | **Needs written clarification.**                                                                                                                                                              |

Primary sources: [NewsAPI pricing](https://newsapi.org/pricing),
[NewsAPI terms](https://newsapi.org/terms),
[Guardian Open Platform access](https://open-platform.theguardian.com/access/),
[Guardian Open Platform terms](https://www.theguardian.com/open-platform/terms-and-conditions),
and [GNews terms](https://gnews.io/legal/terms-of-service).

## Open questions that block enablement

- Does API-Football grant a private developer sufficient rights for the exact
  Premier League data fields and internal prototype outputs proposed here?
- Can either qualifying news provider support retention, source attribution,
  deletion and external-LLM processing under the project's policy?
- What current-season/historical data is available on the free API-Football
  plan, and is the relevant Premier League coverage current?
- Which provider terms apply to derived projections, summaries and user-facing
  recommendations, even when raw data is not displayed?

The answer to any open question is `blocked`, never inferred from technical API
access or a free tier.

## Required next issue

Create one narrowly scoped follow-up issue per candidate before any account or
key is created. It must include the approved environment, fixed zero-spend
budget, key custody, request cap, retention/deletion behavior, provenance
mapping, kill switch, and a provider-terms review date. A production-provider
selection or any paid plan requires a separate approved decision and, where
consequential, an ADR.
