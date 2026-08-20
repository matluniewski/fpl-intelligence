import type { SourceId } from "./identifiers";
import type { NewsSourceType } from "./news-intelligence";
import type { UtcInstant, Version } from "./primitives";

export type SourceReputationContext =
  | "general"
  | "club_specific"
  | "injury_availability"
  | "lineup_leak"
  | "transfer_news";
export type SourceReliabilityTier =
  "authoritative" | "trusted" | "standard" | "conservative";

export interface SourceReputationProfile {
  readonly sourceId: SourceId;
  readonly sourceType: NewsSourceType;
  readonly contexts: readonly SourceReputationContext[];
  readonly tier: SourceReliabilityTier;
  readonly rationaleCode: string;
  readonly policyVersion: Version;
  readonly reviewedAt: UtcInstant;
}
export interface SourceReputationCatalog {
  readonly version: Version;
  readonly profiles: readonly SourceReputationProfile[];
}
export interface SourceReputationAssessment {
  readonly sourceId: SourceId;
  readonly sourceType: NewsSourceType;
  readonly context: SourceReputationContext;
  readonly tier: SourceReliabilityTier;
  readonly contextMatched: boolean;
  readonly rationaleCodes: readonly string[];
  readonly catalogVersion: Version;
  readonly reviewedAt: UtcInstant | null;
}
export class SourceReputationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceReputationError";
  }
}

export function createSourceReputationCatalog(
  input: SourceReputationCatalog,
): SourceReputationCatalog {
  const seen = new Set<SourceId>();
  for (const profile of input.profiles) {
    if (seen.has(profile.sourceId))
      throw new SourceReputationError(
        "Source reputation profiles must be unique.",
      );
    if (
      profile.contexts.length === 0 ||
      profile.rationaleCode.trim().length === 0
    )
      throw new SourceReputationError(
        "Profiles require contexts and a rationale code.",
      );
    seen.add(profile.sourceId);
  }
  return Object.freeze({
    version: input.version,
    profiles: Object.freeze(
      input.profiles.map((profile) =>
        Object.freeze({
          ...profile,
          contexts: Object.freeze([...profile.contexts]),
        }),
      ),
    ),
  });
}

/** Claim certainty, directness, corroboration and signal confidence remain separate inputs. */
export function assessSourceReputation(input: {
  readonly catalog: SourceReputationCatalog;
  readonly sourceId: SourceId;
  readonly sourceType: NewsSourceType;
  readonly context: SourceReputationContext;
}): SourceReputationAssessment {
  const profile = input.catalog.profiles.find(
    (candidate) => candidate.sourceId === input.sourceId,
  );
  const contextMatched =
    profile !== undefined && profile.contexts.includes(input.context);
  if (!contextMatched)
    return Object.freeze({
      sourceId: input.sourceId,
      sourceType: input.sourceType,
      context: input.context,
      tier: "conservative",
      contextMatched: false,
      rationaleCodes: Object.freeze([
        "source_reputation_unknown_or_context_mismatch",
      ]),
      catalogVersion: input.catalog.version,
      reviewedAt: profile?.reviewedAt ?? null,
    });
  return Object.freeze({
    sourceId: input.sourceId,
    sourceType: input.sourceType,
    context: input.context,
    tier: profile.tier,
    contextMatched: true,
    rationaleCodes: Object.freeze([profile.rationaleCode]),
    catalogVersion: input.catalog.version,
    reviewedAt: profile.reviewedAt,
  });
}
