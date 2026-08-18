import {
  createProvenanceId,
  createProvenanceRecord,
  createProviderId,
  createRawNewsItem,
  createRawNewsItemId,
  createSourceId,
  createSourcePolicyId,
  createVersion,
} from "@fpl-intelligence/domain";
import type {
  NewsContentPolicy,
  ProvenanceRecord,
  RawNewsItem,
  SourcePolicyId,
  UtcInstant,
} from "@fpl-intelligence/domain";
import type {
  CuratedNewsSourceAdapter,
  NewsSourceReadRequest,
  NewsSourceReadResult,
} from "./news-ingestion-contracts";
import { NewsIngestionError } from "./news-ingestion-errors";

export interface FirstPartyResearchRecordInput {
  readonly externalId: string;
  readonly publishedAt: UtcInstant;
  readonly summaryCode: string;
  readonly rightsReference: string;
  readonly rightsExpiresAt: UtcInstant;
  readonly approvedEnvironment: "internal_research" | "consented_pilot";
}

export class FirstPartyResearchNewsSourceAdapter implements CuratedNewsSourceAdapter {
  readonly policyId: SourcePolicyId = createSourcePolicyId(
    "news.first-party.research.v1",
  );
  readonly #enabled: boolean;
  readonly #records: readonly FirstPartyResearchRecordInput[];
  readonly #contentPolicy: NewsContentPolicy;

  constructor(options: {
    readonly records: readonly FirstPartyResearchRecordInput[];
    readonly contentPolicy: NewsContentPolicy;
    readonly enabled?: boolean;
  }) {
    this.#enabled = options.enabled ?? false;
    this.#records = Object.freeze(
      options.records.map((record) => Object.freeze({ ...record })),
    );
    this.#contentPolicy = Object.freeze({ ...options.contentPolicy });
  }

  async read(request: NewsSourceReadRequest): Promise<NewsSourceReadResult> {
    if (request.signal.aborted)
      throw new NewsIngestionError("timeout", "Research source was aborted.");
    if (!this.#enabled)
      throw new NewsIngestionError(
        "source_disabled",
        "First-party research news is disabled by default.",
      );
    if (
      request.environment !== "internal_research" &&
      request.environment !== "consented_pilot"
    )
      throw new NewsIngestionError(
        "environment_denied",
        "First-party research news requires an approved research environment.",
      );

    const items = this.#records.map((record) => {
      if (
        record.approvedEnvironment !== request.environment ||
        record.rightsExpiresAt < request.requestedAt ||
        record.rightsReference.trim().length === 0
      )
        throw new NewsIngestionError(
          "rights_missing",
          "First-party record lacks current rights for this environment.",
        );
      return this.#map(record, request.requestedAt, request.environment);
    });
    return Object.freeze({ items: Object.freeze(items), complete: true });
  }

  #map(
    input: FirstPartyResearchRecordInput,
    fetchedAt: UtcInstant,
    environment: "internal_research" | "consented_pilot",
  ): Readonly<{ item: RawNewsItem; provenance: ProvenanceRecord }> {
    const externalId = this.#nonEmpty(input.externalId, "External ID");
    const summaryCode = this.#nonEmpty(input.summaryCode, "Summary code");
    this.#nonEmpty(input.rightsReference, "Rights reference");
    const sourceId = createSourceId("news-source.first-party.research");
    const providerId = createProviderId("news-provider.first-party.direct");
    const provenanceId = createProvenanceId(`news.research.${externalId}`);
    const provenance = createProvenanceRecord({
      provenanceId,
      dataCategory: "news_content",
      sourceChain: [{ sourceId, role: "origin" }],
      provider: {
        providerId,
        product: "first-party direct research input",
        accessPath: "documented direct delivery",
      },
      acquisition: {
        fetchedAt,
        publishedAt: input.publishedAt,
        observedAt: input.publishedAt,
        environment: "development",
        purpose: environment,
        ingestionReference: input.rightsReference,
      },
      externalReference: { namespace: "first-party-research", externalId },
      policyAssessment: {
        sourcePolicyId: this.policyId,
        policyVersion: this.#contentPolicy.policyVersion,
        commercialUse: this.#contentPolicy.commercialUse,
      },
      mapping: {
        adapter: "FirstPartyResearchNewsSourceAdapter",
        adapterVersion: createVersion("1"),
        normalizationVersion: createVersion("1"),
      },
      lifecycle: {
        state: "active",
        evaluatedAt: fetchedAt,
        effectiveUntil: input.rightsExpiresAt,
        ruleVersion: createVersion("1"),
      },
    });
    const item = createRawNewsItem({
      rawNewsItemId: createRawNewsItemId(`research:${externalId}`),
      sourceId,
      providerId,
      ingestionKey: `news.first-party.research.v1:${externalId}`,
      fetchedAt,
      publishedAt: input.publishedAt,
      observedAt: input.publishedAt,
      externalReference: { namespace: "first-party-research", externalId },
      contentReference: {
        availability: "not_retained",
        fingerprint: summaryCode,
      },
      contentPolicy: this.#contentPolicy,
      provenanceRefs: [provenanceId],
    });
    return Object.freeze({ item, provenance });
  }

  #nonEmpty(value: string, label: string): string {
    const normalized = value.trim();
    if (normalized.length === 0)
      throw new NewsIngestionError(
        "invalid_payload",
        `${label} must not be empty.`,
      );
    return normalized;
  }
}
