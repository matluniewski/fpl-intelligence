import { describe, expect, it } from "vitest";
import {
  createClaim,
  createClaimId,
  createEvidence,
  createEvidenceId,
  createRawNewsItem,
  createSourceReputationCatalog,
  createUtcInstant,
  createVersion,
  resolvePlayerEvidence,
} from ".";
import {
  SYNTHETIC_CLAIM,
  SYNTHETIC_EVIDENCE,
  SYNTHETIC_RAW_NEWS_ITEM,
} from "./testing/synthetic-news-intelligence";

const raw = createRawNewsItem(SYNTHETIC_RAW_NEWS_ITEM);
const playerId =
  SYNTHETIC_CLAIM.subject.kind === "player"
    ? SYNTHETIC_CLAIM.subject.playerId
    : (() => {
        throw new Error("Synthetic evidence fixture must target a player.");
      })();
const catalog = createSourceReputationCatalog({
  version: createVersion("evidence-catalog-1"),
  profiles: [
    {
      sourceId: raw.sourceId,
      sourceType: "official_club",
      contexts: ["injury_availability"],
      tier: "authoritative",
      rationaleCode: "reviewed_official_club",
      policyVersion: createVersion("policy-1"),
      reviewedAt: createUtcInstant("2026-08-18T11:00:00Z"),
    },
  ],
});
const rules = Object.freeze({
  name: "evidence-engine-v0",
  version: createVersion("1"),
  currentWithinMs: 6 * 60 * 60 * 1000,
  staleWithinMs: 24 * 60 * 60 * 1000,
  minimumResolvedScore: 6,
});

function entry(overrides: Partial<typeof SYNTHETIC_CLAIM> = {}) {
  const claim = createClaim(
    { ...SYNTHETIC_CLAIM, ...overrides },
    { rawNewsItem: raw },
  );
  const evidence = createEvidence({
    ...SYNTHETIC_EVIDENCE,
    claimId: claim.claimId,
    evidenceId: createEvidenceId(`evidence-${claim.claimId}`),
  });
  return {
    claim,
    evidence: [evidence],
    rawNewsItem: raw,
    independenceKey: `source:${claim.claimId}` as string,
  };
}

function resolve(
  entries: readonly ReturnType<typeof entry>[],
  evaluatedAt = "2026-08-18T12:00:00Z",
) {
  return resolvePlayerEvidence({
    playerId,
    context: "injury_availability",
    evaluatedAt: createUtcInstant(evaluatedAt),
    rules,
    sourceReputation: catalog,
    entries,
  });
}

describe("Evidence Engine v0", () => {
  it("resolves a current authoritative direct report without treating extraction as truth", () => {
    const result = resolve([entry()]);
    expect(result.signal).toMatchObject({
      state: "available",
      confidenceBand: "medium",
      freshness: "current",
      conflictState: "no_conflict",
    });
    expect(result.explanation).toContain("reviewed_official_club");
  });

  it("does not inflate confidence for dependent syndicated reports", () => {
    const first = entry();
    const duplicate = entry({ claimId: createClaimId("syndicated-claim") });
    const result = resolve([
      { ...first, independenceKey: "syndicated-group" },
      { ...duplicate, independenceKey: "syndicated-group" },
    ]);
    expect(result.explanation).toContain(
      "dependent_or_syndicated_report_not_counted",
    );
    expect(result.signal.confidenceBand).toBe("medium");
  });

  it("preserves contradictory claims as an explicit unresolved conflict", () => {
    const available = entry();
    const unavailable = entry({
      claimId: createClaimId("unavailable-claim"),
      assertedState: "unavailable",
    });
    const result = resolve([available, unavailable]);
    expect(result.signal).toMatchObject({
      state: "unknown",
      confidenceBand: "low",
      conflictState: "unresolved_conflict",
    });
    expect(result.availability.expectedMinutes).toBeNull();
  });

  it("uses conservative unknown output for stale evidence", () => {
    const result = resolve([entry()], "2026-08-20T12:00:00Z");
    expect(result.signal).toMatchObject({
      state: "unknown",
      freshness: "expired",
    });
    expect(result.explanation).toContain("expired_evidence");
  });

  it("keeps speculation and prohibited source contexts conservative", () => {
    const speculative = entry({
      claimId: createClaimId("speculative-claim"),
      directness: "speculation",
      certainty: "low",
    });
    const speculativeResult = resolve([speculative]);
    expect(speculativeResult.signal).toMatchObject({
      state: "unknown",
      confidenceBand: "low",
    });

    const prohibitedContextResult = resolvePlayerEvidence({
      playerId,
      context: "lineup_leak",
      evaluatedAt: createUtcInstant("2026-08-18T12:00:00Z"),
      rules,
      sourceReputation: catalog,
      entries: [entry()],
    });
    expect(prohibitedContextResult.signal.state).toBe("unknown");
    expect(prohibitedContextResult.explanation).toContain(
      "source_context_not_approved",
    );
  });
});
