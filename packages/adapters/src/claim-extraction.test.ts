import {
  createRawNewsItem,
  createUtcInstant,
  createVersion,
} from "@fpl-intelligence/domain";
import {
  SYNTHETIC_PROVENANCE,
  SYNTHETIC_REFERENCE_DATA,
} from "@fpl-intelligence/domain/testing";
import { SYNTHETIC_RAW_NEWS_ITEM } from "@fpl-intelligence/domain/testing/news-intelligence";
import { describe, expect, it } from "vitest";

import { ClaimExtractionPipeline } from "./claim-extraction";

const NOW = createUtcInstant("2026-08-20T00:00:00Z");
const rawNewsItem = createRawNewsItem(SYNTHETIC_RAW_NEWS_ITEM);
const extraction = Object.freeze({
  method: "deterministic_rule" as const,
  implementationVersion: createVersion("test-1"),
  schemaVersion: createVersion("test-1"),
});
const input = Object.freeze({
  rawNewsItem,
  referenceData: SYNTHETIC_REFERENCE_DATA,
  requestedAt: NOW,
  extractedAt: NOW,
  extraction,
  provenanceRefs: [SYNTHETIC_PROVENANCE.provenanceId],
});

describe("ClaimExtractionPipeline", () => {
  it("creates unresolved Claim and Evidence only after validation and identity resolution", async () => {
    const result = await new ClaimExtractionPipeline({
      extract: async () => ({
        subjectName: SYNTHETIC_REFERENCE_DATA.players[0]!.displayName,
        claimType: "availability",
        assertedState: "available",
        directness: "direct_report",
        certainty: "medium",
        sourceType: "official_club",
        evidence: { kind: "source_reference", locator: "synthetic:claim" },
      }),
    }).extract(input);
    expect(result).toMatchObject({
      kind: "accepted",
      claim: { resolutionState: "unresolved" },
      evidence: { stance: "supports" },
    });
  });

  it("quarantines malformed model output and unresolved identity", async () => {
    const malformed = await new ClaimExtractionPipeline({
      extract: async () => ({ invented: true }),
    }).extract(input);
    expect(malformed).toEqual({
      kind: "quarantined",
      reason: "model_output_invalid",
    });
    const unresolved = await new ClaimExtractionPipeline({
      extract: async () => ({
        subjectName: "No matching player",
        claimType: "availability",
        assertedState: "available",
        directness: "direct_report",
        certainty: "medium",
        sourceType: "official_club",
        evidence: { kind: "source_reference", locator: "synthetic:claim" },
      }),
    }).extract(input);
    expect(unresolved).toEqual({
      kind: "quarantined",
      reason: "identity_not_found",
    });
  });

  it("preserves speculation as unresolved and quarantines model failures", async () => {
    const speculative = await new ClaimExtractionPipeline({
      extract: async () => ({
        subjectName: SYNTHETIC_REFERENCE_DATA.players[0]!.displayName,
        claimType: "availability",
        assertedState: "doubtful",
        directness: "speculation",
        certainty: "low",
        sourceType: "journalist",
        evidence: { kind: "content_unavailable" },
      }),
    }).extract(input);
    expect(speculative).toMatchObject({
      kind: "accepted",
      claim: { directness: "speculation", resolutionState: "unresolved" },
    });
    const failed = await new ClaimExtractionPipeline({
      extract: async () => Promise.reject(new Error("adapter unavailable")),
    }).extract(input);
    expect(failed).toEqual({ kind: "quarantined", reason: "model_failure" });
  });

  it("quarantines ambiguous player identities instead of guessing", async () => {
    const player = SYNTHETIC_REFERENCE_DATA.players[0]!;
    const ambiguousReferenceData = {
      ...SYNTHETIC_REFERENCE_DATA,
      players: [
        player,
        {
          ...SYNTHETIC_REFERENCE_DATA.players[1]!,
          displayName: player.displayName,
        },
      ],
    };
    const result = await new ClaimExtractionPipeline({
      extract: async () => ({
        subjectName: player.displayName,
        claimType: "availability",
        assertedState: "available",
        directness: "direct_report",
        certainty: "medium",
        sourceType: "official_club",
        evidence: { kind: "source_reference", locator: "synthetic:claim" },
      }),
    }).extract({ ...input, referenceData: ambiguousReferenceData });
    expect(result).toEqual({
      kind: "quarantined",
      reason: "identity_ambiguous",
    });
  });

  it("processes each candidate in a multi-player output independently", async () => {
    const events: unknown[] = [];
    const pipeline = new ClaimExtractionPipeline(
      {
        extract: async () => [
          {
            subjectName: SYNTHETIC_REFERENCE_DATA.players[0]!.displayName,
            claimType: "availability",
            assertedState: "available",
            directness: "direct_report",
            certainty: "medium",
            sourceType: "official_club",
            evidence: { kind: "source_reference", locator: "synthetic:one" },
          },
          { malformed: true },
        ],
      },
      {
        record: async (event) => {
          events.push(event);
        },
      },
    );
    await expect(
      pipeline.extractMany({
        ...input,
        extractionRunId: "synthetic-run",
        providerRef: "synthetic-model",
      }),
    ).resolves.toMatchObject([
      { kind: "accepted" },
      { kind: "quarantined", reason: "model_output_invalid" },
    ]);
    expect(events).toEqual([
      expect.objectContaining({
        providerRef: "synthetic-model",
        candidatesReturned: 2,
        candidatesAccepted: 1,
        candidatesQuarantined: 1,
      }),
    ]);
    expect(JSON.stringify(events)).not.toContain("synthetic:one");
  });
});
