# MVP Validation Preflight

Status: Stage 0 synthetic preflight

Owner: FPL-75

Last updated: 2026-08-25

## Purpose

This is the executable preflight for the protocol in [VALIDATION.md](./VALIDATION.md). It evaluates the measurement method only; it neither enables a live source nor authorizes a pilot, external processing, public release, analytics, or FPL account action.

Run `pnpm validation:preflight` to verify the versioned synthetic corpus. The corpus has 50 cases: 10 relevant material changes, 10 justified non-changes, 10 irrelevant items, 8 duplicates, 6 stale items, and 6 unresolved conflicts. Each case retains only synthetic snapshot, signal, provenance, timestamp, materiality, and model/rule/data-version references. It contains no raw source content, screenshots, credentials, cookies, participant identifiers, or personal data.

## Registered evaluation rules

| Rule           | Version                      | Initial Stage 0 value                                                                                                                                             |
| -------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Materiality    | `validation-materiality-1`   | 15 minutes expected-minutes, 15 percentage-points start probability, 1.0 next-GW / 2.0 horizon projected points, action/confidence change, or unresolved conflict |
| Source policy  | `synthetic-source-policy-1`  | synthetic permitted evidence only; no live provider                                                                                                               |
| Recency        | `validation-recency-1`       | stale evidence must remain visible and cannot silently produce a material change                                                                                  |
| Impact model   | `synthetic-impact-model-1`   | fixed deterministic comparison at the same cutoff                                                                                                                 |
| Rules          | `synthetic-rules-1`          | project-authored synthetic rules                                                                                                                                  |
| Reference data | `synthetic-reference-data-1` | project-authored synthetic reference data                                                                                                                         |

The corpus exercises `correct`, `incorrect`, and `withheld` adjudications. `withheld` is required for an unresolved conflict; two material-change negative controls are `incorrect`. A justified unchanged result is a valid outcome and must retain its reason code.

## Content-minimized scorecard

| Measure                        | Source and calculation                                                | Retention owner                                          | Prohibited data                       |
| ------------------------------ | --------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------- |
| Important-signal recall        | adjudicated in-scope cases detected / all adjudicated important cases | research owner; approved retention decision before pilot | raw source text, participant identity |
| Supported-claim precision      | supported adjudicated claims / all claims marked supported            | research owner                                           | raw provider payloads, credentials    |
| Duplicate/no-value rate        | duplicate or no-new-value outcomes / delivered outcomes               | research owner                                           | behavioral tracking payloads          |
| Material-impact classification | expected outcome compared with deterministic paired result            | recommendation owner                                     | screenshots, raw content              |
| Withheld-conflict handling     | unresolved conflicts withheld / unresolved conflicts                  | evidence owner                                           | cookies, account tokens               |
| Recommendation utility         | structured useful response / completed eligible observations          | research owner                                           | free-form unnecessary personal data   |
| Comprehension                  | correct structured explanation / completed comprehension prompts      | research owner                                           | recordings unless separately approved |

Aggregation uses counts, numerator, denominator, rate, threshold, and pass/fail/withheld status. Never aggregate a missing denominator as a pass. Keep participant-level records pseudonymous and separate the lookup key from the scorecard.

## Protected research log schema

The later consented-pilot log may contain only: `researchSubjectId` (random pseudonym), consent-version reference, session date, elapsed-time band, task outcome, correction-count band, structured score responses, recommendation intent category, snapshot/signal/evidence/provenance references, timestamps, materiality/adjudication result, categorized failure, and model/prompt/rule/data versions.

Before any record is collected, the research owner must document the approved purpose, retention deadline, deletion operator, access roles, and separation of the pseudonym lookup key. Raw screenshots, screenshot derivatives, credentials, cookies, tokens, raw provider content, account action proof, and unnecessary free text are prohibited. Access is limited to named research operators and the deletion operator; no analytics provider or shared support workspace is permitted.

## Stage gates

| Stage                       | Required evidence before start                                                                                              | Decision owner                               | Current state |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------- |
| 1: moderated onboarding     | approved Figma states, FPL-57 upload/retention controls, approved consent/research-log decision                             | product and privacy owner                    | blocked       |
| 2: shadow evaluation        | FPL-74 complete, explicit source allowlist and rights/external-processing decision, operational retention/deletion controls | product, compliance, and source-policy owner | blocked       |
| 3: consented deadline pilot | Stage 1/2 evidence, approved consent, protected log access/retention, approved delivery channel                             | product and privacy owner                    | blocked       |

The preflight result is pass only when `pnpm validation:preflight` succeeds. It does not clear any listed gate.
