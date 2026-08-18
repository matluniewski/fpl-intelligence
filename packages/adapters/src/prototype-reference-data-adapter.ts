import { createVersion } from "@fpl-intelligence/domain";
import type {
  FootballReferenceDataPort,
  ReferenceDataQuery,
  ReferenceDataSnapshot,
  UtcInstant,
  Version,
} from "@fpl-intelligence/domain";
import {
  normalizeSourceError,
  ReferenceDataAdapterError,
} from "./reference-data-errors";
import type {
  ReferenceDataAdapterResult,
  ReferenceDataIdentityMap,
  ReferenceDataSourcePolicy,
} from "./reference-data-contracts";
import { mapPrototypeReferenceData } from "./prototype-reference-data-mapper";
import { parsePrototypeReferenceDataDto } from "./prototype-reference-data-dto";
import type { ReferenceDataSource } from "./reference-data-source";
import { NOOP_USAGE_RECORDER } from "./usage-telemetry";
import type {
  ReferenceDataUsageEvent,
  UsageOutcome,
  UsageRecorder,
} from "./usage-telemetry";

export interface AdapterClock {
  now(): UtcInstant;
}

export interface PrototypeReferenceDataAdapterOptions {
  readonly adapterVersion: string;
  readonly clock: AdapterClock;
  readonly costEstimationStatus?: "not_applicable" | "unknown";
  readonly eventIdFactory: () => string;
  readonly identityMap: ReferenceDataIdentityMap;
  readonly normalizationVersion: string;
  readonly providerRef: string;
  readonly purpose: string;
  readonly source: ReferenceDataSource;
  readonly sourcePolicy: ReferenceDataSourcePolicy;
  readonly supportedSchemaVersion: string;
  readonly timeoutMs: number;
  readonly usageRecorder?: UsageRecorder;
}

function assertNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new RangeError(`${label} must not be empty.`);
  }
  return normalized;
}

function outcomeForError(error: ReferenceDataAdapterError): UsageOutcome {
  if (error.code === "rate_limited") {
    return "rate_limited";
  }
  return error.code === "timeout" ? "cancelled" : "failed";
}

export class PrototypeReferenceDataAdapter implements FootballReferenceDataPort {
  readonly #adapterVersion: string;
  readonly #clock: AdapterClock;
  readonly #costEstimationStatus: "not_applicable" | "unknown";
  readonly #eventIdFactory: () => string;
  readonly #instrumentationVersion: Version;
  readonly #identityMap: ReferenceDataIdentityMap;
  readonly #normalizationVersion: string;
  readonly #providerRef: string;
  readonly #purpose: string;
  readonly #source: ReferenceDataSource;
  readonly #sourcePolicy: ReferenceDataSourcePolicy;
  readonly #supportedSchemaVersion: string;
  readonly #timeoutMs: number;
  readonly #usageRecorder: UsageRecorder;

  constructor(options: PrototypeReferenceDataAdapterOptions) {
    if (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs <= 0) {
      throw new RangeError(
        "Reference-data timeout must be a positive integer.",
      );
    }

    this.#adapterVersion = assertNonEmpty(
      options.adapterVersion,
      "Adapter version",
    );
    this.#clock = options.clock;
    this.#costEstimationStatus = options.costEstimationStatus ?? "unknown";
    this.#eventIdFactory = options.eventIdFactory;
    this.#identityMap = Object.freeze({
      fixtures: Object.freeze({ ...options.identityMap.fixtures }),
      players: Object.freeze({ ...options.identityMap.players }),
      rulesets: Object.freeze({ ...options.identityMap.rulesets }),
      season: Object.freeze({ ...options.identityMap.season }),
      teams: Object.freeze({ ...options.identityMap.teams }),
    });
    this.#instrumentationVersion = createVersion("reference-data-usage-v1");
    this.#normalizationVersion = assertNonEmpty(
      options.normalizationVersion,
      "Normalization version",
    );
    this.#providerRef = assertNonEmpty(
      options.providerRef,
      "Telemetry provider reference",
    );
    this.#purpose = assertNonEmpty(options.purpose, "Acquisition purpose");
    this.#source = options.source;
    this.#sourcePolicy = Object.freeze({ ...options.sourcePolicy });
    this.#supportedSchemaVersion = assertNonEmpty(
      options.supportedSchemaVersion,
      "Supported source schema version",
    );
    this.#timeoutMs = options.timeoutMs;
    this.#usageRecorder = options.usageRecorder ?? NOOP_USAGE_RECORDER;
  }

  async loadReferenceData(
    query: ReferenceDataQuery,
  ): Promise<ReferenceDataSnapshot> {
    return (await this.loadReferenceDataWithContext(query)).value;
  }

  async loadReferenceDataWithContext(
    query: ReferenceDataQuery,
  ): Promise<ReferenceDataAdapterResult> {
    const eventId = assertNonEmpty(
      this.#eventIdFactory(),
      "Usage event identifier",
    );
    const occurredAt = this.#clock.now();

    try {
      const payload = await this.#readWithTimeout();
      const dto = parsePrototypeReferenceDataDto(payload);
      if (dto.schema_version !== this.#supportedSchemaVersion) {
        throw new ReferenceDataAdapterError(
          "unsupported_schema",
          "Reference-data payload uses an unsupported schema version.",
        );
      }
      const result = mapPrototypeReferenceData(dto, query, {
        adapterVersion: this.#adapterVersion,
        fetchedAt: this.#clock.now(),
        identityMap: this.#identityMap,
        normalizationVersion: this.#normalizationVersion,
        purpose: this.#purpose,
        sourcePolicy: this.#sourcePolicy,
      });
      const telemetryFailed = !(await this.#recordUsage({
        eventId,
        occurredAt,
        outcome: "succeeded",
        provenanceRef: result.provenanceRefs[0],
        recordsReturned:
          result.value.teams.length +
          result.value.players.length +
          result.value.fixtures.length,
      }));

      if (!telemetryFailed) {
        return result;
      }

      return Object.freeze({
        ...result,
        warnings: Object.freeze([
          ...result.warnings,
          "usage_telemetry_unavailable",
        ]),
      });
    } catch (error) {
      const normalized = normalizeSourceError(error);
      await this.#recordUsage({
        eventId,
        occurredAt,
        outcome: outcomeForError(normalized),
        recordsReturned: 0,
      });
      throw normalized;
    }
  }

  async #readWithTimeout(): Promise<unknown> {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(
          new ReferenceDataAdapterError(
            "timeout",
            "Reference-data acquisition timed out.",
          ),
        );
      }, this.#timeoutMs);
    });

    try {
      return await Promise.race([
        this.#source.read(controller.signal),
        timeoutPromise,
      ]);
    } finally {
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
    }
  }

  async #recordUsage(input: {
    readonly eventId: string;
    readonly occurredAt: UtcInstant;
    readonly outcome: UsageOutcome;
    readonly provenanceRef?: ReferenceDataUsageEvent["provenanceRef"];
    readonly recordsReturned: number;
  }): Promise<boolean> {
    const event: ReferenceDataUsageEvent = Object.freeze({
      eventId: input.eventId,
      idempotencyKey: input.eventId,
      occurredAt: input.occurredAt,
      recordedAt: this.#clock.now(),
      serviceCategory: "football_data",
      providerRef: this.#providerRef,
      operation: "reference_data.load",
      measurements: Object.freeze([
        Object.freeze({
          metric: "request_count",
          quantity: 1,
          unit: "request",
          measurementStatus: "measured",
        }),
        ...(input.recordsReturned === 0
          ? []
          : [
              Object.freeze({
                metric: "records_returned" as const,
                quantity: input.recordsReturned,
                unit: "record" as const,
                measurementStatus: "measured" as const,
              }),
            ]),
      ]),
      outcome: input.outcome,
      attribution: Object.freeze({ scope: "shared_global" }),
      correlation: Object.freeze({ requestId: input.eventId }),
      ...(input.provenanceRef === undefined
        ? {}
        : { provenanceRef: input.provenanceRef }),
      estimateMetadata: Object.freeze({
        status: this.#costEstimationStatus,
      }),
      instrumentationVersion: this.#instrumentationVersion,
    });

    try {
      await this.#usageRecorder.record(event);
      return true;
    } catch {
      return false;
    }
  }
}
