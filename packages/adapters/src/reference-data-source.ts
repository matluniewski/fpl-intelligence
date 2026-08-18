import { ReferenceDataSourceError } from "./reference-data-errors";

export interface ReferenceDataSource {
  read(signal: AbortSignal): Promise<unknown>;
}

export class StaticReferenceDataSource implements ReferenceDataSource {
  readonly #payload: unknown;

  constructor(payload: unknown) {
    this.#payload = payload;
  }

  async read(signal: AbortSignal): Promise<unknown> {
    if (signal.aborted) {
      throw new ReferenceDataSourceError("timeout");
    }

    return this.#payload;
  }
}

export class JsonTextReferenceDataSource implements ReferenceDataSource {
  readonly #readText: (signal: AbortSignal) => Promise<string>;

  constructor(readText: (signal: AbortSignal) => Promise<string>) {
    this.#readText = readText;
  }

  async read(signal: AbortSignal): Promise<unknown> {
    const text = await this.#readText(signal);

    try {
      return JSON.parse(text) as unknown;
    } catch (error) {
      throw new ReferenceDataSourceError("invalid_payload", {
        cause: error,
      });
    }
  }
}
