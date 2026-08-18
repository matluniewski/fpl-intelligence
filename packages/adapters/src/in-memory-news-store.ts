import type {
  ProvenanceId,
  ProvenanceRecord,
  RawNewsItemId,
} from "@fpl-intelligence/domain";
import type {
  ProvenanceRecordStore,
  RawNewsItemStore,
  StoredRawNewsItem,
} from "./news-ingestion-contracts";

export class InMemoryRawNewsItemStore implements RawNewsItemStore {
  readonly #byId = new Map<RawNewsItemId, StoredRawNewsItem>();
  readonly #byKey = new Map<string, StoredRawNewsItem>();

  async getByIngestionKey(key: string): Promise<StoredRawNewsItem | null> {
    return this.#byKey.get(key) ?? null;
  }

  async getById(id: RawNewsItemId): Promise<StoredRawNewsItem | null> {
    return this.#byId.get(id) ?? null;
  }

  async save(record: StoredRawNewsItem): Promise<void> {
    this.#byId.set(record.item.rawNewsItemId, record);
    this.#byKey.set(record.item.ingestionKey, record);
  }
}

export class InMemoryProvenanceRecordStore implements ProvenanceRecordStore {
  readonly #records = new Map<ProvenanceId, ProvenanceRecord>();

  async getById(id: ProvenanceId): Promise<ProvenanceRecord | null> {
    return this.#records.get(id) ?? null;
  }

  async save(record: ProvenanceRecord): Promise<void> {
    this.#records.set(record.provenanceId, record);
  }
}
