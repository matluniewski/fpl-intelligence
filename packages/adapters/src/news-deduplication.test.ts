import { createClaim, createRawNewsItem } from "@fpl-intelligence/domain";
import {
  SYNTHETIC_CLAIM,
  SYNTHETIC_RAW_NEWS_ITEM,
} from "@fpl-intelligence/domain/testing/news-intelligence";
import { describe, expect, it } from "vitest";

import {
  deduplicateClaims,
  deduplicateRawNewsItems,
} from "./news-deduplication";

const raw = createRawNewsItem(SYNTHETIC_RAW_NEWS_ITEM);
const claim = createClaim(SYNTHETIC_CLAIM, { rawNewsItem: raw });

describe("news deduplication", () => {
  it("groups exact repeated normalized items deterministically", () => {
    expect(deduplicateRawNewsItems([raw, raw])).toMatchObject([
      {
        canonicalRawNewsItemId: raw.rawNewsItemId,
        rawNewsItemIds: [raw.rawNewsItemId, raw.rawNewsItemId],
      },
    ]);
  });

  it("preserves independent sources while preventing syndicated repetition from inflating corroboration", () => {
    const dependent = {
      ...raw,
      rawNewsItemId: "synthetic-dependent" as typeof raw.rawNewsItemId,
    };
    const independent = {
      ...raw,
      rawNewsItemId: "synthetic-independent" as typeof raw.rawNewsItemId,
      sourceId: "synthetic-independent-source" as typeof raw.sourceId,
    };
    const dependentClaim = {
      ...claim,
      claimId: "dependent-claim" as typeof claim.claimId,
      rawNewsItemId: dependent.rawNewsItemId,
    };
    const independentClaim = {
      ...claim,
      claimId: "independent-claim" as typeof claim.claimId,
      rawNewsItemId: independent.rawNewsItemId,
    };
    expect(
      deduplicateClaims([
        { claim, rawNewsItem: raw },
        { claim: dependentClaim, rawNewsItem: dependent },
        { claim: independentClaim, rawNewsItem: independent },
      ])[0],
    ).toMatchObject({
      claimIds: [
        claim.claimId,
        dependentClaim.claimId,
        independentClaim.claimId,
      ].sort(),
      independentSourceCount: 2,
    });
  });

  it("keeps contradictory claims in separate groups", () => {
    const contrary = {
      ...claim,
      claimId: "contrary-claim" as typeof claim.claimId,
      assertedState: "unavailable",
    };
    expect(
      deduplicateClaims([
        { claim, rawNewsItem: raw },
        { claim: contrary, rawNewsItem: raw },
      ]),
    ).toHaveLength(2);
  });
});
