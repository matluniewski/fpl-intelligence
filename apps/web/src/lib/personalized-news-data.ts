import type {
  NewsRelevanceRecord,
  Recommendation,
} from "@fpl-intelligence/domain";

export type NewsScreenState =
  "current" | "loading" | "empty" | "stale" | "partial" | "quarantined";

export interface PersonalizedNewsItem {
  readonly player: string;
  readonly playerId: NewsRelevanceRecord["playerId"];
  readonly relevance: readonly NewsRelevanceRecord["reasons"][number][];
  readonly recommendationId: Recommendation["recommendationId"];
  readonly before: {
    readonly recommendation: "HOLD" | "WAIT" | "SELL";
    readonly expectedMinutes: number;
    readonly confidence: "High" | "Medium" | "Low";
  };
  readonly after: {
    readonly recommendation: "HOLD" | "WAIT" | "SELL";
    readonly expectedMinutes: number;
    readonly confidence: "High" | "Medium" | "Low";
  };
  readonly summary: string;
  readonly sourceTier: string;
  readonly observedAt: string;
  readonly evidence: string;
  readonly conflict: "None" | "Review" | "Unresolved";
}

export interface PersonalizedNewsScreenData {
  readonly evaluatedAt: string;
  readonly items: readonly PersonalizedNewsItem[];
}

/**
 * Presentation-only synthetic data. Production data must arrive through
 * provider-independent relevance and recommendation contracts, never from UI fetching.
 */
export const personalizedNewsData: PersonalizedNewsScreenData = {
  evaluatedAt: "12 minutes ago",
  items: [
    {
      player: "Gvardiol",
      playerId: "player:gvardiol" as NewsRelevanceRecord["playerId"],
      relevance: ["squad_member"],
      recommendationId:
        "recommendation:gvardiol" as Recommendation["recommendationId"],
      before: {
        recommendation: "HOLD",
        expectedMinutes: 82,
        confidence: "High",
      },
      after: {
        recommendation: "WAIT",
        expectedMinutes: 54,
        confidence: "Medium",
      },
      summary: "Availability evidence changed the current recommendation.",
      sourceTier: "Tier 2 · club reporter",
      observedAt: "8 minutes ago",
      evidence:
        "One independent supporting reference; no official confirmation.",
      conflict: "Review",
    },
    {
      player: "Palmer",
      playerId: "player:palmer" as NewsRelevanceRecord["playerId"],
      relevance: ["squad_member", "strategic_player"],
      recommendationId:
        "recommendation:palmer" as Recommendation["recommendationId"],
      before: {
        recommendation: "HOLD",
        expectedMinutes: 79,
        confidence: "Medium",
      },
      after: { recommendation: "WAIT", expectedMinutes: 79, confidence: "Low" },
      summary:
        "Availability reports conflict; no automatic recommendation action is safe.",
      sourceTier: "Tier 2 · two permitted sources",
      observedAt: "6 minutes ago",
      evidence:
        "Claims disagree. Compare provenance, tier and freshness before acting.",
      conflict: "Unresolved",
    },
    {
      player: "Watkins",
      playerId: "player:watkins" as NewsRelevanceRecord["playerId"],
      relevance: ["watchlist_member"],
      recommendationId:
        "recommendation:watkins" as Recommendation["recommendationId"],
      before: {
        recommendation: "HOLD",
        expectedMinutes: 78,
        confidence: "Medium",
      },
      after: {
        recommendation: "HOLD",
        expectedMinutes: 79,
        confidence: "Medium",
      },
      summary:
        "New training information is visible, but it is below the decision threshold.",
      sourceTier: "Tier 2 · training report",
      observedAt: "6 minutes ago",
      evidence:
        "No independent corroboration yet; projected impact is unchanged.",
      conflict: "None",
    },
  ],
};

export function stateMessage(state: NewsScreenState): string {
  const messages: Record<Exclude<NewsScreenState, "current">, string> = {
    loading:
      "Comparing new evidence. Your last confirmed decisions remain visible.",
    empty: "No relevant changes. Unrelated football news is not included here.",
    stale:
      "Recommendations need a refresh. The last successful evaluation is shown.",
    partial: "Coverage is reduced because one permitted source is unavailable.",
    quarantined:
      "Evidence is quarantined because identity or policy checks are unresolved.",
  };
  return state === "current" ? "" : messages[state];
}
