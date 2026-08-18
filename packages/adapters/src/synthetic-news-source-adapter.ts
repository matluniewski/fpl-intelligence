import {
  createProvenanceId,
  createProvenanceRecord,
  createProviderId,
  createRawNewsItem,
  createRawNewsItemId,
  createSourceId,
  createSourcePolicyId,
  createUtcInstant,
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

interface SyntheticNewsItemDto {
  readonly external_id: string;
  readonly published_at: UtcInstant;
  readonly synthetic_summary_code: string;
}

export interface SyntheticNewsFixtureDto {
  readonly schema_version: "synthetic-news-v1";
  readonly items: readonly SyntheticNewsItemDto[];
}

function parsePayload(value: unknown): SyntheticNewsFixtureDto {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new NewsIngestionError(
      "invalid_payload",
      "Synthetic news payload must be an object.",
    );
  }
  const payload = value as Record<string, unknown>;
  if (
    payload["schema_version"] !== "synthetic-news-v1" ||
    !Array.isArray(payload["items"])
  ) {
    throw new NewsIngestionError(
      "invalid_payload",
      "Synthetic news schema is unsupported.",
    );
  }
  const items = payload["items"].map((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new NewsIngestionError(
        "invalid_payload",
        `Synthetic item ${index} must be an object.`,
      );
    }
    const record = item as Record<string, unknown>;
    const externalId = record["external_id"];
    const publishedAt = record["published_at"];
    const summaryCode = record["synthetic_summary_code"];
    if (
      typeof externalId !== "string" ||
      externalId.trim().length === 0 ||
      typeof publishedAt !== "string" ||
      publishedAt.trim().length === 0 ||
      typeof summaryCode !== "string" ||
      summaryCode.trim().length === 0
    ) {
      throw new NewsIngestionError(
        "invalid_payload",
        `Synthetic item ${index} fields are invalid.`,
      );
    }
    return Object.freeze({
      external_id: externalId.trim(),
      published_at: createUtcInstant(publishedAt),
      synthetic_summary_code: summaryCode.trim(),
    });
  });
  return Object.freeze({
    schema_version: "synthetic-news-v1",
    items: Object.freeze(items),
  });
}

export class SyntheticNewsSourceAdapter implements CuratedNewsSourceAdapter {
  readonly policyId: SourcePolicyId;
  readonly #payload: unknown;
  readonly #contentPolicy: NewsContentPolicy;

  constructor(payload: unknown, contentPolicy: NewsContentPolicy) {
    this.#payload = payload;
    this.#contentPolicy = Object.freeze({ ...contentPolicy });
    this.policyId = createSourcePolicyId("news.synthetic.fixture.v1");
  }

  async read(request: NewsSourceReadRequest): Promise<NewsSourceReadResult> {
    if (request.signal.aborted)
      throw new NewsIngestionError("timeout", "Synthetic source was aborted.");
    const payload = parsePayload(this.#payload);
    const items = payload.items.map((dto) => this.#map(dto, request));
    return Object.freeze({ items: Object.freeze(items), complete: true });
  }

  #map(
    dto: SyntheticNewsItemDto,
    request: NewsSourceReadRequest,
  ): Readonly<{ item: RawNewsItem; provenance: ProvenanceRecord }> {
    const sourceId = createSourceId("news-source.synthetic.fixture");
    const providerId = createProviderId("news-provider.synthetic.fixture");
    const provenanceId = createProvenanceId(
      `news.synthetic.${dto.external_id}`,
    );
    const provenance: ProvenanceRecord = createProvenanceRecord({
      provenanceId,
      dataCategory: "news_content",
      sourceChain: [{ sourceId, role: "origin" }],
      provider: {
        providerId,
        product: "project-authored synthetic fixture",
        accessPath: "checked-in fixture",
      },
      acquisition: {
        fetchedAt: request.requestedAt,
        publishedAt: dto.published_at,
        observedAt: dto.published_at,
        environment: request.environment === "test" ? "test" : "development",
        purpose: "synthetic news ingestion verification",
      },
      externalReference: {
        namespace: "synthetic-news",
        externalId: dto.external_id,
      },
      policyAssessment: {
        sourcePolicyId: this.policyId,
        policyVersion: this.#contentPolicy.policyVersion,
        commercialUse: this.#contentPolicy.commercialUse,
      },
      mapping: {
        adapter: "SyntheticNewsSourceAdapter",
        adapterVersion: createVersion("1"),
        providerSchemaVersion: createVersion("synthetic-news-v1"),
        normalizationVersion: createVersion("1"),
      },
      lifecycle: {
        state: "active",
        evaluatedAt: request.requestedAt,
        ruleVersion: createVersion("1"),
      },
    });
    const item = createRawNewsItem({
      rawNewsItemId: createRawNewsItemId(`synthetic:${dto.external_id}`),
      sourceId,
      providerId,
      ingestionKey: `news.synthetic.fixture.v1:${dto.external_id}`,
      fetchedAt: request.requestedAt,
      publishedAt: dto.published_at,
      observedAt: dto.published_at,
      externalReference: {
        namespace: "synthetic-news",
        externalId: dto.external_id,
      },
      contentReference: {
        availability: "not_retained",
        fingerprint: dto.synthetic_summary_code,
      },
      contentPolicy: this.#contentPolicy,
      provenanceRefs: [provenanceId],
    });
    return Object.freeze({ item, provenance });
  }
}
