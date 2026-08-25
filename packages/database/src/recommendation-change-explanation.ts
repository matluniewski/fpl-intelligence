import type {
  NewsRecommendationImpact,
  RecommendationId,
  UtcInstant,
} from "@fpl-intelligence/domain";
import {
  classifyRecommendationSnapshot,
  recommendationComparisonKey,
  type RecommendationSnapshot,
} from "./recommendation-history";

export type RecommendationChangeCauseCode =
  | "team_state_changed"
  | "projection_input_changed"
  | "news_signal_added"
  | "news_signal_removed"
  | "availability_state_changed"
  | "claim_set_changed"
  | "evidence_set_changed"
  | "recommendation_output_changed"
  | "confidence_changed"
  | "news_impact_changed";

export interface RecommendationChangeCause {
  readonly code: RecommendationChangeCauseCode;
  readonly currentRefs: readonly string[];
  readonly priorRefs: readonly string[];
}

export interface RecommendationChangeExplanation {
  readonly currentRecommendationId: RecommendationId;
  readonly priorRecommendationId: RecommendationId | null;
  readonly evaluatedAt: UtcInstant;
  readonly outcome: "initial" | "unchanged" | "changed";
  readonly causes: readonly RecommendationChangeCause[];
  readonly currentImpact: NewsRecommendationImpact | null;
  readonly priorImpact: NewsRecommendationImpact | null;
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function difference(current: readonly string[], prior: readonly string[]) {
  const priorSet = new Set(prior);
  const currentSet = new Set(current);
  return Object.freeze({
    added: Object.freeze(
      current.filter((value) => !priorSet.has(value)).sort(),
    ),
    removed: Object.freeze(
      prior.filter((value) => !currentSet.has(value)).sort(),
    ),
  });
}

function addDifference(
  causes: RecommendationChangeCause[],
  code: RecommendationChangeCauseCode,
  current: readonly string[],
  prior: readonly string[],
): void {
  const refs = difference(current, prior);
  if (refs.added.length > 0 || refs.removed.length > 0)
    causes.push(
      Object.freeze({ code, currentRefs: refs.added, priorRefs: refs.removed }),
    );
}

/** Compares only stored, comparable snapshots and caller-supplied impact data. */
export function explainRecommendationChange(input: {
  readonly current: RecommendationSnapshot;
  readonly prior: RecommendationSnapshot | null;
  readonly evaluatedAt: UtcInstant;
  readonly currentImpact?: NewsRecommendationImpact;
  readonly priorImpact?: NewsRecommendationImpact;
}): RecommendationChangeExplanation {
  const { current, prior } = input;
  if (prior === null)
    return Object.freeze({
      currentRecommendationId: current.recommendation.recommendationId,
      priorRecommendationId: null,
      evaluatedAt: input.evaluatedAt,
      outcome: "initial",
      causes: Object.freeze([]),
      currentImpact: input.currentImpact ?? null,
      priorImpact: input.priorImpact ?? null,
    });
  if (
    JSON.stringify(recommendationComparisonKey(current.recommendation)) !==
    JSON.stringify(recommendationComparisonKey(prior.recommendation))
  )
    throw new RangeError("Recommendation snapshots must be comparable.");
  const causes: RecommendationChangeCause[] = [];
  if (current.context.teamStateVersion !== prior.context.teamStateVersion)
    causes.push(
      Object.freeze({
        code: "team_state_changed",
        currentRefs: [current.context.teamStateVersion],
        priorRefs: [prior.context.teamStateVersion],
      }),
    );
  if (!same(current.context.projection, prior.context.projection))
    causes.push(
      Object.freeze({
        code: "projection_input_changed",
        currentRefs: [current.context.projection.currentVersion],
        priorRefs: [prior.context.projection.currentVersion],
      }),
    );
  const signals = difference(
    current.context.news.signalRefs,
    prior.context.news.signalRefs,
  );
  if (signals.added.length > 0)
    causes.push(
      Object.freeze({
        code: "news_signal_added",
        currentRefs: signals.added,
        priorRefs: Object.freeze([]),
      }),
    );
  if (signals.removed.length > 0)
    causes.push(
      Object.freeze({
        code: "news_signal_removed",
        currentRefs: Object.freeze([]),
        priorRefs: signals.removed,
      }),
    );
  addDifference(
    causes,
    "availability_state_changed",
    current.context.news.availabilityStateRefs,
    prior.context.news.availabilityStateRefs,
  );
  addDifference(
    causes,
    "claim_set_changed",
    current.context.news.claimRefs,
    prior.context.news.claimRefs,
  );
  addDifference(
    causes,
    "evidence_set_changed",
    current.context.news.evidenceRefs,
    prior.context.news.evidenceRefs,
  );
  if (!same(current.recommendation.primary, prior.recommendation.primary))
    causes.push(
      Object.freeze({
        code: "recommendation_output_changed",
        currentRefs: [current.recommendation.primary.optionId],
        priorRefs: [prior.recommendation.primary.optionId],
      }),
    );
  if (!same(current.recommendation.confidence, prior.recommendation.confidence))
    causes.push(
      Object.freeze({
        code: "confidence_changed",
        currentRefs: current.recommendation.confidence.factors.flatMap(
          (factor) => factor.evidenceRefs,
        ),
        priorRefs: prior.recommendation.confidence.factors.flatMap(
          (factor) => factor.evidenceRefs,
        ),
      }),
    );
  if (
    input.currentImpact !== undefined &&
    input.priorImpact !== undefined &&
    !same(input.currentImpact, input.priorImpact)
  )
    causes.push(
      Object.freeze({
        code: "news_impact_changed",
        currentRefs: input.currentImpact.causalChain.evidenceRefs,
        priorRefs: input.priorImpact.causalChain.evidenceRefs,
      }),
    );
  const classified = classifyRecommendationSnapshot(current, prior);
  return Object.freeze({
    currentRecommendationId: current.recommendation.recommendationId,
    priorRecommendationId: classified.priorRecommendationId,
    evaluatedAt: input.evaluatedAt,
    outcome: causes.length === 0 ? "unchanged" : "changed",
    causes: Object.freeze(causes),
    currentImpact: input.currentImpact ?? null,
    priorImpact: input.priorImpact ?? null,
  });
}
