import {
  createClaim,
  createClaimId,
  createEvidence,
  createEvidenceId,
} from "@fpl-intelligence/domain";
import type {
  Claim,
  ClaimExtractionIdentity,
  Evidence,
  EvidenceReference,
  RawNewsItem,
  ReferenceDataSnapshot,
  ProvenanceId,
  UntrustedClaimCandidate,
  UtcInstant,
} from "@fpl-intelligence/domain";

import { resolvePlayerIdentity } from "./player-identity";

export interface ModelClaimCandidate extends UntrustedClaimCandidate {
  readonly subjectName: string;
  readonly teamHint?: string;
  readonly evidence: EvidenceReference;
}

export interface ClaimExtractionModel {
  extract(
    input: Readonly<{ rawNewsItem: RawNewsItem; requestedAt: UtcInstant }>,
  ): Promise<unknown>;
}

/** Content-free usage contract; prompts, responses, and player names are excluded. */
export interface ClaimExtractionUsageEvent {
  readonly extractionRunId: string;
  readonly occurredAt: UtcInstant;
  readonly providerRef: string;
  readonly outcome: "succeeded" | "failed";
  readonly candidatesReturned: number;
  readonly candidatesAccepted: number;
  readonly candidatesQuarantined: number;
}

export interface ClaimExtractionUsageRecorder {
  record(event: ClaimExtractionUsageEvent): Promise<void>;
}

export type ClaimExtractionResult =
  | Readonly<{ kind: "accepted"; claim: Claim; evidence: Evidence }>
  | Readonly<{
      kind: "quarantined";
      reason:
        | "identity_ambiguous"
        | "identity_not_found"
        | "model_failure"
        | "model_output_invalid";
    }>;

/**
 * Validates untrusted model output and never turns it directly into a signal,
 * projection, or recommendation. Provider transport and model DTOs stay behind
 * ClaimExtractionModel.
 */
export class ClaimExtractionPipeline {
  constructor(
    private readonly model: ClaimExtractionModel,
    private readonly usageRecorder?: ClaimExtractionUsageRecorder,
  ) {}

  async extract(
    input: Readonly<{
      rawNewsItem: RawNewsItem;
      referenceData: ReferenceDataSnapshot;
      requestedAt: UtcInstant;
      extractedAt: UtcInstant;
      extraction: ClaimExtractionIdentity;
      provenanceRefs: readonly ProvenanceId[];
    }>,
  ): Promise<ClaimExtractionResult> {
    if (input.rawNewsItem.policyState === "blocked")
      return Object.freeze({
        kind: "quarantined",
        reason: "model_output_invalid",
      });
    let output: unknown;
    try {
      output = await this.model.extract({
        rawNewsItem: input.rawNewsItem,
        requestedAt: input.requestedAt,
      });
    } catch {
      return Object.freeze({ kind: "quarantined", reason: "model_failure" });
    }
    if (!isCandidate(output))
      return Object.freeze({
        kind: "quarantined",
        reason: "model_output_invalid",
      });
    const identity = resolvePlayerIdentity(input.referenceData, {
      displayName: output.subjectName,
      ...(output.teamHint === undefined ? {} : { teamHint: output.teamHint }),
    });
    if (identity.kind === "ambiguous")
      return Object.freeze({
        kind: "quarantined",
        reason: "identity_ambiguous",
      });
    if (identity.kind === "not_found")
      return Object.freeze({
        kind: "quarantined",
        reason: "identity_not_found",
      });
    try {
      const claim = createClaim(
        {
          ...output,
          claimId: createClaimId(
            `extracted:${input.rawNewsItem.rawNewsItemId}:${identity.match.id}`,
          ),
          rawNewsItemId: input.rawNewsItem.rawNewsItemId,
          subject: { kind: "player", playerId: identity.match.id },
          extractedAt: input.extractedAt,
          originalReference: input.rawNewsItem.externalReference ?? {
            namespace: "internal",
            externalId: String(input.rawNewsItem.rawNewsItemId),
          },
          extraction: input.extraction,
          provenanceRefs: input.provenanceRefs,
        },
        { rawNewsItem: input.rawNewsItem },
      );
      const evidence = createEvidence({
        evidenceId: createEvidenceId(
          `extracted:${input.rawNewsItem.rawNewsItemId}:${identity.match.id}`,
        ),
        claimId: claim.claimId,
        rawNewsItemId: input.rawNewsItem.rawNewsItemId,
        stance: "supports",
        sourceContextCode: `extraction_${output.sourceType}`,
        reference: output.evidence,
        observedAt: input.rawNewsItem.observedAt ?? input.rawNewsItem.fetchedAt,
        ingestedAt: input.rawNewsItem.fetchedAt,
        assessedAt: input.extractedAt,
        provenanceRefs: input.provenanceRefs,
        lifecycleState: "active",
      });
      return Object.freeze({ kind: "accepted", claim, evidence });
    } catch {
      return Object.freeze({
        kind: "quarantined",
        reason: "model_output_invalid",
      });
    }
  }

  async extractMany(
    input: Parameters<ClaimExtractionPipeline["extract"]>[0] &
      Readonly<{ extractionRunId: string; providerRef: string }>,
  ): Promise<readonly ClaimExtractionResult[]> {
    let output: unknown;
    try {
      output = await this.model.extract({
        rawNewsItem: input.rawNewsItem,
        requestedAt: input.requestedAt,
      });
    } catch {
      const results = Object.freeze([
        Object.freeze({
          kind: "quarantined" as const,
          reason: "model_failure" as const,
        }),
      ]);
      await this.#recordUsage(input, results);
      return results;
    }
    const results = !Array.isArray(output)
      ? Object.freeze([await this.extract(input)])
      : Object.freeze(
          await Promise.all(
            output.map(async (candidate) =>
              new ClaimExtractionPipeline({
                extract: async () => candidate,
              }).extract(input),
            ),
          ),
        );
    await this.#recordUsage(input, results);
    return results;
  }

  async #recordUsage(
    input: Readonly<{
      extractionRunId: string;
      providerRef: string;
      requestedAt: UtcInstant;
    }>,
    results: readonly ClaimExtractionResult[],
  ): Promise<void> {
    if (this.usageRecorder === undefined) return;
    await this.usageRecorder.record({
      extractionRunId: input.extractionRunId,
      occurredAt: input.requestedAt,
      providerRef: input.providerRef,
      outcome: results.some((result) => result.kind === "accepted")
        ? "succeeded"
        : "failed",
      candidatesReturned: results.length,
      candidatesAccepted: results.filter((result) => result.kind === "accepted")
        .length,
      candidatesQuarantined: results.filter(
        (result) => result.kind === "quarantined",
      ).length,
    });
  }
}

function isCandidate(value: unknown): value is ModelClaimCandidate {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate["subjectName"] === "string" &&
    typeof candidate["claimType"] === "string" &&
    typeof candidate["assertedState"] === "string" &&
    typeof candidate["directness"] === "string" &&
    typeof candidate["certainty"] === "string" &&
    typeof candidate["sourceType"] === "string" &&
    typeof candidate["evidence"] === "object" &&
    candidate["evidence"] !== null
  );
}
