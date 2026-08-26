# Independent pull-request review

Status: active process specification; reviewer activation pending owner action

Owning issue: FPL-83

Related issue: FPL-63 owns the consequential branch-protection decision

Reviewed: 2026-08-26

## Purpose

Every merge needs a review pass that is genuinely distinct from implementation
and self-review. This document defines valid reviewers, required evidence,
least-privilege choices, stale-review handling, and the relationship between
independent review, GitHub enforcement, and explicit owner merge approval.

It does not add a collaborator, enable a paid service, authorize an independent
agent, configure branch protection, or approve any merge.

## Current repository evidence

The FPL Intelligence repository is a public, user-owned GitHub repository. As
observed on 2026-08-26:

- `matluniewski` is the only collaborator and has `admin` permission;
- `main` has no classic branch protection;
- the repository has no rulesets;
- PR #43, PR #47, and PR #48 have no submitted independent reviews; and
- requesting `@copilot` and `copilot-pull-request-reviewer[bot]` on PR #43 did
  not create a review request or submitted review.

Consequently, the repository currently has no actor that can demonstrate the
FPL-83 acceptance criterion. Green CI and an owner's merge instruction do not
substitute for independent review.

## Separate gates

These gates answer different questions and must not be collapsed:

1. **Self-review:** did the implementation agent inspect its complete final
   diff against the issue and project constraints?
2. **Independent review:** did a distinct reviewer inspect the exact final head
   commit and record findings or a no-findings result?
3. **Automated verification:** did required CI and applicable external checks
   pass?
4. **Owner decision:** did the owner explicitly authorize this exact merge and
   any consequential decisions it contains?
5. **Platform enforcement:** does GitHub permit the merge under current branch
   rules, permissions, review state, and status checks?

Passing one gate is not evidence for another. Owner approval remains mandatory
even if a human or automated reviewer approves. A GitHub `APPROVED` review does
not authorize a product, provider, cost, privacy, security, deployment, or merge
decision reserved to the owner.

## Independence requirements

A review is independent only when all conditions hold:

- the reviewer is a different human or a separately invoked and explicitly
  approved review tool/agent, not the implementation agent continuing its own
  task;
- the reviewer did not author the material part of the reviewed diff;
- the review is anchored to the pull request's full head SHA and records the
  base ref/SHA;
- the reviewer reads the owning Linear issue, repository instructions, final
  diff, tests, documentation, and applicable design/provider/privacy evidence;
- the review searches for defects and scope gaps rather than merely summarizing
  the pull request or CI;
- findings, including a valid no-findings result, are recorded in GitHub or in a
  durable linked review artifact;
- the implementation agent cannot edit the reviewer's original record;
- every material finding has a resolution, explicit owner acceptance, or
  follow-up issue before merge; and
- a new material commit after review invalidates the review until the new head
  is reviewed.

Starting a new prompt, restating the self-review, changing model temperature,
or asking the same implementation execution to “review independently” does not
create independence.

## Valid evidence record

The pull request must record:

| Field             | Requirement                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| Reviewer type     | `human_github`, `github_copilot`, or `independent_codex_task`                                    |
| Reviewer identity | GitHub login or immutable Codex task/thread ID                                                   |
| Review record     | GitHub review URL or immutable linked task artifact                                              |
| Reviewed head     | Full 40-character commit SHA                                                                     |
| Reviewed base     | Base branch and base SHA                                                                         |
| Scope             | Owning Linear issue and acceptance criteria plus security/privacy/provider/design areas reviewed |
| Outcome           | `findings`, `no_findings`, or `unable_to_complete`; never infer approval from silence            |
| Findings          | Severity, rationale, tight file/line anchor where applicable, and required action                |
| Resolution        | Fix commit, documented rejection with owner acceptance, or follow-up Linear issue                |
| Re-review         | Reviewer confirmation on the new head when material code or policy changes follow                |
| Timestamp         | UTC submission time                                                                              |

The implementation agent copies only a summary and links the immutable original.
It must not submit an `APPROVE` review under the pull-request author's GitHub
identity or present its own comment as an independent record.

## Reviewer mechanisms

### 1. Named human reviewer with public/read access

A distinct GitHub user may inspect the public repository and submit a GitHub
review without receiving push authority. If direct review assignment or private
coordination requires explicit repository access, grant only `read` permission.

**Authority:** no write or merge permission. This is the least-privilege human
option.

**Enforcement:** the review is a project workflow gate, but an approval from a
reviewer without `write` permission does not satisfy a GitHub branch rule that
requires an approving review from a write-authorized user.

**Disposition:** preferred when a trusted human is available and process-level
enforcement is acceptable. The owner must nominate the GitHub login before any
invitation or external coordination.

### 2. Named human reviewer with write access

GitHub branch protection can require one approving review from a person with
`write` permission. On a user-owned repository, this is the smallest native
role that can provide an approval counted by required-review protection.

**Authority:** write permission also grants capabilities beyond review. Main
must therefore be protected, administrators must not bypass the rule, direct
pushes/force-pushes/deletions must be blocked, stale approvals must be
dismissed, and the most recent reviewable push must be approved by someone
other than its author.

**Enforcement:** strongest native GitHub gate, but it expands external authority
and can deadlock delivery if the sole reviewer is unavailable.

**Disposition:** eligible only after the owner nominates a trusted person,
approves the authority expansion, and FPL-63 safely configures and verifies the
branch rule. Do not add a collaborator or require an approval before a second
authorized reviewer exists.

### 3. GitHub Copilot code review

GitHub documents that Copilot submits a `Comment` review, not `Approve` or
`Request changes`. Its review therefore does not count toward a required
approval and cannot block merging. It can still be a distinct recorded quality
review if the project explicitly approves it, it reviews the final head, and
all findings are handled.

Copilot review availability depends on an applicable plan/policy. Automatic
repository reviews are configured through a ruleset and may consume AI credits
or GitHub Actions minutes. The prior request on PR #43 did not produce a review,
so availability is not demonstrated for this repository.

**Authority:** review comments only; no repository write is needed for the
review itself.

**Enforcement:** process-level only. It cannot satisfy GitHub's required human
approval.

**Disposition:** eligible only after the owner approves any plan/cost and
repository policy, the feature is enabled, and a trial review on a non-production
PR proves the exact evidence record. A request with no submitted review is not
evidence.

### 4. Independent Codex review task

A separately invoked Codex task may review a fixed pull-request head with
read-only repository access. It must receive the issue, instructions, head/base
SHAs, and required review schema; it must return findings without modifying the
branch. The task ID and immutable final output are linked from the pull request
and Linear. The implementation task may then address findings but may not alter
the original review record.

**Authority:** read-only repository inspection; no GitHub, Linear, branch,
provider, deployment, secret, or merge mutations by the reviewer.

**Enforcement:** process-level only unless a separate GitHub App identity later
submits the review. It does not count as a GitHub required approval.

**Disposition:** the lowest-authority automated option available to the current
workflow, but repository policy requires the owner to explicitly request use of
a subagent/independent task. No such authorization has been received in FPL-83.

## Recommended staged mechanism

### Immediate project gate

Use one of these explicitly owner-activated reviewers:

1. a named human with public/read access; or
2. a read-only independent Codex review task.

The reviewer examines the final SHA and produces the evidence record above. The
implementation agent resolves findings, reruns affected checks, and requests a
re-review after material changes. The owner then separately decides whether to
merge.

This unblocks quality review without granting push, merge, secret, provider, or
deployment authority.

### Future native enforcement

FPL-63 may add branch protection only after the owner approves its exact rule
and a non-author reviewer exists. The decision package should evaluate:

- require a pull request for `main`;
- require the existing CI status checks;
- require all conversations to be resolved;
- block force pushes and deletion;
- apply rules to administrators with no routine bypass;
- dismiss stale approvals and require approval of the latest reviewable push;
- require one approval only if a trusted write-authorized human is available;
  and
- document an emergency recovery path that requires explicit owner action and
  leaves an audit record.

Do not enable a required approval while the repository has only the PR author as
an authorized reviewer; that would create a predictable deadlock rather than a
quality control.

## Review workflow

1. Freeze the candidate head SHA after local self-review and green CI.
2. Mark the Linear issue `In Review` and keep the pull request draft until the
   reviewer is activated.
3. Give the reviewer the issue, repository instructions, final diff, test
   evidence, and relevant canonical documents.
4. Receive and link the immutable review record.
5. Triage every finding as actionable, not applicable with evidence, or deferred
   to a named Linear issue.
6. Fix actionable findings and rerun the narrowest affected checks followed by
   the required final checks.
7. If the head changes materially, request review of the new SHA.
8. When review evidence, CI, and acceptance criteria are complete, mark the PR
   ready and request explicit owner merge approval.
9. Immediately before merge, verify the reviewed head is still the current head
   and no material discussion is unresolved.

## Failure and fallback

- No reviewer available: keep the issue/PR in review and continue only unrelated
  unblocked work.
- Review tool request produces no submitted review: record the attempt; it does
  not satisfy the gate.
- Reviewer cannot inspect the full diff or required context: outcome is
  `unable_to_complete`; select another approved reviewer.
- Reviewer becomes unavailable after requesting changes: do not dismiss or
  override material findings merely to merge. Obtain a new independent review
  or explicit owner acceptance where project policy allows it.
- New commit after review: review is stale until the new head is covered.
- Urgent work: urgency does not implicitly waive review or owner merge approval.
  Any exception requires a separate explicit owner decision and a documented
  risk/recovery plan.

## Activation still required

FPL-83 is not complete until one of the immediate mechanisms is explicitly
activated and validated on an existing non-production pull request. The owner
must provide either:

- a nominated GitHub reviewer and approved access level; or
- explicit authorization to create a read-only independent Codex review task.

Silence authorizes neither. PR #43, PR #47, and PR #48 remain unreviewed until a
distinct review record exists for their current head SHAs.

## Primary sources

- [GitHub: About pull request reviews](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/about-pull-request-reviews)
- [GitHub: About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub: Managing a branch protection rule](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule)
- [GitHub: Pull request review permissions](https://docs.github.com/en/pull-requests/reference/pull-request-reviews)
- [GitHub: Using Copilot code review](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/copilot-code-review)
- [GitHub: Configuring automatic Copilot review](https://docs.github.com/en/copilot/how-tos/copilot-on-github/set-up-copilot/configure-automatic-review)
