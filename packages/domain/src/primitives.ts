declare const utcInstantBrand: unique symbol;
declare const versionBrand: unique symbol;

export type UtcInstant = string & { readonly [utcInstantBrand]: true };
export type Version = string & { readonly [versionBrand]: true };

export interface FplMoney {
  readonly unit: "tenths_of_million";
  readonly tenths: number;
}

export interface Confidence {
  readonly band: "not_assessed" | "low" | "medium" | "high";
  readonly score?: number;
  readonly calibrationVersion?: Version;
}

export function createUtcInstant(value: string): UtcInstant {
  const milliseconds = Date.parse(value);
  const hasExplicitUtcOffset = /(?:Z|[+-]\d{2}:\d{2})$/u.test(value);

  if (!Number.isFinite(milliseconds) || !hasExplicitUtcOffset) {
    throw new RangeError(
      "UtcInstant must be a valid ISO timestamp with an offset.",
    );
  }

  return new Date(milliseconds).toISOString() as UtcInstant;
}

export function createVersion(value: string): Version {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new RangeError("Version must not be empty.");
  }

  return normalized as Version;
}

export function createFplMoney(tenths: number): FplMoney {
  if (!Number.isSafeInteger(tenths) || tenths < 0) {
    throw new RangeError(
      "FPL money must be a non-negative integer in tenths of a million.",
    );
  }

  return Object.freeze({ unit: "tenths_of_million", tenths });
}

export function createConfidence(input: {
  readonly band: Confidence["band"];
  readonly score?: number;
  readonly calibrationVersion?: Version;
}): Confidence {
  if (
    input.band === "not_assessed" &&
    (input.score !== undefined || input.calibrationVersion !== undefined)
  ) {
    throw new RangeError(
      "Not-assessed confidence cannot carry a score or calibration version.",
    );
  }

  if (input.score === undefined && input.calibrationVersion !== undefined) {
    throw new RangeError(
      "A calibration version is meaningful only with a numeric score.",
    );
  }

  if (input.score !== undefined) {
    if (input.score < 0 || input.score > 1 || !Number.isFinite(input.score)) {
      throw new RangeError("Confidence score must be between 0 and 1.");
    }

    if (input.calibrationVersion === undefined) {
      throw new RangeError(
        "A numeric confidence score requires a calibration version.",
      );
    }
  }

  return Object.freeze({ ...input });
}

export const NOT_ASSESSED_CONFIDENCE: Confidence = Object.freeze({
  band: "not_assessed",
});
