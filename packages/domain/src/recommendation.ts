import type {
  PlayerId,
  ProvenanceId,
  RecommendationEvidenceId,
  RecommendationId,
  RecommendationOptionId,
  SourceId,
  TeamStateId,
} from "./identifiers";
import type { UtcInstant, Version } from "./primitives";
import type { CommercialUseClassification } from "./provenance";
import type { GameweekId, RulesIdentity } from "./reference-data";

export type RecommendationKind = "lineup" | "captaincy" | "transfer_plan";

/** Proposed actions are decision-support output only and have no execution API. */
export type ProposedFplAction =
  | {
      readonly kind: "select_starter";
      readonly playerId: PlayerId;
      readonly gameweekId: GameweekId;
    }
  | {
      readonly kind: "set_bench_order";
      readonly playerId: PlayerId;
      readonly order: number;
      readonly gameweekId: GameweekId;
    }
  | {
      readonly kind: "set_captain";
      readonly playerId: PlayerId;
      readonly gameweekId: GameweekId;
    }
  | {
      readonly kind: "set_vice_captain";
      readonly playerId: PlayerId;
      readonly gameweekId: GameweekId;
    }
  | {
      readonly kind: "transfer";
      readonly outPlayerId: PlayerId;
      readonly inPlayerId: PlayerId;
      readonly gameweekId: GameweekId;
    }
  | {
      readonly kind: "roll_transfer";
      readonly gameweekId: GameweekId;
    }
  | {
      readonly kind: "apply_points_hit";
      readonly points: number;
      readonly gameweekId: GameweekId;
    }
  | {
      readonly kind: "activate_chip";
      readonly chipId: string;
      readonly gameweekId: GameweekId;
    };

export interface RecommendationHorizon {
  readonly from: GameweekId;
  readonly to: GameweekId;
}

export interface RecommendationExpectedImpact {
  readonly baselineExpectedPoints: number;
  readonly grossExpectedPoints: number;
  readonly pointCost: number;
  readonly netExpectedPoints: number;
  readonly deltaVsBaseline: number;
}

export interface RecommendationAssumption {
  readonly code: string;
  readonly description: string;
  readonly evidenceRefs: readonly RecommendationEvidenceId[];
}

export interface RecommendationConstraint {
  readonly code: string;
  readonly description: string;
  readonly satisfied: boolean;
  readonly binding: boolean;
}

export interface RecommendationRisk {
  readonly code: string;
  readonly severity: "low" | "medium" | "high";
  readonly description: string;
  readonly evidenceRefs: readonly RecommendationEvidenceId[];
}

export interface RecommendationChangeTrigger {
  readonly code: string;
  readonly description: string;
  readonly evidenceRefs: readonly RecommendationEvidenceId[];
}

export interface RecommendationExplanation {
  readonly summaryCode: string;
  readonly reasonCodes: readonly string[];
  readonly assumptionCodes: readonly string[];
  readonly constraintCodes: readonly string[];
  readonly riskCodes: readonly string[];
  readonly supportingEvidenceRefs: readonly RecommendationEvidenceId[];
  readonly counterEvidenceRefs: readonly RecommendationEvidenceId[];
  readonly materialChangeTriggers: readonly RecommendationChangeTrigger[];
}

export interface RecommendationRanking {
  readonly value: number;
  readonly basisCode: string;
  readonly tieBreakKey: string;
}

export interface RecommendationOptionInput {
  readonly optionId: RecommendationOptionId;
  readonly actions: readonly ProposedFplAction[];
  readonly horizon: RecommendationHorizon;
  readonly expectedImpact: RecommendationExpectedImpact;
  readonly ranking: RecommendationRanking;
  readonly assumptions: readonly RecommendationAssumption[];
  readonly constraints: readonly RecommendationConstraint[];
  readonly risks: readonly RecommendationRisk[];
  readonly explanation: RecommendationExplanation;
}

export interface RecommendationOption extends RecommendationOptionInput {
  readonly rank: number;
}

export type RecommendationEvidenceKind =
  | "projection"
  | "team_state"
  | "rules"
  | "fixture"
  | "news_signal"
  | "other_reviewed";

export interface RecommendationTransformationStep {
  readonly stage: string;
  readonly version: Version;
  readonly inputProvenanceRefs: readonly ProvenanceId[];
}

export interface RecommendationEvidenceItem {
  readonly evidenceId: RecommendationEvidenceId;
  readonly kind: RecommendationEvidenceKind;
  readonly sourceRefs: readonly SourceId[];
  readonly observedAt: UtcInstant;
  readonly ingestedAt: UtcInstant;
  readonly provenanceRefs: readonly ProvenanceId[];
  readonly transformationLineage: readonly RecommendationTransformationStep[];
  readonly commercialUse: CommercialUseClassification;
  readonly stance: "supports" | "contradicts" | "context";
  readonly conflictGroup?: string;
}

export type RecommendationConfidenceDimension =
  | "projection_uncertainty"
  | "data_freshness"
  | "news_signal"
  | "scenario_sensitivity"
  | "evidence_conflict"
  | "other_reviewed";

export type RecommendationConfidenceBand =
  "not_assessed" | "low" | "medium" | "high";

export interface RecommendationConfidenceFactor {
  readonly dimension: RecommendationConfidenceDimension;
  readonly band: RecommendationConfidenceBand;
  readonly rationaleCode: string;
  readonly evidenceRefs: readonly RecommendationEvidenceId[];
}

export interface RecommendationConfidence {
  readonly overallBand: RecommendationConfidenceBand;
  readonly methodologyVersion: Version;
  readonly evaluatedAt: UtcInstant;
  readonly factors: readonly RecommendationConfidenceFactor[];
}

export interface RecommendationAlgorithmIdentity {
  readonly name: string;
  readonly version: Version;
}

export interface Recommendation {
  readonly recommendationId: RecommendationId;
  readonly contractVersion: Version;
  readonly kind: RecommendationKind;
  readonly teamStateId: TeamStateId;
  readonly rulesIdentity: RulesIdentity;
  readonly generatedAt: UtcInstant;
  readonly algorithm: RecommendationAlgorithmIdentity;
  readonly evidence: readonly RecommendationEvidenceItem[];
  readonly confidence: RecommendationConfidence;
  readonly primary: RecommendationOption;
  readonly alternatives: readonly RecommendationOption[];
  readonly supersedesRecommendationId?: RecommendationId;
}

export interface CreateRecommendationInput {
  readonly recommendationId: RecommendationId;
  readonly contractVersion: Version;
  readonly kind: RecommendationKind;
  readonly teamStateId: TeamStateId;
  readonly rulesIdentity: RulesIdentity;
  readonly generatedAt: UtcInstant;
  readonly algorithm: RecommendationAlgorithmIdentity;
  readonly evidence: readonly RecommendationEvidenceItem[];
  readonly confidence: Omit<RecommendationConfidence, "overallBand">;
  readonly options: readonly RecommendationOptionInput[];
  readonly supersedesRecommendationId?: RecommendationId;
}

export type RecommendationValidationCode =
  | "options_missing"
  | "duplicate_identity"
  | "empty_value"
  | "invalid_value"
  | "time_invalid"
  | "horizon_invalid"
  | "action_invalid"
  | "impact_invalid"
  | "reference_missing"
  | "evidence_invalid"
  | "commercial_use_blocked"
  | "confidence_invalid"
  | "constraint_unsatisfied";

export interface RecommendationValidationIssue {
  readonly code: RecommendationValidationCode;
  readonly path: string;
  readonly message: string;
}

export class RecommendationContractError extends Error {
  readonly code = "recommendation_contract_invalid" as const;
  readonly issues: readonly RecommendationValidationIssue[];

  constructor(issues: readonly RecommendationValidationIssue[]) {
    super("Recommendation contract input is invalid.");
    this.name = "RecommendationContractError";
    this.issues = Object.freeze([...issues]);
  }
}
