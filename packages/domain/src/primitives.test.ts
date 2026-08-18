import { describe, expect, it } from "vitest";

import {
  createConfidence,
  createFplMoney,
  createUtcInstant,
  createVersion,
} from "./primitives";

describe("domain primitives", () => {
  it("stores FPL money as an integer number of tenths of a million", () => {
    expect(createFplMoney(57)).toEqual({
      unit: "tenths_of_million",
      tenths: 57,
    });
    expect(() => createFplMoney(5.7)).toThrow(RangeError);
    expect(() => createFplMoney(-1)).toThrow(RangeError);
  });

  it("requires explicit UTC offset semantics", () => {
    expect(createUtcInstant("2026-08-18T12:00:00+02:00")).toBe(
      "2026-08-18T10:00:00.000Z",
    );
    expect(() => createUtcInstant("2026-08-18T12:00:00")).toThrow(RangeError);
  });

  it("does not allow unexplained numeric confidence", () => {
    expect(() => createConfidence({ band: "medium", score: 0.6 })).toThrow(
      RangeError,
    );
    expect(
      createConfidence({
        band: "medium",
        score: 0.6,
        calibrationVersion: createVersion("synthetic-calibration-1"),
      }),
    ).toMatchObject({ band: "medium", score: 0.6 });
    expect(() =>
      createConfidence({
        band: "not_assessed",
        score: 0.6,
        calibrationVersion: createVersion("synthetic-calibration-1"),
      }),
    ).toThrow(RangeError);
  });
});
