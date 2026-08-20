# X API compliance research for the bounded news-signal proof of concept

Status: FPL-67 research baseline — not legal advice, provider approval,
credential provisioning, billing authorization, a commitment to spend, or
permission to retrieve X Content.

Reviewed: 2026-08-20 against the X Developer Agreement dated 2026-04-27 and
the current X Developer Policy.

## Decision summary

**FPL-67 remains blocked for runtime integration.** The official X API is the
only potentially eligible access route, but only after each condition below is
explicitly approved and evidenced. No official documentation reviewed here
authorizes sending X Content to an external LLM provider.

The project may prepare provider-independent, synthetic test doubles and the
bounded control-plane design. It must not create an X developer account,
subscribe, add payment details, obtain credentials, call an endpoint, select an
account, or collect posts until the blocking conditions are resolved.

## Findings

### Access and use-case approval

- X requires all new developers to apply for a developer account and provide a
  written intended use. The stated use is binding; a substantive change needs
  X approval before the new purpose begins.
- The license permits API integration and analysis only as explicitly approved
  by X. It is revocable, non-transferable and subject to the Developer Policy,
  restricted-use rules and display requirements.
- The current self-serve offering is advertised as usage-based. The Developer
  Agreement also describes recurring paid subscriptions, automatic renewal,
  non-refundable fees and possible taxes/surcharges. The effective billing
  model, country availability and exact resource prices must be captured in the
  account's payment portal before approval.

### Cost and budget

The public pricing page currently advertises USD 0.005 per Post read and USD
0.010 per User read, while warning that its calculator is informational and
actual bills may differ. At the advertised Post-read rate, the USD 15 ceiling
is only 3,000 Post reads before tax, User reads and any other charged resource.

Therefore FPL-67 cannot rely on a fixed monthly-fee assumption. Its first
implementation must refuse to start unless it can obtain an authoritative,
current price sheet and enforce a conservative pre-request credit reservation.
It must stop before a request could take estimated spend above USD 15 and alert
at USD 10. A price change, missing balance/usage signal or unavailable billing
API is a fail-closed condition.

### Storage, display, deletion and redistribution

- Stored X Content must be updated or deleted when it is changed, deleted,
  protected, suspended or withheld on X. X requires action as soon as
  reasonably possible and no later than 24 hours after a request by X or the
  affected account owner.
- On termination, all X Content and copies must be permanently deleted; X may
  request deletion evidence within 10 business days and may audit relevant
  records.
- Public display must preserve content integrity and use the current version.
  If content is no longer available through the API, it must be removed.
- Redistribution is restricted. The default safe hand-off is Post/User IDs for
  rehydration, not raw Post objects, datasets or copied content.

FPL-67 must not display raw posts, copied text, media, account profiles or
embeds in its first POC. A user-visible decision may refer to a source by
immutable Post ID, canonical URL, source category and retrieval time only if
the final display and derivative-summary treatment are approved against X's
current terms.

### LLM and analysis boundary

X explicitly prohibits using API/X Content to train or fine-tune a foundation
or frontier model. Its agreement permits analysis only as explicitly approved
by X, while redistribution restrictions apply to X Content and derivative
works. Sending raw content to an external LLM would disclose it to another
party and is not explicitly authorized by the materials reviewed.

The initial eligible design, if approved, is therefore:

- no external LLM receives raw X Content, account profile data or media;
- no model training, fine-tuning, embeddings or corpus creation;
- deterministic local classification only from a minimal, policy-approved
  representation; and
- any use of an external model requires prior written confirmation from X and
  a separate privacy/compliance approval.

This restriction is stricter than the existing generic claim-extraction path;
the X adapter must be isolated from it until written clearance exists.

### Identity and user-data boundaries

The allowlist may contain only organizations or public professional sources
with documented owner/affiliation evidence. Store the immutable X user ID as
the identity key; treat handles as mutable display metadata. Do not link an X
identity to a product user, manager TeamState, browser/device identifier or any
other off-X identity without the required express opt-in consent.

No protected account, Direct Message, geolocation field or engagement-based
profiling is in scope. Source tiering must rate publication provenance, not
infer sensitive traits about the person behind an account.

## Required approvals before credentials

1. **Use-case approval:** owner-approved wording for the X developer
   application, explicitly limited to at most 10 curated public accounts,
   read-only retrieval and the categories in FPL-67.
2. **Compliance approval:** confirm the no-raw-display, deletion, compliance
   event, privacy notice and off-X matching controls against the current X
   terms. Confirm the endpoint/tier needed to observe removals and whether
   compliance streams are available to the chosen access tier.
3. **LLM decision:** retain the default no-external-LLM rule or obtain written
   X approval and separate privacy approval for an alternative.
4. **Billing approval:** designate the legal billing owner; capture the live
   price sheet, tax treatment, automatic-renewal behavior and an enforceable
   USD 15 hard limit before a payment method is added.
5. **Secrets approval:** provision one credential in approved secret management
   with no repository, client-side or log exposure, plus a tested revocation
   procedure.

Any missing or changed approval disables the global X ingestion switch.

## Safe implementation sequence after approval

1. Implement the provider-independent policy gate, usage ledger, source
   allowlist and global/per-source kill switches using synthetic fixtures.
2. Add the X adapter with read-only calls, no search/backfill and a maximum of
   10 approved immutable user IDs.
3. Record minimal provenance and queue deletion/compliance handling before any
   decision signal is emitted.
4. Run a limited private evaluation with the USD 10 alert and USD 15 preflight
   cutoff verified using test doubles.
5. Reassess the policy, price and deletion evidence before broadening any
   source, retention, display or model-processing behavior.

## Primary sources

- [X Developer Agreement](https://docs.x.com/developer-terms/agreement)
- [X Developer Policy](https://docs.x.com/developer-terms/policy)
- [Restricted uses of the X API](https://docs.x.com/developer-terms/restricted-use-cases)
- [X Developer Platform pricing](https://developer.x.com/)
- [X compliance streams documentation](https://developer.x.com/content/developer-twitter/en/docs/twitter-api/compliance/streams/integrate/integrating-compliance-streams)
