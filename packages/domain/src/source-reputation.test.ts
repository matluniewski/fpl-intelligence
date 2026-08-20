import { describe, expect, it } from "vitest";
import { createSourceId } from "./identifiers";
import { createVersion } from "./primitives";
import {
  assessSourceReputation,
  createSourceReputationCatalog,
} from "./source-reputation";

const profile = (
  id: string,
  sourceType:
    "official_club" | "player_or_staff" | "journalist" | "licensed_aggregator",
  context: "general" | "club_specific" | "injury_availability",
  tier: "authoritative" | "trusted" | "standard",
) => ({
  sourceId: createSourceId(id),
  sourceType,
  contexts: [context] as const,
  tier,
  rationaleCode: `reviewed_${id}`,
  policyVersion: createVersion("policy-1"),
  reviewedAt: "2026-08-20T00:00:00.000Z" as never,
});
const catalog = createSourceReputationCatalog({
  version: createVersion("source-reputation-v1"),
  profiles: [
    profile(
      "official-club",
      "official_club",
      "injury_availability",
      "authoritative",
    ),
    profile(
      "manager",
      "player_or_staff",
      "injury_availability",
      "authoritative",
    ),
    profile("club-reporter", "journalist", "club_specific", "trusted"),
    profile("aggregator", "licensed_aggregator", "general", "standard"),
  ],
});

describe("source reputation", () => {
  it.each([
    ["official-club", "official_club", "injury_availability", "authoritative"],
    ["manager", "player_or_staff", "injury_availability", "authoritative"],
    ["club-reporter", "journalist", "club_specific", "trusted"],
    ["aggregator", "licensed_aggregator", "general", "standard"],
  ] as const)(
    "uses the reviewed tier for %s",
    (id, sourceType, context, tier) =>
      expect(
        assessSourceReputation({
          catalog,
          sourceId: createSourceId(id),
          sourceType,
          context,
        }),
      ).toMatchObject({ tier, contextMatched: true }),
  );
  it("uses a conservative fallback for unknown sources and context mismatches", () => {
    expect(
      assessSourceReputation({
        catalog,
        sourceId: createSourceId("unknown"),
        sourceType: "publisher",
        context: "general",
      }),
    ).toMatchObject({ tier: "conservative", contextMatched: false });
    expect(
      assessSourceReputation({
        catalog,
        sourceId: createSourceId("club-reporter"),
        sourceType: "journalist",
        context: "lineup_leak",
      }),
    ).toMatchObject({ tier: "conservative", contextMatched: false });
  });
});
