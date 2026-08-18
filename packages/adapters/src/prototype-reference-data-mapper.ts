import {
  createFixtureId,
  createFplMoney,
  createGameweekId,
  createPlayerId,
  createProviderId,
  createProvenanceId,
  createProvenanceRecord,
  createRulesetId,
  createSeasonId,
  createSourceId,
  createSourcePolicyId,
  createTeamId,
  createUtcInstant,
  createVersion,
  isCommercialUseBlocked,
  validateReferenceDataSnapshot,
} from "@fpl-intelligence/domain";
import type {
  ReferenceDataQuery,
  ReferenceDataSnapshot,
  UtcInstant,
} from "@fpl-intelligence/domain";
import { ReferenceDataAdapterError } from "./reference-data-errors";
import type {
  ReferenceDataAdapterResult,
  ReferenceDataIdentityMap,
  ReferenceDataSourcePolicy,
} from "./reference-data-contracts";
import type { PrototypeReferenceDataDto } from "./prototype-reference-data-dto";

export interface ReferenceDataMappingContext {
  readonly adapterVersion: string;
  readonly fetchedAt: UtcInstant;
  readonly identityMap: ReferenceDataIdentityMap;
  readonly normalizationVersion: string;
  readonly purpose: string;
  readonly sourcePolicy: ReferenceDataSourcePolicy;
}

function resolveAlias(
  aliases: Readonly<Record<string, string>>,
  externalId: string,
  kind: string,
): string {
  const internalId = aliases[externalId];
  if (internalId === undefined || internalId.trim().length === 0) {
    throw new ReferenceDataAdapterError(
      "identity_unresolved",
      `Reference-data ${kind} identity could not be resolved.`,
    );
  }
  return internalId;
}

function queryMatchesPayload(
  query: ReferenceDataQuery,
  dto: PrototypeReferenceDataDto,
  identityMap: ReferenceDataIdentityMap,
): void {
  if (
    query.seasonId !== identityMap.season.internalId ||
    dto.snapshot.season.external_id !== identityMap.season.externalId
  ) {
    throw new ReferenceDataAdapterError(
      "query_unsupported",
      "The reference-data source does not contain the requested season.",
    );
  }

  if (
    query.gameweekId !== undefined &&
    (query.gameweekId.seasonId !== query.seasonId ||
      query.gameweekId.number !== dto.snapshot.gameweek.number)
  ) {
    throw new ReferenceDataAdapterError(
      "query_unsupported",
      "The reference-data source does not contain the requested gameweek.",
    );
  }
}

export function mapPrototypeReferenceData(
  dto: PrototypeReferenceDataDto,
  query: ReferenceDataQuery,
  context: ReferenceDataMappingContext,
): ReferenceDataAdapterResult {
  queryMatchesPayload(query, dto, context.identityMap);

  try {
    const seasonId = createSeasonId(context.identityMap.season.internalId);
    const gameweekId = createGameweekId(seasonId, dto.snapshot.gameweek.number);
    const provenanceId = createProvenanceId(
      `reference-data:${context.sourcePolicy.providerId}:${seasonId}:gw-${dto.snapshot.gameweek.number}:${dto.schema_version}`,
    );
    const provenance = createProvenanceRecord({
      provenanceId,
      dataCategory: "other_reviewed_external_data",
      sourceChain: [
        {
          sourceId: createSourceId(context.sourcePolicy.sourceId),
          role: "origin",
        },
      ],
      provider: {
        providerId: createProviderId(context.sourcePolicy.providerId),
        product: context.sourcePolicy.providerProduct,
        accessPath: context.sourcePolicy.accessPath,
      },
      acquisition: {
        fetchedAt: context.fetchedAt,
        environment: context.sourcePolicy.environment,
        purpose: context.purpose,
      },
      policyAssessment: {
        sourcePolicyId: createSourcePolicyId(
          context.sourcePolicy.sourcePolicyId,
        ),
        policyVersion: createVersion(context.sourcePolicy.policyVersion),
        commercialUse: context.sourcePolicy.commercialUse,
      },
      mapping: {
        adapter: "prototype-reference-data-adapter",
        adapterVersion: createVersion(context.adapterVersion),
        providerSchemaVersion: createVersion(dto.schema_version),
        normalizationVersion: createVersion(context.normalizationVersion),
      },
      lifecycle: {
        state: context.sourcePolicy.freshness === "stale" ? "stale" : "active",
        evaluatedAt: context.fetchedAt,
        ruleVersion: createVersion(context.normalizationVersion),
      },
    });

    if (isCommercialUseBlocked(provenance.policyAssessment)) {
      throw new ReferenceDataAdapterError(
        "policy_blocked",
        "Reference-data commercial-use classification blocks this path.",
      );
    }

    const provenanceRefs = Object.freeze([provenanceId]);
    const teams = Object.freeze(
      dto.snapshot.teams.map((team) =>
        Object.freeze({
          id: createTeamId(
            resolveAlias(context.identityMap.teams, team.external_id, "team"),
          ),
          name: team.name,
          shortName: team.short_name,
          provenanceRefs,
        }),
      ),
    );
    const players = Object.freeze(
      dto.snapshot.players.map((player) =>
        Object.freeze({
          id: createPlayerId(
            resolveAlias(
              context.identityMap.players,
              player.external_id,
              "player",
            ),
          ),
          displayName: player.display_name,
          teamId: createTeamId(
            resolveAlias(
              context.identityMap.teams,
              player.team_external_id,
              "team",
            ),
          ),
          position: player.position,
          currentPrice:
            player.current_price_tenths === null
              ? null
              : createFplMoney(player.current_price_tenths),
          availability: Object.freeze({
            status: player.availability,
            asOf: createUtcInstant(player.availability_as_of),
            provenanceRefs,
          }),
          provenanceRefs,
        }),
      ),
    );
    const snapshot: ReferenceDataSnapshot = Object.freeze({
      season: Object.freeze({
        id: seasonId,
        label: dto.snapshot.season.label,
        provenanceRefs,
      }),
      gameweek: Object.freeze({
        id: gameweekId,
        label: dto.snapshot.gameweek.label,
        deadline:
          dto.snapshot.gameweek.deadline === null
            ? null
            : createUtcInstant(dto.snapshot.gameweek.deadline),
        state: dto.snapshot.gameweek.state,
        provenanceRefs,
      }),
      rules: Object.freeze({
        identity: Object.freeze({
          rulesetId: createRulesetId(
            resolveAlias(
              context.identityMap.rulesets,
              dto.snapshot.rules.ruleset_external_id,
              "ruleset",
            ),
          ),
          version: createVersion(dto.snapshot.rules.version),
          seasonId,
        }),
        squadSize: dto.snapshot.rules.squad_size,
        lineupSize: dto.snapshot.rules.lineup_size,
        benchSize: dto.snapshot.rules.bench_size,
        positions: Object.freeze({
          goalkeeper: Object.freeze({
            squadCount: dto.snapshot.rules.positions.goalkeeper.squad_count,
            minimumStarters:
              dto.snapshot.rules.positions.goalkeeper.minimum_starters,
            maximumStarters:
              dto.snapshot.rules.positions.goalkeeper.maximum_starters,
          }),
          defender: Object.freeze({
            squadCount: dto.snapshot.rules.positions.defender.squad_count,
            minimumStarters:
              dto.snapshot.rules.positions.defender.minimum_starters,
            maximumStarters:
              dto.snapshot.rules.positions.defender.maximum_starters,
          }),
          midfielder: Object.freeze({
            squadCount: dto.snapshot.rules.positions.midfielder.squad_count,
            minimumStarters:
              dto.snapshot.rules.positions.midfielder.minimum_starters,
            maximumStarters:
              dto.snapshot.rules.positions.midfielder.maximum_starters,
          }),
          forward: Object.freeze({
            squadCount: dto.snapshot.rules.positions.forward.squad_count,
            minimumStarters:
              dto.snapshot.rules.positions.forward.minimum_starters,
            maximumStarters:
              dto.snapshot.rules.positions.forward.maximum_starters,
          }),
        }),
        maxPlayersPerTeam: dto.snapshot.rules.max_players_per_team,
        captainMustStart: dto.snapshot.rules.captain_must_start,
        freeTransfers: Object.freeze({
          minimum: dto.snapshot.rules.free_transfers.minimum,
          maximum: dto.snapshot.rules.free_transfers.maximum,
        }),
        chipIds: Object.freeze([...dto.snapshot.rules.chip_ids]),
      }),
      teams,
      players,
      fixtures: Object.freeze(
        dto.snapshot.fixtures.map((fixture) =>
          Object.freeze({
            id: createFixtureId(
              resolveAlias(
                context.identityMap.fixtures,
                fixture.external_id,
                "fixture",
              ),
            ),
            gameweekId:
              fixture.gameweek_number === null
                ? null
                : createGameweekId(seasonId, fixture.gameweek_number),
            homeTeamId: createTeamId(
              resolveAlias(
                context.identityMap.teams,
                fixture.home_team_external_id,
                "team",
              ),
            ),
            awayTeamId: createTeamId(
              resolveAlias(
                context.identityMap.teams,
                fixture.away_team_external_id,
                "team",
              ),
            ),
            kickoff:
              fixture.kickoff === null
                ? null
                : createUtcInstant(fixture.kickoff),
            state: fixture.state,
            provenanceRefs,
          }),
        ),
      ),
      provenanceRefs,
    });

    const issues = validateReferenceDataSnapshot(snapshot);
    if (issues.length > 0) {
      throw new ReferenceDataAdapterError(
        "mapping_invalid",
        "Mapped reference data violates domain invariants.",
        { path: issues[0]!.path },
      );
    }

    return Object.freeze({
      value: snapshot,
      provenanceRefs,
      provenanceRecords: Object.freeze([provenance]),
      sourcePolicyId: provenance.policyAssessment.sourcePolicyId,
      freshness: context.sourcePolicy.freshness,
      warnings: Object.freeze([]),
    });
  } catch (error) {
    if (error instanceof ReferenceDataAdapterError) {
      throw error;
    }

    throw new ReferenceDataAdapterError(
      "mapping_invalid",
      "Reference data could not be mapped to domain contracts.",
      {},
      { cause: error },
    );
  }
}
