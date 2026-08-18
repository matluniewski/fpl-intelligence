import type { RecommendationEvidenceId } from "./identifiers";
import type {
  CreateRecommendationInput,
  ProposedFplAction,
  Recommendation,
  RecommendationConfidenceBand,
  RecommendationEvidenceItem,
  RecommendationExplanation,
  RecommendationOption,
  RecommendationOptionInput,
  RecommendationValidationIssue,
} from "./recommendation";
import { RecommendationContractError } from "./recommendation";
import type { GameweekId } from "./reference-data";

const CONFIDENCE_ORDER: Readonly<Record<RecommendationConfidenceBand, number>> =
  Object.freeze({ not_assessed: 0, low: 1, medium: 2, high: 3 });

const ACTIONS_BY_KIND = Object.freeze({
  lineup: Object.freeze(["select_starter", "set_bench_order"]),
  captaincy: Object.freeze(["set_captain", "set_vice_captain"]),
  transfer_plan: Object.freeze([
    "transfer",
    "roll_transfer",
    "apply_points_hit",
    "activate_chip",
  ]),
});
const EVIDENCE_KINDS = Object.freeze([
  "projection",
  "team_state",
  "rules",
  "fixture",
  "news_signal",
  "other_reviewed",
]);
const EVIDENCE_STANCES = Object.freeze(["supports", "contradicts", "context"]);
const CONFIDENCE_DIMENSIONS = Object.freeze([
  "projection_uncertainty",
  "data_freshness",
  "news_signal",
  "scenario_sensitivity",
  "evidence_conflict",
  "other_reviewed",
]);
const CONFIDENCE_BANDS = Object.freeze([
  "not_assessed",
  "low",
  "medium",
  "high",
]);

function addIssue(
  issues: RecommendationValidationIssue[],
  code: RecommendationValidationIssue["code"],
  path: string,
  message: string,
): void {
  issues.push({ code, path, message });
}

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function gameweekInHorizon(
  gameweek: GameweekId,
  from: GameweekId,
  to: GameweekId,
): boolean {
  return (
    gameweek.seasonId === from.seasonId &&
    gameweek.number >= from.number &&
    gameweek.number <= to.number
  );
}

function actionKey(action: ProposedFplAction): string {
  switch (action.kind) {
    case "select_starter":
    case "set_captain":
    case "set_vice_captain":
      return `${action.kind}:${action.playerId}:${action.gameweekId.number}`;
    case "set_bench_order":
      return `${action.kind}:${action.playerId}:${action.order}:${action.gameweekId.number}`;
    case "transfer":
      return `${action.kind}:${action.outPlayerId}:${action.inPlayerId}:${action.gameweekId.number}`;
    case "roll_transfer":
      return `${action.kind}:${action.gameweekId.number}`;
    case "apply_points_hit":
      return `${action.kind}:${action.points}:${action.gameweekId.number}`;
    case "activate_chip":
      return `${action.kind}:${action.chipId}:${action.gameweekId.number}`;
  }
}

function validateEvidence(
  input: CreateRecommendationInput,
  issues: RecommendationValidationIssue[],
): ReadonlySet<RecommendationEvidenceId> {
  const evidenceIds = new Set<RecommendationEvidenceId>();

  if (input.evidence.length === 0) {
    addIssue(
      issues,
      "evidence_invalid",
      "evidence",
      "A recommendation must retain at least one evidence item.",
    );
  }

  for (const [index, evidence] of input.evidence.entries()) {
    const path = `evidence[${index}]`;
    if (evidenceIds.has(evidence.evidenceId)) {
      addIssue(
        issues,
        "duplicate_identity",
        `${path}.evidenceId`,
        "Recommendation evidence identifiers must be unique.",
      );
    }
    evidenceIds.add(evidence.evidenceId);

    if (!EVIDENCE_KINDS.includes(evidence.kind)) {
      addIssue(
        issues,
        "evidence_invalid",
        `${path}.kind`,
        "Evidence kind must be recognized by the contract version.",
      );
    }
    if (!EVIDENCE_STANCES.includes(evidence.stance)) {
      addIssue(
        issues,
        "evidence_invalid",
        `${path}.stance`,
        "Evidence stance must be supports, contradicts, or context.",
      );
    }

    if (
      evidence.sourceRefs.length === 0 ||
      evidence.provenanceRefs.length === 0 ||
      evidence.transformationLineage.length === 0
    ) {
      addIssue(
        issues,
        "evidence_invalid",
        path,
        "Evidence must retain source, provenance, and transformation lineage.",
      );
    }
    if (
      evidence.observedAt > evidence.ingestedAt ||
      evidence.ingestedAt > input.generatedAt
    ) {
      addIssue(
        issues,
        "time_invalid",
        path,
        "Evidence observation, ingestion, and recommendation times must be ordered.",
      );
    }
    if (
      evidence.commercialUse !== "permitted" &&
      evidence.commercialUse !== "restricted"
    ) {
      addIssue(
        issues,
        "commercial_use_blocked",
        `${path}.commercialUse`,
        "Unclear or unreviewed evidence cannot support a recommendation.",
      );
    }
    if (
      evidence.conflictGroup !== undefined &&
      !isNonEmpty(evidence.conflictGroup)
    ) {
      addIssue(
        issues,
        "empty_value",
        `${path}.conflictGroup`,
        "Conflict group must not be empty when supplied.",
      );
    }

    for (const [stepIndex, step] of evidence.transformationLineage.entries()) {
      if (!isNonEmpty(step.stage) || step.inputProvenanceRefs.length === 0) {
        addIssue(
          issues,
          "evidence_invalid",
          `${path}.transformationLineage[${stepIndex}]`,
          "Each transformation step needs a stage and input provenance.",
        );
      }
    }
  }

  return evidenceIds;
}

function validateEvidenceRefs(
  refs: readonly RecommendationEvidenceId[],
  path: string,
  evidenceIds: ReadonlySet<RecommendationEvidenceId>,
  issues: RecommendationValidationIssue[],
): void {
  for (const [index, evidenceId] of refs.entries()) {
    if (!evidenceIds.has(evidenceId)) {
      addIssue(
        issues,
        "reference_missing",
        `${path}[${index}]`,
        `Recommendation evidence ${evidenceId} is unavailable.`,
      );
    }
  }
}

function validateCodeCollection(
  values: readonly { readonly code: string }[],
  path: string,
  issues: RecommendationValidationIssue[],
): ReadonlySet<string> {
  const codes = new Set<string>();
  for (const [index, value] of values.entries()) {
    if (!isNonEmpty(value.code)) {
      addIssue(
        issues,
        "empty_value",
        `${path}[${index}].code`,
        "Structured explanation codes must not be empty.",
      );
    } else if (codes.has(value.code)) {
      addIssue(
        issues,
        "duplicate_identity",
        `${path}[${index}].code`,
        "Structured explanation codes must be unique within their collection.",
      );
    }
    codes.add(value.code);
  }
  return codes;
}

function validateExplanationCodeRefs(
  refs: readonly string[],
  available: ReadonlySet<string>,
  path: string,
  issues: RecommendationValidationIssue[],
): void {
  for (const [index, code] of refs.entries()) {
    if (!available.has(code)) {
      addIssue(
        issues,
        "reference_missing",
        `${path}[${index}]`,
        `Explanation code ${code} is unavailable in this option.`,
      );
    }
  }
}

function validateAction(
  action: ProposedFplAction,
  input: CreateRecommendationInput,
  option: RecommendationOptionInput,
  path: string,
  issues: RecommendationValidationIssue[],
): void {
  const allowedActions =
    input.kind === "lineup" ||
    input.kind === "captaincy" ||
    input.kind === "transfer_plan"
      ? ACTIONS_BY_KIND[input.kind]
      : [];
  if (!allowedActions.includes(action.kind)) {
    addIssue(
      issues,
      "action_invalid",
      `${path}.kind`,
      `Action ${action.kind} is not valid for ${input.kind}.`,
    );
  }
  if (
    action.gameweekId.seasonId !== input.rulesIdentity.seasonId ||
    !gameweekInHorizon(
      action.gameweekId,
      option.horizon.from,
      option.horizon.to,
    )
  ) {
    addIssue(
      issues,
      "horizon_invalid",
      `${path}.gameweekId`,
      "Action gameweek must use the recommendation season and fall inside the option horizon.",
    );
  }

  if (
    action.kind === "set_bench_order" &&
    (!Number.isSafeInteger(action.order) || action.order <= 0)
  ) {
    addIssue(
      issues,
      "action_invalid",
      `${path}.order`,
      "Bench order must be a positive integer.",
    );
  }
  if (action.kind === "transfer" && action.outPlayerId === action.inPlayerId) {
    addIssue(
      issues,
      "action_invalid",
      path,
      "A transfer must replace one player with a different player.",
    );
  }
  if (
    action.kind === "apply_points_hit" &&
    (!Number.isSafeInteger(action.points) || action.points <= 0)
  ) {
    addIssue(
      issues,
      "action_invalid",
      `${path}.points`,
      "A proposed points hit must be a positive integer.",
    );
  }
  if (action.kind === "activate_chip" && !isNonEmpty(action.chipId)) {
    addIssue(
      issues,
      "empty_value",
      `${path}.chipId`,
      "A proposed chip identifier must not be empty.",
    );
  }
}

function validateOption(
  option: RecommendationOptionInput,
  index: number,
  input: CreateRecommendationInput,
  evidenceIds: ReadonlySet<RecommendationEvidenceId>,
  issues: RecommendationValidationIssue[],
): void {
  const path = `options[${index}]`;
  if (
    option.horizon.from.seasonId !== input.rulesIdentity.seasonId ||
    option.horizon.to.seasonId !== input.rulesIdentity.seasonId ||
    option.horizon.from.number > option.horizon.to.number
  ) {
    addIssue(
      issues,
      "horizon_invalid",
      `${path}.horizon`,
      "Option horizon must be ordered within the recommendation rules season.",
    );
  }
  if (option.actions.length === 0) {
    addIssue(
      issues,
      "action_invalid",
      `${path}.actions`,
      "Every recommendation option must propose at least one action.",
    );
  }

  const actionKeys = new Set<string>();
  for (const [actionIndex, action] of option.actions.entries()) {
    const key = actionKey(action);
    if (actionKeys.has(key)) {
      addIssue(
        issues,
        "duplicate_identity",
        `${path}.actions[${actionIndex}]`,
        "Proposed actions must be unique within an option.",
      );
    }
    actionKeys.add(key);
    validateAction(
      action,
      input,
      option,
      `${path}.actions[${actionIndex}]`,
      issues,
    );
  }

  if (input.kind === "lineup") {
    const starters = new Set<string>();
    const benched = new Set<string>();
    const benchOrders = new Set<number>();
    for (const action of option.actions) {
      if (action.kind === "select_starter") starters.add(action.playerId);
      if (action.kind === "set_bench_order") {
        if (benchOrders.has(action.order)) {
          addIssue(
            issues,
            "action_invalid",
            `${path}.actions`,
            "Bench-order values must be unique within a lineup option.",
          );
        }
        benchOrders.add(action.order);
        benched.add(action.playerId);
      }
    }
    if ([...starters].some((playerId) => benched.has(playerId))) {
      addIssue(
        issues,
        "action_invalid",
        `${path}.actions`,
        "A player cannot be proposed as both a starter and a bench selection.",
      );
    }
  }

  if (
    option.actions.some((action) => action.kind === "roll_transfer") &&
    option.actions.length > 1
  ) {
    addIssue(
      issues,
      "action_invalid",
      `${path}.actions`,
      "Rolling a transfer must be a standalone option.",
    );
  }

  const captain = option.actions.find(
    (action) => action.kind === "set_captain",
  );
  const viceCaptain = option.actions.find(
    (action) => action.kind === "set_vice_captain",
  );
  if (input.kind === "captaincy") {
    const captainCount = option.actions.filter(
      (action) => action.kind === "set_captain",
    ).length;
    const viceCaptainCount = option.actions.filter(
      (action) => action.kind === "set_vice_captain",
    ).length;
    if (captainCount !== 1 || viceCaptainCount !== 1) {
      addIssue(
        issues,
        "action_invalid",
        `${path}.actions`,
        "A captaincy option must propose exactly one captain and one vice-captain.",
      );
    }
  }
  if (
    captain?.kind === "set_captain" &&
    viceCaptain?.kind === "set_vice_captain" &&
    captain.playerId === viceCaptain.playerId
  ) {
    addIssue(
      issues,
      "action_invalid",
      `${path}.actions`,
      "Captain and vice-captain must be different players.",
    );
  }

  const impact = option.expectedImpact;
  const proposedHitPoints = option.actions.reduce(
    (total, action) =>
      action.kind === "apply_points_hit" ? total + action.points : total,
    0,
  );
  const impactValues = [
    impact.baselineExpectedPoints,
    impact.grossExpectedPoints,
    impact.pointCost,
    impact.netExpectedPoints,
    impact.deltaVsBaseline,
  ];
  if (
    impactValues.some((value) => !Number.isFinite(value)) ||
    !Number.isSafeInteger(impact.pointCost) ||
    impact.pointCost < 0 ||
    proposedHitPoints !== impact.pointCost ||
    Math.abs(
      impact.netExpectedPoints -
        (impact.grossExpectedPoints - impact.pointCost),
    ) > 1e-6 ||
    Math.abs(
      impact.deltaVsBaseline -
        (impact.netExpectedPoints - impact.baselineExpectedPoints),
    ) > 1e-6
  ) {
    addIssue(
      issues,
      "impact_invalid",
      `${path}.expectedImpact`,
      "Expected impact must be finite and preserve gross, cost, net, baseline, and delta arithmetic.",
    );
  }

  if (
    !Number.isFinite(option.ranking.value) ||
    !isNonEmpty(option.ranking.basisCode) ||
    !isNonEmpty(option.ranking.tieBreakKey)
  ) {
    addIssue(
      issues,
      "invalid_value",
      `${path}.ranking`,
      "Ranking requires a finite value, basis code, and deterministic tie-break key.",
    );
  }

  const assumptionCodes = validateCodeCollection(
    option.assumptions,
    `${path}.assumptions`,
    issues,
  );
  const constraintCodes = validateCodeCollection(
    option.constraints,
    `${path}.constraints`,
    issues,
  );
  const riskCodes = validateCodeCollection(
    option.risks,
    `${path}.risks`,
    issues,
  );

  for (const [assumptionIndex, assumption] of option.assumptions.entries()) {
    if (!isNonEmpty(assumption.description)) {
      addIssue(
        issues,
        "empty_value",
        `${path}.assumptions[${assumptionIndex}].description`,
        "Assumption descriptions must not be empty.",
      );
    }
  }
  for (const [constraintIndex, constraint] of option.constraints.entries()) {
    if (!isNonEmpty(constraint.description)) {
      addIssue(
        issues,
        "empty_value",
        `${path}.constraints[${constraintIndex}].description`,
        "Constraint descriptions must not be empty.",
      );
    }
  }
  for (const [riskIndex, risk] of option.risks.entries()) {
    if (
      !isNonEmpty(risk.description) ||
      !["low", "medium", "high"].includes(risk.severity)
    ) {
      addIssue(
        issues,
        "invalid_value",
        `${path}.risks[${riskIndex}]`,
        "Risks need a description and recognized severity.",
      );
    }
  }

  for (const [constraintIndex, constraint] of option.constraints.entries()) {
    if (!constraint.satisfied) {
      addIssue(
        issues,
        "constraint_unsatisfied",
        `${path}.constraints[${constraintIndex}]`,
        "A ranked recommendation option must satisfy every declared constraint.",
      );
    }
  }

  for (const [assumptionIndex, assumption] of option.assumptions.entries()) {
    validateEvidenceRefs(
      assumption.evidenceRefs,
      `${path}.assumptions[${assumptionIndex}].evidenceRefs`,
      evidenceIds,
      issues,
    );
  }
  for (const [riskIndex, risk] of option.risks.entries()) {
    validateEvidenceRefs(
      risk.evidenceRefs,
      `${path}.risks[${riskIndex}].evidenceRefs`,
      evidenceIds,
      issues,
    );
  }

  const explanation = option.explanation;
  validateCodeCollection(
    explanation.reasonCodes.map((code) => ({ code })),
    `${path}.explanation.reasonCodes`,
    issues,
  );
  validateCodeCollection(
    explanation.materialChangeTriggers,
    `${path}.explanation.materialChangeTriggers`,
    issues,
  );
  if (
    !isNonEmpty(explanation.summaryCode) ||
    explanation.reasonCodes.length === 0 ||
    explanation.supportingEvidenceRefs.length === 0 ||
    explanation.materialChangeTriggers.length === 0
  ) {
    addIssue(
      issues,
      "empty_value",
      `${path}.explanation`,
      "Explanation needs a summary, reasons, supporting evidence, and at least one material change trigger.",
    );
  }
  validateExplanationCodeRefs(
    explanation.assumptionCodes,
    assumptionCodes,
    `${path}.explanation.assumptionCodes`,
    issues,
  );
  validateExplanationCodeRefs(
    explanation.constraintCodes,
    constraintCodes,
    `${path}.explanation.constraintCodes`,
    issues,
  );
  validateExplanationCodeRefs(
    explanation.riskCodes,
    riskCodes,
    `${path}.explanation.riskCodes`,
    issues,
  );
  validateEvidenceRefs(
    explanation.supportingEvidenceRefs,
    `${path}.explanation.supportingEvidenceRefs`,
    evidenceIds,
    issues,
  );
  validateEvidenceRefs(
    explanation.counterEvidenceRefs,
    `${path}.explanation.counterEvidenceRefs`,
    evidenceIds,
    issues,
  );
  for (const [
    triggerIndex,
    trigger,
  ] of explanation.materialChangeTriggers.entries()) {
    if (!isNonEmpty(trigger.code) || !isNonEmpty(trigger.description)) {
      addIssue(
        issues,
        "empty_value",
        `${path}.explanation.materialChangeTriggers[${triggerIndex}]`,
        "Material change triggers need a code and description.",
      );
    }
    validateEvidenceRefs(
      trigger.evidenceRefs,
      `${path}.explanation.materialChangeTriggers[${triggerIndex}].evidenceRefs`,
      evidenceIds,
      issues,
    );
  }
}

export function validateRecommendationInput(
  input: CreateRecommendationInput,
): readonly RecommendationValidationIssue[] {
  const issues: RecommendationValidationIssue[] = [];
  if (input.options.length < 2) {
    addIssue(
      issues,
      "options_missing",
      "options",
      "A recommendation requires one primary candidate and at least one alternative.",
    );
  }
  if (!isNonEmpty(input.algorithm.name)) {
    addIssue(
      issues,
      "empty_value",
      "algorithm.name",
      "Recommendation algorithm name must not be empty.",
    );
  }
  if (
    input.kind !== "lineup" &&
    input.kind !== "captaincy" &&
    input.kind !== "transfer_plan"
  ) {
    addIssue(
      issues,
      "invalid_value",
      "kind",
      "Recommendation kind must be recognized by the contract version.",
    );
  }
  if (input.supersedesRecommendationId === input.recommendationId) {
    addIssue(
      issues,
      "invalid_value",
      "supersedesRecommendationId",
      "A recommendation cannot supersede itself.",
    );
  }

  const evidenceIds = validateEvidence(input, issues);
  const optionIds = new Set<string>();
  for (const [index, option] of input.options.entries()) {
    if (optionIds.has(option.optionId)) {
      addIssue(
        issues,
        "duplicate_identity",
        `options[${index}].optionId`,
        "Recommendation option identifiers must be unique.",
      );
    }
    optionIds.add(option.optionId);
    validateOption(option, index, input, evidenceIds, issues);
  }

  if (input.confidence.factors.length === 0) {
    addIssue(
      issues,
      "confidence_invalid",
      "confidence.factors",
      "Recommendation confidence must expose at least one factor.",
    );
  }
  if (input.confidence.evaluatedAt > input.generatedAt) {
    addIssue(
      issues,
      "time_invalid",
      "confidence.evaluatedAt",
      "Confidence cannot be evaluated after recommendation generation.",
    );
  }
  const confidenceDimensions = new Set<string>();
  for (const [index, factor] of input.confidence.factors.entries()) {
    const path = `confidence.factors[${index}]`;
    if (confidenceDimensions.has(factor.dimension)) {
      addIssue(
        issues,
        "duplicate_identity",
        `${path}.dimension`,
        "Confidence dimensions must be unique.",
      );
    }
    confidenceDimensions.add(factor.dimension);
    if (!CONFIDENCE_DIMENSIONS.includes(factor.dimension)) {
      addIssue(
        issues,
        "confidence_invalid",
        `${path}.dimension`,
        "Confidence dimension must be recognized by the contract version.",
      );
    }
    if (!CONFIDENCE_BANDS.includes(factor.confidenceBand)) {
      addIssue(
        issues,
        "confidence_invalid",
        `${path}.confidenceBand`,
        "Confidence contribution band must be not_assessed, low, medium, or high.",
      );
    }
    if (!isNonEmpty(factor.rationaleCode)) {
      addIssue(
        issues,
        "empty_value",
        `${path}.rationaleCode`,
        "Confidence factor rationale code must not be empty.",
      );
    }
    if (factor.evidenceRefs.length === 0) {
      addIssue(
        issues,
        "confidence_invalid",
        `${path}.evidenceRefs`,
        "Every confidence factor must retain at least one evidence reference.",
      );
    }
    validateEvidenceRefs(
      factor.evidenceRefs,
      `${path}.evidenceRefs`,
      evidenceIds,
      issues,
    );
  }

  return Object.freeze(issues);
}

function freezeGameweek(gameweekId: GameweekId): GameweekId {
  return Object.freeze({ ...gameweekId });
}

function freezeAction(action: ProposedFplAction): ProposedFplAction {
  return Object.freeze({
    ...action,
    gameweekId: freezeGameweek(action.gameweekId),
  });
}

function freezeExplanation(
  explanation: RecommendationExplanation,
): RecommendationExplanation {
  return Object.freeze({
    ...explanation,
    reasonCodes: Object.freeze([...explanation.reasonCodes]),
    assumptionCodes: Object.freeze([...explanation.assumptionCodes]),
    constraintCodes: Object.freeze([...explanation.constraintCodes]),
    riskCodes: Object.freeze([...explanation.riskCodes]),
    supportingEvidenceRefs: Object.freeze([
      ...explanation.supportingEvidenceRefs,
    ]),
    counterEvidenceRefs: Object.freeze([...explanation.counterEvidenceRefs]),
    materialChangeTriggers: Object.freeze(
      explanation.materialChangeTriggers.map((trigger) =>
        Object.freeze({
          ...trigger,
          evidenceRefs: Object.freeze([...trigger.evidenceRefs]),
        }),
      ),
    ),
  });
}

function freezeOption(
  option: RecommendationOptionInput,
  rank: number,
): RecommendationOption {
  return Object.freeze({
    ...option,
    rank,
    actions: Object.freeze(option.actions.map(freezeAction)),
    horizon: Object.freeze({
      from: freezeGameweek(option.horizon.from),
      to: freezeGameweek(option.horizon.to),
    }),
    expectedImpact: Object.freeze({ ...option.expectedImpact }),
    ranking: Object.freeze({ ...option.ranking }),
    assumptions: Object.freeze(
      option.assumptions.map((assumption) =>
        Object.freeze({
          ...assumption,
          evidenceRefs: Object.freeze([...assumption.evidenceRefs]),
        }),
      ),
    ),
    constraints: Object.freeze(
      option.constraints.map((constraint) => Object.freeze({ ...constraint })),
    ),
    risks: Object.freeze(
      option.risks.map((risk) =>
        Object.freeze({
          ...risk,
          evidenceRefs: Object.freeze([...risk.evidenceRefs]),
        }),
      ),
    ),
    explanation: freezeExplanation(option.explanation),
  });
}

function freezeEvidence(
  evidence: RecommendationEvidenceItem,
): RecommendationEvidenceItem {
  return Object.freeze({
    ...evidence,
    sourceRefs: Object.freeze([...evidence.sourceRefs]),
    provenanceRefs: Object.freeze([...evidence.provenanceRefs]),
    transformationLineage: Object.freeze(
      evidence.transformationLineage.map((step) =>
        Object.freeze({
          ...step,
          inputProvenanceRefs: Object.freeze([...step.inputProvenanceRefs]),
        }),
      ),
    ),
  });
}

export function createRecommendation(
  input: CreateRecommendationInput,
): Recommendation {
  const issues = validateRecommendationInput(input);
  if (issues.length > 0) {
    throw new RecommendationContractError(issues);
  }

  const ranked = [...input.options]
    .sort(
      (left, right) =>
        right.ranking.value - left.ranking.value ||
        compareStrings(left.ranking.tieBreakKey, right.ranking.tieBreakKey) ||
        compareStrings(left.optionId, right.optionId),
    )
    .map((option, index) => freezeOption(option, index + 1));
  const primary = ranked[0]!;
  const confidenceBand = input.confidence.factors.reduce(
    (lowest, factor) =>
      CONFIDENCE_ORDER[factor.confidenceBand] < CONFIDENCE_ORDER[lowest]
        ? factor.confidenceBand
        : lowest,
    "high" as RecommendationConfidenceBand,
  );

  const recommendation = {
    recommendationId: input.recommendationId,
    contractVersion: input.contractVersion,
    kind: input.kind,
    teamStateId: input.teamStateId,
    rulesIdentity: Object.freeze({ ...input.rulesIdentity }),
    generatedAt: input.generatedAt,
    algorithm: Object.freeze({ ...input.algorithm }),
    evidence: Object.freeze(input.evidence.map(freezeEvidence)),
    confidence: Object.freeze({
      overallBand: confidenceBand,
      methodologyVersion: input.confidence.methodologyVersion,
      evaluatedAt: input.confidence.evaluatedAt,
      factors: Object.freeze(
        input.confidence.factors.map((factor) =>
          Object.freeze({
            ...factor,
            evidenceRefs: Object.freeze([...factor.evidenceRefs]),
          }),
        ),
      ),
    }),
    primary,
    alternatives: Object.freeze(ranked.slice(1)),
  };

  return input.supersedesRecommendationId === undefined
    ? Object.freeze(recommendation)
    : Object.freeze({
        ...recommendation,
        supersedesRecommendationId: input.supersedesRecommendationId,
      });
}
