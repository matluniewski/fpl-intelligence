import { describe, expect, it } from "vitest";

import { createVersion } from "./primitives";
import {
  createClaim,
  createEvidence,
  createNewsSignal,
  createPlayerAvailabilityState,
  createRawNewsItem,
  validateClaimCandidate,
} from "./news-intelligence-factory";
import type { NewsContractError } from "./news-intelligence";
import {
  SYNTHETIC_AVAILABILITY_STATE,
  SYNTHETIC_CLAIM,
  SYNTHETIC_EVIDENCE,
  SYNTHETIC_RAW_NEWS_ITEM,
  SYNTHETIC_SIGNAL,
} from "./testing/synthetic-news-intelligence";

describe("news intelligence contracts", () => {
  it("keeps raw content optional and policy metadata durable", () => {
    const item = createRawNewsItem(SYNTHETIC_RAW_NEWS_ITEM);
    expect(item.contentReference.availability).toBe("not_retained");
    expect(item.contentPolicy?.retention).toBe("blocked");
    expect(item.policyState).toBe("permitted");
    expect(item.provenanceRefs).not.toHaveLength(0);
  });

  it("represents unreviewed content permissions as blocked", () => {
    const withoutPolicy = { ...SYNTHETIC_RAW_NEWS_ITEM };
    delete withoutPolicy.contentPolicy;
    expect(createRawNewsItem(withoutPolicy)).toMatchObject({
      contentPolicy: null,
      policyState: "blocked",
    });
  });

  it("prevents retained content without affirmative retention permission", () => {
    expect(() =>
      createRawNewsItem({
        ...SYNTHETIC_RAW_NEWS_ITEM,
        contentReference: {
          availability: "retained_reference",
          locator: "synthetic:item",
        },
      }),
    ).toThrowError(
      expect.objectContaining<Partial<NewsContractError>>({
        issues: expect.arrayContaining([
          expect.objectContaining({ code: "content_policy_violation" }),
        ]),
      }),
    );
  });

  it("runtime-validates an untrusted extraction candidate", () => {
    expect(
      validateClaimCandidate({
        claimType: "availability",
        assertedState: "available",
        directness: "explicit_quote",
        certainty: "high",
        sourceType: "official_club",
      }),
    ).toMatchObject({ success: true });
    expect(
      validateClaimCandidate({
        claimType: "invented",
        assertedState: "",
        directness: "guess",
      }),
    ).toMatchObject({
      success: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "invalid_value" }),
      ]),
    });
  });

  it("rejects extraction timestamps without an explicit UTC offset", () => {
    expect(
      validateClaimCandidate({
        claimType: "availability",
        assertedState: "available",
        directness: "direct_report",
        certainty: "medium",
        sourceType: "official_club",
        eventTime: "2026-08-18 12:00" as never,
      }),
    ).toMatchObject({
      success: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "invalid_value", path: "eventTime" }),
      ]),
    });
  });

  it("rejects generated prose and unknown availability assertion states", () => {
    expect(
      validateClaimCandidate({
        claimType: "availability",
        assertedState: "Probably out for the weekend",
        directness: "speculation",
        certainty: "low",
        sourceType: "publisher",
      }),
    ).toMatchObject({ success: false });
    expect(
      validateClaimCandidate({
        claimType: "availability",
        assertedState: "maybe_available",
        directness: "inference",
        certainty: "low",
        sourceType: "journalist",
      }),
    ).toMatchObject({ success: false });
  });

  it("keeps a validated claim unresolved rather than treating extraction as truth", () => {
    expect(
      createClaim(SYNTHETIC_CLAIM, {
        rawNewsItem: createRawNewsItem(SYNTHETIC_RAW_NEWS_ITEM),
      }),
    ).toMatchObject({
      resolutionState: "unresolved",
      extraction: { method: "deterministic_rule" },
    });
  });

  it("requires full model-assisted extraction lineage", () => {
    expect(() =>
      createClaim(
        {
          ...SYNTHETIC_CLAIM,
          extraction: {
            method: "model_assisted",
            implementationVersion: createVersion("1"),
            schemaVersion: createVersion("1"),
          },
        },
        { rawNewsItem: createRawNewsItem(SYNTHETIC_RAW_NEWS_ITEM) },
      ),
    ).toThrowError(
      expect.objectContaining<Partial<NewsContractError>>({
        issues: expect.arrayContaining([
          expect.objectContaining({ code: "lineage_missing" }),
        ]),
      }),
    );
  });

  it("prevents a policy-blocked raw item from becoming a Claim", () => {
    const withoutPolicy = { ...SYNTHETIC_RAW_NEWS_ITEM };
    delete withoutPolicy.contentPolicy;
    expect(() =>
      createClaim(SYNTHETIC_CLAIM, {
        rawNewsItem: createRawNewsItem(withoutPolicy),
      }),
    ).toThrowError(
      expect.objectContaining<Partial<NewsContractError>>({
        issues: expect.arrayContaining([
          expect.objectContaining({ code: "content_policy_violation" }),
        ]),
      }),
    );
  });

  it("requires reviewed external-processing permission for model assistance", () => {
    const rawNewsItem = createRawNewsItem({
      ...SYNTHETIC_RAW_NEWS_ITEM,
      contentPolicy: {
        ...SYNTHETIC_RAW_NEWS_ITEM.contentPolicy!,
        externalProcessing: "blocked",
      },
    });
    expect(() =>
      createClaim(
        {
          ...SYNTHETIC_CLAIM,
          extraction: {
            method: "model_assisted",
            implementationVersion: createVersion("1"),
            schemaVersion: createVersion("1"),
            modelVersion: createVersion("synthetic-model-1"),
            promptVersion: createVersion("synthetic-prompt-1"),
          },
        },
        { rawNewsItem },
      ),
    ).toThrowError(
      expect.objectContaining<Partial<NewsContractError>>({
        issues: expect.arrayContaining([
          expect.objectContaining({ code: "content_policy_violation" }),
        ]),
      }),
    );
  });

  it("allows contradictory evidence to coexist as separate records", () => {
    const supporting = createEvidence(SYNTHETIC_EVIDENCE);
    const contradicting = createEvidence({
      ...SYNTHETIC_EVIDENCE,
      stance: "contradicts",
    });
    expect([supporting.stance, contradicting.stance]).toEqual([
      "supports",
      "contradicts",
    ]);
  });

  it("requires evidence-reference metadata without retaining raw content", () => {
    expect(() =>
      createEvidence({
        ...SYNTHETIC_EVIDENCE,
        reference: { kind: "source_reference" },
      }),
    ).toThrowError(
      expect.objectContaining<Partial<NewsContractError>>({
        issues: expect.arrayContaining([
          expect.objectContaining({ code: "empty_value" }),
        ]),
      }),
    );
  });

  it("orders evidence timestamps", () => {
    expect(() =>
      createEvidence({
        ...SYNTHETIC_EVIDENCE,
        observedAt: "2026-08-19T00:00:00.000Z" as never,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<NewsContractError>>({
        issues: expect.arrayContaining([
          expect.objectContaining({ code: "time_invalid" }),
        ]),
      }),
    );
  });

  it("represents unresolved conflict without premature truth selection", () => {
    const signal = createNewsSignal(SYNTHETIC_SIGNAL);
    expect(signal.conflictState).toBe("unresolved_conflict");
    expect(signal.claimRefs).toHaveLength(2);
    expect(signal.evidenceRefs).toHaveLength(2);
  });

  it("requires signal evidence and claim lineage", () => {
    expect(() =>
      createNewsSignal({ ...SYNTHETIC_SIGNAL, evidenceRefs: [] }),
    ).toThrowError(
      expect.objectContaining<Partial<NewsContractError>>({
        issues: expect.arrayContaining([
          expect.objectContaining({ code: "lineage_missing" }),
        ]),
      }),
    );
  });

  it("produces provider-independent projection-facing availability state", () => {
    const state = createPlayerAvailabilityState(SYNTHETIC_AVAILABILITY_STATE);
    expect(state).toMatchObject({
      availability: "doubtful",
      expectedStartProbability: 0.5,
      expectedMinutes: 45,
    });
    expect("providerId" in state).toBe(false);
  });

  it("validates availability probabilities and minutes", () => {
    expect(() =>
      createPlayerAvailabilityState({
        ...SYNTHETIC_AVAILABILITY_STATE,
        expectedMinutes: 91,
        expectedStartProbability: 1.1,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<NewsContractError>>({
        issues: expect.arrayContaining([
          expect.objectContaining({ code: "invalid_value" }),
        ]),
      }),
    );
  });

  it("does not read the machine clock", () => {
    expect(createNewsSignal(SYNTHETIC_SIGNAL).evaluatedAt).toBe(
      SYNTHETIC_SIGNAL.evaluatedAt,
    );
  });
});
