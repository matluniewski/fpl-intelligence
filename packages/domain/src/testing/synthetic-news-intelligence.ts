import {
  createClaimId,
  createEvidenceId,
  createNewsSignalId,
  createPlayerAvailabilityStateId,
  createRawNewsItemId,
} from "../identifiers";
import type {
  ClaimInput,
  EvidenceInput,
  NewsSignalInput,
  PlayerAvailabilityStateInput,
  RawNewsItemInput,
} from "../news-intelligence";
import { createVersion } from "../primitives";
import {
  SYNTHETIC_NOW,
  SYNTHETIC_PLAYERS,
  SYNTHETIC_PROVENANCE,
} from "./synthetic-fixtures";

export const SYNTHETIC_RAW_NEWS_ITEM_ID = createRawNewsItemId(
  "synthetic-news-item",
);
export const SYNTHETIC_CLAIM_ID = createClaimId("synthetic-claim");
export const SYNTHETIC_COUNTER_CLAIM_ID = createClaimId(
  "synthetic-counter-claim",
);
export const SYNTHETIC_EVIDENCE_ID = createEvidenceId("synthetic-evidence");
export const SYNTHETIC_COUNTER_EVIDENCE_ID = createEvidenceId(
  "synthetic-counter-evidence",
);
export const SYNTHETIC_SIGNAL_ID = createNewsSignalId("synthetic-news-signal");
const provenanceRefs = Object.freeze([SYNTHETIC_PROVENANCE.provenanceId]);

export const SYNTHETIC_RAW_NEWS_ITEM: RawNewsItemInput = Object.freeze({
  rawNewsItemId: SYNTHETIC_RAW_NEWS_ITEM_ID,
  sourceId: SYNTHETIC_PROVENANCE.sourceChain[0]!.sourceId,
  providerId: SYNTHETIC_PROVENANCE.provider.providerId,
  ingestionKey: "synthetic-source:synthetic-item",
  fetchedAt: SYNTHETIC_NOW,
  observedAt: SYNTHETIC_NOW,
  externalReference: Object.freeze({
    namespace: "synthetic",
    externalId: "item-1",
  }),
  contentReference: Object.freeze({ availability: "not_retained" as const }),
  contentPolicy: Object.freeze({
    sourcePolicyId: SYNTHETIC_PROVENANCE.policyAssessment.sourcePolicyId,
    policyVersion: createVersion("synthetic-policy-1"),
    commercialUse: "permitted" as const,
    retention: "blocked" as const,
    display: "restricted" as const,
    externalProcessing: "restricted" as const,
  }),
  provenanceRefs,
});

export const SYNTHETIC_CLAIM: ClaimInput = Object.freeze({
  claimId: SYNTHETIC_CLAIM_ID,
  rawNewsItemId: SYNTHETIC_RAW_NEWS_ITEM_ID,
  subject: Object.freeze({
    kind: "player" as const,
    playerId: SYNTHETIC_PLAYERS[0]!.id,
  }),
  claimType: "availability",
  assertedState: "available",
  directness: "direct_report",
  certainty: "medium",
  sourceType: "official_club",
  eventTime: SYNTHETIC_NOW,
  extractedAt: SYNTHETIC_NOW,
  originalReference: Object.freeze({
    namespace: "synthetic",
    externalId: "item-1",
  }),
  extraction: Object.freeze({
    method: "deterministic_rule" as const,
    implementationVersion: createVersion("synthetic-extractor-1"),
    schemaVersion: createVersion("synthetic-claim-1"),
  }),
  provenanceRefs,
});

export const SYNTHETIC_EVIDENCE: EvidenceInput = Object.freeze({
  evidenceId: SYNTHETIC_EVIDENCE_ID,
  claimId: SYNTHETIC_CLAIM_ID,
  rawNewsItemId: SYNTHETIC_RAW_NEWS_ITEM_ID,
  stance: "supports",
  sourceContextCode: "synthetic_direct_report",
  reference: Object.freeze({
    kind: "source_reference" as const,
    locator: "synthetic:item-1",
  }),
  observedAt: SYNTHETIC_NOW,
  ingestedAt: SYNTHETIC_NOW,
  assessedAt: SYNTHETIC_NOW,
  provenanceRefs,
  lifecycleState: "active",
});

export const SYNTHETIC_SIGNAL: NewsSignalInput = Object.freeze({
  newsSignalId: SYNTHETIC_SIGNAL_ID,
  playerId: SYNTHETIC_PLAYERS[0]!.id,
  state: "doubtful",
  evaluatedAt: SYNTHETIC_NOW,
  effectiveFrom: SYNTHETIC_NOW,
  confidenceBand: "low",
  freshness: "current",
  conflictState: "unresolved_conflict",
  claimRefs: Object.freeze([SYNTHETIC_CLAIM_ID, SYNTHETIC_COUNTER_CLAIM_ID]),
  evidenceRefs: Object.freeze([
    SYNTHETIC_EVIDENCE_ID,
    SYNTHETIC_COUNTER_EVIDENCE_ID,
  ]),
  provenanceRefs,
  ruleName: "synthetic-evidence-rule",
  ruleVersion: createVersion("1"),
  reasonCodes: Object.freeze(["synthetic_conflicting_availability"]),
});

export const SYNTHETIC_AVAILABILITY_STATE: PlayerAvailabilityStateInput =
  Object.freeze({
    availabilityStateId: createPlayerAvailabilityStateId(
      "synthetic-availability-state",
    ),
    playerId: SYNTHETIC_PLAYERS[0]!.id,
    availability: "doubtful",
    expectedStartProbability: 0.5,
    expectedMinutes: 45,
    evaluatedAt: SYNTHETIC_NOW,
    effectiveFrom: SYNTHETIC_NOW,
    confidenceBand: "low",
    freshness: "current",
    conflictState: "unresolved_conflict",
    assumptionCodes: Object.freeze(["synthetic_minutes_reduced_for_conflict"]),
    signalRefs: Object.freeze([SYNTHETIC_SIGNAL_ID]),
    evidenceRefs: Object.freeze([
      SYNTHETIC_EVIDENCE_ID,
      SYNTHETIC_COUNTER_EVIDENCE_ID,
    ]),
    provenanceRefs,
    ruleName: "synthetic-availability-rule",
    ruleVersion: createVersion("1"),
  });
