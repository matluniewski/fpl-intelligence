export type ReferenceDataAdapterErrorCode =
  | "invalid_payload"
  | "identity_unresolved"
  | "mapping_invalid"
  | "non_success_response"
  | "policy_blocked"
  | "query_unsupported"
  | "rate_limited"
  | "source_unavailable"
  | "timeout"
  | "unsupported_schema";

export interface ReferenceDataAdapterErrorDetails {
  readonly path?: string;
  readonly retryAfterMs?: number;
  readonly statusCode?: number;
}

export class ReferenceDataAdapterError extends Error {
  readonly code: ReferenceDataAdapterErrorCode;
  readonly details: ReferenceDataAdapterErrorDetails;

  constructor(
    code: ReferenceDataAdapterErrorCode,
    message: string,
    details: ReferenceDataAdapterErrorDetails = {},
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ReferenceDataAdapterError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

export type ReferenceDataSourceErrorCode =
  | "invalid_payload"
  | "non_success_response"
  | "rate_limited"
  | "source_unavailable"
  | "timeout";

export class ReferenceDataSourceError extends Error {
  readonly code: ReferenceDataSourceErrorCode;
  readonly retryAfterMs: number | undefined;
  readonly statusCode: number | undefined;

  constructor(
    code: ReferenceDataSourceErrorCode,
    options: {
      readonly retryAfterMs?: number;
      readonly statusCode?: number;
      readonly cause?: unknown;
    } = {},
  ) {
    if (
      options.statusCode !== undefined &&
      (!Number.isSafeInteger(options.statusCode) ||
        options.statusCode < 100 ||
        options.statusCode > 599)
    ) {
      throw new RangeError("Source status code must be an HTTP status code.");
    }

    if (
      options.retryAfterMs !== undefined &&
      (!Number.isSafeInteger(options.retryAfterMs) || options.retryAfterMs < 0)
    ) {
      throw new RangeError(
        "Source retry delay must be a non-negative integer.",
      );
    }

    super(`Reference-data source failed with category: ${code}.`, {
      cause: options.cause,
    });
    this.name = "ReferenceDataSourceError";
    this.code = code;
    this.retryAfterMs = options.retryAfterMs;
    this.statusCode = options.statusCode;
  }
}

export function normalizeSourceError(
  error: unknown,
): ReferenceDataAdapterError {
  if (error instanceof ReferenceDataAdapterError) {
    return error;
  }

  if (error instanceof ReferenceDataSourceError) {
    const details: ReferenceDataAdapterErrorDetails = {
      ...(error.retryAfterMs === undefined
        ? {}
        : { retryAfterMs: error.retryAfterMs }),
      ...(error.statusCode === undefined
        ? {}
        : { statusCode: error.statusCode }),
    };

    return new ReferenceDataAdapterError(
      error.code,
      `Reference-data acquisition failed with category: ${error.code}.`,
      details,
      { cause: error },
    );
  }

  return new ReferenceDataAdapterError(
    "source_unavailable",
    "Reference-data acquisition failed.",
    {},
    { cause: error },
  );
}
