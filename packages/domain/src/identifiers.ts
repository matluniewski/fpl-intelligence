declare const identifierBrand: unique symbol;

export type Identifier<Kind extends string> = string & {
  readonly [identifierBrand]: Kind;
};

export type PlayerId = Identifier<"PlayerId">;
export type TeamId = Identifier<"TeamId">;
export type FixtureId = Identifier<"FixtureId">;
export type SeasonId = Identifier<"SeasonId">;
export type RulesetId = Identifier<"RulesetId">;
export type TeamStateCandidateId = Identifier<"TeamStateCandidateId">;
export type TeamStateId = Identifier<"TeamStateId">;
export type SquadSlotId = Identifier<"SquadSlotId">;
export type ProvenanceId = Identifier<"ProvenanceId">;
export type SourceId = Identifier<"SourceId">;
export type ProviderId = Identifier<"ProviderId">;
export type SourcePolicyId = Identifier<"SourcePolicyId">;
export type EphemeralArtifactId = Identifier<"EphemeralArtifactId">;
export type RawNewsItemId = Identifier<"RawNewsItemId">;
export type ClaimId = Identifier<"ClaimId">;
export type EvidenceId = Identifier<"EvidenceId">;
export type NewsSignalId = Identifier<"NewsSignalId">;
export type PlayerAvailabilityStateId = Identifier<"PlayerAvailabilityStateId">;
export type RecommendationId = Identifier<"RecommendationId">;
export type RecommendationOptionId = Identifier<"RecommendationOptionId">;
export type RecommendationEvidenceId = Identifier<"RecommendationEvidenceId">;

function createIdentifier<Kind extends string>(
  value: string,
  label: Kind,
): Identifier<Kind> {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new RangeError(`${label} must not be empty.`);
  }

  return normalized as Identifier<Kind>;
}

export const createPlayerId = (value: string): PlayerId =>
  createIdentifier(value, "PlayerId");
export const createTeamId = (value: string): TeamId =>
  createIdentifier(value, "TeamId");
export const createFixtureId = (value: string): FixtureId =>
  createIdentifier(value, "FixtureId");
export const createSeasonId = (value: string): SeasonId =>
  createIdentifier(value, "SeasonId");
export const createRulesetId = (value: string): RulesetId =>
  createIdentifier(value, "RulesetId");
export const createTeamStateCandidateId = (
  value: string,
): TeamStateCandidateId => createIdentifier(value, "TeamStateCandidateId");
export const createTeamStateId = (value: string): TeamStateId =>
  createIdentifier(value, "TeamStateId");
export const createSquadSlotId = (value: string): SquadSlotId =>
  createIdentifier(value, "SquadSlotId");
export const createProvenanceId = (value: string): ProvenanceId =>
  createIdentifier(value, "ProvenanceId");
export const createSourceId = (value: string): SourceId =>
  createIdentifier(value, "SourceId");
export const createProviderId = (value: string): ProviderId =>
  createIdentifier(value, "ProviderId");
export const createSourcePolicyId = (value: string): SourcePolicyId =>
  createIdentifier(value, "SourcePolicyId");
export const createEphemeralArtifactId = (value: string): EphemeralArtifactId =>
  createIdentifier(value, "EphemeralArtifactId");
export const createRawNewsItemId = (value: string): RawNewsItemId =>
  createIdentifier(value, "RawNewsItemId");
export const createClaimId = (value: string): ClaimId =>
  createIdentifier(value, "ClaimId");
export const createEvidenceId = (value: string): EvidenceId =>
  createIdentifier(value, "EvidenceId");
export const createNewsSignalId = (value: string): NewsSignalId =>
  createIdentifier(value, "NewsSignalId");
export const createPlayerAvailabilityStateId = (
  value: string,
): PlayerAvailabilityStateId =>
  createIdentifier(value, "PlayerAvailabilityStateId");
export const createRecommendationId = (value: string): RecommendationId =>
  createIdentifier(value, "RecommendationId");
export const createRecommendationOptionId = (
  value: string,
): RecommendationOptionId => createIdentifier(value, "RecommendationOptionId");
export const createRecommendationEvidenceId = (
  value: string,
): RecommendationEvidenceId =>
  createIdentifier(value, "RecommendationEvidenceId");
