import { describe, expect, it } from "vitest";

import { createTeamId } from "./identifiers";
import { validateReferenceDataSnapshot } from "./reference-data";
import {
  SYNTHETIC_REFERENCE_DATA,
  SYNTHETIC_TEAMS,
} from "./testing/synthetic-fixtures";

describe("normalized reference data", () => {
  it("accepts a consistent provider-independent snapshot", () => {
    expect(validateReferenceDataSnapshot(SYNTHETIC_REFERENCE_DATA)).toEqual([]);
  });

  it("reports identities that cannot be normalized consistently", () => {
    const invalid = {
      ...SYNTHETIC_REFERENCE_DATA,
      players: [
        {
          ...SYNTHETIC_REFERENCE_DATA.players[0]!,
          teamId: createTeamId("unknown-synthetic-team"),
        },
      ],
      teams: [SYNTHETIC_TEAMS[0]!, SYNTHETIC_TEAMS[0]!],
    };

    expect(
      validateReferenceDataSnapshot(invalid).map((issue) => issue.code),
    ).toEqual(expect.arrayContaining(["duplicate_identity", "team_unknown"]));
  });
});
