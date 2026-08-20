import type {
  Claim,
  ClaimId,
  RawNewsItem,
  RawNewsItemId,
  SourceId,
} from "@fpl-intelligence/domain";

export interface CanonicalRawNewsItemGroup {
  readonly canonicalRawNewsItemId: RawNewsItemId;
  readonly rawNewsItemIds: readonly RawNewsItemId[];
}

export interface ClaimDeduplicationInput {
  readonly claim: Claim;
  readonly rawNewsItem: RawNewsItem;
}

export interface CanonicalClaimGroup {
  readonly canonicalClaimId: ClaimId;
  readonly claimIds: readonly ClaimId[];
  readonly rawNewsItemIds: readonly RawNewsItemId[];
  readonly sourceIds: readonly SourceId[];
  readonly independentSourceCount: number;
}

/** Exact normalized-ingestion deduplication; provider-specific identifiers never leave the adapter. */
export function deduplicateRawNewsItems(
  items: readonly RawNewsItem[],
): readonly CanonicalRawNewsItemGroup[] {
  const groups = new Map<string, RawNewsItem[]>();
  for (const item of items) {
    const group = groups.get(item.ingestionKey) ?? [];
    group.push(item);
    groups.set(item.ingestionKey, group);
  }
  return Object.freeze(
    [...groups.values()]
      .map((group) => {
        const ids = group.map((item) => item.rawNewsItemId).sort();
        return Object.freeze({
          canonicalRawNewsItemId: ids[0]!,
          rawNewsItemIds: Object.freeze(ids),
        });
      })
      .sort((left, right) =>
        left.canonicalRawNewsItemId.localeCompare(right.canonicalRawNewsItemId),
      ),
  );
}

/**
 * Groups only identical normalized assertions. Contradictory asserted states
 * intentionally receive different keys and remain available to the Evidence Engine.
 */
export function deduplicateClaims(
  entries: readonly ClaimDeduplicationInput[],
): readonly CanonicalClaimGroup[] {
  const groups = new Map<string, ClaimDeduplicationInput[]>();
  for (const entry of entries) {
    const key = semanticClaimKey(entry.claim);
    const group = groups.get(key) ?? [];
    group.push(entry);
    groups.set(key, group);
  }
  return Object.freeze(
    [...groups.values()]
      .map((group) => {
        const claimIds = group.map((entry) => entry.claim.claimId).sort();
        const rawNewsItemIds = [
          ...new Set(group.map((entry) => entry.rawNewsItem.rawNewsItemId)),
        ].sort();
        const sourceIds = [
          ...new Set(group.map((entry) => entry.rawNewsItem.sourceId)),
        ].sort();
        return Object.freeze({
          canonicalClaimId: claimIds[0]!,
          claimIds: Object.freeze(claimIds),
          rawNewsItemIds: Object.freeze(rawNewsItemIds),
          sourceIds: Object.freeze(sourceIds),
          independentSourceCount: sourceIds.length,
        });
      })
      .sort((left, right) =>
        left.canonicalClaimId.localeCompare(right.canonicalClaimId),
      ),
  );
}

function semanticClaimKey(claim: Claim): string {
  const subject =
    claim.subject.kind === "player"
      ? claim.subject.playerId
      : claim.subject.teamId;
  return [
    claim.subject.kind,
    subject,
    claim.claimType,
    claim.assertedState,
    claim.eventTime ?? "no-event-time",
  ].join("|");
}
