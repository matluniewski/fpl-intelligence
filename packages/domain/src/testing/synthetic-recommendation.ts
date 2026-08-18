import {
  createRecommendationEvidenceId,
  createRecommendationId,
  createRecommendationOptionId,
  createTeamStateId,
} from "../identifiers";
import { createVersion } from "../primitives";
import { createGameweekId } from "../reference-data";
import type {
  CreateRecommendationInput,
  RecommendationEvidenceItem,
  RecommendationOptionInput,
} from "../recommendation";
import {
  SYNTHETIC_NOW,
  SYNTHETIC_PLAYERS,
  SYNTHETIC_PROVENANCE,
  SYNTHETIC_RULES,
  SYNTHETIC_SEASON_ID,
} from "./synthetic-fixtures";

export const SYNTHETIC_PROJECTION_EVIDENCE_ID = createRecommendationEvidenceId(
  "synthetic-projection-evidence",
);
export const SYNTHETIC_NEWS_SUPPORT_EVIDENCE_ID =
  createRecommendationEvidenceId("synthetic-news-support-evidence");
export const SYNTHETIC_NEWS_COUNTER_EVIDENCE_ID =
  createRecommendationEvidenceId("synthetic-news-counter-evidence");

const provenanceRefs = Object.freeze([SYNTHETIC_PROVENANCE.provenanceId]);
const sourceRefs = Object.freeze([
  SYNTHETIC_PROVENANCE.sourceChain[0]!.sourceId,
]);
const lineage = Object.freeze([
  Object.freeze({
    stage: "synthetic-normalization",
    version: createVersion("1"),
    inputProvenanceRefs: provenanceRefs,
  }),
]);

export const SYNTHETIC_RECOMMENDATION_EVIDENCE: readonly RecommendationEvidenceItem[] =
  Object.freeze([
    Object.freeze({
      evidenceId: SYNTHETIC_PROJECTION_EVIDENCE_ID,
      kind: "projection" as const,
      sourceRefs,
      observedAt: SYNTHETIC_NOW,
      ingestedAt: SYNTHETIC_NOW,
      provenanceRefs,
      transformationLineage: lineage,
      commercialUse: "permitted" as const,
      stance: "supports" as const,
    }),
    Object.freeze({
      evidenceId: SYNTHETIC_NEWS_SUPPORT_EVIDENCE_ID,
      kind: "news_signal" as const,
      sourceRefs,
      observedAt: SYNTHETIC_NOW,
      ingestedAt: SYNTHETIC_NOW,
      provenanceRefs,
      transformationLineage: lineage,
      commercialUse: "permitted" as const,
      stance: "supports" as const,
      conflictGroup: "synthetic-player-availability",
    }),
    Object.freeze({
      evidenceId: SYNTHETIC_NEWS_COUNTER_EVIDENCE_ID,
      kind: "news_signal" as const,
      sourceRefs,
      observedAt: SYNTHETIC_NOW,
      ingestedAt: SYNTHETIC_NOW,
      provenanceRefs,
      transformationLineage: lineage,
      commercialUse: "permitted" as const,
      stance: "contradicts" as const,
      conflictGroup: "synthetic-player-availability",
    }),
  ]);

const fromGameweek = createGameweekId(SYNTHETIC_SEASON_ID, 1);
const toGameweek = createGameweekId(SYNTHETIC_SEASON_ID, 3);

export const SYNTHETIC_TRANSFER_OPTION_ID = createRecommendationOptionId(
  "synthetic-transfer-option",
);
export const SYNTHETIC_ROLL_OPTION_ID = createRecommendationOptionId(
  "synthetic-roll-option",
);

export const SYNTHETIC_TRANSFER_OPTION: RecommendationOptionInput =
  Object.freeze({
    optionId: SYNTHETIC_TRANSFER_OPTION_ID,
    actions: Object.freeze([
      Object.freeze({
        kind: "transfer" as const,
        outPlayerId: SYNTHETIC_PLAYERS[12]!.id,
        inPlayerId: SYNTHETIC_PLAYERS[13]!.id,
        gameweekId: fromGameweek,
      }),
      Object.freeze({
        kind: "apply_points_hit" as const,
        points: 4,
        gameweekId: fromGameweek,
      }),
    ]),
    horizon: Object.freeze({ from: fromGameweek, to: toGameweek }),
    expectedImpact: Object.freeze({
      baselineExpectedPoints: 100,
      grossExpectedPoints: 108,
      pointCost: 4,
      netExpectedPoints: 104,
      deltaVsBaseline: 4,
    }),
    ranking: Object.freeze({
      value: 4,
      basisCode: "net_expected_points_gain",
      tieBreakKey: "01-transfer",
    }),
    assumptions: Object.freeze([
      Object.freeze({
        code: "expected_minutes_hold",
        description: "Synthetic expected-minutes assumption remains valid.",
        evidenceRefs: Object.freeze([SYNTHETIC_NEWS_SUPPORT_EVIDENCE_ID]),
      }),
    ]),
    constraints: Object.freeze([
      Object.freeze({
        code: "budget_and_transfer_rules",
        description: "Synthetic budget and transfer constraints are satisfied.",
        satisfied: true,
        binding: true,
      }),
    ]),
    risks: Object.freeze([
      Object.freeze({
        code: "availability_conflict",
        severity: "high" as const,
        description: "Synthetic availability evidence conflicts.",
        evidenceRefs: Object.freeze([
          SYNTHETIC_NEWS_SUPPORT_EVIDENCE_ID,
          SYNTHETIC_NEWS_COUNTER_EVIDENCE_ID,
        ]),
      }),
    ]),
    explanation: Object.freeze({
      summaryCode: "transfer_has_highest_net_value",
      reasonCodes: Object.freeze([
        "projection_gain_exceeds_hit",
        "risk_remains_material",
      ]),
      assumptionCodes: Object.freeze(["expected_minutes_hold"]),
      constraintCodes: Object.freeze(["budget_and_transfer_rules"]),
      riskCodes: Object.freeze(["availability_conflict"]),
      supportingEvidenceRefs: Object.freeze([
        SYNTHETIC_PROJECTION_EVIDENCE_ID,
        SYNTHETIC_NEWS_SUPPORT_EVIDENCE_ID,
      ]),
      counterEvidenceRefs: Object.freeze([SYNTHETIC_NEWS_COUNTER_EVIDENCE_ID]),
      materialChangeTriggers: Object.freeze([
        Object.freeze({
          code: "availability_state_changes",
          description:
            "A resolved availability conflict can change the preferred option.",
          evidenceRefs: Object.freeze([
            SYNTHETIC_NEWS_SUPPORT_EVIDENCE_ID,
            SYNTHETIC_NEWS_COUNTER_EVIDENCE_ID,
          ]),
        }),
      ]),
    }),
  });

export const SYNTHETIC_ROLL_OPTION: RecommendationOptionInput = Object.freeze({
  optionId: SYNTHETIC_ROLL_OPTION_ID,
  actions: Object.freeze([
    Object.freeze({
      kind: "roll_transfer" as const,
      gameweekId: fromGameweek,
    }),
  ]),
  horizon: Object.freeze({ from: fromGameweek, to: toGameweek }),
  expectedImpact: Object.freeze({
    baselineExpectedPoints: 100,
    grossExpectedPoints: 100,
    pointCost: 0,
    netExpectedPoints: 100,
    deltaVsBaseline: 0,
  }),
  ranking: Object.freeze({
    value: 0,
    basisCode: "net_expected_points_gain",
    tieBreakKey: "02-roll",
  }),
  assumptions: Object.freeze([
    Object.freeze({
      code: "retain_current_squad",
      description: "Synthetic current squad remains unchanged.",
      evidenceRefs: Object.freeze([SYNTHETIC_PROJECTION_EVIDENCE_ID]),
    }),
  ]),
  constraints: Object.freeze([
    Object.freeze({
      code: "roll_is_available",
      description: "Synthetic transfer can be rolled.",
      satisfied: true,
      binding: true,
    }),
  ]),
  risks: Object.freeze([
    Object.freeze({
      code: "foregone_projection_gain",
      severity: "medium" as const,
      description: "Rolling may forgo synthetic projected value.",
      evidenceRefs: Object.freeze([SYNTHETIC_PROJECTION_EVIDENCE_ID]),
    }),
  ]),
  explanation: Object.freeze({
    summaryCode: "roll_preserves_flexibility",
    reasonCodes: Object.freeze(["avoid_hit_and_retain_transfer"]),
    assumptionCodes: Object.freeze(["retain_current_squad"]),
    constraintCodes: Object.freeze(["roll_is_available"]),
    riskCodes: Object.freeze(["foregone_projection_gain"]),
    supportingEvidenceRefs: Object.freeze([SYNTHETIC_NEWS_COUNTER_EVIDENCE_ID]),
    counterEvidenceRefs: Object.freeze([SYNTHETIC_PROJECTION_EVIDENCE_ID]),
    materialChangeTriggers: Object.freeze([
      Object.freeze({
        code: "projection_gap_closes",
        description:
          "A smaller projection gap can make rolling the preferred option.",
        evidenceRefs: Object.freeze([SYNTHETIC_PROJECTION_EVIDENCE_ID]),
      }),
    ]),
  }),
});

export function createSyntheticRecommendationInput(): CreateRecommendationInput {
  return Object.freeze({
    recommendationId: createRecommendationId("synthetic-recommendation"),
    contractVersion: createVersion("1"),
    kind: "transfer_plan",
    teamStateId: createTeamStateId("synthetic-team-state"),
    rulesIdentity: SYNTHETIC_RULES.identity,
    generatedAt: SYNTHETIC_NOW,
    algorithm: Object.freeze({
      name: "synthetic-transfer-ranking",
      version: createVersion("1"),
    }),
    evidence: SYNTHETIC_RECOMMENDATION_EVIDENCE,
    confidence: Object.freeze({
      methodologyVersion: createVersion("1"),
      evaluatedAt: SYNTHETIC_NOW,
      factors: Object.freeze([
        Object.freeze({
          dimension: "projection_uncertainty" as const,
          confidenceBand: "high" as const,
          rationaleCode: "synthetic_projection_stable",
          evidenceRefs: Object.freeze([SYNTHETIC_PROJECTION_EVIDENCE_ID]),
        }),
        Object.freeze({
          dimension: "data_freshness" as const,
          confidenceBand: "high" as const,
          rationaleCode: "synthetic_inputs_current",
          evidenceRefs: Object.freeze([SYNTHETIC_PROJECTION_EVIDENCE_ID]),
        }),
        Object.freeze({
          dimension: "news_signal" as const,
          confidenceBand: "low" as const,
          rationaleCode: "synthetic_news_conflict",
          evidenceRefs: Object.freeze([
            SYNTHETIC_NEWS_SUPPORT_EVIDENCE_ID,
            SYNTHETIC_NEWS_COUNTER_EVIDENCE_ID,
          ]),
        }),
        Object.freeze({
          dimension: "scenario_sensitivity" as const,
          confidenceBand: "medium" as const,
          rationaleCode: "synthetic_option_sensitive_to_minutes",
          evidenceRefs: Object.freeze([SYNTHETIC_PROJECTION_EVIDENCE_ID]),
        }),
      ]),
    }),
    options: Object.freeze([SYNTHETIC_TRANSFER_OPTION, SYNTHETIC_ROLL_OPTION]),
  });
}
