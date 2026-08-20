import { createHash } from "node:crypto";
import {
  createUtcInstant,
  createVersion,
  type ClaimId,
  type EvidenceId,
  type NewsSignalId,
  type PlayerAvailabilityStateId,
  type Recommendation,
  type RecommendationId,
  type RecommendationKind,
  type TeamStateId,
  type UtcInstant,
  type Version,
} from "@fpl-intelligence/domain";

export interface RecommendationSnapshotContext {
  readonly teamStateVersion: Version;
  readonly projection: {
    readonly baselineVersion: Version;
    readonly currentVersion: Version;
    readonly inputVersion: Version;
  };
  readonly news: {
    readonly signalRefs: readonly NewsSignalId[];
    readonly availabilityStateRefs: readonly PlayerAvailabilityStateId[];
    readonly claimRefs: readonly ClaimId[];
    readonly evidenceRefs: readonly EvidenceId[];
  };
  readonly retention: {
    readonly policyVersion: Version;
    readonly retainUntil: UtcInstant | null;
  };
}

export interface PersistRecommendationSnapshotInput {
  readonly recommendation: Recommendation;
  readonly context: RecommendationSnapshotContext;
  readonly recordedAt: UtcInstant;
}

export interface RecommendationComparisonKey {
  readonly teamStateId: TeamStateId;
  readonly kind: RecommendationKind;
  readonly contractVersion: Version;
  readonly horizon: Recommendation["primary"]["horizon"];
}

export type RecommendationSnapshotChange =
  "initial" | "equivalent_recalculation" | "material_change";

export interface RecommendationSnapshot {
  readonly recommendation: Recommendation;
  readonly context: RecommendationSnapshotContext;
  readonly recordedAt: UtcInstant;
  readonly materialFingerprint: string;
  readonly payloadFingerprint: string;
}

export interface RecommendationHistoryEntry extends RecommendationSnapshot {
  readonly change: RecommendationSnapshotChange;
  readonly priorRecommendationId: RecommendationId | null;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, member]) => member !== undefined)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, member]) => [key, canonicalize(member)]),
    );
  }
  return value;
}

function fingerprint(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function uniqueSorted<T extends string>(values: readonly T[]): readonly T[] {
  if (new Set(values).size !== values.length) {
    throw new RangeError("Snapshot reference collections must be unique.");
  }
  return Object.freeze([...values].sort());
}

export function normalizeRecommendationSnapshotContext(
  context: RecommendationSnapshotContext,
  recordedAt: UtcInstant,
): RecommendationSnapshotContext {
  const normalizedRecordedAt = createUtcInstant(recordedAt);
  const retainUntil =
    context.retention.retainUntil === null
      ? null
      : createUtcInstant(context.retention.retainUntil);

  if (retainUntil !== null && retainUntil <= normalizedRecordedAt) {
    throw new RangeError("Snapshot retention must end after it is recorded.");
  }

  return Object.freeze({
    teamStateVersion: createVersion(context.teamStateVersion),
    projection: Object.freeze({
      baselineVersion: createVersion(context.projection.baselineVersion),
      currentVersion: createVersion(context.projection.currentVersion),
      inputVersion: createVersion(context.projection.inputVersion),
    }),
    news: Object.freeze({
      signalRefs: uniqueSorted(context.news.signalRefs),
      availabilityStateRefs: uniqueSorted(context.news.availabilityStateRefs),
      claimRefs: uniqueSorted(context.news.claimRefs),
      evidenceRefs: uniqueSorted(context.news.evidenceRefs),
    }),
    retention: Object.freeze({
      policyVersion: createVersion(context.retention.policyVersion),
      retainUntil,
    }),
  });
}

export function recommendationComparisonKey(
  recommendation: Recommendation,
): RecommendationComparisonKey {
  return Object.freeze({
    teamStateId: recommendation.teamStateId,
    kind: recommendation.kind,
    contractVersion: recommendation.contractVersion,
    horizon: Object.freeze({ ...recommendation.primary.horizon }),
  });
}

export function createRecommendationSnapshot(
  input: PersistRecommendationSnapshotInput,
): RecommendationSnapshot {
  const recordedAt = createUtcInstant(input.recordedAt);
  if (recordedAt < input.recommendation.generatedAt) {
    throw new RangeError(
      "A recommendation snapshot cannot be recorded before generation.",
    );
  }
  const context = normalizeRecommendationSnapshotContext(
    input.context,
    recordedAt,
  );
  const {
    recommendationId,
    generatedAt,
    supersedesRecommendationId,
    ...materialRecommendation
  } = input.recommendation;
  const { evaluatedAt, ...materialConfidence } =
    materialRecommendation.confidence;
  void recommendationId;
  void generatedAt;
  void supersedesRecommendationId;
  void evaluatedAt;
  const materialContext = {
    ...context,
    retention: undefined,
  };
  const materialFingerprint = fingerprint({
    recommendation: {
      ...materialRecommendation,
      confidence: materialConfidence,
    },
    context: materialContext,
  });
  const payloadFingerprint = fingerprint({
    recommendation: input.recommendation,
    context,
    recordedAt,
  });

  return Object.freeze({
    recommendation: input.recommendation,
    context,
    recordedAt,
    materialFingerprint,
    payloadFingerprint,
  });
}

export function classifyRecommendationSnapshot(
  current: RecommendationSnapshot,
  prior: RecommendationSnapshot | null,
): Pick<RecommendationHistoryEntry, "change" | "priorRecommendationId"> {
  if (prior === null) {
    return Object.freeze({ change: "initial", priorRecommendationId: null });
  }
  return Object.freeze({
    change:
      current.materialFingerprint === prior.materialFingerprint
        ? "equivalent_recalculation"
        : "material_change",
    priorRecommendationId: prior.recommendation.recommendationId,
  });
}
