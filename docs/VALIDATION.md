# FPL Intelligence MVP Validation Plan

Status: Initial validation protocol

Owner: FPL-54

Last updated: 2026-08-18

## 1. Purpose

This document defines how FPL Intelligence will test the Personalized FPL News Intelligence MVP before investing in a broader optimizer or SaaS platform.

The plan tests one central proposition:

> Can we save an FPL manager from manually monitoring news and reliably explain when new information changes what they should do?

The validation approach is deliberately lean. It may use moderated prototypes, a controlled historical dataset, manually operated research workflows, and a small consented pilot. It does not authorize production analytics infrastructure, billing, automated FPL actions, broad data collection, or use of an external source whose terms have not been reviewed.

The product definition and MVP boundary are owned by [PRODUCT.md](./PRODUCT.md).

## 2. Decisions this plan must support

The evidence must support one of three decisions:

- **Continue:** the personalized news-to-decision workflow demonstrates useful, trusted value and is ready for the next scoped investment.
- **Change:** the proposition shows value, but a specific bottleneck, audience, workflow, source strategy, or recommendation surface must change before further investment.
- **Stop or pivot:** the core proposition does not demonstrate sufficient value after one focused remediation cycle, or a required data/compliance path has no viable replaceable alternative.

The plan does not use vanity metrics such as total ingested items, total extracted claims, or generic page views as evidence of product value.

## 3. Validation principles

1. Pre-register definitions and thresholds before observing pilot results.
2. Do not change a threshold retrospectively to turn a failed hypothesis into a pass.
3. Separate usability, source coverage, evidence quality, recommendation utility, trust, time saved, and distribution.
4. Compare baseline and news-adjusted decisions at the same information cutoff.
5. Record both recommendation changes and justified non-changes.
6. Treat participant self-report, observed behavior, expert adjudication, and realized outcomes as different evidence types.
7. Prefer a small amount of high-quality, reviewable evidence over broad telemetry.
8. Minimize participant and provider data from the beginning.
9. Do not treat an LLM output, engagement metric, or realized football outcome as a standalone source of truth.
10. Record negative findings and failure modes, not only successful examples.

## 4. Target cohort

### Participant profile

The initial cohort should contain engaged FPL managers who:

- actively manage an existing team;
- normally check at least two football-news, club, reporter, or FPL sources before deadlines;
- make or consider transfers, captaincy, or lineup decisions based on late information;
- are willing to confirm a team manually and execute any decision in official FPL themselves; and
- are not members of the implementation team.

### Cohort size

- Recruit 10-15 participants for the pilot.
- Use at least 8 completed sessions for moderated import and comprehension findings.
- Seek at least 10 participants with observations across two consecutive relevant deadlines for behavioral and time-saved findings.
- Treat results as directional product evidence, not statistically representative market proof.

If fewer than 8 suitable participants complete the pilot, report the evidence as incomplete rather than lowering the denominator.

### Excluded research populations

- Users asked to provide FPL credentials, session cookies, or direct account access.
- Users whose participation would require unapproved collection or processing of personal data.
- Participants recruited through a source or redistribution method that has not been approved.

## 5. Validation stages

### Stage 0: preflight and adjudicated dataset

Before participant testing:

1. Define the supported screenshot layouts and manual-entry fields.
2. Assemble a small synthetic, redacted, or consented screenshot test set.
3. Assemble an adjudicated set of at least 50 permitted historical source items, including clear claims, irrelevant items, duplicate reports, stale reports, and contradictions.
4. Record expected entities, claims, evidence links, materiality, and availability outcomes for each test case.
5. Register the initial source tiers, recency rules, and material-change thresholds.
6. Resolve or explicitly gate all processing that depends on FPL-45, FPL-44, or FPL-57.

Stage 0 validates the measurement method and safety boundaries. Passing it does not validate user value.

### Stage 1: moderated onboarding and comprehension

Run individual sessions using approved Figma designs or a constrained prototype:

1. Ask the participant to establish a team using screenshot-first onboarding.
2. Observe errors, corrections, uncertainty, abandonment, and fallback behavior.
3. Repeat or recover through complete manual entry where needed.
4. Show representative changed, unchanged, and conflicting-evidence recommendation states.
5. Ask comprehension questions before inviting an opinion.
6. Compare a concise recommendation alone with the same recommendation plus evidence and confidence.

No production analytics stack is required. A consented research note and a structured scorecard are sufficient.

### Stage 2: shadow news evaluation

For at least two relevant deadline cycles:

1. Monitor only the approved curated source set.
2. Build a time-stamped reference log of important items independently of user alerts.
3. Run extraction, evidence resolution, relevance matching, and recommendation comparison in shadow mode.
4. Review misses, false alerts, duplicates, conflicts, stale signals, and latency after each cycle.
5. Do not notify users until the research operator has verified that the workflow and source use are permitted and safe.

This stage tests coverage and system behavior without relying on user engagement.

### Stage 3: consented deadline pilot

For participants with a confirmed `TeamState`:

1. Deliver only squad/watchlist-relevant updates through the approved research channel.
2. Ask the participant whether they already knew the information and when they discovered it.
3. Capture whether the recommendation changed, remained unchanged, or was withheld because evidence was insufficient.
4. Capture comprehension, usefulness, confidence, and intended manual action using a minimal structured response.
5. After the deadline, ask for time-saved and trust feedback.
6. Do not request proof of official account actions unless a separate consented research need is approved.

### Stage 4: synthesis and decision

1. Calculate the pre-registered measures.
2. Review every guardrail failure and every high-impact false alert individually.
3. Separate product failure from provider, extraction, evidence, recommendation, and distribution failure.
4. Produce a short evidence report with passes, failures, uncertainty, and recommended decision.
5. Create follow-up Linear issues for accepted changes; do not silently expand an implementation issue.

## 6. Operational definitions

### Confirmed team

A `TeamState` is confirmed when the participant has reviewed player identities and all fields required by the supported decision, corrected any extraction errors, and explicitly accepted the normalized result.

### Important signal

An item is an important signal when an adjudicator determines, without seeing the product result, that a reasonable engaged manager would want it considered before the relevant deadline because it could affect availability, expected minutes, captaincy, lineup, or a supported transfer decision.

### Relevant signal

A signal is relevant when it concerns a current squad player, an explicitly supported watchlist player, or a player present in a recommendation being evaluated. Generic popularity alone does not make a signal relevant in the MVP.

### False or irrelevant alert

An alert is false or irrelevant when it is unsupported by its cited evidence, refers to the wrong entity, is materially stale without a warning, duplicates an already understood update without new value, or has no reasonable relationship to the participant's supported decision context.

### Material decision impact

News has a material decision impact when at least one of the following occurs relative to the paired baseline at the same cutoff:

- the recommended action category changes, such as `HOLD` to `WAIT` or `WAIT` to `SELL`;
- the selected transfer, captain, starter, or bench action changes within the supported recommendation set;
- expected minutes change by at least 15 minutes;
- estimated start probability changes by at least 15 percentage points;
- projected points change by at least 1.0 for the next gameweek or 2.0 over the supported horizon;
- recommendation confidence crosses a pre-defined low/medium/high boundary; or
- conflicting evidence causes a recommendation to be withheld.

These numerical thresholds are initial research definitions, not permanent product rules. They may be revised before a new study begins, with the new version recorded.

### Timely detection

Detection latency is measured from the permitted source's recorded publication or availability timestamp to creation of a valid structured claim. Notification latency is measured separately from valid claim creation to the participant-facing update.

### Recommendation acceptance

Acceptance means the participant states that they intend to follow the recommendation or records `Approve plan` inside the research prototype. It does not prove that the official FPL action occurred and must not trigger account automation.

## 7. Paired baseline and news-adjusted comparison

Every evaluated recommendation change must use a reproducible pair:

### Baseline snapshot

- confirmed `TeamState` at a recorded cutoff;
- the same football, fixture, price, and model inputs used by the adjusted snapshot;
- no `NewsSignal` published after the previous recommendation cutoff;
- model and rule version recorded.

### News-adjusted snapshot

- the same cutoff and non-news inputs as the baseline;
- only the valid `NewsSignal` records available by the evaluation cutoff;
- source, claim, evidence, freshness, and confidence references recorded;
- the same model and rule version as the baseline.

### Comparison record

The paired record contains only what is needed to explain:

- which inputs changed;
- which recommendation fields changed;
- whether the change met the materiality definition;
- which evidence caused the change;
- whether an adjudicator considers the changed or unchanged result justified; and
- whether the participant understood and valued the result.

A favorable realized outcome does not retroactively make a poorly supported recommendation correct. Likewise, an unfavorable football outcome does not by itself invalidate a sound probabilistic decision.

## 8. Hypotheses, methods, and thresholds

### H1: squad import and confirmation are usable

**Hypothesis:** Target users can establish an accurate confirmed `TeamState` without direct FPL integration and can recover through manual entry when extraction fails.

**Method:** Moderated task with at least 8 participants, using their own consented/redacted screenshot where approved or a representative test screenshot. Observe screenshot flow, correction, missing-state entry, and manual fallback.

**Pass thresholds:**

- at least 80% confirm an accurate team through screenshot-first onboarding within 5 minutes without moderator correction;
- median confirmed player-identity corrections are no more than 2 per imported team;
- 100% of participants can complete the manual fallback within 10 minutes when asked;
- zero unresolved wrong-player identities remain after explicit user confirmation; and
- at least 80% rate the effort 5 or higher on a 7-point ease scale.

**Guardrail:** A screenshot must never become the durable team source of truth, and failure must never require credentials or a manager entry ID.

### H2: delivered news is personally relevant

**Hypothesis:** A squad/watchlist-filtered change summary is substantially more relevant than a generic feed.

**Method:** During the pilot, ask participants to label every delivered update as relevant, marginal, or irrelevant and state why. In moderated testing, compare a personalized summary with a generic set containing the same source universe.

**Pass thresholds:**

- at least 75% of delivered updates are rated relevant;
- no more than 15% are rated irrelevant;
- duplicate or no-new-information alerts remain below 10%; and
- at least 70% of participants prefer the personalized summary to the generic feed.

**Guardrail:** The system must not improve relevance artificially by hiding material negative findings or notifying only when a recommendation changes.

### H3: important signals are found early enough

**Hypothesis:** The curated monitoring workflow identifies most important permitted-source signals with enough lead time to assist a deadline decision.

**Method:** Compare shadow and pilot outputs with the independently adjudicated reference log. Record source publication, valid claim creation, recommendation evaluation, participant delivery, and self-reported prior discovery times separately.

**Pass thresholds:**

- recall of important in-scope signals is at least 85%;
- supported-claim precision is at least 95%;
- median detection latency is within the configured monitoring interval plus 5 minutes;
- at least 90% of detected important signals are evaluated for decision impact before the relevant deadline; and
- at least 40% of participants receive at least one useful material signal before discovering it elsewhere during a two-deadline pilot.

**Guardrail:** A source that is fast but not permitted, attributable, or reliable does not count toward success.

### H4: users understand recommendation impact

**Hypothesis:** Users can correctly explain whether new information changed a decision and identify the main causal reason.

**Method:** Show changed, unchanged, and conflicting-evidence scenarios. Ask the participant, without leading prompts, to state the current action, what changed, why, and what uncertainty remains.

**Pass thresholds:**

- at least 85% correctly identify whether the recommendation changed;
- at least 80% correctly identify the primary changed input and supporting evidence;
- at least 75% can name the most important uncertainty or risk; and
- median time to a correct explanation is no more than 90 seconds.

**Guardrail:** A participant who repeats interface wording without understanding the action or uncertainty is not counted as comprehending it.

### H5: evidence and confidence improve calibrated trust

**Hypothesis:** Showing evidence, source context, freshness, conflict, and confidence increases justified trust without creating false certainty.

**Method:** Use a within-participant paired comparison: recommendation and short reason only versus the same recommendation with evidence and confidence. Include one high-confidence, one low-confidence, and one contradictory scenario. Reverse presentation order across sessions.

**Pass thresholds:**

- at least 70% say the evidence view makes the recommendation easier to judge;
- mean trustworthiness improves by at least 0.8 on a 7-point scale;
- at least 80% distinguish high-confidence from unresolved evidence correctly;
- no more than 10% interpret a low-confidence recommendation as verified fact; and
- 100% of material claims shown in the test have a reviewable evidence reference.

**Guardrail:** Higher trust is not a success if comprehension of uncertainty decreases.

### H6: the workflow saves deadline preparation time

**Hypothesis:** Personalized monitoring reduces the time users spend searching for relevant news before a deadline.

**Method:** Establish a self-reported baseline for the participant's normal monitoring process, then collect a short time diary during two pilot deadlines and a post-deadline interview. Treat self-report as approximate and triangulate it with observed product use where consented.

**Pass thresholds:**

- median reported monitoring time falls by at least 30% or 15 minutes per deadline, whichever is easier for the participant to estimate reliably;
- at least 60% of participants report a meaningful time saving;
- at least 70% agree at 5 or higher on a 7-point scale that the product reduced the need to check multiple sources; and
- relevance and important-signal recall remain above their own pass thresholds.

**Guardrail:** Time saved by missing important information or suppressing uncertainty is a failure, not a success.

### H7: users will follow useful recommendations manually

**Hypothesis:** When a supported recommendation is relevant and understandable, users are willing to accept it and execute any action themselves in official FPL.

**Method:** Capture intended action for each material recommendation, confidence in that choice, reason for acceptance or rejection, and whether manual handoff is understood. Do not automate or require proof of the official action.

**Pass thresholds:**

- at least 50% of actionable recommendations are accepted or explicitly selected as the participant's intended plan;
- at least 70% of participants correctly understand that `Approve plan` does not change their official team;
- at least 70% rate at least one recommendation 5 or higher on a 7-point usefulness scale; and
- rejection reasons identify a correctable product or model issue in fewer than half of rejected high-confidence recommendations.

**Guardrail:** Acceptance rate must not be increased through misleading certainty, hidden alternatives, or friction in rejecting a plan.

## 9. Evidence-quality scorecard

Evidence quality is evaluated independently of user engagement on the adjudicated dataset.

| Measure | Initial pass threshold |
| --- | --- |
| Player/entity identity precision | At least 98% |
| Supported-claim precision | At least 95% |
| Important material-claim recall | At least 85% |
| Material claims with evidence reference | 100% |
| Unsupported assertion rate | No more than 2% |
| Duplicate items suppressed or linked | At least 95% |
| Explicit contradiction cases preserved | 100% of adjudicated test cases |
| Expired/stale test signals not presented as current | 100% |

Failures must be attributed to ingestion, deduplication, entity resolution, extraction, evidence resolution, expiry, or presentation. A combined score must not hide a severe failure in one stage.

## 10. Recommendation-utility scorecard

Recommendation utility is evaluated using paired snapshots and participant review.

| Measure | Initial pass threshold |
| --- | --- |
| Correct changed-versus-unchanged classification against adjudication | At least 85% |
| Material changes with an explicit causal explanation | 100% |
| Justified non-changes rated useful or reassuring | At least 60% |
| High-impact false recommendation changes | No more than 1 during the pilot, with mandatory review |
| Conflicting evidence represented without false resolution | 100% of adjudicated conflict cases |
| Recommendation snapshots reproducible from recorded inputs/version | 100% of sampled cases |

The goal is not to maximize the number of recommendation changes. A justified `unchanged` or `insufficient evidence` result can be valuable.

## 11. Distribution and commercial-interest risk

Distribution is measured separately so a useful workflow is not mistaken for a viable acquisition channel.

### Distribution hypothesis

**Hypothesis:** The target profile can be recruited and retained for repeated deadline use without paid acquisition infrastructure.

**Method:** Recruit through no more than three documented, permitted channels and track invitation, eligibility, first-session completion, and two-deadline participation manually.

**Pass thresholds:**

- recruit at least 10 eligible participants within 3 weeks;
- at least 70% of eligible recruits complete onboarding;
- at least 60% participate across two relevant deadlines; and
- at least 30% voluntarily refer another suitable manager or request continued access.

Failure here is a distribution finding, not automatic proof that recommendation quality failed.

### Willingness-to-pay research

Willingness to pay may be explored through interviews only. No billing, checkout, pricing page, subscription record, entitlement system, or payment provider is authorized.

Ask after the participant has experienced the workflow:

- what they would use if the product disappeared;
- which existing paid or unpaid tool it could replace;
- which outcome would make it worth paying for;
- whether they would consider paying, and at what self-selected range; and
- what would prevent payment.

An initial positive signal requires at least 30% of completed participants to express credible non-zero willingness to pay and identify a concrete value or existing substitute cost. Treat polite interest without a reason, price, commitment, or substitute as weak evidence.

## 12. Minimal research record

The validation can be run with a protected research log rather than production analytics. Use pseudonymous participant identifiers.

### Required participant-level fields

- participant identifier and cohort eligibility;
- consent version and session dates;
- task completion and elapsed-time bands;
- correction counts and failure categories;
- structured relevance, comprehension, usefulness, trust, and time-saved responses;
- recommendation intent and categorized rejection reason; and
- optional interview notes stripped of unnecessary personal details.

### Required system/evaluation fields

- source and provider reference where permitted;
- publication, ingestion, claim, evaluation, and delivery timestamps;
- claim/evidence/signal identifiers and versions;
- baseline and news-adjusted recommendation snapshot identifiers;
- materiality and adjudication result;
- error/failure category; and
- model, prompt, rule, and data-version identifiers needed for reproducibility.

### Data that must not be collected for this plan

- FPL credentials, session cookies, or account-control tokens;
- unnecessary screenshot content or screenshots retained beyond the approved flow;
- full raw provider content when a permitted reference or minimal excerpt is sufficient;
- inferred sensitive data unrelated to the decision-support purpose;
- broad cross-site behavioral tracking;
- payment details; or
- proof of official FPL actions without a separately approved research purpose.

## 13. Privacy, retention, and compliance prerequisites

- FPL-57 defines screenshot upload, processing, abandonment, confirmation, and deletion requirements.
- FPL-44 defines public-beta privacy, terms, retention, analytics, and cookie readiness.
- FPL-45 determines which `NewsSource` providers and AI-processing paths are permitted.
- Unknown provider or privacy terms are blockers for the affected data path, not assumptions.
- Consent language must distinguish product research from public product operation.
- Research logs must exclude image content, credentials, and unnecessary personal information.
- Retention periods and deletion ownership must be recorded before the consented pilot begins.
- Any incentive must not depend on accepting a recommendation or reporting a positive result.

This plan does not make a legal conclusion and does not replace qualified privacy or provider review.

## 14. Decision framework

### Continue

Recommend continued MVP investment only when:

- H2 relevance, H3 important-signal detection, H4 comprehension, and H6 time saved all pass;
- at least 5 of H1-H7 pass overall;
- the evidence-quality and recommendation-utility guardrails have no unresolved severe failure;
- screenshot and provider processing used in the pilot comply with the approved constraints; and
- there is a credible remediation plan for every failed non-core hypothesis.

Continue does not authorize commercial release, billing, broad ingestion, authentication, or account automation.

### Change

Recommend a focused change when:

- at least two of H2, H3, H4, and H6 pass;
- qualitative evidence indicates the core value is present;
- the primary failure can be isolated to a correctable audience, import, source, evidence, recommendation, UX, or delivery bottleneck; and
- a single remediation cycle can test the proposed change without expanding the MVP broadly.

The change decision must name the failed hypothesis, proposed intervention, owner, and next threshold.

### Stop or pivot

Recommend stopping or materially pivoting the current proposition when:

- fewer than two of H2, H3, H4, and H6 pass after one focused remediation cycle;
- users do not value relevant timely signals even when comprehension is high;
- the workflow does not save time without sacrificing coverage;
- severe false-confidence or evidence-integrity failures cannot be reduced to the guardrail level; or
- required source rights or processing constraints have no viable replaceable path.

Do not continue solely because import works, users enjoy the interface, or some recommendations happen to produce favorable football outcomes.

## 15. Reporting template

The final validation report should contain:

1. cohort and protocol actually completed;
2. deviations from this plan and why they occurred;
3. results for H1-H7 with numerator, denominator, threshold, and pass/fail;
4. evidence-quality and recommendation-utility scorecards;
5. paired baseline/news-adjusted examples, including failures and justified non-changes;
6. privacy, retention, source, and data-quality incidents;
7. distribution and willingness-to-pay findings kept separate from product utility;
8. the largest product, technical, compliance, and trust risks observed;
9. a `continue`, `change`, or `stop/pivot` recommendation; and
10. the smallest set of follow-up Linear issues required by the evidence.

Raw research data must not be committed to the repository. The repository may contain the protocol, anonymized aggregate findings, and approved example cases only.
