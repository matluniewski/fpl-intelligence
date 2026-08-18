export type NewsIngestionErrorCode =
  | "environment_denied"
  | "invalid_payload"
  | "kill_switch_active"
  | "policy_expired"
  | "policy_unknown"
  | "quota_rejected"
  | "rate_limited"
  | "rights_missing"
  | "source_disabled"
  | "source_failure"
  | "timeout";

export class NewsIngestionError extends Error {
  readonly code: NewsIngestionErrorCode;
  readonly details: Readonly<Record<string, string>>;

  constructor(
    code: NewsIngestionErrorCode,
    message: string,
    details: Readonly<Record<string, string>> = {},
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "NewsIngestionError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}
