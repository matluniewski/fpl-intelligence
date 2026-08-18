# Architecture Decision Records

Architecture decision records (ADRs) document consequential technical choices for FPL Intelligence. They preserve the context, considered alternatives, trade-offs, and consequences behind a decision that would otherwise be difficult to reconstruct from code or Linear history.

## When to create an ADR

Create an ADR when an approved issue must make a decision that is costly to reverse or materially affects multiple components, data boundaries, security/privacy posture, compliance, operating cost, or provider portability.

Typical subjects include:

- hosting and deployment topology;
- managed PostgreSQL or other infrastructure providers;
- authentication and identity;
- screenshot/vision processing mode and provider;
- LLM provider or routing strategy;
- live football, FPL, or news data providers;
- scheduling, queues, observability, and analytics;
- retention or encryption architecture; and
- an officially permitted FPL action integration.

Do not choose a provider before the owning issue requires the decision. An ADR records an approved decision; it does not manufacture urgency for one.

## Lifecycle

Use these statuses:

- `Proposed`: under review and not authorized for implementation.
- `Accepted`: approved and authoritative.
- `Superseded`: replaced by a later ADR, linked in both records.
- `Deprecated`: retained for history but no longer applicable.

Name records sequentially:

```text
0001-short-decision-title.md
```

Link the owning Linear issue and any required product, Figma, privacy, compliance, security, or cost evidence. A material change to an accepted decision requires a new ADR that supersedes the old one; do not rewrite history.

## Template

```markdown
# ADR-NNNN: Decision title

Status: Proposed

Date: YYYY-MM-DD

Owners: FPL-<issue>

## Context

What decision is required, why it is required now, and which constraints apply?

## Decision drivers

- Driver

## Options considered

### Option A

Summary, benefits, costs, risks, and evidence.

### Option B

Summary, benefits, costs, risks, and evidence.

## Decision

State the selected option and its approved scope.

## Consequences

### Positive

- Consequence

### Negative or accepted trade-offs

- Consequence

## Security, privacy, compliance, and cost impact

Record applicable data flows, retention, access, provider terms, threat changes, fixed/variable cost, and review gates.

## Verification and rollback

How will the decision be tested, observed, reviewed, and reversed or migrated if necessary?

## References

- Linear issue
- Supporting project documentation
```

No consequential provider or hosting decision has been made by FPL-13.
