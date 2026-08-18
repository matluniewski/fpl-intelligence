import {
  createFixtureId,
  createGameweekId,
  createProvenanceId,
  createSeasonId,
  createUtcInstant,
} from "@fpl-intelligence/domain";
import type { Position } from "@fpl-intelligence/domain";
import { describe, expect, it } from "vitest";

import type { ProjectionInputError } from "./errors";
import type { ProjectionComponentCode } from "./contracts";
import { projectPlayerGameweek } from "./project-player";
import {
  createSyntheticProjectionInput,
  SYNTHETIC_PROJECTION_FIXTURE,
} from "./testing/synthetic-projection";

describe("projection model v0", () => {
  it.each(["goalkeeper", "defender", "midfielder", "forward"] as const)(
    "projects a transparent %s baseline",
    (position) => {
      const result = projectPlayerGameweek(
        createSyntheticProjectionInput(position),
      );

      expect(result.position).toBe(position);
      expect(result.expectedPoints).toBeGreaterThan(0);
      expect(result.explanation.fixtureBreakdowns).toHaveLength(1);
      expect(
        result.explanation.fixtureBreakdowns[0]!.components.map(
          (component) => component.code,
        ),
      ).toEqual([
        "appearance",
        "goals",
        "assists",
        "clean_sheet",
        "goals_conceded",
        "saves",
        "penalty_saves",
        "penalty_misses",
        "own_goals",
        "yellow_cards",
        "red_cards",
        "bonus",
        "defensive_contributions",
      ]);
      expect(
        result.explanation.fixtureBreakdowns[0]!.components.every(
          (component) => component.formula.length > 0,
        ),
      ).toBe(true);
    },
  );

  it("is deterministic for identical versioned inputs", () => {
    const input = createSyntheticProjectionInput();

    expect(projectPlayerGameweek(input)).toEqual(projectPlayerGameweek(input));
  });

  it("applies position-specific goal, clean-sheet, conceded, and save rules", () => {
    const points = (position: Position, code: ProjectionComponentCode) =>
      projectPlayerGameweek(
        createSyntheticProjectionInput(position),
      ).explanation.fixtureBreakdowns[0]!.components.find(
        (component) => component.code === code,
      )!.expectedPoints;

    expect(points("goalkeeper", "goals")).toBe(points("defender", "goals"));
    expect(points("defender", "goals")).toBeGreaterThan(
      points("midfielder", "goals"),
    );
    expect(points("midfielder", "goals")).toBeGreaterThan(
      points("forward", "goals"),
    );
    expect(points("goalkeeper", "clean_sheet")).toBe(
      points("defender", "clean_sheet"),
    );
    expect(points("defender", "clean_sheet")).toBeGreaterThan(
      points("midfielder", "clean_sheet"),
    );
    expect(points("forward", "clean_sheet")).toBe(0);
    expect(points("goalkeeper", "saves")).toBeGreaterThan(0);
    expect(points("defender", "saves")).toBe(0);
    expect(points("goalkeeper", "goals_conceded")).toBeLessThan(0);
    expect(points("midfielder", "goals_conceded")).toBe(0);
  });

  it("keeps baseline assumptions, source times, and evidence identifiers", () => {
    const input = createSyntheticProjectionInput();
    const result = projectPlayerGameweek(input);

    expect(result.explanation.assumptions).toContain(
      "news_adjustments_excluded",
    );
    expect(result.explanation.inputSummary.sourceObservedAt).toEqual([
      input.evaluatedAt,
      input.evaluatedAt,
      input.evaluatedAt,
    ]);
    expect(result.explanation.provenanceRefs).toEqual([
      input.rateSignals[0]!.provenanceRefs[0],
    ]);
    expect(result.projectionKey).toContain(input.modelVersion);
  });

  it("adds fixture projections for a double gameweek", () => {
    const input = createSyntheticProjectionInput();
    const secondFixture = Object.freeze({
      ...SYNTHETIC_PROJECTION_FIXTURE,
      fixtureId: createFixtureId("synthetic-second-fixture"),
      venue: "away" as const,
    });
    const single = projectPlayerGameweek(input);
    const double = projectPlayerGameweek({
      ...input,
      fixtures: [SYNTHETIC_PROJECTION_FIXTURE, secondFixture],
    });

    expect(double.expectedPoints).toBe(single.expectedPoints * 2);
    expect(double.explanation.inputSummary.fixtureCount).toBe(2);
  });

  it("returns an explicit zero projection for a blank gameweek", () => {
    const input = createSyntheticProjectionInput();
    const result = projectPlayerGameweek({ ...input, fixtures: [] });

    expect(result.expectedPoints).toBe(0);
    expect(result.explanation.warnings).toEqual([
      "blank_gameweek_no_scheduled_fixture",
    ]);
  });

  it("rejects stale inputs at the supplied evaluation time", () => {
    const input = createSyntheticProjectionInput();

    expect(() =>
      projectPlayerGameweek({
        ...input,
        rateSignals: input.rateSignals.map((signal) => ({
          ...signal,
          observedAt: createUtcInstant("2026-08-10T12:00:00Z"),
        })),
      }),
    ).toThrowError(
      expect.objectContaining<Partial<ProjectionInputError>>({
        code: "projection_input_invalid",
        issues: expect.arrayContaining([
          expect.objectContaining({ code: "stale_input" }),
        ]),
      }),
    );
  });

  it("rejects inconsistent appearance probabilities", () => {
    const input = createSyntheticProjectionInput();

    expect(() =>
      projectPlayerGameweek({
        ...input,
        fixtures: [
          {
            ...SYNTHETIC_PROJECTION_FIXTURE,
            startProbability: 0.7,
            sixtyMinuteProbability: 0.8,
          },
        ],
      }),
    ).toThrowError(
      expect.objectContaining<Partial<ProjectionInputError>>({
        issues: expect.arrayContaining([
          expect.objectContaining({ code: "probabilities_inconsistent" }),
        ]),
      }),
    );
  });

  it("rejects rate weights that do not sum to one", () => {
    const input = createSyntheticProjectionInput();

    expect(() =>
      projectPlayerGameweek({
        ...input,
        rateSignals: input.rateSignals.map((signal) => ({
          ...signal,
          weight: 0.2,
        })),
      }),
    ).toThrowError(
      expect.objectContaining<Partial<ProjectionInputError>>({
        issues: expect.arrayContaining([
          expect.objectContaining({ code: "weights_invalid" }),
        ]),
      }),
    );
  });

  it("rejects rules from a different season", () => {
    const input = createSyntheticProjectionInput();

    expect(() =>
      projectPlayerGameweek({
        ...input,
        gameweekId: createGameweekId(createSeasonId("another-season"), 1),
      }),
    ).toThrowError(
      expect.objectContaining<Partial<ProjectionInputError>>({
        issues: expect.arrayContaining([
          expect.objectContaining({ code: "season_mismatch" }),
        ]),
      }),
    );
  });

  it("rejects scoring rules with inverted reward and penalty signs", () => {
    const input = createSyntheticProjectionInput();

    expect(() =>
      projectPlayerGameweek({
        ...input,
        rules: {
          ...input.rules,
          goal: { ...input.rules.goal, forward: -4 },
          yellowCard: 1,
        },
      }),
    ).toThrowError(
      expect.objectContaining<Partial<ProjectionInputError>>({
        issues: expect.arrayContaining([
          expect.objectContaining({
            code: "invalid_value",
            path: "rules.goal.forward",
          }),
          expect.objectContaining({
            code: "invalid_value",
            path: "rules.yellowCard",
          }),
        ]),
      }),
    );
  });

  it("rejects missing evidence lineage", () => {
    const input = createSyntheticProjectionInput();

    expect(() =>
      projectPlayerGameweek({
        ...input,
        fixtures: [
          {
            ...SYNTHETIC_PROJECTION_FIXTURE,
            provenanceRefs: [],
          },
        ],
      }),
    ).toThrowError(
      expect.objectContaining<Partial<ProjectionInputError>>({
        issues: expect.arrayContaining([
          expect.objectContaining({ code: "missing_provenance" }),
        ]),
      }),
    );
  });

  it("sorts and deduplicates evidence identifiers", () => {
    const input = createSyntheticProjectionInput();
    const earlier = createProvenanceId("a-synthetic-evidence");
    const later = createProvenanceId("z-synthetic-evidence");
    const result = projectPlayerGameweek({
      ...input,
      rateSignals: input.rateSignals.map((signal) => ({
        ...signal,
        provenanceRefs: [later, earlier],
      })),
      fixtures: [
        {
          ...SYNTHETIC_PROJECTION_FIXTURE,
          provenanceRefs: [later],
        },
      ],
    });

    expect(result.explanation.provenanceRefs).toEqual([
      earlier,
      input.rules.provenanceRefs[0],
      later,
    ]);
  });
});
